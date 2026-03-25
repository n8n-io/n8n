export declare type DoesExtend<TYPE_A, TYPE_B> = [TYPE_A] extends [TYPE_B] ? true : false;
declare type ArrayKeys = keyof [];
export declare type IsObject<TYPE> = TYPE extends object ? ArrayKeys extends Extract<keyof TYPE, ArrayKeys> ? false : true : false;
export declare type IsArray<TYPE> = TYPE extends object ? ArrayKeys extends Extract<keyof TYPE, ArrayKeys> ? true : false : false;
export {};
