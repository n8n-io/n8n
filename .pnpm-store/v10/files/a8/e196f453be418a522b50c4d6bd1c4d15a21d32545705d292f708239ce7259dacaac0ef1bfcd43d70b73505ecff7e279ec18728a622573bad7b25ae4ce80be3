export declare const PSEUDO_GLOBAL_SELECTOR = ":-hono-global";
export declare const isPseudoGlobalSelectorRe: RegExp;
export declare const DEFAULT_STYLE_ID = "hono-css";
export declare const SELECTOR: unique symbol;
export declare const CLASS_NAME: unique symbol;
export declare const STYLE_STRING: unique symbol;
export declare const SELECTORS: unique symbol;
export declare const EXTERNAL_CLASS_NAMES: unique symbol;
declare const CSS_ESCAPED: unique symbol;
export interface CssClassName {
    [SELECTOR]: string;
    [CLASS_NAME]: string;
    [STYLE_STRING]: string;
    [SELECTORS]: CssClassName[];
    [EXTERNAL_CLASS_NAMES]: string[];
}
export declare const IS_CSS_ESCAPED: unique symbol;
interface CssEscapedString {
    [CSS_ESCAPED]: string;
}
/**
 * @experimental
 * `rawCssString` is an experimental feature.
 * The API might be changed.
 */
export declare const rawCssString: (value: string) => CssEscapedString;
export declare const minify: (css: string) => string;
type CssVariableBasicType = CssClassName | CssEscapedString | string | number | boolean | null | undefined;
type CssVariableAsyncType = Promise<CssVariableBasicType>;
type CssVariableArrayType = (CssVariableBasicType | CssVariableAsyncType)[];
export type CssVariableType = CssVariableBasicType | CssVariableAsyncType | CssVariableArrayType;
export declare const buildStyleString: (strings: TemplateStringsArray, values: CssVariableType[]) => [string, string, CssClassName[], string[]];
export declare const cssCommon: (strings: TemplateStringsArray, values: CssVariableType[]) => CssClassName;
export declare const cxCommon: (args: (string | boolean | null | undefined | CssClassName)[]) => (string | boolean | null | undefined | CssClassName)[];
export declare const keyframesCommon: (strings: TemplateStringsArray, ...values: CssVariableType[]) => CssClassName;
type ViewTransitionType = {
    (strings: TemplateStringsArray, values: CssVariableType[]): CssClassName;
    (content: CssClassName): CssClassName;
    (): CssClassName;
};
export declare const viewTransitionCommon: ViewTransitionType;
export {};
