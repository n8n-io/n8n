/**
 * Handler for Service Worker
 * @module
 */
import type { Hono } from '../../hono';
import type { Env, Schema } from '../../types';
import type { FetchEvent } from './types';
type Handler = (evt: FetchEvent) => void;
export type HandleOptions = {
    fetch?: typeof fetch;
};
/**
 * Adapter for Service Worker
 */
export declare const handle: <E extends Env, S extends Schema, BasePath extends string>(app: Hono<E, S, BasePath>, opts?: HandleOptions) => Handler;
export {};
