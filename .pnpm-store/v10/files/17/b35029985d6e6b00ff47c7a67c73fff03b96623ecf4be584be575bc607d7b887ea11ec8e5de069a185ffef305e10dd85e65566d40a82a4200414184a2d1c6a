import { GoogleAbstractedClient, GoogleBaseLLM, GoogleBaseLLMInput } from "@langchain/google-common";
import { GoogleAuthOptions } from "google-auth-library";

//#region src/llms.d.ts
/**
 * Input to LLM class.
 */
interface GoogleLLMInput extends GoogleBaseLLMInput<GoogleAuthOptions> {}
/**
 * Integration with a Google LLM.
 */
declare class GoogleLLM extends GoogleBaseLLM<GoogleAuthOptions> implements GoogleLLMInput {
  static lc_name(): string;
  lc_serializable: boolean;
  constructor(fields?: GoogleLLMInput);
  buildAbstractedClient(fields: GoogleBaseLLMInput<GoogleAuthOptions> | undefined): GoogleAbstractedClient;
}
//#endregion
export { GoogleLLM, GoogleLLMInput };
//# sourceMappingURL=llms.d.ts.map