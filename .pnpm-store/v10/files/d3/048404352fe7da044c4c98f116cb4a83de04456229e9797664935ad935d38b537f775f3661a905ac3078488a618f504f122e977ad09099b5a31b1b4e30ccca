export function isAbortError(error: unknown): error is Error {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    (error.name === 'AbortError' ||
      error.name === 'ResponseAborted' || // Next.js
      error.name === 'TimeoutError')
  );
}
