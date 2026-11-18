import { reactive, ref, watch } from 'vue';

/**
 * The prototype's parameters: which app shell is on, which navigation pattern
 * project settings use, and the conditions around them.
 *
 * To add a parameter, add its type to `ProtoParams` and one entry to
 * `paramDefs`. The panel, storage, and the share link pick it up from there.
 */

export type Shell = 'refresh' | 'standard';
export type Variant =
	| 'baseline'
	| 'side-nav'
	| 'menu'
	| 'separate-area'
	| 'in-settings'
	| 'sidebar-expand';
export type MembersPlacement = 'resources' | 'settings';
export type ViewingAs = 'owner' | 'admin' | 'editor';
export type ProjectCount = '4' | '40' | '400';
export type SettingsGrouping = 'grouped' | 'flat';
export type SidebarTreatment = 'swap' | 'beside';

export interface ProtoParams {
	shell: Shell;
	variant: Variant;
	sidebarTreatment: SidebarTreatment;
	membersPlacement: MembersPlacement;
	settingsGrouping: SettingsGrouping;
	viewingAs: ViewingAs;
	projectCount: ProjectCount;
}

export type ParamId = keyof ProtoParams;

/** Copy that reads differently in each shell. */
type ShellText = string | Record<Shell, string>;

export interface ParamOption {
	value: string;
	label: ShellText;
	caption: ShellText;
}

export interface ParamDef {
	id: ParamId;
	label: string;
	hint: string;
	options: ParamOption[];
}

export function shellText(text: ShellText, shell: Shell): string {
	return typeof text === 'string' ? text : text[shell];
}

/** The first option of every parameter is its default. */
export const paramDefs: ParamDef[] = [
	{
		id: 'shell',
		label: 'App shell',
		hint: 'The navigation around every page, and how you reach instance settings.',
		options: [
			{
				value: 'refresh',
				label: 'Visual refresh',
				caption: 'A rail and a navigation panel. Settings open in the panel.',
			},
			{
				value: 'standard',
				label: 'Standard',
				caption: 'The sidebar on master. Settings replace it behind a back row.',
			},
		],
	},
	{
		id: 'variant',
		label: 'Project settings navigation',
		hint: 'Where project settings live and how you reach them.',
		options: [
			{
				value: 'baseline',
				label: 'Baseline',
				caption: {
					standard: 'Today: a "Project settings" tab that opens one long form.',
					refresh: 'The branch as built: "Project settings" in the panel opens one long form.',
				},
			},
			{
				value: 'side-nav',
				label: 'Secondary side navigation',
				caption: {
					standard: 'No tabs. A second column lists every page of the project.',
					refresh: 'The panel lists every page of the project: resources, then settings.',
				},
			},
			{
				value: 'menu',
				label: 'Settings menu',
				caption: 'A Settings button in the project header opens a menu of pages.',
			},
			{
				value: 'separate-area',
				label: 'Separate settings area',
				caption: '"Project settings" opens an area with its own navigation.',
			},
			{
				value: 'in-settings',
				label: 'Inside instance settings',
				caption: 'Project settings move under Settings › Projects.',
			},
			{
				value: 'sidebar-expand',
				label: {
					standard: 'Expanding sidebar',
					refresh: 'Expanding panel',
				},
				caption: {
					standard: 'The project opens in the main sidebar to list its pages.',
					refresh: 'A Settings row in the panel opens in place to list the pages.',
				},
			},
		],
	},
	{
		id: 'sidebarTreatment',
		label: 'Settings area navigation',
		hint: 'How the separate settings area shows its pages.',
		options: [
			{
				value: 'swap',
				label: {
					standard: 'Replace the main sidebar',
					refresh: 'Replace the panel',
				},
				caption: 'Like instance settings: a back row, then the pages.',
			},
			{
				value: 'beside',
				label: {
					standard: 'Beside the main sidebar',
					refresh: 'Beside the panel',
				},
				caption: {
					standard: 'The main sidebar stays. Pages sit in a second column.',
					refresh: 'The panel stays. Pages sit in a second column.',
				},
			},
		],
	},
	{
		id: 'membersPlacement',
		label: 'Members',
		hint: "Whether members are one of the project's resources or one of its settings.",
		options: [
			{
				value: 'resources',
				label: 'With resources',
				caption: 'Next to Workflows and Credentials. Editors can see who is in the project.',
			},
			{
				value: 'settings',
				label: 'In settings',
				caption: 'Under People & access. Only project admins see it, as today.',
			},
		],
	},
	{
		id: 'settingsGrouping',
		label: 'Settings pages',
		hint: 'How the pages are listed in the navigation.',
		options: [
			{
				value: 'grouped',
				label: 'Grouped like instance settings',
				caption: 'People & access, AI, Security, Operations.',
			},
			{
				value: 'flat',
				label: 'One list',
				caption: 'No headings. Fewer rows, less structure.',
			},
		],
	},
	{
		id: 'viewingAs',
		label: 'Viewing as',
		hint: 'What the current user may see and change in project settings.',
		options: [
			{
				value: 'owner',
				label: 'Instance owner',
				caption: 'Changes everything, at both levels.',
			},
			{
				value: 'admin',
				label: 'Project admin',
				caption: "Changes the project. Can't change what the instance sets.",
			},
			{
				value: 'editor',
				label: 'Project editor',
				caption: 'No access to settings.',
			},
		],
	},
	{
		id: 'projectCount',
		label: 'Projects',
		hint: 'How many team projects the navigation shows, at most.',
		options: [
			{ value: '4', label: '4', caption: 'A small team.' },
			{ value: '40', label: '40', caption: 'A department.' },
			{ value: '400', label: '400', caption: 'A large organization.' },
		],
	},
];

