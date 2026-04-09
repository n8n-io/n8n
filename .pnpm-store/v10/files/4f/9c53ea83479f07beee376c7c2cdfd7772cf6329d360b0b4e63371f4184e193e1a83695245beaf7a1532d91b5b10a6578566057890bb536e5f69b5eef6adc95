import { JSONArray, JSONObject, JSONValue } from './json-value';

export function isJSONValue(value: unknown): value is JSONValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }

  if (typeof value === 'object') {
    return Object.entries(value).every(
      ([key, val]) =>
        typeof key === 'string' && (val === undefined || isJSONValue(val)),
    );
  }

  return false;
}

export function isJSONArray(value: unknown): value is JSONArray {
  return Array.isArray(value) && value.every(isJSONValue);
}

export function isJSONObject(value: unknown): value is JSONObject {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.entries(value).every(
      ([key, val]) =>
        typeof key === 'string' && (val === undefined || isJSONValue(val)),
    )
  );
}
