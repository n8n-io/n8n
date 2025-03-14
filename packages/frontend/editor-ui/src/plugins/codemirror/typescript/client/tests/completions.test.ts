import { matchText } from '../completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/plugins/codemirror/n8nLang';

describe('matchText', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it.each([
		{ node: '$(|)', expected: '(' },
		{ node: '$("|', expected: '"' },
		{ node: "$('|", expected: "'" },
		{ node: '$(""|', expected: '"' },
		{ node: "$('|", expected: "'" },
		{ node: '$("|")', expected: '"' },
		{ node: "$('|')", expected: "'" },
		{ node: '$("|)', expected: '"' },
		{ node: '$("No|")', expected: 'No' },
		{ node: "$('No|')", expected: 'No' },
		{ node: '$("N|")', expected: 'N' },
		{ node: "$('N|')", expected: 'N' },
	])('should match on previous node: $node', ({ node, expected }) => {
		const cursorPosition = node.indexOf('|');
		const state = EditorState.create({
			doc: node.replace('|', ''),
			selection: { anchor: cursorPosition },
			extensions: [n8nLang()],
		});
		const context = new CompletionContext(state, cursorPosition, false);

		expect(matchText(context)?.text).toEqual(expected);
	});
});
