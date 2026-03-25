/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FunctionCallingMode } from "./enums";
/**
 * Structured representation of a function declaration as defined by the
 * [OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3). Included
 * in this declaration are the function name and parameters. This
 * FunctionDeclaration is a representation of a block of code that can be used
 * as a Tool by the model and executed by the client.
 * @public
 */
export declare interface FunctionDeclaration {
    /**
     * The name of the function to call. Must start with a letter or an
     * underscore. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with
     * a max length of 64.
     */
    name: string;
    /**
     * Optional. Description and purpose of the function. Model uses it to decide
     * how and whether to call the function.
     */
    description?: string;
    /**
     * Optional. Describes the parameters to this function in JSON Schema Object
     * format. Reflects the Open API 3.03 Parameter Object. string Key: the name
     * of the parameter. Parameter names are case sensitive. Schema Value: the
     * Schema defining the type used for the parameter. For function with no
     * parameters, this can be left unset.
     *
     * @example with 1 required and 1 optional parameter: type: OBJECT properties:
     * ```
     * param1:
     *
     *   type: STRING
     * param2:
     *
     *  type: INTEGER
     * required:
     *
     *   - param1
     * ```
     */
    parameters?: FunctionDeclarationSchema;
}
/**
 * A FunctionDeclarationsTool is a piece of code that enables the system to
 * interact with external systems to perform an action, or set of actions,
 * outside of knowledge and scope of the model.
 * @public
 */
export declare interface FunctionDeclarationsTool {
    /**
     * Optional. One or more function declarations
     * to be passed to the model along with the current user query. Model may
     * decide to call a subset of these functions by populating
     * [FunctionCall][content.part.functionCall] in the response. User should
     * provide a [FunctionResponse][content.part.functionResponse] for each
     * function call in the next turn. Based on the function responses, Model will
     * generate the final response back to the user. Maximum 64 function
     * declarations can be provided.
     */
    functionDeclarations?: FunctionDeclaration[];
}
/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */
export declare enum SchemaType {
    /** String type. */
    STRING = "string",
    /** Number type. */
    NUMBER = "number",
    /** Integer type. */
    INTEGER = "integer",
    /** Boolean type. */
    BOOLEAN = "boolean",
    /** Array type. */
    ARRAY = "array",
    /** Object type. */
    OBJECT = "object"
}
/**
 * Schema is used to define the format of input/output data.
 * Represents a select subset of an OpenAPI 3.0 schema object.
 * More fields may be added in the future as needed.
 * @public
 */
export type Schema = StringSchema | NumberSchema | IntegerSchema | BooleanSchema | ArraySchema | ObjectSchema;
/**
 * Fields common to all Schema types.
 *
 * @internal
 */
export interface BaseSchema {
    /** Optional. Description of the value. */
    description?: string;
    /** If true, the value can be null. */
    nullable?: boolean;
}
/**
 * Describes a JSON-encodable floating point number.
 *
 * @public
 */
export interface NumberSchema extends BaseSchema {
    type: typeof SchemaType.NUMBER;
    /** Optional. The format of the number. */
    format?: "float" | "double";
}
/**
 * Describes a JSON-encodable integer.
 *
 * @public
 */
export interface IntegerSchema extends BaseSchema {
    type: typeof SchemaType.INTEGER;
    /** Optional. The format of the number. */
    format?: "int32" | "int64";
}
/**
 * Describes a string.
 *
 * @public
 */
export type StringSchema = SimpleStringSchema | EnumStringSchema;
/**
 * Describes a simple string schema, with or without format
 *
 * @public
 */
export interface SimpleStringSchema extends BaseSchema {
    type: typeof SchemaType.STRING;
    format?: "date-time" | undefined;
    enum?: never;
}
/**
 * Describes a string enum
 *
 * @public
 */
export interface EnumStringSchema extends BaseSchema {
    type: typeof SchemaType.STRING;
    format: "enum";
    /** Possible values for this enum */
    enum: string[];
}
/**
 * Describes a boolean, either 'true' or 'false'.
 *
 * @public
 */
export interface BooleanSchema extends BaseSchema {
    type: typeof SchemaType.BOOLEAN;
}
/**
 * Describes an array, an ordered list of values.
 *
 * @public
 */
export interface ArraySchema extends BaseSchema {
    type: typeof SchemaType.ARRAY;
    /** A schema describing the entries in the array. */
    items: Schema;
    /** The minimum number of items in the array. */
    minItems?: number;
    /** The maximum number of items in the array. */
    maxItems?: number;
}
/**
 * Describes a JSON object, a mapping of specific keys to values.
 *
 * @public
 */
export interface ObjectSchema extends BaseSchema {
    type: typeof SchemaType.OBJECT;
    /** Describes the properties of the JSON object. Must not be empty. */
    properties: {
        [k: string]: Schema;
    };
    /**
     * A list of keys declared in the properties object.
     * Required properties will always be present in the generated object.
     */
    required?: string[];
}
/**
 * Schema for parameters passed to {@link FunctionDeclaration.parameters}.
 * @public
 */
export interface FunctionDeclarationSchema {
    /** The type of the parameter. */
    type: SchemaType;
    /** The format of the parameter. */
    properties: {
        [k: string]: FunctionDeclarationSchemaProperty;
    };
    /** Optional. Description of the parameter. */
    description?: string;
    /** Optional. Array of required parameters. */
    required?: string[];
}
/**
 * Schema for top-level function declaration
 * @public
 */
export type FunctionDeclarationSchemaProperty = Schema;
/**
 * Schema passed to `GenerationConfig.responseSchema`
 * @public
 */
export type ResponseSchema = Schema;
/**
 * Tool config. This config is shared for all tools provided in the request.
 * @public
 */
export interface ToolConfig {
    functionCallingConfig: FunctionCallingConfig;
}
/**
 * @public
 */
export interface FunctionCallingConfig {
    mode?: FunctionCallingMode;
    allowedFunctionNames?: string[];
}
