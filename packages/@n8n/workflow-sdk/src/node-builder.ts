import { v4 as uuid } from 'uuid';
import type {
	NodeInstance,
	TriggerInstance,
	NodeConfig,
	StickyNoteConfig,
	PlaceholderValue,
} from './types/base';

/**
 * Generate a human-readable name from a node type
 * @example 'n8n-nodes-base.httpRequest' -> 'HTTP Request'
 */
function generateNodeName(type: string): string {
	// Extract the node name after the package prefix
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	// Convert camelCase/PascalCase to Title Case with spaces
	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before capitals
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle consecutive capitals
		.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
		.replace(/Http/g, 'HTTP') // Fix common acronyms
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP');
}

/**
 * Parse version string to number
 * @example 'v4.2' -> 4.2, 'v1' -> 1
 */
function parseVersion(version: string): number {
	const match = version.match(/v?(\d+(?:\.\d+)?)/);
	return match ? parseFloat(match[1]) : 1;
}

/**
 * Internal node instance implementation
 */
class NodeInstanceImpl<TType extends string, TVersion extends string, TOutput = unknown>
	implements NodeInstance<TType, TVersion, TOutput>
{
	readonly type: TType;
	readonly version: TVersion;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	readonly _outputType?: TOutput;

	constructor(type: TType, version: TVersion, config: NodeConfig, id?: string, name?: string) {
		this.type = type;
		this.version = version;
		this.config = { ...config };
		this.id = id ?? uuid();
		this.name = name ?? config.name ?? generateNodeName(type);
	}

	update(config: Partial<NodeConfig>): NodeInstance<TType, TVersion, TOutput> {
		const mergedConfig = {
			...this.config,
			...config,
			parameters: config.parameters ?? this.config.parameters,
			credentials: config.credentials ?? this.config.credentials,
		};
		return new NodeInstanceImpl(this.type, this.version, mergedConfig, this.id, this.name);
	}
}

/**
 * Internal trigger instance implementation
 */
class TriggerInstanceImpl<TType extends string, TVersion extends string, TOutput = unknown>
	extends NodeInstanceImpl<TType, TVersion, TOutput>
	implements TriggerInstance<TType, TVersion, TOutput>
{
	readonly isTrigger: true = true;
}

/**
 * Create a node instance
 *
 * @param type - Node type (e.g., 'n8n-nodes-base.httpRequest')
 * @param version - Node version (e.g., 'v4.2')
 * @param config - Node configuration
 * @returns A configured node instance
 *
 * @example
 * ```typescript
 * const httpNode = node('n8n-nodes-base.httpRequest', 'v4.2', {
 *   parameters: { url: 'https://api.example.com', method: 'GET' },
 *   credentials: { httpBasicAuth: { name: 'My Creds', id: '123' } },
 *   onError: 'continueErrorOutput'
 * });
 * ```
 */
export function node<TType extends string, TVersion extends string, TOutput = unknown>(
	type: TType,
	version: TVersion,
	config: NodeConfig,
): NodeInstance<TType, TVersion, TOutput> {
	return new NodeInstanceImpl<TType, TVersion, TOutput>(type, version, config);
}

/**
 * Create a trigger node instance
 *
 * @param type - Trigger node type (e.g., 'n8n-nodes-base.scheduleTrigger')
 * @param version - Node version (e.g., 'v1.1')
 * @param config - Node configuration
 * @returns A configured trigger node instance
 *
 * @example
 * ```typescript
 * const schedule = trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', {
 *   parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } }
 * });
 * ```
 */
export function trigger<TType extends string, TVersion extends string, TOutput = unknown>(
	type: TType,
	version: TVersion,
	config: NodeConfig,
): TriggerInstance<TType, TVersion, TOutput> {
	return new TriggerInstanceImpl<TType, TVersion, TOutput>(type, version, config);
}

/**
 * Sticky note node instance
 */
class StickyNoteInstance implements NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
	readonly type = 'n8n-nodes-base.stickyNote' as const;
	readonly version = 'v1' as const;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;

	constructor(content: string, stickyConfig: StickyNoteConfig = {}) {
		this.id = uuid();
		this.name = stickyConfig.name ?? 'Sticky Note';
		this.config = {
			name: this.name,
			position: stickyConfig.position,
			parameters: {
				content,
				...(stickyConfig.color !== undefined && { color: stickyConfig.color }),
				...(stickyConfig.width !== undefined && { width: stickyConfig.width }),
				...(stickyConfig.height !== undefined && { height: stickyConfig.height }),
			},
		};
	}

	update(config: Partial<NodeConfig>): NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
		const newContent = (config.parameters?.content as string) ?? this.config.parameters?.content;
		const newConfig: StickyNoteConfig = {
			position: config.position ?? this.config.position,
			color: (config.parameters?.color as number) ?? (this.config.parameters?.color as number),
			width: (config.parameters?.width as number) ?? (this.config.parameters?.width as number),
			height: (config.parameters?.height as number) ?? (this.config.parameters?.height as number),
			name: config.name ?? this.name,
		};
		return new StickyNoteInstance(newContent as string, newConfig);
	}
}

/**
 * Create a sticky note for workflow documentation
 *
 * @param content - Markdown content for the sticky note
 * @param config - Optional configuration (color, position, size)
 * @returns A sticky note node instance
 *
 * @example
 * ```typescript
 * const note = sticky('## API Integration\nThis section handles API calls', {
 *   color: 4,
 *   position: [80, -176]
 * });
 * ```
 */
export function sticky(
	content: string,
	config: StickyNoteConfig = {},
): NodeInstance<'n8n-nodes-base.stickyNote', 'v1', void> {
	return new StickyNoteInstance(content, config);
}

/**
 * Placeholder implementation
 */
class PlaceholderImpl implements PlaceholderValue {
	readonly __placeholder: true = true;
	readonly hint: string;

	constructor(hint: string) {
		this.hint = hint;
	}

	toString(): string {
		return `<__PLACEHOLDER_VALUE__${this.hint}__>`;
	}

	toJSON(): string {
		return this.toString();
	}
}

/**
 * Create a placeholder value for template parameters
 *
 * Placeholders are used to mark values that need to be filled in
 * when a workflow template is instantiated.
 *
 * @param hint - Description shown to users (e.g., 'Enter Channel')
 * @returns A placeholder value that serializes to the placeholder format
 *
 * @example
 * ```typescript
 * const slackNode = node('n8n-nodes-base.slack', 'v2.2', {
 *   parameters: { channel: placeholder('Enter Channel') }
 * });
 * // Serializes channel as: '<__PLACEHOLDER_VALUE__Enter Channel__>'
 * ```
 */
export function placeholder(hint: string): PlaceholderValue {
	return new PlaceholderImpl(hint);
}
