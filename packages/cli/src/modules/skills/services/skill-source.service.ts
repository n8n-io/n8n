import {
	AGENT_SKILL_NAME_MAX_LENGTH,
	agentSkillSchema,
	type AgentSkill,
	type ConnectSkillSourceDto,
	type DiscoverSkillSourceDto,
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
} from '@n8n/api-types';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';

import type { SkillSourceType } from '../database/entities/skill-source-connection.entity';
import {
	DuplicateSkillSourceError,
	SkillSourceRepository,
} from '../database/repositories/skill-source.repository';
import { SkillRepository } from '../database/repositories/skill.repository';
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
import { contentToAgentSkill, toSkillContent, type SkillTarget } from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
import { SkillAccessService } from './skill-access.service';
import { SkillSourceCredentialsProxy } from './skill-source-credentials-proxy.service';
import type { ResolvedSkillSourceCredential } from './skill-source-credentials.contracts';
import { isNameTaken } from './skill.policy';
import { SkillSecurityScanner } from './skill-security-scanner.service';
import { SkillService } from './skill.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillsTelemetry, type SkillSourceTelemetryReason } from './skills-telemetry.service';

/** Skills fetched at the same time from one source. */
const FETCH_CONCURRENCY = 8;

/**
 * What an imported skill must be. Skills ignore `allowedTools`, as a create does. The name is
 * trimmed as a create stores it, so the name checks and the baseline hash match the stored skill.
 */
const importableSkillSchema = agentSkillSchema
	.omit({ allowedTools: true })
	.extend({ name: z.string().trim().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH) });

type ScopeType = 'global' | 'team' | 'personal';

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
};

/** One skill of the source, read and checked against the rules of n8n skills. */
type ReadSkill = {
	key: string;
	ref: RemoteSkillRef;
	fetched?: FetchedSkill;
	skill?: AgentSkill;
	error?: { reason: SkillSourceReason; message: string };
	/** Absent when the skill is gone from the source. */
	check?: SkillScanResult;
};

