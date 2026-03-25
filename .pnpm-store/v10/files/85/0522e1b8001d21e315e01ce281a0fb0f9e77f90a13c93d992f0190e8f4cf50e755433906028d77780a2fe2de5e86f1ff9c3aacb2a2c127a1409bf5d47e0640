/**
 * All types exported from "hono/jsx" are in this file.
 */
import type { Child, JSXNode } from './base';
import type { JSX } from './intrinsic-elements';
export type { Child, JSXNode, FC } from './base';
export type { RefObject } from './hooks';
export type { Context } from './context';
export type PropsWithChildren<P = unknown> = P & {
    children?: Child | undefined;
};
export type CSSProperties = JSX.CSSProperties;
/**
 * React types
 */
type ReactElement<P = any, T = string | Function> = JSXNode & {
    type: T;
    props: P;
    key: string | null;
};
type ReactNode = ReactElement | string | number | boolean | null | undefined;
type ComponentClass<_P = {}, _S = {}> = unknown;
export type { ReactElement, ReactNode, ComponentClass };
export type Event = globalThis.Event;
export type MouseEvent = globalThis.MouseEvent;
export type KeyboardEvent = globalThis.KeyboardEvent;
export type FocusEvent = globalThis.FocusEvent;
export type ClipboardEvent = globalThis.ClipboardEvent;
export type InputEvent = globalThis.InputEvent;
export type PointerEvent = globalThis.PointerEvent;
export type TouchEvent = globalThis.TouchEvent;
export type WheelEvent = globalThis.WheelEvent;
export type AnimationEvent = globalThis.AnimationEvent;
export type TransitionEvent = globalThis.TransitionEvent;
export type DragEvent = globalThis.DragEvent;
