import type {
	CreateDocChildPageDto,
	DocOverviewProject,
	DocPage,
	DocPageKind,
	DocPageProperties,
	DocPageResourceType,
	DocPageRootType,
	DocPageSummary,
	EnsureDocPageDto,
	UpdateDocPageDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import {
	isUniqueConstraintError,
	ProjectRepository,
	StatisticsNames,
	WorkflowRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { ModuleRegistry } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import type { IConnections, INode } from 'n8n-workflow';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { detectKind } from './doc-page-kind';
import { agentProperties, workflowProperties } from './doc-page-properties';
import { extractText } from './doc-page-text';
import type { DocPageEntity } from './doc-page.entity';
import { DocPageRepository } from './doc-page.repository';

const EXCERPT_LENGTH = 160;
const SEARCH_LIMIT = 20;
// Search reads more rows than it returns, because access checks drop some.
const SEARCH_CANDIDATES = 100;
const OVERVIEW_ITEMS = 4;

type Access = 'read' | 'update';

/** The workflow, agent or project behind a root page. */
export type DocResource = {
	type: DocPageRootType;
	id: string;
	projectId: string;
	name: string;
	kind: DocPageKind | null;
	activeVersionId: string | null;
	isPublished: boolean;
	/** Input for the LLM: the published workflow, or the published agent configuration. */
	published: { nodes: INode[]; connections: IConnections } | { config: unknown } | null;
	/** Facts from the published version. Null when nothing is published. */
	properties: DocPageProperties | null;
};

/** Resource fields that summaries and staleness need. */
type ResourceHead = Pick<DocResource, 'name' | 'activeVersionId' | 'isPublished'>;

export function isStale(
	page: Pick<DocPageEntity, 'parentId' | 'writtenAgainstVersionId'>,
	resource: Pick<ResourceHead, 'activeVersionId'>,
) {
	if (page.parentId !== null || resource.activeVersionId === null) return false;
	return page.writtenAgainstVersionId !== resource.activeVersionId;
}

@Service()
export class DocPageService {
	constructor(
		private readonly docPageRepository: DocPageRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly agentRepository: AgentRepository,
		private readonly agentThreadRepository: AgentExecutionThreadRepository,
		private readonly projectService: ProjectService,
		private readonly projectRepository: ProjectRepository,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Agent tables exist only while the agents module runs. */
	private get agentsActive() {
		return this.moduleRegistry.isActive('agents');
	}

	// ---- resources ----

	private workflowProperties(workflowId: string, nodes: INode[]) {
		// The webhook base URL ends with a slash.
		const base = this.urlService.getWebhookBaseUrl();
		const { endpoints, chatTrigger } = this.globalConfig;
		return workflowProperties(workflowId, nodes, {
			webhook: `${base}${endpoints.webhook}`,
			form: `${base}${endpoints.form}`,
			publicChat: !chatTrigger.disablePublicChat,
		});
	}

	async loadResource(type: DocPageRootType, id: string): Promise<DocResource | null> {
		if (type === 'project') {
			const project = await this.projectRepository.findOneBy({ id });
			if (!project) return null;
			return {
				type,
				id,
				projectId: id,
				name: project.name,
				kind: null,
				activeVersionId: null,
				isPublished: true,
				published: null,
				properties: null,
			};
		}

		if (type === 'workflow') {
			const workflow = await this.workflowRepository.findById(id);
			const projectId = workflow?.shared?.find((s) => s.role === 'workflow:owner')?.projectId;
			if (!workflow || !projectId) return null;
			const version = workflow.activeVersion;
			const isPublished = Boolean(workflow.activeVersionId) && !workflow.isArchived;
			return {
				type,
				id,
				projectId,
				name: workflow.name,
				kind: version ? detectKind(version.nodes) : null,
				activeVersionId: workflow.activeVersionId,
				isPublished,
				published: version ? { nodes: version.nodes, connections: version.connections } : null,
				properties: version ? this.workflowProperties(id, version.nodes) : null,
			};
		}

		if (!this.agentsActive) return null;
		const agent = await this.agentRepository.findById(id);
		if (!agent) return null;
		return {
			type,
			id,
			projectId: agent.projectId,
			name: agent.name,
			kind: agent.activeVersionId ? 'agent' : null,
			activeVersionId: agent.activeVersionId,
			isPublished: agent.activeVersionId !== null,
			published: agent.activeVersion ? { config: agent.activeVersion.schema } : null,
			properties: agent.activeVersion ? agentProperties(agent) : null,
		};
	}

	async hasAccess(
		user: User,
		resource: Pick<DocResource, 'type' | 'id' | 'projectId'>,
		access: Access,
	) {
		// Project editors cannot update the project itself, but they can write its docs.
		const scope: Scope =
			resource.type === 'project'
				? access === 'read'
					? 'project:read'
					: 'workflow:update'
				: `${resource.type}:${access}`;
		return await userHasScopes(
			user,
			[scope],
			false,
			resource.type === 'workflow'
				? { workflowId: resource.id }
				: { projectId: resource.projectId },
		);
	}

	/** Loads the page, its root and the resource, and checks access. Unreadable pages are not found. */
	async loadForUser(user: User, pageId: string, access: Access) {
		const page = await this.docPageRepository.findById(pageId);
		if (!page) throw new NotFoundError('Page not found');

		const ancestors = await this.docPageRepository.findAncestors(page);
		const root = ancestors[0] ?? page;
		if (!root.resourceType || !root.resourceId) throw new NotFoundError('Page not found');

		const resource = await this.loadResource(root.resourceType, root.resourceId);
		if (!resource || !(await this.hasAccess(user, resource, 'read'))) {
			throw new NotFoundError('Page not found');
		}
		if (access === 'update' && !(await this.hasAccess(user, resource, 'update'))) {
			throw new ForbiddenError('You cannot edit this page');
		}
		return { page, ancestors, resource };
	}

	// ---- single page ----

	/** Returns the page of the resource. Creates an empty page when the resource is documentable. */
	async ensure(user: User, { resourceType, resourceId }: EnsureDocPageDto): Promise<DocPage> {
		const resource = await this.loadResource(resourceType, resourceId);
		if (!resource || !(await this.hasAccess(user, resource, 'read'))) {
			throw new NotFoundError('Resource not found');
		}

		const page = await this.ensureForResource(resource, user.id);
		if (!page) throw new BadRequestError('This resource has no outside entry point to document');
		return await this.get(user, page.id);
	}

	/**
	 * Returns the existing page, or creates an empty one when the resource has a kind.
	 * Returns `null` when the resource is not documentable. No access check.
	 */
	async ensureForResource(resource: DocResource, userId: string | null) {
		const existing = await this.docPageRepository.findByResource(resource.type, resource.id);
		if (existing) return existing;
		if (!resource.kind && resource.type !== 'project') return null;

		try {
			return await this.docPageRepository.insert({
				projectId: resource.projectId,
				parentId: null,
				resourceType: resource.type,
				resourceId: resource.id,
				kind: resource.kind,
				title: resource.name,
				content: null,
				markdown: null,
				contentText: '',
				properties: resource.properties,
				writtenAgainstVersionId: resource.activeVersionId,
				updatedById: userId,
			});
		} catch (error) {
			// The publish listener and a user can create the page at the same time.
			if (!isUniqueConstraintError(error)) throw error;
			return await this.docPageRepository.findByResource(resource.type, resource.id);
		}
	}

	/** Returns the page of the project. Creates an empty one on the first visit. */
	async ensureProjectPage(user: User, projectId: string): Promise<DocPage> {
		const resource = await this.loadResource('project', projectId);
		if (!resource || !(await this.hasAccess(user, resource, 'read'))) {
			throw new NotFoundError('Project not found');
		}
		const page = await this.ensureForResource(resource, user.id);
		if (!page) throw new NotFoundError('Project not found');
		return await this.get(user, page.id);
	}

	/** Root pages of the project that the user can read, with their full text. For the LLM. */
	async projectContents(user: User, projectId: string) {
		const items = await this.listForProject(user, projectId);
		const texts = new Map(
			(await this.docPageRepository.listByProject(projectId)).map((p) => [p.id, p.contentText]),
		);
		return items.map((item) => ({ ...item, text: (item.id && texts.get(item.id)) || '' }));
	}

	async get(user: User, pageId: string): Promise<DocPage> {
		const { page, ancestors, resource } = await this.loadForUser(user, pageId, 'read');
		return await this.toDocPage(user, page, ancestors, resource);
	}

	async update(user: User, pageId: string, dto: UpdateDocPageDto): Promise<DocPage> {
		const { page, ancestors, resource } = await this.loadForUser(user, pageId, 'update');
		if (dto.title !== undefined) page.title = dto.title;
		if (dto.content !== undefined) {
			page.content = dto.content;
			page.markdown = null;
			page.contentText = extractText(dto.content);
		}
		page.updatedById = user.id;
		const saved = await this.docPageRepository.save(page);
		return await this.toDocPage(user, saved, ancestors, resource);
	}

	async createChild(user: User, parentId: string, dto: CreateDocChildPageDto): Promise<DocPage> {
		const { page: parent } = await this.loadForUser(user, parentId, 'update');
		const child = await this.docPageRepository.insert({
			projectId: parent.projectId,
			parentId: parent.id,
			resourceType: null,
			resourceId: null,
			kind: null,
			title: dto.title,
			content: null,
			markdown: null,
			contentText: '',
			properties: null,
			writtenAgainstVersionId: null,
			updatedById: user.id,
		});
		return await this.get(user, child.id);
	}

	/** Deletes a child page and its own children. Root pages live and die with their resource. */
	async deleteChild(user: User, pageId: string) {
		const { page } = await this.loadForUser(user, pageId, 'update');
		if (page.parentId === null) throw new BadRequestError('Only child pages can be deleted');
		await this.docPageRepository.deleteById(page.id);
	}

	async markCurrent(user: User, pageId: string): Promise<DocPage> {
		const { page, ancestors, resource } = await this.loadForUser(user, pageId, 'update');
		if (page.parentId !== null) throw new BadRequestError('Child pages have no version');
		page.writtenAgainstVersionId = resource.activeVersionId;
		page.updatedById = user.id;
		const saved = await this.docPageRepository.save(page);
		return await this.toDocPage(user, saved, ancestors, resource);
	}

	/**
	 * Stores LLM markdown. The editor converts it to JSON at the first save.
	 * Reads the page again, so a save during the LLM call is not written back with old values.
	 */
	async saveGenerated(pageId: string, resource: DocResource, markdown: string, userId: string) {
		const page = await this.docPageRepository.findById(pageId);
		if (!page) throw new NotFoundError('Page not found');
		page.markdown = markdown;
		page.content = null;
		page.contentText = markdown;
		page.writtenAgainstVersionId = resource.activeVersionId;
		page.updatedById = userId;
		return await this.docPageRepository.save(page);
	}

	/** Stores the current facts of the resource on its page, if it has one. */
	async refreshProperties(resource: DocResource) {
		await this.docPageRepository.updatePropertiesByResource(
			resource.type,
			resource.id,
			resource.properties,
		);
	}

	async hasPage(type: DocPageRootType, id: string) {
		return (await this.docPageRepository.findByResource(type, id)) !== null;
	}

	async deleteByResource(type: DocPageRootType, id: string) {
		await this.docPageRepository.deleteByResource(type, id);
	}

	private async toDocPage(
		user: User,
		page: DocPageEntity,
		ancestors: DocPageEntity[],
		resource: DocResource,
	): Promise<DocPage> {
		const children = await this.docPageRepository.findChildren(page.id);
		return {
			id: page.id,
			projectId: page.projectId,
			parentId: page.parentId,
			resourceType: page.resourceType,
			resourceId: page.resourceId,
			kind: page.kind,
			title: page.title,
			content: page.content,
			markdown: page.markdown,
			isStale: isStale(page, resource),
			isPublished: resource.isPublished,
			properties: page.parentId === null ? resource.properties : null,
			canEdit: await this.hasAccess(user, resource, 'update'),
			// The project page is the Docs tab itself, so the breadcrumb leaves it out.
			breadcrumb: ancestors
				.filter((a) => a.resourceType !== 'project')
				.map(({ id, title }) => ({ id, title })),
			children: children.map(({ id, title }) => ({ id, title })),
			updatedAt: page.updatedAt.toISOString(),
		};
	}

	// ---- lists ----

	/** Every documentable resource of the project, with or without a page. */
	async listForProject(user: User, projectId: string): Promise<DocPageSummary[]> {
		const pages = await this.docPageRepository.listByProject(projectId);
		const pageByResource = new Map(
			pages.map((page) => [`${page.resourceType}:${page.resourceId}`, page]),
		);
		const summaries = new Map<string, DocPageSummary>();
		const add = (
			type: DocPageResourceType,
			id: string,
			kind: DocPageKind,
			head: ResourceHead,
			properties: DocPageProperties | null = null,
		) => {
			const page = pageByResource.get(`${type}:${id}`) ?? null;
			summaries.set(`${type}:${id}`, toSummary(page, type, id, projectId, kind, head, properties));
		};

		// Workflows: published ones with a kind, plus the ones that already have a page.
		const published = await this.docPageRepository.findPublishedWorkflowsInProject(projectId);
		const pagedWorkflowIds = pages.flatMap((p) =>
			p.resourceType === 'workflow' && p.resourceId ? [p.resourceId] : [],
		);
		const workflowIds = [...new Set([...published.map((w) => w.id), ...pagedWorkflowIds])];
		const readable = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			workflowIds,
			user,
			['workflow:read'],
		);
		for (const workflow of published) {
			const kind = detectKind(workflow.nodes);
			if (!kind || !readable.has(workflow.id)) continue;
			add(
				'workflow',
				workflow.id,
				kind,
				{ ...workflow, isPublished: true },
				this.workflowProperties(workflow.id, workflow.nodes),
			);
		}
		const unlisted = pagedWorkflowIds.filter(
			(id) => readable.has(id) && !summaries.has(`workflow:${id}`),
		);
		for (const workflow of await this.findWorkflowHeads(unlisted)) {
			const page = pageByResource.get(`workflow:${workflow.id}`);
			if (page?.kind) add('workflow', workflow.id, page.kind, workflow);
		}

		// Agents: every published agent, plus the ones that already have a page.
		if (this.agentsActive && (await userHasScopes(user, ['agent:read'], false, { projectId }))) {
			for (const agent of await this.docPageRepository.findAgentHeads({ projectId })) {
				if (!agent.activeVersionId && !pageByResource.has(`agent:${agent.id}`)) continue;
				add('agent', agent.id, 'agent', { ...agent, isPublished: agent.activeVersionId !== null });
			}
		}

		return [...summaries.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Root pages whose title or text matches `query`, that the user can read. */
	async search(user: User, query: string): Promise<DocPageSummary[]> {
		const pages = await this.docPageRepository.search(query, SEARCH_CANDIDATES);
		const summaries = await this.summarize(user, pages);
		return summaries.slice(0, SEARCH_LIMIT);
	}

	/** For each readable project, its top published documented items. Empty projects are left out. */
	async overview(user: User): Promise<DocOverviewProject[]> {
		const projects = await this.projectService.getAccessibleProjects(user);
		const pages = await this.docPageRepository.listByProjects(projects.map((p) => p.id));
		const summaries = (await this.summarize(user, pages)).filter((s) => s.isPublished);
		const ranks = await this.rank(summaries);

		// Every user can read the page of a project that they can access.
		const projectPages = new Map(
			pages.flatMap((p) =>
				p.resourceType === 'project' && (p.content !== null || p.markdown !== null)
					? [[p.projectId, { id: p.id, content: p.content, markdown: p.markdown }]]
					: [],
			),
		);

		return projects.flatMap((project) => {
			const items = topItems(
				summaries.filter((s) => s.projectId === project.id),
				ranks,
				OVERVIEW_ITEMS,
			);
			const page = projectPages.get(project.id) ?? null;
			if (items.length === 0 && !page) return [];
			return [{ project: { id: project.id, name: project.name, type: project.type }, items, page }];
		});
	}

	/** Workflows rank by production runs. Agents rank by their latest session time. */
	private async rank(summaries: DocPageSummary[]) {
		const ranks = new Map<string, number>();
		const idsOf = (type: DocPageResourceType) =>
			summaries.filter((s) => s.resourceType === type).map((s) => s.resourceId);

		const production = new Set<string>([
			StatisticsNames.productionSuccess,
			StatisticsNames.productionError,
		]);
		const stats = await this.workflowStatisticsRepository.findByWorkflowIds(idsOf('workflow'));
		for (const row of stats) {
			if (!production.has(row.name)) continue;
			ranks.set(row.workflowId, (ranks.get(row.workflowId) ?? 0) + row.rootCount);
		}
		const sessions = await this.agentThreadRepository.findLatestSessionTimes(idsOf('agent'));
		for (const [agentId, time] of sessions) ranks.set(agentId, time);
		return ranks;
	}

	/** Turns root pages into summaries, and drops the pages that the user cannot read. */
	private async summarize(user: User, pages: DocPageEntity[]): Promise<DocPageSummary[]> {
		const ids = (type: DocPageResourceType) =>
			pages.flatMap((p) => (p.resourceType === type && p.resourceId ? [p.resourceId] : []));

		const workflowIds = ids('workflow');
		const readableWorkflows = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			workflowIds,
			user,
			['workflow:read'],
		);
		const workflows = new Map(
			(await this.findWorkflowHeads(workflowIds.filter((id) => readableWorkflows.has(id)))).map(
				(w) => [w.id, w],
			),
		);

		const agentProjects = new Set(
			await this.projectService.getProjectIdsWithScope(user, ['agent:read']),
		);
		const agents = new Map(
			(await this.docPageRepository.findAgentHeads({ ids: this.agentsActive ? ids('agent') : [] }))
				.filter((agent) => agentProjects.has(agent.projectId))
				.map((agent) => [agent.id, { ...agent, isPublished: agent.activeVersionId !== null }]),
		);

		return pages.flatMap((page) => {
			if (!page.resourceType || page.resourceType === 'project' || !page.resourceId || !page.kind)
				return [];
			const head =
				page.resourceType === 'workflow'
					? workflows.get(page.resourceId)
					: agents.get(page.resourceId);
			if (!head) return [];
			return [toSummary(page, page.resourceType, page.resourceId, page.projectId, page.kind, head)];
		});
	}

	private async findWorkflowHeads(ids: string[]) {
		const workflows = await this.workflowRepository.findByIds(ids, {
			fields: ['name', 'activeVersionId', 'isArchived'],
		});
		return workflows.map((w) => ({
			id: w.id,
			name: w.name,
			activeVersionId: w.activeVersionId,
			isPublished: Boolean(w.activeVersionId) && !w.isArchived,
		}));
	}
}

function toSummary(
	page: DocPageEntity | null,
	resourceType: DocPageResourceType,
	resourceId: string,
	projectId: string,
	kind: DocPageKind,
	head: ResourceHead,
	/** Used when the page has no stored properties. */
	fallbackProperties: DocPageProperties | null = null,
): DocPageSummary {
	return {
		id: page?.id ?? null,
		resourceType,
		resourceId,
		projectId,
		name: head.name,
		kind,
		excerpt: (page?.contentText ?? '').slice(0, EXCERPT_LENGTH),
		isStale: page ? isStale(page, head) : false,
		isPublished: head.isPublished,
		properties: page?.properties ?? fallbackProperties,
	};
}

/**
 * Sorts workflows and agents by rank, each in their own list, then takes from both lists in turn.
 * Run counts and session times have no shared scale, so a plain sort cannot mix them.
 */
export function topItems(summaries: DocPageSummary[], ranks: Map<string, number>, limit: number) {
	const sorted = (type: DocPageResourceType) =>
		summaries
			.filter((s) => s.resourceType === type)
			.sort((a, b) => (ranks.get(b.resourceId) ?? 0) - (ranks.get(a.resourceId) ?? 0));
	const workflows = sorted('workflow');
	const agents = sorted('agent');
	const merged: DocPageSummary[] = [];
	while (merged.length < limit && (workflows.length > 0 || agents.length > 0)) {
		const workflow = workflows.shift();
		if (workflow) merged.push(workflow);
		const agent = agents.shift();
		if (agent && merged.length < limit) merged.push(agent);
	}
	return merged;
}
