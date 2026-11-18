import {
	AgentConnectIntegrationDto,
	AgentJsonConfigSchema,
	CreateAgentDto,
	SaveSelfHealingConfigurationDto,
	StartSelfHealingAgentInvestigationDto,
	isSelfHealingAgentTriggerMissing,
	sanitizeAgentToolName,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';
import {
	PLAYGROUND_SCHEDULE_HOURS,
	TOOL_NAMES,
	buildAgentConfig,
	buildConfigurationPayload,
	buildEvalRows,
	buildWebhookRequest,
	createToolWorkflow,
	firstLookupTool,
	getScenarios,
	identifyWorkflow,
	isPlaygroundConfiguration,
	lookupExpression,
	mintAgentId,
	readToolNames,
	readWebhookReply,
	webhookThreadId,
} from './agentSelfHealingPlayground';

const scenarios = getScenarios();
const run = { runId: 'run-1', agentId: 'Agent00000000001' };
const baseConfig: AgentJsonConfig = {
	name: 'New agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: '',
};

describe('agentSelfHealingPlayground', () => {
	it('should mint an agent ID that the create endpoint accepts', () => {
		const result = CreateAgentDto.safeParse({ name: 'Order support', id: mintAgentId() });

		expect(result.success).toBe(true);
	});

	it.each(scenarios)('should build a valid agent configuration for $id', (scenario) => {
		const config = buildAgentConfig(baseConfig, scenario, { customer: 'wf-1', order: 'wf-2' });

		expect(AgentJsonConfigSchema.safeParse(config).success).toBe(true);
		expect(config.model).toBe(baseConfig.model);
		expect(config.tools).toHaveLength(2);
		for (const tool of scenario.tools) {
			// The model sees the sanitized name. Eval checks and sessions use the same name.
			expect(sanitizeAgentToolName(tool.name)).toBe(tool.name);
		}
		for (const session of scenario.sessions) {
			expect(Object.values(TOOL_NAMES)).toContain(session.expectedTool);
		}
	});

	it.each(scenarios)('should build a valid self-healing configuration for $id', (scenario) => {
		const payload = buildConfigurationPayload(
			scenario,
			run.agentId,
			'7f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
		);
		const result = SaveSelfHealingConfigurationDto.safeParse(payload);

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ agentScope: 'selected', agentIds: [run.agentId] });
		// Each configuration has one trigger: the session count, or the long schedule.
		expect(payload).toMatchObject(
			scenario.sessionThreshold === null
				? { agentScheduleIntervalHours: PLAYGROUND_SCHEDULE_HOURS, agentTraceThreshold: null }
				: { agentScheduleIntervalHours: null, agentTraceThreshold: scenario.sessionThreshold },
		);
		expect(isSelfHealingAgentTriggerMissing(payload)).toBe(false);
		expect(isPlaygroundConfiguration(payload, run.agentId)).toBe(true);
		expect(isPlaygroundConfiguration({ ...payload, workflowIds: ['wf-9'] }, run.agentId)).toBe(
			false,
		);
	});

	it('should give the session trigger and the publication mode to the configuration', () => {
		const byId = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));

		expect(byId['wrong-tool']).toMatchObject({
			publicationMode: 'approval',
			sessionThreshold: null,
		});
		expect(byId['wrong-tool-auto'].publicationMode).toBe('auto');
		expect(byId['session-trigger'].sessionThreshold).toBe(3);
		expect(byId['session-trigger'].sessions.length).toBeGreaterThanOrEqual(3);
		expect(byId['conflicting-instructions'].sessions).toHaveLength(0);
	});

	it('should create a tool workflow that identifies its run', () => {
		const scenario = scenarios[0];
		const data = createToolWorkflow(scenario, scenario.tools[1], 'project-1', run);
		const workflow = { ...data, id: 'wf-2' } as IWorkflowDb;

		expect(data.nodes?.[0]).toMatchObject({
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			parameters: { workflowInputs: { values: [{ name: 'reference', type: 'string' }] } },
		});
		expect(identifyWorkflow(workflow, scenarios)).toMatchObject({
			runId: run.runId,
			agentId: run.agentId,
			tool: { key: 'order', name: 'oms-lookup' },
		});
		expect(identifyWorkflow({ ...workflow, meta: {} } as IWorkflowDb, scenarios)).toBeNull();
	});

	it.each(['customer', 'order'] as const)(
		'should keep the %s lookup expression in one expression',
		(key) => {
			const expression = lookupExpression(key);
			const body = expression.slice(3, -2);

			expect(expression.startsWith('={{')).toBe(true);
			expect(body).not.toContain('}}');
			// The body must be valid JavaScript.
			const evaluate = new Function('$json', `return (${body});`) as (json: object) => unknown;
			expect(evaluate({ reference: 'none' })).toMatchObject({ found: false });
			expect(
				evaluate({ reference: key === 'order' ? ' ORDER-1042 ' : 'CUST-204' }),
			).not.toHaveProperty('found');
		},
	);

	it('should map eval cases to the columns of the suite', () => {
		const scenario = scenarios[0];

		expect(buildEvalRows(scenario, { input: 'input', criteria: 'what_to_check' })[0]).toEqual({
			input: scenario.evalCases[0].input,
			what_to_check: scenario.evalCases[0].criteria,
		});
	});

	it('should build request bodies that the endpoints accept', () => {
		expect(StartSelfHealingAgentInvestigationDto.safeParse({ agentId: run.agentId }).success).toBe(
			true,
		);
		expect(
			AgentConnectIntegrationDto.safeParse({
				type: 'webhook',
				credentialId: '',
				settings: { authentication: 'none' },
			}).success,
		).toBe(true);
		expect(buildWebhookRequest('Hello')).toEqual({ input: 'Hello' });
		expect(buildWebhookRequest('Hello', 'c-1')).toEqual({ input: 'Hello', conversation: 'c-1' });
	});

	it.each([
		{ calls: ['anthropic.tool_search', 'oms-lookup', 'crm-lookup'], first: 'oms-lookup' },
		{ calls: ['anthropic.tool_search', 'crm-lookup', 'oms-lookup'], first: 'crm-lookup' },
		{ calls: ['anthropic.tool_search'], first: undefined },
	])('should identify the first lookup among $calls', ({ calls, first }) => {
		expect(firstLookupTool(calls)).toBe(first);
	});

	it('should read a webhook channel reply and the tools of a session', () => {
		const reply = readWebhookReply({
			conversation: { id: 'c-1' },
			output: [{ type: 'message', content: [{ type: 'output_text', text: 'Shipped.' }] }],
		});

		expect(reply).toEqual({ conversationId: 'c-1', text: 'Shipped.' });
		expect(readWebhookReply({ error: { message: 'No published agent with this URL' } }).text).toBe(
			'No published agent with this URL',
		);
		expect(webhookThreadId(run.agentId, 'c-1')).toBe(`${run.agentId}:webhook:c-1`);
		expect(
			readToolNames([
				{ timeline: [{ type: 'text' }, { type: 'tool-call', name: 'crm-lookup' }] },
				{ timeline: null },
				{ timeline: [{ type: 'tool-call', name: 'oms-lookup' }] },
			]),
		).toEqual(['crm-lookup', 'oms-lookup']);
	});
});
