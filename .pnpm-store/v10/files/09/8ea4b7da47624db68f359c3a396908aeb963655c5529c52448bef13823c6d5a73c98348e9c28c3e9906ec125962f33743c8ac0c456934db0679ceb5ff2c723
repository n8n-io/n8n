/**
 * (C) Copyright IBM Corp. 2014, 2023.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
export interface FileObject {
    value: NodeJS.ReadableStream | Buffer | string;
    options?: FileOptions;
}
export interface FileOptions {
    filename?: string;
    contentType?: string;
}
export interface FileWithMetadata {
    data: NodeJS.ReadableStream | Buffer;
    filename: string;
    contentType: string;
}
export interface FileStream extends NodeJS.ReadableStream {
    path: string | Buffer;
}
export declare function isFileWithMetadata(obj: any): obj is FileWithMetadata;
export declare function isFileData(obj: any): obj is NodeJS.ReadableStream | Buffer;
export declare function isEmptyObject(obj: any): boolean;
/**
 * This function retrieves the content type of the input.
 * @param inputData - The data to retrieve content type for.
 * @returns the content type of the input.
 */
export declare function getContentType(inputData: NodeJS.ReadableStream | Buffer): Promise<string>;
/**
 * Strips trailing slashes from "url", if present.
 * @param  url - the url string
 * @returns the url with any trailing slashes removed
 */
export declare function stripTrailingSlash(url: string): string;
/**
 * Return a query parameter value from a URL
 *
 * @param urlStr - the url string.
 * @param param - the name of the query parameter whose value should be returned
 * @returns the value of the "param" query parameter
 */
export declare function getQueryParam(urlStr: string, param: string): string;
/**
 * Validates that all required params are provided
 * @param params - the method parameters.
 * @param requires - the required parameter names.
 * @returns null if no errors found, otherwise an Error instance
 */
export declare function getMissingParams(params: {
    [key: string]: any;
}, requires: string[]): null | Error;
/**
 * Validates that "params" contains a value for each key listed in "requiredParams",
 * and that each key contained in "params" is a valid key listed in "allParams".
 * In essence, we want params to contain only valid keys and we want params
 * to contain at least the required keys.
 *
 * @param params - the "params" object passed into an operation containing method parameters.
 * @param requiredParams - the names of required parameters.
 * If null, then the "required params" check is bypassed.
 * @param allParams - the names of all valid parameters.
 * If null, then the "valid params" check is bypassed.
 * @returns null if no errors found, otherwise an Error instance
 */
export declare function validateParams(params: {
    [key: string]: any;
}, requiredParams: string[], allParams: string[]): null | Error;
/**
 * Return true if 'text' is html
 * @param  text - The 'text' to analyze
 * @returns true if 'text' has html tags
 */
export declare function isHTML(text: string): boolean;
/**
 * Returns the first match from formats that is key the params map
 * otherwise null
 * @param  params - The parameters.
 * @param  requires - The keys we want to check
 */
export declare function getFormat(params: {
    [key: string]: any;
}, formats: string[]): string;
/**
 * This function builds a `form-data` object for each file parameter.
 * @param fileParam - The FileWithMetadata instance that contains the file information
 * @returns the FileObject instance
 */
export declare function buildRequestFileObject(fileParam: FileWithMetadata): Promise<FileObject>;
/**
 * This function converts an object's keys to lower case.
 * note: does not convert nested keys
 * @param obj - The object to convert the keys of.
 * @returns the object with keys folded to lowercase
 */
export declare function toLowerKeys(obj: Object): Object;
/**
 * Constructs a service URL by formatting a parameterized URL.
 *
 * @param parameterizedUrl - a URL that contains variable placeholders, e.g. '\{scheme\}://ibm.com'.
 * @param defaultUrlVariables - a Map of variable names to default values.
 *  Each variable in the parameterized URL must have a default value specified in this map.
 * @param providedUrlVariables - a Map of variable names to desired values.
 *  If a variable is not provided in this map, the default variable value will be used instead.
 * @returns the formatted URL with all variable placeholders replaced by values.
 */
export declare function constructServiceUrl(parameterizedUrl: string, defaultUrlVariables: Map<string, string>, providedUrlVariables: Map<string, string> | null): string;
/**
 * Returns true if and only if "mimeType" is a "JSON-like" mime type
 * (e.g. "application/json; charset=utf-8").
 * @param mimeType - the mimeType string
 * @returns true if "mimeType" represents a JSON media type and false otherwise
 */
export declare function isJsonMimeType(mimeType: string): boolean;
