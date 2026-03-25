/**
 * @module
 * JSX Renderer Middleware for Hono.
 */
import type { Context, PropsForRenderer } from '../../context';
import type { FC, Context as JSXContext, PropsWithChildren } from '../../jsx';
import type { Env, Input, MiddlewareHandler } from '../../types';
import type { HtmlEscapedString } from '../../utils/html';
export declare const RequestContext: JSXContext<Context<any, any, {}> | null>;
type RendererOptions = {
    docType?: boolean | string;
    stream?: boolean | Record<string, string>;
};
type ComponentWithChildren = (props: PropsWithChildren<PropsForRenderer & {
    Layout: FC;
}>, c: Context) => HtmlEscapedString | Promise<HtmlEscapedString>;
/**
 * JSX Renderer Middleware for hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jsx-renderer}
 *
 * @param {ComponentWithChildren} [component] - The component to render, which can accept children and props.
 * @param {RendererOptions} [options] - The options for the JSX renderer middleware.
 * @param {boolean | string} [options.docType=true] - The DOCTYPE to be added at the beginning of the HTML. If set to false, no DOCTYPE will be added.
 * @param {boolean | Record<string, string>} [options.stream=false] - If set to true, enables streaming response with default headers. If a record is provided, custom headers will be used.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.get(
 *   '/page/*',
 *   jsxRenderer(({ children }) => {
 *     return (
 *       <html>
 *         <body>
 *           <header>Menu</header>
 *           <div>{children}</div>
 *         </body>
 *       </html>
 *     )
 *   })
 * )
 *
 * app.get('/page/about', (c) => {
 *   return c.render(<h1>About me!</h1>)
 * })
 * ```
 */
export declare const jsxRenderer: <E extends Env = Env>(component?: ComponentWithChildren, options?: RendererOptions | ((c: Context<E>) => RendererOptions)) => MiddlewareHandler;
/**
 * useRequestContext for Hono.
 *
 * @template E - The environment type.
 * @template P - The parameter type.
 * @template I - The input type.
 * @returns {Context<E, P, I>} An instance of Context.
 *
 * @example
 * ```ts
 * const RequestUrlBadge: FC = () => {
 *   const c = useRequestContext()
 *   return <b>{c.req.url}</b>
 * }
 *
 * app.get('/page/info', (c) => {
 *   return c.render(
 *     <div>
 *       You are accessing: <RequestUrlBadge />
 *     </div>
 *   )
 * })
 * ```
 */
export declare const useRequestContext: <E extends Env = any, P extends string = any, I extends Input = {}>() => Context<E, P, I>;
export {};
