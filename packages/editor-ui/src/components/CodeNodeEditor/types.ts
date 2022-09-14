import type { EditorView } from '@codemirror/view';
import type { I18nClass } from '@/plugins/i18n';
import type { INodeUi } from '@/Interface';

export type CodeNodeEditorMixin = Vue.VueConstructor<
	Vue & {
		$locale: I18nClass;
		editor: EditorView | null;
		mode: 'runOnceForAllItems' | 'runOnceForEachItem';
		activeNode: INodeUi;
	}
>;
