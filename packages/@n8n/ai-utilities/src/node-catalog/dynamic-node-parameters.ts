import type {
	ILoadOptions,
	INodeCredentials,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyMode,
	INodePropertyOptions,
	INodeTypeDescription,
	NodeParameterValue,
} from 'n8n-workflow';
import { isINodeProperties, isINodePropertyCollection } from 'n8n-workflow';

export type DynamicNodeParameterLookup =
	| {
			kind: 'resourceLocator';
			methodName: string;
			mode: string;
			skipCredentialsCheck: boolean;
	  }
	| {
			kind: 'loadOptionsMethod';
			methodName: string;
			skipCredentialsCheck: false;
	  }
	| {
			kind: 'loadOptionsRouting';
			loadOptions: ILoadOptions;
			skipCredentialsCheck: false;
	  };

export type DynamicNodeParameterPath = {
	path: string;
	type: INodeProperties['type'];
	method: string;
};

export type RequiredNodeCredentialSlot = {
	credentialType: string;
	credentialSlot: string;
	displayName?: string;
};

type NodePropertyItem = INodeProperties | INodePropertyCollection | INodePropertyOptions;

export function normalizeParameterPath(path: string): string {
	return path
		.replace(/^parameters\./, '')
		.split('.')
		.filter((part) => part.length > 0)
		.join('.');
}

export function toDynamicParameterPath(parameterPath: string): string {
	return `parameters.${normalizeParameterPath(parameterPath)}`;
}

function isPropertyOption(item: NodePropertyItem): item is INodePropertyOptions {
	return !isINodeProperties(item) && !isINodePropertyCollection(item);
}

function findPropertyInProperty(
	property: INodeProperties,
	pathParts: string[],
): INodeProperties | null {
	const options = property.options;
	if (!Array.isArray(options)) return null;

	return findPropertyInItems(options, pathParts);
}

function findPropertyInItems(
	items: NodePropertyItem[],
	pathParts: string[],
): INodeProperties | null {
	if (pathParts.length === 0) return null;

	for (const item of items) {
		if (isPropertyOption(item)) continue;

		if (isINodePropertyCollection(item)) {
			if (item.name === pathParts[0]) {
				const nested = findPropertyInItems(item.values, pathParts.slice(1));
				if (nested) return nested;
			}

			const nested = findPropertyInItems(item.values, pathParts);
			if (nested) return nested;
			continue;
		}

		if (item.name === pathParts[0]) {
			if (pathParts.length === 1) return item;

			const nested = findPropertyInProperty(item, pathParts.slice(1));
			if (nested) return nested;
		}

		const nested = findPropertyInProperty(item, pathParts);
		if (nested) return nested;
	}

	return null;
}

export function findNodeParameterProperty(
	properties: INodeProperties[],
	parameterPath: string,
): INodeProperties | null {
	return findPropertyInItems(properties, normalizeParameterPath(parameterPath).split('.'));
}

export function getDynamicNodeParameterLookup(
	property: INodeProperties,
): DynamicNodeParameterLookup | null {
	if (property.type === 'resourceLocator') {
		const listMode = property.modes?.find(
			(mode: INodePropertyMode) => mode.type === 'list' && mode.typeOptions?.searchListMethod,
		);

		if (listMode?.typeOptions?.searchListMethod) {
			return {
				kind: 'resourceLocator',
				methodName: listMode.typeOptions.searchListMethod,
				mode: listMode.name,
				skipCredentialsCheck: listMode.typeOptions.skipCredentialsCheckInRLC === true,
			};
		}
	}

	if (property.typeOptions?.loadOptionsMethod) {
		return {
			kind: 'loadOptionsMethod',
			methodName: property.typeOptions.loadOptionsMethod,
			skipCredentialsCheck: false,
		};
	}

	if (property.typeOptions?.loadOptions) {
		return {
			kind: 'loadOptionsRouting',
			loadOptions: property.typeOptions.loadOptions,
			skipCredentialsCheck: false,
		};
	}

	return null;
}

