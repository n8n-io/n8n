import { computed, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiWorkflowSetup from '../workflowSetup/InstanceAiWorkflowSetup.vue';
import { makeWorkflowSetupSection, makeSetupRequest } from '../workflowSetup/__tests__/factories';
import type { WorkflowSetupContext } from '../workflowSetup/composables/useWorkflowSetupContext';
import type { WorkflowSetupStep } from '../workflowSetup/workflowSetup.types';
import type { INodeUi } from '@/Interface';

const experimentState = vi.hoisted(() => ({
	isFeatureEnabled: { __v_isRef: true, value: false },
}));

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

vi.mock('@/experiments/instanceAiSetupList', () => ({
	useInstanceAiSetupListExperiment: () => ({
		isFeatureEnabled: experimentState.isFeatureEnabled,
	}),
}));

vi.mock('../workflowSetup/composables/useWorkflowSetupContext', () => ({
	provideWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('../workflowSetup/components/WorkflowSetupWizard.vue', () => ({
	default: {
		template: '<div data-test-id="workflow-setup-wizard" />',
	},
}));

vi.mock('../workflowSetup/components/WorkflowSetupAccordion.vue', () => ({
	default: {
		template: '<div data-test-id="workflow-setup-accordion" />',
	},
}));

vi.mock('../workflowSetup/components/WorkflowSetupStatus.vue', () => ({
	default: {
		props: ['state'],
		template: '<div data-test-id="workflow-setup-status" />',
	},
}));

const renderComponent = createComponentRenderer(InstanceAiWorkflowSetup);

function makeContext(): WorkflowSetupContext {
	const section = makeWorkflowSetupSection();
	const steps = computed<WorkflowSetupStep[]>(() => [{ kind: 'section', section }]);

	return {
		sections: computed(() => [section]),
		steps,
		currentStepIndex: ref(0),
		activeStep: computed(() => steps.value[0]),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		workflowId: computed(() => undefined),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (setupSection) => setupSection.node as INodeUi,
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

describe('InstanceAiWorkflowSetup', () => {
	it('renders the wizard when the setup list experiment is disabled', () => {
		experimentState.isFeatureEnabled.value = false;
		workflowSetupContext.current = makeContext();

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				requestId: 'request-id',
				setupRequests: [makeSetupRequest()],
			},
		});

		expect(getByTestId('workflow-setup-wizard')).toBeInTheDocument();
		expect(queryByTestId('workflow-setup-accordion')).not.toBeInTheDocument();
	});

	it('renders the accordion when the setup list experiment is enabled', () => {
		experimentState.isFeatureEnabled.value = true;
		workflowSetupContext.current = makeContext();

		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				requestId: 'request-id',
				setupRequests: [makeSetupRequest()],
			},
		});

		expect(getByTestId('workflow-setup-accordion')).toBeInTheDocument();
		expect(queryByTestId('workflow-setup-wizard')).not.toBeInTheDocument();
	});
});
