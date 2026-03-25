/**
 * remove index signature using mapped types
 *
 * @see https://stackoverflow.com/a/51956054/4563339
 */
export type ITSOmitIndexSignatures<T extends Record<any, any>> = {
    [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};
export type ITSKnownKeys<T extends Record<any, any>> = keyof ITSOmitIndexSignatures<T>;
export type ITSKnownKeys2<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
    [_ in keyof T]: infer U;
} ? U : never;
