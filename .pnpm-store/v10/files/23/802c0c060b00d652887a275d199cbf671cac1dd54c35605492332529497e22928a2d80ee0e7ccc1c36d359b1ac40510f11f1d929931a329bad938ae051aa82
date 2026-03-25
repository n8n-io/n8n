import ast = require("./yamlAST");
export declare function loadAll(input: string, iterator: (document: ast.YAMLNode) => void, options?: LoadOptions): void;
export declare function load(input: string, options?: LoadOptions): ast.YAMLNode;
export declare function safeLoadAll(input: string, output: (document: ast.YAMLNode) => void, options?: LoadOptions): void;
export declare function safeLoad(input: string, options?: LoadOptions): ast.YAMLNode;
export interface LoadOptions {
    filename?: string;
    schema?: any;
    onWarning?: () => any;
    legacy?: boolean;
    allowAnyEscape?: boolean;
    ignoreDuplicateKeys?: boolean;
}
