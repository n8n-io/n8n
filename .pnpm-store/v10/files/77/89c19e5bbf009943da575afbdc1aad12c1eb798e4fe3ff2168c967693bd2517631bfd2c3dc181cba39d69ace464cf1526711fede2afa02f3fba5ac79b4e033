export interface StringNode {
    value: string;
    path: string;
}
export interface StringNodeProcessor {
    maskNodes: (nodes: StringNode[]) => StringNode[];
}
export interface StringNodeRule {
    type?: "pattern";
    pattern: RegExp | string;
    replace?: string;
}
export type ReplacerType = ((value: string, path?: string) => string) | StringNodeRule[] | StringNodeProcessor;
export declare function createAnonymizer(replacer: ReplacerType, options?: {
    maxDepth?: number;
}): <T>(data: T) => T;
