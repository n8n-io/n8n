import type { User } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import z from 'zod';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

// SPIKE (CONTEXT-142): throwaway tool to measure how MCP clients confirm a
// preference write. Two confirmation paths, both instrumented:
//  - MRTR elicitation (2026-07-28 era): first round returns input_required,
//    the client shows the question to the user and retries the same call with
//    inputResponses.
//  - Model-mediated fallback (client did not declare the elicitation
//    capability): the tool answers with an instruction to ask the user and
//    re-call with `confirmed: true`. The unreliable path, measured not assumed.

const inputSchema = {
	content: z
		.string()
		.min(1)
		.max(2000)
		.describe(
			'The preference text to save, e.g. "Always add error handling to my workflows". ' +
				'Only call this tool when the user explicitly asks to remember or save a preference.',
		),
	confirmed: z
		.boolean()
		.optional()
		.describe(
			'Only pass true after the user explicitly confirmed this exact preference text. ' +
				'Do not pass it on the first call.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	saved: z.boolean(),
	id: z.string().optional(),
	reason: z.string().optional(),
} satisfies z.ZodRawShape;

/** The confirm key used in inputRequests and read back from inputResponses. */
const CONFIRM_KEY = 'confirm';

/** Minimal view of the v2 SDK handler context the spike reads. */
type SpikeHandlerCtx = {
	mcpReq?: {
		envelope?: Record<string, unknown>;
		inputResponses?: Record<string, unknown>;
	};
};

type ElicitationCapability = { form?: unknown; url?: unknown } | undefined;

export const createSaveUserPreferenceTool = (
	user: User,
	aiPreferenceService: AiPreferenceService,
	telemetry: Telemetry,
	logger: Logger,
): ToolDefinition<typeof inputSchema> => ({
	name: 'save_user_preference',
	config: {
		description:
			'Save a personal preference about how the user likes to work with n8n, so future ' +
			'conversations and connected tools apply it. Only call this when the user explicitly ' +
			'asks to remember or save a preference. The preference is confirmed with the user ' +
			'before anything is stored.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Save User Preference',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ content, confirmed }, extra) => {
		const {
			inputRequired,
			inputResponse,
			CLIENT_CAPABILITIES_META_KEY,
			CLIENT_INFO_META_KEY,
			PROTOCOL_VERSION_META_KEY,
		} = await import('@modelcontextprotocol/server');

		const ctx = extra as SpikeHandlerCtx | undefined;
		const envelope = ctx?.mcpReq?.envelope;
		const inputResponses = ctx?.mcpReq?.inputResponses;
		const capabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY] as
			| { elicitation?: ElicitationCapability }
			| undefined;
		// A bare `elicitation: {}` counts as form support on the 2026-07-28 era.
		const canElicit = capabilities?.elicitation !== undefined;

		const confirmView = inputResponse(inputResponses, CONFIRM_KEY);

		// The test-matrix data source: one line per invocation.
		logger.info('[CONTEXT-142] elicitation probe', {
			clientInfo: envelope?.[CLIENT_INFO_META_KEY],
			protocolVersion: envelope?.[PROTOCOL_VERSION_META_KEY],
			hasEnvelope: envelope !== undefined,
			declaredCapabilities: capabilities,
			canElicit,
			hasInputResponses: inputResponses !== undefined,
			confirmResponse: confirmView,
			confirmedArg: confirmed,
		});

		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'save_user_preference',
			parameters: { contentLength: content.length, canElicit, confirmedArg: confirmed === true },
		};

		const notSaved = (reason: string, extraText?: string) => {
			telemetryPayload.results = { success: true, data: { saved: false, reason } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			const output = { saved: false, reason };
			return {
				content: [{ type: 'text' as const, text: extraText ?? JSON.stringify(output) }],
				structuredContent: output,
			};
		};

		const persist = async (confirmationPath: 'elicitation' | 'model-mediated') => {
			logger.info('[CONTEXT-142] persisting preference', { confirmationPath });
			try {
				const preference = await aiPreferenceService.create(
					user,
					{
						content,
						scope: 'user',
					},
					'mcp',
				);
				telemetryPayload.results = {
					success: true,
					data: { saved: true, id: preference.id, confirmationPath },
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				const output = { saved: true, id: preference.id };
				return {
					content: [
						{
							type: 'text' as const,
							text:
								`Preference saved (id ${preference.id}). ` +
								'The user can review it under Settings → Context → Preferences.',
						},
					],
					structuredContent: output,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				telemetryPayload.results = { success: false, error: message };
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				const output = { saved: false, reason: `The write failed: ${message}` };
				return {
					content: [{ type: 'text' as const, text: output.reason }],
					structuredContent: output,
					isError: true,
				};
			}
		};

		// Retry round of the MRTR flow: the client answered the elicitation.
		if (confirmView.kind === 'elicit') {
			if (confirmView.action === 'accept' && confirmView.content?.[CONFIRM_KEY] === true) {
				return await persist('elicitation');
			}
			return notSaved(
				`user ${confirmView.action === 'accept' ? 'answered no' : confirmView.action}`,
				'The user did not confirm, so nothing was saved. Do not retry unless they ask again.',
			);
		}

		// First round, elicitation-capable client: ask through the protocol.
		if (canElicit) {
			// The seam re-checks capabilities after the handler returns and answers
			// -32021 itself if this branch got it wrong, so no try/catch here helps.
			return inputRequired({
				inputRequests: {
					[CONFIRM_KEY]: inputRequired.elicit({
						message: `Save this preference to your n8n account?\n\n"${content}"\n\nIt will be applied to future AI conversations and connected tools.`,
						requestedSchema: {
							type: 'object',
							properties: {
								[CONFIRM_KEY]: {
									type: 'boolean',
									title: 'Save this preference',
									description: 'Choose true to save the preference, false to discard it.',
								},
							},
							required: [CONFIRM_KEY],
						},
					}),
				},
				// Spike returns InputRequiredResult where n8n's ToolHandler declares
				// CallToolResult; the registrar passes it through untouched.
			}) as unknown as ReturnType<typeof notSaved>;
		}

		// Fallback: no elicitation capability declared.
		if (confirmed === true) {
			return await persist('model-mediated');
		}
		return notSaved(
			'confirmation required',
			'Nothing was saved yet. Ask the user to confirm this exact preference text, verbatim: ' +
				`"${content}". Only if they explicitly agree, call this tool again with the same ` +
				'content and confirmed: true. If they decline, do not call it again.',
		);
	},
});
