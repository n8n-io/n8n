// Decision schema (structured-output target) + encoders to InstanceAiConfirmRequest.

import { domainAccessActionSchema, instanceGatewayResourceDecisionSchema } from '@n8n/api-types';
import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Decision schema — the structured-output shape the model fills
// ---------------------------------------------------------------------------

const answerSchema = z.object({
	questionId: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

const answerQuestionsDecisionSchema = z.object({
	action: z.literal('answer_questions'),
	answers: z.array(answerSchema),
});

const applySetupWizardDecisionSchema = z.object({
	action: z.literal('apply_setup_wizard'),
	// JSON-encoded object mapping setup node name -> parameter map. Emitted as a string
	// because Anthropic structured output rejects nested z.record schemas.
	nodeParametersJson: z.string(),
	/**
	 * JSON-encoded object mapping setup node name -> credential type -> existing
	 * credential id to select (`{"<node>": {"<credentialType>": "<id>"}}`),
	 * e.g. from `setupRequests[].existingCredentials`. Omit/empty by default —
	 * only populate when a stage direction governing this exact card asks the
	 * user to engage with a credential slot instead of leaving it deferred.
	 */
	nodeCredentialsJson: z.string().optional(),
});

const approveOrRejectDecisionSchema = z.object({
	action: z.literal('approve_or_reject'),
	approved: z.boolean(),
	userInput: z.string().optional(),
});

const respondToDomainAccessDecisionSchema = z.object({
	action: z.literal('respond_to_domain_access'),
	response: z.enum(['allow_once', 'allow_all', 'deny']),
});

const pickResourceDecisionSchema = z.object({
	action: z.literal('pick_resource_decision'),
	decision: z.string(),
});

/**
 * Response to a standalone credential-setup card (`credentials(action='setup')`
 * suspending — TRUST-349). Only offered to the model when a stage direction
 * governs this exact moment; the deterministic default (no direction) never
 * reaches the LLM at all (see `confirmation-payload.ts`'s
 * `allowCredentialEngagement` gate), so `skip` here is for the case where a
 * direction explicitly asks the user to decline rather than the ambient default.
 *
 * Wire shapes, verified against `credentials.tool.ts`'s `handleSetup` state
 * machine and `instance-ai.service.ts`'s `toConfirmationData`/`resumeSuspendedRun`
 * (see doc block on `CredentialSetupParseContext` below for the full mapping):
 *  - `manual` → `{kind:'credentialSelection', credentials:{[type]: id}}` — the
 *    resume payload itself is how the assistant learns the credential exists
 *    (tool State 5); no re-check round-trip.
 *  - `auto`   → `{kind:'credentialAutoSetup', credentialType}` — triggers an
 *    agent rebuild server-side and a `needsBrowserSetup:true` tool result
 *    (tool State 4). Reachable for shape-completeness only — the harness has
 *    no Computer Use tools attached, so a case scripting this will stall
 *    afterward. Do not push such a case to the gated CI suite.
 *  - `skip`   → `{kind:'approval', approved:false}` — tool State 2 (deferred).
 */
const chooseCredentialSetupOptionDecisionSchema = z.object({
	action: z.literal('choose_credential_setup_option'),
	option: z.enum(['auto', 'manual', 'skip']),
	/** Which `credentialRequests[].credentialType` this applies to. Optional
	 *  when the card requests exactly one credential (the common case). */
	credentialType: z.string().optional(),
	/** For `manual` when the card lists more than one existing credential of
	 *  the resolved type — the `id` of the one to select (from
	 *  `credentialRequests[].existingCredentials[].id`). Optional when there's
	 *  only one candidate; required to disambiguate when there are several. */
	existingCredentialId: z.string().optional(),
});

const sendFollowUpMessageDecisionSchema = z.object({
	action: z.literal('send_follow_up_message'),
	message: z.string(),
});

const declareDoneDecisionSchema = z.object({
	action: z.literal('declare_done'),
});

/**
 * The two moments the proxy is asked to decide, each with its own action menu:
 *  - `confirmation` — the agent paused mid-run to show a widget; the proxy must
 *    respond to that widget.
 *  - `user-turn` — the agent's run finished with nothing pending; the turn passed
 *    to the user, who either types a chat message or ends the conversation.
 * The schema handed to the model per mode IS the action menu — actions that
 * cannot function at that moment are not offered at all.
 */
export type ProxyDecisionMode = 'confirmation' | 'user-turn';

export const confirmationDecisionSchema = z.discriminatedUnion('action', [
	answerQuestionsDecisionSchema,
	applySetupWizardDecisionSchema,
	approveOrRejectDecisionSchema,
	respondToDomainAccessDecisionSchema,
	pickResourceDecisionSchema,
	chooseCredentialSetupOptionDecisionSchema,
]);

export const userTurnDecisionSchema = z.discriminatedUnion('action', [
	sendFollowUpMessageDecisionSchema,
	declareDoneDecisionSchema,
]);

/** Full union — the type every decision consumer handles. Agents are only ever
 *  offered the mode-scoped subsets above. */
export const decisionSchema = z.discriminatedUnion('action', [
	answerQuestionsDecisionSchema,
	applySetupWizardDecisionSchema,
	approveOrRejectDecisionSchema,
	respondToDomainAccessDecisionSchema,
	pickResourceDecisionSchema,
	chooseCredentialSetupOptionDecisionSchema,
	sendFollowUpMessageDecisionSchema,
	declareDoneDecisionSchema,
]);

export type Decision = z.infer<typeof decisionSchema>;

export interface SetupWizardParseContext {
	nodes: Array<{
		nodeId?: string;
		nodeName: string;
		parameterNames: string[];
		/**
		 * Credential types this node still needs (workflow setup wizard shows one
		 * `setupRequests[]` entry per (node, credentialType) combo), each with its
		 * existing-credential pick list — mirrors `CredentialSetupParseContext`
		 * below but scoped per node, since a wizard card can list several nodes.
		 */
		credentialRequests: Array<{
			credentialType: string;
			existingCredentials: Array<{ id: string; name: string }>;
		}>;
	}>;
}

/**
 * The credential-setup card's `credentialRequests[]`, carried through so
 * `manual`/`auto` can resolve a `credentialType` (and, for `manual`, an
 * existing credential id already visible under the thread's eval allowlist —
 * see `EvalThreadCredentialAllowlistService` — to select) without re-deriving
 * it from the model's free-form answer.
 */
export interface CredentialSetupParseContext {
	requests: Array<{
		credentialType: string;
		existingCredentials: Array<{ id: string; name: string }>;
	}>;
}

// ---------------------------------------------------------------------------
// Tool descriptions — bundled with the prompt so the model picks the right action
// ---------------------------------------------------------------------------

export const CONFIRMATION_TOOL_DESCRIPTIONS = `Available actions — confirmation responses. A widget is on screen: the agent paused mid-run and is waiting for the user to respond to the event shown in this prompt. Pick the action that matches the widget:

- answer_questions(answers[]): The agent fired an ask-user confirmation (inputType=questions). Answer every question with a plausible value — stated → implied → invented. Invent rather than skip. Set skipped=true only when the question has no plausible answer of any shape, OR when a [stage direction] in the script tells the user to decline or withhold that value — in that case you MUST set skipped=true with an empty selectedOptions and pick NO option (not even one that looks standard or obvious); picking a value defeats the test.

- apply_setup_wizard(nodeParametersJson, nodeCredentialsJson?): The agent fired a setup-wizard / "configure your workflow" setup card with placeholder parameters and/or credential slots (the event's payload has \`setupRequests\`). \`nodeParametersJson\` decodes to { "<setup node name>": { "<paramName>": <value>, ... }, ... } — fill every non-credential placeholder with a plausible value (stated → implied → invented). Credential slots (a request entry with \`credentialType\`) stay unset by default — omit \`nodeCredentialsJson\` or leave that node/type out of it — UNLESS a stage direction governing this exact card tells the user to engage; then set \`nodeCredentialsJson\` to { "<setup node name>": { "<credentialType>": "<id>" } }, where \`<id>\` is one of that request's \`existingCredentials[].id\` (match the credential the direction names by its \`name\`). This is the ONLY correct way to fill a setup card — do NOT answer it with answer_questions. To deliberately leave a value unset (e.g. a stage direction says the user skips it), dismiss the whole card with approve_or_reject(approved=false) instead of filling it.

- approve_or_reject(approved, userInput?): A plan-review or free-text confirmation widget is on screen (the event's inputType is plan-review or text). Approve if the plan matches user intent; reject with reason if it diverges. This action only exists as a response to such a widget.

- respond_to_domain_access(response): The agent is asking for domain access permissions. Pick allow_once, allow_all, or deny. Default to allow_all unless the user would deny.

- pick_resource_decision(decision): The agent is asking the user to pick a gateway resource access option. Pick the option the user would choose.

- choose_credential_setup_option(option, credentialType?, existingCredentialId?): The agent opened a standalone credential setup card (the event's payload has \`credentialRequests\`, not \`setupRequests\`). You are only ever shown this action when a stage direction governs this exact moment — outside that, credentials stay deferred automatically and you never see this event. Follow the direction: \`manual\` to select the existing credential the card lists for that type (the user "fills the form" with a credential they already have) — if \`credentialRequests[].existingCredentials\` lists more than one for that type, set \`existingCredentialId\` to the \`id\` of the one the direction names (match by its \`name\`); with only one candidate you can omit it. \`auto\` hands off to automatic browser-based setup (shape-only — the harness cannot actually drive that flow, so only script this in a throwaway local check, never in a case meant for the gated suite). \`skip\` if the direction says to decline. Never pick this action on your own initiative — only in response to a direction that explicitly asks for credential engagement.`;

export const USER_TURN_TOOL_DESCRIPTIONS = `Available actions — it is the user's turn. The agent finished its run, no widget is on screen, and the chat input is waiting. The user either types a message or ends the conversation:

- send_follow_up_message(message): Send the user's next chat message. Everything the user wants to say right now goes here — including answering a question the agent asked in plain text, and approving or rejecting a plan the agent presented in plain text ("No — two changes first: …" or "Yes, go ahead." ARE follow-up messages).

- declare_done(): The user got what they wanted (or has nothing left to say) and walks away; the conversation ends. Never pick this while the agent is waiting for an answer.`;

// ---------------------------------------------------------------------------
// Decision → InstanceAiConfirmRequest encoders
// ---------------------------------------------------------------------------

/**
 * Encode a confirmation-response action into an InstanceAiConfirmRequest.
 * Returns null for user-turn actions (send_follow_up_message, declare_done),
 * which the caller routes separately.
 */
export function encodeConfirmationDecision(
	decision: Decision,
	onParseFailure?: (raw: string, error: unknown) => void,
	setupContext?: SetupWizardParseContext,
	credentialSetupContext?: CredentialSetupParseContext,
): InstanceAiConfirmRequest | null {
	switch (decision.action) {
		case 'answer_questions':
			return { kind: 'questions', answers: decision.answers };

		case 'apply_setup_wizard': {
			const nodeCredentials = decision.nodeCredentialsJson
				? parseNodeCredentialsJson(decision.nodeCredentialsJson, onParseFailure, setupContext)
				: undefined;
			return {
				kind: 'setupWorkflowApply',
				nodeParameters: parseNodeParametersJson(
					decision.nodeParametersJson,
					onParseFailure,
					setupContext,
				),
				...(nodeCredentials && Object.keys(nodeCredentials).length > 0 ? { nodeCredentials } : {}),
			};
		}

		case 'approve_or_reject':
			return {
				kind: 'approval',
				approved: decision.approved,
				...(decision.userInput ? { userInput: decision.userInput } : {}),
			};

		case 'respond_to_domain_access': {
			if (decision.response === 'deny') return { kind: 'domainAccessDeny' };
			const parsed = domainAccessActionSchema.safeParse(decision.response);
			return {
				kind: 'domainAccessApprove',
				domainAccessAction: parsed.success ? parsed.data : 'allow_once',
			};
		}

		case 'pick_resource_decision': {
			const parsed = instanceGatewayResourceDecisionSchema.safeParse(decision.decision);
			return {
				kind: 'resourceDecision',
				resourceDecision: parsed.success ? parsed.data : 'allowOnce',
			};
		}

		case 'choose_credential_setup_option':
			return encodeCredentialSetupDecision(decision, onParseFailure, credentialSetupContext);

		case 'send_follow_up_message':
		case 'declare_done':
			return null;
	}
}

function encodeCredentialSetupDecision(
	decision: Extract<Decision, { action: 'choose_credential_setup_option' }>,
	onParseFailure?: (raw: string, error: unknown) => void,
	credentialSetupContext?: CredentialSetupParseContext,
): InstanceAiConfirmRequest {
	if (decision.option === 'skip') return { kind: 'approval', approved: false };

	const request = resolveCredentialRequest(decision.credentialType, credentialSetupContext);

	if (decision.option === 'auto') {
		const credentialType = request?.credentialType ?? decision.credentialType;
		if (!credentialType) {
			onParseFailure?.(
				decision.action,
				new Error('auto setup chosen with no resolvable credentialType'),
			);
			return { kind: 'approval', approved: false };
		}
		return { kind: 'credentialAutoSetup', credentialType };
	}

	// manual
	const existingId = resolveExistingCredentialId(request, decision.existingCredentialId);
	if (!request || !existingId) {
		onParseFailure?.(
			decision.action,
			new Error(
				`manual credential selection: no existing credential found for type "${decision.credentialType ?? ''}"` +
					(decision.existingCredentialId ? ` matching id "${decision.existingCredentialId}"` : ''),
			),
		);
		return { kind: 'approval', approved: false };
	}
	return { kind: 'credentialSelection', credentials: { [request.credentialType]: existingId } };
}

/**
 * Which existing credential to select for `manual`. When the card lists more
 * than one candidate for the resolved type, `existingCredentialId` disambiguates
 * (matched against `existingCredentials[].id`); with a single candidate it's
 * optional and that one is used regardless.
 */
function resolveExistingCredentialId(
	request: CredentialSetupParseContext['requests'][number] | undefined,
	existingCredentialId: string | undefined,
): string | undefined {
	if (!request) return undefined;
	if (existingCredentialId) {
		return request.existingCredentials.find((c) => c.id === existingCredentialId)?.id;
	}
	return request.existingCredentials.length === 1 ? request.existingCredentials[0].id : undefined;
}

function resolveCredentialRequest(
	credentialType: string | undefined,
	context: CredentialSetupParseContext | undefined,
): CredentialSetupParseContext['requests'][number] | undefined {
	if (!context || context.requests.length === 0) return undefined;
	if (credentialType) {
		return context.requests.find((r) => r.credentialType === credentialType);
	}
	// No type specified — fine when the card only asked for one credential.
	return context.requests.length === 1 ? context.requests[0] : undefined;
}

/**
 * Parse+validate `nodeCredentialsJson` against the wizard's parse context:
 * every node key must be a known setup node, every credential type must be one
 * that node actually requested, and every id must match one of that
 * (node, type)'s `existingCredentials`. Invalid entries are dropped with a
 * parse-failure log rather than silently sending a bogus/attacker-supplied id
 * through to `assignCredentialToNode`.
 */
function parseNodeCredentialsJson(
	json: string,
	onFailure?: (raw: string, error: unknown) => void,
	setupContext?: SetupWizardParseContext,
): Record<string, Record<string, string>> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch (error) {
		onFailure?.(json, error);
		return {};
	}
	if (!isRecord(parsed)) {
		onFailure?.(json, new Error('parsed nodeCredentialsJson is not a plain object'));
		return {};
	}
	if (!setupContext || setupContext.nodes.length === 0) {
		onFailure?.(json, new Error('nodeCredentialsJson supplied with no setup-wizard context'));
		return {};
	}

	const nodeByAcceptedKey = new Map<string, (typeof setupContext.nodes)[number]>();
	for (const node of setupContext.nodes) {
		nodeByAcceptedKey.set(node.nodeName, node);
		if (node.nodeId) nodeByAcceptedKey.set(node.nodeId, node);
	}

	const result: Record<string, Record<string, string>> = {};
	for (const [key, credsByType] of Object.entries(parsed)) {
		const node = nodeByAcceptedKey.get(key);
		if (!node || !isRecord(credsByType)) {
			onFailure?.(json, new Error(`nodeCredentialsJson: unknown setup node "${key}"`));
			continue;
		}
		for (const [credentialType, credentialId] of Object.entries(credsByType)) {
			const request = node.credentialRequests.find((r) => r.credentialType === credentialType);
			const match =
				typeof credentialId === 'string'
					? request?.existingCredentials.find((c) => c.id === credentialId)
					: undefined;
			if (!match) {
				onFailure?.(
					json,
					new Error(
						`nodeCredentialsJson: no existing credential "${String(credentialId)}" of type "${credentialType}" for node "${key}"`,
					),
				);
				continue;
			}
			(result[node.nodeName] ??= {})[credentialType] = match.id;
		}
	}
	return result;
}

function parseNodeParametersJson(
	json: string,
	onFailure?: (raw: string, error: unknown) => void,
	setupContext?: SetupWizardParseContext,
): Record<string, Record<string, unknown>> {
	try {
		const parsed: unknown = JSON.parse(json);
		if (isRecord(parsed)) {
			return normalizeNodeParameters(parsed, json, onFailure, setupContext);
		}
		onFailure?.(json, new Error('parsed value is not a plain object'));
	} catch (error) {
		onFailure?.(json, error);
	}
	return {};
}

function normalizeNodeParameters(
	parsed: Record<string, unknown>,
	rawJson: string,
	onFailure?: (raw: string, error: unknown) => void,
	setupContext?: SetupWizardParseContext,
): Record<string, Record<string, unknown>> {
	if (!setupContext || setupContext.nodes.length === 0) {
		return coerceRecordOfRecords(parsed, rawJson, onFailure);
	}

	const nodeByAcceptedKey = new Map<string, string>();
	for (const node of setupContext.nodes) {
		nodeByAcceptedKey.set(node.nodeName, node.nodeName);
		if (node.nodeId) nodeByAcceptedKey.set(node.nodeId, node.nodeName);
	}

	const normalized: Record<string, Record<string, unknown>> = {};
	const unknownKeys: string[] = [];

	for (const [key, value] of Object.entries(parsed)) {
		const nodeName = nodeByAcceptedKey.get(key);
		if (!nodeName) {
			unknownKeys.push(key);
			continue;
		}
		if (!isRecord(value)) {
			onFailure?.(rawJson, new Error(`setup node "${key}" did not contain a parameter map`));
			return {};
		}
		normalized[nodeName] = value;
	}

	if (Object.keys(normalized).length > 0) {
		if (unknownKeys.length > 0) {
			onFailure?.(
				rawJson,
				new Error(`setup parameters included unknown node keys: ${unknownKeys.join(', ')}`),
			);
			return {};
		}
		return normalized;
	}

	const fillableNodes = setupContext.nodes.filter((node) => node.parameterNames.length > 0);
	if (fillableNodes.length === 1) {
		const [node] = fillableNodes;
		const parameterNames = new Set(node.parameterNames);
		const containsKnownParameter = Object.keys(parsed).some((key) => parameterNames.has(key));
		if (containsKnownParameter) {
			return { [node.nodeName]: parsed };
		}
	}

	onFailure?.(
		rawJson,
		new Error(`setup parameters did not match requested setup nodes: ${unknownKeys.join(', ')}`),
	);
	return {};
}

function coerceRecordOfRecords(
	parsed: Record<string, unknown>,
	rawJson: string,
	onFailure?: (raw: string, error: unknown) => void,
): Record<string, Record<string, unknown>> {
	const result: Record<string, Record<string, unknown>> = {};
	for (const [nodeName, params] of Object.entries(parsed)) {
		if (!isRecord(params)) {
			onFailure?.(rawJson, new Error(`setup node "${nodeName}" did not contain a parameter map`));
			return {};
		}
		result[nodeName] = params;
	}
	return result;
}
