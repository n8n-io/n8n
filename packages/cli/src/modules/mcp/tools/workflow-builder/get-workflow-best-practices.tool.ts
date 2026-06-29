import type { User } from '@n8n/db';
import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
	type WorkflowTechniqueType,
} from '@n8n/workflow-sdk/prompts/best-practices';
import z from 'zod';

import type { Telemetry } from '@/telemetry';

import { MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL } from './constants';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

const LIST_SENTINEL = 'list';

const inputSchema = {
	technique: z
		.union([z.nativeEnum(WorkflowTechnique), z.literal(LIST_SENTINEL)])
		.describe(
			`Workflow technique key (e.g. "chatbot", "scheduling", "triage") to fetch best-practices guidance for. Pass "${LIST_SENTINEL}" to discover all available techniques.`,
		),
} satisfies z.ZodRawShape;

const availableTechniqueSchema = z.object({
	technique: z.string(),
	description: z.string(),
	hasDocumentation: z.boolean(),
});

const outputSchema = {
	technique: z
		.string()
		.describe('The requested technique key, or "list" when listing all available techniques.'),
	message: z.string().describe('Human-readable summary of the response.'),
	documentation: z
		.string()
		.optional()
		.describe(
			'Best-practices documentation for the requested technique, when one with documentation was requested.',
		),
	availableTechniques: z
		.array(availableTechniqueSchema)
		.optional()
		.describe('All available techniques, returned when "list" was requested.'),
} satisfies z.ZodRawShape;

function buildListResponse() {
	const availableTechniques = Object.entries(TechniqueDescription).map(([key, description]) => ({
		technique: key,
		description,
		hasDocumentation: bestPracticesRegistry[key as WorkflowTechniqueType] !== undefined,
	}));

	const documentedCount = availableTechniques.filter((t) => t.hasDocumentation).length;
	const message = `Found ${availableTechniques.length} workflow techniques. ${documentedCount} have detailed best-practices documentation. Call this tool again with a specific technique key to fetch its guidance.`;

	const text = [
		message,
		'',
		...availableTechniques.map(
			(t) =>
				`- ${t.technique}${t.hasDocumentation ? '' : ' (no detailed documentation yet)'} — ${t.description}`,
		),
	].join('\n');

	return {
		text,
		hasDocumentation: false,
		structured: {
			technique: LIST_SENTINEL,
			message,
			availableTechniques,
		},
	};
}

function buildTechniqueResponse(technique: WorkflowTechniqueType) {
	const doc = bestPracticesRegistry[technique];

	if (doc) {
		const documentation = doc.getDocumentation();
		return {
			text: documentation,
			hasDocumentation: true,
			structured: {
				technique,
				message: `Best-practices documentation for "${technique}" retrieved.`,
				documentation,
			},
		};
	}

	const description = TechniqueDescription[technique];
	const message = `Technique "${technique}" (${description}) does not have detailed best-practices documentation yet — proceed with general n8n knowledge.`;
	return { text: message, hasDocumentation: false, structured: { technique, message } };
}

/**
 * MCP tool that returns workflow design best-practices for a given workflow technique.
 * Sources guidance directly from `bestPracticesRegistry` in `@n8n/workflow-sdk`.
 */
export const createGetWorkflowBestPracticesTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL.toolName,
	config: {
		description:
			'Required workflow-planning step. Get best-practices guidance (recommended nodes, patterns, and common pitfalls) for a specific workflow technique before searching for nodes or writing code. Call once per relevant technique. Use technique="list" first if unsure which techniques apply.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ technique }: { technique: WorkflowTechniqueType | typeof LIST_SENTINEL }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL.toolName,
			parameters: { technique },
		};

		try {
			const response =
				technique === LIST_SENTINEL ? buildListResponse() : buildTechniqueResponse(technique);

			telemetryPayload.results = {
				success: true,
				data: {
					technique,
					hasDocumentation: response.hasDocumentation,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: response.text }],
				structuredContent: response.structured,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
