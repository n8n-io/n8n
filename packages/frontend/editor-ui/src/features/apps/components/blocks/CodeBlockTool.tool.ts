import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { CodeBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import CodeBlockConfig from './CodeBlockConfig.vue';

type CodeBlockData = CodeBlock['data'];

export class CodeBlockTool implements BlockTool {
	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Code' };
	}

	private data: Partial<CodeBlockData>;
	private handle: VueToolHandle | null = null;

	constructor({ data }: BlockToolConstructorOptions<Partial<CodeBlockData>>) {
		this.data = data;
	}

	render(): HTMLElement {
		this.handle = mountVueTool(CodeBlockConfig, {
			modelValue: this.data,
			'onUpdate:modelValue': (next: CodeBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<CodeBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
