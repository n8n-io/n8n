import { code, codeOutput, codeText, mode, returns, runCode } from '../code.node';

export const runPython = code.action('python', {
	action: 'Run Python',
	summary: 'Run Python in a sandbox. allItems returns a list of dicts; eachItem returns one dict.',
	flow: { effect: 'transform', cardinality: 'batch' },
	imports: ['code'],
	input: {
		code: codeText.title('Python').hint('Read items with _items or _item. No imports by default'),
		mode,
		returns,
	},
	output: codeOutput,
	deriveOutput: (input) => input.returns ?? codeOutput.json,
	async *run({ input, items, code: runner }) {
		yield* runCode('python', input, items, runner);
	},
});
