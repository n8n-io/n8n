import type { CodeTaskEvent } from '@n8n/sandbox-client';

import { CodeTaskOutcomeUnknownError, readTaskOutcome } from '../task-outcome';

describe('readTaskOutcome', () => {
	it('skips the progress events and stops reading at the terminal event', async () => {
		const done: CodeTaskEvent = { type: 'done', taskId: 't1', result: [1], outputs: [] };
		let closed = false;
		async function* events(): AsyncGenerator<CodeTaskEvent> {
			try {
				yield { type: 'accepted', taskId: 't1' };
				yield { type: 'heartbeat', taskId: 't1' };
				yield done;
				yield { type: 'heartbeat', taskId: 't1' };
			} finally {
				closed = true;
			}
		}

		await expect(readTaskOutcome(events())).resolves.toBe(done);
		expect(closed).toBe(true);
	});

	it('fails with an unknown outcome when the stream ends or breaks before the terminal event', async () => {
		const lost = new Error('socket hang up');
		async function* ended(): AsyncGenerator<CodeTaskEvent> {
			yield { type: 'accepted', taskId: 't1' };
		}
		async function* broken(): AsyncGenerator<CodeTaskEvent> {
			yield { type: 'accepted', taskId: 't1' };
			throw lost;
		}

		await expect(readTaskOutcome(ended())).rejects.toThrow(CodeTaskOutcomeUnknownError);
		const error: unknown = await readTaskOutcome(broken()).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(CodeTaskOutcomeUnknownError);
		expect(error).toHaveProperty('cause', lost);
	});

	it('passes on the error of a cancelled task', async () => {
		const controller = new AbortController();
		const aborted = new Error('Request aborted');
		async function* events(): AsyncGenerator<CodeTaskEvent> {
			yield { type: 'accepted', taskId: 't1' };
			controller.abort();
			throw aborted;
		}

		await expect(readTaskOutcome(events(), controller.signal)).rejects.toBe(aborted);
	});
});
