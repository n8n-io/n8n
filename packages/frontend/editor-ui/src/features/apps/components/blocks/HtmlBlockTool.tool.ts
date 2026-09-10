import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { HtmlBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import HtmlBlockConfig from './HtmlBlockConfig.vue';

type HtmlBlockData = HtmlBlock['data'];

export class HtmlBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'HTML' };
	}

	private data: Partial<HtmlBlockData>;
	private handle: VueToolHandle | null = null;

	constructor({ data }: BlockToolConstructorOptions<Partial<HtmlBlockData>>) {
		this.data = data;
	}

	render(): HTMLElement {
		this.handle = mountVueTool(HtmlBlockConfig, {
			modelValue: this.data,
			'onUpdate:modelValue': (next: HtmlBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<HtmlBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
