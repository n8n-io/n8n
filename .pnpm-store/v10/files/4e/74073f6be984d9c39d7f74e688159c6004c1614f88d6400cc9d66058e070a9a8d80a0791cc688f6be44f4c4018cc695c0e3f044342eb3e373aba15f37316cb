import type { DeclarationMetadata, ModuleOptions } from '../utils/index.js';
import { ExportMap } from '../utils/index.js';
export interface Options extends ModuleOptions {
    allowUnsafeDynamicCyclicDependency?: boolean;
    ignoreExternal?: boolean;
    maxDepth?: number | '∞';
}
export type MessageId = 'cycle' | 'cycleSource';
export interface Traverser {
    mget(): ExportMap | null;
    route: Array<DeclarationMetadata['source']>;
}
declare const _default: import("@typescript-eslint/utils/ts-eslint").RuleModule<MessageId, [(Options | undefined)?], import("../utils/create-rule.ts").ImportXPluginDocs, import("@typescript-eslint/utils/ts-eslint").RuleListener>;
export default _default;
