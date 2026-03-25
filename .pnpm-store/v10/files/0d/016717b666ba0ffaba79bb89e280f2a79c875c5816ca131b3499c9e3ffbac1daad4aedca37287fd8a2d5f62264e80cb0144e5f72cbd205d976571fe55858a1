import type { TSESLint } from '@typescript-eslint/utils';
type AccessibilityLevel = 'explicit' | 'no-public' | 'off';
export interface Config {
    accessibility?: AccessibilityLevel;
    ignoredMethodNames?: string[];
    overrides?: {
        accessors?: AccessibilityLevel;
        constructors?: AccessibilityLevel;
        methods?: AccessibilityLevel;
        parameterProperties?: AccessibilityLevel;
        properties?: AccessibilityLevel;
    };
}
export type Options = [Config];
export type MessageIds = 'addExplicitAccessibility' | 'missingAccessibility' | 'unwantedPublicAccessibility';
declare const _default: TSESLint.RuleModule<MessageIds, Options, import("../../rules").ESLintPluginDocs, TSESLint.RuleListener>;
export default _default;
//# sourceMappingURL=explicit-member-accessibility.d.ts.map