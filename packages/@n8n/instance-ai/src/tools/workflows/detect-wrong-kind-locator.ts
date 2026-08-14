import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypes, INodeProperties } from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
	return regexes.every((regex) => {
		try {
			return !new RegExp(`^(?:${regex})$`).test(raw);
		} catch {
			return false;
		}
	});
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

/**
 * A `list`-mode resource-locator value is the opaque ID the picker returns —
 * the same shape the sibling `id` mode validates (e.g. the numeric gid for a
 * Google Sheets sheet). Builders writing configs blind sometimes place a
 * display name there ('Sheet1'), which the node resolves as an ID and can
 * never match; builder self-verification pins node outputs, so only a real
 * execution surfaces the failure. Flag list values that fail every id-mode
 * regex and steer to the `name` mode. General across nodes: fires only when
 * the property declares both an `id` mode with regex validation and a `name`
 * mode.
 */
export function detectWrongKindLocatorValues(
	json: WorkflowJSON,
	nodeTypes: INodeTypes | undefined,
): ValidationWarning[] {
	if (!nodeTypes) return [];
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (!node.type || node.disabled) continue;
		const properties = nodeProperties(nodeTypes, node);

		for (const prop of properties) {
			if (prop.type !== 'resourceLocator' || !Array.isArray(prop.modes)) continue;
			const value = isRecord(node.parameters) ? node.parameters[prop.name] : undefined;
			if (!isRecord(value) || !('__rl' in value) || value.mode !== 'list') continue;

			const raw = rawLocatorValue(value.value);
			if (!raw || raw.startsWith('=')) continue;

			if (!listModeValueLooksWrongKind(prop, raw)) continue;

			warnings.push({
				code: 'WRONG_KIND_LIST_MODE_VALUE',
				nodeName: typeof node.name === 'string' ? node.name : undefined,
				message:
					`Parameter "${prop.name}": "${raw}" is not a valid list-mode value — list mode holds the opaque ID ` +
					`the picker returns. If "${raw}" is the resource's name or title, use mode 'name' with that value; ` +
					"or leave list mode empty (value '') for the user to pick at setup.",
			});
		}
	}

	return warnings;
}
