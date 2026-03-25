import type * as TSESLint from '../ts-eslint';
import type { ParserServices, ParserServicesWithTypeInformation } from '../ts-estree';
/**
 * Try to retrieve type-aware parser service from context.
 * This **_will_** throw if it is not available.
 */
declare function getParserServices<TMessageIds extends string, TOptions extends readonly unknown[]>(context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>): ParserServicesWithTypeInformation;
/**
 * Try to retrieve type-aware parser service from context.
 * This **_will_** throw if it is not available.
 */
declare function getParserServices<TMessageIds extends string, TOptions extends readonly unknown[]>(context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>, allowWithoutFullTypeInformation: false): ParserServicesWithTypeInformation;
/**
 * Try to retrieve type-aware parser service from context.
 * This **_will not_** throw if it is not available.
 */
declare function getParserServices<TMessageIds extends string, TOptions extends readonly unknown[]>(context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>, allowWithoutFullTypeInformation: true): ParserServices;
/**
 * Try to retrieve type-aware parser service from context.
 * This may or may not throw if it is not available, depending on if `allowWithoutFullTypeInformation` is `true`
 */
declare function getParserServices<TMessageIds extends string, TOptions extends readonly unknown[]>(context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>, allowWithoutFullTypeInformation: boolean): ParserServices;
export { getParserServices };
//# sourceMappingURL=getParserServices.d.ts.map