import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AssistantEventSink } from '../assistant-event-sink';

describe('AssistantEventSink', () => {
	function createSink() {
		const emitHostEvent = vi.fn();
		const logger = mock<Logger>();
		return { sink: new AssistantEventSink(emitHostEvent, logger), emitHostEvent, logger };
	}

	it('sends a setup-items event as a host event keyed by its workflow', () => {
		const { sink, emitHostEvent } = createSink();
		const event = {
			type: 'setup-items',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { workflowId: 'wf-1', items: [] },
		} as unknown as InstanceAiEvent;

		sink.publish('thread-1', event);

		expect(emitHostEvent).toHaveBeenCalledWith(
			'setup-items',
			{ workflowId: 'wf-1', items: [] },
			{ key: 'workflow:wf-1' },
		);
	});

	it('drops an event that has no reader on the Agents runtime', () => {
		const { sink, emitHostEvent } = createSink();

		sink.publish('thread-1', {
			type: 'text-delta',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { text: 'hi' },
		} as unknown as InstanceAiEvent);

		expect(emitHostEvent).not.toHaveBeenCalled();
	});

	it('logs and continues when the chat refuses the event', () => {
		const { sink, emitHostEvent, logger } = createSink();
		emitHostEvent.mockImplementation(() => {
			throw new Error('too large');
		});

		expect(() =>
			sink.publish('thread-1', {
				type: 'tasks-update',
				runId: 'run-1',
				agentId: 'agent-1',
				payload: { tasks: { tasks: [] } },
			} as unknown as InstanceAiEvent),
		).not.toThrow();
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to send an Assistant event to the chat',
			expect.objectContaining({ type: 'tasks-update', error: 'too large' }),
		);
	});
});
