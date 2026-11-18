import { UnexpectedError } from '@n8n/errors';

import type {
	CLIPTextModelWithProjection,
	CLIPVisionModelWithProjection,
	PreTrainedTokenizer,
	Processor,
	Tensor,
} from '@huggingface/transformers';

import { toSquareRgb } from './image-pixels';
import { cached, isVectorList, loadTransformers, normalize } from './runtime';

const CLIP_INPUT_SIZE = 224;

type VisionParts = { processor: Processor; model: CLIPVisionModelWithProjection };
type TextParts = { tokenizer: PreTrainedTokenizer; model: CLIPTextModelWithProjection };

const visionModels = new Map<string, Promise<VisionParts>>();
const textModels = new Map<string, Promise<TextParts>>();

async function getVision(modelId: string): Promise<VisionParts> {
	return await cached(visionModels, modelId, async () => {
		const { AutoProcessor, CLIPVisionModelWithProjection } = await loadTransformers();
		const [processor, model] = await Promise.all([
			AutoProcessor.from_pretrained(modelId),
			CLIPVisionModelWithProjection.from_pretrained(modelId, { dtype: 'q8', device: 'cpu' }),
		]);
		return { processor, model };
	});
}

async function getText(modelId: string): Promise<TextParts> {
	return await cached(textModels, modelId, async () => {
		const { AutoTokenizer, CLIPTextModelWithProjection } = await loadTransformers();
		const [tokenizer, model] = await Promise.all([
			AutoTokenizer.from_pretrained(modelId),
			CLIPTextModelWithProjection.from_pretrained(modelId, { dtype: 'q8', device: 'cpu' }),
		]);
		return { tokenizer, model };
	});
}

function toVectors(modelId: string, output: unknown): number[][] {
	const tensor =
		typeof output === 'object' && output !== null
			? (output as Record<string, Tensor | undefined>)
			: {};
	const list: unknown = (tensor.image_embeds ?? tensor.text_embeds)?.tolist();
	if (!isVectorList(list)) {
		throw new UnexpectedError(`Model "${modelId}" did not return embedding vectors`);
	}
	return list.map(normalize);
}

export async function embedImages(modelId: string, images: Buffer[]): Promise<number[][]> {
	const [{ processor, model }, { RawImage }] = await Promise.all([
		getVision(modelId),
		loadTransformers(),
	]);
	const vectors: number[][] = [];
	for (const buffer of images) {
		const { data, width, height } = await toSquareRgb(buffer, CLIP_INPUT_SIZE);
		const inputs: unknown = await processor(new RawImage(data, width, height, 3));
		vectors.push(...toVectors(modelId, await model(inputs as Record<string, Tensor>)));
	}
	return vectors;
}

export async function embedImageQueries(modelId: string, texts: string[]): Promise<number[][]> {
	const { tokenizer, model } = await getText(modelId);
	const inputs = tokenizer(texts, { padding: true, truncation: true });
	return toVectors(modelId, await model(inputs));
}
