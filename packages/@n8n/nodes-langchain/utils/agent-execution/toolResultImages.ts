import { HumanMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';

/**
 * A single image extracted from a tool result, ready to be attached to a
 * follow-up HumanMessage as a standard `image_url` content block.
 */
export interface ExtractedToolImage {
	mimeType: string;
	/** Raw base64 payload, without a `data:...;base64,` prefix. */
	data: string;
}

export interface ExtractedToolImages {
	/**
	 * The tool result, re-serialized with every image block replaced by a short
	 * text note. Safe to use as `ToolMessage.content` for providers that only
	 * accept text in tool-role messages (e.g. the OpenAI Chat Completions API).
	 */
	text: string;
	images: ExtractedToolImage[];
	/** Images found but skipped for exceeding `maxImageBytes`. */
	omitted: number;
}

export interface ToolResultImageOptions {
	/**
	 * Images larger than this (decoded byte size) are dropped and replaced with
	 * a note instead of being attached, so one oversized attachment can't fail
	 * the whole agent run. Left undefined, extraction/injection accepts any
	 * size — callers that care about a limit (e.g. the ToolsAgent, which reuses
	 * the same cap as binary passthrough) should pass one explicitly.
	 */
	maxImageBytes?: number;
}

// MCP tool results can nest the image block(s) inside wrapper objects (e.g. an
// n8n MCP Client Tool node's `{ response: [...] }` envelope), so the block is
// searched for recursively rather than assumed to be top-level. The depth cap
// exists only to bound pathological input; realistic tool results are 2-3
// levels deep at most.
const MAX_SCAN_DEPTH = 8;

// Formats providers actually accept in an `image_url` data URL. `startsWith('image/')`
// alone would also match svg/tiff/bmp/heic — those are valid MCP image blocks but get
// rejected by the model API (a 400 that fails the *entire* agent run, not just the one
// attachment), so unsupported formats are treated as absent images, not real ones.
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
]);

interface McpImageBlock {
	type: 'image';
	data: string;
	mimeType: string;
}

// MIME type tokens are case-insensitive (RFC 2045) — an MCP server is free to send
// "image/PNG" or "Image/Png" and it means the same thing as "image/png". Every check
// against a mime type (the structural `image/` prefix check below, and the
// SUPPORTED_IMAGE_MIME_TYPES whitelist in extractImagesFromValue) normalizes through
// this first so casing can't cause a valid image to be missed or misclassified.
// The trim() is the same defense against the same failure mode: a server that pads
// the value with whitespace (" image/png") would otherwise fail the structural
// `image/` prefix check entirely, and the image would fall back to the original bug
// this file exists to fix — silent, undetected base64 text in the ToolMessage.
function normalizeMimeType(mimeType: string): string {
	return mimeType.trim().toLowerCase();
}

// Structural check only: is this shaped like an MCP image content block at all.
// Whether it's actually safe to forward to a model (supported mime type,
// non-empty data) is decided separately in extractImagesFromValue, so an
// unsupported-format block is still recognized (and replaced with a clear
// note) rather than silently passed through as opaque JSON.
function isMcpImageBlock(value: unknown): value is McpImageBlock {
	if (value === null || typeof value !== 'object') return false;
	const block = value as Record<string, unknown>;
	return (
		block.type === 'image' &&
		typeof block.data === 'string' &&
		typeof block.mimeType === 'string' &&
		normalizeMimeType(block.mimeType).startsWith('image/')
	);
}

function stripDataUriPrefix(data: string): string {
	return data.includes('base64,') ? data.split('base64,')[1] : data;
}

// Decoded-byte-length estimate for a base64 string, without materializing a
// Buffer for data we may end up discarding anyway.
function estimateDecodedBytes(base64: string): number {
	const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
	return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Recursively walks a parsed tool-result value, replacing every MCP-style
 * image content block ({type: 'image', data, mimeType}) with a short text
 * note and collecting the removed images as a side effect.
 */
function extractImagesFromValue(
	value: unknown,
	depth: number,
	collected: ExtractedToolImage[],
	maxImageBytes: number | undefined,
	state: { omitted: number },
): unknown {
	if (depth > MAX_SCAN_DEPTH) return value;

	if (isMcpImageBlock(value)) {
		const normalizedMimeType = normalizeMimeType(value.mimeType);
		// Strip any `data:...;base64,` prefix before checking for emptiness: a
		// payload that's only that prefix (no actual base64 after it) decodes to
		// an empty string post-strip even though `value.data` itself is non-empty
		// — checking the raw field would miss that and forward a broken data URL.
		const raw = stripDataUriPrefix(value.data);
		if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalizedMimeType) || raw.length === 0) {
			// Not a size problem — a format models reject outright (svg/tiff/bmp/heic/...)
			// or an empty payload. Forwarding it would 400 the whole agent run, so treat
			// it the same as "omitted", just with a note that says why.
			state.omitted++;
			return {
				type: 'image',
				note:
					raw.length === 0
						? 'image omitted: empty image data'
						: `image omitted: unsupported image format "${value.mimeType}"`,
			};
		}

		if (maxImageBytes !== undefined && estimateDecodedBytes(raw) > maxImageBytes) {
			state.omitted++;
			return {
				type: 'image',
				note: `image omitted: exceeds the ${(maxImageBytes / (1024 * 1024)).toFixed(1)} MB passthrough limit`,
			};
		}
		// Store the normalized mime type so the data-URL builder in
		// buildToolImageHumanMessage doesn't need to normalize it again.
		collected.push({ mimeType: normalizedMimeType, data: raw });
		return { type: 'image', note: 'image attached to the model as a separate message' };
	}

	if (Array.isArray(value)) {
		return value.map((item) =>
			extractImagesFromValue(item, depth + 1, collected, maxImageBytes, state),
		);
	}

	if (value !== null && typeof value === 'object') {
		// A null-prototype object, not `{}`: a tool result with its own `__proto__`
		// JSON key would otherwise reassign this clone's prototype instead of
		// setting an own property, silently dropping that key from the
		// JSON.stringify output below.
		const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
		for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
			out[key] = extractImagesFromValue(item, depth + 1, collected, maxImageBytes, state);
		}
		return out;
	}

	return value;
}

