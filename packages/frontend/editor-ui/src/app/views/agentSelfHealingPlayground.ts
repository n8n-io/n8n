import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type IConnections, type INode } from 'n8n-workflow';
import type { AgentEvalColumnMapping, AgentJsonConfig } from '@n8n/api-types';
import type { WorkflowDataCreate, WorkflowMetadata } from '@n8n/rest-api-client/api/workflows';
import { isRecord } from '@n8n/utils/is-record';
import type { IWorkflowDb } from '@/Interface';

const SCENARIO_IDS = [
	'wrong-tool',
	'wrong-tool-auto',
	'healthy',
	'conflicting-instructions',
	'session-trigger',
] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];

const TOOL_KEYS = ['customer', 'order'] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

/** Workflow tool names as the model sees them: lower case with hyphens. */
export const TOOL_NAMES: Record<ToolKey, string> = {
	customer: 'crm-lookup',
	order: 'oms-lookup',
};

export interface PlaygroundTool {
	key: ToolKey;
	workflowName: string;
	name: string;
	description: string;
}

/** One production session. The correction is sent only when the first lookup does not match the expected tool. */
export interface PlaygroundSession {
	input: string;
	expectedTool: string;
	correction: string;
}

export interface PlaygroundEvalCase {
	input: string;
	criteria: string;
}

export interface PlaygroundScenario {
	id: ScenarioId;
	name: string;
	description: string;
	expectation: string;
	outcome: string;
	agentName: string;
	instructions: string;
	tools: PlaygroundTool[];
	sessions: PlaygroundSession[];
	evalCases: PlaygroundEvalCase[];
	publicationMode: 'approval' | 'auto';
	/** `null` means that the configuration has the long schedule and no session trigger. */
	sessionThreshold: number | null;
}

export interface PlaygroundIdentity {
	scenario: PlaygroundScenario;
	runId: string;
	agentId: string;
	tool: PlaygroundTool;
}

/** The same shape as `SaveSelfHealingConfigurationDto`. */
export interface PlaygroundConfigurationPayload {
	scope: 'selected';
	workflowIds: string[];
	reviewerIds: string[];
	includeAllProjectMembers: boolean;
	includeSubWorkflows: boolean;
	agentScope: 'selected';
	agentIds: string[];
	agentGoals: ['quality'];
	agentScheduleIntervalHours: number | null;
	agentTraceThreshold: number | null;
	agentPublicationMode: 'approval' | 'auto';
	enabled: boolean;
}

const META_KEY = 'agentSelfHealingPlayground';

/** The longest schedule that the API accepts. Run now starts the investigation before it. */
export const PLAYGROUND_SCHEDULE_HOURS = 720;

const BASE_INSTRUCTIONS = [
	'You are the support agent of Acme Shop. You answer questions about orders and customer accounts.',
	'',
	'Rules:',
	'- Look up the data with a tool before you answer. Do not guess.',
	'- If a lookup finds nothing, tell the customer and ask for the missing reference.',
	'- Keep the answer short.',
].join('\n');

const CONFLICTING_INSTRUCTIONS = [
	BASE_INSTRUCTIONS,
	'- Answer in one sentence.',
	'- Give a full explanation in each answer: at least three paragraphs with all the data from the lookup.',
	'- Never tell a customer the status of an order. Send the customer to the order page.',
	'- When a customer asks for the status of an order, look it up and tell the customer the status.',
].join('\n');

// The customer tool looks like the correct tool for an order question.
// The order tool does not say what it is for.
const UNCLEAR_DESCRIPTIONS: Record<ToolKey, string> = {
	customer:
		'Looks up a record for a customer question: orders, deliveries and accounts. Input: the reference from the customer message.',
	order: 'OMS lookup by reference.',
};

const CLEAR_DESCRIPTIONS: Record<ToolKey, string> = {
	customer:
		'Reads a customer account by customer ID (CUST-...) or by email address. Returns the name, the email address and the plan. It has no order data.',
	order:
		'Reads an order by order number (ORDER-...). Returns the order status, the carrier and the expected delivery. Use it for each question about an order or a delivery.',
};

