export const isBrowser =
  typeof window !== 'undefined' ||
  typeof process === 'undefined' ||
  (process?.platform as any) === 'browser'; // main and worker thread
export const env = isBrowser ? {} : process.env || {};
