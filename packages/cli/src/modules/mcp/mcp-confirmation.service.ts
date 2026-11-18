import type { InputRequiredResult } from '@modelcontextprotocol/server';
import type { InstanceAiApprovalDetails, InstanceAiConfirmationSeverity } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import { jsonStringify } from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { InstanceSettings } from 'n8n-core';

/**
 * The `_meta` key on a confirmation's elicit request. It carries the approval
 * as the n8n Assistant's own tools describe one, so the Assistant renders its
 * approval card for it. A generic client sees the `message` and the form.
 */
export const MCP_APPROVAL_META_KEY = 'n8n/approval';

/** The key of the one input request a confirmation asks, read back from the retry. */
const CONFIRM_KEY = 'confirm';

const KEY_LABEL = 'mcp-confirmation-request-state';

/** Long enough for an approval card to wait for a person. */
const STATE_TTL_MS = 24 * 60 * 60 * 1000;

export interface McpApprovalMeta {
	approvalDetails: InstanceAiApprovalDetails;
	resourceName?: string;
	severity: InstanceAiConfirmationSeverity;
}

export interface McpConfirmationRequest {
	tool: string;
	/** The call's arguments. The minted state binds the confirmation to them. */
	args: Record<string, unknown>;
	/** What the action does, in the words of the card. */
	message: string;
	approval: McpApprovalMeta;
}

export type McpConfirmationOutcome =
	/** The client cannot answer a form, or it accepted: run the action. */
	| { kind: 'proceed' }
	/** First round: return this result; the client answers and retries the call. */
	| { kind: 'ask'; result: InputRequiredResult }
	| { kind: 'declined' }
	/** The echoed state does not belong to this call, this user, or has expired. */
	| { kind: 'invalid' };

/** The slice of the SDK handler context a confirmation reads. */
interface ConfirmationHandlerContext {
	envelope?: Record<string, unknown>;
	inputResponses?: Record<string, unknown>;
	requestState?: () => unknown;
}

interface StatePayload {
	tool: string;
	userId: string;
	argsHash: string;
	exp: number;
}

function isStateAccessor(value: unknown): value is () => unknown {
	return typeof value === 'function';
}

function readHandlerContext(extra: unknown): ConfirmationHandlerContext {
	if (!isRecord(extra) || !isRecord(extra.mcpReq)) return {};
	const { envelope, inputResponses, requestState } = extra.mcpReq;
	return {
		...(isRecord(envelope) ? { envelope } : {}),
		...(isRecord(inputResponses) ? { inputResponses } : {}),
		...(isStateAccessor(requestState) ? { requestState } : {}),
	};
}

/**
 * Whether the client can show a form. On this revision a client names its
 * modes; a bare `elicitation: {}` still counts as form support.
 */
function supportsFormElicitation(capabilities: unknown): boolean {
	const elicitation = isRecord(capabilities) ? capabilities.elicitation : undefined;
	if (!isRecord(elicitation)) return false;
	return 'form' in elicitation || !('url' in elicitation);
}

function isStatePayload(value: unknown): value is StatePayload {
	return (
		isRecord(value) &&
		typeof value.tool === 'string' &&
		typeof value.userId === 'string' &&
		typeof value.argsHash === 'string' &&
		typeof value.exp === 'number'
	);
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	if (isRecord(value)) {
		const keys = Object.keys(value).sort();
		return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
	}
	return jsonStringify(value);
}

/**
 * Asks the client to confirm a write before it happens, in the multi-round-trip
 * shape of protocol revision 2026-07-28: the first round answers with an
 * `input_required` form and an HMAC-signed `requestState`; the client answers
 * and retries the same call, and the retry runs the write.
 *
 * A client that declares no form elicitation gets no confirmation, as before.
 */
@Service()
export class McpConfirmationService {
	private key: Buffer | undefined;

	constructor(private readonly instanceSettings: InstanceSettings) {}

	/** Derived on first use, so a tool that never asks never reads the instance secret. */
	private get hmacKey(): Buffer {
		this.key ??= createHmac('sha256', this.instanceSettings.hmacSignatureSecret)
			.update(KEY_LABEL)
			.digest();
		return this.key;
	}

	async confirm(
		extra: unknown,
		user: User,
		request: McpConfirmationRequest,
	): Promise<McpConfirmationOutcome> {
		const { inputRequired, inputResponse, CLIENT_CAPABILITIES_META_KEY } = await lazyImport<
			typeof import('@modelcontextprotocol/server')
		>(async () => await import('@modelcontextprotocol/server'));

		const ctx = readHandlerContext(extra);
		if (!supportsFormElicitation(ctx.envelope?.[CLIENT_CAPABILITIES_META_KEY])) {
			return { kind: 'proceed' };
		}

		const argsHash = createHmac('sha256', this.hmacKey)
			.update(stableStringify(request.args))
			.digest('hex');
		const answer = inputResponse(ctx.inputResponses, CONFIRM_KEY);

		if (answer.kind === 'missing') {
			const requestState = this.mint({
				tool: request.tool,
				userId: user.id,
				argsHash,
				exp: Date.now() + STATE_TTL_MS,
			});
			return {
				kind: 'ask',
				result: inputRequired({
					inputRequests: {
						[CONFIRM_KEY]: inputRequired.elicit({
							message: request.message,
							requestedSchema: {
								type: 'object',
								properties: {
									confirm: {
										type: 'boolean',
										title: 'Confirm',
										description: request.message,
									},
								},
								required: ['confirm'],
							},
							_meta: { [MCP_APPROVAL_META_KEY]: request.approval },
						}),
					},
					requestState,
				}),
			};
		}

		const state = this.verify(ctx.requestState?.());
		if (
			!state ||
			state.tool !== request.tool ||
			state.userId !== user.id ||
			state.argsHash !== argsHash
		) {
			return { kind: 'invalid' };
		}
		if (answer.kind !== 'elicit' || answer.action !== 'accept') return { kind: 'declined' };
		if (answer.content?.confirm === false) return { kind: 'declined' };
		return { kind: 'proceed' };
	}

	private mint(payload: StatePayload): string {
		const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
		return `${body}.${this.sign(body)}`;
	}

	private verify(state: unknown): StatePayload | undefined {
		if (typeof state !== 'string') return undefined;
		const [body, mac] = state.split('.');
		if (!body || !mac) return undefined;
		const expected = this.sign(body);
		if (
			mac.length !== expected.length ||
			!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
		) {
			return undefined;
		}
		let payload: unknown;
		try {
			payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		} catch {
			return undefined;
		}
		if (!isStatePayload(payload) || payload.exp < Date.now()) return undefined;
		return payload;
	}

	private sign(body: string): string {
		return createHmac('sha256', this.hmacKey).update(body).digest('base64url');
	}
}
