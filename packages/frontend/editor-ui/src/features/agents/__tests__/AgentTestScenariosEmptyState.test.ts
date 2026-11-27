import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentTestScenariosEmptyState from '@/features/agents/components/AgentTestScenariosEmptyState.vue';

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const { generateAgentTestScenariosMock } = vi.hoisted(() => ({
	generateAgentTestScenariosMock: vi.fn(),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	generateAgentTestScenarios: (...args: unknown[]) => generateAgentTestScenariosMock(...args),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '/rest', pushRef: 'push-1' },
	}),
}));

const stubs = {
	N8nButton: {
		props: ['icon', 'variant', 'size'],
		emits: ['click'],
		template: '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nSpinner: {
		props: ['size', 'type'],
		template: '<span v-bind="$attrs" data-testid="n8n-spinner" :data-size="size" />',
	},
	N8nText: {
		props: ['tag', 'step', 'color'],
		template: '<span v-bind="$attrs"><slot /></span>',
	},
};

function mountEmptyState(
	props: Partial<InstanceType<typeof AgentTestScenariosEmptyState>['$props']> = {},
) {
	return mount(AgentTestScenariosEmptyState, {
		props: {
			projectId: 'project-1',
			agentId: 'agent-1',
			...props,
		},
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
			stubs,
		},
	});
}

describe('AgentTestScenariosEmptyState', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the initial empty state and waits for user action', () => {
		const wrapper = mountEmptyState();

		expect(wrapper.text()).toContain('agents.chat.testScenarios.prompt');
		expect(wrapper.find('[data-testid="agent-test-scenarios-write-btn"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-test-scenarios-loading"]').exists()).toBe(false);
		expect(generateAgentTestScenariosMock).not.toHaveBeenCalled();
	});

	it('transitions from initial state through loading to selectable scenarios', async () => {
		const deferred = createDeferred<{ scenarios: string[] }>();
		generateAgentTestScenariosMock.mockReturnValueOnce(deferred.promise);
		const beforeGenerate = vi.fn().mockResolvedValue(undefined);

		const wrapper = mountEmptyState({ beforeGenerate });

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		expect(beforeGenerate).toHaveBeenCalledTimes(1);
		expect(wrapper.find('[data-testid="agent-test-scenarios-loading"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="n8n-spinner"]').attributes('aria-hidden')).toBe('true');
		expect(wrapper.text()).toContain('agents.chat.testScenarios.generating');
		expect(wrapper.find('[data-testid="agent-test-scenarios-write-btn"]').exists()).toBe(false);

		deferred.resolve({
			scenarios: [
				'Summarise the tickets that came in this morning',
				'What are people complaining about most this week?',
				'Post today’s ticket summary to #customer-support',
				'Which tickets has nobody replied to yet?',
			],
		});
		await flushPromises();

		expect(wrapper.text()).toContain('agents.chat.testScenarios.selectPrompt');
		const rows = wrapper.findAll('[data-testid="agent-test-scenario-row"]');
		expect(rows).toHaveLength(4);
		expect(rows[0].text()).toBe('Summarise the tickets that came in this morning');

		await rows[1].trigger('click');
		expect(wrapper.emitted('select')).toEqual([
			['What are people complaining about most this week?'],
		]);
	});

	it('requests different scenarios passing previously generated ones', async () => {
		generateAgentTestScenariosMock
			.mockResolvedValueOnce({ scenarios: ['Scenario 1', 'Scenario 2'] })
			.mockResolvedValueOnce({ scenarios: ['Scenario 3', 'Scenario 4'] });

		const wrapper = mountEmptyState();

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		await wrapper.get('[data-testid="agent-test-scenarios-different-btn"]').trigger('click');
		await flushPromises();

		expect(generateAgentTestScenariosMock).toHaveBeenNthCalledWith(
			2,
			{ baseUrl: '/rest', pushRef: 'push-1' },
			'project-1',
			'agent-1',
			{ previousScenarios: ['Scenario 1', 'Scenario 2'] },
		);
		expect(
			wrapper.findAll('[data-testid="agent-test-scenario-row"]').map((row) => row.text()),
		).toEqual(['Scenario 3', 'Scenario 4']);
	});

	it('shows an error message and allows retrying when generation fails', async () => {
		generateAgentTestScenariosMock
			.mockRejectedValueOnce(new ResponseError('Server failure', { httpStatusCode: 500 }))
			.mockResolvedValueOnce({ scenarios: ['Recovered scenario'] });

		const wrapper = mountEmptyState();

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-test-scenarios-error"]').text()).toBe(
			'agents.chat.testScenarios.error',
		);
		expect(wrapper.find('[data-testid="agent-test-scenarios-write-btn"]').exists()).toBe(true);

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-test-scenarios-error"]').exists()).toBe(false);
		expect(wrapper.findAll('[data-testid="agent-test-scenario-row"]')).toHaveLength(1);
	});

	it('surfaces actionable backend messages for 400 errors and clears them on retry', async () => {
		generateAgentTestScenariosMock
			.mockRejectedValueOnce(
				new ResponseError('Add instructions to this agent before generating test scenarios.', {
					httpStatusCode: 400,
				}),
			)
			.mockResolvedValueOnce({ scenarios: ['Recovered scenario'] });

		const wrapper = mountEmptyState();

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-test-scenarios-error"]').text()).toBe(
			'Add instructions to this agent before generating test scenarios.',
		);

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-test-scenarios-error"]').exists()).toBe(false);
		expect(wrapper.findAll('[data-testid="agent-test-scenario-row"]')).toHaveLength(1);
	});

	it('caps accumulated previousScenarios to the latest 20 across repeated regenerations', async () => {
		for (let batch = 0; batch < 7; batch++) {
			generateAgentTestScenariosMock.mockResolvedValueOnce({
				scenarios: [`S-${batch}-1`, `S-${batch}-2`, `S-${batch}-3`, `S-${batch}-4`],
			});
		}

		const wrapper = mountEmptyState();
		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await flushPromises();

		for (let i = 0; i < 6; i++) {
			await wrapper.get('[data-testid="agent-test-scenarios-different-btn"]').trigger('click');
			await flushPromises();
		}

		const lastCallPayload = generateAgentTestScenariosMock.mock.calls.at(-1)?.[3] as {
			previousScenarios: string[];
		};
		expect(lastCallPayload.previousScenarios).toHaveLength(20);
		expect(lastCallPayload.previousScenarios[0]).toBe('S-1-1');
		expect(lastCallPayload.previousScenarios.at(-1)).toBe('S-5-4');
	});

	it('ignores stale responses if the agent changes while generating', async () => {
		const deferred = createDeferred<{ scenarios: string[] }>();
		generateAgentTestScenariosMock.mockReturnValueOnce(deferred.promise);

		const wrapper = mountEmptyState();

		await wrapper.get('[data-testid="agent-test-scenarios-write-btn"]').trigger('click');
		await wrapper.setProps({ agentId: 'agent-2' });

		deferred.resolve({ scenarios: ['Stale scenario'] });
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-test-scenarios-write-btn"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-test-scenarios-list"]').exists()).toBe(false);
	});
});
