"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonMimeType = exports.constructServiceUrl = exports.toLowerKeys = exports.buildRequestFileObject = exports.getFormat = exports.isHTML = exports.validateParams = exports.getMissingParams = exports.getQueryParam = exports.stripTrailingSlash = exports.getContentType = exports.isEmptyObject = exports.isFileData = exports.isFileWithMetadata = void 0;
var isstream_1 = require("isstream");
var mime_types_1 = require("mime-types");
var path_1 = require("path");
var logger_1 = __importDefault(require("./logger"));
var FileType = require('file-type');
// custom type guards
function isFileObject(obj) {
    return Boolean(obj && obj.value);
}
function isFileStream(obj) {
    return Boolean(obj && (0, isstream_1.isReadable)(obj) && obj.path);
}
function isFileWithMetadata(obj) {
    return Boolean(obj && obj.data && isFileData(obj.data));
}
exports.isFileWithMetadata = isFileWithMetadata;
function isFileData(obj) {
    return Boolean(obj && ((0, isstream_1.isReadable)(obj) || Buffer.isBuffer(obj)));
}
exports.isFileData = isFileData;
function isEmptyObject(obj) {
    return Boolean(obj && Object.keys(obj).length === 0 && obj.constructor === Object);
}
exports.isEmptyObject = isEmptyObject;
/**
 * This function retrieves the content type of the input.
 * @param inputData - The data to retrieve content type for.
 * @returns the content type of the input.
 */
function getContentType(inputData) {
    return __awaiter(this, void 0, void 0, function () {
        var contentType, mimeType;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contentType = null;
                    if (!isFileStream(inputData)) return [3 /*break*/, 1];
                    mimeType = (0, mime_types_1.lookup)(inputData.path);
                    contentType = { mime: mimeType || null };
                    return [3 /*break*/, 3];
                case 1:
                    if (!Buffer.isBuffer(inputData)) return [3 /*break*/, 3];
                    return [4 /*yield*/, FileType.fromBuffer(inputData)];
                case 2:
                    // if the inputData is a Buffer
                    contentType = _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, contentType ? contentType.mime : null];
            }
        });
    });
}
exports.getContentType = getContentType;
/**
 * Strips trailing slashes from "url", if present.
 * @param  url - the url string
 * @returns the url with any trailing slashes removed
 */
function stripTrailingSlash(url) {
    // Match a forward slash / at the end of the string ($)
    return url.replace(/\/$/, '');
}
exports.stripTrailingSlash = stripTrailingSlash;
/**
 * Return a query parameter value from a URL
 *
 * @param urlStr - the url string.
 * @param param - the name of the query parameter whose value should be returned
 * @returns the value of the "param" query parameter
 */
function getQueryParam(urlStr, param) {
    // The base URL is a dummy value just so we can process relative URLs
    var url = new URL(urlStr, 'https://foo.bar');
    return url.searchParams.get(param);
}
exports.getQueryParam = getQueryParam;
/**
 * Validates that all required params are provided
 * @param params - the method parameters.
 * @param requires - the required parameter names.
 * @returns null if no errors found, otherwise an Error instance
 */
function getMissingParams(params, requires) {
    var missing;
    if (!requires) {
        return null;
    }
    else if (!params) {
        missing = requires;
    }
    else {
        missing = [];
        requires.forEach(function (require) {
            if (isMissing(params[require])) {
                missing.push(require);
            }
        });
    }
    return missing.length > 0
        ? new Error("Missing required parameters: ".concat(missing.join(', ')))
        : null;
}
exports.getMissingParams = getMissingParams;
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
function validateParams(params, requiredParams, allParams) {
    var missing = [];
    var invalid = [];
    // If there are any required fields, then make sure they are present in "params".
    if (requiredParams) {
        if (!params) {
            missing = requiredParams;
        }
        else {
            requiredParams.forEach(function (require) {
                if (isMissing(params[require])) {
                    missing.push(require);
                }
            });
        }
    }
    // Make sure that each field specified in "params" is a valid param.
    if (allParams && params) {
        Object.keys(params).forEach(function (key) {
            if (!allParams.includes(key)) {
                invalid.push(key);
            }
        });
    }
    // If no errors found, then bail now.
    if (missing.length === 0 && invalid.length === 0) {
        return null;
    }
    // Return an Error object identifying the errors we found.
    var errorMsg = 'Parameter validation errors:';
    if (missing.length > 0) {
        errorMsg += "\n  Missing required parameters: ".concat(missing.join(', '));
    }
    if (invalid.length > 0) {
        errorMsg += "\n  Found invalid parameters: ".concat(invalid.join(', '));
    }
    return new Error(errorMsg);
}
exports.validateParams = validateParams;
/**
 * Returns true if value is determined to be "missing". Currently defining "missing"
 * as `undefined`, `null`, or the empty string.
 *
 * @param value - the parameter value
 * @returns true if "value" is either undefined, null or "" (empty string)
 */
