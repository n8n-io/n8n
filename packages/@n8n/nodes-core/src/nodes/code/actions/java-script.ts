import { code, codeOutput, codeText, failure, mode, returns, runCode } from '../code.node';

/** `$input.all()` and its kin read every item, so a run per item cannot use them. */
function checkEachItemCode(text: string) {
	const method = /\$input\.(first|last|all|itemMatching)/.exec(text)?.[1];
	if (method === undefined) return;
	const line =
		text.split('\n').findIndex((row) => {
			const trimmed = row.trimStart();
			return (
				trimmed.includes(method) &&
				!trimmed.startsWith('//') &&
				!trimmed.startsWith('/*') &&
				!trimmed.startsWith('*')
			);
		}) + 1;
	if (line === 0) return;
	throw failure(
		`Can't use .${method}() here [line ${line}, for item 0]`,
		"This is only available in 'Run Once for All Items' mode",
	);
}

export const runJavaScript = code.action('javaScript', {
	action: 'Run JavaScript',
	summary:
		'Run JavaScript in a sandbox. allItems returns an array of objects; eachItem returns one object.',
	flow: { effect: 'transform', cardinality: 'batch' },
	imports: ['code'],
	input: {
		code: codeText.hint('Read items with $input.all() or $json. No network access'),
		mode,
		returns,
	},
	output: codeOutput,
	deriveOutput: (input) => input.returns ?? codeOutput.json,
	async *run({ input, items, code: runner }) {
		if (input.mode === 'eachItem') checkEachItemCode(input.code);
		yield* runCode('javascript', input, items, runner);
	},
});
