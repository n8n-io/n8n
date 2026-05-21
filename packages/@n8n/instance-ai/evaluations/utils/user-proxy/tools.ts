// Decision schema (structured-output target) + encoders to InstanceAiConfirmRequest.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';
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

export const decisionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('answer_questions'),
		answers: z.array(answerSchema),
	}),
	z.object({
		action: z.literal('apply_setup_wizard'),
		// JSON-encoded object mapping nodeId -> parameter map. Emitted as a string
		// because Anthropic structured output rejects nested z.record schemas.
		nodeParametersJson: z.string(),
	}),
	z.object({
		action: z.literal('approve_or_reject'),
		approved: z.boolean(),
		userInput: z.string().optional(),
	}),
	z.object({
		action: z.literal('respond_to_domain_access'),
		response: z.enum(['allow_once', 'allow_all', 'deny']),
	}),
	z.object({
		action: z.literal('pick_resource_decision'),
		decision: z.string(),
	}),
	z.object({
		action: z.literal('send_follow_up_message'),
		message: z.string(),
	}),
	z.object({
		action: z.literal('declare_done'),
	}),
]);

export type Decision = z.infer<typeof decisionSchema>;

// ---------------------------------------------------------------------------
// Tool descriptions — bundled with the prompt so the model picks the right action
// ---------------------------------------------------------------------------

export const TOOL_DESCRIPTIONS = `Available actions:

- answer_questions(answers[]): The agent fired an ask-user confirmation (inputType=questions). Answer every question with a plausible value — stated → implied → invented. Invent rather than skip. Only set skipped=true when the question has no plausible answer of any shape.

- apply_setup_wizard(nodeParametersJson): The agent fired a setup-wizard event with placeholder parameters. Emit a JSON string that decodes to { "<nodeId>": { "<paramName>": <value>, ... }, ... }. Fill every non-credential placeholder with a plausible value — stated → implied → invented. Never set credentials.

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
): InstanceAiConfirmRequest | null {
	switch (decision.action) {
		case 'answer_questions':
			return { kind: 'questions', answers: decision.answers };

		case 'apply_setup_wizard':
			return {
				kind: 'setupWorkflowApply',
				nodeParameters: parseNodeParametersJson(decision.nodeParametersJson, onParseFailure),
			};

		case 'approve_or_reject':
			return {
				kind: 'approval',
				approved: decision.approved,
				...(decision.userInput ? { userInput: decision.userInput } : {}),
			};

		case 'respond_to_domain_access':
			return decision.response === 'deny'
				? { kind: 'domainAccessDeny' }
				: { kind: 'domainAccessApprove', domainAccessAction: decision.response };

		case 'pick_resource_decision':
			return { kind: 'resourceDecision', resourceDecision: decision.decision };

		case 'send_follow_up_message':
		case 'declare_done':
			return null;
	}
}

function parseNodeParametersJson(
	json: string,
	onFailure?: (raw: string, error: unknown) => void,
): Record<string, Record<string, unknown>> {
	try {
		const parsed: unknown = JSON.parse(json);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, Record<string, unknown>>;
		}
		onFailure?.(json, new Error('parsed value is not a plain object'));
	} catch (error) {
		onFailure?.(json, error);
	}
	return {};
}
