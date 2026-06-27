import type { ChannelIntegrationRecorder } from '../recording/channel-integration-recorder';
import { recordAdapterCalls } from '../recording/recording-adapter';

describe('recordAdapterCalls', () => {
	function enabledRecorder(recordApiCall: jest.Mock): ChannelIntegrationRecorder {
		return {
			isEnabled: true,
			recordApiCall,
		} as unknown as ChannelIntegrationRecorder;
	}

	it('does not fail the adapter call when recording fails', async () => {
		const adapter = {
			postMessage: jest.fn(async () => ({ id: 'message-1' })),
		};
		const recorder = enabledRecorder(
			jest.fn(async () => {
				throw new Error('disk full');
			}),
		);
		const wrapped = recordAdapterCalls('slack', adapter, recorder) as typeof adapter;

		await expect(wrapped.postMessage()).resolves.toEqual({ id: 'message-1' });
	});

	it('records only stream chunks consumed by the adapter', async () => {
		let pulledChunks = 0;
		async function* textStream() {
			pulledChunks++;
			yield 'first';
			pulledChunks++;
			yield 'second';
		}

		const adapter = {
			stream: jest.fn(async (_threadId: string, stream: AsyncIterable<string>) => {
				const iterator = stream[Symbol.asyncIterator]();
				return await iterator.next();
			}),
		};
		const recordApiCall = jest.fn(async () => undefined);
		const wrapped = recordAdapterCalls(
			'slack',
			adapter,
			enabledRecorder(recordApiCall),
		) as typeof adapter;

		await expect(wrapped.stream('thread-1', textStream())).resolves.toMatchObject({
			value: 'first',
			done: false,
		});

		expect(pulledChunks).toBe(1);
		expect(recordApiCall).toHaveBeenCalledWith(
			'slack',
			'stream',
			['thread-1', { streamChunks: ['first'] }],
			expect.objectContaining({ value: 'first', done: false }),
			undefined,
		);
	});
});
