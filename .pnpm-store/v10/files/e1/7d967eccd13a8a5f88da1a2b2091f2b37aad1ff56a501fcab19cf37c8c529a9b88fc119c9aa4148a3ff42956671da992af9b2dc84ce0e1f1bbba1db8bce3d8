import type { Child, FC, JSXNode, Props } from '../base';
import { DOM_RENDERER, DOM_STASH } from '../constants';
import type { Context as JSXContext } from '../context';
export type HasRenderToDom = FC<any> & {
    [DOM_RENDERER]: FC<any>;
};
export type ErrorHandler = (error: any, retry: () => void) => Child | undefined;
type Container = HTMLElement | DocumentFragment;
type LocalJSXContexts = [JSXContext<unknown>, unknown][] | undefined;
type SupportedElement = HTMLElement | SVGElement | MathMLElement;
export type PreserveNodeType = 1 | 2;
export type NodeObject = {
    pP: Props | undefined;
    nN: Node | undefined;
    vC: Node[];
    pC?: Node[];
    vR: Node[];
    n?: string;
    f?: boolean;
    s?: boolean;
    c: Container | undefined;
    e: SupportedElement | Text | undefined;
    p?: PreserveNodeType;
    a?: boolean;
    o?: NodeObject;
    [DOM_STASH]: [
        number,
        any[][],
        LocalJSXContexts,
        [
            Context,
            Function,
            NodeObject
        ]
    ] | [number, any[][]];
} & JSXNode;
type NodeString = {
    t: string;
    d: boolean;
    s?: boolean;
} & {
    e?: Text;
    vC: undefined;
    nN: undefined;
    p?: true;
    key: undefined;
    tag: undefined;
};
export type Node = NodeString | NodeObject;
export type PendingType = 0 | 1 | 2;
export type UpdateHook = (context: Context, node: Node, cb: (context: Context) => void) => Promise<void>;
export type Context = [
    PendingType,
    boolean,
    UpdateHook,
    boolean,
    boolean,
    [
        Context,
        Function,
        NodeObject
    ][]
] | [PendingType, boolean, UpdateHook, boolean] | [PendingType, boolean, UpdateHook] | [PendingType, boolean] | [PendingType] | [];
export declare const buildDataStack: [Context, Node][];
export declare const getNameSpaceContext: () => JSXContext<string> | undefined;
export declare const build: (context: Context, node: NodeObject, children?: Child[]) => void;
export declare const buildNode: (node: Child) => Node | undefined;
export declare const update: (context: Context, node: NodeObject) => Promise<NodeObject | undefined>;
export declare const renderNode: (node: NodeObject, container: Container) => void;
export declare const render: (jsxNode: Child, container: Container) => void;
export declare const flushSync: (callback: () => void) => void;
export declare const createPortal: (children: Child, container: HTMLElement, key?: string) => Child;
export {};
