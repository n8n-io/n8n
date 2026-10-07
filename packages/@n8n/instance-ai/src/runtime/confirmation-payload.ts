import type {
	InstanceAiConfirmRequest,
	InstanceAiCredentialDestinationDecision,
} from '@n8n/api-types';

/**
 * Flat confirmation payload consumed by native tool `resumeSchema`s and sub-agent HITL.
 * The service layer constructs this from the typed `InstanceAiConfirmRequest` discriminated
 * union sent by the frontend — only one subset of fields is populated per call, matching
 * the confirmation kind that was originally requested.
 */
export interface ConfirmationData {
	approved: boolean;
	credentials?: Record<string, string>;
	nodeCredentials?: Record<string, Record<string, string>>;
	userInput?: string;
	domainAccessAction?: string;
	action?: 'apply' | 'test-trigger';
	nodeParameters?: Record<string, Record<string, unknown>>;
	/** Workflow-setup cards the user actively skipped, by node name. */
	skippedNodes?: string[];
	testTriggerNode?: string;
	answers?: Array<{
		questionId: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}>;
	/** User's resource-access decision (e.g. 'allowForSession'). */
	resourceDecision?: string;
	/** Plan-review hard denial — distinct from a feedback-driven rejection. */
	denied?: boolean;
	/** `'session'` means the user chose "always allow": the resuming tool should
	 *  persist a thread-level grant so the same action isn't re-asked. */
	scope?: 'once' | 'session';
	autoSetup?: { credentialType: string; attemptId?: string };
	credentialDestination?: InstanceAiCredentialDestinationDecision;
	connectedSlugs?: string[];
	/** Options chosen on a capability card, keyed by card field. */
	values?: Record<string, string | boolean>;
}

/**
 * The two-step translation from a frontend confirmation to a tool resume payload:
 * wire union → flat `ConfirmationData` → the object handed to `runtime.resume()`,
 * which the suspended tool's `resumeSchema` validates.
 *
 * Kept next to `ConfirmationData` and the tool schemas (rather than in the
 * service) because a field the emitter names differently from the receiving
 * schema is silently dropped at resume time — `resumeSchema` validation strips
 * undeclared keys. `confirmation-payload.test.ts` pins emitter and schemas
 * together so that drift fails in CI instead of at runtime (INS-1095).
 *
 * Exposed as its own `@n8n/instance-ai/confirmation-payload` entry point: both
 * functions are pure, so downstream suites that mock the agent-tainted barrel
 * still exercise the real translation.
 */

type ConfirmRequestByKind = { [R in InstanceAiConfirmRequest as R['kind']]: R };
type ConfirmRequestKind = keyof ConfirmRequestByKind;

/**
 * One converter for each confirmation kind. The mapped type fails typecheck for a new kind
 * until it has a converter.
 *
 * Most kinds carry implicit approval (you wouldn't be submitting answers, selected
 * credentials, or a setup action otherwise) — only `approval`, `domainAccessDeny`,
 * `planDeny` and the kinds with an `approved` field carry a denial path.
 */
const CONFIRMATION_CONVERTERS: {
	[K in ConfirmRequestKind]: (request: ConfirmRequestByKind[K]) => ConfirmationData;
} = {
	approval: (request) => ({
		approved: request.approved,
		userInput: request.userInput,
		scope: request.scope,
	}),
	domainAccessApprove: (request) => ({
		approved: true,
		domainAccessAction: request.domainAccessAction,
	}),
	domainAccessDeny: () => ({ approved: false }),
	planDeny: () => ({ approved: false, denied: true }),
	questions: (request) => ({ approved: true, answers: request.answers }),
	credentialSelection: (request) => ({ approved: true, credentials: request.credentials }),
	credentialAutoSetup: (request) => ({
		approved: true,
		autoSetup: { credentialType: request.credentialType, attemptId: request.attemptId },
	}),
	credentialDestination: (request) => ({
		approved: request.approved,
		credentialDestination: { origin: request.origin },
	}),
	resourceDecision: (request) => ({ approved: true, resourceDecision: request.resourceDecision }),
	mcpConnect: (request) => ({ approved: request.approved, connectedSlugs: request.connectedSlugs }),
	capabilityDecision: (request) => ({ approved: request.approved, values: request.values }),
	setupWorkflowApply: (request) => ({
		approved: true,
		action: 'apply',
		nodeCredentials: request.nodeCredentials,
		nodeParameters: request.nodeParameters,
		skippedNodes: request.skippedNodes,
	}),
	setupWorkflowTestTrigger: (request) => ({
		approved: true,
		action: 'test-trigger',
		testTriggerNode: request.testTriggerNode,
		nodeCredentials: request.nodeCredentials,
		nodeParameters: request.nodeParameters,
	}),
};

function convertConfirmation<K extends ConfirmRequestKind>(
	kind: K,
	request: ConfirmRequestByKind[K],
): ConfirmationData {
	return CONFIRMATION_CONVERTERS[kind](request);
}

/** Collapse the frontend's typed confirmation union into the flat payload
 *  consumed by native tool resume schemas and sub-agent HITL. Only the fields
 *  relevant to the submitted kind are populated — everything else stays undefined. */
export function toConfirmationData(request: InstanceAiConfirmRequest): ConfirmationData {
	return convertConfirmation(request.kind, request);
}

/**
 * Build the payload passed to `runtime.resume()`, dropping absent fields so a
 * tool's `resumeSchema` only ever sees keys the user actually submitted.
 */
export function buildResumeData(data: ConfirmationData): Record<string, unknown> {
	const optionalFields: Record<string, unknown> = {
		// setup-workflow uses nodeCredentials (per-node) format for its credentials field;
		// other tools use the flat credentials map. Prefer nodeCredentials when present.
		credentials: data.nodeCredentials ?? data.credentials,
		domainAccessAction: data.domainAccessAction,
		action: data.action,
		nodeParameters: data.nodeParameters,
		skippedNodes: data.skippedNodes,
		testTriggerNode: data.testTriggerNode,
		answers: data.answers,
		resourceDecision: data.resourceDecision,
		scope: data.scope,
		autoSetup: data.autoSetup,
		credentialDestination: data.credentialDestination,
		denied: data.denied,
		connectedSlugs: data.connectedSlugs,
		values: data.values,
	};
	// Empty and false values were not submitted. An empty userInput was submitted, so it stays.
	const submitted = Object.entries(optionalFields).filter(([, value]) => Boolean(value));
	return {
		approved: data.approved,
		...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
		...Object.fromEntries(submitted),
	};
}
