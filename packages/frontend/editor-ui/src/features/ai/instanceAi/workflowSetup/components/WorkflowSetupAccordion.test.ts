import { computed, nextTick, ref, type Ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import WorkflowSetupAccordion from './WorkflowSetupAccordion.vue';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import type {
	WorkflowSetupGroup,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';

const workflowSetupContext = vi.hoisted(() => ({
	current: undefined as unknown as WorkflowSetupContext,
}));

const credentialsStore = vi.hoisted(() => ({
	getCredentialTypeByName: vi.fn(),
	isCredentialTestPending: vi.fn(),
}));

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn(),
	communityNodeType: vi.fn(() => null),
}));

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => workflowSetupContext.current,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'instanceAi.workflowSetup.groupContext') {
				return `Part of ${opts?.interpolate?.name}`;
			}
			if (key === 'instanceAi.workflowSetup.applySetup') return 'Apply setup';
			if (key === 'generic.complete') return 'Complete';
			if (key === 'instanceAi.workflowSetup.statusChecking') return 'Checking';
			if (key === 'instanceAi.workflowSetup.statusNeedsAttention') return 'Needs attention';
			if (key === 'instanceAi.workflowSetup.statusTodo') return 'To do';
			if (key === 'instanceAi.workflowSetup.statusDone') return 'Done';
			return key;
		},
	}),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		props: ['nodeType', 'size'],
		template: '<span data-test-id="node-icon" />',
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		props: ['credentialTypeName', 'size'],
		template: '<span data-test-id="credential-icon" />',
	},
}));

