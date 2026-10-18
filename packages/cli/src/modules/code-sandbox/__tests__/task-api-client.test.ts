import { Readable } from 'node:stream';

import { readNdjson } from '../task-api-client';

async function collect(chunks: string[], max?: number) {
	const out: unknown[] = [];
	for await (const ev of readNdjson(Readable.from(chunks), max)) out.push(ev);
	return out;
}

describe('readNdjson', () => {
	it('parses lines split over chunks', async () => {
		expect(await collect(['{"a":', '1}\n{"b"', ':2}'])).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it('parses a long line split over many chunks', async () => {
		const big = 'x'.repeat(200_000);
		const text = JSON.stringify({ a: big }) + '\n' + JSON.stringify({ b: 1 }) + '\n';
		const chunks: string[] = [];
		for (let i = 0; i < text.length; i += 1000) chunks.push(text.slice(i, i + 1000));
		expect(await collect(chunks)).toEqual([{ a: big }, { b: 1 }]);
	});

	it('refuses a line that is too long', async () => {
		await expect(collect(['0123456789', '0123456789\n'], 15)).rejects.toThrow(
			'NDJSON line too long',
		);
	});
});
