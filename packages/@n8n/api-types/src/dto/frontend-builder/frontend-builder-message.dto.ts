import { z } from 'zod';

import { Z } from '../../zod-class';

// ─── Private helpers ────────────────────────────────────────────────

const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const endpointSchema = z.object({
	nodeName: z.string().min(1),
	method: httpMethodSchema,
	url: z.string().url(),
	requestExample: z.unknown().optional(),
	responseExample: z.unknown().optional(),
});

// ─── n8n FE → n8n BE: request contracts ─────────────────────────────
//
// The body the editor sends when the user hits "send" in the drawer.
// Parsed by the POST /workflows/:workflowId/frontend/messages controller.

export class FrontendBuilderMessageRequestDto extends Z.class({
	prompt: z.string().min(1).max(4000),
	endpoints: z.array(endpointSchema).min(1),
}) {}

// ─── Chat messages: shared shape ────────────────────────────────────
//
// Appears in BE → FE responses (assistantMessage, messages[]) and is
// also used to validate raw v0 SDK responses at the BE ↔ v0 boundary
// (see V0Client.toMessage in the frontend-builder module). Keeping a
// zod schema (not just a type) so we can parse at that boundary and
// fail loudly if v0's shape drifts.

export const frontendBuilderMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string(),
	createdAt: z.string(),
});

export type FrontendBuilderMessage = z.infer<typeof frontendBuilderMessageSchema>;

// ─── n8n BE → n8n FE: response contracts ────────────────────────────

/** Response of POST /workflows/:workflowId/frontend/messages. */
export type FrontendBuilderMessageResponse = {
	chatId: string;
	demoUrl: string | null;
	assistantMessage: FrontendBuilderMessage;
};

/**
 * Response of GET /workflows/:workflowId/frontend.
 *
 * The drawer rehydrates from this on open. The discriminated union
 * forces the FE to handle the "no chat yet" case distinctly from
 * "chat exists but v0 hasn't produced a demoUrl yet".
 */
export type FrontendBuilderStateResponse =
	| { chatId: null }
	| {
			chatId: string;
			demoUrl: string | null;
			messages: FrontendBuilderMessage[];
	  };
