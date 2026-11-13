import {
	credentialSetupHintSchema,
	mcpConnectRequestSchema,
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
} from '@n8n/api-types';
import { TELEMETRY_EVENT, type AssistantRuntime } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';

import type { Telemetry } from '@/telemetry';

export interface BuilderAskedForInput {
	userId: string;
	threadId: string;
	/** Joins this ask with the "User finished providing input" event of the same card. */
	inputThreadId: string;
	/** The suspend payload of the tool, or the confirmation payload built from it. */
	payload: Record<string, unknown>;
	/** The Assistant runtime that showed the card. */
	runtime: AssistantRuntime;
}

function toTelemetryInputType(inputType: string): string {
	return inputType === 'app-blueprint' ? 'app_blueprint' : inputType;
}

/**
 * Sends "Builder asked for input" for one card, and "Builder specced templated
 * cred" for each credential recipe in it. Both runtimes use this, so the
 * classification of a card stays the same.
 */
export function trackBuilderAskedForInput(
	telemetry: Telemetry,
	{ userId, threadId, inputThreadId, payload, runtime }: BuilderAskedForInput,
): void {
	const inputType = typeof payload.inputType === 'string' ? payload.inputType : undefined;
	const mcpConnectServers = mcpConnectRequestSchema.safeParse(payload.mcpConnectRequest).data
		?.servers;
	let type: string;
	if (inputType) {
		type = toTelemetryInputType(inputType);
	} else if (Array.isArray(payload.setupRequests) && payload.setupRequests.length > 0) {
		type = 'setup';
	} else if (Array.isArray(payload.credentialRequests) && payload.credentialRequests.length > 0) {
		type = 'credential-setup';
	} else if (mcpConnectServers) {
		type = 'mcp-connect';
	} else {
		type = 'approval';
	}

	let numSteps = 1;
	if (Array.isArray(payload.questions)) {
		numSteps = payload.questions.length;
	} else if (Array.isArray(payload.setupRequests)) {
		numSteps = payload.setupRequests.length;
	} else if (Array.isArray(payload.credentialRequests)) {
		numSteps = payload.credentialRequests.length;
	} else if (mcpConnectServers) {
		numSteps = mcpConnectServers.length;
	}

	const credentialRequests = (
		Array.isArray(payload.credentialRequests) ? payload.credentialRequests : []
	).filter(
		(request): request is { credentialType?: unknown; setupHint?: unknown } =>
			typeof request === 'object' && request !== null,
	);

	// Whether any requested credential is a recipe-driven Templated Custom Auth
	// one (recipe-seeded modal), to compare completion against plain types.
	const containsTemplatedCred = credentialRequests.some(
		(request) =>
			request.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE ||
			(request.setupHint !== null && request.setupHint !== undefined),
	);

	telemetry.track('Builder asked for input', {
		user_id: userId,
		thread_id: threadId,
		input_thread_id: inputThreadId,
		type,
		num_steps: numSteps,
		contains_templated_cred: containsTemplatedCred,
		runtime,
	});

	// Recipe content at spec time — production visibility into template and
	// link quality (the offline eval suite grades the same fields). One event
	// per recipe; secret-free by construction: recipes are agent-authored
	// before any user input.
	for (const request of credentialRequests) {
		const parsedHint = credentialSetupHintSchema.safeParse(request.setupHint);
		if (!parsedHint.success) continue;
		const hint = parsedHint.data;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.BUILDER_SPECCED_TEMPLATED_CRED, {
			thread_id: threadId,
			input_thread_id: inputThreadId,
			template: hint.template,
			placeholders: hint.placeholders,
			test_url: hint.testUrl,
			docs_url: hint.docsUrl,
			service_host: hint.serviceHost,
			accepted_status_codes: hint.acceptedStatusCodes,
		});
	}
}

/**
 * The suspend payload of an Assistant tool card. Every Assistant tool suspends
 * with `requestId`, `message` and `severity`, the same check as the editor's
 * `parseAssistantConfirmationInput`. Other suspensions, such as the generic
 * runtime approval, get no Assistant card and return `undefined`.
 */
export function readAssistantConfirmationPayload(
	value: unknown,
): (Record<string, unknown> & { requestId: string }) | undefined {
	if (!isRecord(value)) return undefined;
	const { requestId, message, severity } = value;
	if (typeof requestId !== 'string' || !requestId) return undefined;
	if (typeof message !== 'string' || typeof severity !== 'string') return undefined;
	return { ...value, requestId };
}
