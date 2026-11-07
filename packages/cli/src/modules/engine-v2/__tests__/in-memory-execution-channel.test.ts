import { createInMemoryExecutionChannel } from '../response-channel/in-memory-execution-response-channel';

describe('in-memory execution channel', () => {
	it('delivers a frame to every subscriber of its topic and execution', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const first: string[] = [];
		const second: string[] = [];
		await subscriber.subscribe('responses', 'exec-1', (frame) => first.push(frame));
		await subscriber.subscribe('responses', 'exec-1', (frame) => second.push(frame));

		publisher.publish('responses', 'exec-1', 'frame');

		expect(first).toEqual(['frame']);
		expect(second).toEqual(['frame']);
	});

	it('keeps the topics of one execution apart', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const responses: string[] = [];
		const lifecycle: string[] = [];
		await subscriber.subscribe('responses', 'exec-1', (frame) => responses.push(frame));
		await subscriber.subscribe('lifecycle', 'exec-1', (frame) => lifecycle.push(frame));

		publisher.publish('responses', 'exec-1', 'response');
		publisher.publish('lifecycle', 'exec-1', 'event');

		expect(responses).toEqual(['response']);
		expect(lifecycle).toEqual(['event']);
	});

	it('does not deliver a frame to another execution', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const seen: string[] = [];
		await subscriber.subscribe('responses', 'exec-1', (frame) => seen.push(frame));

		publisher.publish('responses', 'exec-2', 'frame');

		expect(seen).toEqual([]);
	});

	it('stops delivery after a subscriber leaves', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const seen: string[] = [];
		const unsubscribe = await subscriber.subscribe('responses', 'exec-1', (frame) =>
			seen.push(frame),
		);

		unsubscribe();
		publisher.publish('responses', 'exec-1', 'frame');

		expect(seen).toEqual([]);
	});

	it('stops publishing after the publisher stops', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const seen: string[] = [];
		await subscriber.subscribe('responses', 'exec-1', (frame) => seen.push(frame));

		await publisher.stop();
		publisher.publish('responses', 'exec-1', 'frame');

		expect(seen).toEqual([]);
	});

	it('removes every subscription when the subscriber stops', async () => {
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const seen: string[] = [];
		await subscriber.subscribe('responses', 'exec-1', (frame) => seen.push(frame));
		await subscriber.subscribe('lifecycle', 'exec-1', (frame) => seen.push(frame));

		await subscriber.stop();
		publisher.publish('responses', 'exec-1', 'frame');
		publisher.publish('lifecycle', 'exec-1', 'frame');
		await subscriber.subscribe('responses', 'exec-1', (frame) => seen.push(frame));
		publisher.publish('responses', 'exec-1', 'frame');

		expect(seen).toEqual([]);
	});
});
