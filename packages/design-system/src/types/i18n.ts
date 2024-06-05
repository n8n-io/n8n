export type N8nLocaleTranslateFn = (path: string, options: string[]) => string;

export type N8nLocale = Record<string, string | ((...args: unknown[]) => string)>;
