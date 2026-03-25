import cmp from "./cmp.js";
/**
 * Classic binary search implementation. Returns the index where the key
 * should be inserted, assuming the records list is ordered.
 */
function binarySearch(records, key) {
  let low = 0;
  let high = records.length;
  let mid;
  while (low < high) {
    mid = low + high >>> 1; // like Math.floor((low + high) / 2) but fast
    if (cmp(records[mid].key, key) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 * Equivalent to `records.findIndex(record => cmp(record.key, key) === 0)`
 */
export function getIndexByKey(records, key) {
  const idx = binarySearch(records, key);
  const record = records[idx];
  if (record && cmp(record.key, key) === 0) {
    return idx;
  }
  return -1;
}

/**
 * Equivalent to `records.find(record => cmp(record.key, key) === 0)`
 */
export function getByKey(records, key) {
  const idx = getIndexByKey(records, key);
  return records[idx];
}

/**
 * Equivalent to `records.findIndex(record => key.includes(record.key))`
 */
export function getIndexByKeyRange(records, keyRange) {
  const lowerIdx = typeof keyRange.lower === "undefined" ? 0 : binarySearch(records, keyRange.lower);
  const upperIdx = typeof keyRange.upper === "undefined" ? records.length - 1 : binarySearch(records, keyRange.upper);
  for (let i = lowerIdx; i <= upperIdx; i++) {
    const record = records[i];
    if (record && keyRange.includes(record.key)) {
      return i;
    }
  }
  return -1;
}

/**
 * Equivalent to `records.find(record => key.includes(record.key))`
 */
export function getByKeyRange(records, keyRange) {
  const idx = getIndexByKeyRange(records, keyRange);
  return records[idx];
}

/**
 * Equivalent to `records.findIndex(record => cmp(record.key, key) >= 0)`
 */
export function getIndexByKeyGTE(records, key) {
  const idx = binarySearch(records, key);
  const record = records[idx];
  if (record && cmp(record.key, key) >= 0) {
    return idx;
  }
  return -1;
}