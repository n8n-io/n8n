import { ErrorMessages } from "../errorMessages.cjs";

//#region src/utils/zod-to-json-schema/parsers/string.d.ts
type JsonSchema7StringType = {
  type: "string";
  minLength?: number;
  maxLength?: number;
  format?: "email" | "idn-email" | "uri" | "uuid" | "date-time" | "ipv4" | "ipv6" | "date" | "time" | "duration";
  pattern?: string;
  allOf?: {
    pattern: string;
    errorMessage?: ErrorMessages<{
      pattern: string;
    }>;
  }[];
  anyOf?: {
    format: string;
    errorMessage?: ErrorMessages<{
      format: string;
    }>;
  }[];
  errorMessage?: ErrorMessages<JsonSchema7StringType>;
  contentEncoding?: string;
};
//#endregion
export { JsonSchema7StringType };
//# sourceMappingURL=string.d.cts.map