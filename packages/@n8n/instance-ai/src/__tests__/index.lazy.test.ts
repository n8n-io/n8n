import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { transformWithEsbuild } from 'vite';

import * as instanceContextState from '../runtime/instance-context-state';
import * as instanceContextReach from '../stream/instance-context-reach';
import * as workSummaryAccumulator from '../stream/work-summary-accumulator';

const contextModules = new Map<string, object>([
	['./runtime/instance-context-state', instanceContextState],
	['./stream/instance-context-reach', instanceContextReach],
	['./stream/work-summary-accumulator', workSummaryAccumulator],
]);

let entrypointCode: string;

beforeAll(async () => {
	const filename = path.resolve(__dirname, '../index.ts');
	const source = await readFile(filename, 'utf8');
	// Run the CommonJS entrypoint without the test transform that makes its loaders eager.
	const result = await transformWithEsbuild(source, filename, { format: 'cjs' });
	entrypointCode = result.code;
});

function loadEntrypoint() {
	const runtimeModule = { exports: {} };
	const loadModule = vi.fn((specifier: string) => contextModules.get(specifier) ?? {});
	runInNewContext(entrypointCode, {
		module: runtimeModule,
		exports: runtimeModule.exports,
		require: loadModule,
	});
	return { entrypoint: runtimeModule.exports as typeof import('../index'), loadModule };
}

describe('context exports', () => {
	it('loads the suspension schema once when it is read', () => {
		const { entrypoint, loadModule } = loadEntrypoint();

		expect(loadModule).not.toHaveBeenCalledWith('./runtime/instance-context-state');
		expect(entrypoint.suspendedInstanceContextSchema).toBe(
			instanceContextState.suspendedInstanceContextSchema,
		);
		expect(entrypoint.suspendedInstanceContextSchema.safeParse({}).success).toBe(false);
		expect(
			loadModule.mock.calls.filter(([name]) => name === './runtime/instance-context-state'),
		).toHaveLength(1);
	});

	it('loads reach helpers once and returns their results', () => {
		const { entrypoint, loadModule } = loadEntrypoint();

		expect(entrypoint.deriveInstanceContextReach).toBeTypeOf('function');
		expect(entrypoint.mergeInstanceContextReach).toBeTypeOf('function');
		expect(loadModule).not.toHaveBeenCalledWith('./stream/instance-context-reach');
		const reach = entrypoint.deriveInstanceContextReach([
			{ toolCallId: 'call', toolName: 'activity', action: 'list', succeeded: true },
		]);

		expect(reach).toEqual({ surfaces: ['activity-list'] });
		expect(entrypoint.mergeInstanceContextReach(reach, { surfaces: ['workflow-read'] })).toEqual({
			surfaces: ['activity-list', 'workflow-read'],
		});
		expect(
			loadModule.mock.calls.filter(([name]) => name === './stream/instance-context-reach'),
		).toHaveLength(1);
	});

	it('loads the accumulator once and keeps its class contract', () => {
		const { entrypoint, loadModule } = loadEntrypoint();

		expect(entrypoint.WorkSummaryAccumulator).toBeTypeOf('function');
		expect(loadModule).not.toHaveBeenCalledWith('./stream/work-summary-accumulator');
		const accumulator = new entrypoint.WorkSummaryAccumulator();

		expect(accumulator).toBeInstanceOf(workSummaryAccumulator.WorkSummaryAccumulator);
		expect(accumulator).toBeInstanceOf(entrypoint.WorkSummaryAccumulator);
		expect(accumulator.toSummary().toolCalls).toEqual([]);
		expect(new entrypoint.WorkSummaryAccumulator()).toBeInstanceOf(
			workSummaryAccumulator.WorkSummaryAccumulator,
		);
		expect(
			loadModule.mock.calls.filter(([name]) => name === './stream/work-summary-accumulator'),
		).toHaveLength(1);
	});
});