/**
 * Connects sources and imports their skills. A source lives in one scope, and its skills get
 * that scope. The service checks access itself, and writes skills only through
 * `SkillService.createTrusted`, so the skill rules stay in one place.
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
	) {}

	/**
	 * Reads a link and lists its skills for the picker. Writes nothing. The connect funnel
	 * stops here for a link that fails or a blocked duplicate, so telemetry reports those as
	 * a failed connect. A discover that succeeds reports nothing: the connect reports it.
	 */
	async discover(user: User, payload: DiscoverSkillSourceDto): Promise<SkillSourceDiscovery> {
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType, payload.credentialId);
		try {
			const source = await this.parse(payload, user, target.projectId);
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
				skills: skills.map(
					(read): DiscoveredSkill => ({
						key: read.key,
						location: client.location(read.ref),
						name: read.skill?.name ?? read.fetched?.content.name ?? null,
						description: read.skill?.description ?? read.fetched?.content.description ?? null,
						skippedFiles: read.fetched?.skippedFiles ?? [],
						nameTaken: nameTaken(read),
						error: read.error ?? null,
						check: read.check ?? null,
						webUrl: client.webUrl(locator, read.ref),
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
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType, payload.credentialId);
		try {
			const source = await this.parse(payload, user, target.projectId);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			if (duplicate.kind === 'blocked') throw duplicateError(duplicate.where);
			const { response, warning } = await this.importSkills(user, source, target, scopeType, {
				skillKeys: payload.skillKeys,
				reviewedSkillKeys: payload.reviewedSkillKeys ?? [],
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

	// ---------------------------------------------------------------- steps

	private async importSkills(
		user: User,
		source: ParsedSource,
		target: SkillTarget,
		scopeType: ScopeType,
		{ skillKeys, reviewedSkillKeys }: { skillKeys: string[]; reviewedSkillKeys: string[] },
	): Promise<{ response: SkillSourceConnectResponse; warning?: SkillSourceReason }> {
		const keys = [...new Set(skillKeys)];
		const reviewed = new Set(reviewedSkillKeys);
		const failed: SkillSourceConnectResponse['failed'] = [];
		const imported: SkillSourceConnectResponse['imported'] = [];
		let skippedFiles = 0;
		let needsReview = 0;
		const track = async (status: 'success' | 'failure', reason?: SkillSourceTelemetryReason) =>
			await this.skillsTelemetry.importedFromSource(
				{
					provider: source.type,
					scope_type: scopeType,
					first_or_more: 'first',
					selected: keys.length,
					imported: imported.length,
					name_taken: failed.filter((failure) => failure.reason === 'name_taken').length,
					blocked: failed.filter((failure) => failure.reason === 'blocked_by_check').length,
					needs_review: needsReview,
					skipped_files: skippedFiles,
					status,
					...(reason ? { reason } : {}),
				},
				user.id,
			);

		const sourceId = uuidv7();
		let discovered: Discovered;
		try {
			discovered = await this.discoverAll(source);
			const byKey = new Map(discovered.refs.map((ref) => [refKey(ref), ref]));
			const picked: RemoteSkillRef[] = [];
			for (const key of keys) {
				const ref = byKey.get(key);
				if (ref) picked.push(ref);
				else failed.push({ key, name: null, reason: 'not_found' });
			}
			const reads = await this.readAll(source, { ...discovered, refs: picked });
			const importable: ReadSkill[] = [];
			for (const read of reads) {
				// The source can change after discover, so connect checks the content it imports.
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

			await this.txRunner.run({}, async (ctx) => {
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
						},
						ctx,
					);
				} catch (error) {
					if (error instanceof DuplicateSkillSourceError) throw duplicateError('scope');
					throw error;
				}
				// Read in the transaction, so a skill created meanwhile is not shadowed. Each import
				// adds its name, so two picked skills with one name do not both come in.
				const names = await this.skillRepository.findLatestNamesInTarget(target, ctx);
				for (const read of importable) {
					const { skill, fetched } = read;
					if (!skill || !fetched) continue;
					if (isNameTaken(skill.name, names)) {
						failed.push({ key: read.key, name: skill.name, reason: 'name_taken' });
						continue;
					}
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
							baseContentHash: skillContentHash(toSkillContent(skill, frontmatter)),
							skippedFiles: fetched.skippedFiles,
						},
						ctx,
					);
					names.push({ skillId, name: skill.name });
					imported.push({ key: read.key, skillId, name: skill.name });
					skippedFiles += fetched.skippedFiles.length;
					if (read.check?.verdict === 'needs_review') needsReview += 1;
				}
				if (imported.length === 0) {
					const reason = failed[0]?.reason ?? 'no_skills_found';
					throw new SkillSourceRequestError(reason, noImportMessage(failed, reason));
				}
			});
		} catch (error) {
			// The transaction rolled back, so nothing came in.
			imported.length = 0;
			skippedFiles = 0;
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
		);
		return { response: { sourceId, imported, failed }, warning: warningOf(discovered) };
	}

	/** One event for each skill that the picker shows as needing review or blocked. */
	private async trackFlagged(user: User, provider: SkillSourceType, reads: ReadSkill[]) {
		await Promise.all(
			reads.map(async ({ check }) => {
				if (!check || check.verdict === 'pass') return;
				const ruleCodes = check.findings
					.filter((finding) => finding.severity !== 'info')
					.map((finding) => finding.rule);
				await this.skillsTelemetry.flaggedSkill(
					{
						provider,
						stage: 'import',
						verdict: check.verdict,
						rule_codes: [...new Set(ruleCodes)],
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
	): Promise<SkillSourceDuplicate> {
		const same = await this.sourceRepository.findSameSources(identityKey);
		if (same.length === 0) return { kind: 'none' };
		const blocking =
			same.find((source) => source.projectId === null) ??
			same.find((source) => source.projectId === projectId);
		if (blocking) {
			const canAdd = await this.skillAccess.canOnSource(user, blocking, 'addSkills');
			return {
				kind: 'blocked',
				where: blocking.projectId === null ? 'global' : 'scope',
				sourceId: canAdd ? blocking.id : null,
			};
		}
		const visible = await this.skillAccess.visibleSourceProjects(user);
		const shownIds = same.flatMap(({ projectId: id }) =>
			id !== null && (visible === 'all' || visible.includes(id)) ? [id] : [],
		);
		if (shownIds.length === 0) return { kind: 'none' };
		const projects = await this.skillRepository.findProjects(shownIds);
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
				error: { reason, message: getErrorMessage(error) },
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

function connectReport(scopeType: ScopeType, credentialId?: string): ConnectReport {
	return {
		provider: 'github',
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
			: 'This repository is already connected in this scope. Add more skills to that source.',
	);
}
