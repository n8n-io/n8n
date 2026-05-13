import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { INodeUi } from '@/Interface';
import WorkflowSetupSectionBody from '../workflowSetup/components/WorkflowSetupSectionBody.vue';
import { makeWorkflowSetupSection } from '../workflowSetup/__tests__/factories';
import type { WorkflowSetupContext } from '../workflowSetup/composables/useWorkflowSetupContext';
import type { WorkflowSetupSection } from '../workflowSetup/workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

vi.mock('../workflowSetup/composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
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

function makeContext(): WorkflowSetupContext {
	return {
		sections: computed(() => []),
		steps: computed(() => []),
		currentStepIndex: ref(0),
		activeStep: computed(() => undefined),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (section) => section.node as INodeUi,
		isSectionComplete: () => false,
		isCredentialTestFailed: () => false,
		isSectionSkipped: () => false,
		isStepComplete: () => false,
		isStepSkipped: () => false,
		isStepHandled: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

function renderComponent(section: WorkflowSetupSection) {
	workflowSetupContext.current = makeContext();

	return mount(WorkflowSetupSectionBody, {
		props: { section },
		global: {
			stubs: {
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: {
					template:
						'<div data-test-id="instance-ai-workflow-setup-card-tooltip"><span data-test-id="instance-ai-workflow-setup-card-tooltip-content"><slot name="content" /></span><slot /></div>',
				},
			},
		},
	});
}

describe('WorkflowSetupSectionBody', () => {
	it('hides the grouped nodes hint for single-target sections', () => {
		const section = makeWorkflowSetupSection();

		const wrapper = renderComponent(section);

		expect(
			wrapper.find('[data-test-id="instance-ai-workflow-setup-card-nodes-hint"]').exists(),
		).toBe(false);
	});

	it('shows grouped nodes count and tooltip for multi-target sections', () => {
		const section = makeWorkflowSetupSection({
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});

		const wrapper = renderComponent(section);

		expect(wrapper.get('[data-test-id="instance-ai-workflow-setup-card-nodes-hint"]').text()).toBe(
			'Used by 2 nodes',
		);
		expect(
			wrapper.get('[data-test-id="instance-ai-workflow-setup-card-tooltip-content"]').text(),
		).toBe('Primary, Follower');
	});
});
