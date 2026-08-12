import { UI_KIT_SPEC } from './kit-spec';
import {
	ACTION_PROP_TYPE,
	ROUTE_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiComponentSpec,
	type UiProperty,
} from './types';

/**
 * The kit, as TypeScript for whoever is writing a definition by hand — which is
 * mostly n8n's AI builder, authoring an object literal in a workflow-sdk file.
 *
 * Generated rather than written, because a hand-kept copy of twelve components
 * and their props drifts the first time someone adds a prop, and the drift is
 * invisible until an app renders wrong. The type is also the validation: the SDK
 * source is typechecked before a workflow is saved, so an unknown component or a
 * misspelled prop fails there rather than at runtime.
 */

const HEADER = `/**
 * A UI Builder app: a tree of nodes, each { id, type, props, tree }.
 *
 * \`tree\` is keyed by region — the drop points a component declares. Most
 * declare one, called \`default\`.
 *
 * Any value prop may instead be a UI Builder expression: \`={{ $state.orders }}\`.
 * These are NOT n8n expressions. They are resolved in the browser against the
 * app's own scope — \`$state\`, \`$loading\`, \`$route\`, \`$pages\`, and \`$item\` /
 * \`$index\` inside a \`repeat\`. n8n never evaluates them.
 */`;

function literal(value: string | number | boolean): string {
	return typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
}

function propType(descriptor: UiProperty): string {
	switch (descriptor.type) {
		case ACTION_PROP_TYPE:
			return 'UiActionStep[]';
		case STATE_PATH_PROP_TYPE:
		case ROUTE_PROP_TYPE:
			return 'string';
		case 'options':
			return descriptor.options?.length
				? `${descriptor.options.map((option) => literal(option.value)).join(' | ')} | UiExpr`
				: 'string | UiExpr';
		case 'number':
			return 'number | UiExpr';
		case 'boolean':
			return 'boolean | UiExpr';
		default:
			// `UiExpr` is a subtype of `string`, so this union collapses. Written out
			// anyway: the point of the generated type is to be read, and a string prop
			// taking an expression is the thing worth saying at the point of use.
			return 'string | UiExpr';
	}
}

function propsType(spec: UiComponentSpec): string {
	if (spec.props.length === 0) return 'Record<string, never>';

	const entries = spec.props.map((descriptor) => `${descriptor.name}?: ${propType(descriptor)}`);
	return `{ ${entries.join('; ')} }`;
}

function treeType(spec: UiComponentSpec): string {
	const regions = spec.regions ?? [];
	if (regions.length === 0) return 'Record<string, never>';

	const entries = regions.map((region) => `${region.name}?: UiDefinition[]`);
	return `{ ${entries.join('; ')} }`;
}

function memberDoc(spec: UiComponentSpec): string {
	const notes: string[] = [spec.label];

	if (spec.repeatOver) {
		notes.push(
			`renders its children once per element of \`${spec.repeatOver}\`, binding $item/$index`,
		);
	}
	if (spec.pagedRegion) {
		notes.push(`region \`${spec.pagedRegion}\` holds pages, of which the route shows one`);
	}

	return `/** ${notes.join(' — ')} */`;
}

function member(spec: UiComponentSpec): string {
	return [
		`\t${memberDoc(spec)}`,
		`\t| { id: string; type: '${spec.type}'; props?: ${propsType(spec)}; tree?: ${treeType(spec)} }`,
	].join('\n');
}

/**
 * The whole authoring surface as one declaration block, for the workflow SDK to
 * paste into a generated `.d.ts` beside its other shared value types.
 */
export function uiDefinitionTypeSource(exported: boolean): string {
	const prefix = exported ? 'export type' : 'type';

	return [
		`${prefix} UiExpr = \`={{\${string}}}\`;`,
		`${prefix} UiWebhookStep = { kind: 'webhook'; url: string; method?: 'GET' | 'POST'; request?: string; response?: string | Record<string, string> };`,
		`${prefix} UiNotifyStep = { kind: 'notify'; message: string; type?: 'success' | 'error' | 'info' };`,
		`${prefix} UiNavigateStep = { kind: 'navigate'; to: string };`,
		`${prefix} UiSetStep = { kind: 'set'; path: string; value?: unknown };`,
		`${prefix} UiActionStep = UiWebhookStep | UiNotifyStep | UiNavigateStep | UiSetStep;`,
		'',
		HEADER,
		`${prefix} UiDefinition =`,
		UI_KIT_SPEC.map(member).join('\n'),
		'\t;',
	].join('\n');
}
