import isFunction from "./isFunction.js";
export const isFileLike = (value) => Boolean(value
    && typeof value === "object"
    && isFunction(value.constructor)
    && value[Symbol.toStringTag] === "File"
    && isFunction(value.stream)
    && value.name != null
    && value.size != null
    && value.lastModified != null);
