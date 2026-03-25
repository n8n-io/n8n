import type { IsArray, IsObject } from "./extends";
export declare type DeepMergeUnsafe<TYPE_A, TYPE_B> = IsObject<TYPE_A> extends true ? IsObject<TYPE_B> extends true ? {
    [KEY in keyof (TYPE_A & TYPE_B)]: KEY extends keyof TYPE_B ? KEY extends keyof TYPE_A ? DeepMergeUnsafe<TYPE_A[KEY], TYPE_B[KEY]> : TYPE_B[KEY] : KEY extends keyof TYPE_A ? TYPE_A[KEY] : never;
} : TYPE_B : IsArray<TYPE_A> extends true ? IsArray<TYPE_B> extends true ? TYPE_B extends unknown[] ? [
    ...(TYPE_A extends unknown[] ? TYPE_A : never),
    TYPE_B
] : never : TYPE_B : TYPE_B;
