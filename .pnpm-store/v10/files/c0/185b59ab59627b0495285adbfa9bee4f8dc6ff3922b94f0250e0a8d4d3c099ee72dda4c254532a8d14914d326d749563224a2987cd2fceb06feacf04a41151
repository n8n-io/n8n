import type { ModelData } from "../model-data.js";
/**
 * Minimal model data required for snippets.
 *
 * Add more fields as needed.
 */
export type ModelDataMinimal = Pick<ModelData, "id" | "pipeline_tag" | "mask_token" | "library_name" | "config" | "tags" | "inference">;
export declare const inferenceSnippetLanguages: readonly ["python", "js", "sh"];
export type InferenceSnippetLanguage = (typeof inferenceSnippetLanguages)[number];
export interface InferenceSnippet {
    language: InferenceSnippetLanguage;
    client: string;
    content: string;
}
//# sourceMappingURL=types.d.ts.map