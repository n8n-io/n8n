import type { WorkerInitOptions } from '../types';
import { worker } from './typescript.worker';
import { type ChangeSet, EditorState } from '@codemirror/state';

async function createWorker({
	doc,
	options,
}: { doc?: string; options?: Partial<WorkerInitOptions> } = {}) {
	const defaultDoc = `
function myFunction(){
  if (true){
    const myObj = {test: "value"}
  }
}

return $input.all();`;
	const state = EditorState.create({ doc: doc ?? defaultDoc });

	const tsWorker = worker.init(
		{
			allNodeNames: [],
			content: state.doc.toJSON(),
			id: 'id',
			inputNodeNames: [],
			mode: 'runOnceForAllItems',
			variables: [],
			...options,
		},
		async () => ({
			json: { path: '', type: 'string', value: '' },
			binary: [],
			params: { path: '', type: 'string', value: '' },
		}),
	);
	return await tsWorker;
}

describe('Typescript Worker', () => {
	it('should return diagnostics', async () => {
		const tsWorker = await createWorker();

		expect(tsWorker.getDiagnostics()).toEqual([
			{
				from: 10,
				markClass: 'cm-faded',
				message: "'myFunction' is declared but its value is never read.",
				severity: 'warning',
				to: 20,
			},
			{
				from: 47,
				markClass: 'cm-faded',
				message: "'myObj' is declared but its value is never read.",
				severity: 'warning',
				to: 52,
			},
		]);
	});

	it('should accept updates from the client and buffer them', async () => {
		const tsWorker = await createWorker();
		// Add if statement and remove indentation
		const changes = [
			[75, [0, '', ''], 22],
			[76, [0, '', ''], 22],
			[77, [0, ' if (true){', '    const myObj = {test: "value"}', '  }'], 22],
			[77, [1], 13, [2], 30, [2], 23],
		];

		vi.useFakeTimers({ toFake: ['setTimeout', 'queueMicrotask', 'nextTick'] });

		for (const change of changes) {
			tsWorker.updateFile(change as unknown as ChangeSet);
		}

		expect(tsWorker.getDiagnostics()).toHaveLength(2);

		vi.advanceTimersByTime(1000);
		vi.runAllTicks();

		expect(tsWorker.getDiagnostics()).toHaveLength(3);
		expect(tsWorker.getDiagnostics()).toEqual([
			{
				from: 10,
				markClass: 'cm-faded',
				message: "'myFunction' is declared but its value is never read.",
				severity: 'warning',
				to: 20,
			},
			{
				from: 47,
				markClass: 'cm-faded',
				message: "'myObj' is declared but its value is never read.",
				severity: 'warning',
				to: 52,
			},
			{
				from: 96,
				markClass: 'cm-faded',
				message: "'myObj' is declared but its value is never read.",
				severity: 'warning',
				to: 101,
			},
		]);
	});

	it('should return completions', async () => {
		const doc = 'return $input.';
		const tsWorker = await createWorker({ doc });

		const completionResult = await tsWorker.getCompletionsAtPos(doc.length);
		assert(completionResult !== null);

		const completionLabels = completionResult.result.options.map((c) => c.label);
		expect(completionLabels).toContain('all()');
		expect(completionLabels).toContain('first()');
	});
});
