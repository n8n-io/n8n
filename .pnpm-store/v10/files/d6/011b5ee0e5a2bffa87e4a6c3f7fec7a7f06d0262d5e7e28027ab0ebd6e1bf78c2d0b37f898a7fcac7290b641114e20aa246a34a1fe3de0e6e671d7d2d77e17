import type { ModelData } from "../model-data.js";

/**
 * Minimal model data required for snippets.
 *
 * Add more fields as needed.
 */
export type ModelDataMinimal = Pick<
	ModelData,
	"id" | "pipeline_tag" | "mask_token" | "library_name" | "config" | "tags" | "inference"
>;

// Order of the elements in InferenceModal.svelte is determined by this const
export const inferenceSnippetLanguages = ["python", "js", "sh"] as const;
export type InferenceSnippetLanguage = (typeof inferenceSnippetLanguages)[number];

export interface InferenceSnippet {
	language: InferenceSnippetLanguage; // e.g. `python`, `curl`, `js`
	client: string; // e.g. `huggingface_hub`, `openai`, `fetch`, etc.
	content: string;
}
