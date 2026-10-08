import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { SharedCard } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import type { AssistantConfirmationInput } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import SharedThreadCard from '../SharedThreadCard.vue';
import { provideThreadSharing } from '../useThreadSharing';
import { PROJECT_ID, READ_SCOPES, TEAMMATE, THREAD_ID, setUpSharing } from './sharingFixtures';

const runPayload = { requestId: 'req-1', message: 'Run "Digest" now?', severity: 'info' };
const runCall: SharedCard = {
	toolName: 'executions',
	input: { action: 'run', workflowId: 'wf-1' },
	suspendPayload: runPayload,
};
const runInput: AssistantConfirmationInput = {
	...runPayload,
	severity: 'info',
	toolName: 'executions',
	args: { action: 'run', workflowId: 'wf-1' },
};

const questionsPayload = {
	requestId: 'req-2',
	message: '',
	introMessage: 'Two quick questions before I build it',
	inputType: 'questions' as const,
	questions: [
		{ id: 'q-1', question: 'Which channel?', type: 'single' as const, options: ['#ops'] },
	],
};
const questionsCall: SharedCard = {
	toolName: 'ask-user',
	input: {},
	suspendPayload: questionsPayload,
};

interface CardProps {
	input: AssistantConfirmationInput;
	call?: SharedCard;
	disabled?: boolean;
	resolvedValue?: unknown;
	toolCallId?: string;
}

/** Shows the props that the Assistant card receives. */
const ConfirmationCardStub = defineComponent({
	props: {
		input: { type: Object, required: true },
		disabled: Boolean,
		resolvedValue: { type: null, default: undefined },
		toolCallId: { type: String, default: undefined },
	},
	setup(props) {
		return () =>
			h('div', {
				'data-test-id': 'confirmation-card-stub',
				'data-resolved-value': JSON.stringify(props.resolvedValue ?? null),
				'data-tool-call-id': props.toolCallId ?? '',
				'data-disabled': String(props.disabled),
			});
	},
});

/** Mounts the card inside a conversation that provides the sharing state, like the chat does. */
function renderCard(props: CardProps, { stubCard = false } = {}) {
	const onSubmit = vi.fn();
	const Host = defineComponent({
		setup() {
			provideThreadSharing({ id: THREAD_ID, projectId: PROJECT_ID }, () => []);
			return () => h(SharedThreadCard, { ...props, onSubmit });
		},
	});
	const stubs = stubCard ? { InstanceAiConfirmationCard: ConfirmationCardStub } : {};
	return { ...createComponentRenderer(Host)({ global: { stubs } }), onSubmit };
}

const decline = { kind: 'capabilityDecision', approved: false };

