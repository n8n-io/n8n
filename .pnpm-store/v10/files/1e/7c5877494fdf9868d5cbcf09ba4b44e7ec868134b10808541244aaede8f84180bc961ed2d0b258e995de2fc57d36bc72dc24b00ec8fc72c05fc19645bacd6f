interface MockInt {
    id: number;
    someValue?: boolean | null;
    getNumber: () => number;
    getNumberWithMockArg: (mock: any) => number;
    getSomethingWithArgs: (arg1: number, arg2: number) => number;
    getSomethingWithMoreArgs: (arg1: number, arg2: number, arg3: number) => number;
}
declare class Test1 implements MockInt {
    readonly id: number;
    deepProp: Test2;
    private readonly anotherPart;
    constructor(id: number);
    ofAnother(test: Test1): number;
    getNumber(): number;
    getNumberWithMockArg(mock: any): number;
    getSomethingWithArgs(arg1: number, arg2: number): number;
    getSomethingWithMoreArgs(arg1: number, arg2: number, arg3: number): number;
}
declare class Test2 {
    deeperProp: Test3;
    getNumber(num: number): number;
    getAnotherString(str: string): string;
}
declare class Test3 {
    getNumber(num: number): number;
}
export interface FunctionWithPropsMockInt {
    (arg1: number): number;
    prop: number;
    nonDeepProp: (arg: Test1) => number;
    deepProp: Test2;
}
export declare class Test6 {
    id: number;
    funcValueProp: FunctionWithPropsMockInt;
    constructor(funcValueProp: FunctionWithPropsMockInt, id: number);
}
export {};
