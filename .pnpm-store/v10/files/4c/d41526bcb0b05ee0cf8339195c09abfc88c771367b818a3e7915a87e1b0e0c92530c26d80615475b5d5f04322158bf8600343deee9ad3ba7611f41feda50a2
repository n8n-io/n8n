import { BaseGoogleEmbeddings, BaseGoogleEmbeddingsParams, GoogleAbstractedClient, GoogleConnectionParams } from "@langchain/google-common";
import { GoogleAuthOptions } from "google-auth-library";

//#region src/embeddings.d.ts
/**
 * Input to LLM class.
 */
interface GoogleEmbeddingsInput extends BaseGoogleEmbeddingsParams<GoogleAuthOptions> {}
/**
 * Integration with an Google embeddings model.
 */
declare class GoogleEmbeddings extends BaseGoogleEmbeddings<GoogleAuthOptions> implements GoogleEmbeddingsInput {
  static lc_name(): string;
  lc_serializable: boolean;
  constructor(fields: GoogleEmbeddingsInput);
  buildAbstractedClient(fields?: GoogleConnectionParams<GoogleAuthOptions>): GoogleAbstractedClient;
}
//#endregion
export { GoogleEmbeddings, GoogleEmbeddingsInput };
//# sourceMappingURL=embeddings.d.cts.map