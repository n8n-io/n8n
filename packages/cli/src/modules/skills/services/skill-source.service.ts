import {
	type AgentSkill,
	type ConnectPublicSkillSource,
	type ConnectSkillSourceDto,
	type DiscoverPublicSkillSource,
	type DiscoverSkillSourceDto,
	type DeleteSkillSourceQueryDto,
	type DiscoveredSkill,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceDuplicate,
	type SkillScanResult,
	type SkillSourceReason,
	type ListSkillSourceCredentialsQueryDto,
	type ListSkillSourceRepositoriesQueryDto,
	type SkillSourceCredentialOption,
	type SkillSourceRepositoryList,
	type SkillSourceListItem,
	type MoveSkillSourceDto,
	type PublicSkillSourceDiscovery,
	type PublicSkillSourceImportCheck,
	type SkillSourceMovePreview,
	type SkillSourceDeleteBlock,
	skillNameKey,
} from '@n8n/api-types';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnexpectedError,
	UserError,
} from '@n8n/errors';
import { ProjectScopeService } from '@n8n/backend-services';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v7 as uuidv7, validate as isUuid } from 'uuid';

import type {
	SkillSourceConnection,
	SkillSourceType,
	UnlinkedSkill,
} from '../database/entities/skill-source-connection.entity';
import {
	DuplicateSkillSourceError,
	SkillSourceRepository,
} from '../database/repositories/skill-source.repository';
import { SkillRepository } from '../database/repositories/skill.repository';
import { SkillSourceMoveError } from '../errors/skill-source-move.error';
import { SkillParseError } from '../errors/skill-parse.error';
import {
	SkillSourceRequestError,
	skillSourceReasonOf,
	toSkillSourceRequestError,
} from '../errors/skill-source-request.error';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import {
	skillSourceIdentityKey,
	type FetchedSkill,
	type RemoteSkillRef,
	type SkillSourceAuth,
	type SkillSourceClient,
	type SkillSourceLocator,
} from '../sources/skill-source-client';
import {
	contentToAgentSkill,
	storedContentOf,
	importableSkillSchema,
	toSkillContent,
	type SkillTarget,
} from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
import { unreadableSkillHash } from '../utils/skill-unlinked';
import { skillPreview } from '../utils/skill-preview';
import { canTakeCredential, skillSourceHealth } from '../utils/skill-source-health';
import { countSkippedFiles } from '../utils/skipped-files';
import { SkillAccessService } from './skill-access.service';
import { SkillSourceCredentialsProxy } from './skill-source-credentials-proxy.service';
import type { ResolvedSkillSourceCredential } from './skill-source-credentials.contracts';
import { findLosingAgents, isNameTaken, nextFreeName } from './skill.policy';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillService } from './skill.service';
import { publicAccessKey, SkillSourceBackoff } from './skill-source-backoff';
import { SkillSourceToolBudget } from './skill-source-tool-budget';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillUsageProxy } from './skill-usage-proxy.service';
import {
	flaggedCodes,
	SkillsTelemetry,
	type SkillSourceTelemetryReason,
	type SkillTelemetryRef,
} from './skills-telemetry.service';

/** Skills fetched at the same time from one source. */
const FETCH_CONCURRENCY = 8;

type ScopeType = 'global' | 'team' | 'personal';
type SourceToolSurface = 'assistant' | 'mcp';
type SourceToolPreview = { revision: string | null; surface: SourceToolSurface };

type MoveAccess = {
	canReadSource: boolean;
	canReadTarget: boolean;
	agentProjectIds: string[] | null;
	sourceProjectIds: string[] | 'all';
	credentialEligible: boolean;
};

/** A source that a link points to, before anything is stored. */
type ParsedSource = {
	client: SkillSourceClient;
	type: SkillSourceType;
	locator: SkillSourceLocator;
	identityKey: string;
	/** The access of the credential for a private source. Undefined for a public one. */
	auth?: SkillSourceAuth;
};

/** The skills of a source at one revision. */
type Discovered = {
	refs: RemoteSkillRef[];
	truncated: boolean;
	/** Skills that the client did not list, as they are too deep in the source. */
	tooDeep: number;
	revision?: string;
};

/** The properties of `User connected skill source` that a request fills in as it goes. */
type ConnectReport = {
	provider: SkillSourceType;
	access: 'public' | 'credential';
	scope_type: ScopeType;
	duplicate_result: SkillSourceDuplicate['kind'];
	surface?: SourceToolSurface;
};

/** One skill of the source, read and checked against the rules of n8n skills. */
type ReadSkill = {
	key: string;
	ref: RemoteSkillRef;
	fetched?: FetchedSkill;
	skill?: AgentSkill;
	error?: { reason: SkillSourceReason; message: string; contentHash?: string };
	/** Absent when the skill is gone from the source. */
	check?: SkillScanResult;
};

/**
 * Manages sources and their synced skills. A source and its skills share one scope.
 * The service checks access itself and imports skills through `SkillService.createTrusted`.
 */
@Service()
export class SkillSourceService {
	constructor(
		private readonly flagGate: SkillSyncFlagGate,
		private readonly skillAccess: SkillAccessService,
		private readonly skillService: SkillService,
		private readonly skillRepository: SkillRepository,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly clients: SkillSourceClientRegistry,
		private readonly txRunner: TransactionRunner,
		private readonly skillsTelemetry: SkillsTelemetry,
		private readonly scanner: SkillSecurityScanner,
		private readonly credentials: SkillSourceCredentialsProxy,
		private readonly skillUsage: SkillUsageProxy,
		private readonly projectScopeService: ProjectScopeService,
		private readonly toolBudget: SkillSourceToolBudget,
		private readonly backoff: SkillSourceBackoff,
	) {}

	/**
	 * Reads a link and lists its skills for the picker. Writes nothing. The connect funnel
	 * stops here for a link that fails or a blocked duplicate, so telemetry reports those as
	 * a failed connect. A discover that succeeds reports nothing: the connect reports it.
	 */
	async discover(user: User, payload: DiscoverSkillSourceDto): Promise<SkillSourceDiscovery> {
		const { revision: _revision, ...result } = await this.discoverWith(
			user,
			payload,
			(read, row) => {
				const preview = read.fetched
					? skillPreview(read.fetched.content)
					: { files: [], truncated: false };
				return {
					...row,
					description: read.skill?.description ?? read.fetched?.content.description ?? null,
					skippedFiles: read.fetched?.skippedFiles ?? [],
					previewFiles: preview.files,
					previewTruncated: preview.truncated,
					error: read.error ? { reason: read.error.reason, message: read.error.message } : null,
					check: read.check ?? null,
				};
			},
		);
		return result;
	}

