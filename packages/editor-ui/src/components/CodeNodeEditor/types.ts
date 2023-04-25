import type { EditorView } from '@codemirror/view';
import type { I18nClass } from '@/plugins/i18n';
import type { Workflow } from 'n8n-workflow';
import type { Node } from 'estree';
import type { CODE_LANGUAGES, CODE_MODES } from './constants';

export type CodeNodeEditorMixin = Vue.VueConstructor<
	Vue & {
		$locale: I18nClass;
		editor: EditorView | null;
		mode: 'runOnceForAllItems' | 'runOnceForEachItem';
		getCurrentWorkflow(): Workflow;
	}
>;

export type RangeNode = Node & { range: [number, number] };

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
export type CodeMode = (typeof CODE_MODES)[number];
