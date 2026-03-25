declare module 'pug-lexer' {
  namespace lex {
    export interface Loc {
      start: {line: number; column: number};
      end: {line: number; column: number};
    }

    export type LexTokenType =
      | ':'
      | '&attributes'
      | 'attribute'
      | 'block'
      | 'blockcode'
      | 'call'
      | 'case'
      | 'class'
      | 'code'
      | 'comment'
      | 'default'
      | 'doctype'
      | 'dot'
      | 'each'
      | 'eachOf'
      | 'else-if'
      | 'else'
      | 'end-attributes'
      | 'end-pipeless-text'
      | 'end-pug-interpolation'
      | 'eos'
      | 'extends'
      | 'filter'
      | 'id'
      | 'if'
      | 'include'
      | 'indent'
      | 'interpolated-code'
      | 'interpolation'
      | 'mixin-block'
      | 'mixin'
      | 'newline'
      | 'outdent'
      | 'path'
      | 'slash'
      | 'start-attributes'
      | 'start-pipeless-text'
      | 'start-pug-interpolation'
      | 'tag'
      | 'text-html'
      | 'text'
      | 'when'
      | 'while'
      | 'yield';

    export interface LexToken<Type extends LexTokenType> {
      type: Type;
      loc: Loc;
    }

    export interface TagToken extends LexToken<'tag'> {
      val: string;
    }

    export type StartAttributesToken = LexToken<'start-attributes'>;

    export interface AttributeToken extends LexToken<'attribute'> {
      name: string;
      val: string | boolean;
      mustEscape: boolean;
    }

    export type EndAttributesToken = LexToken<'end-attributes'>;

    export interface IndentToken extends LexToken<'indent'> {
      val: number;
    }

    export interface ClassToken extends LexToken<'class'> {
      val: string;
    }

    export type OutdentToken = LexToken<'outdent'>;

    export type EosToken = LexToken<'eos'>;

    export interface CommentToken extends LexToken<'comment'> {
      val: string;
      buffer: boolean;
    }

    export type NewlineToken = LexToken<'newline'>;

    export interface TextToken extends LexToken<'text'> {
      val: string;
    }

    export interface InterpolatedCodeToken
      extends LexToken<'interpolated-code'> {
      mustEscape: boolean;
      buffer: boolean;
      val: string;
    }

    export interface CodeToken extends LexToken<'code'> {
      val: string;
      mustEscape: boolean;
      buffer: boolean;
    }

    export interface IdToken extends LexToken<'id'> {
      val: string;
    }

    export type StartPipelessTextToken = LexToken<'start-pipeless-text'>;

    export type EndPipelessTextToken = LexToken<'end-pipeless-text'>;

    export interface DoctypeToken extends LexToken<'doctype'> {
      val: string;
    }

    export type DotToken = LexToken<'dot'>;

    export interface BlockToken extends LexToken<'block'> {
      val: string;
      mode: 'replace' | 'prepend' | 'append';
    }

    export type ExtendsToken = LexToken<'extends'>;

    export interface PathToken extends LexToken<'path'> {
      val: string;
    }

    export type StartPugInterpolationToken = LexToken<
      'start-pug-interpolation'
    >;

    export type EndPugInterpolationToken = LexToken<'end-pug-interpolation'>;

    export interface InterpolationToken extends LexToken<'interpolation'> {
      val: string;
    }

    export type IncludeToken = LexToken<'include'>;

    export interface FilterToken extends LexToken<'filter'> {
      val: string;
    }

    export interface CallToken extends LexToken<'call'> {
      val: string;
      args: string;
    }

    export interface MixinToken extends LexToken<'mixin'> {
      val: string;
      args: string | null;
    }

    export interface IfToken extends LexToken<'if'> {
      val: string;
    }

    export type MixinBlockToken = LexToken<'mixin-block'>;

    export interface ElseToken extends LexToken<'else'> {
      val: string;
    }

    export interface AndAttributesToken extends LexToken<'&attributes'> {
      val: string;
    }

    export interface TextHtmlToken extends LexToken<'text-html'> {
      val: string;
    }

    export interface EachToken extends LexToken<'each'> {
      val: string;
      key: string | null;
      code: string;
    }

    export interface EachOfToken extends LexToken<'eachOf'> {
      val: string;
      value: string;
      code: string;
    }

    export interface WhileToken extends LexToken<'while'> {
      val: string;
    }

    export interface CaseToken extends LexToken<'case'> {
      val: string;
    }

    export interface WhenToken extends LexToken<'when'> {
      val: string;
    }

    export type ColonToken = LexToken<':'>;

    export type DefaultToken = LexToken<'default'>;

    export interface ElseIfToken extends LexToken<'else-if'> {
      val: string;
    }

    export type BlockcodeToken = LexToken<'blockcode'>;

    export type YieldToken = LexToken<'yield'>;

    export type SlashToken = LexToken<'slash'>;

    export type Token =
      | AndAttributesToken
      | AttributeToken
      | BlockcodeToken
      | BlockToken
      | CallToken
      | CaseToken
      | ClassToken
      | CodeToken
      | ColonToken
      | CommentToken
      | DefaultToken
      | DoctypeToken
      | DotToken
      | EachToken
      | EachOfToken
      | ElseIfToken
      | ElseToken
      | EndAttributesToken
      | EndPipelessTextToken
      | EndPugInterpolationToken
      | EosToken
      | ExtendsToken
      | FilterToken
      | IdToken
      | IfToken
      | IncludeToken
      | IndentToken
      | InterpolatedCodeToken
      | InterpolationToken
      | MixinBlockToken
      | MixinToken
      | NewlineToken
      | OutdentToken
      | PathToken
      | SlashToken
      | StartAttributesToken
      | StartPipelessTextToken
      | StartPugInterpolationToken
      | TagToken
      | TextHtmlToken
      | TextToken
      | WhenToken
      | WhileToken
      | YieldToken;

    export type LexerFunction = (type: string, exp?: any) => boolean;
    export interface LexerOptions {
      filename: string;
      interpolated?: boolean;
      startingLine?: number;
      startingColumn?: number;
      plugins?: LexerFunction[];
    }
    export class Lexer {
      input: string;
      originalInput: string;
      filename?: string;
      interpolated: boolean;
      lineno: number;
      colno: number;
      plugins: LexerFunction[];
      indentStack: number[];
      indentRe: RegExp | null;
      interpolationAllowed: boolean;
      whitespaceRe: RegExp;
      tokens: Token[];
      ended: boolean;
      constructor(str: string, options?: LexerOptions);
      error(code: string, message: string): never;
      assert(value: any, message: string): void;
      isExpression(exp: string): boolean;
      assertExpression(exp: string, noThrow?: boolean): boolean;
      assertNestingCorrect(exp: string): void;
      private tok<Type extends LexTokenType>(
        type: Type,
        val?: any,
      ): LexToken<Type>;
      private tokEnd<Type extends LexTokenType>(
        tok: LexToken<Type>,
      ): LexToken<Type>;
      private incrementLine(increment: number): void;
      private incrementColumn(increment: number): void;
      private consume(len: number): void;
      private scan<Type extends LexTokenType>(
        regexp: RegExp,
        type: Type,
      ): LexToken<Type> | undefined;
      private scanEndOfLine<Type extends LexTokenType>(
        regexp: RegExp,
        type: Type,
      ): LexToken<Type> | undefined;
      private bracketExpression(skip?: number): number;
      scanIndentation(): RegExpExecArray | null;
      eos(): true | undefined;
      blank(): true | undefined;
      comment(): true | undefined;
      interpolation(): true | undefined;
      tag(): true | undefined;
      filter(): true | undefined;
      doctype(): true | undefined;
      id(): true | undefined;
      className(): true | undefined;
      endInterpolation(): true | undefined;
      addText(
        type: LexTokenType,
        value: string,
        prefix?: string,
        escaped?: number,
      ): void;
      text(): true | undefined;
      textHtml(): true | undefined;
      dot(): true | undefined;
      extends(): true | undefined;
      prepend(): true | undefined;
      append(): true | undefined;
      block(): true | undefined;
      mixinBlock(): true | undefined;
      yield(): true | undefined;
      include(): true | undefined;
      path(): true | undefined;
      case(): true | undefined;
      when(): true | undefined;
      default(): true | undefined;
      call(): true | undefined;
      mixin(): true | undefined;
      conditional(): true | undefined;
      while(): true | undefined;
      each(): true | undefined;
      eachOf(): true | undefined;
      code(): true | undefined;
      blockCode(): true | undefined;
      attribute(): string;
      attributeValue(
        str: string,
      ): {val?: string; mustEscape?: boolean; remainingSource: string};
      attrs(): true | undefined;
      attributesBlock(): true | undefined;
      indent(): true | NewlineToken | undefined;
      pipelessText(indents?: number): boolean | undefined;
      slash(): true | undefined;
      colon(): true | undefined;
      fail(): never;
      callLexerFunction(func: string): boolean;
      private advance(): boolean;
      getTokens(): Token[];
    }
  }
  function lex(str: string, options?: lex.LexerOptions): lex.Token[];
  export = lex;
}
