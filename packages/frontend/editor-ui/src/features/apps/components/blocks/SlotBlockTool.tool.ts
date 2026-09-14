import type { BlockTool, ToolboxConfigEntry } from '@editorjs/editorjs';
import type { SlotBlock } from '@n8n/api-types';

import { mountVueTool, type VueToolHandle } from './mountVueTool';
import SlotBlockCard from './SlotBlockCard.vue';

/** Marks where the page content goes in a layout. Carries no data; the card is static. */
export class SlotBlockTool implements BlockTool {
	static get enableLineBreaks(): boolean {
		return true;
	}

	static get toolbox(): ToolboxConfigEntry {
		return { title: 'Page content' };
	}

	private handle: VueToolHandle | null = null;

	render(): HTMLElement {
		this.handle = mountVueTool(SlotBlockCard, {});
		return this.handle.element;
	}

	save(): SlotBlock['data'] {
		return {};
	}

	destroy(): void {
		this.handle?.destroy();
	}
}
