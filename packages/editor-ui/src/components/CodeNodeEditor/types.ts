import type { EditorView } from '@codemirror/view';
import type { I18nClass } from '@/plugins/i18n';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow/Interfaces';
import type { Workflow } from 'n8n-workflow/Workflow';
import type { Node } from 'estree';
import type { DefineComponent } from 'vue';

export type CodeNodeEditorMixin = InstanceType<
	DefineComponent & {
		$locale: I18nClass;
		editor: EditorView | null;
		mode: CodeExecutionMode;
		language: CodeNodeEditorLanguage;
		getCurrentWorkflow(): Workflow;
	}
>;

export type RangeNode = Node & { range: [number, number] };
