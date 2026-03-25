/**
 * @module
 * This module provides APIs for `hono/jsx/dom/client`, which is compatible with `react-dom/client`.
 */
import type { Child } from '../base';
export interface Root {
    render(children: Child): void;
    unmount(): void;
}
export type RootOptions = Record<string, unknown>;
/**
 * Create a root object for rendering
 * @param element Render target
 * @param options Options for createRoot (not supported yet)
 * @returns Root object has `render` and `unmount` methods
 */
export declare const createRoot: (element: HTMLElement | DocumentFragment, options?: RootOptions) => Root;
/**
 * Create a root object and hydrate app to the target element.
 * In hono/jsx/dom, hydrate is equivalent to render.
 * @param element Render target
 * @param reactNode A JSXNode to render
 * @param options Options for createRoot (not supported yet)
 * @returns Root object has `render` and `unmount` methods
 */
export declare const hydrateRoot: (element: HTMLElement | DocumentFragment, reactNode: Child, options?: RootOptions) => Root;
declare const _default: {
    createRoot: (element: HTMLElement | DocumentFragment, options?: RootOptions) => Root;
    hydrateRoot: (element: HTMLElement | DocumentFragment, reactNode: Child, options?: RootOptions) => Root;
};
export default _default;
