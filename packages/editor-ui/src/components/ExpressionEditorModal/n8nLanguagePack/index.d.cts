import { LRLanguage, LanguageSupport } from "@codemirror/language";
declare const parserWithMetaData: import("@lezer/lr").LRParser;
declare const n8nExpressionLanguage: LRLanguage;
declare function n8nExpression(): LanguageSupport;
export { parserWithMetaData, n8nExpressionLanguage, n8nExpression };
