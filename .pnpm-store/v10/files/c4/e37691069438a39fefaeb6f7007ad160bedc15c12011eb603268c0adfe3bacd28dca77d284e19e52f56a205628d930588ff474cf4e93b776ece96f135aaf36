export type Narrow<INPUT> = INPUT extends Promise<infer AWAITED> ? Promise<Narrow<AWAITED>> : INPUT extends (...args: infer ARGS) => infer RETURN ? (...args: Narrow<ARGS>) => Narrow<RETURN> : INPUT extends [] ? [] : INPUT extends object ? {
    [KEY in keyof INPUT]: Narrow<INPUT[KEY]>;
} : INPUT extends string | number | boolean | bigint ? INPUT : never;
