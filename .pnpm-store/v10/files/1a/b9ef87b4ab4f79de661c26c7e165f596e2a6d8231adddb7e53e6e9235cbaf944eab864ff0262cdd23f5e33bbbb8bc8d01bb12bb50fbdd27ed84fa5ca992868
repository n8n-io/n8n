import type { TSESLint } from '@typescript-eslint/utils';
import type { AlphabetizeOptions, Arrayable, ImportType, NamedOptions, NewLinesOptions, PathGroup } from '../types.js';
export interface Options {
    'newlines-between'?: NewLinesOptions;
    'newlines-between-types'?: NewLinesOptions;
    named?: boolean | NamedOptions;
    alphabetize?: Partial<AlphabetizeOptions>;
    consolidateIslands?: 'inside-groups' | 'never';
    distinctGroup?: boolean;
    groups?: ReadonlyArray<Arrayable<ImportType>>;
    pathGroupsExcludedImportTypes?: ImportType[];
    pathGroups?: PathGroup[];
    sortTypesGroup?: boolean;
    warnOnUnassignedImports?: boolean;
}
type MessageId = 'error' | 'noLineWithinGroup' | 'noLineBetweenGroups' | 'oneLineBetweenGroups' | 'order' | 'oneLineBetweenTheMultiLineImport' | 'oneLineBetweenThisMultiLineImport' | 'noLineBetweenSingleLineImport';
declare const _default: TSESLint.RuleModule<MessageId, [(Options | undefined)?], import("../utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
export default _default;