/** The data that each tool workflow returns. The keys are lower case. */
const RECORDS: Record<ToolKey, Record<string, Record<string, string>>> = {
	customer: {
		'cust-204': { name: 'Dana Reyes', email: 'dana@example.com', plan: 'Standard' },
		'dana@example.com': { name: 'Dana Reyes', email: 'dana@example.com', plan: 'Standard' },
		'cust-311': { name: 'Sam Okafor', email: 'sam@example.com', plan: 'Business' },
	},
	order: {
		'order-1042': { status: 'shipped', carrier: 'Acme Parcel', expectedDelivery: 'in 2 days' },
		'order-1043': { status: 'processing', carrier: 'not assigned', expectedDelivery: 'unknown' },
		'order-1044': { status: 'delivered', carrier: 'Acme Parcel', expectedDelivery: 'delivered' },
	},
};

const NOT_FOUND: Record<ToolKey, string> = {
	customer: 'No customer account has this reference.',
	order: 'No order has this reference.',
};

function orderSession(orderId: string, question: string): PlaygroundSession {
	return {
		input: question,
		expectedTool: TOOL_NAMES.order,
		correction: `That does not answer my question. ${orderId} is an order number, not a customer account. Look up the order and tell me its status.`,
	};
}

const CUSTOMER_SESSION: PlaygroundSession = {
	input: 'Which plan is customer CUST-204 on?',
	expectedTool: TOOL_NAMES.customer,
	correction:
		'That does not answer my question. CUST-204 is a customer ID. Look up the customer account and tell me the plan.',
};

const ORDER_SESSIONS: PlaygroundSession[] = [
	orderSession('ORDER-1042', 'Where is my order ORDER-1042?'),
	orderSession('ORDER-1043', 'Has ORDER-1043 shipped yet?'),
	orderSession('ORDER-1044', 'I need the delivery status of ORDER-1044.'),
	CUSTOMER_SESSION,
];

// Tools are mocked in an eval run, so a check must not expect the data of the tool workflows.
const CUSTOMER_EVAL_CASES: PlaygroundEvalCase[] = [
	{
		input: 'Which plan is customer CUST-204 on?',
		criteria:
			'The agent looks up the customer account. The answer gives the plan from the lookup result.',
	},
	{
		input: 'Hello, what can you help me with?',
		criteria:
			'The answer says that the agent helps with orders and customer accounts. It does not invent order data or customer data.',
	},
];

const ORDER_EVAL_CASE: PlaygroundEvalCase = {
	input: 'Where is my order ORDER-1042?',
	criteria:
		'The agent looks up the order. The answer gives the order status from the lookup result.',
};

type ScenarioText = Pick<PlaygroundScenario, 'name' | 'description' | 'expectation' | 'outcome'>;

const SCENARIO_TEXT: Record<ScenarioId, ScenarioText> = {
	'wrong-tool': {
		name: 'Wrong lookup tool',
		description:
			'The tool descriptions make the customer lookup look correct for an order question. Customers correct the agent.',
		expectation:
			'One Inbox proposal: a tool description edit, a regression case, and eval results for the published and the proposed version.',
		outcome: 'Expect a proposal',
	},
	'wrong-tool-auto': {
		name: 'Wrong lookup tool, Publish everything',
		description: 'The same defect. The configuration publishes each tested proposal.',
		expectation:
			'The proposal is applied without a review. It shows in Closed as published automatically.',
		outcome: 'Expect an automatic publication',
	},
	healthy: {
		name: 'Healthy support agent',
		description: 'The tool descriptions are clear and the agent selects the correct tool.',
		expectation: 'The investigation finds nothing to change. No Inbox item appears.',
		outcome: 'Expect no proposal',
	},
	'conflicting-instructions': {
		name: 'Conflicting instructions',
		description:
			'The instructions contradict each other. The agent has no production sessions and no eval suite.',
		expectation:
			'A proposal from the configuration only: an instructions edit and a new eval case.',
		outcome: 'Expect a proposal',
	},
	'session-trigger': {
		name: 'Session trigger',
		description:
			'The wrong lookup tool defect with the session trigger set to 3. Do not select Run now.',
		expectation: 'The 5-minute sweep starts the investigation. Then one Inbox proposal appears.',
		outcome: 'Expect a proposal without a click',
	},
};

const SCENARIO_SETUP: Record<
	ScenarioId,
	Pick<
		PlaygroundScenario,
		'agentName' | 'instructions' | 'sessions' | 'evalCases' | 'publicationMode' | 'sessionThreshold'
	> & { descriptions: Record<ToolKey, string>; workflowNames: Record<ToolKey, string> }
