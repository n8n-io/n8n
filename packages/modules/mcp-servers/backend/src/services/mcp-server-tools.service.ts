import {
	MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH,
	mcpServerSchema,
	type McpServerToolBrokenReason,
	type McpServerToolCandidate,
	type McpServerToolDraftSource,
	type McpServerToolDraftField,
	type McpServerToolDraftResponse,
	type McpServerToolResponse,
	type McpServerWorkflowUnavailableReason,
	type UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	PaymentRequiredError,
	ServiceUnavailableError,
} from '@n8n/errors';

import type { McpServerTool } from '../database/entities/mcp-server-tool.entity';
import type { McpServer } from '../database/entities/mcp-server.entity';
import {
	McpServerToolRepository,
	type McpServerToolChanges,
	type NewWorkflowTool,
} from '../database/repositories/mcp-server-tool.repository';
import { McpServerRepository } from '../database/repositories/mcp-server.repository';
import type { McpServerActor, McpServerToolDraftStatus } from '../mcp-server-events';
import { TextDraftPort, type TextDraftResult } from '../tools/text-draft-port';
import { buildToolDraftPrompt, parseToolDraftAnswer, type ToolDraft } from '../tools/tool-draft';
import { toToolName, uniqueToolName } from '../tools/tool-name';
import {
	WorkflowToolPort,
	type WorkflowToolListItem,
	type WorkflowToolRefusal,
} from '../tools/workflow-tool-port';

/** A page of tool candidates, for a caller that cannot take every workflow of the project. */
export interface McpServerToolCandidatePage {
	candidates: McpServerToolCandidate[];
	/** Checked workflows that are not in `candidates`, because they cannot be a tool. */
	unusable: number;
	/** `true` when the page stopped at the limit, and at least one more workflow fits. */
	more: boolean;
}

export interface McpServerToolCandidateQuery {
	/** Only workflows whose name or description contains this text, in any case. */
	query?: string;
	limit: number;
	/** Also return the workflows that cannot be a tool, with the reason. */
	includeUnusable?: boolean;
}

/**
 * Parallel drafts after an add can pick the same name. The unique index refuses the second
 * write, and the draft tries again with the next free name. Each refusal means that another
 * draft took a name, so the cap is far above the number of drafts that the editor runs at once.
 */
const DRAFT_SAVE_ATTEMPTS = 10;

/** Each check loads the published version, so the picker checks a few workflows at a time. */
const CHECK_BATCH_SIZE = 10;

/** The most workflow checks for one search of candidates. */
const CANDIDATE_CHECK_BUDGET = 200;

/** `null` for `not_found`: a workflow that the project does not own is no candidate. */
const UNAVAILABLE_REASONS: Record<WorkflowToolRefusal, McpServerWorkflowUnavailableReason | null> =
	{
		not_found: null,
		not_published: 'not_published',
		no_supported_trigger: 'missing_trigger',
		incompatible_nodes: 'incompatible_nodes',
		not_callable: 'caller_policy',
	};

/** A workflow that the project no longer owns, or that is archived, counts as deleted. */
function toBrokenReason(refusal: WorkflowToolRefusal): McpServerToolBrokenReason {
	return UNAVAILABLE_REASONS[refusal] ?? 'deleted';
}

function isId(value: string): boolean {
	return mcpServerSchema.shape.id.safeParse(value).success;
}

function toToolResponse(
	tool: McpServerTool,
	brokenReason: McpServerToolBrokenReason | null,
): McpServerToolResponse {
	return {
		id: tool.id,
		serverId: tool.serverId,
		kind: tool.kind,
		targetId: tool.targetId,
		toolName: tool.toolName,
		description: tool.description,
		draftSource: tool.draftSource,
		position: tool.position,
		brokenReason,
		createdAt: tool.createdAt.toISOString(),
		updatedAt: tool.updatedAt.toISOString(),
	};
}

/** The tools of a server: the workflow picker, add, edit, and remove. */
@Service()
export class McpServerToolsService {
	constructor(
		private readonly servers: McpServerRepository,
		private readonly tools: McpServerToolRepository,
		private readonly workflows: WorkflowToolPort,
		private readonly textDrafts: TextDraftPort,
		private readonly events: EventService,
		private readonly logger: Logger,
	) {}

