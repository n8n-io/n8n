export type ScalarSchema = {
    name?: never;
    type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
    items?: ScalarSchema;
    enum?: string[];
    isExample?: boolean;
    directResolveAs?: string;
    minimum?: number;
};
export type NormalizedScalarSchema = {
    name?: never;
    type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
    items?: ScalarSchema;
    enum?: string[];
    directResolveAs?: NormalizedNodeType;
    resolvable: boolean;
    minimum?: number;
};
export type NodeType = {
    properties: Record<string, PropType | ResolveTypeFn>;
    additionalProperties?: PropType | ResolveTypeFn;
    items?: PropType | ResolveTypeFn;
    required?: string[] | ((value: any, key: string | number | undefined) => string[]);
    requiredOneOf?: string[];
    allowed?: (value: any) => string[] | undefined;
    extensionsPrefix?: string;
};
export type PropType = string | NodeType | ScalarSchema | undefined | null;
export type ResolveTypeFn = (value: any, key: string) => string | PropType;
export type NormalizedNodeType = {
    name: string;
    properties: Record<string, NormalizedPropType | NormalizedResolveTypeFn>;
    additionalProperties?: NormalizedPropType | NormalizedResolveTypeFn;
    items?: NormalizedPropType | NormalizedResolveTypeFn;
    required?: string[] | ((value: any, key: string | number | undefined) => string[]);
    requiredOneOf?: string[];
    allowed?: (value: any) => string[] | undefined;
    extensionsPrefix?: string;
};
type NormalizedPropType = NormalizedNodeType | NormalizedScalarSchema | null | undefined;
type NormalizedResolveTypeFn = (value: any, key: string) => NormalizedPropType;
export declare function listOf(typeName: string): {
    name: string;
    properties: {};
    items: string;
};
export declare function mapOf(typeName: string): {
    name: string;
    properties: {};
    additionalProperties: () => string;
};
export declare const SpecExtension: NormalizedNodeType;
export declare function normalizeTypes(types: Record<string, NodeType>, options?: {
    doNotResolveExamples?: boolean;
}): Record<string, NormalizedNodeType>;
export declare function isNamedType(t: NormalizedPropType): t is NormalizedNodeType;
export {};
