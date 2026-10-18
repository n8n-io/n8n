import { describe, expect, it } from 'vitest';

import type { StreamChunk } from '../../../types';
import { StreamWriterGuard } from '../stream-writer-guard';

describe('StreamWriterGuard', () => {
	it.each(['close', 'abort'] as const)(
		'marks the stream closed after writer.%s()',
		async (action) => {
			const writer = new WritableStream<StreamChunk>().getWriter();
			const guard = new StreamWriterGuard(writer);

			expect(guard.isClosed).toBe(false);
			expect(guard.closedSignal.aborted).toBe(false);

			await Promise.allSettled([writer[action](), writer.closed]);

			expect(guard.isClosed).toBe(true);
			expect(guard.closedSignal.aborted).toBe(true);
		},
	);
});
