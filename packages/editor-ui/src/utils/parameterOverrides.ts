import type { INodeTypeDescription, NodeParameterValueType, NodePropertyTypes } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';

export interface ParameterOverride {
	readonly overridePlaceholder: string;
	readonly extraProps: Record<string, ExtraPropValue>;
	extraPropValues: Partial<Record<keyof ParameterOverride['extraProps'], NodeParameterValueType>>;
	buildValueFromOverride: (props: Context, excludeMarker: boolean) => string;
	isOverrideValue: (s: string) => boolean;
	parseOverrides: (s: string) => Partial<Record<string, string>> | null;
}

type Context = {
	parameter: {
		name: string;
		displayName: string;
		type: NodePropertyTypes;
		noDataExpression?: boolean;
		typeOptions?: { editor?: string };
	};
	value: NodeParameterValueType;
	path: string;
};

type FromAiOverrideExtraProps = 'description';
type ExtraPropValue = {
	initialValue: string;
	tooltip: string;
	type: NodePropertyTypes;
};

function sanitizeFromAiParameterName(s: string) {
	s = s.replace(/[^a-zA-Z0-9\-]/g, '_');

	if (s.length >= 64) {
		s = s.slice(0, 63);
	}

	return s;
}

export class FromAiOverride implements ParameterOverride {
	static readonly MARKER = '/* n8n-auto-generated-fromAi-override */';

	static readonly NODE_DENYLIST = ['toolCode', 'toolHttpRequest'];

	static readonly PATH_DENYLIST = [
		'parameters.name',
		'parameters.description',
		// This is used in e.g. the telegram node if the dropdown selects manual mode
		'parameters.toolDescription',
	];

	readonly overridePlaceholder = i18n.baseText('parameterOverride.overridePanelText');

	readonly providers = {
		key: (props: Context) => sanitizeFromAiParameterName(props.parameter.displayName),
		type: (props: Context) => this.fieldTypeToFromAiType(props),
	};

	readonly extraProps: Record<FromAiOverrideExtraProps, ExtraPropValue> = {
		description: {
			initialValue: '',
			type: 'string',
			tooltip: i18n.baseText('parameterOverride.descriptionTooltip'),
		},
	};

	extraPropValues: Partial<Record<FromAiOverrideExtraProps, NodeParameterValueType>> = {};

	private fieldTypeToFromAiType(props: Context) {
		switch (props.parameter.type) {
			case 'boolean':
				return 'boolean';
			case 'number':
				return 'number';
			case 'string':
			default:
				return 'string';
		}
	}

	static isOverrideValue(s: string) {
		return s.startsWith(`={{ ${FromAiOverride.MARKER} $fromAI(`);
	}

	isOverrideValue = FromAiOverride.isOverrideValue;

	buildValueFromOverride(props: Context, excludeMarker: boolean) {
		const { key, type } = this.providers;
		return `={{ ${excludeMarker ? '' : FromAiOverride.MARKER} $fromAI('${key(props)}', '${this.extraPropValues?.description?.toString() ?? this.extraProps.description.initialValue}', '${type(props)}') }}`;
	}

	parseOverrides(s: string): Record<keyof typeof this.extraProps, string | undefined> | null {
		/*
			Approaches:
			- Smart and boring: Reuse packages/core/src/CreateNodeAsTool.ts - unclear where to move it
			- Fun and dangerous: Use eval, see below
		*/
		if (!this.isOverrideValue(s)) return null;

		const fromAI = (...args: unknown[]) => args;
		const fns = `const $fromAI = ${fromAI}; const $fromAi = ${fromAI}; const $fromai = ${fromAI};`;
		const cursor = '={{ /* n8n-auto-generated-override */ '.length;
		const end = '}}'.length;

		let params: unknown[] = [];
		try {
			// `eval?.` is an indirect evaluation, outside of local scope
			const code = `${fns} ${s.slice(cursor, -end)}`;
			params = eval?.(code) ?? [];
		} catch (e) {}
		return {
			// key: params[0],
			description: params[1] as string | undefined,
			// type: params[2],
		};
	}

	static canBeContentOverride(props: Context, nodeType: INodeTypeDescription | null) {
		if (FromAiOverride.NODE_DENYLIST.some((x) => nodeType?.name?.endsWith(x) ?? false))
			return false;

		if (FromAiOverride.PATH_DENYLIST.includes(props.path)) return false;

		const codex = nodeType?.codex;
		if (!codex?.categories?.includes('AI') || !codex?.subcategories?.AI?.includes('Tools'))
			return false;

		return !props.parameter.noDataExpression && 'options' !== props.parameter.type;
	}
}

export function makeOverrideValue(
	context: Context,
	nodeType: INodeTypeDescription | null,
): ParameterOverride | null {
	if (!nodeType) return null;

	if (FromAiOverride.canBeContentOverride(context, nodeType)) {
		const fromAiOverride = new FromAiOverride();
		const existingOverrides = fromAiOverride.parseOverrides(context.value?.toString() ?? '');
		for (const [key, value] of Object.entries(existingOverrides ?? {})) {
			if (
				value === undefined ||
				value === fromAiOverride.extraProps[key as FromAiOverrideExtraProps].initialValue
			)
				continue;

			fromAiOverride.extraPropValues[key as FromAiOverrideExtraProps] = value;
		}
		return fromAiOverride;
	}

	return null;
}
