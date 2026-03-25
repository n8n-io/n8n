import type { ESLintUtils, TSESLint } from '@typescript-eslint/utils';
export declare function RuleCreator<PluginDocs = unknown>(urlCreator: (ruleName: string) => string): <Options extends readonly unknown[], MessageIds extends string>({ meta, name, ...rule }: Readonly<ESLintUtils.RuleWithMetaAndName<Options, MessageIds, PluginDocs>>) => TSESLint.RuleModule<MessageIds, Options, PluginDocs>;
export interface ImportXPluginDocs {
    category?: string;
    recommended?: true;
}
export declare const createRule: <Options extends readonly unknown[], MessageIds extends string>({ meta, name, ...rule }: Readonly<ESLintUtils.RuleWithMetaAndName<Options, MessageIds, ImportXPluginDocs>>) => ESLintUtils.RuleModule<MessageIds, Options, ImportXPluginDocs, ESLintUtils.RuleListener>;
