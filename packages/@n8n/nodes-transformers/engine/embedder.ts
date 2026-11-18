import { UnexpectedError } from '@n8n/errors';

import type { FeatureExtractionPipeline } from '@huggingface/transformers';

import { cached, isVectorList, loadTransformers } from './runtime';

const BATCH_SIZE = 32;

const extractors = new Map<string, Promise<FeatureExtractionPipeline>>();

async function getExtractor(modelId: string): Promise<FeatureExtractionPipeline> {
	return await cached(extractors, modelId, async () => {
		const { pipeline } = await loadTransformers();
		return await pipeline('feature-extraction', modelId, { dtype: 'q8', device: 'cpu' });
	});
}

const withPrefix = (modelId: string, text: string) =>
	/(^|\/)(multilingual-)?e5-/i.test(modelId) ? `query: ${text}` : text;

export async function embedTexts(modelId: string, texts: string[]): Promise<number[][]> {
	const extractor = await getExtractor(modelId);
	const vectors: number[][] = [];
	for (let start = 0; start < texts.length; start += BATCH_SIZE) {
		const batch = texts.slice(start, start + BATCH_SIZE).map((text) => withPrefix(modelId, text));
		const output = await extractor(batch, { pooling: 'mean', normalize: true });
		const list: unknown = output.tolist();
		if (!isVectorList(list)) {
			throw new UnexpectedError(`Model "${modelId}" did not return embedding vectors`);
		}
		vectors.push(...list);
	}
	return vectors;
}