	async discoverPublic(
		user: User,
		{ url, scope, projectId }: DiscoverPublicSkillSource,
		surface: SourceToolSurface,
	): Promise<PublicSkillSourceDiscovery> {
		return await this.discoverWith(
			user,
			{ url, scope, projectId },
			(read, row) => ({
				...row,
				verdict: read.check?.verdict ?? null,
				reason: read.error?.reason ?? null,
			}),
			surface,
		);
	}

	private async discoverWith<T>(
		user: User,
		payload: DiscoverSkillSourceDto,
		format: (
			read: ReadSkill,
			row: Pick<DiscoveredSkill, 'key' | 'location' | 'name' | 'nameTaken' | 'webUrl'>,
		) => T,
		surface?: SourceToolSurface,
	) {
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType, payload.credentialId, surface);
		try {
			if (surface) this.toolBudget.take(user.id);
			const source = await this.parse(payload, user, target.projectId, surface !== undefined);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			const discovered = await this.discoverAll(source);
			const skills = await this.readAll(source, discovered);
			const names = await this.skillRepository.findLatestNamesInTarget(target);
			const nameTaken = (read: ReadSkill) =>
				read.skill !== undefined && isNameTaken(read.skill.name, names);
			const { client, locator } = source;
			if (duplicate.kind === 'blocked') {
				await this.skillsTelemetry.connectedSource(
					{ ...report, status: 'failure', reason: 'duplicate_source' },
					user.id,
				);
			} else {
				// A row with a taken name shows that, and not the verdict.
				const shown = skills.filter((read) => !nameTaken(read));
				await this.trackFlagged(user, source.type, shown);
			}
			return {
				source: { type: source.type, ...client.describe(locator), webUrl: client.webUrl(locator) },
				duplicate,
				revision: discovered.revision ?? null,
				skills: skills.map((read) =>
					format(read, {
						key: read.key,
						location: client.location(read.ref),
						name: read.skill?.name ?? read.fetched?.content.name ?? null,
						nameTaken: nameTaken(read),
						webUrl: client.webUrl(locator, read.ref, surface ? discovered.revision : undefined),
					}),
				),
				truncated: discovered.truncated,
				tooDeep: discovered.tooDeep,
			};
		} catch (error) {
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw error;
		}
	}

	/**
	 * Connects the source in the scope and imports the picked skills, in one transaction. A
	 * picked skill that cannot come in, such as one with a taken name, is reported and the
	 * others come in. If none comes in, nothing is stored. Telemetry reports every attempt.
	 */
	async connect(user: User, payload: ConnectSkillSourceDto): Promise<SkillSourceConnectResponse> {
		return await this.connectSelected(user, payload);
	}

	async connectPublic(
		user: User,
		{ url, scope, projectId, skillKeys, revision }: ConnectPublicSkillSource,
		surface: SourceToolSurface,
	): Promise<SkillSourceConnectResponse> {
		return await this.connectSelected(
			user,
			{ url, scope, projectId, skillKeys },
			{ revision, surface },
		);
	}

	/**
	 * Checks an import of the selection with the rules of `connectPublic`, and stores nothing.
	 * A surface that asks the user first calls it, so the question names what comes in. A
	 * selection that cannot come in at all fails here as it fails at connect, with the same
	 * telemetry. A check that succeeds reports nothing: the connect reports it.
	 */
	async checkPublicImport(
		user: User,
		{ url, scope, projectId, skillKeys, revision }: ConnectPublicSkillSource,
		surface: SourceToolSurface,
	): Promise<PublicSkillSourceImportCheck> {
		await this.flagGate.assertEnabled(user);
		const payload = { url, scope, projectId };
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType, undefined, surface);
		try {
			this.toolBudget.take(user.id);
			const source = await this.parse(payload, user, target.projectId, true);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			if (duplicate.kind === 'blocked') throw duplicateError(duplicate.where);
			const discovered = await this.discoverAll(source);
			assertPreviewedRevision(discovered, revision);
			const { importable: passed, failed } = selectImportable(
				discovered,
				await this.readAll(source, discovered),
				[...new Set(skillKeys)],
				new Set(),
			);
			const names = await this.skillRepository.findLatestNamesInTarget(target);
			const importable: PublicSkillSourceImportCheck['importable'] = [];
			// The names that the import gives: a name that this selection took gets a number.
			const takenKeys = new Set(names.map((taken) => skillNameKey(taken.name)));
			for (const { key, skill } of passed) {
				if (!skill) continue;
				if (isNameTaken(skill.name, names)) {
					failed.push({ key, name: skill.name, reason: 'name_taken' });
				} else {
					const name = nextFreeName(skill.name, takenKeys);
					takenKeys.add(skillNameKey(name));
					importable.push({ key, name });
				}
			}
			if (importable.length === 0) throw noImportError(failed);
			const { client, locator } = source;
			return {
				source: { type: source.type, ...client.describe(locator), webUrl: client.webUrl(locator) },
				importable,
				failed,
			};
		} catch (error) {
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw error;
		}
	}

	private async connectSelected(
		user: User,
		payload: ConnectSkillSourceDto,
		preview?: SourceToolPreview,
	): Promise<SkillSourceConnectResponse> {
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType, payload.credentialId, preview?.surface);
		try {
			if (preview) this.toolBudget.take(user.id);
			const source = await this.parse(payload, user, target.projectId, preview !== undefined);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			if (duplicate.kind === 'blocked') throw duplicateError(duplicate.where);
			const { response, warning } = await this.importSkills(user, source, target, scopeType, {
				skillKeys: payload.skillKeys,
				reviewedSkillKeys: payload.reviewedSkillKeys ?? [],
				preview,
			});
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'success', ...(warning ? { reason: warning } : {}) },
				user.id,
			);
			return response;
		} catch (error) {
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw error;
		}
	}

	/** Visible sources and pending update counts for the skills table. */
	async list(user: User): Promise<SkillSourceListItem[]> {
		await this.flagGate.assertEnabled(user);
		const projectIds = await this.skillAccess.visibleSourceProjects(user);
		const sources = await this.sourceRepository.findVisibleSources(projectIds);
		const shown = sources.flatMap((source) => {
			const client = this.clients.get(source.type);
			return client ? [{ source, client }] : [];
		});
		const [counts, projects, canReview, canImport, canDelete] = await Promise.all([
			this.sourceRepository.countLinksBySource(shown.map(({ source }) => source.id)),
			this.skillRepository.findProjects(shown.flatMap(({ source }) => source.projectId ?? [])),
			this.skillAccess.accessCheck(user, 'update'),
			this.skillAccess.accessCheck(user, 'create'),
			this.skillAccess.accessCheck(user, 'delete'),
		]);
		const missingLinks = await this.sourceRepository.findMissingLinks(
			shown.map(({ source }) => source.id),
		);
		const missingNames = await this.skillRepository.findLatestSummaries(
			missingLinks.map(({ skillId }) => skillId),
		);
		return shown.map(({ source, client }) => {
			const project = source.projectId ? projects.get(source.projectId) : undefined;
			const count = counts.get(source.id) ?? { skills: 0, available: 0, blocked: 0 };
			return {
				id: source.id,
				type: source.type,
				...client.describe(source.locator),
				webUrl: client.webUrl(source.locator),
				projectId: source.projectId,
				projectName: project?.name ?? null,
				projectType: project ? (project.type === 'personal' ? 'personal' : 'team') : null,
				projectIcon: project?.icon ?? null,
				skillCount: count.skills,
				updatesAvailable: canReview(source) ? count.available : 0,
				updatesBlocked: canReview(source) ? count.blocked : 0,
				newSkillsAvailable: canReview(source)
					? (source.unlinkedSkills ?? []).filter(({ skipped }) => !skipped).length
					: 0,
				health: skillSourceHealth(
					source.credentialRequired && !source.credentialId
						? 'credential_missing'
						: source.lastErrorReason,
				),
				lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
				missingSkills: missingLinks
					.filter(({ sourceId }) => sourceId === source.id)
					.flatMap(({ skillId }) => missingNames.get(skillId)?.name ?? []),
				canReplaceCredential: canReview(source) && canTakeCredential(source),
				canReview: canReview(source),
				canImport: canImport(source),
				canMove: canDelete(source),
				canDelete: canDelete(source),
			};
		});
	}

	/** Preview uses only local metadata. It does not resolve or test a credential. */
	async previewMove(
		user: User,
		sourceId: string,
		payload: MoveSkillSourceDto,
	): Promise<SkillSourceMovePreview> {
		await this.flagGate.assertEnabled(user);
		const source = await this.requireMoveSource(user, sourceId, payload.fromProjectId);
		const { target } = await this.resolveScope(user, payload);
		const access = await this.moveAccess(user, source, target, payload.credentialId);
		return await this.movePreview(user, source, target, payload.credentialId, access, {});
	}

	/** Move the source and its current members together. Recheck the preview under locks. */
	async move(user: User, sourceId: string, payload: MoveSkillSourceDto): Promise<{ ok: true }> {
		await this.flagGate.assertEnabled(user);
		const source = await this.requireMoveSource(user, sourceId, payload.fromProjectId);
		const { target, scopeType } = await this.resolveScope(user, payload);
		if (source.projectId === target.projectId) throw new UserError('Choose a different scope.');
		const access = await this.moveAccess(user, source, target, payload.credentialId);
		const fromProject = source.projectId
			? (await this.skillRepository.findProjects([source.projectId])).get(source.projectId)
			: undefined;
		const fromScope =
			source.projectId === null ? 'global' : fromProject?.type === 'personal' ? 'personal' : 'team';
		let skillCount = 0;
		try {
			await this.txRunner.run({}, async (ctx) => {
				await this.sourceRepository.lockForMove(sourceId, ctx);
				const locked = await this.sourceRepository.findById(sourceId, ctx);
				if (!locked) throw new NotFoundError('Source not found');
				// Permissions were checked before the transaction. They apply only to that scope.
				if (locked.projectId !== source.projectId) {
					throw new ConflictError('The source scope changed. Reload the sources and try again.');
				}
				const links = await this.sourceRepository.findLinksBySource(sourceId, ctx);
				await this.skillRepository.lockForEdit(
					links.map(({ skillId }) => skillId),
					ctx,
				);
				await this.skillRepository.lockNames(ctx);
				// A stop or delete that held a skill lock first may have removed a link.
				const members = await this.sourceRepository.findLinksBySource(sourceId, ctx);
				const preview = await this.movePreview(
					user,
					locked,
					target,
					payload.credentialId,
					access,
					ctx,
				);
				skillCount = preview.skillCount;
				if (!preview.canMove) throw new SkillSourceMoveError(preview);
				for (const { skillId } of members) {
					await this.skillService.moveTrusted(skillId, target, undefined, ctx, {
						checkedSource: locked,
						movingSourceId: sourceId,
					});
				}
				await this.sourceRepository.moveScope(
					sourceId,
					target.projectId,
					payload.credentialId ?? null,
					ctx,
				);
			});
		} catch (error) {
			const reason =
				error instanceof SkillSourceMoveError
					? moveBlockerReason(error.meta.preview)
					: error instanceof DuplicateSkillSourceError
						? 'duplicate_source'
						: 'unexpected';
			await this.skillsTelemetry.changedSourceScope(
				{
					provider: source.type,
					from_scope_type: fromScope,
					to_scope_type: scopeType,
					skill_count: skillCount,
					status: 'failure',
					reason,
				},
				user.id,
			);
			if (error instanceof DuplicateSkillSourceError) throw duplicateError('scope');
			throw error;
		}
		await this.skillsTelemetry.changedSourceScope(
			{
				provider: source.type,
				from_scope_type: fromScope,
				to_scope_type: scopeType,
				skill_count: skillCount,
				status: 'success',
			},
			user.id,
		);
		return { ok: true };
	}

	private async requireMoveSource(user: User, sourceId: string, fromProjectId: string | null) {
		const source = isUuid(sourceId) ? await this.sourceRepository.findById(sourceId) : null;
		if (!source || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'disconnect'))) {
			throw new ForbiddenError('You are not allowed to move this source out of its scope.');
		}
		if (source.projectId !== fromProjectId) {
			throw new ConflictError('The source scope changed. Reload the sources and try again.');
		}
		return source;
	}

	/** Resolve permissions before the transaction, without holding a database connection. */
	private async moveAccess(
		user: User,
		source: SkillSourceConnection,
		target: SkillTarget,
		credentialId?: string,
	): Promise<MoveAccess> {
		const client = this.clients.get(source.type);
		const [canReadSource, canReadTarget, agentProjectIds, sourceProjectIds, credentials] =
			await Promise.all([
				this.skillAccess.canAccess(user, source, 'read'),
				this.skillAccess.canAccess(user, target, 'read'),
				this.projectScopeService.getProjectIds(user, ['agent:read']),
				this.skillAccess.visibleSourceProjects(user),
				credentialId && client
					? this.credentials.listUsable(user, target.projectId, client.credentialTypes)
					: [],
			]);
		return {
			canReadSource,
			canReadTarget,
			agentProjectIds,
			sourceProjectIds,
			credentialEligible: credentials.some(({ id }) => id === credentialId),
		};
	}

	private async movePreview(
		user: User,
		source: SkillSourceConnection,
		target: SkillTarget,
		credentialId: string | undefined,
		access: MoveAccess,
		ctx: OperationContext,
	): Promise<SkillSourceMovePreview> {
		const links = await this.sourceRepository.findLinksBySource(source.id, ctx);
		const skillIds = links.map(({ skillId }) => skillId);
		const names = await this.skillRepository.findLatestSummaries(skillIds, ctx);
		const destinationNames = await this.skillRepository.findLatestNamesInTarget(target, ctx);
		const memberIds = new Set(skillIds);
		const conflictsByName = new Map<string, Array<{ skillId: string; name: string }>>();
		for (const existing of destinationNames) {
			if (memberIds.has(existing.skillId)) continue;
			const key = skillNameKey(existing.name);
			const matches = conflictsByName.get(key) ?? [];
			matches.push(existing);
			conflictsByName.set(key, matches);
		}
		const { canReadSource, canReadTarget, agentProjectIds } = access;
		const nameConflicts: SkillSourceMovePreview['nameConflicts'] = [];
		const usageConflicts: SkillSourceMovePreview['usageConflicts'] = [];
		const usingBySkill =
			target.projectId === null
				? new Map<string, string[]>()
				: await this.skillUsage.findUsingAgentIdsBySkill(skillIds, ctx);
		const agents = await this.skillUsage.findAgents(
			[...new Set([...usingBySkill.values()].flat())],
			ctx,
		);
		for (const skillId of skillIds) {
			const name = names.get(skillId)?.name;
			const skill = { id: skillId, name: canReadSource ? (name ?? skillId) : null };
			for (const existing of name ? (conflictsByName.get(skillNameKey(name)) ?? []) : []) {
				nameConflicts.push({
					moving: skill,
					existing: canReadTarget ? { id: existing.skillId, name: existing.name } : null,
				});
			}
			if (target.projectId === null) continue;
			const ids = usingBySkill.get(skillId) ?? [];
			const losing = findLosingAgents(ids, target, agents);
			if (losing.length === 0) continue;
			const visible = losing.flatMap((id) => {
				const agent = agents.get(id);
				return agent && (agentProjectIds === null || agentProjectIds.includes(agent.projectId))
					? [{ id, name: agent.name }]
					: [];
			});
			usageConflicts.push({ skill, agents: visible, hiddenAgents: losing.length - visible.length });
		}
		const required = source.credentialRequired || source.credentialId !== null;

		const credential: SkillSourceMovePreview['credential'] = {
			required,
			reason: credentialId
				? access.credentialEligible
					? null
					: 'credential_out_of_scope'
				: required
					? 'credential_missing'
					: null,
		};
		const duplicate = await this.duplicateOf(
			user,
			source.identityKey,
			target.projectId,
			source.id,
			ctx,
			access.sourceProjectIds,
		);
		return {
			skillCount: skillIds.length,
			nameConflicts,
			usageConflicts,
			duplicate,
			credential,
			canMove:
				nameConflicts.length === 0 &&
				usageConflicts.length === 0 &&
				duplicate.kind !== 'blocked' &&
				credential.reason === null,
		};
	}

	/** Lists usable replacements without requiring permission to create a source. */
	async listReplacementCredentials(user: User, sourceId: string, projectId: string | null) {
		const { source, client } = await this.requireCredentialChange(user, sourceId, projectId);
		return await this.credentials.listUsable(user, source.projectId, client.credentialTypes);
	}

	/** Verifies the new credential before replacing the stored access. Saved skills do not change. */
	async replaceCredential(
		user: User,
		sourceId: string,
		credentialId: string,
		projectId: string | null,
	): Promise<void> {
		const { source, client } = await this.requireCredentialChange(user, sourceId, projectId);
		try {
			const credential = await this.resolveCredential(user, credentialId, source.projectId, client);
			const auth = client.authFrom(credential);
			if (client.probe) await client.probe(source.locator, auth);
			else await client.discover(source.locator, auth);
			if (!(await this.sourceRepository.replaceCredential(source, credentialId))) {
				throw new ConflictError('The source changed. Reload it and try again.');
			}
		} catch (error) {
			await this.skillsTelemetry.updatedSourceCredential(
				{ provider: source.type, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw toSkillSourceRequestError(error);
		}
		await this.skillsTelemetry.updatedSourceCredential(
			{ provider: source.type, status: 'success' },
			user.id,
		);
		const previous = skillSourceHealth(
			source.credentialRequired && !source.credentialId
				? 'credential_missing'
				: source.lastErrorReason,
		);
		if (previous !== 'connected') {
			await this.skillsTelemetry.sourceHealthChanged({
				provider: source.type,
				previous_health: previous,
				health: 'connected',
			});
		}
	}

	private async requireCredentialChange(
		user: User,
		sourceId: string,
		projectId: string | null,
	): Promise<{ source: SkillSourceConnection; client: SkillSourceClient }> {
		await this.flagGate.assertEnabled(user);
		const source = isUuid(sourceId) ? await this.sourceRepository.findById(sourceId) : null;
		const client = source && this.clients.get(source.type);
		if (
			!source ||
			!client ||
			source.projectId !== projectId ||
			!(await this.skillAccess.canOnSource(user, source, 'view'))
		) {
			throw new NotFoundError('Source not found');
		}
		if (!(await this.skillAccess.canOnSource(user, source, 'replaceCredential'))) {
			throw new ForbiddenError('You are not allowed to replace the credential of this source.');
		}
		if (!canTakeCredential(source)) {
			throw new BadRequestError('This source reads a public repository and needs no credential.');
		}
		return { source, client };
	}

	/** Removes a source and either keeps its skills or checks usage before deleting them. */
	async delete(
		user: User,
		sourceId: string,
		{ keepSkills = false, onlySkillId }: DeleteSkillSourceQueryDto = {},
	): Promise<void> {
		await this.flagGate.assertEnabled(user);
		const source = isUuid(sourceId) ? await this.sourceRepository.findById(sourceId) : null;
		if (!source || !(await this.skillAccess.canOnSource(user, source, 'view'))) {
			throw new NotFoundError('Source not found');
		}
		// Resolve permissions before the transaction so a one-connection pool can run the delete.
		const canDelete = await this.skillAccess.accessCheck(user, 'delete');
		if (!canDelete(source)) {
			throw new ForbiddenError('You are not allowed to delete this source.');
		}
		const readable = await this.projectScopeService.getProjectIds(user, ['agent:read']);
		// A stale request is a normal race, so telemetry must not report it as a bug.
		let stale = false;
		// The last-skill removal deletes one skill by choice, so it also reports a skill delete.
		let deletedSkill: Exclude<SkillTelemetryRef, string> | undefined;
		try {
			await this.txRunner.run({}, async (ctx) => {
				const locked = await this.sourceRepository.findForDelete(sourceId, ctx);
				if (!locked) throw new NotFoundError('Source not found');
				if (!canDelete(locked)) {
					throw new ForbiddenError('You are not allowed to delete this source.');
				}
				const links = await this.sourceRepository.findLinksBySource(sourceId, ctx);
				// Attaches and publishes wait until the usage check and delete end.
				await this.skillRepository.lockForEdit(
					links.map(({ skillId }) => skillId),
					ctx,
				);
				// Stop syncing or a skill delete may have finished while the locks waited.
				const current = await this.sourceRepository.findLinksBySource(sourceId, ctx);
				if (onlySkillId && (current.length !== 1 || current[0].skillId !== onlySkillId)) {
					stale = true;
					throw new BadRequestError('The source skills changed. Refresh the list and try again.');
				}
				if (keepSkills) {
					// Removing the links makes the same skills editable and preserves agent references.
					await this.sourceRepository.deleteSource(sourceId, ctx);
					return;
				}
				const agentIds = new Set<string>();
				for (const { skillId } of current) {
					for (const id of await this.skillUsage.findUsingAgentIds(skillId, ctx)) agentIds.add(id);
				}
				if (agentIds.size > 0) {
					const agents = await this.skillUsage.findAgents([...agentIds], ctx);
					const visible = [...agents].filter(
						([, agent]) => readable === null || readable.includes(agent.projectId),
					);
					const projects = await this.skillRepository.findProjects(
						visible.map(([, agent]) => agent.projectId),
						ctx,
					);
					const block: SkillSourceDeleteBlock = {
						reason: 'skills_in_use',
						agents: visible.map(([agentId, agent]) => ({
							agentId,
							agentName: agent.name,
							projectId: agent.projectId,
							projectName: projects.get(agent.projectId)?.name ?? agent.projectId,
						})),
						hiddenAgents: agentIds.size - visible.length,
					};
					throw new ConflictError(
						'Remove the skills from these agents before you delete the source.',
						undefined,
						block,
					);
				}
				if (onlySkillId) {
					[deletedSkill] = await this.skillRepository.findByIds([onlySkillId], ctx);
				}
				for (const { skillId } of current) await this.skillRepository.deleteSkill(skillId, ctx);
				await this.sourceRepository.deleteSource(sourceId, ctx);
			});
		} catch (error) {
			await this.skillsTelemetry.deletedSource(
				{
					provider: source.type,
					skills_kept: keepSkills,
					status: 'failure',
					reason: stale ? 'stale' : error instanceof ConflictError ? 'skills_in_use' : 'unexpected',
				},
				user.id,
			);
			throw error;
		}
		await this.skillsTelemetry.deletedSource(
			{ provider: source.type, skills_kept: keepSkills, status: 'success' },
			user.id,
		);
		if (deletedSkill) await this.skillsTelemetry.deleted(user.id, deletedSkill, 'ui');
	}

	// ---------------------------------------------------------------- steps

	private async importSkills(
		user: User,
		source: ParsedSource,
		target: SkillTarget,
		scopeType: ScopeType,
		{
			skillKeys,
			reviewedSkillKeys,
			preview,
		}: { skillKeys: string[]; reviewedSkillKeys: string[]; preview?: SourceToolPreview },
	): Promise<{ response: SkillSourceConnectResponse; warning?: SkillSourceReason }> {
		const keys = [...new Set(skillKeys)];
		const failed: SkillSourceConnectResponse['failed'] = [];
		const imported: SkillSourceConnectResponse['imported'] = [];
		const skippedPaths: string[] = [];
		let needsReview = 0;
		const access = source.auth?.credentialId ? 'credential' : 'public';
		const track = async (status: 'success' | 'failure', reason?: SkillSourceTelemetryReason) => {
			const skipped = countSkippedFiles(skippedPaths);
			await this.skillsTelemetry.importedFromSource(
				{
					provider: source.type,
					...(preview ? { surface: preview.surface } : {}),
					access,
					scope_type: scopeType,
					first_or_more: 'first',
					selected: keys.length,
					imported: imported.length,
					name_taken: failed.filter((failure) => failure.reason === 'name_taken').length,
					blocked: failed.filter((failure) => failure.reason === 'blocked_by_check').length,
					needs_review: needsReview,
					skipped_files: skippedPaths.length,
					skipped_file_extensions: skipped.extensions,
					skipped_script_files: skipped.scripts,
					status,
					...(reason ? { reason } : {}),
				},
				user.id,
			);
		};

		const sourceId = uuidv7();
		let discovered: Discovered;
		try {
			discovered = await this.discoverAll(source);
			if (preview) assertPreviewedRevision(discovered, preview.revision);
			const allReads = await this.readAll(source, discovered);
			// The source can change after discover, so connect checks the content it imports.
			const selection = selectImportable(discovered, allReads, keys, new Set(reviewedSkillKeys));
			failed.push(...selection.failed);
			const { importable } = selection;

			await this.txRunner.run({}, async (ctx) => {
				await this.skillRepository.lockNames(ctx);
				const duplicate = await this.duplicateOf(
					user,
					source.identityKey,
					target.projectId,
					undefined,
					ctx,
					[],
				);
				if (duplicate.kind === 'blocked') throw duplicateError(duplicate.where);
				try {
					await this.sourceRepository.insertConnected(
						{
							id: sourceId,
							type: source.type,
							locator: source.locator,
							identityKey: source.identityKey,
							projectId: target.projectId,
							credentialId: source.auth?.credentialId ?? null,
							createdById: user.id,
							// The check fetches nothing while the source stays at this revision.
							probeCursor: discovered.revision ?? null,
						},
						ctx,
					);
				} catch (error) {
					if (error instanceof DuplicateSkillSourceError) throw duplicateError('scope');
					throw error;
				}
				// Read in the transaction, so a skill created meanwhile is not shadowed. A name that
				// the scope already had fails. A source can hold two skills with one name, so a name
				// that this import took gets the first free number ("ponytail 2").
				const existing = await this.skillRepository.findLatestNamesInTarget(target, ctx);
				const names = [...existing];
				for (const read of importable) {
					const { skill: fetchedSkill, fetched } = read;
					if (!fetchedSkill || !fetched) continue;
					if (isNameTaken(fetchedSkill.name, existing)) {
						failed.push({ key: read.key, name: fetchedSkill.name, reason: 'name_taken' });
						continue;
					}
					const name = nextFreeName(
						fetchedSkill.name,
						new Set(names.map((taken) => skillNameKey(taken.name))),
					);
					const skill = { ...fetchedSkill, name };
					const { frontmatter } = fetched.content;
					const skillId = await this.skillService.createTrusted(
						{
							id: `skill_${generateNanoId()}`,
							target,
							skill,
							source: source.type,
							createdById: user.id,
							frontmatter,
							sourceRevision: fetched.revision,
						},
						ctx,
					);
					await this.sourceRepository.insertImported(
						{
							skillId,
							sourceId,
							remoteRef: read.ref,
							baseRevision: fetched.revision,
							// The source content, so the check does not take the new name for an update.
							baseContentHash: skillContentHash(toSkillContent(fetchedSkill, frontmatter)),
							skippedFiles: fetched.skippedFiles,
						},
						ctx,
					);
					names.push({ skillId, name });
					imported.push({ key: read.key, skillId, name });
					skippedPaths.push(...fetched.skippedFiles);
					if (read.check?.verdict === 'needs_review') needsReview += 1;
				}
				if (imported.length === 0) throw noImportError(failed);
				const importedKeys = new Set(imported.map(({ key }) => key));
				await this.sourceRepository.saveUnlinkedSkills(
					sourceId,
					await Promise.all(
						allReads
							.filter((read) => !importedKeys.has(read.key) && read.check)
							.map(
								async (read): Promise<UnlinkedSkill> => ({
									key: read.key,
									contentHash: read.fetched
										? skillContentHash(storedContentOf(read.fetched.content))
										: await unreadableSkillHash(read.error?.message ?? '', read.error?.contentHash),
									verdict: read.check?.verdict ?? 'blocked',
									skipped: true,
								}),
							),
					),
					ctx,
				);
			});
		} catch (error) {
			// The transaction rolled back, so nothing came in.
			imported.length = 0;
			skippedPaths.length = 0;
			needsReview = 0;
			await track('failure', telemetryReasonOf(error));
			throw error;
		}

		await track('success');
		await this.skillsTelemetry.created(
			user.id,
			imported.map(({ skillId }) => ({ id: skillId, ...target })),
			source.type,
			'sync',
			{ source_provider: source.type, source_access: access },
		);
		return { response: { sourceId, imported, failed }, warning: warningOf(discovered) };
	}

	/** One event for each skill that the picker shows as needing review or blocked. */
	private async trackFlagged(user: User, provider: SkillSourceType, reads: ReadSkill[]) {
		await Promise.all(
			reads.map(async ({ check }) => {
				if (!check || check.verdict === 'pass') return;
				await this.skillsTelemetry.flaggedSkill(
					{
						provider,
						stage: 'import',
						verdict: check.verdict,
						...flaggedCodes(check.findings),
					},
					user.id,
				);
			}),
		);
	}

	/**
	 * The scope of the source, by the rules of a skill create: Global (`instance`) or a project
	 * where the user can create skills, which is the connect permission of a source.
	 */
	private async resolveScope(
		user: User,
		payload: { scope: 'instance' | 'project'; projectId?: string },
	): Promise<{ target: SkillTarget; scopeType: ScopeType }> {
		const target = await this.skillAccess.resolveCreateTarget(user, payload);
		if (target.projectId === null) return { target, scopeType: 'global' };
		const project = (await this.skillRepository.findProjects([target.projectId])).get(
			target.projectId,
		);
		return { target, scopeType: project?.type === 'personal' ? 'personal' : 'team' };
	}

	/** The credentials that can read a private source in the scope, for the credential select. */
	async listCredentials(
		user: User,
		query: ListSkillSourceCredentialsQueryDto,
	): Promise<SkillSourceCredentialOption[]> {
		await this.flagGate.assertEnabled(user);
		const { target } = await this.resolveScope(user, query);
		return await this.credentials.listUsable(user, target.projectId, this.credentialTypes());
	}

	/** The repositories that a credential can read, to pick one in place of a link. */
	async listRepositories(
		user: User,
		query: ListSkillSourceRepositoriesQueryDto,
	): Promise<SkillSourceRepositoryList> {
		await this.flagGate.assertEnabled(user);
		const { target } = await this.resolveScope(user, query);
		const credential = await this.resolveCredential(user, query.credentialId, target.projectId);
		const client = this.clientFor(credential.type);
		if (!client?.listRepositories) {
			throw new SkillSourceRequestError(
				'credential_invalid',
				'This credential cannot list repositories.',
			);
		}
		try {
			return await client.listRepositories(client.authFrom(credential));
		} catch (error) {
			throw toSkillSourceRequestError(error);
		}
	}

	/**
	 * The credential for a source in the scope. The scope must accept it, and the user must be
	 * able to use it. One answer covers a credential that is out of scope, that the user cannot
	 * use, and that does not exist, so the answer never tells that a credential exists.
	 */
	private async resolveCredential(
		user: User,
		credentialId: string,
		projectId: string | null,
		client?: SkillSourceClient,
	): Promise<ResolvedSkillSourceCredential> {
		let credential: ResolvedSkillSourceCredential | null;
		try {
			// With the client of the link, only its credential types and its check apply.
			credential = await this.credentials.resolve(credentialId, {
				projectId,
				user,
				types: client ? client.credentialTypes : this.credentialTypes(),
				check: (resolved) => (client ?? this.clientFor(resolved.type))?.checkCredential?.(resolved),
			});
		} catch (error) {
			// A failure without a reason comes from decrypting the credential or from minting
			// its token, such as a GitHub App with a wrong key: the credential cannot be used.
			if (skillSourceReasonOf(error) === undefined) {
				throw new SkillSourceRequestError(
					'credential_invalid',
					'n8n could not get a token from this credential. Check its settings.',
				);
			}
			throw toSkillSourceRequestError(error);
		}
		if (!credential) {
			throw new SkillSourceRequestError(
				'credential_out_of_scope',
				projectId
					? 'This project cannot use that credential. Pick a credential that the project owns, that is shared with it, or that is global.'
					: 'A Global source needs a credential that an admin owns.',
			);
		}
		return credential;
	}

	private allClients(): SkillSourceClient[] {
		return this.clients.types().flatMap((type) => this.clients.get(type) ?? []);
	}

	/** The client that reads with credentials of this type. */
	private clientFor(credentialType: string) {
		return this.allClients().find((client) => client.credentialTypes.includes(credentialType));
	}

	private credentialTypes(): string[] {
		return this.allClients().flatMap((client) => client.credentialTypes);
	}

	/** The client that handles the link, and the source it points to. */
	private async parse(
		payload: { url: string; credentialId?: string },
		user: User,
		projectId: string | null,
		fromTool = false,
	): Promise<ParsedSource> {
		const { url, credentialId } = payload;
		const client = this.allClients().find((candidate) => candidate.handles(url));
		if (!client) {
			if (isWebLink(url)) {
				throw new SkillSourceRequestError(
					'unsupported_provider',
					'n8n reads skills only from GitHub. Use https://github.com/owner/repo.',
				);
			}
			throw new SkillSourceRequestError(
				'invalid_url',
				'This is not a GitHub repository link. Use https://github.com/owner/repo.',
			);
		}
		// An AI tool reads with the public access. While the checks wait after a rate limit of
		// that access, a tool request would spend the budget that the checks need.
		if (fromTool && this.backoff.isWaiting(publicAccessKey(client.type))) {
			throw new SkillSourceRequestError(
				'rate_limited',
				'The source limits how often n8n can read it. Try again later.',
			);
		}
		const credential = credentialId
			? await this.resolveCredential(user, credentialId, projectId, client)
			: undefined;
		try {
			const auth = credential ? client.authFrom(credential) : undefined;
			const locator = await client.parseLocator(url, auth);
			return {
				client,
				// The registry holds only the clients of stored source types.
				type: client.type as SkillSourceType,
				locator,
				identityKey: skillSourceIdentityKey(client.identity(locator)),
				auth,
			};
		} catch (error) {
			throw toSkillSourceRequestError(error);
		}
	}

	/**
	 * The duplicate rules. A source in Global or in the chosen scope blocks the connect. A
	 * source in another project that the user can see gives a warning. A source in a project
	 * that the user cannot see changes nothing, so the answer never reveals it.
	 */
	private async duplicateOf(
		user: User,
		identityKey: string,
		projectId: string | null,
		exceptSourceId?: string,
		ctx: OperationContext = {},
		visibleProjectIds?: string[] | 'all',
	): Promise<SkillSourceDuplicate> {
		const same = (await this.sourceRepository.findSameSources(identityKey, ctx)).filter(
			({ id }) => id !== exceptSourceId,
		);
		if (same.length === 0) return { kind: 'none' };
		const blocking =
			same.find((source) => source.projectId === null) ??
			same.find((source) => source.projectId === projectId);
		if (blocking) {
			const canAdd =
				blocking.projectId === projectId ||
				(await this.skillAccess.canOnSource(user, blocking, 'addSkills'));
			return {
				kind: 'blocked',
				where: blocking.projectId === null ? 'global' : 'scope',
				sourceId: canAdd ? blocking.id : null,
			};
		}
		const visible = visibleProjectIds ?? (await this.skillAccess.visibleSourceProjects(user));
		const shownIds = same.flatMap(({ projectId: id }) =>
			id !== null && (visible === 'all' || visible.includes(id)) ? [id] : [],
		);
		if (shownIds.length === 0) return { kind: 'none' };
		const projects = await this.skillRepository.findProjects(shownIds, ctx);
		return {
			kind: 'warning',
			projects: shownIds.map((id) => ({ id, name: projects.get(id)?.name ?? id })),
		};
	}

	private async discoverAll(source: ParsedSource): Promise<Discovered> {
		const refs: RemoteSkillRef[] = [];
		let truncated = false;
		let tooDeep = 0;
		let revision: string | undefined;
		let cursor: string | undefined;
		try {
			do {
				const page = await source.client.discover(source.locator, source.auth, cursor);
				refs.push(...page.items);
				truncated ||= page.truncated === true;
				tooDeep += page.tooDeep ?? 0;
				revision ??= page.revision;
				cursor = page.next;
			} while (cursor !== undefined);
		} catch (error) {
			throw toSkillSourceRequestError(error);
		}
		if (refs.length === 0) {
			if (tooDeep > 0) {
				throw new SkillSourceRequestError(
					'too_deep',
					'The SKILL.md files here are in folders too deep for n8n to read. Link to a folder nearer to the skills.',
				);
			}
			throw new SkillSourceRequestError(
				'no_skills_found',
				'n8n found no skills here. A skill is a folder with a SKILL.md file.',
			);
		}
		return { refs, truncated, tooDeep, revision };
	}

	/**
	 * Fetches each skill at the revision that discover listed, and checks it against the rules
	 * of n8n skills. A skill that n8n cannot read gets an error. A failure of the whole source,
	 * such as a rate limit, fails the request.
	 */
	private async readAll(source: ParsedSource, discovered: Discovered): Promise<ReadSkill[]> {
		const { refs, revision } = discovered;
		const reads: ReadSkill[] = [];
		for (let start = 0; start < refs.length; start += FETCH_CONCURRENCY) {
			const batch = refs.slice(start, start + FETCH_CONCURRENCY);
			reads.push(
				...(await Promise.all(batch.map(async (ref) => await this.read(source, ref, revision)))),
			);
		}
		return reads;
	}

	private async read(
		source: ParsedSource,
		ref: RemoteSkillRef,
		revision: string | undefined,
	): Promise<ReadSkill> {
		const key = refKey(ref);
		let fetched: FetchedSkill;
		try {
			fetched = await source.client.fetchLatest(source.locator, ref, source.auth, revision);
		} catch (error) {
			const reason = skillSourceReasonOf(error);
			if (reason !== 'parse_error' && reason !== 'not_found') {
				throw toSkillSourceRequestError(error);
			}
			return {
				key,
				ref,
				error: {
					reason,
					message: getErrorMessage(error),
					...(error instanceof SkillParseError ? { contentHash: error.contentHash } : {}),
				},
				...(error instanceof SkillParseError ? { check: this.scanner.scanUnreadable(error) } : {}),
			};
		}
		// The security check alone decides whether a skill is valid. Its findings name the cause.
		const check = this.scanner.scan(fetched);
		if (check.verdict === 'blocked') return { key, ref, fetched, check };
		const parsed = importableSkillSchema.safeParse(contentToAgentSkill(fetched.content));
		if (!parsed.success) {
			throw new UnexpectedError('The security check passed a skill that n8n cannot store', {
				extra: { issues: parsed.error.issues },
			});
		}
		return { key, ref, fetched, skill: parsed.data, check };
	}
}

function connectReport(
	scopeType: ScopeType,
	credentialId?: string,
	surface?: SourceToolSurface,
): ConnectReport {
	return {
		provider: 'github',
		...(surface ? { surface } : {}),
		access: credentialId ? 'credential' : 'public',
		scope_type: scopeType,
		duplicate_result: 'none',
	};
}

/** A failure always carries a reason, so a bug shows in telemetry as `unexpected`. */
function telemetryReasonOf(error: unknown): SkillSourceTelemetryReason {
	return skillSourceReasonOf(error) ?? 'unexpected';
}

/** Why a source that listed skills did not list all of them, for the telemetry of a success. */
function warningOf(discovered: Discovered): SkillSourceReason | undefined {
	if (discovered.truncated) return 'too_many_skills';
	if (discovered.tooDeep > 0) return 'too_deep';
	return undefined;
}

/** Whether the input is a web link, so a link to another site is told apart from a typo. */
function isWebLink(input: string): boolean {
	try {
		const { protocol } = new URL(input.trim());
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
}

/** The key of a skill in the picker. The ref is opaque, so its JSON is the key. */
function refKey(ref: RemoteSkillRef): string {
	return JSON.stringify(ref);
}

/**
 * An import reads the revision that the user saw in the preview, or nothing. A source type
 * without revisions gives null in the preview, and null matches it.
 */
function assertPreviewedRevision(discovered: Discovered, revision: string | null): void {
	if ((discovered.revision ?? null) === revision) return;
	throw new SkillSourceRequestError(
		'stale',
		'The source changed. Preview it again before importing.',
	);
}

/**
 * Splits the picked skills into those that the import takes and those that it leaves out.
 * The name rule is not here: it needs the names of the scope, which the import reads in
 * its transaction.
 */
function selectImportable(
	discovered: Discovered,
	reads: ReadSkill[],
	keys: string[],
	reviewed: Set<string>,
): { importable: ReadSkill[]; failed: SkillSourceConnectResponse['failed'] } {
	const failed: SkillSourceConnectResponse['failed'] = [];
	const known = new Set(discovered.refs.map(refKey));
	const picked = new Set<string>();
	for (const key of keys) {
		if (known.has(key)) picked.add(key);
		else failed.push({ key, name: null, reason: 'not_found' });
	}
	const importable: ReadSkill[] = [];
	for (const read of reads) {
		if (!picked.has(read.key)) continue;
		// A SKILL.md that n8n cannot read is also blocked, and the check names the cause.
		if (read.check?.verdict === 'blocked') {
			failed.push({
				key: read.key,
				name: read.skill?.name ?? read.fetched?.content.name ?? null,
				reason: 'blocked_by_check',
			});
		} else if (read.error) {
			failed.push({ key: read.key, name: null, reason: read.error.reason });
		} else if (read.check?.verdict === 'needs_review' && !reviewed.has(read.key)) {
			// The user reviewed the warnings of the skills that the picker showed, so a skill
			// that needs review only since discover did not get that review.
			failed.push({ key: read.key, name: read.skill?.name ?? null, reason: 'review_required' });
		} else {
			importable.push(read);
		}
	}
	return { importable, failed };
}

function noImportError(failed: SkillSourceConnectResponse['failed']): SkillSourceRequestError {
	const reason = failed[0]?.reason ?? 'no_skills_found';
	return new SkillSourceRequestError(reason, noImportMessage(failed, reason));
}

/** The message names a cause only when every picked skill failed for it. */
function noImportMessage(
	failed: SkillSourceConnectResponse['failed'],
	reason: SkillSourceReason,
): string {
	if (failed.some((failure) => failure.reason !== reason)) {
		return 'n8n could not import any of the picked skills.';
	}
	if (reason === 'name_taken') return 'Every picked skill has a name that this scope already has.';
	if (reason === 'blocked_by_check') return 'The security check blocked every picked skill.';
	if (reason === 'review_required') {
		return 'Every picked skill needs a review of its warnings before it can come in.';
	}
	return 'n8n could not import any of the picked skills.';
}

function duplicateError(where: 'global' | 'scope'): SkillSourceRequestError {
	return new SkillSourceRequestError(
		'duplicate_source',
		where === 'global'
			? 'This repository is already connected in Global. Every project can use its skills.'
			: 'This repository is already connected in this scope. Review its skills to import more.',
	);
}

function moveBlockerReason(preview: SkillSourceMovePreview) {
	if (preview.duplicate.kind === 'blocked') return 'duplicate_source';
	if (preview.nameConflicts.length > 0) return 'name_taken';
	if (preview.usageConflicts.length > 0) return 'agent_in_use';
	return preview.credential.reason ?? 'unexpected';
}
