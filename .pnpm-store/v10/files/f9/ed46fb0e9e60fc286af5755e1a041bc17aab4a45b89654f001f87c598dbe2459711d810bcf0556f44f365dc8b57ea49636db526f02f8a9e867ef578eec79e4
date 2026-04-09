/**
 * Proxy 類型工具
 * Proxy Type Utilities
 *
 * 提供 Proxy 相關的類型操作工具
 * Provides Proxy-related type manipulation utilities
 */
/**
 * 將物件的屬性包裝為 Proxy
 * Wrap properties of object with Proxy
 *
 * 將每個屬性轉換為具有 getter 和 setter 的物件
 * Converts each property to an object with getter and setter
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
 *
 * @example
 * interface User { name: string; age: number; }
 * type ProxifiedUser = ITSProxify<User>;
 * // type ProxifiedUser = {
 * //   name: { get(): string; set(v: string): void };
 * //   age: { get(): number; set(v: number): void };
 * // }
 */
export type ITSProxify<T> = {
    [P in keyof T]: {
        get(): T[P];
        set(v: T[P]): void;
    };
};
