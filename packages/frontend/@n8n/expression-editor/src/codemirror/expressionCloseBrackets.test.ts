import { completionStatus } from '@codemirror/autocomplete';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import userEvent from '@testing-library/user-event';

import type { ExpressionCompletionSource } from '../types';
import { expressionCloseBrackets } from './expressionCloseBrackets';
import { n8nAutocompletion, n8nLang } from './n8nLang';

const alwaysCompletes: ExpressionCompletionSource = () => ({
	from: 0,
	options: [{ label: '$json' }],
});

describe('expressionCloseBrackets', () => {
	const editors: EditorView[] = [];
	const createEditor = () => {
		const parent = document.createElement('div');
		document.body.appendChild(parent);
		const editor = new EditorView({
			parent,
			extensions: [expressionCloseBrackets(), n8nLang([alwaysCompletes]), n8nAutocompletion()],
		});
		editors.push(editor);
		return editor;
	};

	afterEach(() => {
		editors.splice(0).forEach((editor) => editor.destroy());
	});

	it('should complete {{| to {{ | }} and open autocomplete', async () => {
		const editor = createEditor();
		// '{' is an escape character: '{{' === '{'
		await userEvent.type(editor.contentDOM, '{{{{');
		expect(editor.state.doc.toString()).toEqual('{{  }}');
		expect(editor.state.selection).toEqual(EditorSelection.single(3));
		expect(completionStatus(editor.state)).not.toBeNull();
	});

	it('should type over auto-closed brackets', async () => {
		const editor = createEditor();
		await userEvent.type(editor.contentDOM, 'foo()');
		// no extra closing bracket foo())
		expect(editor.state.doc.toString()).toEqual('foo()');
	});

	it.each([
		{ char: '"', expected: '""' },
		{ char: "'", expected: "''" },
		{ char: '(', expected: '()' },
		{ char: '{{}', expected: '{}' },
		{ char: '{[}', expected: '[]' },
	])('should auto-close $expected', async ({ expected, char }) => {
		const editor = createEditor();
		await userEvent.type(editor.contentDOM, char);
		expect(editor.state.doc.toString()).toEqual(expected);
	});
});
