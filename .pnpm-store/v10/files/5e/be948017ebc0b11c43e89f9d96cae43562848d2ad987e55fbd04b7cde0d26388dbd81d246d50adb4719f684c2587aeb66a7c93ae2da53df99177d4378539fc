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
import { getMissingParams } from '../../lib/helper';
/**
 * Compute and return a Basic Authorization header from a username and password.
 *
 * @param username - The username or client id
 * @param password - The password or client secret
 * @returns a Basic Auth header with format "Basic <encoded-credentials>"
 */
export function computeBasicAuthHeader(username, password) {
    const encodedCreds = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${encodedCreds}`;
}
// returns true if the string has a curly bracket or quote as the first or last character
// these are common user-issues that we should handle before they get a network error
function badCharAtAnEnd(value) {
    return (value.startsWith('{') || value.startsWith('"') || value.endsWith('}') || value.endsWith('"'));
}
/**
 * Checks credentials for common user mistakes of copying \{, \}, or \" characters from the documentation
 *
 * @param obj - the options object holding credentials
 * @param credsToCheck - an array containing the keys of the credentials to check for problems
 * @returns a string with the error message if there were problems, null if not
 */
export function checkCredentials(obj, credsToCheck) {
    let errorMessage = '';
    credsToCheck.forEach((cred) => {
        if (obj[cred] && badCharAtAnEnd(obj[cred])) {
            errorMessage += `The ${cred} shouldn't start or end with curly brackets or quotes. Be sure to remove any {, }, or "`;
        }
    });
    if (errorMessage.length) {
        errorMessage +=
            'Revise these credentials - they should not start or end with curly brackets or quotes.';
        return new Error(errorMessage);
    }
    return null;
}
/**
 * Validates "options".
 * @param options - a configuration options object
 * @param requiredOptions - the list of properties that must be present in "options"
 *
 * @throws Error: "options" failed validation
 */
export function validateInput(options, requiredOptions) {
    // check for required params
    const missingParamsError = getMissingParams(options, requiredOptions);
    if (missingParamsError) {
        throw missingParamsError;
    }
    // check certain credentials for common user errors: username, password, and apikey
    // note: will only apply to certain authenticators
    const credsToCheck = ['username', 'password', 'apikey'];
    const credentialProblems = checkCredentials(options, credsToCheck);
    if (credentialProblems) {
        throw credentialProblems;
    }
}
/**
 * Gets the current time.
 *
 * @returns the current time in seconds.
 */
export function getCurrentTime() {
    return Math.floor(Date.now() / 1000);
}
/**
 * Removes a given suffix if it exists.
 *
 * @param str - the base string to operate on
 * @param suffix - the suffix to remove, if present
 *
 * @returns the substring of "str" that remains after the suffix is removed
 */
export function removeSuffix(str, suffix) {
    if (str.endsWith(suffix)) {
        str = str.substring(0, str.lastIndexOf(suffix));
    }
    return str;
}
/**
 * Checks that exactly one of the arguments provided is defined.
 * Returns true if one argument is defined. Returns false if no
 * argument are defined or if 2 or more are defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if and only if exactly one argument is defined
 */
export function onlyOne(...args) {
    return countDefinedArgs(args) === 1;
}
/**
 * Checks for at least one of the given elements being defined.
 *
 * @param args - The spread of arguments to check
 * @returns true if one or more are defined; false if all are undefined
 */
export function atLeastOne(...args) {
    return countDefinedArgs(args) >= 1;
}
/**
 * Verifies that no more than one of the given elements are defined.
 * Returns true if one or none are defined, and false otherwise.
 *
 * @param args - The spread of arguments to check
 * @returns  false if more than one elements are defined, true otherwise
 */
export function atMostOne(...args) {
    return countDefinedArgs(args) <= 1;
}
/**
 * Takes a list of anything (intended to be the arguments passed to one of the
 * argument checking functions above) and returns how many elements in that
 * list are not undefined.
 */
function countDefinedArgs(args) {
    return args.reduce((total, arg) => {
        if (arg) {
            total += 1;
        }
        return total;
    }, 0);
}
