import { sign } from "../../utils/tencent_hunyuan/common.js";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/tencent_hunyuan/base.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the TencentHunyuanEmbeddingsParams class.
 */
interface TencentHunyuanEmbeddingsParams extends EmbeddingsParams {
  /**
   * Tencent Cloud API Host.
   * @default "hunyuan.tencentcloudapi.com"
   */
  host?: string;
  /**
   * SecretID to use when making requests, can be obtained from https://console.cloud.tencent.com/cam/capi.
   * Defaults to the value of `TENCENT_SECRET_ID` environment variable.
   */
  tencentSecretId?: string;
  /**
   * Secret key to use when making requests, can be obtained from https://console.cloud.tencent.com/cam/capi.
   * Defaults to the value of `TENCENT_SECRET_KEY` environment variable.
   */
  tencentSecretKey?: string;
}
/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the TencentHunyuanEmbeddingsParams class.
 */
interface TencentHunyuanEmbeddingsParamsWithSign extends TencentHunyuanEmbeddingsParams {
  /**
   * Tencent Cloud API v3 sign method.
   */
  sign: sign;
}
/**
 * Class for generating embeddings using the Tencent Hunyuan API.
 */
declare class TencentHunyuanEmbeddings extends Embeddings implements TencentHunyuanEmbeddingsParams {
  tencentSecretId?: string;
  tencentSecretKey?: string;
  host: string;
  sign: sign;
  constructor(fields?: TencentHunyuanEmbeddingsParamsWithSign);
  private embeddingWithRetry;
  /**
   * Method to generate an embedding for a single document. Calls the
   * embeddingWithRetry method with the document as the input.
   * @param {string} text Document to generate an embedding for.
   * @returns {Promise<number[]>} Promise that resolves to an embedding for the document.
   */
  embedQuery(text: string): Promise<number[]>;
  /**
   * Method that takes an array of documents as input and returns a promise
   * that resolves to a 2D array of embeddings for each document. It calls
   * the embedQuery method for each document in the array.
   * @param documents Array of documents for which to generate embeddings.
   * @returns Promise that resolves to a 2D array of embeddings for each input document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
//#endregion
export { TencentHunyuanEmbeddings, TencentHunyuanEmbeddingsParams };
//# sourceMappingURL=base.d.ts.map