export const defaultParams = Object.fromEntries(
	paramDefs.map((def) => [def.id, def.options[0].value]),
) as unknown as ProtoParams;

const isValid = (def: ParamDef, value: unknown): value is string =>
	typeof value === 'string' && def.options.some((option) => option.value === value);

/** In the query string every parameter is `ps.<id>`, so it can't meet one of n8n's own. */
export const QUERY_PREFIX = 'ps.';

/**
 * Query values win over stored ones, and stored ones over defaults. Unknown
 * values are ignored.
 */
export function readParams(search: string, stored: Record<string, unknown> = {}): ProtoParams {
	const query = new URLSearchParams(search);
	const params: Record<string, string> = {};
	for (const def of paramDefs) {
		const fromQuery = query.get(`${QUERY_PREFIX}${def.id}`);
		if (isValid(def, fromQuery)) params[def.id] = fromQuery;
		else if (isValid(def, stored[def.id])) params[def.id] = stored[def.id] as string;
		else params[def.id] = def.options[0].value;
	}
	return params as unknown as ProtoParams;
}

/** Writes only non-default values and keeps keys it doesn't own. */
export function writeParams(params: ProtoParams, search: string): string {
	const query = new URLSearchParams(search);
	for (const def of paramDefs) {
		const key = `${QUERY_PREFIX}${def.id}`;
		const value = params[def.id];
		if (value === def.options[0].value) query.delete(key);
		else query.set(key, value);
	}
	return query.toString();
}

export function paramAvailability(
	id: ParamId,
	params: ProtoParams,
): { enabled: boolean; reason?: string } {
	if (id === 'membersPlacement' && params.variant === 'baseline') {
		return {
			enabled: false,
			reason: 'The baseline keeps members inside the settings form, as on master.',
		};
	}
	if (id === 'settingsGrouping' && params.variant === 'baseline') {
		return {
			enabled: false,
			reason: "The baseline is one form, so there's nothing to group.",
		};
	}
	if (id === 'sidebarTreatment' && params.variant !== 'separate-area') {
		return {
			enabled: false,
			reason: 'Only the separate area has its own settings navigation.',
		};
	}
	return { enabled: true };
}

/* ── Live state ───────────────────────────────────────────────────────── */

const STORAGE_KEY = 'n8n-prototype.project-settings.params';
const CHIP_KEY = 'n8n-prototype.project-settings.chip-hidden';

const hasWindow = typeof window !== 'undefined';

function readStored(): Record<string, unknown> {
	if (!hasWindow) return {};
	try {
		const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function store(params: ProtoParams) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
	} catch {
		// Storage can be full or blocked. The parameters still work for the session.
	}
}

/**
 * The editor's router rewrites the query on every navigation, so the query is
 * read once, at load, and the parameters then live in `localStorage`.
 */
export const protoParams = reactive<ProtoParams>(
	readParams(hasWindow ? window.location.search : '', readStored()),
);

if (hasWindow) {
	store(protoParams);
	watch(protoParams, () => store(protoParams), { flush: 'sync' });
}

/** `?ps.chip=0` hides the chip for the rest of the browser session, for usability tests. */
function readChipHidden(): boolean {
	if (!hasWindow) return false;
	try {
		const fromQuery = new URLSearchParams(window.location.search).get(`${QUERY_PREFIX}chip`);
		if (fromQuery === '0') window.sessionStorage.setItem(CHIP_KEY, '1');
		if (fromQuery === '1') window.sessionStorage.removeItem(CHIP_KEY);
		return window.sessionStorage.getItem(CHIP_KEY) === '1';
	} catch {
		return false;
	}
}

export const chipHidden = readChipHidden();

export function resetProtoParams() {
	Object.assign(protoParams, defaultParams);
}

/** The page on screen, with every non-default parameter, so one link carries the setup. */
export function shareLink(): string {
	const { origin, pathname, search, hash } = window.location;
	const query = writeParams(protoParams, search);
	return `${origin}${pathname}${query ? `?${query}` : ''}${hash}`;
}

/** Whether the parameters panel is open. The chip and Alt+P both toggle it. */
export const panelOpen = ref(false);

function optionLabel(id: ParamId): string {
	const def = paramDefs.find((entry) => entry.id === id);
	const option = def?.options.find((entry) => entry.value === protoParams[id]);
	return option ? shellText(option.label, protoParams.shell) : protoParams[id];
}

export const variantLabel = () => optionLabel('variant');
export const shellLabel = () => optionLabel('shell');

export const isStandardShell = () => protoParams.shell === 'standard';
