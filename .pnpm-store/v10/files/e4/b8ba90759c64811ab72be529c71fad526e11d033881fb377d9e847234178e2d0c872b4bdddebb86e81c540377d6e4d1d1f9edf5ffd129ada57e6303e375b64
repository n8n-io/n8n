export type ObjectFun<T> = (w: ObjectWriter, value: T) => void;
export declare class ObjectWriter {
    #private;
    constructor(output: Array<string>);
    begin(): void;
    end(): void;
    string(name: string, value: string): void;
    stringRaw(name: string, value: string): void;
    number(name: string, value: number): void;
    boolean(name: string, value: boolean): void;
    object<T>(name: string, value: T, valueFun: ObjectFun<T>): void;
    arrayObjects<T>(name: string, values: Array<T>, valueFun: ObjectFun<T>): void;
}
export declare function writeJsonObject<T>(value: T, fun: ObjectFun<T>): string;
