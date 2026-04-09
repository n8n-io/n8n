/**
 * Extracts the headers from a response object and returns them as a key-value object.
 *
 * @param response - The response object to extract headers from.
 * @returns The headers as a key-value object.
 */
export function extractResponseHeaders(response: Response) {
  return Object.fromEntries<string>([...response.headers]);
}
