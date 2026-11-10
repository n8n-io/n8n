// Prototype: the node diff as the fields of the node settings, read only. This is direction B
// of the skill review, applied to the workflow diff. Each parameter shows as the parameter input
// of the node. A change shows as the old input and the new input. Long text and code show as a
// line diff instead: two text areas would hide what changed.
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';

import { createCommonNodeSettings } from '@/features/ndv/shared/ndv.utils';

/**
 * `input` shows the parameter input of the node. `text` is long plain text, such as a prompt:
 * a node has no rendered markdown. `code` is code or JSON.
 */
export type NodeFieldKind = 'input' | 'text' | 'code';

export type NodeField = {
	/** The parameter path, such as `options.timeout`, or `settings:<key>`. */
	key: string;
	label: string;
	kind: NodeFieldKind;
	/** The highlight language of a code field. */
	language?: string;
	/** The value is an expression. The field shows it in monospace, as the expression input. */
	expression?: boolean;
	/** The property that the parameter input renders. */
	property: INodeProperties;
	/** The path of the parameter input, such as `parameters.options.timeout`. */
	path: string;
	/** The values as text, to compare them and to diff text and code. Empty for no value. */
	before: string;
	after: string;
	/** The stored values, for the parameter inputs. */
	beforeValue: NodeParameterValueType;
	afterValue: NodeParameterValueType;
	changed: boolean;
};

export type NodeFieldSectionId = 'parameters' | 'credentials' | 'settings';

export type NodeFieldSection = {
	id: NodeFieldSectionId;
	fields: NodeField[];
};

type FieldValue = Omit<NodeField, 'before' | 'after' | 'beforeValue' | 'afterValue' | 'changed'> & {
	value: string;
	raw: NodeParameterValueType;
	/** The value that n8n uses when the parameter is not set. */
	fallback?: { value: string; raw: NodeParameterValueType };
};

const LABEL_SEPARATOR = ' › ';

/** The path of a parameter input: list indexes in brackets, as the node settings write them. */
function parameterPath(keyPath: string[]): string {
	return keyPath.reduce(
		(path, part) => (/^\d+$/.test(part) ? `${path}[${part}]` : `${path}.${part}`),
		'parameters',
	);
}

