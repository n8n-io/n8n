// src/helper/accepts/accepts.ts
import { parseAccept } from "../../utils/accept.js";
var defaultMatch = (accepts2, config) => {
  const { supports, default: defaultSupport } = config;
  const accept = accepts2.sort((a, b) => b.q - a.q).find((accept2) => supports.includes(accept2.type));
  return accept ? accept.type : defaultSupport;
};
var accepts = (c, options) => {
  const acceptHeader = c.req.header(options.header);
  if (!acceptHeader) {
    return options.default;
  }
  const accepts2 = parseAccept(acceptHeader);
  const match = options.match || defaultMatch;
  return match(accepts2, options);
};
export {
  accepts,
  defaultMatch
};
