import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { ImageBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import ImageBlockConfig from './ImageBlockConfig.vue';

type ImageBlockData = ImageBlock['data'];

export class ImageBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Image' };
	}

	private data: Partial<ImageBlockData>;
	private handle: VueToolHandle | null = null;

	constructor({ data }: BlockToolConstructorOptions<Partial<ImageBlockData>>) {
		this.data = data;
	}

	render(): HTMLElement {
		this.handle = mountVueTool(ImageBlockConfig, {
			modelValue: this.data,
			'onUpdate:modelValue': (next: ImageBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<ImageBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