> = {
	'wrong-tool': {
		agentName: 'Order support',
		instructions: BASE_INSTRUCTIONS,
		descriptions: UNCLEAR_DESCRIPTIONS,
		workflowNames: { customer: 'Read customer account', order: 'Read order status' },
		sessions: ORDER_SESSIONS,
		evalCases: CUSTOMER_EVAL_CASES,
		publicationMode: 'approval',
		sessionThreshold: null,
	},
	'wrong-tool-auto': {
		agentName: 'Delivery support',
		instructions: BASE_INSTRUCTIONS,
		descriptions: UNCLEAR_DESCRIPTIONS,
		workflowNames: { customer: 'Find customer record', order: 'Find delivery status' },
		sessions: ORDER_SESSIONS,
		evalCases: CUSTOMER_EVAL_CASES,
		publicationMode: 'auto',
		sessionThreshold: null,
	},
	healthy: {
		agentName: 'Account support',
		instructions: BASE_INSTRUCTIONS,
		descriptions: CLEAR_DESCRIPTIONS,
		workflowNames: { customer: 'Get account details', order: 'Get order details' },
		sessions: ORDER_SESSIONS,
		evalCases: [...CUSTOMER_EVAL_CASES, ORDER_EVAL_CASE],
		publicationMode: 'approval',
		sessionThreshold: null,
	},
	'conflicting-instructions': {
		agentName: 'Refund support',
		instructions: CONFLICTING_INSTRUCTIONS,
		descriptions: CLEAR_DESCRIPTIONS,
		workflowNames: { customer: 'Check customer profile', order: 'Check order state' },
		sessions: [],
		evalCases: [],
		publicationMode: 'approval',
		sessionThreshold: null,
	},
	'session-trigger': {
		agentName: 'Shipping support',
		instructions: BASE_INSTRUCTIONS,
		descriptions: UNCLEAR_DESCRIPTIONS,
		workflowNames: { customer: 'Search customer data', order: 'Search shipment data' },
		sessions: ORDER_SESSIONS,
		evalCases: CUSTOMER_EVAL_CASES,
		publicationMode: 'approval',
		sessionThreshold: 3,
	},
};

export function getScenarios(): PlaygroundScenario[] {
	return SCENARIO_IDS.map((id) => {
		const { descriptions, workflowNames, ...setup } = SCENARIO_SETUP[id];
		return {
			id,
			...SCENARIO_TEXT[id],
			...setup,
			tools: TOOL_KEYS.map((key) => ({
				key,
				workflowName: workflowNames[key],
				name: TOOL_NAMES[key],
				description: descriptions[key],
			})),
		};
	});
}

/** An agent ID in the format that the create endpoint accepts from a client. */
export function mintAgentId(): string {
	const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	return Array.from(
		crypto.getRandomValues(new Uint8Array(16)),
		(byte) => alphabet[byte % alphabet.length],
	).join('');
}

function node(
	name: string,
	type: string,
	typeVersion: number,
	parameters: INode['parameters'],
): INode {
	return { id: crypto.randomUUID(), name, type, typeVersion, position: [0, 0], parameters };
}

/** An expression that returns the record for `$json.reference`. */
export function lookupExpression(key: ToolKey): string {
	// A `}}` sequence ends an n8n expression, so the object literals must not contain it.
	const literal = (value: unknown) => JSON.stringify(value).replace(/\}(?=\})/g, '} ');
	const reference = "String($json.reference ?? '').trim().toLowerCase()";
	const notFound = { found: false, message: NOT_FOUND[key] };
	return `={{ (${literal(RECORDS[key])})[${reference}] ?? ${literal(notFound)} }}`;
}

/** A workflow that the agent calls as a tool. The marker in `meta` identifies the playground run. */
export function createToolWorkflow(
	scenario: PlaygroundScenario,
	tool: PlaygroundTool,
	projectId: string,
	run: { runId: string; agentId: string },
): WorkflowDataCreate {
	const trigger = node('Receive reference', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, 1.1, {
		inputSource: 'workflowInputs',
		workflowInputs: { values: [{ name: 'reference', type: 'string' }] },
	});
	const lookup = node('Return record', 'n8n-nodes-base.set', 3.4, {
		mode: 'raw',
		jsonOutput: lookupExpression(tool.key),
		options: {},
	});
	lookup.position = [280, 0];
	const connections: IConnections = {
		[trigger.name]: { main: [[{ node: lookup.name, type: 'main', index: 0 }]] },
	};
	const meta: WorkflowMetadata & Record<typeof META_KEY, Record<string, string>> = {
		[META_KEY]: { scenario: scenario.id, tool: tool.key, ...run },
	};
	return {
		name: tool.workflowName,
		meta,
		...(projectId ? { projectId } : {}),
		nodes: [trigger, lookup],
		connections,
		settings: { executionOrder: 'v1' },
	};
}

