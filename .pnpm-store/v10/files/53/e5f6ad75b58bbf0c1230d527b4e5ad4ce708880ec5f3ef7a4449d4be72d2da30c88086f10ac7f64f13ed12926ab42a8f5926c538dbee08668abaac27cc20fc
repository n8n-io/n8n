/**
 * @module
 * Testing Helper for Hono.
 */
import type { Client, ClientRequestOptions } from '../../client/types';
import type { ExecutionContext } from '../../context';
import type { Hono } from '../../hono';
import type { Schema } from '../../types';
import type { UnionToIntersection } from '../../utils/types';
type ExtractEnv<T> = T extends Hono<infer E, Schema, string> ? E : never;
export declare const testClient: <T extends Hono<any, Schema, string>>(app: T, Env?: ExtractEnv<T>["Bindings"] | {}, executionCtx?: ExecutionContext, options?: Omit<ClientRequestOptions, "fetch">) => UnionToIntersection<Client<T, "http://localhost">>;
export {};
