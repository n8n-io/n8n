"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiFetcher = void 0;
exports.normalizeHeaders = normalizeHeaders;
exports.isJsonContentType = isJsonContentType;
exports.isXmlContentType = isXmlContentType;
exports.trimTrailingSlash = trimTrailingSlash;
const undici_1 = require("undici");
const colorette_1 = require("colorette");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore this works but some types are not working
const concat_stream_1 = __importDefault(require("concat-stream"));
const har_logs_1 = require("../utils/har-logs");
const is_empty_1 = require("./is-empty");
const config_parser_1 = require("../modules/config-parser");
const cli_output_1 = require("../modules/cli-output");
const description_parser_1 = require("../modules/description-parser");
const flow_runner_1 = require("../modules/flow-runner");
const create_mtls_client_1 = require("./mtls/create-mtls-client");
const logger_1 = require("./logger/logger");
const consts_1 = require("../consts");
const logger = logger_1.DefaultLogger.getInstance();
function normalizeHeaders(headers) {
    if (!headers) {
        return {};
    }
    const headersToReturn = {};
    for (const key in headers) {
        const lowerCaseKey = key.toLowerCase();
        // Only add the first occurrence of any header (case-insensitive)
        if (!headersToReturn[lowerCaseKey]) {
            headersToReturn[lowerCaseKey] = headers[key];
        }
    }
    return headersToReturn;
}
function isJsonContentType(contentType) {
    return /^application\/([a-z.-]+\+)?json$/.test(contentType);
}
function isXmlContentType(contentType) {
    return /^application\/([a-z.-]+\+)?xml$/.test(contentType);
}
function trimTrailingSlash(str) {
    return str.endsWith('/') ? str.slice(0, -1) : str;
}
class ApiFetcher {
    verboseLogs;
    verboseResponseLogs;
    harLogs;
    fetch;
    constructor(params) {
        this.harLogs = params.harLogs;
        this.fetch = params.fetch || undici_1.fetch;
    }
    initVerboseLogs = ({ headerParams, host, path, method, body }) => {
        this.verboseLogs = (0, cli_output_1.getVerboseLogs)({
            headerParams,
            host,
            path,
            method,
            body: JSON.stringify(body),
        });
    };
    getVerboseLogs = () => {
        return this.verboseLogs;
    };
    initVerboseResponseLogs = ({ headerParams, host, path, method, body, statusCode, responseTime, }) => {
        this.verboseResponseLogs = (0, cli_output_1.getVerboseLogs)({
            headerParams,
            host,
            path,
            method,
            body,
            statusCode,
            responseTime,
        });
    };
    getVerboseResponseLogs = () => {
        return this.verboseResponseLogs;
    };
    fetchResult = async (ctx, requestData) => {
        const { serverUrl, path, method, parameters, requestBody, openapiOperation } = requestData;
        if (!serverUrl?.url) {
            logger.error((0, colorette_1.bgRed)(` No server url provided `));
            throw new Error('No server url provided');
        }
        const headers = {};
        const searchParams = new URLSearchParams();
        const pathParams = {};
        const cookies = {};
        for (const param of parameters) {
            switch (param.in) {
                case 'header':
                    headers[param.name.toLowerCase()] = String(param.value);
                    break;
                case 'query':
                    searchParams.set(param.name, String(param.value));
                    break;
                case 'path':
                    pathParams[param.name] = String(param.value);
                    break;
                case 'cookie':
                    cookies[param.name] = String(param.value);
                    break;
            }
        }
        if (typeof requestBody === 'object' && !headers['content-type']) {
            headers['content-type'] = 'application/json';
        }
        if (Object.keys(cookies).length) {
            headers['cookie'] = Object.entries(cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
        }
        const resolvedPath = (0, config_parser_1.resolvePath)(path, pathParams) || '';
        const pathWithSearchParams = `${resolvedPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        const resolvedServerUrl = (0, config_parser_1.resolvePath)(serverUrl.url, pathParams) || '';
        const urlToFetch = `${trimTrailingSlash(resolvedServerUrl)}${pathWithSearchParams}`;
        if (urlToFetch.startsWith('/')) {
            logger.error((0, colorette_1.bgRed)(` Wrong url: ${(0, colorette_1.inverse)(urlToFetch)} `) +
                ` Did you forget to provide a correct "serverUrl"?\n`);
        }
        const contentType = headers['content-type'] || '';
        if (requestBody && !contentType) {
            logger.error((0, colorette_1.bgRed)(` Incorrect request `) +
                ` Please provide a correct "content-type" header or specify the "content-type" field in the test case itself. \n`);
        }
        let encodedBody;
        if (contentType === 'application/x-www-form-urlencoded') {
            encodedBody = new URLSearchParams(requestBody).toString();
        }
        else if (isJsonContentType(contentType || '')) {
            encodedBody = JSON.stringify(requestBody);
        }
        else if (isXmlContentType(contentType)) {
            encodedBody = requestBody;
        }
        else if (contentType.includes('multipart/form-data')) {
            // Get the form data buffer
            encodedBody = await new Promise((resolve, reject) => {
                requestBody.pipe((0, concat_stream_1.default)((data) => {
                    resolve(data);
                }));
                requestBody.on('error', reject);
            });
            // Ensure the content-type header includes the boundary
            headers['content-type'] = `multipart/form-data; boundary=${requestBody._boundary}`;
        }
        else if (contentType === 'application/octet-stream') {
            // Convert ReadStream to Blob for undici fetch
            encodedBody = await new Promise((resolve, reject) => {
                const chunks = [];
                requestBody.on('data', (chunk) => {
                    chunks.push(new Uint8Array(chunk.buffer));
                });
                requestBody.on('end', () => resolve(Buffer.concat(chunks)));
                requestBody.on('error', reject);
            });
            const fileName = requestBody.path.split('/').pop();
            headers['content-disposition'] = `attachment; filename=${fileName}`;
        }
        else {
            encodedBody = requestBody;
        }
        // Mask the secrets in the header params and the body
        const maskedHeaderParams = (0, cli_output_1.maskSecrets)(headers, ctx.secretFields || new Set());
        const maskedBody = isJsonContentType(contentType) && encodedBody
            ? (0, cli_output_1.maskSecrets)(JSON.parse(encodedBody), ctx.secretFields || new Set())
            : encodedBody;
        const maskedPathParams = (0, cli_output_1.maskSecrets)(pathWithSearchParams, ctx.secretFields || new Set());
        // Start of the verbose logs
        this.initVerboseLogs({
            headerParams: maskedHeaderParams,
            host: resolvedServerUrl,
            method: (method || 'get').toUpperCase(),
            path: maskedPathParams || '',
            body: maskedBody,
        });
        const wrappedFetch = this.harLogs ? (0, har_logs_1.withHar)(this.fetch, { har: this.harLogs }) : undici_1.fetch;
        const startTime = performance.now();
        const result = await wrappedFetch(urlToFetch, {
            method: (method || 'get').toUpperCase(),
            headers,
            ...(!(0, is_empty_1.isEmpty)(requestBody) && {
                body: encodedBody,
            }),
            redirect: 'follow',
            signal: AbortSignal.timeout(consts_1.DEFAULT_RESPECT_MAX_FETCH_TIMEOUT),
            // Required for application/octet-stream content type requests
            ...(headers['content-type'] === 'application/octet-stream' && {
                duplex: 'half',
            }),
            dispatcher: ctx.mtlsCerts ? (0, create_mtls_client_1.createMtlsClient)(urlToFetch, ctx.mtlsCerts) : undefined,
        });
        const responseTime = Math.ceil(performance.now() - startTime);
        const res = await result.text();
        const [responseContentType] = result.headers.get('content-type')?.split(';') || [
            'application/json',
        ];
        const transformedBody = res
            ? isJsonContentType(responseContentType)
                ? JSON.parse(res)
                : res
            : {};
        const responseSchema = (0, description_parser_1.getResponseSchema)({
            statusCode: result.status,
            contentType: responseContentType,
            descriptionResponses: openapiOperation?.responses,
        });
        (0, flow_runner_1.collectSecretFields)(ctx, responseSchema, transformedBody);
        const maskedResponseBody = isJsonContentType(responseContentType)
            ? (0, cli_output_1.maskSecrets)(transformedBody, ctx.secretFields || new Set())
            : transformedBody;
        this.initVerboseResponseLogs({
            body: isJsonContentType(responseContentType)
                ? JSON.stringify(maskedResponseBody)
                : maskedResponseBody,
            method: (method || 'get'),
            host: serverUrl.url,
            path: pathWithSearchParams || '',
            statusCode: result.status,
            responseTime,
        });
        return {
            body: transformedBody,
            statusCode: result.status,
            time: responseTime,
            header: Object.fromEntries(result.headers?.entries() || []),
            contentType: responseContentType,
            requestUrl: urlToFetch,
        };
    };
}
exports.ApiFetcher = ApiFetcher;
//# sourceMappingURL=api-fetcher.js.map