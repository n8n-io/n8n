import { GoogleAuth } from 'google-auth-library';
import { createWriteStream, writeFile } from 'fs';
import { Readable } from 'node:stream';
import * as NodeWs from 'ws';
import * as fs from 'fs/promises';

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let _defaultBaseGeminiUrl = undefined;
let _defaultBaseVertexUrl = undefined;
/**
 * Overrides the base URLs for the Gemini API and Vertex AI API.
 *
 * @remarks This function should be called before initializing the SDK. If the
 * base URLs are set after initializing the SDK, the base URLs will not be
 * updated. Base URLs provided in the HttpOptions will also take precedence over
 * URLs set here.
 *
 * @example
 * ```ts
 * import {GoogleGenAI, setDefaultBaseUrls} from '@google/genai';
 * // Override the base URL for the Gemini API.
 * setDefaultBaseUrls({geminiUrl:'https://gemini.google.com'});
 *
 * // Override the base URL for the Vertex AI API.
 * setDefaultBaseUrls({vertexUrl: 'https://vertexai.googleapis.com'});
 *
 * const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
 * ```
 */
function setDefaultBaseUrls(baseUrlParams) {
    _defaultBaseGeminiUrl = baseUrlParams.geminiUrl;
    _defaultBaseVertexUrl = baseUrlParams.vertexUrl;
}
/**
 * Returns the default base URLs for the Gemini API and Vertex AI API.
 */
function getDefaultBaseUrls() {
    return {
        geminiUrl: _defaultBaseGeminiUrl,
        vertexUrl: _defaultBaseVertexUrl,
    };
}
/**
 * Returns the default base URL based on the following priority:
 *   1. Base URLs set via HttpOptions.
 *   2. Base URLs set via the latest call to setDefaultBaseUrls.
 *   3. Base URLs set via environment variables.
 */
function getBaseUrl(httpOptions, vertexai, vertexBaseUrlFromEnv, geminiBaseUrlFromEnv) {
    var _a, _b;
    if (!(httpOptions === null || httpOptions === void 0 ? void 0 : httpOptions.baseUrl)) {
        const defaultBaseUrls = getDefaultBaseUrls();
        if (vertexai) {
            return (_a = defaultBaseUrls.vertexUrl) !== null && _a !== void 0 ? _a : vertexBaseUrlFromEnv;
        }
        else {
            return (_b = defaultBaseUrls.geminiUrl) !== null && _b !== void 0 ? _b : geminiBaseUrlFromEnv;
        }
    }
    return httpOptions.baseUrl;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class BaseModule {
}
function formatMap(templateString, valueMap) {
    // Use a regular expression to find all placeholders in the template string
    const regex = /\{([^}]+)\}/g;
    // Replace each placeholder with its corresponding value from the valueMap
    return templateString.replace(regex, (match, key) => {
        if (Object.prototype.hasOwnProperty.call(valueMap, key)) {
            const value = valueMap[key];
            // Convert the value to a string if it's not a string already
            return value !== undefined && value !== null ? String(value) : '';
        }
        else {
            // Handle missing keys
            throw new Error(`Key '${key}' not found in valueMap.`);
        }
    });
}
function setValueByPath(data, keys, value) {
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.endsWith('[]')) {
            const keyName = key.slice(0, -2);
            if (!(keyName in data)) {
                if (Array.isArray(value)) {
                    data[keyName] = Array.from({ length: value.length }, () => ({}));
                }
                else {
                    throw new Error(`Value must be a list given an array path ${key}`);
                }
            }
            if (Array.isArray(data[keyName])) {
                const arrayData = data[keyName];
                if (Array.isArray(value)) {
                    for (let j = 0; j < arrayData.length; j++) {
                        const entry = arrayData[j];
                        setValueByPath(entry, keys.slice(i + 1), value[j]);
                    }
                }
                else {
                    for (const d of arrayData) {
                        setValueByPath(d, keys.slice(i + 1), value);
                    }
                }
            }
            return;
        }
        else if (key.endsWith('[0]')) {
            const keyName = key.slice(0, -3);
            if (!(keyName in data)) {
                data[keyName] = [{}];
            }
            const arrayData = data[keyName];
            setValueByPath(arrayData[0], keys.slice(i + 1), value);
            return;
        }
        if (!data[key] || typeof data[key] !== 'object') {
            data[key] = {};
        }
        data = data[key];
    }
    const keyToSet = keys[keys.length - 1];
    const existingData = data[keyToSet];
    if (existingData !== undefined) {
        if (!value ||
            (typeof value === 'object' && Object.keys(value).length === 0)) {
            return;
        }
        if (value === existingData) {
            return;
        }
        if (typeof existingData === 'object' &&
            typeof value === 'object' &&
            existingData !== null &&
            value !== null) {
            Object.assign(existingData, value);
        }
        else {
            throw new Error(`Cannot set value for an existing key. Key: ${keyToSet}`);
        }
    }
    else {
        if (keyToSet === '_self' &&
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)) {
            const valueAsRecord = value;
            Object.assign(data, valueAsRecord);
        }
        else {
            data[keyToSet] = value;
        }
    }
}
function getValueByPath(data, keys) {
    try {
        if (keys.length === 1 && keys[0] === '_self') {
            return data;
        }
        for (let i = 0; i < keys.length; i++) {
            if (typeof data !== 'object' || data === null) {
                return undefined;
            }
            const key = keys[i];
            if (key.endsWith('[]')) {
                const keyName = key.slice(0, -2);
                if (keyName in data) {
                    const arrayData = data[keyName];
                    if (!Array.isArray(arrayData)) {
                        return undefined;
                    }
                    return arrayData.map((d) => getValueByPath(d, keys.slice(i + 1)));
                }
                else {
                    return undefined;
                }
            }
            else {
                data = data[key];
            }
        }
        return data;
    }
    catch (error) {
        if (error instanceof TypeError) {
            return undefined;
        }
        throw error;
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function tBytes$1(fromBytes) {
    if (typeof fromBytes !== 'string') {
        throw new Error('fromImageBytes must be a string');
    }
    // TODO(b/389133914): Remove dummy bytes converter.
    return fromBytes;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// Code generated by the Google Gen AI SDK generator DO NOT EDIT.
function getOperationParametersToMldev(fromObject) {
    const toObject = {};
    const fromOperationName = getValueByPath(fromObject, [
        'operationName',
    ]);
    if (fromOperationName != null) {
        setValueByPath(toObject, ['_url', 'operationName'], fromOperationName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function fetchPredictOperationParametersToVertex(fromObject) {
    const toObject = {};
    const fromOperationName = getValueByPath(fromObject, [
        'operationName',
    ]);
    if (fromOperationName != null) {
        setValueByPath(toObject, ['operationName'], fromOperationName);
    }
    const fromResourceName = getValueByPath(fromObject, ['resourceName']);
    if (fromResourceName != null) {
        setValueByPath(toObject, ['_url', 'resourceName'], fromResourceName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function getOperationParametersToVertex(fromObject) {
    const toObject = {};
    const fromOperationName = getValueByPath(fromObject, [
        'operationName',
    ]);
    if (fromOperationName != null) {
        setValueByPath(toObject, ['_url', 'operationName'], fromOperationName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function videoFromMldev$1(fromObject) {
    const toObject = {};
    const fromUri = getValueByPath(fromObject, ['video', 'uri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromVideoBytes = getValueByPath(fromObject, [
        'video',
        'encodedVideo',
    ]);
    if (fromVideoBytes != null) {
        setValueByPath(toObject, ['videoBytes'], tBytes$1(fromVideoBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['encoding']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generatedVideoFromMldev$1(fromObject) {
    const toObject = {};
    const fromVideo = getValueByPath(fromObject, ['_self']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], videoFromMldev$1(fromVideo));
    }
    return toObject;
}
function generateVideosResponseFromMldev$1(fromObject) {
    const toObject = {};
    const fromGeneratedVideos = getValueByPath(fromObject, [
        'generatedSamples',
    ]);
    if (fromGeneratedVideos != null) {
        let transformedList = fromGeneratedVideos;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedVideoFromMldev$1(item);
            });
        }
        setValueByPath(toObject, ['generatedVideos'], transformedList);
    }
    const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
        'raiMediaFilteredCount',
    ]);
    if (fromRaiMediaFilteredCount != null) {
        setValueByPath(toObject, ['raiMediaFilteredCount'], fromRaiMediaFilteredCount);
    }
    const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
        'raiMediaFilteredReasons',
    ]);
    if (fromRaiMediaFilteredReasons != null) {
        setValueByPath(toObject, ['raiMediaFilteredReasons'], fromRaiMediaFilteredReasons);
    }
    return toObject;
}
function generateVideosOperationFromMldev$1(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], fromMetadata);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    const fromResponse = getValueByPath(fromObject, [
        'response',
        'generateVideoResponse',
    ]);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], generateVideosResponseFromMldev$1(fromResponse));
    }
    return toObject;
}
function videoFromVertex$1(fromObject) {
    const toObject = {};
    const fromUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromVideoBytes = getValueByPath(fromObject, [
        'bytesBase64Encoded',
    ]);
    if (fromVideoBytes != null) {
        setValueByPath(toObject, ['videoBytes'], tBytes$1(fromVideoBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generatedVideoFromVertex$1(fromObject) {
    const toObject = {};
    const fromVideo = getValueByPath(fromObject, ['_self']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], videoFromVertex$1(fromVideo));
    }
    return toObject;
}
function generateVideosResponseFromVertex$1(fromObject) {
    const toObject = {};
    const fromGeneratedVideos = getValueByPath(fromObject, ['videos']);
    if (fromGeneratedVideos != null) {
        let transformedList = fromGeneratedVideos;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedVideoFromVertex$1(item);
            });
        }
        setValueByPath(toObject, ['generatedVideos'], transformedList);
    }
    const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
        'raiMediaFilteredCount',
    ]);
    if (fromRaiMediaFilteredCount != null) {
        setValueByPath(toObject, ['raiMediaFilteredCount'], fromRaiMediaFilteredCount);
    }
    const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
        'raiMediaFilteredReasons',
    ]);
    if (fromRaiMediaFilteredReasons != null) {
        setValueByPath(toObject, ['raiMediaFilteredReasons'], fromRaiMediaFilteredReasons);
    }
    return toObject;
}
function generateVideosOperationFromVertex$1(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], fromMetadata);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], generateVideosResponseFromVertex$1(fromResponse));
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/** Required. Outcome of the code execution. */
var Outcome;
(function (Outcome) {
    /**
     * Unspecified status. This value should not be used.
     */
    Outcome["OUTCOME_UNSPECIFIED"] = "OUTCOME_UNSPECIFIED";
    /**
     * Code execution completed successfully.
     */
    Outcome["OUTCOME_OK"] = "OUTCOME_OK";
    /**
     * Code execution finished but with a failure. `stderr` should contain the reason.
     */
    Outcome["OUTCOME_FAILED"] = "OUTCOME_FAILED";
    /**
     * Code execution ran for too long, and was cancelled. There may or may not be a partial output present.
     */
    Outcome["OUTCOME_DEADLINE_EXCEEDED"] = "OUTCOME_DEADLINE_EXCEEDED";
})(Outcome || (Outcome = {}));
/** Required. Programming language of the `code`. */
var Language;
(function (Language) {
    /**
     * Unspecified language. This value should not be used.
     */
    Language["LANGUAGE_UNSPECIFIED"] = "LANGUAGE_UNSPECIFIED";
    /**
     * Python >= 3.10, with numpy and simpy available.
     */
    Language["PYTHON"] = "PYTHON";
})(Language || (Language = {}));
/** Optional. The type of the data. */
var Type;
(function (Type) {
    /**
     * Not specified, should not be used.
     */
    Type["TYPE_UNSPECIFIED"] = "TYPE_UNSPECIFIED";
    /**
     * OpenAPI string type
     */
    Type["STRING"] = "STRING";
    /**
     * OpenAPI number type
     */
    Type["NUMBER"] = "NUMBER";
    /**
     * OpenAPI integer type
     */
    Type["INTEGER"] = "INTEGER";
    /**
     * OpenAPI boolean type
     */
    Type["BOOLEAN"] = "BOOLEAN";
    /**
     * OpenAPI array type
     */
    Type["ARRAY"] = "ARRAY";
    /**
     * OpenAPI object type
     */
    Type["OBJECT"] = "OBJECT";
    /**
     * Null type
     */
    Type["NULL"] = "NULL";
})(Type || (Type = {}));
/** Required. Harm category. */
var HarmCategory;
(function (HarmCategory) {
    /**
     * The harm category is unspecified.
     */
    HarmCategory["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
    /**
     * The harm category is hate speech.
     */
    HarmCategory["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
    /**
     * The harm category is dangerous content.
     */
    HarmCategory["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
    /**
     * The harm category is harassment.
     */
    HarmCategory["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
    /**
     * The harm category is sexually explicit content.
     */
    HarmCategory["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
    /**
     * Deprecated: Election filter is not longer supported. The harm category is civic integrity.
     */
    HarmCategory["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
    /**
     * The harm category is image hate.
     */
    HarmCategory["HARM_CATEGORY_IMAGE_HATE"] = "HARM_CATEGORY_IMAGE_HATE";
    /**
     * The harm category is image dangerous content.
     */
    HarmCategory["HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT"] = "HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT";
    /**
     * The harm category is image harassment.
     */
    HarmCategory["HARM_CATEGORY_IMAGE_HARASSMENT"] = "HARM_CATEGORY_IMAGE_HARASSMENT";
    /**
     * The harm category is image sexually explicit content.
     */
    HarmCategory["HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT";
})(HarmCategory || (HarmCategory = {}));
/** Optional. Specify if the threshold is used for probability or severity score. If not specified, the threshold is used for probability score. */
var HarmBlockMethod;
(function (HarmBlockMethod) {
    /**
     * The harm block method is unspecified.
     */
    HarmBlockMethod["HARM_BLOCK_METHOD_UNSPECIFIED"] = "HARM_BLOCK_METHOD_UNSPECIFIED";
    /**
     * The harm block method uses both probability and severity scores.
     */
    HarmBlockMethod["SEVERITY"] = "SEVERITY";
    /**
     * The harm block method uses the probability score.
     */
    HarmBlockMethod["PROBABILITY"] = "PROBABILITY";
})(HarmBlockMethod || (HarmBlockMethod = {}));
/** Required. The harm block threshold. */
var HarmBlockThreshold;
(function (HarmBlockThreshold) {
    /**
     * Unspecified harm block threshold.
     */
    HarmBlockThreshold["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
    /**
     * Block low threshold and above (i.e. block more).
     */
    HarmBlockThreshold["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
    /**
     * Block medium threshold and above.
     */
    HarmBlockThreshold["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
    /**
     * Block only high threshold (i.e. block less).
     */
    HarmBlockThreshold["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
    /**
     * Block none.
     */
    HarmBlockThreshold["BLOCK_NONE"] = "BLOCK_NONE";
    /**
     * Turn off the safety filter.
     */
    HarmBlockThreshold["OFF"] = "OFF";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
/** The mode of the predictor to be used in dynamic retrieval. */
var Mode;
(function (Mode) {
    /**
     * Always trigger retrieval.
     */
    Mode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    /**
     * Run retrieval only when system decides it is necessary.
     */
    Mode["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(Mode || (Mode = {}));
/** Type of auth scheme. */
var AuthType;
(function (AuthType) {
    AuthType["AUTH_TYPE_UNSPECIFIED"] = "AUTH_TYPE_UNSPECIFIED";
    /**
     * No Auth.
     */
    AuthType["NO_AUTH"] = "NO_AUTH";
    /**
     * API Key Auth.
     */
    AuthType["API_KEY_AUTH"] = "API_KEY_AUTH";
    /**
     * HTTP Basic Auth.
     */
    AuthType["HTTP_BASIC_AUTH"] = "HTTP_BASIC_AUTH";
    /**
     * Google Service Account Auth.
     */
    AuthType["GOOGLE_SERVICE_ACCOUNT_AUTH"] = "GOOGLE_SERVICE_ACCOUNT_AUTH";
    /**
     * OAuth auth.
     */
    AuthType["OAUTH"] = "OAUTH";
    /**
     * OpenID Connect (OIDC) Auth.
     */
    AuthType["OIDC_AUTH"] = "OIDC_AUTH";
})(AuthType || (AuthType = {}));
/** The API spec that the external API implements. */
var ApiSpec;
(function (ApiSpec) {
    /**
     * Unspecified API spec. This value should not be used.
     */
    ApiSpec["API_SPEC_UNSPECIFIED"] = "API_SPEC_UNSPECIFIED";
    /**
     * Simple search API spec.
     */
    ApiSpec["SIMPLE_SEARCH"] = "SIMPLE_SEARCH";
    /**
     * Elastic search API spec.
     */
    ApiSpec["ELASTIC_SEARCH"] = "ELASTIC_SEARCH";
})(ApiSpec || (ApiSpec = {}));
/** Status of the url retrieval. */
var UrlRetrievalStatus;
(function (UrlRetrievalStatus) {
    /**
     * Default value. This value is unused
     */
    UrlRetrievalStatus["URL_RETRIEVAL_STATUS_UNSPECIFIED"] = "URL_RETRIEVAL_STATUS_UNSPECIFIED";
    /**
     * Url retrieval is successful.
     */
    UrlRetrievalStatus["URL_RETRIEVAL_STATUS_SUCCESS"] = "URL_RETRIEVAL_STATUS_SUCCESS";
    /**
     * Url retrieval is failed due to error.
     */
    UrlRetrievalStatus["URL_RETRIEVAL_STATUS_ERROR"] = "URL_RETRIEVAL_STATUS_ERROR";
    /**
     * Url retrieval is failed because the content is behind paywall.
     */
    UrlRetrievalStatus["URL_RETRIEVAL_STATUS_PAYWALL"] = "URL_RETRIEVAL_STATUS_PAYWALL";
    /**
     * Url retrieval is failed because the content is unsafe.
     */
    UrlRetrievalStatus["URL_RETRIEVAL_STATUS_UNSAFE"] = "URL_RETRIEVAL_STATUS_UNSAFE";
})(UrlRetrievalStatus || (UrlRetrievalStatus = {}));
/** Output only. The reason why the model stopped generating tokens.

  If empty, the model has not stopped generating the tokens.
   */
var FinishReason;
(function (FinishReason) {
    /**
     * The finish reason is unspecified.
     */
    FinishReason["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
    /**
     * Token generation reached a natural stopping point or a configured stop sequence.
     */
    FinishReason["STOP"] = "STOP";
    /**
     * Token generation reached the configured maximum output tokens.
     */
    FinishReason["MAX_TOKENS"] = "MAX_TOKENS";
    /**
     * Token generation stopped because the content potentially contains safety violations. NOTE: When streaming, [content][] is empty if content filters blocks the output.
     */
    FinishReason["SAFETY"] = "SAFETY";
    /**
     * The token generation stopped because of potential recitation.
     */
    FinishReason["RECITATION"] = "RECITATION";
    /**
     * The token generation stopped because of using an unsupported language.
     */
    FinishReason["LANGUAGE"] = "LANGUAGE";
    /**
     * All other reasons that stopped the token generation.
     */
    FinishReason["OTHER"] = "OTHER";
    /**
     * Token generation stopped because the content contains forbidden terms.
     */
    FinishReason["BLOCKLIST"] = "BLOCKLIST";
    /**
     * Token generation stopped for potentially containing prohibited content.
     */
    FinishReason["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
    /**
     * Token generation stopped because the content potentially contains Sensitive Personally Identifiable Information (SPII).
     */
    FinishReason["SPII"] = "SPII";
    /**
     * The function call generated by the model is invalid.
     */
    FinishReason["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
    /**
     * Token generation stopped because generated images have safety violations.
     */
    FinishReason["IMAGE_SAFETY"] = "IMAGE_SAFETY";
    /**
     * The tool call generated by the model is invalid.
     */
    FinishReason["UNEXPECTED_TOOL_CALL"] = "UNEXPECTED_TOOL_CALL";
})(FinishReason || (FinishReason = {}));
/** Output only. Harm probability levels in the content. */
var HarmProbability;
(function (HarmProbability) {
    /**
     * Harm probability unspecified.
     */
    HarmProbability["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
    /**
     * Negligible level of harm.
     */
    HarmProbability["NEGLIGIBLE"] = "NEGLIGIBLE";
    /**
     * Low level of harm.
     */
    HarmProbability["LOW"] = "LOW";
    /**
     * Medium level of harm.
     */
    HarmProbability["MEDIUM"] = "MEDIUM";
    /**
     * High level of harm.
     */
    HarmProbability["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
/** Output only. Harm severity levels in the content. */
var HarmSeverity;
(function (HarmSeverity) {
    /**
     * Harm severity unspecified.
     */
    HarmSeverity["HARM_SEVERITY_UNSPECIFIED"] = "HARM_SEVERITY_UNSPECIFIED";
    /**
     * Negligible level of harm severity.
     */
    HarmSeverity["HARM_SEVERITY_NEGLIGIBLE"] = "HARM_SEVERITY_NEGLIGIBLE";
    /**
     * Low level of harm severity.
     */
    HarmSeverity["HARM_SEVERITY_LOW"] = "HARM_SEVERITY_LOW";
    /**
     * Medium level of harm severity.
     */
    HarmSeverity["HARM_SEVERITY_MEDIUM"] = "HARM_SEVERITY_MEDIUM";
    /**
     * High level of harm severity.
     */
    HarmSeverity["HARM_SEVERITY_HIGH"] = "HARM_SEVERITY_HIGH";
})(HarmSeverity || (HarmSeverity = {}));
/** Output only. Blocked reason. */
var BlockedReason;
(function (BlockedReason) {
    /**
     * Unspecified blocked reason.
     */
    BlockedReason["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
    /**
     * Candidates blocked due to safety.
     */
    BlockedReason["SAFETY"] = "SAFETY";
    /**
     * Candidates blocked due to other reason.
     */
    BlockedReason["OTHER"] = "OTHER";
    /**
     * Candidates blocked due to the terms which are included from the terminology blocklist.
     */
    BlockedReason["BLOCKLIST"] = "BLOCKLIST";
    /**
     * Candidates blocked due to prohibited content.
     */
    BlockedReason["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
    /**
     * Candidates blocked due to unsafe image generation content.
     */
    BlockedReason["IMAGE_SAFETY"] = "IMAGE_SAFETY";
})(BlockedReason || (BlockedReason = {}));
/** Output only. Traffic type. This shows whether a request consumes Pay-As-You-Go or Provisioned Throughput quota. */
var TrafficType;
(function (TrafficType) {
    /**
     * Unspecified request traffic type.
     */
    TrafficType["TRAFFIC_TYPE_UNSPECIFIED"] = "TRAFFIC_TYPE_UNSPECIFIED";
    /**
     * Type for Pay-As-You-Go traffic.
     */
    TrafficType["ON_DEMAND"] = "ON_DEMAND";
    /**
     * Type for Provisioned Throughput traffic.
     */
    TrafficType["PROVISIONED_THROUGHPUT"] = "PROVISIONED_THROUGHPUT";
})(TrafficType || (TrafficType = {}));
/** Server content modalities. */
var Modality;
(function (Modality) {
    /**
     * The modality is unspecified.
     */
    Modality["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
    /**
     * Indicates the model should return text
     */
    Modality["TEXT"] = "TEXT";
    /**
     * Indicates the model should return images.
     */
    Modality["IMAGE"] = "IMAGE";
    /**
     * Indicates the model should return audio.
     */
    Modality["AUDIO"] = "AUDIO";
})(Modality || (Modality = {}));
/** The media resolution to use. */
var MediaResolution;
(function (MediaResolution) {
    /**
     * Media resolution has not been set
     */
    MediaResolution["MEDIA_RESOLUTION_UNSPECIFIED"] = "MEDIA_RESOLUTION_UNSPECIFIED";
    /**
     * Media resolution set to low (64 tokens).
     */
    MediaResolution["MEDIA_RESOLUTION_LOW"] = "MEDIA_RESOLUTION_LOW";
    /**
     * Media resolution set to medium (256 tokens).
     */
    MediaResolution["MEDIA_RESOLUTION_MEDIUM"] = "MEDIA_RESOLUTION_MEDIUM";
    /**
     * Media resolution set to high (zoomed reframing with 256 tokens).
     */
    MediaResolution["MEDIA_RESOLUTION_HIGH"] = "MEDIA_RESOLUTION_HIGH";
})(MediaResolution || (MediaResolution = {}));
/** Job state. */
var JobState;
(function (JobState) {
    /**
     * The job state is unspecified.
     */
    JobState["JOB_STATE_UNSPECIFIED"] = "JOB_STATE_UNSPECIFIED";
    /**
     * The job has been just created or resumed and processing has not yet begun.
     */
    JobState["JOB_STATE_QUEUED"] = "JOB_STATE_QUEUED";
    /**
     * The service is preparing to run the job.
     */
    JobState["JOB_STATE_PENDING"] = "JOB_STATE_PENDING";
    /**
     * The job is in progress.
     */
    JobState["JOB_STATE_RUNNING"] = "JOB_STATE_RUNNING";
    /**
     * The job completed successfully.
     */
    JobState["JOB_STATE_SUCCEEDED"] = "JOB_STATE_SUCCEEDED";
    /**
     * The job failed.
     */
    JobState["JOB_STATE_FAILED"] = "JOB_STATE_FAILED";
    /**
     * The job is being cancelled. From this state the job may only go to either `JOB_STATE_SUCCEEDED`, `JOB_STATE_FAILED` or `JOB_STATE_CANCELLED`.
     */
    JobState["JOB_STATE_CANCELLING"] = "JOB_STATE_CANCELLING";
    /**
     * The job has been cancelled.
     */
    JobState["JOB_STATE_CANCELLED"] = "JOB_STATE_CANCELLED";
    /**
     * The job has been stopped, and can be resumed.
     */
    JobState["JOB_STATE_PAUSED"] = "JOB_STATE_PAUSED";
    /**
     * The job has expired.
     */
    JobState["JOB_STATE_EXPIRED"] = "JOB_STATE_EXPIRED";
    /**
     * The job is being updated. Only jobs in the `JOB_STATE_RUNNING` state can be updated. After updating, the job goes back to the `JOB_STATE_RUNNING` state.
     */
    JobState["JOB_STATE_UPDATING"] = "JOB_STATE_UPDATING";
    /**
     * The job is partially succeeded, some results may be missing due to errors.
     */
    JobState["JOB_STATE_PARTIALLY_SUCCEEDED"] = "JOB_STATE_PARTIALLY_SUCCEEDED";
})(JobState || (JobState = {}));
/** Tuning mode. */
var TuningMode;
(function (TuningMode) {
    /**
     * Tuning mode is unspecified.
     */
    TuningMode["TUNING_MODE_UNSPECIFIED"] = "TUNING_MODE_UNSPECIFIED";
    /**
     * Full fine-tuning mode.
     */
    TuningMode["TUNING_MODE_FULL"] = "TUNING_MODE_FULL";
    /**
     * PEFT adapter tuning mode.
     */
    TuningMode["TUNING_MODE_PEFT_ADAPTER"] = "TUNING_MODE_PEFT_ADAPTER";
})(TuningMode || (TuningMode = {}));
/** Optional. Adapter size for tuning. */
var AdapterSize;
(function (AdapterSize) {
    /**
     * Adapter size is unspecified.
     */
    AdapterSize["ADAPTER_SIZE_UNSPECIFIED"] = "ADAPTER_SIZE_UNSPECIFIED";
    /**
     * Adapter size 1.
     */
    AdapterSize["ADAPTER_SIZE_ONE"] = "ADAPTER_SIZE_ONE";
    /**
     * Adapter size 2.
     */
    AdapterSize["ADAPTER_SIZE_TWO"] = "ADAPTER_SIZE_TWO";
    /**
     * Adapter size 4.
     */
    AdapterSize["ADAPTER_SIZE_FOUR"] = "ADAPTER_SIZE_FOUR";
    /**
     * Adapter size 8.
     */
    AdapterSize["ADAPTER_SIZE_EIGHT"] = "ADAPTER_SIZE_EIGHT";
    /**
     * Adapter size 16.
     */
    AdapterSize["ADAPTER_SIZE_SIXTEEN"] = "ADAPTER_SIZE_SIXTEEN";
    /**
     * Adapter size 32.
     */
    AdapterSize["ADAPTER_SIZE_THIRTY_TWO"] = "ADAPTER_SIZE_THIRTY_TWO";
})(AdapterSize || (AdapterSize = {}));
/** Options for feature selection preference. */
var FeatureSelectionPreference;
(function (FeatureSelectionPreference) {
    FeatureSelectionPreference["FEATURE_SELECTION_PREFERENCE_UNSPECIFIED"] = "FEATURE_SELECTION_PREFERENCE_UNSPECIFIED";
    FeatureSelectionPreference["PRIORITIZE_QUALITY"] = "PRIORITIZE_QUALITY";
    FeatureSelectionPreference["BALANCED"] = "BALANCED";
    FeatureSelectionPreference["PRIORITIZE_COST"] = "PRIORITIZE_COST";
})(FeatureSelectionPreference || (FeatureSelectionPreference = {}));
/** Defines the function behavior. Defaults to `BLOCKING`. */
var Behavior;
(function (Behavior) {
    /**
     * This value is unused.
     */
    Behavior["UNSPECIFIED"] = "UNSPECIFIED";
    /**
     * If set, the system will wait to receive the function response before continuing the conversation.
     */
    Behavior["BLOCKING"] = "BLOCKING";
    /**
     * If set, the system will not wait to receive the function response. Instead, it will attempt to handle function responses as they become available while maintaining the conversation between the user and the model.
     */
    Behavior["NON_BLOCKING"] = "NON_BLOCKING";
})(Behavior || (Behavior = {}));
/** Config for the dynamic retrieval config mode. */
var DynamicRetrievalConfigMode;
(function (DynamicRetrievalConfigMode) {
    /**
     * Always trigger retrieval.
     */
    DynamicRetrievalConfigMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    /**
     * Run retrieval only when system decides it is necessary.
     */
    DynamicRetrievalConfigMode["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalConfigMode || (DynamicRetrievalConfigMode = {}));
/** The environment being operated. */
var Environment;
(function (Environment) {
    /**
     * Defaults to browser.
     */
    Environment["ENVIRONMENT_UNSPECIFIED"] = "ENVIRONMENT_UNSPECIFIED";
    /**
     * Operates in a web browser.
     */
    Environment["ENVIRONMENT_BROWSER"] = "ENVIRONMENT_BROWSER";
})(Environment || (Environment = {}));
/** Config for the function calling config mode. */
var FunctionCallingConfigMode;
(function (FunctionCallingConfigMode) {
    /**
     * The function calling config mode is unspecified. Should not be used.
     */
    FunctionCallingConfigMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    /**
     * Default model behavior, model decides to predict either function calls or natural language response.
     */
    FunctionCallingConfigMode["AUTO"] = "AUTO";
    /**
     * Model is constrained to always predicting function calls only. If "allowed_function_names" are set, the predicted function calls will be limited to any one of "allowed_function_names", else the predicted function calls will be any one of the provided "function_declarations".
     */
    FunctionCallingConfigMode["ANY"] = "ANY";
    /**
     * Model will not predict any function calls. Model behavior is same as when not passing any function declarations.
     */
    FunctionCallingConfigMode["NONE"] = "NONE";
    /**
     * Model decides to predict either a function call or a natural language response, but will validate function calls with constrained decoding. If "allowed_function_names" are set, the predicted function call will be limited to any one of "allowed_function_names", else the predicted function call will be any one of the provided "function_declarations".
     */
    FunctionCallingConfigMode["VALIDATED"] = "VALIDATED";
})(FunctionCallingConfigMode || (FunctionCallingConfigMode = {}));
/** Enum that controls the safety filter level for objectionable content. */
var SafetyFilterLevel;
(function (SafetyFilterLevel) {
    SafetyFilterLevel["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
    SafetyFilterLevel["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
    SafetyFilterLevel["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
    SafetyFilterLevel["BLOCK_NONE"] = "BLOCK_NONE";
})(SafetyFilterLevel || (SafetyFilterLevel = {}));
/** Enum that controls the generation of people. */
var PersonGeneration;
(function (PersonGeneration) {
    /**
     * Block generation of images of people.
     */
    PersonGeneration["DONT_ALLOW"] = "DONT_ALLOW";
    /**
     * Generate images of adults, but not children.
     */
    PersonGeneration["ALLOW_ADULT"] = "ALLOW_ADULT";
    /**
     * Generate images that include adults and children.
     */
    PersonGeneration["ALLOW_ALL"] = "ALLOW_ALL";
})(PersonGeneration || (PersonGeneration = {}));
/** Enum that specifies the language of the text in the prompt. */
var ImagePromptLanguage;
(function (ImagePromptLanguage) {
    /**
     * Auto-detect the language.
     */
    ImagePromptLanguage["auto"] = "auto";
    /**
     * English
     */
    ImagePromptLanguage["en"] = "en";
    /**
     * Japanese
     */
    ImagePromptLanguage["ja"] = "ja";
    /**
     * Korean
     */
    ImagePromptLanguage["ko"] = "ko";
    /**
     * Hindi
     */
    ImagePromptLanguage["hi"] = "hi";
    /**
     * Chinese
     */
    ImagePromptLanguage["zh"] = "zh";
    /**
     * Portuguese
     */
    ImagePromptLanguage["pt"] = "pt";
    /**
     * Spanish
     */
    ImagePromptLanguage["es"] = "es";
})(ImagePromptLanguage || (ImagePromptLanguage = {}));
/** Enum representing the mask mode of a mask reference image. */
var MaskReferenceMode;
(function (MaskReferenceMode) {
    MaskReferenceMode["MASK_MODE_DEFAULT"] = "MASK_MODE_DEFAULT";
    MaskReferenceMode["MASK_MODE_USER_PROVIDED"] = "MASK_MODE_USER_PROVIDED";
    MaskReferenceMode["MASK_MODE_BACKGROUND"] = "MASK_MODE_BACKGROUND";
    MaskReferenceMode["MASK_MODE_FOREGROUND"] = "MASK_MODE_FOREGROUND";
    MaskReferenceMode["MASK_MODE_SEMANTIC"] = "MASK_MODE_SEMANTIC";
})(MaskReferenceMode || (MaskReferenceMode = {}));
/** Enum representing the control type of a control reference image. */
var ControlReferenceType;
(function (ControlReferenceType) {
    ControlReferenceType["CONTROL_TYPE_DEFAULT"] = "CONTROL_TYPE_DEFAULT";
    ControlReferenceType["CONTROL_TYPE_CANNY"] = "CONTROL_TYPE_CANNY";
    ControlReferenceType["CONTROL_TYPE_SCRIBBLE"] = "CONTROL_TYPE_SCRIBBLE";
    ControlReferenceType["CONTROL_TYPE_FACE_MESH"] = "CONTROL_TYPE_FACE_MESH";
})(ControlReferenceType || (ControlReferenceType = {}));
/** Enum representing the subject type of a subject reference image. */
var SubjectReferenceType;
(function (SubjectReferenceType) {
    SubjectReferenceType["SUBJECT_TYPE_DEFAULT"] = "SUBJECT_TYPE_DEFAULT";
    SubjectReferenceType["SUBJECT_TYPE_PERSON"] = "SUBJECT_TYPE_PERSON";
    SubjectReferenceType["SUBJECT_TYPE_ANIMAL"] = "SUBJECT_TYPE_ANIMAL";
    SubjectReferenceType["SUBJECT_TYPE_PRODUCT"] = "SUBJECT_TYPE_PRODUCT";
})(SubjectReferenceType || (SubjectReferenceType = {}));
/** Enum representing the editing mode. */
var EditMode;
(function (EditMode) {
    EditMode["EDIT_MODE_DEFAULT"] = "EDIT_MODE_DEFAULT";
    EditMode["EDIT_MODE_INPAINT_REMOVAL"] = "EDIT_MODE_INPAINT_REMOVAL";
    EditMode["EDIT_MODE_INPAINT_INSERTION"] = "EDIT_MODE_INPAINT_INSERTION";
    EditMode["EDIT_MODE_OUTPAINT"] = "EDIT_MODE_OUTPAINT";
    EditMode["EDIT_MODE_CONTROLLED_EDITING"] = "EDIT_MODE_CONTROLLED_EDITING";
    EditMode["EDIT_MODE_STYLE"] = "EDIT_MODE_STYLE";
    EditMode["EDIT_MODE_BGSWAP"] = "EDIT_MODE_BGSWAP";
    EditMode["EDIT_MODE_PRODUCT_IMAGE"] = "EDIT_MODE_PRODUCT_IMAGE";
})(EditMode || (EditMode = {}));
/** Enum that represents the segmentation mode. */
var SegmentMode;
(function (SegmentMode) {
    SegmentMode["FOREGROUND"] = "FOREGROUND";
    SegmentMode["BACKGROUND"] = "BACKGROUND";
    SegmentMode["PROMPT"] = "PROMPT";
    SegmentMode["SEMANTIC"] = "SEMANTIC";
    SegmentMode["INTERACTIVE"] = "INTERACTIVE";
})(SegmentMode || (SegmentMode = {}));
/** Enum for the reference type of a video generation reference image. */
var VideoGenerationReferenceType;
(function (VideoGenerationReferenceType) {
    /**
     * A reference image that provides assets to the generated video,
        such as the scene, an object, a character, etc.
     */
    VideoGenerationReferenceType["ASSET"] = "ASSET";
    /**
     * A reference image that provides aesthetics including colors,
        lighting, texture, etc., to be used as the style of the generated video,
        such as 'anime', 'photography', 'origami', etc.
     */
    VideoGenerationReferenceType["STYLE"] = "STYLE";
})(VideoGenerationReferenceType || (VideoGenerationReferenceType = {}));
/** Enum that controls the compression quality of the generated videos. */
var VideoCompressionQuality;
(function (VideoCompressionQuality) {
    /**
     * Optimized video compression quality. This will produce videos
        with a compressed, smaller file size.
     */
    VideoCompressionQuality["OPTIMIZED"] = "OPTIMIZED";
    /**
     * Lossless video compression quality. This will produce videos
        with a larger file size.
     */
    VideoCompressionQuality["LOSSLESS"] = "LOSSLESS";
})(VideoCompressionQuality || (VideoCompressionQuality = {}));
/** State for the lifecycle of a File. */
var FileState;
(function (FileState) {
    FileState["STATE_UNSPECIFIED"] = "STATE_UNSPECIFIED";
    FileState["PROCESSING"] = "PROCESSING";
    FileState["ACTIVE"] = "ACTIVE";
    FileState["FAILED"] = "FAILED";
})(FileState || (FileState = {}));
/** Source of the File. */
var FileSource;
(function (FileSource) {
    FileSource["SOURCE_UNSPECIFIED"] = "SOURCE_UNSPECIFIED";
    FileSource["UPLOADED"] = "UPLOADED";
    FileSource["GENERATED"] = "GENERATED";
})(FileSource || (FileSource = {}));
/** Server content modalities. */
var MediaModality;
(function (MediaModality) {
    /**
     * The modality is unspecified.
     */
    MediaModality["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
    /**
     * Plain text.
     */
    MediaModality["TEXT"] = "TEXT";
    /**
     * Images.
     */
    MediaModality["IMAGE"] = "IMAGE";
    /**
     * Video.
     */
    MediaModality["VIDEO"] = "VIDEO";
    /**
     * Audio.
     */
    MediaModality["AUDIO"] = "AUDIO";
    /**
     * Document, e.g. PDF.
     */
    MediaModality["DOCUMENT"] = "DOCUMENT";
})(MediaModality || (MediaModality = {}));
/** Start of speech sensitivity. */
var StartSensitivity;
(function (StartSensitivity) {
    /**
     * The default is START_SENSITIVITY_LOW.
     */
    StartSensitivity["START_SENSITIVITY_UNSPECIFIED"] = "START_SENSITIVITY_UNSPECIFIED";
    /**
     * Automatic detection will detect the start of speech more often.
     */
    StartSensitivity["START_SENSITIVITY_HIGH"] = "START_SENSITIVITY_HIGH";
    /**
     * Automatic detection will detect the start of speech less often.
     */
    StartSensitivity["START_SENSITIVITY_LOW"] = "START_SENSITIVITY_LOW";
})(StartSensitivity || (StartSensitivity = {}));
/** End of speech sensitivity. */
var EndSensitivity;
(function (EndSensitivity) {
    /**
     * The default is END_SENSITIVITY_LOW.
     */
    EndSensitivity["END_SENSITIVITY_UNSPECIFIED"] = "END_SENSITIVITY_UNSPECIFIED";
    /**
     * Automatic detection ends speech more often.
     */
    EndSensitivity["END_SENSITIVITY_HIGH"] = "END_SENSITIVITY_HIGH";
    /**
     * Automatic detection ends speech less often.
     */
    EndSensitivity["END_SENSITIVITY_LOW"] = "END_SENSITIVITY_LOW";
})(EndSensitivity || (EndSensitivity = {}));
/** The different ways of handling user activity. */
var ActivityHandling;
(function (ActivityHandling) {
    /**
     * If unspecified, the default behavior is `START_OF_ACTIVITY_INTERRUPTS`.
     */
    ActivityHandling["ACTIVITY_HANDLING_UNSPECIFIED"] = "ACTIVITY_HANDLING_UNSPECIFIED";
    /**
     * If true, start of activity will interrupt the model's response (also called "barge in"). The model's current response will be cut-off in the moment of the interruption. This is the default behavior.
     */
    ActivityHandling["START_OF_ACTIVITY_INTERRUPTS"] = "START_OF_ACTIVITY_INTERRUPTS";
    /**
     * The model's response will not be interrupted.
     */
    ActivityHandling["NO_INTERRUPTION"] = "NO_INTERRUPTION";
})(ActivityHandling || (ActivityHandling = {}));
/** Options about which input is included in the user's turn. */
var TurnCoverage;
(function (TurnCoverage) {
    /**
     * If unspecified, the default behavior is `TURN_INCLUDES_ONLY_ACTIVITY`.
     */
    TurnCoverage["TURN_COVERAGE_UNSPECIFIED"] = "TURN_COVERAGE_UNSPECIFIED";
    /**
     * The users turn only includes activity since the last turn, excluding inactivity (e.g. silence on the audio stream). This is the default behavior.
     */
    TurnCoverage["TURN_INCLUDES_ONLY_ACTIVITY"] = "TURN_INCLUDES_ONLY_ACTIVITY";
    /**
     * The users turn includes all realtime input since the last turn, including inactivity (e.g. silence on the audio stream).
     */
    TurnCoverage["TURN_INCLUDES_ALL_INPUT"] = "TURN_INCLUDES_ALL_INPUT";
})(TurnCoverage || (TurnCoverage = {}));
/** Specifies how the response should be scheduled in the conversation. */
var FunctionResponseScheduling;
(function (FunctionResponseScheduling) {
    /**
     * This value is unused.
     */
    FunctionResponseScheduling["SCHEDULING_UNSPECIFIED"] = "SCHEDULING_UNSPECIFIED";
    /**
     * Only add the result to the conversation context, do not interrupt or trigger generation.
     */
    FunctionResponseScheduling["SILENT"] = "SILENT";
    /**
     * Add the result to the conversation context, and prompt to generate output without interrupting ongoing generation.
     */
    FunctionResponseScheduling["WHEN_IDLE"] = "WHEN_IDLE";
    /**
     * Add the result to the conversation context, interrupt ongoing generation and prompt to generate output.
     */
    FunctionResponseScheduling["INTERRUPT"] = "INTERRUPT";
})(FunctionResponseScheduling || (FunctionResponseScheduling = {}));
/** Scale of the generated music. */
var Scale;
(function (Scale) {
    /**
     * Default value. This value is unused.
     */
    Scale["SCALE_UNSPECIFIED"] = "SCALE_UNSPECIFIED";
    /**
     * C major or A minor.
     */
    Scale["C_MAJOR_A_MINOR"] = "C_MAJOR_A_MINOR";
    /**
     * Db major or Bb minor.
     */
    Scale["D_FLAT_MAJOR_B_FLAT_MINOR"] = "D_FLAT_MAJOR_B_FLAT_MINOR";
    /**
     * D major or B minor.
     */
    Scale["D_MAJOR_B_MINOR"] = "D_MAJOR_B_MINOR";
    /**
     * Eb major or C minor
     */
    Scale["E_FLAT_MAJOR_C_MINOR"] = "E_FLAT_MAJOR_C_MINOR";
    /**
     * E major or Db minor.
     */
    Scale["E_MAJOR_D_FLAT_MINOR"] = "E_MAJOR_D_FLAT_MINOR";
    /**
     * F major or D minor.
     */
    Scale["F_MAJOR_D_MINOR"] = "F_MAJOR_D_MINOR";
    /**
     * Gb major or Eb minor.
     */
    Scale["G_FLAT_MAJOR_E_FLAT_MINOR"] = "G_FLAT_MAJOR_E_FLAT_MINOR";
    /**
     * G major or E minor.
     */
    Scale["G_MAJOR_E_MINOR"] = "G_MAJOR_E_MINOR";
    /**
     * Ab major or F minor.
     */
    Scale["A_FLAT_MAJOR_F_MINOR"] = "A_FLAT_MAJOR_F_MINOR";
    /**
     * A major or Gb minor.
     */
    Scale["A_MAJOR_G_FLAT_MINOR"] = "A_MAJOR_G_FLAT_MINOR";
    /**
     * Bb major or G minor.
     */
    Scale["B_FLAT_MAJOR_G_MINOR"] = "B_FLAT_MAJOR_G_MINOR";
    /**
     * B major or Ab minor.
     */
    Scale["B_MAJOR_A_FLAT_MINOR"] = "B_MAJOR_A_FLAT_MINOR";
})(Scale || (Scale = {}));
/** The mode of music generation. */
var MusicGenerationMode;
(function (MusicGenerationMode) {
    /**
     * Rely on the server default generation mode.
     */
    MusicGenerationMode["MUSIC_GENERATION_MODE_UNSPECIFIED"] = "MUSIC_GENERATION_MODE_UNSPECIFIED";
    /**
     * Steer text prompts to regions of latent space with higher quality
        music.
     */
    MusicGenerationMode["QUALITY"] = "QUALITY";
    /**
     * Steer text prompts to regions of latent space with a larger
        diversity of music.
     */
    MusicGenerationMode["DIVERSITY"] = "DIVERSITY";
    /**
     * Steer text prompts to regions of latent space more likely to
        generate music with vocals.
     */
    MusicGenerationMode["VOCALIZATION"] = "VOCALIZATION";
})(MusicGenerationMode || (MusicGenerationMode = {}));
/** The playback control signal to apply to the music generation. */
var LiveMusicPlaybackControl;
(function (LiveMusicPlaybackControl) {
    /**
     * This value is unused.
     */
    LiveMusicPlaybackControl["PLAYBACK_CONTROL_UNSPECIFIED"] = "PLAYBACK_CONTROL_UNSPECIFIED";
    /**
     * Start generating the music.
     */
    LiveMusicPlaybackControl["PLAY"] = "PLAY";
    /**
     * Hold the music generation. Use PLAY to resume from the current position.
     */
    LiveMusicPlaybackControl["PAUSE"] = "PAUSE";
    /**
     * Stop the music generation and reset the context (prompts retained).
        Use PLAY to restart the music generation.
     */
    LiveMusicPlaybackControl["STOP"] = "STOP";
    /**
     * Reset the context of the music generation without stopping it.
        Retains the current prompts and config.
     */
    LiveMusicPlaybackControl["RESET_CONTEXT"] = "RESET_CONTEXT";
})(LiveMusicPlaybackControl || (LiveMusicPlaybackControl = {}));
/** A function response. */
class FunctionResponse {
}
/**
 * Creates a `Part` object from a `URI` string.
 */
function createPartFromUri(uri, mimeType) {
    return {
        fileData: {
            fileUri: uri,
            mimeType: mimeType,
        },
    };
}
/**
 * Creates a `Part` object from a `text` string.
 */
function createPartFromText(text) {
    return {
        text: text,
    };
}
/**
 * Creates a `Part` object from a `FunctionCall` object.
 */
function createPartFromFunctionCall(name, args) {
    return {
        functionCall: {
            name: name,
            args: args,
        },
    };
}
/**
 * Creates a `Part` object from a `FunctionResponse` object.
 */
function createPartFromFunctionResponse(id, name, response) {
    return {
        functionResponse: {
            id: id,
            name: name,
            response: response,
        },
    };
}
/**
 * Creates a `Part` object from a `base64` encoded `string`.
 */
function createPartFromBase64(data, mimeType) {
    return {
        inlineData: {
            data: data,
            mimeType: mimeType,
        },
    };
}
/**
 * Creates a `Part` object from the `outcome` and `output` of a `CodeExecutionResult` object.
 */
function createPartFromCodeExecutionResult(outcome, output) {
    return {
        codeExecutionResult: {
            outcome: outcome,
            output: output,
        },
    };
}
/**
 * Creates a `Part` object from the `code` and `language` of an `ExecutableCode` object.
 */
function createPartFromExecutableCode(code, language) {
    return {
        executableCode: {
            code: code,
            language: language,
        },
    };
}
function _isPart(obj) {
    if (typeof obj === 'object' && obj !== null) {
        return ('fileData' in obj ||
            'text' in obj ||
            'functionCall' in obj ||
            'functionResponse' in obj ||
            'inlineData' in obj ||
            'videoMetadata' in obj ||
            'codeExecutionResult' in obj ||
            'executableCode' in obj);
    }
    return false;
}
function _toParts(partOrString) {
    const parts = [];
    if (typeof partOrString === 'string') {
        parts.push(createPartFromText(partOrString));
    }
    else if (_isPart(partOrString)) {
        parts.push(partOrString);
    }
    else if (Array.isArray(partOrString)) {
        if (partOrString.length === 0) {
            throw new Error('partOrString cannot be an empty array');
        }
        for (const part of partOrString) {
            if (typeof part === 'string') {
                parts.push(createPartFromText(part));
            }
            else if (_isPart(part)) {
                parts.push(part);
            }
            else {
                throw new Error('element in PartUnion must be a Part object or string');
            }
        }
    }
    else {
        throw new Error('partOrString must be a Part object, string, or array');
    }
    return parts;
}
/**
 * Creates a `Content` object with a user role from a `PartListUnion` object or `string`.
 */
function createUserContent(partOrString) {
    return {
        role: 'user',
        parts: _toParts(partOrString),
    };
}
/**
 * Creates a `Content` object with a model role from a `PartListUnion` object or `string`.
 */
function createModelContent(partOrString) {
    return {
        role: 'model',
        parts: _toParts(partOrString),
    };
}
/** A wrapper class for the http response. */
class HttpResponse {
    constructor(response) {
        // Process the headers.
        const headers = {};
        for (const pair of response.headers.entries()) {
            headers[pair[0]] = pair[1];
        }
        this.headers = headers;
        // Keep the original response.
        this.responseInternal = response;
    }
    json() {
        return this.responseInternal.json();
    }
}
/** Content filter results for a prompt sent in the request. */
class GenerateContentResponsePromptFeedback {
}
/** Usage metadata about response(s). */
class GenerateContentResponseUsageMetadata {
}
/** Response message for PredictionService.GenerateContent. */
class GenerateContentResponse {
    /**
     * Returns the concatenation of all text parts from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the text from the first
     * one will be returned.
     * If there are non-text parts in the response, the concatenation of all text
     * parts will be returned, and a warning will be logged.
     * If there are thought parts in the response, the concatenation of all text
     * parts excluding the thought parts will be returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'Why is the sky blue?',
     * });
     *
     * console.debug(response.text);
     * ```
     */
    get text() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            return undefined;
        }
        if (this.candidates && this.candidates.length > 1) {
            console.warn('there are multiple candidates in the response, returning text from the first one.');
        }
        let text = '';
        let anyTextPartText = false;
        const nonTextParts = [];
        for (const part of (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) !== null && _h !== void 0 ? _h : []) {
            for (const [fieldName, fieldValue] of Object.entries(part)) {
                if (fieldName !== 'text' &&
                    fieldName !== 'thought' &&
                    (fieldValue !== null || fieldValue !== undefined)) {
                    nonTextParts.push(fieldName);
                }
            }
            if (typeof part.text === 'string') {
                if (typeof part.thought === 'boolean' && part.thought) {
                    continue;
                }
                anyTextPartText = true;
                text += part.text;
            }
        }
        if (nonTextParts.length > 0) {
            console.warn(`there are non-text parts ${nonTextParts} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
        }
        // part.text === '' is different from part.text is null
        return anyTextPartText ? text : undefined;
    }
    /**
     * Returns the concatenation of all inline data parts from the first candidate
     * in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the inline data from the
     * first one will be returned. If there are non-inline data parts in the
     * response, the concatenation of all inline data parts will be returned, and
     * a warning will be logged.
     */
    get data() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            return undefined;
        }
        if (this.candidates && this.candidates.length > 1) {
            console.warn('there are multiple candidates in the response, returning data from the first one.');
        }
        let data = '';
        const nonDataParts = [];
        for (const part of (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) !== null && _h !== void 0 ? _h : []) {
            for (const [fieldName, fieldValue] of Object.entries(part)) {
                if (fieldName !== 'inlineData' &&
                    (fieldValue !== null || fieldValue !== undefined)) {
                    nonDataParts.push(fieldName);
                }
            }
            if (part.inlineData && typeof part.inlineData.data === 'string') {
                data += atob(part.inlineData.data);
            }
        }
        if (nonDataParts.length > 0) {
            console.warn(`there are non-data parts ${nonDataParts} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
        }
        return data.length > 0 ? btoa(data) : undefined;
    }
    /**
     * Returns the function calls from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the function calls from
     * the first one will be returned.
     * If there are no function calls in the response, undefined will be returned.
     *
     * @example
     * ```ts
     * const controlLightFunctionDeclaration: FunctionDeclaration = {
     *   name: 'controlLight',
     *   parameters: {
     *   type: Type.OBJECT,
     *   description: 'Set the brightness and color temperature of a room light.',
     *   properties: {
     *     brightness: {
     *       type: Type.NUMBER,
     *       description:
     *         'Light level from 0 to 100. Zero is off and 100 is full brightness.',
     *     },
     *     colorTemperature: {
     *       type: Type.STRING,
     *       description:
     *         'Color temperature of the light fixture which can be `daylight`, `cool` or `warm`.',
     *     },
     *   },
     *   required: ['brightness', 'colorTemperature'],
     *  };
     *  const response = await ai.models.generateContent({
     *     model: 'gemini-2.0-flash',
     *     contents: 'Dim the lights so the room feels cozy and warm.',
     *     config: {
     *       tools: [{functionDeclarations: [controlLightFunctionDeclaration]}],
     *       toolConfig: {
     *         functionCallingConfig: {
     *           mode: FunctionCallingConfigMode.ANY,
     *           allowedFunctionNames: ['controlLight'],
     *         },
     *       },
     *     },
     *   });
     *  console.debug(JSON.stringify(response.functionCalls));
     * ```
     */
    get functionCalls() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            return undefined;
        }
        if (this.candidates && this.candidates.length > 1) {
            console.warn('there are multiple candidates in the response, returning function calls from the first one.');
        }
        const functionCalls = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.functionCall).map((part) => part.functionCall).filter((functionCall) => functionCall !== undefined);
        if ((functionCalls === null || functionCalls === void 0 ? void 0 : functionCalls.length) === 0) {
            return undefined;
        }
        return functionCalls;
    }
    /**
     * Returns the first executable code from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the executable code from
     * the first one will be returned.
     * If there are no executable code in the response, undefined will be
     * returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
     *   config: {
     *     tools: [{codeExecution: {}}],
     *   },
     * });
     *
     * console.debug(response.executableCode);
     * ```
     */
    get executableCode() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            return undefined;
        }
        if (this.candidates && this.candidates.length > 1) {
            console.warn('there are multiple candidates in the response, returning executable code from the first one.');
        }
        const executableCode = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.executableCode).map((part) => part.executableCode).filter((executableCode) => executableCode !== undefined);
        if ((executableCode === null || executableCode === void 0 ? void 0 : executableCode.length) === 0) {
            return undefined;
        }
        return (_j = executableCode === null || executableCode === void 0 ? void 0 : executableCode[0]) === null || _j === void 0 ? void 0 : _j.code;
    }
    /**
     * Returns the first code execution result from the first candidate in the response.
     *
     * @remarks
     * If there are multiple candidates in the response, the code execution result from
     * the first one will be returned.
     * If there are no code execution result in the response, undefined will be returned.
     *
     * @example
     * ```ts
     * const response = await ai.models.generateContent({
     *   model: 'gemini-2.0-flash',
     *   contents:
     *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
     *   config: {
     *     tools: [{codeExecution: {}}],
     *   },
     * });
     *
     * console.debug(response.codeExecutionResult);
     * ```
     */
    get codeExecutionResult() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
            return undefined;
        }
        if (this.candidates && this.candidates.length > 1) {
            console.warn('there are multiple candidates in the response, returning code execution result from the first one.');
        }
        const codeExecutionResult = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.codeExecutionResult).map((part) => part.codeExecutionResult).filter((codeExecutionResult) => codeExecutionResult !== undefined);
        if ((codeExecutionResult === null || codeExecutionResult === void 0 ? void 0 : codeExecutionResult.length) === 0) {
            return undefined;
        }
        return (_j = codeExecutionResult === null || codeExecutionResult === void 0 ? void 0 : codeExecutionResult[0]) === null || _j === void 0 ? void 0 : _j.output;
    }
}
/** Response for the embed_content method. */
class EmbedContentResponse {
}
/** The output images response. */
class GenerateImagesResponse {
}
/** Response for the request to edit an image. */
class EditImageResponse {
}
class UpscaleImageResponse {
}
/** The output images response. */
class RecontextImageResponse {
}
/** The output images response. */
class SegmentImageResponse {
}
class ListModelsResponse {
}
class DeleteModelResponse {
}
/** Response for counting tokens. */
class CountTokensResponse {
}
/** Response for computing tokens. */
class ComputeTokensResponse {
}
/** Response with generated videos. */
class GenerateVideosResponse {
}
/** A video generation operation. */
class GenerateVideosOperation {
    /**
     * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
     * @internal
     */
    _fromAPIResponse({ apiResponse, isVertexAI, }) {
        const operation = new GenerateVideosOperation();
        let response;
        const op = apiResponse;
        if (isVertexAI) {
            response = generateVideosOperationFromVertex$1(op);
        }
        else {
            response = generateVideosOperationFromMldev$1(op);
        }
        Object.assign(operation, response);
        return operation;
    }
}
/** Response for the list tuning jobs method. */
class ListTuningJobsResponse {
}
/** Empty response for caches.delete method. */
class DeleteCachedContentResponse {
}
class ListCachedContentsResponse {
}
/** Response for the list files method. */
class ListFilesResponse {
}
/** Response for the create file method. */
class CreateFileResponse {
}
/** Response for the delete file method. */
class DeleteFileResponse {
}
/** Config for `inlined_responses` parameter. */
class InlinedResponse {
}
/** Config for `response` parameter. */
class SingleEmbedContentResponse {
}
/** Config for `inlined_embedding_responses` parameter. */
class InlinedEmbedContentResponse {
}
/** Config for batches.list return value. */
class ListBatchJobsResponse {
}
/** Represents a single response in a replay. */
class ReplayResponse {
}
/** A raw reference image.

  A raw reference image represents the base image to edit, provided by the user.
  It can optionally be provided in addition to a mask reference image or
  a style reference image.
   */
class RawReferenceImage {
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI() {
        const referenceImageAPI = {
            referenceType: 'REFERENCE_TYPE_RAW',
            referenceImage: this.referenceImage,
            referenceId: this.referenceId,
        };
        return referenceImageAPI;
    }
}
/** A mask reference image.

  This encapsulates either a mask image provided by the user and configs for
  the user provided mask, or only config parameters for the model to generate
  a mask.

  A mask image is an image whose non-zero values indicate where to edit the base
  image. If the user provides a mask image, the mask must be in the same
  dimensions as the raw image.
   */
class MaskReferenceImage {
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI() {
        const referenceImageAPI = {
            referenceType: 'REFERENCE_TYPE_MASK',
            referenceImage: this.referenceImage,
            referenceId: this.referenceId,
            maskImageConfig: this.config,
        };
        return referenceImageAPI;
    }
}
/** A control reference image.

  The image of the control reference image is either a control image provided
  by the user, or a regular image which the backend will use to generate a
  control image of. In the case of the latter, the
  enable_control_image_computation field in the config should be set to True.

  A control image is an image that represents a sketch image of areas for the
  model to fill in based on the prompt.
   */
class ControlReferenceImage {
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI() {
        const referenceImageAPI = {
            referenceType: 'REFERENCE_TYPE_CONTROL',
            referenceImage: this.referenceImage,
            referenceId: this.referenceId,
            controlImageConfig: this.config,
        };
        return referenceImageAPI;
    }
}
/** A style reference image.

  This encapsulates a style reference image provided by the user, and
  additionally optional config parameters for the style reference image.

  A raw reference image can also be provided as a destination for the style to
  be applied to.
   */
class StyleReferenceImage {
    /** Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI() {
        const referenceImageAPI = {
            referenceType: 'REFERENCE_TYPE_STYLE',
            referenceImage: this.referenceImage,
            referenceId: this.referenceId,
            styleImageConfig: this.config,
        };
        return referenceImageAPI;
    }
}
/** A subject reference image.

  This encapsulates a subject reference image provided by the user, and
  additionally optional config parameters for the subject reference image.

  A raw reference image can also be provided as a destination for the subject to
  be applied to.
   */
class SubjectReferenceImage {
    /* Internal method to convert to ReferenceImageAPIInternal. */
    toReferenceImageAPI() {
        const referenceImageAPI = {
            referenceType: 'REFERENCE_TYPE_SUBJECT',
            referenceImage: this.referenceImage,
            referenceId: this.referenceId,
            subjectImageConfig: this.config,
        };
        return referenceImageAPI;
    }
}
/** Response message for API call. */
class LiveServerMessage {
    /**
     * Returns the concatenation of all text parts from the server content if present.
     *
     * @remarks
     * If there are non-text parts in the response, the concatenation of all text
     * parts will be returned, and a warning will be logged.
     */
    get text() {
        var _a, _b, _c;
        let text = '';
        let anyTextPartFound = false;
        const nonTextParts = [];
        for (const part of (_c = (_b = (_a = this.serverContent) === null || _a === void 0 ? void 0 : _a.modelTurn) === null || _b === void 0 ? void 0 : _b.parts) !== null && _c !== void 0 ? _c : []) {
            for (const [fieldName, fieldValue] of Object.entries(part)) {
                if (fieldName !== 'text' &&
                    fieldName !== 'thought' &&
                    fieldValue !== null) {
                    nonTextParts.push(fieldName);
                }
            }
            if (typeof part.text === 'string') {
                if (typeof part.thought === 'boolean' && part.thought) {
                    continue;
                }
                anyTextPartFound = true;
                text += part.text;
            }
        }
        if (nonTextParts.length > 0) {
            console.warn(`there are non-text parts ${nonTextParts} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
        }
        // part.text === '' is different from part.text is null
        return anyTextPartFound ? text : undefined;
    }
    /**
     * Returns the concatenation of all inline data parts from the server content if present.
     *
     * @remarks
     * If there are non-inline data parts in the
     * response, the concatenation of all inline data parts will be returned, and
     * a warning will be logged.
     */
    get data() {
        var _a, _b, _c;
        let data = '';
        const nonDataParts = [];
        for (const part of (_c = (_b = (_a = this.serverContent) === null || _a === void 0 ? void 0 : _a.modelTurn) === null || _b === void 0 ? void 0 : _b.parts) !== null && _c !== void 0 ? _c : []) {
            for (const [fieldName, fieldValue] of Object.entries(part)) {
                if (fieldName !== 'inlineData' && fieldValue !== null) {
                    nonDataParts.push(fieldName);
                }
            }
            if (part.inlineData && typeof part.inlineData.data === 'string') {
                data += atob(part.inlineData.data);
            }
        }
        if (nonDataParts.length > 0) {
            console.warn(`there are non-data parts ${nonDataParts} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
        }
        return data.length > 0 ? btoa(data) : undefined;
    }
}
/** Client generated response to a `ToolCall` received from the server.

  Individual `FunctionResponse` objects are matched to the respective
  `FunctionCall` objects by the `id` field.

  Note that in the unary and server-streaming GenerateContent APIs function
  calling happens by exchanging the `Content` parts, while in the bidi
  GenerateContent APIs function calling happens over this dedicated set of
  messages.
   */
class LiveClientToolResponse {
}
/** Parameters for sending tool responses to the live API. */
class LiveSendToolResponseParameters {
    constructor() {
        /** Tool responses to send to the session. */
        this.functionResponses = [];
    }
}
/** Response message for the LiveMusicClientMessage call. */
class LiveMusicServerMessage {
    /**
     * Returns the first audio chunk from the server content, if present.
     *
     * @remarks
     * If there are no audio chunks in the response, undefined will be returned.
     */
    get audioChunk() {
        if (this.serverContent &&
            this.serverContent.audioChunks &&
            this.serverContent.audioChunks.length > 0) {
            return this.serverContent.audioChunks[0];
        }
        return undefined;
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function tModel(apiClient, model) {
    if (!model || typeof model !== 'string') {
        throw new Error('model is required and must be a string');
    }
    if (apiClient.isVertexAI()) {
        if (model.startsWith('publishers/') ||
            model.startsWith('projects/') ||
            model.startsWith('models/')) {
            return model;
        }
        else if (model.indexOf('/') >= 0) {
            const parts = model.split('/', 2);
            return `publishers/${parts[0]}/models/${parts[1]}`;
        }
        else {
            return `publishers/google/models/${model}`;
        }
    }
    else {
        if (model.startsWith('models/') || model.startsWith('tunedModels/')) {
            return model;
        }
        else {
            return `models/${model}`;
        }
    }
}
function tCachesModel(apiClient, model) {
    const transformedModel = tModel(apiClient, model);
    if (!transformedModel) {
        return '';
    }
    if (transformedModel.startsWith('publishers/') && apiClient.isVertexAI()) {
        // vertex caches only support model name start with projects.
        return `projects/${apiClient.getProject()}/locations/${apiClient.getLocation()}/${transformedModel}`;
    }
    else if (transformedModel.startsWith('models/') && apiClient.isVertexAI()) {
        return `projects/${apiClient.getProject()}/locations/${apiClient.getLocation()}/publishers/google/${transformedModel}`;
    }
    else {
        return transformedModel;
    }
}
function tBlobs(blobs) {
    if (Array.isArray(blobs)) {
        return blobs.map((blob) => tBlob(blob));
    }
    else {
        return [tBlob(blobs)];
    }
}
function tBlob(blob) {
    if (typeof blob === 'object' && blob !== null) {
        return blob;
    }
    throw new Error(`Could not parse input as Blob. Unsupported blob type: ${typeof blob}`);
}
function tImageBlob(blob) {
    const transformedBlob = tBlob(blob);
    if (transformedBlob.mimeType &&
        transformedBlob.mimeType.startsWith('image/')) {
        return transformedBlob;
    }
    throw new Error(`Unsupported mime type: ${transformedBlob.mimeType}`);
}
function tAudioBlob(blob) {
    const transformedBlob = tBlob(blob);
    if (transformedBlob.mimeType &&
        transformedBlob.mimeType.startsWith('audio/')) {
        return transformedBlob;
    }
    throw new Error(`Unsupported mime type: ${transformedBlob.mimeType}`);
}
function tPart(origin) {
    if (origin === null || origin === undefined) {
        throw new Error('PartUnion is required');
    }
    if (typeof origin === 'object') {
        return origin;
    }
    if (typeof origin === 'string') {
        return { text: origin };
    }
    throw new Error(`Unsupported part type: ${typeof origin}`);
}
function tParts(origin) {
    if (origin === null ||
        origin === undefined ||
        (Array.isArray(origin) && origin.length === 0)) {
        throw new Error('PartListUnion is required');
    }
    if (Array.isArray(origin)) {
        return origin.map((item) => tPart(item));
    }
    return [tPart(origin)];
}
function _isContent(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'parts' in origin &&
        Array.isArray(origin.parts));
}
function _isFunctionCallPart(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'functionCall' in origin);
}
function _isFunctionResponsePart(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'functionResponse' in origin);
}
function tContent(origin) {
    if (origin === null || origin === undefined) {
        throw new Error('ContentUnion is required');
    }
    if (_isContent(origin)) {
        // _isContent is a utility function that checks if the
        // origin is a Content.
        return origin;
    }
    return {
        role: 'user',
        parts: tParts(origin),
    };
}
function tContentsForEmbed(apiClient, origin) {
    if (!origin) {
        return [];
    }
    if (apiClient.isVertexAI() && Array.isArray(origin)) {
        return origin.flatMap((item) => {
            const content = tContent(item);
            if (content.parts &&
                content.parts.length > 0 &&
                content.parts[0].text !== undefined) {
                return [content.parts[0].text];
            }
            return [];
        });
    }
    else if (apiClient.isVertexAI()) {
        const content = tContent(origin);
        if (content.parts &&
            content.parts.length > 0 &&
            content.parts[0].text !== undefined) {
            return [content.parts[0].text];
        }
        return [];
    }
    if (Array.isArray(origin)) {
        return origin.map((item) => tContent(item));
    }
    return [tContent(origin)];
}
function tContents(origin) {
    if (origin === null ||
        origin === undefined ||
        (Array.isArray(origin) && origin.length === 0)) {
        throw new Error('contents are required');
    }
    if (!Array.isArray(origin)) {
        // If it's not an array, it's a single content or a single PartUnion.
        if (_isFunctionCallPart(origin) || _isFunctionResponsePart(origin)) {
            throw new Error('To specify functionCall or functionResponse parts, please wrap them in a Content object, specifying the role for them');
        }
        return [tContent(origin)];
    }
    const result = [];
    const accumulatedParts = [];
    const isContentArray = _isContent(origin[0]);
    for (const item of origin) {
        const isContent = _isContent(item);
        if (isContent != isContentArray) {
            throw new Error('Mixing Content and Parts is not supported, please group the parts into a the appropriate Content objects and specify the roles for them');
        }
        if (isContent) {
            // `isContent` contains the result of _isContent, which is a utility
            // function that checks if the item is a Content.
            result.push(item);
        }
        else if (_isFunctionCallPart(item) || _isFunctionResponsePart(item)) {
            throw new Error('To specify functionCall or functionResponse parts, please wrap them, and any other parts, in Content objects as appropriate, specifying the role for them');
        }
        else {
            accumulatedParts.push(item);
        }
    }
    if (!isContentArray) {
        result.push({ role: 'user', parts: tParts(accumulatedParts) });
    }
    return result;
}
/*
Transform the type field from an array of types to an array of anyOf fields.
Example:
  {type: ['STRING', 'NUMBER']}
will be transformed to
  {anyOf: [{type: 'STRING'}, {type: 'NUMBER'}]}
*/
function flattenTypeArrayToAnyOf(typeList, resultingSchema) {
    if (typeList.includes('null')) {
        resultingSchema['nullable'] = true;
    }
    const listWithoutNull = typeList.filter((type) => type !== 'null');
    if (listWithoutNull.length === 1) {
        resultingSchema['type'] = Object.values(Type).includes(listWithoutNull[0].toUpperCase())
            ? listWithoutNull[0].toUpperCase()
            : Type.TYPE_UNSPECIFIED;
    }
    else {
        resultingSchema['anyOf'] = [];
        for (const i of listWithoutNull) {
            resultingSchema['anyOf'].push({
                'type': Object.values(Type).includes(i.toUpperCase())
                    ? i.toUpperCase()
                    : Type.TYPE_UNSPECIFIED,
            });
        }
    }
}
function processJsonSchema(_jsonSchema) {
    const genAISchema = {};
    const schemaFieldNames = ['items'];
    const listSchemaFieldNames = ['anyOf'];
    const dictSchemaFieldNames = ['properties'];
    if (_jsonSchema['type'] && _jsonSchema['anyOf']) {
        throw new Error('type and anyOf cannot be both populated.');
    }
    /*
    This is to handle the nullable array or object. The _jsonSchema will
    be in the format of {anyOf: [{type: 'null'}, {type: 'object'}]}. The
    logic is to check if anyOf has 2 elements and one of the element is null,
    if so, the anyOf field is unnecessary, so we need to get rid of the anyOf
    field and make the schema nullable. Then use the other element as the new
    _jsonSchema for processing. This is because the backend doesn't have a null
    type.
    This has to be checked before we process any other fields.
    For example:
      const objectNullable = z.object({
        nullableArray: z.array(z.string()).nullable(),
      });
    Will have the raw _jsonSchema as:
    {
      type: 'OBJECT',
      properties: {
          nullableArray: {
             anyOf: [
                {type: 'null'},
                {
                  type: 'array',
                  items: {type: 'string'},
                },
              ],
          }
      },
      required: [ 'nullableArray' ],
    }
    Will result in following schema compatible with Gemini API:
      {
        type: 'OBJECT',
        properties: {
           nullableArray: {
              nullable: true,
              type: 'ARRAY',
              items: {type: 'string'},
           }
        },
        required: [ 'nullableArray' ],
      }
    */
    const incomingAnyOf = _jsonSchema['anyOf'];
    if (incomingAnyOf != null && incomingAnyOf.length == 2) {
        if (incomingAnyOf[0]['type'] === 'null') {
            genAISchema['nullable'] = true;
            _jsonSchema = incomingAnyOf[1];
        }
        else if (incomingAnyOf[1]['type'] === 'null') {
            genAISchema['nullable'] = true;
            _jsonSchema = incomingAnyOf[0];
        }
    }
    if (_jsonSchema['type'] instanceof Array) {
        flattenTypeArrayToAnyOf(_jsonSchema['type'], genAISchema);
    }
    for (const [fieldName, fieldValue] of Object.entries(_jsonSchema)) {
        // Skip if the fieldvalue is undefined or null.
        if (fieldValue == null) {
            continue;
        }
        if (fieldName == 'type') {
            if (fieldValue === 'null') {
                throw new Error('type: null can not be the only possible type for the field.');
            }
            if (fieldValue instanceof Array) {
                // we have already handled the type field with array of types in the
                // beginning of this function.
                continue;
            }
            genAISchema['type'] = Object.values(Type).includes(fieldValue.toUpperCase())
                ? fieldValue.toUpperCase()
                : Type.TYPE_UNSPECIFIED;
        }
        else if (schemaFieldNames.includes(fieldName)) {
            genAISchema[fieldName] =
                processJsonSchema(fieldValue);
        }
        else if (listSchemaFieldNames.includes(fieldName)) {
            const listSchemaFieldValue = [];
            for (const item of fieldValue) {
                if (item['type'] == 'null') {
                    genAISchema['nullable'] = true;
                    continue;
                }
                listSchemaFieldValue.push(processJsonSchema(item));
            }
            genAISchema[fieldName] =
                listSchemaFieldValue;
        }
        else if (dictSchemaFieldNames.includes(fieldName)) {
            const dictSchemaFieldValue = {};
            for (const [key, value] of Object.entries(fieldValue)) {
                dictSchemaFieldValue[key] = processJsonSchema(value);
            }
            genAISchema[fieldName] =
                dictSchemaFieldValue;
        }
        else {
            // additionalProperties is not included in JSONSchema, skipping it.
            if (fieldName === 'additionalProperties') {
                continue;
            }
            genAISchema[fieldName] = fieldValue;
        }
    }
    return genAISchema;
}
// we take the unknown in the schema field because we want enable user to pass
// the output of major schema declaration tools without casting. Tools such as
// zodToJsonSchema, typebox, zodToJsonSchema function can return JsonSchema7Type
// or object, see details in
// https://github.com/StefanTerdell/zod-to-json-schema/blob/70525efe555cd226691e093d171370a3b10921d1/src/zodToJsonSchema.ts#L7
// typebox can return unknown, see details in
// https://github.com/sinclairzx81/typebox/blob/5a5431439f7d5ca6b494d0d18fbfd7b1a356d67c/src/type/create/type.ts#L35
// Note: proper json schemas with the $schema field set never arrive to this
// transformer. Schemas with $schema are routed to the equivalent API json
// schema field.
function tSchema(schema) {
    return processJsonSchema(schema);
}
function tSpeechConfig(speechConfig) {
    if (typeof speechConfig === 'object') {
        return speechConfig;
    }
    else if (typeof speechConfig === 'string') {
        return {
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: speechConfig,
                },
            },
        };
    }
    else {
        throw new Error(`Unsupported speechConfig type: ${typeof speechConfig}`);
    }
}
function tLiveSpeechConfig(speechConfig) {
    if ('multiSpeakerVoiceConfig' in speechConfig) {
        throw new Error('multiSpeakerVoiceConfig is not supported in the live API.');
    }
    return speechConfig;
}
function tTool(tool) {
    if (tool.functionDeclarations) {
        for (const functionDeclaration of tool.functionDeclarations) {
            if (functionDeclaration.parameters) {
                if (!Object.keys(functionDeclaration.parameters).includes('$schema')) {
                    functionDeclaration.parameters = processJsonSchema(functionDeclaration.parameters);
                }
                else {
                    if (!functionDeclaration.parametersJsonSchema) {
                        functionDeclaration.parametersJsonSchema =
                            functionDeclaration.parameters;
                        delete functionDeclaration.parameters;
                    }
                }
            }
            if (functionDeclaration.response) {
                if (!Object.keys(functionDeclaration.response).includes('$schema')) {
                    functionDeclaration.response = processJsonSchema(functionDeclaration.response);
                }
                else {
                    if (!functionDeclaration.responseJsonSchema) {
                        functionDeclaration.responseJsonSchema =
                            functionDeclaration.response;
                        delete functionDeclaration.response;
                    }
                }
            }
        }
    }
    return tool;
}
function tTools(tools) {
    // Check if the incoming type is defined.
    if (tools === undefined || tools === null) {
        throw new Error('tools is required');
    }
    if (!Array.isArray(tools)) {
        throw new Error('tools is required and must be an array of Tools');
    }
    const result = [];
    for (const tool of tools) {
        result.push(tool);
    }
    return result;
}
/**
 * Prepends resource name with project, location, resource_prefix if needed.
 *
 * @param client The API client.
 * @param resourceName The resource name.
 * @param resourcePrefix The resource prefix.
 * @param splitsAfterPrefix The number of splits after the prefix.
 * @returns The completed resource name.
 *
 * Examples:
 *
 * ```
 * resource_name = '123'
 * resource_prefix = 'cachedContents'
 * splits_after_prefix = 1
 * client.vertexai = True
 * client.project = 'bar'
 * client.location = 'us-west1'
 * _resource_name(client, resource_name, resource_prefix, splits_after_prefix)
 * returns: 'projects/bar/locations/us-west1/cachedContents/123'
 * ```
 *
 * ```
 * resource_name = 'projects/foo/locations/us-central1/cachedContents/123'
 * resource_prefix = 'cachedContents'
 * splits_after_prefix = 1
 * client.vertexai = True
 * client.project = 'bar'
 * client.location = 'us-west1'
 * _resource_name(client, resource_name, resource_prefix, splits_after_prefix)
 * returns: 'projects/foo/locations/us-central1/cachedContents/123'
 * ```
 *
 * ```
 * resource_name = '123'
 * resource_prefix = 'cachedContents'
 * splits_after_prefix = 1
 * client.vertexai = False
 * _resource_name(client, resource_name, resource_prefix, splits_after_prefix)
 * returns 'cachedContents/123'
 * ```
 *
 * ```
 * resource_name = 'some/wrong/cachedContents/resource/name/123'
 * resource_prefix = 'cachedContents'
 * splits_after_prefix = 1
 * client.vertexai = False
 * # client.vertexai = True
 * _resource_name(client, resource_name, resource_prefix, splits_after_prefix)
 * -> 'some/wrong/resource/name/123'
 * ```
 */
function resourceName(client, resourceName, resourcePrefix, splitsAfterPrefix = 1) {
    const shouldAppendPrefix = !resourceName.startsWith(`${resourcePrefix}/`) &&
        resourceName.split('/').length === splitsAfterPrefix;
    if (client.isVertexAI()) {
        if (resourceName.startsWith('projects/')) {
            return resourceName;
        }
        else if (resourceName.startsWith('locations/')) {
            return `projects/${client.getProject()}/${resourceName}`;
        }
        else if (resourceName.startsWith(`${resourcePrefix}/`)) {
            return `projects/${client.getProject()}/locations/${client.getLocation()}/${resourceName}`;
        }
        else if (shouldAppendPrefix) {
            return `projects/${client.getProject()}/locations/${client.getLocation()}/${resourcePrefix}/${resourceName}`;
        }
        else {
            return resourceName;
        }
    }
    if (shouldAppendPrefix) {
        return `${resourcePrefix}/${resourceName}`;
    }
    return resourceName;
}
function tCachedContentName(apiClient, name) {
    if (typeof name !== 'string') {
        throw new Error('name must be a string');
    }
    return resourceName(apiClient, name, 'cachedContents');
}
function tTuningJobStatus(status) {
    switch (status) {
        case 'STATE_UNSPECIFIED':
            return 'JOB_STATE_UNSPECIFIED';
        case 'CREATING':
            return 'JOB_STATE_RUNNING';
        case 'ACTIVE':
            return 'JOB_STATE_SUCCEEDED';
        case 'FAILED':
            return 'JOB_STATE_FAILED';
        default:
            return status;
    }
}
function tBytes(fromImageBytes) {
    return tBytes$1(fromImageBytes);
}
function _isFile(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'name' in origin);
}
function isGeneratedVideo(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'video' in origin);
}
function isVideo(origin) {
    return (origin !== null &&
        origin !== undefined &&
        typeof origin === 'object' &&
        'uri' in origin);
}
function tFileName(fromName) {
    var _a;
    let name;
    if (_isFile(fromName)) {
        name = fromName.name;
    }
    if (isVideo(fromName)) {
        name = fromName.uri;
        if (name === undefined) {
            return undefined;
        }
    }
    if (isGeneratedVideo(fromName)) {
        name = (_a = fromName.video) === null || _a === void 0 ? void 0 : _a.uri;
        if (name === undefined) {
            return undefined;
        }
    }
    if (typeof fromName === 'string') {
        name = fromName;
    }
    if (name === undefined) {
        throw new Error('Could not extract file name from the provided input.');
    }
    if (name.startsWith('https://')) {
        const suffix = name.split('files/')[1];
        const match = suffix.match(/[a-z0-9]+/);
        if (match === null) {
            throw new Error(`Could not extract file name from URI ${name}`);
        }
        name = match[0];
    }
    else if (name.startsWith('files/')) {
        name = name.split('files/')[1];
    }
    return name;
}
function tModelsUrl(apiClient, baseModels) {
    let res;
    if (apiClient.isVertexAI()) {
        res = baseModels ? 'publishers/google/models' : 'models';
    }
    else {
        res = baseModels ? 'models' : 'tunedModels';
    }
    return res;
}
function tExtractModels(response) {
    for (const key of ['models', 'tunedModels', 'publisherModels']) {
        if (hasField(response, key)) {
            return response[key];
        }
    }
    return [];
}
function hasField(data, fieldName) {
    return data !== null && typeof data === 'object' && fieldName in data;
}
function mcpToGeminiTool(mcpTool, config = {}) {
    const mcpToolSchema = mcpTool;
    const functionDeclaration = {
        name: mcpToolSchema['name'],
        description: mcpToolSchema['description'],
        parametersJsonSchema: mcpToolSchema['inputSchema'],
    };
    if (mcpToolSchema['outputSchema']) {
        functionDeclaration['responseJsonSchema'] = mcpToolSchema['outputSchema'];
    }
    if (config.behavior) {
        functionDeclaration['behavior'] = config.behavior;
    }
    const geminiTool = {
        functionDeclarations: [
            functionDeclaration,
        ],
    };
    return geminiTool;
}
/**
 * Converts a list of MCP tools to a single Gemini tool with a list of function
 * declarations.
 */
function mcpToolsToGeminiTool(mcpTools, config = {}) {
    const functionDeclarations = [];
    const toolNames = new Set();
    for (const mcpTool of mcpTools) {
        const mcpToolName = mcpTool.name;
        if (toolNames.has(mcpToolName)) {
            throw new Error(`Duplicate function name ${mcpToolName} found in MCP tools. Please ensure function names are unique.`);
        }
        toolNames.add(mcpToolName);
        const geminiTool = mcpToGeminiTool(mcpTool, config);
        if (geminiTool.functionDeclarations) {
            functionDeclarations.push(...geminiTool.functionDeclarations);
        }
    }
    return { functionDeclarations: functionDeclarations };
}
// Transforms a source input into a BatchJobSource object with validation.
function tBatchJobSource(client, src) {
    let sourceObj;
    if (typeof src === 'string') {
        if (client.isVertexAI()) {
            if (src.startsWith('gs://')) {
                sourceObj = { format: 'jsonl', gcsUri: [src] };
            }
            else if (src.startsWith('bq://')) {
                sourceObj = { format: 'bigquery', bigqueryUri: src };
            }
            else {
                throw new Error(`Unsupported string source for Vertex AI: ${src}`);
            }
        }
        else {
            // MLDEV
            if (src.startsWith('files/')) {
                sourceObj = { fileName: src }; // Default to fileName for string input
            }
            else {
                throw new Error(`Unsupported string source for Gemini API: ${src}`);
            }
        }
    }
    else if (Array.isArray(src)) {
        if (client.isVertexAI()) {
            throw new Error('InlinedRequest[] is not supported in Vertex AI.');
        }
        sourceObj = { inlinedRequests: src };
    }
    else {
        // It's already a BatchJobSource object
        sourceObj = src;
    }
    // Validation logic
    const vertexSourcesCount = [sourceObj.gcsUri, sourceObj.bigqueryUri].filter(Boolean).length;
    const mldevSourcesCount = [
        sourceObj.inlinedRequests,
        sourceObj.fileName,
    ].filter(Boolean).length;
    if (client.isVertexAI()) {
        if (mldevSourcesCount > 0 || vertexSourcesCount !== 1) {
            throw new Error('Exactly one of `gcsUri` or `bigqueryUri` must be set for Vertex AI.');
        }
    }
    else {
        // MLDEV
        if (vertexSourcesCount > 0 || mldevSourcesCount !== 1) {
            throw new Error('Exactly one of `inlinedRequests`, `fileName`, ' +
                'must be set for Gemini API.');
        }
    }
    return sourceObj;
}
function tBatchJobDestination(dest) {
    if (typeof dest !== 'string') {
        return dest;
    }
    const destString = dest;
    if (destString.startsWith('gs://')) {
        return {
            format: 'jsonl',
            gcsUri: destString,
        };
    }
    else if (destString.startsWith('bq://')) {
        return {
            format: 'bigquery',
            bigqueryUri: destString,
        };
    }
    else {
        throw new Error(`Unsupported destination: ${destString}`);
    }
}
function tRecvBatchJobDestination(dest) {
    // Ensure dest is a non-null object before proceeding.
    if (typeof dest !== 'object' || dest === null) {
        // If the input is not an object, it cannot be a valid BatchJobDestination
        // based on the operations performed. Return it cast, or handle as an error.
        // Casting an empty object might be a safe default.
        return {};
    }
    // Cast to Record<string, unknown> to allow string property access.
    const obj = dest;
    // Safely access nested properties.
    const inlineResponsesVal = obj['inlinedResponses'];
    if (typeof inlineResponsesVal !== 'object' || inlineResponsesVal === null) {
        return dest;
    }
    const inlineResponsesObj = inlineResponsesVal;
    const responsesArray = inlineResponsesObj['inlinedResponses'];
    if (!Array.isArray(responsesArray) || responsesArray.length === 0) {
        return dest;
    }
    // Check if any response has the 'embedding' property.
    let hasEmbedding = false;
    for (const responseItem of responsesArray) {
        if (typeof responseItem !== 'object' || responseItem === null) {
            continue;
        }
        const responseItemObj = responseItem;
        const responseVal = responseItemObj['response'];
        if (typeof responseVal !== 'object' || responseVal === null) {
            continue;
        }
        const responseObj = responseVal;
        // Check for the existence of the 'embedding' key.
        if (responseObj['embedding'] !== undefined) {
            hasEmbedding = true;
            break;
        }
    }
    // Perform the transformation if an embedding was found.
    if (hasEmbedding) {
        obj['inlinedEmbedContentResponses'] = obj['inlinedResponses'];
        delete obj['inlinedResponses'];
    }
    // Cast the (potentially) modified object to the target type.
    return dest;
}
function tBatchJobName(apiClient, name) {
    const nameString = name;
    if (!apiClient.isVertexAI()) {
        const mldevPattern = /batches\/[^/]+$/;
        if (mldevPattern.test(nameString)) {
            return nameString.split('/').pop();
        }
        else {
            throw new Error(`Invalid batch job name: ${nameString}.`);
        }
    }
    const vertexPattern = /^projects\/[^/]+\/locations\/[^/]+\/batchPredictionJobs\/[^/]+$/;
    if (vertexPattern.test(nameString)) {
        return nameString.split('/').pop();
    }
    else if (/^\d+$/.test(nameString)) {
        return nameString;
    }
    else {
        throw new Error(`Invalid batch job name: ${nameString}.`);
    }
}
function tJobState(state) {
    const stateString = state;
    if (stateString === 'BATCH_STATE_UNSPECIFIED') {
        return 'JOB_STATE_UNSPECIFIED';
    }
    else if (stateString === 'BATCH_STATE_PENDING') {
        return 'JOB_STATE_PENDING';
    }
    else if (stateString === 'BATCH_STATE_SUCCEEDED') {
        return 'JOB_STATE_SUCCEEDED';
    }
    else if (stateString === 'BATCH_STATE_FAILED') {
        return 'JOB_STATE_FAILED';
    }
    else if (stateString === 'BATCH_STATE_CANCELLED') {
        return 'JOB_STATE_CANCELLED';
    }
    else {
        return stateString;
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function videoMetadataToMldev$4(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToMldev$4(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToMldev$4(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToMldev$4(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToMldev$4(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToMldev$4(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToMldev$4(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToMldev$4(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToMldev$4(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToMldev$4(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToMldev$4(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function schemaToMldev$1(fromObject) {
    const toObject = {};
    const fromAnyOf = getValueByPath(fromObject, ['anyOf']);
    if (fromAnyOf != null) {
        setValueByPath(toObject, ['anyOf'], fromAnyOf);
    }
    const fromDefault = getValueByPath(fromObject, ['default']);
    if (fromDefault != null) {
        setValueByPath(toObject, ['default'], fromDefault);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromEnum = getValueByPath(fromObject, ['enum']);
    if (fromEnum != null) {
        setValueByPath(toObject, ['enum'], fromEnum);
    }
    const fromExample = getValueByPath(fromObject, ['example']);
    if (fromExample != null) {
        setValueByPath(toObject, ['example'], fromExample);
    }
    const fromFormat = getValueByPath(fromObject, ['format']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['format'], fromFormat);
    }
    const fromItems = getValueByPath(fromObject, ['items']);
    if (fromItems != null) {
        setValueByPath(toObject, ['items'], fromItems);
    }
    const fromMaxItems = getValueByPath(fromObject, ['maxItems']);
    if (fromMaxItems != null) {
        setValueByPath(toObject, ['maxItems'], fromMaxItems);
    }
    const fromMaxLength = getValueByPath(fromObject, ['maxLength']);
    if (fromMaxLength != null) {
        setValueByPath(toObject, ['maxLength'], fromMaxLength);
    }
    const fromMaxProperties = getValueByPath(fromObject, [
        'maxProperties',
    ]);
    if (fromMaxProperties != null) {
        setValueByPath(toObject, ['maxProperties'], fromMaxProperties);
    }
    const fromMaximum = getValueByPath(fromObject, ['maximum']);
    if (fromMaximum != null) {
        setValueByPath(toObject, ['maximum'], fromMaximum);
    }
    const fromMinItems = getValueByPath(fromObject, ['minItems']);
    if (fromMinItems != null) {
        setValueByPath(toObject, ['minItems'], fromMinItems);
    }
    const fromMinLength = getValueByPath(fromObject, ['minLength']);
    if (fromMinLength != null) {
        setValueByPath(toObject, ['minLength'], fromMinLength);
    }
    const fromMinProperties = getValueByPath(fromObject, [
        'minProperties',
    ]);
    if (fromMinProperties != null) {
        setValueByPath(toObject, ['minProperties'], fromMinProperties);
    }
    const fromMinimum = getValueByPath(fromObject, ['minimum']);
    if (fromMinimum != null) {
        setValueByPath(toObject, ['minimum'], fromMinimum);
    }
    const fromNullable = getValueByPath(fromObject, ['nullable']);
    if (fromNullable != null) {
        setValueByPath(toObject, ['nullable'], fromNullable);
    }
    const fromPattern = getValueByPath(fromObject, ['pattern']);
    if (fromPattern != null) {
        setValueByPath(toObject, ['pattern'], fromPattern);
    }
    const fromProperties = getValueByPath(fromObject, ['properties']);
    if (fromProperties != null) {
        setValueByPath(toObject, ['properties'], fromProperties);
    }
    const fromPropertyOrdering = getValueByPath(fromObject, [
        'propertyOrdering',
    ]);
    if (fromPropertyOrdering != null) {
        setValueByPath(toObject, ['propertyOrdering'], fromPropertyOrdering);
    }
    const fromRequired = getValueByPath(fromObject, ['required']);
    if (fromRequired != null) {
        setValueByPath(toObject, ['required'], fromRequired);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (fromTitle != null) {
        setValueByPath(toObject, ['title'], fromTitle);
    }
    const fromType = getValueByPath(fromObject, ['type']);
    if (fromType != null) {
        setValueByPath(toObject, ['type'], fromType);
    }
    return toObject;
}
function safetySettingToMldev$1(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['method']) !== undefined) {
        throw new Error('method parameter is not supported in Gemini API.');
    }
    const fromCategory = getValueByPath(fromObject, ['category']);
    if (fromCategory != null) {
        setValueByPath(toObject, ['category'], fromCategory);
    }
    const fromThreshold = getValueByPath(fromObject, ['threshold']);
    if (fromThreshold != null) {
        setValueByPath(toObject, ['threshold'], fromThreshold);
    }
    return toObject;
}
function functionDeclarationToMldev$4(fromObject) {
    const toObject = {};
    const fromBehavior = getValueByPath(fromObject, ['behavior']);
    if (fromBehavior != null) {
        setValueByPath(toObject, ['behavior'], fromBehavior);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToMldev$4(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToMldev$4(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToMldev$4(fromTimeRangeFilter));
    }
    if (getValueByPath(fromObject, ['excludeDomains']) !== undefined) {
        throw new Error('excludeDomains parameter is not supported in Gemini API.');
    }
    return toObject;
}
function dynamicRetrievalConfigToMldev$4(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToMldev$4(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToMldev$4(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function urlContextToMldev$4() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToMldev$4(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToMldev$4(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToMldev$4(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    if (getValueByPath(fromObject, ['retrieval']) !== undefined) {
        throw new Error('retrieval parameter is not supported in Gemini API.');
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToMldev$4(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToMldev$4(fromGoogleSearchRetrieval));
    }
    if (getValueByPath(fromObject, ['enterpriseWebSearch']) !== undefined) {
        throw new Error('enterpriseWebSearch parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['googleMaps']) !== undefined) {
        throw new Error('googleMaps parameter is not supported in Gemini API.');
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToMldev$4());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToMldev$4(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function functionCallingConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromAllowedFunctionNames = getValueByPath(fromObject, [
        'allowedFunctionNames',
    ]);
    if (fromAllowedFunctionNames != null) {
        setValueByPath(toObject, ['allowedFunctionNames'], fromAllowedFunctionNames);
    }
    return toObject;
}
function latLngToMldev$2(fromObject) {
    const toObject = {};
    const fromLatitude = getValueByPath(fromObject, ['latitude']);
    if (fromLatitude != null) {
        setValueByPath(toObject, ['latitude'], fromLatitude);
    }
    const fromLongitude = getValueByPath(fromObject, ['longitude']);
    if (fromLongitude != null) {
        setValueByPath(toObject, ['longitude'], fromLongitude);
    }
    return toObject;
}
function retrievalConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromLatLng = getValueByPath(fromObject, ['latLng']);
    if (fromLatLng != null) {
        setValueByPath(toObject, ['latLng'], latLngToMldev$2(fromLatLng));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function toolConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromFunctionCallingConfig = getValueByPath(fromObject, [
        'functionCallingConfig',
    ]);
    if (fromFunctionCallingConfig != null) {
        setValueByPath(toObject, ['functionCallingConfig'], functionCallingConfigToMldev$2(fromFunctionCallingConfig));
    }
    const fromRetrievalConfig = getValueByPath(fromObject, [
        'retrievalConfig',
    ]);
    if (fromRetrievalConfig != null) {
        setValueByPath(toObject, ['retrievalConfig'], retrievalConfigToMldev$2(fromRetrievalConfig));
    }
    return toObject;
}
function prebuiltVoiceConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToMldev$3(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speakerVoiceConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromSpeaker = getValueByPath(fromObject, ['speaker']);
    if (fromSpeaker != null) {
        setValueByPath(toObject, ['speaker'], fromSpeaker);
    }
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$3(fromVoiceConfig));
    }
    return toObject;
}
function multiSpeakerVoiceConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromSpeakerVoiceConfigs = getValueByPath(fromObject, [
        'speakerVoiceConfigs',
    ]);
    if (fromSpeakerVoiceConfigs != null) {
        let transformedList = fromSpeakerVoiceConfigs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return speakerVoiceConfigToMldev$3(item);
            });
        }
        setValueByPath(toObject, ['speakerVoiceConfigs'], transformedList);
    }
    return toObject;
}
function speechConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$3(fromVoiceConfig));
    }
    const fromMultiSpeakerVoiceConfig = getValueByPath(fromObject, [
        'multiSpeakerVoiceConfig',
    ]);
    if (fromMultiSpeakerVoiceConfig != null) {
        setValueByPath(toObject, ['multiSpeakerVoiceConfig'], multiSpeakerVoiceConfigToMldev$3(fromMultiSpeakerVoiceConfig));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function thinkingConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromIncludeThoughts = getValueByPath(fromObject, [
        'includeThoughts',
    ]);
    if (fromIncludeThoughts != null) {
        setValueByPath(toObject, ['includeThoughts'], fromIncludeThoughts);
    }
    const fromThinkingBudget = getValueByPath(fromObject, [
        'thinkingBudget',
    ]);
    if (fromThinkingBudget != null) {
        setValueByPath(toObject, ['thinkingBudget'], fromThinkingBudget);
    }
    return toObject;
}
function generateContentConfigToMldev$1(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToMldev$4(tContent(fromSystemInstruction)));
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (fromTemperature != null) {
        setValueByPath(toObject, ['temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (fromTopP != null) {
        setValueByPath(toObject, ['topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (fromTopK != null) {
        setValueByPath(toObject, ['topK'], fromTopK);
    }
    const fromCandidateCount = getValueByPath(fromObject, [
        'candidateCount',
    ]);
    if (fromCandidateCount != null) {
        setValueByPath(toObject, ['candidateCount'], fromCandidateCount);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (fromMaxOutputTokens != null) {
        setValueByPath(toObject, ['maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromStopSequences = getValueByPath(fromObject, [
        'stopSequences',
    ]);
    if (fromStopSequences != null) {
        setValueByPath(toObject, ['stopSequences'], fromStopSequences);
    }
    const fromResponseLogprobs = getValueByPath(fromObject, [
        'responseLogprobs',
    ]);
    if (fromResponseLogprobs != null) {
        setValueByPath(toObject, ['responseLogprobs'], fromResponseLogprobs);
    }
    const fromLogprobs = getValueByPath(fromObject, ['logprobs']);
    if (fromLogprobs != null) {
        setValueByPath(toObject, ['logprobs'], fromLogprobs);
    }
    const fromPresencePenalty = getValueByPath(fromObject, [
        'presencePenalty',
    ]);
    if (fromPresencePenalty != null) {
        setValueByPath(toObject, ['presencePenalty'], fromPresencePenalty);
    }
    const fromFrequencyPenalty = getValueByPath(fromObject, [
        'frequencyPenalty',
    ]);
    if (fromFrequencyPenalty != null) {
        setValueByPath(toObject, ['frequencyPenalty'], fromFrequencyPenalty);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (fromSeed != null) {
        setValueByPath(toObject, ['seed'], fromSeed);
    }
    const fromResponseMimeType = getValueByPath(fromObject, [
        'responseMimeType',
    ]);
    if (fromResponseMimeType != null) {
        setValueByPath(toObject, ['responseMimeType'], fromResponseMimeType);
    }
    const fromResponseSchema = getValueByPath(fromObject, [
        'responseSchema',
    ]);
    if (fromResponseSchema != null) {
        setValueByPath(toObject, ['responseSchema'], schemaToMldev$1(tSchema(fromResponseSchema)));
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    if (getValueByPath(fromObject, ['routingConfig']) !== undefined) {
        throw new Error('routingConfig parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['modelSelectionConfig']) !== undefined) {
        throw new Error('modelSelectionConfig parameter is not supported in Gemini API.');
    }
    const fromSafetySettings = getValueByPath(fromObject, [
        'safetySettings',
    ]);
    if (parentObject !== undefined && fromSafetySettings != null) {
        let transformedList = fromSafetySettings;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return safetySettingToMldev$1(item);
            });
        }
        setValueByPath(parentObject, ['safetySettings'], transformedList);
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToMldev$4(tTool(item));
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromToolConfig = getValueByPath(fromObject, ['toolConfig']);
    if (parentObject !== undefined && fromToolConfig != null) {
        setValueByPath(parentObject, ['toolConfig'], toolConfigToMldev$2(fromToolConfig));
    }
    if (getValueByPath(fromObject, ['labels']) !== undefined) {
        throw new Error('labels parameter is not supported in Gemini API.');
    }
    const fromCachedContent = getValueByPath(fromObject, [
        'cachedContent',
    ]);
    if (parentObject !== undefined && fromCachedContent != null) {
        setValueByPath(parentObject, ['cachedContent'], tCachedContentName(apiClient, fromCachedContent));
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (fromResponseModalities != null) {
        setValueByPath(toObject, ['responseModalities'], fromResponseModalities);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (fromMediaResolution != null) {
        setValueByPath(toObject, ['mediaResolution'], fromMediaResolution);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (fromSpeechConfig != null) {
        setValueByPath(toObject, ['speechConfig'], speechConfigToMldev$3(tSpeechConfig(fromSpeechConfig)));
    }
    if (getValueByPath(fromObject, ['audioTimestamp']) !== undefined) {
        throw new Error('audioTimestamp parameter is not supported in Gemini API.');
    }
    const fromThinkingConfig = getValueByPath(fromObject, [
        'thinkingConfig',
    ]);
    if (fromThinkingConfig != null) {
        setValueByPath(toObject, ['thinkingConfig'], thinkingConfigToMldev$1(fromThinkingConfig));
    }
    return toObject;
}
function inlinedRequestToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['request', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToMldev$4(item);
            });
        }
        setValueByPath(toObject, ['request', 'contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['request', 'generationConfig'], generateContentConfigToMldev$1(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function batchJobSourceToMldev(apiClient, fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['format']) !== undefined) {
        throw new Error('format parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['gcsUri']) !== undefined) {
        throw new Error('gcsUri parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['bigqueryUri']) !== undefined) {
        throw new Error('bigqueryUri parameter is not supported in Gemini API.');
    }
    const fromFileName = getValueByPath(fromObject, ['fileName']);
    if (fromFileName != null) {
        setValueByPath(toObject, ['fileName'], fromFileName);
    }
    const fromInlinedRequests = getValueByPath(fromObject, [
        'inlinedRequests',
    ]);
    if (fromInlinedRequests != null) {
        let transformedList = fromInlinedRequests;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return inlinedRequestToMldev(apiClient, item);
            });
        }
        setValueByPath(toObject, ['requests', 'requests'], transformedList);
    }
    return toObject;
}
function createBatchJobConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['batch', 'displayName'], fromDisplayName);
    }
    if (getValueByPath(fromObject, ['dest']) !== undefined) {
        throw new Error('dest parameter is not supported in Gemini API.');
    }
    return toObject;
}
function createBatchJobParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromSrc = getValueByPath(fromObject, ['src']);
    if (fromSrc != null) {
        setValueByPath(toObject, ['batch', 'inputConfig'], batchJobSourceToMldev(apiClient, tBatchJobSource(apiClient, fromSrc)));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createBatchJobConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function embedContentConfigToMldev$1(fromObject, parentObject) {
    const toObject = {};
    const fromTaskType = getValueByPath(fromObject, ['taskType']);
    if (parentObject !== undefined && fromTaskType != null) {
        setValueByPath(parentObject, ['requests[]', 'taskType'], fromTaskType);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (parentObject !== undefined && fromTitle != null) {
        setValueByPath(parentObject, ['requests[]', 'title'], fromTitle);
    }
    const fromOutputDimensionality = getValueByPath(fromObject, [
        'outputDimensionality',
    ]);
    if (parentObject !== undefined && fromOutputDimensionality != null) {
        setValueByPath(parentObject, ['requests[]', 'outputDimensionality'], fromOutputDimensionality);
    }
    if (getValueByPath(fromObject, ['mimeType']) !== undefined) {
        throw new Error('mimeType parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['autoTruncate']) !== undefined) {
        throw new Error('autoTruncate parameter is not supported in Gemini API.');
    }
    return toObject;
}
function embedContentBatchToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        setValueByPath(toObject, ['requests[]', 'request', 'content'], tContentsForEmbed(apiClient, fromContents));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], embedContentConfigToMldev$1(fromConfig, toObject));
    }
    return toObject;
}
function embeddingsBatchJobSourceToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromFileName = getValueByPath(fromObject, ['fileName']);
    if (fromFileName != null) {
        setValueByPath(toObject, ['file_name'], fromFileName);
    }
    const fromInlinedRequests = getValueByPath(fromObject, [
        'inlinedRequests',
    ]);
    if (fromInlinedRequests != null) {
        setValueByPath(toObject, ['requests'], embedContentBatchToMldev(apiClient, fromInlinedRequests));
    }
    return toObject;
}
function createEmbeddingsBatchJobConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['batch', 'displayName'], fromDisplayName);
    }
    return toObject;
}
function createEmbeddingsBatchJobParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromSrc = getValueByPath(fromObject, ['src']);
    if (fromSrc != null) {
        setValueByPath(toObject, ['batch', 'inputConfig'], embeddingsBatchJobSourceToMldev(apiClient, fromSrc));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createEmbeddingsBatchJobConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function getBatchJobParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function cancelBatchJobParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listBatchJobsConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    if (getValueByPath(fromObject, ['filter']) !== undefined) {
        throw new Error('filter parameter is not supported in Gemini API.');
    }
    return toObject;
}
function listBatchJobsParametersToMldev(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listBatchJobsConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function deleteBatchJobParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function batchJobSourceToVertex(fromObject) {
    const toObject = {};
    const fromFormat = getValueByPath(fromObject, ['format']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['instancesFormat'], fromFormat);
    }
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsSource', 'uris'], fromGcsUri);
    }
    const fromBigqueryUri = getValueByPath(fromObject, ['bigqueryUri']);
    if (fromBigqueryUri != null) {
        setValueByPath(toObject, ['bigquerySource', 'inputUri'], fromBigqueryUri);
    }
    if (getValueByPath(fromObject, ['fileName']) !== undefined) {
        throw new Error('fileName parameter is not supported in Vertex AI.');
    }
    if (getValueByPath(fromObject, ['inlinedRequests']) !== undefined) {
        throw new Error('inlinedRequests parameter is not supported in Vertex AI.');
    }
    return toObject;
}
function batchJobDestinationToVertex(fromObject) {
    const toObject = {};
    const fromFormat = getValueByPath(fromObject, ['format']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['predictionsFormat'], fromFormat);
    }
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsDestination', 'outputUriPrefix'], fromGcsUri);
    }
    const fromBigqueryUri = getValueByPath(fromObject, ['bigqueryUri']);
    if (fromBigqueryUri != null) {
        setValueByPath(toObject, ['bigqueryDestination', 'outputUri'], fromBigqueryUri);
    }
    if (getValueByPath(fromObject, ['fileName']) !== undefined) {
        throw new Error('fileName parameter is not supported in Vertex AI.');
    }
    if (getValueByPath(fromObject, ['inlinedResponses']) !== undefined) {
        throw new Error('inlinedResponses parameter is not supported in Vertex AI.');
    }
    if (getValueByPath(fromObject, ['inlinedEmbedContentResponses']) !==
        undefined) {
        throw new Error('inlinedEmbedContentResponses parameter is not supported in Vertex AI.');
    }
    return toObject;
}
function createBatchJobConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromDisplayName);
    }
    const fromDest = getValueByPath(fromObject, ['dest']);
    if (parentObject !== undefined && fromDest != null) {
        setValueByPath(parentObject, ['outputConfig'], batchJobDestinationToVertex(tBatchJobDestination(fromDest)));
    }
    return toObject;
}
function createBatchJobParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], tModel(apiClient, fromModel));
    }
    const fromSrc = getValueByPath(fromObject, ['src']);
    if (fromSrc != null) {
        setValueByPath(toObject, ['inputConfig'], batchJobSourceToVertex(tBatchJobSource(apiClient, fromSrc)));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createBatchJobConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function getBatchJobParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function cancelBatchJobParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listBatchJobsConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    const fromFilter = getValueByPath(fromObject, ['filter']);
    if (parentObject !== undefined && fromFilter != null) {
        setValueByPath(parentObject, ['_query', 'filter'], fromFilter);
    }
    return toObject;
}
function listBatchJobsParametersToVertex(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listBatchJobsConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function deleteBatchJobParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tBatchJobName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function videoMetadataFromMldev$2(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobFromMldev$2(fromObject) {
    const toObject = {};
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataFromMldev$2(fromObject) {
    const toObject = {};
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallFromMldev$2(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partFromMldev$2(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataFromMldev$2(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobFromMldev$2(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataFromMldev$2(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallFromMldev$2(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentFromMldev$2(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partFromMldev$2(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function citationMetadataFromMldev$1(fromObject) {
    const toObject = {};
    const fromCitations = getValueByPath(fromObject, ['citationSources']);
    if (fromCitations != null) {
        setValueByPath(toObject, ['citations'], fromCitations);
    }
    return toObject;
}
function urlMetadataFromMldev$2(fromObject) {
    const toObject = {};
    const fromRetrievedUrl = getValueByPath(fromObject, ['retrievedUrl']);
    if (fromRetrievedUrl != null) {
        setValueByPath(toObject, ['retrievedUrl'], fromRetrievedUrl);
    }
    const fromUrlRetrievalStatus = getValueByPath(fromObject, [
        'urlRetrievalStatus',
    ]);
    if (fromUrlRetrievalStatus != null) {
        setValueByPath(toObject, ['urlRetrievalStatus'], fromUrlRetrievalStatus);
    }
    return toObject;
}
function urlContextMetadataFromMldev$2(fromObject) {
    const toObject = {};
    const fromUrlMetadata = getValueByPath(fromObject, ['urlMetadata']);
    if (fromUrlMetadata != null) {
        let transformedList = fromUrlMetadata;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return urlMetadataFromMldev$2(item);
            });
        }
        setValueByPath(toObject, ['urlMetadata'], transformedList);
    }
    return toObject;
}
function candidateFromMldev$1(fromObject) {
    const toObject = {};
    const fromContent = getValueByPath(fromObject, ['content']);
    if (fromContent != null) {
        setValueByPath(toObject, ['content'], contentFromMldev$2(fromContent));
    }
    const fromCitationMetadata = getValueByPath(fromObject, [
        'citationMetadata',
    ]);
    if (fromCitationMetadata != null) {
        setValueByPath(toObject, ['citationMetadata'], citationMetadataFromMldev$1(fromCitationMetadata));
    }
    const fromTokenCount = getValueByPath(fromObject, ['tokenCount']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    const fromFinishReason = getValueByPath(fromObject, ['finishReason']);
    if (fromFinishReason != null) {
        setValueByPath(toObject, ['finishReason'], fromFinishReason);
    }
    const fromUrlContextMetadata = getValueByPath(fromObject, [
        'urlContextMetadata',
    ]);
    if (fromUrlContextMetadata != null) {
        setValueByPath(toObject, ['urlContextMetadata'], urlContextMetadataFromMldev$2(fromUrlContextMetadata));
    }
    const fromAvgLogprobs = getValueByPath(fromObject, ['avgLogprobs']);
    if (fromAvgLogprobs != null) {
        setValueByPath(toObject, ['avgLogprobs'], fromAvgLogprobs);
    }
    const fromGroundingMetadata = getValueByPath(fromObject, [
        'groundingMetadata',
    ]);
    if (fromGroundingMetadata != null) {
        setValueByPath(toObject, ['groundingMetadata'], fromGroundingMetadata);
    }
    const fromIndex = getValueByPath(fromObject, ['index']);
    if (fromIndex != null) {
        setValueByPath(toObject, ['index'], fromIndex);
    }
    const fromLogprobsResult = getValueByPath(fromObject, [
        'logprobsResult',
    ]);
    if (fromLogprobsResult != null) {
        setValueByPath(toObject, ['logprobsResult'], fromLogprobsResult);
    }
    const fromSafetyRatings = getValueByPath(fromObject, [
        'safetyRatings',
    ]);
    if (fromSafetyRatings != null) {
        setValueByPath(toObject, ['safetyRatings'], fromSafetyRatings);
    }
    return toObject;
}
function generateContentResponseFromMldev$1(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromCandidates = getValueByPath(fromObject, ['candidates']);
    if (fromCandidates != null) {
        let transformedList = fromCandidates;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return candidateFromMldev$1(item);
            });
        }
        setValueByPath(toObject, ['candidates'], transformedList);
    }
    const fromModelVersion = getValueByPath(fromObject, ['modelVersion']);
    if (fromModelVersion != null) {
        setValueByPath(toObject, ['modelVersion'], fromModelVersion);
    }
    const fromPromptFeedback = getValueByPath(fromObject, [
        'promptFeedback',
    ]);
    if (fromPromptFeedback != null) {
        setValueByPath(toObject, ['promptFeedback'], fromPromptFeedback);
    }
    const fromResponseId = getValueByPath(fromObject, ['responseId']);
    if (fromResponseId != null) {
        setValueByPath(toObject, ['responseId'], fromResponseId);
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], fromUsageMetadata);
    }
    return toObject;
}
function jobErrorFromMldev(fromObject) {
    const toObject = {};
    const fromDetails = getValueByPath(fromObject, ['details']);
    if (fromDetails != null) {
        setValueByPath(toObject, ['details'], fromDetails);
    }
    const fromCode = getValueByPath(fromObject, ['code']);
    if (fromCode != null) {
        setValueByPath(toObject, ['code'], fromCode);
    }
    const fromMessage = getValueByPath(fromObject, ['message']);
    if (fromMessage != null) {
        setValueByPath(toObject, ['message'], fromMessage);
    }
    return toObject;
}
function inlinedResponseFromMldev(fromObject) {
    const toObject = {};
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], generateContentResponseFromMldev$1(fromResponse));
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], jobErrorFromMldev(fromError));
    }
    return toObject;
}
function contentEmbeddingFromMldev$1(fromObject) {
    const toObject = {};
    const fromValues = getValueByPath(fromObject, ['values']);
    if (fromValues != null) {
        setValueByPath(toObject, ['values'], fromValues);
    }
    return toObject;
}
function singleEmbedContentResponseFromMldev(fromObject) {
    const toObject = {};
    const fromEmbedding = getValueByPath(fromObject, ['embedding']);
    if (fromEmbedding != null) {
        setValueByPath(toObject, ['embedding'], contentEmbeddingFromMldev$1(fromEmbedding));
    }
    const fromTokenCount = getValueByPath(fromObject, ['tokenCount']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    return toObject;
}
function inlinedEmbedContentResponseFromMldev(fromObject) {
    const toObject = {};
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], singleEmbedContentResponseFromMldev(fromResponse));
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], jobErrorFromMldev(fromError));
    }
    return toObject;
}
function batchJobDestinationFromMldev(fromObject) {
    const toObject = {};
    const fromFileName = getValueByPath(fromObject, ['responsesFile']);
    if (fromFileName != null) {
        setValueByPath(toObject, ['fileName'], fromFileName);
    }
    const fromInlinedResponses = getValueByPath(fromObject, [
        'inlinedResponses',
        'inlinedResponses',
    ]);
    if (fromInlinedResponses != null) {
        let transformedList = fromInlinedResponses;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return inlinedResponseFromMldev(item);
            });
        }
        setValueByPath(toObject, ['inlinedResponses'], transformedList);
    }
    const fromInlinedEmbedContentResponses = getValueByPath(fromObject, [
        'inlinedEmbedContentResponses',
        'inlinedResponses',
    ]);
    if (fromInlinedEmbedContentResponses != null) {
        let transformedList = fromInlinedEmbedContentResponses;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return inlinedEmbedContentResponseFromMldev(item);
            });
        }
        setValueByPath(toObject, ['inlinedEmbedContentResponses'], transformedList);
    }
    return toObject;
}
function batchJobFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, [
        'metadata',
        'displayName',
    ]);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromState = getValueByPath(fromObject, ['metadata', 'state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], tJobState(fromState));
    }
    const fromCreateTime = getValueByPath(fromObject, [
        'metadata',
        'createTime',
    ]);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromEndTime = getValueByPath(fromObject, [
        'metadata',
        'endTime',
    ]);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, [
        'metadata',
        'updateTime',
    ]);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromModel = getValueByPath(fromObject, ['metadata', 'model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromDest = getValueByPath(fromObject, ['metadata', 'output']);
    if (fromDest != null) {
        setValueByPath(toObject, ['dest'], batchJobDestinationFromMldev(tRecvBatchJobDestination(fromDest)));
    }
    return toObject;
}
function listBatchJobsResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromBatchJobs = getValueByPath(fromObject, ['operations']);
    if (fromBatchJobs != null) {
        let transformedList = fromBatchJobs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return batchJobFromMldev(item);
            });
        }
        setValueByPath(toObject, ['batchJobs'], transformedList);
    }
    return toObject;
}
function deleteResourceJobFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], jobErrorFromMldev(fromError));
    }
    return toObject;
}
function jobErrorFromVertex(fromObject) {
    const toObject = {};
    const fromDetails = getValueByPath(fromObject, ['details']);
    if (fromDetails != null) {
        setValueByPath(toObject, ['details'], fromDetails);
    }
    const fromCode = getValueByPath(fromObject, ['code']);
    if (fromCode != null) {
        setValueByPath(toObject, ['code'], fromCode);
    }
    const fromMessage = getValueByPath(fromObject, ['message']);
    if (fromMessage != null) {
        setValueByPath(toObject, ['message'], fromMessage);
    }
    return toObject;
}
function batchJobSourceFromVertex(fromObject) {
    const toObject = {};
    const fromFormat = getValueByPath(fromObject, ['instancesFormat']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['format'], fromFormat);
    }
    const fromGcsUri = getValueByPath(fromObject, ['gcsSource', 'uris']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsUri'], fromGcsUri);
    }
    const fromBigqueryUri = getValueByPath(fromObject, [
        'bigquerySource',
        'inputUri',
    ]);
    if (fromBigqueryUri != null) {
        setValueByPath(toObject, ['bigqueryUri'], fromBigqueryUri);
    }
    return toObject;
}
function batchJobDestinationFromVertex(fromObject) {
    const toObject = {};
    const fromFormat = getValueByPath(fromObject, ['predictionsFormat']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['format'], fromFormat);
    }
    const fromGcsUri = getValueByPath(fromObject, [
        'gcsDestination',
        'outputUriPrefix',
    ]);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsUri'], fromGcsUri);
    }
    const fromBigqueryUri = getValueByPath(fromObject, [
        'bigqueryDestination',
        'outputUri',
    ]);
    if (fromBigqueryUri != null) {
        setValueByPath(toObject, ['bigqueryUri'], fromBigqueryUri);
    }
    return toObject;
}
function batchJobFromVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromState = getValueByPath(fromObject, ['state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], tJobState(fromState));
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], jobErrorFromVertex(fromError));
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromSrc = getValueByPath(fromObject, ['inputConfig']);
    if (fromSrc != null) {
        setValueByPath(toObject, ['src'], batchJobSourceFromVertex(fromSrc));
    }
    const fromDest = getValueByPath(fromObject, ['outputConfig']);
    if (fromDest != null) {
        setValueByPath(toObject, ['dest'], batchJobDestinationFromVertex(tRecvBatchJobDestination(fromDest)));
    }
    return toObject;
}
function listBatchJobsResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromBatchJobs = getValueByPath(fromObject, [
        'batchPredictionJobs',
    ]);
    if (fromBatchJobs != null) {
        let transformedList = fromBatchJobs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return batchJobFromVertex(item);
            });
        }
        setValueByPath(toObject, ['batchJobs'], transformedList);
    }
    return toObject;
}
function deleteResourceJobFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], jobErrorFromVertex(fromError));
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var PagedItem;
(function (PagedItem) {
    PagedItem["PAGED_ITEM_BATCH_JOBS"] = "batchJobs";
    PagedItem["PAGED_ITEM_MODELS"] = "models";
    PagedItem["PAGED_ITEM_TUNING_JOBS"] = "tuningJobs";
    PagedItem["PAGED_ITEM_FILES"] = "files";
    PagedItem["PAGED_ITEM_CACHED_CONTENTS"] = "cachedContents";
})(PagedItem || (PagedItem = {}));
/**
 * Pager class for iterating through paginated results.
 */
class Pager {
    constructor(name, request, response, params) {
        this.pageInternal = [];
        this.paramsInternal = {};
        this.requestInternal = request;
        this.init(name, response, params);
    }
    init(name, response, params) {
        var _a, _b;
        this.nameInternal = name;
        this.pageInternal = response[this.nameInternal] || [];
        this.sdkHttpResponseInternal = response === null || response === void 0 ? void 0 : response.sdkHttpResponse;
        this.idxInternal = 0;
        let requestParams = { config: {} };
        if (!params || Object.keys(params).length === 0) {
            requestParams = { config: {} };
        }
        else if (typeof params === 'object') {
            requestParams = Object.assign({}, params);
        }
        else {
            requestParams = params;
        }
        if (requestParams['config']) {
            requestParams['config']['pageToken'] = response['nextPageToken'];
        }
        this.paramsInternal = requestParams;
        this.pageInternalSize =
            (_b = (_a = requestParams['config']) === null || _a === void 0 ? void 0 : _a['pageSize']) !== null && _b !== void 0 ? _b : this.pageInternal.length;
    }
    initNextPage(response) {
        this.init(this.nameInternal, response, this.paramsInternal);
    }
    /**
     * Returns the current page, which is a list of items.
     *
     * @remarks
     * The first page is retrieved when the pager is created. The returned list of
     * items could be a subset of the entire list.
     */
    get page() {
        return this.pageInternal;
    }
    /**
     * Returns the type of paged item (for example, ``batch_jobs``).
     */
    get name() {
        return this.nameInternal;
    }
    /**
     * Returns the length of the page fetched each time by this pager.
     *
     * @remarks
     * The number of items in the page is less than or equal to the page length.
     */
    get pageSize() {
        return this.pageInternalSize;
    }
    /**
     * Returns the headers of the API response.
     */
    get sdkHttpResponse() {
        return this.sdkHttpResponseInternal;
    }
    /**
     * Returns the parameters when making the API request for the next page.
     *
     * @remarks
     * Parameters contain a set of optional configs that can be
     * used to customize the API request. For example, the `pageToken` parameter
     * contains the token to request the next page.
     */
    get params() {
        return this.paramsInternal;
    }
    /**
     * Returns the total number of items in the current page.
     */
    get pageLength() {
        return this.pageInternal.length;
    }
    /**
     * Returns the item at the given index.
     */
    getItem(index) {
        return this.pageInternal[index];
    }
    /**
     * Returns an async iterator that support iterating through all items
     * retrieved from the API.
     *
     * @remarks
     * The iterator will automatically fetch the next page if there are more items
     * to fetch from the API.
     *
     * @example
     *
     * ```ts
     * const pager = await ai.files.list({config: {pageSize: 10}});
     * for await (const file of pager) {
     *   console.log(file.name);
     * }
     * ```
     */
    [Symbol.asyncIterator]() {
        return {
            next: async () => {
                if (this.idxInternal >= this.pageLength) {
                    if (this.hasNextPage()) {
                        await this.nextPage();
                    }
                    else {
                        return { value: undefined, done: true };
                    }
                }
                const item = this.getItem(this.idxInternal);
                this.idxInternal += 1;
                return { value: item, done: false };
            },
            return: async () => {
                return { value: undefined, done: true };
            },
        };
    }
    /**
     * Fetches the next page of items. This makes a new API request.
     *
     * @throws {Error} If there are no more pages to fetch.
     *
     * @example
     *
     * ```ts
     * const pager = await ai.files.list({config: {pageSize: 10}});
     * let page = pager.page;
     * while (true) {
     *   for (const file of page) {
     *     console.log(file.name);
     *   }
     *   if (!pager.hasNextPage()) {
     *     break;
     *   }
     *   page = await pager.nextPage();
     * }
     * ```
     */
    async nextPage() {
        if (!this.hasNextPage()) {
            throw new Error('No more pages to fetch.');
        }
        const response = await this.requestInternal(this.params);
        this.initNextPage(response);
        return this.page;
    }
    /**
     * Returns true if there are more pages to fetch from the API.
     */
    hasNextPage() {
        var _a;
        if (((_a = this.params['config']) === null || _a === void 0 ? void 0 : _a['pageToken']) !== undefined) {
            return true;
        }
        return false;
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Batches extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
        /**
         * Create batch job.
         *
         * @param params - The parameters for create batch job request.
         * @return The created batch job.
         *
         * @example
         * ```ts
         * const response = await ai.batches.create({
         *   model: 'gemini-2.0-flash',
         *   src: {gcsUri: 'gs://bucket/path/to/file.jsonl', format: 'jsonl'},
         *   config: {
         *     dest: {gcsUri: 'gs://bucket/path/output/directory', format: 'jsonl'},
         *   }
         * });
         * console.log(response);
         * ```
         */
        this.create = async (params) => {
            var _a, _b;
            if (this.apiClient.isVertexAI()) {
                // Format destination if not provided
                // Cast params.src as Vertex AI path does not handle InlinedRequest[]
                params.config = this.formatDestination(params.src, params.config);
                return this.createInternal(params);
            }
            // MLDEV
            const src = params.src;
            const is_inlined = Array.isArray(params.src) || src.inlinedRequests !== undefined;
            if (!is_inlined) {
                return this.createInternal(params);
            }
            // Inlined generate content requests handling
            const result = this.createInlinedGenerateContentRequest(params);
            const path = result.path;
            const requestBody = result.body;
            const queryParams = createBatchJobParametersToMldev(this.apiClient, params)['_query'] || {};
            const response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(requestBody),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromMldev(apiResponse);
                return resp;
            });
        };
        /**
         * **Experimental** Creates an embedding batch job.
         *
         * @param params - The parameters for create embedding batch job request.
         * @return The created batch job.
         *
         * @example
         * ```ts
         * const response = await ai.batches.createEmbeddings({
         *   model: 'text-embedding-004',
         *   src: {fileName: 'files/my_embedding_input'},
         * });
         * console.log(response);
         * ```
         */
        this.createEmbeddings = async (params) => {
            var _a, _b;
            console.warn('batches.createEmbeddings() is experimental and may change without notice.');
            if (this.apiClient.isVertexAI()) {
                throw new Error('Vertex AI does not support batches.createEmbeddings.');
            }
            // MLDEV
            const src = params.src;
            const is_inlined = src.inlinedRequests !== undefined;
            if (!is_inlined) {
                return this.createEmbeddingsInternal(params); // Fixed typo here
            }
            // Inlined embed content requests handling
            const result = this.createInlinedEmbedContentRequest(params);
            const path = result.path;
            const requestBody = result.body;
            const queryParams = createEmbeddingsBatchJobParametersToMldev(this.apiClient, params)['_query'] || {};
            const response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(requestBody),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromMldev(apiResponse);
                return resp;
            });
        };
        /**
         * Lists batch job configurations.
         *
         * @param params - The parameters for the list request.
         * @return The paginated results of the list of batch jobs.
         *
         * @example
         * ```ts
         * const batchJobs = await ai.batches.list({config: {'pageSize': 2}});
         * for await (const batchJob of batchJobs) {
         *   console.log(batchJob);
         * }
         * ```
         */
        this.list = async (params = {}) => {
            return new Pager(PagedItem.PAGED_ITEM_BATCH_JOBS, (x) => this.listInternal(x), await this.listInternal(params), params);
        };
    }
    // Helper function to handle inlined generate content requests
    createInlinedGenerateContentRequest(params) {
        const body = createBatchJobParametersToMldev(this.apiClient, // Use instance apiClient
        params);
        const urlParams = body['_url'];
        const path = formatMap('{model}:batchGenerateContent', urlParams);
        const batch = body['batch'];
        const inputConfig = batch['inputConfig'];
        const requestsWrapper = inputConfig['requests'];
        const requests = requestsWrapper['requests'];
        const newRequests = [];
        for (const request of requests) {
            const requestDict = Object.assign({}, request); // Clone
            if (requestDict['systemInstruction']) {
                const systemInstructionValue = requestDict['systemInstruction'];
                delete requestDict['systemInstruction'];
                const requestContent = requestDict['request'];
                requestContent['systemInstruction'] = systemInstructionValue;
                requestDict['request'] = requestContent;
            }
            newRequests.push(requestDict);
        }
        requestsWrapper['requests'] = newRequests;
        delete body['config'];
        delete body['_url'];
        delete body['_query'];
        return { path, body };
    }
    // Helper function to handle inlined embedding requests
    createInlinedEmbedContentRequest(params) {
        const body = createEmbeddingsBatchJobParametersToMldev(this.apiClient, // Use instance apiClient
        params);
        const urlParams = body['_url'];
        const path = formatMap('{model}:asyncBatchEmbedContent', urlParams);
        const batch = body['batch'];
        const inputConfig = batch['inputConfig'];
        const requestsWrapper = inputConfig['requests'];
        const requests = requestsWrapper['requests'];
        const newRequests = [];
        delete requestsWrapper['config']; // Remove top-level config
        for (const request of requests) {
            const requestDict = Object.assign({}, request); // Clone
            const innerRequest = requestDict['request'];
            for (const key in requestDict) {
                if (key !== 'request') {
                    innerRequest[key] = requestDict[key];
                    delete requestDict[key];
                }
            }
            newRequests.push(requestDict);
        }
        requestsWrapper['requests'] = newRequests;
        delete body['config'];
        delete body['_url'];
        delete body['_query'];
        return { path, body };
    }
    // Helper function to get the first GCS URI
    getGcsUri(src) {
        if (typeof src === 'string') {
            return src.startsWith('gs://') ? src : undefined;
        }
        if (!Array.isArray(src) && src.gcsUri && src.gcsUri.length > 0) {
            return src.gcsUri[0];
        }
        return undefined;
    }
    // Helper function to get the BigQuery URI
    getBigqueryUri(src) {
        if (typeof src === 'string') {
            return src.startsWith('bq://') ? src : undefined;
        }
        if (!Array.isArray(src)) {
            return src.bigqueryUri;
        }
        return undefined;
    }
    // Function to format the destination configuration for Vertex AI
    formatDestination(src, config) {
        const newConfig = config ? Object.assign({}, config) : {};
        const timestampStr = Date.now().toString();
        if (!newConfig.displayName) {
            newConfig.displayName = `genaiBatchJob_${timestampStr}`;
        }
        if (newConfig.dest === undefined) {
            const gcsUri = this.getGcsUri(src);
            const bigqueryUri = this.getBigqueryUri(src);
            if (gcsUri) {
                if (gcsUri.endsWith('.jsonl')) {
                    // For .jsonl files, remove suffix and add /dest
                    newConfig.dest = `${gcsUri.slice(0, -6)}/dest`;
                }
                else {
                    // Fallback for other GCS URIs
                    newConfig.dest = `${gcsUri}_dest_${timestampStr}`;
                }
            }
            else if (bigqueryUri) {
                newConfig.dest = `${bigqueryUri}_dest_${timestampStr}`;
            }
            else {
                throw new Error('Unsupported source for Vertex AI: No GCS or BigQuery URI found.');
            }
        }
        return newConfig;
    }
    /**
     * Internal method to create batch job.
     *
     * @param params - The parameters for create batch job request.
     * @return The created batch job.
     *
     */
    async createInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = createBatchJobParametersToVertex(this.apiClient, params);
            path = formatMap('batchPredictionJobs', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = createBatchJobParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:batchGenerateContent', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Internal method to create batch job.
     *
     * @param params - The parameters for create batch job request.
     * @return The created batch job.
     *
     */
    async createEmbeddingsInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = createEmbeddingsBatchJobParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:asyncBatchEmbedContent', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Gets batch job configurations.
     *
     * @param params - The parameters for the get request.
     * @return The batch job.
     *
     * @example
     * ```ts
     * await ai.batches.get({name: '...'}); // The server-generated resource name.
     * ```
     */
    async get(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = getBatchJobParametersToVertex(this.apiClient, params);
            path = formatMap('batchPredictionJobs/{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = getBatchJobParametersToMldev(this.apiClient, params);
            path = formatMap('batches/{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = batchJobFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Cancels a batch job.
     *
     * @param params - The parameters for the cancel request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.batches.cancel({name: '...'}); // The server-generated resource name.
     * ```
     */
    async cancel(params) {
        var _a, _b, _c, _d;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = cancelBatchJobParametersToVertex(this.apiClient, params);
            path = formatMap('batchPredictionJobs/{name}:cancel', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            await this.apiClient.request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            });
        }
        else {
            const body = cancelBatchJobParametersToMldev(this.apiClient, params);
            path = formatMap('batches/{name}:cancel', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            await this.apiClient.request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            });
        }
    }
    async listInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = listBatchJobsParametersToVertex(params);
            path = formatMap('batchPredictionJobs', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listBatchJobsResponseFromVertex(apiResponse);
                const typedResp = new ListBatchJobsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = listBatchJobsParametersToMldev(params);
            path = formatMap('batches', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listBatchJobsResponseFromMldev(apiResponse);
                const typedResp = new ListBatchJobsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Deletes a batch job.
     *
     * @param params - The parameters for the delete request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.batches.delete({name: '...'}); // The server-generated resource name.
     * ```
     */
    async delete(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = deleteBatchJobParametersToVertex(this.apiClient, params);
            path = formatMap('batchPredictionJobs/{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteResourceJobFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = deleteBatchJobParametersToMldev(this.apiClient, params);
            path = formatMap('batches/{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteResourceJobFromMldev(apiResponse);
                return resp;
            });
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function videoMetadataToMldev$3(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToMldev$3(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToMldev$3(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToMldev$3(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToMldev$3(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToMldev$3(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToMldev$3(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToMldev$3(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToMldev$3(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToMldev$3(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToMldev$3(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function functionDeclarationToMldev$3(fromObject) {
    const toObject = {};
    const fromBehavior = getValueByPath(fromObject, ['behavior']);
    if (fromBehavior != null) {
        setValueByPath(toObject, ['behavior'], fromBehavior);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToMldev$3(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToMldev$3(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToMldev$3(fromTimeRangeFilter));
    }
    if (getValueByPath(fromObject, ['excludeDomains']) !== undefined) {
        throw new Error('excludeDomains parameter is not supported in Gemini API.');
    }
    return toObject;
}
function dynamicRetrievalConfigToMldev$3(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToMldev$3(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToMldev$3(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function urlContextToMldev$3() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToMldev$3(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToMldev$3(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToMldev$3(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    if (getValueByPath(fromObject, ['retrieval']) !== undefined) {
        throw new Error('retrieval parameter is not supported in Gemini API.');
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToMldev$3(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToMldev$3(fromGoogleSearchRetrieval));
    }
    if (getValueByPath(fromObject, ['enterpriseWebSearch']) !== undefined) {
        throw new Error('enterpriseWebSearch parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['googleMaps']) !== undefined) {
        throw new Error('googleMaps parameter is not supported in Gemini API.');
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToMldev$3());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToMldev$3(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function functionCallingConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromAllowedFunctionNames = getValueByPath(fromObject, [
        'allowedFunctionNames',
    ]);
    if (fromAllowedFunctionNames != null) {
        setValueByPath(toObject, ['allowedFunctionNames'], fromAllowedFunctionNames);
    }
    return toObject;
}
function latLngToMldev$1(fromObject) {
    const toObject = {};
    const fromLatitude = getValueByPath(fromObject, ['latitude']);
    if (fromLatitude != null) {
        setValueByPath(toObject, ['latitude'], fromLatitude);
    }
    const fromLongitude = getValueByPath(fromObject, ['longitude']);
    if (fromLongitude != null) {
        setValueByPath(toObject, ['longitude'], fromLongitude);
    }
    return toObject;
}
function retrievalConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromLatLng = getValueByPath(fromObject, ['latLng']);
    if (fromLatLng != null) {
        setValueByPath(toObject, ['latLng'], latLngToMldev$1(fromLatLng));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function toolConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromFunctionCallingConfig = getValueByPath(fromObject, [
        'functionCallingConfig',
    ]);
    if (fromFunctionCallingConfig != null) {
        setValueByPath(toObject, ['functionCallingConfig'], functionCallingConfigToMldev$1(fromFunctionCallingConfig));
    }
    const fromRetrievalConfig = getValueByPath(fromObject, [
        'retrievalConfig',
    ]);
    if (fromRetrievalConfig != null) {
        setValueByPath(toObject, ['retrievalConfig'], retrievalConfigToMldev$1(fromRetrievalConfig));
    }
    return toObject;
}
function createCachedContentConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromTtl = getValueByPath(fromObject, ['ttl']);
    if (parentObject !== undefined && fromTtl != null) {
        setValueByPath(parentObject, ['ttl'], fromTtl);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (parentObject !== undefined && fromExpireTime != null) {
        setValueByPath(parentObject, ['expireTime'], fromExpireTime);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromDisplayName);
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (parentObject !== undefined && fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToMldev$3(item);
            });
        }
        setValueByPath(parentObject, ['contents'], transformedList);
    }
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToMldev$3(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = fromTools;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToMldev$3(item);
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromToolConfig = getValueByPath(fromObject, ['toolConfig']);
    if (parentObject !== undefined && fromToolConfig != null) {
        setValueByPath(parentObject, ['toolConfig'], toolConfigToMldev$1(fromToolConfig));
    }
    if (getValueByPath(fromObject, ['kmsKeyName']) !== undefined) {
        throw new Error('kmsKeyName parameter is not supported in Gemini API.');
    }
    return toObject;
}
function createCachedContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], tCachesModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createCachedContentConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function getCachedContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function deleteCachedContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function updateCachedContentConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromTtl = getValueByPath(fromObject, ['ttl']);
    if (parentObject !== undefined && fromTtl != null) {
        setValueByPath(parentObject, ['ttl'], fromTtl);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (parentObject !== undefined && fromExpireTime != null) {
        setValueByPath(parentObject, ['expireTime'], fromExpireTime);
    }
    return toObject;
}
function updateCachedContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], updateCachedContentConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function listCachedContentsConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    return toObject;
}
function listCachedContentsParametersToMldev(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listCachedContentsConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function videoMetadataToVertex$2(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToVertex$2(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToVertex$2(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToVertex$2(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToVertex$2(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToVertex$2(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToVertex$2(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToVertex$2(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToVertex$2(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToVertex$2(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToVertex$2(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function functionDeclarationToVertex$2(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['behavior']) !== undefined) {
        throw new Error('behavior parameter is not supported in Vertex AI.');
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToVertex$2(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToVertex$2(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToVertex$2(fromTimeRangeFilter));
    }
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function dynamicRetrievalConfigToVertex$2(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToVertex$2(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToVertex$2(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function enterpriseWebSearchToVertex$2(fromObject) {
    const toObject = {};
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function apiKeyConfigToVertex$2(fromObject) {
    const toObject = {};
    const fromApiKeyString = getValueByPath(fromObject, ['apiKeyString']);
    if (fromApiKeyString != null) {
        setValueByPath(toObject, ['apiKeyString'], fromApiKeyString);
    }
    return toObject;
}
function authConfigToVertex$2(fromObject) {
    const toObject = {};
    const fromApiKeyConfig = getValueByPath(fromObject, ['apiKeyConfig']);
    if (fromApiKeyConfig != null) {
        setValueByPath(toObject, ['apiKeyConfig'], apiKeyConfigToVertex$2(fromApiKeyConfig));
    }
    const fromAuthType = getValueByPath(fromObject, ['authType']);
    if (fromAuthType != null) {
        setValueByPath(toObject, ['authType'], fromAuthType);
    }
    const fromGoogleServiceAccountConfig = getValueByPath(fromObject, [
        'googleServiceAccountConfig',
    ]);
    if (fromGoogleServiceAccountConfig != null) {
        setValueByPath(toObject, ['googleServiceAccountConfig'], fromGoogleServiceAccountConfig);
    }
    const fromHttpBasicAuthConfig = getValueByPath(fromObject, [
        'httpBasicAuthConfig',
    ]);
    if (fromHttpBasicAuthConfig != null) {
        setValueByPath(toObject, ['httpBasicAuthConfig'], fromHttpBasicAuthConfig);
    }
    const fromOauthConfig = getValueByPath(fromObject, ['oauthConfig']);
    if (fromOauthConfig != null) {
        setValueByPath(toObject, ['oauthConfig'], fromOauthConfig);
    }
    const fromOidcConfig = getValueByPath(fromObject, ['oidcConfig']);
    if (fromOidcConfig != null) {
        setValueByPath(toObject, ['oidcConfig'], fromOidcConfig);
    }
    return toObject;
}
function googleMapsToVertex$2(fromObject) {
    const toObject = {};
    const fromAuthConfig = getValueByPath(fromObject, ['authConfig']);
    if (fromAuthConfig != null) {
        setValueByPath(toObject, ['authConfig'], authConfigToVertex$2(fromAuthConfig));
    }
    return toObject;
}
function urlContextToVertex$2() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToVertex$2(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToVertex$2(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToVertex$2(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    const fromRetrieval = getValueByPath(fromObject, ['retrieval']);
    if (fromRetrieval != null) {
        setValueByPath(toObject, ['retrieval'], fromRetrieval);
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToVertex$2(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToVertex$2(fromGoogleSearchRetrieval));
    }
    const fromEnterpriseWebSearch = getValueByPath(fromObject, [
        'enterpriseWebSearch',
    ]);
    if (fromEnterpriseWebSearch != null) {
        setValueByPath(toObject, ['enterpriseWebSearch'], enterpriseWebSearchToVertex$2(fromEnterpriseWebSearch));
    }
    const fromGoogleMaps = getValueByPath(fromObject, ['googleMaps']);
    if (fromGoogleMaps != null) {
        setValueByPath(toObject, ['googleMaps'], googleMapsToVertex$2(fromGoogleMaps));
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToVertex$2());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToVertex$2(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function functionCallingConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromAllowedFunctionNames = getValueByPath(fromObject, [
        'allowedFunctionNames',
    ]);
    if (fromAllowedFunctionNames != null) {
        setValueByPath(toObject, ['allowedFunctionNames'], fromAllowedFunctionNames);
    }
    return toObject;
}
function latLngToVertex$1(fromObject) {
    const toObject = {};
    const fromLatitude = getValueByPath(fromObject, ['latitude']);
    if (fromLatitude != null) {
        setValueByPath(toObject, ['latitude'], fromLatitude);
    }
    const fromLongitude = getValueByPath(fromObject, ['longitude']);
    if (fromLongitude != null) {
        setValueByPath(toObject, ['longitude'], fromLongitude);
    }
    return toObject;
}
function retrievalConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromLatLng = getValueByPath(fromObject, ['latLng']);
    if (fromLatLng != null) {
        setValueByPath(toObject, ['latLng'], latLngToVertex$1(fromLatLng));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function toolConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromFunctionCallingConfig = getValueByPath(fromObject, [
        'functionCallingConfig',
    ]);
    if (fromFunctionCallingConfig != null) {
        setValueByPath(toObject, ['functionCallingConfig'], functionCallingConfigToVertex$1(fromFunctionCallingConfig));
    }
    const fromRetrievalConfig = getValueByPath(fromObject, [
        'retrievalConfig',
    ]);
    if (fromRetrievalConfig != null) {
        setValueByPath(toObject, ['retrievalConfig'], retrievalConfigToVertex$1(fromRetrievalConfig));
    }
    return toObject;
}
function createCachedContentConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromTtl = getValueByPath(fromObject, ['ttl']);
    if (parentObject !== undefined && fromTtl != null) {
        setValueByPath(parentObject, ['ttl'], fromTtl);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (parentObject !== undefined && fromExpireTime != null) {
        setValueByPath(parentObject, ['expireTime'], fromExpireTime);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromDisplayName);
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (parentObject !== undefined && fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToVertex$2(item);
            });
        }
        setValueByPath(parentObject, ['contents'], transformedList);
    }
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToVertex$2(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = fromTools;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToVertex$2(item);
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromToolConfig = getValueByPath(fromObject, ['toolConfig']);
    if (parentObject !== undefined && fromToolConfig != null) {
        setValueByPath(parentObject, ['toolConfig'], toolConfigToVertex$1(fromToolConfig));
    }
    const fromKmsKeyName = getValueByPath(fromObject, ['kmsKeyName']);
    if (parentObject !== undefined && fromKmsKeyName != null) {
        setValueByPath(parentObject, ['encryption_spec', 'kmsKeyName'], fromKmsKeyName);
    }
    return toObject;
}
function createCachedContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], tCachesModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createCachedContentConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function getCachedContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function deleteCachedContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function updateCachedContentConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromTtl = getValueByPath(fromObject, ['ttl']);
    if (parentObject !== undefined && fromTtl != null) {
        setValueByPath(parentObject, ['ttl'], fromTtl);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (parentObject !== undefined && fromExpireTime != null) {
        setValueByPath(parentObject, ['expireTime'], fromExpireTime);
    }
    return toObject;
}
function updateCachedContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], tCachedContentName(apiClient, fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], updateCachedContentConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function listCachedContentsConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    return toObject;
}
function listCachedContentsParametersToVertex(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listCachedContentsConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function cachedContentFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (fromExpireTime != null) {
        setValueByPath(toObject, ['expireTime'], fromExpireTime);
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], fromUsageMetadata);
    }
    return toObject;
}
function deleteCachedContentResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}
function listCachedContentsResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromCachedContents = getValueByPath(fromObject, [
        'cachedContents',
    ]);
    if (fromCachedContents != null) {
        let transformedList = fromCachedContents;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return cachedContentFromMldev(item);
            });
        }
        setValueByPath(toObject, ['cachedContents'], transformedList);
    }
    return toObject;
}
function cachedContentFromVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (fromExpireTime != null) {
        setValueByPath(toObject, ['expireTime'], fromExpireTime);
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], fromUsageMetadata);
    }
    return toObject;
}
function deleteCachedContentResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}
function listCachedContentsResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromCachedContents = getValueByPath(fromObject, [
        'cachedContents',
    ]);
    if (fromCachedContents != null) {
        let transformedList = fromCachedContents;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return cachedContentFromVertex(item);
            });
        }
        setValueByPath(toObject, ['cachedContents'], transformedList);
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Caches extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
        /**
         * Lists cached content configurations.
         *
         * @param params - The parameters for the list request.
         * @return The paginated results of the list of cached contents.
         *
         * @example
         * ```ts
         * const cachedContents = await ai.caches.list({config: {'pageSize': 2}});
         * for await (const cachedContent of cachedContents) {
         *   console.log(cachedContent);
         * }
         * ```
         */
        this.list = async (params = {}) => {
            return new Pager(PagedItem.PAGED_ITEM_CACHED_CONTENTS, (x) => this.listInternal(x), await this.listInternal(params), params);
        };
    }
    /**
     * Creates a cached contents resource.
     *
     * @remarks
     * Context caching is only supported for specific models. See [Gemini
     * Developer API reference](https://ai.google.dev/gemini-api/docs/caching?lang=node/context-cac)
     * and [Vertex AI reference](https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview#supported_models)
     * for more information.
     *
     * @param params - The parameters for the create request.
     * @return The created cached content.
     *
     * @example
     * ```ts
     * const contents = ...; // Initialize the content to cache.
     * const response = await ai.caches.create({
     *   model: 'gemini-2.0-flash-001',
     *   config: {
     *    'contents': contents,
     *    'displayName': 'test cache',
     *    'systemInstruction': 'What is the sum of the two pdfs?',
     *    'ttl': '86400s',
     *  }
     * });
     * ```
     */
    async create(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = createCachedContentParametersToVertex(this.apiClient, params);
            path = formatMap('cachedContents', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = createCachedContentParametersToMldev(this.apiClient, params);
            path = formatMap('cachedContents', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Gets cached content configurations.
     *
     * @param params - The parameters for the get request.
     * @return The cached content.
     *
     * @example
     * ```ts
     * await ai.caches.get({name: '...'}); // The server-generated resource name.
     * ```
     */
    async get(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = getCachedContentParametersToVertex(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = getCachedContentParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Deletes cached content.
     *
     * @param params - The parameters for the delete request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.caches.delete({name: '...'}); // The server-generated resource name.
     * ```
     */
    async delete(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = deleteCachedContentParametersToVertex(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteCachedContentResponseFromVertex(apiResponse);
                const typedResp = new DeleteCachedContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = deleteCachedContentParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteCachedContentResponseFromMldev(apiResponse);
                const typedResp = new DeleteCachedContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Updates cached content configurations.
     *
     * @param params - The parameters for the update request.
     * @return The updated cached content.
     *
     * @example
     * ```ts
     * const response = await ai.caches.update({
     *   name: '...',  // The server-generated resource name.
     *   config: {'ttl': '7600s'}
     * });
     * ```
     */
    async update(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = updateCachedContentParametersToVertex(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'PATCH',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = updateCachedContentParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'PATCH',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = cachedContentFromMldev(apiResponse);
                return resp;
            });
        }
    }
    async listInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = listCachedContentsParametersToVertex(params);
            path = formatMap('cachedContents', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listCachedContentsResponseFromVertex(apiResponse);
                const typedResp = new ListCachedContentsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = listCachedContentsParametersToMldev(params);
            path = formatMap('cachedContents', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listCachedContentsResponseFromMldev(apiResponse);
                const typedResp = new ListCachedContentsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Returns true if the response is valid, false otherwise.
 */
function isValidResponse(response) {
    var _a;
    if (response.candidates == undefined || response.candidates.length === 0) {
        return false;
    }
    const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
    if (content === undefined) {
        return false;
    }
    return isValidContent(content);
}
function isValidContent(content) {
    if (content.parts === undefined || content.parts.length === 0) {
        return false;
    }
    for (const part of content.parts) {
        if (part === undefined || Object.keys(part).length === 0) {
            return false;
        }
    }
    return true;
}
/**
 * Validates the history contains the correct roles.
 *
 * @throws Error if the history does not start with a user turn.
 * @throws Error if the history contains an invalid role.
 */
function validateHistory(history) {
    // Empty history is valid.
    if (history.length === 0) {
        return;
    }
    for (const content of history) {
        if (content.role !== 'user' && content.role !== 'model') {
            throw new Error(`Role must be user or model, but got ${content.role}.`);
        }
    }
}
/**
 * Extracts the curated (valid) history from a comprehensive history.
 *
 * @remarks
 * The model may sometimes generate invalid or empty contents(e.g., due to safty
 * filters or recitation). Extracting valid turns from the history
 * ensures that subsequent requests could be accpeted by the model.
 */
function extractCuratedHistory(comprehensiveHistory) {
    if (comprehensiveHistory === undefined || comprehensiveHistory.length === 0) {
        return [];
    }
    const curatedHistory = [];
    const length = comprehensiveHistory.length;
    let i = 0;
    while (i < length) {
        if (comprehensiveHistory[i].role === 'user') {
            curatedHistory.push(comprehensiveHistory[i]);
            i++;
        }
        else {
            const modelOutput = [];
            let isValid = true;
            while (i < length && comprehensiveHistory[i].role === 'model') {
                modelOutput.push(comprehensiveHistory[i]);
                if (isValid && !isValidContent(comprehensiveHistory[i])) {
                    isValid = false;
                }
                i++;
            }
            if (isValid) {
                curatedHistory.push(...modelOutput);
            }
            else {
                // Remove the last user input when model content is invalid.
                curatedHistory.pop();
            }
        }
    }
    return curatedHistory;
}
/**
 * A utility class to create a chat session.
 */
class Chats {
    constructor(modelsModule, apiClient) {
        this.modelsModule = modelsModule;
        this.apiClient = apiClient;
    }
    /**
     * Creates a new chat session.
     *
     * @remarks
     * The config in the params will be used for all requests within the chat
     * session unless overridden by a per-request `config` in
     * @see {@link types.SendMessageParameters#config}.
     *
     * @param params - Parameters for creating a chat session.
     * @returns A new chat session.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({
     *   model: 'gemini-2.0-flash'
     *   config: {
     *     temperature: 0.5,
     *     maxOutputTokens: 1024,
     *   }
     * });
     * ```
     */
    create(params) {
        return new Chat(this.apiClient, this.modelsModule, params.model, params.config, 
        // Deep copy the history to avoid mutating the history outside of the
        // chat session.
        structuredClone(params.history));
    }
}
/**
 * Chat session that enables sending messages to the model with previous
 * conversation context.
 *
 * @remarks
 * The session maintains all the turns between user and model.
 */
class Chat {
    constructor(apiClient, modelsModule, model, config = {}, history = []) {
        this.apiClient = apiClient;
        this.modelsModule = modelsModule;
        this.model = model;
        this.config = config;
        this.history = history;
        // A promise to represent the current state of the message being sent to the
        // model.
        this.sendPromise = Promise.resolve();
        validateHistory(history);
    }
    /**
     * Sends a message to the model and returns the response.
     *
     * @remarks
     * This method will wait for the previous message to be processed before
     * sending the next message.
     *
     * @see {@link Chat#sendMessageStream} for streaming method.
     * @param params - parameters for sending messages within a chat session.
     * @returns The model's response.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
     * const response = await chat.sendMessage({
     *   message: 'Why is the sky blue?'
     * });
     * console.log(response.text);
     * ```
     */
    async sendMessage(params) {
        var _a;
        await this.sendPromise;
        const inputContent = tContent(params.message);
        const responsePromise = this.modelsModule.generateContent({
            model: this.model,
            contents: this.getHistory(true).concat(inputContent),
            config: (_a = params.config) !== null && _a !== void 0 ? _a : this.config,
        });
        this.sendPromise = (async () => {
            var _a, _b, _c;
            const response = await responsePromise;
            const outputContent = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content;
            // Because the AFC input contains the entire curated chat history in
            // addition to the new user input, we need to truncate the AFC history
            // to deduplicate the existing chat history.
            const fullAutomaticFunctionCallingHistory = response.automaticFunctionCallingHistory;
            const index = this.getHistory(true).length;
            let automaticFunctionCallingHistory = [];
            if (fullAutomaticFunctionCallingHistory != null) {
                automaticFunctionCallingHistory =
                    (_c = fullAutomaticFunctionCallingHistory.slice(index)) !== null && _c !== void 0 ? _c : [];
            }
            const modelOutput = outputContent ? [outputContent] : [];
            this.recordHistory(inputContent, modelOutput, automaticFunctionCallingHistory);
            return;
        })();
        await this.sendPromise.catch(() => {
            // Resets sendPromise to avoid subsequent calls failing
            this.sendPromise = Promise.resolve();
        });
        return responsePromise;
    }
    /**
     * Sends a message to the model and returns the response in chunks.
     *
     * @remarks
     * This method will wait for the previous message to be processed before
     * sending the next message.
     *
     * @see {@link Chat#sendMessage} for non-streaming method.
     * @param params - parameters for sending the message.
     * @return The model's response.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
     * const response = await chat.sendMessageStream({
     *   message: 'Why is the sky blue?'
     * });
     * for await (const chunk of response) {
     *   console.log(chunk.text);
     * }
     * ```
     */
    async sendMessageStream(params) {
        var _a;
        await this.sendPromise;
        const inputContent = tContent(params.message);
        const streamResponse = this.modelsModule.generateContentStream({
            model: this.model,
            contents: this.getHistory(true).concat(inputContent),
            config: (_a = params.config) !== null && _a !== void 0 ? _a : this.config,
        });
        // Resolve the internal tracking of send completion promise - `sendPromise`
        // for both success and failure response. The actual failure is still
        // propagated by the `await streamResponse`.
        this.sendPromise = streamResponse
            .then(() => undefined)
            .catch(() => undefined);
        const response = await streamResponse;
        const result = this.processStreamResponse(response, inputContent);
        return result;
    }
    /**
     * Returns the chat history.
     *
     * @remarks
     * The history is a list of contents alternating between user and model.
     *
     * There are two types of history:
     * - The `curated history` contains only the valid turns between user and
     * model, which will be included in the subsequent requests sent to the model.
     * - The `comprehensive history` contains all turns, including invalid or
     *   empty model outputs, providing a complete record of the history.
     *
     * The history is updated after receiving the response from the model,
     * for streaming response, it means receiving the last chunk of the response.
     *
     * The `comprehensive history` is returned by default. To get the `curated
     * history`, set the `curated` parameter to `true`.
     *
     * @param curated - whether to return the curated history or the comprehensive
     *     history.
     * @return History contents alternating between user and model for the entire
     *     chat session.
     */
    getHistory(curated = false) {
        const history = curated
            ? extractCuratedHistory(this.history)
            : this.history;
        // Deep copy the history to avoid mutating the history outside of the
        // chat session.
        return structuredClone(history);
    }
    processStreamResponse(streamResponse, inputContent) {
        var _a, _b;
        return __asyncGenerator(this, arguments, function* processStreamResponse_1() {
            var _c, e_1, _d, _e;
            const outputContent = [];
            try {
                for (var _f = true, streamResponse_1 = __asyncValues(streamResponse), streamResponse_1_1; streamResponse_1_1 = yield __await(streamResponse_1.next()), _c = streamResponse_1_1.done, !_c; _f = true) {
                    _e = streamResponse_1_1.value;
                    _f = false;
                    const chunk = _e;
                    if (isValidResponse(chunk)) {
                        const content = (_b = (_a = chunk.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content;
                        if (content !== undefined) {
                            outputContent.push(content);
                        }
                    }
                    yield yield __await(chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_f && !_c && (_d = streamResponse_1.return)) yield __await(_d.call(streamResponse_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.recordHistory(inputContent, outputContent);
        });
    }
    recordHistory(userInput, modelOutput, automaticFunctionCallingHistory) {
        let outputContents = [];
        if (modelOutput.length > 0 &&
            modelOutput.every((content) => content.role !== undefined)) {
            outputContents = modelOutput;
        }
        else {
            // Appends an empty content when model returns empty response, so that the
            // history is always alternating between user and model.
            outputContents.push({
                role: 'model',
                parts: [],
            });
        }
        if (automaticFunctionCallingHistory &&
            automaticFunctionCallingHistory.length > 0) {
            this.history.push(...extractCuratedHistory(automaticFunctionCallingHistory));
        }
        else {
            this.history.push(userInput);
        }
        this.history.push(...outputContents);
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * API errors raised by the GenAI API.
 */
class ApiError extends Error {
    constructor(options) {
        super(options.message);
        this.name = 'ApiError';
        this.status = options.status;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// Code generated by the Google Gen AI SDK generator DO NOT EDIT.
function listFilesConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    return toObject;
}
function listFilesParametersToMldev(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listFilesConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function fileStatusToMldev(fromObject) {
    const toObject = {};
    const fromDetails = getValueByPath(fromObject, ['details']);
    if (fromDetails != null) {
        setValueByPath(toObject, ['details'], fromDetails);
    }
    const fromMessage = getValueByPath(fromObject, ['message']);
    if (fromMessage != null) {
        setValueByPath(toObject, ['message'], fromMessage);
    }
    const fromCode = getValueByPath(fromObject, ['code']);
    if (fromCode != null) {
        setValueByPath(toObject, ['code'], fromCode);
    }
    return toObject;
}
function fileToMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    const fromSizeBytes = getValueByPath(fromObject, ['sizeBytes']);
    if (fromSizeBytes != null) {
        setValueByPath(toObject, ['sizeBytes'], fromSizeBytes);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromExpirationTime = getValueByPath(fromObject, [
        'expirationTime',
    ]);
    if (fromExpirationTime != null) {
        setValueByPath(toObject, ['expirationTime'], fromExpirationTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromSha256Hash = getValueByPath(fromObject, ['sha256Hash']);
    if (fromSha256Hash != null) {
        setValueByPath(toObject, ['sha256Hash'], fromSha256Hash);
    }
    const fromUri = getValueByPath(fromObject, ['uri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromDownloadUri = getValueByPath(fromObject, ['downloadUri']);
    if (fromDownloadUri != null) {
        setValueByPath(toObject, ['downloadUri'], fromDownloadUri);
    }
    const fromState = getValueByPath(fromObject, ['state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], fromState);
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['source'], fromSource);
    }
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], fromVideoMetadata);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fileStatusToMldev(fromError));
    }
    return toObject;
}
function createFileParametersToMldev(fromObject) {
    const toObject = {};
    const fromFile = getValueByPath(fromObject, ['file']);
    if (fromFile != null) {
        setValueByPath(toObject, ['file'], fileToMldev(fromFile));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function getFileParametersToMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'file'], tFileName(fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function deleteFileParametersToMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'file'], tFileName(fromName));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function fileStatusFromMldev(fromObject) {
    const toObject = {};
    const fromDetails = getValueByPath(fromObject, ['details']);
    if (fromDetails != null) {
        setValueByPath(toObject, ['details'], fromDetails);
    }
    const fromMessage = getValueByPath(fromObject, ['message']);
    if (fromMessage != null) {
        setValueByPath(toObject, ['message'], fromMessage);
    }
    const fromCode = getValueByPath(fromObject, ['code']);
    if (fromCode != null) {
        setValueByPath(toObject, ['code'], fromCode);
    }
    return toObject;
}
function fileFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    const fromSizeBytes = getValueByPath(fromObject, ['sizeBytes']);
    if (fromSizeBytes != null) {
        setValueByPath(toObject, ['sizeBytes'], fromSizeBytes);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromExpirationTime = getValueByPath(fromObject, [
        'expirationTime',
    ]);
    if (fromExpirationTime != null) {
        setValueByPath(toObject, ['expirationTime'], fromExpirationTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromSha256Hash = getValueByPath(fromObject, ['sha256Hash']);
    if (fromSha256Hash != null) {
        setValueByPath(toObject, ['sha256Hash'], fromSha256Hash);
    }
    const fromUri = getValueByPath(fromObject, ['uri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromDownloadUri = getValueByPath(fromObject, ['downloadUri']);
    if (fromDownloadUri != null) {
        setValueByPath(toObject, ['downloadUri'], fromDownloadUri);
    }
    const fromState = getValueByPath(fromObject, ['state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], fromState);
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['source'], fromSource);
    }
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], fromVideoMetadata);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fileStatusFromMldev(fromError));
    }
    return toObject;
}
function listFilesResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromFiles = getValueByPath(fromObject, ['files']);
    if (fromFiles != null) {
        let transformedList = fromFiles;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return fileFromMldev(item);
            });
        }
        setValueByPath(toObject, ['files'], transformedList);
    }
    return toObject;
}
function createFileResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}
function deleteFileResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Files extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
        /**
         * Lists all current project files from the service.
         *
         * @param params - The parameters for the list request
         * @return The paginated results of the list of files
         *
         * @example
         * The following code prints the names of all files from the service, the
         * size of each page is 10.
         *
         * ```ts
         * const listResponse = await ai.files.list({config: {'pageSize': 10}});
         * for await (const file of listResponse) {
         *   console.log(file.name);
         * }
         * ```
         */
        this.list = async (params = {}) => {
            return new Pager(PagedItem.PAGED_ITEM_FILES, (x) => this.listInternal(x), await this.listInternal(params), params);
        };
    }
    /**
     * Uploads a file asynchronously to the Gemini API.
     * This method is not available in Vertex AI.
     * Supported upload sources:
     * - Node.js: File path (string) or Blob object.
     * - Browser: Blob object (e.g., File).
     *
     * @remarks
     * The `mimeType` can be specified in the `config` parameter. If omitted:
     *  - For file path (string) inputs, the `mimeType` will be inferred from the
     *     file extension.
     *  - For Blob object inputs, the `mimeType` will be set to the Blob's `type`
     *     property.
     * Somex eamples for file extension to mimeType mapping:
     * .txt -> text/plain
     * .json -> application/json
     * .jpg  -> image/jpeg
     * .png -> image/png
     * .mp3 -> audio/mpeg
     * .mp4 -> video/mp4
     *
     * This section can contain multiple paragraphs and code examples.
     *
     * @param params - Optional parameters specified in the
     *        `types.UploadFileParameters` interface.
     *         @see {@link types.UploadFileParameters#config} for the optional
     *         config in the parameters.
     * @return A promise that resolves to a `types.File` object.
     * @throws An error if called on a Vertex AI client.
     * @throws An error if the `mimeType` is not provided and can not be inferred,
     * the `mimeType` can be provided in the `params.config` parameter.
     * @throws An error occurs if a suitable upload location cannot be established.
     *
     * @example
     * The following code uploads a file to Gemini API.
     *
     * ```ts
     * const file = await ai.files.upload({file: 'file.txt', config: {
     *   mimeType: 'text/plain',
     * }});
     * console.log(file.name);
     * ```
     */
    async upload(params) {
        if (this.apiClient.isVertexAI()) {
            throw new Error('Vertex AI does not support uploading files. You can share files through a GCS bucket.');
        }
        return this.apiClient
            .uploadFile(params.file, params.config)
            .then((response) => {
            const file = fileFromMldev(response);
            return file;
        });
    }
    /**
     * Downloads a remotely stored file asynchronously to a location specified in
     * the `params` object. This method only works on Node environment, to
     * download files in the browser, use a browser compliant method like an <a>
     * tag.
     *
     * @param params - The parameters for the download request.
     *
     * @example
     * The following code downloads an example file named "files/mehozpxf877d" as
     * "file.txt".
     *
     * ```ts
     * await ai.files.download({file: file.name, downloadPath: 'file.txt'});
     * ```
     */
    async download(params) {
        await this.apiClient.downloadFile(params);
    }
    async listInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = listFilesParametersToMldev(params);
            path = formatMap('files', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listFilesResponseFromMldev(apiResponse);
                const typedResp = new ListFilesResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    async createInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = createFileParametersToMldev(params);
            path = formatMap('upload/v1beta/files', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = createFileResponseFromMldev(apiResponse);
                const typedResp = new CreateFileResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Retrieves the file information from the service.
     *
     * @param params - The parameters for the get request
     * @return The Promise that resolves to the types.File object requested.
     *
     * @example
     * ```ts
     * const config: GetFileParameters = {
     *   name: fileName,
     * };
     * file = await ai.files.get(config);
     * console.log(file.name);
     * ```
     */
    async get(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = getFileParametersToMldev(params);
            path = formatMap('files/{file}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = fileFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Deletes a remotely stored file.
     *
     * @param params - The parameters for the delete request.
     * @return The DeleteFileResponse, the response for the delete method.
     *
     * @example
     * The following code deletes an example file named "files/mehozpxf877d".
     *
     * ```ts
     * await ai.files.delete({name: file.name});
     * ```
     */
    async delete(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = deleteFileParametersToMldev(params);
            path = formatMap('files/{file}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteFileResponseFromMldev(apiResponse);
                const typedResp = new DeleteFileResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function prebuiltVoiceConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToMldev$2(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speakerVoiceConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromSpeaker = getValueByPath(fromObject, ['speaker']);
    if (fromSpeaker != null) {
        setValueByPath(toObject, ['speaker'], fromSpeaker);
    }
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$2(fromVoiceConfig));
    }
    return toObject;
}
function multiSpeakerVoiceConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromSpeakerVoiceConfigs = getValueByPath(fromObject, [
        'speakerVoiceConfigs',
    ]);
    if (fromSpeakerVoiceConfigs != null) {
        let transformedList = fromSpeakerVoiceConfigs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return speakerVoiceConfigToMldev$2(item);
            });
        }
        setValueByPath(toObject, ['speakerVoiceConfigs'], transformedList);
    }
    return toObject;
}
function speechConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$2(fromVoiceConfig));
    }
    const fromMultiSpeakerVoiceConfig = getValueByPath(fromObject, [
        'multiSpeakerVoiceConfig',
    ]);
    if (fromMultiSpeakerVoiceConfig != null) {
        setValueByPath(toObject, ['multiSpeakerVoiceConfig'], multiSpeakerVoiceConfigToMldev$2(fromMultiSpeakerVoiceConfig));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function videoMetadataToMldev$2(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToMldev$2(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToMldev$2(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToMldev$2(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToMldev$2(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToMldev$2(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToMldev$2(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToMldev$2(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToMldev$2(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToMldev$2(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToMldev$2(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function functionDeclarationToMldev$2(fromObject) {
    const toObject = {};
    const fromBehavior = getValueByPath(fromObject, ['behavior']);
    if (fromBehavior != null) {
        setValueByPath(toObject, ['behavior'], fromBehavior);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToMldev$2(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToMldev$2(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToMldev$2(fromTimeRangeFilter));
    }
    if (getValueByPath(fromObject, ['excludeDomains']) !== undefined) {
        throw new Error('excludeDomains parameter is not supported in Gemini API.');
    }
    return toObject;
}
function dynamicRetrievalConfigToMldev$2(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToMldev$2(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToMldev$2(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function urlContextToMldev$2() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToMldev$2(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToMldev$2(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToMldev$2(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    if (getValueByPath(fromObject, ['retrieval']) !== undefined) {
        throw new Error('retrieval parameter is not supported in Gemini API.');
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToMldev$2(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToMldev$2(fromGoogleSearchRetrieval));
    }
    if (getValueByPath(fromObject, ['enterpriseWebSearch']) !== undefined) {
        throw new Error('enterpriseWebSearch parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['googleMaps']) !== undefined) {
        throw new Error('googleMaps parameter is not supported in Gemini API.');
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToMldev$2());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToMldev$2(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function sessionResumptionConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromHandle = getValueByPath(fromObject, ['handle']);
    if (fromHandle != null) {
        setValueByPath(toObject, ['handle'], fromHandle);
    }
    if (getValueByPath(fromObject, ['transparent']) !== undefined) {
        throw new Error('transparent parameter is not supported in Gemini API.');
    }
    return toObject;
}
function audioTranscriptionConfigToMldev$1() {
    const toObject = {};
    return toObject;
}
function automaticActivityDetectionToMldev$1(fromObject) {
    const toObject = {};
    const fromDisabled = getValueByPath(fromObject, ['disabled']);
    if (fromDisabled != null) {
        setValueByPath(toObject, ['disabled'], fromDisabled);
    }
    const fromStartOfSpeechSensitivity = getValueByPath(fromObject, [
        'startOfSpeechSensitivity',
    ]);
    if (fromStartOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['startOfSpeechSensitivity'], fromStartOfSpeechSensitivity);
    }
    const fromEndOfSpeechSensitivity = getValueByPath(fromObject, [
        'endOfSpeechSensitivity',
    ]);
    if (fromEndOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['endOfSpeechSensitivity'], fromEndOfSpeechSensitivity);
    }
    const fromPrefixPaddingMs = getValueByPath(fromObject, [
        'prefixPaddingMs',
    ]);
    if (fromPrefixPaddingMs != null) {
        setValueByPath(toObject, ['prefixPaddingMs'], fromPrefixPaddingMs);
    }
    const fromSilenceDurationMs = getValueByPath(fromObject, [
        'silenceDurationMs',
    ]);
    if (fromSilenceDurationMs != null) {
        setValueByPath(toObject, ['silenceDurationMs'], fromSilenceDurationMs);
    }
    return toObject;
}
function realtimeInputConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromAutomaticActivityDetection = getValueByPath(fromObject, [
        'automaticActivityDetection',
    ]);
    if (fromAutomaticActivityDetection != null) {
        setValueByPath(toObject, ['automaticActivityDetection'], automaticActivityDetectionToMldev$1(fromAutomaticActivityDetection));
    }
    const fromActivityHandling = getValueByPath(fromObject, [
        'activityHandling',
    ]);
    if (fromActivityHandling != null) {
        setValueByPath(toObject, ['activityHandling'], fromActivityHandling);
    }
    const fromTurnCoverage = getValueByPath(fromObject, ['turnCoverage']);
    if (fromTurnCoverage != null) {
        setValueByPath(toObject, ['turnCoverage'], fromTurnCoverage);
    }
    return toObject;
}
function slidingWindowToMldev$1(fromObject) {
    const toObject = {};
    const fromTargetTokens = getValueByPath(fromObject, ['targetTokens']);
    if (fromTargetTokens != null) {
        setValueByPath(toObject, ['targetTokens'], fromTargetTokens);
    }
    return toObject;
}
function contextWindowCompressionConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromTriggerTokens = getValueByPath(fromObject, [
        'triggerTokens',
    ]);
    if (fromTriggerTokens != null) {
        setValueByPath(toObject, ['triggerTokens'], fromTriggerTokens);
    }
    const fromSlidingWindow = getValueByPath(fromObject, [
        'slidingWindow',
    ]);
    if (fromSlidingWindow != null) {
        setValueByPath(toObject, ['slidingWindow'], slidingWindowToMldev$1(fromSlidingWindow));
    }
    return toObject;
}
function proactivityConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromProactiveAudio = getValueByPath(fromObject, [
        'proactiveAudio',
    ]);
    if (fromProactiveAudio != null) {
        setValueByPath(toObject, ['proactiveAudio'], fromProactiveAudio);
    }
    return toObject;
}
function liveConnectConfigToMldev$1(fromObject, parentObject) {
    const toObject = {};
    const fromGenerationConfig = getValueByPath(fromObject, [
        'generationConfig',
    ]);
    if (parentObject !== undefined && fromGenerationConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig'], fromGenerationConfig);
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (parentObject !== undefined && fromResponseModalities != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'responseModalities'], fromResponseModalities);
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (parentObject !== undefined && fromTemperature != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (parentObject !== undefined && fromTopP != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (parentObject !== undefined && fromTopK != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topK'], fromTopK);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (parentObject !== undefined && fromMaxOutputTokens != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (parentObject !== undefined && fromMediaResolution != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'mediaResolution'], fromMediaResolution);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'seed'], fromSeed);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (parentObject !== undefined && fromSpeechConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'speechConfig'], speechConfigToMldev$2(tLiveSpeechConfig(fromSpeechConfig)));
    }
    const fromEnableAffectiveDialog = getValueByPath(fromObject, [
        'enableAffectiveDialog',
    ]);
    if (parentObject !== undefined && fromEnableAffectiveDialog != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'enableAffectiveDialog'], fromEnableAffectiveDialog);
    }
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['setup', 'systemInstruction'], contentToMldev$2(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToMldev$2(tTool(item));
            });
        }
        setValueByPath(parentObject, ['setup', 'tools'], transformedList);
    }
    const fromSessionResumption = getValueByPath(fromObject, [
        'sessionResumption',
    ]);
    if (parentObject !== undefined && fromSessionResumption != null) {
        setValueByPath(parentObject, ['setup', 'sessionResumption'], sessionResumptionConfigToMldev$1(fromSessionResumption));
    }
    const fromInputAudioTranscription = getValueByPath(fromObject, [
        'inputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromInputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'inputAudioTranscription'], audioTranscriptionConfigToMldev$1());
    }
    const fromOutputAudioTranscription = getValueByPath(fromObject, [
        'outputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromOutputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'outputAudioTranscription'], audioTranscriptionConfigToMldev$1());
    }
    const fromRealtimeInputConfig = getValueByPath(fromObject, [
        'realtimeInputConfig',
    ]);
    if (parentObject !== undefined && fromRealtimeInputConfig != null) {
        setValueByPath(parentObject, ['setup', 'realtimeInputConfig'], realtimeInputConfigToMldev$1(fromRealtimeInputConfig));
    }
    const fromContextWindowCompression = getValueByPath(fromObject, [
        'contextWindowCompression',
    ]);
    if (parentObject !== undefined && fromContextWindowCompression != null) {
        setValueByPath(parentObject, ['setup', 'contextWindowCompression'], contextWindowCompressionConfigToMldev$1(fromContextWindowCompression));
    }
    const fromProactivity = getValueByPath(fromObject, ['proactivity']);
    if (parentObject !== undefined && fromProactivity != null) {
        setValueByPath(parentObject, ['setup', 'proactivity'], proactivityConfigToMldev$1(fromProactivity));
    }
    return toObject;
}
function liveConnectParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['setup', 'model'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], liveConnectConfigToMldev$1(fromConfig, toObject));
    }
    return toObject;
}
function activityStartToMldev() {
    const toObject = {};
    return toObject;
}
function activityEndToMldev() {
    const toObject = {};
    return toObject;
}
function liveSendRealtimeInputParametersToMldev(fromObject) {
    const toObject = {};
    const fromMedia = getValueByPath(fromObject, ['media']);
    if (fromMedia != null) {
        setValueByPath(toObject, ['mediaChunks'], tBlobs(fromMedia));
    }
    const fromAudio = getValueByPath(fromObject, ['audio']);
    if (fromAudio != null) {
        setValueByPath(toObject, ['audio'], tAudioBlob(fromAudio));
    }
    const fromAudioStreamEnd = getValueByPath(fromObject, [
        'audioStreamEnd',
    ]);
    if (fromAudioStreamEnd != null) {
        setValueByPath(toObject, ['audioStreamEnd'], fromAudioStreamEnd);
    }
    const fromVideo = getValueByPath(fromObject, ['video']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], tImageBlob(fromVideo));
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromActivityStart = getValueByPath(fromObject, [
        'activityStart',
    ]);
    if (fromActivityStart != null) {
        setValueByPath(toObject, ['activityStart'], activityStartToMldev());
    }
    const fromActivityEnd = getValueByPath(fromObject, ['activityEnd']);
    if (fromActivityEnd != null) {
        setValueByPath(toObject, ['activityEnd'], activityEndToMldev());
    }
    return toObject;
}
function weightedPromptToMldev(fromObject) {
    const toObject = {};
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromWeight = getValueByPath(fromObject, ['weight']);
    if (fromWeight != null) {
        setValueByPath(toObject, ['weight'], fromWeight);
    }
    return toObject;
}
function liveMusicSetWeightedPromptsParametersToMldev(fromObject) {
    const toObject = {};
    const fromWeightedPrompts = getValueByPath(fromObject, [
        'weightedPrompts',
    ]);
    if (fromWeightedPrompts != null) {
        let transformedList = fromWeightedPrompts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return weightedPromptToMldev(item);
            });
        }
        setValueByPath(toObject, ['weightedPrompts'], transformedList);
    }
    return toObject;
}
function liveMusicGenerationConfigToMldev(fromObject) {
    const toObject = {};
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (fromTemperature != null) {
        setValueByPath(toObject, ['temperature'], fromTemperature);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (fromTopK != null) {
        setValueByPath(toObject, ['topK'], fromTopK);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (fromSeed != null) {
        setValueByPath(toObject, ['seed'], fromSeed);
    }
    const fromGuidance = getValueByPath(fromObject, ['guidance']);
    if (fromGuidance != null) {
        setValueByPath(toObject, ['guidance'], fromGuidance);
    }
    const fromBpm = getValueByPath(fromObject, ['bpm']);
    if (fromBpm != null) {
        setValueByPath(toObject, ['bpm'], fromBpm);
    }
    const fromDensity = getValueByPath(fromObject, ['density']);
    if (fromDensity != null) {
        setValueByPath(toObject, ['density'], fromDensity);
    }
    const fromBrightness = getValueByPath(fromObject, ['brightness']);
    if (fromBrightness != null) {
        setValueByPath(toObject, ['brightness'], fromBrightness);
    }
    const fromScale = getValueByPath(fromObject, ['scale']);
    if (fromScale != null) {
        setValueByPath(toObject, ['scale'], fromScale);
    }
    const fromMuteBass = getValueByPath(fromObject, ['muteBass']);
    if (fromMuteBass != null) {
        setValueByPath(toObject, ['muteBass'], fromMuteBass);
    }
    const fromMuteDrums = getValueByPath(fromObject, ['muteDrums']);
    if (fromMuteDrums != null) {
        setValueByPath(toObject, ['muteDrums'], fromMuteDrums);
    }
    const fromOnlyBassAndDrums = getValueByPath(fromObject, [
        'onlyBassAndDrums',
    ]);
    if (fromOnlyBassAndDrums != null) {
        setValueByPath(toObject, ['onlyBassAndDrums'], fromOnlyBassAndDrums);
    }
    const fromMusicGenerationMode = getValueByPath(fromObject, [
        'musicGenerationMode',
    ]);
    if (fromMusicGenerationMode != null) {
        setValueByPath(toObject, ['musicGenerationMode'], fromMusicGenerationMode);
    }
    return toObject;
}
function liveMusicSetConfigParametersToMldev(fromObject) {
    const toObject = {};
    const fromMusicGenerationConfig = getValueByPath(fromObject, [
        'musicGenerationConfig',
    ]);
    if (fromMusicGenerationConfig != null) {
        setValueByPath(toObject, ['musicGenerationConfig'], liveMusicGenerationConfigToMldev(fromMusicGenerationConfig));
    }
    return toObject;
}
function liveMusicClientSetupToMldev(fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    return toObject;
}
function liveMusicClientContentToMldev(fromObject) {
    const toObject = {};
    const fromWeightedPrompts = getValueByPath(fromObject, [
        'weightedPrompts',
    ]);
    if (fromWeightedPrompts != null) {
        let transformedList = fromWeightedPrompts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return weightedPromptToMldev(item);
            });
        }
        setValueByPath(toObject, ['weightedPrompts'], transformedList);
    }
    return toObject;
}
function liveMusicClientMessageToMldev(fromObject) {
    const toObject = {};
    const fromSetup = getValueByPath(fromObject, ['setup']);
    if (fromSetup != null) {
        setValueByPath(toObject, ['setup'], liveMusicClientSetupToMldev(fromSetup));
    }
    const fromClientContent = getValueByPath(fromObject, [
        'clientContent',
    ]);
    if (fromClientContent != null) {
        setValueByPath(toObject, ['clientContent'], liveMusicClientContentToMldev(fromClientContent));
    }
    const fromMusicGenerationConfig = getValueByPath(fromObject, [
        'musicGenerationConfig',
    ]);
    if (fromMusicGenerationConfig != null) {
        setValueByPath(toObject, ['musicGenerationConfig'], liveMusicGenerationConfigToMldev(fromMusicGenerationConfig));
    }
    const fromPlaybackControl = getValueByPath(fromObject, [
        'playbackControl',
    ]);
    if (fromPlaybackControl != null) {
        setValueByPath(toObject, ['playbackControl'], fromPlaybackControl);
    }
    return toObject;
}
function prebuiltVoiceConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToVertex$1(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speechConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToVertex$1(fromVoiceConfig));
    }
    if (getValueByPath(fromObject, ['multiSpeakerVoiceConfig']) !== undefined) {
        throw new Error('multiSpeakerVoiceConfig parameter is not supported in Vertex AI.');
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function videoMetadataToVertex$1(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToVertex$1(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToVertex$1(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToVertex$1(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToVertex$1(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToVertex$1(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToVertex$1(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToVertex$1(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToVertex$1(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToVertex$1(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToVertex$1(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function functionDeclarationToVertex$1(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['behavior']) !== undefined) {
        throw new Error('behavior parameter is not supported in Vertex AI.');
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToVertex$1(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToVertex$1(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToVertex$1(fromTimeRangeFilter));
    }
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function dynamicRetrievalConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToVertex$1(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToVertex$1(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function enterpriseWebSearchToVertex$1(fromObject) {
    const toObject = {};
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function apiKeyConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromApiKeyString = getValueByPath(fromObject, ['apiKeyString']);
    if (fromApiKeyString != null) {
        setValueByPath(toObject, ['apiKeyString'], fromApiKeyString);
    }
    return toObject;
}
function authConfigToVertex$1(fromObject) {
    const toObject = {};
    const fromApiKeyConfig = getValueByPath(fromObject, ['apiKeyConfig']);
    if (fromApiKeyConfig != null) {
        setValueByPath(toObject, ['apiKeyConfig'], apiKeyConfigToVertex$1(fromApiKeyConfig));
    }
    const fromAuthType = getValueByPath(fromObject, ['authType']);
    if (fromAuthType != null) {
        setValueByPath(toObject, ['authType'], fromAuthType);
    }
    const fromGoogleServiceAccountConfig = getValueByPath(fromObject, [
        'googleServiceAccountConfig',
    ]);
    if (fromGoogleServiceAccountConfig != null) {
        setValueByPath(toObject, ['googleServiceAccountConfig'], fromGoogleServiceAccountConfig);
    }
    const fromHttpBasicAuthConfig = getValueByPath(fromObject, [
        'httpBasicAuthConfig',
    ]);
    if (fromHttpBasicAuthConfig != null) {
        setValueByPath(toObject, ['httpBasicAuthConfig'], fromHttpBasicAuthConfig);
    }
    const fromOauthConfig = getValueByPath(fromObject, ['oauthConfig']);
    if (fromOauthConfig != null) {
        setValueByPath(toObject, ['oauthConfig'], fromOauthConfig);
    }
    const fromOidcConfig = getValueByPath(fromObject, ['oidcConfig']);
    if (fromOidcConfig != null) {
        setValueByPath(toObject, ['oidcConfig'], fromOidcConfig);
    }
    return toObject;
}
function googleMapsToVertex$1(fromObject) {
    const toObject = {};
    const fromAuthConfig = getValueByPath(fromObject, ['authConfig']);
    if (fromAuthConfig != null) {
        setValueByPath(toObject, ['authConfig'], authConfigToVertex$1(fromAuthConfig));
    }
    return toObject;
}
function urlContextToVertex$1() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToVertex$1(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToVertex$1(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToVertex$1(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    const fromRetrieval = getValueByPath(fromObject, ['retrieval']);
    if (fromRetrieval != null) {
        setValueByPath(toObject, ['retrieval'], fromRetrieval);
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToVertex$1(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToVertex$1(fromGoogleSearchRetrieval));
    }
    const fromEnterpriseWebSearch = getValueByPath(fromObject, [
        'enterpriseWebSearch',
    ]);
    if (fromEnterpriseWebSearch != null) {
        setValueByPath(toObject, ['enterpriseWebSearch'], enterpriseWebSearchToVertex$1(fromEnterpriseWebSearch));
    }
    const fromGoogleMaps = getValueByPath(fromObject, ['googleMaps']);
    if (fromGoogleMaps != null) {
        setValueByPath(toObject, ['googleMaps'], googleMapsToVertex$1(fromGoogleMaps));
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToVertex$1());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToVertex$1(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function sessionResumptionConfigToVertex(fromObject) {
    const toObject = {};
    const fromHandle = getValueByPath(fromObject, ['handle']);
    if (fromHandle != null) {
        setValueByPath(toObject, ['handle'], fromHandle);
    }
    const fromTransparent = getValueByPath(fromObject, ['transparent']);
    if (fromTransparent != null) {
        setValueByPath(toObject, ['transparent'], fromTransparent);
    }
    return toObject;
}
function audioTranscriptionConfigToVertex() {
    const toObject = {};
    return toObject;
}
function automaticActivityDetectionToVertex(fromObject) {
    const toObject = {};
    const fromDisabled = getValueByPath(fromObject, ['disabled']);
    if (fromDisabled != null) {
        setValueByPath(toObject, ['disabled'], fromDisabled);
    }
    const fromStartOfSpeechSensitivity = getValueByPath(fromObject, [
        'startOfSpeechSensitivity',
    ]);
    if (fromStartOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['startOfSpeechSensitivity'], fromStartOfSpeechSensitivity);
    }
    const fromEndOfSpeechSensitivity = getValueByPath(fromObject, [
        'endOfSpeechSensitivity',
    ]);
    if (fromEndOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['endOfSpeechSensitivity'], fromEndOfSpeechSensitivity);
    }
    const fromPrefixPaddingMs = getValueByPath(fromObject, [
        'prefixPaddingMs',
    ]);
    if (fromPrefixPaddingMs != null) {
        setValueByPath(toObject, ['prefixPaddingMs'], fromPrefixPaddingMs);
    }
    const fromSilenceDurationMs = getValueByPath(fromObject, [
        'silenceDurationMs',
    ]);
    if (fromSilenceDurationMs != null) {
        setValueByPath(toObject, ['silenceDurationMs'], fromSilenceDurationMs);
    }
    return toObject;
}
function realtimeInputConfigToVertex(fromObject) {
    const toObject = {};
    const fromAutomaticActivityDetection = getValueByPath(fromObject, [
        'automaticActivityDetection',
    ]);
    if (fromAutomaticActivityDetection != null) {
        setValueByPath(toObject, ['automaticActivityDetection'], automaticActivityDetectionToVertex(fromAutomaticActivityDetection));
    }
    const fromActivityHandling = getValueByPath(fromObject, [
        'activityHandling',
    ]);
    if (fromActivityHandling != null) {
        setValueByPath(toObject, ['activityHandling'], fromActivityHandling);
    }
    const fromTurnCoverage = getValueByPath(fromObject, ['turnCoverage']);
    if (fromTurnCoverage != null) {
        setValueByPath(toObject, ['turnCoverage'], fromTurnCoverage);
    }
    return toObject;
}
function slidingWindowToVertex(fromObject) {
    const toObject = {};
    const fromTargetTokens = getValueByPath(fromObject, ['targetTokens']);
    if (fromTargetTokens != null) {
        setValueByPath(toObject, ['targetTokens'], fromTargetTokens);
    }
    return toObject;
}
function contextWindowCompressionConfigToVertex(fromObject) {
    const toObject = {};
    const fromTriggerTokens = getValueByPath(fromObject, [
        'triggerTokens',
    ]);
    if (fromTriggerTokens != null) {
        setValueByPath(toObject, ['triggerTokens'], fromTriggerTokens);
    }
    const fromSlidingWindow = getValueByPath(fromObject, [
        'slidingWindow',
    ]);
    if (fromSlidingWindow != null) {
        setValueByPath(toObject, ['slidingWindow'], slidingWindowToVertex(fromSlidingWindow));
    }
    return toObject;
}
function proactivityConfigToVertex(fromObject) {
    const toObject = {};
    const fromProactiveAudio = getValueByPath(fromObject, [
        'proactiveAudio',
    ]);
    if (fromProactiveAudio != null) {
        setValueByPath(toObject, ['proactiveAudio'], fromProactiveAudio);
    }
    return toObject;
}
function liveConnectConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromGenerationConfig = getValueByPath(fromObject, [
        'generationConfig',
    ]);
    if (parentObject !== undefined && fromGenerationConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig'], fromGenerationConfig);
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (parentObject !== undefined && fromResponseModalities != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'responseModalities'], fromResponseModalities);
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (parentObject !== undefined && fromTemperature != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (parentObject !== undefined && fromTopP != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (parentObject !== undefined && fromTopK != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topK'], fromTopK);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (parentObject !== undefined && fromMaxOutputTokens != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (parentObject !== undefined && fromMediaResolution != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'mediaResolution'], fromMediaResolution);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'seed'], fromSeed);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (parentObject !== undefined && fromSpeechConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'speechConfig'], speechConfigToVertex$1(tLiveSpeechConfig(fromSpeechConfig)));
    }
    const fromEnableAffectiveDialog = getValueByPath(fromObject, [
        'enableAffectiveDialog',
    ]);
    if (parentObject !== undefined && fromEnableAffectiveDialog != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'enableAffectiveDialog'], fromEnableAffectiveDialog);
    }
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['setup', 'systemInstruction'], contentToVertex$1(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToVertex$1(tTool(item));
            });
        }
        setValueByPath(parentObject, ['setup', 'tools'], transformedList);
    }
    const fromSessionResumption = getValueByPath(fromObject, [
        'sessionResumption',
    ]);
    if (parentObject !== undefined && fromSessionResumption != null) {
        setValueByPath(parentObject, ['setup', 'sessionResumption'], sessionResumptionConfigToVertex(fromSessionResumption));
    }
    const fromInputAudioTranscription = getValueByPath(fromObject, [
        'inputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromInputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'inputAudioTranscription'], audioTranscriptionConfigToVertex());
    }
    const fromOutputAudioTranscription = getValueByPath(fromObject, [
        'outputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromOutputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'outputAudioTranscription'], audioTranscriptionConfigToVertex());
    }
    const fromRealtimeInputConfig = getValueByPath(fromObject, [
        'realtimeInputConfig',
    ]);
    if (parentObject !== undefined && fromRealtimeInputConfig != null) {
        setValueByPath(parentObject, ['setup', 'realtimeInputConfig'], realtimeInputConfigToVertex(fromRealtimeInputConfig));
    }
    const fromContextWindowCompression = getValueByPath(fromObject, [
        'contextWindowCompression',
    ]);
    if (parentObject !== undefined && fromContextWindowCompression != null) {
        setValueByPath(parentObject, ['setup', 'contextWindowCompression'], contextWindowCompressionConfigToVertex(fromContextWindowCompression));
    }
    const fromProactivity = getValueByPath(fromObject, ['proactivity']);
    if (parentObject !== undefined && fromProactivity != null) {
        setValueByPath(parentObject, ['setup', 'proactivity'], proactivityConfigToVertex(fromProactivity));
    }
    return toObject;
}
function liveConnectParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['setup', 'model'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], liveConnectConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function activityStartToVertex() {
    const toObject = {};
    return toObject;
}
function activityEndToVertex() {
    const toObject = {};
    return toObject;
}
function liveSendRealtimeInputParametersToVertex(fromObject) {
    const toObject = {};
    const fromMedia = getValueByPath(fromObject, ['media']);
    if (fromMedia != null) {
        setValueByPath(toObject, ['mediaChunks'], tBlobs(fromMedia));
    }
    const fromAudio = getValueByPath(fromObject, ['audio']);
    if (fromAudio != null) {
        setValueByPath(toObject, ['audio'], tAudioBlob(fromAudio));
    }
    const fromAudioStreamEnd = getValueByPath(fromObject, [
        'audioStreamEnd',
    ]);
    if (fromAudioStreamEnd != null) {
        setValueByPath(toObject, ['audioStreamEnd'], fromAudioStreamEnd);
    }
    const fromVideo = getValueByPath(fromObject, ['video']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], tImageBlob(fromVideo));
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromActivityStart = getValueByPath(fromObject, [
        'activityStart',
    ]);
    if (fromActivityStart != null) {
        setValueByPath(toObject, ['activityStart'], activityStartToVertex());
    }
    const fromActivityEnd = getValueByPath(fromObject, ['activityEnd']);
    if (fromActivityEnd != null) {
        setValueByPath(toObject, ['activityEnd'], activityEndToVertex());
    }
    return toObject;
}
function liveServerSetupCompleteFromMldev() {
    const toObject = {};
    return toObject;
}
function videoMetadataFromMldev$1(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobFromMldev$1(fromObject) {
    const toObject = {};
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataFromMldev$1(fromObject) {
    const toObject = {};
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallFromMldev$1(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partFromMldev$1(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataFromMldev$1(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobFromMldev$1(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataFromMldev$1(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallFromMldev$1(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentFromMldev$1(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partFromMldev$1(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function transcriptionFromMldev(fromObject) {
    const toObject = {};
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromFinished = getValueByPath(fromObject, ['finished']);
    if (fromFinished != null) {
        setValueByPath(toObject, ['finished'], fromFinished);
    }
    return toObject;
}
function urlMetadataFromMldev$1(fromObject) {
    const toObject = {};
    const fromRetrievedUrl = getValueByPath(fromObject, ['retrievedUrl']);
    if (fromRetrievedUrl != null) {
        setValueByPath(toObject, ['retrievedUrl'], fromRetrievedUrl);
    }
    const fromUrlRetrievalStatus = getValueByPath(fromObject, [
        'urlRetrievalStatus',
    ]);
    if (fromUrlRetrievalStatus != null) {
        setValueByPath(toObject, ['urlRetrievalStatus'], fromUrlRetrievalStatus);
    }
    return toObject;
}
function urlContextMetadataFromMldev$1(fromObject) {
    const toObject = {};
    const fromUrlMetadata = getValueByPath(fromObject, ['urlMetadata']);
    if (fromUrlMetadata != null) {
        let transformedList = fromUrlMetadata;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return urlMetadataFromMldev$1(item);
            });
        }
        setValueByPath(toObject, ['urlMetadata'], transformedList);
    }
    return toObject;
}
function liveServerContentFromMldev(fromObject) {
    const toObject = {};
    const fromModelTurn = getValueByPath(fromObject, ['modelTurn']);
    if (fromModelTurn != null) {
        setValueByPath(toObject, ['modelTurn'], contentFromMldev$1(fromModelTurn));
    }
    const fromTurnComplete = getValueByPath(fromObject, ['turnComplete']);
    if (fromTurnComplete != null) {
        setValueByPath(toObject, ['turnComplete'], fromTurnComplete);
    }
    const fromInterrupted = getValueByPath(fromObject, ['interrupted']);
    if (fromInterrupted != null) {
        setValueByPath(toObject, ['interrupted'], fromInterrupted);
    }
    const fromGroundingMetadata = getValueByPath(fromObject, [
        'groundingMetadata',
    ]);
    if (fromGroundingMetadata != null) {
        setValueByPath(toObject, ['groundingMetadata'], fromGroundingMetadata);
    }
    const fromGenerationComplete = getValueByPath(fromObject, [
        'generationComplete',
    ]);
    if (fromGenerationComplete != null) {
        setValueByPath(toObject, ['generationComplete'], fromGenerationComplete);
    }
    const fromInputTranscription = getValueByPath(fromObject, [
        'inputTranscription',
    ]);
    if (fromInputTranscription != null) {
        setValueByPath(toObject, ['inputTranscription'], transcriptionFromMldev(fromInputTranscription));
    }
    const fromOutputTranscription = getValueByPath(fromObject, [
        'outputTranscription',
    ]);
    if (fromOutputTranscription != null) {
        setValueByPath(toObject, ['outputTranscription'], transcriptionFromMldev(fromOutputTranscription));
    }
    const fromUrlContextMetadata = getValueByPath(fromObject, [
        'urlContextMetadata',
    ]);
    if (fromUrlContextMetadata != null) {
        setValueByPath(toObject, ['urlContextMetadata'], urlContextMetadataFromMldev$1(fromUrlContextMetadata));
    }
    return toObject;
}
function liveServerToolCallFromMldev(fromObject) {
    const toObject = {};
    const fromFunctionCalls = getValueByPath(fromObject, [
        'functionCalls',
    ]);
    if (fromFunctionCalls != null) {
        let transformedList = fromFunctionCalls;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionCallFromMldev$1(item);
            });
        }
        setValueByPath(toObject, ['functionCalls'], transformedList);
    }
    return toObject;
}
function liveServerToolCallCancellationFromMldev(fromObject) {
    const toObject = {};
    const fromIds = getValueByPath(fromObject, ['ids']);
    if (fromIds != null) {
        setValueByPath(toObject, ['ids'], fromIds);
    }
    return toObject;
}
function modalityTokenCountFromMldev(fromObject) {
    const toObject = {};
    const fromModality = getValueByPath(fromObject, ['modality']);
    if (fromModality != null) {
        setValueByPath(toObject, ['modality'], fromModality);
    }
    const fromTokenCount = getValueByPath(fromObject, ['tokenCount']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    return toObject;
}
function usageMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromPromptTokenCount = getValueByPath(fromObject, [
        'promptTokenCount',
    ]);
    if (fromPromptTokenCount != null) {
        setValueByPath(toObject, ['promptTokenCount'], fromPromptTokenCount);
    }
    const fromCachedContentTokenCount = getValueByPath(fromObject, [
        'cachedContentTokenCount',
    ]);
    if (fromCachedContentTokenCount != null) {
        setValueByPath(toObject, ['cachedContentTokenCount'], fromCachedContentTokenCount);
    }
    const fromResponseTokenCount = getValueByPath(fromObject, [
        'responseTokenCount',
    ]);
    if (fromResponseTokenCount != null) {
        setValueByPath(toObject, ['responseTokenCount'], fromResponseTokenCount);
    }
    const fromToolUsePromptTokenCount = getValueByPath(fromObject, [
        'toolUsePromptTokenCount',
    ]);
    if (fromToolUsePromptTokenCount != null) {
        setValueByPath(toObject, ['toolUsePromptTokenCount'], fromToolUsePromptTokenCount);
    }
    const fromThoughtsTokenCount = getValueByPath(fromObject, [
        'thoughtsTokenCount',
    ]);
    if (fromThoughtsTokenCount != null) {
        setValueByPath(toObject, ['thoughtsTokenCount'], fromThoughtsTokenCount);
    }
    const fromTotalTokenCount = getValueByPath(fromObject, [
        'totalTokenCount',
    ]);
    if (fromTotalTokenCount != null) {
        setValueByPath(toObject, ['totalTokenCount'], fromTotalTokenCount);
    }
    const fromPromptTokensDetails = getValueByPath(fromObject, [
        'promptTokensDetails',
    ]);
    if (fromPromptTokensDetails != null) {
        let transformedList = fromPromptTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromMldev(item);
            });
        }
        setValueByPath(toObject, ['promptTokensDetails'], transformedList);
    }
    const fromCacheTokensDetails = getValueByPath(fromObject, [
        'cacheTokensDetails',
    ]);
    if (fromCacheTokensDetails != null) {
        let transformedList = fromCacheTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromMldev(item);
            });
        }
        setValueByPath(toObject, ['cacheTokensDetails'], transformedList);
    }
    const fromResponseTokensDetails = getValueByPath(fromObject, [
        'responseTokensDetails',
    ]);
    if (fromResponseTokensDetails != null) {
        let transformedList = fromResponseTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromMldev(item);
            });
        }
        setValueByPath(toObject, ['responseTokensDetails'], transformedList);
    }
    const fromToolUsePromptTokensDetails = getValueByPath(fromObject, [
        'toolUsePromptTokensDetails',
    ]);
    if (fromToolUsePromptTokensDetails != null) {
        let transformedList = fromToolUsePromptTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromMldev(item);
            });
        }
        setValueByPath(toObject, ['toolUsePromptTokensDetails'], transformedList);
    }
    return toObject;
}
function liveServerGoAwayFromMldev(fromObject) {
    const toObject = {};
    const fromTimeLeft = getValueByPath(fromObject, ['timeLeft']);
    if (fromTimeLeft != null) {
        setValueByPath(toObject, ['timeLeft'], fromTimeLeft);
    }
    return toObject;
}
function liveServerSessionResumptionUpdateFromMldev(fromObject) {
    const toObject = {};
    const fromNewHandle = getValueByPath(fromObject, ['newHandle']);
    if (fromNewHandle != null) {
        setValueByPath(toObject, ['newHandle'], fromNewHandle);
    }
    const fromResumable = getValueByPath(fromObject, ['resumable']);
    if (fromResumable != null) {
        setValueByPath(toObject, ['resumable'], fromResumable);
    }
    const fromLastConsumedClientMessageIndex = getValueByPath(fromObject, [
        'lastConsumedClientMessageIndex',
    ]);
    if (fromLastConsumedClientMessageIndex != null) {
        setValueByPath(toObject, ['lastConsumedClientMessageIndex'], fromLastConsumedClientMessageIndex);
    }
    return toObject;
}
function liveServerMessageFromMldev(fromObject) {
    const toObject = {};
    const fromSetupComplete = getValueByPath(fromObject, [
        'setupComplete',
    ]);
    if (fromSetupComplete != null) {
        setValueByPath(toObject, ['setupComplete'], liveServerSetupCompleteFromMldev());
    }
    const fromServerContent = getValueByPath(fromObject, [
        'serverContent',
    ]);
    if (fromServerContent != null) {
        setValueByPath(toObject, ['serverContent'], liveServerContentFromMldev(fromServerContent));
    }
    const fromToolCall = getValueByPath(fromObject, ['toolCall']);
    if (fromToolCall != null) {
        setValueByPath(toObject, ['toolCall'], liveServerToolCallFromMldev(fromToolCall));
    }
    const fromToolCallCancellation = getValueByPath(fromObject, [
        'toolCallCancellation',
    ]);
    if (fromToolCallCancellation != null) {
        setValueByPath(toObject, ['toolCallCancellation'], liveServerToolCallCancellationFromMldev(fromToolCallCancellation));
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], usageMetadataFromMldev(fromUsageMetadata));
    }
    const fromGoAway = getValueByPath(fromObject, ['goAway']);
    if (fromGoAway != null) {
        setValueByPath(toObject, ['goAway'], liveServerGoAwayFromMldev(fromGoAway));
    }
    const fromSessionResumptionUpdate = getValueByPath(fromObject, [
        'sessionResumptionUpdate',
    ]);
    if (fromSessionResumptionUpdate != null) {
        setValueByPath(toObject, ['sessionResumptionUpdate'], liveServerSessionResumptionUpdateFromMldev(fromSessionResumptionUpdate));
    }
    return toObject;
}
function liveMusicServerSetupCompleteFromMldev() {
    const toObject = {};
    return toObject;
}
function weightedPromptFromMldev(fromObject) {
    const toObject = {};
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromWeight = getValueByPath(fromObject, ['weight']);
    if (fromWeight != null) {
        setValueByPath(toObject, ['weight'], fromWeight);
    }
    return toObject;
}
function liveMusicClientContentFromMldev(fromObject) {
    const toObject = {};
    const fromWeightedPrompts = getValueByPath(fromObject, [
        'weightedPrompts',
    ]);
    if (fromWeightedPrompts != null) {
        let transformedList = fromWeightedPrompts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return weightedPromptFromMldev(item);
            });
        }
        setValueByPath(toObject, ['weightedPrompts'], transformedList);
    }
    return toObject;
}
function liveMusicGenerationConfigFromMldev(fromObject) {
    const toObject = {};
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (fromTemperature != null) {
        setValueByPath(toObject, ['temperature'], fromTemperature);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (fromTopK != null) {
        setValueByPath(toObject, ['topK'], fromTopK);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (fromSeed != null) {
        setValueByPath(toObject, ['seed'], fromSeed);
    }
    const fromGuidance = getValueByPath(fromObject, ['guidance']);
    if (fromGuidance != null) {
        setValueByPath(toObject, ['guidance'], fromGuidance);
    }
    const fromBpm = getValueByPath(fromObject, ['bpm']);
    if (fromBpm != null) {
        setValueByPath(toObject, ['bpm'], fromBpm);
    }
    const fromDensity = getValueByPath(fromObject, ['density']);
    if (fromDensity != null) {
        setValueByPath(toObject, ['density'], fromDensity);
    }
    const fromBrightness = getValueByPath(fromObject, ['brightness']);
    if (fromBrightness != null) {
        setValueByPath(toObject, ['brightness'], fromBrightness);
    }
    const fromScale = getValueByPath(fromObject, ['scale']);
    if (fromScale != null) {
        setValueByPath(toObject, ['scale'], fromScale);
    }
    const fromMuteBass = getValueByPath(fromObject, ['muteBass']);
    if (fromMuteBass != null) {
        setValueByPath(toObject, ['muteBass'], fromMuteBass);
    }
    const fromMuteDrums = getValueByPath(fromObject, ['muteDrums']);
    if (fromMuteDrums != null) {
        setValueByPath(toObject, ['muteDrums'], fromMuteDrums);
    }
    const fromOnlyBassAndDrums = getValueByPath(fromObject, [
        'onlyBassAndDrums',
    ]);
    if (fromOnlyBassAndDrums != null) {
        setValueByPath(toObject, ['onlyBassAndDrums'], fromOnlyBassAndDrums);
    }
    const fromMusicGenerationMode = getValueByPath(fromObject, [
        'musicGenerationMode',
    ]);
    if (fromMusicGenerationMode != null) {
        setValueByPath(toObject, ['musicGenerationMode'], fromMusicGenerationMode);
    }
    return toObject;
}
function liveMusicSourceMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromClientContent = getValueByPath(fromObject, [
        'clientContent',
    ]);
    if (fromClientContent != null) {
        setValueByPath(toObject, ['clientContent'], liveMusicClientContentFromMldev(fromClientContent));
    }
    const fromMusicGenerationConfig = getValueByPath(fromObject, [
        'musicGenerationConfig',
    ]);
    if (fromMusicGenerationConfig != null) {
        setValueByPath(toObject, ['musicGenerationConfig'], liveMusicGenerationConfigFromMldev(fromMusicGenerationConfig));
    }
    return toObject;
}
function audioChunkFromMldev(fromObject) {
    const toObject = {};
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    const fromSourceMetadata = getValueByPath(fromObject, [
        'sourceMetadata',
    ]);
    if (fromSourceMetadata != null) {
        setValueByPath(toObject, ['sourceMetadata'], liveMusicSourceMetadataFromMldev(fromSourceMetadata));
    }
    return toObject;
}
function liveMusicServerContentFromMldev(fromObject) {
    const toObject = {};
    const fromAudioChunks = getValueByPath(fromObject, ['audioChunks']);
    if (fromAudioChunks != null) {
        let transformedList = fromAudioChunks;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return audioChunkFromMldev(item);
            });
        }
        setValueByPath(toObject, ['audioChunks'], transformedList);
    }
    return toObject;
}
function liveMusicFilteredPromptFromMldev(fromObject) {
    const toObject = {};
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromFilteredReason = getValueByPath(fromObject, [
        'filteredReason',
    ]);
    if (fromFilteredReason != null) {
        setValueByPath(toObject, ['filteredReason'], fromFilteredReason);
    }
    return toObject;
}
function liveMusicServerMessageFromMldev(fromObject) {
    const toObject = {};
    const fromSetupComplete = getValueByPath(fromObject, [
        'setupComplete',
    ]);
    if (fromSetupComplete != null) {
        setValueByPath(toObject, ['setupComplete'], liveMusicServerSetupCompleteFromMldev());
    }
    const fromServerContent = getValueByPath(fromObject, [
        'serverContent',
    ]);
    if (fromServerContent != null) {
        setValueByPath(toObject, ['serverContent'], liveMusicServerContentFromMldev(fromServerContent));
    }
    const fromFilteredPrompt = getValueByPath(fromObject, [
        'filteredPrompt',
    ]);
    if (fromFilteredPrompt != null) {
        setValueByPath(toObject, ['filteredPrompt'], liveMusicFilteredPromptFromMldev(fromFilteredPrompt));
    }
    return toObject;
}
function liveServerSetupCompleteFromVertex(fromObject) {
    const toObject = {};
    const fromSessionId = getValueByPath(fromObject, ['sessionId']);
    if (fromSessionId != null) {
        setValueByPath(toObject, ['sessionId'], fromSessionId);
    }
    return toObject;
}
function videoMetadataFromVertex$1(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobFromVertex$1(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataFromVertex$1(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallFromVertex$1(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partFromVertex$1(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataFromVertex$1(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobFromVertex$1(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataFromVertex$1(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallFromVertex$1(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentFromVertex$1(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partFromVertex$1(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function transcriptionFromVertex(fromObject) {
    const toObject = {};
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    const fromFinished = getValueByPath(fromObject, ['finished']);
    if (fromFinished != null) {
        setValueByPath(toObject, ['finished'], fromFinished);
    }
    return toObject;
}
function liveServerContentFromVertex(fromObject) {
    const toObject = {};
    const fromModelTurn = getValueByPath(fromObject, ['modelTurn']);
    if (fromModelTurn != null) {
        setValueByPath(toObject, ['modelTurn'], contentFromVertex$1(fromModelTurn));
    }
    const fromTurnComplete = getValueByPath(fromObject, ['turnComplete']);
    if (fromTurnComplete != null) {
        setValueByPath(toObject, ['turnComplete'], fromTurnComplete);
    }
    const fromInterrupted = getValueByPath(fromObject, ['interrupted']);
    if (fromInterrupted != null) {
        setValueByPath(toObject, ['interrupted'], fromInterrupted);
    }
    const fromGroundingMetadata = getValueByPath(fromObject, [
        'groundingMetadata',
    ]);
    if (fromGroundingMetadata != null) {
        setValueByPath(toObject, ['groundingMetadata'], fromGroundingMetadata);
    }
    const fromGenerationComplete = getValueByPath(fromObject, [
        'generationComplete',
    ]);
    if (fromGenerationComplete != null) {
        setValueByPath(toObject, ['generationComplete'], fromGenerationComplete);
    }
    const fromInputTranscription = getValueByPath(fromObject, [
        'inputTranscription',
    ]);
    if (fromInputTranscription != null) {
        setValueByPath(toObject, ['inputTranscription'], transcriptionFromVertex(fromInputTranscription));
    }
    const fromOutputTranscription = getValueByPath(fromObject, [
        'outputTranscription',
    ]);
    if (fromOutputTranscription != null) {
        setValueByPath(toObject, ['outputTranscription'], transcriptionFromVertex(fromOutputTranscription));
    }
    return toObject;
}
function liveServerToolCallFromVertex(fromObject) {
    const toObject = {};
    const fromFunctionCalls = getValueByPath(fromObject, [
        'functionCalls',
    ]);
    if (fromFunctionCalls != null) {
        let transformedList = fromFunctionCalls;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionCallFromVertex$1(item);
            });
        }
        setValueByPath(toObject, ['functionCalls'], transformedList);
    }
    return toObject;
}
function liveServerToolCallCancellationFromVertex(fromObject) {
    const toObject = {};
    const fromIds = getValueByPath(fromObject, ['ids']);
    if (fromIds != null) {
        setValueByPath(toObject, ['ids'], fromIds);
    }
    return toObject;
}
function modalityTokenCountFromVertex(fromObject) {
    const toObject = {};
    const fromModality = getValueByPath(fromObject, ['modality']);
    if (fromModality != null) {
        setValueByPath(toObject, ['modality'], fromModality);
    }
    const fromTokenCount = getValueByPath(fromObject, ['tokenCount']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    return toObject;
}
function usageMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromPromptTokenCount = getValueByPath(fromObject, [
        'promptTokenCount',
    ]);
    if (fromPromptTokenCount != null) {
        setValueByPath(toObject, ['promptTokenCount'], fromPromptTokenCount);
    }
    const fromCachedContentTokenCount = getValueByPath(fromObject, [
        'cachedContentTokenCount',
    ]);
    if (fromCachedContentTokenCount != null) {
        setValueByPath(toObject, ['cachedContentTokenCount'], fromCachedContentTokenCount);
    }
    const fromResponseTokenCount = getValueByPath(fromObject, [
        'candidatesTokenCount',
    ]);
    if (fromResponseTokenCount != null) {
        setValueByPath(toObject, ['responseTokenCount'], fromResponseTokenCount);
    }
    const fromToolUsePromptTokenCount = getValueByPath(fromObject, [
        'toolUsePromptTokenCount',
    ]);
    if (fromToolUsePromptTokenCount != null) {
        setValueByPath(toObject, ['toolUsePromptTokenCount'], fromToolUsePromptTokenCount);
    }
    const fromThoughtsTokenCount = getValueByPath(fromObject, [
        'thoughtsTokenCount',
    ]);
    if (fromThoughtsTokenCount != null) {
        setValueByPath(toObject, ['thoughtsTokenCount'], fromThoughtsTokenCount);
    }
    const fromTotalTokenCount = getValueByPath(fromObject, [
        'totalTokenCount',
    ]);
    if (fromTotalTokenCount != null) {
        setValueByPath(toObject, ['totalTokenCount'], fromTotalTokenCount);
    }
    const fromPromptTokensDetails = getValueByPath(fromObject, [
        'promptTokensDetails',
    ]);
    if (fromPromptTokensDetails != null) {
        let transformedList = fromPromptTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromVertex(item);
            });
        }
        setValueByPath(toObject, ['promptTokensDetails'], transformedList);
    }
    const fromCacheTokensDetails = getValueByPath(fromObject, [
        'cacheTokensDetails',
    ]);
    if (fromCacheTokensDetails != null) {
        let transformedList = fromCacheTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromVertex(item);
            });
        }
        setValueByPath(toObject, ['cacheTokensDetails'], transformedList);
    }
    const fromResponseTokensDetails = getValueByPath(fromObject, [
        'candidatesTokensDetails',
    ]);
    if (fromResponseTokensDetails != null) {
        let transformedList = fromResponseTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromVertex(item);
            });
        }
        setValueByPath(toObject, ['responseTokensDetails'], transformedList);
    }
    const fromToolUsePromptTokensDetails = getValueByPath(fromObject, [
        'toolUsePromptTokensDetails',
    ]);
    if (fromToolUsePromptTokensDetails != null) {
        let transformedList = fromToolUsePromptTokensDetails;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modalityTokenCountFromVertex(item);
            });
        }
        setValueByPath(toObject, ['toolUsePromptTokensDetails'], transformedList);
    }
    const fromTrafficType = getValueByPath(fromObject, ['trafficType']);
    if (fromTrafficType != null) {
        setValueByPath(toObject, ['trafficType'], fromTrafficType);
    }
    return toObject;
}
function liveServerGoAwayFromVertex(fromObject) {
    const toObject = {};
    const fromTimeLeft = getValueByPath(fromObject, ['timeLeft']);
    if (fromTimeLeft != null) {
        setValueByPath(toObject, ['timeLeft'], fromTimeLeft);
    }
    return toObject;
}
function liveServerSessionResumptionUpdateFromVertex(fromObject) {
    const toObject = {};
    const fromNewHandle = getValueByPath(fromObject, ['newHandle']);
    if (fromNewHandle != null) {
        setValueByPath(toObject, ['newHandle'], fromNewHandle);
    }
    const fromResumable = getValueByPath(fromObject, ['resumable']);
    if (fromResumable != null) {
        setValueByPath(toObject, ['resumable'], fromResumable);
    }
    const fromLastConsumedClientMessageIndex = getValueByPath(fromObject, [
        'lastConsumedClientMessageIndex',
    ]);
    if (fromLastConsumedClientMessageIndex != null) {
        setValueByPath(toObject, ['lastConsumedClientMessageIndex'], fromLastConsumedClientMessageIndex);
    }
    return toObject;
}
function liveServerMessageFromVertex(fromObject) {
    const toObject = {};
    const fromSetupComplete = getValueByPath(fromObject, [
        'setupComplete',
    ]);
    if (fromSetupComplete != null) {
        setValueByPath(toObject, ['setupComplete'], liveServerSetupCompleteFromVertex(fromSetupComplete));
    }
    const fromServerContent = getValueByPath(fromObject, [
        'serverContent',
    ]);
    if (fromServerContent != null) {
        setValueByPath(toObject, ['serverContent'], liveServerContentFromVertex(fromServerContent));
    }
    const fromToolCall = getValueByPath(fromObject, ['toolCall']);
    if (fromToolCall != null) {
        setValueByPath(toObject, ['toolCall'], liveServerToolCallFromVertex(fromToolCall));
    }
    const fromToolCallCancellation = getValueByPath(fromObject, [
        'toolCallCancellation',
    ]);
    if (fromToolCallCancellation != null) {
        setValueByPath(toObject, ['toolCallCancellation'], liveServerToolCallCancellationFromVertex(fromToolCallCancellation));
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], usageMetadataFromVertex(fromUsageMetadata));
    }
    const fromGoAway = getValueByPath(fromObject, ['goAway']);
    if (fromGoAway != null) {
        setValueByPath(toObject, ['goAway'], liveServerGoAwayFromVertex(fromGoAway));
    }
    const fromSessionResumptionUpdate = getValueByPath(fromObject, [
        'sessionResumptionUpdate',
    ]);
    if (fromSessionResumptionUpdate != null) {
        setValueByPath(toObject, ['sessionResumptionUpdate'], liveServerSessionResumptionUpdateFromVertex(fromSessionResumptionUpdate));
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function videoMetadataToMldev$1(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToMldev$1(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToMldev$1(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToMldev$1(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToMldev$1(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToMldev$1(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToMldev$1(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToMldev$1(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToMldev$1(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToMldev$1(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToMldev$1(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function schemaToMldev(fromObject) {
    const toObject = {};
    const fromAnyOf = getValueByPath(fromObject, ['anyOf']);
    if (fromAnyOf != null) {
        setValueByPath(toObject, ['anyOf'], fromAnyOf);
    }
    const fromDefault = getValueByPath(fromObject, ['default']);
    if (fromDefault != null) {
        setValueByPath(toObject, ['default'], fromDefault);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromEnum = getValueByPath(fromObject, ['enum']);
    if (fromEnum != null) {
        setValueByPath(toObject, ['enum'], fromEnum);
    }
    const fromExample = getValueByPath(fromObject, ['example']);
    if (fromExample != null) {
        setValueByPath(toObject, ['example'], fromExample);
    }
    const fromFormat = getValueByPath(fromObject, ['format']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['format'], fromFormat);
    }
    const fromItems = getValueByPath(fromObject, ['items']);
    if (fromItems != null) {
        setValueByPath(toObject, ['items'], fromItems);
    }
    const fromMaxItems = getValueByPath(fromObject, ['maxItems']);
    if (fromMaxItems != null) {
        setValueByPath(toObject, ['maxItems'], fromMaxItems);
    }
    const fromMaxLength = getValueByPath(fromObject, ['maxLength']);
    if (fromMaxLength != null) {
        setValueByPath(toObject, ['maxLength'], fromMaxLength);
    }
    const fromMaxProperties = getValueByPath(fromObject, [
        'maxProperties',
    ]);
    if (fromMaxProperties != null) {
        setValueByPath(toObject, ['maxProperties'], fromMaxProperties);
    }
    const fromMaximum = getValueByPath(fromObject, ['maximum']);
    if (fromMaximum != null) {
        setValueByPath(toObject, ['maximum'], fromMaximum);
    }
    const fromMinItems = getValueByPath(fromObject, ['minItems']);
    if (fromMinItems != null) {
        setValueByPath(toObject, ['minItems'], fromMinItems);
    }
    const fromMinLength = getValueByPath(fromObject, ['minLength']);
    if (fromMinLength != null) {
        setValueByPath(toObject, ['minLength'], fromMinLength);
    }
    const fromMinProperties = getValueByPath(fromObject, [
        'minProperties',
    ]);
    if (fromMinProperties != null) {
        setValueByPath(toObject, ['minProperties'], fromMinProperties);
    }
    const fromMinimum = getValueByPath(fromObject, ['minimum']);
    if (fromMinimum != null) {
        setValueByPath(toObject, ['minimum'], fromMinimum);
    }
    const fromNullable = getValueByPath(fromObject, ['nullable']);
    if (fromNullable != null) {
        setValueByPath(toObject, ['nullable'], fromNullable);
    }
    const fromPattern = getValueByPath(fromObject, ['pattern']);
    if (fromPattern != null) {
        setValueByPath(toObject, ['pattern'], fromPattern);
    }
    const fromProperties = getValueByPath(fromObject, ['properties']);
    if (fromProperties != null) {
        setValueByPath(toObject, ['properties'], fromProperties);
    }
    const fromPropertyOrdering = getValueByPath(fromObject, [
        'propertyOrdering',
    ]);
    if (fromPropertyOrdering != null) {
        setValueByPath(toObject, ['propertyOrdering'], fromPropertyOrdering);
    }
    const fromRequired = getValueByPath(fromObject, ['required']);
    if (fromRequired != null) {
        setValueByPath(toObject, ['required'], fromRequired);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (fromTitle != null) {
        setValueByPath(toObject, ['title'], fromTitle);
    }
    const fromType = getValueByPath(fromObject, ['type']);
    if (fromType != null) {
        setValueByPath(toObject, ['type'], fromType);
    }
    return toObject;
}
function safetySettingToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['method']) !== undefined) {
        throw new Error('method parameter is not supported in Gemini API.');
    }
    const fromCategory = getValueByPath(fromObject, ['category']);
    if (fromCategory != null) {
        setValueByPath(toObject, ['category'], fromCategory);
    }
    const fromThreshold = getValueByPath(fromObject, ['threshold']);
    if (fromThreshold != null) {
        setValueByPath(toObject, ['threshold'], fromThreshold);
    }
    return toObject;
}
function functionDeclarationToMldev$1(fromObject) {
    const toObject = {};
    const fromBehavior = getValueByPath(fromObject, ['behavior']);
    if (fromBehavior != null) {
        setValueByPath(toObject, ['behavior'], fromBehavior);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToMldev$1(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToMldev$1(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToMldev$1(fromTimeRangeFilter));
    }
    if (getValueByPath(fromObject, ['excludeDomains']) !== undefined) {
        throw new Error('excludeDomains parameter is not supported in Gemini API.');
    }
    return toObject;
}
function dynamicRetrievalConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToMldev$1(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToMldev$1(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function urlContextToMldev$1() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToMldev$1(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToMldev$1(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToMldev$1(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    if (getValueByPath(fromObject, ['retrieval']) !== undefined) {
        throw new Error('retrieval parameter is not supported in Gemini API.');
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToMldev$1(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToMldev$1(fromGoogleSearchRetrieval));
    }
    if (getValueByPath(fromObject, ['enterpriseWebSearch']) !== undefined) {
        throw new Error('enterpriseWebSearch parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['googleMaps']) !== undefined) {
        throw new Error('googleMaps parameter is not supported in Gemini API.');
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToMldev$1());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToMldev$1(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function functionCallingConfigToMldev(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromAllowedFunctionNames = getValueByPath(fromObject, [
        'allowedFunctionNames',
    ]);
    if (fromAllowedFunctionNames != null) {
        setValueByPath(toObject, ['allowedFunctionNames'], fromAllowedFunctionNames);
    }
    return toObject;
}
function latLngToMldev(fromObject) {
    const toObject = {};
    const fromLatitude = getValueByPath(fromObject, ['latitude']);
    if (fromLatitude != null) {
        setValueByPath(toObject, ['latitude'], fromLatitude);
    }
    const fromLongitude = getValueByPath(fromObject, ['longitude']);
    if (fromLongitude != null) {
        setValueByPath(toObject, ['longitude'], fromLongitude);
    }
    return toObject;
}
function retrievalConfigToMldev(fromObject) {
    const toObject = {};
    const fromLatLng = getValueByPath(fromObject, ['latLng']);
    if (fromLatLng != null) {
        setValueByPath(toObject, ['latLng'], latLngToMldev(fromLatLng));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function toolConfigToMldev(fromObject) {
    const toObject = {};
    const fromFunctionCallingConfig = getValueByPath(fromObject, [
        'functionCallingConfig',
    ]);
    if (fromFunctionCallingConfig != null) {
        setValueByPath(toObject, ['functionCallingConfig'], functionCallingConfigToMldev(fromFunctionCallingConfig));
    }
    const fromRetrievalConfig = getValueByPath(fromObject, [
        'retrievalConfig',
    ]);
    if (fromRetrievalConfig != null) {
        setValueByPath(toObject, ['retrievalConfig'], retrievalConfigToMldev(fromRetrievalConfig));
    }
    return toObject;
}
function prebuiltVoiceConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToMldev$1(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speakerVoiceConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromSpeaker = getValueByPath(fromObject, ['speaker']);
    if (fromSpeaker != null) {
        setValueByPath(toObject, ['speaker'], fromSpeaker);
    }
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$1(fromVoiceConfig));
    }
    return toObject;
}
function multiSpeakerVoiceConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromSpeakerVoiceConfigs = getValueByPath(fromObject, [
        'speakerVoiceConfigs',
    ]);
    if (fromSpeakerVoiceConfigs != null) {
        let transformedList = fromSpeakerVoiceConfigs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return speakerVoiceConfigToMldev$1(item);
            });
        }
        setValueByPath(toObject, ['speakerVoiceConfigs'], transformedList);
    }
    return toObject;
}
function speechConfigToMldev$1(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev$1(fromVoiceConfig));
    }
    const fromMultiSpeakerVoiceConfig = getValueByPath(fromObject, [
        'multiSpeakerVoiceConfig',
    ]);
    if (fromMultiSpeakerVoiceConfig != null) {
        setValueByPath(toObject, ['multiSpeakerVoiceConfig'], multiSpeakerVoiceConfigToMldev$1(fromMultiSpeakerVoiceConfig));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function thinkingConfigToMldev(fromObject) {
    const toObject = {};
    const fromIncludeThoughts = getValueByPath(fromObject, [
        'includeThoughts',
    ]);
    if (fromIncludeThoughts != null) {
        setValueByPath(toObject, ['includeThoughts'], fromIncludeThoughts);
    }
    const fromThinkingBudget = getValueByPath(fromObject, [
        'thinkingBudget',
    ]);
    if (fromThinkingBudget != null) {
        setValueByPath(toObject, ['thinkingBudget'], fromThinkingBudget);
    }
    return toObject;
}
function generateContentConfigToMldev(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToMldev$1(tContent(fromSystemInstruction)));
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (fromTemperature != null) {
        setValueByPath(toObject, ['temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (fromTopP != null) {
        setValueByPath(toObject, ['topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (fromTopK != null) {
        setValueByPath(toObject, ['topK'], fromTopK);
    }
    const fromCandidateCount = getValueByPath(fromObject, [
        'candidateCount',
    ]);
    if (fromCandidateCount != null) {
        setValueByPath(toObject, ['candidateCount'], fromCandidateCount);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (fromMaxOutputTokens != null) {
        setValueByPath(toObject, ['maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromStopSequences = getValueByPath(fromObject, [
        'stopSequences',
    ]);
    if (fromStopSequences != null) {
        setValueByPath(toObject, ['stopSequences'], fromStopSequences);
    }
    const fromResponseLogprobs = getValueByPath(fromObject, [
        'responseLogprobs',
    ]);
    if (fromResponseLogprobs != null) {
        setValueByPath(toObject, ['responseLogprobs'], fromResponseLogprobs);
    }
    const fromLogprobs = getValueByPath(fromObject, ['logprobs']);
    if (fromLogprobs != null) {
        setValueByPath(toObject, ['logprobs'], fromLogprobs);
    }
    const fromPresencePenalty = getValueByPath(fromObject, [
        'presencePenalty',
    ]);
    if (fromPresencePenalty != null) {
        setValueByPath(toObject, ['presencePenalty'], fromPresencePenalty);
    }
    const fromFrequencyPenalty = getValueByPath(fromObject, [
        'frequencyPenalty',
    ]);
    if (fromFrequencyPenalty != null) {
        setValueByPath(toObject, ['frequencyPenalty'], fromFrequencyPenalty);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (fromSeed != null) {
        setValueByPath(toObject, ['seed'], fromSeed);
    }
    const fromResponseMimeType = getValueByPath(fromObject, [
        'responseMimeType',
    ]);
    if (fromResponseMimeType != null) {
        setValueByPath(toObject, ['responseMimeType'], fromResponseMimeType);
    }
    const fromResponseSchema = getValueByPath(fromObject, [
        'responseSchema',
    ]);
    if (fromResponseSchema != null) {
        setValueByPath(toObject, ['responseSchema'], schemaToMldev(tSchema(fromResponseSchema)));
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    if (getValueByPath(fromObject, ['routingConfig']) !== undefined) {
        throw new Error('routingConfig parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['modelSelectionConfig']) !== undefined) {
        throw new Error('modelSelectionConfig parameter is not supported in Gemini API.');
    }
    const fromSafetySettings = getValueByPath(fromObject, [
        'safetySettings',
    ]);
    if (parentObject !== undefined && fromSafetySettings != null) {
        let transformedList = fromSafetySettings;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return safetySettingToMldev(item);
            });
        }
        setValueByPath(parentObject, ['safetySettings'], transformedList);
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToMldev$1(tTool(item));
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromToolConfig = getValueByPath(fromObject, ['toolConfig']);
    if (parentObject !== undefined && fromToolConfig != null) {
        setValueByPath(parentObject, ['toolConfig'], toolConfigToMldev(fromToolConfig));
    }
    if (getValueByPath(fromObject, ['labels']) !== undefined) {
        throw new Error('labels parameter is not supported in Gemini API.');
    }
    const fromCachedContent = getValueByPath(fromObject, [
        'cachedContent',
    ]);
    if (parentObject !== undefined && fromCachedContent != null) {
        setValueByPath(parentObject, ['cachedContent'], tCachedContentName(apiClient, fromCachedContent));
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (fromResponseModalities != null) {
        setValueByPath(toObject, ['responseModalities'], fromResponseModalities);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (fromMediaResolution != null) {
        setValueByPath(toObject, ['mediaResolution'], fromMediaResolution);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (fromSpeechConfig != null) {
        setValueByPath(toObject, ['speechConfig'], speechConfigToMldev$1(tSpeechConfig(fromSpeechConfig)));
    }
    if (getValueByPath(fromObject, ['audioTimestamp']) !== undefined) {
        throw new Error('audioTimestamp parameter is not supported in Gemini API.');
    }
    const fromThinkingConfig = getValueByPath(fromObject, [
        'thinkingConfig',
    ]);
    if (fromThinkingConfig != null) {
        setValueByPath(toObject, ['thinkingConfig'], thinkingConfigToMldev(fromThinkingConfig));
    }
    return toObject;
}
function generateContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToMldev$1(item);
            });
        }
        setValueByPath(toObject, ['contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['generationConfig'], generateContentConfigToMldev(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function embedContentConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromTaskType = getValueByPath(fromObject, ['taskType']);
    if (parentObject !== undefined && fromTaskType != null) {
        setValueByPath(parentObject, ['requests[]', 'taskType'], fromTaskType);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (parentObject !== undefined && fromTitle != null) {
        setValueByPath(parentObject, ['requests[]', 'title'], fromTitle);
    }
    const fromOutputDimensionality = getValueByPath(fromObject, [
        'outputDimensionality',
    ]);
    if (parentObject !== undefined && fromOutputDimensionality != null) {
        setValueByPath(parentObject, ['requests[]', 'outputDimensionality'], fromOutputDimensionality);
    }
    if (getValueByPath(fromObject, ['mimeType']) !== undefined) {
        throw new Error('mimeType parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['autoTruncate']) !== undefined) {
        throw new Error('autoTruncate parameter is not supported in Gemini API.');
    }
    return toObject;
}
function embedContentParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        setValueByPath(toObject, ['requests[]', 'content'], tContentsForEmbed(apiClient, fromContents));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], embedContentConfigToMldev(fromConfig, toObject));
    }
    const fromModelForEmbedContent = getValueByPath(fromObject, ['model']);
    if (fromModelForEmbedContent !== undefined) {
        setValueByPath(toObject, ['requests[]', 'model'], tModel(apiClient, fromModelForEmbedContent));
    }
    return toObject;
}
function generateImagesConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['outputGcsUri']) !== undefined) {
        throw new Error('outputGcsUri parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['negativePrompt']) !== undefined) {
        throw new Error('negativePrompt parameter is not supported in Gemini API.');
    }
    const fromNumberOfImages = getValueByPath(fromObject, [
        'numberOfImages',
    ]);
    if (parentObject !== undefined && fromNumberOfImages != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfImages);
    }
    const fromAspectRatio = getValueByPath(fromObject, ['aspectRatio']);
    if (parentObject !== undefined && fromAspectRatio != null) {
        setValueByPath(parentObject, ['parameters', 'aspectRatio'], fromAspectRatio);
    }
    const fromGuidanceScale = getValueByPath(fromObject, [
        'guidanceScale',
    ]);
    if (parentObject !== undefined && fromGuidanceScale != null) {
        setValueByPath(parentObject, ['parameters', 'guidanceScale'], fromGuidanceScale);
    }
    if (getValueByPath(fromObject, ['seed']) !== undefined) {
        throw new Error('seed parameter is not supported in Gemini API.');
    }
    const fromSafetyFilterLevel = getValueByPath(fromObject, [
        'safetyFilterLevel',
    ]);
    if (parentObject !== undefined && fromSafetyFilterLevel != null) {
        setValueByPath(parentObject, ['parameters', 'safetySetting'], fromSafetyFilterLevel);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    const fromIncludeSafetyAttributes = getValueByPath(fromObject, [
        'includeSafetyAttributes',
    ]);
    if (parentObject !== undefined && fromIncludeSafetyAttributes != null) {
        setValueByPath(parentObject, ['parameters', 'includeSafetyAttributes'], fromIncludeSafetyAttributes);
    }
    const fromIncludeRaiReason = getValueByPath(fromObject, [
        'includeRaiReason',
    ]);
    if (parentObject !== undefined && fromIncludeRaiReason != null) {
        setValueByPath(parentObject, ['parameters', 'includeRaiReason'], fromIncludeRaiReason);
    }
    const fromLanguage = getValueByPath(fromObject, ['language']);
    if (parentObject !== undefined && fromLanguage != null) {
        setValueByPath(parentObject, ['parameters', 'language'], fromLanguage);
    }
    const fromOutputMimeType = getValueByPath(fromObject, [
        'outputMimeType',
    ]);
    if (parentObject !== undefined && fromOutputMimeType != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'mimeType'], fromOutputMimeType);
    }
    const fromOutputCompressionQuality = getValueByPath(fromObject, [
        'outputCompressionQuality',
    ]);
    if (parentObject !== undefined && fromOutputCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'compressionQuality'], fromOutputCompressionQuality);
    }
    if (getValueByPath(fromObject, ['addWatermark']) !== undefined) {
        throw new Error('addWatermark parameter is not supported in Gemini API.');
    }
    const fromImageSize = getValueByPath(fromObject, ['imageSize']);
    if (parentObject !== undefined && fromImageSize != null) {
        setValueByPath(parentObject, ['parameters', 'sampleImageSize'], fromImageSize);
    }
    if (getValueByPath(fromObject, ['enhancePrompt']) !== undefined) {
        throw new Error('enhancePrompt parameter is not supported in Gemini API.');
    }
    return toObject;
}
function generateImagesParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromPrompt != null) {
        setValueByPath(toObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], generateImagesConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function getModelParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'name'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listModelsConfigToMldev(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    const fromFilter = getValueByPath(fromObject, ['filter']);
    if (parentObject !== undefined && fromFilter != null) {
        setValueByPath(parentObject, ['_query', 'filter'], fromFilter);
    }
    const fromQueryBase = getValueByPath(fromObject, ['queryBase']);
    if (parentObject !== undefined && fromQueryBase != null) {
        setValueByPath(parentObject, ['_url', 'models_url'], tModelsUrl(apiClient, fromQueryBase));
    }
    return toObject;
}
function listModelsParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listModelsConfigToMldev(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function updateModelConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromDisplayName);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (parentObject !== undefined && fromDescription != null) {
        setValueByPath(parentObject, ['description'], fromDescription);
    }
    const fromDefaultCheckpointId = getValueByPath(fromObject, [
        'defaultCheckpointId',
    ]);
    if (parentObject !== undefined && fromDefaultCheckpointId != null) {
        setValueByPath(parentObject, ['defaultCheckpointId'], fromDefaultCheckpointId);
    }
    return toObject;
}
function updateModelParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'name'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], updateModelConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function deleteModelParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'name'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function countTokensConfigToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['systemInstruction']) !== undefined) {
        throw new Error('systemInstruction parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['tools']) !== undefined) {
        throw new Error('tools parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['generationConfig']) !== undefined) {
        throw new Error('generationConfig parameter is not supported in Gemini API.');
    }
    return toObject;
}
function countTokensParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToMldev$1(item);
            });
        }
        setValueByPath(toObject, ['contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], countTokensConfigToMldev(fromConfig));
    }
    return toObject;
}
function imageToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['gcsUri']) !== undefined) {
        throw new Error('gcsUri parameter is not supported in Gemini API.');
    }
    const fromImageBytes = getValueByPath(fromObject, ['imageBytes']);
    if (fromImageBytes != null) {
        setValueByPath(toObject, ['bytesBase64Encoded'], tBytes(fromImageBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generateVideosSourceToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (parentObject !== undefined && fromPrompt != null) {
        setValueByPath(parentObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (parentObject !== undefined && fromImage != null) {
        setValueByPath(parentObject, ['instances[0]', 'image'], imageToMldev(fromImage));
    }
    if (getValueByPath(fromObject, ['video']) !== undefined) {
        throw new Error('video parameter is not supported in Gemini API.');
    }
    return toObject;
}
function generateVideosConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromNumberOfVideos = getValueByPath(fromObject, [
        'numberOfVideos',
    ]);
    if (parentObject !== undefined && fromNumberOfVideos != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfVideos);
    }
    if (getValueByPath(fromObject, ['outputGcsUri']) !== undefined) {
        throw new Error('outputGcsUri parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['fps']) !== undefined) {
        throw new Error('fps parameter is not supported in Gemini API.');
    }
    const fromDurationSeconds = getValueByPath(fromObject, [
        'durationSeconds',
    ]);
    if (parentObject !== undefined && fromDurationSeconds != null) {
        setValueByPath(parentObject, ['parameters', 'durationSeconds'], fromDurationSeconds);
    }
    if (getValueByPath(fromObject, ['seed']) !== undefined) {
        throw new Error('seed parameter is not supported in Gemini API.');
    }
    const fromAspectRatio = getValueByPath(fromObject, ['aspectRatio']);
    if (parentObject !== undefined && fromAspectRatio != null) {
        setValueByPath(parentObject, ['parameters', 'aspectRatio'], fromAspectRatio);
    }
    const fromResolution = getValueByPath(fromObject, ['resolution']);
    if (parentObject !== undefined && fromResolution != null) {
        setValueByPath(parentObject, ['parameters', 'resolution'], fromResolution);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    if (getValueByPath(fromObject, ['pubsubTopic']) !== undefined) {
        throw new Error('pubsubTopic parameter is not supported in Gemini API.');
    }
    const fromNegativePrompt = getValueByPath(fromObject, [
        'negativePrompt',
    ]);
    if (parentObject !== undefined && fromNegativePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'negativePrompt'], fromNegativePrompt);
    }
    const fromEnhancePrompt = getValueByPath(fromObject, [
        'enhancePrompt',
    ]);
    if (parentObject !== undefined && fromEnhancePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'enhancePrompt'], fromEnhancePrompt);
    }
    if (getValueByPath(fromObject, ['generateAudio']) !== undefined) {
        throw new Error('generateAudio parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['lastFrame']) !== undefined) {
        throw new Error('lastFrame parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['referenceImages']) !== undefined) {
        throw new Error('referenceImages parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['mask']) !== undefined) {
        throw new Error('mask parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['compressionQuality']) !== undefined) {
        throw new Error('compressionQuality parameter is not supported in Gemini API.');
    }
    return toObject;
}
function generateVideosParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromPrompt != null) {
        setValueByPath(toObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['instances[0]', 'image'], imageToMldev(fromImage));
    }
    if (getValueByPath(fromObject, ['video']) !== undefined) {
        throw new Error('video parameter is not supported in Gemini API.');
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['config'], generateVideosSourceToMldev(fromSource, toObject));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], generateVideosConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function videoMetadataToVertex(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToVertex(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToVertex(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToVertex(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToVertex(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToVertex(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToVertex(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToVertex(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToVertex(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToVertex(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToVertex(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function schemaToVertex(fromObject) {
    const toObject = {};
    const fromAnyOf = getValueByPath(fromObject, ['anyOf']);
    if (fromAnyOf != null) {
        setValueByPath(toObject, ['anyOf'], fromAnyOf);
    }
    const fromDefault = getValueByPath(fromObject, ['default']);
    if (fromDefault != null) {
        setValueByPath(toObject, ['default'], fromDefault);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromEnum = getValueByPath(fromObject, ['enum']);
    if (fromEnum != null) {
        setValueByPath(toObject, ['enum'], fromEnum);
    }
    const fromExample = getValueByPath(fromObject, ['example']);
    if (fromExample != null) {
        setValueByPath(toObject, ['example'], fromExample);
    }
    const fromFormat = getValueByPath(fromObject, ['format']);
    if (fromFormat != null) {
        setValueByPath(toObject, ['format'], fromFormat);
    }
    const fromItems = getValueByPath(fromObject, ['items']);
    if (fromItems != null) {
        setValueByPath(toObject, ['items'], fromItems);
    }
    const fromMaxItems = getValueByPath(fromObject, ['maxItems']);
    if (fromMaxItems != null) {
        setValueByPath(toObject, ['maxItems'], fromMaxItems);
    }
    const fromMaxLength = getValueByPath(fromObject, ['maxLength']);
    if (fromMaxLength != null) {
        setValueByPath(toObject, ['maxLength'], fromMaxLength);
    }
    const fromMaxProperties = getValueByPath(fromObject, [
        'maxProperties',
    ]);
    if (fromMaxProperties != null) {
        setValueByPath(toObject, ['maxProperties'], fromMaxProperties);
    }
    const fromMaximum = getValueByPath(fromObject, ['maximum']);
    if (fromMaximum != null) {
        setValueByPath(toObject, ['maximum'], fromMaximum);
    }
    const fromMinItems = getValueByPath(fromObject, ['minItems']);
    if (fromMinItems != null) {
        setValueByPath(toObject, ['minItems'], fromMinItems);
    }
    const fromMinLength = getValueByPath(fromObject, ['minLength']);
    if (fromMinLength != null) {
        setValueByPath(toObject, ['minLength'], fromMinLength);
    }
    const fromMinProperties = getValueByPath(fromObject, [
        'minProperties',
    ]);
    if (fromMinProperties != null) {
        setValueByPath(toObject, ['minProperties'], fromMinProperties);
    }
    const fromMinimum = getValueByPath(fromObject, ['minimum']);
    if (fromMinimum != null) {
        setValueByPath(toObject, ['minimum'], fromMinimum);
    }
    const fromNullable = getValueByPath(fromObject, ['nullable']);
    if (fromNullable != null) {
        setValueByPath(toObject, ['nullable'], fromNullable);
    }
    const fromPattern = getValueByPath(fromObject, ['pattern']);
    if (fromPattern != null) {
        setValueByPath(toObject, ['pattern'], fromPattern);
    }
    const fromProperties = getValueByPath(fromObject, ['properties']);
    if (fromProperties != null) {
        setValueByPath(toObject, ['properties'], fromProperties);
    }
    const fromPropertyOrdering = getValueByPath(fromObject, [
        'propertyOrdering',
    ]);
    if (fromPropertyOrdering != null) {
        setValueByPath(toObject, ['propertyOrdering'], fromPropertyOrdering);
    }
    const fromRequired = getValueByPath(fromObject, ['required']);
    if (fromRequired != null) {
        setValueByPath(toObject, ['required'], fromRequired);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (fromTitle != null) {
        setValueByPath(toObject, ['title'], fromTitle);
    }
    const fromType = getValueByPath(fromObject, ['type']);
    if (fromType != null) {
        setValueByPath(toObject, ['type'], fromType);
    }
    return toObject;
}
function modelSelectionConfigToVertex(fromObject) {
    const toObject = {};
    const fromFeatureSelectionPreference = getValueByPath(fromObject, [
        'featureSelectionPreference',
    ]);
    if (fromFeatureSelectionPreference != null) {
        setValueByPath(toObject, ['featureSelectionPreference'], fromFeatureSelectionPreference);
    }
    return toObject;
}
function safetySettingToVertex(fromObject) {
    const toObject = {};
    const fromMethod = getValueByPath(fromObject, ['method']);
    if (fromMethod != null) {
        setValueByPath(toObject, ['method'], fromMethod);
    }
    const fromCategory = getValueByPath(fromObject, ['category']);
    if (fromCategory != null) {
        setValueByPath(toObject, ['category'], fromCategory);
    }
    const fromThreshold = getValueByPath(fromObject, ['threshold']);
    if (fromThreshold != null) {
        setValueByPath(toObject, ['threshold'], fromThreshold);
    }
    return toObject;
}
function functionDeclarationToVertex(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['behavior']) !== undefined) {
        throw new Error('behavior parameter is not supported in Vertex AI.');
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToVertex(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToVertex(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToVertex(fromTimeRangeFilter));
    }
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function dynamicRetrievalConfigToVertex(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToVertex(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToVertex(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function enterpriseWebSearchToVertex(fromObject) {
    const toObject = {};
    const fromExcludeDomains = getValueByPath(fromObject, [
        'excludeDomains',
    ]);
    if (fromExcludeDomains != null) {
        setValueByPath(toObject, ['excludeDomains'], fromExcludeDomains);
    }
    return toObject;
}
function apiKeyConfigToVertex(fromObject) {
    const toObject = {};
    const fromApiKeyString = getValueByPath(fromObject, ['apiKeyString']);
    if (fromApiKeyString != null) {
        setValueByPath(toObject, ['apiKeyString'], fromApiKeyString);
    }
    return toObject;
}
function authConfigToVertex(fromObject) {
    const toObject = {};
    const fromApiKeyConfig = getValueByPath(fromObject, ['apiKeyConfig']);
    if (fromApiKeyConfig != null) {
        setValueByPath(toObject, ['apiKeyConfig'], apiKeyConfigToVertex(fromApiKeyConfig));
    }
    const fromAuthType = getValueByPath(fromObject, ['authType']);
    if (fromAuthType != null) {
        setValueByPath(toObject, ['authType'], fromAuthType);
    }
    const fromGoogleServiceAccountConfig = getValueByPath(fromObject, [
        'googleServiceAccountConfig',
    ]);
    if (fromGoogleServiceAccountConfig != null) {
        setValueByPath(toObject, ['googleServiceAccountConfig'], fromGoogleServiceAccountConfig);
    }
    const fromHttpBasicAuthConfig = getValueByPath(fromObject, [
        'httpBasicAuthConfig',
    ]);
    if (fromHttpBasicAuthConfig != null) {
        setValueByPath(toObject, ['httpBasicAuthConfig'], fromHttpBasicAuthConfig);
    }
    const fromOauthConfig = getValueByPath(fromObject, ['oauthConfig']);
    if (fromOauthConfig != null) {
        setValueByPath(toObject, ['oauthConfig'], fromOauthConfig);
    }
    const fromOidcConfig = getValueByPath(fromObject, ['oidcConfig']);
    if (fromOidcConfig != null) {
        setValueByPath(toObject, ['oidcConfig'], fromOidcConfig);
    }
    return toObject;
}
function googleMapsToVertex(fromObject) {
    const toObject = {};
    const fromAuthConfig = getValueByPath(fromObject, ['authConfig']);
    if (fromAuthConfig != null) {
        setValueByPath(toObject, ['authConfig'], authConfigToVertex(fromAuthConfig));
    }
    return toObject;
}
function urlContextToVertex() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToVertex(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToVertex(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToVertex(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    const fromRetrieval = getValueByPath(fromObject, ['retrieval']);
    if (fromRetrieval != null) {
        setValueByPath(toObject, ['retrieval'], fromRetrieval);
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToVertex(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToVertex(fromGoogleSearchRetrieval));
    }
    const fromEnterpriseWebSearch = getValueByPath(fromObject, [
        'enterpriseWebSearch',
    ]);
    if (fromEnterpriseWebSearch != null) {
        setValueByPath(toObject, ['enterpriseWebSearch'], enterpriseWebSearchToVertex(fromEnterpriseWebSearch));
    }
    const fromGoogleMaps = getValueByPath(fromObject, ['googleMaps']);
    if (fromGoogleMaps != null) {
        setValueByPath(toObject, ['googleMaps'], googleMapsToVertex(fromGoogleMaps));
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToVertex());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToVertex(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function functionCallingConfigToVertex(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromAllowedFunctionNames = getValueByPath(fromObject, [
        'allowedFunctionNames',
    ]);
    if (fromAllowedFunctionNames != null) {
        setValueByPath(toObject, ['allowedFunctionNames'], fromAllowedFunctionNames);
    }
    return toObject;
}
function latLngToVertex(fromObject) {
    const toObject = {};
    const fromLatitude = getValueByPath(fromObject, ['latitude']);
    if (fromLatitude != null) {
        setValueByPath(toObject, ['latitude'], fromLatitude);
    }
    const fromLongitude = getValueByPath(fromObject, ['longitude']);
    if (fromLongitude != null) {
        setValueByPath(toObject, ['longitude'], fromLongitude);
    }
    return toObject;
}
function retrievalConfigToVertex(fromObject) {
    const toObject = {};
    const fromLatLng = getValueByPath(fromObject, ['latLng']);
    if (fromLatLng != null) {
        setValueByPath(toObject, ['latLng'], latLngToVertex(fromLatLng));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function toolConfigToVertex(fromObject) {
    const toObject = {};
    const fromFunctionCallingConfig = getValueByPath(fromObject, [
        'functionCallingConfig',
    ]);
    if (fromFunctionCallingConfig != null) {
        setValueByPath(toObject, ['functionCallingConfig'], functionCallingConfigToVertex(fromFunctionCallingConfig));
    }
    const fromRetrievalConfig = getValueByPath(fromObject, [
        'retrievalConfig',
    ]);
    if (fromRetrievalConfig != null) {
        setValueByPath(toObject, ['retrievalConfig'], retrievalConfigToVertex(fromRetrievalConfig));
    }
    return toObject;
}
function prebuiltVoiceConfigToVertex(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToVertex(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToVertex(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speechConfigToVertex(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToVertex(fromVoiceConfig));
    }
    if (getValueByPath(fromObject, ['multiSpeakerVoiceConfig']) !== undefined) {
        throw new Error('multiSpeakerVoiceConfig parameter is not supported in Vertex AI.');
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function thinkingConfigToVertex(fromObject) {
    const toObject = {};
    const fromIncludeThoughts = getValueByPath(fromObject, [
        'includeThoughts',
    ]);
    if (fromIncludeThoughts != null) {
        setValueByPath(toObject, ['includeThoughts'], fromIncludeThoughts);
    }
    const fromThinkingBudget = getValueByPath(fromObject, [
        'thinkingBudget',
    ]);
    if (fromThinkingBudget != null) {
        setValueByPath(toObject, ['thinkingBudget'], fromThinkingBudget);
    }
    return toObject;
}
function generateContentConfigToVertex(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToVertex(tContent(fromSystemInstruction)));
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (fromTemperature != null) {
        setValueByPath(toObject, ['temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (fromTopP != null) {
        setValueByPath(toObject, ['topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (fromTopK != null) {
        setValueByPath(toObject, ['topK'], fromTopK);
    }
    const fromCandidateCount = getValueByPath(fromObject, [
        'candidateCount',
    ]);
    if (fromCandidateCount != null) {
        setValueByPath(toObject, ['candidateCount'], fromCandidateCount);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (fromMaxOutputTokens != null) {
        setValueByPath(toObject, ['maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromStopSequences = getValueByPath(fromObject, [
        'stopSequences',
    ]);
    if (fromStopSequences != null) {
        setValueByPath(toObject, ['stopSequences'], fromStopSequences);
    }
    const fromResponseLogprobs = getValueByPath(fromObject, [
        'responseLogprobs',
    ]);
    if (fromResponseLogprobs != null) {
        setValueByPath(toObject, ['responseLogprobs'], fromResponseLogprobs);
    }
    const fromLogprobs = getValueByPath(fromObject, ['logprobs']);
    if (fromLogprobs != null) {
        setValueByPath(toObject, ['logprobs'], fromLogprobs);
    }
    const fromPresencePenalty = getValueByPath(fromObject, [
        'presencePenalty',
    ]);
    if (fromPresencePenalty != null) {
        setValueByPath(toObject, ['presencePenalty'], fromPresencePenalty);
    }
    const fromFrequencyPenalty = getValueByPath(fromObject, [
        'frequencyPenalty',
    ]);
    if (fromFrequencyPenalty != null) {
        setValueByPath(toObject, ['frequencyPenalty'], fromFrequencyPenalty);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (fromSeed != null) {
        setValueByPath(toObject, ['seed'], fromSeed);
    }
    const fromResponseMimeType = getValueByPath(fromObject, [
        'responseMimeType',
    ]);
    if (fromResponseMimeType != null) {
        setValueByPath(toObject, ['responseMimeType'], fromResponseMimeType);
    }
    const fromResponseSchema = getValueByPath(fromObject, [
        'responseSchema',
    ]);
    if (fromResponseSchema != null) {
        setValueByPath(toObject, ['responseSchema'], schemaToVertex(tSchema(fromResponseSchema)));
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    const fromRoutingConfig = getValueByPath(fromObject, [
        'routingConfig',
    ]);
    if (fromRoutingConfig != null) {
        setValueByPath(toObject, ['routingConfig'], fromRoutingConfig);
    }
    const fromModelSelectionConfig = getValueByPath(fromObject, [
        'modelSelectionConfig',
    ]);
    if (fromModelSelectionConfig != null) {
        setValueByPath(toObject, ['modelConfig'], modelSelectionConfigToVertex(fromModelSelectionConfig));
    }
    const fromSafetySettings = getValueByPath(fromObject, [
        'safetySettings',
    ]);
    if (parentObject !== undefined && fromSafetySettings != null) {
        let transformedList = fromSafetySettings;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return safetySettingToVertex(item);
            });
        }
        setValueByPath(parentObject, ['safetySettings'], transformedList);
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToVertex(tTool(item));
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromToolConfig = getValueByPath(fromObject, ['toolConfig']);
    if (parentObject !== undefined && fromToolConfig != null) {
        setValueByPath(parentObject, ['toolConfig'], toolConfigToVertex(fromToolConfig));
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (parentObject !== undefined && fromLabels != null) {
        setValueByPath(parentObject, ['labels'], fromLabels);
    }
    const fromCachedContent = getValueByPath(fromObject, [
        'cachedContent',
    ]);
    if (parentObject !== undefined && fromCachedContent != null) {
        setValueByPath(parentObject, ['cachedContent'], tCachedContentName(apiClient, fromCachedContent));
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (fromResponseModalities != null) {
        setValueByPath(toObject, ['responseModalities'], fromResponseModalities);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (fromMediaResolution != null) {
        setValueByPath(toObject, ['mediaResolution'], fromMediaResolution);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (fromSpeechConfig != null) {
        setValueByPath(toObject, ['speechConfig'], speechConfigToVertex(tSpeechConfig(fromSpeechConfig)));
    }
    const fromAudioTimestamp = getValueByPath(fromObject, [
        'audioTimestamp',
    ]);
    if (fromAudioTimestamp != null) {
        setValueByPath(toObject, ['audioTimestamp'], fromAudioTimestamp);
    }
    const fromThinkingConfig = getValueByPath(fromObject, [
        'thinkingConfig',
    ]);
    if (fromThinkingConfig != null) {
        setValueByPath(toObject, ['thinkingConfig'], thinkingConfigToVertex(fromThinkingConfig));
    }
    return toObject;
}
function generateContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToVertex(item);
            });
        }
        setValueByPath(toObject, ['contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['generationConfig'], generateContentConfigToVertex(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function embedContentConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromTaskType = getValueByPath(fromObject, ['taskType']);
    if (parentObject !== undefined && fromTaskType != null) {
        setValueByPath(parentObject, ['instances[]', 'task_type'], fromTaskType);
    }
    const fromTitle = getValueByPath(fromObject, ['title']);
    if (parentObject !== undefined && fromTitle != null) {
        setValueByPath(parentObject, ['instances[]', 'title'], fromTitle);
    }
    const fromOutputDimensionality = getValueByPath(fromObject, [
        'outputDimensionality',
    ]);
    if (parentObject !== undefined && fromOutputDimensionality != null) {
        setValueByPath(parentObject, ['parameters', 'outputDimensionality'], fromOutputDimensionality);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (parentObject !== undefined && fromMimeType != null) {
        setValueByPath(parentObject, ['instances[]', 'mimeType'], fromMimeType);
    }
    const fromAutoTruncate = getValueByPath(fromObject, ['autoTruncate']);
    if (parentObject !== undefined && fromAutoTruncate != null) {
        setValueByPath(parentObject, ['parameters', 'autoTruncate'], fromAutoTruncate);
    }
    return toObject;
}
function embedContentParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        setValueByPath(toObject, ['instances[]', 'content'], tContentsForEmbed(apiClient, fromContents));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], embedContentConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function generateImagesConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromOutputGcsUri = getValueByPath(fromObject, ['outputGcsUri']);
    if (parentObject !== undefined && fromOutputGcsUri != null) {
        setValueByPath(parentObject, ['parameters', 'storageUri'], fromOutputGcsUri);
    }
    const fromNegativePrompt = getValueByPath(fromObject, [
        'negativePrompt',
    ]);
    if (parentObject !== undefined && fromNegativePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'negativePrompt'], fromNegativePrompt);
    }
    const fromNumberOfImages = getValueByPath(fromObject, [
        'numberOfImages',
    ]);
    if (parentObject !== undefined && fromNumberOfImages != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfImages);
    }
    const fromAspectRatio = getValueByPath(fromObject, ['aspectRatio']);
    if (parentObject !== undefined && fromAspectRatio != null) {
        setValueByPath(parentObject, ['parameters', 'aspectRatio'], fromAspectRatio);
    }
    const fromGuidanceScale = getValueByPath(fromObject, [
        'guidanceScale',
    ]);
    if (parentObject !== undefined && fromGuidanceScale != null) {
        setValueByPath(parentObject, ['parameters', 'guidanceScale'], fromGuidanceScale);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['parameters', 'seed'], fromSeed);
    }
    const fromSafetyFilterLevel = getValueByPath(fromObject, [
        'safetyFilterLevel',
    ]);
    if (parentObject !== undefined && fromSafetyFilterLevel != null) {
        setValueByPath(parentObject, ['parameters', 'safetySetting'], fromSafetyFilterLevel);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    const fromIncludeSafetyAttributes = getValueByPath(fromObject, [
        'includeSafetyAttributes',
    ]);
    if (parentObject !== undefined && fromIncludeSafetyAttributes != null) {
        setValueByPath(parentObject, ['parameters', 'includeSafetyAttributes'], fromIncludeSafetyAttributes);
    }
    const fromIncludeRaiReason = getValueByPath(fromObject, [
        'includeRaiReason',
    ]);
    if (parentObject !== undefined && fromIncludeRaiReason != null) {
        setValueByPath(parentObject, ['parameters', 'includeRaiReason'], fromIncludeRaiReason);
    }
    const fromLanguage = getValueByPath(fromObject, ['language']);
    if (parentObject !== undefined && fromLanguage != null) {
        setValueByPath(parentObject, ['parameters', 'language'], fromLanguage);
    }
    const fromOutputMimeType = getValueByPath(fromObject, [
        'outputMimeType',
    ]);
    if (parentObject !== undefined && fromOutputMimeType != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'mimeType'], fromOutputMimeType);
    }
    const fromOutputCompressionQuality = getValueByPath(fromObject, [
        'outputCompressionQuality',
    ]);
    if (parentObject !== undefined && fromOutputCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'compressionQuality'], fromOutputCompressionQuality);
    }
    const fromAddWatermark = getValueByPath(fromObject, ['addWatermark']);
    if (parentObject !== undefined && fromAddWatermark != null) {
        setValueByPath(parentObject, ['parameters', 'addWatermark'], fromAddWatermark);
    }
    const fromImageSize = getValueByPath(fromObject, ['imageSize']);
    if (parentObject !== undefined && fromImageSize != null) {
        setValueByPath(parentObject, ['parameters', 'sampleImageSize'], fromImageSize);
    }
    const fromEnhancePrompt = getValueByPath(fromObject, [
        'enhancePrompt',
    ]);
    if (parentObject !== undefined && fromEnhancePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'enhancePrompt'], fromEnhancePrompt);
    }
    return toObject;
}
function generateImagesParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromPrompt != null) {
        setValueByPath(toObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], generateImagesConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function imageToVertex(fromObject) {
    const toObject = {};
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsUri'], fromGcsUri);
    }
    const fromImageBytes = getValueByPath(fromObject, ['imageBytes']);
    if (fromImageBytes != null) {
        setValueByPath(toObject, ['bytesBase64Encoded'], tBytes(fromImageBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function maskReferenceConfigToVertex(fromObject) {
    const toObject = {};
    const fromMaskMode = getValueByPath(fromObject, ['maskMode']);
    if (fromMaskMode != null) {
        setValueByPath(toObject, ['maskMode'], fromMaskMode);
    }
    const fromSegmentationClasses = getValueByPath(fromObject, [
        'segmentationClasses',
    ]);
    if (fromSegmentationClasses != null) {
        setValueByPath(toObject, ['maskClasses'], fromSegmentationClasses);
    }
    const fromMaskDilation = getValueByPath(fromObject, ['maskDilation']);
    if (fromMaskDilation != null) {
        setValueByPath(toObject, ['dilation'], fromMaskDilation);
    }
    return toObject;
}
function controlReferenceConfigToVertex(fromObject) {
    const toObject = {};
    const fromControlType = getValueByPath(fromObject, ['controlType']);
    if (fromControlType != null) {
        setValueByPath(toObject, ['controlType'], fromControlType);
    }
    const fromEnableControlImageComputation = getValueByPath(fromObject, [
        'enableControlImageComputation',
    ]);
    if (fromEnableControlImageComputation != null) {
        setValueByPath(toObject, ['computeControl'], fromEnableControlImageComputation);
    }
    return toObject;
}
function styleReferenceConfigToVertex(fromObject) {
    const toObject = {};
    const fromStyleDescription = getValueByPath(fromObject, [
        'styleDescription',
    ]);
    if (fromStyleDescription != null) {
        setValueByPath(toObject, ['styleDescription'], fromStyleDescription);
    }
    return toObject;
}
function subjectReferenceConfigToVertex(fromObject) {
    const toObject = {};
    const fromSubjectType = getValueByPath(fromObject, ['subjectType']);
    if (fromSubjectType != null) {
        setValueByPath(toObject, ['subjectType'], fromSubjectType);
    }
    const fromSubjectDescription = getValueByPath(fromObject, [
        'subjectDescription',
    ]);
    if (fromSubjectDescription != null) {
        setValueByPath(toObject, ['subjectDescription'], fromSubjectDescription);
    }
    return toObject;
}
function referenceImageAPIInternalToVertex(fromObject) {
    const toObject = {};
    const fromReferenceImage = getValueByPath(fromObject, [
        'referenceImage',
    ]);
    if (fromReferenceImage != null) {
        setValueByPath(toObject, ['referenceImage'], imageToVertex(fromReferenceImage));
    }
    const fromReferenceId = getValueByPath(fromObject, ['referenceId']);
    if (fromReferenceId != null) {
        setValueByPath(toObject, ['referenceId'], fromReferenceId);
    }
    const fromReferenceType = getValueByPath(fromObject, [
        'referenceType',
    ]);
    if (fromReferenceType != null) {
        setValueByPath(toObject, ['referenceType'], fromReferenceType);
    }
    const fromMaskImageConfig = getValueByPath(fromObject, [
        'maskImageConfig',
    ]);
    if (fromMaskImageConfig != null) {
        setValueByPath(toObject, ['maskImageConfig'], maskReferenceConfigToVertex(fromMaskImageConfig));
    }
    const fromControlImageConfig = getValueByPath(fromObject, [
        'controlImageConfig',
    ]);
    if (fromControlImageConfig != null) {
        setValueByPath(toObject, ['controlImageConfig'], controlReferenceConfigToVertex(fromControlImageConfig));
    }
    const fromStyleImageConfig = getValueByPath(fromObject, [
        'styleImageConfig',
    ]);
    if (fromStyleImageConfig != null) {
        setValueByPath(toObject, ['styleImageConfig'], styleReferenceConfigToVertex(fromStyleImageConfig));
    }
    const fromSubjectImageConfig = getValueByPath(fromObject, [
        'subjectImageConfig',
    ]);
    if (fromSubjectImageConfig != null) {
        setValueByPath(toObject, ['subjectImageConfig'], subjectReferenceConfigToVertex(fromSubjectImageConfig));
    }
    return toObject;
}
function editImageConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromOutputGcsUri = getValueByPath(fromObject, ['outputGcsUri']);
    if (parentObject !== undefined && fromOutputGcsUri != null) {
        setValueByPath(parentObject, ['parameters', 'storageUri'], fromOutputGcsUri);
    }
    const fromNegativePrompt = getValueByPath(fromObject, [
        'negativePrompt',
    ]);
    if (parentObject !== undefined && fromNegativePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'negativePrompt'], fromNegativePrompt);
    }
    const fromNumberOfImages = getValueByPath(fromObject, [
        'numberOfImages',
    ]);
    if (parentObject !== undefined && fromNumberOfImages != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfImages);
    }
    const fromAspectRatio = getValueByPath(fromObject, ['aspectRatio']);
    if (parentObject !== undefined && fromAspectRatio != null) {
        setValueByPath(parentObject, ['parameters', 'aspectRatio'], fromAspectRatio);
    }
    const fromGuidanceScale = getValueByPath(fromObject, [
        'guidanceScale',
    ]);
    if (parentObject !== undefined && fromGuidanceScale != null) {
        setValueByPath(parentObject, ['parameters', 'guidanceScale'], fromGuidanceScale);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['parameters', 'seed'], fromSeed);
    }
    const fromSafetyFilterLevel = getValueByPath(fromObject, [
        'safetyFilterLevel',
    ]);
    if (parentObject !== undefined && fromSafetyFilterLevel != null) {
        setValueByPath(parentObject, ['parameters', 'safetySetting'], fromSafetyFilterLevel);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    const fromIncludeSafetyAttributes = getValueByPath(fromObject, [
        'includeSafetyAttributes',
    ]);
    if (parentObject !== undefined && fromIncludeSafetyAttributes != null) {
        setValueByPath(parentObject, ['parameters', 'includeSafetyAttributes'], fromIncludeSafetyAttributes);
    }
    const fromIncludeRaiReason = getValueByPath(fromObject, [
        'includeRaiReason',
    ]);
    if (parentObject !== undefined && fromIncludeRaiReason != null) {
        setValueByPath(parentObject, ['parameters', 'includeRaiReason'], fromIncludeRaiReason);
    }
    const fromLanguage = getValueByPath(fromObject, ['language']);
    if (parentObject !== undefined && fromLanguage != null) {
        setValueByPath(parentObject, ['parameters', 'language'], fromLanguage);
    }
    const fromOutputMimeType = getValueByPath(fromObject, [
        'outputMimeType',
    ]);
    if (parentObject !== undefined && fromOutputMimeType != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'mimeType'], fromOutputMimeType);
    }
    const fromOutputCompressionQuality = getValueByPath(fromObject, [
        'outputCompressionQuality',
    ]);
    if (parentObject !== undefined && fromOutputCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'compressionQuality'], fromOutputCompressionQuality);
    }
    const fromAddWatermark = getValueByPath(fromObject, ['addWatermark']);
    if (parentObject !== undefined && fromAddWatermark != null) {
        setValueByPath(parentObject, ['parameters', 'addWatermark'], fromAddWatermark);
    }
    const fromEditMode = getValueByPath(fromObject, ['editMode']);
    if (parentObject !== undefined && fromEditMode != null) {
        setValueByPath(parentObject, ['parameters', 'editMode'], fromEditMode);
    }
    const fromBaseSteps = getValueByPath(fromObject, ['baseSteps']);
    if (parentObject !== undefined && fromBaseSteps != null) {
        setValueByPath(parentObject, ['parameters', 'editConfig', 'baseSteps'], fromBaseSteps);
    }
    return toObject;
}
function editImageParametersInternalToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromPrompt != null) {
        setValueByPath(toObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromReferenceImages = getValueByPath(fromObject, [
        'referenceImages',
    ]);
    if (fromReferenceImages != null) {
        let transformedList = fromReferenceImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return referenceImageAPIInternalToVertex(item);
            });
        }
        setValueByPath(toObject, ['instances[0]', 'referenceImages'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], editImageConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function upscaleImageAPIConfigInternalToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromOutputGcsUri = getValueByPath(fromObject, ['outputGcsUri']);
    if (parentObject !== undefined && fromOutputGcsUri != null) {
        setValueByPath(parentObject, ['parameters', 'storageUri'], fromOutputGcsUri);
    }
    const fromIncludeRaiReason = getValueByPath(fromObject, [
        'includeRaiReason',
    ]);
    if (parentObject !== undefined && fromIncludeRaiReason != null) {
        setValueByPath(parentObject, ['parameters', 'includeRaiReason'], fromIncludeRaiReason);
    }
    const fromOutputMimeType = getValueByPath(fromObject, [
        'outputMimeType',
    ]);
    if (parentObject !== undefined && fromOutputMimeType != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'mimeType'], fromOutputMimeType);
    }
    const fromOutputCompressionQuality = getValueByPath(fromObject, [
        'outputCompressionQuality',
    ]);
    if (parentObject !== undefined && fromOutputCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'compressionQuality'], fromOutputCompressionQuality);
    }
    const fromEnhanceInputImage = getValueByPath(fromObject, [
        'enhanceInputImage',
    ]);
    if (parentObject !== undefined && fromEnhanceInputImage != null) {
        setValueByPath(parentObject, ['parameters', 'upscaleConfig', 'enhanceInputImage'], fromEnhanceInputImage);
    }
    const fromImagePreservationFactor = getValueByPath(fromObject, [
        'imagePreservationFactor',
    ]);
    if (parentObject !== undefined && fromImagePreservationFactor != null) {
        setValueByPath(parentObject, ['parameters', 'upscaleConfig', 'imagePreservationFactor'], fromImagePreservationFactor);
    }
    const fromNumberOfImages = getValueByPath(fromObject, [
        'numberOfImages',
    ]);
    if (parentObject !== undefined && fromNumberOfImages != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfImages);
    }
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (parentObject !== undefined && fromMode != null) {
        setValueByPath(parentObject, ['parameters', 'mode'], fromMode);
    }
    return toObject;
}
function upscaleImageAPIParametersInternalToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['instances[0]', 'image'], imageToVertex(fromImage));
    }
    const fromUpscaleFactor = getValueByPath(fromObject, [
        'upscaleFactor',
    ]);
    if (fromUpscaleFactor != null) {
        setValueByPath(toObject, ['parameters', 'upscaleConfig', 'upscaleFactor'], fromUpscaleFactor);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], upscaleImageAPIConfigInternalToVertex(fromConfig, toObject));
    }
    return toObject;
}
function productImageToVertex(fromObject) {
    const toObject = {};
    const fromProductImage = getValueByPath(fromObject, ['productImage']);
    if (fromProductImage != null) {
        setValueByPath(toObject, ['image'], imageToVertex(fromProductImage));
    }
    return toObject;
}
function recontextImageSourceToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (parentObject !== undefined && fromPrompt != null) {
        setValueByPath(parentObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromPersonImage = getValueByPath(fromObject, ['personImage']);
    if (parentObject !== undefined && fromPersonImage != null) {
        setValueByPath(parentObject, ['instances[0]', 'personImage', 'image'], imageToVertex(fromPersonImage));
    }
    const fromProductImages = getValueByPath(fromObject, [
        'productImages',
    ]);
    if (parentObject !== undefined && fromProductImages != null) {
        let transformedList = fromProductImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return productImageToVertex(item);
            });
        }
        setValueByPath(parentObject, ['instances[0]', 'productImages'], transformedList);
    }
    return toObject;
}
function recontextImageConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromNumberOfImages = getValueByPath(fromObject, [
        'numberOfImages',
    ]);
    if (parentObject !== undefined && fromNumberOfImages != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfImages);
    }
    const fromBaseSteps = getValueByPath(fromObject, ['baseSteps']);
    if (parentObject !== undefined && fromBaseSteps != null) {
        setValueByPath(parentObject, ['parameters', 'editConfig', 'baseSteps'], fromBaseSteps);
    }
    const fromOutputGcsUri = getValueByPath(fromObject, ['outputGcsUri']);
    if (parentObject !== undefined && fromOutputGcsUri != null) {
        setValueByPath(parentObject, ['parameters', 'storageUri'], fromOutputGcsUri);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['parameters', 'seed'], fromSeed);
    }
    const fromSafetyFilterLevel = getValueByPath(fromObject, [
        'safetyFilterLevel',
    ]);
    if (parentObject !== undefined && fromSafetyFilterLevel != null) {
        setValueByPath(parentObject, ['parameters', 'safetySetting'], fromSafetyFilterLevel);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    const fromAddWatermark = getValueByPath(fromObject, ['addWatermark']);
    if (parentObject !== undefined && fromAddWatermark != null) {
        setValueByPath(parentObject, ['parameters', 'addWatermark'], fromAddWatermark);
    }
    const fromOutputMimeType = getValueByPath(fromObject, [
        'outputMimeType',
    ]);
    if (parentObject !== undefined && fromOutputMimeType != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'mimeType'], fromOutputMimeType);
    }
    const fromOutputCompressionQuality = getValueByPath(fromObject, [
        'outputCompressionQuality',
    ]);
    if (parentObject !== undefined && fromOutputCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'outputOptions', 'compressionQuality'], fromOutputCompressionQuality);
    }
    const fromEnhancePrompt = getValueByPath(fromObject, [
        'enhancePrompt',
    ]);
    if (parentObject !== undefined && fromEnhancePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'enhancePrompt'], fromEnhancePrompt);
    }
    return toObject;
}
function recontextImageParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['config'], recontextImageSourceToVertex(fromSource, toObject));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], recontextImageConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function scribbleImageToVertex(fromObject) {
    const toObject = {};
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['image'], imageToVertex(fromImage));
    }
    return toObject;
}
function segmentImageSourceToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (parentObject !== undefined && fromPrompt != null) {
        setValueByPath(parentObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (parentObject !== undefined && fromImage != null) {
        setValueByPath(parentObject, ['instances[0]', 'image'], imageToVertex(fromImage));
    }
    const fromScribbleImage = getValueByPath(fromObject, [
        'scribbleImage',
    ]);
    if (parentObject !== undefined && fromScribbleImage != null) {
        setValueByPath(parentObject, ['instances[0]', 'scribble'], scribbleImageToVertex(fromScribbleImage));
    }
    return toObject;
}
function segmentImageConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (parentObject !== undefined && fromMode != null) {
        setValueByPath(parentObject, ['parameters', 'mode'], fromMode);
    }
    const fromMaxPredictions = getValueByPath(fromObject, [
        'maxPredictions',
    ]);
    if (parentObject !== undefined && fromMaxPredictions != null) {
        setValueByPath(parentObject, ['parameters', 'maxPredictions'], fromMaxPredictions);
    }
    const fromConfidenceThreshold = getValueByPath(fromObject, [
        'confidenceThreshold',
    ]);
    if (parentObject !== undefined && fromConfidenceThreshold != null) {
        setValueByPath(parentObject, ['parameters', 'confidenceThreshold'], fromConfidenceThreshold);
    }
    const fromMaskDilation = getValueByPath(fromObject, ['maskDilation']);
    if (parentObject !== undefined && fromMaskDilation != null) {
        setValueByPath(parentObject, ['parameters', 'maskDilation'], fromMaskDilation);
    }
    const fromBinaryColorThreshold = getValueByPath(fromObject, [
        'binaryColorThreshold',
    ]);
    if (parentObject !== undefined && fromBinaryColorThreshold != null) {
        setValueByPath(parentObject, ['parameters', 'binaryColorThreshold'], fromBinaryColorThreshold);
    }
    return toObject;
}
function segmentImageParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['config'], segmentImageSourceToVertex(fromSource, toObject));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], segmentImageConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function getModelParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'name'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listModelsConfigToVertex(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    const fromFilter = getValueByPath(fromObject, ['filter']);
    if (parentObject !== undefined && fromFilter != null) {
        setValueByPath(parentObject, ['_query', 'filter'], fromFilter);
    }
    const fromQueryBase = getValueByPath(fromObject, ['queryBase']);
    if (parentObject !== undefined && fromQueryBase != null) {
        setValueByPath(parentObject, ['_url', 'models_url'], tModelsUrl(apiClient, fromQueryBase));
    }
    return toObject;
}
function listModelsParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listModelsConfigToVertex(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function updateModelConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (parentObject !== undefined && fromDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromDisplayName);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (parentObject !== undefined && fromDescription != null) {
        setValueByPath(parentObject, ['description'], fromDescription);
    }
    const fromDefaultCheckpointId = getValueByPath(fromObject, [
        'defaultCheckpointId',
    ]);
    if (parentObject !== undefined && fromDefaultCheckpointId != null) {
        setValueByPath(parentObject, ['defaultCheckpointId'], fromDefaultCheckpointId);
    }
    return toObject;
}
function updateModelParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], updateModelConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function deleteModelParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'name'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function countTokensConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['systemInstruction'], contentToVertex(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = fromTools;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToVertex(item);
            });
        }
        setValueByPath(parentObject, ['tools'], transformedList);
    }
    const fromGenerationConfig = getValueByPath(fromObject, [
        'generationConfig',
    ]);
    if (parentObject !== undefined && fromGenerationConfig != null) {
        setValueByPath(parentObject, ['generationConfig'], fromGenerationConfig);
    }
    return toObject;
}
function countTokensParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToVertex(item);
            });
        }
        setValueByPath(toObject, ['contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], countTokensConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function computeTokensParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromContents = getValueByPath(fromObject, ['contents']);
    if (fromContents != null) {
        let transformedList = tContents(fromContents);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentToVertex(item);
            });
        }
        setValueByPath(toObject, ['contents'], transformedList);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function videoToVertex(fromObject) {
    const toObject = {};
    const fromUri = getValueByPath(fromObject, ['uri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['gcsUri'], fromUri);
    }
    const fromVideoBytes = getValueByPath(fromObject, ['videoBytes']);
    if (fromVideoBytes != null) {
        setValueByPath(toObject, ['bytesBase64Encoded'], tBytes(fromVideoBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generateVideosSourceToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (parentObject !== undefined && fromPrompt != null) {
        setValueByPath(parentObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (parentObject !== undefined && fromImage != null) {
        setValueByPath(parentObject, ['instances[0]', 'image'], imageToVertex(fromImage));
    }
    const fromVideo = getValueByPath(fromObject, ['video']);
    if (parentObject !== undefined && fromVideo != null) {
        setValueByPath(parentObject, ['instances[0]', 'video'], videoToVertex(fromVideo));
    }
    return toObject;
}
function videoGenerationReferenceImageToVertex(fromObject) {
    const toObject = {};
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['image'], imageToVertex(fromImage));
    }
    const fromReferenceType = getValueByPath(fromObject, [
        'referenceType',
    ]);
    if (fromReferenceType != null) {
        setValueByPath(toObject, ['referenceType'], fromReferenceType);
    }
    return toObject;
}
function videoGenerationMaskToVertex(fromObject) {
    const toObject = {};
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['_self'], imageToVertex(fromImage));
    }
    const fromMaskMode = getValueByPath(fromObject, ['maskMode']);
    if (fromMaskMode != null) {
        setValueByPath(toObject, ['maskMode'], fromMaskMode);
    }
    return toObject;
}
function generateVideosConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromNumberOfVideos = getValueByPath(fromObject, [
        'numberOfVideos',
    ]);
    if (parentObject !== undefined && fromNumberOfVideos != null) {
        setValueByPath(parentObject, ['parameters', 'sampleCount'], fromNumberOfVideos);
    }
    const fromOutputGcsUri = getValueByPath(fromObject, ['outputGcsUri']);
    if (parentObject !== undefined && fromOutputGcsUri != null) {
        setValueByPath(parentObject, ['parameters', 'storageUri'], fromOutputGcsUri);
    }
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (parentObject !== undefined && fromFps != null) {
        setValueByPath(parentObject, ['parameters', 'fps'], fromFps);
    }
    const fromDurationSeconds = getValueByPath(fromObject, [
        'durationSeconds',
    ]);
    if (parentObject !== undefined && fromDurationSeconds != null) {
        setValueByPath(parentObject, ['parameters', 'durationSeconds'], fromDurationSeconds);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['parameters', 'seed'], fromSeed);
    }
    const fromAspectRatio = getValueByPath(fromObject, ['aspectRatio']);
    if (parentObject !== undefined && fromAspectRatio != null) {
        setValueByPath(parentObject, ['parameters', 'aspectRatio'], fromAspectRatio);
    }
    const fromResolution = getValueByPath(fromObject, ['resolution']);
    if (parentObject !== undefined && fromResolution != null) {
        setValueByPath(parentObject, ['parameters', 'resolution'], fromResolution);
    }
    const fromPersonGeneration = getValueByPath(fromObject, [
        'personGeneration',
    ]);
    if (parentObject !== undefined && fromPersonGeneration != null) {
        setValueByPath(parentObject, ['parameters', 'personGeneration'], fromPersonGeneration);
    }
    const fromPubsubTopic = getValueByPath(fromObject, ['pubsubTopic']);
    if (parentObject !== undefined && fromPubsubTopic != null) {
        setValueByPath(parentObject, ['parameters', 'pubsubTopic'], fromPubsubTopic);
    }
    const fromNegativePrompt = getValueByPath(fromObject, [
        'negativePrompt',
    ]);
    if (parentObject !== undefined && fromNegativePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'negativePrompt'], fromNegativePrompt);
    }
    const fromEnhancePrompt = getValueByPath(fromObject, [
        'enhancePrompt',
    ]);
    if (parentObject !== undefined && fromEnhancePrompt != null) {
        setValueByPath(parentObject, ['parameters', 'enhancePrompt'], fromEnhancePrompt);
    }
    const fromGenerateAudio = getValueByPath(fromObject, [
        'generateAudio',
    ]);
    if (parentObject !== undefined && fromGenerateAudio != null) {
        setValueByPath(parentObject, ['parameters', 'generateAudio'], fromGenerateAudio);
    }
    const fromLastFrame = getValueByPath(fromObject, ['lastFrame']);
    if (parentObject !== undefined && fromLastFrame != null) {
        setValueByPath(parentObject, ['instances[0]', 'lastFrame'], imageToVertex(fromLastFrame));
    }
    const fromReferenceImages = getValueByPath(fromObject, [
        'referenceImages',
    ]);
    if (parentObject !== undefined && fromReferenceImages != null) {
        let transformedList = fromReferenceImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return videoGenerationReferenceImageToVertex(item);
            });
        }
        setValueByPath(parentObject, ['instances[0]', 'referenceImages'], transformedList);
    }
    const fromMask = getValueByPath(fromObject, ['mask']);
    if (parentObject !== undefined && fromMask != null) {
        setValueByPath(parentObject, ['instances[0]', 'mask'], videoGenerationMaskToVertex(fromMask));
    }
    const fromCompressionQuality = getValueByPath(fromObject, [
        'compressionQuality',
    ]);
    if (parentObject !== undefined && fromCompressionQuality != null) {
        setValueByPath(parentObject, ['parameters', 'compressionQuality'], fromCompressionQuality);
    }
    return toObject;
}
function generateVideosParametersToVertex(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['_url', 'model'], tModel(apiClient, fromModel));
    }
    const fromPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromPrompt != null) {
        setValueByPath(toObject, ['instances[0]', 'prompt'], fromPrompt);
    }
    const fromImage = getValueByPath(fromObject, ['image']);
    if (fromImage != null) {
        setValueByPath(toObject, ['instances[0]', 'image'], imageToVertex(fromImage));
    }
    const fromVideo = getValueByPath(fromObject, ['video']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['instances[0]', 'video'], videoToVertex(fromVideo));
    }
    const fromSource = getValueByPath(fromObject, ['source']);
    if (fromSource != null) {
        setValueByPath(toObject, ['config'], generateVideosSourceToVertex(fromSource, toObject));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], generateVideosConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function videoMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobFromMldev(fromObject) {
    const toObject = {};
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataFromMldev(fromObject) {
    const toObject = {};
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallFromMldev(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partFromMldev(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataFromMldev(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobFromMldev(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataFromMldev(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallFromMldev(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentFromMldev(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partFromMldev(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function citationMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromCitations = getValueByPath(fromObject, ['citationSources']);
    if (fromCitations != null) {
        setValueByPath(toObject, ['citations'], fromCitations);
    }
    return toObject;
}
function urlMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromRetrievedUrl = getValueByPath(fromObject, ['retrievedUrl']);
    if (fromRetrievedUrl != null) {
        setValueByPath(toObject, ['retrievedUrl'], fromRetrievedUrl);
    }
    const fromUrlRetrievalStatus = getValueByPath(fromObject, [
        'urlRetrievalStatus',
    ]);
    if (fromUrlRetrievalStatus != null) {
        setValueByPath(toObject, ['urlRetrievalStatus'], fromUrlRetrievalStatus);
    }
    return toObject;
}
function urlContextMetadataFromMldev(fromObject) {
    const toObject = {};
    const fromUrlMetadata = getValueByPath(fromObject, ['urlMetadata']);
    if (fromUrlMetadata != null) {
        let transformedList = fromUrlMetadata;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return urlMetadataFromMldev(item);
            });
        }
        setValueByPath(toObject, ['urlMetadata'], transformedList);
    }
    return toObject;
}
function candidateFromMldev(fromObject) {
    const toObject = {};
    const fromContent = getValueByPath(fromObject, ['content']);
    if (fromContent != null) {
        setValueByPath(toObject, ['content'], contentFromMldev(fromContent));
    }
    const fromCitationMetadata = getValueByPath(fromObject, [
        'citationMetadata',
    ]);
    if (fromCitationMetadata != null) {
        setValueByPath(toObject, ['citationMetadata'], citationMetadataFromMldev(fromCitationMetadata));
    }
    const fromTokenCount = getValueByPath(fromObject, ['tokenCount']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    const fromFinishReason = getValueByPath(fromObject, ['finishReason']);
    if (fromFinishReason != null) {
        setValueByPath(toObject, ['finishReason'], fromFinishReason);
    }
    const fromUrlContextMetadata = getValueByPath(fromObject, [
        'urlContextMetadata',
    ]);
    if (fromUrlContextMetadata != null) {
        setValueByPath(toObject, ['urlContextMetadata'], urlContextMetadataFromMldev(fromUrlContextMetadata));
    }
    const fromAvgLogprobs = getValueByPath(fromObject, ['avgLogprobs']);
    if (fromAvgLogprobs != null) {
        setValueByPath(toObject, ['avgLogprobs'], fromAvgLogprobs);
    }
    const fromGroundingMetadata = getValueByPath(fromObject, [
        'groundingMetadata',
    ]);
    if (fromGroundingMetadata != null) {
        setValueByPath(toObject, ['groundingMetadata'], fromGroundingMetadata);
    }
    const fromIndex = getValueByPath(fromObject, ['index']);
    if (fromIndex != null) {
        setValueByPath(toObject, ['index'], fromIndex);
    }
    const fromLogprobsResult = getValueByPath(fromObject, [
        'logprobsResult',
    ]);
    if (fromLogprobsResult != null) {
        setValueByPath(toObject, ['logprobsResult'], fromLogprobsResult);
    }
    const fromSafetyRatings = getValueByPath(fromObject, [
        'safetyRatings',
    ]);
    if (fromSafetyRatings != null) {
        setValueByPath(toObject, ['safetyRatings'], fromSafetyRatings);
    }
    return toObject;
}
function generateContentResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromCandidates = getValueByPath(fromObject, ['candidates']);
    if (fromCandidates != null) {
        let transformedList = fromCandidates;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return candidateFromMldev(item);
            });
        }
        setValueByPath(toObject, ['candidates'], transformedList);
    }
    const fromModelVersion = getValueByPath(fromObject, ['modelVersion']);
    if (fromModelVersion != null) {
        setValueByPath(toObject, ['modelVersion'], fromModelVersion);
    }
    const fromPromptFeedback = getValueByPath(fromObject, [
        'promptFeedback',
    ]);
    if (fromPromptFeedback != null) {
        setValueByPath(toObject, ['promptFeedback'], fromPromptFeedback);
    }
    const fromResponseId = getValueByPath(fromObject, ['responseId']);
    if (fromResponseId != null) {
        setValueByPath(toObject, ['responseId'], fromResponseId);
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], fromUsageMetadata);
    }
    return toObject;
}
function contentEmbeddingFromMldev(fromObject) {
    const toObject = {};
    const fromValues = getValueByPath(fromObject, ['values']);
    if (fromValues != null) {
        setValueByPath(toObject, ['values'], fromValues);
    }
    return toObject;
}
function embedContentMetadataFromMldev() {
    const toObject = {};
    return toObject;
}
function embedContentResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromEmbeddings = getValueByPath(fromObject, ['embeddings']);
    if (fromEmbeddings != null) {
        let transformedList = fromEmbeddings;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentEmbeddingFromMldev(item);
            });
        }
        setValueByPath(toObject, ['embeddings'], transformedList);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], embedContentMetadataFromMldev());
    }
    return toObject;
}
function imageFromMldev(fromObject) {
    const toObject = {};
    const fromImageBytes = getValueByPath(fromObject, [
        'bytesBase64Encoded',
    ]);
    if (fromImageBytes != null) {
        setValueByPath(toObject, ['imageBytes'], tBytes(fromImageBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function safetyAttributesFromMldev(fromObject) {
    const toObject = {};
    const fromCategories = getValueByPath(fromObject, [
        'safetyAttributes',
        'categories',
    ]);
    if (fromCategories != null) {
        setValueByPath(toObject, ['categories'], fromCategories);
    }
    const fromScores = getValueByPath(fromObject, [
        'safetyAttributes',
        'scores',
    ]);
    if (fromScores != null) {
        setValueByPath(toObject, ['scores'], fromScores);
    }
    const fromContentType = getValueByPath(fromObject, ['contentType']);
    if (fromContentType != null) {
        setValueByPath(toObject, ['contentType'], fromContentType);
    }
    return toObject;
}
function generatedImageFromMldev(fromObject) {
    const toObject = {};
    const fromImage = getValueByPath(fromObject, ['_self']);
    if (fromImage != null) {
        setValueByPath(toObject, ['image'], imageFromMldev(fromImage));
    }
    const fromRaiFilteredReason = getValueByPath(fromObject, [
        'raiFilteredReason',
    ]);
    if (fromRaiFilteredReason != null) {
        setValueByPath(toObject, ['raiFilteredReason'], fromRaiFilteredReason);
    }
    const fromSafetyAttributes = getValueByPath(fromObject, ['_self']);
    if (fromSafetyAttributes != null) {
        setValueByPath(toObject, ['safetyAttributes'], safetyAttributesFromMldev(fromSafetyAttributes));
    }
    return toObject;
}
function generateImagesResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromGeneratedImages = getValueByPath(fromObject, [
        'predictions',
    ]);
    if (fromGeneratedImages != null) {
        let transformedList = fromGeneratedImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageFromMldev(item);
            });
        }
        setValueByPath(toObject, ['generatedImages'], transformedList);
    }
    const fromPositivePromptSafetyAttributes = getValueByPath(fromObject, [
        'positivePromptSafetyAttributes',
    ]);
    if (fromPositivePromptSafetyAttributes != null) {
        setValueByPath(toObject, ['positivePromptSafetyAttributes'], safetyAttributesFromMldev(fromPositivePromptSafetyAttributes));
    }
    return toObject;
}
function tunedModelInfoFromMldev(fromObject) {
    const toObject = {};
    const fromBaseModel = getValueByPath(fromObject, ['baseModel']);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    return toObject;
}
function modelFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromVersion = getValueByPath(fromObject, ['version']);
    if (fromVersion != null) {
        setValueByPath(toObject, ['version'], fromVersion);
    }
    const fromTunedModelInfo = getValueByPath(fromObject, ['_self']);
    if (fromTunedModelInfo != null) {
        setValueByPath(toObject, ['tunedModelInfo'], tunedModelInfoFromMldev(fromTunedModelInfo));
    }
    const fromInputTokenLimit = getValueByPath(fromObject, [
        'inputTokenLimit',
    ]);
    if (fromInputTokenLimit != null) {
        setValueByPath(toObject, ['inputTokenLimit'], fromInputTokenLimit);
    }
    const fromOutputTokenLimit = getValueByPath(fromObject, [
        'outputTokenLimit',
    ]);
    if (fromOutputTokenLimit != null) {
        setValueByPath(toObject, ['outputTokenLimit'], fromOutputTokenLimit);
    }
    const fromSupportedActions = getValueByPath(fromObject, [
        'supportedGenerationMethods',
    ]);
    if (fromSupportedActions != null) {
        setValueByPath(toObject, ['supportedActions'], fromSupportedActions);
    }
    return toObject;
}
function listModelsResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromModels = getValueByPath(fromObject, ['_self']);
    if (fromModels != null) {
        let transformedList = tExtractModels(fromModels);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modelFromMldev(item);
            });
        }
        setValueByPath(toObject, ['models'], transformedList);
    }
    return toObject;
}
function deleteModelResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}
function countTokensResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromTotalTokens = getValueByPath(fromObject, ['totalTokens']);
    if (fromTotalTokens != null) {
        setValueByPath(toObject, ['totalTokens'], fromTotalTokens);
    }
    const fromCachedContentTokenCount = getValueByPath(fromObject, [
        'cachedContentTokenCount',
    ]);
    if (fromCachedContentTokenCount != null) {
        setValueByPath(toObject, ['cachedContentTokenCount'], fromCachedContentTokenCount);
    }
    return toObject;
}
function videoFromMldev(fromObject) {
    const toObject = {};
    const fromUri = getValueByPath(fromObject, ['video', 'uri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromVideoBytes = getValueByPath(fromObject, [
        'video',
        'encodedVideo',
    ]);
    if (fromVideoBytes != null) {
        setValueByPath(toObject, ['videoBytes'], tBytes(fromVideoBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['encoding']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generatedVideoFromMldev(fromObject) {
    const toObject = {};
    const fromVideo = getValueByPath(fromObject, ['_self']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], videoFromMldev(fromVideo));
    }
    return toObject;
}
function generateVideosResponseFromMldev(fromObject) {
    const toObject = {};
    const fromGeneratedVideos = getValueByPath(fromObject, [
        'generatedSamples',
    ]);
    if (fromGeneratedVideos != null) {
        let transformedList = fromGeneratedVideos;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedVideoFromMldev(item);
            });
        }
        setValueByPath(toObject, ['generatedVideos'], transformedList);
    }
    const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
        'raiMediaFilteredCount',
    ]);
    if (fromRaiMediaFilteredCount != null) {
        setValueByPath(toObject, ['raiMediaFilteredCount'], fromRaiMediaFilteredCount);
    }
    const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
        'raiMediaFilteredReasons',
    ]);
    if (fromRaiMediaFilteredReasons != null) {
        setValueByPath(toObject, ['raiMediaFilteredReasons'], fromRaiMediaFilteredReasons);
    }
    return toObject;
}
function generateVideosOperationFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], fromMetadata);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    const fromResponse = getValueByPath(fromObject, [
        'response',
        'generateVideoResponse',
    ]);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], generateVideosResponseFromMldev(fromResponse));
    }
    return toObject;
}
function videoMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobFromVertex(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataFromVertex(fromObject) {
    const toObject = {};
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallFromVertex(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partFromVertex(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataFromVertex(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobFromVertex(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataFromVertex(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallFromVertex(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentFromVertex(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partFromVertex(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function citationMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromCitations = getValueByPath(fromObject, ['citations']);
    if (fromCitations != null) {
        setValueByPath(toObject, ['citations'], fromCitations);
    }
    return toObject;
}
function urlMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromRetrievedUrl = getValueByPath(fromObject, ['retrievedUrl']);
    if (fromRetrievedUrl != null) {
        setValueByPath(toObject, ['retrievedUrl'], fromRetrievedUrl);
    }
    const fromUrlRetrievalStatus = getValueByPath(fromObject, [
        'urlRetrievalStatus',
    ]);
    if (fromUrlRetrievalStatus != null) {
        setValueByPath(toObject, ['urlRetrievalStatus'], fromUrlRetrievalStatus);
    }
    return toObject;
}
function urlContextMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromUrlMetadata = getValueByPath(fromObject, ['urlMetadata']);
    if (fromUrlMetadata != null) {
        let transformedList = fromUrlMetadata;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return urlMetadataFromVertex(item);
            });
        }
        setValueByPath(toObject, ['urlMetadata'], transformedList);
    }
    return toObject;
}
function candidateFromVertex(fromObject) {
    const toObject = {};
    const fromContent = getValueByPath(fromObject, ['content']);
    if (fromContent != null) {
        setValueByPath(toObject, ['content'], contentFromVertex(fromContent));
    }
    const fromCitationMetadata = getValueByPath(fromObject, [
        'citationMetadata',
    ]);
    if (fromCitationMetadata != null) {
        setValueByPath(toObject, ['citationMetadata'], citationMetadataFromVertex(fromCitationMetadata));
    }
    const fromFinishMessage = getValueByPath(fromObject, [
        'finishMessage',
    ]);
    if (fromFinishMessage != null) {
        setValueByPath(toObject, ['finishMessage'], fromFinishMessage);
    }
    const fromFinishReason = getValueByPath(fromObject, ['finishReason']);
    if (fromFinishReason != null) {
        setValueByPath(toObject, ['finishReason'], fromFinishReason);
    }
    const fromUrlContextMetadata = getValueByPath(fromObject, [
        'urlContextMetadata',
    ]);
    if (fromUrlContextMetadata != null) {
        setValueByPath(toObject, ['urlContextMetadata'], urlContextMetadataFromVertex(fromUrlContextMetadata));
    }
    const fromAvgLogprobs = getValueByPath(fromObject, ['avgLogprobs']);
    if (fromAvgLogprobs != null) {
        setValueByPath(toObject, ['avgLogprobs'], fromAvgLogprobs);
    }
    const fromGroundingMetadata = getValueByPath(fromObject, [
        'groundingMetadata',
    ]);
    if (fromGroundingMetadata != null) {
        setValueByPath(toObject, ['groundingMetadata'], fromGroundingMetadata);
    }
    const fromIndex = getValueByPath(fromObject, ['index']);
    if (fromIndex != null) {
        setValueByPath(toObject, ['index'], fromIndex);
    }
    const fromLogprobsResult = getValueByPath(fromObject, [
        'logprobsResult',
    ]);
    if (fromLogprobsResult != null) {
        setValueByPath(toObject, ['logprobsResult'], fromLogprobsResult);
    }
    const fromSafetyRatings = getValueByPath(fromObject, [
        'safetyRatings',
    ]);
    if (fromSafetyRatings != null) {
        setValueByPath(toObject, ['safetyRatings'], fromSafetyRatings);
    }
    return toObject;
}
function generateContentResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromCandidates = getValueByPath(fromObject, ['candidates']);
    if (fromCandidates != null) {
        let transformedList = fromCandidates;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return candidateFromVertex(item);
            });
        }
        setValueByPath(toObject, ['candidates'], transformedList);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromModelVersion = getValueByPath(fromObject, ['modelVersion']);
    if (fromModelVersion != null) {
        setValueByPath(toObject, ['modelVersion'], fromModelVersion);
    }
    const fromPromptFeedback = getValueByPath(fromObject, [
        'promptFeedback',
    ]);
    if (fromPromptFeedback != null) {
        setValueByPath(toObject, ['promptFeedback'], fromPromptFeedback);
    }
    const fromResponseId = getValueByPath(fromObject, ['responseId']);
    if (fromResponseId != null) {
        setValueByPath(toObject, ['responseId'], fromResponseId);
    }
    const fromUsageMetadata = getValueByPath(fromObject, [
        'usageMetadata',
    ]);
    if (fromUsageMetadata != null) {
        setValueByPath(toObject, ['usageMetadata'], fromUsageMetadata);
    }
    return toObject;
}
function contentEmbeddingStatisticsFromVertex(fromObject) {
    const toObject = {};
    const fromTruncated = getValueByPath(fromObject, ['truncated']);
    if (fromTruncated != null) {
        setValueByPath(toObject, ['truncated'], fromTruncated);
    }
    const fromTokenCount = getValueByPath(fromObject, ['token_count']);
    if (fromTokenCount != null) {
        setValueByPath(toObject, ['tokenCount'], fromTokenCount);
    }
    return toObject;
}
function contentEmbeddingFromVertex(fromObject) {
    const toObject = {};
    const fromValues = getValueByPath(fromObject, ['values']);
    if (fromValues != null) {
        setValueByPath(toObject, ['values'], fromValues);
    }
    const fromStatistics = getValueByPath(fromObject, ['statistics']);
    if (fromStatistics != null) {
        setValueByPath(toObject, ['statistics'], contentEmbeddingStatisticsFromVertex(fromStatistics));
    }
    return toObject;
}
function embedContentMetadataFromVertex(fromObject) {
    const toObject = {};
    const fromBillableCharacterCount = getValueByPath(fromObject, [
        'billableCharacterCount',
    ]);
    if (fromBillableCharacterCount != null) {
        setValueByPath(toObject, ['billableCharacterCount'], fromBillableCharacterCount);
    }
    return toObject;
}
function embedContentResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromEmbeddings = getValueByPath(fromObject, [
        'predictions[]',
        'embeddings',
    ]);
    if (fromEmbeddings != null) {
        let transformedList = fromEmbeddings;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return contentEmbeddingFromVertex(item);
            });
        }
        setValueByPath(toObject, ['embeddings'], transformedList);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], embedContentMetadataFromVertex(fromMetadata));
    }
    return toObject;
}
function imageFromVertex(fromObject) {
    const toObject = {};
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['gcsUri'], fromGcsUri);
    }
    const fromImageBytes = getValueByPath(fromObject, [
        'bytesBase64Encoded',
    ]);
    if (fromImageBytes != null) {
        setValueByPath(toObject, ['imageBytes'], tBytes(fromImageBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function safetyAttributesFromVertex(fromObject) {
    const toObject = {};
    const fromCategories = getValueByPath(fromObject, [
        'safetyAttributes',
        'categories',
    ]);
    if (fromCategories != null) {
        setValueByPath(toObject, ['categories'], fromCategories);
    }
    const fromScores = getValueByPath(fromObject, [
        'safetyAttributes',
        'scores',
    ]);
    if (fromScores != null) {
        setValueByPath(toObject, ['scores'], fromScores);
    }
    const fromContentType = getValueByPath(fromObject, ['contentType']);
    if (fromContentType != null) {
        setValueByPath(toObject, ['contentType'], fromContentType);
    }
    return toObject;
}
function generatedImageFromVertex(fromObject) {
    const toObject = {};
    const fromImage = getValueByPath(fromObject, ['_self']);
    if (fromImage != null) {
        setValueByPath(toObject, ['image'], imageFromVertex(fromImage));
    }
    const fromRaiFilteredReason = getValueByPath(fromObject, [
        'raiFilteredReason',
    ]);
    if (fromRaiFilteredReason != null) {
        setValueByPath(toObject, ['raiFilteredReason'], fromRaiFilteredReason);
    }
    const fromSafetyAttributes = getValueByPath(fromObject, ['_self']);
    if (fromSafetyAttributes != null) {
        setValueByPath(toObject, ['safetyAttributes'], safetyAttributesFromVertex(fromSafetyAttributes));
    }
    const fromEnhancedPrompt = getValueByPath(fromObject, ['prompt']);
    if (fromEnhancedPrompt != null) {
        setValueByPath(toObject, ['enhancedPrompt'], fromEnhancedPrompt);
    }
    return toObject;
}
function generateImagesResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromGeneratedImages = getValueByPath(fromObject, [
        'predictions',
    ]);
    if (fromGeneratedImages != null) {
        let transformedList = fromGeneratedImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedImages'], transformedList);
    }
    const fromPositivePromptSafetyAttributes = getValueByPath(fromObject, [
        'positivePromptSafetyAttributes',
    ]);
    if (fromPositivePromptSafetyAttributes != null) {
        setValueByPath(toObject, ['positivePromptSafetyAttributes'], safetyAttributesFromVertex(fromPositivePromptSafetyAttributes));
    }
    return toObject;
}
function editImageResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromGeneratedImages = getValueByPath(fromObject, [
        'predictions',
    ]);
    if (fromGeneratedImages != null) {
        let transformedList = fromGeneratedImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedImages'], transformedList);
    }
    return toObject;
}
function upscaleImageResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromGeneratedImages = getValueByPath(fromObject, [
        'predictions',
    ]);
    if (fromGeneratedImages != null) {
        let transformedList = fromGeneratedImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedImages'], transformedList);
    }
    return toObject;
}
function recontextImageResponseFromVertex(fromObject) {
    const toObject = {};
    const fromGeneratedImages = getValueByPath(fromObject, [
        'predictions',
    ]);
    if (fromGeneratedImages != null) {
        let transformedList = fromGeneratedImages;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedImages'], transformedList);
    }
    return toObject;
}
function entityLabelFromVertex(fromObject) {
    const toObject = {};
    const fromLabel = getValueByPath(fromObject, ['label']);
    if (fromLabel != null) {
        setValueByPath(toObject, ['label'], fromLabel);
    }
    const fromScore = getValueByPath(fromObject, ['score']);
    if (fromScore != null) {
        setValueByPath(toObject, ['score'], fromScore);
    }
    return toObject;
}
function generatedImageMaskFromVertex(fromObject) {
    const toObject = {};
    const fromMask = getValueByPath(fromObject, ['_self']);
    if (fromMask != null) {
        setValueByPath(toObject, ['mask'], imageFromVertex(fromMask));
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (fromLabels != null) {
        let transformedList = fromLabels;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return entityLabelFromVertex(item);
            });
        }
        setValueByPath(toObject, ['labels'], transformedList);
    }
    return toObject;
}
function segmentImageResponseFromVertex(fromObject) {
    const toObject = {};
    const fromGeneratedMasks = getValueByPath(fromObject, ['predictions']);
    if (fromGeneratedMasks != null) {
        let transformedList = fromGeneratedMasks;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedImageMaskFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedMasks'], transformedList);
    }
    return toObject;
}
function endpointFromVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['endpoint']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDeployedModelId = getValueByPath(fromObject, [
        'deployedModelId',
    ]);
    if (fromDeployedModelId != null) {
        setValueByPath(toObject, ['deployedModelId'], fromDeployedModelId);
    }
    return toObject;
}
function tunedModelInfoFromVertex(fromObject) {
    const toObject = {};
    const fromBaseModel = getValueByPath(fromObject, [
        'labels',
        'google-vertex-llm-tuning-base-model-id',
    ]);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    return toObject;
}
function checkpointFromVertex(fromObject) {
    const toObject = {};
    const fromCheckpointId = getValueByPath(fromObject, ['checkpointId']);
    if (fromCheckpointId != null) {
        setValueByPath(toObject, ['checkpointId'], fromCheckpointId);
    }
    const fromEpoch = getValueByPath(fromObject, ['epoch']);
    if (fromEpoch != null) {
        setValueByPath(toObject, ['epoch'], fromEpoch);
    }
    const fromStep = getValueByPath(fromObject, ['step']);
    if (fromStep != null) {
        setValueByPath(toObject, ['step'], fromStep);
    }
    return toObject;
}
function modelFromVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromDisplayName = getValueByPath(fromObject, ['displayName']);
    if (fromDisplayName != null) {
        setValueByPath(toObject, ['displayName'], fromDisplayName);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromVersion = getValueByPath(fromObject, ['versionId']);
    if (fromVersion != null) {
        setValueByPath(toObject, ['version'], fromVersion);
    }
    const fromEndpoints = getValueByPath(fromObject, ['deployedModels']);
    if (fromEndpoints != null) {
        let transformedList = fromEndpoints;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return endpointFromVertex(item);
            });
        }
        setValueByPath(toObject, ['endpoints'], transformedList);
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (fromLabels != null) {
        setValueByPath(toObject, ['labels'], fromLabels);
    }
    const fromTunedModelInfo = getValueByPath(fromObject, ['_self']);
    if (fromTunedModelInfo != null) {
        setValueByPath(toObject, ['tunedModelInfo'], tunedModelInfoFromVertex(fromTunedModelInfo));
    }
    const fromDefaultCheckpointId = getValueByPath(fromObject, [
        'defaultCheckpointId',
    ]);
    if (fromDefaultCheckpointId != null) {
        setValueByPath(toObject, ['defaultCheckpointId'], fromDefaultCheckpointId);
    }
    const fromCheckpoints = getValueByPath(fromObject, ['checkpoints']);
    if (fromCheckpoints != null) {
        let transformedList = fromCheckpoints;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return checkpointFromVertex(item);
            });
        }
        setValueByPath(toObject, ['checkpoints'], transformedList);
    }
    return toObject;
}
function listModelsResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromModels = getValueByPath(fromObject, ['_self']);
    if (fromModels != null) {
        let transformedList = tExtractModels(fromModels);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return modelFromVertex(item);
            });
        }
        setValueByPath(toObject, ['models'], transformedList);
    }
    return toObject;
}
function deleteModelResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    return toObject;
}
function countTokensResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromTotalTokens = getValueByPath(fromObject, ['totalTokens']);
    if (fromTotalTokens != null) {
        setValueByPath(toObject, ['totalTokens'], fromTotalTokens);
    }
    return toObject;
}
function computeTokensResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromTokensInfo = getValueByPath(fromObject, ['tokensInfo']);
    if (fromTokensInfo != null) {
        setValueByPath(toObject, ['tokensInfo'], fromTokensInfo);
    }
    return toObject;
}
function videoFromVertex(fromObject) {
    const toObject = {};
    const fromUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromUri != null) {
        setValueByPath(toObject, ['uri'], fromUri);
    }
    const fromVideoBytes = getValueByPath(fromObject, [
        'bytesBase64Encoded',
    ]);
    if (fromVideoBytes != null) {
        setValueByPath(toObject, ['videoBytes'], tBytes(fromVideoBytes));
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function generatedVideoFromVertex(fromObject) {
    const toObject = {};
    const fromVideo = getValueByPath(fromObject, ['_self']);
    if (fromVideo != null) {
        setValueByPath(toObject, ['video'], videoFromVertex(fromVideo));
    }
    return toObject;
}
function generateVideosResponseFromVertex(fromObject) {
    const toObject = {};
    const fromGeneratedVideos = getValueByPath(fromObject, ['videos']);
    if (fromGeneratedVideos != null) {
        let transformedList = fromGeneratedVideos;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return generatedVideoFromVertex(item);
            });
        }
        setValueByPath(toObject, ['generatedVideos'], transformedList);
    }
    const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
        'raiMediaFilteredCount',
    ]);
    if (fromRaiMediaFilteredCount != null) {
        setValueByPath(toObject, ['raiMediaFilteredCount'], fromRaiMediaFilteredCount);
    }
    const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
        'raiMediaFilteredReasons',
    ]);
    if (fromRaiMediaFilteredReasons != null) {
        setValueByPath(toObject, ['raiMediaFilteredReasons'], fromRaiMediaFilteredReasons);
    }
    return toObject;
}
function generateVideosOperationFromVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], fromMetadata);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], generateVideosResponseFromVertex(fromResponse));
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const CONTENT_TYPE_HEADER = 'Content-Type';
const SERVER_TIMEOUT_HEADER = 'X-Server-Timeout';
const USER_AGENT_HEADER = 'User-Agent';
const GOOGLE_API_CLIENT_HEADER = 'x-goog-api-client';
const SDK_VERSION = '1.19.0'; // x-release-please-version
const LIBRARY_LABEL = `google-genai-sdk/${SDK_VERSION}`;
const VERTEX_AI_API_DEFAULT_VERSION = 'v1beta1';
const GOOGLE_AI_API_DEFAULT_VERSION = 'v1beta';
const responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
/**
 * The ApiClient class is used to send requests to the Gemini API or Vertex AI
 * endpoints.
 */
class ApiClient {
    constructor(opts) {
        var _a, _b;
        this.clientOptions = Object.assign(Object.assign({}, opts), { project: opts.project, location: opts.location, apiKey: opts.apiKey, vertexai: opts.vertexai });
        const initHttpOptions = {};
        if (this.clientOptions.vertexai) {
            initHttpOptions.apiVersion =
                (_a = this.clientOptions.apiVersion) !== null && _a !== void 0 ? _a : VERTEX_AI_API_DEFAULT_VERSION;
            initHttpOptions.baseUrl = this.baseUrlFromProjectLocation();
            this.normalizeAuthParameters();
        }
        else {
            // Gemini API
            initHttpOptions.apiVersion =
                (_b = this.clientOptions.apiVersion) !== null && _b !== void 0 ? _b : GOOGLE_AI_API_DEFAULT_VERSION;
            initHttpOptions.baseUrl = `https://generativelanguage.googleapis.com/`;
        }
        initHttpOptions.headers = this.getDefaultHeaders();
        this.clientOptions.httpOptions = initHttpOptions;
        if (opts.httpOptions) {
            this.clientOptions.httpOptions = this.patchHttpOptions(initHttpOptions, opts.httpOptions);
        }
    }
    /**
     * Determines the base URL for Vertex AI based on project and location.
     * Uses the global endpoint if location is 'global' or if project/location
     * are not specified (implying API key usage).
     * @private
     */
    baseUrlFromProjectLocation() {
        if (this.clientOptions.project &&
            this.clientOptions.location &&
            this.clientOptions.location !== 'global') {
            // Regional endpoint
            return `https://${this.clientOptions.location}-aiplatform.googleapis.com/`;
        }
        // Global endpoint (covers 'global' location and API key usage)
        return `https://aiplatform.googleapis.com/`;
    }
    /**
     * Normalizes authentication parameters for Vertex AI.
     * If project and location are provided, API key is cleared.
     * If project and location are not provided (implying API key usage),
     * project and location are cleared.
     * @private
     */
    normalizeAuthParameters() {
        if (this.clientOptions.project && this.clientOptions.location) {
            // Using project/location for auth, clear potential API key
            this.clientOptions.apiKey = undefined;
            return;
        }
        // Using API key for auth (or no auth provided yet), clear project/location
        this.clientOptions.project = undefined;
        this.clientOptions.location = undefined;
    }
    isVertexAI() {
        var _a;
        return (_a = this.clientOptions.vertexai) !== null && _a !== void 0 ? _a : false;
    }
    getProject() {
        return this.clientOptions.project;
    }
    getLocation() {
        return this.clientOptions.location;
    }
    getApiVersion() {
        if (this.clientOptions.httpOptions &&
            this.clientOptions.httpOptions.apiVersion !== undefined) {
            return this.clientOptions.httpOptions.apiVersion;
        }
        throw new Error('API version is not set.');
    }
    getBaseUrl() {
        if (this.clientOptions.httpOptions &&
            this.clientOptions.httpOptions.baseUrl !== undefined) {
            return this.clientOptions.httpOptions.baseUrl;
        }
        throw new Error('Base URL is not set.');
    }
    getRequestUrl() {
        return this.getRequestUrlInternal(this.clientOptions.httpOptions);
    }
    getHeaders() {
        if (this.clientOptions.httpOptions &&
            this.clientOptions.httpOptions.headers !== undefined) {
            return this.clientOptions.httpOptions.headers;
        }
        else {
            throw new Error('Headers are not set.');
        }
    }
    getRequestUrlInternal(httpOptions) {
        if (!httpOptions ||
            httpOptions.baseUrl === undefined ||
            httpOptions.apiVersion === undefined) {
            throw new Error('HTTP options are not correctly set.');
        }
        const baseUrl = httpOptions.baseUrl.endsWith('/')
            ? httpOptions.baseUrl.slice(0, -1)
            : httpOptions.baseUrl;
        const urlElement = [baseUrl];
        if (httpOptions.apiVersion && httpOptions.apiVersion !== '') {
            urlElement.push(httpOptions.apiVersion);
        }
        return urlElement.join('/');
    }
    getBaseResourcePath() {
        return `projects/${this.clientOptions.project}/locations/${this.clientOptions.location}`;
    }
    getApiKey() {
        return this.clientOptions.apiKey;
    }
    getWebsocketBaseUrl() {
        const baseUrl = this.getBaseUrl();
        const urlParts = new URL(baseUrl);
        urlParts.protocol = urlParts.protocol == 'http:' ? 'ws' : 'wss';
        return urlParts.toString();
    }
    setBaseUrl(url) {
        if (this.clientOptions.httpOptions) {
            this.clientOptions.httpOptions.baseUrl = url;
        }
        else {
            throw new Error('HTTP options are not correctly set.');
        }
    }
    constructUrl(path, httpOptions, prependProjectLocation) {
        const urlElement = [this.getRequestUrlInternal(httpOptions)];
        if (prependProjectLocation) {
            urlElement.push(this.getBaseResourcePath());
        }
        if (path !== '') {
            urlElement.push(path);
        }
        const url = new URL(`${urlElement.join('/')}`);
        return url;
    }
    shouldPrependVertexProjectPath(request) {
        if (this.clientOptions.apiKey) {
            return false;
        }
        if (!this.clientOptions.vertexai) {
            return false;
        }
        if (request.path.startsWith('projects/')) {
            // Assume the path already starts with
            // `projects/<project>/location/<location>`.
            return false;
        }
        if (request.httpMethod === 'GET' &&
            request.path.startsWith('publishers/google/models')) {
            // These paths are used by Vertex's models.get and models.list
            // calls. For base models Vertex does not accept a project/location
            // prefix (for tuned model the prefix is required).
            return false;
        }
        return true;
    }
    async request(request) {
        let patchedHttpOptions = this.clientOptions.httpOptions;
        if (request.httpOptions) {
            patchedHttpOptions = this.patchHttpOptions(this.clientOptions.httpOptions, request.httpOptions);
        }
        const prependProjectLocation = this.shouldPrependVertexProjectPath(request);
        const url = this.constructUrl(request.path, patchedHttpOptions, prependProjectLocation);
        if (request.queryParams) {
            for (const [key, value] of Object.entries(request.queryParams)) {
                url.searchParams.append(key, String(value));
            }
        }
        let requestInit = {};
        if (request.httpMethod === 'GET') {
            if (request.body && request.body !== '{}') {
                throw new Error('Request body should be empty for GET request, but got non empty request body');
            }
        }
        else {
            requestInit.body = request.body;
        }
        requestInit = await this.includeExtraHttpOptionsToRequestInit(requestInit, patchedHttpOptions, request.abortSignal);
        return this.unaryApiCall(url, requestInit, request.httpMethod);
    }
    patchHttpOptions(baseHttpOptions, requestHttpOptions) {
        const patchedHttpOptions = JSON.parse(JSON.stringify(baseHttpOptions));
        for (const [key, value] of Object.entries(requestHttpOptions)) {
            // Records compile to objects.
            if (typeof value === 'object') {
                // @ts-expect-error TS2345TS7053: Element implicitly has an 'any' type
                // because expression of type 'string' can't be used to index type
                // 'HttpOptions'.
                patchedHttpOptions[key] = Object.assign(Object.assign({}, patchedHttpOptions[key]), value);
            }
            else if (value !== undefined) {
                // @ts-expect-error TS2345TS7053: Element implicitly has an 'any' type
                // because expression of type 'string' can't be used to index type
                // 'HttpOptions'.
                patchedHttpOptions[key] = value;
            }
        }
        return patchedHttpOptions;
    }
    async requestStream(request) {
        let patchedHttpOptions = this.clientOptions.httpOptions;
        if (request.httpOptions) {
            patchedHttpOptions = this.patchHttpOptions(this.clientOptions.httpOptions, request.httpOptions);
        }
        const prependProjectLocation = this.shouldPrependVertexProjectPath(request);
        const url = this.constructUrl(request.path, patchedHttpOptions, prependProjectLocation);
        if (!url.searchParams.has('alt') || url.searchParams.get('alt') !== 'sse') {
            url.searchParams.set('alt', 'sse');
        }
        let requestInit = {};
        requestInit.body = request.body;
        requestInit = await this.includeExtraHttpOptionsToRequestInit(requestInit, patchedHttpOptions, request.abortSignal);
        return this.streamApiCall(url, requestInit, request.httpMethod);
    }
    async includeExtraHttpOptionsToRequestInit(requestInit, httpOptions, abortSignal) {
        if ((httpOptions && httpOptions.timeout) || abortSignal) {
            const abortController = new AbortController();
            const signal = abortController.signal;
            if (httpOptions.timeout && (httpOptions === null || httpOptions === void 0 ? void 0 : httpOptions.timeout) > 0) {
                const timeoutHandle = setTimeout(() => abortController.abort(), httpOptions.timeout);
                if (timeoutHandle &&
                    typeof timeoutHandle.unref ===
                        'function') {
                    // call unref to prevent nodejs process from hanging, see
                    // https://nodejs.org/api/timers.html#timeoutunref
                    timeoutHandle.unref();
                }
            }
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    abortController.abort();
                });
            }
            requestInit.signal = signal;
        }
        if (httpOptions && httpOptions.extraBody !== null) {
            includeExtraBodyToRequestInit(requestInit, httpOptions.extraBody);
        }
        requestInit.headers = await this.getHeadersInternal(httpOptions);
        return requestInit;
    }
    async unaryApiCall(url, requestInit, httpMethod) {
        return this.apiCall(url.toString(), Object.assign(Object.assign({}, requestInit), { method: httpMethod }))
            .then(async (response) => {
            await throwErrorIfNotOK(response);
            return new HttpResponse(response);
        })
            .catch((e) => {
            if (e instanceof Error) {
                throw e;
            }
            else {
                throw new Error(JSON.stringify(e));
            }
        });
    }
    async streamApiCall(url, requestInit, httpMethod) {
        return this.apiCall(url.toString(), Object.assign(Object.assign({}, requestInit), { method: httpMethod }))
            .then(async (response) => {
            await throwErrorIfNotOK(response);
            return this.processStreamResponse(response);
        })
            .catch((e) => {
            if (e instanceof Error) {
                throw e;
            }
            else {
                throw new Error(JSON.stringify(e));
            }
        });
    }
    processStreamResponse(response) {
        var _a;
        return __asyncGenerator(this, arguments, function* processStreamResponse_1() {
            const reader = (_a = response === null || response === void 0 ? void 0 : response.body) === null || _a === void 0 ? void 0 : _a.getReader();
            const decoder = new TextDecoder('utf-8');
            if (!reader) {
                throw new Error('Response body is empty');
            }
            try {
                let buffer = '';
                while (true) {
                    const { done, value } = yield __await(reader.read());
                    if (done) {
                        if (buffer.trim().length > 0) {
                            throw new Error('Incomplete JSON segment at the end');
                        }
                        break;
                    }
                    const chunkString = decoder.decode(value, { stream: true });
                    // Parse and throw an error if the chunk contains an error.
                    try {
                        const chunkJson = JSON.parse(chunkString);
                        if ('error' in chunkJson) {
                            const errorJson = JSON.parse(JSON.stringify(chunkJson['error']));
                            const status = errorJson['status'];
                            const code = errorJson['code'];
                            const errorMessage = `got status: ${status}. ${JSON.stringify(chunkJson)}`;
                            if (code >= 400 && code < 600) {
                                const apiError = new ApiError({
                                    message: errorMessage,
                                    status: code,
                                });
                                throw apiError;
                            }
                        }
                    }
                    catch (e) {
                        const error = e;
                        if (error.name === 'ApiError') {
                            throw e;
                        }
                    }
                    buffer += chunkString;
                    let match = buffer.match(responseLineRE);
                    while (match) {
                        const processedChunkString = match[1];
                        try {
                            const partialResponse = new Response(processedChunkString, {
                                headers: response === null || response === void 0 ? void 0 : response.headers,
                                status: response === null || response === void 0 ? void 0 : response.status,
                                statusText: response === null || response === void 0 ? void 0 : response.statusText,
                            });
                            yield yield __await(new HttpResponse(partialResponse));
                            buffer = buffer.slice(match[0].length);
                            match = buffer.match(responseLineRE);
                        }
                        catch (e) {
                            throw new Error(`exception parsing stream chunk ${processedChunkString}. ${e}`);
                        }
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
        });
    }
    async apiCall(url, requestInit) {
        return fetch(url, requestInit).catch((e) => {
            throw new Error(`exception ${e} sending request`);
        });
    }
    getDefaultHeaders() {
        const headers = {};
        const versionHeaderValue = LIBRARY_LABEL + ' ' + this.clientOptions.userAgentExtra;
        headers[USER_AGENT_HEADER] = versionHeaderValue;
        headers[GOOGLE_API_CLIENT_HEADER] = versionHeaderValue;
        headers[CONTENT_TYPE_HEADER] = 'application/json';
        return headers;
    }
    async getHeadersInternal(httpOptions) {
        const headers = new Headers();
        if (httpOptions && httpOptions.headers) {
            for (const [key, value] of Object.entries(httpOptions.headers)) {
                headers.append(key, value);
            }
            // Append a timeout header if it is set, note that the timeout option is
            // in milliseconds but the header is in seconds.
            if (httpOptions.timeout && httpOptions.timeout > 0) {
                headers.append(SERVER_TIMEOUT_HEADER, String(Math.ceil(httpOptions.timeout / 1000)));
            }
        }
        await this.clientOptions.auth.addAuthHeaders(headers);
        return headers;
    }
    /**
     * Uploads a file asynchronously using Gemini API only, this is not supported
     * in Vertex AI.
     *
     * @param file The string path to the file to be uploaded or a Blob object.
     * @param config Optional parameters specified in the `UploadFileConfig`
     *     interface. @see {@link UploadFileConfig}
     * @return A promise that resolves to a `File` object.
     * @throws An error if called on a Vertex AI client.
     * @throws An error if the `mimeType` is not provided and can not be inferred,
     */
    async uploadFile(file, config) {
        var _a;
        const fileToUpload = {};
        if (config != null) {
            fileToUpload.mimeType = config.mimeType;
            fileToUpload.name = config.name;
            fileToUpload.displayName = config.displayName;
        }
        if (fileToUpload.name && !fileToUpload.name.startsWith('files/')) {
            fileToUpload.name = `files/${fileToUpload.name}`;
        }
        const uploader = this.clientOptions.uploader;
        const fileStat = await uploader.stat(file);
        fileToUpload.sizeBytes = String(fileStat.size);
        const mimeType = (_a = config === null || config === void 0 ? void 0 : config.mimeType) !== null && _a !== void 0 ? _a : fileStat.type;
        if (mimeType === undefined || mimeType === '') {
            throw new Error('Can not determine mimeType. Please provide mimeType in the config.');
        }
        fileToUpload.mimeType = mimeType;
        const uploadUrl = await this.fetchUploadUrl(fileToUpload, config);
        return uploader.upload(file, uploadUrl, this);
    }
    /**
     * Downloads a file asynchronously to the specified path.
     *
     * @params params - The parameters for the download request, see {@link
     * DownloadFileParameters}
     */
    async downloadFile(params) {
        const downloader = this.clientOptions.downloader;
        await downloader.download(params, this);
    }
    async fetchUploadUrl(file, config) {
        var _a;
        let httpOptions = {};
        if (config === null || config === void 0 ? void 0 : config.httpOptions) {
            httpOptions = config.httpOptions;
        }
        else {
            httpOptions = {
                apiVersion: '',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': `${file.sizeBytes}`,
                    'X-Goog-Upload-Header-Content-Type': `${file.mimeType}`,
                },
            };
        }
        const body = {
            'file': file,
        };
        const httpResponse = await this.request({
            path: formatMap('upload/v1beta/files', body['_url']),
            body: JSON.stringify(body),
            httpMethod: 'POST',
            httpOptions,
        });
        if (!httpResponse || !(httpResponse === null || httpResponse === void 0 ? void 0 : httpResponse.headers)) {
            throw new Error('Server did not return an HttpResponse or the returned HttpResponse did not have headers.');
        }
        const uploadUrl = (_a = httpResponse === null || httpResponse === void 0 ? void 0 : httpResponse.headers) === null || _a === void 0 ? void 0 : _a['x-goog-upload-url'];
        if (uploadUrl === undefined) {
            throw new Error('Failed to get upload url. Server did not return the x-google-upload-url in the headers');
        }
        return uploadUrl;
    }
}
async function throwErrorIfNotOK(response) {
    var _a;
    if (response === undefined) {
        throw new Error('response is undefined');
    }
    if (!response.ok) {
        const status = response.status;
        let errorBody;
        if ((_a = response.headers.get('content-type')) === null || _a === void 0 ? void 0 : _a.includes('application/json')) {
            errorBody = await response.json();
        }
        else {
            errorBody = {
                error: {
                    message: await response.text(),
                    code: response.status,
                    status: response.statusText,
                },
            };
        }
        const errorMessage = JSON.stringify(errorBody);
        if (status >= 400 && status < 600) {
            const apiError = new ApiError({
                message: errorMessage,
                status: status,
            });
            throw apiError;
        }
        throw new Error(errorMessage);
    }
}
/**
 * Recursively updates the `requestInit.body` with values from an `extraBody` object.
 *
 * If `requestInit.body` is a string, it's assumed to be JSON and will be parsed.
 * The `extraBody` is then deeply merged into this parsed object.
 * If `requestInit.body` is a Blob, `extraBody` will be ignored, and a warning logged,
 * as merging structured data into an opaque Blob is not supported.
 *
 * The function does not enforce that updated values from `extraBody` have the
 * same type as existing values in `requestInit.body`. Type mismatches during
 * the merge will result in a warning, but the value from `extraBody` will overwrite
 * the original. `extraBody` users are responsible for ensuring `extraBody` has the correct structure.
 *
 * @param requestInit The RequestInit object whose body will be updated.
 * @param extraBody The object containing updates to be merged into `requestInit.body`.
 */
function includeExtraBodyToRequestInit(requestInit, extraBody) {
    if (!extraBody || Object.keys(extraBody).length === 0) {
        return;
    }
    if (requestInit.body instanceof Blob) {
        console.warn('includeExtraBodyToRequestInit: extraBody provided but current request body is a Blob. extraBody will be ignored as merging is not supported for Blob bodies.');
        return;
    }
    let currentBodyObject = {};
    // If adding new type to HttpRequest.body, please check the code below to
    // see if we need to update the logic.
    if (typeof requestInit.body === 'string' && requestInit.body.length > 0) {
        try {
            const parsedBody = JSON.parse(requestInit.body);
            if (typeof parsedBody === 'object' &&
                parsedBody !== null &&
                !Array.isArray(parsedBody)) {
                currentBodyObject = parsedBody;
            }
            else {
                console.warn('includeExtraBodyToRequestInit: Original request body is valid JSON but not a non-array object. Skip applying extraBody to the request body.');
                return;
            }
            /*  eslint-disable-next-line @typescript-eslint/no-unused-vars */
        }
        catch (e) {
            console.warn('includeExtraBodyToRequestInit: Original request body is not valid JSON. Skip applying extraBody to the request body.');
            return;
        }
    }
    function deepMerge(target, source) {
        const output = Object.assign({}, target);
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];
                const targetValue = output[key];
                if (sourceValue &&
                    typeof sourceValue === 'object' &&
                    !Array.isArray(sourceValue) &&
                    targetValue &&
                    typeof targetValue === 'object' &&
                    !Array.isArray(targetValue)) {
                    output[key] = deepMerge(targetValue, sourceValue);
                }
                else {
                    if (targetValue &&
                        sourceValue &&
                        typeof targetValue !== typeof sourceValue) {
                        console.warn(`includeExtraBodyToRequestInit:deepMerge: Type mismatch for key "${key}". Original type: ${typeof targetValue}, New type: ${typeof sourceValue}. Overwriting.`);
                    }
                    output[key] = sourceValue;
                }
            }
        }
        return output;
    }
    const mergedBody = deepMerge(currentBodyObject, extraBody);
    requestInit.body = JSON.stringify(mergedBody);
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// TODO: b/416041229 - Determine how to retrieve the MCP package version.
const MCP_LABEL = 'mcp_used/unknown';
// Whether MCP tool usage is detected from mcpToTool. This is used for
// telemetry.
let hasMcpToolUsageFromMcpToTool = false;
// Checks whether the list of tools contains any MCP tools.
function hasMcpToolUsage(tools) {
    for (const tool of tools) {
        if (isMcpCallableTool(tool)) {
            return true;
        }
        if (typeof tool === 'object' && 'inputSchema' in tool) {
            return true;
        }
    }
    return hasMcpToolUsageFromMcpToTool;
}
// Sets the MCP version label in the Google API client header.
function setMcpUsageHeader(headers) {
    var _a;
    const existingHeader = (_a = headers[GOOGLE_API_CLIENT_HEADER]) !== null && _a !== void 0 ? _a : '';
    headers[GOOGLE_API_CLIENT_HEADER] = (existingHeader + ` ${MCP_LABEL}`).trimStart();
}
// Returns true if the object is a MCP CallableTool, otherwise false.
function isMcpCallableTool(object) {
    return (object !== null &&
        typeof object === 'object' &&
        object instanceof McpCallableTool);
}
// List all tools from the MCP client.
function listAllTools(mcpClient, maxTools = 100) {
    return __asyncGenerator(this, arguments, function* listAllTools_1() {
        let cursor = undefined;
        let numTools = 0;
        while (numTools < maxTools) {
            const t = yield __await(mcpClient.listTools({ cursor }));
            for (const tool of t.tools) {
                yield yield __await(tool);
                numTools++;
            }
            if (!t.nextCursor) {
                break;
            }
            cursor = t.nextCursor;
        }
    });
}
/**
 * McpCallableTool can be used for model inference and invoking MCP clients with
 * given function call arguments.
 *
 * @experimental Built-in MCP support is an experimental feature, may change in future
 * versions.
 */
class McpCallableTool {
    constructor(mcpClients = [], config) {
        this.mcpTools = [];
        this.functionNameToMcpClient = {};
        this.mcpClients = mcpClients;
        this.config = config;
    }
    /**
     * Creates a McpCallableTool.
     */
    static create(mcpClients, config) {
        return new McpCallableTool(mcpClients, config);
    }
    /**
     * Validates the function names are not duplicate and initialize the function
     * name to MCP client mapping.
     *
     * @throws {Error} if the MCP tools from the MCP clients have duplicate tool
     *     names.
     */
    async initialize() {
        var _a, e_1, _b, _c;
        if (this.mcpTools.length > 0) {
            return;
        }
        const functionMap = {};
        const mcpTools = [];
        for (const mcpClient of this.mcpClients) {
            try {
                for (var _d = true, _e = (e_1 = void 0, __asyncValues(listAllTools(mcpClient))), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const mcpTool = _c;
                    mcpTools.push(mcpTool);
                    const mcpToolName = mcpTool.name;
                    if (functionMap[mcpToolName]) {
                        throw new Error(`Duplicate function name ${mcpToolName} found in MCP tools. Please ensure function names are unique.`);
                    }
                    functionMap[mcpToolName] = mcpClient;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        this.mcpTools = mcpTools;
        this.functionNameToMcpClient = functionMap;
    }
    async tool() {
        await this.initialize();
        return mcpToolsToGeminiTool(this.mcpTools, this.config);
    }
    async callTool(functionCalls) {
        await this.initialize();
        const functionCallResponseParts = [];
        for (const functionCall of functionCalls) {
            if (functionCall.name in this.functionNameToMcpClient) {
                const mcpClient = this.functionNameToMcpClient[functionCall.name];
                let requestOptions = undefined;
                // TODO: b/424238654 - Add support for finer grained timeout control.
                if (this.config.timeout) {
                    requestOptions = {
                        timeout: this.config.timeout,
                    };
                }
                const callToolResponse = await mcpClient.callTool({
                    name: functionCall.name,
                    arguments: functionCall.args,
                }, 
                // Set the result schema to undefined to allow MCP to rely on the
                // default schema.
                undefined, requestOptions);
                functionCallResponseParts.push({
                    functionResponse: {
                        name: functionCall.name,
                        response: callToolResponse.isError
                            ? { error: callToolResponse }
                            : callToolResponse,
                    },
                });
            }
        }
        return functionCallResponseParts;
    }
}
function isMcpClient(client) {
    return (client !== null &&
        typeof client === 'object' &&
        'listTools' in client &&
        typeof client.listTools === 'function');
}
/**
 * Creates a McpCallableTool from MCP clients and an optional config.
 *
 * The callable tool can invoke the MCP clients with given function call
 * arguments. (often for automatic function calling).
 * Use the config to modify tool parameters such as behavior.
 *
 * @experimental Built-in MCP support is an experimental feature, may change in future
 * versions.
 */
function mcpToTool(...args) {
    // Set MCP usage for telemetry.
    hasMcpToolUsageFromMcpToTool = true;
    if (args.length === 0) {
        throw new Error('No MCP clients provided');
    }
    const maybeConfig = args[args.length - 1];
    if (isMcpClient(maybeConfig)) {
        return McpCallableTool.create(args, {});
    }
    return McpCallableTool.create(args.slice(0, args.length - 1), maybeConfig);
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Handles incoming messages from the WebSocket.
 *
 * @remarks
 * This function is responsible for parsing incoming messages, transforming them
 * into LiveMusicServerMessage, and then calling the onmessage callback.
 * Note that the first message which is received from the server is a
 * setupComplete message.
 *
 * @param apiClient The ApiClient instance.
 * @param onmessage The user-provided onmessage callback (if any).
 * @param event The MessageEvent from the WebSocket.
 */
async function handleWebSocketMessage$1(apiClient, onmessage, event) {
    const serverMessage = new LiveMusicServerMessage();
    let data;
    if (event.data instanceof Blob) {
        data = JSON.parse(await event.data.text());
    }
    else {
        data = JSON.parse(event.data);
    }
    const response = liveMusicServerMessageFromMldev(data);
    Object.assign(serverMessage, response);
    onmessage(serverMessage);
}
/**
   LiveMusic class encapsulates the configuration for live music
   generation via Lyria Live models.

   @experimental
  */
class LiveMusic {
    constructor(apiClient, auth, webSocketFactory) {
        this.apiClient = apiClient;
        this.auth = auth;
        this.webSocketFactory = webSocketFactory;
    }
    /**
       Establishes a connection to the specified model and returns a
       LiveMusicSession object representing that connection.
  
       @experimental
  
       @remarks
  
       @param params - The parameters for establishing a connection to the model.
       @return A live session.
  
       @example
       ```ts
       let model = 'models/lyria-realtime-exp';
       const session = await ai.live.music.connect({
         model: model,
         callbacks: {
           onmessage: (e: MessageEvent) => {
             console.log('Received message from the server: %s\n', debug(e.data));
           },
           onerror: (e: ErrorEvent) => {
             console.log('Error occurred: %s\n', debug(e.error));
           },
           onclose: (e: CloseEvent) => {
             console.log('Connection closed.');
           },
         },
       });
       ```
      */
    async connect(params) {
        var _a, _b;
        if (this.apiClient.isVertexAI()) {
            throw new Error('Live music is not supported for Vertex AI.');
        }
        console.warn('Live music generation is experimental and may change in future versions.');
        const websocketBaseUrl = this.apiClient.getWebsocketBaseUrl();
        const apiVersion = this.apiClient.getApiVersion();
        const headers = mapToHeaders$1(this.apiClient.getDefaultHeaders());
        const apiKey = this.apiClient.getApiKey();
        const url = `${websocketBaseUrl}/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateMusic?key=${apiKey}`;
        let onopenResolve = () => { };
        const onopenPromise = new Promise((resolve) => {
            onopenResolve = resolve;
        });
        const callbacks = params.callbacks;
        const onopenAwaitedCallback = function () {
            onopenResolve({});
        };
        const apiClient = this.apiClient;
        const websocketCallbacks = {
            onopen: onopenAwaitedCallback,
            onmessage: (event) => {
                void handleWebSocketMessage$1(apiClient, callbacks.onmessage, event);
            },
            onerror: (_a = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onerror) !== null && _a !== void 0 ? _a : function (e) {
            },
            onclose: (_b = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onclose) !== null && _b !== void 0 ? _b : function (e) {
            },
        };
        const conn = this.webSocketFactory.create(url, headersToMap$1(headers), websocketCallbacks);
        conn.connect();
        // Wait for the websocket to open before sending requests.
        await onopenPromise;
        const model = tModel(this.apiClient, params.model);
        const setup = liveMusicClientSetupToMldev({
            model,
        });
        const clientMessage = liveMusicClientMessageToMldev({ setup });
        conn.send(JSON.stringify(clientMessage));
        return new LiveMusicSession(conn, this.apiClient);
    }
}
/**
   Represents a connection to the API.

   @experimental
  */
class LiveMusicSession {
    constructor(conn, apiClient) {
        this.conn = conn;
        this.apiClient = apiClient;
    }
    /**
      Sets inputs to steer music generation. Updates the session's current
      weighted prompts.
  
      @param params - Contains one property, `weightedPrompts`.
  
        - `weightedPrompts` to send to the model; weights are normalized to
          sum to 1.0.
  
      @experimental
     */
    async setWeightedPrompts(params) {
        if (!params.weightedPrompts ||
            Object.keys(params.weightedPrompts).length === 0) {
            throw new Error('Weighted prompts must be set and contain at least one entry.');
        }
        const setWeightedPromptsParameters = liveMusicSetWeightedPromptsParametersToMldev(params);
        const clientContent = liveMusicClientContentToMldev(setWeightedPromptsParameters);
        this.conn.send(JSON.stringify({ clientContent }));
    }
    /**
      Sets a configuration to the model. Updates the session's current
      music generation config.
  
      @param params - Contains one property, `musicGenerationConfig`.
  
        - `musicGenerationConfig` to set in the model. Passing an empty or
      undefined config to the model will reset the config to defaults.
  
      @experimental
     */
    async setMusicGenerationConfig(params) {
        if (!params.musicGenerationConfig) {
            params.musicGenerationConfig = {};
        }
        const setConfigParameters = liveMusicSetConfigParametersToMldev(params);
        const clientMessage = liveMusicClientMessageToMldev(setConfigParameters);
        this.conn.send(JSON.stringify(clientMessage));
    }
    sendPlaybackControl(playbackControl) {
        const clientMessage = liveMusicClientMessageToMldev({
            playbackControl,
        });
        this.conn.send(JSON.stringify(clientMessage));
    }
    /**
     * Start the music stream.
     *
     * @experimental
     */
    play() {
        this.sendPlaybackControl(LiveMusicPlaybackControl.PLAY);
    }
    /**
     * Temporarily halt the music stream. Use `play` to resume from the current
     * position.
     *
     * @experimental
     */
    pause() {
        this.sendPlaybackControl(LiveMusicPlaybackControl.PAUSE);
    }
    /**
     * Stop the music stream and reset the state. Retains the current prompts
     * and config.
     *
     * @experimental
     */
    stop() {
        this.sendPlaybackControl(LiveMusicPlaybackControl.STOP);
    }
    /**
     * Resets the context of the music generation without stopping it.
     * Retains the current prompts and config.
     *
     * @experimental
     */
    resetContext() {
        this.sendPlaybackControl(LiveMusicPlaybackControl.RESET_CONTEXT);
    }
    /**
       Terminates the WebSocket connection.
  
       @experimental
     */
    close() {
        this.conn.close();
    }
}
// Converts an headers object to a "map" object as expected by the WebSocket
// constructor. We use this as the Auth interface works with Headers objects
// while the WebSocket constructor takes a map.
function headersToMap$1(headers) {
    const headerMap = {};
    headers.forEach((value, key) => {
        headerMap[key] = value;
    });
    return headerMap;
}
// Converts a "map" object to a headers object. We use this as the Auth
// interface works with Headers objects while the API client default headers
// returns a map.
function mapToHeaders$1(map) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(map)) {
        headers.append(key, value);
    }
    return headers;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const FUNCTION_RESPONSE_REQUIRES_ID = 'FunctionResponse request must have an `id` field from the response of a ToolCall.FunctionalCalls in Google AI.';
/**
 * Handles incoming messages from the WebSocket.
 *
 * @remarks
 * This function is responsible for parsing incoming messages, transforming them
 * into LiveServerMessages, and then calling the onmessage callback. Note that
 * the first message which is received from the server is a setupComplete
 * message.
 *
 * @param apiClient The ApiClient instance.
 * @param onmessage The user-provided onmessage callback (if any).
 * @param event The MessageEvent from the WebSocket.
 */
async function handleWebSocketMessage(apiClient, onmessage, event) {
    const serverMessage = new LiveServerMessage();
    let jsonData;
    if (event.data instanceof Blob) {
        jsonData = await event.data.text();
    }
    else if (event.data instanceof ArrayBuffer) {
        jsonData = new TextDecoder().decode(event.data);
    }
    else {
        jsonData = event.data;
    }
    const data = JSON.parse(jsonData);
    if (apiClient.isVertexAI()) {
        const resp = liveServerMessageFromVertex(data);
        Object.assign(serverMessage, resp);
    }
    else {
        const resp = liveServerMessageFromMldev(data);
        Object.assign(serverMessage, resp);
    }
    onmessage(serverMessage);
}
/**
   Live class encapsulates the configuration for live interaction with the
   Generative Language API. It embeds ApiClient for general API settings.

   @experimental
  */
class Live {
    constructor(apiClient, auth, webSocketFactory) {
        this.apiClient = apiClient;
        this.auth = auth;
        this.webSocketFactory = webSocketFactory;
        this.music = new LiveMusic(this.apiClient, this.auth, this.webSocketFactory);
    }
    /**
       Establishes a connection to the specified model with the given
       configuration and returns a Session object representing that connection.
  
       @experimental Built-in MCP support is an experimental feature, may change in
       future versions.
  
       @remarks
  
       @param params - The parameters for establishing a connection to the model.
       @return A live session.
  
       @example
       ```ts
       let model: string;
       if (GOOGLE_GENAI_USE_VERTEXAI) {
         model = 'gemini-2.0-flash-live-preview-04-09';
       } else {
         model = 'gemini-live-2.5-flash-preview';
       }
       const session = await ai.live.connect({
         model: model,
         config: {
           responseModalities: [Modality.AUDIO],
         },
         callbacks: {
           onopen: () => {
             console.log('Connected to the socket.');
           },
           onmessage: (e: MessageEvent) => {
             console.log('Received message from the server: %s\n', debug(e.data));
           },
           onerror: (e: ErrorEvent) => {
             console.log('Error occurred: %s\n', debug(e.error));
           },
           onclose: (e: CloseEvent) => {
             console.log('Connection closed.');
           },
         },
       });
       ```
      */
    async connect(params) {
        var _a, _b, _c, _d, _e, _f;
        // TODO: b/404946746 - Support per request HTTP options.
        if (params.config && params.config.httpOptions) {
            throw new Error('The Live module does not support httpOptions at request-level in' +
                ' LiveConnectConfig yet. Please use the client-level httpOptions' +
                ' configuration instead.');
        }
        const websocketBaseUrl = this.apiClient.getWebsocketBaseUrl();
        const apiVersion = this.apiClient.getApiVersion();
        let url;
        const clientHeaders = this.apiClient.getHeaders();
        if (params.config &&
            params.config.tools &&
            hasMcpToolUsage(params.config.tools)) {
            setMcpUsageHeader(clientHeaders);
        }
        const headers = mapToHeaders(clientHeaders);
        if (this.apiClient.isVertexAI()) {
            url = `${websocketBaseUrl}/ws/google.cloud.aiplatform.${apiVersion}.LlmBidiService/BidiGenerateContent`;
            await this.auth.addAuthHeaders(headers);
        }
        else {
            const apiKey = this.apiClient.getApiKey();
            let method = 'BidiGenerateContent';
            let keyName = 'key';
            if (apiKey === null || apiKey === void 0 ? void 0 : apiKey.startsWith('auth_tokens/')) {
                console.warn('Warning: Ephemeral token support is experimental and may change in future versions.');
                if (apiVersion !== 'v1alpha') {
                    console.warn("Warning: The SDK's ephemeral token support is in v1alpha only. Please use const ai = new GoogleGenAI({apiKey: token.name, httpOptions: { apiVersion: 'v1alpha' }}); before session connection.");
                }
                method = 'BidiGenerateContentConstrained';
                keyName = 'access_token';
            }
            url = `${websocketBaseUrl}/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.${method}?${keyName}=${apiKey}`;
        }
        let onopenResolve = () => { };
        const onopenPromise = new Promise((resolve) => {
            onopenResolve = resolve;
        });
        const callbacks = params.callbacks;
        const onopenAwaitedCallback = function () {
            var _a;
            (_a = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onopen) === null || _a === void 0 ? void 0 : _a.call(callbacks);
            onopenResolve({});
        };
        const apiClient = this.apiClient;
        const websocketCallbacks = {
            onopen: onopenAwaitedCallback,
            onmessage: (event) => {
                void handleWebSocketMessage(apiClient, callbacks.onmessage, event);
            },
            onerror: (_a = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onerror) !== null && _a !== void 0 ? _a : function (e) {
            },
            onclose: (_b = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onclose) !== null && _b !== void 0 ? _b : function (e) {
            },
        };
        const conn = this.webSocketFactory.create(url, headersToMap(headers), websocketCallbacks);
        conn.connect();
        // Wait for the websocket to open before sending requests.
        await onopenPromise;
        let transformedModel = tModel(this.apiClient, params.model);
        if (this.apiClient.isVertexAI() &&
            transformedModel.startsWith('publishers/')) {
            const project = this.apiClient.getProject();
            const location = this.apiClient.getLocation();
            transformedModel =
                `projects/${project}/locations/${location}/` + transformedModel;
        }
        let clientMessage = {};
        if (this.apiClient.isVertexAI() &&
            ((_c = params.config) === null || _c === void 0 ? void 0 : _c.responseModalities) === undefined) {
            // Set default to AUDIO to align with MLDev API.
            if (params.config === undefined) {
                params.config = { responseModalities: [Modality.AUDIO] };
            }
            else {
                params.config.responseModalities = [Modality.AUDIO];
            }
        }
        if ((_d = params.config) === null || _d === void 0 ? void 0 : _d.generationConfig) {
            // Raise deprecation warning for generationConfig.
            console.warn('Setting `LiveConnectConfig.generation_config` is deprecated, please set the fields on `LiveConnectConfig` directly. This will become an error in a future version (not before Q3 2025).');
        }
        const inputTools = (_f = (_e = params.config) === null || _e === void 0 ? void 0 : _e.tools) !== null && _f !== void 0 ? _f : [];
        const convertedTools = [];
        for (const tool of inputTools) {
            if (this.isCallableTool(tool)) {
                const callableTool = tool;
                convertedTools.push(await callableTool.tool());
            }
            else {
                convertedTools.push(tool);
            }
        }
        if (convertedTools.length > 0) {
            params.config.tools = convertedTools;
        }
        const liveConnectParameters = {
            model: transformedModel,
            config: params.config,
            callbacks: params.callbacks,
        };
        if (this.apiClient.isVertexAI()) {
            clientMessage = liveConnectParametersToVertex(this.apiClient, liveConnectParameters);
        }
        else {
            clientMessage = liveConnectParametersToMldev(this.apiClient, liveConnectParameters);
        }
        delete clientMessage['config'];
        conn.send(JSON.stringify(clientMessage));
        return new Session(conn, this.apiClient);
    }
    // TODO: b/416041229 - Abstract this method to a common place.
    isCallableTool(tool) {
        return 'callTool' in tool && typeof tool.callTool === 'function';
    }
}
const defaultLiveSendClientContentParamerters = {
    turnComplete: true,
};
/**
   Represents a connection to the API.

   @experimental
  */
class Session {
    constructor(conn, apiClient) {
        this.conn = conn;
        this.apiClient = apiClient;
    }
    tLiveClientContent(apiClient, params) {
        if (params.turns !== null && params.turns !== undefined) {
            let contents = [];
            try {
                contents = tContents(params.turns);
                if (apiClient.isVertexAI()) {
                    contents = contents.map((item) => contentToVertex(item));
                }
                else {
                    contents = contents.map((item) => contentToMldev$1(item));
                }
            }
            catch (_a) {
                throw new Error(`Failed to parse client content "turns", type: '${typeof params.turns}'`);
            }
            return {
                clientContent: { turns: contents, turnComplete: params.turnComplete },
            };
        }
        return {
            clientContent: { turnComplete: params.turnComplete },
        };
    }
    tLiveClienttToolResponse(apiClient, params) {
        let functionResponses = [];
        if (params.functionResponses == null) {
            throw new Error('functionResponses is required.');
        }
        if (!Array.isArray(params.functionResponses)) {
            functionResponses = [params.functionResponses];
        }
        else {
            functionResponses = params.functionResponses;
        }
        if (functionResponses.length === 0) {
            throw new Error('functionResponses is required.');
        }
        for (const functionResponse of functionResponses) {
            if (typeof functionResponse !== 'object' ||
                functionResponse === null ||
                !('name' in functionResponse) ||
                !('response' in functionResponse)) {
                throw new Error(`Could not parse function response, type '${typeof functionResponse}'.`);
            }
            if (!apiClient.isVertexAI() && !('id' in functionResponse)) {
                throw new Error(FUNCTION_RESPONSE_REQUIRES_ID);
            }
        }
        const clientMessage = {
            toolResponse: { functionResponses: functionResponses },
        };
        return clientMessage;
    }
    /**
      Send a message over the established connection.
  
      @param params - Contains two **optional** properties, `turns` and
          `turnComplete`.
  
        - `turns` will be converted to a `Content[]`
        - `turnComplete: true` [default] indicates that you are done sending
          content and expect a response. If `turnComplete: false`, the server
          will wait for additional messages before starting generation.
  
      @experimental
  
      @remarks
      There are two ways to send messages to the live API:
      `sendClientContent` and `sendRealtimeInput`.
  
      `sendClientContent` messages are added to the model context **in order**.
      Having a conversation using `sendClientContent` messages is roughly
      equivalent to using the `Chat.sendMessageStream`, except that the state of
      the `chat` history is stored on the API server instead of locally.
  
      Because of `sendClientContent`'s order guarantee, the model cannot respons
      as quickly to `sendClientContent` messages as to `sendRealtimeInput`
      messages. This makes the biggest difference when sending objects that have
      significant preprocessing time (typically images).
  
      The `sendClientContent` message sends a `Content[]`
      which has more options than the `Blob` sent by `sendRealtimeInput`.
  
      So the main use-cases for `sendClientContent` over `sendRealtimeInput` are:
  
      - Sending anything that can't be represented as a `Blob` (text,
      `sendClientContent({turns="Hello?"}`)).
      - Managing turns when not using audio input and voice activity detection.
        (`sendClientContent({turnComplete:true})` or the short form
      `sendClientContent()`)
      - Prefilling a conversation context
        ```
        sendClientContent({
            turns: [
              Content({role:user, parts:...}),
              Content({role:user, parts:...}),
              ...
            ]
        })
        ```
      @experimental
     */
    sendClientContent(params) {
        params = Object.assign(Object.assign({}, defaultLiveSendClientContentParamerters), params);
        const clientMessage = this.tLiveClientContent(this.apiClient, params);
        this.conn.send(JSON.stringify(clientMessage));
    }
    /**
      Send a realtime message over the established connection.
  
      @param params - Contains one property, `media`.
  
        - `media` will be converted to a `Blob`
  
      @experimental
  
      @remarks
      Use `sendRealtimeInput` for realtime audio chunks and video frames (images).
  
      With `sendRealtimeInput` the api will respond to audio automatically
      based on voice activity detection (VAD).
  
      `sendRealtimeInput` is optimized for responsivness at the expense of
      deterministic ordering guarantees. Audio and video tokens are to the
      context when they become available.
  
      Note: The Call signature expects a `Blob` object, but only a subset
      of audio and image mimetypes are allowed.
     */
    sendRealtimeInput(params) {
        let clientMessage = {};
        if (this.apiClient.isVertexAI()) {
            clientMessage = {
                'realtimeInput': liveSendRealtimeInputParametersToVertex(params),
            };
        }
        else {
            clientMessage = {
                'realtimeInput': liveSendRealtimeInputParametersToMldev(params),
            };
        }
        this.conn.send(JSON.stringify(clientMessage));
    }
    /**
      Send a function response message over the established connection.
  
      @param params - Contains property `functionResponses`.
  
        - `functionResponses` will be converted to a `functionResponses[]`
  
      @remarks
      Use `sendFunctionResponse` to reply to `LiveServerToolCall` from the server.
  
      Use {@link types.LiveConnectConfig#tools} to configure the callable functions.
  
      @experimental
     */
    sendToolResponse(params) {
        if (params.functionResponses == null) {
            throw new Error('Tool response parameters are required.');
        }
        const clientMessage = this.tLiveClienttToolResponse(this.apiClient, params);
        this.conn.send(JSON.stringify(clientMessage));
    }
    /**
       Terminates the WebSocket connection.
  
       @experimental
  
       @example
       ```ts
       let model: string;
       if (GOOGLE_GENAI_USE_VERTEXAI) {
         model = 'gemini-2.0-flash-live-preview-04-09';
       } else {
         model = 'gemini-live-2.5-flash-preview';
       }
       const session = await ai.live.connect({
         model: model,
         config: {
           responseModalities: [Modality.AUDIO],
         }
       });
  
       session.close();
       ```
     */
    close() {
        this.conn.close();
    }
}
// Converts an headers object to a "map" object as expected by the WebSocket
// constructor. We use this as the Auth interface works with Headers objects
// while the WebSocket constructor takes a map.
function headersToMap(headers) {
    const headerMap = {};
    headers.forEach((value, key) => {
        headerMap[key] = value;
    });
    return headerMap;
}
// Converts a "map" object to a headers object. We use this as the Auth
// interface works with Headers objects while the API client default headers
// returns a map.
function mapToHeaders(map) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(map)) {
        headers.append(key, value);
    }
    return headers;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const DEFAULT_MAX_REMOTE_CALLS = 10;
/** Returns whether automatic function calling is disabled. */
function shouldDisableAfc(config) {
    var _a, _b, _c;
    if ((_a = config === null || config === void 0 ? void 0 : config.automaticFunctionCalling) === null || _a === void 0 ? void 0 : _a.disable) {
        return true;
    }
    let callableToolsPresent = false;
    for (const tool of (_b = config === null || config === void 0 ? void 0 : config.tools) !== null && _b !== void 0 ? _b : []) {
        if (isCallableTool(tool)) {
            callableToolsPresent = true;
            break;
        }
    }
    if (!callableToolsPresent) {
        return true;
    }
    const maxCalls = (_c = config === null || config === void 0 ? void 0 : config.automaticFunctionCalling) === null || _c === void 0 ? void 0 : _c.maximumRemoteCalls;
    if ((maxCalls && (maxCalls < 0 || !Number.isInteger(maxCalls))) ||
        maxCalls == 0) {
        console.warn('Invalid maximumRemoteCalls value provided for automatic function calling. Disabled automatic function calling. Please provide a valid integer value greater than 0. maximumRemoteCalls provided:', maxCalls);
        return true;
    }
    return false;
}
function isCallableTool(tool) {
    return 'callTool' in tool && typeof tool.callTool === 'function';
}
// Checks whether the list of tools contains any CallableTools. Will return true
// if there is at least one CallableTool.
function hasCallableTools(params) {
    var _a, _b, _c;
    return (_c = (_b = (_a = params.config) === null || _a === void 0 ? void 0 : _a.tools) === null || _b === void 0 ? void 0 : _b.some((tool) => isCallableTool(tool))) !== null && _c !== void 0 ? _c : false;
}
// Checks whether the list of tools contains any non-callable tools. Will return
// true if there is at least one non-Callable tool.
function hasNonCallableTools(params) {
    var _a, _b, _c;
    return (_c = (_b = (_a = params.config) === null || _a === void 0 ? void 0 : _a.tools) === null || _b === void 0 ? void 0 : _b.some((tool) => !isCallableTool(tool))) !== null && _c !== void 0 ? _c : false;
}
/**
 * Returns whether to append automatic function calling history to the
 * response.
 */
function shouldAppendAfcHistory(config) {
    var _a;
    return !((_a = config === null || config === void 0 ? void 0 : config.automaticFunctionCalling) === null || _a === void 0 ? void 0 : _a.ignoreCallHistory);
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Models extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
        /**
         * Makes an API request to generate content with a given model.
         *
         * For the `model` parameter, supported formats for Vertex AI API include:
         * - The Gemini model ID, for example: 'gemini-2.0-flash'
         * - The full resource name starts with 'projects/', for example:
         *  'projects/my-project-id/locations/us-central1/publishers/google/models/gemini-2.0-flash'
         * - The partial resource name with 'publishers/', for example:
         *  'publishers/google/models/gemini-2.0-flash' or
         *  'publishers/meta/models/llama-3.1-405b-instruct-maas'
         * - `/` separated publisher and model name, for example:
         * 'google/gemini-2.0-flash' or 'meta/llama-3.1-405b-instruct-maas'
         *
         * For the `model` parameter, supported formats for Gemini API include:
         * - The Gemini model ID, for example: 'gemini-2.0-flash'
         * - The model name starts with 'models/', for example:
         *  'models/gemini-2.0-flash'
         * - For tuned models, the model name starts with 'tunedModels/',
         * for example:
         * 'tunedModels/1234567890123456789'
         *
         * Some models support multimodal input and output.
         *
         * @param params - The parameters for generating content.
         * @return The response from generating content.
         *
         * @example
         * ```ts
         * const response = await ai.models.generateContent({
         *   model: 'gemini-2.0-flash',
         *   contents: 'why is the sky blue?',
         *   config: {
         *     candidateCount: 2,
         *   }
         * });
         * console.log(response);
         * ```
         */
        this.generateContent = async (params) => {
            var _a, _b, _c, _d, _e;
            const transformedParams = await this.processParamsMaybeAddMcpUsage(params);
            this.maybeMoveToResponseJsonSchem(params);
            if (!hasCallableTools(params) || shouldDisableAfc(params.config)) {
                return await this.generateContentInternal(transformedParams);
            }
            if (hasNonCallableTools(params)) {
                throw new Error('Automatic function calling with CallableTools and Tools is not yet supported.');
            }
            let response;
            let functionResponseContent;
            const automaticFunctionCallingHistory = tContents(transformedParams.contents);
            const maxRemoteCalls = (_c = (_b = (_a = transformedParams.config) === null || _a === void 0 ? void 0 : _a.automaticFunctionCalling) === null || _b === void 0 ? void 0 : _b.maximumRemoteCalls) !== null && _c !== void 0 ? _c : DEFAULT_MAX_REMOTE_CALLS;
            let remoteCalls = 0;
            while (remoteCalls < maxRemoteCalls) {
                response = await this.generateContentInternal(transformedParams);
                if (!response.functionCalls || response.functionCalls.length === 0) {
                    break;
                }
                const responseContent = response.candidates[0].content;
                const functionResponseParts = [];
                for (const tool of (_e = (_d = params.config) === null || _d === void 0 ? void 0 : _d.tools) !== null && _e !== void 0 ? _e : []) {
                    if (isCallableTool(tool)) {
                        const callableTool = tool;
                        const parts = await callableTool.callTool(response.functionCalls);
                        functionResponseParts.push(...parts);
                    }
                }
                remoteCalls++;
                functionResponseContent = {
                    role: 'user',
                    parts: functionResponseParts,
                };
                transformedParams.contents = tContents(transformedParams.contents);
                transformedParams.contents.push(responseContent);
                transformedParams.contents.push(functionResponseContent);
                if (shouldAppendAfcHistory(transformedParams.config)) {
                    automaticFunctionCallingHistory.push(responseContent);
                    automaticFunctionCallingHistory.push(functionResponseContent);
                }
            }
            if (shouldAppendAfcHistory(transformedParams.config)) {
                response.automaticFunctionCallingHistory =
                    automaticFunctionCallingHistory;
            }
            return response;
        };
        /**
         * Makes an API request to generate content with a given model and yields the
         * response in chunks.
         *
         * For the `model` parameter, supported formats for Vertex AI API include:
         * - The Gemini model ID, for example: 'gemini-2.0-flash'
         * - The full resource name starts with 'projects/', for example:
         *  'projects/my-project-id/locations/us-central1/publishers/google/models/gemini-2.0-flash'
         * - The partial resource name with 'publishers/', for example:
         *  'publishers/google/models/gemini-2.0-flash' or
         *  'publishers/meta/models/llama-3.1-405b-instruct-maas'
         * - `/` separated publisher and model name, for example:
         * 'google/gemini-2.0-flash' or 'meta/llama-3.1-405b-instruct-maas'
         *
         * For the `model` parameter, supported formats for Gemini API include:
         * - The Gemini model ID, for example: 'gemini-2.0-flash'
         * - The model name starts with 'models/', for example:
         *  'models/gemini-2.0-flash'
         * - For tuned models, the model name starts with 'tunedModels/',
         * for example:
         *  'tunedModels/1234567890123456789'
         *
         * Some models support multimodal input and output.
         *
         * @param params - The parameters for generating content with streaming response.
         * @return The response from generating content.
         *
         * @example
         * ```ts
         * const response = await ai.models.generateContentStream({
         *   model: 'gemini-2.0-flash',
         *   contents: 'why is the sky blue?',
         *   config: {
         *     maxOutputTokens: 200,
         *   }
         * });
         * for await (const chunk of response) {
         *   console.log(chunk);
         * }
         * ```
         */
        this.generateContentStream = async (params) => {
            this.maybeMoveToResponseJsonSchem(params);
            if (shouldDisableAfc(params.config)) {
                const transformedParams = await this.processParamsMaybeAddMcpUsage(params);
                return await this.generateContentStreamInternal(transformedParams);
            }
            else {
                return await this.processAfcStream(params);
            }
        };
        /**
         * Generates an image based on a text description and configuration.
         *
         * @param params - The parameters for generating images.
         * @return The response from the API.
         *
         * @example
         * ```ts
         * const response = await client.models.generateImages({
         *  model: 'imagen-3.0-generate-002',
         *  prompt: 'Robot holding a red skateboard',
         *  config: {
         *    numberOfImages: 1,
         *    includeRaiReason: true,
         *  },
         * });
         * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
         * ```
         */
        this.generateImages = async (params) => {
            return await this.generateImagesInternal(params).then((apiResponse) => {
                var _a;
                let positivePromptSafetyAttributes;
                const generatedImages = [];
                if (apiResponse === null || apiResponse === void 0 ? void 0 : apiResponse.generatedImages) {
                    for (const generatedImage of apiResponse.generatedImages) {
                        if (generatedImage &&
                            (generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes) &&
                            ((_a = generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes) === null || _a === void 0 ? void 0 : _a.contentType) === 'Positive Prompt') {
                            positivePromptSafetyAttributes = generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes;
                        }
                        else {
                            generatedImages.push(generatedImage);
                        }
                    }
                }
                let response;
                if (positivePromptSafetyAttributes) {
                    response = {
                        generatedImages: generatedImages,
                        positivePromptSafetyAttributes: positivePromptSafetyAttributes,
                        sdkHttpResponse: apiResponse.sdkHttpResponse,
                    };
                }
                else {
                    response = {
                        generatedImages: generatedImages,
                        sdkHttpResponse: apiResponse.sdkHttpResponse,
                    };
                }
                return response;
            });
        };
        this.list = async (params) => {
            var _a;
            const defaultConfig = {
                queryBase: true,
            };
            const actualConfig = Object.assign(Object.assign({}, defaultConfig), params === null || params === void 0 ? void 0 : params.config);
            const actualParams = {
                config: actualConfig,
            };
            if (this.apiClient.isVertexAI()) {
                if (!actualParams.config.queryBase) {
                    if ((_a = actualParams.config) === null || _a === void 0 ? void 0 : _a.filter) {
                        throw new Error('Filtering tuned models list for Vertex AI is not currently supported');
                    }
                    else {
                        actualParams.config.filter = 'labels.tune-type:*';
                    }
                }
            }
            return new Pager(PagedItem.PAGED_ITEM_MODELS, (x) => this.listInternal(x), await this.listInternal(actualParams), actualParams);
        };
        /**
         * Edits an image based on a prompt, list of reference images, and configuration.
         *
         * @param params - The parameters for editing an image.
         * @return The response from the API.
         *
         * @example
         * ```ts
         * const response = await client.models.editImage({
         *  model: 'imagen-3.0-capability-001',
         *  prompt: 'Generate an image containing a mug with the product logo [1] visible on the side of the mug.',
         *  referenceImages: [subjectReferenceImage]
         *  config: {
         *    numberOfImages: 1,
         *    includeRaiReason: true,
         *  },
         * });
         * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
         * ```
         */
        this.editImage = async (params) => {
            const paramsInternal = {
                model: params.model,
                prompt: params.prompt,
                referenceImages: [],
                config: params.config,
            };
            if (params.referenceImages) {
                if (params.referenceImages) {
                    paramsInternal.referenceImages = params.referenceImages.map((img) => img.toReferenceImageAPI());
                }
            }
            return await this.editImageInternal(paramsInternal);
        };
        /**
         * Upscales an image based on an image, upscale factor, and configuration.
         * Only supported in Vertex AI currently.
         *
         * @param params - The parameters for upscaling an image.
         * @return The response from the API.
         *
         * @example
         * ```ts
         * const response = await client.models.upscaleImage({
         *  model: 'imagen-3.0-generate-002',
         *  image: image,
         *  upscaleFactor: 'x2',
         *  config: {
         *    includeRaiReason: true,
         *  },
         * });
         * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
         * ```
         */
        this.upscaleImage = async (params) => {
            let apiConfig = {
                numberOfImages: 1,
                mode: 'upscale',
            };
            if (params.config) {
                apiConfig = Object.assign(Object.assign({}, apiConfig), params.config);
            }
            const apiParams = {
                model: params.model,
                image: params.image,
                upscaleFactor: params.upscaleFactor,
                config: apiConfig,
            };
            return await this.upscaleImageInternal(apiParams);
        };
        /**
         *  Generates videos based on a text description and configuration.
         *
         * @param params - The parameters for generating videos.
         * @return A Promise<GenerateVideosOperation> which allows you to track the progress and eventually retrieve the generated videos using the operations.get method.
         *
         * @example
         * ```ts
         * const operation = await ai.models.generateVideos({
         *  model: 'veo-2.0-generate-001',
         *  source: {
         *    prompt: 'A neon hologram of a cat driving at top speed',
         *  },
         *  config: {
         *    numberOfVideos: 1
         * });
         *
         * while (!operation.done) {
         *   await new Promise(resolve => setTimeout(resolve, 10000));
         *   operation = await ai.operations.getVideosOperation({operation: operation});
         * }
         *
         * console.log(operation.response?.generatedVideos?.[0]?.video?.uri);
         * ```
         */
        this.generateVideos = async (params) => {
            if ((params.prompt || params.image || params.video) && params.source) {
                throw new Error('Source and prompt/image/video are mutually exclusive. Please only use source.');
            }
            return await this.generateVideosInternal(params);
        };
    }
    /**
     * This logic is needed for GenerateContentConfig only.
     * Previously we made GenerateContentConfig.responseSchema field to accept
     * unknown. Since v1.9.0, we switch to use backend JSON schema support.
     * To maintain backward compatibility, we move the data that was treated as
     * JSON schema from the responseSchema field to the responseJsonSchema field.
     */
    maybeMoveToResponseJsonSchem(params) {
        if (params.config && params.config.responseSchema) {
            if (!params.config.responseJsonSchema) {
                if (Object.keys(params.config.responseSchema).includes('$schema')) {
                    params.config.responseJsonSchema = params.config.responseSchema;
                    delete params.config.responseSchema;
                }
            }
        }
        return;
    }
    /**
     * Transforms the CallableTools in the parameters to be simply Tools, it
     * copies the params into a new object and replaces the tools, it does not
     * modify the original params. Also sets the MCP usage header if there are
     * MCP tools in the parameters.
     */
    async processParamsMaybeAddMcpUsage(params) {
        var _a, _b, _c;
        const tools = (_a = params.config) === null || _a === void 0 ? void 0 : _a.tools;
        if (!tools) {
            return params;
        }
        const transformedTools = await Promise.all(tools.map(async (tool) => {
            if (isCallableTool(tool)) {
                const callableTool = tool;
                return await callableTool.tool();
            }
            return tool;
        }));
        const newParams = {
            model: params.model,
            contents: params.contents,
            config: Object.assign(Object.assign({}, params.config), { tools: transformedTools }),
        };
        newParams.config.tools = transformedTools;
        if (params.config &&
            params.config.tools &&
            hasMcpToolUsage(params.config.tools)) {
            const headers = (_c = (_b = params.config.httpOptions) === null || _b === void 0 ? void 0 : _b.headers) !== null && _c !== void 0 ? _c : {};
            let newHeaders = Object.assign({}, headers);
            if (Object.keys(newHeaders).length === 0) {
                newHeaders = this.apiClient.getDefaultHeaders();
            }
            setMcpUsageHeader(newHeaders);
            newParams.config.httpOptions = Object.assign(Object.assign({}, params.config.httpOptions), { headers: newHeaders });
        }
        return newParams;
    }
    async initAfcToolsMap(params) {
        var _a, _b, _c;
        const afcTools = new Map();
        for (const tool of (_b = (_a = params.config) === null || _a === void 0 ? void 0 : _a.tools) !== null && _b !== void 0 ? _b : []) {
            if (isCallableTool(tool)) {
                const callableTool = tool;
                const toolDeclaration = await callableTool.tool();
                for (const declaration of (_c = toolDeclaration.functionDeclarations) !== null && _c !== void 0 ? _c : []) {
                    if (!declaration.name) {
                        throw new Error('Function declaration name is required.');
                    }
                    if (afcTools.has(declaration.name)) {
                        throw new Error(`Duplicate tool declaration name: ${declaration.name}`);
                    }
                    afcTools.set(declaration.name, callableTool);
                }
            }
        }
        return afcTools;
    }
    async processAfcStream(params) {
        var _a, _b, _c;
        const maxRemoteCalls = (_c = (_b = (_a = params.config) === null || _a === void 0 ? void 0 : _a.automaticFunctionCalling) === null || _b === void 0 ? void 0 : _b.maximumRemoteCalls) !== null && _c !== void 0 ? _c : DEFAULT_MAX_REMOTE_CALLS;
        let wereFunctionsCalled = false;
        let remoteCallCount = 0;
        const afcToolsMap = await this.initAfcToolsMap(params);
        return (function (models, afcTools, params) {
            var _a, _b;
            return __asyncGenerator(this, arguments, function* () {
                var _c, e_1, _d, _e;
                while (remoteCallCount < maxRemoteCalls) {
                    if (wereFunctionsCalled) {
                        remoteCallCount++;
                        wereFunctionsCalled = false;
                    }
                    const transformedParams = yield __await(models.processParamsMaybeAddMcpUsage(params));
                    const response = yield __await(models.generateContentStreamInternal(transformedParams));
                    const functionResponses = [];
                    const responseContents = [];
                    try {
                        for (var _f = true, response_1 = (e_1 = void 0, __asyncValues(response)), response_1_1; response_1_1 = yield __await(response_1.next()), _c = response_1_1.done, !_c; _f = true) {
                            _e = response_1_1.value;
                            _f = false;
                            const chunk = _e;
                            yield yield __await(chunk);
                            if (chunk.candidates && ((_a = chunk.candidates[0]) === null || _a === void 0 ? void 0 : _a.content)) {
                                responseContents.push(chunk.candidates[0].content);
                                for (const part of (_b = chunk.candidates[0].content.parts) !== null && _b !== void 0 ? _b : []) {
                                    if (remoteCallCount < maxRemoteCalls && part.functionCall) {
                                        if (!part.functionCall.name) {
                                            throw new Error('Function call name was not returned by the model.');
                                        }
                                        if (!afcTools.has(part.functionCall.name)) {
                                            throw new Error(`Automatic function calling was requested, but not all the tools the model used implement the CallableTool interface. Available tools: ${afcTools.keys()}, mising tool: ${part.functionCall.name}`);
                                        }
                                        else {
                                            const responseParts = yield __await(afcTools
                                                .get(part.functionCall.name)
                                                .callTool([part.functionCall]));
                                            functionResponses.push(...responseParts);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_f && !_c && (_d = response_1.return)) yield __await(_d.call(response_1));
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    if (functionResponses.length > 0) {
                        wereFunctionsCalled = true;
                        const typedResponseChunk = new GenerateContentResponse();
                        typedResponseChunk.candidates = [
                            {
                                content: {
                                    role: 'user',
                                    parts: functionResponses,
                                },
                            },
                        ];
                        yield yield __await(typedResponseChunk);
                        const newContents = [];
                        newContents.push(...responseContents);
                        newContents.push({
                            role: 'user',
                            parts: functionResponses,
                        });
                        const updatedContents = tContents(params.contents).concat(newContents);
                        params.contents = updatedContents;
                    }
                    else {
                        break;
                    }
                }
            });
        })(this, afcToolsMap, params);
    }
    async generateContentInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = generateContentParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:generateContent', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = generateContentResponseFromVertex(apiResponse);
                const typedResp = new GenerateContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = generateContentParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:generateContent', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = generateContentResponseFromMldev(apiResponse);
                const typedResp = new GenerateContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    async generateContentStreamInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = generateContentParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:streamGenerateContent?alt=sse', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            const apiClient = this.apiClient;
            response = apiClient.requestStream({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            });
            return response.then(function (apiResponse) {
                return __asyncGenerator(this, arguments, function* () {
                    var _a, e_2, _b, _c;
                    try {
                        for (var _d = true, apiResponse_1 = __asyncValues(apiResponse), apiResponse_1_1; apiResponse_1_1 = yield __await(apiResponse_1.next()), _a = apiResponse_1_1.done, !_a; _d = true) {
                            _c = apiResponse_1_1.value;
                            _d = false;
                            const chunk = _c;
                            const resp = generateContentResponseFromVertex((yield __await(chunk.json())));
                            resp['sdkHttpResponse'] = {
                                headers: chunk.headers,
                            };
                            const typedResp = new GenerateContentResponse();
                            Object.assign(typedResp, resp);
                            yield yield __await(typedResp);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = apiResponse_1.return)) yield __await(_b.call(apiResponse_1));
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                });
            });
        }
        else {
            const body = generateContentParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:streamGenerateContent?alt=sse', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            const apiClient = this.apiClient;
            response = apiClient.requestStream({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            });
            return response.then(function (apiResponse) {
                return __asyncGenerator(this, arguments, function* () {
                    var _a, e_3, _b, _c;
                    try {
                        for (var _d = true, apiResponse_2 = __asyncValues(apiResponse), apiResponse_2_1; apiResponse_2_1 = yield __await(apiResponse_2.next()), _a = apiResponse_2_1.done, !_a; _d = true) {
                            _c = apiResponse_2_1.value;
                            _d = false;
                            const chunk = _c;
                            const resp = generateContentResponseFromMldev((yield __await(chunk.json())));
                            resp['sdkHttpResponse'] = {
                                headers: chunk.headers,
                            };
                            const typedResp = new GenerateContentResponse();
                            Object.assign(typedResp, resp);
                            yield yield __await(typedResp);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = apiResponse_2.return)) yield __await(_b.call(apiResponse_2));
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                });
            });
        }
    }
    /**
     * Calculates embeddings for the given contents. Only text is supported.
     *
     * @param params - The parameters for embedding contents.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.embedContent({
     *  model: 'text-embedding-004',
     *  contents: [
     *    'What is your name?',
     *    'What is your favorite color?',
     *  ],
     *  config: {
     *    outputDimensionality: 64,
     *  },
     * });
     * console.log(response);
     * ```
     */
    async embedContent(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = embedContentParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = embedContentResponseFromVertex(apiResponse);
                const typedResp = new EmbedContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = embedContentParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:batchEmbedContents', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = embedContentResponseFromMldev(apiResponse);
                const typedResp = new EmbedContentResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Private method for generating images.
     */
    async generateImagesInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = generateImagesParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = generateImagesResponseFromVertex(apiResponse);
                const typedResp = new GenerateImagesResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = generateImagesParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = generateImagesResponseFromMldev(apiResponse);
                const typedResp = new GenerateImagesResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Private method for editing an image.
     */
    async editImageInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = editImageParametersInternalToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = editImageResponseFromVertex(apiResponse);
                const typedResp = new EditImageResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    /**
     * Private method for upscaling an image.
     */
    async upscaleImageInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = upscaleImageAPIParametersInternalToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = upscaleImageResponseFromVertex(apiResponse);
                const typedResp = new UpscaleImageResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    /**
     * Recontextualizes an image.
     *
     * There are two types of recontextualization currently supported:
     * 1) Imagen Product Recontext - Generate images of products in new scenes
     *    and contexts.
     * 2) Virtual Try-On: Generate images of persons modeling fashion products.
     *
     * @param params - The parameters for recontextualizing an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response1 = await ai.models.recontextImage({
     *  model: 'imagen-product-recontext-preview-06-30',
     *  source: {
     *    prompt: 'In a modern kitchen setting.',
     *    productImages: [productImage],
     *  },
     *  config: {
     *    numberOfImages: 1,
     *  },
     * });
     * console.log(response1?.generatedImages?.[0]?.image?.imageBytes);
     *
     * const response2 = await ai.models.recontextImage({
     *  model: 'virtual-try-on-preview-08-04',
     *  source: {
     *    personImage: personImage,
     *    productImages: [productImage],
     *  },
     *  config: {
     *    numberOfImages: 1,
     *  },
     * });
     * console.log(response2?.generatedImages?.[0]?.image?.imageBytes);
     * ```
     */
    async recontextImage(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = recontextImageParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = recontextImageResponseFromVertex(apiResponse);
                const typedResp = new RecontextImageResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    /**
     * Segments an image, creating a mask of a specified area.
     *
     * @param params - The parameters for segmenting an image.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.segmentImage({
     *  model: 'image-segmentation-001',
     *  source: {
     *    image: image,
     *  },
     *  config: {
     *    mode: 'foreground',
     *  },
     * });
     * console.log(response?.generatedMasks?.[0]?.mask?.imageBytes);
     * ```
     */
    async segmentImage(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = segmentImageParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:predict', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = segmentImageResponseFromVertex(apiResponse);
                const typedResp = new SegmentImageResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    /**
     * Fetches information about a model by name.
     *
     * @example
     * ```ts
     * const modelInfo = await ai.models.get({model: 'gemini-2.0-flash'});
     * ```
     */
    async get(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = getModelParametersToVertex(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = modelFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = getModelParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = modelFromMldev(apiResponse);
                return resp;
            });
        }
    }
    async listInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = listModelsParametersToVertex(this.apiClient, params);
            path = formatMap('{models_url}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listModelsResponseFromVertex(apiResponse);
                const typedResp = new ListModelsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = listModelsParametersToMldev(this.apiClient, params);
            path = formatMap('{models_url}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listModelsResponseFromMldev(apiResponse);
                const typedResp = new ListModelsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Updates a tuned model by its name.
     *
     * @param params - The parameters for updating the model.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.update({
     *   model: 'tuned-model-name',
     *   config: {
     *     displayName: 'New display name',
     *     description: 'New description',
     *   },
     * });
     * ```
     */
    async update(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = updateModelParametersToVertex(this.apiClient, params);
            path = formatMap('{model}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'PATCH',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = modelFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = updateModelParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'PATCH',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = modelFromMldev(apiResponse);
                return resp;
            });
        }
    }
    /**
     * Deletes a tuned model by its name.
     *
     * @param params - The parameters for deleting the model.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.delete({model: 'tuned-model-name'});
     * ```
     */
    async delete(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = deleteModelParametersToVertex(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteModelResponseFromVertex(apiResponse);
                const typedResp = new DeleteModelResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = deleteModelParametersToMldev(this.apiClient, params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'DELETE',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = deleteModelResponseFromMldev(apiResponse);
                const typedResp = new DeleteModelResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Counts the number of tokens in the given contents. Multimodal input is
     * supported for Gemini models.
     *
     * @param params - The parameters for counting tokens.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.countTokens({
     *  model: 'gemini-2.0-flash',
     *  contents: 'The quick brown fox jumps over the lazy dog.'
     * });
     * console.log(response);
     * ```
     */
    async countTokens(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = countTokensParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:countTokens', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = countTokensResponseFromVertex(apiResponse);
                const typedResp = new CountTokensResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = countTokensParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:countTokens', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = countTokensResponseFromMldev(apiResponse);
                const typedResp = new CountTokensResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Given a list of contents, returns a corresponding TokensInfo containing
     * the list of tokens and list of token ids.
     *
     * This method is not supported by the Gemini Developer API.
     *
     * @param params - The parameters for computing tokens.
     * @return The response from the API.
     *
     * @example
     * ```ts
     * const response = await ai.models.computeTokens({
     *  model: 'gemini-2.0-flash',
     *  contents: 'What is your name?'
     * });
     * console.log(response);
     * ```
     */
    async computeTokens(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = computeTokensParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:computeTokens', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = computeTokensResponseFromVertex(apiResponse);
                const typedResp = new ComputeTokensResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    /**
     * Private method for generating videos.
     */
    async generateVideosInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = generateVideosParametersToVertex(this.apiClient, params);
            path = formatMap('{model}:predictLongRunning', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = generateVideosOperationFromVertex(apiResponse);
                const typedResp = new GenerateVideosOperation();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = generateVideosParametersToMldev(this.apiClient, params);
            path = formatMap('{model}:predictLongRunning', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = generateVideosOperationFromMldev(apiResponse);
                const typedResp = new GenerateVideosOperation();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Operations extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
    }
    /**
     * Gets the status of a long-running operation.
     *
     * @param parameters The parameters for the get operation request.
     * @return The updated Operation object, with the latest status or result.
     */
    async getVideosOperation(parameters) {
        const operation = parameters.operation;
        const config = parameters.config;
        if (operation.name === undefined || operation.name === '') {
            throw new Error('Operation name is required.');
        }
        if (this.apiClient.isVertexAI()) {
            const resourceName = operation.name.split('/operations/')[0];
            let httpOptions = undefined;
            if (config && 'httpOptions' in config) {
                httpOptions = config.httpOptions;
            }
            const rawOperation = await this.fetchPredictVideosOperationInternal({
                operationName: operation.name,
                resourceName: resourceName,
                config: { httpOptions: httpOptions },
            });
            return operation._fromAPIResponse({
                apiResponse: rawOperation,
                isVertexAI: true,
            });
        }
        else {
            const rawOperation = await this.getVideosOperationInternal({
                operationName: operation.name,
                config: config,
            });
            return operation._fromAPIResponse({
                apiResponse: rawOperation,
                isVertexAI: false,
            });
        }
    }
    /**
     * Gets the status of a long-running operation.
     *
     * @param parameters The parameters for the get operation request.
     * @return The updated Operation object, with the latest status or result.
     */
    async get(parameters) {
        const operation = parameters.operation;
        const config = parameters.config;
        if (operation.name === undefined || operation.name === '') {
            throw new Error('Operation name is required.');
        }
        if (this.apiClient.isVertexAI()) {
            const resourceName = operation.name.split('/operations/')[0];
            let httpOptions = undefined;
            if (config && 'httpOptions' in config) {
                httpOptions = config.httpOptions;
            }
            const rawOperation = await this.fetchPredictVideosOperationInternal({
                operationName: operation.name,
                resourceName: resourceName,
                config: { httpOptions: httpOptions },
            });
            return operation._fromAPIResponse({
                apiResponse: rawOperation,
                isVertexAI: true,
            });
        }
        else {
            const rawOperation = await this.getVideosOperationInternal({
                operationName: operation.name,
                config: config,
            });
            return operation._fromAPIResponse({
                apiResponse: rawOperation,
                isVertexAI: false,
            });
        }
    }
    async getVideosOperationInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = getOperationParametersToVertex(params);
            path = formatMap('{operationName}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response;
        }
        else {
            const body = getOperationParametersToMldev(params);
            path = formatMap('{operationName}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response;
        }
    }
    async fetchPredictVideosOperationInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = fetchPredictOperationParametersToVertex(params);
            path = formatMap('{resourceName}:fetchPredictOperation', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response;
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function prebuiltVoiceConfigToMldev(fromObject) {
    const toObject = {};
    const fromVoiceName = getValueByPath(fromObject, ['voiceName']);
    if (fromVoiceName != null) {
        setValueByPath(toObject, ['voiceName'], fromVoiceName);
    }
    return toObject;
}
function voiceConfigToMldev(fromObject) {
    const toObject = {};
    const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
        'prebuiltVoiceConfig',
    ]);
    if (fromPrebuiltVoiceConfig != null) {
        setValueByPath(toObject, ['prebuiltVoiceConfig'], prebuiltVoiceConfigToMldev(fromPrebuiltVoiceConfig));
    }
    return toObject;
}
function speakerVoiceConfigToMldev(fromObject) {
    const toObject = {};
    const fromSpeaker = getValueByPath(fromObject, ['speaker']);
    if (fromSpeaker != null) {
        setValueByPath(toObject, ['speaker'], fromSpeaker);
    }
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev(fromVoiceConfig));
    }
    return toObject;
}
function multiSpeakerVoiceConfigToMldev(fromObject) {
    const toObject = {};
    const fromSpeakerVoiceConfigs = getValueByPath(fromObject, [
        'speakerVoiceConfigs',
    ]);
    if (fromSpeakerVoiceConfigs != null) {
        let transformedList = fromSpeakerVoiceConfigs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return speakerVoiceConfigToMldev(item);
            });
        }
        setValueByPath(toObject, ['speakerVoiceConfigs'], transformedList);
    }
    return toObject;
}
function speechConfigToMldev(fromObject) {
    const toObject = {};
    const fromVoiceConfig = getValueByPath(fromObject, ['voiceConfig']);
    if (fromVoiceConfig != null) {
        setValueByPath(toObject, ['voiceConfig'], voiceConfigToMldev(fromVoiceConfig));
    }
    const fromMultiSpeakerVoiceConfig = getValueByPath(fromObject, [
        'multiSpeakerVoiceConfig',
    ]);
    if (fromMultiSpeakerVoiceConfig != null) {
        setValueByPath(toObject, ['multiSpeakerVoiceConfig'], multiSpeakerVoiceConfigToMldev(fromMultiSpeakerVoiceConfig));
    }
    const fromLanguageCode = getValueByPath(fromObject, ['languageCode']);
    if (fromLanguageCode != null) {
        setValueByPath(toObject, ['languageCode'], fromLanguageCode);
    }
    return toObject;
}
function videoMetadataToMldev(fromObject) {
    const toObject = {};
    const fromFps = getValueByPath(fromObject, ['fps']);
    if (fromFps != null) {
        setValueByPath(toObject, ['fps'], fromFps);
    }
    const fromEndOffset = getValueByPath(fromObject, ['endOffset']);
    if (fromEndOffset != null) {
        setValueByPath(toObject, ['endOffset'], fromEndOffset);
    }
    const fromStartOffset = getValueByPath(fromObject, ['startOffset']);
    if (fromStartOffset != null) {
        setValueByPath(toObject, ['startOffset'], fromStartOffset);
    }
    return toObject;
}
function blobToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromData = getValueByPath(fromObject, ['data']);
    if (fromData != null) {
        setValueByPath(toObject, ['data'], fromData);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function fileDataToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['displayName']) !== undefined) {
        throw new Error('displayName parameter is not supported in Gemini API.');
    }
    const fromFileUri = getValueByPath(fromObject, ['fileUri']);
    if (fromFileUri != null) {
        setValueByPath(toObject, ['fileUri'], fromFileUri);
    }
    const fromMimeType = getValueByPath(fromObject, ['mimeType']);
    if (fromMimeType != null) {
        setValueByPath(toObject, ['mimeType'], fromMimeType);
    }
    return toObject;
}
function functionCallToMldev(fromObject) {
    const toObject = {};
    const fromId = getValueByPath(fromObject, ['id']);
    if (fromId != null) {
        setValueByPath(toObject, ['id'], fromId);
    }
    const fromArgs = getValueByPath(fromObject, ['args']);
    if (fromArgs != null) {
        setValueByPath(toObject, ['args'], fromArgs);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}
function partToMldev(fromObject) {
    const toObject = {};
    const fromVideoMetadata = getValueByPath(fromObject, [
        'videoMetadata',
    ]);
    if (fromVideoMetadata != null) {
        setValueByPath(toObject, ['videoMetadata'], videoMetadataToMldev(fromVideoMetadata));
    }
    const fromThought = getValueByPath(fromObject, ['thought']);
    if (fromThought != null) {
        setValueByPath(toObject, ['thought'], fromThought);
    }
    const fromInlineData = getValueByPath(fromObject, ['inlineData']);
    if (fromInlineData != null) {
        setValueByPath(toObject, ['inlineData'], blobToMldev(fromInlineData));
    }
    const fromFileData = getValueByPath(fromObject, ['fileData']);
    if (fromFileData != null) {
        setValueByPath(toObject, ['fileData'], fileDataToMldev(fromFileData));
    }
    const fromThoughtSignature = getValueByPath(fromObject, [
        'thoughtSignature',
    ]);
    if (fromThoughtSignature != null) {
        setValueByPath(toObject, ['thoughtSignature'], fromThoughtSignature);
    }
    const fromFunctionCall = getValueByPath(fromObject, ['functionCall']);
    if (fromFunctionCall != null) {
        setValueByPath(toObject, ['functionCall'], functionCallToMldev(fromFunctionCall));
    }
    const fromCodeExecutionResult = getValueByPath(fromObject, [
        'codeExecutionResult',
    ]);
    if (fromCodeExecutionResult != null) {
        setValueByPath(toObject, ['codeExecutionResult'], fromCodeExecutionResult);
    }
    const fromExecutableCode = getValueByPath(fromObject, [
        'executableCode',
    ]);
    if (fromExecutableCode != null) {
        setValueByPath(toObject, ['executableCode'], fromExecutableCode);
    }
    const fromFunctionResponse = getValueByPath(fromObject, [
        'functionResponse',
    ]);
    if (fromFunctionResponse != null) {
        setValueByPath(toObject, ['functionResponse'], fromFunctionResponse);
    }
    const fromText = getValueByPath(fromObject, ['text']);
    if (fromText != null) {
        setValueByPath(toObject, ['text'], fromText);
    }
    return toObject;
}
function contentToMldev(fromObject) {
    const toObject = {};
    const fromParts = getValueByPath(fromObject, ['parts']);
    if (fromParts != null) {
        let transformedList = fromParts;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return partToMldev(item);
            });
        }
        setValueByPath(toObject, ['parts'], transformedList);
    }
    const fromRole = getValueByPath(fromObject, ['role']);
    if (fromRole != null) {
        setValueByPath(toObject, ['role'], fromRole);
    }
    return toObject;
}
function functionDeclarationToMldev(fromObject) {
    const toObject = {};
    const fromBehavior = getValueByPath(fromObject, ['behavior']);
    if (fromBehavior != null) {
        setValueByPath(toObject, ['behavior'], fromBehavior);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromParameters = getValueByPath(fromObject, ['parameters']);
    if (fromParameters != null) {
        setValueByPath(toObject, ['parameters'], fromParameters);
    }
    const fromParametersJsonSchema = getValueByPath(fromObject, [
        'parametersJsonSchema',
    ]);
    if (fromParametersJsonSchema != null) {
        setValueByPath(toObject, ['parametersJsonSchema'], fromParametersJsonSchema);
    }
    const fromResponse = getValueByPath(fromObject, ['response']);
    if (fromResponse != null) {
        setValueByPath(toObject, ['response'], fromResponse);
    }
    const fromResponseJsonSchema = getValueByPath(fromObject, [
        'responseJsonSchema',
    ]);
    if (fromResponseJsonSchema != null) {
        setValueByPath(toObject, ['responseJsonSchema'], fromResponseJsonSchema);
    }
    return toObject;
}
function intervalToMldev(fromObject) {
    const toObject = {};
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    return toObject;
}
function googleSearchToMldev(fromObject) {
    const toObject = {};
    const fromTimeRangeFilter = getValueByPath(fromObject, [
        'timeRangeFilter',
    ]);
    if (fromTimeRangeFilter != null) {
        setValueByPath(toObject, ['timeRangeFilter'], intervalToMldev(fromTimeRangeFilter));
    }
    if (getValueByPath(fromObject, ['excludeDomains']) !== undefined) {
        throw new Error('excludeDomains parameter is not supported in Gemini API.');
    }
    return toObject;
}
function dynamicRetrievalConfigToMldev(fromObject) {
    const toObject = {};
    const fromMode = getValueByPath(fromObject, ['mode']);
    if (fromMode != null) {
        setValueByPath(toObject, ['mode'], fromMode);
    }
    const fromDynamicThreshold = getValueByPath(fromObject, [
        'dynamicThreshold',
    ]);
    if (fromDynamicThreshold != null) {
        setValueByPath(toObject, ['dynamicThreshold'], fromDynamicThreshold);
    }
    return toObject;
}
function googleSearchRetrievalToMldev(fromObject) {
    const toObject = {};
    const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
        'dynamicRetrievalConfig',
    ]);
    if (fromDynamicRetrievalConfig != null) {
        setValueByPath(toObject, ['dynamicRetrievalConfig'], dynamicRetrievalConfigToMldev(fromDynamicRetrievalConfig));
    }
    return toObject;
}
function urlContextToMldev() {
    const toObject = {};
    return toObject;
}
function toolComputerUseToMldev(fromObject) {
    const toObject = {};
    const fromEnvironment = getValueByPath(fromObject, ['environment']);
    if (fromEnvironment != null) {
        setValueByPath(toObject, ['environment'], fromEnvironment);
    }
    return toObject;
}
function toolToMldev(fromObject) {
    const toObject = {};
    const fromFunctionDeclarations = getValueByPath(fromObject, [
        'functionDeclarations',
    ]);
    if (fromFunctionDeclarations != null) {
        let transformedList = fromFunctionDeclarations;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return functionDeclarationToMldev(item);
            });
        }
        setValueByPath(toObject, ['functionDeclarations'], transformedList);
    }
    if (getValueByPath(fromObject, ['retrieval']) !== undefined) {
        throw new Error('retrieval parameter is not supported in Gemini API.');
    }
    const fromGoogleSearch = getValueByPath(fromObject, ['googleSearch']);
    if (fromGoogleSearch != null) {
        setValueByPath(toObject, ['googleSearch'], googleSearchToMldev(fromGoogleSearch));
    }
    const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
        'googleSearchRetrieval',
    ]);
    if (fromGoogleSearchRetrieval != null) {
        setValueByPath(toObject, ['googleSearchRetrieval'], googleSearchRetrievalToMldev(fromGoogleSearchRetrieval));
    }
    if (getValueByPath(fromObject, ['enterpriseWebSearch']) !== undefined) {
        throw new Error('enterpriseWebSearch parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['googleMaps']) !== undefined) {
        throw new Error('googleMaps parameter is not supported in Gemini API.');
    }
    const fromUrlContext = getValueByPath(fromObject, ['urlContext']);
    if (fromUrlContext != null) {
        setValueByPath(toObject, ['urlContext'], urlContextToMldev());
    }
    const fromComputerUse = getValueByPath(fromObject, ['computerUse']);
    if (fromComputerUse != null) {
        setValueByPath(toObject, ['computerUse'], toolComputerUseToMldev(fromComputerUse));
    }
    const fromCodeExecution = getValueByPath(fromObject, [
        'codeExecution',
    ]);
    if (fromCodeExecution != null) {
        setValueByPath(toObject, ['codeExecution'], fromCodeExecution);
    }
    return toObject;
}
function sessionResumptionConfigToMldev(fromObject) {
    const toObject = {};
    const fromHandle = getValueByPath(fromObject, ['handle']);
    if (fromHandle != null) {
        setValueByPath(toObject, ['handle'], fromHandle);
    }
    if (getValueByPath(fromObject, ['transparent']) !== undefined) {
        throw new Error('transparent parameter is not supported in Gemini API.');
    }
    return toObject;
}
function audioTranscriptionConfigToMldev() {
    const toObject = {};
    return toObject;
}
function automaticActivityDetectionToMldev(fromObject) {
    const toObject = {};
    const fromDisabled = getValueByPath(fromObject, ['disabled']);
    if (fromDisabled != null) {
        setValueByPath(toObject, ['disabled'], fromDisabled);
    }
    const fromStartOfSpeechSensitivity = getValueByPath(fromObject, [
        'startOfSpeechSensitivity',
    ]);
    if (fromStartOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['startOfSpeechSensitivity'], fromStartOfSpeechSensitivity);
    }
    const fromEndOfSpeechSensitivity = getValueByPath(fromObject, [
        'endOfSpeechSensitivity',
    ]);
    if (fromEndOfSpeechSensitivity != null) {
        setValueByPath(toObject, ['endOfSpeechSensitivity'], fromEndOfSpeechSensitivity);
    }
    const fromPrefixPaddingMs = getValueByPath(fromObject, [
        'prefixPaddingMs',
    ]);
    if (fromPrefixPaddingMs != null) {
        setValueByPath(toObject, ['prefixPaddingMs'], fromPrefixPaddingMs);
    }
    const fromSilenceDurationMs = getValueByPath(fromObject, [
        'silenceDurationMs',
    ]);
    if (fromSilenceDurationMs != null) {
        setValueByPath(toObject, ['silenceDurationMs'], fromSilenceDurationMs);
    }
    return toObject;
}
function realtimeInputConfigToMldev(fromObject) {
    const toObject = {};
    const fromAutomaticActivityDetection = getValueByPath(fromObject, [
        'automaticActivityDetection',
    ]);
    if (fromAutomaticActivityDetection != null) {
        setValueByPath(toObject, ['automaticActivityDetection'], automaticActivityDetectionToMldev(fromAutomaticActivityDetection));
    }
    const fromActivityHandling = getValueByPath(fromObject, [
        'activityHandling',
    ]);
    if (fromActivityHandling != null) {
        setValueByPath(toObject, ['activityHandling'], fromActivityHandling);
    }
    const fromTurnCoverage = getValueByPath(fromObject, ['turnCoverage']);
    if (fromTurnCoverage != null) {
        setValueByPath(toObject, ['turnCoverage'], fromTurnCoverage);
    }
    return toObject;
}
function slidingWindowToMldev(fromObject) {
    const toObject = {};
    const fromTargetTokens = getValueByPath(fromObject, ['targetTokens']);
    if (fromTargetTokens != null) {
        setValueByPath(toObject, ['targetTokens'], fromTargetTokens);
    }
    return toObject;
}
function contextWindowCompressionConfigToMldev(fromObject) {
    const toObject = {};
    const fromTriggerTokens = getValueByPath(fromObject, [
        'triggerTokens',
    ]);
    if (fromTriggerTokens != null) {
        setValueByPath(toObject, ['triggerTokens'], fromTriggerTokens);
    }
    const fromSlidingWindow = getValueByPath(fromObject, [
        'slidingWindow',
    ]);
    if (fromSlidingWindow != null) {
        setValueByPath(toObject, ['slidingWindow'], slidingWindowToMldev(fromSlidingWindow));
    }
    return toObject;
}
function proactivityConfigToMldev(fromObject) {
    const toObject = {};
    const fromProactiveAudio = getValueByPath(fromObject, [
        'proactiveAudio',
    ]);
    if (fromProactiveAudio != null) {
        setValueByPath(toObject, ['proactiveAudio'], fromProactiveAudio);
    }
    return toObject;
}
function liveConnectConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromGenerationConfig = getValueByPath(fromObject, [
        'generationConfig',
    ]);
    if (parentObject !== undefined && fromGenerationConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig'], fromGenerationConfig);
    }
    const fromResponseModalities = getValueByPath(fromObject, [
        'responseModalities',
    ]);
    if (parentObject !== undefined && fromResponseModalities != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'responseModalities'], fromResponseModalities);
    }
    const fromTemperature = getValueByPath(fromObject, ['temperature']);
    if (parentObject !== undefined && fromTemperature != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'temperature'], fromTemperature);
    }
    const fromTopP = getValueByPath(fromObject, ['topP']);
    if (parentObject !== undefined && fromTopP != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topP'], fromTopP);
    }
    const fromTopK = getValueByPath(fromObject, ['topK']);
    if (parentObject !== undefined && fromTopK != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'topK'], fromTopK);
    }
    const fromMaxOutputTokens = getValueByPath(fromObject, [
        'maxOutputTokens',
    ]);
    if (parentObject !== undefined && fromMaxOutputTokens != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'maxOutputTokens'], fromMaxOutputTokens);
    }
    const fromMediaResolution = getValueByPath(fromObject, [
        'mediaResolution',
    ]);
    if (parentObject !== undefined && fromMediaResolution != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'mediaResolution'], fromMediaResolution);
    }
    const fromSeed = getValueByPath(fromObject, ['seed']);
    if (parentObject !== undefined && fromSeed != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'seed'], fromSeed);
    }
    const fromSpeechConfig = getValueByPath(fromObject, ['speechConfig']);
    if (parentObject !== undefined && fromSpeechConfig != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'speechConfig'], speechConfigToMldev(tLiveSpeechConfig(fromSpeechConfig)));
    }
    const fromEnableAffectiveDialog = getValueByPath(fromObject, [
        'enableAffectiveDialog',
    ]);
    if (parentObject !== undefined && fromEnableAffectiveDialog != null) {
        setValueByPath(parentObject, ['setup', 'generationConfig', 'enableAffectiveDialog'], fromEnableAffectiveDialog);
    }
    const fromSystemInstruction = getValueByPath(fromObject, [
        'systemInstruction',
    ]);
    if (parentObject !== undefined && fromSystemInstruction != null) {
        setValueByPath(parentObject, ['setup', 'systemInstruction'], contentToMldev(tContent(fromSystemInstruction)));
    }
    const fromTools = getValueByPath(fromObject, ['tools']);
    if (parentObject !== undefined && fromTools != null) {
        let transformedList = tTools(fromTools);
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return toolToMldev(tTool(item));
            });
        }
        setValueByPath(parentObject, ['setup', 'tools'], transformedList);
    }
    const fromSessionResumption = getValueByPath(fromObject, [
        'sessionResumption',
    ]);
    if (parentObject !== undefined && fromSessionResumption != null) {
        setValueByPath(parentObject, ['setup', 'sessionResumption'], sessionResumptionConfigToMldev(fromSessionResumption));
    }
    const fromInputAudioTranscription = getValueByPath(fromObject, [
        'inputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromInputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'inputAudioTranscription'], audioTranscriptionConfigToMldev());
    }
    const fromOutputAudioTranscription = getValueByPath(fromObject, [
        'outputAudioTranscription',
    ]);
    if (parentObject !== undefined && fromOutputAudioTranscription != null) {
        setValueByPath(parentObject, ['setup', 'outputAudioTranscription'], audioTranscriptionConfigToMldev());
    }
    const fromRealtimeInputConfig = getValueByPath(fromObject, [
        'realtimeInputConfig',
    ]);
    if (parentObject !== undefined && fromRealtimeInputConfig != null) {
        setValueByPath(parentObject, ['setup', 'realtimeInputConfig'], realtimeInputConfigToMldev(fromRealtimeInputConfig));
    }
    const fromContextWindowCompression = getValueByPath(fromObject, [
        'contextWindowCompression',
    ]);
    if (parentObject !== undefined && fromContextWindowCompression != null) {
        setValueByPath(parentObject, ['setup', 'contextWindowCompression'], contextWindowCompressionConfigToMldev(fromContextWindowCompression));
    }
    const fromProactivity = getValueByPath(fromObject, ['proactivity']);
    if (parentObject !== undefined && fromProactivity != null) {
        setValueByPath(parentObject, ['setup', 'proactivity'], proactivityConfigToMldev(fromProactivity));
    }
    return toObject;
}
function liveConnectConstraintsToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['setup', 'model'], tModel(apiClient, fromModel));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], liveConnectConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function createAuthTokenConfigToMldev(apiClient, fromObject, parentObject) {
    const toObject = {};
    const fromExpireTime = getValueByPath(fromObject, ['expireTime']);
    if (parentObject !== undefined && fromExpireTime != null) {
        setValueByPath(parentObject, ['expireTime'], fromExpireTime);
    }
    const fromNewSessionExpireTime = getValueByPath(fromObject, [
        'newSessionExpireTime',
    ]);
    if (parentObject !== undefined && fromNewSessionExpireTime != null) {
        setValueByPath(parentObject, ['newSessionExpireTime'], fromNewSessionExpireTime);
    }
    const fromUses = getValueByPath(fromObject, ['uses']);
    if (parentObject !== undefined && fromUses != null) {
        setValueByPath(parentObject, ['uses'], fromUses);
    }
    const fromLiveConnectConstraints = getValueByPath(fromObject, [
        'liveConnectConstraints',
    ]);
    if (parentObject !== undefined && fromLiveConnectConstraints != null) {
        setValueByPath(parentObject, ['bidiGenerateContentSetup'], liveConnectConstraintsToMldev(apiClient, fromLiveConnectConstraints));
    }
    const fromLockAdditionalFields = getValueByPath(fromObject, [
        'lockAdditionalFields',
    ]);
    if (parentObject !== undefined && fromLockAdditionalFields != null) {
        setValueByPath(parentObject, ['fieldMask'], fromLockAdditionalFields);
    }
    return toObject;
}
function createAuthTokenParametersToMldev(apiClient, fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createAuthTokenConfigToMldev(apiClient, fromConfig, toObject));
    }
    return toObject;
}
function authTokenFromMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Returns a comma-separated list of field masks from a given object.
 *
 * @param setup The object to extract field masks from.
 * @return A comma-separated list of field masks.
 */
function getFieldMasks(setup) {
    const fields = [];
    for (const key in setup) {
        if (Object.prototype.hasOwnProperty.call(setup, key)) {
            const value = setup[key];
            // 2nd layer, recursively get field masks see TODO(b/418290100)
            if (typeof value === 'object' &&
                value != null &&
                Object.keys(value).length > 0) {
                const field = Object.keys(value).map((kk) => `${key}.${kk}`);
                fields.push(...field);
            }
            else {
                fields.push(key); // 1st layer
            }
        }
    }
    return fields.join(',');
}
/**
 * Converts bidiGenerateContentSetup.
 * @param requestDict - The request dictionary.
 * @param config - The configuration object.
 * @return - The modified request dictionary.
 */
function convertBidiSetupToTokenSetup(requestDict, config) {
    // Convert bidiGenerateContentSetup from bidiGenerateContentSetup.setup.
    let setupForMaskGeneration = null;
    const bidiGenerateContentSetupValue = requestDict['bidiGenerateContentSetup'];
    if (typeof bidiGenerateContentSetupValue === 'object' &&
        bidiGenerateContentSetupValue !== null &&
        'setup' in bidiGenerateContentSetupValue) {
        // Now we know bidiGenerateContentSetupValue is an object and has a 'setup'
        // property.
        const innerSetup = bidiGenerateContentSetupValue
            .setup;
        if (typeof innerSetup === 'object' && innerSetup !== null) {
            // Valid inner setup found.
            requestDict['bidiGenerateContentSetup'] = innerSetup;
            setupForMaskGeneration = innerSetup;
        }
        else {
            // `bidiGenerateContentSetupValue.setup` is not a valid object; treat as
            // if bidiGenerateContentSetup is invalid.
            delete requestDict['bidiGenerateContentSetup'];
        }
    }
    else if (bidiGenerateContentSetupValue !== undefined) {
        // `bidiGenerateContentSetup` exists but not in the expected
        // shape {setup: {...}}; treat as invalid.
        delete requestDict['bidiGenerateContentSetup'];
    }
    const preExistingFieldMask = requestDict['fieldMask'];
    // Handle mask generation setup.
    if (setupForMaskGeneration) {
        const generatedMaskFromBidi = getFieldMasks(setupForMaskGeneration);
        if (Array.isArray(config === null || config === void 0 ? void 0 : config.lockAdditionalFields) &&
            (config === null || config === void 0 ? void 0 : config.lockAdditionalFields.length) === 0) {
            // Case 1: lockAdditionalFields is an empty array. Lock only fields from
            // bidi setup.
            if (generatedMaskFromBidi) {
                // Only assign if mask is not empty
                requestDict['fieldMask'] = generatedMaskFromBidi;
            }
            else {
                delete requestDict['fieldMask']; // If mask is empty, effectively no
                // specific fields locked by bidi
            }
        }
        else if ((config === null || config === void 0 ? void 0 : config.lockAdditionalFields) &&
            config.lockAdditionalFields.length > 0 &&
            preExistingFieldMask !== null &&
            Array.isArray(preExistingFieldMask) &&
            preExistingFieldMask.length > 0) {
            // Case 2: Lock fields from bidi setup + additional fields
            // (preExistingFieldMask).
            const generationConfigFields = [
                'temperature',
                'topK',
                'topP',
                'maxOutputTokens',
                'responseModalities',
                'seed',
                'speechConfig',
            ];
            let mappedFieldsFromPreExisting = [];
            if (preExistingFieldMask.length > 0) {
                mappedFieldsFromPreExisting = preExistingFieldMask.map((field) => {
                    if (generationConfigFields.includes(field)) {
                        return `generationConfig.${field}`;
                    }
                    return field; // Keep original field name if not in
                    // generationConfigFields
                });
            }
            const finalMaskParts = [];
            if (generatedMaskFromBidi) {
                finalMaskParts.push(generatedMaskFromBidi);
            }
            if (mappedFieldsFromPreExisting.length > 0) {
                finalMaskParts.push(...mappedFieldsFromPreExisting);
            }
            if (finalMaskParts.length > 0) {
                requestDict['fieldMask'] = finalMaskParts.join(',');
            }
            else {
                // If no fields from bidi and no valid additional fields from
                // pre-existing mask.
                delete requestDict['fieldMask'];
            }
        }
        else {
            // Case 3: "Lock all fields" (meaning, don't send a field_mask, let server
            // defaults apply or all are mutable). This is hit if:
            //  - `config.lockAdditionalFields` is undefined.
            //  - `config.lockAdditionalFields` is non-empty, BUT
            //  `preExistingFieldMask` is null, not a string, or an empty string.
            delete requestDict['fieldMask'];
        }
    }
    else {
        // No valid `bidiGenerateContentSetup` was found or extracted.
        // "Lock additional null fields if any".
        if (preExistingFieldMask !== null &&
            Array.isArray(preExistingFieldMask) &&
            preExistingFieldMask.length > 0) {
            // If there's a pre-existing field mask, it's a string, and it's not
            // empty, then we should lock all fields.
            requestDict['fieldMask'] = preExistingFieldMask.join(',');
        }
        else {
            delete requestDict['fieldMask'];
        }
    }
    return requestDict;
}
class Tokens extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
    }
    /**
     * Creates an ephemeral auth token resource.
     *
     * @experimental
     *
     * @remarks
     * Ephemeral auth tokens is only supported in the Gemini Developer API.
     * It can be used for the session connection to the Live constrained API.
     * Support in v1alpha only.
     *
     * @param params - The parameters for the create request.
     * @return The created auth token.
     *
     * @example
     * ```ts
     * const ai = new GoogleGenAI({
     *     apiKey: token.name,
     *     httpOptions: { apiVersion: 'v1alpha' }  // Support in v1alpha only.
     * });
     *
     * // Case 1: If LiveEphemeralParameters is unset, unlock LiveConnectConfig
     * // when using the token in Live API sessions. Each session connection can
     * // use a different configuration.
     * const config: CreateAuthTokenConfig = {
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 2: If LiveEphemeralParameters is set, lock all fields in
     * // LiveConnectConfig when using the token in Live API sessions. For
     * // example, changing `outputAudioTranscription` in the Live API
     * // connection will be ignored by the API.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     }
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 3: If LiveEphemeralParameters is set and lockAdditionalFields is
     * // set, lock LiveConnectConfig with set and additional fields (e.g.
     * // responseModalities, systemInstruction, temperature in this example) when
     * // using the token in Live API sessions.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     },
     *     lockAdditionalFields: ['temperature'],
     * }
     * const token = await ai.tokens.create(config);
     *
     * // Case 4: If LiveEphemeralParameters is set and lockAdditionalFields is
     * // empty array, lock LiveConnectConfig with set fields (e.g.
     * // responseModalities, systemInstruction in this example) when using the
     * // token in Live API sessions.
     * const config: CreateAuthTokenConfig =
     *     uses: 3,
     *     expireTime: '2025-05-01T00:00:00Z',
     *     LiveEphemeralParameters: {
     *        model: 'gemini-2.0-flash-001',
     *        config: {
     *           'responseModalities': ['AUDIO'],
     *           'systemInstruction': 'Always answer in English.',
     *        }
     *     },
     *     lockAdditionalFields: [],
     * }
     * const token = await ai.tokens.create(config);
     * ```
     */
    async create(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('The client.tokens.create method is only supported by the Gemini Developer API.');
        }
        else {
            const body = createAuthTokenParametersToMldev(this.apiClient, params);
            path = formatMap('auth_tokens', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            const transformedBody = convertBidiSetupToTokenSetup(body, params.config);
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(transformedBody),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json();
            });
            return response.then((apiResponse) => {
                const resp = authTokenFromMldev(apiResponse);
                return resp;
            });
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const GOOGLE_API_KEY_HEADER = 'x-goog-api-key';
const REQUIRED_VERTEX_AI_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
class NodeAuth {
    constructor(opts) {
        if (opts.apiKey !== undefined) {
            this.apiKey = opts.apiKey;
            return;
        }
        const vertexAuthOptions = buildGoogleAuthOptions(opts.googleAuthOptions);
        this.googleAuth = new GoogleAuth(vertexAuthOptions);
    }
    async addAuthHeaders(headers) {
        if (this.apiKey !== undefined) {
            if (this.apiKey.startsWith('auth_tokens/')) {
                throw new Error('Ephemeral tokens are only supported by the live API.');
            }
            this.addKeyHeader(headers);
            return;
        }
        return this.addGoogleAuthHeaders(headers);
    }
    addKeyHeader(headers) {
        if (headers.get(GOOGLE_API_KEY_HEADER) !== null) {
            return;
        }
        if (this.apiKey === undefined) {
            // This should never happen, this method is only called
            // when apiKey is set.
            throw new Error('Trying to set API key header but apiKey is not set');
        }
        headers.append(GOOGLE_API_KEY_HEADER, this.apiKey);
    }
    async addGoogleAuthHeaders(headers) {
        if (this.googleAuth === undefined) {
            // This should never happen, addGoogleAuthHeaders should only be
            // called when there is no apiKey set and in these cases googleAuth
            // is set.
            throw new Error('Trying to set google-auth headers but googleAuth is unset');
        }
        const authHeaders = await this.googleAuth.getRequestHeaders();
        for (const key in authHeaders) {
            if (headers.get(key) !== null) {
                continue;
            }
            headers.append(key, authHeaders[key]);
        }
    }
}
function buildGoogleAuthOptions(googleAuthOptions) {
    let authOptions;
    if (!googleAuthOptions) {
        authOptions = {
            scopes: [REQUIRED_VERTEX_AI_SCOPE],
        };
        return authOptions;
    }
    else {
        authOptions = googleAuthOptions;
        if (!authOptions.scopes) {
            authOptions.scopes = [REQUIRED_VERTEX_AI_SCOPE];
            return authOptions;
        }
        else if ((typeof authOptions.scopes === 'string' &&
            authOptions.scopes !== REQUIRED_VERTEX_AI_SCOPE) ||
            (Array.isArray(authOptions.scopes) &&
                authOptions.scopes.indexOf(REQUIRED_VERTEX_AI_SCOPE) < 0)) {
            throw new Error(`Invalid auth scopes. Scopes must include: ${REQUIRED_VERTEX_AI_SCOPE}`);
        }
        return authOptions;
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class NodeDownloader {
    async download(params, apiClient) {
        if (params.downloadPath) {
            const response = await downloadFile(params, apiClient);
            if (response instanceof HttpResponse) {
                const writer = createWriteStream(params.downloadPath);
                Readable.fromWeb(response.responseInternal.body).pipe(writer);
            }
            else {
                writeFile(params.downloadPath, response, { encoding: 'base64' }, (error) => {
                    if (error) {
                        throw new Error(`Failed to write file to ${params.downloadPath}: ${error}`);
                    }
                });
            }
        }
    }
}
async function downloadFile(params, apiClient) {
    var _a, _b, _c;
    const name = tFileName(params.file);
    if (name !== undefined) {
        return await apiClient.request({
            path: `files/${name}:download`,
            httpMethod: 'GET',
            queryParams: {
                'alt': 'media',
            },
            httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
            abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
        });
    }
    else if (isGeneratedVideo(params.file)) {
        const videoBytes = (_c = params.file.video) === null || _c === void 0 ? void 0 : _c.videoBytes;
        if (typeof videoBytes === 'string') {
            return videoBytes;
        }
        else {
            throw new Error('Failed to download generated video, Uri or videoBytes not found.');
        }
    }
    else if (isVideo(params.file)) {
        const videoBytes = params.file.videoBytes;
        if (typeof videoBytes === 'string') {
            return videoBytes;
        }
        else {
            throw new Error('Failed to download video, Uri or videoBytes not found.');
        }
    }
    else {
        throw new Error('Unsupported file type');
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class NodeWebSocketFactory {
    create(url, headers, callbacks) {
        return new NodeWebSocket(url, headers, callbacks);
    }
}
class NodeWebSocket {
    constructor(url, headers, callbacks) {
        this.url = url;
        this.headers = headers;
        this.callbacks = callbacks;
    }
    connect() {
        this.ws = new NodeWs.WebSocket(this.url, { headers: this.headers });
        this.ws.onopen = this.callbacks.onopen;
        this.ws.onerror = this.callbacks.onerror;
        this.ws.onclose = this.callbacks.onclose;
        this.ws.onmessage = this.callbacks.onmessage;
    }
    send(message) {
        if (this.ws === undefined) {
            throw new Error('WebSocket is not connected');
        }
        this.ws.send(message);
    }
    close() {
        if (this.ws === undefined) {
            throw new Error('WebSocket is not connected');
        }
        this.ws.close();
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// Code generated by the Google Gen AI SDK generator DO NOT EDIT.
function getTuningJobParametersToMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], fromName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listTuningJobsConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    const fromFilter = getValueByPath(fromObject, ['filter']);
    if (parentObject !== undefined && fromFilter != null) {
        setValueByPath(parentObject, ['_query', 'filter'], fromFilter);
    }
    return toObject;
}
function listTuningJobsParametersToMldev(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listTuningJobsConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function cancelTuningJobParametersToMldev(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], fromName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function tuningExampleToMldev(fromObject) {
    const toObject = {};
    const fromTextInput = getValueByPath(fromObject, ['textInput']);
    if (fromTextInput != null) {
        setValueByPath(toObject, ['textInput'], fromTextInput);
    }
    const fromOutput = getValueByPath(fromObject, ['output']);
    if (fromOutput != null) {
        setValueByPath(toObject, ['output'], fromOutput);
    }
    return toObject;
}
function tuningDatasetToMldev(fromObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['gcsUri']) !== undefined) {
        throw new Error('gcsUri parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['vertexDatasetResource']) !== undefined) {
        throw new Error('vertexDatasetResource parameter is not supported in Gemini API.');
    }
    const fromExamples = getValueByPath(fromObject, ['examples']);
    if (fromExamples != null) {
        let transformedList = fromExamples;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return tuningExampleToMldev(item);
            });
        }
        setValueByPath(toObject, ['examples', 'examples'], transformedList);
    }
    return toObject;
}
function createTuningJobConfigToMldev(fromObject, parentObject) {
    const toObject = {};
    if (getValueByPath(fromObject, ['validationDataset']) !== undefined) {
        throw new Error('validationDataset parameter is not supported in Gemini API.');
    }
    const fromTunedModelDisplayName = getValueByPath(fromObject, [
        'tunedModelDisplayName',
    ]);
    if (parentObject !== undefined && fromTunedModelDisplayName != null) {
        setValueByPath(parentObject, ['displayName'], fromTunedModelDisplayName);
    }
    if (getValueByPath(fromObject, ['description']) !== undefined) {
        throw new Error('description parameter is not supported in Gemini API.');
    }
    const fromEpochCount = getValueByPath(fromObject, ['epochCount']);
    if (parentObject !== undefined && fromEpochCount != null) {
        setValueByPath(parentObject, ['tuningTask', 'hyperparameters', 'epochCount'], fromEpochCount);
    }
    const fromLearningRateMultiplier = getValueByPath(fromObject, [
        'learningRateMultiplier',
    ]);
    if (fromLearningRateMultiplier != null) {
        setValueByPath(toObject, ['tuningTask', 'hyperparameters', 'learningRateMultiplier'], fromLearningRateMultiplier);
    }
    if (getValueByPath(fromObject, ['exportLastCheckpointOnly']) !==
        undefined) {
        throw new Error('exportLastCheckpointOnly parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['preTunedModelCheckpointId']) !==
        undefined) {
        throw new Error('preTunedModelCheckpointId parameter is not supported in Gemini API.');
    }
    if (getValueByPath(fromObject, ['adapterSize']) !== undefined) {
        throw new Error('adapterSize parameter is not supported in Gemini API.');
    }
    const fromBatchSize = getValueByPath(fromObject, ['batchSize']);
    if (parentObject !== undefined && fromBatchSize != null) {
        setValueByPath(parentObject, ['tuningTask', 'hyperparameters', 'batchSize'], fromBatchSize);
    }
    const fromLearningRate = getValueByPath(fromObject, ['learningRate']);
    if (parentObject !== undefined && fromLearningRate != null) {
        setValueByPath(parentObject, ['tuningTask', 'hyperparameters', 'learningRate'], fromLearningRate);
    }
    if (getValueByPath(fromObject, ['labels']) !== undefined) {
        throw new Error('labels parameter is not supported in Gemini API.');
    }
    return toObject;
}
function createTuningJobParametersPrivateToMldev(fromObject) {
    const toObject = {};
    const fromBaseModel = getValueByPath(fromObject, ['baseModel']);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromPreTunedModel = getValueByPath(fromObject, [
        'preTunedModel',
    ]);
    if (fromPreTunedModel != null) {
        setValueByPath(toObject, ['preTunedModel'], fromPreTunedModel);
    }
    const fromTrainingDataset = getValueByPath(fromObject, [
        'trainingDataset',
    ]);
    if (fromTrainingDataset != null) {
        setValueByPath(toObject, ['tuningTask', 'trainingData'], tuningDatasetToMldev(fromTrainingDataset));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createTuningJobConfigToMldev(fromConfig, toObject));
    }
    return toObject;
}
function getTuningJobParametersToVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], fromName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function listTuningJobsConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromPageSize = getValueByPath(fromObject, ['pageSize']);
    if (parentObject !== undefined && fromPageSize != null) {
        setValueByPath(parentObject, ['_query', 'pageSize'], fromPageSize);
    }
    const fromPageToken = getValueByPath(fromObject, ['pageToken']);
    if (parentObject !== undefined && fromPageToken != null) {
        setValueByPath(parentObject, ['_query', 'pageToken'], fromPageToken);
    }
    const fromFilter = getValueByPath(fromObject, ['filter']);
    if (parentObject !== undefined && fromFilter != null) {
        setValueByPath(parentObject, ['_query', 'filter'], fromFilter);
    }
    return toObject;
}
function listTuningJobsParametersToVertex(fromObject) {
    const toObject = {};
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], listTuningJobsConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function cancelTuningJobParametersToVertex(fromObject) {
    const toObject = {};
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['_url', 'name'], fromName);
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], fromConfig);
    }
    return toObject;
}
function tuningDatasetToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (parentObject !== undefined && fromGcsUri != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'trainingDatasetUri'], fromGcsUri);
    }
    const fromVertexDatasetResource = getValueByPath(fromObject, [
        'vertexDatasetResource',
    ]);
    if (parentObject !== undefined && fromVertexDatasetResource != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'trainingDatasetUri'], fromVertexDatasetResource);
    }
    if (getValueByPath(fromObject, ['examples']) !== undefined) {
        throw new Error('examples parameter is not supported in Vertex AI.');
    }
    return toObject;
}
function tuningValidationDatasetToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromGcsUri = getValueByPath(fromObject, ['gcsUri']);
    if (fromGcsUri != null) {
        setValueByPath(toObject, ['validationDatasetUri'], fromGcsUri);
    }
    const fromVertexDatasetResource = getValueByPath(fromObject, [
        'vertexDatasetResource',
    ]);
    if (parentObject !== undefined && fromVertexDatasetResource != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'trainingDatasetUri'], fromVertexDatasetResource);
    }
    return toObject;
}
function createTuningJobConfigToVertex(fromObject, parentObject) {
    const toObject = {};
    const fromValidationDataset = getValueByPath(fromObject, [
        'validationDataset',
    ]);
    if (parentObject !== undefined && fromValidationDataset != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec'], tuningValidationDatasetToVertex(fromValidationDataset, toObject));
    }
    const fromTunedModelDisplayName = getValueByPath(fromObject, [
        'tunedModelDisplayName',
    ]);
    if (parentObject !== undefined && fromTunedModelDisplayName != null) {
        setValueByPath(parentObject, ['tunedModelDisplayName'], fromTunedModelDisplayName);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (parentObject !== undefined && fromDescription != null) {
        setValueByPath(parentObject, ['description'], fromDescription);
    }
    const fromEpochCount = getValueByPath(fromObject, ['epochCount']);
    if (parentObject !== undefined && fromEpochCount != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'hyperParameters', 'epochCount'], fromEpochCount);
    }
    const fromLearningRateMultiplier = getValueByPath(fromObject, [
        'learningRateMultiplier',
    ]);
    if (parentObject !== undefined && fromLearningRateMultiplier != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'hyperParameters', 'learningRateMultiplier'], fromLearningRateMultiplier);
    }
    const fromExportLastCheckpointOnly = getValueByPath(fromObject, [
        'exportLastCheckpointOnly',
    ]);
    if (parentObject !== undefined && fromExportLastCheckpointOnly != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'exportLastCheckpointOnly'], fromExportLastCheckpointOnly);
    }
    const fromPreTunedModelCheckpointId = getValueByPath(fromObject, [
        'preTunedModelCheckpointId',
    ]);
    if (fromPreTunedModelCheckpointId != null) {
        setValueByPath(toObject, ['preTunedModel', 'checkpointId'], fromPreTunedModelCheckpointId);
    }
    const fromAdapterSize = getValueByPath(fromObject, ['adapterSize']);
    if (parentObject !== undefined && fromAdapterSize != null) {
        setValueByPath(parentObject, ['supervisedTuningSpec', 'hyperParameters', 'adapterSize'], fromAdapterSize);
    }
    if (getValueByPath(fromObject, ['batchSize']) !== undefined) {
        throw new Error('batchSize parameter is not supported in Vertex AI.');
    }
    if (getValueByPath(fromObject, ['learningRate']) !== undefined) {
        throw new Error('learningRate parameter is not supported in Vertex AI.');
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (parentObject !== undefined && fromLabels != null) {
        setValueByPath(parentObject, ['labels'], fromLabels);
    }
    return toObject;
}
function createTuningJobParametersPrivateToVertex(fromObject) {
    const toObject = {};
    const fromBaseModel = getValueByPath(fromObject, ['baseModel']);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromPreTunedModel = getValueByPath(fromObject, [
        'preTunedModel',
    ]);
    if (fromPreTunedModel != null) {
        setValueByPath(toObject, ['preTunedModel'], fromPreTunedModel);
    }
    const fromTrainingDataset = getValueByPath(fromObject, [
        'trainingDataset',
    ]);
    if (fromTrainingDataset != null) {
        setValueByPath(toObject, ['supervisedTuningSpec', 'trainingDatasetUri'], tuningDatasetToVertex(fromTrainingDataset, toObject));
    }
    const fromConfig = getValueByPath(fromObject, ['config']);
    if (fromConfig != null) {
        setValueByPath(toObject, ['config'], createTuningJobConfigToVertex(fromConfig, toObject));
    }
    return toObject;
}
function tunedModelFromMldev(fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['name']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromEndpoint = getValueByPath(fromObject, ['name']);
    if (fromEndpoint != null) {
        setValueByPath(toObject, ['endpoint'], fromEndpoint);
    }
    return toObject;
}
function tuningJobFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromState = getValueByPath(fromObject, ['state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], tTuningJobStatus(fromState));
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromStartTime = getValueByPath(fromObject, [
        'tuningTask',
        'startTime',
    ]);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, [
        'tuningTask',
        'completeTime',
    ]);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromBaseModel = getValueByPath(fromObject, ['baseModel']);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromTunedModel = getValueByPath(fromObject, ['_self']);
    if (fromTunedModel != null) {
        setValueByPath(toObject, ['tunedModel'], tunedModelFromMldev(fromTunedModel));
    }
    const fromCustomBaseModel = getValueByPath(fromObject, [
        'customBaseModel',
    ]);
    if (fromCustomBaseModel != null) {
        setValueByPath(toObject, ['customBaseModel'], fromCustomBaseModel);
    }
    const fromExperiment = getValueByPath(fromObject, ['experiment']);
    if (fromExperiment != null) {
        setValueByPath(toObject, ['experiment'], fromExperiment);
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (fromLabels != null) {
        setValueByPath(toObject, ['labels'], fromLabels);
    }
    const fromOutputUri = getValueByPath(fromObject, ['outputUri']);
    if (fromOutputUri != null) {
        setValueByPath(toObject, ['outputUri'], fromOutputUri);
    }
    const fromPipelineJob = getValueByPath(fromObject, ['pipelineJob']);
    if (fromPipelineJob != null) {
        setValueByPath(toObject, ['pipelineJob'], fromPipelineJob);
    }
    const fromServiceAccount = getValueByPath(fromObject, [
        'serviceAccount',
    ]);
    if (fromServiceAccount != null) {
        setValueByPath(toObject, ['serviceAccount'], fromServiceAccount);
    }
    const fromTunedModelDisplayName = getValueByPath(fromObject, [
        'tunedModelDisplayName',
    ]);
    if (fromTunedModelDisplayName != null) {
        setValueByPath(toObject, ['tunedModelDisplayName'], fromTunedModelDisplayName);
    }
    return toObject;
}
function listTuningJobsResponseFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromTuningJobs = getValueByPath(fromObject, ['tunedModels']);
    if (fromTuningJobs != null) {
        let transformedList = fromTuningJobs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return tuningJobFromMldev(item);
            });
        }
        setValueByPath(toObject, ['tuningJobs'], transformedList);
    }
    return toObject;
}
function tuningOperationFromMldev(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromMetadata = getValueByPath(fromObject, ['metadata']);
    if (fromMetadata != null) {
        setValueByPath(toObject, ['metadata'], fromMetadata);
    }
    const fromDone = getValueByPath(fromObject, ['done']);
    if (fromDone != null) {
        setValueByPath(toObject, ['done'], fromDone);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    return toObject;
}
function tunedModelCheckpointFromVertex(fromObject) {
    const toObject = {};
    const fromCheckpointId = getValueByPath(fromObject, ['checkpointId']);
    if (fromCheckpointId != null) {
        setValueByPath(toObject, ['checkpointId'], fromCheckpointId);
    }
    const fromEpoch = getValueByPath(fromObject, ['epoch']);
    if (fromEpoch != null) {
        setValueByPath(toObject, ['epoch'], fromEpoch);
    }
    const fromStep = getValueByPath(fromObject, ['step']);
    if (fromStep != null) {
        setValueByPath(toObject, ['step'], fromStep);
    }
    const fromEndpoint = getValueByPath(fromObject, ['endpoint']);
    if (fromEndpoint != null) {
        setValueByPath(toObject, ['endpoint'], fromEndpoint);
    }
    return toObject;
}
function tunedModelFromVertex(fromObject) {
    const toObject = {};
    const fromModel = getValueByPath(fromObject, ['model']);
    if (fromModel != null) {
        setValueByPath(toObject, ['model'], fromModel);
    }
    const fromEndpoint = getValueByPath(fromObject, ['endpoint']);
    if (fromEndpoint != null) {
        setValueByPath(toObject, ['endpoint'], fromEndpoint);
    }
    const fromCheckpoints = getValueByPath(fromObject, ['checkpoints']);
    if (fromCheckpoints != null) {
        let transformedList = fromCheckpoints;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return tunedModelCheckpointFromVertex(item);
            });
        }
        setValueByPath(toObject, ['checkpoints'], transformedList);
    }
    return toObject;
}
function tuningJobFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromName = getValueByPath(fromObject, ['name']);
    if (fromName != null) {
        setValueByPath(toObject, ['name'], fromName);
    }
    const fromState = getValueByPath(fromObject, ['state']);
    if (fromState != null) {
        setValueByPath(toObject, ['state'], tTuningJobStatus(fromState));
    }
    const fromCreateTime = getValueByPath(fromObject, ['createTime']);
    if (fromCreateTime != null) {
        setValueByPath(toObject, ['createTime'], fromCreateTime);
    }
    const fromStartTime = getValueByPath(fromObject, ['startTime']);
    if (fromStartTime != null) {
        setValueByPath(toObject, ['startTime'], fromStartTime);
    }
    const fromEndTime = getValueByPath(fromObject, ['endTime']);
    if (fromEndTime != null) {
        setValueByPath(toObject, ['endTime'], fromEndTime);
    }
    const fromUpdateTime = getValueByPath(fromObject, ['updateTime']);
    if (fromUpdateTime != null) {
        setValueByPath(toObject, ['updateTime'], fromUpdateTime);
    }
    const fromError = getValueByPath(fromObject, ['error']);
    if (fromError != null) {
        setValueByPath(toObject, ['error'], fromError);
    }
    const fromDescription = getValueByPath(fromObject, ['description']);
    if (fromDescription != null) {
        setValueByPath(toObject, ['description'], fromDescription);
    }
    const fromBaseModel = getValueByPath(fromObject, ['baseModel']);
    if (fromBaseModel != null) {
        setValueByPath(toObject, ['baseModel'], fromBaseModel);
    }
    const fromTunedModel = getValueByPath(fromObject, ['tunedModel']);
    if (fromTunedModel != null) {
        setValueByPath(toObject, ['tunedModel'], tunedModelFromVertex(fromTunedModel));
    }
    const fromPreTunedModel = getValueByPath(fromObject, [
        'preTunedModel',
    ]);
    if (fromPreTunedModel != null) {
        setValueByPath(toObject, ['preTunedModel'], fromPreTunedModel);
    }
    const fromSupervisedTuningSpec = getValueByPath(fromObject, [
        'supervisedTuningSpec',
    ]);
    if (fromSupervisedTuningSpec != null) {
        setValueByPath(toObject, ['supervisedTuningSpec'], fromSupervisedTuningSpec);
    }
    const fromTuningDataStats = getValueByPath(fromObject, [
        'tuningDataStats',
    ]);
    if (fromTuningDataStats != null) {
        setValueByPath(toObject, ['tuningDataStats'], fromTuningDataStats);
    }
    const fromEncryptionSpec = getValueByPath(fromObject, [
        'encryptionSpec',
    ]);
    if (fromEncryptionSpec != null) {
        setValueByPath(toObject, ['encryptionSpec'], fromEncryptionSpec);
    }
    const fromPartnerModelTuningSpec = getValueByPath(fromObject, [
        'partnerModelTuningSpec',
    ]);
    if (fromPartnerModelTuningSpec != null) {
        setValueByPath(toObject, ['partnerModelTuningSpec'], fromPartnerModelTuningSpec);
    }
    const fromCustomBaseModel = getValueByPath(fromObject, [
        'customBaseModel',
    ]);
    if (fromCustomBaseModel != null) {
        setValueByPath(toObject, ['customBaseModel'], fromCustomBaseModel);
    }
    const fromExperiment = getValueByPath(fromObject, ['experiment']);
    if (fromExperiment != null) {
        setValueByPath(toObject, ['experiment'], fromExperiment);
    }
    const fromLabels = getValueByPath(fromObject, ['labels']);
    if (fromLabels != null) {
        setValueByPath(toObject, ['labels'], fromLabels);
    }
    const fromOutputUri = getValueByPath(fromObject, ['outputUri']);
    if (fromOutputUri != null) {
        setValueByPath(toObject, ['outputUri'], fromOutputUri);
    }
    const fromPipelineJob = getValueByPath(fromObject, ['pipelineJob']);
    if (fromPipelineJob != null) {
        setValueByPath(toObject, ['pipelineJob'], fromPipelineJob);
    }
    const fromServiceAccount = getValueByPath(fromObject, [
        'serviceAccount',
    ]);
    if (fromServiceAccount != null) {
        setValueByPath(toObject, ['serviceAccount'], fromServiceAccount);
    }
    const fromTunedModelDisplayName = getValueByPath(fromObject, [
        'tunedModelDisplayName',
    ]);
    if (fromTunedModelDisplayName != null) {
        setValueByPath(toObject, ['tunedModelDisplayName'], fromTunedModelDisplayName);
    }
    return toObject;
}
function listTuningJobsResponseFromVertex(fromObject) {
    const toObject = {};
    const fromSdkHttpResponse = getValueByPath(fromObject, [
        'sdkHttpResponse',
    ]);
    if (fromSdkHttpResponse != null) {
        setValueByPath(toObject, ['sdkHttpResponse'], fromSdkHttpResponse);
    }
    const fromNextPageToken = getValueByPath(fromObject, [
        'nextPageToken',
    ]);
    if (fromNextPageToken != null) {
        setValueByPath(toObject, ['nextPageToken'], fromNextPageToken);
    }
    const fromTuningJobs = getValueByPath(fromObject, ['tuningJobs']);
    if (fromTuningJobs != null) {
        let transformedList = fromTuningJobs;
        if (Array.isArray(transformedList)) {
            transformedList = transformedList.map((item) => {
                return tuningJobFromVertex(item);
            });
        }
        setValueByPath(toObject, ['tuningJobs'], transformedList);
    }
    return toObject;
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Tunings extends BaseModule {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
        /**
         * Gets a TuningJob.
         *
         * @param name - The resource name of the tuning job.
         * @return - A TuningJob object.
         *
         * @experimental - The SDK's tuning implementation is experimental, and may
         * change in future versions.
         */
        this.get = async (params) => {
            return await this.getInternal(params);
        };
        /**
         * Lists tuning jobs.
         *
         * @param config - The configuration for the list request.
         * @return - A list of tuning jobs.
         *
         * @experimental - The SDK's tuning implementation is experimental, and may
         * change in future versions.
         */
        this.list = async (params = {}) => {
            return new Pager(PagedItem.PAGED_ITEM_TUNING_JOBS, (x) => this.listInternal(x), await this.listInternal(params), params);
        };
        /**
         * Creates a supervised fine-tuning job.
         *
         * @param params - The parameters for the tuning job.
         * @return - A TuningJob operation.
         *
         * @experimental - The SDK's tuning implementation is experimental, and may
         * change in future versions.
         */
        this.tune = async (params) => {
            if (this.apiClient.isVertexAI()) {
                if (params.baseModel.startsWith('projects/')) {
                    const preTunedModel = {
                        tunedModelName: params.baseModel,
                    };
                    const paramsPrivate = Object.assign(Object.assign({}, params), { preTunedModel: preTunedModel });
                    paramsPrivate.baseModel = undefined;
                    return await this.tuneInternal(paramsPrivate);
                }
                else {
                    const paramsPrivate = Object.assign({}, params);
                    return await this.tuneInternal(paramsPrivate);
                }
            }
            else {
                const paramsPrivate = Object.assign({}, params);
                const operation = await this.tuneMldevInternal(paramsPrivate);
                let tunedModelName = '';
                if (operation['metadata'] !== undefined &&
                    operation['metadata']['tunedModel'] !== undefined) {
                    tunedModelName = operation['metadata']['tunedModel'];
                }
                else if (operation['name'] !== undefined &&
                    operation['name'].includes('/operations/')) {
                    tunedModelName = operation['name'].split('/operations/')[0];
                }
                const tuningJob = {
                    name: tunedModelName,
                    state: JobState.JOB_STATE_QUEUED,
                };
                return tuningJob;
            }
        };
    }
    async getInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = getTuningJobParametersToVertex(params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = tuningJobFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            const body = getTuningJobParametersToMldev(params);
            path = formatMap('{name}', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = tuningJobFromMldev(apiResponse);
                return resp;
            });
        }
    }
    async listInternal(params) {
        var _a, _b, _c, _d;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = listTuningJobsParametersToVertex(params);
            path = formatMap('tuningJobs', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listTuningJobsResponseFromVertex(apiResponse);
                const typedResp = new ListTuningJobsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
        else {
            const body = listTuningJobsParametersToMldev(params);
            path = formatMap('tunedModels', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'GET',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = listTuningJobsResponseFromMldev(apiResponse);
                const typedResp = new ListTuningJobsResponse();
                Object.assign(typedResp, resp);
                return typedResp;
            });
        }
    }
    /**
     * Cancels a tuning job.
     *
     * @param params - The parameters for the cancel request.
     * @return The empty response returned by the API.
     *
     * @example
     * ```ts
     * await ai.tunings.cancel({name: '...'}); // The server-generated resource name.
     * ```
     */
    async cancel(params) {
        var _a, _b, _c, _d;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = cancelTuningJobParametersToVertex(params);
            path = formatMap('{name}:cancel', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            await this.apiClient.request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            });
        }
        else {
            const body = cancelTuningJobParametersToMldev(params);
            path = formatMap('{name}:cancel', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            await this.apiClient.request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_c = params.config) === null || _c === void 0 ? void 0 : _c.httpOptions,
                abortSignal: (_d = params.config) === null || _d === void 0 ? void 0 : _d.abortSignal,
            });
        }
    }
    async tuneInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            const body = createTuningJobParametersPrivateToVertex(params);
            path = formatMap('tuningJobs', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = tuningJobFromVertex(apiResponse);
                return resp;
            });
        }
        else {
            throw new Error('This method is only supported by the Vertex AI.');
        }
    }
    async tuneMldevInternal(params) {
        var _a, _b;
        let response;
        let path = '';
        let queryParams = {};
        if (this.apiClient.isVertexAI()) {
            throw new Error('This method is only supported by the Gemini Developer API.');
        }
        else {
            const body = createTuningJobParametersPrivateToMldev(params);
            path = formatMap('tunedModels', body['_url']);
            queryParams = body['_query'];
            delete body['config'];
            delete body['_url'];
            delete body['_query'];
            response = this.apiClient
                .request({
                path: path,
                queryParams: queryParams,
                body: JSON.stringify(body),
                httpMethod: 'POST',
                httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions,
                abortSignal: (_b = params.config) === null || _b === void 0 ? void 0 : _b.abortSignal,
            })
                .then((httpResponse) => {
                return httpResponse.json().then((jsonResponse) => {
                    const response = jsonResponse;
                    response.sdkHttpResponse = {
                        headers: httpResponse.headers,
                    };
                    return response;
                });
            });
            return response.then((apiResponse) => {
                const resp = tuningOperationFromMldev(apiResponse);
                return resp;
            });
        }
    }
}

const MAX_CHUNK_SIZE = 1024 * 1024 * 8; // bytes
const MAX_RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const DELAY_MULTIPLIER = 2;
const X_GOOG_UPLOAD_STATUS_HEADER_FIELD = 'x-goog-upload-status';
async function uploadBlob(file, uploadUrl, apiClient) {
    var _a, _b, _c;
    let fileSize = 0;
    let offset = 0;
    let response = new HttpResponse(new Response());
    let uploadCommand = 'upload';
    fileSize = file.size;
    while (offset < fileSize) {
        const chunkSize = Math.min(MAX_CHUNK_SIZE, fileSize - offset);
        const chunk = file.slice(offset, offset + chunkSize);
        if (offset + chunkSize >= fileSize) {
            uploadCommand += ', finalize';
        }
        let retryCount = 0;
        let currentDelayMs = INITIAL_RETRY_DELAY_MS;
        while (retryCount < MAX_RETRY_COUNT) {
            response = await apiClient.request({
                path: '',
                body: chunk,
                httpMethod: 'POST',
                httpOptions: {
                    apiVersion: '',
                    baseUrl: uploadUrl,
                    headers: {
                        'X-Goog-Upload-Command': uploadCommand,
                        'X-Goog-Upload-Offset': String(offset),
                        'Content-Length': String(chunkSize),
                    },
                },
            });
            if ((_a = response === null || response === void 0 ? void 0 : response.headers) === null || _a === void 0 ? void 0 : _a[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) {
                break;
            }
            retryCount++;
            await sleep(currentDelayMs);
            currentDelayMs = currentDelayMs * DELAY_MULTIPLIER;
        }
        offset += chunkSize;
        // The `x-goog-upload-status` header field can be `active`, `final` and
        //`cancelled` in resposne.
        if (((_b = response === null || response === void 0 ? void 0 : response.headers) === null || _b === void 0 ? void 0 : _b[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) !== 'active') {
            break;
        }
        // TODO(b/401391430) Investigate why the upload status is not finalized
        // even though all content has been uploaded.
        if (fileSize <= offset) {
            throw new Error('All content has been uploaded, but the upload status is not finalized.');
        }
    }
    const responseJson = (await (response === null || response === void 0 ? void 0 : response.json()));
    if (((_c = response === null || response === void 0 ? void 0 : response.headers) === null || _c === void 0 ? void 0 : _c[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) !== 'final') {
        throw new Error('Failed to upload file: Upload status is not finalized.');
    }
    return responseJson['file'];
}
async function getBlobStat(file) {
    const fileStat = { size: file.size, type: file.type };
    return fileStat;
}
function sleep(ms) {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class NodeUploader {
    async stat(file) {
        const fileStat = { size: 0, type: undefined };
        if (typeof file === 'string') {
            const originalStat = await fs.stat(file);
            fileStat.size = originalStat.size;
            fileStat.type = this.inferMimeType(file);
            return fileStat;
        }
        else {
            return await getBlobStat(file);
        }
    }
    async upload(file, uploadUrl, apiClient) {
        if (typeof file === 'string') {
            return await this.uploadFileFromPath(file, uploadUrl, apiClient);
        }
        else {
            return uploadBlob(file, uploadUrl, apiClient);
        }
    }
    /**
     * Infers the MIME type of a file based on its extension.
     *
     * @param filePath The path to the file.
     * @returns The MIME type of the file, or undefined if it cannot be inferred.
     */
    inferMimeType(filePath) {
        // Get the file extension.
        const fileExtension = filePath.slice(filePath.lastIndexOf('.') + 1);
        // Create a map of file extensions to MIME types.
        const mimeTypes = {
            'aac': 'audio/aac',
            'abw': 'application/x-abiword',
            'arc': 'application/x-freearc',
            'avi': 'video/x-msvideo',
            'azw': 'application/vnd.amazon.ebook',
            'bin': 'application/octet-stream',
            'bmp': 'image/bmp',
            'bz': 'application/x-bzip',
            'bz2': 'application/x-bzip2',
            'csh': 'application/x-csh',
            'css': 'text/css',
            'csv': 'text/csv',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'eot': 'application/vnd.ms-fontobject',
            'epub': 'application/epub+zip',
            'gz': 'application/gzip',
            'gif': 'image/gif',
            'htm': 'text/html',
            'html': 'text/html',
            'ico': 'image/vnd.microsoft.icon',
            'ics': 'text/calendar',
            'jar': 'application/java-archive',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'js': 'text/javascript',
            'json': 'application/json',
            'jsonld': 'application/ld+json',
            'kml': 'application/vnd.google-earth.kml+xml',
            'kmz': 'application/vnd.google-earth.kmz+xml',
            'mjs': 'text/javascript',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'mpeg': 'video/mpeg',
            'mpkg': 'application/vnd.apple.installer+xml',
            'odt': 'application/vnd.oasis.opendocument.text',
            'oga': 'audio/ogg',
            'ogv': 'video/ogg',
            'ogx': 'application/ogg',
            'opus': 'audio/opus',
            'otf': 'font/otf',
            'png': 'image/png',
            'pdf': 'application/pdf',
            'php': 'application/x-httpd-php',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'rar': 'application/vnd.rar',
            'rtf': 'application/rtf',
            'sh': 'application/x-sh',
            'svg': 'image/svg+xml',
            'swf': 'application/x-shockwave-flash',
            'tar': 'application/x-tar',
            'tif': 'image/tiff',
            'tiff': 'image/tiff',
            'ts': 'video/mp2t',
            'ttf': 'font/ttf',
            'txt': 'text/plain',
            'vsd': 'application/vnd.visio',
            'wav': 'audio/wav',
            'weba': 'audio/webm',
            'webm': 'video/webm',
            'webp': 'image/webp',
            'woff': 'font/woff',
            'woff2': 'font/woff2',
            'xhtml': 'application/xhtml+xml',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xml': 'application/xml',
            'xul': 'application/vnd.mozilla.xul+xml',
            'zip': 'application/zip',
            '3gp': 'video/3gpp',
            '3g2': 'video/3gpp2',
            '7z': 'application/x-7z-compressed',
        };
        // Look up the MIME type based on the file extension.
        const mimeType = mimeTypes[fileExtension.toLowerCase()];
        // Return the MIME type.
        return mimeType;
    }
    async uploadFileFromPath(file, uploadUrl, apiClient) {
        var _a, _b, _c;
        let fileSize = 0;
        let offset = 0;
        let response = new HttpResponse(new Response());
        let uploadCommand = 'upload';
        let fileHandle;
        try {
            fileHandle = await fs.open(file, 'r');
            if (!fileHandle) {
                throw new Error(`Failed to open file`);
            }
            fileSize = (await fileHandle.stat()).size;
            while (offset < fileSize) {
                const chunkSize = Math.min(MAX_CHUNK_SIZE, fileSize - offset);
                if (offset + chunkSize >= fileSize) {
                    uploadCommand += ', finalize';
                }
                const buffer = new Uint8Array(chunkSize);
                const { bytesRead: bytesRead } = await fileHandle.read(buffer, 0, chunkSize, offset);
                if (bytesRead !== chunkSize) {
                    throw new Error(`Failed to read ${chunkSize} bytes from file at offset ${offset}. bytes actually read: ${bytesRead}`);
                }
                const chunk = new Blob([buffer]);
                let retryCount = 0;
                let currentDelayMs = INITIAL_RETRY_DELAY_MS;
                while (retryCount < MAX_RETRY_COUNT) {
                    response = await apiClient.request({
                        path: '',
                        body: chunk,
                        httpMethod: 'POST',
                        httpOptions: {
                            apiVersion: '',
                            baseUrl: uploadUrl,
                            headers: {
                                'X-Goog-Upload-Command': uploadCommand,
                                'X-Goog-Upload-Offset': String(offset),
                                'Content-Length': String(bytesRead),
                            },
                        },
                    });
                    if ((_a = response === null || response === void 0 ? void 0 : response.headers) === null || _a === void 0 ? void 0 : _a[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) {
                        break;
                    }
                    retryCount++;
                    await sleep(currentDelayMs);
                    currentDelayMs = currentDelayMs * DELAY_MULTIPLIER;
                }
                offset += bytesRead;
                // The `x-goog-upload-status` header field can be `active`, `final` and
                //`cancelled` in resposne.
                if (((_b = response === null || response === void 0 ? void 0 : response.headers) === null || _b === void 0 ? void 0 : _b[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) !== 'active') {
                    break;
                }
                if (fileSize <= offset) {
                    throw new Error('All content has been uploaded, but the upload status is not finalized.');
                }
            }
            const responseJson = (await (response === null || response === void 0 ? void 0 : response.json()));
            if (((_c = response === null || response === void 0 ? void 0 : response.headers) === null || _c === void 0 ? void 0 : _c[X_GOOG_UPLOAD_STATUS_HEADER_FIELD]) !== 'final') {
                throw new Error('Failed to upload file: Upload status is not finalized.');
            }
            return responseJson['file'];
        }
        finally {
            // Ensure the file handle is always closed
            if (fileHandle) {
                await fileHandle.close();
            }
        }
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const LANGUAGE_LABEL_PREFIX = 'gl-node/';
/**
 * The Google GenAI SDK.
 *
 * @remarks
 * Provides access to the GenAI features through either the {@link
 * https://cloud.google.com/vertex-ai/docs/reference/rest | Gemini API} or
 * the {@link https://cloud.google.com/vertex-ai/docs/reference/rest | Vertex AI
 * API}.
 *
 * The {@link GoogleGenAIOptions.vertexai} value determines which of the API
 * services to use.
 *
 * When using the Gemini API, a {@link GoogleGenAIOptions.apiKey} must also be
 * set. When using Vertex AI, both {@link GoogleGenAIOptions.project} and {@link
 * GoogleGenAIOptions.location} must be set, or a {@link
 * GoogleGenAIOptions.apiKey} must be set when using Express Mode.
 *
 * Explicitly passed in values in {@link GoogleGenAIOptions} will always take
 * precedence over environment variables. If both project/location and api_key
 * exist in the environment variables, the project/location will be used.
 *
 * @example
 * Initializing the SDK for using the Gemini API:
 * ```ts
 * import {GoogleGenAI} from '@google/genai';
 * const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
 * ```
 *
 * @example
 * Initializing the SDK for using the Vertex AI API:
 * ```ts
 * import {GoogleGenAI} from '@google/genai';
 * const ai = new GoogleGenAI({
 *   vertexai: true,
 *   project: 'PROJECT_ID',
 *   location: 'PROJECT_LOCATION'
 * });
 * ```
 *
 */
class GoogleGenAI {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f;
        // Validate explicitly set initializer values.
        if ((options.project || options.location) && options.apiKey) {
            throw new Error('Project/location and API key are mutually exclusive in the client initializer.');
        }
        this.vertexai =
            (_b = (_a = options.vertexai) !== null && _a !== void 0 ? _a : getBooleanEnv('GOOGLE_GENAI_USE_VERTEXAI')) !== null && _b !== void 0 ? _b : false;
        const envApiKey = getApiKeyFromEnv();
        const envProject = getEnv('GOOGLE_CLOUD_PROJECT');
        const envLocation = getEnv('GOOGLE_CLOUD_LOCATION');
        this.apiKey = (_c = options.apiKey) !== null && _c !== void 0 ? _c : envApiKey;
        this.project = (_d = options.project) !== null && _d !== void 0 ? _d : envProject;
        this.location = (_e = options.location) !== null && _e !== void 0 ? _e : envLocation;
        // Handle when to use Vertex AI in express mode (api key)
        if (options.vertexai) {
            if ((_f = options.googleAuthOptions) === null || _f === void 0 ? void 0 : _f.credentials) {
                // Explicit credentials take precedence over implicit api_key.
                console.debug('The user provided Google Cloud credentials will take precedence' +
                    ' over the API key from the environment variable.');
                this.apiKey = undefined;
            }
            // Explicit api_key and explicit project/location already handled above.
            if ((envProject || envLocation) && options.apiKey) {
                // Explicit api_key takes precedence over implicit project/location.
                console.debug('The user provided Vertex AI API key will take precedence over' +
                    ' the project/location from the environment variables.');
                this.project = undefined;
                this.location = undefined;
            }
            else if ((options.project || options.location) && envApiKey) {
                // Explicit project/location takes precedence over implicit api_key.
                console.debug('The user provided project/location will take precedence over' +
                    ' the API key from the environment variables.');
                this.apiKey = undefined;
            }
            else if ((envProject || envLocation) && envApiKey) {
                // Implicit project/location takes precedence over implicit api_key.
                console.debug('The project/location from the environment variables will take' +
                    ' precedence over the API key from the environment variables.');
                this.apiKey = undefined;
            }
        }
        const baseUrl = getBaseUrl(options.httpOptions, options.vertexai, getEnv('GOOGLE_VERTEX_BASE_URL'), getEnv('GOOGLE_GEMINI_BASE_URL'));
        if (baseUrl) {
            if (options.httpOptions) {
                options.httpOptions.baseUrl = baseUrl;
            }
            else {
                options.httpOptions = { baseUrl: baseUrl };
            }
        }
        this.apiVersion = options.apiVersion;
        const auth = new NodeAuth({
            apiKey: this.apiKey,
            googleAuthOptions: options.googleAuthOptions,
        });
        this.apiClient = new ApiClient({
            auth: auth,
            project: this.project,
            location: this.location,
            apiVersion: this.apiVersion,
            apiKey: this.apiKey,
            vertexai: this.vertexai,
            httpOptions: options.httpOptions,
            userAgentExtra: LANGUAGE_LABEL_PREFIX + process.version,
            uploader: new NodeUploader(),
            downloader: new NodeDownloader(),
        });
        this.models = new Models(this.apiClient);
        this.live = new Live(this.apiClient, auth, new NodeWebSocketFactory());
        this.batches = new Batches(this.apiClient);
        this.chats = new Chats(this.models, this.apiClient);
        this.caches = new Caches(this.apiClient);
        this.files = new Files(this.apiClient);
        this.operations = new Operations(this.apiClient);
        this.authTokens = new Tokens(this.apiClient);
        this.tunings = new Tunings(this.apiClient);
    }
}
function getEnv(env) {
    var _a, _b, _c;
    return (_c = (_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a[env]) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : undefined;
}
function getBooleanEnv(env) {
    return stringToBoolean(getEnv(env));
}
function stringToBoolean(str) {
    if (str === undefined) {
        return false;
    }
    return str.toLowerCase() === 'true';
}
function getApiKeyFromEnv() {
    const envGoogleApiKey = getEnv('GOOGLE_API_KEY');
    const envGeminiApiKey = getEnv('GEMINI_API_KEY');
    if (envGoogleApiKey && envGeminiApiKey) {
        console.warn('Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.');
    }
    return envGoogleApiKey || envGeminiApiKey || undefined;
}

export { ActivityHandling, AdapterSize, ApiError, ApiSpec, AuthType, Batches, Behavior, BlockedReason, Caches, Chat, Chats, ComputeTokensResponse, ControlReferenceImage, ControlReferenceType, CountTokensResponse, CreateFileResponse, DeleteCachedContentResponse, DeleteFileResponse, DeleteModelResponse, DynamicRetrievalConfigMode, EditImageResponse, EditMode, EmbedContentResponse, EndSensitivity, Environment, FeatureSelectionPreference, FileSource, FileState, Files, FinishReason, FunctionCallingConfigMode, FunctionResponse, FunctionResponseScheduling, GenerateContentResponse, GenerateContentResponsePromptFeedback, GenerateContentResponseUsageMetadata, GenerateImagesResponse, GenerateVideosOperation, GenerateVideosResponse, GoogleGenAI, HarmBlockMethod, HarmBlockThreshold, HarmCategory, HarmProbability, HarmSeverity, HttpResponse, ImagePromptLanguage, InlinedEmbedContentResponse, InlinedResponse, JobState, Language, ListBatchJobsResponse, ListCachedContentsResponse, ListFilesResponse, ListModelsResponse, ListTuningJobsResponse, Live, LiveClientToolResponse, LiveMusicPlaybackControl, LiveMusicServerMessage, LiveSendToolResponseParameters, LiveServerMessage, MaskReferenceImage, MaskReferenceMode, MediaModality, MediaResolution, Modality, Mode, Models, MusicGenerationMode, Operations, Outcome, PagedItem, Pager, PersonGeneration, RawReferenceImage, RecontextImageResponse, ReplayResponse, SafetyFilterLevel, Scale, SegmentImageResponse, SegmentMode, Session, SingleEmbedContentResponse, StartSensitivity, StyleReferenceImage, SubjectReferenceImage, SubjectReferenceType, Tokens, TrafficType, TuningMode, TurnCoverage, Type, UpscaleImageResponse, UrlRetrievalStatus, VideoCompressionQuality, VideoGenerationReferenceType, createModelContent, createPartFromBase64, createPartFromCodeExecutionResult, createPartFromExecutableCode, createPartFromFunctionCall, createPartFromFunctionResponse, createPartFromText, createPartFromUri, createUserContent, mcpToTool, setDefaultBaseUrls };
//# sourceMappingURL=index.mjs.map
