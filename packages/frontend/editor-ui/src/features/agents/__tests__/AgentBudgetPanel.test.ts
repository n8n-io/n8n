import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_GATEWAY_MANAGED_TAG, type PushMessage } from '@n8n/api-types';

import AgentBudgetMonthlyModal from '../components/AgentBudgetMonthlyModal.vue';
import AgentBudgetPanel from '../components/AgentBudgetPanel.vue';
import AgentBudgetSessionModal from '../components/AgentBudgetSessionModal.vue';
import type { AgentJsonConfig } from '../types';

const getAgentBudgetSpend = vi.hoisted(() => vi.fn());
const pushListeners = new Set<(event: PushMessage) => void>();

const aiGatewayMock = vi.hoisted(() => ({
	isEnabled: { value: false },
	balance: { value: undefined as number | undefined },
	fetchWallet: vi.fn().mockResolvedValue(undefined),
	fetchConfig: vi.fn().mockResolvedValue(undefined),
}));
const gatewayConfigMock = vi.hoisted(() => ({
	config: null as { supportsBilledCost?: boolean } | null,
}));

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => aiGatewayMock,
}));

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: () => gatewayConfigMock,
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentBudgetSpend,
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		addEventListener: (listener: (event: PushMessage) => void) => {
			pushListeners.add(listener);
			return () => pushListeners.delete(listener);
		},
	}),
}));

function emitPush(data: {
	projectId: string;
	agentId: string;
	threadId?: string;
	executionId?: string;
}): void {
	const event: PushMessage = {
		type: 'agentExecutionUpdated',
		data: { threadId: 'thread-1', executionId: 'execution-1', ...data },
	};
	for (const listener of [...pushListeners]) listener(event);
}

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			const copy: Record<string, string> = {
				'agents.builder.budget.title': 'Usage and limits',
				'agents.builder.budget.notSet': 'Not set',
				'agents.builder.budget.usage.none': 'No monthly budget',
				'agents.builder.budget.usage.unavailable': 'Usage unavailable',
				'agents.builder.budget.usage.spent': '{spent} of {budget} used',
				'agents.builder.budget.usage.estimate': 'estimate caption',
				'agents.builder.budget.usage.billed': 'billed caption',
				'agents.builder.budget.wallet.remaining': 'Wallet balance · {balance} left',
				'agents.builder.budget.wallet.empty': 'Wallet balance · No credits',
				'agents.builder.budget.monthly.value': '{amount}/month',
				'agents.builder.budget.monthly.alert': 'Alert at {percent}%',
			};
			const template = copy[key] ?? key;
			const values = options?.interpolate ?? {};
			return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
		},
	}),
}));

function config(budget?: AgentJsonConfig['config']): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		...(budget ? { config: budget } : {}),
	};
}

function budgetConfig(): AgentJsonConfig {
	return config({
		guardrails: {
			budget: {
				enabled: true,
				monthlyBudgetUsd: 200,
				sessionCostCapUsd: 5,
				alertThresholdPercent: 80,
			},
		},
	});
}

function mountPanel() {
	return mount(AgentBudgetPanel, {
		props: { config: budgetConfig(), projectId: 'project-1', agentId: 'agent-1' },
		global: {
			stubs: {
				I18nT: {
					template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
				},
			},
		},
	});
}

beforeEach(() => {
	pushListeners.clear();
	aiGatewayMock.isEnabled.value = false;
	aiGatewayMock.balance.value = undefined;
	aiGatewayMock.fetchWallet.mockClear();
	aiGatewayMock.fetchConfig.mockClear();
	gatewayConfigMock.config = null;
});

