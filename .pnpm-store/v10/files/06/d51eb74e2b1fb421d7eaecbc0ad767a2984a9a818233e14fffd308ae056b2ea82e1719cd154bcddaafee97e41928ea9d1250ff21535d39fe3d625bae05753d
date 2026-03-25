import type * as http from 'http';
import { Options } from '../types';
/**
 * @deprecated
 *
 * Will be removed in a future version.
 */
export interface LegacyOptions<TReq = http.IncomingMessage, TRes = http.ServerResponse> extends Options<TReq, TRes> {
    /**
     * @deprecated
     * Use `on.error` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    error: () => {}
     * }
     * ```
     */
    onError?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `on.proxyRes` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    proxyRes: () => {}
     * }
     * ```
     */
    onProxyRes?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `on.proxyReq` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    proxyReq: () => {}
     * }
     * ```
     */
    onProxyReq?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `on.proxyReqWs` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    proxyReqWs: () => {}
     * }
     * ```
     */
    onProxyReqWs?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `on.open` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    open: () => {}
     * }
     * ```
     */
    onOpen?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `on.close` instead.
     *
     * @example
     * ```js
     * {
     *   on: {
     *    close: () => {}
     * }
     * ```
     */
    onClose?: (...args: any[]) => void;
    /**
     * @deprecated
     * Use `logger` instead.
     *
     * @example
     * ```js
     * {
     *  logger: console
     * }
     * ```
     */
    logProvider?: any;
    /**
     * @deprecated
     * Use `logger` instead.
     *
     * @example
     * ```js
     * {
     *  logger: console
     * }
     * ```
     */
    logLevel?: any;
}
