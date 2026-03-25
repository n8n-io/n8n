import type { Location } from '../ref-utils';
import type { ErrorObject } from '@redocly/ajv/dist/2020';
import type { ResolveFn } from '../walk';
export declare function releaseAjvInstance(): void;
export declare function validateJsonSchema(data: any, schema: any, schemaLoc: Location, instancePath: string, resolve: ResolveFn, allowAdditionalProperties: boolean): {
    valid: boolean;
    errors: (ErrorObject & {
        suggest?: string[];
    })[];
};