	/** Whether the n8n Assistant can write tool drafts for the user. */
	async draftsAvailable(user: User): Promise<boolean> {
		return await this.textDrafts.isAvailable(user);
	}

	/** The tools of a server, in their order. Each tool says if it is broken, and why. */
	async listTools(projectId: string, serverId: string): Promise<McpServerToolResponse[]> {
		const server = await this.findServer(projectId, serverId);
		const tools = await this.tools.listByServer(server.id);
		// Each check loads a published workflow version, so a large server checks a few at a time.
		const responses: McpServerToolResponse[] = [];
		for (let i = 0; i < tools.length; i += CHECK_BATCH_SIZE) {
			const batch = tools.slice(i, i + CHECK_BATCH_SIZE);
			responses.push(
				...(await Promise.all(
					batch.map(async (tool) => toToolResponse(tool, await this.brokenReason(projectId, tool))),
				)),
			);
		}
		return responses;
	}

	/** One tool of a server. It checks only this tool, not every tool of the server. */
	async getTool(
		projectId: string,
		serverId: string,
		toolId: string,
	): Promise<McpServerToolResponse> {
		const tool = await this.findTool(projectId, serverId, toolId);
		return toToolResponse(tool, await this.brokenReason(projectId, tool));
	}

	/** The names of these workflows of the project, with no check. Unknown IDs are left out. */
	async workflowNames(
		projectId: string,
		workflowIds: string[],
	): Promise<Array<{ workflowId: string; name: string }>> {
		const workflows = await this.workflows.list(projectId, workflowIds);
		return workflows.map(({ workflowId, name }) => ({ workflowId, name }));
	}

