export type N8nLocaleTranslateFnOptions = string[] | Record<string, unknown>;

export type N8nLocaleTranslateFn = (path: string, options?: N8nLocaleTranslateFnOptions) => string;

export type N8nLocale = Record<string, string | ((...args: unknown[]) => string)>;
