export function prepareHeaders(
  headers: HeadersInit | undefined,
  defaultHeaders: Record<string, string>,
): Headers {
  const responseHeaders = new Headers(headers ?? {});

  for (const [key, value] of Object.entries(defaultHeaders)) {
    if (!responseHeaders.has(key)) {
      responseHeaders.set(key, value);
    }
  }

  return responseHeaders;
}
