import { RequestHandler } from 'express';
import { ValidateFunction, Options } from 'ajv';
import { OpenAPIV3, OpenApiRequest, ValidateResponseOpts } from '../framework/types';
interface ValidateResult {
    validators: {
        [key: string]: ValidateFunction;
    };
    body: object;
    statusCode: number;
    path: string;
    accepts: string[];
}
export declare class ResponseValidator {
    private ajvBody;
    private spec;
    private validatorsCache;
    private eovOptions;
    private serial;
    constructor(openApiSpec: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1, options?: Options, eovOptions?: ValidateResponseOpts, serial?: number);
    validate(): RequestHandler;
    _getOrBuildValidator(req: OpenApiRequest, responses: OpenAPIV3.ResponsesObject): {
        [key: string]: ValidateFunction;
    };
    _validate({ validators, body, statusCode, path, accepts, }: ValidateResult): void;
    /**
     * Build a map of response name to response validator, for the set of responses
     * defined on the current endpoint
     * @param responses
     * @returns a map of validators
     */
    private buildValidators;
    /**
     * Checks if specific Content-Type is validatable
     * @param contentType
     * @returns boolean
     * @throws error on invalid content type format
     */
    private canValidateContentType;
}
export {};