describe('SharedThreadCard', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	describe('for the owner', () => {
		it('shows the card as it is, with "Always allow" and no footer', async () => {
			setUpSharing({ shared: true });
			const { getByTestId, queryByTestId, onSubmit } = renderCard({
				input: runInput,
				call: runCall,
			});

			expect(getByTestId('approval-card-always-allow')).toBeEnabled();
			expect(queryByTestId('instance-ai-shared-card-footer')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('approval-card-allow-once'));
			expect(onSubmit).toHaveBeenCalledWith({ kind: 'approval', approved: true });
		});

		it('shows an owner-only card as it is', () => {
			setUpSharing({ shared: true });
			const { queryByTestId, getByText } = renderCard({
				input: questionsPayload,
				call: questionsCall,
			});

			expect(getByText('Which channel?')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-shared-card')).not.toBeInTheDocument();
		});
	});

	describe('for a teammate with the role', () => {
		beforeEach(() => setUpSharing({ shared: true, viewerId: TEAMMATE.id }));

		it('lets the teammate answer, says who the answer runs as and hides "Always allow"', async () => {
			const { getByTestId, queryByTestId, onSubmit } = renderCard({
				input: runInput,
				call: runCall,
			});

			expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent(
				'Runs as Alice Owner',
			);
			expect(queryByTestId('approval-card-always-allow')).not.toBeInTheDocument();
			expect(getByTestId('approval-card-deny')).toBeEnabled();

			await fireEvent.click(getByTestId('approval-card-deny'));
			expect(onSubmit).toHaveBeenCalledWith({ kind: 'approval', approved: false });
		});

		it('keeps an answered or stale card disabled', () => {
			const { getByTestId } = renderCard({ input: runInput, call: runCall, disabled: true });

			expect(getByTestId('approval-card-allow-once')).toBeDisabled();
		});

		it('gives the footer to screen readers with the card', () => {
			const { getByRole, getByTestId } = renderCard({ input: runInput, call: runCall });

			expect(getByRole('group', { description: 'Runs as Alice Owner' })).toBe(
				getByTestId('instance-ai-shared-card'),
			);
		});

		it('hands the answer and the tool call of an answered card to the Assistant card', () => {
			const { getByTestId, queryByTestId } = renderCard(
				{ input: runInput, call: runCall, resolvedValue: decline, toolCallId: 'tc-1' },
				{ stubCard: true },
			);

			const card = getByTestId('confirmation-card-stub');
			expect(card).toHaveAttribute('data-resolved-value', JSON.stringify(decline));
			expect(card).toHaveAttribute('data-tool-call-id', 'tc-1');
			// The wrapper keeps no copy of them as HTML attributes.
			const wrapper = getByTestId('instance-ai-shared-card');
			expect(wrapper).not.toHaveAttribute('resolvedvalue');
			expect(wrapper).not.toHaveAttribute('resolved-value');
			expect(wrapper).not.toHaveAttribute('toolcallid');
			expect(wrapper).not.toHaveAttribute('tool-call-id');
			// The card shows the outcome, so who can answer no longer applies.
			expect(queryByTestId('instance-ai-shared-card-footer')).not.toBeInTheDocument();
			expect(wrapper).not.toHaveAttribute('aria-describedby');
		});
	});

	it('hands the answer and the tool call of an answered card to the owner’s card', () => {
		setUpSharing({ shared: true });
		const { getByTestId } = renderCard(
			{ input: runInput, call: runCall, resolvedValue: decline, toolCallId: 'tc-1' },
			{ stubCard: true },
		);

		const card = getByTestId('confirmation-card-stub');
		expect(card).toHaveAttribute('data-resolved-value', JSON.stringify(decline));
		expect(card).toHaveAttribute('data-tool-call-id', 'tc-1');
		expect(card).toHaveAttribute('data-disabled', 'false');
	});

	it('hands the answer to a card that a teammate without the role sees, still disabled', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId } = renderCard(
			{ input: runInput, call: runCall, resolvedValue: decline, toolCallId: 'tc-1' },
			{ stubCard: true },
		);

		const card = getByTestId('confirmation-card-stub');
		expect(card).toHaveAttribute('data-resolved-value', JSON.stringify(decline));
		expect(card).toHaveAttribute('data-disabled', 'true');
	});

	it('disables the buttons of a teammate without the role and says who can approve', async () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId, onSubmit } = renderCard({ input: runInput, call: runCall });

		expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent(
			'Only editors in Marketing can approve this.',
		);
		expect(getByTestId('instance-ai-shared-card')).toHaveAccessibleDescription(
			'Only editors in Marketing can approve this.',
		);
		expect(getByTestId('approval-card-allow-once')).toBeDisabled();
		expect(getByTestId('approval-card-deny')).toBeDisabled();

		await fireEvent.click(getByTestId('approval-card-allow-once'));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	describe('for a teammate on a card for the owner only', () => {
		it('shows the request and who can answer it, without the controls', () => {
			setUpSharing({ shared: true, viewerId: TEAMMATE.id });
			const { getByTestId, queryByText } = renderCard({
				input: questionsPayload,
				call: questionsCall,
			});

			expect(getByTestId('instance-ai-shared-card-request')).toHaveTextContent(
				'Two quick questions before I build it',
			);
			expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent(
				'Only Alice Owner can answer this.',
			);
			expect(queryByText('Which channel?')).not.toBeInTheDocument();
		});

		it('says that the Assistant waits for the owner when the card has no text', () => {
			setUpSharing({ shared: true, viewerId: TEAMMATE.id });
			const { getByTestId } = renderCard({
				input: { requestId: 'req-3', message: '  ', setupRequests: [] },
				call: { toolName: 'setup-workflow', input: {}, suspendPayload: {} },
			});

			expect(getByTestId('instance-ai-shared-card-request')).toHaveTextContent(
				'The Assistant is waiting for Alice Owner.',
			);
		});

		it('keeps a card without its tool call for the owner', () => {
			setUpSharing({ shared: true, viewerId: TEAMMATE.id });
			const { getByTestId } = renderCard({ input: runInput });

			expect(getByTestId('instance-ai-shared-card-request')).toHaveTextContent('Run "Digest" now?');
		});
	});

	it('falls back to "the owner" when the server sent no owner name', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, ownerName: '' });
		const { getByTestId } = renderCard({ input: runInput, call: runCall });

		expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent('Runs as the owner');
	});

	it('shows the plain card outside a conversation', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const { getByTestId, queryByTestId } = createComponentRenderer(SharedThreadCard)({
			props: { input: runInput, call: runCall },
		});

		expect(getByTestId('approval-card-allow-once')).toBeEnabled();
		expect(queryByTestId('instance-ai-shared-card')).not.toBeInTheDocument();
	});
});
