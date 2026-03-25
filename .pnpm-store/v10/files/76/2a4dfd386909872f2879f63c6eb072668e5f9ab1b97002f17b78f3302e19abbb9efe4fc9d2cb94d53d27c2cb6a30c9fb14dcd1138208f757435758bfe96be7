import { OpenAI as OpenAI$1 } from "openai";
import { MessageContentComplex } from "@langchain/core/messages";
import { Tool, ToolParams } from "@langchain/core/tools";

//#region src/tools/dalle.d.ts

/**
 * @see https://platform.openai.com/docs/api-reference/images/create
 */
type OpenAIImageModelId = OpenAI$1.ImageModel | (string & NonNullable<unknown>);
/**
 * An interface for the Dall-E API Wrapper.
 */
interface DallEAPIWrapperParams extends ToolParams {
  /**
   * The OpenAI API key
   * Alias for `apiKey`
   */
  openAIApiKey?: string;
  /**
   * The OpenAI API key
   */
  apiKey?: string;
  /**
   * The model to use.
   * Alias for `model`
   * @params "dall-e-2" | "dall-e-3"
   * @default "dall-e-3"
   * @deprecated Use `model` instead.
   */
  modelName?: OpenAIImageModelId;
  /**
   * The model to use.
   * @params "dall-e-2" | "dall-e-3"
   * @default "dall-e-3"
   */
  model?: OpenAIImageModelId;
  /**
   * The style of the generated images. Must be one of vivid or natural.
   * Vivid causes the model to lean towards generating hyper-real and dramatic images.
   * Natural causes the model to produce more natural, less hyper-real looking images.
   * @default "vivid"
   */
  style?: "natural" | "vivid";
  /**
   * The quality of the image that will be generated. ‘hd’ creates images with finer
   * details and greater consistency across the image.
   * @default "standard"
   */
  quality?: "standard" | "hd";
  /**
   * The number of images to generate.
   * Must be between 1 and 10.
   * For dall-e-3, only `n: 1` is supported.
   * @default 1
   */
  n?: number;
  /**
   * The size of the generated images.
   * Must be one of 256x256, 512x512, or 1024x1024 for DALL·E-2 models.
   * Must be one of 1024x1024, 1792x1024, or 1024x1792 for DALL·E-3 models.
   * @default "1024x1024"
   */
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  /**
   * The format in which the generated images are returned.
   * Must be one of "url" or "b64_json".
   * @default "url"
   */
  dallEResponseFormat?: "url" | "b64_json";
  /**
   * @deprecated Use dallEResponseFormat instead for the Dall-E response type.
   */
  responseFormat?: any;
  /**
   * A unique identifier representing your end-user, which will help
   * OpenAI to monitor and detect abuse.
   */
  user?: string;
  /**
   * The organization to use
   */
  organization?: string;
  /**
   * The base URL of the OpenAI API.
   */
  baseUrl?: string;
}
/**
 * A tool for generating images with Open AIs Dall-E 2 or 3 API.
 */
declare class DallEAPIWrapper extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected client: OpenAI$1;
  static readonly toolName = "dalle_api_wrapper";
  private model;
  private style;
  private quality;
  private n;
  private size;
  private dallEResponseFormat;
  private user?;
  constructor(fields?: DallEAPIWrapperParams);
  /**
   * Processes the API response if multiple images are generated.
   * Returns a list of MessageContentImageUrl objects. If the response
   * format is `url`, then the `image_url` field will contain the URL.
   * If it is `b64_json`, then the `image_url` field will contain an object
   * with a `url` field with the base64 encoded image.
   *
   * @param {OpenAIClient.Images.ImagesResponse[]} response The API response
   * @returns {MessageContentImageUrl[]}
   */
  private processMultipleGeneratedUrls;
  /** @ignore */
  _call(input: string): Promise<string | MessageContentComplex[]>;
}
//#endregion
export { DallEAPIWrapper, DallEAPIWrapperParams, OpenAIImageModelId };
//# sourceMappingURL=dalle.d.ts.map