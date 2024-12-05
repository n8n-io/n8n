import type { EditorView } from '@codemirror/view';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';

export function formatDocument(view: EditorView) {
	void format(view.state.doc.toString(), {
		parser: 'babel',
		plugins: [jsParser, estree],
	}).then((formatted) => {
		view.dispatch({
			changes: {
				from: 0,
				to: view.state.doc.length,
				insert: formatted,
			},
		});
	});

	return true;
}
