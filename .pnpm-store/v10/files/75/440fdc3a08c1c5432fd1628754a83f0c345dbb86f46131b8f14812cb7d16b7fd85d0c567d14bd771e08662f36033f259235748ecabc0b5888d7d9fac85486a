import type { Token } from "./tokenizer/index";
import type { Scope } from "./tokenizer/state";
export declare class File {
    tokens: Array<Token>;
    scopes: Array<Scope>;
    constructor(tokens: Array<Token>, scopes: Array<Scope>);
}
export declare function parse(input: string, isJSXEnabled: boolean, isTypeScriptEnabled: boolean, isFlowEnabled: boolean): File;
