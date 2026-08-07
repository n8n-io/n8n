import type { Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';

import type { Decision, Package, ResourceContent } from '../engine/types';
import { resourceIdOf, resourceKindOf } from '../spec/projections';

interface WorkflowFileContent {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	parentFolderId: string | null;
	isArchived: boolean;
	/** Owning team-project id (null = personal); absent in project-scoped trees. */
	homeProjectId?: string | null;
}

interface TeamProjectFileContent {
	id: string;
	name: string;
	icon: Project['icon'];
	description: string | null;
}

export interface ApplyReport {
	applied: string[];
	failed: Array<{ path: string; error: string }>;
}

/**
 * Executes the inward decisions of a reconcile plan against the instance DB.
 * Modeled on SourceControlImportService but stripped to POC essentials: no
 * workflow history, no publish handling. Each resource fails independently
 * (B2 robustness) — one bad row never aborts the reconcile.
 */
@Service()
export class LiveApplyService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly variablesRepository: VariablesRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
	) {}

	async apply(
		decisions: Decision[],
		headPkg: Package,
		user: User,
		scopeProjectId: string | null,
	): Promise<ApplyReport> {
		const inward = decisions.filter(
			(d) => d.kind === 'apply-to-live' || d.kind === 'reset-to-head',
		);
		// Projects before workflows (ownership targets), credentials before
		// workflows (references), deletions last — the source-control order.
		const rank = (d: Decision) =>
			d.op === 'delete'
				? 4
				: { project: 0, credential: 1, variable: 2, workflow: 3 }[resourceKindOf(d.path)!];
		inward.sort((a, b) => rank(a) - rank(b));

		const report: ApplyReport = { applied: [], failed: [] };
		for (const decision of inward) {
			try {
				await this.applyOne(decision, headPkg, user, scopeProjectId);
				report.applied.push(decision.path);
			} catch (e) {
				report.failed.push({ path: decision.path, error: (e as Error).message });
			}
		}
		return report;
	}

	private async applyOne(
		decision: Decision,
		headPkg: Package,
		user: User,
		scopeProjectId: string | null,
	): Promise<void> {
		const kind = resourceKindOf(decision.path);
		const id = resourceIdOf(decision.path);

		if (decision.op === 'delete') {
			// Absence = not in the desired state = hard delete (D007). Credentials
			// never reach here — the engine emits `skipped` for them.
			if (kind === 'workflow') {
				try {
					await this.activeWorkflowManager.remove(id);
				} catch {
					// best-effort: the workflow may not be active
				}
				await this.workflowRepository.delete({ id });
			} else if (kind === 'variable') {
				await this.variablesRepository.delete({ id });
			}
			return;
		}

		const content = headPkg[decision.path];
		if (kind === 'workflow') await this.upsertWorkflow(content, user, scopeProjectId);
		else if (kind === 'credential') await this.upsertCredential(content, user, scopeProjectId);
		else if (kind === 'variable') await this.upsertVariable(content, scopeProjectId);
		else if (kind === 'project') await this.upsertTeamProject(content, user);
	}

	/** Id-preserved team project; the acting user becomes its admin on create. */
	private async upsertTeamProject(content: ResourceContent, user: User): Promise<void> {
		const project = content as unknown as TeamProjectFileContent;
		const existing = await this.projectRepository.findOne({ where: { id: project.id } });
		if (existing) {
			await this.projectRepository.update(
				{ id: project.id },
				{
					name: project.name,
					icon: project.icon ?? null,
					description: project.description ?? null,
				},
			);
			return;
		}
		await this.projectRepository.insert({
			id: project.id,
			name: project.name,
			type: 'team',
			icon: project.icon ?? null,
			description: project.description ?? null,
		});
		await this.projectRelationRepository.insert({
			projectId: project.id,
			userId: user.id,
			role: { slug: 'project:admin' },
		});
	}

	private async upsertWorkflow(
		content: ResourceContent,
		user: User,
		scopeProjectId: string | null,
	): Promise<void> {
		const workflow = content as unknown as WorkflowFileContent;
		const folderId = workflow.parentFolderId;
		const folderExists = folderId
			? (await this.folderRepository.findOne({ where: { id: folderId } })) !== null
			: false;
		const existing = await this.workflowRepository.findOne({ where: { id: workflow.id } });

		await this.workflowRepository.upsert(
			{
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				settings: workflow.settings,
				isArchived: workflow.isArchived,
				// publish state is instance-local (POC skips the publish ceremony);
				// `active` has no column default, so it must be set on insert
				active: existing?.active ?? false,
				versionId: uuid(),
				parentFolder: folderExists && folderId ? { id: folderId } : null,
			},
			['id'],
		);

		// Ownership: an instance-scope file names its team project (created earlier
		// in the same apply, id-preserved); personal/absent falls back to the scope
		// project or the acting user's personal project.
		const desiredTeamProjectId =
			typeof workflow.homeProjectId === 'string' &&
			(await this.projectRepository.findOne({ where: { id: workflow.homeProjectId } })) !== null
				? workflow.homeProjectId
				: null;

		const owner = await this.sharedWorkflowRepository.findOne({
			where: { workflowId: workflow.id, role: 'workflow:owner' },
		});
		if (!owner) {
			await this.sharedWorkflowRepository.insert({
				workflowId: workflow.id,
				projectId: desiredTeamProjectId ?? (await this.resolveProjectId(user, scopeProjectId)),
				role: 'workflow:owner',
			});
		} else if (desiredTeamProjectId && owner.projectId !== desiredTeamProjectId) {
			// The workflow moved projects on the source — follow it.
			await this.sharedWorkflowRepository.update(
				{ workflowId: workflow.id, role: 'workflow:owner' },
				{ projectId: desiredTeamProjectId },
			);
		}
	}

	private async upsertCredential(
		content: ResourceContent,
		user: User,
		scopeProjectId: string | null,
	): Promise<void> {
		const { id, name, type } = content as { id: string; name: string; type: string };
		const existing = await this.credentialsRepository.findOne({ where: { id } });
		if (existing) {
			await this.credentialsRepository.update({ id }, { name, type });
			return;
		}
		// A stub with the file's id: same shape as CredentialsService.createStubCredential,
		// but id-preserving so the destination's path converges with the branch. The
		// secret data stays empty — bindings are filled per destination, never copied.
		const encrypted = await this.credentialsService.createEncryptedData({
			id,
			name,
			type,
			data: {},
		});
		const entity = this.credentialsRepository.create({
			...encrypted,
			id,
			isManaged: false,
			isResolvable: false,
		});
		await this.credentialsService.save(
			entity,
			encrypted,
			user,
			await this.resolveProjectId(user, scopeProjectId),
		);
	}

	private async upsertVariable(
		content: ResourceContent,
		scopeProjectId: string | null,
	): Promise<void> {
		const { id, key, type } = content as { id: string; key: string; type: string };
		// Values never travel; an existing local value survives the sync.
		const existing = await this.variablesRepository.findOne({ where: { id } });
		await this.variablesRepository.upsert(
			{
				id,
				key,
				type,
				value: existing?.value ?? '',
				project: scopeProjectId ? { id: scopeProjectId } : null,
			},
			['id'],
		);
	}

	private async resolveProjectId(user: User, scopeProjectId: string | null): Promise<string> {
		if (scopeProjectId) return scopeProjectId;
		return (await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;
	}
}
