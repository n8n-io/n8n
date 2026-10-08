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

/** Mounts the card inside a conversation that provides the sharing state, like the chat does. */
function renderCard(props: {
	input: AssistantConfirmationInput;
	call?: SharedCard;
	disabled?: boolean;
}) {
	const onSubmit = vi.fn();
	const Host = defineComponent({
		setup() {
			provideThreadSharing({ id: THREAD_ID, projectId: PROJECT_ID }, () => []);
			return () => h(SharedThreadCard, { ...props, onSubmit });
		},
	});
	return { ...createComponentRenderer(Host)(), onSubmit };
}

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
	});

	it('disables the buttons of a teammate without the role and says who can approve', async () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId, onSubmit } = renderCard({ input: runInput, call: runCall });

		expect(getByTestId('instance-ai-shared-card-footer')).toHaveTextContent(
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
