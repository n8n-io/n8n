import {
	appBindingsSchema,
	getWorkflowToolIncompatibilityReason,
	WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME,
	type AppBinding,
	type CreateAppDto,
	type CreatePageDto,
	type DescribedBinding,
	type UpdateAppDto,
	type UpdatePageDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	detectTriggerNode,
	listWorkflowInputFields,
} from '@/modules/agents/tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AppVersionService } from './app-version.service';
import type { App } from './app.entity';
import { AppRepository } from './app.repository';
import { deriveRoutesFromRouterSource } from './derive-routes';
import { AppNotFoundError } from './errors/app-not-found.error';
import { AppQuotaExceededError } from './errors/app-quota-exceeded.error';
import { BindingIncompatibleError } from './errors/binding-incompatible.error';
import { BindingProjectMismatchError } from './errors/binding-project-mismatch.error';
import { BindingWorkflowNotFoundError } from './errors/binding-workflow-not-found.error';
import { DataWorkflowNotFoundError } from './errors/data-workflow-not-found.error';
import { InvalidBindingsError } from './errors/invalid-bindings.error';
import { IndexPageCannotHaveChildrenError } from './errors/index-page-cannot-have-children.error';
import { IndexPageMustBeTopLevelError } from './errors/index-page-must-be-top-level.error';
import { PageNotFoundError } from './errors/page-not-found.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';
import { PageRepository } from './page.repository';

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly appVersionService: AppVersionService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowLoader: WorkflowToolWorkflowLoader,
	) {}

	async createApp(projectId: string, dto: CreateAppDto) {
		const count = await this.appRepository.countByProjectId(projectId);
		if (count >= this.globalConfig.apps.maxAppsPerProject) {
			throw new AppQuotaExceededError(this.globalConfig.apps.maxAppsPerProject, count);
		}
		return await this.appRepository.createApp(projectId, dto.name, dto.namespace);
	}

	async listApps(projectId: string) {
		return await this.appRepository.findManyByProjectId(projectId);
	}

	async getApp(appId: string) {
		const app = await this.appRepository.findOneBy({ id: appId });
		if (!app) throw new AppNotFoundError(appId);
		return app;
	}

	async updateApp(appId: string, dto: UpdateAppDto) {
		const app = await this.getApp(appId);
		return await this.appRepository.updateApp(app, dto);
	}

	async deleteApp(appId: string) {
		await this.getApp(appId);
		await this.appVersionService.deleteAllForApp(appId);
		await this.appRepository.deleteApp(appId);
	}

	async createVersion(appId: string, source: Buffer, dist: Buffer) {
		const app = await this.getApp(appId);
		const version = await this.appVersionService.create(appId, app.projectId, source, dist);
		return this.appVersionService.toResponse(version);
	}

	async getSourceTarball(appId: string) {
		const app = await this.getApp(appId);
		return await this.appVersionService.readSource(app);
	}

	async listVersions(appId: string) {
		await this.getApp(appId);
		const versions = await this.appVersionService.list(appId);
		return versions.map((version) => this.appVersionService.toResponse(version));
	}

	/**
	 * Replaces the whole binding list. Each workflow is checked with the acting user's
	 * `workflow:execute` scope now; at call time the app acts as its project, so the
	 * workflow must also be owned by that project. Unpublished workflows are accepted
	 * (reported as a warning) so an agent can bind first and publish later.
	 */
	async setBindings(appId: string, bindings: AppBinding[], user: User) {
		const parsed = appBindingsSchema.safeParse(bindings);
		if (!parsed.success) {
			throw new InvalidBindingsError(parsed.error.issues.map((issue) => issue.message));
		}
		const app = await this.getApp(appId);

		for (const binding of parsed.data) {
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				binding.workflowId,
				user,
				['workflow:execute'],
			);
			if (!workflow) throw new BindingWorkflowNotFoundError(binding.key, binding.workflowId);

			const ownerProjectId = workflow.shared.find((s) => s.role === 'workflow:owner')?.projectId;
			if (ownerProjectId !== app.projectId) {
				throw new BindingProjectMismatchError(binding.key, workflow.name);
			}

			const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
			if (incompatibility) {
				throw new BindingIncompatibleError(binding.key, workflow.name, incompatibility);
			}
		}

		const updated = await this.appRepository.updateBindings(app, parsed.data);
		return await this.describeBindings(updated);
	}

	/**
	 * Resolves each binding against the workflow the runtime will run: the published
	 * version, or the draft with a warning while none is published. Its trigger declares
	 * the input fields, so the generated types match what the runtime validates. A binding
	 * whose workflow left the project or lost its trigger since bind time is left out and
	 * reported as a warning, so the remaining bindings stay usable.
	 */
	async describeBindings(app: App): Promise<{ bindings: DescribedBinding[]; warnings: string[] }> {
		const bindings: DescribedBinding[] = [];
		const warnings: string[] = [];
		for (const binding of app.bindings) {
			const loaded = await this.loadBoundWorkflow(app.projectId, binding.workflowId);
			if (!loaded) {
				warnings.push(
					`Binding '${binding.key}': workflow '${binding.workflowId}' no longer exists in the app's project.`,
				);
				continue;
			}
			const { workflow, published } = loaded;
			if (getWorkflowToolIncompatibilityReason(workflow) !== null) {
				warnings.push(
					`Binding '${binding.key}': workflow "${workflow.name}" no longer starts with '${WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME}' or contains nodes an app cannot run.`,
				);
				continue;
			}
			if (!published) {
				warnings.push(
					`Binding '${binding.key}': workflow "${workflow.name}" is not published. Types for "${binding.key}" come from the unpublished draft; the app gets an error until it is published.`,
				);
			}
			// `inferInputSchema` also treats a trigger without declared fields as passthrough.
			const fields = listWorkflowInputFields(detectTriggerNode(workflow).node);
			bindings.push({
				key: binding.key,
				kind: binding.kind,
				workflowId: workflow.id,
				name: workflow.name,
				published,
				input: fields.length > 0 ? fields : 'passthrough',
			});
		}

		return { bindings, warnings };
	}

	/** Same loader and options as the runtime, so describe sees the nodes the runtime runs. */
	private async loadBoundWorkflow(
		projectId: string,
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; published: boolean } | null> {
		const reference = { workflowId, workflowName: '' };
		try {
			const workflow = await this.workflowLoader.loadWorkflow(projectId, reference, {
				usePublishedVersion: true,
			});
			return workflow && { workflow, published: true };
		} catch (error) {
			if (!(error instanceof WorkflowToolUnavailableError) || error.reason !== 'not_published') {
				throw error;
			}
			const draft = await this.workflowLoader.loadWorkflow(projectId, reference);
			return draft && { workflow: draft, published: false };
		}
	}

	async createPage(appId: string, dto: CreatePageDto) {
		await this.getApp(appId);
		const parentPageId = dto.parentPageId ?? null;
		if (parentPageId) {
			if (dto.route === '') throw new IndexPageMustBeTopLevelError();
			// getPage scopes the lookup to this app, so a parentPageId belonging to
			// another app/project is rejected the same as one that doesn't exist.
			const parent = await this.getPage(appId, parentPageId);
			if (!parent.route) throw new IndexPageCannotHaveChildrenError(parent.id);
		}
		if (await this.pageRepository.hasSiblingWithRoute(appId, parentPageId, dto.route)) {
			throw new PageRouteConflictError(dto.route);
		}
		return await this.pageRepository.createPage(appId, parentPageId, dto.route);
	}

	/** Flat list; callers build the tree from each page's `parentPageId`. */
	async listPages(appId: string) {
		await this.getApp(appId);
		return await this.pageRepository.findManyByAppId(appId);
	}

	/**
	 * The app's real pages, derived from its source's `src/router.ts` rather
	 * than the (unused) `Page` table — `[]` when the app has no version yet,
	 * or that version's source has no `src/router.ts`.
	 */
	async listRoutes(appId: string) {
		const app = await this.getApp(appId);
		const routerSource = await this.appVersionService.readRouterSource(app);
		return routerSource ? deriveRoutesFromRouterSource(routerSource) : [];
	}

	/** Scoped to `appId` so a pageId from a different app is treated as not found, not just unauthorized. */
	async getPage(appId: string, pageId: string) {
		const page = await this.pageRepository.findOneBy({ id: pageId });
		if (!page || page.appId !== appId) throw new PageNotFoundError(pageId);
		return page;
	}

	async updatePage(appId: string, pageId: string, dto: UpdatePageDto, user: User) {
		const page = await this.getPage(appId, pageId);
		if (dto.route !== undefined && dto.route !== page.route) {
			if (dto.route === '') {
				if (page.parentPageId) throw new IndexPageMustBeTopLevelError();
				if (await this.pageRepository.hasChildren(pageId)) {
					throw new IndexPageCannotHaveChildrenError(pageId);
				}
			}
			if (
				await this.pageRepository.hasSiblingWithRoute(
					page.appId,
					page.parentPageId,
					dto.route,
					pageId,
				)
			) {
				throw new PageRouteConflictError(dto.route);
			}
		}
		if (dto.dataWorkflowId) {
			// Scoped to the user's own `workflow:read` access, same as any other
			// workflow lookup — not just existence, so a page can't be wired up to
			// read data from a workflow the caller isn't allowed to see.
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				dto.dataWorkflowId,
				user,
				['workflow:read'],
			);
			if (!workflow) throw new DataWorkflowNotFoundError(dto.dataWorkflowId);
		}
		return await this.pageRepository.updatePage(page, dto);
	}

	async deletePage(appId: string, pageId: string) {
		await this.getPage(appId, pageId);
		await this.pageRepository.deletePage(pageId);
	}
}
