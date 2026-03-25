import { OpenAPIV3, ParametersSchema } from '../../framework/types';
import Ajv from 'ajv';
type Parameter = OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject;
/**
 * A class top arse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
 * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
 */
export declare class ParametersSchemaParser {
    private _ajv;
    private _apiDocs;
    constructor(ajv: Ajv, apiDocs: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1);
    /**
     * Parse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
     * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
     * @param path
     * @param parameters
     */
    parse(path: string, parameters?: Parameter[]): ParametersSchema;
    private validateParameterType;
}
export {};
