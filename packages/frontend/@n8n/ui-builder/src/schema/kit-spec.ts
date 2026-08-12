import {
	ACTION_PROP_TYPE,
	DEFAULT_REGION,
	ROUTE_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiComponentSpec,
} from './types';

/**
 * Identity, but it keeps `type` as its literal rather than widening to `string`,
 * which is what lets the renderer's component map be checked for completeness at
 * build time instead of coming up blank in the palette.
 */
function spec<T extends string>(
	entry: UiComponentSpec & { type: T },
): UiComponentSpec & {
	type: T;
} {
	return entry;
}

/** The ordinary single drop point, which is also Vue's default slot. */
const CHILDREN = [{ name: DEFAULT_REGION, label: 'Children' }];

const FRAME = spec({
	type: 'frame',
	group: 'Layout',
	label: 'App',
	icon: 'layout-template',
	// The content region holds pages and shows one; the other two stay on
	// screen across every route.
	regions: [
		{ name: 'header', label: 'Header', icon: 'menu' },
		{ name: DEFAULT_REGION, label: 'Pages', icon: 'files' },
		{ name: 'footer', label: 'Footer', icon: 'info' },
	],
	pagedRegion: DEFAULT_REGION,
	props: [
		{
			displayName: 'Default Page',
			name: 'defaultPage',
			type: ROUTE_PROP_TYPE,
			default: '',
			description: 'Where an app opens, and where an unknown route lands',
		},
	],
});

const PAGE = spec({
	type: 'page',
	group: 'Layout',
	label: 'Page',
	regions: CHILDREN,
	props: [
		{
			displayName: 'Path',
			name: 'path',
			type: 'string',
			default: '/',
			description: 'The route this page answers, e.g. /orders or /orders/:id',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Shown in the browser tab, and available to a nav control as $pages',
		},
		{
			displayName: 'On Enter',
			name: 'onEnter',
			type: ACTION_PROP_TYPE,
			default: [],
			description: 'Runs each time this page becomes the current one',
		},
	],
});

const STACK = spec({
	type: 'stack',
	group: 'Layout',
	label: 'Stack',
	regions: CHILDREN,
	props: [
		{
			displayName: 'Direction',
			name: 'direction',
			type: 'options',
			default: 'vertical',
			options: [
				{ name: 'Vertical', value: 'vertical' },
				{ name: 'Horizontal', value: 'horizontal' },
			],
		},
		{ displayName: 'Gap', name: 'gap', type: 'number', default: 12 },
	],
});

const CARD = spec({
	type: 'card',
	label: 'Card',
	group: 'Layout',
	// Three drop points rather than one. The document says which region a
	// child belongs to; the component decides where that region renders.
	regions: [
		{ name: 'header', label: 'Header' },
		{ name: DEFAULT_REGION, label: 'Body' },
		{ name: 'footer', label: 'Footer' },
	],
	props: [{ displayName: 'Padded', name: 'padded', type: 'boolean', default: true }],
});

const REPEAT = spec({
	type: 'repeat',
	label: 'Repeat',
	group: 'Logic',
	regions: CHILDREN,
	// The children render once per element of `items`, with `$item` and
	// `$index` bound for them to read.
	repeatOver: 'items',
	props: [
		{
			displayName: 'Items',
			name: 'items',
			type: 'string',
			default: '={{ $state.orders }}',
		},
		{
			displayName: 'Direction',
			name: 'direction',
			type: 'options',
			default: 'vertical',
			options: [
				{ name: 'Vertical', value: 'vertical' },
				{ name: 'Horizontal', value: 'horizontal' },
			],
		},
		{ displayName: 'Gap', name: 'gap', type: 'number', default: 8 },
	],
});

const IF = spec({
	type: 'if',
	group: 'Logic',
	label: 'If',
	regions: CHILDREN,
	// Renders its subtree only when the condition holds. There are no named
	// branches: an "else" is a second If with a negated condition.
	wantsEditFlag: true,
	props: [
		{
			displayName: 'Condition',
			name: 'condition',
			type: 'string',
			default: '={{ $state.orders.length > 0 }}',
		},
	],
});

