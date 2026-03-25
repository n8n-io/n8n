import { BaseContentBlock } from "./base.cjs";

//#region src/messages/content/data.d.ts
/**
 * @deprecated
 * Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
type ImageDetail = "auto" | "low" | "high";
/**
 * @deprecated
 * Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
type MessageContentText = {
  type: "text";
  text: string;
};
/**
 * @deprecated
 * Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | {
    url: string;
    detail?: ImageDetail;
  };
};
/**
 * @deprecated
 * Use {@link ContentBlock} instead.
 */
type MessageContentComplex = MessageContentText | MessageContentImageUrl | (Record<string, any> & {
  type?: "text" | "image_url" | string;
}) | (Record<string, any> & {
  type?: never;
});
type Data = never;
declare namespace Data {
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  interface BaseDataContentBlock extends BaseContentBlock {
    mime_type?: string;
    metadata?: Record<string, unknown>;
  }
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  interface URLContentBlock extends BaseDataContentBlock {
    type: "image" | "audio" | "file";
    source_type: "url";
    url: string;
  }
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  interface Base64ContentBlock extends BaseDataContentBlock {
    type: "image" | "audio" | "file";
    source_type: "base64";
    data: string;
  }
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  interface PlainTextContentBlock extends BaseDataContentBlock {
    type: "file" | "text";
    source_type: "text";
    text: string;
  }
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  interface IDContentBlock extends BaseDataContentBlock {
    type: "image" | "audio" | "file";
    source_type: "id";
    id: string;
  }
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Standard} instead
   */
  type DataContentBlock = URLContentBlock | Base64ContentBlock | PlainTextContentBlock | IDContentBlock;
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Standard} instead
   */
  type StandardImageBlock = (URLContentBlock | Base64ContentBlock | IDContentBlock) & {
    type: "image";
  };
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Standard} instead
   */
  type StandardAudioBlock = (URLContentBlock | Base64ContentBlock | IDContentBlock) & {
    type: "audio";
  };
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Standard} instead
   */
  type StandardFileBlock = (URLContentBlock | Base64ContentBlock | IDContentBlock | PlainTextContentBlock) & {
    type: "file";
  };
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Standard} instead
   */
  type StandardTextBlock = PlainTextContentBlock & {
    type: "text";
  };
  /**
   * @deprecated
   * Use {@link ContentBlock.Multimodal.Data} instead
   */
  type DataContentBlockType = DataContentBlock["type"];
}
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function isDataContentBlock(content_block: object): content_block is Data.DataContentBlock;
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function isURLContentBlock(content_block: object): content_block is Data.URLContentBlock;
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function isBase64ContentBlock(content_block: object): content_block is Data.Base64ContentBlock;
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function isPlainTextContentBlock(content_block: object): content_block is Data.PlainTextContentBlock;
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function isIDContentBlock(content_block: object): content_block is Data.IDContentBlock;
/**
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function convertToOpenAIImageBlock(content_block: Data.URLContentBlock | Data.Base64ContentBlock): {
  type: string;
  image_url: {
    url: string;
  };
};
/**
 * Utility function for ChatModelProviders. Parses a mime type into a type, subtype, and parameters.
 *
 * @param mime_type - The mime type to parse.
 * @returns An object containing the type, subtype, and parameters.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function parseMimeType(mime_type: string): {
  type: string;
  subtype: string;
  parameters: Record<string, string>;
};
/**
 * Utility function for ChatModelProviders. Parses a base64 data URL into a typed array or string.
 *
 * @param dataUrl - The base64 data URL to parse.
 * @param asTypedArray - Whether to return the data as a typed array.
 * @returns An object containing the parsed data and mime type, or undefined if the data URL is invalid.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function parseBase64DataUrl({
  dataUrl,
  asTypedArray
}: {
  dataUrl: string;
  asTypedArray: true;
}): {
  data: Uint8Array;
  mime_type: string;
} | undefined;
/**
 * Utility function for ChatModelProviders. Parses a base64 data URL into a typed array or string.
 *
 * @param dataUrl - The base64 data URL to parse.
 * @param asTypedArray - Whether to return the data as a typed array.
 * @returns The parsed data and mime type, or undefined if the data URL is invalid.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function parseBase64DataUrl({
  dataUrl,
  asTypedArray
}: {
  dataUrl: string;
  asTypedArray?: false;
}): {
  data: string;
  mime_type: string;
} | undefined;
/**
 * A bag of provider-specific content block types.
 *
 * Allows implementations of {@link StandardContentBlockConverter} and related to be defined only in
 * terms of the types they support. Also allows for forward compatibility as the set of known
 * standard types grows, as the set of types can be extended without breaking existing
 * implementations of the aforementioned interfaces.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
type ProviderFormatTypes<TextFormat = unknown, ImageFormat = unknown, AudioFormat = unknown, FileFormat = unknown, VideoFormat = unknown> = {
  text: TextFormat;
  image: ImageFormat;
  audio: AudioFormat;
  file: FileFormat;
  video: VideoFormat;
};
/**
 * Utility interface for converting between standard and provider-specific data content blocks, to be
 * used when implementing chat model providers.
 *
 * Meant to be used with {@link convertToProviderContentBlock} and
 * {@link convertToStandardContentBlock} rather than being consumed directly.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
interface StandardContentBlockConverter<Formats extends Partial<ProviderFormatTypes>> {
  /**
   * The name of the provider type that corresponds to the provider-specific content block types
   * that this converter supports.
   */
  providerName: string;
  /**
   * Convert from a standard image block to a provider's proprietary image block format.
   * @param block - The standard image block to convert.
   * @returns The provider image block.
   */
  fromStandardImageBlock?(block: Data.StandardImageBlock): Formats["image"];
  /**
   * Convert from a standard audio block to a provider's proprietary audio block format.
   * @param block - The standard audio block to convert.
   * @returns The provider audio block.
   */
  fromStandardAudioBlock?(block: Data.StandardAudioBlock): Formats["audio"];
  /**
   * Convert from a standard file block to a provider's proprietary file block format.
   * @param block - The standard file block to convert.
   * @returns The provider file block.
   */
  fromStandardFileBlock?(block: Data.StandardFileBlock): Formats["file"];
  /**
   * Convert from a standard text block to a provider's proprietary text block format.
   * @param block - The standard text block to convert.
   * @returns The provider text block.
   */
  fromStandardTextBlock?(block: Data.StandardTextBlock): Formats["text"];
}
/**
 * Convert from a standard data content block to a provider's proprietary data content block format.
 *
 * Don't override this method. Instead, override the more specific conversion methods and use this
 * method unmodified.
 *
 * @param block - The standard data content block to convert.
 * @returns The provider data content block.
 * @throws An error if the standard data content block type is not supported.
 *
 * @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
 */
declare function convertToProviderContentBlock<Formats extends Partial<ProviderFormatTypes>>(block: Data.DataContentBlock, converter: StandardContentBlockConverter<Formats>): Formats[keyof Formats];
//#endregion
export { Data, ImageDetail, MessageContentComplex, MessageContentImageUrl, MessageContentText, ProviderFormatTypes, StandardContentBlockConverter, convertToOpenAIImageBlock, convertToProviderContentBlock, isBase64ContentBlock, isDataContentBlock, isIDContentBlock, isPlainTextContentBlock, isURLContentBlock, parseBase64DataUrl, parseMimeType };
//# sourceMappingURL=data.d.cts.map