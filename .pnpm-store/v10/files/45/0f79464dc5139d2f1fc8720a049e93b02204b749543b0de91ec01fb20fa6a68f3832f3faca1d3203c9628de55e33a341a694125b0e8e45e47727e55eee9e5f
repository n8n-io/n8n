import { JsonSchema7TypeUnion } from "./parseTypes.cjs";

//#region src/utils/zod-to-json-schema/errorMessages.d.ts
type ErrorMessages<T extends JsonSchema7TypeUnion | {
  format: string;
} | {
  pattern: string;
}, OmitProperties extends string = ""> = Partial<Omit<{ [key in keyof T]: string }, OmitProperties | "type" | "errorMessages">>;
//#endregion
export { ErrorMessages };
//# sourceMappingURL=errorMessages.d.cts.map