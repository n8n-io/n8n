import { APPROVAL_RESUME_SCHEMA, type ApprovalSuspendPayload } from '@n8n/agents/tool';
import { UnprocessableRequestError } from '@n8n/errors';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * The subset of the OpenAI Responses API that the webhook channel speaks: one
 * text message in, one assistant message out, plus one approval request for
 * each action that waits for a decision. Unknown fields are ignored, so an
 * OpenAI SDK client can call the channel.
 */

const ERROR_TYPES = {
	400: 'invalid_request_error',
	401: 'authentication_error',
	403: 'permission_error',
	404: 'not_found_error',
	409: 'conflict_error',
	500: 'server_error',
} as const;

export type WebhookChannelErrorStatus = keyof typeof ERROR_TYPES;

/** An error that the endpoint returns in the OpenAI error shape. */
export class WebhookChannelError extends Error {
	constructor(
		readonly status: WebhookChannelErrorStatus,
		readonly code: string,
		message: string,
		readonly param: string | null = null,
	) {
		super(message);
		this.name = 'WebhookChannelError';
	}

	toBody() {
		return {
			error: {
				message: this.message,
				type: ERROR_TYPES[this.status],
				code: this.code,
				param: this.param,
			},
		};
	}
}

const requestSchema = z.object({
	input: z.string().min(1),
	conversation: z.union([z.string().min(1), z.object({ id: z.string().min(1) })]).optional(),
	stream: z.boolean().optional(),
});

function invalidRequest(error: z.ZodError) {
	const [issue] = error.issues;
	const param = issue?.path[0]?.toString() ?? null;
	const message =
		param === 'input' ? 'input must be a non-empty string' : (issue?.message ?? 'Invalid body');
	return new WebhookChannelError(400, 'invalid_request', message, param);
}

export function parseResponsesRequest(body: unknown): { input: string; conversationId?: string } {
	const parsed = requestSchema.safeParse(body);
	if (!parsed.success) {
		throw invalidRequest(parsed.error);
	}
	const { input, conversation, stream } = parsed.data;
	if (stream) {
		throw new WebhookChannelError(
			400,
			'unsupported_parameter',
			'Streaming is not supported',
			'stream',
		);
	}
	return {
		input,
		conversationId: typeof conversation === 'string' ? conversation : conversation?.id,
	};
}

/** The body of a decision: the resume data that every channel sends for an approval. */
export function parseApprovalDecision(body: unknown) {
	const parsed = APPROVAL_RESUME_SCHEMA.safeParse(body);
	if (!parsed.success) throw invalidRequest(parsed.error);
	return parsed.data;
}

export interface WebhookApprovalRequest {
	toolCallId: string;
	payload: ApprovalSuspendPayload;
	/** The caller sends the decision to this URL. */
	url: string;
}

/** Stands in for the model field, so the reply does not reveal the agent's model. */
const RESPONSE_MODEL = 'n8n-agent';

export function toResponseBody(reply: {
	conversationId: string;
	text: string;
	approvals?: WebhookApprovalRequest[];
	createdAt: Date;
}) {
	return {
		id: `resp_${randomUUID()}`,
		object: 'response',
		created_at: Math.floor(reply.createdAt.getTime() / 1000),
		status: 'completed',
		model: RESPONSE_MODEL,
		conversation: { id: reply.conversationId },
		output: [
			{
				type: 'message',
				id: `msg_${randomUUID()}`,
				status: 'completed',
				role: 'assistant',
				content: [{ type: 'output_text', text: reply.text, annotations: [] }],
			},
			...(reply.approvals ?? []).map(({ toolCallId, payload, url }) => ({
				type: 'approval_request',
				id: toolCallId,
				name: payload.toolName,
				display_name: payload.displayName ?? payload.toolName,
				// A JSON string, as in the tool call items of the Responses API.
				arguments: JSON.stringify(payload.args ?? {}),
				supports_session_approval: payload.supportsSessionApproval === true,
				url,
			})),
		],
	};
}

/**
 * Handlers for the endpoint prefix, mounted after the routes. The global body
 * parser runs before any route, so only an app-level handler sees its error.
 */
export const responsesApiFallback: [RequestHandler, ErrorRequestHandler] = [
	(req, res) => {
		const error = new WebhookChannelError(
			404,
			'unknown_route',
			`Unknown route ${req.method} ${req.path}`,
		);
		res.status(error.status).json(error.toBody());
	},
	(error, _req, res, next) => {
		if (!(error instanceof UnprocessableRequestError)) return next(error);
		const channelError = new WebhookChannelError(
			400,
			'invalid_json',
			'The request body is not valid JSON',
		);
		res.status(channelError.status).json(channelError.toBody());
	},
];
