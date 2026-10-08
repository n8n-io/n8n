import type { AgentSseEvent } from '@n8n/api-types';

import { ExecutionRecorder } from '../../execution-recorder';
import { SystemAgentHostEventChannel } from '../system-agent-host-events';

describe('SystemAgentHostEventChannel', () => {
	it('buffers events until the recorder is attached, then sends and records them in order', () => {
		const send = vi.fn<(event: AgentSseEvent) => void>();
		const channel = new SystemAgentHostEventChannel(send);
		channel.emit('test.first', { n: 1 });
		channel.emit('test.second');
		expect(send).not.toHaveBeenCalled();

		const recorder = new ExecutionRecorder();
		channel.attach(recorder);
		channel.emit('test.third', [3]);

		expect(send.mock.calls.map(([event]) => event)).toEqual([
			{ type: 'host-event', name: 'test.first', payload: { n: 1 } },
			{ type: 'host-event', name: 'test.second', payload: null },
			{ type: 'host-event', name: 'test.third', payload: [3] },
		]);
		expect(
			recorder
				.getMessageRecord()
				.timeline.map((event) => (event.type === 'host-event' ? event.name : event.type)),
		).toEqual(['test.first', 'test.second', 'test.third']);
	});

	it('sends the sanitized payload that it records', () => {
		const send = vi.fn();
		const channel = new SystemAgentHostEventChannel(send);
		channel.attach(new ExecutionRecorder());

		channel.emit('test.notice', { password: 'plain-secret', message: 'ok' });

		expect(send).toHaveBeenCalledWith({
			type: 'host-event',
			name: 'test.notice',
			payload: { password: '[REDACTED]', message: 'ok' },
		});
	});

	it('drops events after close and reports them', () => {
		const send = vi.fn();
		const onDropped = vi.fn();
		const channel = new SystemAgentHostEventChannel(send, onDropped);
		channel.emit('test.buffered');
		channel.close();
		channel.attach(new ExecutionRecorder());
		channel.emit('test.late');

		expect(send).not.toHaveBeenCalled();
		expect(onDropped).toHaveBeenCalledWith('test.late');
	});

	it('refuses an empty or too long name', () => {
		const channel = new SystemAgentHostEventChannel(vi.fn());

		expect(() => channel.emit('')).toThrow('A host event needs a name');
		expect(() => channel.emit('x'.repeat(129))).toThrow('A host event needs a name');
	});
});
