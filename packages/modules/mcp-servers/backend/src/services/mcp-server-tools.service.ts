import {
	MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH,
	mcpServerSchema,
	type McpServerToolBrokenReason,
	type McpServerToolCandidate,
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
import { WorkflowToolPort, type WorkflowToolRefusal } from '../tools/workflow-tool-port';

/**
 * Parallel drafts after an add can pick the same name. The unique index refuses the second
 * write, and the draft tries again with the next free name. Each refusal means that another
 * draft took a name, so the cap is far above the number of drafts that the editor runs at once.
 */
const DRAFT_SAVE_ATTEMPTS = 10;

const TOOL_CHECK_BATCH_SIZE = 10;

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
		for (let i = 0; i < tools.length; i += TOOL_CHECK_BATCH_SIZE) {
			const batch = tools.slice(i, i + TOOL_CHECK_BATCH_SIZE);
			responses.push(
				...(await Promise.all(
					batch.map(async (tool) => toToolResponse(tool, await this.brokenReason(projectId, tool))),
				)),
			);
		}
		return responses;
	}

	/** Every workflow that the project owns, with the reason when it cannot be a tool of this server. */
	async listCandidates(projectId: string, serverId: string): Promise<McpServerToolCandidate[]> {
		const server = await this.findServer(projectId, serverId);
		const [workflows, tools] = await Promise.all([
			this.workflows.list(projectId),
			this.tools.listByServer(server.id),
		]);
		const added = new Set(tools.map((tool) => tool.targetId));

		const candidates = workflows.flatMap(({ workflowId, name, description, check }) => {
			const unavailable = check.callable ? null : UNAVAILABLE_REASONS[check.reason];
			if (!check.callable && !unavailable) return [];
			const reason = added.has(workflowId) ? ('already_added' as const) : unavailable;
			return [{ workflowId, name, description, reason }];
		});
		return candidates.sort((a, b) => a.name.localeCompare(b.name));
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

	/** An edit by the builder marks the text as `edited`, so the analysis of AI drafts sees it. */
	async updateTool(
		projectId: string,
		serverId: string,
		toolId: string,
		changes: UpdateMcpServerToolDto,
	): Promise<McpServerToolResponse> {
		const tool = await this.findTool(projectId, serverId, toolId);
		const hasChanges = changes.toolName !== undefined || changes.description !== undefined;
		const updated = hasChanges
			? await this.tools.updateInServer(tool.serverId, tool.id, {
					...changes,
					draftSource: 'edited',
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
