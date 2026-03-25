import { RequestHandler } from "express";
import { ServeStaticOptions } from "serve-static";

export interface JsonObject {
    [key: string]: any;
}

export interface SwaggerOptions {
    [key: string]: any;
}

export interface SwaggerUiOptions {
    customCss?: string | undefined;
    customCssUrl?: string | undefined;
    customfavIcon?: string | undefined;
    customJs?: string | string[] | undefined;
    customSiteTitle?: string | undefined;
    explorer?: boolean | undefined;
    isExplorer?: boolean | undefined;
    swaggerOptions?: SwaggerOptions | undefined;
    swaggerUrl?: string | undefined;
    swaggerUrls?: string[] | undefined;
}

/**
 * Creates a middleware function that returns the pre-generated HTML file for the Swagger UI page.
 *
 * @param swaggerDoc JSON object with the API schema.
 * @param opts swagger-ui-express options.
 * @param options custom Swagger options.
 * @param customCss string with a custom CSS to embed into the page.
 * @param customfavIcon link to a custom favicon.
 * @param swaggerUrl URL of the Swagger API schema, can be specified instead of the swaggerDoc.
 * @param customSiteTitle custom title for a page.
 * @returns an express middleware function that returns the generated HTML page.
 */
export function setup(
    swaggerDoc?: JsonObject | null,
    opts?: SwaggerUiOptions,
    options?: SwaggerOptions,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string,
): RequestHandler;

/** @deprecated */
export function setup(swaggerDoc?: JsonObject, isExplorer?: boolean): RequestHandler;

/**
 * Returns handlers for serving Swagger UI files.
 * This includes the custom initialization JS file and static files of Swagger UI.
 *
 * @returns Express handlers that process requests and return files for Swagger UI.
 */
export const serve: RequestHandler[];

/**
 * Returns handlers for serving Swagger UI files.
 * This includes custom initialization js file and static files of Swagger UI.
 * Additional options are passed to the `express.static` middleware.
 *
 * @param options options object that is passed to the `express.static` middleware.
 * @returns Express handlers that process requests and return files for Swagger UI.
 */
export function serveWithOptions(options: ServeStaticOptions): RequestHandler[];

/**
 * Generates the custom HTML page for the UI API.
 *
 * @param swaggerDoc JSON object with the API schema.
 * @param opts swagger-ui-express options.
 * @param options custom Swagger options.
 * @param customCss string with a custom CSS to embed into the page.
 * @param customfavIcon link to a custom favicon.
 * @param swaggerUrl URL of the Swagger API schema, can be specified instead of the swaggerDoc.
 * @param customSiteTitle custom title for a page.
 * @returns the generated HTML page.
 */
export function generateHTML(
    swaggerDoc?: JsonObject,
    opts?: SwaggerUiOptions,
    options?: SwaggerOptions,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string,
): string;

/** @deprecated */
export function generateHTML(swaggerDoc?: JsonObject, isExplorer?: boolean): RequestHandler;

/**
 * Returns handlers for serving Swagger UI files.
 * This includes custom initialization js file and static files of Swagger UI.
 * Additional options object is passed to Swagger UI.
 *
 * @param swaggerDoc JSON object with the Swagger API schema.
 * @param opts options to pass to Swagger UI.
 * @returns Express handlers that process requests and return files for Swagger UI.
 */
export function serveFiles(swaggerDoc?: JsonObject, opts?: SwaggerUiOptions): RequestHandler[];
