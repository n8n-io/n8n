import { createChunkChannel } from '../chunk-channel';

async function collect<T>(stream: AsyncGenerator<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const chunk of stream) out.push(chunk);
	return out;
}

describe('createChunkChannel', () => {
	it('yields the chunks in the order they were pushed', async () => {
		const channel = createChunkChannel<number>();
		const reading = collect(channel.stream);

		channel.push(1);
		channel.push(2);
		channel.push(3);
		channel.close();

		await expect(reading).resolves.toEqual([1, 2, 3]);
	});

	it('yields chunks that were pushed before the reader started', async () => {
		const channel = createChunkChannel<string>();
		channel.push('a');
		channel.push('b');
		channel.close();

		await expect(collect(channel.stream)).resolves.toEqual(['a', 'b']);
	});

	it('waits for a later chunk, and ends when the channel closes', async () => {
		const channel = createChunkChannel<string>();
		const reading = collect(channel.stream);

		await new Promise((resolve) => setTimeout(resolve, 5));
		channel.push('late');
		await new Promise((resolve) => setTimeout(resolve, 5));
		channel.close();

		await expect(reading).resolves.toEqual(['late']);
	});

	it('ends an empty channel', async () => {
		const channel = createChunkChannel<string>();
		channel.close();

		await expect(collect(channel.stream)).resolves.toEqual([]);
	});

	it('ignores a chunk that arrives after the close', async () => {
		const channel = createChunkChannel<string>();
		channel.push('a');
		channel.close();
		channel.push('b');

		await expect(collect(channel.stream)).resolves.toEqual(['a']);
	});
});
