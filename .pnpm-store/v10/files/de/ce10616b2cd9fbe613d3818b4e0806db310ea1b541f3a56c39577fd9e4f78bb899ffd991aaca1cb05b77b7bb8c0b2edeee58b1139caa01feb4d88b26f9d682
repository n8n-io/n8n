import * as res from './resolvers';
import { OpenApiValidatorOpts } from './openapi.validator';
import { InternalServerError, UnsupportedMediaType, RequestEntityTooLarge, BadRequest, MethodNotAllowed, NotAcceptable, NotFound, Unauthorized, Forbidden } from './framework/types';
export declare const resolvers: typeof res;
export declare const middleware: typeof openapiValidator;
export declare const error: {
    InternalServerError: typeof InternalServerError;
    UnsupportedMediaType: typeof UnsupportedMediaType;
    RequestEntityTooLarge: typeof RequestEntityTooLarge;
    BadRequest: typeof BadRequest;
    MethodNotAllowed: typeof MethodNotAllowed;
    NotAcceptable: typeof NotAcceptable;
    NotFound: typeof NotFound;
    Unauthorized: typeof Unauthorized;
    Forbidden: typeof Forbidden;
};
export * as serdes from './framework/base.serdes';
declare function openapiValidator(options: OpenApiValidatorOpts): import("./framework/types").OpenApiRequestHandler[];
