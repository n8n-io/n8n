export function combineHeaders(
  ...headers: Array<Record<string, string | undefined> | undefined>
): Record<string, string | undefined> {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...(currentHeaders ?? {}),
    }),
    {},
  ) as Record<string, string | undefined>;
}
