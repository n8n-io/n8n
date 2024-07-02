import { autocompletion } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorView, hoverTooltip } from '@codemirror/view';

import { tsProjectField, updateIndexTs } from './typescript-project-field';
import { tsCompletions } from './typescript-completions';
import { tsDiagnostics } from './typescript-diagnostics';
import { tsQuickInfo } from './typescript-quickinfo';

export function typescript(): Extension {
	return [
		tsProjectField,
		autocompletion(),
		new LanguageSupport(javascriptLanguage, [
			javascriptLanguage.data.of({ autocomplete: tsCompletions }),
		]),
		linter(async ({ state }) => await tsDiagnostics(state)),
		hoverTooltip(async ({ state }, pos) => await tsQuickInfo(state, pos)),
		EditorView.updateListener.of(({ view, docChanged }) => {
			if (docChanged) updateIndexTs(view);
		}),
	];
}
