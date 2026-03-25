/**
 * @module
 * This module provides APIs for `hono/jsx/dom`.
 */
import { isValidElement, reactAPICompatVersion } from '../base';
import type { Child, DOMAttributes, JSX, JSXNode, Props, FC } from '../base';
import { Children } from '../children';
import { useContext } from '../context';
import { createRef, forwardRef, startTransition, startViewTransition, use, useCallback, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition, useViewTransition } from '../hooks';
import { ErrorBoundary, Suspense } from './components';
import { createContext } from './context';
import { useActionState, useFormStatus, useOptimistic } from './hooks';
import { Fragment } from './jsx-runtime';
import { createPortal, flushSync } from './render';
export { render } from './render';
declare const createElement: (tag: string | ((props: Props) => JSXNode), props: Props | null, ...children: Child[]) => JSXNode;
declare const cloneElement: <T extends JSXNode | JSX.Element>(element: T, props: Props, ...children: Child[]) => T;
declare const memo: <T>(component: FC<T>, propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean) => FC<T>;
export { reactAPICompatVersion as version, createElement as jsx, useState, useEffect, useRef, useCallback, use, startTransition, useTransition, useDeferredValue, startViewTransition, useViewTransition, useMemo, useLayoutEffect, useInsertionEffect, useReducer, useId, useDebugValue, createRef, forwardRef, useImperativeHandle, useSyncExternalStore, useFormStatus, useActionState, useOptimistic, Suspense, ErrorBoundary, createContext, useContext, memo, isValidElement, createElement, cloneElement, Children, Fragment, Fragment as StrictMode, DOMAttributes, flushSync, createPortal, };
declare const _default: {
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
    forwardRef: <T, P = {}>(Component: (props: P, ref?: import("..").RefObject<T>) => JSX.Element) => ((props: P & {
        ref?: import("..").RefObject<T>;
    }) => JSX.Element);
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
    Suspense: FC<import("..").PropsWithChildren<{
        fallback: any;
    }>>;
    ErrorBoundary: FC<import("..").PropsWithChildren<{
        fallback?: Child;
        fallbackRender?: import("../components").FallbackRender;
        onError?: import("../components").ErrorHandler;
    }>>;
    createContext: <T>(defaultValue: T) => import("..").Context<T>;
    useContext: <T>(context: import("..").Context<T>) => T;
    memo: <T>(component: FC<T>, propsAreEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean) => FC<T>;
    isValidElement: (element: unknown) => element is JSXNode;
    createElement: (tag: string | ((props: Props) => JSXNode), props: Props | null, ...children: Child[]) => JSXNode;
    cloneElement: <T extends JSXNode | JSX.Element>(element: T, props: Props, ...children: Child[]) => T;
    Children: {
        map: (children: Child[], fn: (child: Child, index: number) => Child) => Child[];
        forEach: (children: Child[], fn: (child: Child, index: number) => void) => void;
        count: (children: Child[]) => number;
        only: (_children: Child[]) => Child;
        toArray: (children: Child) => Child[];
    };
    Fragment: (props: Record<string, unknown>) => JSXNode;
    StrictMode: (props: Record<string, unknown>) => JSXNode;
    flushSync: (callback: () => void) => void;
    createPortal: (children: Child, container: HTMLElement, key?: string) => Child;
};
export default _default;
export type { Context } from '../context';
export type * from '../types';
