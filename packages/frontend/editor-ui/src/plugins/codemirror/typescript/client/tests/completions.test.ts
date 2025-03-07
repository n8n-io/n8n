import { matchText } from '../completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/plugins/codemirror/n8nLang';

describe('matchText', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should match on previous nodes', () => {
		const previousNodes = [
			{ doc: '$(|)', expected: '(' },
			{ doc: '$("|', expected: '"' },
			{ doc: "$('|", expected: "'" },
			{ doc: '$(""|', expected: '"' },
			{ doc: "$('|", expected: "'" },
			{ doc: '$("|")', expected: '"' },
			{ doc: "$('|')", expected: "'" },
			{ doc: '$("|)', expected: '"' },
			{ doc: '$("No|")', expected: 'No' },
			{ doc: "$('No|')", expected: 'No' },
			{ doc: '$("N|")', expected: 'N' },
			{ doc: "$('N|')", expected: 'N' },
		];

		previousNodes.forEach((node) => {
			const cursorPosition = node.doc.indexOf('|');
			const state = EditorState.create({
				doc: node.doc.replace('|', ''),
				selection: { anchor: cursorPosition },
				extensions: [n8nLang()],
			});
			const context = new CompletionContext(state, cursorPosition, false);

			expect(matchText(context)?.text).toEqual(node.expected);
		});
	});
});
