import { NextFunction, Response } from 'express';
import { OpenAPIV3, OpenApiRequest, RequestValidatorOptions } from '../framework/types';
export declare class RequestValidator {
    private middlewareCache;
    private apiDoc;
    private ajv;
    private ajvBody;
    private requestOpts;
    constructor(apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1, options?: RequestValidatorOptions);
    validate(req: OpenApiRequest, res: Response, next: NextFunction): void | Promise<void>;
    private warnUnknownQueryParametersKeyword;
    private buildMiddleware;
    private multipartNested;
    private discriminatorValidator;
    private processQueryParam;
}
