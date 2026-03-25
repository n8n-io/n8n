import { OpenAPIV3, Options, ValidateResponseOpts } from '../../framework/types';
export declare const httpMethods: Set<string>;
export declare class SchemaPreprocessor {
    private ajv;
    private apiDoc;
    private apiDocRes;
    private serDesMap;
    private responseOpts;
    private resolvedSchemaCache;
    constructor(apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1, ajvOptions: Options, validateResponsesOpts: ValidateResponseOpts);
    preProcess(): {
        apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
        apiDocRes: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
    };
    private gatherComponentSchemaNodes;
    private gatherSchemaNodesFromPaths;
    /**
     * Traverse the schema starting at each node in nodes
     * @param nodes the nodes to traverse
     * @param visit a function to invoke per node
     */
    private traverseSchemas;
    private schemaVisitor;
    private processDiscriminator;
    /**
     * Attach custom `x-eov-*-serdes` vendor extension for performing
     * serialization (response) and deserialization (request) of data.
     *
     * This only applies to `type=string` schemas with a `format` that was flagged for serdes.
     *
     * The goal of this function is to define a JSON schema that:
     * 1) Only performs the method for matching req/res (e.g. never deserialize a response)
     * 2) Validates initial data THEN performs serdes THEN validates output. In that order.
     * 3) Hide internal schema keywords (and its validation errors) from user.
     *
     * The solution is in three parts:
     * 1) Remove the `type` keywords and replace it with a custom clone `x-eov-type`.
     *    This ensures that we control the order of type validations,
     *    and allows the response serialization to occur before AJV enforces the type.
     * 2) Add an `x-eov-req-serdes` keyword.
     *    This keyword will deserialize the request string AFTER all other validations occur,
     *    ensuring that the string is valid before modifications.
     *    This keyword is only attached when deserialization is enabled.
     * 3) Add an `x-eov-res-serdes` keyword.
     *    This keyword will serialize the response object BEFORE any other validations occur,
     *    ensuring the output is validated as a string.
     *    This keyword is only attached when serialization is enabled.
     * 4) If `nullable` is set, set the type as every possible type.
     *    Then initial type checking will _always_ pass and the `x-eov-type` will narrow it down later.
     *
     * See [`createAjv`](../../framework/ajv/index.ts) for custom keyword definitions.
     *
     * @param {object} parent - parent schema
     * @param {object} schema - schema
     * @param {object} state - traversal state
     */
    private handleSerDes;
    private removeSchemaExamples;
    private removeExamples;
    private handleReadonly;
    private handleWriteonly;
    /**
     * extract all requestBodies' schemas from an operation
     * @param op
     */
    private extractRequestBodySchemaNodes;
    private extractResponseSchemaNodes;
    private extractRequestParameterSchemaNodes;
    private resolveSchema;
    /**
     * add path level parameters to the schema's parameters list
     * @param pathItemKey
     * @param pathItem
     */
    private preprocessPathLevelParameters;
    private findKeys;
    getKeyFromRef(ref: any): any;
}
