/**
 * (C) Copyright IBM Corp. 2019, 2024.
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
/**
 * Compute and return a Basic Authorization header from a username and password.
 *
 * @param username - The username or client id
 * @param password - The password or client secret
 * @returns a Basic Auth header with format "Basic <encoded-credentials>"
 */
export declare function computeBasicAuthHeader(username: string, password: string): string;
/**
 * Checks credentials for common user mistakes of copying \{, \}, or \" characters from the documentation
 *
 * @param obj - the options object holding credentials
 * @param credsToCheck - an array containing the keys of the credentials to check for problems
 * @returns a string with the error message if there were problems, null if not
 */
export declare function checkCredentials(obj: any, credsToCheck: string[]): Error | null;
/**
 * Validates "options".
 * @param options - a configuration options object
 * @param requiredOptions - the list of properties that must be present in "options"
 *
 * @throws Error: "options" failed validation
 */
export declare function validateInput(options: any, requiredOptions: string[]): void;
/**
 * Gets the current time.
 *
 * @returns the current time in seconds.
 */
export declare function getCurrentTime(): number;
/**
 * Removes a given suffix if it exists.
 *
 * @param str - the base string to operate on
 * @param suffix - the suffix to remove, if present
 *
 * @returns the substring of "str" that remains after the suffix is removed
 */
export declare function removeSuffix(str: string, suffix: string): string;
/**
 * Checks that exactly one of the arguments provided is defined.
 * Returns true if one argument is defined. Returns false if no
 * argument are defined or if 2 or more are defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if and only if exactly one argument is defined
 */
export declare function onlyOne(...args: any): boolean;
/**
 * Checks for at least one of the given elements being defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if one or more are defined; false if all are undefined
 */
export declare function atLeastOne(...args: any): boolean;
/**
 * Verifies that no more than one of the given elements are defined.
 * Returns true if one or none are defined, and false otherwise.
 *
 * @param args - The spread of arguments to check
 * @returns  false if more than one elements are defined, true otherwise
 */
export declare function atMostOne(...args: any): boolean;
