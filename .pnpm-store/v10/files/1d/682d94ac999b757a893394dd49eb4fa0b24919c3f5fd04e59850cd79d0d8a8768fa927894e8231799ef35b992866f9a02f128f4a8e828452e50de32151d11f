/**
 * @module
 * This module provides APIs for `hono/jsx/server`, which is compatible with `react-dom/server`.
 */
import type { Child } from '../base';
import version from './';
export interface RenderToStringOptions {
    identifierPrefix?: string;
}
/**
 * Render JSX element to string.
 * @param element JSX element to render.
 * @param options Options for rendering.
 * @returns Rendered string.
 */
declare const renderToString: (element: Child, options?: RenderToStringOptions) => string;
export interface RenderToReadableStreamOptions {
    identifierPrefix?: string;
    namespaceURI?: string;
    nonce?: string;
    bootstrapScriptContent?: string;
    bootstrapScripts?: string[];
    bootstrapModules?: string[];
    progressiveChunkSize?: number;
    signal?: AbortSignal;
    onError?: (error: unknown) => string | void;
}
/**
 * Render JSX element to readable stream.
 * @param element JSX element to render.
 * @param options Options for rendering.
 * @returns Rendered readable stream.
 */
declare const renderToReadableStream: (element: Child, options?: RenderToReadableStreamOptions) => Promise<ReadableStream<Uint8Array>>;
export { renderToString, renderToReadableStream, version };
declare const _default: {
    renderToString: (element: Child, options?: RenderToStringOptions) => string;
    renderToReadableStream: (element: Child, options?: RenderToReadableStreamOptions) => Promise<ReadableStream<Uint8Array>>;
    version: {
        version: string;
        useState: {
            <T>(initialState: T | (() => T)): [T, (newState: T | ((currentState: T) => T)) => void];
            <T = undefined>(): [T | undefined, (newState: T | ((currentState: T | undefined) => T | undefined) | undefined) => void];
        };
        useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
        useRef: <T>(initialValue: T | null) => import("..").RefObject<T>;
        useCallback: <T extends Function>(callback: T, deps: readonly unknown[]) => T;
        use: <T>(promise: Promise<T>) => T;
        startTransition: (callback: () => void) => void;
        useTransition: () => [boolean, (callback: () => void | Promise<void>) => void];
        useDeferredValue: <T>(value: T, initialValue?: T) => T;
        startViewTransition: (callback: () => void) => void;
        useViewTransition: () => [boolean, (callback: () => void) => void];
        useMemo: <T>(factory: () => T, deps: readonly unknown[]) => T;
        useLayoutEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
        useInsertionEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
        useReducer: <T, A>(reducer: (state: T, action: A) => T, initialArg: T, init?: (initialState: T) => T) => [T, (action: A) => void];
        useId: () => string;
        useDebugValue: (_value: unknown, _formatter?: (value: unknown) => string) => void;
        createRef: <T>() => import("..").RefObject<T>;
        forwardRef: <T, P = {}>(Component: (props: P, ref?: import("..").RefObject<T>) => import("./jsx-dev-runtime").JSX.Element) => ((props: P & {
            ref?: import("..").RefObject<T>;
        }) => import("./jsx-dev-runtime").JSX.Element);
        useImperativeHandle: <T>(ref: import("..").RefObject<T>, createHandle: () => T, deps: readonly unknown[]) => void;
        useSyncExternalStore: <T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T) => T;
        useFormStatus: () => {
            pending: false;
            data: null;
            method: null;
            action: null;
        } | {
            pending: true;
            data: FormData;
            method: "get" | "post";
            action: string | ((formData: FormData) => void | Promise<void>);
        };
        useActionState: <T>(fn: Function, initialState: T, permalink?: string) => [T, Function];
        useOptimistic: <T, N>(state: T, updateState: (currentState: T, action: N) => T) => [T, (action: N) => void];
        Suspense: import("..").FC<import("..").PropsWithChildren<{
            fallback: any;
        }>>;
        ErrorBoundary: import("..").FC<import("..").PropsWithChildren<{
            fallback?: Child;
            fallbackRender?: import("../components").FallbackRender;
            onError?: import("../components").ErrorHandler;
        }>>;
        createContext: <T>(defaultValue: T) => import("..").Context<T>;
        useContext: <T>(context: import("..").Context<T>) => T;
        memo: <T>(component: import("..").FC<T>, propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean) => import("..").FC<T>;
        isValidElement: (element: unknown) => element is import("..").JSXNode;
        createElement: (tag: string | ((props: import("../base").Props) => import("..").JSXNode), props: import("../base").Props | null, ...children: Child[]) => import("..").JSXNode;
        cloneElement: <T extends import("..").JSXNode | import("./jsx-dev-runtime").JSX.Element>(element: T, props: import("../base").Props, ...children: Child[]) => T;
        Children: {
            map: (children: Child[], fn: (child: Child, index: number) => Child) => Child[];
            forEach: (children: Child[], fn: (child: Child, index: number) => void) => void;
            count: (children: Child[]) => number;
            only: (_children: Child[]) => Child;
            toArray: (children: Child) => Child[];
        };
        Fragment: (props: Record<string, unknown>) => import("..").JSXNode;
        StrictMode: (props: Record<string, unknown>) => import("..").JSXNode;
        flushSync: (callback: () => void) => void;
        createPortal: (children: Child, container: HTMLElement, key?: string) => Child;
    };
};
export default _default;
