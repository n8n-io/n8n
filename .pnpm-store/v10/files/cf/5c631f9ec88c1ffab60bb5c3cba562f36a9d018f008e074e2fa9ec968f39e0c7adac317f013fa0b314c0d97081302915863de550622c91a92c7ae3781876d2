import { ChatGoogleBase, ChatGoogleBaseInput, GoogleAbstractedClient, GoogleBaseLLMInput } from "@langchain/google-common";
import { GoogleAuthOptions } from "google-auth-library";

//#region src/chat_models.d.ts
/**
 * Input to chat model class.
 */
interface ChatGoogleInput extends ChatGoogleBaseInput<GoogleAuthOptions> {}
/**
 * Integration with a Google chat model.
 */
declare class ChatGoogle extends ChatGoogleBase<GoogleAuthOptions> implements ChatGoogleInput {
  static lc_name(): string;
  constructor(model: string, params?: Omit<ChatGoogleInput, "model">);
  constructor(fields?: ChatGoogleInput);
  buildAbstractedClient(fields: GoogleBaseLLMInput<GoogleAuthOptions> | undefined): GoogleAbstractedClient;
}
//#endregion
export { ChatGoogle, ChatGoogleInput };
//# sourceMappingURL=chat_models.d.cts.map