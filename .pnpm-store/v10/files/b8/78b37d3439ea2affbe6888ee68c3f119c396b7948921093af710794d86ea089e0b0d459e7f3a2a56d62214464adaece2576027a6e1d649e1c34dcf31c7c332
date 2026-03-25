import { LookupOptions } from 'node:dns'

import Dispatcher from "./dispatcher";
import RetryHandler from "./retry-handler";

export default Interceptors;

declare namespace Interceptors {
  export type DumpInterceptorOpts = { maxSize?: number }
  export type RetryInterceptorOpts = RetryHandler.RetryOptions
  export type RedirectInterceptorOpts = { maxRedirections?: number }
  export type ResponseErrorInterceptorOpts = { throwOnError: boolean }

  // DNS interceptor
  export type DNSInterceptorRecord = { address: string, ttl: number, family: 4 | 6 }
  export type DNSInterceptorOriginRecords = { 4: { ips: DNSInterceptorRecord[] } | null, 6: { ips: DNSInterceptorRecord[] } | null }
  export type DNSInterceptorOpts = {
    maxTTL?: number
    maxItems?: number
    lookup?: (hostname: string, options: LookupOptions, callback: (err: NodeJS.ErrnoException | null, addresses: DNSInterceptorRecord[]) => void) => void
    pick?: (origin: URL, records: DNSInterceptorOriginRecords, affinity: 4 | 6) => DNSInterceptorRecord
    dualStack?: boolean
    affinity?: 4 | 6
  }

  export function createRedirectInterceptor(opts: RedirectInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function dump(opts?: DumpInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function retry(opts?: RetryInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function redirect(opts?: RedirectInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function responseError(opts?: ResponseErrorInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function dns (opts?: DNSInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
}
