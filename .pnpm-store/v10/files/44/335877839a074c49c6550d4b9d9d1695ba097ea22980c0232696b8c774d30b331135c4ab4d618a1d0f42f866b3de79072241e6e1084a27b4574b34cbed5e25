import Dispatcher from "./dispatcher";
import RetryHandler from "./retry-handler";

export default Interceptors;

declare namespace Interceptors {
  export type DumpInterceptorOpts = { maxSize?: number }
  export type RetryInterceptorOpts = RetryHandler.RetryOptions
  export type RedirectInterceptorOpts = { maxRedirections?: number }
  
  export function createRedirectInterceptor(opts: RedirectInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function dump(opts?: DumpInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function retry(opts?: RetryInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
  export function redirect(opts?: RedirectInterceptorOpts): Dispatcher.DispatcherComposeInterceptor
}