export function identifyWorkflow(
	workflow: IWorkflowDb,
	scenarios: PlaygroundScenario[],
): PlaygroundIdentity | null {
	const marker = workflow.meta && META_KEY in workflow.meta ? workflow.meta[META_KEY] : undefined;
	if (!isRecord(marker) || typeof marker.runId !== 'string' || typeof marker.agentId !== 'string')
		return null;
	const scenario = scenarios.find(({ id }) => id === marker.scenario);
	const tool = scenario?.tools.find(({ key }) => key === marker.tool);
	if (!scenario || !tool) return null;
	return { scenario, tool, runId: marker.runId, agentId: marker.agentId };
}

/** The scenario's instructions and tools on top of the configuration of a new agent. */
export function buildAgentConfig(
	base: AgentJsonConfig,
	scenario: PlaygroundScenario,
	workflowIds: Record<ToolKey, string>,
): AgentJsonConfig {
	return {
		...base,
		name: scenario.agentName,
		instructions: scenario.instructions,
		tools: scenario.tools.map((tool) => ({
			type: 'workflow',
			workflowId: workflowIds[tool.key],
			workflow: tool.workflowName,
			name: tool.name,
			description: tool.description,
		})),
	};
}

/** A configuration that covers only the agent, with the user as the reviewer. */
export function buildConfigurationPayload(
	scenario: PlaygroundScenario,
	agentId: string,
	reviewerId: string,
): PlaygroundConfigurationPayload {
	return {
		scope: 'selected',
		workflowIds: [],
		reviewerIds: [reviewerId],
		includeAllProjectMembers: false,
		includeSubWorkflows: false,
		agentScope: 'selected',
		agentIds: [agentId],
		agentGoals: ['quality'],
		// A configuration needs a trigger. The long schedule does not start during a test.
		agentScheduleIntervalHours:
			scenario.sessionThreshold === null ? PLAYGROUND_SCHEDULE_HOURS : null,
		agentTraceThreshold: scenario.sessionThreshold,
		agentPublicationMode: scenario.publicationMode,
		enabled: true,
	};
}

/** True when the playground made the configuration and nobody added other coverage to it. */
export function isPlaygroundConfiguration(
	configuration: { scope: string; workflowIds: string[]; agentScope: string; agentIds: string[] },
	agentId: string,
): boolean {
	return (
		configuration.scope === 'selected' &&
		configuration.workflowIds.length === 0 &&
		configuration.agentScope === 'selected' &&
		configuration.agentIds.length === 1 &&
		configuration.agentIds[0] === agentId
	);
}

/** Data table rows for the eval suite. The mapping gives the column names. */
export function buildEvalRows(
	scenario: PlaygroundScenario,
	mapping: AgentEvalColumnMapping,
): Array<Record<string, string>> {
	return scenario.evalCases.map(({ input, criteria }) => ({
		[mapping.input]: input,
		...(mapping.criteria ? { [mapping.criteria]: criteria } : {}),
	}));
}

/** The body of a request to the webhook channel of the agent. */
export function buildWebhookRequest(input: string, conversationId?: string) {
	return { input, ...(conversationId ? { conversation: conversationId } : {}) };
}

/** The conversation ID and the answer text of a webhook channel reply. */
export function readWebhookReply(body: unknown): { conversationId?: string; text: string } {
	if (!isRecord(body)) return { text: '' };
	if (isRecord(body.error)) {
		return { text: typeof body.error.message === 'string' ? body.error.message : '' };
	}
	const conversationId =
		isRecord(body.conversation) && typeof body.conversation.id === 'string'
			? body.conversation.id
			: undefined;
	const output = Array.isArray(body.output) ? body.output : [];
	const text = output
		.flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
		.map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
		.join('');
	return { conversationId, text };
}

/** The thread ID that the webhook channel gives to a conversation. */
export function webhookThreadId(agentId: string, conversationId: string): string {
	return `${agentId}:webhook:${conversationId}`;
}

export function firstLookupTool(tools: string[]): string | undefined {
	return tools.find((name) => Object.values(TOOL_NAMES).includes(name));
}

/** The tool names of a session in call order. */
export function readToolNames(
	executions: Array<{ timeline: Array<Record<string, unknown>> | null }>,
): string[] {
	return executions
		.flatMap(({ timeline }) => timeline ?? [])
		.filter((event) => event.type === 'tool-call')
		.flatMap((event) => (typeof event.name === 'string' ? [event.name] : []));
}

