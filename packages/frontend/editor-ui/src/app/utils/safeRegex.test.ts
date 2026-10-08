import { WorkerRegexEngine } from './safeRegex';

type RegexRequest = {
	id: number;
	operation: 'exec' | 'test' | 'replace' | 'matchAll' | 'split';
	pattern: string;
	input: string;
	flags?: string;
	replacement?: string;
};

type RegexResponse = {
	id: number;
	result?: unknown;
	error?: string;
};

class RespondingWorker {
	onmessage?: (event: MessageEvent<RegexResponse>) => void;
	onerror?: () => void;
	terminate = vi.fn();

	constructor() {
		createdWorkers.push(this);
	}

	postMessage(request: RegexRequest) {
		const regex = new RegExp(request.pattern, request.flags);
		const result =
			request.operation === 'test'
				? regex.test(request.input)
				: request.operation === 'exec'
					? regex.exec(request.input)
					: request.operation === 'replace'
						? request.input.replace(regex, request.replacement ?? '')
						: request.operation === 'matchAll'
							? Array.from(
									request.input.matchAll(
										new RegExp(
											request.pattern,
											request.flags?.includes('g') ? request.flags : `${request.flags ?? ''}g`,
										),
									),
								)
							: request.input.split(regex);

		this.onmessage?.({ data: { id: request.id, result } } as MessageEvent<RegexResponse>);
	}
}

class HangingWorker {
	onmessage?: (event: MessageEvent<RegexResponse>) => void;
	onerror?: () => void;
	terminate = vi.fn();

	constructor() {
		createdWorkers.push(this);
	}

	postMessage() {}
}

let createdWorkers: Array<{ terminate: ReturnType<typeof vi.fn> }> = [];
const originalWorker = globalThis.Worker;

describe('WorkerRegexEngine', () => {
	beforeEach(() => {
		createdWorkers = [];
	});

	afterEach(() => {
		vi.useRealTimers();
		globalThis.Worker = originalWorker;
	});

	it('executes regex operations in a worker and terminates it', async () => {
		globalThis.Worker = RespondingWorker as unknown as typeof Worker;
		const engine = new WorkerRegexEngine();

		await expect(engine.test('foo', 'foobar')).resolves.toBe(true);
		await expect(engine.exec('(foo)', 'foobar')).resolves.toHaveProperty('0', 'foo');
		await expect(engine.replace('foo', 'foobar', undefined, 'bar')).resolves.toBe('barbar');
		await expect(engine.matchAll('o', 'foo')).resolves.toHaveLength(2);
		await expect(engine.split(',', 'a,b')).resolves.toEqual(['a', 'b']);

		expect(createdWorkers.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
	});

	it('rejects when a worker times out', async () => {
		vi.useFakeTimers();
		globalThis.Worker = HangingWorker as unknown as typeof Worker;
		const engine = new WorkerRegexEngine();

		const result = engine.test('(a+)+$', `${'a'.repeat(30)}b`);
		const assertion = expect(result).rejects.toThrow('Regular expression execution timed out');
		await vi.advanceTimersByTimeAsync(505);

		await assertion;
		expect(createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
	});
});
