/**
 * IP Restriction Middleware for Hono
 * @module
 */
import type { Context, MiddlewareHandler } from '../..';
import type { AddressType, GetConnInfo } from '../../helper/conninfo';
/**
 * Function to get IP Address
 */
type GetIPAddr = GetConnInfo | ((c: Context) => string);
export type IPRestrictionRule = string | ((addr: {
    addr: string;
    type: AddressType;
}) => boolean);
/**
 * Rules for IP Restriction Middleware
 */
export interface IPRestrictionRules {
    denyList?: IPRestrictionRule[];
    allowList?: IPRestrictionRule[];
}
/**
 * IP Restriction Middleware
 *
 * @param getIP function to get IP Address
 */
export declare const ipRestriction: (getIP: GetIPAddr, { denyList, allowList }: IPRestrictionRules, onError?: (remote: {
    addr: string;
    type: AddressType;
}, c: Context) => Response | Promise<Response>) => MiddlewareHandler;
export {};
