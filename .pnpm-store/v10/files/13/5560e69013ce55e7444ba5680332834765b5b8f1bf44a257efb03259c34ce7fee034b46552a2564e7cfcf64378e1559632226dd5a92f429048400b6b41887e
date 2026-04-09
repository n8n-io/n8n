// src/index.js
import { parse } from "@humanwhocodes/momoa";
import prettify from "./helpers.mjs";
var src_default = (schema, data, errors, options = {}) => {
  const { format = "cli", indent = null, json = null } = options;
  const jsonRaw = json || JSON.stringify(data, null, indent);
  const jsonAst = parse(jsonRaw);
  const customErrorToText = (error) => error.print().join("\n");
  const customErrorToStructure = (error) => error.getError();
  const customErrors = prettify(errors, {
    data,
    schema,
    jsonAst,
    jsonRaw
  });
  if (format === "cli") {
    return customErrors.map(customErrorToText).join("\n\n");
  } else {
    return customErrors.map(customErrorToStructure);
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.mjs.map
