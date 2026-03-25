/**
 * @module
 * HTML utility.
 */
export declare const HtmlEscapedCallbackPhase: {
    readonly Stringify: 1;
    readonly BeforeStream: 2;
    readonly Stream: 3;
};
type HtmlEscapedCallbackOpts = {
    buffer?: [string];
    phase: (typeof HtmlEscapedCallbackPhase)[keyof typeof HtmlEscapedCallbackPhase];
    context: Readonly<object>;
};
export type HtmlEscapedCallback = (opts: HtmlEscapedCallbackOpts) => Promise<string> | undefined;
export type HtmlEscaped = {
    isEscaped: true;
    callbacks?: HtmlEscapedCallback[];
};
export type HtmlEscapedString = string & HtmlEscaped;
/**
 * StringBuffer contains string and Promise<string> alternately
 * The length of the array will be odd, the odd numbered element will be a string,
 * and the even numbered element will be a Promise<string>.
 * When concatenating into a single string, it must be processed from the tail.
 * @example
 * [
 *   'framework.',
 *   Promise.resolve('ultra fast'),
 *   'a ',
 *   Promise.resolve('is '),
 *   'Hono',
 * ]
 */
export type StringBuffer = (string | Promise<string>)[];
export type StringBufferWithCallbacks = StringBuffer & {
    callbacks: HtmlEscapedCallback[];
};
export declare const raw: (value: unknown, callbacks?: HtmlEscapedCallback[]) => HtmlEscapedString;
export declare const stringBufferToString: (buffer: StringBuffer, callbacks: HtmlEscapedCallback[] | undefined) => Promise<HtmlEscapedString>;
export declare const escapeToBuffer: (str: string, buffer: StringBuffer) => void;
export declare const resolveCallbackSync: (str: string | HtmlEscapedString) => string;
export declare const resolveCallback: (str: string | HtmlEscapedString | Promise<string>, phase: (typeof HtmlEscapedCallbackPhase)[keyof typeof HtmlEscapedCallbackPhase], preserveCallbacks: boolean, context: object, buffer?: [string]) => Promise<string>;
export {};
