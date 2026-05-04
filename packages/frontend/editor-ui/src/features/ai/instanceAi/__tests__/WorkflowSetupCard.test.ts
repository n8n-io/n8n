import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { INodeUi } from '@/Interface';
import WorkflowSetupCard from '../workflowSetup/components/WorkflowSetupCard.vue';
import { makeWorkflowSetupCard } from '../workflowSetup/__tests__/factories';
import type { WorkflowSetupContext } from '../workflowSetup/composables/useWorkflowSetupContext';
import type { WorkflowSetupCard as WorkflowSetupCardType } from '../workflowSetup/workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

vi.mock('../workflowSetup/composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { template: '<span />' },
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: { template: '<span />' },
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: { template: '<div><slot name="label-postfix" /></div>' },
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: { template: '<div />' },
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'instanceAi.workflowSetup.usedByNodes') {
				return `Used by ${options?.interpolate?.count} nodes`;
			}
			return key;
		},
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialTypeByName: () => ({ displayName: 'HTTP Basic Auth' }),
		getCredentialById: () => undefined,
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => null,
		communityNodeType: () => null,
	}),
}));

vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	default: () => ({ variablesAsObject: {} }),
}));

function makeContext(card: WorkflowSetupCardType): WorkflowSetupContext {
	return {
		cards: computed(() => [card]),
		currentStepIndex: ref(0),
		activeCard: computed(() => card),
		hasOtherUnhandledCards: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (setupCard) => setupCard.node as INodeUi,
		isCardComplete: () => false,
		isCredentialTestFailed: () => false,
		isCardSkipped: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(),
		skipCurrentCard: vi.fn(),
	};
}

function renderComponent(card: WorkflowSetupCardType) {
	workflowSetupContext.current = makeContext(card);

	return mount(WorkflowSetupCard, {
		global: {
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: {
					template:
						'<div data-test-id="instance-ai-workflow-setup-card-tooltip"><span data-test-id="instance-ai-workflow-setup-card-tooltip-content"><slot name="content" /></span><slot /></div>',
				},
			},
		},
	});
}

describe('WorkflowSetupCard', () => {
	it('hides the grouped nodes hint for single-target cards', () => {
		const card = makeWorkflowSetupCard();

		const wrapper = renderComponent(card);

		expect(
			wrapper.find('[data-test-id="instance-ai-workflow-setup-card-nodes-hint"]').exists(),
		).toBe(false);
	});

	it('shows grouped nodes count and tooltip for multi-target cards', () => {
		const card = makeWorkflowSetupCard({
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});

		const wrapper = renderComponent(card);

		expect(wrapper.get('[data-test-id="instance-ai-workflow-setup-card-nodes-hint"]').text()).toBe(
			'Used by 2 nodes',
		);
		expect(
			wrapper.get('[data-test-id="instance-ai-workflow-setup-card-tooltip-content"]').text(),
		).toBe('Primary, Follower');
	});
});
