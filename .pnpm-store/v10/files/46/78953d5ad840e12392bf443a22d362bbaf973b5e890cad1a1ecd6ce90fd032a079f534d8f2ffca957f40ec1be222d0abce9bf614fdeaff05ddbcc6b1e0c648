import type { HtmlEscaped, HtmlEscapedString, StringBufferWithCallbacks } from '../utils/html';
import { DOM_MEMO } from './constants';
import type { Context } from './context';
import type { JSX as HonoJSX, IntrinsicElements as IntrinsicElementsDefined } from './intrinsic-elements';
export type Props = Record<string, any>;
export type FC<P = Props> = {
    (props: P): HtmlEscapedString | Promise<HtmlEscapedString> | null;
    defaultProps?: Partial<P> | undefined;
    displayName?: string | undefined;
};
export type DOMAttributes = HonoJSX.HTMLAttributes;
export declare namespace JSX {
    type Element = HtmlEscapedString | Promise<HtmlEscapedString>;
    interface ElementChildrenAttribute {
        children: Child;
    }
    interface IntrinsicElements extends IntrinsicElementsDefined {
        [tagName: string]: Props;
    }
    interface IntrinsicAttributes {
        key?: string | number | bigint | null | undefined;
    }
}
export declare const getNameSpaceContext: () => Context<string> | undefined;
export declare const booleanAttributes: string[];
type LocalContexts = [Context<unknown>, unknown][];
export type Child = string | Promise<string> | number | JSXNode | null | undefined | boolean | Child[];
export declare class JSXNode implements HtmlEscaped {
    tag: string | Function;
    props: Props;
    key?: string;
    children: Child[];
    isEscaped: true;
    localContexts?: LocalContexts;
    constructor(tag: string | Function, props: Props, children: Child[]);
    get type(): string | Function;
    get ref(): any;
    toString(): string | Promise<string>;
    toStringToBuffer(buffer: StringBufferWithCallbacks): void;
}
export declare class JSXFragmentNode extends JSXNode {
    toStringToBuffer(buffer: StringBufferWithCallbacks): void;
}
export declare const jsx: (tag: string | Function, props: Props | null, ...children: (string | number | HtmlEscapedString)[]) => JSXNode;
export declare const jsxFn: (tag: string | Function, props: Props, children: (string | number | HtmlEscapedString)[]) => JSXNode;
export declare const shallowEqual: (a: Props, b: Props) => boolean;
export type MemorableFC<T> = FC<T> & {
    [DOM_MEMO]: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean;
};
export declare const memo: <T>(component: FC<T>, propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean) => FC<T>;
export declare const Fragment: ({ children, }: {
    key?: string;
    children?: Child | HtmlEscapedString;
}) => HtmlEscapedString;
export declare const isValidElement: (element: unknown) => element is JSXNode;
export declare const cloneElement: <T extends JSXNode | JSX.Element>(element: T, props: Partial<Props>, ...children: Child[]) => T;
export declare const reactAPICompatVersion = "19.0.0-hono-jsx";
export {};
