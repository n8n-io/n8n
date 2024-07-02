import { StateField } from '@codemirror/state';
import { TypeScriptProject } from './typescript-project';
import { INDEX_TS } from './constants';
import { throttle } from 'lodash-es';
import type { EditorView } from '@codemirror/view';

export const tsProjectField = StateField.define<TypeScriptProject>({
	create(state) {
		return new TypeScriptProject(state.sliceDoc());
	},

	update(newTsProject) {
		return newTsProject; // required but unneeded
	},
});

export const updateIndexTs = throttle((view: EditorView) => {
	void view.state
		.field(tsProjectField)
		.getVirtualEnv()
		.then((venv) => venv.updateFile(INDEX_TS, view.state.sliceDoc(0) || ' '));
}, 100);
