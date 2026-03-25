import type { HtmlEscapedString } from '../utils/html';
import type { Child, FC, PropsWithChildren } from './';
export declare const childrenToString: (children: Child[]) => Promise<HtmlEscapedString[]>;
export type ErrorHandler = (error: Error) => void;
export type FallbackRender = (error: Error) => Child;
/**
 * @experimental
 * `ErrorBoundary` is an experimental feature.
 * The API might be changed.
 */
export declare const ErrorBoundary: FC<PropsWithChildren<{
    fallback?: Child;
    fallbackRender?: FallbackRender;
    onError?: ErrorHandler;
}>>;
