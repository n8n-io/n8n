import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { FormBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import FormBlockConfig from './FormBlockConfig.vue';

type FormBlockData = FormBlock['data'];

export class FormBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Form' };
	}

	private data: Partial<FormBlockData>;
	private readonly projectId: string;
	private handle: VueToolHandle | null = null;

	constructor({
		data,
		config,
	}: BlockToolConstructorOptions<Partial<FormBlockData>, { projectId: string }>) {
		this.data = data;
		this.projectId = config?.projectId ?? '';
	}

	render(): HTMLElement {
		this.handle = mountVueTool(FormBlockConfig, {
			modelValue: this.data,
			projectId: this.projectId,
			'onUpdate:modelValue': (next: FormBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<FormBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
