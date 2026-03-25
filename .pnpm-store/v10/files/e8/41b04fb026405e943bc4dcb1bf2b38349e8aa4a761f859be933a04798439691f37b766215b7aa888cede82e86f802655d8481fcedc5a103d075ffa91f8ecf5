import { Application, Router } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { Spec } from './framework/openapi.spec.loader';
import { NormalizedOpenApiValidatorOpts, OpenApiValidatorOpts, OpenApiRequestHandler } from './framework/types';
import { AjvOptions } from './framework/ajv/options';
export { OpenApiValidatorOpts, InternalServerError, UnsupportedMediaType, RequestEntityTooLarge, BadRequest, MethodNotAllowed, NotAcceptable, NotFound, Unauthorized, Forbidden, } from './framework/types';
export declare class OpenApiValidator {
    readonly options: NormalizedOpenApiValidatorOpts;
    readonly ajvOpts: AjvOptions;
    constructor(options: OpenApiValidatorOpts);
    installMiddleware(spec: Promise<Spec>): OpenApiRequestHandler[];
    installPathParams(app: Application | Router, context: OpenApiContext): void;
    private metadataMiddleware;
    private multipartMiddleware;
    private securityMiddleware;
    private requestValidationMiddleware;
    private responseValidationMiddleware;
    installOperationHandlers(baseUrl: string, context: OpenApiContext): Promise<Router>;
    private validateOptions;
    private normalizeOptions;
    private isOperationHandlerOptions;
}
