import { isRecord } from '@n8n/utils/is-record';
import { isPlaceholderValue } from '@n8n/utils/placeholder';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { safeRegex, type INodeTypes, type INodeProperties } from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';

function idModeRegexes(prop: INodeProperties): string[] {
	const idMode = prop.modes?.find((m) => m.name === 'id');
	if (!idMode?.validation?.length) return [];
	return idMode.validation
		.filter(
			(v): v is { type: 'regex'; properties: { regex: string; errorMessage: string } } =>
				isRecord(v) && v.type === 'regex',
		)
		.map((v) => v.properties.regex);
}

function matchesRegex(regex: string, raw: string): boolean | undefined {
	try {
		return safeRegex.test(`^(?:${regex})$`, raw);
	} catch {
		return undefined;
	}
}

function hasNameMode(prop: INodeProperties): boolean {
	return prop.modes?.some((m) => m.name === 'name') ?? false;
}

function rawLocatorValue(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * True when `raw` in the property's `list` mode can never resolve: it fails
 * every id-mode regex (list values are the same opaque IDs the picker
 * returns) while a `name` mode exists for display names.
 */
export function listModeValueLooksWrongKind(prop: INodeProperties, raw: string): boolean {
	if (!raw || raw.startsWith('=')) return false;
	if (!hasNameMode(prop)) return false;
	const regexes = idModeRegexes(prop);
	if (regexes.length === 0) return false;
	return regexes.every((regex) => matchesRegex(regex, raw) === false);
}

/**
 * True when `raw` in the property's `id` mode fails any id-mode regex — the
 * same check the node runs before execution starts.
 */
function idModeValueFailsValidation(prop: INodeProperties, raw: string): boolean {
	return idModeRegexes(prop).some((regex) => matchesRegex(regex, raw) === false);
}

/** Empty, expression, and placeholder values resolve later, so skip them. */
function isCheckableLocatorValue(raw: string): boolean {
	return raw !== '' && !raw.startsWith('=') && !isPlaceholderValue(raw);
}

function nodeProperties(
	nodeTypes: INodeTypes | undefined,
	node: { type?: string; typeVersion?: number },
): INodeProperties[] {
	if (!nodeTypes || !node.type) return [];
	try {
		const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return nodeType?.description?.properties ?? [];
	} catch {
		return [];
	}
}

/**
 * Setup-applied values come from a user (or user proxy) typing into a picker
 * field — a display name written into a `list`-mode locator can never resolve
 * at runtime. Rewrites such values to the locator's `name` mode in place.
 * Handles both `{ __rl, mode: 'list', value }` objects and bare strings
 * replacing an existing resource-locator parameter.
 */
export function coerceWrongKindListModeParams(
	nodeTypes: INodeTypes | undefined,
	node: { type?: string; typeVersion?: number; parameters?: unknown },
	params: Record<string, unknown>,
): void {
	for (const prop of nodeProperties(nodeTypes, node)) {
		if (prop.type !== 'resourceLocator' || !Array.isArray(prop.modes)) continue;
		const incoming = params[prop.name];

		if (isRecord(incoming) && '__rl' in incoming && incoming.mode === 'list') {
			const raw = rawLocatorValue(incoming.value);
			if (listModeValueLooksWrongKind(prop, raw)) {
				incoming.mode = 'name';
			}
			continue;
		}

		// A bare string replacing an existing resource-locator param: wrap it,
		// picking `name` mode when the value can't be a list/id value.
		const existing = isRecord(node.parameters) ? node.parameters[prop.name] : undefined;
		if (
			typeof incoming === 'string' &&
			incoming.length > 0 &&
			isRecord(existing) &&
			'__rl' in existing
		) {
			const existingMode = typeof existing.mode === 'string' ? existing.mode : 'list';
			const raw = rawLocatorValue(incoming);
			const mode =
				existingMode === 'list' && listModeValueLooksWrongKind(prop, raw) ? 'name' : existingMode;
			params[prop.name] = { __rl: true, mode, value: incoming };
		}
	}
}

function wrongKindListModeWarning(prop: INodeProperties, raw: string): string | undefined {
	if (!listModeValueLooksWrongKind(prop, raw)) return undefined;
	return (
		`Parameter "${prop.name}": "${raw}" is not a valid list-mode value — list mode holds the opaque ID ` +
		`the picker returns. If "${raw}" is the resource's name or title, use mode 'name' with that value; ` +
		"or leave list mode empty (value '') for the user to pick at setup."
	);
}

function invalidIdModeWarning(prop: INodeProperties, raw: string): string | undefined {
	if (!idModeValueFailsValidation(prop, raw)) return undefined;
	return (
		`Parameter "${prop.name}": "${raw}" is not a valid ID for mode 'id' — it does not match the ID ` +
		'format the node requires, so execution will refuse to start. Use the real ID of the resource, ' +
		'or ask the user for it.'
	);
}

const MODE_CHECKS = {
	list: { code: 'WRONG_KIND_LIST_MODE_VALUE', warn: wrongKindListModeWarning },
	id: { code: 'INVALID_ID_MODE_VALUE', warn: invalidIdModeWarning },
} as const satisfies Record<
	string,
	{ code: string; warn: (prop: INodeProperties, raw: string) => string | undefined }
>;

function isCheckedMode(mode: unknown): mode is keyof typeof MODE_CHECKS {
	return typeof mode === 'string' && Object.hasOwn(MODE_CHECKS, mode);
}

function locatorWarning(
	prop: INodeProperties,
	value: unknown,
	nodeName: string | undefined,
): ValidationWarning | undefined {
	if (prop.type !== 'resourceLocator' || !Array.isArray(prop.modes)) return undefined;
	if (!isRecord(value) || !('__rl' in value) || !isCheckedMode(value.mode)) return undefined;

	const raw = rawLocatorValue(value.value);
	if (!isCheckableLocatorValue(raw)) return undefined;

	const check = MODE_CHECKS[value.mode];
	const message = check.warn(prop, raw);
	return message === undefined ? undefined : { code: check.code, nodeName, message };
}

/**
 * Flags resource-locator values that can never resolve at runtime. Builder
 * self-verification pins node outputs, so only a real execution would surface
 * these failures.
 *
 * - `list` mode holds the opaque ID the picker returns — the same shape the
 *   sibling `id` mode validates. Builders writing configs blind sometimes
 *   place a display name there ('Sheet1'). Flags list values that fail every
 *   id-mode regex and steers to the `name` mode, when one exists.
 * - `id` mode values must match every id-mode regex, or the node refuses to
 *   start. Flags values that fail any of them.
 *
 * Empty, expression, and placeholder values are skipped.
 */
export function detectWrongKindLocatorValues(
	json: WorkflowJSON,
	nodeTypes: INodeTypes | undefined,
): ValidationWarning[] {
	if (!nodeTypes) return [];
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (!node.type || node.disabled) continue;
		const nodeName = typeof node.name === 'string' ? node.name : undefined;
		const parameters = isRecord(node.parameters) ? node.parameters : {};

		for (const prop of nodeProperties(nodeTypes, node)) {
			const warning = locatorWarning(prop, parameters[prop.name], nodeName);
			if (warning) warnings.push(warning);
		}
	}

	return warnings;
}
