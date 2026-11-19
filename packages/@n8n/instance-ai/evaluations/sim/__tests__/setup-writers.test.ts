vi.mock('../../../src', () => ({ createEvalAgent: vi.fn() }));

import { createEvalAgent } from '../../../src';
import type { ExecutionScenario } from '../../types';
import type { SimService } from '../sim-admin-client';
import { writeTriggerInput, writeWorldPlan } from '../setup-writers';

const generate = vi.fn();
vi.mocked(createEvalAgent).mockReturnValue({
	structuredOutput: () => ({ generate }),
} as unknown as ReturnType<typeof createEvalAgent>);

const slack: SimService = {
	slug: 'slack',
	hosts: ['slack.com'],
	kinds: [],
	kindSchemas: [],
	credentialInfo: [],
	adminPrefix: '/_sim/v1',
};

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'a message arrives',
	dataSetup: 'one message in #general',
	successCriteria: 'the message is forwarded',
};

const plan = (arrivalParams: string) => ({
	worlds: [{ service: 'slack', world: '{"world_version":1}' }],
	arrivals: [{ service: 'slack', type: 'post_message', params: arrivalParams }],
	faults: [],
	idSubstitutions: [],
	notes: '',
});

const worldInput = {
	services: [slack],
	credentials: [],
	userRequest: 'Forward Slack messages',
	scenario,
};

beforeEach(() => generate.mockReset());

describe('writeWorldPlan', () => {
	it('refuses an arrival whose params are not a JSON object', async () => {
		generate.mockResolvedValue({ structuredOutput: plan('not json') });

		await expect(writeWorldPlan(worldInput)).rejects.toThrow(/post_message.*not a JSON object/);
	});

	it("keeps the workflow's names when it fixes an adopted plan that did not seed", async () => {
		generate.mockResolvedValue({ structuredOutput: plan('{"text":"hi"}') });
		const previousPlan = await writeWorldPlan(worldInput);

		await writeWorldPlan({
			...worldInput,
			previousPlan,
			previousErrors: ['slack: channel not found'],
			adoptFrom: ['Post: channel = "#alerts" (name)'],
		});

		const prompt = String(generate.mock.calls[1][0]);
		expect(prompt).toContain('slack: channel not found');
		expect(prompt).toContain('Post: channel = "#alerts" (name)');
		expect(prompt).not.toContain('You wrote this plan without the workflow');
	});
});

describe('writeTriggerInput', () => {
	const workflow = {
		id: 'wf-1',
		name: 'wf',
		nodes: [
			{ name: 'Slack Trigger', type: 'n8n-nodes-base.slackTrigger' },
			{ name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' },
		],
		connections: {},
		active: false,
		versionId: 'v1',
	};
	const triggerInput = {
		workflow,
		triggerNodes: ['Slack Trigger', 'Schedule'],
		scenario,
		dataSetup: scenario.dataSetup,
		refs: { 'channel:general': 'channel:C123' },
	};

	it('shows the writer the bare ids the vendor uses', async () => {
		generate.mockResolvedValue({ structuredOutput: { startNode: 'Schedule', items: ['{}'] } });

		await writeTriggerInput(triggerInput);

		const prompt = String(generate.mock.calls[0][0]);
		expect(prompt).toContain('"channel:general":"C123"');
	});

	it('refuses a start node that is not one of the triggers', async () => {
		generate.mockResolvedValue({ structuredOutput: { startNode: 'Webhook', items: ['{}'] } });

		await expect(writeTriggerInput(triggerInput)).rejects.toThrow(/Webhook/);
	});
});
