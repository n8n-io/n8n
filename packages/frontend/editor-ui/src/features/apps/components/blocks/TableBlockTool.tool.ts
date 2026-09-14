import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { TableBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import TableBlockConfig from './TableBlockConfig.vue';

type TableBlockData = TableBlock['data'];

export class TableBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Data table' };
	}

	private data: Partial<TableBlockData>;
	private readonly projectId: string;
	private handle: VueToolHandle | null = null;

	constructor({
		data,
		config,
	}: BlockToolConstructorOptions<Partial<TableBlockData>, { projectId: string }>) {
		this.data = data;
		this.projectId = config?.projectId ?? '';
	}

	render(): HTMLElement {
		this.handle = mountVueTool(TableBlockConfig, {
			modelValue: this.data,
			projectId: this.projectId,
			'onUpdate:modelValue': (next: TableBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<TableBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
