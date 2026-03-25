import type { JSONSchema, TSESLint, TSESTree } from '@typescript-eslint/utils';
export type Visitor = (source: TSESTree.StringLiteral, importer: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration | TSESTree.ExportAllDeclaration | TSESTree.CallExpression | TSESTree.ImportExpression | TSESTree.StringLiteral) => void;
export interface ModuleOptions {
    amd?: boolean;
    commonjs?: boolean;
    esmodule?: boolean;
    ignore?: string[];
}
export declare function moduleVisitor(visitor: Visitor, options?: ModuleOptions): TSESLint.RuleListener;
export declare function makeOptionsSchema(additionalProperties?: Record<string, JSONSchema.JSONSchema4>): JSONSchema.JSONSchema4ObjectSchema;
export declare const optionsSchema: JSONSchema.JSONSchema4ObjectSchema;
