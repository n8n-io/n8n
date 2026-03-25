import { BaseLLM, BaseLLMCallOptions, LLM } from "@langchain/core/language_models/llms";
import { ArcjetSensitiveInfoType, RedactOptions } from "@arcjet/redact";

//#region src/llms/arcjet.d.ts
type DetectSensitiveInfoEntities<T> = (tokens: string[]) => Array<ArcjetSensitiveInfoType | T | undefined>;
type ValidEntities<Detect> = Array<undefined extends Detect ? ArcjetSensitiveInfoType : Detect extends DetectSensitiveInfoEntities<infer CustomEntities> ? ArcjetSensitiveInfoType | CustomEntities : never>;
interface ArcjetRedactOptions<Detect> extends BaseLLMCallOptions {
  llm: BaseLLM;
  entities?: ValidEntities<Detect>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: (entity: ValidEntities<Detect>[number]) => string | undefined;
}
declare class ArcjetRedact<Detect extends DetectSensitiveInfoEntities<CustomEntities$1> | undefined, CustomEntities$1 extends string> extends LLM {
  static lc_name(): string;
  llm: BaseLLM;
  entities?: ValidEntities<Detect>;
  contextWindowSize?: number;
  detect?: Detect;
  replace?: (entity: ValidEntities<Detect>[number]) => string | undefined;
  constructor(options: ArcjetRedactOptions<Detect>);
  _llmType(): string;
  _call(input: string, options?: BaseLLMCallOptions): Promise<string>;
}
//#endregion
export { ArcjetRedact, ArcjetRedactOptions, type ArcjetSensitiveInfoType, type RedactOptions };
//# sourceMappingURL=arcjet.d.ts.map