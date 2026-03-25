import type { TSESTree } from '@typescript-eslint/utils';
import type { Arrayable } from '../types.js';
export interface Options {
    basePath?: string;
    zones?: Array<{
        from: Arrayable<string>;
        target: Arrayable<string>;
        message?: string;
        except?: string[];
    }>;
}
export type MessageId = 'path' | 'mixedGlob' | 'glob' | 'zone';
export interface Validator {
    isPathRestricted: (absoluteImportPath: string) => boolean;
    hasValidExceptions: boolean;
    isPathException?: (absoluteImportPath: string) => boolean;
    reportInvalidException: (node: TSESTree.Node) => void;
}
declare const _default: import("@typescript-eslint/utils/ts-eslint").RuleModule<MessageId, [(Options | undefined)?], import("../utils/create-rule.ts").ImportXPluginDocs, import("@typescript-eslint/utils/ts-eslint").RuleListener>;
export default _default;
