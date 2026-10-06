import { OperationalError, parse, path, t, type JsonSchema } from '@n8n/node-sdk';

import { image } from '../open-ai.node';

const open: JsonSchema = { additionalProperties: true };

const imagesSchema = t
	.obj({
		data: t.arr(t.obj({ b64_json: t.str(), revised_prompt: t.str().optional() }).with(open)),
	})
	.with(open);

const bytesOf = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

export const generateImage = image.action('generate', {
	action: 'Generate an image',
	summary: 'Create images from a text prompt with an OpenAI image model.',
	flow: { effect: 'read', cardinality: '1:N' },
	input: {
		// The model catalog lists text models only, so the image models are a fixed list.
		model: t.oneOf('gpt-image-1', 'gpt-image-1-mini', 'dall-e-3', 'dall-e-2'),
		prompt: t.str().with({ minLength: 1 }),
		count: t
			.int()
			.with({ minimum: 1, maximum: 10 })
			.optional()
			.hint('Images to create, 1 when unset'),
		size: t
			.oneOf(
				'auto',
				'1024x1024',
				'1536x1024',
				'1024x1536',
				'256x256',
				'512x512',
				'1792x1024',
				'1024x1792',
			)
			.optional()
			.hint('Square: 1024x1024. dall-e-2 takes up to 1024x1024 only'),
		quality: t
			.oneOf('auto', 'high', 'medium', 'low', 'hd', 'standard')
			.optional()
			.hint('gpt-image: auto|high|medium|low; dall-e-3: hd|standard'),
		style: t.oneOf('vivid', 'natural').optional().hint('dall-e-3 only'),
	},
	output: t.obj({
		data: t.binary().hint('The image as PNG'),
		revisedPrompt: t.str().optional().hint('The prompt the model used, dall-e-3 only'),
	}),
	async *run({ input, http, binary: files }) {
		// gpt-image models always return base64 and reject `response_format`.
		const isGptImage = input.model.startsWith('gpt-image');
		const body = await http.request({
			method: 'POST',
			path: path`/images/generations`,
			body: {
				model: input.model,
				prompt: input.prompt,
				n: input.count,
				size: input.size,
				quality: input.quality,
				style: input.style,
				response_format: isGptImage ? undefined : 'b64_json',
			},
		});
		for (const { b64_json: base64, revised_prompt: revised } of parse(imagesSchema, body).data ??
			[]) {
			if (!base64) throw new OperationalError('OpenAI gave an image without data');
			const data = await files.create({ mimeType: 'image/png', fileName: 'data' }, [
				bytesOf(base64),
			]);
			yield { data, ...(typeof revised === 'string' ? { revisedPrompt: revised } : {}) };
		}
	},
});
