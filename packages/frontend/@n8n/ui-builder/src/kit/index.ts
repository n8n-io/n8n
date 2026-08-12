// What each component in the spec is drawn with. The spec itself — types,
// props, regions — lives in `../schema/kit-spec`, where the node and the
// workflow SDK can read it without loading Vue.
import UiButton from './UiButton.vue';
import UiCard from './UiCard.vue';
import UiDebug from './UiDebug.vue';
import UiFrame from './UiFrame.vue';
import UiHeading from './UiHeading.vue';
import UiIf from './UiIf.vue';
import UiInput from './UiInput.vue';
import UiPage from './UiPage.vue';
import UiRepeat from './UiRepeat.vue';
import UiStack from './UiStack.vue';
import UiTable from './UiTable.vue';
import UiText from './UiText.vue';
import type { UiComponentDef } from '../core/types';
import { UI_KIT_SPEC, type UiComponentType } from '../schema/kit-spec';

/**
 * Keyed by every type the spec declares, so adding a component to the spec
 * without drawing it is a build error rather than a blank in the palette.
 */
const COMPONENTS: Record<UiComponentType, UiComponentDef['component']> = {
	frame: UiFrame,
	page: UiPage,
	stack: UiStack,
	card: UiCard,
	repeat: UiRepeat,
	if: UiIf,
	debug: UiDebug,
	heading: UiHeading,
	text: UiText,
	table: UiTable,
	input: UiInput,
	button: UiButton,
};

/** In spec order, which is the order the palette shows. */
export const KIT: UiComponentDef[] = UI_KIT_SPEC.map((spec) => ({
	...spec,
	component: COMPONENTS[spec.type],
}));

const BY_TYPE = new Map(KIT.map((def) => [def.type, def]));

export function getComponentDef(type: string): UiComponentDef | undefined {
	return BY_TYPE.get(type);
}
