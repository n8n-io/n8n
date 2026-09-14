import type {
	API,
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { ButtonBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import ButtonBlockConfig from './ButtonBlockConfig.vue';

type ButtonBlockData = ButtonBlock['data'];

export class ButtonBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Button' };
	}

	private data: Partial<ButtonBlockData>;
	private readonly api: API;
	private readonly projectId: string;
	private handle: VueToolHandle | null = null;

	constructor({
		data,
		api,
		config,
	}: BlockToolConstructorOptions<Partial<ButtonBlockData>, { projectId: string }>) {
		this.data = data;
		this.api = api;
		this.projectId = config?.projectId ?? '';
	}

	private codeBlockIds(): string[] {
		const ids: string[] = [];
		for (let i = 0; i < this.api.blocks.getBlocksCount(); i++) {
			const block = this.api.blocks.getBlockByIndex(i);
			if (block?.name === 'code') ids.push(block.id);
		}
		return ids;
	}

	render(): HTMLElement {
		this.handle = mountVueTool(ButtonBlockConfig, {
			modelValue: this.data,
			projectId: this.projectId,
			codeBlockIds: this.codeBlockIds(),
			'onUpdate:modelValue': (next: ButtonBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<ButtonBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