export function collectDynamicNodeParameterPaths(
	items: NodePropertyItem[],
	prefix: string[] = [],
): DynamicNodeParameterPath[] {
	const out: DynamicNodeParameterPath[] = [];

	for (const item of items) {
		if (isPropertyOption(item)) continue;

		if (isINodePropertyCollection(item)) {
			out.push(...collectDynamicNodeParameterPaths(item.values, [...prefix, item.name]));
			continue;
		}

		const path = [...prefix, item.name].join('.');
		const lookup = getDynamicNodeParameterLookup(item);
		if (lookup) {
			out.push({
				path,
				type: item.type,
				method: lookup.kind === 'loadOptionsRouting' ? 'loadOptions.routing' : lookup.methodName,
			});
		}

		if (Array.isArray(item.options)) {
			out.push(...collectDynamicNodeParameterPaths(item.options, [...prefix, item.name]));
		}
	}

	return out;
}

export function getRequiredNodeCredentialSlots(
	nodeType: INodeTypeDescription,
): RequiredNodeCredentialSlot[] {
	return (nodeType.credentials ?? [])
		.filter((credential) => credential.required !== false)
		.map((credential) => ({
			credentialType: credential.name,
			credentialSlot: credential.name,
			...(credential.displayName ? { displayName: credential.displayName } : {}),
		}));
}

export function hasNodeCredentials(credentials: INodeCredentials | undefined): boolean {
	return credentials !== undefined && Object.keys(credentials).length > 0;
}

export function toResourceLocatorParameterValue(
	option: INodeListSearchItems,
	mode: string,
): INodeParameterResourceLocator {
	const value = typeof option.value === 'boolean' ? String(option.value) : option.value;

	return {
		__rl: true,
		mode,
		value,
		cachedResultName: option.name,
		...(option.url ? { cachedResultUrl: option.url } : {}),
	};
}

export function toLoadedOptionParameterValue(option: INodePropertyOptions): NodeParameterValue {
	return option.value;
}

/**
 * Detect the value a node's `authentication` parameter must take for a given
 * credential type. Many nodes (e.g. Google Sheets) use an `authentication`
 * parameter to switch between serviceAccount/oAuth2, and
 * `getNodeParameter('authentication', 0)` falls back to the wrong default
 * when it's not set. Returns undefined when the node has no matching
 * authentication option.
 */
export function detectAuthenticationParameterValue(
	nodeDesc: INodeTypeDescription,
	credentialType: string,
): string | undefined {
	const authProp = nodeDesc.properties.find((p) => p.name === 'authentication');
	if (!authProp?.options) return undefined;

	// Find the option whose credentialTypes includes our credential type
	for (const opt of authProp.options) {
		if (typeof opt === 'object' && 'value' in opt && typeof opt.value === 'string') {
			const credTypes = nodeDesc.credentials
				?.filter((c) => {
					const show = c.displayOptions?.show?.authentication;
					return Array.isArray(show) && show.includes(opt.value);
				})
				.map((c) => c.name);
			if (credTypes?.includes(credentialType)) {
				return opt.value;
			}
		}
	}

	return undefined;
}

function escapeXmlText(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export function formatResourceLocatorOptionsForLLM(
	options: INodeListSearchItems[],
	parameterPath: string,
): string {
	if (options.length === 0) {
		return `No options available for parameter "${parameterPath}". The resource may require credentials to be set up first or the external service returned no results.`;
	}

	const parts: string[] = [
		`<resource_locator_options parameter="${escapeXmlText(parameterPath)}">`,
		`<total_count>${options.length}</total_count>`,
		'<options>',
	];

	options.forEach((opt, index) => {
		parts.push(`  <option index="${index}">`);
		parts.push(`    <display_name>${escapeXmlText(opt.name)}</display_name>`);
		parts.push(`    <id>${escapeXmlText(String(opt.value))}</id>`);
		parts.push('  </option>');
	});

	parts.push('</options>');
	parts.push('</resource_locator_options>');

	return parts.join('\n');
}
