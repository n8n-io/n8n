import type { EditorView } from '@codemirror/view';
import type { I18nClass } from '@/plugins/i18n';
import type { Workflow, CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import type { Node } from 'estree';

export type CodeNodeEditorMixin = Vue.VueConstructor<
	Vue & {
		$locale: I18nClass;
		editor: EditorView | null;
		mode: CodeExecutionMode;
		language: CodeNodeEditorLanguage;
		getCurrentWorkflow(): Workflow;
	}
>;

export type RangeNode = Node & { range: [number, number] };
