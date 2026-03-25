export declare const mutable: <T extends readonly any[] | Record<string, unknown>>(val: T) => Mutable<T>;
export declare type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
export declare type HTMLElementCustomized<T> = HTMLElement & T;
/**
 * @deprecated stop to use null
 * @see {@link https://github.com/sindresorhus/meta/discussions/7}
 */
export declare type Nullable<T> = T | null;
export declare type Arrayable<T> = T | T[];
export declare type Awaitable<T> = Promise<T> | T;
