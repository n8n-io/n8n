import type { TextToImageInput } from "@huggingface/tasks";
import type { BaseArgs, Options } from "../../types.js";
export type TextToImageArgs = BaseArgs & TextToImageInput;
interface TextToImageOptions extends Options {
    outputType?: "url" | "blob";
}
/**
 * This task reads some text input and outputs an image.
 * Recommended model: stabilityai/stable-diffusion-2
 */
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType: "url";
}): Promise<string>;
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType?: undefined | "blob";
}): Promise<Blob>;
export {};
//# sourceMappingURL=textToImage.d.ts.map