	/** Every workflow that the project owns, with the reason when it cannot be a tool of this server. */
	async listCandidates(projectId: string, serverId: string): Promise<McpServerToolCandidate[]> {
		const server = await this.findServer(projectId, serverId);
		const [workflows, tools] = await Promise.all([
			this.workflows.list(projectId),
			this.tools.listByServer(server.id),
		]);
		const added = new Set(tools.map((tool) => tool.targetId));
		const candidates: McpServerToolCandidate[] = [];
		for (let i = 0; i < workflows.length; i += CHECK_BATCH_SIZE) {
			const batch = workflows.slice(i, i + CHECK_BATCH_SIZE);
			const checked = await this.checkCandidates(projectId, batch, added);
			candidates.push(...checked.filter((candidate) => candidate !== null));
		}
		return candidates.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * The first workflows of the project in name order, up to `limit`. It checks only the
	 * workflows that it needs to fill the page, so the cost does not grow with the project.
	 * Without `includeUnusable`, the page has only the workflows that can be a tool.
	 */
	async findCandidates(
		projectId: string,
		serverId: string,
		{ query, limit, includeUnusable = false }: McpServerToolCandidateQuery,
	): Promise<McpServerToolCandidatePage> {
		const server = await this.findServer(projectId, serverId);
		const [workflows, tools] = await Promise.all([
			this.workflows.list(projectId),
			this.tools.listByServer(server.id),
		]);
		const added = new Set(tools.map((tool) => tool.targetId));
		const needle = query?.trim().toLowerCase();
		const matching = (
			needle
				? workflows.filter(({ name, description }) =>
						`${name}\n${description ?? ''}`.toLowerCase().includes(needle),
					)
				: workflows
		).sort((a, b) => a.name.localeCompare(b.name));

		const page: McpServerToolCandidatePage = { candidates: [], unusable: 0, more: false };
		for (let i = 0; i < matching.length; i += CHECK_BATCH_SIZE) {
			// Each check loads a published version. A project with many unusable workflows stops
			// here, and the caller narrows the search with a query.
			if (i >= CANDIDATE_CHECK_BUDGET) {
				page.more = true;
				return page;
			}
			const batch = matching.slice(i, i + CHECK_BATCH_SIZE);
			const checked = await this.checkCandidates(projectId, batch, added);
			for (const candidate of checked) {
				if (candidate === null) continue;
				if (candidate.reason !== null && !includeUnusable) {
					// A workflow that is already a tool is not one that "cannot be a tool".
					if (candidate.reason !== 'already_added') page.unusable++;
					continue;
				}
				if (page.candidates.length === limit) {
					page.more = true;
					return page;
				}
				page.candidates.push(candidate);
			}
		}
		return page;
	}

	/** `null` for a workflow that is no candidate at all, such as one the project lost. */
	private async checkCandidates(
		projectId: string,
		workflows: WorkflowToolListItem[],
		added: Set<string | null>,
	): Promise<Array<McpServerToolCandidate | null>> {
		return await Promise.all(
			workflows.map(async ({ workflowId, name, description }) => {
				// The check comes first, so a workflow that the project lost is no candidate.
				const check = await this.workflows.check(projectId, workflowId);
				const reason = check.callable ? null : UNAVAILABLE_REASONS[check.reason];
				if (!check.callable && !reason) return null;
				if (added.has(workflowId)) {
					return { workflowId, name, description, reason: 'already_added' as const };
				}
				return { workflowId, name, description, reason };
			}),
		);
	}

	/**
	 * Saves one tool for each workflow, with the workflow name and description as the default
	 * text. If one workflow cannot be a tool, nothing is saved.
	 */
	async addWorkflowTools(
		projectId: string,
		serverId: string,
		workflowIds: string[],
		actor: McpServerActor,
	): Promise<McpServerToolResponse[]> {
		const server = await this.findServer(projectId, serverId);
		const existing = await this.tools.listByServer(server.id);
		const added = new Set(existing.map((tool) => tool.targetId));
		const taken = new Set(existing.map((tool) => tool.toolName));

		const newTools: NewWorkflowTool[] = [];
		for (const workflowId of new Set(workflowIds)) {
			if (added.has(workflowId)) {
				throw new ConflictError(`The server already has the workflow "${workflowId}" as a tool.`);
			}
			const described = await this.workflows.describe(projectId, workflowId);
			if (!described.callable) {
				const reason = UNAVAILABLE_REASONS[described.reason];
				throw new BadRequestError(
					reason
						? `The workflow "${workflowId}" cannot be a tool: ${reason}.`
						: `The project has no workflow "${workflowId}".`,
				);
			}
			const toolName = uniqueToolName(toToolName(described.name), taken);
			taken.add(toolName);
			newTools.push({
				workflowId,
				toolName,
				description: (described.description ?? '')
					.trim()
					.slice(0, MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH),
			});
		}

		const saved = await this.tools.addWorkflowTools(server.id, newTools);
		for (const tool of saved) {
			this.events.emit('mcp-server-tool-added', {
				...actor,
				serverId: server.id,
				toolKind: tool.kind,
			});
		}
		return saved.map((tool) => toToolResponse(tool, null));
	}

	/**
	 * `draftSource` says who wrote the new text, so the analysis of AI drafts sees it: `edited`
	 * for the builder in the UI, `ai` for the n8n Assistant after the approval of the builder.
	 */
	async updateTool(
		projectId: string,
		serverId: string,
		toolId: string,
		changes: UpdateMcpServerToolDto,
		draftSource: Extract<McpServerToolDraftSource, 'ai' | 'edited'> = 'edited',
	): Promise<McpServerToolResponse> {
		const tool = await this.findTool(projectId, serverId, toolId);
		const hasChanges = changes.toolName !== undefined || changes.description !== undefined;
		const updated = hasChanges
			? await this.tools.updateInServer(tool.serverId, tool.id, {
					...changes,
					draftSource,
				})
			: tool;
		if (!updated) throw new NotFoundError('Tool not found');
		return toToolResponse(updated, await this.brokenReason(projectId, updated));
	}

	/**
	 * Writes the tool name and the description with the n8n Assistant, in one model call. With
	 * `field`, only that field changes. Without the Assistant, the tool keeps its text. A draft
	 * that breaks the rules gives an error, and the tool keeps its text.
	 */
	async draftTool(
		user: User,
		projectId: string,
		serverId: string,
		toolId: string,
		actor: McpServerActor,
		field?: McpServerToolDraftField,
	): Promise<McpServerToolDraftResponse> {
		const tool = await this.findTool(projectId, serverId, toolId);
		const track = (status: McpServerToolDraftStatus) =>
			this.events.emit('mcp-server-tool-drafted', {
				...actor,
				serverId: tool.serverId,
				field: field ?? 'both',
				status,
			});
		if (!(await this.textDrafts.isAvailable(user))) {
			track('not_available');
			return {
				status: 'not_available',
				tool: toToolResponse(tool, await this.brokenReason(projectId, tool)),
			};
		}
		if (tool.kind !== 'workflow' || !tool.targetId) {
			throw new BadRequestError('Only a workflow tool gets a draft.');
		}
		const described = await this.workflows.describe(projectId, tool.targetId);
		if (!described.callable) {
			throw new BadRequestError(
				`The tool is broken (${toBrokenReason(described.reason)}), so n8n cannot write a draft.`,
			);
		}

		const prompt = buildToolDraftPrompt(
			{
				workflowName: described.name,
				workflowDescription: described.description,
				inputSchema: described.inputSchema,
				nodeNames: described.nodeNames,
			},
			field
				? { field, current: { toolName: tool.toolName, description: tool.description } }
				: undefined,
		);
		let result: TextDraftResult;
		try {
			result = await this.textDrafts.draft(user, prompt);
		} catch {
			track('model_failed');
			throw new ServiceUnavailableError('The n8n Assistant could not write a draft. Try again.');
		}
		if (result.status === 'not_available') {
			track('not_available');
			return { status: 'not_available', tool: toToolResponse(tool, null) };
		}
		if (result.status === 'no_credits') {
			track('no_credits');
			throw new PaymentRequiredError(
				'You have no n8n Assistant credits left, so n8n cannot write a draft.',
			);
		}

		const answer = parseToolDraftAnswer(result.text, field);
		if (!answer.ok) {
			this.logger.warn('The draft of a custom MCP server tool broke the rules', {
				serverId: tool.serverId,
				toolId: tool.id,
				error: answer.error,
			});
			track('invalid_answer');
			throw new ServiceUnavailableError(answer.error);
		}
		const updated = await this.saveDraft(tool, answer.draft);
		track('drafted');
		return { status: 'drafted', tool: toToolResponse(updated, null) };
	}

	/** A drafted name that another tool of the server has gets `_2`, `_3`, and so on. */
	private async saveDraft(tool: McpServerTool, draft: ToolDraft): Promise<McpServerTool> {
		for (let attempt = 1; ; attempt++) {
			const changes: McpServerToolChanges = { ...draft, draftSource: 'ai' };
			if (draft.toolName !== undefined) {
				const others = await this.tools.listByServer(tool.serverId);
				const taken = new Set(
					others.filter((other) => other.id !== tool.id).map((other) => other.toolName),
				);
				changes.toolName = uniqueToolName(draft.toolName, taken);
			}
			try {
				const updated = await this.tools.updateInServer(tool.serverId, tool.id, changes);
				if (!updated) throw new NotFoundError('Tool not found');
				return updated;
			} catch (error) {
				if (!(error instanceof ConflictError) || attempt >= DRAFT_SAVE_ATTEMPTS) throw error;
			}
		}
	}

	async removeTool(projectId: string, serverId: string, toolId: string): Promise<void> {
		const tool = await this.findTool(projectId, serverId, toolId);
		await this.tools.deleteInServer(tool.serverId, tool.id);
	}

	private async findServer(projectId: string, serverId: string): Promise<McpServer> {
		const server = isId(serverId) ? await this.servers.findInProject(projectId, serverId) : null;
		if (!server) throw new NotFoundError('MCP server not found');
		return server;
	}

	private async findTool(
		projectId: string,
		serverId: string,
		toolId: string,
	): Promise<McpServerTool> {
		const server = await this.findServer(projectId, serverId);
		const tool = isId(toolId) ? await this.tools.findInServer(server.id, toolId) : null;
		if (!tool) throw new NotFoundError('Tool not found');
		return tool;
	}

	/** `targetId` has no foreign key, so n8n finds out at read time if the workflow still fits. */
	private async brokenReason(
		projectId: string,
		tool: McpServerTool,
	): Promise<McpServerToolBrokenReason | null> {
		if (tool.kind !== 'workflow' || !tool.targetId) return null;
		const check = await this.workflows.check(projectId, tool.targetId);
		return check.callable ? null : toBrokenReason(check.reason);
	}
}
