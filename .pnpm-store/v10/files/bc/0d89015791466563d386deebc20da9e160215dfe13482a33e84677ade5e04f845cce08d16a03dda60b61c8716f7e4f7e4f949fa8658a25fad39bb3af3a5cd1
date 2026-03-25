import { ErrorMessages } from "../errorMessages.cjs";
import { JsonSchema7NumberType } from "./number.cjs";

//#region src/utils/zod-to-json-schema/parsers/date.d.ts
type JsonSchema7DateType = {
  type: "integer" | "string";
  format: "unix-time" | "date-time" | "date";
  minimum?: number;
  maximum?: number;
  errorMessage?: ErrorMessages<JsonSchema7NumberType>;
} | {
  anyOf: JsonSchema7DateType[];
};
//#endregion
export { JsonSchema7DateType };
//# sourceMappingURL=date.d.cts.map