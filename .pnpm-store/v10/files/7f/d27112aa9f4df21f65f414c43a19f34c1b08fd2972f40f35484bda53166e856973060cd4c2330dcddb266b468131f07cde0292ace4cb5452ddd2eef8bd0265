import type { TextToImageInput } from "@huggingface/tasks";
import type { BaseArgs, Options, OutputType } from "../../types.js";
export type TextToImageArgs = BaseArgs & TextToImageInput;
interface TextToImageOptions extends Options {
    outputType?: OutputType;
}
/**
 * This task reads some text input and outputs an image.
 * Recommended model: stabilityai/stable-diffusion-2
 */
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType: "url";
}): Promise<string>;
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType: "dataUrl";
}): Promise<string>;
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType?: undefined | "blob";
}): Promise<Blob>;
export declare function textToImage(args: TextToImageArgs, options?: TextToImageOptions & {
    outputType?: undefined | "json";
}): Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=textToImage.d.ts.map