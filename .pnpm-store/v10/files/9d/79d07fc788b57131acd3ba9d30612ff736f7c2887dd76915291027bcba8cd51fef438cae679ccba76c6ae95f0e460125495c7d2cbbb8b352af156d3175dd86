import type { RuleContext, RuleListener, RuleMetaData, RuleMetaDataDocs, RuleModule } from '../ts-eslint/Rule';
export type { RuleListener, RuleModule };
export type NamedCreateRuleMetaDocs = Omit<RuleMetaDataDocs, 'url'>;
export type NamedCreateRuleMeta<TMessageIds extends string> = Omit<RuleMetaData<TMessageIds>, 'docs'> & {
    docs: NamedCreateRuleMetaDocs;
};
export interface RuleCreateAndOptions<TOptions extends readonly unknown[], TMessageIds extends string> {
    create: (context: Readonly<RuleContext<TMessageIds, TOptions>>, optionsWithDefault: Readonly<TOptions>) => RuleListener;
    defaultOptions: Readonly<TOptions>;
}
export interface RuleWithMeta<TOptions extends readonly unknown[], TMessageIds extends string> extends RuleCreateAndOptions<TOptions, TMessageIds> {
    meta: RuleMetaData<TMessageIds>;
}
export interface RuleWithMetaAndName<TOptions extends readonly unknown[], TMessageIds extends string> extends RuleCreateAndOptions<TOptions, TMessageIds> {
    meta: NamedCreateRuleMeta<TMessageIds>;
    name: string;
}
/**
 * Creates reusable function to create rules with default options and docs URLs.
 *
 * @param urlCreator Creates a documentation URL for a given rule name.
 * @returns Function to create a rule with the docs URL format.
 */
export declare function RuleCreator(urlCreator: (ruleName: string) => string): <TOptions extends readonly unknown[], TMessageIds extends string>({ name, meta, ...rule }: Readonly<RuleWithMetaAndName<TOptions, TMessageIds>>) => RuleModule<TMessageIds, TOptions, RuleListener>;
export declare namespace RuleCreator {
    var withoutDocs: typeof createRule;
}
/**
 * Creates a well-typed TSESLint custom ESLint rule without a docs URL.
 *
 * @returns Well-typed TSESLint custom ESLint rule.
 * @remarks It is generally better to provide a docs URL function to RuleCreator.
 */
declare function createRule<TOptions extends readonly unknown[], TMessageIds extends string>({ create, defaultOptions, meta, }: Readonly<RuleWithMeta<TOptions, TMessageIds>>): RuleModule<TMessageIds, TOptions>;
//# sourceMappingURL=RuleCreator.d.ts.map