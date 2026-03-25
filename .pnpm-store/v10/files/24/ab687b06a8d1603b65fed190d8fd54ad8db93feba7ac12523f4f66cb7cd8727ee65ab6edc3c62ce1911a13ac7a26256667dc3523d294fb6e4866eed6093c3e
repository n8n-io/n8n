import type { TSESLint } from '@typescript-eslint/utils';
import type { MinimatchOptions } from 'minimatch';
declare const modifierValues: readonly ["always", "ignorePackages", "never"];
export type Modifier = (typeof modifierValues)[number];
export type ModifierByFileExtension = Partial<Record<string, Modifier>>;
export interface OptionsItemWithPatternProperty {
    ignorePackages?: boolean;
    checkTypeImports?: boolean;
    pattern: ModifierByFileExtension;
    pathGroupOverrides?: PathGroupOverride[];
    fix?: boolean;
}
export interface PathGroupOverride {
    pattern: string;
    patternOptions?: Record<string, MinimatchOptions>;
    action: 'enforce' | 'ignore';
}
export interface OptionsItemWithoutPatternProperty {
    ignorePackages?: boolean;
    checkTypeImports?: boolean;
    pathGroupOverrides?: PathGroupOverride[];
    fix?: boolean;
}
export type Options = [] | [OptionsItemWithoutPatternProperty] | [OptionsItemWithPatternProperty] | [Modifier] | [Modifier, OptionsItemWithoutPatternProperty] | [Modifier, OptionsItemWithPatternProperty] | [Modifier, ModifierByFileExtension] | [ModifierByFileExtension];
export interface NormalizedOptions {
    defaultConfig?: Modifier;
    pattern?: Record<string, Modifier>;
    ignorePackages?: boolean;
    checkTypeImports?: boolean;
    pathGroupOverrides?: PathGroupOverride[];
    fix?: boolean;
}
export type MessageId = 'missing' | 'missingKnown' | 'unexpected' | 'addMissing' | 'removeUnexpected';
declare const _default: TSESLint.RuleModule<MessageId, Options, import("../utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
export default _default;
