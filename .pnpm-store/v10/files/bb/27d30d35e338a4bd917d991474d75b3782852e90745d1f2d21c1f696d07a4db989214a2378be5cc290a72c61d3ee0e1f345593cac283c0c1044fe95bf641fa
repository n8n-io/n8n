export type Writable<TYPE> = TYPE extends ((...args: unknown[]) => unknown) | Date | RegExp ? TYPE : TYPE extends ReadonlyMap<infer KEYS, infer VALUES> ? Map<Writable<KEYS>, Writable<VALUES>> : TYPE extends ReadonlySet<infer VALUES> ? Set<Writable<VALUES>> : TYPE extends ReadonlyArray<unknown> ? `${bigint}` extends `${keyof TYPE & any}` ? {
    -readonly [KEY in keyof TYPE]: Writable<TYPE[KEY]>;
} : Writable<TYPE[number]>[] : TYPE extends object ? {
    -readonly [KEY in keyof TYPE]: Writable<TYPE[KEY]>;
} : TYPE;
