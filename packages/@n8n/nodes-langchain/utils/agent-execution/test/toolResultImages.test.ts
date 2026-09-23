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

describe('extractImagesFromObservation', () => {
	it('returns undefined for non-JSON observations', () => {
		expect(extractImagesFromObservation('not json')).toBeUndefined();
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
