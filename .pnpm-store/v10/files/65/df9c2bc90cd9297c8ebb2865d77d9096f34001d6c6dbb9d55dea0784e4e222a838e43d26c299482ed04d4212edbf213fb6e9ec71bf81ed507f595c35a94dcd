/**
 * Created by user on 2019/6/12.
 */
/**
 * 取得物件指定成員的值類型
 * Get the value type of a specific object member
 *
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 * }
 * type NameType = ITSValueOfMember<User, 'name'>; // string
 */
export type ITSValueOfMember<T, K extends keyof T> = T extends {
    [p in K]: infer U;
} ? U : never;
/**
 * 取得具有 length 屬性之物件的 length 類型
 * Get the length type of an object with length property
 *
 * @example
 * type ArrayLike = { length: 42 };
 * type LengthType = ITSLengthOf<ArrayLike>; // 42
 */
export type ITSLengthOf<T extends {
    length: number;
}> = ITSValueOfMember<T, 'length'>;
