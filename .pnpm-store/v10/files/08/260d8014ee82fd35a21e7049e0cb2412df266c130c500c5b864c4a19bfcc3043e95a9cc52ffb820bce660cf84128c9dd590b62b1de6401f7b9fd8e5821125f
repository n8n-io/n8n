// src/json/get-meta-from-path.js
import { getPointers } from "./utils.mjs";
function getMetaFromPath(jsonAst, dataPath, includeIdentifierLocation) {
  const pointers = getPointers(dataPath);
  const lastPointerIndex = pointers.length - 1;
  return pointers.reduce((obj, pointer, idx) => {
    switch (obj.type) {
      case "Object": {
        const filtered = obj.members.filter((child) => child.name.value === pointer);
        if (filtered.length !== 1) {
          throw new Error(`Couldn't find property ${pointer} of ${dataPath}`);
        }
        const { name, value } = filtered[0];
        return includeIdentifierLocation && idx === lastPointerIndex ? name : value;
      }
      case "Array":
        return obj.elements[pointer];
      default:
        console.log(obj);
    }
  }, jsonAst.body);
}
export {
  getMetaFromPath as default
};
//# sourceMappingURL=get-meta-from-path.mjs.map
