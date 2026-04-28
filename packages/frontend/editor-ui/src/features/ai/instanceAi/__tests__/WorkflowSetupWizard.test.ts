import { computed, nextTick, ref, type Ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowSetupWizard from '../workflowSetup/components/WorkflowSetupWizard.vue';
import type { WorkflowSetupContext } from '../workflowSetup/composables/useWorkflowSetupContext';
import type { WorkflowSetupCard } from '../workflowSetup/workflowSetup.types';

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
			N8nButton: {
				props: ['disabled', 'label'],
				emits: ['click'],
				template:
					'<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
			},
			N8nTooltip: {
				props: ['content', 'disabled'],
				template: '<div><slot /></div>',
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

const card: WorkflowSetupCard = {
	id: 'HTTP Request:httpBasicAuth',
	credentialType: 'httpBasicAuth',
	targetNodeName: 'HTTP Request',
	node: {
		id: 'http-request',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [0, 0],
		parameters: {},
	},
	currentCredentialId: null,
};

function makeContext(isComplete: Ref<boolean>): WorkflowSetupContext {
	return {
		cards: computed(() => [card]),
		currentStepIndex: ref(0),
		activeCard: computed(() => card),
		canAdvanceToNextIncomplete: computed(() => false),
		selections: ref({}),
		terminalState: ref(null),
		isReady: ref(true),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setSelection: vi.fn(),
		isCardComplete: () => isComplete.value,
		isCredentialTestFailed: () => false,
		isCardSkipped: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: vi.fn(),
		skipCurrentCard: vi.fn(),
		showContinueButton: computed(() => false),
	};
}

describe('WorkflowSetupWizard', () => {
	it('hides the skip action once the active setup card is complete', async () => {
		const isComplete = ref(false);
		workflowSetupContext.current = makeContext(isComplete);

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-workflow-setup-later')).not.toBeNull();

		isComplete.value = true;
		await nextTick();

		expect(queryByTestId('instance-ai-workflow-setup-later')).toBeNull();
		expect(queryByTestId('instance-ai-workflow-setup-apply')).not.toBeNull();
	});
});
