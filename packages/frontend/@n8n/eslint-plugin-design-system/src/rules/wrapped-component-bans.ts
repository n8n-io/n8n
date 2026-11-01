/**
 * Primitives a design-system component already wraps.
 * Replace this table with a package boundary when product packages no longer import `reka-ui` or `element-plus`.
 */
export type WrappedComponentBan = RekaUiBan | ElementPlusBan;

type RekaUiBan = {
	library: 'reka-ui';
	/**
	 * Export-name prefixes. `Dialog` does not match `AlertDialog`.
	 * A longer prefix wins, so list both when one name starts with another.
	 */
	prefixes: readonly string[];
	/** Folders under `design-system/src` that may import the primitives. */
	allowedFolders: readonly string[];
	/** Design-system components callers should use instead. */
	replacement: string | readonly string[];
};

type ElementPlusBan = {
	library: 'element-plus';
	/** Named exports. Match is exact. */
	names?: readonly string[];
	/**
	 * Deep-import path segments under `element-plus/.../components/<segment>`.
	 * `menu` matches `element-plus/es/components/menu` and does not match `menu-item`.
	 */
	componentPaths?: readonly string[];
	/** Template tags. Match is exact, so list kebab-case and PascalCase. */
	templateNames?: readonly string[];
	/** Folders under `design-system/src` that may import the primitives. */
	allowedFolders: readonly string[];
	/** Design-system components callers should use instead. */
	replacement: string | readonly string[];
};

export const wrappedComponentBans = [
	{
		library: 'reka-ui',
		prefixes: ['Checkbox'],
		allowedFolders: ['v2/components/Checkbox'],
		replacement: 'N8nCheckbox',
	},
	{
		library: 'reka-ui',
		prefixes: ['Combobox'],
		allowedFolders: ['v2/components/Combobox'],
		replacement: 'N8nCombobox2',
	},
	{
		library: 'reka-ui',
		prefixes: ['DateRangePicker'],
		allowedFolders: ['components/DateRangePicker'],
		replacement: 'N8nDateRangePicker',
	},
	{
		library: 'reka-ui',
		prefixes: ['Dialog', 'AlertDialog'],
		allowedFolders: ['components/N8nDialog', 'components/N8nAlertDialog'],
		replacement: ['N8nDialog', 'N8nAlertDialog'],
	},
	{
		library: 'reka-ui',
		prefixes: ['Editable'],
		allowedFolders: ['components/N8nInlineTextEdit'],
		replacement: 'N8nInlineTextEdit',
	},
	{
		library: 'reka-ui',
		prefixes: ['NumberField'],
		allowedFolders: ['components/N8nInputNumber'],
		replacement: 'N8nInputNumber',
	},
	{
		library: 'reka-ui',
		prefixes: ['Pagination'],
		allowedFolders: ['components/N8nPagination'],
		replacement: 'N8nPagination',
	},
	{
		// DateRangePicker composes Popover, so that folder may import both.
		library: 'reka-ui',
		prefixes: ['Popover'],
		allowedFolders: ['components/N8nPopover', 'components/DateRangePicker'],
		replacement: 'N8nPopover',
	},
	{
		library: 'reka-ui',
		prefixes: ['RadioGroup'],
		allowedFolders: ['components/N8nRadioGroup', 'components/N8nSegmentControl'],
		replacement: ['N8nRadioGroup', 'N8nSegmentControl'],
	},
	{
		library: 'reka-ui',
		prefixes: ['ScrollArea'],
		allowedFolders: ['components/N8nScrollArea'],
		replacement: 'N8nScrollArea',
	},
	{
		library: 'reka-ui',
		prefixes: ['Select'],
		allowedFolders: ['v2/components/Select'],
		replacement: 'N8nSelect2',
	},
	{
		library: 'reka-ui',
		prefixes: ['Switch'],
		allowedFolders: ['components/N8nSwitch'],
		replacement: 'N8nSwitch',
	},
	{
		library: 'reka-ui',
		prefixes: ['TagsInput'],
		allowedFolders: ['v2/components/TagsInput'],
		replacement: 'N8nTagsInput2',
	},
	{
		// The `Toggle` prefix also matches `ToggleGroup`.
		library: 'reka-ui',
		prefixes: ['Toggle'],
		allowedFolders: ['components/N8nToggle', 'components/N8nToggleGroup'],
		replacement: ['N8nToggle', 'N8nToggleGroup'],
	},
	{
		library: 'reka-ui',
		prefixes: ['Tooltip'],
		allowedFolders: ['components/N8nTooltip'],
		replacement: 'N8nTooltip',
	},
	{
		library: 'reka-ui',
		prefixes: ['Tree'],
		allowedFolders: ['v2/components/Tree'],
		replacement: 'N8nTree2',
	},
	{
		library: 'element-plus',
		names: ['ElMenu', 'ElSubMenu', 'ElMenuItem'],
		componentPaths: ['menu', 'menu-item', 'sub-menu'],
		templateNames: ['el-menu', 'ElMenu', 'el-sub-menu', 'ElSubMenu', 'el-menu-item', 'ElMenuItem'],
		allowedFolders: ['components/N8nNavigationDropdown'],
		replacement: 'N8nNavigationDropdown',
	},
] as const satisfies readonly WrappedComponentBan[];

export function formatWrappedComponentReplacement(replacement: string | readonly string[]): string {
	const names = typeof replacement === 'string' ? [replacement] : replacement;
	return names.map((name) => `\`${name}\``).join(' or ');
}
