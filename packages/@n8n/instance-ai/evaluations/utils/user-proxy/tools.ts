// Decision wire schema (structured-output target) + encoders to InstanceAiConfirmRequest.

import { domainAccessActionSchema, instanceGatewayResourceDecisionSchema } from '@n8n/api-types';
import type { DomainAccessAction, InstanceAiConfirmRequest } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Wire schema — the strict structured-output shape the model fills
// ---------------------------------------------------------------------------

const wireAnswerSchema = z.object({
	questionId: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().nullable(),
	skipped: z.boolean().nullable(),
});

export const wireDecisionSchema = z.object({
	action: z.enum([
		'answer_questions',
		'apply_setup_wizard',
		'approve_or_reject',
		'respond_to_domain_access',
		'pick_resource_decision',
		'send_follow_up_message',
		'declare_done',
	]),
	answers: z.array(wireAnswerSchema).nullable(),
	// JSON-encoded object mapping setup node name -> parameter map. Emitted as a string
	// because Anthropic structured output rejects nested z.record schemas.
	nodeParametersJson: z.string().nullable(),
	approved: z.boolean().nullable(),
	userInput: z.string().nullable(),
	response: z.enum(['allow_once', 'allow_all', 'deny']).nullable(),
	decision: z.string().nullable(),
	message: z.string().nullable(),
});

export type WireDecision = z.infer<typeof wireDecisionSchema>;

export interface Answer {
	questionId: string;
	selectedOptions: string[];
	customText?: string;
	skipped?: boolean;
}

export type Decision =
	| { action: 'answer_questions'; answers: Answer[] }
	| { action: 'apply_setup_wizard'; nodeParametersJson: string }
	| { action: 'approve_or_reject'; approved: boolean; userInput?: string }
	| { action: 'respond_to_domain_access'; response: DomainAccessAction | 'deny' }
	| { action: 'pick_resource_decision'; decision: string }
	| { action: 'send_follow_up_message'; message: string }
	| { action: 'declare_done' };

export function parseWireDecision(value: WireDecision): Decision | undefined {
	switch (value.action) {
		case 'answer_questions':
			if (!value.answers) return undefined;
			return {
				action: value.action,
				answers: value.answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
					questionId,
					selectedOptions,
					...(customText ? { customText } : {}),
					...(skipped !== null ? { skipped } : {}),
				})),
			};

		case 'apply_setup_wizard':
			return value.nodeParametersJson
				? { action: value.action, nodeParametersJson: value.nodeParametersJson }
				: undefined;

		case 'approve_or_reject':
			return value.approved !== null
				? {
						action: value.action,
						approved: value.approved,
						...(value.userInput ? { userInput: value.userInput } : {}),
					}
				: undefined;

		case 'respond_to_domain_access': {
			if (!value.response) return undefined;
			if (value.response === 'deny') return { action: value.action, response: 'deny' };
			const parsed = domainAccessActionSchema.safeParse(value.response);
			return parsed.success ? { action: value.action, response: parsed.data } : undefined;
		}

		case 'pick_resource_decision':
			return value.decision ? { action: value.action, decision: value.decision } : undefined;

		case 'send_follow_up_message':
			return value.message !== null ? { action: value.action, message: value.message } : undefined;

		case 'declare_done':
			return { action: value.action };
	}
}

export interface SetupWizardParseContext {
	nodes: Array<{
		nodeId?: string;
		nodeName: string;
		parameterNames: string[];
	}>;
}

// ---------------------------------------------------------------------------
// Tool descriptions — bundled with the prompt so the model picks the right action
// ---------------------------------------------------------------------------

export const TOOL_DESCRIPTIONS = `Available actions:

Set fields that do not apply to the selected action to null.

- answer_questions(answers[]): The agent fired an ask-user confirmation (inputType=questions). Answer every question with a plausible value — stated → implied → invented. Invent rather than skip. Set skipped=true only when the question has no plausible answer of any shape, OR when a [stage direction] in the script tells the user to decline or withhold that value — in that case you MUST set skipped=true with an empty selectedOptions and pick NO option (not even one that looks standard or obvious); picking a value defeats the test.

- apply_setup_wizard(nodeParametersJson): The agent fired a setup-wizard / "configure your workflow" setup card with placeholder parameters. Emit a JSON string that decodes to { "<setup node name>": { "<paramName>": <value>, ... }, ... }. Fill every non-credential placeholder with a plausible value — stated → implied → invented. Never set credentials. This is the ONLY correct way to fill a setup card — do NOT answer it with answer_questions. To deliberately leave a value unset (e.g. a stage direction says the user skips it), dismiss the whole card with approve_or_reject(approved=false) instead of filling it.

- approve_or_reject(approved, userInput?): The agent showed a plan (plan-review) or asked an open free-text question (inputType=text). Approve if the plan matches user intent; reject with reason if it diverges.

- respond_to_domain_access(response): The agent is asking for domain access permissions. Pick allow_once, allow_all, or deny. Default to allow_all unless the user would deny.

- pick_resource_decision(decision): The agent is asking the user to pick a gateway resource access option. Pick the option the user would choose.

- send_follow_up_message(message): Between-run decision. Send the user's next message — use when the user would continue.

- declare_done(): Between-run decision. Signal that the user has gotten what they wanted and the conversation ends.`;

// ---------------------------------------------------------------------------
// Decision → InstanceAiConfirmRequest encoders
// ---------------------------------------------------------------------------

/**
 * Encode a confirmation-response action into an InstanceAiConfirmRequest.
 * Returns null for between-run actions (send_follow_up_message, declare_done),
 * which the caller routes separately.
 */
export function encodeConfirmationDecision(
	decision: Decision,
	onParseFailure?: (raw: string, error: unknown) => void,
	setupContext?: SetupWizardParseContext,
): InstanceAiConfirmRequest | null {
	switch (decision.action) {
		case 'answer_questions':
			return {
				kind: 'questions',
				answers: decision.answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
					questionId,
					selectedOptions,
					...(customText ? { customText } : {}),
					...(skipped !== undefined ? { skipped } : {}),
				})),
			};

		case 'apply_setup_wizard':
			return {
				kind: 'setupWorkflowApply',
				nodeParameters: parseNodeParametersJson(
					decision.nodeParametersJson,
					onParseFailure,
					setupContext,
				),
			};

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

		case 'send_follow_up_message':
		case 'declare_done':
			return null;
	}
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
