export type Value = Obj | Array<Value> | string | number | true | false | null;
export type Obj = {
    [key: string]: Value | undefined;
};
export type ObjectFun<T> = (obj: Obj) => T;
export declare function string(value: Value | undefined): string;
export declare function stringOpt(value: Value | undefined): string | undefined;
export declare function number(value: Value | undefined): number;
export declare function boolean(value: Value | undefined): boolean;
export declare function array(value: Value | undefined): Array<Value>;
export declare function object(value: Value | undefined): Obj;
export declare function arrayObjectsMap<T>(value: Value | undefined, fun: ObjectFun<T>): Array<T>;
export declare function readJsonObject<T>(value: unknown, fun: ObjectFun<T>): T;
