import { computed, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupWizardFooter from './WorkflowSetupWizardFooter.vue';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type { WorkflowSetupSection } from '../workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

const renderComponent = createComponentRenderer(WorkflowSetupWizardFooter, {
	global: {
		stubs: {
			N8nTooltip: {
				props: ['disabled', 'content'],
				template:
					'<div data-test-id="primary-action-tooltip" :data-tooltip-disabled="disabled" :data-tooltip-content="content"><slot /></div>',
			},
		},
	},
});

function makeContext(
	section: WorkflowSetupSection,
	overrides: {
		isStepHandled?: boolean;
		isCredentialTestFailed?: boolean;
	} = {},
): WorkflowSetupContext {
	const { isStepHandled = false, isCredentialTestFailed = false } = overrides;

	return {
		sections: computed(() => [section]),
		steps: computed(() => [{ kind: 'section', section }]),
		currentStepIndex: ref(0),
		activeStep: computed(() => ({ kind: 'section', section })),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		workflowId: computed(() => 'workflow-1'),
		projectId: computed(() => 'project-1'),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (setupSection) => setupSection.node as INodeUi,
		isSectionComplete: () => isStepHandled,
		isCredentialTestFailed: () => isCredentialTestFailed,
		isSectionSkipped: () => false,
		isStepComplete: () => isStepHandled,
		isStepSkipped: () => false,
		isStepHandled: () => isStepHandled,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

describe('WorkflowSetupWizardFooter', () => {
	it('explains why the primary action is disabled when the active step is incomplete', () => {
		const section = makeWorkflowSetupSection({ parameterNames: ['channelId'] });
		workflowSetupContext.current = makeContext(section);

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toBeDisabled();
		const tooltip = getByTestId('primary-action-tooltip');
		expect(tooltip.getAttribute('data-tooltip-disabled')).toBe('false');
		expect(tooltip.getAttribute('data-tooltip-content')).toBe(
			'To continue, complete the required fields above or skip setup for now',
		);
	});

	it('prioritizes the credential test failure explanation on the disabled primary action', () => {
		const section = makeWorkflowSetupSection();
		workflowSetupContext.current = makeContext(section, { isCredentialTestFailed: true });

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toBeDisabled();
		const tooltip = getByTestId('primary-action-tooltip');
		expect(tooltip.getAttribute('data-tooltip-disabled')).toBe('false');
		expect(tooltip.getAttribute('data-tooltip-content')).toBe(
			'Credential test failed. Update the credential and try again.',
		);
	});

	it('shows no tooltip when the primary action is enabled', () => {
		const section = makeWorkflowSetupSection();
		workflowSetupContext.current = makeContext(section, { isStepHandled: true });

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toBeEnabled();
		expect(getByTestId('primary-action-tooltip').getAttribute('data-tooltip-disabled')).toBe(
			'true',
		);
	});
});