const EDITOR_LANGUAGES: Record<string, string> = {
	sqlEditor: 'sql',
	htmlEditor: 'html',
	cssEditor: 'css',
	jsEditor: 'javascript',
	jsonEditor: 'json',
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isParameters(value: unknown): value is INodeParameters {
	return isRecord(value);
}

function isPropertyOption(option: unknown): option is INodePropertyOptions {
	return isRecord(option) && 'value' in option && 'name' in option;
}

function isPropertyCollection(option: unknown): option is INodePropertyCollection {
	return isRecord(option) && Array.isArray(option.values);
}

function isProperty(option: unknown): option is INodeProperties {
	return isRecord(option) && typeof option.type === 'string' && 'displayName' in option;
}

export function useNodeFieldDiff() {
	const i18n = useI18n();

	const on = () => i18n.baseText('workflowDiff.fields.on');
	const off = () => i18n.baseText('workflowDiff.fields.off');

	function codeLanguage(property: INodeProperties): string | undefined {
		const editor = property.typeOptions?.editor;
		if (editor === 'codeNodeEditor') {
			return property.typeOptions?.editorLanguage === 'python' ? 'python' : 'javascript';
		}
		return editor ? EDITOR_LANGUAGES[editor] : undefined;
	}

	/** One value as the field shows it. Option values show as their option names. */
	function formatValue(
		property: INodeProperties | undefined,
		value: NodeParameterValueType | undefined,
	): Pick<FieldValue, 'kind' | 'language' | 'value' | 'expression'> {
		if (value === undefined || value === null) return { kind: 'input', value: '' };

		// An expression keeps its text, with no leading `=`.
		if (typeof value === 'string' && value.startsWith('=')) {
			const text = value.slice(1);
			return { kind: text.includes('\n') ? 'text' : 'input', value: text, expression: true };
		}

		if (typeof value === 'boolean') return { kind: 'input', value: value ? on() : off() };

		if (property?.type === 'options' || property?.type === 'multiOptions') {
			const options = (property.options ?? []).filter(isPropertyOption);
			const nameOf = (item: unknown) =>
				options.find((option) => option.value === item)?.name ?? String(item);
			return {
				kind: 'input',
				value: Array.isArray(value) ? value.map(nameOf).join(', ') : nameOf(value),
			};
		}

		// A plain record, so the guards below can read the keys of each shape.
		const raw: unknown = value;

		if (property?.type === 'resourceLocator' && isRecord(raw)) {
			const id = String(raw.value ?? '');
			const name = typeof raw.cachedResultName === 'string' ? raw.cachedResultName : '';
			return { kind: 'input', value: name && name !== id ? `${name} (${id})` : id };
		}

		if (property?.type === 'assignmentCollection' && isRecord(raw)) {
			const assignments: unknown[] = Array.isArray(raw.assignments) ? raw.assignments : [];
			return {
				kind: 'text',
				value: assignments
					.filter(isRecord)
					.map((item) => {
						const text = String(item.value ?? '');
						return `${String(item.name)} = ${text.startsWith('=') ? text.slice(1) : text}`;
					})
					.join('\n'),
			};
		}

		if (typeof value === 'string') {
			const language = property ? codeLanguage(property) : undefined;
			if (language) return { kind: 'code', language, value };
			if (property?.type === 'json') return { kind: 'code', language: 'json', value };
			const rows = property?.typeOptions?.rows ?? 1;
			return { kind: rows > 1 || value.includes('\n') ? 'text' : 'input', value };
		}

		if (typeof value === 'number') return { kind: 'input', value: String(value) };

		// The rest, such as filter conditions, shows as JSON.
		return { kind: 'code', language: 'json', value: JSON.stringify(value, null, 2) };
	}

	/** One field of one side, with its text, its stored value and its default. */
	function fieldValue(
		key: string,
		label: string,
		path: string,
		property: INodeProperties,
		raw: NodeParameterValueType,
	): FieldValue {
		const hasDefault = property.default !== undefined && property.default !== '';
		return {
			key,
			label,
			path,
			property,
			raw,
			...formatValue(property, raw),
			fallback: hasDefault
				? { value: formatValue(property, property.default).value, raw: property.default }
				: undefined,
		};
	}

	/** A property for a value that the node type does not describe. */
	function looseProperty(name: string, value: unknown): INodeProperties {
		const isText = typeof value === 'string' || typeof value === 'number';
		return { displayName: name, name, type: isText ? 'string' : 'json', default: '' };
	}

	/**
	 * Walks the parameters of one node with the node type properties. Collections open into
	 * one field for each child, with the parent names in the label.
	 */
	function parameterValues(node: INode, nodeType: INodeTypeDescription | null) {
		const out = new Map<string, FieldValue>();
		const root = node.parameters;
		// The display rules read the defaults too, so they get the parameters with defaults.
		const resolved =
			NodeHelpers.getNodeParameters(
				nodeType?.properties ?? [],
				root,
				true,
				false,
				node,
				nodeType,
			) ?? root;

		function walk(
			values: INodeParameters,
			properties: INodeProperties[],
			path: string[],
			labels: string[],
		) {
			const handled = new Set<string>();
			for (const property of properties) {
				if (handled.has(property.name) || !(property.name in values)) continue;
				const shown = path.length === 0 ? resolved : values;
				if (!NodeHelpers.displayParameter(shown, property, node, nodeType, resolved)) continue;
				handled.add(property.name);

				const value = values[property.name];
				const raw: unknown = value;
				const keyPath = [...path, property.name];
				const labelPath = [...labels, property.displayName];

				if (property.type === 'collection' && isParameters(raw)) {
					walk(raw, (property.options ?? []).filter(isProperty), keyPath, labelPath);
					continue;
				}

				if (property.type === 'fixedCollection' && isParameters(raw)) {
					for (const group of (property.options ?? []).filter(isPropertyCollection)) {
						const groupValue = raw[group.name];
						const entries = Array.isArray(groupValue) ? groupValue : [groupValue];
						entries.forEach((entry, index) => {
							if (!isParameters(entry)) return;
							const entryLabel =
								entries.length > 1 || Array.isArray(groupValue)
									? `${group.displayName} ${index + 1}`
									: group.displayName;
							walk(
								entry,
								group.values,
								[...keyPath, group.name, String(index)],
								[...labelPath, entryLabel],
							);
						});
					}
					continue;
				}

				out.set(
					keyPath.join('.'),
					fieldValue(
						keyPath.join('.'),
						labelPath.join(LABEL_SEPARATOR),
						parameterPath(keyPath),
						property,
						value,
					),
				);
			}

			// A stored parameter that no shown property matches still shows: a diff must not hide
			// a change. It takes the label of the first property with its name, or its key.
			for (const [name, value] of Object.entries(values)) {
				if (handled.has(name)) continue;
				const property =
					properties.find((candidate) => candidate.name === name) ?? looseProperty(name, value);
				const keyPath = [...path, name];
				out.set(
					keyPath.join('.'),
					fieldValue(
						keyPath.join('.'),
						[...labels, property.displayName].join(LABEL_SEPARATOR),
						parameterPath(keyPath),
						property,
						value,
					),
				);
			}
		}

		walk(root, nodeType?.properties ?? [], [], []);
		return out;
	}

	function settingValues(node: INode) {
		const out = new Map<string, FieldValue>();
		const settings = createCommonNodeSettings(false, (key) => i18n.baseText(key));
		const propertyOf = (name: string) => settings.find((setting) => setting.name === name);

		// The node settings that have no property of their own in the settings tab.
		const loose: INodeProperties[] = [
			{
				displayName: i18n.baseText('workflowDiff.fields.nodeName'),
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: i18n.baseText('workflowDiff.fields.typeVersion'),
				name: 'typeVersion',
				type: 'string',
				default: '',
			},
			{
				displayName: i18n.baseText('workflowDiff.fields.disabled'),
				name: 'disabled',
				type: 'boolean',
				default: false,
			},
		];
		const values: Record<string, NodeParameterValueType> = {
			name: node.name,
			typeVersion: String(node.typeVersion),
			disabled: node.disabled ?? false,
			notes: node.notes,
			notesInFlow: node.notesInFlow ?? false,
			alwaysOutputData: node.alwaysOutputData ?? false,
			executeOnce: node.executeOnce ?? false,
			retryOnFail: node.retryOnFail ?? false,
			maxTries: node.retryOnFail || node.maxTries !== undefined ? (node.maxTries ?? 3) : undefined,
			waitBetweenTries:
				node.retryOnFail || node.waitBetweenTries !== undefined
					? (node.waitBetweenTries ?? 1000)
					: undefined,
			onError: node.onError ?? 'stopWorkflow',
		};
		for (const [name, value] of Object.entries(values)) {
			const property = propertyOf(name) ?? loose.find((candidate) => candidate.name === name);
			if (!property || value === undefined) continue;
			out.set(
				`settings:${name}`,
				fieldValue(`settings:${name}`, property.displayName, name, property, value),
			);
		}
		return out;
	}

	function credentialValues(node: INode, credentialLabel: (type: string) => string) {
		const out = new Map<string, FieldValue>();
		for (const [type, credential] of Object.entries(node.credentials ?? {})) {
			const name = credential.name ?? credential.id ?? '';
			// The credential input is a select: one option with the credential name.
			const property: INodeProperties = {
				displayName: credentialLabel(type),
				name: type,
				type: 'options',
				options: [{ name, value: name }],
				default: '',
			};
			out.set(
				`credentials:${type}`,
				fieldValue(
					`credentials:${type}`,
					property.displayName,
					`credentials.${type}`,
					property,
					name,
				),
			);
		}
		return out;
	}

	/**
	 * Pairs the fields of both sides. A field on one side only takes the default value on the
	 * other side, when that node exists: n8n does not store a parameter at its default.
	 */
	function pair(
		before: Map<string, FieldValue> | undefined,
		after: Map<string, FieldValue> | undefined,
	): NodeField[] {
		const keys = [...new Set([...(after?.keys() ?? []), ...(before?.keys() ?? [])])];
		return keys.flatMap((key) => {
			const leftValue = before?.get(key);
			const rightValue = after?.get(key);
			const shape = rightValue ?? leftValue;
			if (!shape) return [];
			// An added or deleted node shows only the fields that differ from the defaults.
			if ((!before || !after) && shape.value === shape.fallback?.value) {
				return [];
			}
			// A side without the parameter shows its default, when that node exists.
			const side = (value: FieldValue | undefined, exists: boolean) =>
				value
					? { text: value.value, raw: value.raw }
					: exists && shape.fallback
						? { text: shape.fallback.value, raw: shape.fallback.raw }
						: { text: '', raw: exists ? shape.property.default : null };
			const left = side(leftValue, !!before);
			const right = side(rightValue, !!after);
			const { fallback: _, value: __, raw: ___, ...field } = shape;
			return [
				{
					...field,
					before: left.text,
					after: right.text,
					beforeValue: left.raw,
					afterValue: right.raw,
					changed: left.text !== right.text,
				},
			];
		});
	}

	function build(options: {
		before?: INode;
		after?: INode;
		nodeType: INodeTypeDescription | null;
		credentialLabel?: (type: string) => string;
	}): NodeFieldSection[] {
		const { before, after, nodeType } = options;
		const credentialLabel = options.credentialLabel ?? ((type: string) => type);
		const sides = <T>(read: (node: INode) => T) =>
			[before ? read(before) : undefined, after ? read(after) : undefined] as const;

		const sections: NodeFieldSection[] = [
			{ id: 'parameters', fields: pair(...sides((node) => parameterValues(node, nodeType))) },
			{
				id: 'credentials',
				fields: pair(...sides((node) => credentialValues(node, credentialLabel))),
			},
			{ id: 'settings', fields: pair(...sides(settingValues)) },
		];
		return sections.filter((section) => section.fields.length > 0);
	}

	return { build };
}
