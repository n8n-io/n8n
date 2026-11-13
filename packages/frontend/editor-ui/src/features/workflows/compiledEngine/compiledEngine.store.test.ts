import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { fetchCompileResult } from './compiledEngine.api';
import { summarizeCompileResult, useCompiledEngineStore } from './compiledEngine.store';
import type { CompileResult } from './compiledEngine.types';

vi.mock('./compiledEngine.api', () => ({
	fetchCompileResult: vi.fn(),
}));

const fetchMock = vi.mocked(fetchCompileResult);

const compileResult = (overrides: Partial<CompileResult> = {}): CompileResult => ({
	ok: true,
	diagnostics: [],
	nodes: { Trigger: 'native', 'Set fields': 'code', Slack: 'host' },
	...overrides,
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe('compiledEngine.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('summarizeCompileResult', () => {
		it('reports ok with the number of warnings', () => {
			expect(
				summarizeCompileResult(
					compileResult({
						diagnostics: [{ severity: 'warning', code: 'W1', message: 'careful' }],
					}),
				),
			).toEqual({ state: 'ok', warnings: 1 });
		});

		it('counts the errors of a failed compile', () => {
			expect(
				summarizeCompileResult(
					compileResult({
						ok: false,
						diagnostics: [
							{ node: 'A', severity: 'error', code: 'E1', message: 'bad' },
							{ node: 'B', severity: 'error', code: 'E2', message: 'bad' },
							{ severity: 'warning', code: 'W1', message: 'careful' },
						],
					}),
				),
			).toEqual({ state: 'problems', errors: 2, warnings: 1 });
		});

		it('counts a failed compile without error diagnostics as one problem', () => {
			expect(summarizeCompileResult(compileResult({ ok: false }))).toEqual({
				state: 'problems',
				errors: 1,
				warnings: 0,
			});
		});
	});

	it.each([
		[['compiled-engine'], true],
		[['engine-v2'], false],
	])('with active modules %j, reports the module as active: %s', (modules, expected) => {
		vi.spyOn(useSettingsStore(), 'isModuleActive').mockImplementation((name) =>
			modules.includes(name),
		);

		expect(useCompiledEngineStore().isModuleActive).toBe(expected);
	});

	it('is idle before a fetch', () => {
		const store = useCompiledEngineStore();

		expect(store.getStatus('wf-1')).toEqual({ state: 'idle' });
		expect(store.getResult('wf-1')).toBeUndefined();
	});

	it('shows loading during a fetch and the result after it', async () => {
		const store = useCompiledEngineStore();
		const pending = deferred<CompileResult>();
		fetchMock.mockReturnValue(pending.promise);

		const fetching = store.fetchResult('wf-1');
		expect(store.getStatus('wf-1')).toEqual({ state: 'loading' });

		pending.resolve(compileResult());
		await fetching;

		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), 'wf-1');
		expect(store.getStatus('wf-1')).toEqual({ state: 'ok', warnings: 0 });
	});

	it('gives the run mode and the diagnostics of each node', async () => {
		const store = useCompiledEngineStore();
		fetchMock.mockResolvedValue(
			compileResult({
				ok: false,
				diagnostics: [
					{ node: 'Slack', severity: 'error', code: 'E1', message: 'not supported' },
					{ node: 'Set fields', severity: 'warning', code: 'W1', message: 'careful' },
				],
			}),
		);

		await store.fetchResult('wf-1');

		expect(store.getNodeRunMode('wf-1', 'Trigger')).toBe('native');
		expect(store.getNodeRunMode('wf-1', 'Set fields')).toBe('code');
		expect(store.getNodeRunMode('wf-1', 'Unknown')).toBeUndefined();
		expect(store.getNodeDiagnostics('wf-1', 'Slack')).toHaveLength(1);
		expect(store.hasNodeError('wf-1', 'Slack')).toBe(true);
		expect(store.hasNodeError('wf-1', 'Set fields')).toBe(false);
		expect(store.hasNodeError('wf-2', 'Slack')).toBe(false);
	});

	it('shows a failed status when the request fails', async () => {
		const store = useCompiledEngineStore();
		fetchMock.mockRejectedValue(new Error('Network down'));

		await store.fetchResult('wf-1');

		expect(store.getStatus('wf-1')).toEqual({ state: 'failed', message: 'Network down' });
		expect(store.getResult('wf-1')).toBeUndefined();
	});

	it('keeps only the result of the fetch that started last', async () => {
		const store = useCompiledEngineStore();
		const first = deferred<CompileResult>();
		const second = deferred<CompileResult>();
		fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

		const firstFetch = store.fetchResult('wf-1');
		const secondFetch = store.fetchResult('wf-1');
		second.resolve(compileResult({ nodes: { A: 'host' } }));
		await secondFetch;
		first.resolve(compileResult({ nodes: { A: 'native' } }));
		await firstFetch;

		expect(store.getNodeRunMode('wf-1', 'A')).toBe('host');
		expect(store.getStatus('wf-1').state).toBe('ok');
	});

	it('drops the result and a fetch in flight on clear', async () => {
		const store = useCompiledEngineStore();
		const pending = deferred<CompileResult>();
		fetchMock.mockReturnValue(pending.promise);

		const fetching = store.fetchResult('wf-1');
		store.clear('wf-1');
		pending.resolve(compileResult());
		await fetching;

		expect(store.getStatus('wf-1')).toEqual({ state: 'idle' });
		expect(store.getResult('wf-1')).toBeUndefined();
	});
});
