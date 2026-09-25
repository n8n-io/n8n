import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

import { extractImagesFromObservation, injectToolResultImages } from '../toolResultImages';

const PNG_BASE64_1X1 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function mcpImageBlock(overrides: Partial<{ data: string; mimeType: string }> = {}) {
	return {
		type: 'image' as const,
		data: overrides.data ?? PNG_BASE64_1X1,
		mimeType: overrides.mimeType ?? 'image/png',
	};
}

// The real shape n8n's MCP runtime produces for a V3 agent tool call: runToolCall()
// (packages/@n8n/nodes-langchain/nodes/mcp/shared/runtime.ts) sets item.json to
// `{ response: result.content }`, where result.content is the already-parsed MCP
// content array (validated by CallToolResultSchema, never a JSON string); buildSteps.ts
// then JSON.stringify()s an array of these items exactly once. So the true observation
// is single-encoded and wraps each tool's content in an outer array + `response` key,
// not a bare top-level image block.
function realMcpEnvelope(...blocks: unknown[]): string {
	return JSON.stringify([{ response: blocks }]);
}

describe('extractImagesFromObservation', () => {
	it('returns undefined for non-JSON observations', () => {
		expect(extractImagesFromObservation('not json')).toBeUndefined();
	});

	it('extracts an image from the real n8n MCP tool-call envelope shape', () => {
		const observation = realMcpEnvelope(
			{ type: 'text', text: 'Screenshot attached' },
			mcpImageBlock(),
		);
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(1);
		expect(result.images[0]).toEqual({ mimeType: 'image/png', data: PNG_BASE64_1X1 });
		expect(result.text).not.toContain(PNG_BASE64_1X1);
		expect(result.text).toContain('Screenshot attached');
	});

	it('omits an unsupported image format (e.g. svg) instead of forwarding it to the model', () => {
		const observation = JSON.stringify(mcpImageBlock({ mimeType: 'image/svg+xml' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(0);
		expect(result.omitted).toBe(1);
		expect(result.text).toContain('unsupported image format');
	});

	it('omits an image block with empty data instead of forwarding a broken data URL', () => {
		const observation = JSON.stringify(mcpImageBlock({ data: '' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(0);
		expect(result.omitted).toBe(1);
		expect(result.text).toContain('empty image data');
	});

	it.each(['image/jpeg', 'image/gif', 'image/webp'])('accepts %s', (mimeType) => {
		const observation = JSON.stringify(mcpImageBlock({ mimeType }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(1);
	});

	it('normalizes mime type casing: "image/PNG" is accepted like "image/png"', () => {
		const observation = JSON.stringify(mcpImageBlock({ mimeType: 'image/PNG' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(1);
		expect(result.images[0].mimeType).toBe('image/png');
	});

	it('rejects an unsupported format regardless of casing (e.g. "Image/SVG+XML")', () => {
		const observation = JSON.stringify(mcpImageBlock({ mimeType: 'Image/SVG+XML' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(0);
		expect(result.omitted).toBe(1);
	});

	it('trims whitespace around the mime type before checking it', () => {
		const observation = JSON.stringify(mcpImageBlock({ mimeType: ' image/png ' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(1);
		expect(result.images[0].mimeType).toBe('image/png');
	});

	it('omits a data-URI-prefix-only payload (no base64 after the prefix) as empty, not as a broken data URL', () => {
		const observation = JSON.stringify(mcpImageBlock({ data: 'data:image/png;base64,' }));
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(0);
		expect(result.omitted).toBe(1);
		expect(result.text).toContain('empty image data');
	});

	it('preserves an own "__proto__" JSON key instead of silently dropping it via prototype reassignment', () => {
		// Built from a raw JSON string, not a JS object literal: `{__proto__: x}` as
		// object-literal syntax sets the prototype (no own property is created at
		// all), which would make this test pass for the wrong reason. JSON.parse of
		// the same text creates a genuine own data property named "__proto__" —
		// that's the shape a tool's JSON response actually has.
		const observation =
			'{"__proto__":{"note":"own field"},"screenshot":' +
			JSON.stringify(mcpImageBlock()) +
			'}';
		const result = extractImagesFromObservation(observation)!;

		expect(result.images).toHaveLength(1);
		const roundTripped = JSON.parse(result.text) as Record<string, unknown>;
		expect(Object.prototype.hasOwnProperty.call(roundTripped, '__proto__')).toBe(true);
		expect((roundTripped as { __proto__: unknown }).__proto__).toEqual({ note: 'own field' });
	});

	it('returns undefined for a plain scalar JSON value', () => {
		expect(extractImagesFromObservation('"just a string"')).toBeUndefined();
		expect(extractImagesFromObservation('42')).toBeUndefined();
	});

	it('returns undefined when there is no image block', () => {
		const observation = JSON.stringify({ status: 'ok', rows: [{ a: 1 }] });
		expect(extractImagesFromObservation(observation)).toBeUndefined();
	});

	it('extracts a single top-level image block', () => {
		const observation = JSON.stringify(mcpImageBlock());
		const result = extractImagesFromObservation(observation);

		expect(result).toBeDefined();
		expect(result!.images).toHaveLength(1);
		expect(result!.images[0]).toEqual({ mimeType: 'image/png', data: PNG_BASE64_1X1 });
		expect(result!.omitted).toBe(0);
		// The base64 payload must not survive into the replacement text.
		expect(result!.text).not.toContain(PNG_BASE64_1X1);
	});

	it('extracts an image block nested inside wrapper objects/arrays', () => {
		const observation = JSON.stringify({
			response: [{ content: [{ type: 'text', text: 'here is the screenshot' }, mcpImageBlock()] }],
		});
		const result = extractImagesFromObservation(observation);

		expect(result).toBeDefined();
		expect(result!.images).toHaveLength(1);
		expect(result!.text).toContain('here is the screenshot');
		expect(result!.text).not.toContain(PNG_BASE64_1X1);
	});

	it('omits an oversized image and reports it, without a note leaking base64', () => {
		// 4 base64 chars decode to 3 bytes; use a payload comfortably over a 1-byte cap.
		const observation = JSON.stringify(mcpImageBlock({ data: PNG_BASE64_1X1 }));
		const result = extractImagesFromObservation(observation, { maxImageBytes: 1 });

		expect(result).toBeDefined();
		expect(result!.images).toHaveLength(0);
		expect(result!.omitted).toBe(1);
		expect(result!.text).toContain('omitted');
		expect(result!.text).not.toContain(PNG_BASE64_1X1);
	});

	it('keeps images within the size cap', () => {
		const observation = JSON.stringify(mcpImageBlock());
		const result = extractImagesFromObservation(observation, { maxImageBytes: 10 * 1024 * 1024 });

		expect(result!.images).toHaveLength(1);
		expect(result!.omitted).toBe(0);
	});

	it('handles an empty object/array observation as "no images"', () => {
		expect(extractImagesFromObservation('{}')).toBeUndefined();
		expect(extractImagesFromObservation('[]')).toBeUndefined();
	});

	it('handles a tool-error style observation as "no images"', () => {
		const observation = JSON.stringify({ error: true, message: 'Jira API returned 404' });
		expect(extractImagesFromObservation(observation)).toBeUndefined();
	});

	it('extracts multiple images from a single observation', () => {
		const observation = JSON.stringify({ images: [mcpImageBlock(), mcpImageBlock()] });
		const result = extractImagesFromObservation(observation);

		expect(result!.images).toHaveLength(2);
	});
});

describe('injectToolResultImages', () => {
	it('leaves messages with no tool images untouched', () => {
		const messages = [
			new HumanMessage('hi'),
			new AIMessage('hello'),
			new ToolMessage({ content: 'plain text result', tool_call_id: 'call_1' }),
		];
		const result = injectToolResultImages(messages);

		expect(result).toHaveLength(3);
		expect(result[2]).toBe(messages[2]);
	});

	it('inserts a HumanMessage with image_url content right after a single image ToolMessage', () => {
		const toolMessage = new ToolMessage({
			content: JSON.stringify(mcpImageBlock()),
			tool_call_id: 'call_1',
			name: 'jira_get_issue_images',
		});
		const messages = [new AIMessage({ content: '', tool_calls: [] }), toolMessage];
		const result = injectToolResultImages(messages);

		expect(result).toHaveLength(3);
		// The ToolMessage itself stays text-only (no base64 leaked into it).
		const rewrittenTool = result[1] as ToolMessage;
		expect(rewrittenTool).toBeInstanceOf(ToolMessage);
		expect(typeof rewrittenTool.content).toBe('string');
		expect(rewrittenTool.content as string).not.toContain(PNG_BASE64_1X1);
		expect(rewrittenTool.tool_call_id).toBe('call_1');
		expect(rewrittenTool.name).toBe('jira_get_issue_images');

		// The synthetic HumanMessage carries the actual image content.
		const injected = result[2] as HumanMessage;
		expect(injected).toBeInstanceOf(HumanMessage);
		const blocks = injected.content as Array<Record<string, unknown>>;
		const imageBlock = blocks.find((b) => b.type === 'image_url') as
			| { image_url: { url: string } }
			| undefined;
		expect(imageBlock).toBeDefined();
		expect(imageBlock!.image_url.url).toBe(`data:image/png;base64,${PNG_BASE64_1X1}`);
	});

	it('groups images from parallel tool calls into a single trailing HumanMessage', () => {
		const toolMessageWithImage = new ToolMessage({
			content: JSON.stringify(mcpImageBlock()),
			tool_call_id: 'call_1',
		});
		const toolMessageNoImage = new ToolMessage({
			content: JSON.stringify({ status: 'ok' }),
			tool_call_id: 'call_2',
		});
		const messages = [
			new AIMessage({ content: '', tool_calls: [] }),
			toolMessageWithImage,
			toolMessageNoImage,
		];
		const result = injectToolResultImages(messages);

		// AIMessage, 2 ToolMessages (still grouped together, unbroken), then 1 synthetic HumanMessage.
		expect(result).toHaveLength(4);
		expect(result[1]).toBeInstanceOf(ToolMessage);
		expect(result[2]).toBeInstanceOf(ToolMessage);
		expect(result[3]).toBeInstanceOf(HumanMessage);
	});

	it('does not mistake a text ToolMessage that merely contains the word "image" for an image block', () => {
		const toolMessage = new ToolMessage({
			content: JSON.stringify({ note: 'no image attached to this ticket' }),
			tool_call_id: 'call_1',
		});
		const result = injectToolResultImages([toolMessage]);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(toolMessage);
	});

	it('leaves a ToolMessage with already-structured (non-string) content untouched', () => {
		const toolMessage = new ToolMessage({
			content: [{ type: 'text', text: 'already structured' }],
			tool_call_id: 'call_1',
		});
		const result = injectToolResultImages([toolMessage]);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(toolMessage);
	});

	it('respects maxImageBytes when injecting', () => {
		const toolMessage = new ToolMessage({
			content: JSON.stringify(mcpImageBlock()),
			tool_call_id: 'call_1',
		});
		const result = injectToolResultImages([toolMessage], { maxImageBytes: 1 });

		// No image survived the cap, so no synthetic HumanMessage should be added.
		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(ToolMessage);
	});
});
