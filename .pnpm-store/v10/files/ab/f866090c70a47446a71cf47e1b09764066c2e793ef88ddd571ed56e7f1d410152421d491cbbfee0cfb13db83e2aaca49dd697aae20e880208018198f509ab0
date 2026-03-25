import type { IsObject } from "./extends";
export declare type Prettify<TYPE> = IsObject<TYPE> extends true ? {
    [KEY in keyof TYPE]: KEY extends keyof TYPE ? TYPE[KEY] : never;
} : TYPE;