function isMissing(value) {
    return value === undefined || value === null || value === '';
}
/**
 * Return true if 'text' is html
 * @param  text - The 'text' to analyze
 * @returns true if 'text' has html tags
 */
function isHTML(text) {
    logger_1.default.debug("Determining if the text ".concat(text, " is HTML."));
    return /<[a-z][\s\S]*>/i.test(text);
}
exports.isHTML = isHTML;
/**
 * Returns the first match from formats that is key the params map
 * otherwise null
 * @param  params - The parameters.
 * @param  requires - The keys we want to check
 */
function getFormat(params, formats) {
    if (!formats || !params) {
        logger_1.default.debug("No formats to parse in getFormat. Returning null");
        return null;
    }
    var validFormats = formats.filter(function (item) { return item in params; });
    if (validFormats.length)
        return validFormats[0];
    logger_1.default.debug("No formats to parse in getFormat. Returning null");
    return null;
}
exports.getFormat = getFormat;
/**
 * This function builds a `form-data` object for each file parameter.
 * @param fileParam - The FileWithMetadata instance that contains the file information
 * @returns the FileObject instance
 */
function buildRequestFileObject(fileParam) {
    return __awaiter(this, void 0, void 0, function () {
        var fileObj, filename, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (isFileObject(fileParam.data)) {
                        // For backward compatibility, we allow the data to be a FileObject.
                        fileObj = { value: fileParam.data.value, options: {} };
                        if (fileParam.data.options) {
                            fileObj.options = {
                                filename: fileParam.filename || fileParam.data.options.filename,
                                contentType: fileParam.contentType || fileParam.data.options.contentType,
                            };
                        }
                    }
                    else {
                        fileObj = {
                            value: fileParam.data,
                            options: {
                                filename: fileParam.filename,
                                contentType: fileParam.contentType,
                            },
                        };
                    }
                    // Also for backward compatibility, we allow data to be a string
                    if (typeof fileObj.value === 'string') {
                        fileObj.value = Buffer.from(fileObj.value);
                    }
                    filename = fileObj.options.filename;
                    if (!filename && isFileStream(fileObj.value)) {
                        // if readable stream with path property
                        filename = fileObj.value.path;
                    }
                    // toString handles the case when path is a buffer
                    fileObj.options.filename = filename ? (0, path_1.basename)(filename.toString()) : '_';
                    if (!(!fileObj.options.contentType && isFileData(fileObj.value))) return [3 /*break*/, 2];
                    _a = fileObj.options;
                    return [4 /*yield*/, getContentType(fileObj.value)];
                case 1:
                    _a.contentType =
                        (_b.sent()) || 'application/octet-stream';
                    _b.label = 2;
                case 2: return [2 /*return*/, fileObj];
            }
        });
    });
}
exports.buildRequestFileObject = buildRequestFileObject;
/**
 * This function converts an object's keys to lower case.
 * note: does not convert nested keys
 * @param obj - The object to convert the keys of.
 * @returns the object with keys folded to lowercase
 */
function toLowerKeys(obj) {
    var lowerCaseObj = {};
    if (obj) {
        lowerCaseObj = Object.assign.apply(Object, __spreadArray([{}], Object.keys(obj).map(function (key) {
            var _a;
            return (_a = {},
                _a[key.toLowerCase()] = obj[key],
                _a);
        }), false));
    }
    return lowerCaseObj;
}
exports.toLowerKeys = toLowerKeys;
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
function constructServiceUrl(parameterizedUrl, defaultUrlVariables, providedUrlVariables) {
    // If null was passed, we set the variables to an empty map.
    // This results in all default variable values being used.
    if (providedUrlVariables === null) {
        providedUrlVariables = new Map();
    }
    // Verify the provided variable names.
    providedUrlVariables.forEach(function (_, name) {
        if (!defaultUrlVariables.has(name)) {
            throw new Error("'".concat(name, "' is an invalid variable name.\n      Valid variable names: [").concat(Array.from(defaultUrlVariables.keys()).sort(), "]."));
        }
    });
    // Format the URL with provided or default variable values.
    var formattedUrl = parameterizedUrl;
    defaultUrlVariables.forEach(function (defaultValue, name) {
        // Use the default variable value if none was provided.
        var providedValue = providedUrlVariables.get(name);
        var formatValue = providedValue !== undefined ? providedValue : defaultValue;
        formattedUrl = formattedUrl.replace("{".concat(name, "}"), formatValue);
    });
    return formattedUrl;
}
exports.constructServiceUrl = constructServiceUrl;
/**
 * Returns true if and only if "mimeType" is a "JSON-like" mime type
 * (e.g. "application/json; charset=utf-8").
 * @param mimeType - the mimeType string
 * @returns true if "mimeType" represents a JSON media type and false otherwise
 */
function isJsonMimeType(mimeType) {
    logger_1.default.debug("Determining if the mime type '".concat(mimeType, "' specifies JSON content."));
    return !!mimeType && /^application\/json(\s*;.*)?$/i.test(mimeType);
}
exports.isJsonMimeType = isJsonMimeType;
