import { type ChangeSet, EditorState } from '@codemirror/state';
import * as tsvfs from '@typescript/vfs';
import ts from 'typescript';
import { mock } from 'vitest-mock-extended';
import type { WorkerInitOptions } from '../types';
import { worker } from './typescript.worker';

vi.mock('@typescript/vfs');
vi.mock('typescript');

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

	const mockEnv = mock<tsvfs.VirtualTypeScriptEnvironment>({
		getSourceFile: vi.fn(() => mock<ts.SourceFile>({ getText: () => state.doc.toString() })),
		languageService: mock<ts.LanguageService>(),
	});

	vi.spyOn(tsvfs, 'createDefaultMapFromCDN').mockResolvedValue(new Map());
	vi.spyOn(tsvfs, 'createVirtualTypeScriptEnvironment').mockResolvedValue(mockEnv);

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
	return { tsWorker: await tsWorker, mockEnv };
}

describe('Typescript Worker', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should return diagnostics', async () => {
		const { tsWorker, mockEnv } = await createWorker();

		vi.mocked(mockEnv.languageService.getSemanticDiagnostics).mockReturnValue([
			mock<ts.Diagnostic>({
				start: 56,
				length: 10,
				code: 6133,
				messageText: "'myFunction' is declared but its value is never read.",
			}),
			mock<ts.Diagnostic>({
				start: 93,
				length: 5,
				code: 6133,
				messageText: "'myObj' is declared but its value is never read.",
			}),
		]);
		vi.mocked(mockEnv.languageService.getSyntacticDiagnostics).mockReturnValue([]);

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

		expect(mockEnv.languageService.getSemanticDiagnostics).toHaveBeenCalledWith('id.js');
		expect(mockEnv.languageService.getSyntacticDiagnostics).toHaveBeenCalledWith('id.js');
	});

	it('should accept updates from the client and buffer them', async () => {
		const { tsWorker, mockEnv } = await createWorker();
		// Add if statement and remove indentation
		const changes = [
			[75, [0, '', ''], 22],
			[76, [0, '', ''], 22],
			[77, [0, ' if (true){', '    const myObj = {test: "value"}', '  }'], 22],
			[77, [1], 13, [2], 30, [2], 23],
		];

		vi.useFakeTimers({ toFake: ['setTimeout', 'queueMicrotask', 'nextTick'] });
		vi.mocked(mockEnv.updateFile).mockReset();
		for (const change of changes) {
			tsWorker.updateFile(change as unknown as ChangeSet);
		}

		expect(mockEnv.updateFile).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1000);
		vi.runAllTicks();

		expect(mockEnv.updateFile).toHaveBeenCalledTimes(1);
		expect(mockEnv.updateFile).toHaveBeenCalledWith(
			'id.js',
			'\n\nif (true){\n  const myObj = {test: "value"}\n}',
			{
				length: 0,
				start: 121,
			},
		);
	});

	it('should return completions', async () => {
		const doc = 'return $input.';
		const { tsWorker, mockEnv } = await createWorker({ doc });

		vi.mocked(mockEnv.languageService.getCompletionsAtPosition).mockReturnValue(
			mock<ts.CompletionInfo>({
				isGlobalCompletion: false,
				optionalReplacementSpan: '',
				entries: [
					mock<ts.CompletionEntry>({
						name: 'all',
						kind: ts.ScriptElementKind.functionElement,
						sortText: '10',
					}),
					mock<ts.CompletionEntry>({
						name: 'first',
						kind: ts.ScriptElementKind.functionElement,
						sortText: '10',
					}),
				],
			}),
		);

		const completionResult = await tsWorker.getCompletionsAtPos(doc.length);
		assert(completionResult !== null);

		expect(completionResult).toEqual({
			isGlobal: false,
			result: expect.objectContaining({
				from: 60,
			}),
		});

		const completionLabels = completionResult.result.options.map((c) => c.label);
		expect(completionLabels).toContain('all()');
		expect(completionLabels).toContain('first()');
	});
});
