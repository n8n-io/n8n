import { readFile } from 'node:fs/promises';
import type {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypes,
	Themed,
} from 'n8n-workflow';
import { isINodePropertyCollection, isINodePropertyOptions } from 'n8n-workflow';

/**
 * Minimal structural view of a workflow node needed to look up its node type.
 * Matches both `INode` and the sanitized node payload of the workflow details
 * tool (where extra fields live behind a zod passthrough).
 */
type NodeTypeRef = { type: string } & Record<string, unknown>;

/**
 * Narrow view of `LoadNodesAndCredentials.resolveIcon`, so callers (and tests)
 * don't need the full service.
 */
export type NodeIconResolver = {
	resolveIcon(packageName: string, url: string): string | undefined;
};

/**
 * Trimmed `INodeTypeDescription` carrying only what a canvas preview needs to
 * render nodes: identity, connection shape, visuals, and structurally-trimmed
 * `properties` (see {@link trimProperties}).
 */
export type PreviewNodeType = Pick<
	INodeTypeDescription,
	| 'name'
	| 'displayName'
	| 'version'
	| 'group'
	| 'description'
	| 'defaults'
	| 'inputs'
	| 'outputs'
	| 'inputNames'
	| 'outputNames'
	| 'icon'
	| 'iconColor'
	| 'iconUrl'
	| 'badgeIconUrl'
	| 'subtitle'
	| 'properties'
>;

type PropertyOrOption = INodeProperties | INodePropertyOptions | INodePropertyCollection;

/**
 * Keeps only the fields parameter-value resolution needs. The preview client
 * runs `NodeHelpers.getNodeParameters` over these to materialize parameter
 * defaults (which subtitle and dynamic input/output expressions read), so the
 * structure — nesting, display conditions, defaults — must stay intact, while
 * UI-only leaf fields (descriptions, placeholders, hints) dominate size and
 * can be dropped.
 */
function trimProperty(property: PropertyOrOption): PropertyOrOption {
	if (isINodePropertyOptions(property)) {
		return { name: property.name, value: property.value };
	}

	if (isINodePropertyCollection(property)) {
		return {
			displayName: property.displayName,
			name: property.name,
			values: property.values.map((value) => trimNodeProperty(value)),
		};
	}

	return trimNodeProperty(property);
}

function trimNodeProperty(property: INodeProperties): INodeProperties {
	return {
		displayName: property.displayName,
		name: property.name,
		type: property.type,
		default: property.default,
		...(property.required !== undefined ? { required: property.required } : {}),
		...(property.displayOptions !== undefined ? { displayOptions: property.displayOptions } : {}),
		// Structural typeOptions only: multipleValues changes the value shape.
		...(property.typeOptions?.multipleValues !== undefined
			? { typeOptions: { multipleValues: property.typeOptions.multipleValues } }
			: {}),
		...(property.options !== undefined
			? { options: property.options.map((option) => trimProperty(option)) }
			: {}),
	};
}

function trimProperties(properties: INodeProperties[]): INodeProperties[] {
	return properties.map((property) => trimNodeProperty(property));
}

/** Icons larger than this are skipped; the preview falls back to a placeholder. */
const MAX_ICON_BYTES = 32 * 1024;

const ICON_MIME_TYPES: Record<string, string> = {
	svg: 'image/svg+xml',
	png: 'image/png',
};

/**
 * Parses the package name out of a loader-generated icon URL
 * (`icons/<packageName>/<path>`, where packageName may be scoped).
 */
function parseIconPackageName(iconUrl: string): string | undefined {
	const segments = iconUrl.split('/');
	if (segments[0] !== 'icons' || segments.length < 3) return undefined;

	return segments[1].startsWith('@') ? `${segments[1]}/${segments[2]}` : segments[1];
}

async function iconUrlToDataUri(
	iconUrl: string,
	iconResolver: NodeIconResolver,
): Promise<string | undefined> {
	const packageName = parseIconPackageName(iconUrl);
	if (!packageName) return undefined;

	const mimeType = ICON_MIME_TYPES[iconUrl.split('.').pop()?.toLowerCase() ?? ''];
	if (!mimeType) return undefined;

	const filePath = iconResolver.resolveIcon(packageName, `/${iconUrl}`);
	if (!filePath) return undefined;

	try {
		const contents = await readFile(filePath);
		if (contents.byteLength > MAX_ICON_BYTES) return undefined;
		return `data:${mimeType};base64,${contents.toString('base64')}`;
	} catch {
		return undefined;
	}
}

/**
 * Converts a (possibly themed) loader-relative icon URL into inline data URIs
 * so sandboxed preview UIs can render icons without reaching the instance.
 * Returns `undefined` when no variant could be inlined.
 */
async function inlineThemedIcon(
	iconUrl: Themed<string> | undefined,
	iconResolver: NodeIconResolver,
): Promise<Themed<string> | undefined> {
	if (typeof iconUrl === 'string') {
		return await iconUrlToDataUri(iconUrl, iconResolver);
	}

	if (iconUrl && typeof iconUrl === 'object') {
		const [light, dark] = await Promise.all([
			iconUrlToDataUri(iconUrl.light, iconResolver),
			iconUrl.dark ? iconUrlToDataUri(iconUrl.dark, iconResolver) : Promise.resolve(undefined),
		]);
		if (!light) return undefined;
		return dark ? { light, dark } : light;
	}

	return undefined;
}

/**
 * Builds trimmed node type descriptions (with icons inlined as data URIs) for
 * the node types used by the given workflow nodes. Unknown node types are
 * skipped — preview UIs render them as placeholders.
 */
export async function buildPreviewNodeTypes(
	nodes: NodeTypeRef[],
	nodeTypes: INodeTypes,
	iconResolver: NodeIconResolver,
): Promise<PreviewNodeType[]> {
	const seen = new Set<string>();
	const result: PreviewNodeType[] = [];

	for (const node of nodes) {
		const typeVersion = typeof node.typeVersion === 'number' ? node.typeVersion : undefined;
		const key = `${node.type}|${typeVersion}`;
		if (seen.has(key)) continue;
		seen.add(key);

		let description: INodeTypeDescription;
		try {
			description = nodeTypes.getByNameAndVersion(node.type, typeVersion).description;
		} catch {
			continue;
		}

		const [iconUrl, badgeIconUrl] = await Promise.all([
			inlineThemedIcon(description.iconUrl, iconResolver),
			inlineThemedIcon(description.badgeIconUrl, iconResolver),
		]);

		result.push({
			// Runtime descriptions carry the short name (`googleSheets`); only the
			// frontend-facing types list gets package-prefixed (see
			// LoadNodesAndCredentials.postProcessLoaders). Renderers look node
			// types up by the workflow node's fully-qualified `type`, so ship that.
			name: node.type,
			displayName: description.displayName,
			version: description.version,
			group: description.group,
			description: description.description,
			defaults: description.defaults,
			inputs: description.inputs,
			outputs: description.outputs,
			...(description.inputNames ? { inputNames: description.inputNames } : {}),
			...(description.outputNames ? { outputNames: description.outputNames } : {}),
			...(description.icon ? { icon: description.icon } : {}),
			...(description.iconColor ? { iconColor: description.iconColor } : {}),
			...(iconUrl ? { iconUrl } : {}),
			...(badgeIconUrl ? { badgeIconUrl } : {}),
			...(description.subtitle ? { subtitle: description.subtitle } : {}),
			properties: trimProperties(description.properties ?? []),
		});
	}

	return result;
}
