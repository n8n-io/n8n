import { computed, nextTick, ref, type Ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowSetupWizard from '../workflowSetup/components/WorkflowSetupWizard.vue';
import type { WorkflowSetupContext } from '../workflowSetup/composables/useWorkflowSetupContext';
import { makeWorkflowSetupSection } from '../workflowSetup/__tests__/factories';
import type { WorkflowSetupSection, WorkflowSetupStep } from '../workflowSetup/workflowSetup.types';
import type { INodeUi } from '@/Interface';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

vi.mock('../workflowSetup/composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const renderComponent = createComponentRenderer(WorkflowSetupWizard, {
	global: {
		stubs: {
			ConfirmationFooter: {
				template: '<footer><slot /></footer>',
			},
			WorkflowSetupCard: {
				template:
					'<section data-test-id="instance-ai-workflow-setup-card"><slot name="footer" /></section>',
			},
			WorkflowSetupGroupCard: {
				template:
					'<section data-test-id="instance-ai-workflow-setup-group-card"><slot name="footer" /></section>',
			},
			N8nButton: {
				props: ['disabled', 'label'],
				emits: ['click'],
				template:
					'<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
			},
			N8nIconButton: {
				props: ['disabled', 'icon'],
				emits: ['click'],
				template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ icon }}</button>',
			},
			N8nTooltip: {
				props: ['content', 'disabled'],
				template:
					'<div data-test-id="instance-ai-workflow-setup-tooltip" :data-content="content" :data-disabled="disabled"><slot /></div>',
			},
			N8nIcon: {
				template: '<span />',
			},
			N8nText: {
				template: '<span><slot /></span>',
			},
		},
	},
});

const sectionA = makeWorkflowSetupSection();
const sectionB = makeWorkflowSetupSection({
	id: 'Slack:slackApi',
	credentialType: 'slackApi',
	targetNodeName: 'Slack',
	node: {
		id: 'slack',
		type: 'n8n-nodes-base.slack',
	},
});

interface ContextOptions {
	sections?: WorkflowSetupSection[];
	currentStepIndex?: Ref<number>;
	isSkipped?: Ref<boolean>;
	isCredentialTestFailed?: Ref<boolean>;
	isActionPending?: Ref<boolean>;
	hasOtherUnhandledSteps?: Ref<boolean>;
}

function makeContext(isComplete: Ref<boolean>, options: ContextOptions = {}): WorkflowSetupContext {
	const sections = options.sections ?? [sectionA];
	const currentStepIndex = options.currentStepIndex ?? ref(0);
	const steps = computed<WorkflowSetupStep[]>(() =>
		sections.map((section) => ({ kind: 'section', section })),
	);

	const isStepHandled = (step: WorkflowSetupStep): boolean => {
		if (step.kind !== 'section') return false;
		return isComplete.value || (options.isSkipped?.value ?? false);
	};

	return {
		sections: computed(() => sections),
		steps,
		currentStepIndex,
		activeStep: computed(() => steps.value[currentStepIndex.value]),
		hasOtherUnhandledSteps: computed(() => options.hasOtherUnhandledSteps?.value ?? false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: options.isActionPending ?? ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (section) => section.node as INodeUi,
		isSectionComplete: () => isComplete.value,
		isCredentialTestFailed: () => options.isCredentialTestFailed?.value ?? false,
		isSectionSkipped: () => options.isSkipped?.value ?? false,
		isStepComplete: () => isComplete.value,
		isStepSkipped: () => options.isSkipped?.value ?? false,
		isStepHandled,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

describe('WorkflowSetupWizard', () => {
	it('hides the skip action once the active setup step is complete', async () => {
		const isComplete = ref(false);
		workflowSetupContext.current = makeContext(isComplete);

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-workflow-setup-later')).not.toBeNull();

		isComplete.value = true;
		await nextTick();

		expect(queryByTestId('instance-ai-workflow-setup-later')).toBeNull();
		expect(queryByTestId('instance-ai-workflow-setup-apply')).not.toBeNull();
	});

	it('hides footer navigation arrows when there is only one setup step', () => {
		workflowSetupContext.current = makeContext(ref(false));

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-workflow-setup-prev')).toBeNull();
		expect(queryByTestId('instance-ai-workflow-setup-next')).toBeNull();
	});

	it('disables footer navigation arrows at the first and last setup steps', async () => {
		const currentStepIndex = ref(0);
		workflowSetupContext.current = makeContext(ref(false), {
			sections: [sectionA, sectionB],
			currentStepIndex,
		});

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-prev')).toHaveAttribute('disabled');
		expect(getByTestId('instance-ai-workflow-setup-next')).not.toHaveAttribute('disabled');

		currentStepIndex.value = 1;
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-prev')).not.toHaveAttribute('disabled');
		expect(getByTestId('instance-ai-workflow-setup-next')).toHaveAttribute('disabled');
	});

	it('disables the skip action while a footer action is pending', async () => {
		const isActionPending = ref(true);
		workflowSetupContext.current = makeContext(ref(false), { isActionPending });

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-later')).toHaveAttribute('disabled');

		isActionPending.value = false;
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-later')).not.toHaveAttribute('disabled');
	});

	it('enables the primary footer action for skipped setup steps', async () => {
		const isSkipped = ref(false);
		workflowSetupContext.current = makeContext(ref(false), { isSkipped });

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toHaveAttribute('disabled');
		expect(queryByTestId('instance-ai-workflow-setup-later')).not.toBeNull();

		isSkipped.value = true;
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-apply')).not.toHaveAttribute('disabled');
		expect(queryByTestId('instance-ai-workflow-setup-later')).toBeNull();
	});

	it('shows the continue footer action instead of apply when there are other unhandled steps', () => {
		workflowSetupContext.current = makeContext(ref(true), { hasOtherUnhandledSteps: ref(true) });

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-continue')).not.toHaveAttribute('disabled');
		expect(queryByTestId('instance-ai-workflow-setup-apply')).toBeNull();
	});

	it('enables the footer tooltip when the active credential test failed', () => {
		workflowSetupContext.current = makeContext(ref(true), { isCredentialTestFailed: ref(true) });

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-tooltip')).toHaveAttribute(
			'data-content',
			'instanceAi.workflowSetup.credentialTestFailedTooltip',
		);
		expect(getByTestId('instance-ai-workflow-setup-tooltip')).toHaveAttribute(
			'data-disabled',
			'false',
		);
	});
});