const DEBUG = spec({
	type: 'debug',
	group: 'Logic',
	label: 'Debug',
	props: [
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '={{ $state }}',
		},
	],
});

const HEADING = spec({
	type: 'heading',
	group: 'Display',
	label: 'Heading',
	props: [
		{ displayName: 'Text', name: 'text', type: 'string', default: 'Heading' },
		{
			displayName: 'Level',
			name: 'level',
			type: 'options',
			default: 2,
			options: [
				{ name: '1', value: 1 },
				{ name: '2', value: 2 },
				{ name: '3', value: 3 },
			],
		},
	],
});

const TEXT = spec({
	type: 'text',
	group: 'Display',
	label: 'Text',
	props: [{ displayName: 'Text', name: 'text', type: 'string', default: 'Text' }],
});

const TABLE = spec({
	type: 'table',
	group: 'Display',
	label: 'Table',
	props: [
		{ displayName: 'Rows', name: 'rows', type: 'string', default: '={{ $state.rows }}' },
		{ displayName: 'Columns', name: 'columns', type: 'string', default: 'name' },
		{
			displayName: 'On Mount',
			name: 'onMount',
			type: ACTION_PROP_TYPE,
			default: [],
		},
	],
});

const INPUT = spec({
	type: 'input',
	group: 'Input',
	label: 'Input',
	props: [
		{ displayName: 'Value', name: 'value', type: 'string', default: '' },
		{
			displayName: 'Writes To',
			name: 'model',
			type: STATE_PATH_PROP_TYPE,
			default: '',
		},
		{ displayName: 'Placeholder', name: 'placeholder', type: 'string', default: '' },
	],
});

const BUTTON = spec({
	type: 'button',
	group: 'Input',
	label: 'Button',
	// Shows the design system's loading state while its own chain is calling out.
	wantsBusyFlag: true,
	props: [
		{ displayName: 'Label', name: 'label', type: 'string', default: 'Button' },
		{
			displayName: 'Variant',
			name: 'variant',
			type: 'options',
			default: 'primary',
			options: [
				{ name: 'Primary', value: 'primary' },
				{ name: 'Secondary', value: 'secondary' },
				{ name: 'Tertiary', value: 'tertiary' },
			],
		},
		{ displayName: 'Disabled', name: 'disabled', type: 'boolean', default: false },
		// Usually an expression: `={{ $route.path === $item.path }}` inside a nav bar.
		{ displayName: 'Active', name: 'active', type: 'boolean', default: false },
		{
			displayName: 'On Click',
			name: 'onClick',
			type: ACTION_PROP_TYPE,
			default: [],
		},
	],
});

/** The order here is the order the palette shows. */
export const UI_KIT_SPEC = [
	FRAME,
	PAGE,
	STACK,
	CARD,
	REPEAT,
	IF,
	DEBUG,
	HEADING,
	TEXT,
	TABLE,
	INPUT,
	BUTTON,
];

/** Every component type the kit declares. */
export type UiComponentType = (typeof UI_KIT_SPEC)[number]['type'];

const BY_TYPE = new Map<string, UiComponentSpec>(UI_KIT_SPEC.map((entry) => [entry.type, entry]));

export function getComponentSpec(type: string): UiComponentSpec | undefined {
	return BY_TYPE.get(type);
}

/** Throws rather than returning undefined, for callers naming a type literally. */
export function specFor(type: UiComponentType): UiComponentSpec {
	const found = BY_TYPE.get(type);
	if (!found) throw new Error(`No UI Builder component spec for "${type}"`);
	return found;
}

/** The region names a component declares. Empty for a leaf. */
export function regionNamesOf(entry: UiComponentSpec): string[] {
	return (entry.regions ?? []).map((region) => region.name);
}
