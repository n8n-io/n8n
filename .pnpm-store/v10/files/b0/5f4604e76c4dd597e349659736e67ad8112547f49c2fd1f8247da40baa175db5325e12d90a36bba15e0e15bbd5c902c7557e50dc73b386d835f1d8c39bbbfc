/**
 * @module
 * JSX for Hono.
 */
import { Fragment, cloneElement, isValidElement, jsx, memo, reactAPICompatVersion } from './base';
import type { DOMAttributes } from './base';
import { Children } from './children';
import { ErrorBoundary } from './components';
import { createContext, useContext } from './context';
import { useActionState, useOptimistic } from './dom/hooks';
import { createRef, forwardRef, startTransition, startViewTransition, use, useCallback, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition, useViewTransition } from './hooks';
import { Suspense } from './streaming';
export { reactAPICompatVersion as version, jsx, memo, Fragment, Fragment as StrictMode, isValidElement, jsx as createElement, cloneElement, ErrorBoundary, createContext, useContext, useState, useEffect, useRef, useCallback, useReducer, useId, useDebugValue, use, startTransition, useTransition, useDeferredValue, startViewTransition, useViewTransition, useMemo, useLayoutEffect, useInsertionEffect, createRef, forwardRef, useImperativeHandle, useSyncExternalStore, useActionState, useOptimistic, Suspense, Children, DOMAttributes, };
declare const _default: {
    version: string;
    memo: <T>(component: import("./base").FC<T>, propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean) => import("./base").FC<T>;
    Fragment: ({ children, }: {
        key?: string;
        children?: import("./base").Child | import("../utils/html").HtmlEscapedString;
    }) => import("../utils/html").HtmlEscapedString;
    StrictMode: ({ children, }: {
        key?: string;
        children?: import("./base").Child | import("../utils/html").HtmlEscapedString;
    }) => import("../utils/html").HtmlEscapedString;
    isValidElement: (element: unknown) => element is import("./base").JSXNode;
    createElement: (tag: string | Function, props: import("./base").Props | null, ...children: (string | number | import("../utils/html").HtmlEscapedString)[]) => import("./base").JSXNode;
    cloneElement: <T extends import("./base").JSXNode | import("./base").JSX.Element>(element: T, props: Partial<import("./base").Props>, ...children: import("./base").Child[]) => T;
    ErrorBoundary: import("./base").FC<import("./types").PropsWithChildren<{
        fallback?: import("./base").Child;
        fallbackRender?: import("./components").FallbackRender;
        onError?: import("./components").ErrorHandler;
    }>>;
    createContext: <T>(defaultValue: T) => import("./context").Context<T>;
    useContext: <T>(context: import("./context").Context<T>) => T;
    useState: {
        <T>(initialState: T | (() => T)): [T, (newState: T | ((currentState: T) => T)) => void];
        <T = undefined>(): [T | undefined, (newState: T | ((currentState: T | undefined) => T | undefined) | undefined) => void];
    };
    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
    useRef: <T>(initialValue: T | null) => import("./hooks").RefObject<T>;
    useCallback: <T extends Function>(callback: T, deps: readonly unknown[]) => T;
    useReducer: <T, A>(reducer: (state: T, action: A) => T, initialArg: T, init?: (initialState: T) => T) => [T, (action: A) => void];
    useId: () => string;
    useDebugValue: (_value: unknown, _formatter?: (value: unknown) => string) => void;
    use: <T>(promise: Promise<T>) => T;
    startTransition: (callback: () => void) => void;
    useTransition: () => [boolean, (callback: () => void | Promise<void>) => void];
    useDeferredValue: <T>(value: T, initialValue?: T) => T;
    startViewTransition: (callback: () => void) => void;
    useViewTransition: () => [boolean, (callback: () => void) => void];
    useMemo: <T>(factory: () => T, deps: readonly unknown[]) => T;
    useLayoutEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
    useInsertionEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
    createRef: <T>() => import("./hooks").RefObject<T>;
    forwardRef: <T, P = {}>(Component: (props: P, ref?: import("./hooks").RefObject<T>) => import("./base").JSX.Element) => ((props: P & {
        ref?: import("./hooks").RefObject<T>;
    }) => import("./base").JSX.Element);
    useImperativeHandle: <T>(ref: import("./hooks").RefObject<T>, createHandle: () => T, deps: readonly unknown[]) => void;
    useSyncExternalStore: <T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T) => T;
    useActionState: <T>(fn: Function, initialState: T, permalink?: string) => [T, Function];
    useOptimistic: <T, N>(state: T, updateState: (currentState: T, action: N) => T) => [T, (action: N) => void];
    Suspense: import("./base").FC<import("./types").PropsWithChildren<{
        fallback: any;
    }>>;
    Children: {
        map: (children: import("./base").Child[], fn: (child: import("./base").Child, index: number) => import("./base").Child) => import("./base").Child[];
        forEach: (children: import("./base").Child[], fn: (child: import("./base").Child, index: number) => void) => void;
        count: (children: import("./base").Child[]) => number;
        only: (_children: import("./base").Child[]) => import("./base").Child;
        toArray: (children: import("./base").Child) => import("./base").Child[];
    };
};
export default _default;
export type * from './types';
export type { JSX } from './intrinsic-elements';
