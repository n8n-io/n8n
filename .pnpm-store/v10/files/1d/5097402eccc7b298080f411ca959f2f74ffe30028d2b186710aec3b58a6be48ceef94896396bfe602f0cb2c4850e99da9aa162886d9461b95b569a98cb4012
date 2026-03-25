"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var validators_exports = {};
__export(validators_exports, {
  validateTestAnnotation: () => validateTestAnnotation,
  validateTestDetails: () => validateTestDetails
});
module.exports = __toCommonJS(validators_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
const testAnnotationSchema = import_mcpBundle.z.object({
  type: import_mcpBundle.z.string(),
  description: import_mcpBundle.z.string().optional()
});
const testDetailsSchema = import_mcpBundle.z.object({
  tag: import_mcpBundle.z.union([
    import_mcpBundle.z.string().optional(),
    import_mcpBundle.z.array(import_mcpBundle.z.string())
  ]).transform((val) => Array.isArray(val) ? val : val !== void 0 ? [val] : []).refine((val) => val.every((v) => v.startsWith("@")), {
    message: "Tag must start with '@'"
  }),
  annotation: import_mcpBundle.z.union([
    testAnnotationSchema,
    import_mcpBundle.z.array(testAnnotationSchema).optional()
  ]).transform((val) => Array.isArray(val) ? val : val !== void 0 ? [val] : [])
});
function validateTestAnnotation(annotation) {
  try {
    return testAnnotationSchema.parse(annotation);
  } catch (error) {
    throwZodError(error);
  }
}
function validateTestDetails(details, location) {
  try {
    const parsedDetails = testDetailsSchema.parse(details);
    return {
      annotations: parsedDetails.annotation.map((a) => ({ ...a, location })),
      tags: parsedDetails.tag,
      location
    };
  } catch (error) {
    throwZodError(error);
  }
}
function throwZodError(error) {
  throw new Error(error.issues.map((i) => i.message).join("\n"));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateTestAnnotation,
  validateTestDetails
});