/**
 * Looks for MCP-style image content blocks inside a tool's observation text
 * (the JSON-stringified tool result n8n's `buildObservation` produces) and,
 * if any are found, returns the observation with the raw base64 replaced by
 * short notes plus the extracted images themselves.
 *
 * Returns undefined when the observation isn't JSON, isn't an object/array,
 * or contains no image blocks — callers should leave those tool messages
 * untouched.
 */
export function extractImagesFromObservation(
	observation: string,
	options: ToolResultImageOptions = {},
): ExtractedToolImages | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(observation);
	} catch {
		return undefined;
	}
	if (parsed === null || typeof parsed !== 'object') return undefined;

	const images: ExtractedToolImage[] = [];
	const state = { omitted: 0 };
	const replaced = extractImagesFromValue(parsed, 0, images, options.maxImageBytes, state);

	if (images.length === 0 && state.omitted === 0) return undefined;

	return { text: JSON.stringify(replaced), images, omitted: state.omitted };
}

function buildToolImageHumanMessage(images: ExtractedToolImage[]): HumanMessage {
	return new HumanMessage({
		content: [
			{
				type: 'text',
				text:
					images.length === 1
						? 'Image returned by the tool call above (tool output, not a new user message):'
						: `${images.length} images returned by the tool call(s) above (tool output, not a new user message):`,
			},
			...images.map((image) => ({
				type: 'image_url',
				image_url: { url: `data:${image.mimeType};base64,${image.data}` },
			})),
		],
	});
}

/**
 * Rebuilds a `ToolMessage` with its content replaced, preserving every other
 * field a downstream provider integration might rely on (tool_call_id, name,
 * status, id, artifact, ...). Constructing a fresh instance rather than
 * mutating `.content` in place keeps this safe even if BaseMessage fields are
 * read-only in a given LangChain version.
 */
function withReplacedContent(message: ToolMessage, content: string): ToolMessage {
	return new ToolMessage({
		content,
		tool_call_id: message.tool_call_id,
		name: message.name,
		status: message.status,
		artifact: message.artifact,
		id: message.id,
		additional_kwargs: message.additional_kwargs,
		response_metadata: message.response_metadata,
	});
}

/**
 * Post-processes a formatted message list (typically the agent_scratchpad
 * produced by LangChain's tool-calling agent) so that images returned inside
 * a tool result are usable by the model.
 *
 * Why this is necessary: OpenAI-compatible Chat Completions APIs only accept
 * plain text in role="tool" messages — multimodal content is only valid in
 * role="user" messages. A ToolMessage carrying a raw MCP image content block
 * (as produced by n8n's `buildObservation`) either gets silently flattened to
 * useless base64 text, or rejected outright, depending on the provider. This
 * function keeps the ToolMessage text-only (replacing image data with a short
 * note) and inserts a synthetic HumanMessage with proper `image_url` content
 * right after the run of ToolMessages the images came from — mirroring what
 * capable MCP-aware agent harnesses (e.g. Claude Code, opencode) do with the
 * same kind of tool result.
 *
 * The synthetic message is inserted after the *entire* run of consecutive
 * ToolMessages, not immediately after each one, because providers require
 * every tool response for a given assistant turn to stay grouped together
 * (OpenAI) or merged into a single message (Anthropic/Gemini parallel tool
 * calls) — splitting that run with an unrelated human turn breaks those
 * providers' message-sequencing rules.
 */
export function injectToolResultImages(
	messages: BaseMessage[],
	options: ToolResultImageOptions = {},
): BaseMessage[] {
	const result: BaseMessage[] = [];
	let pendingImages: ExtractedToolImage[] = [];

	const flushPendingImages = () => {
		if (pendingImages.length === 0) return;
		result.push(buildToolImageHumanMessage(pendingImages));
		pendingImages = [];
	};

	for (const message of messages) {
		if (!ToolMessage.isInstance(message) || typeof message.content !== 'string') {
			// A non-tool message (or a tool message with already-structured
			// content, which this function doesn't produce and won't second-guess)
			// ends the current run of tool results: flush any images gathered so
			// far before continuing.
			flushPendingImages();
			result.push(message);
			continue;
		}

		const extracted = extractImagesFromObservation(message.content, options);
		if (!extracted) {
			result.push(message);
			continue;
		}

		result.push(withReplacedContent(message, extracted.text));
		pendingImages.push(...extracted.images);
	}

	flushPendingImages();
	return result;
}
