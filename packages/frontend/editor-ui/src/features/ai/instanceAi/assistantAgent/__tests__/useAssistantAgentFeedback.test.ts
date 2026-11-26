import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';

import { createStoppedMessage } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import { postAssistantAgentFeedback } from '../assistantAgentFeedback.api';
import { useAssistantAgentFeedback } from '../useAssistantAgentFeedback';

const { telemetryTrack } = vi.hoisted(() => ({ telemetryTrack: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('../assistantAgentFeedback.api', () => ({
	postAssistantAgentFeedback: vi.fn(async () => ({ ok: true })),
}));

const user = (id: string): ChatMessage => ({ id, role: 'user', content: 'Hi' });
const answer = (id: string, executionId?: string): ChatMessage => ({
	id,
	role: 'assistant',
	content: 'Done',
	...(executionId ? { executionId } : {}),
});

describe('useAssistantAgentFeedback', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
	});

	function setup(initial: ChatMessage[]) {
		const messages = ref(initial);
		const feedback = useAssistantAgentFeedback({
			threadId: 'thread-1',
			messages: () => messages.value,
		});
		return { messages, feedback };
	}

	it('lets the user rate only the latest answer', () => {
		const { feedback } = setup([
			user('u1'),
			answer('a1', 'exec-1'),
			user('u2'),
			answer('a2', 'exec-2'),
		]);

		expect(feedback.isRateable('exec-2')).toBe(true);
		expect(feedback.isRateable('exec-1')).toBe(false);
		expect(feedback.isRateable(undefined)).toBe(false);
	});

	it('hides the rating when the user sends a new message', () => {
		const { messages, feedback } = setup([user('u1'), answer('a1', 'exec-1')]);

		messages.value = [...messages.value, user('u2')];

		expect(feedback.isRateable('exec-1')).toBe(false);
	});

	it('does not let the user rate a turn that the user stopped', () => {
		const { feedback } = setup([
			user('u1'),
			answer('a1', 'exec-1'),
			createStoppedMessage('exec-1'),
		]);

		expect(feedback.isRateable('exec-1')).toBe(false);
		feedback.rate('exec-1', 'up');
		expect(postAssistantAgentFeedback).not.toHaveBeenCalled();
	});

	it('sends the rating of the turn and tracks it', () => {
		const { feedback } = setup([user('u1'), answer('a1', 'exec-1')]);

		feedback.rate('exec-1', 'down');

		expect(feedback.ratingOf('exec-1')).toBe('down');
		expect(postAssistantAgentFeedback).toHaveBeenCalledWith(expect.anything(), 'thread-1', {
			executionId: 'exec-1',
			rating: 'down',
		});
		expect(telemetryTrack).toHaveBeenCalledWith('User rated workflow generation', {
			thread_id: 'thread-1',
			response_id: 'exec-1',
			helpful: false,
			runtime: 'agents',
		});
	});

	it('sends one rating for each answer', () => {
		const { feedback } = setup([user('u1'), answer('a1', 'exec-1')]);

		feedback.rate('exec-1', 'up');
		feedback.rate('exec-1', 'down');

		expect(feedback.ratingOf('exec-1')).toBe('up');
		expect(postAssistantAgentFeedback).toHaveBeenCalledTimes(1);
	});

	it('does not send a rating for an answer that is not the latest', () => {
		const { feedback } = setup([
			user('u1'),
			answer('a1', 'exec-1'),
			user('u2'),
			answer('a2', 'exec-2'),
		]);

		feedback.rate('exec-1', 'up');

		expect(feedback.ratingOf('exec-1')).toBeUndefined();
		expect(postAssistantAgentFeedback).not.toHaveBeenCalled();
	});

	it('keeps the rating when the request fails', async () => {
		vi.mocked(postAssistantAgentFeedback).mockRejectedValueOnce(new Error('Network error'));
		const { feedback } = setup([user('u1'), answer('a1', 'exec-1')]);

		feedback.rate('exec-1', 'up');
		await Promise.resolve();

		expect(feedback.ratingOf('exec-1')).toBe('up');
	});
});
