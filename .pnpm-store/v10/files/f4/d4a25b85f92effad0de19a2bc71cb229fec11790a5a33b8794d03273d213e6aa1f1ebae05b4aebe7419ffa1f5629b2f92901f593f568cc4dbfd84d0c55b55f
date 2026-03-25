// src/utils/clone.ts
import { isPlainObject, isObject } from "./index.mjs";
var clone = (obj) => {
  if (isPlainObject(obj)) {
    return cloneObject(obj);
  } else if (Array.isArray(obj)) {
    return cloneArray(obj);
  } else {
    return obj;
  }
};
var cloneObject = (obj) => {
  const clone2 = {};
  for (const i in obj) {
    const value = obj[i];
    if (isObject(value)) {
      clone2[i] = cloneObject(value);
    } else if (Array.isArray(value)) {
      clone2[i] = cloneArray(value);
    } else {
      clone2[i] = value;
    }
  }
  return clone2;
};
var cloneArray = (obj) => {
  const clone2 = [];
  for (const i in obj) {
    const value = obj[i];
    if (isObject(value)) {
      clone2.push(cloneObject(value));
    } else if (Array.isArray(value)) {
      clone2.push(cloneArray(value));
    } else {
      clone2.push(value);
    }
  }
  return clone2;
};
export {
  clone
};
//# sourceMappingURL=clone.mjs.map