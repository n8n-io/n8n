/**
 * xss
 *
 * @author Zongmin Lei<leizongmin@gmail.com>
 */

declare module "xss" {
  global {
    function filterXSS(html: string, options?: IFilterXSSOptions): string;

    namespace XSS {
      export interface IFilterXSSOptions {
        allowList?: IWhiteList;
        whiteList?: IWhiteList;
        onTag?: OnTagHandler;
        onTagAttr?: OnTagAttrHandler;
        onIgnoreTag?: OnTagHandler;
        onIgnoreTagAttr?: OnTagAttrHandler;
        safeAttrValue?: SafeAttrValueHandler;
        escapeHtml?: EscapeHandler;
        stripIgnoreTag?: boolean;
        stripIgnoreTagBody?: boolean | string[];
        allowCommentTag?: boolean;
        stripBlankChar?: boolean;
        singleQuotedAttributeValue?: boolean;
        css?: {} | boolean;
      }

      interface IWhiteList extends Record<string, string[] | undefined> {
        a?: string[];
        abbr?: string[];
        address?: string[];
        area?: string[];
        article?: string[];
        aside?: string[];
        audio?: string[];
        b?: string[];
        bdi?: string[];
        bdo?: string[];
        big?: string[];
        blockquote?: string[];
        br?: string[];
        caption?: string[];
        center?: string[];
        cite?: string[];
        code?: string[];
        col?: string[];
        colgroup?: string[];
        dd?: string[];
        del?: string[];
        details?: string[];
        div?: string[];
        dl?: string[];
        dt?: string[];
        em?: string[];
        figure?: string[];
        figcaption?: string[];
        font?: string[];
        footer?: string[];
        h1?: string[];
        h2?: string[];
        h3?: string[];
        h4?: string[];
        h5?: string[];
        h6?: string[];
        header?: string[];
        hr?: string[];
        i?: string[];
        img?: string[];
        ins?: string[];
        li?: string[];
        mark?: string[];
        nav?: string[];
        ol?: string[];
        p?: string[];
        pre?: string[];
        s?: string[];
        section?: string[];
        small?: string[];
        span?: string[];
        sub?: string[];
        sup?: string[];
        strong?: string[];
        strike?: string[];
        summary?: string[];
        table?: string[];
        tbody?: string[];
        td?: string[];
        tfoot?: string[];
        th?: string[];
        thead?: string[];
        tr?: string[];
        tt?: string[];
        u?: string[];
        ul?: string[];
        video?: string[];
      }

      type OnTagHandler = (
        tag: string,
        html: string,
        options: {
          sourcePosition?: number;
          position?: number;
          isClosing?: boolean;
          isWhite?: boolean;
        }
      ) => string | void;

      type OnTagAttrHandler = (
        tag: string,
        name: string,
        value: string,
        isWhiteAttr: boolean
      ) => string | void;

      type SafeAttrValueHandler = (
        tag: string,
        name: string,
        value: string,
        cssFilter: ICSSFilter
      ) => string;

      type EscapeHandler = (str: string) => string;

      interface ICSSFilter {
        process(value: string): string;
      }
    }
  }
  export interface IFilterXSSOptions extends XSS.IFilterXSSOptions {}

  export interface IWhiteList extends XSS.IWhiteList {}

  export type OnTagHandler = XSS.OnTagHandler;

  export type OnTagAttrHandler = XSS.OnTagAttrHandler;

  export type SafeAttrValueHandler = XSS.SafeAttrValueHandler;

  export type EscapeHandler = XSS.EscapeHandler;

  export interface ICSSFilter extends XSS.ICSSFilter {}

  export function StripTagBody(
    tags: string[],
    next: () => void
  ): {
    onIgnoreTag(
      tag: string,
      html: string,
      options: {
        position: number;
        isClosing: boolean;
      }
    ): string;
    remove(html: string): string;
  };

  export class FilterXSS {
    constructor(options?: IFilterXSSOptions);
    process(html: string): string;
  }

  export function filterXSS(html: string, options?: IFilterXSSOptions): string;
  export function parseTag(
    html: string,
    onTag: (
      sourcePosition: number,
      position: number,
      tag: string,
      html: string,
      isClosing: boolean
    ) => string,
    escapeHtml: EscapeHandler
  ): string;
  export function parseAttr(
    html: string,
    onAttr: (name: string, value: string) => string
  ): string;
  export const whiteList: IWhiteList;
  export function getDefaultWhiteList(): IWhiteList;
  export const onTag: OnTagHandler;
  export const onIgnoreTag: OnTagHandler;
  export const onTagAttr: OnTagAttrHandler;
  export const onIgnoreTagAttr: OnTagAttrHandler;
  export const safeAttrValue: SafeAttrValueHandler;
  export const escapeHtml: EscapeHandler;
  export const escapeQuote: EscapeHandler;
  export const unescapeQuote: EscapeHandler;
  export const escapeHtmlEntities: EscapeHandler;
  export const escapeDangerHtml5Entities: EscapeHandler;
  export const clearNonPrintableCharacter: EscapeHandler;
  export const friendlyAttrValue: EscapeHandler;
  export const escapeAttrValue: EscapeHandler;
  export function onIgnoreTagStripAll(): string;
  export const stripCommentTag: EscapeHandler;
  export const stripBlankChar: EscapeHandler;
  export const attributeWrapSign: string;
  export const cssFilter: ICSSFilter;
  export function getDefaultCSSWhiteList(): ICSSFilter;

  const xss: (html: string, options?: IFilterXSSOptions) => string;
  export default xss;
}
