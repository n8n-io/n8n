import type { INodeProperties } from 'n8n-workflow';

import type { AnySchema } from './schema';

/**
 * n8n fills every property default into the parameters it runs with. An optional field
 * without a default gets '', which the runtime drops, so an unset field stays unset.
 */
export function toProperty(name: string, schema: AnySchema): INodeProperties {
	const { json } = schema;
	const unset = schema.isOptional && json.default === undefined;
	const base = {
		displayName: json.title ?? name,
		name,
		required: !schema.isOptional,
		...(json['x-n8n-hint'] ? { description: json['x-n8n-hint'] } : {}),
	};
	if (json.enum) {
		const options = json.enum.flatMap((value) =>
			typeof value === 'string' || typeof value === 'number'
				? [{ name: String(value), value }]
				: [],
		);
		return { ...base, type: 'options', options, default: unset ? '' : (options[0]?.value ?? '') };
	}
	switch (json.type) {
		case 'string':
			return {
				...base,
				type: 'string',
				default: typeof json.default === 'string' ? json.default : '',
			};
		case 'number':
		case 'integer':
			return {
				...base,
				type: 'number',
				default: typeof json.default === 'number' ? json.default : unset ? '' : 0,
			};
		case 'boolean':
			return { ...base, type: 'boolean', default: json.default === true };
		default:
			// Complex fields keep their JSON value; n8n resolves expressions inside it per item.
			return {
				...base,
				type: 'json',
				default: json.default !== undefined ? JSON.stringify(json.default) : unset ? '' : '{}',
			};
	}
}
