import ast = require("../src/yamlAST");
export interface TestError {
    message: string;
    line: number;
    column: number;
    isWarning: boolean;
}
export declare function testErrors(input: string, expectedErrors: TestError[]): void;
export declare function safeLoad(input: any): ast.YAMLNode;
