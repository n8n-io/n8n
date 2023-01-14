import { LRLanguage, LanguageSupport } from "@codemirror/language";
declare const parserWithMetaData: import("@lezer/lr").LRParser;
declare const n8nLanguage: LRLanguage;
declare function n8nExpression(): LanguageSupport;
export { parserWithMetaData, n8nLanguage, n8nExpression };
