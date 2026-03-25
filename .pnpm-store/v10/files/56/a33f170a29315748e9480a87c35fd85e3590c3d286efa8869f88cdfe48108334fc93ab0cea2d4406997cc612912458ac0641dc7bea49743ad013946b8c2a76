/**
 * Created by user on 2019/6/12.
 */
export type ITSValueOfMember<T, K extends keyof T> = T extends {
    [p in K]: infer U;
} ? U : never;
export type ITSLengthOf<T extends {
    length: number;
}> = ITSValueOfMember<T, 'length'>;
