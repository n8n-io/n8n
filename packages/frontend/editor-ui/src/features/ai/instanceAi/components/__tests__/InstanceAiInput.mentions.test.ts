import { fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { getWorkflows } from '@/app/api/workflows';

import InstanceAiInput from '../InstanceAiInput.vue';
import { buildDraftMention } from '../../mentions/buildMentionAttachment';
import type { InstanceAiDraftMention } from '../../mentions/instanceAiMentions.types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const telemetryTrack = vi.hoisted(() => vi.fn());

vi.mock('@/app/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
}));
vi.mock('../../composables/useIsInstanceAiMentionsEnabled', () => ({
	useIsInstanceAiMentionsEnabled: () => ref(true),
}));
vi.mock('../../composables/useIsNodeContextEnabled', () => ({
	useIsNodeContextEnabled: () => ref(true),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const workflow = createTestWorkflow({
	id: 'workflow-1',
	name: 'Support triage',
	versionId: 'version-1',
	isArchived: false,
	updatedAt: '2026-09-18T00:00:00.000Z',
});

const workflowMention = buildDraftMention(
	{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
	'typed',
);

const renderComponent = createComponentRenderer(InstanceAiInput, {
	props: {
		isStreaming: false,
		isSubmitting: false,
		isAwaitingConfirmation: false,
		isAwaitingPlanReview: false,
		isWorkflowBuilderAvailable: true,
		currentThreadId: 'thread-1',
		enableMentions: true,
		projectId: 'project-1',
		draftMentions: [],
	},
	global: { stubs: { InstanceAiInputMenu: true } },
});

async function waitForAvailability() {
	await waitFor(() => expect(vi.mocked(getWorkflows)).toHaveBeenCalled());
}

async function openTypedPicker(textarea: HTMLElement) {
	await fireEvent.update(textarea, '@sup');
	await waitFor(() => expect(document.querySelector('[role="option"]')).not.toBeNull());
}

describe('InstanceAiInput mentions', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		telemetryTrack.mockClear();
		vi.mocked(getWorkflows).mockResolvedValue({ count: 1, data: [workflow] });
	});

	it('keeps mention controls hidden when host wiring is disabled', () => {
		const { queryByTestId, getByRole } = renderComponent({
			props: { enableMentions: false },
		});

		expect(queryByTestId('instance-ai-mention-button')).not.toBeInTheDocument();
		expect(getByRole('textbox')).not.toHaveAttribute('role', 'combobox');
	});

	it('opens from typed @ and replaces the active range with a selected workflow', async () => {
		const { getByRole, emitted } = renderComponent();
		const textarea = getByRole('combobox');
		await waitForAvailability();
		await openTypedPicker(textarea);

		await fireEvent.click(getByRole('option', { name: /Support triage, Workflow/ }));

		expect(textarea).toHaveValue('Support triage ');
		const mentionEvents = emitted<[InstanceAiDraftMention[]]>()['update:draftMentions'];
		expect(mentionEvents[0][0]).toEqual([
			expect.objectContaining({
				key: 'workflow:workflow-1',
				origin: 'typed',
				attachment: { type: 'workflow', id: 'workflow-1', name: 'Support triage' },
			}),
		]);
		expect(emitted()['mention-workflow-selected']).toEqual([
			['workflow-1', 'Support triage ', 15, 15],
		]);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_CHAT_MENTION_PICKER,
			{ source: 'typed', surface: 'thread', has_open_workflow: false },
		);
		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.USER_ADDED_CHAT_MENTION,
			{
				source: 'typed',
				resource_type: 'workflow',
				query_length: 3,
				result_position: 0,
				surface: 'thread',
			},
		);
	});

	it('gives mention selection priority over Enter submit', async () => {
		const { getByRole, emitted } = renderComponent();
		const textarea = getByRole('combobox');
		await waitForAvailability();
		await openTypedPicker(textarea);

		await fireEvent.keyDown(textarea, { key: 'Enter' });

		expect(textarea).toHaveValue('Support triage ');
		expect(emitted().submit).toBeUndefined();
	});

	it('opens from the button and inserts at the saved textarea selection', async () => {
		const { getByRole, getByTestId, getByPlaceholderText } = renderComponent();
		const textarea = getByRole('combobox') as HTMLTextAreaElement;
		await waitForAvailability();
		await fireEvent.update(textarea, 'Fix this now');
		textarea.setSelectionRange(4, 8);

		await fireEvent.click(getByTestId('instance-ai-mention-button'));
		await waitFor(() =>
			expect(getByPlaceholderText('Search workflows and nodes')).toBeInTheDocument(),
		);
		await waitFor(() =>
			expect(getByRole('option', { name: /Support triage, Workflow/ })).toBeVisible(),
		);
		await fireEvent.click(getByRole('option', { name: /Support triage, Workflow/ }));

		expect(textarea).toHaveValue('Fix Support triage  now');
	});

	it('renders a removable mention chip', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { draftMentions: [workflowMention] },
		});

		expect(getByTestId('instance-ai-mention-chip-workflow')).toHaveTextContent('Support triage');
		await fireEvent.click(getByTestId('instance-ai-mention-remove-workflow'));
		expect(emitted()['update:draftMentions']).toEqual([[[]]]);
	});

	it('includes mention attachments in a mention-only submit', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { draftMentions: [workflowMention] },
		});

		await fireEvent.click(getByTestId('instance-ai-send-button'));

		const submit = emitted().submit?.[0] as unknown[] | undefined;
		expect(submit?.[0]).toBe('');
		expect(submit?.[1]).toEqual([{ type: 'workflow', id: 'workflow-1', name: 'Support triage' }]);
	});

	it('disables a result that is already mentioned', async () => {
		const { getByRole } = renderComponent({ props: { draftMentions: [workflowMention] } });
		const textarea = getByRole('combobox');
		await waitForAvailability();
		await openTypedPicker(textarea);

		expect(getByRole('option', { name: /Already mentioned/ })).toBeDisabled();
	});

	it('blocks an eleventh mention and exhausted attachment budgets', async () => {
		const mentions = Array.from({ length: 10 }, (_, index) =>
			buildDraftMention(
				{
					kind: 'workflow',
					workflowId: `workflow-${index}`,
					workflowName: `Workflow ${index}`,
				},
				'button',
			),
		);
		const first = renderComponent({ props: { draftMentions: mentions } });
		await waitForAvailability();
		expect(first.getByTestId('instance-ai-mention-button')).toBeDisabled();
		first.unmount();

		const second = renderComponent({
			props: { draftMentions: [workflowMention], reservedAttachmentCount: 9 },
		});
		expect(second.getByTestId('instance-ai-mention-button')).toBeDisabled();
	});

	it('keeps mentions staged while submitting plan-review feedback', async () => {
		const { getByRole, getByTestId, emitted } = renderComponent({
			props: { draftMentions: [workflowMention], isAwaitingPlanReview: true },
		});
		await fireEvent.update(getByRole('combobox'), 'Change the plan');
		await fireEvent.click(getByTestId('instance-ai-send-button'));

		const submit = emitted().submit?.[0] as unknown[] | undefined;
		expect(submit?.[1]).toBeUndefined();
		expect(emitted()['update:draftMentions']).toBeUndefined();
		expect(getByTestId('instance-ai-mention-chip-workflow')).toBeInTheDocument();
	});
});