// This page is local test tooling on a throwaway branch. Its text is here and not in
// the i18n package, so that the page adds no keys to the locale file.
export const TEXT = {
	title: 'Agent self-healing playground',
	eyebrow: 'Local testing',
	intro: 'Create a test agent, start an investigation, and review the proposal in Inbox.',
	inbox: 'Open Inbox',
	settings: 'Self-healing settings',
	assistantSettings: 'Assistant setup',
	openProject: 'Open project',
	project: 'Project',
	disabled:
		'Self-healing is not enabled on this backend. Start n8n with N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED=true.',
	noProjects: 'No projects are available. Reload this page to try again.',
	guide: 'How to test agent self-healing',
	steps: [
		{
			title: 'Create',
			description:
				'A test creates and publishes an agent with two tools, an eval suite, a configuration, and production sessions.',
		},
		{
			title: 'Run now',
			description:
				'Select Run now for the agent on this page. The configuration form has no Run now button.',
		},
		{
			title: 'Review',
			description:
				'After some minutes the proposal appears in Inbox. Check Changes and Eval results. Then apply it.',
		},
	],
	scenariosTitle: 'Create a test',
	scenariosDescription:
		'Each test replaces its earlier agent in the selected project. The production sessions use the model of the agent and take about one minute.',
	recommended: 'Start here',
	create: 'Create',
	created: 'Test created.',
	runsTitle: 'Your test agents',
	runsDescription: 'Select Run now. Then wait for the result in Inbox.',
	loading: 'Loading test agents…',
	emptyTitle: 'Your test agents will appear here',
	empty: 'Create a test above. Then come back here to run it.',
	refresh: 'Refresh',
	reset: 'Reset playground',
	resetTitle: 'Delete playground test data?',
	resetDescription: (count: number) =>
		`This permanently deletes ${count} playground agents, their tool workflows, their eval suites, and the configurations that the playground made. This can't be undone.`,
	resetConfirm: 'Delete test data',
	resetDone: (count: number) => `Deleted ${count} playground agents and their test data.`,
	resetPartial: (failed: number) =>
		`Couldn't delete all data of ${failed} playground agents. Wait a few moments, then reset again.`,
	expectation: 'Expected result',
	agent: 'Agent',
	tool: 'Tool',
	configuration: 'Configuration',
	statePublished: 'Published',
	stateDraft: 'Unpublished changes',
	stateMissing: 'Deleted',
	open: 'Open',
	sessions: 'Sessions',
	noConfiguration:
		'No enabled configuration covers this agent. Add one in the self-healing settings.',
	configurationSummary: (id: number, mode: string, threshold: number | null) =>
		`#${id} · ${mode === 'auto' ? 'Publish everything' : 'Wait for approval'} · ${
			threshold === null ? 'schedule of 720 hours' : `after ${threshold} production sessions`
		}`,
	runNow: 'Run now',
	sendSessions: 'Send production sessions',
	noSessions: 'This test has no production sessions.',
	sessionLog: 'Production sessions',
	sessionLogEmpty: 'No sessions sent from this page yet.',
	sessionScript: 'Session script',
	sessionsSent: (sent: number, wrong: number) =>
		`Sent ${sent} production sessions. The agent started with the wrong tool in ${wrong} of them.`,
	sessionLine: (input: string, tools: string[], corrected: boolean) =>
		`"${input}" → ${tools.length ? tools.join(', ') : 'no tool call'}${corrected ? ' → correction sent' : ''}`,
	runNowResult: {
		started: 'Investigation started. The result appears in Inbox after some minutes.',
		already_running: 'An investigation of this agent is already running.',
		open_proposal: 'A proposal for this agent waits for a decision in Inbox.',
		not_eligible: (reason: string) => `The investigation cannot start: ${reason}.`,
	},
	noModel:
		'n8n could not select a model for the new agent. Add one LLM credential that you can use in this project, or publish one agent with a model in this project. Then create the test again.',
	evalSuiteSkipped: (reason: string) =>
		`The eval suite was not created (${reason}). Set N8N_AGENT_EVALS_ENABLED=true to create it.`,
	sessionsFailed: (reason: string) =>
		`The production sessions failed (${reason}). Select “Send production sessions” to try again.`,
	failed: 'The action failed. Check the n8n server log.',
	troubleshootingTitle: 'No proposal in Inbox?',
	troubleshooting:
		'Check that the Assistant has a model, that the configuration is enabled, and that you are its reviewer. An open proposal or a running investigation blocks a new one. A healthy agent gives no Inbox item. Model results can vary.',
};
