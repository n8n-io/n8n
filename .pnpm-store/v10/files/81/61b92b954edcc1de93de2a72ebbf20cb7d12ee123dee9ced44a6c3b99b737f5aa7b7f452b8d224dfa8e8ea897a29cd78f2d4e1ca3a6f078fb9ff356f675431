import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import { ArcjetSensitiveInfoType, RedactOptions } from "@arcjet/redact";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

//#region src/chat_models/arcjet.d.ts
type DetectSensitiveInfoEntities<T> = (tokens: string[]) => Array<ArcjetSensitiveInfoType | T | undefined>;
type ValidEntities<Detect> = Array<undefined extends Detect ? ArcjetSensitiveInfoType : Detect extends DetectSensitiveInfoEntities<infer CustomEntities> ? ArcjetSensitiveInfoType | CustomEntities : never>;
interface ArcjetRedactOptions<Detect> extends BaseChatModelParams {
  chatModel: BaseChatModel;
  entities?: ValidEntities<Detect>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: (entity: ValidEntities<Detect>[number]) => string | undefined;
}
declare class ArcjetRedact<Detect extends DetectSensitiveInfoEntities<CustomEntities$1> | undefined, CustomEntities$1 extends string> extends BaseChatModel {
  static lc_name(): string;
  chatModel: BaseChatModel;
  entities?: ValidEntities<Detect>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: (entity: ValidEntities<Detect>[number]) => string | undefined;
  index: number;
  constructor(options: ArcjetRedactOptions<Detect>);
  _createUniqueReplacement(entity: ValidEntities<Detect>[number]): string;
  _llmType(): string;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun | undefined): Promise<ChatResult>;
}
//#endregion
export { ArcjetRedact, ArcjetRedactOptions, type ArcjetSensitiveInfoType, type RedactOptions };
//# sourceMappingURL=arcjet.d.ts.map