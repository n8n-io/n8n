// src/helper/streaming/utils.ts
var isOldBunVersion = () => {
  const version = typeof Bun !== "undefined" ? Bun.version : void 0;
  if (version === void 0) {
    return false;
  }
  const result = version.startsWith("1.1") || version.startsWith("1.0") || version.startsWith("0.");
  isOldBunVersion = () => result;
  return result;
};
export {
  isOldBunVersion
};
