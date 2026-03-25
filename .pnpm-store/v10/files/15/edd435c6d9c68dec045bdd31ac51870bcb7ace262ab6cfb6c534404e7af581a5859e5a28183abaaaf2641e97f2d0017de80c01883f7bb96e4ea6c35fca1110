import { JsonSchema7EnumType } from "./enum.cjs";
import { JsonSchema7StringType } from "./string.cjs";
import { JsonSchema7Type } from "../parseTypes.cjs";

//#region src/utils/zod-to-json-schema/parsers/record.d.ts
type JsonSchema7RecordPropertyNamesType = Omit<JsonSchema7StringType, "type"> | Omit<JsonSchema7EnumType, "type">;
type JsonSchema7RecordType = {
  type: "object";
  additionalProperties?: JsonSchema7Type | true;
  propertyNames?: JsonSchema7RecordPropertyNamesType;
};
//#endregion
export { JsonSchema7RecordType };
//# sourceMappingURL=record.d.cts.map