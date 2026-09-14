import { agentChatBlockRenderer } from './blocks/agent-chat.renderer';
import { dividerBlockRenderer } from './blocks/divider.renderer';
import { headerBlockRenderer } from './blocks/header.renderer';
import { htmlBlockRenderer } from './blocks/html.renderer';
import { imageBlockRenderer } from './blocks/image.renderer';
import { listBlockRenderer } from './blocks/list.renderer';
import { paragraphBlockRenderer } from './blocks/paragraph.renderer';
import { registerBlockRenderer } from './renderer-registry';

/** `table`, `form`, `button` and `code` register themselves elsewhere. */
export function registerStaticRenderers() {
	registerBlockRenderer(headerBlockRenderer);
	registerBlockRenderer(paragraphBlockRenderer);
	registerBlockRenderer(listBlockRenderer);
	registerBlockRenderer(imageBlockRenderer);
	registerBlockRenderer(dividerBlockRenderer);
	registerBlockRenderer(htmlBlockRenderer);
	registerBlockRenderer(agentChatBlockRenderer);
}
