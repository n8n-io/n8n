import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import type { Action, HttpRequest } from './define';

/** The context `run()` gets in `n8n:action@1`, see `spec/n8n-action@1.wit`. */
export interface RunContextV1 {
	readonly input: unknown;
	readonly http: { request(request: HttpRequest): Promise<unknown> };
	/** Gives one output item for the current input item. */
	emit(item: unknown): void;
}

/** An `n8n:action@1` action: `run()` emits its items and gives back nothing. @1 has no `request`. */
export type ActionV1 = Omit<Action, 'run' | 'request' | 'list' | 'native'> & {
	run(context: RunContextV1): Promise<void>;
};

// `evaluateBundle` checks the other action fields on the adapted action.
const isActionV1 = (value: unknown): value is ActionV1 =>
	isRecord(value) && typeof value.run === 'function';

/**
 * Yields each item that `start` emits. `idle` waits until the host took every emitted item,
 * and throws when the host stopped reading.
 */
async function* emitted(
	start: (emit: (item: unknown) => void, idle: () => Promise<void>) => Promise<void>,
): AsyncGenerator<unknown, void, undefined> {
	const queue: unknown[] = [];
	const idlers: Array<() => void> = [];
	const state = { wake: (): void => undefined, waiting: false, closed: false };
	const release = () => idlers.splice(0).forEach((resolve) => resolve());
	const stopped = () => new UnexpectedError('The host stopped reading the output items');
	const idle = async () => {
		if (!state.waiting || queue.length > 0) {
			await new Promise<void>((resolve) => idlers.push(resolve));
		}
		if (state.closed) throw stopped();
	};
	const done = start((item) => {
		if (state.closed) throw stopped();
		queue.push(item);
		state.wake();
	}, idle).then(() => true);
	// The race below reads the rejection. This line covers a rejection after the host stopped.
	void done.catch(() => undefined);
	try {
		for (;;) {
			const woken = new Promise<boolean>((resolve) => {
				state.wake = () => resolve(false);
			});
			yield* queue.splice(0);
			state.waiting = true;
			release();
			const finished = await Promise.race([done, woken]);
			state.waiting = false;
			if (finished) break;
		}
		yield* queue.splice(0);
	} finally {
		state.closed = true;
		release();
	}
}

/**
 * Runs an `n8n:action@1` bundle export as an @2 action. An @1 run can emit any number of
 * items for any cardinality, so the adapted action is 1:N. An @1 host validated each item in
 * `emit`, so a request waits until the host took every emitted item: an invalid item stops
 * the run before its next request.
 */
export function fromActionApiV1(exported: unknown): Action | undefined {
	if (!isActionV1(exported)) return undefined;
	return {
		...exported,
		flow: { ...exported.flow, cardinality: '1:N' },
		run: ({ input, http }) =>
			emitted(async (emit, idle) => {
				const request = async (options: HttpRequest) => {
					await idle();
					return await http.request(options);
				};
				await exported.run({ input, http: { request }, emit });
			}),
	};
}
