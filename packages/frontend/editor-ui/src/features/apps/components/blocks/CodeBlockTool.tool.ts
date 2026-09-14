import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { CodeBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import CodeBlockConfig from './CodeBlockConfig.vue';

type CodeBlockData = CodeBlock['data'];

export const DEFAULT_CODE_BLOCK_SOURCE = `export function render(ctx: PageContext) {
	return <div>n8n rocks</div>;
}
`;

export class CodeBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Code' };
	}

	private data: Partial<CodeBlockData>;
	private handle: VueToolHandle | null = null;

	constructor({ data }: BlockToolConstructorOptions<Partial<CodeBlockData>>) {
		this.data = data.source ? data : { ...data, source: DEFAULT_CODE_BLOCK_SOURCE };
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
