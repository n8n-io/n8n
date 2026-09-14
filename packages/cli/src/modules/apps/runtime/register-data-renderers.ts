import { buttonBlockRenderer } from '../rendering/blocks/button.renderer';
import { codeBlockRenderer } from '../rendering/blocks/code.renderer';
import { formBlockRenderer } from '../rendering/blocks/form.renderer';
import { tableBlockRenderer } from '../rendering/blocks/table.renderer';
import { registerBlockRenderer } from '../rendering/renderer-registry';

/** `header`, `paragraph`, `list`, `image`, `divider` and `html` register in `registerStaticRenderers`. */
export function registerDataRenderers() {
	registerBlockRenderer(tableBlockRenderer);
	registerBlockRenderer(formBlockRenderer);
	registerBlockRenderer(buttonBlockRenderer);
	registerBlockRenderer(codeBlockRenderer);
}