vi.mock('./WorkflowSetupSectionBody.vue', () => ({
	default: {
		props: {
			section: { type: Object, required: true },
			hideCredential: { type: Boolean, default: false },
			hideHelper: { type: Boolean, default: false },
			helperTextOverride: { type: String, default: undefined },
			credentialSections: { type: Array, default: undefined },
			parameterSections: { type: Array, default: undefined },
		},
		template:
			'<div data-test-id="workflow-setup-section-body" :data-section-id="section.id" :data-hide-credential="String(Boolean(hideCredential))" :data-hide-helper="String(Boolean(hideHelper))" :data-helper-text-override="helperTextOverride ?? \'\'" :data-credential-sections-count="String(credentialSections?.length ?? 0)" :data-parameter-sections-count="String(parameterSections?.length ?? 0)" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowSetupAccordion, {
	global: {
		stubs: {
			ConfirmationFooter: {
				template: '<footer><slot /></footer>',
			},
			N8nButton: {
				props: ['disabled', 'label'],
				emits: ['click'],
				template:
					'<button :disabled="disabled" data-test-id="instance-ai-workflow-setup-apply" @click="$emit(\'click\')">{{ label }}</button>',
			},
			N8nTooltip: {
				props: ['content', 'disabled'],
				template: '<div :data-content="content" :data-disabled="disabled"><slot /></div>',
			},
			N8nIcon: {
				props: ['icon', 'spin'],
				template: '<span :data-icon="icon" :data-spin="spin" />',
			},
			N8nText: {
				template: '<span><slot /></span>',
			},
		},
	},
});

const sectionA = makeWorkflowSetupSection({
	id: 'HTTP Request:httpBasicAuth',
	credentialType: 'httpBasicAuth',
	targetNodeName: 'HTTP Request',
});
const sectionB = makeWorkflowSetupSection({
	id: 'Slack:slackApi',
	credentialType: 'slackApi',
	targetNodeName: 'Slack',
	node: {
		id: 'slack',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
	},
});

interface ContextOptions {
	steps?: Ref<WorkflowSetupStep[]>;
	completedIds?: Ref<Set<string>>;
	failedIds?: Ref<Set<string>>;
	pendingCredentialIds?: Ref<Set<string>>;
	credentialSelections?: WorkflowSetupContext['credentialSelections'];
	apply?: () => Promise<void>;
}

function makeContext(options: ContextOptions = {}): WorkflowSetupContext {
	const steps =
		options.steps ??
		ref<WorkflowSetupStep[]>([
			{ kind: 'section', section: sectionA },
			{ kind: 'section', section: sectionB },
		]);
	const completedIds = options.completedIds ?? ref(new Set<string>());
	const failedIds = options.failedIds ?? ref(new Set<string>());

	credentialsStore.isCredentialTestPending.mockImplementation((id: string) =>
		Boolean(options.pendingCredentialIds?.value.has(id)),
	);

	return {
		sections: computed(() =>
			steps.value.flatMap((step) =>
				step.kind === 'section'
					? [step.section]
					: [step.group.rootSection, ...step.group.subnodeSections].filter(
							(section): section is WorkflowSetupSection => section !== undefined,
						),
			),
		),
		steps: computed(() => steps.value),
		currentStepIndex: ref(0),
		activeStep: computed(() => steps.value[0]),
		hasOtherUnhandledSteps: computed(() => false),
		canAdvanceToNextIncomplete: computed(() => false),
		credentialSelections:
			options.credentialSelections ??
			ref({
				[sectionA.targetNodeName]: { [sectionA.credentialType ?? '']: 'http-cred' },
				[sectionB.targetNodeName]: { [sectionB.credentialType ?? '']: 'slack-cred' },
			}),
		terminalState: ref(null),
		isReady: ref(true),
		workflowId: computed(() => undefined),
		projectId: computed(() => undefined),
		credentialFlow: computed(() => undefined),
		isActionPending: ref(false),
		setCredential: vi.fn(),
		setParameterValue: vi.fn(),
		getDisplayNode: (section) => section.node as INodeUi,
		isSectionComplete: (section) => completedIds.value.has(section.id),
		isCredentialTestFailed: (section) => failedIds.value.has(section.id),
		isSectionSkipped: () => false,
		isStepComplete: () => false,
		isStepSkipped: () => false,
		isStepHandled: () => false,
		goToStep: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToNextIncomplete: vi.fn(),
		apply: options.apply ?? vi.fn(async () => {}),
		skipCurrentStep: vi.fn(async () => {}),
	};
}

describe('WorkflowSetupAccordion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialsStore.getCredentialTypeByName.mockImplementation((name: string) => ({
			displayName:
				name === 'slackApi'
					? 'Slack API'
					: name === 'googleCalendarOAuth2Api'
						? 'Google Calendar OAuth2 API'
						: 'HTTP Basic Auth',
		}));
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.httpRequest',
			properties: [],
		});
	});

	it('shows every setup item and opens the first incomplete item by default', () => {
		workflowSetupContext.current = makeContext({
			completedIds: ref(new Set([sectionA.id])),
		});

		const { getAllByTestId, getByText, queryByTestId } = renderComponent();

		expect(getAllByTestId('instance-ai-workflow-setup-accordion-item')).toHaveLength(2);
		expect(getByText('Slack')).toBeInTheDocument();
		expect(queryByTestId('workflow-setup-section-body')).toHaveAttribute(
			'data-section-id',
			sectionB.id,
		);
		expect(getAllByTestId('instance-ai-workflow-setup-status-pill')[0]).toHaveTextContent('Done');
		expect(getAllByTestId('instance-ai-workflow-setup-status-pill')[1]).toHaveTextContent('To do');
		expect(
			getAllByTestId('instance-ai-workflow-setup-accordion-header')[0].querySelector(
				'[data-icon="chevrons-down-up"], [data-icon="chevrons-up-down"]',
			),
		).not.toBeInTheDocument();
	});

	it('keeps one setup item open and lets users switch rows', async () => {
		workflowSetupContext.current = makeContext();

		const { getAllByTestId } = renderComponent();

		expect(getAllByTestId('workflow-setup-section-body')).toHaveLength(1);
		expect(getAllByTestId('workflow-setup-section-body')[0]).toHaveAttribute(
			'data-section-id',
			sectionA.id,
		);

		await fireEvent.click(getAllByTestId('instance-ai-workflow-setup-accordion-header')[1]);

		const bodies = getAllByTestId('workflow-setup-section-body');
		expect(bodies).toHaveLength(1);
		expect(bodies[0]).toHaveAttribute('data-section-id', sectionB.id);
	});

	it('flattens grouped setup steps and preserves group context', () => {
		const rootSection = makeWorkflowSetupSection({
			id: 'Agent:openAiApi',
			targetNodeName: 'Agent',
			credentialType: 'openAiApi',
			node: { name: 'Agent', type: 'agentType' },
		});
		const subSection = makeWorkflowSetupSection({
			id: 'Model:anthropicApi',
			targetNodeName: 'Model',
			credentialType: 'anthropicApi',
			node: { name: 'Model', type: 'modelType' },
		});
		const group: WorkflowSetupGroup = {
			subnodeRootNode: { id: 'agent', name: 'Agent', type: 'agentType', typeVersion: 1 },
			rootSection,
			subnodeSections: [subSection],
		};
		workflowSetupContext.current = makeContext({
			steps: ref([{ kind: 'group', group }]),
		});

		const { getAllByTestId, getByText } = renderComponent();

		expect(getAllByTestId('instance-ai-workflow-setup-accordion-item')).toHaveLength(2);
		expect(getByText('Part of Agent')).toBeInTheDocument();
	});

	it('groups repeated credential types into one service setup item', () => {
		const calendarNoPoSection = makeWorkflowSetupSection({
			id: 'Create Payment Reminder (No PO):googleCalendarOAuth2Api',
			targetNodeName: 'Create Payment Reminder (No PO)',
			credentialType: 'googleCalendarOAuth2Api',
			parameterNames: ['calendar'],
			node: {
				id: 'calendar-no-po',
				name: 'Create Payment Reminder (No PO)',
				type: 'n8n-nodes-base.googleCalendar',
				parameters: { calendar: '' },
			},
		});
		const calendarMatchSection = makeWorkflowSetupSection({
			id: 'Create Payment Reminder (Match):googleCalendarOAuth2Api',
			targetNodeName: 'Create Payment Reminder (Match)',
			credentialType: 'googleCalendarOAuth2Api',
			parameterNames: ['calendar'],
			node: {
				id: 'calendar-match',
				name: 'Create Payment Reminder (Match)',
				type: 'n8n-nodes-base.googleCalendar',
				parameters: { calendar: '' },
			},
		});
		workflowSetupContext.current = makeContext({
			steps: ref([
				{ kind: 'section', section: calendarNoPoSection },
				{ kind: 'section', section: calendarMatchSection },
			]),
		});

		const { getAllByTestId, getByText } = renderComponent();

		expect(getAllByTestId('instance-ai-workflow-setup-accordion-item')).toHaveLength(1);
		expect(getByText('Google Calendar')).toBeInTheDocument();

		const bodies = getAllByTestId('workflow-setup-section-body');
		expect(bodies).toHaveLength(2);
		expect(bodies[0]).toHaveAttribute('data-hide-credential', 'false');
		expect(bodies[0]).toHaveAttribute('data-hide-helper', 'true');
		expect(bodies[0]).toHaveAttribute('data-helper-text-override', '');
		expect(bodies[0]).toHaveAttribute('data-credential-sections-count', '2');
		expect(bodies[1]).toHaveAttribute('data-section-id', calendarNoPoSection.id);
		expect(bodies[1]).toHaveAttribute('data-hide-credential', 'true');
		expect(bodies[1]).toHaveAttribute('data-hide-helper', 'true');
		expect(bodies[1]).toHaveAttribute('data-parameter-sections-count', '2');
	});

	it('enables apply only after every setup item is complete', async () => {
		const completedIds = ref(new Set<string>());
		const apply = vi.fn(async () => {});
		workflowSetupContext.current = makeContext({ completedIds, apply });

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toHaveAttribute('disabled');

		completedIds.value = new Set([sectionA.id, sectionB.id]);
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-apply')).not.toHaveAttribute('disabled');

		await fireEvent.click(getByTestId('instance-ai-workflow-setup-apply'));

		expect(apply).toHaveBeenCalledTimes(1);
	});

	it('blocks apply while a credential test is pending or failed', async () => {
		const completedIds = ref(new Set([sectionA.id, sectionB.id]));
		const pendingCredentialIds = ref(new Set(['slack-cred']));
		const failedIds = ref(new Set<string>());
		workflowSetupContext.current = makeContext({
			completedIds,
			pendingCredentialIds,
			failedIds,
		});

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toHaveAttribute('disabled');

		pendingCredentialIds.value = new Set();
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-apply')).not.toHaveAttribute('disabled');

		failedIds.value = new Set([sectionB.id]);
		await nextTick();

		expect(getByTestId('instance-ai-workflow-setup-apply')).toHaveAttribute('disabled');
	});

	it('does not render wizard navigation or skip actions', () => {
		workflowSetupContext.current = makeContext();

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-workflow-setup-later')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-workflow-setup-continue')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-workflow-setup-prev')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-workflow-setup-next')).not.toBeInTheDocument();
	});
});
