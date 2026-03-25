import { BaseContentBlock } from "./base.cjs";

//#region ../langchain-core/dist/messages/content/data.d.ts

type Data = never;
// eslint-disable-next-line @typescript-eslint/no-namespace
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
//#endregion
export { Data };
//# sourceMappingURL=data.d.cts.map