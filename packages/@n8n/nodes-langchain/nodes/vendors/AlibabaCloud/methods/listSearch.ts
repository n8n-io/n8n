import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { fetchModelCatalog, toModalitySet } from '../helpers/modelCatalog';

const TEXT = 'text';
const IMAGE = 'image';
const VIDEO = 'video';

/**
 * A model is eligible for an action when its input/output modalities are
 * compatible with what that action's operation actually sends and reads.
 *
 * `input` is derived from `request_modality`, `output` from `response_modality`.
 */
type ModalityPredicate = (input: Set<string>, output: Set<string>) => boolean;

function isOnly(modalities: Set<string>, modality: string): boolean {
	return modalities.size === 1 && modalities.has(modality);
}

/**
 * Text chat: the operation sends text and reads text back. Any model that
 * accepts text input and returns text-only output works — including the
 * multimodal flagships, which use their extra input modalities optionally.
 */
const isTextModel: ModalityPredicate = (input, output) => input.has(TEXT) && isOnly(output, TEXT);

/**
 * Image analysis (image → text): the operation sends an image and reads text,
 * so the model must accept image input and produce text-only output.
 */
const isImageAnalysisModel: ModalityPredicate = (input, output) =>
	input.has(IMAGE) && isOnly(output, TEXT);

/**
 * Image generation: the operation sends a text prompt and reads an image, so
 * the model must accept text input and produce image output.
 */
const isImageGenerationModel: ModalityPredicate = (input, output) =>
	input.has(TEXT) && output.has(IMAGE);

/**
 * Text-to-video: the operation sends only a text prompt, so the model must
 * accept text input and produce video output, and must not *require* image or
 * video input — those are image-to-video / video-editing models the operation
 * can't feed. Extra optional inputs (e.g. audio) are fine, so we check for the
 * absence of image/video rather than demanding text-only input.
 */
const isTextToVideoModel: ModalityPredicate = (input, output) =>
	output.has(VIDEO) && input.has(TEXT) && !input.has(IMAGE) && !input.has(VIDEO);

/**
 * Image-to-video: the operation sends an image (and optional prompt). The model
 * must accept image input and produce video output, but must not require video
 * input — that would be a video-editing model the operation can't feed.
 */
const isImageToVideoModel: ModalityPredicate = (input, output) =>
	input.has(IMAGE) && !input.has(VIDEO) && output.has(VIDEO);

async function baseModelSearch(
	this: ILoadOptionsFunctions,
	predicate: ModalityPredicate,
	filter?: string,
): Promise<INodeListSearchResult> {
	const models = await fetchModelCatalog.call(this);
	const lowerFilter = filter?.toLowerCase();

	const results: INodeListSearchItems[] = models
		.filter((model) => {
			if (!model.model) return false;
			const input = toModalitySet(model.inference_metadata?.request_modality);
			const output = toModalitySet(model.inference_metadata?.response_modality);
			if (!predicate(input, output)) return false;
			if (lowerFilter) {
				const name = model.name ?? model.model;
				return (
					model.model.toLowerCase().includes(lowerFilter) ||
					name.toLowerCase().includes(lowerFilter)
				);
			}
			return true;
		})
		.map((model) => ({
			name: model.name ?? model.model,
			value: model.model,
		}));

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results };
}

export async function textModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, isTextModel, filter);
}

export async function visionModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, isImageAnalysisModel, filter);
}

export async function imageGenerationModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, isImageGenerationModel, filter);
}

export async function textToVideoModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, isTextToVideoModel, filter);
}

export async function imageToVideoModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await baseModelSearch.call(this, isImageToVideoModel, filter);
}
