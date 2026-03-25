import { BaseOutputParser } from "./base.js";
import { StandardSchemaV1 } from "@standard-schema/spec";

//#region src/output_parsers/standard_schema.d.ts
declare class StandardSchemaOutputParser<RunOutput extends Record<string, any> = Record<string, any>> extends BaseOutputParser<RunOutput> {
  static lc_name(): string;
  lc_namespace: string[];
  private readonly schema;
  constructor(schema: StandardSchemaV1<RunOutput>);
  static fromSerializableSchema<RunOutput extends Record<string, any> = Record<string, any>>(schema: StandardSchemaV1<RunOutput>): StandardSchemaOutputParser<RunOutput>;
  parse(text: string): Promise<RunOutput>;
  getFormatInstructions(): string;
}
//#endregion
export { StandardSchemaOutputParser };
//# sourceMappingURL=standard_schema.d.ts.map