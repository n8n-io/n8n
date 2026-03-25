import { InputValues } from "../utils/types/index.cjs";
import { Runnable } from "../runnables/base.cjs";
import { TypedPromptInputValues } from "./base.cjs";
import { TemplateFormat } from "./template.cjs";

//#region src/prompts/dict.d.ts
declare class DictPromptTemplate<RunInput extends InputValues = InputValues, RunOutput extends Record<string, unknown> = Record<string, unknown>> extends Runnable<TypedPromptInputValues<RunInput>, RunOutput> {
  lc_namespace: string[];
  lc_serializable: boolean;
  template: Record<string, unknown>;
  templateFormat: TemplateFormat;
  inputVariables: Array<Extract<keyof RunInput, string>>;
  static lc_name(): string;
  constructor(fields: {
    template: Record<string, unknown>;
    templateFormat?: TemplateFormat;
  });
  format(values: TypedPromptInputValues<RunInput>): Promise<RunOutput>;
  invoke(values: TypedPromptInputValues<InputValues>): Promise<RunOutput>;
}
//#endregion
export { DictPromptTemplate };
//# sourceMappingURL=dict.d.cts.map