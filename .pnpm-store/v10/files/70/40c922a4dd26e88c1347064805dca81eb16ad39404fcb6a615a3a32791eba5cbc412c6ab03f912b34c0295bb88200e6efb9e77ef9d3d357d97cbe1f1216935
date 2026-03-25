// src/mocks/mock-utils.js
import { isPlainObject, validKeys, buildRecursive } from "../utils/index.mjs";
function toSortedQueryString(entry) {
  if (!isPlainObject(entry)) {
    return entry;
  }
  return validKeys(entry).sort().map((key) => {
    const value = entry[key];
    if (isPlainObject(value)) {
      return toSortedQueryString(value);
    }
    return buildRecursive(key, value);
  }).join("&").replace(/%20/g, "+");
}
function filterByPredicate(object, predicate) {
  return Object.entries(object).filter(([key]) => predicate(key)).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}
function isSubset(A, B) {
  const keysFromA = validKeys(A);
  const filteredB = filterByPredicate(B, (keyFromB) => keysFromA.includes(keyFromB));
  return toSortedQueryString(A) === toSortedQueryString(filteredB);
}
function sortedUrl(url) {
  const urlParts = url.split("?");
  if (urlParts.length > 1) {
    const query = urlParts[1];
    const sortedQuery = query.split("&").sort().join("&");
    return `${urlParts[0]}?${sortedQuery}`;
  } else {
    return urlParts[0];
  }
}
export {
  isSubset,
  sortedUrl,
  toSortedQueryString
};
//# sourceMappingURL=mock-utils.mjs.map