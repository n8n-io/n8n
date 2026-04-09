import isPotentiallyValidKeyRange from "./isPotentiallyValidKeyRange.js";
import enforceRange from "./enforceRange.js";
// https://www.w3.org/TR/IndexedDB/#create-request-to-retrieve-multiple-items
const extractGetAllOptions = (queryOrOptions, count, numArguments) => {
  let query;
  let direction;
  if (queryOrOptions === undefined || queryOrOptions === null || isPotentiallyValidKeyRange(queryOrOptions)) {
    // queryOrOptions is FDBKeyRange | Key | null | undefined
    query = queryOrOptions;
    if (numArguments > 1 && count !== undefined) {
      count = enforceRange(count, "unsigned long");
    }
  } else {
    // queryOrOptions is FDBGetAllOptions
    const getAllOptions = queryOrOptions;
    if (getAllOptions.query !== undefined) {
      query = getAllOptions.query;
    }
    if (getAllOptions.count !== undefined) {
      count = enforceRange(getAllOptions.count, "unsigned long");
    }
    if (getAllOptions.direction !== undefined) {
      direction = getAllOptions.direction;
    }
  }
  return {
    query,
    count,
    direction
  };
};
export default extractGetAllOptions;