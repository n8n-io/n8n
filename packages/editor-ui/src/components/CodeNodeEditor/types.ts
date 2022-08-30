import type { EditorView } from '@codemirror/view';
import type { I18nClass } from '@/plugins/i18n';

export type CodeNodeEditorMixin = Vue.VueConstructor<
	Vue & {
		$locale: I18nClass;
		editor: EditorView | null;
		mode: 'runOnceForAllItems' | 'runOnceForEachItem';
	}
>;
