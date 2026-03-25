/**
 * Created by user on 2019/6/11.
 */
/**
 * Wrap proxies around properties of T
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
 */
export type ITSProxify<T> = {
    [P in keyof T]: {
        get(): T[P];
        set(v: T[P]): void;
    };
};
