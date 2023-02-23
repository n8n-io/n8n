import N8nDropdown from '../index';
import { default as DropdownBasicExample } from './basic.vue';
import { default as DropdownColorVariantsExample } from './color-variants.vue';
import { default as DropdownHeaderFooterExample } from './header-footer.vue';
import { default as DropdownSizeVariantsExample } from './size-variants.vue';
import { default as DropdownFreeformExample } from './freeform.vue';
import { default as DropdownNestedExample } from './nested.vue';
import { default as DropdownPlacementExample } from './placement.vue';
import { default as DropdownStateActiveExample } from './state-active.vue';
import { default as DropdownTriggerExample } from './trigger.vue';

export default {
	component: N8nDropdown,
	title: 'Components/Dropdown',
};

export const Basic = () => DropdownBasicExample;
export const ColorVariants = () => DropdownColorVariantsExample;
export const HeaderFooter = () => DropdownHeaderFooterExample;
export const SizeVariants = () => DropdownSizeVariantsExample;
export const Freeform = () => DropdownFreeformExample;
export const Nested = () => DropdownNestedExample;
export const Placement = () => DropdownPlacementExample;
export const StateActive = () => DropdownStateActiveExample;
export const Trigger = () => DropdownTriggerExample;
