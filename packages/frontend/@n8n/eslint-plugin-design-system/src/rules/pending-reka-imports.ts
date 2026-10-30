/**
 * Reka UI imports that are not migrated yet.
 * A matching name may be imported from any file.
 * Remove a prefix when that family is migrated, and add a row to
 * `wrapped-component-bans.ts` for the wrapper folder.
 *
 * Prefixes match the start of the export name. `Collapsible` matches
 * `CollapsibleRoot` and `CollapsibleContent`.
 */
export const pendingRekaPrefixes = [
	'Accordion',
	'Collapsible',
	'ContextMenu',
	'DropdownMenu',
	'FocusScope',
	'HoverCard',
	'Tabs',
	'VisuallyHidden',
] as const;

/**
 * Reka helpers and types the product still imports directly.
 * These names do not belong to one component family.
 */
export const pendingRekaExactNames = [
	'AcceptableInputValue',
	'AcceptableValue',
	'DateRange',
	'DateValue',
	'FlattenedItem',
	'FocusOutsideEvent',
	'injectRadioGroupRootContext',
	'Label',
	'PointerDownOutsideEvent',
	'Primitive',
	'ReferenceElement',
	'Slot',
	'useForwardProps',
	'useForwardPropsEmits',
] as const;

const exactNames: ReadonlySet<string> = new Set(pendingRekaExactNames);

const prefixesByLength = [...pendingRekaPrefixes].sort((left, right) => right.length - left.length);

export function isPendingRekaImport(name: string): boolean {
	if (exactNames.has(name)) return true;
	return prefixesByLength.some((prefix) => name.startsWith(prefix));
}
