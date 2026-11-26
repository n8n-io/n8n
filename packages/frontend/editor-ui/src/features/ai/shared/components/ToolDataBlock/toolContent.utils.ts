import { isRecord } from '@n8n/utils/is-record';

/** One part of a tool result made of content parts, such as an MCP result. */
export type ToolContentItem =
	| { type: 'text'; text: string }
	| { type: 'image'; data: string; mimeType: string }
	| { type: 'file'; data: string; mimeType: string };

// The agents runtime wraps external text in these tags for the model. People do not need them.
const UNTRUSTED_DATA_PATTERN = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/;

function unwrapUntrustedText(text: string): string {
	return UNTRUSTED_DATA_PATTERN.exec(text)?.[1] ?? text;
}

function binaryItem(data: unknown, mimeType: unknown): ToolContentItem | null {
	if (typeof data !== 'string' || typeof mimeType !== 'string' || !mimeType) return null;
	return mimeType.startsWith('image/')
		? { type: 'image', data, mimeType }
		: { type: 'file', data, mimeType };
}

function toContentItem(item: unknown): ToolContentItem | null {
	if (!isRecord(item)) return null;
	switch (item.type) {
		case 'text':
			return typeof item.text === 'string'
				? { type: 'text', text: unwrapUntrustedText(item.text) }
				: null;
		// MCP image content
		case 'image':
			return binaryItem(item.data, item.mimeType);
		// MCP embedded resource with binary data
		case 'resource':
			return isRecord(item.resource)
				? binaryItem(item.resource.blob, item.resource.mimeType)
				: null;
		// AI SDK tool output parts
		case 'file':
			return isRecord(item.data) && item.data.type === 'data'
				? binaryItem(item.data.data, item.mediaType)
				: null;
		case 'media':
		case 'file-data':
		case 'image-data':
			return binaryItem(item.data, item.mediaType);
		default:
			return null;
	}
}

function contentParts(value: unknown): unknown[] | null {
	if (!isRecord(value)) return null;
	// AI SDK tool output, as the agents runtime stores it
	if (value.type === 'content' && Array.isArray(value.value)) return value.value;
	// MCP tool result
	if (Array.isArray(value.content)) return value.content;
	return null;
}

/**
 * Returns the parts of a tool result made of content parts, such as text and
 * images from an MCP tool. Returns `null` when the value has another shape, or
 * when a part has an unknown type, so that the caller shows the raw value.
 */
export function extractToolContent(value: unknown): ToolContentItem[] | null {
	const parts = contentParts(value);
	if (!parts || parts.length === 0) return null;
	const items: ToolContentItem[] = [];
	for (const part of parts) {
		const item = toContentItem(part);
		if (!item) return null;
		items.push(item);
	}
	return items;
}

/** A download name for a file part, with an extension when its MIME type gives a simple one. */
export function toolContentFileName(mimeType: string): string {
	const subtype = mimeType.split(';')[0].split('/')[1]?.trim().toLowerCase() ?? '';
	return /^[a-z0-9]{1,5}$/.test(subtype) ? `tool-file.${subtype}` : 'tool-file';
}