describe('AgentBudgetPanel', () => {
	it('shows Not set when no budget is saved', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Not set');
		expect(wrapper.text()).toContain('No monthly budget');
		expect(getAgentBudgetSpend).not.toHaveBeenCalled();
	});

	it('shows the saved amounts and the alert percent', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: config({
					guardrails: {
						budget: {
							enabled: true,
							monthlyBudgetUsd: 200,
							sessionCostCapUsd: 5,
							alertThresholdPercent: 80,
						},
					},
				}),
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();

		expect(wrapper.text()).toContain('$42 of $200 used');
		expect(wrapper.text()).toContain('$200/month');
		expect(wrapper.text()).toContain('Alert at 80%');
		expect(wrapper.text()).toContain('$5');
	});

	it('shows Usage unavailable when the spend read fails', async () => {
		getAgentBudgetSpend.mockReset().mockRejectedValue(new Error('read failed'));
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: config({
					guardrails: {
						budget: {
							enabled: true,
							monthlyBudgetUsd: 200,
						},
					},
				}),
				projectId: 'project-1',
				agentId: 'agent-1',
			},
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Usage unavailable');
		expect(wrapper.text()).not.toContain('used');
	});

	it('opens the matching modal from each row', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});

		await wrapper.get('[data-testid="agent-budget-monthly-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetMonthlyModal).props('open')).toBe(true);

		await wrapper.get('[data-testid="agent-budget-session-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('open')).toBe(true);
	});

	it('keeps an open modal view-only when editing becomes locked', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});

		await wrapper.get('[data-testid="agent-budget-session-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('disabled')).toBe(false);

		await wrapper.setProps({ disabled: true });
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('disabled')).toBe(true);
		expect(wrapper.getComponent(AgentBudgetMonthlyModal).props('disabled')).toBe(true);
	});

	it('keeps the panel heading visually hidden but accessible', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		const heading = wrapper.get('h3');
		expect(heading.text()).toBe('Usage and limits');
		expect(heading.attributes('style')).toContain('clip');
		const section = wrapper.get('[data-testid="agent-budget-panel"]');
		expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'));
	});

	it('applies the disabled styling to the panel body only when disabled', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		const body = () => wrapper.get('[data-testid="agent-budget-usage"]').element.parentElement;
		expect(body()?.classList.contains('disabled')).toBe(false);

		await wrapper.setProps({ disabled: true });
		expect(body()?.classList.contains('disabled')).toBe(true);
	});

	it('refetches the spend when an execution update arrives for this agent', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		const wrapper = mountPanel();
		await flushPromises();
		expect(wrapper.text()).toContain('$42');
		expect(wrapper.text()).toContain('21%');

		getAgentBudgetSpend.mockResolvedValue({ spentUsd: 84 });
		emitPush({ projectId: 'project-1', agentId: 'agent-1' });
		await flushPromises();

		expect(getAgentBudgetSpend).toHaveBeenCalledTimes(2);
		expect(wrapper.text()).toContain('$84');
		expect(wrapper.text()).toContain('42%');
	});

	it('keeps the shown value while a push-triggered refresh is in flight', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		const wrapper = mountPanel();
		await flushPromises();
		expect(wrapper.text()).toContain('$42 of $200 used');

		let resolveSpend: (value: { spentUsd: number }) => void = () => {};
		getAgentBudgetSpend.mockReturnValue(
			new Promise<{ spentUsd: number }>((resolve) => {
				resolveSpend = resolve;
			}),
		);
		emitPush({ projectId: 'project-1', agentId: 'agent-1' });
		await flushPromises();

		// The old value stays rendered; the refresh does not flash a loading state.
		expect(wrapper.text()).toContain('$42 of $200 used');

		resolveSpend({ spentUsd: 84 });
		await flushPromises();
		expect(wrapper.text()).toContain('$84 of $200 used');
	});

	it('keeps the last shown value when a push-triggered refresh fails', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		const wrapper = mountPanel();
		await flushPromises();

		getAgentBudgetSpend.mockRejectedValue(new Error('read failed'));
		emitPush({ projectId: 'project-1', agentId: 'agent-1' });
		await flushPromises();

		expect(wrapper.text()).toContain('$42 of $200 used');
		expect(wrapper.text()).not.toContain('Usage unavailable');
	});

	it('ignores execution updates for other projects and agents', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		mountPanel();
		await flushPromises();
		getAgentBudgetSpend.mockClear();

		emitPush({ projectId: 'project-1', agentId: 'other-agent' });
		emitPush({ projectId: 'other-project', agentId: 'agent-1' });
		await flushPromises();

		expect(getAgentBudgetSpend).not.toHaveBeenCalled();
	});

	it('shows the wallet balance for a Gateway credits agent', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		aiGatewayMock.isEnabled.value = true;
		aiGatewayMock.balance.value = 4.99;
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: { ...budgetConfig(), credential: AI_GATEWAY_MANAGED_TAG },
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();

		expect(aiGatewayMock.fetchWallet).toHaveBeenCalled();
		expect(wrapper.get('[data-testid="agent-budget-wallet"]').text()).toContain(
			'Wallet balance · $4.99 left',
		);
	});

	it('shows No credits when the wallet is empty', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 0 });
		aiGatewayMock.isEnabled.value = true;
		aiGatewayMock.balance.value = 0;
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: { ...budgetConfig(), credential: AI_GATEWAY_MANAGED_TAG },
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-budget-wallet"]').text()).toContain('No credits');
	});

	it('hides the wallet line for an own-key agent', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		aiGatewayMock.isEnabled.value = true;
		aiGatewayMock.balance.value = 4.99;
		const wrapper = mountPanel();
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-budget-wallet"]').exists()).toBe(false);
		expect(aiGatewayMock.fetchWallet).not.toHaveBeenCalled();
	});

	it('labels the figure as billed only when the gateway reports per-call cost', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		aiGatewayMock.isEnabled.value = true;
		gatewayConfigMock.config = { supportsBilledCost: true };
		const gatewayWrapper = mount(AgentBudgetPanel, {
			props: {
				config: { ...budgetConfig(), credential: AI_GATEWAY_MANAGED_TAG },
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();
		expect(gatewayWrapper.text()).toContain('billed caption');
		expect(gatewayWrapper.text()).not.toContain('estimate caption');

		// Without the gateway capability the figure stays an estimate.
		gatewayConfigMock.config = null;
		const estimateWrapper = mount(AgentBudgetPanel, {
			props: {
				config: { ...budgetConfig(), credential: AI_GATEWAY_MANAGED_TAG },
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();
		expect(estimateWrapper.text()).toContain('estimate caption');
		expect(estimateWrapper.text()).not.toContain('billed caption');
	});
});
