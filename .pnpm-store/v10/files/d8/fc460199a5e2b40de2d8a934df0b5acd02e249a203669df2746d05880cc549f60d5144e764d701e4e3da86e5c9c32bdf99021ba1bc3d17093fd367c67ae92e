import type { GetConnInfo } from '../../helper/conninfo';
/**
 * Get connection information from AWS Lambda
 *
 * Extracts client IP from various Lambda event sources:
 * - API Gateway v1 (REST API): requestContext.identity.sourceIp
 * - API Gateway v2 (HTTP API/Function URLs): requestContext.http.sourceIp
 * - ALB: Falls back to x-forwarded-for header
 *
 * @param c - Context
 * @returns Connection information including remote address
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getConnInfo } from 'hono/aws-lambda'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const info = getConnInfo(c)
 *   return c.text(`Your IP: ${info.remote.address}`)
 * })
 *
 * export const handler = handle(app)
 * ```
 */
export declare const getConnInfo: GetConnInfo;
