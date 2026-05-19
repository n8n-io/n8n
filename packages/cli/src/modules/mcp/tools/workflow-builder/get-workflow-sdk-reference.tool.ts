import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { Telemetry } from '@/telemetry';

import { MCP_GET_SDK_REFERENCE_TOOL } from './constants';
import { getSdkReferenceContent, type SdkReferenceSection } from './sdk-reference-content';

const VALID_SECTIONS: SdkReferenceSection[] = [
	'patterns',
	'patterns_detailed',
	'expressions',
	'functions',
	'rules',
	'import',
	'guidelines',
	'design',
	'all',
];

const inputSchema = {
	section: z
		.enum(VALID_SECTIONS as [string, ...string[]])
		.optional()
		.describe(
			'Optional section to retrieve. Omit this for the full reference, or use a section for targeted lookup.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	reference: z.string().describe('SDK reference documentation content for the requested section'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that returns the n8n Workflow SDK reference documentation.
 * This should be called first when building workflows to learn the SDK patterns and syntax.
 */
export const createGetWorkflowSdkReferenceTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_GET_SDK_REFERENCE_TOOL.toolName,
	config: {
		description:
			'Required reference for building n8n Workflow SDK code. Call this BEFORE writing workflow code to learn workflow(), trigger()/node(), .add()/.to(), expr(), and credential patterns.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_GET_SDK_REFERENCE_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ section }: { section?: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_GET_SDK_REFERENCE_TOOL.toolName,
			parameters: { section },
		};

		const content = getSdkReferenceContent(section as SdkReferenceSection | undefined);

		telemetryPayload.results = { success: true };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		return {
			content: [{ type: 'text', text: content }],
			structuredContent: { reference: content },
		};
	},
});
