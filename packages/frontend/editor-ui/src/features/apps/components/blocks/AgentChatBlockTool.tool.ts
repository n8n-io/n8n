import type {
	BlockTool,
	BlockToolConstructorOptions,
	ToolboxConfigEntry,
} from '@editorjs/editorjs';
import type { AgentChatBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import AgentChatBlockConfig from './AgentChatBlockConfig.vue';

type AgentChatBlockData = AgentChatBlock['data'];

export class AgentChatBlockTool implements BlockTool {
	/** The config card holds inputs; Editor.js must not turn Enter into a new block. */
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Agent chat' };
	}

	private data: Partial<AgentChatBlockData>;
	private readonly projectId: string;
	private handle: VueToolHandle | null = null;

	constructor({
		data,
		config,
	}: BlockToolConstructorOptions<Partial<AgentChatBlockData>, { projectId: string }>) {
		this.data = data;
		this.projectId = config?.projectId ?? '';
	}

	render(): HTMLElement {
		this.handle = mountVueTool(AgentChatBlockConfig, {
			modelValue: this.data,
			projectId: this.projectId,
			'onUpdate:modelValue': (next: AgentChatBlockData) => {
				this.data = next;
			},
		});
		return this.handle.element;
	}

	save(): Partial<AgentChatBlockData> {
		return this.data;
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
