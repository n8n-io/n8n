// Props are declared as n8n node-property descriptors so the editor's inspector
// can be n8n's own parameter inputs pointed at a component instead of a node.
// `action`, `statePath` and `route` are descriptor types of this package's own:
// the runtime treats them specially, and the inspector gives each its own
// control.
import type { UiComponentDef } from '../core/types';
import { BUTTON_DEF } from './UiButton.descriptor';
import { CARD_DEF } from './UiCard.descriptor';
import { DEBUG_DEF } from './UiDebug.descriptor';
import { FRAME_DEF } from './UiFrame.descriptor';
import { HEADING_DEF } from './UiHeading.descriptor';
import { IF_DEF } from './UiIf.descriptor';
import { INPUT_DEF } from './UiInput.descriptor';
import { PAGE_DEF } from './UiPage.descriptor';
import { REPEAT_DEF } from './UiRepeat.descriptor';
import { SPINNING_CAT_DEF } from './UiSpinningCat.descriptor';
import { STACK_DEF } from './UiStack.descriptor';
import { TABLE_DEF } from './UiTable.descriptor';
import { TEXT_DEF } from './UiText.descriptor';

// The order here is the order the palette shows.
export const KIT: UiComponentDef[] = [
	FRAME_DEF,
	PAGE_DEF,
	STACK_DEF,
	CARD_DEF,
	REPEAT_DEF,
	IF_DEF,
	DEBUG_DEF,
	HEADING_DEF,
	TEXT_DEF,
	TABLE_DEF,
	INPUT_DEF,
	BUTTON_DEF,
	SPINNING_CAT_DEF,
];

const BY_TYPE = new Map(KIT.map((def) => [def.type, def]));

export function getComponentDef(type: string): UiComponentDef | undefined {
	return BY_TYPE.get(type);
}
