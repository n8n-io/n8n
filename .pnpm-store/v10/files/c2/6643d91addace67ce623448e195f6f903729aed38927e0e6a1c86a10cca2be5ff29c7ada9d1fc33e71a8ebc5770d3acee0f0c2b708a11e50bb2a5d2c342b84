/**
 * Normalizes different header inputs into a plain record with lower-case keys.
 * Entries with `undefined` or `null` values are removed.
 *
 * @param headers - Input headers (`Headers`, tuples array, plain record) to normalize.
 * @returns A record containing the normalized header entries.
 */
export function normalizeHeaders(
  headers:
    | HeadersInit
    | Record<string, string | undefined>
    | Array<[string, string | undefined]>
    | undefined,
): Record<string, string> {
  if (headers == null) {
    return {};
  }

  const normalized: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
  } else {
    if (!Array.isArray(headers)) {
      headers = Object.entries(headers);
    }

    for (const [key, value] of headers) {
      if (value != null) {
        normalized[key.toLowerCase()] = value;
      }
    }
  }

  return normalized;
}
