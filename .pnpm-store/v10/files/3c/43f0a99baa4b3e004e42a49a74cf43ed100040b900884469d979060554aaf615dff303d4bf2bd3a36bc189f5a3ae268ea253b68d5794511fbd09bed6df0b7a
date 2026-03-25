'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreRestPipeline = require('@azure/core-rest-pipeline');
var tslib = require('tslib');
var coreAuth = require('@azure/core-auth');
var coreUtil = require('@azure/core-util');
var coreHttpCompat = require('@azure/core-http-compat');
var coreClient = require('@azure/core-client');
var coreXml = require('@azure/core-xml');
var logger$1 = require('@azure/logger');
var abortController = require('@azure/abort-controller');
var crypto = require('crypto');
var coreTracing = require('@azure/core-tracing');
var stream = require('stream');
var coreLro = require('@azure/core-lro');
var events = require('events');
var fs = require('fs');
var util = require('util');
var buffer = require('buffer');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var coreHttpCompat__namespace = /*#__PURE__*/_interopNamespaceDefault(coreHttpCompat);
var coreClient__namespace = /*#__PURE__*/_interopNamespaceDefault(coreClient);
var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var util__namespace = /*#__PURE__*/_interopNamespaceDefault(util);

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The `@azure/logger` configuration for this package.
 */
const logger = logger$1.createClientLogger("storage-blob");

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The base class from which all request policies derive.
 */
class BaseRequestPolicy {
    /**
     * The main method to implement that manipulates a request/response.
     */
    constructor(
    /**
     * The next policy in the pipeline. Each policy is responsible for executing the next one if the request is to continue through the pipeline.
     */
    _nextPolicy, 
    /**
     * The options that can be passed to a given request policy.
     */
    _options) {
        this._nextPolicy = _nextPolicy;
        this._options = _options;
    }
    /**
     * Get whether or not a log with the provided log level should be logged.
     * @param logLevel - The log level of the log that will be logged.
     * @returns Whether or not a log with the provided log level should be logged.
     */
    shouldLog(logLevel) {
        return this._options.shouldLog(logLevel);
    }
    /**
     * Attempt to log the provided message to the provided logger. If no logger was provided or if
     * the log level does not meat the logger's threshold, then nothing will be logged.
     * @param logLevel - The log level of this log.
     * @param message - The message of this log.
     */
    log(logLevel, message) {
        this._options.log(logLevel, message);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const SDK_VERSION = "12.26.0";
const SERVICE_VERSION = "2025-01-05";
const BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES = 256 * 1024 * 1024; // 256MB
const BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES = 4000 * 1024 * 1024; // 4000MB
const BLOCK_BLOB_MAX_BLOCKS = 50000;
const DEFAULT_BLOCK_BUFFER_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES = 4 * 1024 * 1024; // 4MB
const DEFAULT_MAX_DOWNLOAD_RETRY_REQUESTS = 5;
const REQUEST_TIMEOUT = 100 * 1000; // In ms
/**
 * The OAuth scope to use with Azure Storage.
 */
const StorageOAuthScopes = "https://storage.azure.com/.default";
const URLConstants = {
    Parameters: {
        FORCE_BROWSER_NO_CACHE: "_",
        SIGNATURE: "sig",
        SNAPSHOT: "snapshot",
        VERSIONID: "versionid",
        TIMEOUT: "timeout",
    },
};
const HTTPURLConnection = {
    HTTP_ACCEPTED: 202,
    HTTP_CONFLICT: 409,
    HTTP_NOT_FOUND: 404,
    HTTP_PRECON_FAILED: 412,
    HTTP_RANGE_NOT_SATISFIABLE: 416,
};
const HeaderConstants = {
    AUTHORIZATION: "Authorization",
    AUTHORIZATION_SCHEME: "Bearer",
    CONTENT_ENCODING: "Content-Encoding",
    CONTENT_ID: "Content-ID",
    CONTENT_LANGUAGE: "Content-Language",
    CONTENT_LENGTH: "Content-Length",
    CONTENT_MD5: "Content-Md5",
    CONTENT_TRANSFER_ENCODING: "Content-Transfer-Encoding",
    CONTENT_TYPE: "Content-Type",
    COOKIE: "Cookie",
    DATE: "date",
    IF_MATCH: "if-match",
    IF_MODIFIED_SINCE: "if-modified-since",
    IF_NONE_MATCH: "if-none-match",
    IF_UNMODIFIED_SINCE: "if-unmodified-since",
    PREFIX_FOR_STORAGE: "x-ms-",
    RANGE: "Range",
    USER_AGENT: "User-Agent",
    X_MS_CLIENT_REQUEST_ID: "x-ms-client-request-id",
    X_MS_COPY_SOURCE: "x-ms-copy-source",
    X_MS_DATE: "x-ms-date",
    X_MS_ERROR_CODE: "x-ms-error-code",
    X_MS_VERSION: "x-ms-version",
    X_MS_CopySourceErrorCode: "x-ms-copy-source-error-code",
};
const ETagNone = "";
const ETagAny = "*";
const SIZE_1_MB = 1 * 1024 * 1024;
const BATCH_MAX_REQUEST = 256;
const BATCH_MAX_PAYLOAD_IN_BYTES = 4 * SIZE_1_MB;
const HTTP_LINE_ENDING = "\r\n";
const HTTP_VERSION_1_1 = "HTTP/1.1";
const EncryptionAlgorithmAES25 = "AES256";
const DevelopmentConnectionString = `DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;`;
const StorageBlobLoggingAllowedHeaderNames = [
    "Access-Control-Allow-Origin",
    "Cache-Control",
    "Content-Length",
    "Content-Type",
    "Date",
    "Request-Id",
    "traceparent",
    "Transfer-Encoding",
    "User-Agent",
    "x-ms-client-request-id",
    "x-ms-date",
    "x-ms-error-code",
    "x-ms-request-id",
    "x-ms-return-client-request-id",
    "x-ms-version",
    "Accept-Ranges",
    "Content-Disposition",
    "Content-Encoding",
    "Content-Language",
    "Content-MD5",
    "Content-Range",
    "ETag",
    "Last-Modified",
    "Server",
    "Vary",
    "x-ms-content-crc64",
    "x-ms-copy-action",
    "x-ms-copy-completion-time",
    "x-ms-copy-id",
    "x-ms-copy-progress",
    "x-ms-copy-status",
    "x-ms-has-immutability-policy",
    "x-ms-has-legal-hold",
    "x-ms-lease-state",
    "x-ms-lease-status",
    "x-ms-range",
    "x-ms-request-server-encrypted",
    "x-ms-server-encrypted",
    "x-ms-snapshot",
    "x-ms-source-range",
    "If-Match",
    "If-Modified-Since",
    "If-None-Match",
    "If-Unmodified-Since",
    "x-ms-access-tier",
    "x-ms-access-tier-change-time",
    "x-ms-access-tier-inferred",
    "x-ms-account-kind",
    "x-ms-archive-status",
    "x-ms-blob-append-offset",
    "x-ms-blob-cache-control",
    "x-ms-blob-committed-block-count",
    "x-ms-blob-condition-appendpos",
    "x-ms-blob-condition-maxsize",
    "x-ms-blob-content-disposition",
    "x-ms-blob-content-encoding",
    "x-ms-blob-content-language",
    "x-ms-blob-content-length",
    "x-ms-blob-content-md5",
    "x-ms-blob-content-type",
    "x-ms-blob-public-access",
    "x-ms-blob-sequence-number",
    "x-ms-blob-type",
    "x-ms-copy-destination-snapshot",
    "x-ms-creation-time",
    "x-ms-default-encryption-scope",
    "x-ms-delete-snapshots",
    "x-ms-delete-type-permanent",
    "x-ms-deny-encryption-scope-override",
    "x-ms-encryption-algorithm",
    "x-ms-if-sequence-number-eq",
    "x-ms-if-sequence-number-le",
    "x-ms-if-sequence-number-lt",
    "x-ms-incremental-copy",
    "x-ms-lease-action",
    "x-ms-lease-break-period",
    "x-ms-lease-duration",
    "x-ms-lease-id",
    "x-ms-lease-time",
    "x-ms-page-write",
    "x-ms-proposed-lease-id",
    "x-ms-range-get-content-md5",
    "x-ms-rehydrate-priority",
    "x-ms-sequence-number-action",
    "x-ms-sku-name",
    "x-ms-source-content-md5",
    "x-ms-source-if-match",
    "x-ms-source-if-modified-since",
    "x-ms-source-if-none-match",
    "x-ms-source-if-unmodified-since",
    "x-ms-tag-count",
    "x-ms-encryption-key-sha256",
    "x-ms-copy-source-error-code",
    "x-ms-copy-source-status-code",
    "x-ms-if-tags",
    "x-ms-source-if-tags",
];
const StorageBlobLoggingAllowedQueryParameters = [
    "comp",
    "maxresults",
    "rscc",
    "rscd",
    "rsce",
    "rscl",
    "rsct",
    "se",
    "si",
    "sip",
    "sp",
    "spr",
    "sr",
    "srt",
    "ss",
    "st",
    "sv",
    "include",
    "marker",
    "prefix",
    "copyid",
    "restype",
    "blockid",
    "blocklisttype",
    "delimiter",
    "prevsnapshot",
    "ske",
    "skoid",
    "sks",
    "skt",
    "sktid",
    "skv",
    "snapshot",
];
const BlobUsesCustomerSpecifiedEncryptionMsg = "BlobUsesCustomerSpecifiedEncryption";
const BlobDoesNotUseCustomerSpecifiedEncryption = "BlobDoesNotUseCustomerSpecifiedEncryption";
/// List of ports used for path style addressing.
/// Path style addressing means that storage account is put in URI's Path segment in instead of in host.
const PathStylePorts = [
    "10000",
    "10001",
    "10002",
    "10003",
    "10004",
    "10100",
    "10101",
    "10102",
    "10103",
    "10104",
    "11000",
    "11001",
    "11002",
    "11003",
    "11004",
    "11100",
    "11101",
    "11102",
    "11103",
    "11104",
];

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Reserved URL characters must be properly escaped for Storage services like Blob or File.
 *
 * ## URL encode and escape strategy for JS SDKs
 *
 * When customers pass a URL string into XxxClient classes constructor, the URL string may already be URL encoded or not.
 * But before sending to Azure Storage server, the URL must be encoded. However, it's hard for a SDK to guess whether the URL
 * string has been encoded or not. We have 2 potential strategies, and chose strategy two for the XxxClient constructors.
 *
 * ### Strategy One: Assume the customer URL string is not encoded, and always encode URL string in SDK.
 *
 * This is what legacy V2 SDK does, simple and works for most of the cases.
 * - When customer URL string is "http://account.blob.core.windows.net/con/b:",
 *   SDK will encode it to "http://account.blob.core.windows.net/con/b%3A" and send to server. A blob named "b:" will be created.
 * - When customer URL string is "http://account.blob.core.windows.net/con/b%3A",
 *   SDK will encode it to "http://account.blob.core.windows.net/con/b%253A" and send to server. A blob named "b%3A" will be created.
 *
 * But this strategy will make it not possible to create a blob with "?" in it's name. Because when customer URL string is
 * "http://account.blob.core.windows.net/con/blob?name", the "?name" will be treated as URL paramter instead of blob name.
 * If customer URL string is "http://account.blob.core.windows.net/con/blob%3Fname", a blob named "blob%3Fname" will be created.
 * V2 SDK doesn't have this issue because it doesn't allow customer pass in a full URL, it accepts a separate blob name and encodeURIComponent for it.
 * We cannot accept a SDK cannot create a blob name with "?". So we implement strategy two:
 *
 * ### Strategy Two: SDK doesn't assume the URL has been encoded or not. It will just escape the special characters.
 *
 * This is what V10 Blob Go SDK does. It accepts a URL type in Go, and call url.EscapedPath() to escape the special chars unescaped.
 * - When customer URL string is "http://account.blob.core.windows.net/con/b:",
 *   SDK will escape ":" like "http://account.blob.core.windows.net/con/b%3A" and send to server. A blob named "b:" will be created.
 * - When customer URL string is "http://account.blob.core.windows.net/con/b%3A",
 *   There is no special characters, so send "http://account.blob.core.windows.net/con/b%3A" to server. A blob named "b:" will be created.
 * - When customer URL string is "http://account.blob.core.windows.net/con/b%253A",
 *   There is no special characters, so send "http://account.blob.core.windows.net/con/b%253A" to server. A blob named "b%3A" will be created.
 *
 * This strategy gives us flexibility to create with any special characters. But "%" will be treated as a special characters, if the URL string
 * is not encoded, there shouldn't a "%" in the URL string, otherwise the URL is not a valid URL.
 * If customer needs to create a blob with "%" in it's blob name, use "%25" instead of "%". Just like above 3rd sample.
 * And following URL strings are invalid:
 * - "http://account.blob.core.windows.net/con/b%"
 * - "http://account.blob.core.windows.net/con/b%2"
 * - "http://account.blob.core.windows.net/con/b%G"
 *
 * Another special character is "?", use "%2F" to represent a blob name with "?" in a URL string.
 *
 * ### Strategy for containerName, blobName or other specific XXXName parameters in methods such as `containerClient.getBlobClient(blobName)`
 *
 * We will apply strategy one, and call encodeURIComponent for these parameters like blobName. Because what customers passes in is a plain name instead of a URL.
 *
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-shares--directories--files--and-metadata
 *
 * @param url -
 */
function escapeURLPath(url) {
    const urlParsed = new URL(url);
    let path = urlParsed.pathname;
    path = path || "/";
    path = escape(path);
    urlParsed.pathname = path;
    return urlParsed.toString();
}
function getProxyUriFromDevConnString(connectionString) {
    // Development Connection String
    // https://docs.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string#connect-to-the-emulator-account-using-the-well-known-account-name-and-key
    let proxyUri = "";
    if (connectionString.search("DevelopmentStorageProxyUri=") !== -1) {
        // CONNECTION_STRING=UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://myProxyUri
        const matchCredentials = connectionString.split(";");
        for (const element of matchCredentials) {
            if (element.trim().startsWith("DevelopmentStorageProxyUri=")) {
                proxyUri = element.trim().match("DevelopmentStorageProxyUri=(.*)")[1];
            }
        }
    }
    return proxyUri;
}
function getValueInConnString(connectionString, argument) {
    const elements = connectionString.split(";");
    for (const element of elements) {
        if (element.trim().startsWith(argument)) {
            return element.trim().match(argument + "=(.*)")[1];
        }
    }
    return "";
}
/**
 * Extracts the parts of an Azure Storage account connection string.
 *
 * @param connectionString - Connection string.
 * @returns String key value pairs of the storage account's url and credentials.
 */
function extractConnectionStringParts(connectionString) {
    let proxyUri = "";
    if (connectionString.startsWith("UseDevelopmentStorage=true")) {
        // Development connection string
        proxyUri = getProxyUriFromDevConnString(connectionString);
        connectionString = DevelopmentConnectionString;
    }
    // Matching BlobEndpoint in the Account connection string
    let blobEndpoint = getValueInConnString(connectionString, "BlobEndpoint");
    // Slicing off '/' at the end if exists
    // (The methods that use `extractConnectionStringParts` expect the url to not have `/` at the end)
    blobEndpoint = blobEndpoint.endsWith("/") ? blobEndpoint.slice(0, -1) : blobEndpoint;
    if (connectionString.search("DefaultEndpointsProtocol=") !== -1 &&
        connectionString.search("AccountKey=") !== -1) {
        // Account connection string
        let defaultEndpointsProtocol = "";
        let accountName = "";
        let accountKey = Buffer.from("accountKey", "base64");
        let endpointSuffix = "";
        // Get account name and key
        accountName = getValueInConnString(connectionString, "AccountName");
        accountKey = Buffer.from(getValueInConnString(connectionString, "AccountKey"), "base64");
        if (!blobEndpoint) {
            // BlobEndpoint is not present in the Account connection string
            // Can be obtained from `${defaultEndpointsProtocol}://${accountName}.blob.${endpointSuffix}`
            defaultEndpointsProtocol = getValueInConnString(connectionString, "DefaultEndpointsProtocol");
            const protocol = defaultEndpointsProtocol.toLowerCase();
            if (protocol !== "https" && protocol !== "http") {
                throw new Error("Invalid DefaultEndpointsProtocol in the provided Connection String. Expecting 'https' or 'http'");
            }
            endpointSuffix = getValueInConnString(connectionString, "EndpointSuffix");
            if (!endpointSuffix) {
                throw new Error("Invalid EndpointSuffix in the provided Connection String");
            }
            blobEndpoint = `${defaultEndpointsProtocol}://${accountName}.blob.${endpointSuffix}`;
        }
        if (!accountName) {
            throw new Error("Invalid AccountName in the provided Connection String");
        }
        else if (accountKey.length === 0) {
            throw new Error("Invalid AccountKey in the provided Connection String");
        }
        return {
            kind: "AccountConnString",
            url: blobEndpoint,
            accountName,
            accountKey,
            proxyUri,
        };
    }
    else {
        // SAS connection string
        let accountSas = getValueInConnString(connectionString, "SharedAccessSignature");
        let accountName = getValueInConnString(connectionString, "AccountName");
        // if accountName is empty, try to read it from BlobEndpoint
        if (!accountName) {
            accountName = getAccountNameFromUrl(blobEndpoint);
        }
        if (!blobEndpoint) {
            throw new Error("Invalid BlobEndpoint in the provided SAS Connection String");
        }
        else if (!accountSas) {
            throw new Error("Invalid SharedAccessSignature in the provided SAS Connection String");
        }
        // client constructors assume accountSas does *not* start with ?
        if (accountSas.startsWith("?")) {
            accountSas = accountSas.substring(1);
        }
        return { kind: "SASConnString", url: blobEndpoint, accountName, accountSas };
    }
}
/**
 * Internal escape method implemented Strategy Two mentioned in escapeURL() description.
 *
 * @param text -
 */
function escape(text) {
    return encodeURIComponent(text)
        .replace(/%2F/g, "/") // Don't escape for "/"
        .replace(/'/g, "%27") // Escape for "'"
        .replace(/\+/g, "%20")
        .replace(/%25/g, "%"); // Revert encoded "%"
}
/**
 * Append a string to URL path. Will remove duplicated "/" in front of the string
 * when URL path ends with a "/".
 *
 * @param url - Source URL string
 * @param name - String to be appended to URL
 * @returns An updated URL string
 */
function appendToURLPath(url, name) {
    const urlParsed = new URL(url);
    let path = urlParsed.pathname;
    path = path ? (path.endsWith("/") ? `${path}${name}` : `${path}/${name}`) : name;
    urlParsed.pathname = path;
    return urlParsed.toString();
}
/**
 * Set URL parameter name and value. If name exists in URL parameters, old value
 * will be replaced by name key. If not provide value, the parameter will be deleted.
 *
 * @param url - Source URL string
 * @param name - Parameter name
 * @param value - Parameter value
 * @returns An updated URL string
 */
function setURLParameter(url, name, value) {
    const urlParsed = new URL(url);
    const encodedName = encodeURIComponent(name);
    const encodedValue = value ? encodeURIComponent(value) : undefined;
    // mutating searchParams will change the encoding, so we have to do this ourselves
    const searchString = urlParsed.search === "" ? "?" : urlParsed.search;
    const searchPieces = [];
    for (const pair of searchString.slice(1).split("&")) {
        if (pair) {
            const [key] = pair.split("=", 2);
            if (key !== encodedName) {
                searchPieces.push(pair);
            }
        }
    }
    if (encodedValue) {
        searchPieces.push(`${encodedName}=${encodedValue}`);
    }
    urlParsed.search = searchPieces.length ? `?${searchPieces.join("&")}` : "";
    return urlParsed.toString();
}
/**
 * Get URL parameter by name.
 *
 * @param url -
 * @param name -
 */
function getURLParameter(url, name) {
    var _a;
    const urlParsed = new URL(url);
    return (_a = urlParsed.searchParams.get(name)) !== null && _a !== void 0 ? _a : undefined;
}
/**
 * Set URL host.
 *
 * @param url - Source URL string
 * @param host - New host string
 * @returns An updated URL string
 */
function setURLHost(url, host) {
    const urlParsed = new URL(url);
    urlParsed.hostname = host;
    return urlParsed.toString();
}
/**
 * Get URL path from an URL string.
 *
 * @param url - Source URL string
 */
function getURLPath(url) {
    try {
        const urlParsed = new URL(url);
        return urlParsed.pathname;
    }
    catch (e) {
        return undefined;
    }
}
/**
 * Get URL scheme from an URL string.
 *
 * @param url - Source URL string
 */
function getURLScheme(url) {
    try {
        const urlParsed = new URL(url);
        return urlParsed.protocol.endsWith(":") ? urlParsed.protocol.slice(0, -1) : urlParsed.protocol;
    }
    catch (e) {
        return undefined;
    }
}
/**
 * Get URL path and query from an URL string.
 *
 * @param url - Source URL string
 */
function getURLPathAndQuery(url) {
    const urlParsed = new URL(url);
    const pathString = urlParsed.pathname;
    if (!pathString) {
        throw new RangeError("Invalid url without valid path.");
    }
    let queryString = urlParsed.search || "";
    queryString = queryString.trim();
    if (queryString !== "") {
        queryString = queryString.startsWith("?") ? queryString : `?${queryString}`; // Ensure query string start with '?'
    }
    return `${pathString}${queryString}`;
}
/**
 * Get URL query key value pairs from an URL string.
 *
 * @param url -
 */
function getURLQueries(url) {
    let queryString = new URL(url).search;
    if (!queryString) {
        return {};
    }
    queryString = queryString.trim();
    queryString = queryString.startsWith("?") ? queryString.substring(1) : queryString;
    let querySubStrings = queryString.split("&");
    querySubStrings = querySubStrings.filter((value) => {
        const indexOfEqual = value.indexOf("=");
        const lastIndexOfEqual = value.lastIndexOf("=");
        return (indexOfEqual > 0 && indexOfEqual === lastIndexOfEqual && lastIndexOfEqual < value.length - 1);
    });
    const queries = {};
    for (const querySubString of querySubStrings) {
        const splitResults = querySubString.split("=");
        const key = splitResults[0];
        const value = splitResults[1];
        queries[key] = value;
    }
    return queries;
}
/**
 * Append a string to URL query.
 *
 * @param url - Source URL string.
 * @param queryParts - String to be appended to the URL query.
 * @returns An updated URL string.
 */
function appendToURLQuery(url, queryParts) {
    const urlParsed = new URL(url);
    let query = urlParsed.search;
    if (query) {
        query += "&" + queryParts;
    }
    else {
        query = queryParts;
    }
    urlParsed.search = query;
    return urlParsed.toString();
}
/**
 * Rounds a date off to seconds.
 *
 * @param date -
 * @param withMilliseconds - If true, YYYY-MM-DDThh:mm:ss.fffffffZ will be returned;
 *                                          If false, YYYY-MM-DDThh:mm:ssZ will be returned.
 * @returns Date string in ISO8061 format, with or without 7 milliseconds component
 */
function truncatedISO8061Date(date, withMilliseconds = true) {
    // Date.toISOString() will return like "2018-10-29T06:34:36.139Z"
    const dateString = date.toISOString();
    return withMilliseconds
        ? dateString.substring(0, dateString.length - 1) + "0000" + "Z"
        : dateString.substring(0, dateString.length - 5) + "Z";
}
/**
 * Base64 encode.
 *
 * @param content -
 */
function base64encode(content) {
    return !coreUtil.isNode ? btoa(content) : Buffer.from(content).toString("base64");
}
/**
 * Generate a 64 bytes base64 block ID string.
 *
 * @param blockIndex -
 */
function generateBlockID(blockIDPrefix, blockIndex) {
    // To generate a 64 bytes base64 string, source string should be 48
    const maxSourceStringLength = 48;
    // A blob can have a maximum of 100,000 uncommitted blocks at any given time
    const maxBlockIndexLength = 6;
    const maxAllowedBlockIDPrefixLength = maxSourceStringLength - maxBlockIndexLength;
    if (blockIDPrefix.length > maxAllowedBlockIDPrefixLength) {
        blockIDPrefix = blockIDPrefix.slice(0, maxAllowedBlockIDPrefixLength);
    }
    const res = blockIDPrefix +
        padStart(blockIndex.toString(), maxSourceStringLength - blockIDPrefix.length, "0");
    return base64encode(res);
}
/**
 * Delay specified time interval.
 *
 * @param timeInMs -
 * @param aborter -
 * @param abortError -
 */
async function delay(timeInMs, aborter, abortError) {
    return new Promise((resolve, reject) => {
        /* eslint-disable-next-line prefer-const */
        let timeout;
        const abortHandler = () => {
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
            reject(abortError);
        };
        const resolveHandler = () => {
            if (aborter !== undefined) {
                aborter.removeEventListener("abort", abortHandler);
            }
            resolve();
        };
        timeout = setTimeout(resolveHandler, timeInMs);
        if (aborter !== undefined) {
            aborter.addEventListener("abort", abortHandler);
        }
    });
}
/**
 * String.prototype.padStart()
 *
 * @param currentString -
 * @param targetLength -
 * @param padString -
 */
function padStart(currentString, targetLength, padString = " ") {
    // @ts-expect-error: TS doesn't know this code needs to run downlevel sometimes
    if (String.prototype.padStart) {
        return currentString.padStart(targetLength, padString);
    }
    padString = padString || " ";
    if (currentString.length > targetLength) {
        return currentString;
    }
    else {
        targetLength = targetLength - currentString.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
        }
        return padString.slice(0, targetLength) + currentString;
    }
}
/**
 * If two strings are equal when compared case insensitive.
 *
 * @param str1 -
 * @param str2 -
 */
function iEqual(str1, str2) {
    return str1.toLocaleLowerCase() === str2.toLocaleLowerCase();
}
/**
 * Extracts account name from the url
 * @param url - url to extract the account name from
 * @returns with the account name
 */
function getAccountNameFromUrl(url) {
    const parsedUrl = new URL(url);
    let accountName;
    try {
        if (parsedUrl.hostname.split(".")[1] === "blob") {
            // `${defaultEndpointsProtocol}://${accountName}.blob.${endpointSuffix}`;
            accountName = parsedUrl.hostname.split(".")[0];
        }
        else if (isIpEndpointStyle(parsedUrl)) {
            // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/
            // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/
            // .getPath() -> /devstoreaccount1/
            accountName = parsedUrl.pathname.split("/")[1];
        }
        else {
            // Custom domain case: "https://customdomain.com/containername/blob".
            accountName = "";
        }
        return accountName;
    }
    catch (error) {
        throw new Error("Unable to extract accountName with provided information.");
    }
}
function isIpEndpointStyle(parsedUrl) {
    const host = parsedUrl.host;
    // Case 1: Ipv6, use a broad regex to find out candidates whose host contains two ':'.
    // Case 2: localhost(:port) or host.docker.internal, use broad regex to match port part.
    // Case 3: Ipv4, use broad regex which just check if host contains Ipv4.
    // For valid host please refer to https://man7.org/linux/man-pages/man7/hostname.7.html.
    return (/^.*:.*:.*$|^(localhost|host.docker.internal)(:[0-9]+)?$|^(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])(\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])){3}(:[0-9]+)?$/.test(host) ||
        (Boolean(parsedUrl.port) && PathStylePorts.includes(parsedUrl.port)));
}
/**
 * Convert Tags to encoded string.
 *
 * @param tags -
 */
function toBlobTagsString(tags) {
    if (tags === undefined) {
        return undefined;
    }
    const tagPairs = [];
    for (const key in tags) {
        if (Object.prototype.hasOwnProperty.call(tags, key)) {
            const value = tags[key];
            tagPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return tagPairs.join("&");
}
/**
 * Convert Tags type to BlobTags.
 *
 * @param tags -
 */
function toBlobTags(tags) {
    if (tags === undefined) {
        return undefined;
    }
    const res = {
        blobTagSet: [],
    };
    for (const key in tags) {
        if (Object.prototype.hasOwnProperty.call(tags, key)) {
            const value = tags[key];
            res.blobTagSet.push({
                key,
                value,
            });
        }
    }
    return res;
}
/**
 * Covert BlobTags to Tags type.
 *
 * @param tags -
 */
function toTags(tags) {
    if (tags === undefined) {
        return undefined;
    }
    const res = {};
    for (const blobTag of tags.blobTagSet) {
        res[blobTag.key] = blobTag.value;
    }
    return res;
}
/**
 * Convert BlobQueryTextConfiguration to QuerySerialization type.
 *
 * @param textConfiguration -
 */
function toQuerySerialization(textConfiguration) {
    if (textConfiguration === undefined) {
        return undefined;
    }
    switch (textConfiguration.kind) {
        case "csv":
            return {
                format: {
                    type: "delimited",
                    delimitedTextConfiguration: {
                        columnSeparator: textConfiguration.columnSeparator || ",",
                        fieldQuote: textConfiguration.fieldQuote || "",
                        recordSeparator: textConfiguration.recordSeparator,
                        escapeChar: textConfiguration.escapeCharacter || "",
                        headersPresent: textConfiguration.hasHeaders || false,
                    },
                },
            };
        case "json":
            return {
                format: {
                    type: "json",
                    jsonTextConfiguration: {
                        recordSeparator: textConfiguration.recordSeparator,
                    },
                },
            };
        case "arrow":
            return {
                format: {
                    type: "arrow",
                    arrowConfiguration: {
                        schema: textConfiguration.schema,
                    },
                },
            };
        case "parquet":
            return {
                format: {
                    type: "parquet",
                },
            };
        default:
            throw Error("Invalid BlobQueryTextConfiguration.");
    }
}
function parseObjectReplicationRecord(objectReplicationRecord) {
    if (!objectReplicationRecord) {
        return undefined;
    }
    if ("policy-id" in objectReplicationRecord) {
        // If the dictionary contains a key with policy id, we are not required to do any parsing since
        // the policy id should already be stored in the ObjectReplicationDestinationPolicyId.
        return undefined;
    }
    const orProperties = [];
    for (const key in objectReplicationRecord) {
        const ids = key.split("_");
        const policyPrefix = "or-";
        if (ids[0].startsWith(policyPrefix)) {
            ids[0] = ids[0].substring(policyPrefix.length);
        }
        const rule = {
            ruleId: ids[1],
            replicationStatus: objectReplicationRecord[key],
        };
        const policyIndex = orProperties.findIndex((policy) => policy.policyId === ids[0]);
        if (policyIndex > -1) {
            orProperties[policyIndex].rules.push(rule);
        }
        else {
            orProperties.push({
                policyId: ids[0],
                rules: [rule],
            });
        }
    }
    return orProperties;
}
function httpAuthorizationToString(httpAuthorization) {
    return httpAuthorization ? httpAuthorization.scheme + " " + httpAuthorization.value : undefined;
}
function BlobNameToString(name) {
    if (name.encoded) {
        return decodeURIComponent(name.content);
    }
    else {
        return name.content;
    }
}
function ConvertInternalResponseOfListBlobFlat(internalResponse) {
    return Object.assign(Object.assign({}, internalResponse), { segment: {
            blobItems: internalResponse.segment.blobItems.map((blobItemInteral) => {
                const blobItem = Object.assign(Object.assign({}, blobItemInteral), { name: BlobNameToString(blobItemInteral.name) });
                return blobItem;
            }),
        } });
}
function ConvertInternalResponseOfListBlobHierarchy(internalResponse) {
    var _a;
    return Object.assign(Object.assign({}, internalResponse), { segment: {
            blobPrefixes: (_a = internalResponse.segment.blobPrefixes) === null || _a === void 0 ? void 0 : _a.map((blobPrefixInternal) => {
                const blobPrefix = Object.assign(Object.assign({}, blobPrefixInternal), { name: BlobNameToString(blobPrefixInternal.name) });
                return blobPrefix;
            }),
            blobItems: internalResponse.segment.blobItems.map((blobItemInteral) => {
                const blobItem = Object.assign(Object.assign({}, blobItemInteral), { name: BlobNameToString(blobItemInteral.name) });
                return blobItem;
            }),
        } });
}
function* ExtractPageRangeInfoItems(getPageRangesSegment) {
    let pageRange = [];
    let clearRange = [];
    if (getPageRangesSegment.pageRange)
        pageRange = getPageRangesSegment.pageRange;
    if (getPageRangesSegment.clearRange)
        clearRange = getPageRangesSegment.clearRange;
    let pageRangeIndex = 0;
    let clearRangeIndex = 0;
    while (pageRangeIndex < pageRange.length && clearRangeIndex < clearRange.length) {
        if (pageRange[pageRangeIndex].start < clearRange[clearRangeIndex].start) {
            yield {
                start: pageRange[pageRangeIndex].start,
                end: pageRange[pageRangeIndex].end,
                isClear: false,
            };
            ++pageRangeIndex;
        }
        else {
            yield {
                start: clearRange[clearRangeIndex].start,
                end: clearRange[clearRangeIndex].end,
                isClear: true,
            };
            ++clearRangeIndex;
        }
    }
    for (; pageRangeIndex < pageRange.length; ++pageRangeIndex) {
        yield {
            start: pageRange[pageRangeIndex].start,
            end: pageRange[pageRangeIndex].end,
            isClear: false,
        };
    }
    for (; clearRangeIndex < clearRange.length; ++clearRangeIndex) {
        yield {
            start: clearRange[clearRangeIndex].start,
            end: clearRange[clearRangeIndex].end,
            isClear: true,
        };
    }
}
/**
 * Escape the blobName but keep path separator ('/').
 */
function EscapePath(blobName) {
    const split = blobName.split("/");
    for (let i = 0; i < split.length; i++) {
        split[i] = encodeURIComponent(split[i]);
    }
    return split.join("/");
}
/**
 * A typesafe helper for ensuring that a given response object has
 * the original _response attached.
 * @param response - A response object from calling a client operation
 * @returns The same object, but with known _response property
 */
function assertResponse(response) {
    if (`_response` in response) {
        return response;
    }
    throw new TypeError(`Unexpected response object ${response}`);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * RetryPolicy types.
 */
exports.StorageRetryPolicyType = void 0;
(function (StorageRetryPolicyType) {
    /**
     * Exponential retry. Retry time delay grows exponentially.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["EXPONENTIAL"] = 0] = "EXPONENTIAL";
    /**
     * Linear retry. Retry time delay grows linearly.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["FIXED"] = 1] = "FIXED";
})(exports.StorageRetryPolicyType || (exports.StorageRetryPolicyType = {}));
// Default values of StorageRetryOptions
const DEFAULT_RETRY_OPTIONS$1 = {
    maxRetryDelayInMs: 120 * 1000,
    maxTries: 4,
    retryDelayInMs: 4 * 1000,
    retryPolicyType: exports.StorageRetryPolicyType.EXPONENTIAL,
    secondaryHost: "",
    tryTimeoutInMs: undefined, // Use server side default timeout strategy
};
const RETRY_ABORT_ERROR$1 = new abortController.AbortError("The operation was aborted.");
/**
 * Retry policy with exponential retry and linear retry implemented.
 */
class StorageRetryPolicy extends BaseRequestPolicy {
    /**
     * Creates an instance of RetryPolicy.
     *
     * @param nextPolicy -
     * @param options -
     * @param retryOptions -
     */
    constructor(nextPolicy, options, retryOptions = DEFAULT_RETRY_OPTIONS$1) {
        super(nextPolicy, options);
        // Initialize retry options
        this.retryOptions = {
            retryPolicyType: retryOptions.retryPolicyType
                ? retryOptions.retryPolicyType
                : DEFAULT_RETRY_OPTIONS$1.retryPolicyType,
            maxTries: retryOptions.maxTries && retryOptions.maxTries >= 1
                ? Math.floor(retryOptions.maxTries)
                : DEFAULT_RETRY_OPTIONS$1.maxTries,
            tryTimeoutInMs: retryOptions.tryTimeoutInMs && retryOptions.tryTimeoutInMs >= 0
                ? retryOptions.tryTimeoutInMs
                : DEFAULT_RETRY_OPTIONS$1.tryTimeoutInMs,
            retryDelayInMs: retryOptions.retryDelayInMs && retryOptions.retryDelayInMs >= 0
                ? Math.min(retryOptions.retryDelayInMs, retryOptions.maxRetryDelayInMs
                    ? retryOptions.maxRetryDelayInMs
                    : DEFAULT_RETRY_OPTIONS$1.maxRetryDelayInMs)
                : DEFAULT_RETRY_OPTIONS$1.retryDelayInMs,
            maxRetryDelayInMs: retryOptions.maxRetryDelayInMs && retryOptions.maxRetryDelayInMs >= 0
                ? retryOptions.maxRetryDelayInMs
                : DEFAULT_RETRY_OPTIONS$1.maxRetryDelayInMs,
            secondaryHost: retryOptions.secondaryHost
                ? retryOptions.secondaryHost
                : DEFAULT_RETRY_OPTIONS$1.secondaryHost,
        };
    }
    /**
     * Sends request.
     *
     * @param request -
     */
    async sendRequest(request) {
        return this.attemptSendRequest(request, false, 1);
    }
    /**
     * Decide and perform next retry. Won't mutate request parameter.
     *
     * @param request -
     * @param secondaryHas404 -  If attempt was against the secondary & it returned a StatusNotFound (404), then
     *                                   the resource was not found. This may be due to replication delay. So, in this
     *                                   case, we'll never try the secondary again for this operation.
     * @param attempt -           How many retries has been attempted to performed, starting from 1, which includes
     *                                   the attempt will be performed by this method call.
     */
    async attemptSendRequest(request, secondaryHas404, attempt) {
        const newRequest = request.clone();
        const isPrimaryRetry = secondaryHas404 ||
            !this.retryOptions.secondaryHost ||
            !(request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") ||
            attempt % 2 === 1;
        if (!isPrimaryRetry) {
            newRequest.url = setURLHost(newRequest.url, this.retryOptions.secondaryHost);
        }
        // Set the server-side timeout query parameter "timeout=[seconds]"
        if (this.retryOptions.tryTimeoutInMs) {
            newRequest.url = setURLParameter(newRequest.url, URLConstants.Parameters.TIMEOUT, Math.floor(this.retryOptions.tryTimeoutInMs / 1000).toString());
        }
        let response;
        try {
            logger.info(`RetryPolicy: =====> Try=${attempt} ${isPrimaryRetry ? "Primary" : "Secondary"}`);
            response = await this._nextPolicy.sendRequest(newRequest);
            if (!this.shouldRetry(isPrimaryRetry, attempt, response)) {
                return response;
            }
            secondaryHas404 = secondaryHas404 || (!isPrimaryRetry && response.status === 404);
        }
        catch (err) {
            logger.error(`RetryPolicy: Caught error, message: ${err.message}, code: ${err.code}`);
            if (!this.shouldRetry(isPrimaryRetry, attempt, response, err)) {
                throw err;
            }
        }
        await this.delay(isPrimaryRetry, attempt, request.abortSignal);
        return this.attemptSendRequest(request, secondaryHas404, ++attempt);
    }
    /**
     * Decide whether to retry according to last HTTP response and retry counters.
     *
     * @param isPrimaryRetry -
     * @param attempt -
     * @param response -
     * @param err -
     */
    shouldRetry(isPrimaryRetry, attempt, response, err) {
        if (attempt >= this.retryOptions.maxTries) {
            logger.info(`RetryPolicy: Attempt(s) ${attempt} >= maxTries ${this.retryOptions
                .maxTries}, no further try.`);
            return false;
        }
        // Handle network failures, you may need to customize the list when you implement
        // your own http client
        const retriableErrors = [
            "ETIMEDOUT",
            "ESOCKETTIMEDOUT",
            "ECONNREFUSED",
            "ECONNRESET",
            "ENOENT",
            "ENOTFOUND",
            "TIMEOUT",
            "EPIPE",
            "REQUEST_SEND_ERROR", // For default xhr based http client provided in ms-rest-js
        ];
        if (err) {
            for (const retriableError of retriableErrors) {
                if (err.name.toUpperCase().includes(retriableError) ||
                    err.message.toUpperCase().includes(retriableError) ||
                    (err.code && err.code.toString().toUpperCase() === retriableError)) {
                    logger.info(`RetryPolicy: Network error ${retriableError} found, will retry.`);
                    return true;
                }
            }
        }
        // If attempt was against the secondary & it returned a StatusNotFound (404), then
        // the resource was not found. This may be due to replication delay. So, in this
        // case, we'll never try the secondary again for this operation.
        if (response || err) {
            const statusCode = response ? response.status : err ? err.statusCode : 0;
            if (!isPrimaryRetry && statusCode === 404) {
                logger.info(`RetryPolicy: Secondary access with 404, will retry.`);
                return true;
            }
            // Server internal error or server timeout
            if (statusCode === 503 || statusCode === 500) {
                logger.info(`RetryPolicy: Will retry for status code ${statusCode}.`);
                return true;
            }
        }
        // [Copy source error code] Feature is pending on service side, skip retry on copy source error for now.
        // if (response) {
        //   // Retry select Copy Source Error Codes.
        //   if (response?.status >= 400) {
        //     const copySourceError = response.headers.get(HeaderConstants.X_MS_CopySourceErrorCode);
        //     if (copySourceError !== undefined) {
        //       switch (copySourceError) {
        //         case "InternalError":
        //         case "OperationTimedOut":
        //         case "ServerBusy":
        //           return true;
        //       }
        //     }
        //   }
        // }
        if ((err === null || err === void 0 ? void 0 : err.code) === "PARSE_ERROR" && (err === null || err === void 0 ? void 0 : err.message.startsWith(`Error "Error: Unclosed root tag`))) {
            logger.info("RetryPolicy: Incomplete XML response likely due to service timeout, will retry.");
            return true;
        }
        return false;
    }
    /**
     * Delay a calculated time between retries.
     *
     * @param isPrimaryRetry -
     * @param attempt -
     * @param abortSignal -
     */
    async delay(isPrimaryRetry, attempt, abortSignal) {
        let delayTimeInMs = 0;
        if (isPrimaryRetry) {
            switch (this.retryOptions.retryPolicyType) {
                case exports.StorageRetryPolicyType.EXPONENTIAL:
                    delayTimeInMs = Math.min((Math.pow(2, attempt - 1) - 1) * this.retryOptions.retryDelayInMs, this.retryOptions.maxRetryDelayInMs);
                    break;
                case exports.StorageRetryPolicyType.FIXED:
                    delayTimeInMs = this.retryOptions.retryDelayInMs;
                    break;
            }
        }
        else {
            delayTimeInMs = Math.random() * 1000;
        }
        logger.info(`RetryPolicy: Delay for ${delayTimeInMs}ms`);
        return delay(delayTimeInMs, abortSignal, RETRY_ABORT_ERROR$1);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * StorageRetryPolicyFactory is a factory class helping generating {@link StorageRetryPolicy} objects.
 */
class StorageRetryPolicyFactory {
    /**
     * Creates an instance of StorageRetryPolicyFactory.
     * @param retryOptions -
     */
    constructor(retryOptions) {
        this.retryOptions = retryOptions;
    }
    /**
     * Creates a StorageRetryPolicy object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new StorageRetryPolicy(nextPolicy, options, this.retryOptions);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Credential policy used to sign HTTP(S) requests before sending. This is an
 * abstract class.
 */
class CredentialPolicy extends BaseRequestPolicy {
    /**
     * Sends out request.
     *
     * @param request -
     */
    sendRequest(request) {
        return this._nextPolicy.sendRequest(this.signRequest(request));
    }
    /**
     * Child classes must implement this method with request signing. This method
     * will be executed in {@link sendRequest}.
     *
     * @param request -
     */
    signRequest(request) {
        // Child classes must override this method with request signing. This method
        // will be executed in sendRequest().
        return request;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/*
 * We need to imitate .Net culture-aware sorting, which is used in storage service.
 * Below tables contain sort-keys for en-US culture.
 */
const table_lv0 = new Uint32Array([
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x71c, 0x0, 0x71f, 0x721,
    0x723, 0x725, 0x0, 0x0, 0x0, 0x72d, 0x803, 0x0, 0x0, 0x733, 0x0, 0xd03, 0xd1a, 0xd1c, 0xd1e,
    0xd20, 0xd22, 0xd24, 0xd26, 0xd28, 0xd2a, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xe02, 0xe09, 0xe0a,
    0xe1a, 0xe21, 0xe23, 0xe25, 0xe2c, 0xe32, 0xe35, 0xe36, 0xe48, 0xe51, 0xe70, 0xe7c, 0xe7e, 0xe89,
    0xe8a, 0xe91, 0xe99, 0xe9f, 0xea2, 0xea4, 0xea6, 0xea7, 0xea9, 0x0, 0x0, 0x0, 0x743, 0x744, 0x748,
    0xe02, 0xe09, 0xe0a, 0xe1a, 0xe21, 0xe23, 0xe25, 0xe2c, 0xe32, 0xe35, 0xe36, 0xe48, 0xe51, 0xe70,
    0xe7c, 0xe7e, 0xe89, 0xe8a, 0xe91, 0xe99, 0xe9f, 0xea2, 0xea4, 0xea6, 0xea7, 0xea9, 0x0, 0x74c,
    0x0, 0x750, 0x0,
]);
const table_lv2 = new Uint32Array([
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12,
    0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12,
    0x12, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
]);
const table_lv4 = new Uint32Array([
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x8012, 0x0, 0x0, 0x0, 0x0, 0x0, 0x8212, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
]);
function compareHeader(lhs, rhs) {
    if (isLessThan(lhs, rhs))
        return -1;
    return 1;
}
function isLessThan(lhs, rhs) {
    const tables = [table_lv0, table_lv2, table_lv4];
    let curr_level = 0;
    let i = 0;
    let j = 0;
    while (curr_level < tables.length) {
        if (curr_level === tables.length - 1 && i !== j) {
            return i > j;
        }
        const weight1 = i < lhs.length ? tables[curr_level][lhs[i].charCodeAt(0)] : 0x1;
        const weight2 = j < rhs.length ? tables[curr_level][rhs[j].charCodeAt(0)] : 0x1;
        if (weight1 === 0x1 && weight2 === 0x1) {
            i = 0;
            j = 0;
            ++curr_level;
        }
        else if (weight1 === weight2) {
            ++i;
            ++j;
        }
        else if (weight1 === 0) {
            ++i;
        }
        else if (weight2 === 0) {
            ++j;
        }
        else {
            return weight1 < weight2;
        }
    }
    return false;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * StorageSharedKeyCredentialPolicy is a policy used to sign HTTP request with a shared key.
 */
class StorageSharedKeyCredentialPolicy extends CredentialPolicy {
    /**
     * Creates an instance of StorageSharedKeyCredentialPolicy.
     * @param nextPolicy -
     * @param options -
     * @param factory -
     */
    constructor(nextPolicy, options, factory) {
        super(nextPolicy, options);
        this.factory = factory;
    }
    /**
     * Signs request.
     *
     * @param request -
     */
    signRequest(request) {
        request.headers.set(HeaderConstants.X_MS_DATE, new Date().toUTCString());
        if (request.body &&
            (typeof request.body === "string" || request.body !== undefined) &&
            request.body.length > 0) {
            request.headers.set(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(request.body));
        }
        const stringToSign = [
            request.method.toUpperCase(),
            this.getHeaderValueToSign(request, HeaderConstants.CONTENT_LANGUAGE),
            this.getHeaderValueToSign(request, HeaderConstants.CONTENT_ENCODING),
            this.getHeaderValueToSign(request, HeaderConstants.CONTENT_LENGTH),
            this.getHeaderValueToSign(request, HeaderConstants.CONTENT_MD5),
            this.getHeaderValueToSign(request, HeaderConstants.CONTENT_TYPE),
            this.getHeaderValueToSign(request, HeaderConstants.DATE),
            this.getHeaderValueToSign(request, HeaderConstants.IF_MODIFIED_SINCE),
            this.getHeaderValueToSign(request, HeaderConstants.IF_MATCH),
            this.getHeaderValueToSign(request, HeaderConstants.IF_NONE_MATCH),
            this.getHeaderValueToSign(request, HeaderConstants.IF_UNMODIFIED_SINCE),
            this.getHeaderValueToSign(request, HeaderConstants.RANGE),
        ].join("\n") +
            "\n" +
            this.getCanonicalizedHeadersString(request) +
            this.getCanonicalizedResourceString(request);
        const signature = this.factory.computeHMACSHA256(stringToSign);
        request.headers.set(HeaderConstants.AUTHORIZATION, `SharedKey ${this.factory.accountName}:${signature}`);
        // console.log(`[URL]:${request.url}`);
        // console.log(`[HEADERS]:${request.headers.toString()}`);
        // console.log(`[STRING TO SIGN]:${JSON.stringify(stringToSign)}`);
        // console.log(`[KEY]: ${request.headers.get(HeaderConstants.AUTHORIZATION)}`);
        return request;
    }
    /**
     * Retrieve header value according to shared key sign rules.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
     *
     * @param request -
     * @param headerName -
     */
    getHeaderValueToSign(request, headerName) {
        const value = request.headers.get(headerName);
        if (!value) {
            return "";
        }
        // When using version 2015-02-21 or later, if Content-Length is zero, then
        // set the Content-Length part of the StringToSign to an empty string.
        // https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
        if (headerName === HeaderConstants.CONTENT_LENGTH && value === "0") {
            return "";
        }
        return value;
    }
    /**
     * To construct the CanonicalizedHeaders portion of the signature string, follow these steps:
     * 1. Retrieve all headers for the resource that begin with x-ms-, including the x-ms-date header.
     * 2. Convert each HTTP header name to lowercase.
     * 3. Sort the headers lexicographically by header name, in ascending order.
     *    Each header may appear only once in the string.
     * 4. Replace any linear whitespace in the header value with a single space.
     * 5. Trim any whitespace around the colon in the header.
     * 6. Finally, append a new-line character to each canonicalized header in the resulting list.
     *    Construct the CanonicalizedHeaders string by concatenating all headers in this list into a single string.
     *
     * @param request -
     */
    getCanonicalizedHeadersString(request) {
        let headersArray = request.headers.headersArray().filter((value) => {
            return value.name.toLowerCase().startsWith(HeaderConstants.PREFIX_FOR_STORAGE);
        });
        headersArray.sort((a, b) => {
            return compareHeader(a.name.toLowerCase(), b.name.toLowerCase());
        });
        // Remove duplicate headers
        headersArray = headersArray.filter((value, index, array) => {
            if (index > 0 && value.name.toLowerCase() === array[index - 1].name.toLowerCase()) {
                return false;
            }
            return true;
        });
        let canonicalizedHeadersStringToSign = "";
        headersArray.forEach((header) => {
            canonicalizedHeadersStringToSign += `${header.name
                .toLowerCase()
                .trimRight()}:${header.value.trimLeft()}\n`;
        });
        return canonicalizedHeadersStringToSign;
    }
    /**
     * Retrieves the webResource canonicalized resource string.
     *
     * @param request -
     */
    getCanonicalizedResourceString(request) {
        const path = getURLPath(request.url) || "/";
        let canonicalizedResourceString = "";
        canonicalizedResourceString += `/${this.factory.accountName}${path}`;
        const queries = getURLQueries(request.url);
        const lowercaseQueries = {};
        if (queries) {
            const queryKeys = [];
            for (const key in queries) {
                if (Object.prototype.hasOwnProperty.call(queries, key)) {
                    const lowercaseKey = key.toLowerCase();
                    lowercaseQueries[lowercaseKey] = queries[key];
                    queryKeys.push(lowercaseKey);
                }
            }
            queryKeys.sort();
            for (const key of queryKeys) {
                canonicalizedResourceString += `\n${key}:${decodeURIComponent(lowercaseQueries[key])}`;
            }
        }
        return canonicalizedResourceString;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Credential is an abstract class for Azure Storage HTTP requests signing. This
 * class will host an credentialPolicyCreator factory which generates CredentialPolicy.
 */
class Credential {
    /**
     * Creates a RequestPolicy object.
     *
     * @param _nextPolicy -
     * @param _options -
     */
    create(_nextPolicy, _options) {
        throw new Error("Method should be implemented in children classes.");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * StorageSharedKeyCredential for account key authorization of Azure Storage service.
 */
class StorageSharedKeyCredential extends Credential {
    /**
     * Creates an instance of StorageSharedKeyCredential.
     * @param accountName -
     * @param accountKey -
     */
    constructor(accountName, accountKey) {
        super();
        this.accountName = accountName;
        this.accountKey = Buffer.from(accountKey, "base64");
    }
    /**
     * Creates a StorageSharedKeyCredentialPolicy object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new StorageSharedKeyCredentialPolicy(nextPolicy, options, this);
    }
    /**
     * Generates a hash signature for an HTTP request or for a SAS.
     *
     * @param stringToSign -
     */
    computeHMACSHA256(stringToSign) {
        return crypto.createHmac("sha256", this.accountKey).update(stringToSign, "utf8").digest("base64");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * AnonymousCredentialPolicy is used with HTTP(S) requests that read public resources
 * or for use with Shared Access Signatures (SAS).
 */
class AnonymousCredentialPolicy extends CredentialPolicy {
    /**
     * Creates an instance of AnonymousCredentialPolicy.
     * @param nextPolicy -
     * @param options -
     */
    // The base class has a protected constructor. Adding a public one to enable constructing of this class.
    /* eslint-disable-next-line @typescript-eslint/no-useless-constructor*/
    constructor(nextPolicy, options) {
        super(nextPolicy, options);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * AnonymousCredential provides a credentialPolicyCreator member used to create
 * AnonymousCredentialPolicy objects. AnonymousCredentialPolicy is used with
 * HTTP(S) requests that read public resources or for use with Shared Access
 * Signatures (SAS).
 */
class AnonymousCredential extends Credential {
    /**
     * Creates an {@link AnonymousCredentialPolicy} object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new AnonymousCredentialPolicy(nextPolicy, options);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
let _defaultHttpClient;
function getCachedDefaultHttpClient() {
    if (!_defaultHttpClient) {
        _defaultHttpClient = coreRestPipeline.createDefaultHttpClient();
    }
    return _defaultHttpClient;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The programmatic identifier of the StorageBrowserPolicy.
 */
const storageBrowserPolicyName = "storageBrowserPolicy";
/**
 * storageBrowserPolicy is a policy used to prevent browsers from caching requests
 * and to remove cookies and explicit content-length headers.
 */
function storageBrowserPolicy() {
    return {
        name: storageBrowserPolicyName,
        async sendRequest(request, next) {
            if (coreUtil.isNode) {
                return next(request);
            }
            if (request.method === "GET" || request.method === "HEAD") {
                request.url = setURLParameter(request.url, URLConstants.Parameters.FORCE_BROWSER_NO_CACHE, new Date().getTime().toString());
            }
            request.headers.delete(HeaderConstants.COOKIE);
            // According to XHR standards, content-length should be fully controlled by browsers
            request.headers.delete(HeaderConstants.CONTENT_LENGTH);
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Name of the {@link storageRetryPolicy}
 */
const storageRetryPolicyName = "storageRetryPolicy";
/**
 * RetryPolicy types.
 */
var StorageRetryPolicyType;
(function (StorageRetryPolicyType) {
    /**
     * Exponential retry. Retry time delay grows exponentially.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["EXPONENTIAL"] = 0] = "EXPONENTIAL";
    /**
     * Linear retry. Retry time delay grows linearly.
     */
    StorageRetryPolicyType[StorageRetryPolicyType["FIXED"] = 1] = "FIXED";
})(StorageRetryPolicyType || (StorageRetryPolicyType = {}));
// Default values of StorageRetryOptions
const DEFAULT_RETRY_OPTIONS = {
    maxRetryDelayInMs: 120 * 1000,
    maxTries: 4,
    retryDelayInMs: 4 * 1000,
    retryPolicyType: StorageRetryPolicyType.EXPONENTIAL,
    secondaryHost: "",
    tryTimeoutInMs: undefined, // Use server side default timeout strategy
};
const retriableErrors = [
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOENT",
    "ENOTFOUND",
    "TIMEOUT",
    "EPIPE",
    "REQUEST_SEND_ERROR",
];
const RETRY_ABORT_ERROR = new abortController.AbortError("The operation was aborted.");
/**
 * Retry policy with exponential retry and linear retry implemented.
 */
function storageRetryPolicy(options = {}) {
    var _a, _b, _c, _d, _e, _f;
    const retryPolicyType = (_a = options.retryPolicyType) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_OPTIONS.retryPolicyType;
    const maxTries = (_b = options.maxTries) !== null && _b !== void 0 ? _b : DEFAULT_RETRY_OPTIONS.maxTries;
    const retryDelayInMs = (_c = options.retryDelayInMs) !== null && _c !== void 0 ? _c : DEFAULT_RETRY_OPTIONS.retryDelayInMs;
    const maxRetryDelayInMs = (_d = options.maxRetryDelayInMs) !== null && _d !== void 0 ? _d : DEFAULT_RETRY_OPTIONS.maxRetryDelayInMs;
    const secondaryHost = (_e = options.secondaryHost) !== null && _e !== void 0 ? _e : DEFAULT_RETRY_OPTIONS.secondaryHost;
    const tryTimeoutInMs = (_f = options.tryTimeoutInMs) !== null && _f !== void 0 ? _f : DEFAULT_RETRY_OPTIONS.tryTimeoutInMs;
    function shouldRetry({ isPrimaryRetry, attempt, response, error, }) {
        var _a, _b;
        if (attempt >= maxTries) {
            logger.info(`RetryPolicy: Attempt(s) ${attempt} >= maxTries ${maxTries}, no further try.`);
            return false;
        }
        if (error) {
            for (const retriableError of retriableErrors) {
                if (error.name.toUpperCase().includes(retriableError) ||
                    error.message.toUpperCase().includes(retriableError) ||
                    (error.code && error.code.toString().toUpperCase() === retriableError)) {
                    logger.info(`RetryPolicy: Network error ${retriableError} found, will retry.`);
                    return true;
                }
            }
            if ((error === null || error === void 0 ? void 0 : error.code) === "PARSE_ERROR" &&
                (error === null || error === void 0 ? void 0 : error.message.startsWith(`Error "Error: Unclosed root tag`))) {
                logger.info("RetryPolicy: Incomplete XML response likely due to service timeout, will retry.");
                return true;
            }
        }
        // If attempt was against the secondary & it returned a StatusNotFound (404), then
        // the resource was not found. This may be due to replication delay. So, in this
        // case, we'll never try the secondary again for this operation.
        if (response || error) {
            const statusCode = (_b = (_a = response === null || response === void 0 ? void 0 : response.status) !== null && _a !== void 0 ? _a : error === null || error === void 0 ? void 0 : error.statusCode) !== null && _b !== void 0 ? _b : 0;
            if (!isPrimaryRetry && statusCode === 404) {
                logger.info(`RetryPolicy: Secondary access with 404, will retry.`);
                return true;
            }
            // Server internal error or server timeout
            if (statusCode === 503 || statusCode === 500) {
                logger.info(`RetryPolicy: Will retry for status code ${statusCode}.`);
                return true;
            }
        }
        // [Copy source error code] Feature is pending on service side, skip retry on copy source error for now.
        // if (response) {
        //   // Retry select Copy Source Error Codes.
        //   if (response?.status >= 400) {
        //     const copySourceError = response.headers.get(HeaderConstants.X_MS_CopySourceErrorCode);
        //     if (copySourceError !== undefined) {
        //       switch (copySourceError) {
        //         case "InternalError":
        //         case "OperationTimedOut":
        //         case "ServerBusy":
        //           return true;
        //       }
        //     }
        //   }
        // }
        return false;
    }
    function calculateDelay(isPrimaryRetry, attempt) {
        let delayTimeInMs = 0;
        if (isPrimaryRetry) {
            switch (retryPolicyType) {
                case StorageRetryPolicyType.EXPONENTIAL:
                    delayTimeInMs = Math.min((Math.pow(2, attempt - 1) - 1) * retryDelayInMs, maxRetryDelayInMs);
                    break;
                case StorageRetryPolicyType.FIXED:
                    delayTimeInMs = retryDelayInMs;
                    break;
            }
        }
        else {
            delayTimeInMs = Math.random() * 1000;
        }
        logger.info(`RetryPolicy: Delay for ${delayTimeInMs}ms`);
        return delayTimeInMs;
    }
    return {
        name: storageRetryPolicyName,
        async sendRequest(request, next) {
            // Set the server-side timeout query parameter "timeout=[seconds]"
            if (tryTimeoutInMs) {
                request.url = setURLParameter(request.url, URLConstants.Parameters.TIMEOUT, String(Math.floor(tryTimeoutInMs / 1000)));
            }
            const primaryUrl = request.url;
            const secondaryUrl = secondaryHost ? setURLHost(request.url, secondaryHost) : undefined;
            let secondaryHas404 = false;
            let attempt = 1;
            let retryAgain = true;
            let response;
            let error;
            while (retryAgain) {
                const isPrimaryRetry = secondaryHas404 ||
                    !secondaryUrl ||
                    !["GET", "HEAD", "OPTIONS"].includes(request.method) ||
                    attempt % 2 === 1;
                request.url = isPrimaryRetry ? primaryUrl : secondaryUrl;
                response = undefined;
                error = undefined;
                try {
                    logger.info(`RetryPolicy: =====> Try=${attempt} ${isPrimaryRetry ? "Primary" : "Secondary"}`);
                    response = await next(request);
                    secondaryHas404 = secondaryHas404 || (!isPrimaryRetry && response.status === 404);
                }
                catch (e) {
                    if (coreRestPipeline.isRestError(e)) {
                        logger.error(`RetryPolicy: Caught error, message: ${e.message}, code: ${e.code}`);
                        error = e;
                    }
                    else {
                        logger.error(`RetryPolicy: Caught error, message: ${coreUtil.getErrorMessage(e)}`);
                        throw e;
                    }
                }
                retryAgain = shouldRetry({ isPrimaryRetry, attempt, response, error });
                if (retryAgain) {
                    await delay(calculateDelay(isPrimaryRetry, attempt), request.abortSignal, RETRY_ABORT_ERROR);
                }
                attempt++;
            }
            if (response) {
                return response;
            }
            throw error !== null && error !== void 0 ? error : new coreRestPipeline.RestError("RetryPolicy failed without known error.");
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The programmatic identifier of the storageSharedKeyCredentialPolicy.
 */
const storageSharedKeyCredentialPolicyName = "storageSharedKeyCredentialPolicy";
/**
 * storageSharedKeyCredentialPolicy handles signing requests using storage account keys.
 */
function storageSharedKeyCredentialPolicy(options) {
    function signRequest(request) {
        request.headers.set(HeaderConstants.X_MS_DATE, new Date().toUTCString());
        if (request.body &&
            (typeof request.body === "string" || Buffer.isBuffer(request.body)) &&
            request.body.length > 0) {
            request.headers.set(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(request.body));
        }
        const stringToSign = [
            request.method.toUpperCase(),
            getHeaderValueToSign(request, HeaderConstants.CONTENT_LANGUAGE),
            getHeaderValueToSign(request, HeaderConstants.CONTENT_ENCODING),
            getHeaderValueToSign(request, HeaderConstants.CONTENT_LENGTH),
            getHeaderValueToSign(request, HeaderConstants.CONTENT_MD5),
            getHeaderValueToSign(request, HeaderConstants.CONTENT_TYPE),
            getHeaderValueToSign(request, HeaderConstants.DATE),
            getHeaderValueToSign(request, HeaderConstants.IF_MODIFIED_SINCE),
            getHeaderValueToSign(request, HeaderConstants.IF_MATCH),
            getHeaderValueToSign(request, HeaderConstants.IF_NONE_MATCH),
            getHeaderValueToSign(request, HeaderConstants.IF_UNMODIFIED_SINCE),
            getHeaderValueToSign(request, HeaderConstants.RANGE),
        ].join("\n") +
            "\n" +
            getCanonicalizedHeadersString(request) +
            getCanonicalizedResourceString(request);
        const signature = crypto.createHmac("sha256", options.accountKey)
            .update(stringToSign, "utf8")
            .digest("base64");
        request.headers.set(HeaderConstants.AUTHORIZATION, `SharedKey ${options.accountName}:${signature}`);
        // console.log(`[URL]:${request.url}`);
        // console.log(`[HEADERS]:${request.headers.toString()}`);
        // console.log(`[STRING TO SIGN]:${JSON.stringify(stringToSign)}`);
        // console.log(`[KEY]: ${request.headers.get(HeaderConstants.AUTHORIZATION)}`);
    }
    /**
     * Retrieve header value according to shared key sign rules.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
     */
    function getHeaderValueToSign(request, headerName) {
        const value = request.headers.get(headerName);
        if (!value) {
            return "";
        }
        // When using version 2015-02-21 or later, if Content-Length is zero, then
        // set the Content-Length part of the StringToSign to an empty string.
        // https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
        if (headerName === HeaderConstants.CONTENT_LENGTH && value === "0") {
            return "";
        }
        return value;
    }
    /**
     * To construct the CanonicalizedHeaders portion of the signature string, follow these steps:
     * 1. Retrieve all headers for the resource that begin with x-ms-, including the x-ms-date header.
     * 2. Convert each HTTP header name to lowercase.
     * 3. Sort the headers lexicographically by header name, in ascending order.
     *    Each header may appear only once in the string.
     * 4. Replace any linear whitespace in the header value with a single space.
     * 5. Trim any whitespace around the colon in the header.
     * 6. Finally, append a new-line character to each canonicalized header in the resulting list.
     *    Construct the CanonicalizedHeaders string by concatenating all headers in this list into a single string.
     *
     */
    function getCanonicalizedHeadersString(request) {
        let headersArray = [];
        for (const [name, value] of request.headers) {
            if (name.toLowerCase().startsWith(HeaderConstants.PREFIX_FOR_STORAGE)) {
                headersArray.push({ name, value });
            }
        }
        headersArray.sort((a, b) => {
            return compareHeader(a.name.toLowerCase(), b.name.toLowerCase());
        });
        // Remove duplicate headers
        headersArray = headersArray.filter((value, index, array) => {
            if (index > 0 && value.name.toLowerCase() === array[index - 1].name.toLowerCase()) {
                return false;
            }
            return true;
        });
        let canonicalizedHeadersStringToSign = "";
        headersArray.forEach((header) => {
            canonicalizedHeadersStringToSign += `${header.name
                .toLowerCase()
                .trimRight()}:${header.value.trimLeft()}\n`;
        });
        return canonicalizedHeadersStringToSign;
    }
    function getCanonicalizedResourceString(request) {
        const path = getURLPath(request.url) || "/";
        let canonicalizedResourceString = "";
        canonicalizedResourceString += `/${options.accountName}${path}`;
        const queries = getURLQueries(request.url);
        const lowercaseQueries = {};
        if (queries) {
            const queryKeys = [];
            for (const key in queries) {
                if (Object.prototype.hasOwnProperty.call(queries, key)) {
                    const lowercaseKey = key.toLowerCase();
                    lowercaseQueries[lowercaseKey] = queries[key];
                    queryKeys.push(lowercaseKey);
                }
            }
            queryKeys.sort();
            for (const key of queryKeys) {
                canonicalizedResourceString += `\n${key}:${decodeURIComponent(lowercaseQueries[key])}`;
            }
        }
        return canonicalizedResourceString;
    }
    return {
        name: storageSharedKeyCredentialPolicyName,
        async sendRequest(request, next) {
            signRequest(request);
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * StorageBrowserPolicy will handle differences between Node.js and browser runtime, including:
 *
 * 1. Browsers cache GET/HEAD requests by adding conditional headers such as 'IF_MODIFIED_SINCE'.
 * StorageBrowserPolicy is a policy used to add a timestamp query to GET/HEAD request URL
 * thus avoid the browser cache.
 *
 * 2. Remove cookie header for security
 *
 * 3. Remove content-length header to avoid browsers warning
 */
class StorageBrowserPolicy extends BaseRequestPolicy {
    /**
     * Creates an instance of StorageBrowserPolicy.
     * @param nextPolicy -
     * @param options -
     */
    // The base class has a protected constructor. Adding a public one to enable constructing of this class.
    /* eslint-disable-next-line @typescript-eslint/no-useless-constructor*/
    constructor(nextPolicy, options) {
        super(nextPolicy, options);
    }
    /**
     * Sends out request.
     *
     * @param request -
     */
    async sendRequest(request) {
        if (coreUtil.isNode) {
            return this._nextPolicy.sendRequest(request);
        }
        if (request.method.toUpperCase() === "GET" || request.method.toUpperCase() === "HEAD") {
            request.url = setURLParameter(request.url, URLConstants.Parameters.FORCE_BROWSER_NO_CACHE, new Date().getTime().toString());
        }
        request.headers.remove(HeaderConstants.COOKIE);
        // According to XHR standards, content-length should be fully controlled by browsers
        request.headers.remove(HeaderConstants.CONTENT_LENGTH);
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * StorageBrowserPolicyFactory is a factory class helping generating StorageBrowserPolicy objects.
 */
class StorageBrowserPolicyFactory {
    /**
     * Creates a StorageBrowserPolicyFactory object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new StorageBrowserPolicy(nextPolicy, options);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The programmatic identifier of the storageCorrectContentLengthPolicy.
 */
const storageCorrectContentLengthPolicyName = "StorageCorrectContentLengthPolicy";
/**
 * storageCorrectContentLengthPolicy to correctly set Content-Length header with request body length.
 */
function storageCorrectContentLengthPolicy() {
    function correctContentLength(request) {
        if (request.body &&
            (typeof request.body === "string" || Buffer.isBuffer(request.body)) &&
            request.body.length > 0) {
            request.headers.set(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(request.body));
        }
    }
    return {
        name: storageCorrectContentLengthPolicyName,
        async sendRequest(request, next) {
            correctContentLength(request);
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A helper to decide if a given argument satisfies the Pipeline contract
 * @param pipeline - An argument that may be a Pipeline
 * @returns true when the argument satisfies the Pipeline contract
 */
function isPipelineLike(pipeline) {
    if (!pipeline || typeof pipeline !== "object") {
        return false;
    }
    const castPipeline = pipeline;
    return (Array.isArray(castPipeline.factories) &&
        typeof castPipeline.options === "object" &&
        typeof castPipeline.toServiceClientOptions === "function");
}
/**
 * A Pipeline class containing HTTP request policies.
 * You can create a default Pipeline by calling {@link newPipeline}.
 * Or you can create a Pipeline with your own policies by the constructor of Pipeline.
 *
 * Refer to {@link newPipeline} and provided policies before implementing your
 * customized Pipeline.
 */
class Pipeline {
    /**
     * Creates an instance of Pipeline. Customize HTTPClient by implementing IHttpClient interface.
     *
     * @param factories -
     * @param options -
     */
    constructor(factories, options = {}) {
        this.factories = factories;
        this.options = options;
    }
    /**
     * Transfer Pipeline object to ServiceClientOptions object which is required by
     * ServiceClient constructor.
     *
     * @returns The ServiceClientOptions object from this Pipeline.
     */
    toServiceClientOptions() {
        return {
            httpClient: this.options.httpClient,
            requestPolicyFactories: this.factories,
        };
    }
}
/**
 * Creates a new Pipeline object with Credential provided.
 *
 * @param credential -  Such as AnonymousCredential, StorageSharedKeyCredential or any credential from the `@azure/identity` package to authenticate requests to the service. You can also provide an object that implements the TokenCredential interface. If not specified, AnonymousCredential is used.
 * @param pipelineOptions - Optional. Options.
 * @returns A new Pipeline object.
 */
function newPipeline(credential, pipelineOptions = {}) {
    if (!credential) {
        credential = new AnonymousCredential();
    }
    const pipeline = new Pipeline([], pipelineOptions);
    pipeline._credential = credential;
    return pipeline;
}
function processDownlevelPipeline(pipeline) {
    const knownFactoryFunctions = [
        isAnonymousCredential,
        isStorageSharedKeyCredential,
        isCoreHttpBearerTokenFactory,
        isStorageBrowserPolicyFactory,
        isStorageRetryPolicyFactory,
        isStorageTelemetryPolicyFactory,
        isCoreHttpPolicyFactory,
    ];
    if (pipeline.factories.length) {
        const novelFactories = pipeline.factories.filter((factory) => {
            return !knownFactoryFunctions.some((knownFactory) => knownFactory(factory));
        });
        if (novelFactories.length) {
            const hasInjector = novelFactories.some((factory) => isInjectorPolicyFactory(factory));
            // if there are any left over, wrap in a requestPolicyFactoryPolicy
            return {
                wrappedPolicies: coreHttpCompat.createRequestPolicyFactoryPolicy(novelFactories),
                afterRetry: hasInjector,
            };
        }
    }
    return undefined;
}
function getCoreClientOptions(pipeline) {
    var _a;
    const _b = pipeline.options, { httpClient: v1Client } = _b, restOptions = tslib.__rest(_b, ["httpClient"]);
    let httpClient = pipeline._coreHttpClient;
    if (!httpClient) {
        httpClient = v1Client ? coreHttpCompat.convertHttpClient(v1Client) : getCachedDefaultHttpClient();
        pipeline._coreHttpClient = httpClient;
    }
    let corePipeline = pipeline._corePipeline;
    if (!corePipeline) {
        const packageDetails = `azsdk-js-azure-storage-blob/${SDK_VERSION}`;
        const userAgentPrefix = restOptions.userAgentOptions && restOptions.userAgentOptions.userAgentPrefix
            ? `${restOptions.userAgentOptions.userAgentPrefix} ${packageDetails}`
            : `${packageDetails}`;
        corePipeline = coreClient.createClientPipeline(Object.assign(Object.assign({}, restOptions), { loggingOptions: {
                additionalAllowedHeaderNames: StorageBlobLoggingAllowedHeaderNames,
                additionalAllowedQueryParameters: StorageBlobLoggingAllowedQueryParameters,
                logger: logger.info,
            }, userAgentOptions: {
                userAgentPrefix,
            }, serializationOptions: {
                stringifyXML: coreXml.stringifyXML,
                serializerOptions: {
                    xml: {
                        // Use customized XML char key of "#" so we can deserialize metadata
                        // with "_" key
                        xmlCharKey: "#",
                    },
                },
            }, deserializationOptions: {
                parseXML: coreXml.parseXML,
                serializerOptions: {
                    xml: {
                        // Use customized XML char key of "#" so we can deserialize metadata
                        // with "_" key
                        xmlCharKey: "#",
                    },
                },
            } }));
        corePipeline.removePolicy({ phase: "Retry" });
        corePipeline.removePolicy({ name: coreRestPipeline.decompressResponsePolicyName });
        corePipeline.addPolicy(storageCorrectContentLengthPolicy());
        corePipeline.addPolicy(storageRetryPolicy(restOptions.retryOptions), { phase: "Retry" });
        corePipeline.addPolicy(storageBrowserPolicy());
        const downlevelResults = processDownlevelPipeline(pipeline);
        if (downlevelResults) {
            corePipeline.addPolicy(downlevelResults.wrappedPolicies, downlevelResults.afterRetry ? { afterPhase: "Retry" } : undefined);
        }
        const credential = getCredentialFromPipeline(pipeline);
        if (coreAuth.isTokenCredential(credential)) {
            corePipeline.addPolicy(coreRestPipeline.bearerTokenAuthenticationPolicy({
                credential,
                scopes: (_a = restOptions.audience) !== null && _a !== void 0 ? _a : StorageOAuthScopes,
                challengeCallbacks: { authorizeRequestOnChallenge: coreClient.authorizeRequestOnTenantChallenge },
            }), { phase: "Sign" });
        }
        else if (credential instanceof StorageSharedKeyCredential) {
            corePipeline.addPolicy(storageSharedKeyCredentialPolicy({
                accountName: credential.accountName,
                accountKey: credential.accountKey,
            }), { phase: "Sign" });
        }
        pipeline._corePipeline = corePipeline;
    }
    return Object.assign(Object.assign({}, restOptions), { allowInsecureConnection: true, httpClient, pipeline: corePipeline });
}
function getCredentialFromPipeline(pipeline) {
    // see if we squirreled one away on the type itself
    if (pipeline._credential) {
        return pipeline._credential;
    }
    // if it came from another package, loop over the factories and look for one like before
    let credential = new AnonymousCredential();
    for (const factory of pipeline.factories) {
        if (coreAuth.isTokenCredential(factory.credential)) {
            // Only works if the factory has been attached a "credential" property.
            // We do that in newPipeline() when using TokenCredential.
            credential = factory.credential;
        }
        else if (isStorageSharedKeyCredential(factory)) {
            return factory;
        }
    }
    return credential;
}
function isStorageSharedKeyCredential(factory) {
    if (factory instanceof StorageSharedKeyCredential) {
        return true;
    }
    return factory.constructor.name === "StorageSharedKeyCredential";
}
function isAnonymousCredential(factory) {
    if (factory instanceof AnonymousCredential) {
        return true;
    }
    return factory.constructor.name === "AnonymousCredential";
}
function isCoreHttpBearerTokenFactory(factory) {
    return coreAuth.isTokenCredential(factory.credential);
}
function isStorageBrowserPolicyFactory(factory) {
    if (factory instanceof StorageBrowserPolicyFactory) {
        return true;
    }
    return factory.constructor.name === "StorageBrowserPolicyFactory";
}
function isStorageRetryPolicyFactory(factory) {
    if (factory instanceof StorageRetryPolicyFactory) {
        return true;
    }
    return factory.constructor.name === "StorageRetryPolicyFactory";
}
function isStorageTelemetryPolicyFactory(factory) {
    return factory.constructor.name === "TelemetryPolicyFactory";
}
function isInjectorPolicyFactory(factory) {
    return factory.constructor.name === "InjectorPolicyFactory";
}
function isCoreHttpPolicyFactory(factory) {
    const knownPolicies = [
        "GenerateClientRequestIdPolicy",
        "TracingPolicy",
        "LogPolicy",
        "ProxyPolicy",
        "DisableResponseDecompressionPolicy",
        "KeepAlivePolicy",
        "DeserializationPolicy",
    ];
    const mockHttpClient = {
        sendRequest: async (request) => {
            return {
                request,
                headers: request.headers.clone(),
                status: 500,
            };
        },
    };
    const mockRequestPolicyOptions = {
        log(_logLevel, _message) {
            /* do nothing */
        },
        shouldLog(_logLevel) {
            return false;
        },
    };
    const policyInstance = factory.create(mockHttpClient, mockRequestPolicyOptions);
    const policyName = policyInstance.constructor.name;
    // bundlers sometimes add a custom suffix to the class name to make it unique
    return knownPolicies.some((knownPolicyName) => {
        return policyName.startsWith(knownPolicyName);
    });
}

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
const BlobServiceProperties = {
    serializedName: "BlobServiceProperties",
    xmlName: "StorageServiceProperties",
    type: {
        name: "Composite",
        className: "BlobServiceProperties",
        modelProperties: {
            blobAnalyticsLogging: {
                serializedName: "Logging",
                xmlName: "Logging",
                type: {
                    name: "Composite",
                    className: "Logging",
                },
            },
            hourMetrics: {
                serializedName: "HourMetrics",
                xmlName: "HourMetrics",
                type: {
                    name: "Composite",
                    className: "Metrics",
                },
            },
            minuteMetrics: {
                serializedName: "MinuteMetrics",
                xmlName: "MinuteMetrics",
                type: {
                    name: "Composite",
                    className: "Metrics",
                },
            },
            cors: {
                serializedName: "Cors",
                xmlName: "Cors",
                xmlIsWrapped: true,
                xmlElementName: "CorsRule",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "CorsRule",
                        },
                    },
                },
            },
            defaultServiceVersion: {
                serializedName: "DefaultServiceVersion",
                xmlName: "DefaultServiceVersion",
                type: {
                    name: "String",
                },
            },
            deleteRetentionPolicy: {
                serializedName: "DeleteRetentionPolicy",
                xmlName: "DeleteRetentionPolicy",
                type: {
                    name: "Composite",
                    className: "RetentionPolicy",
                },
            },
            staticWebsite: {
                serializedName: "StaticWebsite",
                xmlName: "StaticWebsite",
                type: {
                    name: "Composite",
                    className: "StaticWebsite",
                },
            },
        },
    },
};
const Logging = {
    serializedName: "Logging",
    type: {
        name: "Composite",
        className: "Logging",
        modelProperties: {
            version: {
                serializedName: "Version",
                required: true,
                xmlName: "Version",
                type: {
                    name: "String",
                },
            },
            deleteProperty: {
                serializedName: "Delete",
                required: true,
                xmlName: "Delete",
                type: {
                    name: "Boolean",
                },
            },
            read: {
                serializedName: "Read",
                required: true,
                xmlName: "Read",
                type: {
                    name: "Boolean",
                },
            },
            write: {
                serializedName: "Write",
                required: true,
                xmlName: "Write",
                type: {
                    name: "Boolean",
                },
            },
            retentionPolicy: {
                serializedName: "RetentionPolicy",
                xmlName: "RetentionPolicy",
                type: {
                    name: "Composite",
                    className: "RetentionPolicy",
                },
            },
        },
    },
};
const RetentionPolicy = {
    serializedName: "RetentionPolicy",
    type: {
        name: "Composite",
        className: "RetentionPolicy",
        modelProperties: {
            enabled: {
                serializedName: "Enabled",
                required: true,
                xmlName: "Enabled",
                type: {
                    name: "Boolean",
                },
            },
            days: {
                constraints: {
                    InclusiveMinimum: 1,
                },
                serializedName: "Days",
                xmlName: "Days",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const Metrics = {
    serializedName: "Metrics",
    type: {
        name: "Composite",
        className: "Metrics",
        modelProperties: {
            version: {
                serializedName: "Version",
                xmlName: "Version",
                type: {
                    name: "String",
                },
            },
            enabled: {
                serializedName: "Enabled",
                required: true,
                xmlName: "Enabled",
                type: {
                    name: "Boolean",
                },
            },
            includeAPIs: {
                serializedName: "IncludeAPIs",
                xmlName: "IncludeAPIs",
                type: {
                    name: "Boolean",
                },
            },
            retentionPolicy: {
                serializedName: "RetentionPolicy",
                xmlName: "RetentionPolicy",
                type: {
                    name: "Composite",
                    className: "RetentionPolicy",
                },
            },
        },
    },
};
const CorsRule = {
    serializedName: "CorsRule",
    type: {
        name: "Composite",
        className: "CorsRule",
        modelProperties: {
            allowedOrigins: {
                serializedName: "AllowedOrigins",
                required: true,
                xmlName: "AllowedOrigins",
                type: {
                    name: "String",
                },
            },
            allowedMethods: {
                serializedName: "AllowedMethods",
                required: true,
                xmlName: "AllowedMethods",
                type: {
                    name: "String",
                },
            },
            allowedHeaders: {
                serializedName: "AllowedHeaders",
                required: true,
                xmlName: "AllowedHeaders",
                type: {
                    name: "String",
                },
            },
            exposedHeaders: {
                serializedName: "ExposedHeaders",
                required: true,
                xmlName: "ExposedHeaders",
                type: {
                    name: "String",
                },
            },
            maxAgeInSeconds: {
                constraints: {
                    InclusiveMinimum: 0,
                },
                serializedName: "MaxAgeInSeconds",
                required: true,
                xmlName: "MaxAgeInSeconds",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const StaticWebsite = {
    serializedName: "StaticWebsite",
    type: {
        name: "Composite",
        className: "StaticWebsite",
        modelProperties: {
            enabled: {
                serializedName: "Enabled",
                required: true,
                xmlName: "Enabled",
                type: {
                    name: "Boolean",
                },
            },
            indexDocument: {
                serializedName: "IndexDocument",
                xmlName: "IndexDocument",
                type: {
                    name: "String",
                },
            },
            errorDocument404Path: {
                serializedName: "ErrorDocument404Path",
                xmlName: "ErrorDocument404Path",
                type: {
                    name: "String",
                },
            },
            defaultIndexDocumentPath: {
                serializedName: "DefaultIndexDocumentPath",
                xmlName: "DefaultIndexDocumentPath",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const StorageError = {
    serializedName: "StorageError",
    type: {
        name: "Composite",
        className: "StorageError",
        modelProperties: {
            message: {
                serializedName: "Message",
                xmlName: "Message",
                type: {
                    name: "String",
                },
            },
            code: {
                serializedName: "Code",
                xmlName: "Code",
                type: {
                    name: "String",
                },
            },
            authenticationErrorDetail: {
                serializedName: "AuthenticationErrorDetail",
                xmlName: "AuthenticationErrorDetail",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobServiceStatistics = {
    serializedName: "BlobServiceStatistics",
    xmlName: "StorageServiceStats",
    type: {
        name: "Composite",
        className: "BlobServiceStatistics",
        modelProperties: {
            geoReplication: {
                serializedName: "GeoReplication",
                xmlName: "GeoReplication",
                type: {
                    name: "Composite",
                    className: "GeoReplication",
                },
            },
        },
    },
};
const GeoReplication = {
    serializedName: "GeoReplication",
    type: {
        name: "Composite",
        className: "GeoReplication",
        modelProperties: {
            status: {
                serializedName: "Status",
                required: true,
                xmlName: "Status",
                type: {
                    name: "Enum",
                    allowedValues: ["live", "bootstrap", "unavailable"],
                },
            },
            lastSyncOn: {
                serializedName: "LastSyncTime",
                required: true,
                xmlName: "LastSyncTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ListContainersSegmentResponse = {
    serializedName: "ListContainersSegmentResponse",
    xmlName: "EnumerationResults",
    type: {
        name: "Composite",
        className: "ListContainersSegmentResponse",
        modelProperties: {
            serviceEndpoint: {
                serializedName: "ServiceEndpoint",
                required: true,
                xmlName: "ServiceEndpoint",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            prefix: {
                serializedName: "Prefix",
                xmlName: "Prefix",
                type: {
                    name: "String",
                },
            },
            marker: {
                serializedName: "Marker",
                xmlName: "Marker",
                type: {
                    name: "String",
                },
            },
            maxPageSize: {
                serializedName: "MaxResults",
                xmlName: "MaxResults",
                type: {
                    name: "Number",
                },
            },
            containerItems: {
                serializedName: "ContainerItems",
                required: true,
                xmlName: "Containers",
                xmlIsWrapped: true,
                xmlElementName: "Container",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "ContainerItem",
                        },
                    },
                },
            },
            continuationToken: {
                serializedName: "NextMarker",
                xmlName: "NextMarker",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerItem = {
    serializedName: "ContainerItem",
    xmlName: "Container",
    type: {
        name: "Composite",
        className: "ContainerItem",
        modelProperties: {
            name: {
                serializedName: "Name",
                required: true,
                xmlName: "Name",
                type: {
                    name: "String",
                },
            },
            deleted: {
                serializedName: "Deleted",
                xmlName: "Deleted",
                type: {
                    name: "Boolean",
                },
            },
            version: {
                serializedName: "Version",
                xmlName: "Version",
                type: {
                    name: "String",
                },
            },
            properties: {
                serializedName: "Properties",
                xmlName: "Properties",
                type: {
                    name: "Composite",
                    className: "ContainerProperties",
                },
            },
            metadata: {
                serializedName: "Metadata",
                xmlName: "Metadata",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
        },
    },
};
const ContainerProperties = {
    serializedName: "ContainerProperties",
    type: {
        name: "Composite",
        className: "ContainerProperties",
        modelProperties: {
            lastModified: {
                serializedName: "Last-Modified",
                required: true,
                xmlName: "Last-Modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            etag: {
                serializedName: "Etag",
                required: true,
                xmlName: "Etag",
                type: {
                    name: "String",
                },
            },
            leaseStatus: {
                serializedName: "LeaseStatus",
                xmlName: "LeaseStatus",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            leaseState: {
                serializedName: "LeaseState",
                xmlName: "LeaseState",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseDuration: {
                serializedName: "LeaseDuration",
                xmlName: "LeaseDuration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            publicAccess: {
                serializedName: "PublicAccess",
                xmlName: "PublicAccess",
                type: {
                    name: "Enum",
                    allowedValues: ["container", "blob"],
                },
            },
            hasImmutabilityPolicy: {
                serializedName: "HasImmutabilityPolicy",
                xmlName: "HasImmutabilityPolicy",
                type: {
                    name: "Boolean",
                },
            },
            hasLegalHold: {
                serializedName: "HasLegalHold",
                xmlName: "HasLegalHold",
                type: {
                    name: "Boolean",
                },
            },
            defaultEncryptionScope: {
                serializedName: "DefaultEncryptionScope",
                xmlName: "DefaultEncryptionScope",
                type: {
                    name: "String",
                },
            },
            preventEncryptionScopeOverride: {
                serializedName: "DenyEncryptionScopeOverride",
                xmlName: "DenyEncryptionScopeOverride",
                type: {
                    name: "Boolean",
                },
            },
            deletedOn: {
                serializedName: "DeletedTime",
                xmlName: "DeletedTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            remainingRetentionDays: {
                serializedName: "RemainingRetentionDays",
                xmlName: "RemainingRetentionDays",
                type: {
                    name: "Number",
                },
            },
            isImmutableStorageWithVersioningEnabled: {
                serializedName: "ImmutableStorageWithVersioningEnabled",
                xmlName: "ImmutableStorageWithVersioningEnabled",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const KeyInfo = {
    serializedName: "KeyInfo",
    type: {
        name: "Composite",
        className: "KeyInfo",
        modelProperties: {
            startsOn: {
                serializedName: "Start",
                required: true,
                xmlName: "Start",
                type: {
                    name: "String",
                },
            },
            expiresOn: {
                serializedName: "Expiry",
                required: true,
                xmlName: "Expiry",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const UserDelegationKey = {
    serializedName: "UserDelegationKey",
    type: {
        name: "Composite",
        className: "UserDelegationKey",
        modelProperties: {
            signedObjectId: {
                serializedName: "SignedOid",
                required: true,
                xmlName: "SignedOid",
                type: {
                    name: "String",
                },
            },
            signedTenantId: {
                serializedName: "SignedTid",
                required: true,
                xmlName: "SignedTid",
                type: {
                    name: "String",
                },
            },
            signedStartsOn: {
                serializedName: "SignedStart",
                required: true,
                xmlName: "SignedStart",
                type: {
                    name: "String",
                },
            },
            signedExpiresOn: {
                serializedName: "SignedExpiry",
                required: true,
                xmlName: "SignedExpiry",
                type: {
                    name: "String",
                },
            },
            signedService: {
                serializedName: "SignedService",
                required: true,
                xmlName: "SignedService",
                type: {
                    name: "String",
                },
            },
            signedVersion: {
                serializedName: "SignedVersion",
                required: true,
                xmlName: "SignedVersion",
                type: {
                    name: "String",
                },
            },
            value: {
                serializedName: "Value",
                required: true,
                xmlName: "Value",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const FilterBlobSegment = {
    serializedName: "FilterBlobSegment",
    xmlName: "EnumerationResults",
    type: {
        name: "Composite",
        className: "FilterBlobSegment",
        modelProperties: {
            serviceEndpoint: {
                serializedName: "ServiceEndpoint",
                required: true,
                xmlName: "ServiceEndpoint",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            where: {
                serializedName: "Where",
                required: true,
                xmlName: "Where",
                type: {
                    name: "String",
                },
            },
            blobs: {
                serializedName: "Blobs",
                required: true,
                xmlName: "Blobs",
                xmlIsWrapped: true,
                xmlElementName: "Blob",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "FilterBlobItem",
                        },
                    },
                },
            },
            continuationToken: {
                serializedName: "NextMarker",
                xmlName: "NextMarker",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const FilterBlobItem = {
    serializedName: "FilterBlobItem",
    xmlName: "Blob",
    type: {
        name: "Composite",
        className: "FilterBlobItem",
        modelProperties: {
            name: {
                serializedName: "Name",
                required: true,
                xmlName: "Name",
                type: {
                    name: "String",
                },
            },
            containerName: {
                serializedName: "ContainerName",
                required: true,
                xmlName: "ContainerName",
                type: {
                    name: "String",
                },
            },
            tags: {
                serializedName: "Tags",
                xmlName: "Tags",
                type: {
                    name: "Composite",
                    className: "BlobTags",
                },
            },
        },
    },
};
const BlobTags = {
    serializedName: "BlobTags",
    xmlName: "Tags",
    type: {
        name: "Composite",
        className: "BlobTags",
        modelProperties: {
            blobTagSet: {
                serializedName: "BlobTagSet",
                required: true,
                xmlName: "TagSet",
                xmlIsWrapped: true,
                xmlElementName: "Tag",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "BlobTag",
                        },
                    },
                },
            },
        },
    },
};
const BlobTag = {
    serializedName: "BlobTag",
    xmlName: "Tag",
    type: {
        name: "Composite",
        className: "BlobTag",
        modelProperties: {
            key: {
                serializedName: "Key",
                required: true,
                xmlName: "Key",
                type: {
                    name: "String",
                },
            },
            value: {
                serializedName: "Value",
                required: true,
                xmlName: "Value",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const SignedIdentifier = {
    serializedName: "SignedIdentifier",
    xmlName: "SignedIdentifier",
    type: {
        name: "Composite",
        className: "SignedIdentifier",
        modelProperties: {
            id: {
                serializedName: "Id",
                required: true,
                xmlName: "Id",
                type: {
                    name: "String",
                },
            },
            accessPolicy: {
                serializedName: "AccessPolicy",
                xmlName: "AccessPolicy",
                type: {
                    name: "Composite",
                    className: "AccessPolicy",
                },
            },
        },
    },
};
const AccessPolicy = {
    serializedName: "AccessPolicy",
    type: {
        name: "Composite",
        className: "AccessPolicy",
        modelProperties: {
            startsOn: {
                serializedName: "Start",
                xmlName: "Start",
                type: {
                    name: "String",
                },
            },
            expiresOn: {
                serializedName: "Expiry",
                xmlName: "Expiry",
                type: {
                    name: "String",
                },
            },
            permissions: {
                serializedName: "Permission",
                xmlName: "Permission",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ListBlobsFlatSegmentResponse = {
    serializedName: "ListBlobsFlatSegmentResponse",
    xmlName: "EnumerationResults",
    type: {
        name: "Composite",
        className: "ListBlobsFlatSegmentResponse",
        modelProperties: {
            serviceEndpoint: {
                serializedName: "ServiceEndpoint",
                required: true,
                xmlName: "ServiceEndpoint",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            containerName: {
                serializedName: "ContainerName",
                required: true,
                xmlName: "ContainerName",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            prefix: {
                serializedName: "Prefix",
                xmlName: "Prefix",
                type: {
                    name: "String",
                },
            },
            marker: {
                serializedName: "Marker",
                xmlName: "Marker",
                type: {
                    name: "String",
                },
            },
            maxPageSize: {
                serializedName: "MaxResults",
                xmlName: "MaxResults",
                type: {
                    name: "Number",
                },
            },
            segment: {
                serializedName: "Segment",
                xmlName: "Blobs",
                type: {
                    name: "Composite",
                    className: "BlobFlatListSegment",
                },
            },
            continuationToken: {
                serializedName: "NextMarker",
                xmlName: "NextMarker",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobFlatListSegment = {
    serializedName: "BlobFlatListSegment",
    xmlName: "Blobs",
    type: {
        name: "Composite",
        className: "BlobFlatListSegment",
        modelProperties: {
            blobItems: {
                serializedName: "BlobItems",
                required: true,
                xmlName: "BlobItems",
                xmlElementName: "Blob",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "BlobItemInternal",
                        },
                    },
                },
            },
        },
    },
};
const BlobItemInternal = {
    serializedName: "BlobItemInternal",
    xmlName: "Blob",
    type: {
        name: "Composite",
        className: "BlobItemInternal",
        modelProperties: {
            name: {
                serializedName: "Name",
                xmlName: "Name",
                type: {
                    name: "Composite",
                    className: "BlobName",
                },
            },
            deleted: {
                serializedName: "Deleted",
                required: true,
                xmlName: "Deleted",
                type: {
                    name: "Boolean",
                },
            },
            snapshot: {
                serializedName: "Snapshot",
                required: true,
                xmlName: "Snapshot",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "VersionId",
                xmlName: "VersionId",
                type: {
                    name: "String",
                },
            },
            isCurrentVersion: {
                serializedName: "IsCurrentVersion",
                xmlName: "IsCurrentVersion",
                type: {
                    name: "Boolean",
                },
            },
            properties: {
                serializedName: "Properties",
                xmlName: "Properties",
                type: {
                    name: "Composite",
                    className: "BlobPropertiesInternal",
                },
            },
            metadata: {
                serializedName: "Metadata",
                xmlName: "Metadata",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            blobTags: {
                serializedName: "BlobTags",
                xmlName: "Tags",
                type: {
                    name: "Composite",
                    className: "BlobTags",
                },
            },
            objectReplicationMetadata: {
                serializedName: "ObjectReplicationMetadata",
                xmlName: "OrMetadata",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            hasVersionsOnly: {
                serializedName: "HasVersionsOnly",
                xmlName: "HasVersionsOnly",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const BlobName = {
    serializedName: "BlobName",
    type: {
        name: "Composite",
        className: "BlobName",
        modelProperties: {
            encoded: {
                serializedName: "Encoded",
                xmlName: "Encoded",
                xmlIsAttribute: true,
                type: {
                    name: "Boolean",
                },
            },
            content: {
                serializedName: "content",
                xmlName: "content",
                xmlIsMsText: true,
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobPropertiesInternal = {
    serializedName: "BlobPropertiesInternal",
    xmlName: "Properties",
    type: {
        name: "Composite",
        className: "BlobPropertiesInternal",
        modelProperties: {
            createdOn: {
                serializedName: "Creation-Time",
                xmlName: "Creation-Time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            lastModified: {
                serializedName: "Last-Modified",
                required: true,
                xmlName: "Last-Modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            etag: {
                serializedName: "Etag",
                required: true,
                xmlName: "Etag",
                type: {
                    name: "String",
                },
            },
            contentLength: {
                serializedName: "Content-Length",
                xmlName: "Content-Length",
                type: {
                    name: "Number",
                },
            },
            contentType: {
                serializedName: "Content-Type",
                xmlName: "Content-Type",
                type: {
                    name: "String",
                },
            },
            contentEncoding: {
                serializedName: "Content-Encoding",
                xmlName: "Content-Encoding",
                type: {
                    name: "String",
                },
            },
            contentLanguage: {
                serializedName: "Content-Language",
                xmlName: "Content-Language",
                type: {
                    name: "String",
                },
            },
            contentMD5: {
                serializedName: "Content-MD5",
                xmlName: "Content-MD5",
                type: {
                    name: "ByteArray",
                },
            },
            contentDisposition: {
                serializedName: "Content-Disposition",
                xmlName: "Content-Disposition",
                type: {
                    name: "String",
                },
            },
            cacheControl: {
                serializedName: "Cache-Control",
                xmlName: "Cache-Control",
                type: {
                    name: "String",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            blobType: {
                serializedName: "BlobType",
                xmlName: "BlobType",
                type: {
                    name: "Enum",
                    allowedValues: ["BlockBlob", "PageBlob", "AppendBlob"],
                },
            },
            leaseStatus: {
                serializedName: "LeaseStatus",
                xmlName: "LeaseStatus",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            leaseState: {
                serializedName: "LeaseState",
                xmlName: "LeaseState",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseDuration: {
                serializedName: "LeaseDuration",
                xmlName: "LeaseDuration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            copyId: {
                serializedName: "CopyId",
                xmlName: "CopyId",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "CopyStatus",
                xmlName: "CopyStatus",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            copySource: {
                serializedName: "CopySource",
                xmlName: "CopySource",
                type: {
                    name: "String",
                },
            },
            copyProgress: {
                serializedName: "CopyProgress",
                xmlName: "CopyProgress",
                type: {
                    name: "String",
                },
            },
            copyCompletedOn: {
                serializedName: "CopyCompletionTime",
                xmlName: "CopyCompletionTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyStatusDescription: {
                serializedName: "CopyStatusDescription",
                xmlName: "CopyStatusDescription",
                type: {
                    name: "String",
                },
            },
            serverEncrypted: {
                serializedName: "ServerEncrypted",
                xmlName: "ServerEncrypted",
                type: {
                    name: "Boolean",
                },
            },
            incrementalCopy: {
                serializedName: "IncrementalCopy",
                xmlName: "IncrementalCopy",
                type: {
                    name: "Boolean",
                },
            },
            destinationSnapshot: {
                serializedName: "DestinationSnapshot",
                xmlName: "DestinationSnapshot",
                type: {
                    name: "String",
                },
            },
            deletedOn: {
                serializedName: "DeletedTime",
                xmlName: "DeletedTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            remainingRetentionDays: {
                serializedName: "RemainingRetentionDays",
                xmlName: "RemainingRetentionDays",
                type: {
                    name: "Number",
                },
            },
            accessTier: {
                serializedName: "AccessTier",
                xmlName: "AccessTier",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "P4",
                        "P6",
                        "P10",
                        "P15",
                        "P20",
                        "P30",
                        "P40",
                        "P50",
                        "P60",
                        "P70",
                        "P80",
                        "Hot",
                        "Cool",
                        "Archive",
                        "Cold",
                    ],
                },
            },
            accessTierInferred: {
                serializedName: "AccessTierInferred",
                xmlName: "AccessTierInferred",
                type: {
                    name: "Boolean",
                },
            },
            archiveStatus: {
                serializedName: "ArchiveStatus",
                xmlName: "ArchiveStatus",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "rehydrate-pending-to-hot",
                        "rehydrate-pending-to-cool",
                        "rehydrate-pending-to-cold",
                    ],
                },
            },
            customerProvidedKeySha256: {
                serializedName: "CustomerProvidedKeySha256",
                xmlName: "CustomerProvidedKeySha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "EncryptionScope",
                xmlName: "EncryptionScope",
                type: {
                    name: "String",
                },
            },
            accessTierChangedOn: {
                serializedName: "AccessTierChangeTime",
                xmlName: "AccessTierChangeTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            tagCount: {
                serializedName: "TagCount",
                xmlName: "TagCount",
                type: {
                    name: "Number",
                },
            },
            expiresOn: {
                serializedName: "Expiry-Time",
                xmlName: "Expiry-Time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isSealed: {
                serializedName: "Sealed",
                xmlName: "Sealed",
                type: {
                    name: "Boolean",
                },
            },
            rehydratePriority: {
                serializedName: "RehydratePriority",
                xmlName: "RehydratePriority",
                type: {
                    name: "Enum",
                    allowedValues: ["High", "Standard"],
                },
            },
            lastAccessedOn: {
                serializedName: "LastAccessTime",
                xmlName: "LastAccessTime",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyExpiresOn: {
                serializedName: "ImmutabilityPolicyUntilDate",
                xmlName: "ImmutabilityPolicyUntilDate",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyMode: {
                serializedName: "ImmutabilityPolicyMode",
                xmlName: "ImmutabilityPolicyMode",
                type: {
                    name: "Enum",
                    allowedValues: ["Mutable", "Unlocked", "Locked"],
                },
            },
            legalHold: {
                serializedName: "LegalHold",
                xmlName: "LegalHold",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const ListBlobsHierarchySegmentResponse = {
    serializedName: "ListBlobsHierarchySegmentResponse",
    xmlName: "EnumerationResults",
    type: {
        name: "Composite",
        className: "ListBlobsHierarchySegmentResponse",
        modelProperties: {
            serviceEndpoint: {
                serializedName: "ServiceEndpoint",
                required: true,
                xmlName: "ServiceEndpoint",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            containerName: {
                serializedName: "ContainerName",
                required: true,
                xmlName: "ContainerName",
                xmlIsAttribute: true,
                type: {
                    name: "String",
                },
            },
            prefix: {
                serializedName: "Prefix",
                xmlName: "Prefix",
                type: {
                    name: "String",
                },
            },
            marker: {
                serializedName: "Marker",
                xmlName: "Marker",
                type: {
                    name: "String",
                },
            },
            maxPageSize: {
                serializedName: "MaxResults",
                xmlName: "MaxResults",
                type: {
                    name: "Number",
                },
            },
            delimiter: {
                serializedName: "Delimiter",
                xmlName: "Delimiter",
                type: {
                    name: "String",
                },
            },
            segment: {
                serializedName: "Segment",
                xmlName: "Blobs",
                type: {
                    name: "Composite",
                    className: "BlobHierarchyListSegment",
                },
            },
            continuationToken: {
                serializedName: "NextMarker",
                xmlName: "NextMarker",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobHierarchyListSegment = {
    serializedName: "BlobHierarchyListSegment",
    xmlName: "Blobs",
    type: {
        name: "Composite",
        className: "BlobHierarchyListSegment",
        modelProperties: {
            blobPrefixes: {
                serializedName: "BlobPrefixes",
                xmlName: "BlobPrefixes",
                xmlElementName: "BlobPrefix",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "BlobPrefix",
                        },
                    },
                },
            },
            blobItems: {
                serializedName: "BlobItems",
                required: true,
                xmlName: "BlobItems",
                xmlElementName: "Blob",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "BlobItemInternal",
                        },
                    },
                },
            },
        },
    },
};
const BlobPrefix = {
    serializedName: "BlobPrefix",
    type: {
        name: "Composite",
        className: "BlobPrefix",
        modelProperties: {
            name: {
                serializedName: "Name",
                xmlName: "Name",
                type: {
                    name: "Composite",
                    className: "BlobName",
                },
            },
        },
    },
};
const BlockLookupList = {
    serializedName: "BlockLookupList",
    xmlName: "BlockList",
    type: {
        name: "Composite",
        className: "BlockLookupList",
        modelProperties: {
            committed: {
                serializedName: "Committed",
                xmlName: "Committed",
                xmlElementName: "Committed",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "String",
                        },
                    },
                },
            },
            uncommitted: {
                serializedName: "Uncommitted",
                xmlName: "Uncommitted",
                xmlElementName: "Uncommitted",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "String",
                        },
                    },
                },
            },
            latest: {
                serializedName: "Latest",
                xmlName: "Latest",
                xmlElementName: "Latest",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "String",
                        },
                    },
                },
            },
        },
    },
};
const BlockList = {
    serializedName: "BlockList",
    type: {
        name: "Composite",
        className: "BlockList",
        modelProperties: {
            committedBlocks: {
                serializedName: "CommittedBlocks",
                xmlName: "CommittedBlocks",
                xmlIsWrapped: true,
                xmlElementName: "Block",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "Block",
                        },
                    },
                },
            },
            uncommittedBlocks: {
                serializedName: "UncommittedBlocks",
                xmlName: "UncommittedBlocks",
                xmlIsWrapped: true,
                xmlElementName: "Block",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "Block",
                        },
                    },
                },
            },
        },
    },
};
const Block = {
    serializedName: "Block",
    type: {
        name: "Composite",
        className: "Block",
        modelProperties: {
            name: {
                serializedName: "Name",
                required: true,
                xmlName: "Name",
                type: {
                    name: "String",
                },
            },
            size: {
                serializedName: "Size",
                required: true,
                xmlName: "Size",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const PageList = {
    serializedName: "PageList",
    type: {
        name: "Composite",
        className: "PageList",
        modelProperties: {
            pageRange: {
                serializedName: "PageRange",
                xmlName: "PageRange",
                xmlElementName: "PageRange",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "PageRange",
                        },
                    },
                },
            },
            clearRange: {
                serializedName: "ClearRange",
                xmlName: "ClearRange",
                xmlElementName: "ClearRange",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "ClearRange",
                        },
                    },
                },
            },
            continuationToken: {
                serializedName: "NextMarker",
                xmlName: "NextMarker",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageRange = {
    serializedName: "PageRange",
    xmlName: "PageRange",
    type: {
        name: "Composite",
        className: "PageRange",
        modelProperties: {
            start: {
                serializedName: "Start",
                required: true,
                xmlName: "Start",
                type: {
                    name: "Number",
                },
            },
            end: {
                serializedName: "End",
                required: true,
                xmlName: "End",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const ClearRange = {
    serializedName: "ClearRange",
    xmlName: "ClearRange",
    type: {
        name: "Composite",
        className: "ClearRange",
        modelProperties: {
            start: {
                serializedName: "Start",
                required: true,
                xmlName: "Start",
                type: {
                    name: "Number",
                },
            },
            end: {
                serializedName: "End",
                required: true,
                xmlName: "End",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const QueryRequest = {
    serializedName: "QueryRequest",
    xmlName: "QueryRequest",
    type: {
        name: "Composite",
        className: "QueryRequest",
        modelProperties: {
            queryType: {
                serializedName: "QueryType",
                required: true,
                xmlName: "QueryType",
                type: {
                    name: "String",
                },
            },
            expression: {
                serializedName: "Expression",
                required: true,
                xmlName: "Expression",
                type: {
                    name: "String",
                },
            },
            inputSerialization: {
                serializedName: "InputSerialization",
                xmlName: "InputSerialization",
                type: {
                    name: "Composite",
                    className: "QuerySerialization",
                },
            },
            outputSerialization: {
                serializedName: "OutputSerialization",
                xmlName: "OutputSerialization",
                type: {
                    name: "Composite",
                    className: "QuerySerialization",
                },
            },
        },
    },
};
const QuerySerialization = {
    serializedName: "QuerySerialization",
    type: {
        name: "Composite",
        className: "QuerySerialization",
        modelProperties: {
            format: {
                serializedName: "Format",
                xmlName: "Format",
                type: {
                    name: "Composite",
                    className: "QueryFormat",
                },
            },
        },
    },
};
const QueryFormat = {
    serializedName: "QueryFormat",
    type: {
        name: "Composite",
        className: "QueryFormat",
        modelProperties: {
            type: {
                serializedName: "Type",
                required: true,
                xmlName: "Type",
                type: {
                    name: "Enum",
                    allowedValues: ["delimited", "json", "arrow", "parquet"],
                },
            },
            delimitedTextConfiguration: {
                serializedName: "DelimitedTextConfiguration",
                xmlName: "DelimitedTextConfiguration",
                type: {
                    name: "Composite",
                    className: "DelimitedTextConfiguration",
                },
            },
            jsonTextConfiguration: {
                serializedName: "JsonTextConfiguration",
                xmlName: "JsonTextConfiguration",
                type: {
                    name: "Composite",
                    className: "JsonTextConfiguration",
                },
            },
            arrowConfiguration: {
                serializedName: "ArrowConfiguration",
                xmlName: "ArrowConfiguration",
                type: {
                    name: "Composite",
                    className: "ArrowConfiguration",
                },
            },
            parquetTextConfiguration: {
                serializedName: "ParquetTextConfiguration",
                xmlName: "ParquetTextConfiguration",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "any" } },
                },
            },
        },
    },
};
const DelimitedTextConfiguration = {
    serializedName: "DelimitedTextConfiguration",
    xmlName: "DelimitedTextConfiguration",
    type: {
        name: "Composite",
        className: "DelimitedTextConfiguration",
        modelProperties: {
            columnSeparator: {
                serializedName: "ColumnSeparator",
                xmlName: "ColumnSeparator",
                type: {
                    name: "String",
                },
            },
            fieldQuote: {
                serializedName: "FieldQuote",
                xmlName: "FieldQuote",
                type: {
                    name: "String",
                },
            },
            recordSeparator: {
                serializedName: "RecordSeparator",
                xmlName: "RecordSeparator",
                type: {
                    name: "String",
                },
            },
            escapeChar: {
                serializedName: "EscapeChar",
                xmlName: "EscapeChar",
                type: {
                    name: "String",
                },
            },
            headersPresent: {
                serializedName: "HeadersPresent",
                xmlName: "HasHeaders",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const JsonTextConfiguration = {
    serializedName: "JsonTextConfiguration",
    xmlName: "JsonTextConfiguration",
    type: {
        name: "Composite",
        className: "JsonTextConfiguration",
        modelProperties: {
            recordSeparator: {
                serializedName: "RecordSeparator",
                xmlName: "RecordSeparator",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ArrowConfiguration = {
    serializedName: "ArrowConfiguration",
    xmlName: "ArrowConfiguration",
    type: {
        name: "Composite",
        className: "ArrowConfiguration",
        modelProperties: {
            schema: {
                serializedName: "Schema",
                required: true,
                xmlName: "Schema",
                xmlIsWrapped: true,
                xmlElementName: "Field",
                type: {
                    name: "Sequence",
                    element: {
                        type: {
                            name: "Composite",
                            className: "ArrowField",
                        },
                    },
                },
            },
        },
    },
};
const ArrowField = {
    serializedName: "ArrowField",
    xmlName: "Field",
    type: {
        name: "Composite",
        className: "ArrowField",
        modelProperties: {
            type: {
                serializedName: "Type",
                required: true,
                xmlName: "Type",
                type: {
                    name: "String",
                },
            },
            name: {
                serializedName: "Name",
                xmlName: "Name",
                type: {
                    name: "String",
                },
            },
            precision: {
                serializedName: "Precision",
                xmlName: "Precision",
                type: {
                    name: "Number",
                },
            },
            scale: {
                serializedName: "Scale",
                xmlName: "Scale",
                type: {
                    name: "Number",
                },
            },
        },
    },
};
const ServiceSetPropertiesHeaders = {
    serializedName: "Service_setPropertiesHeaders",
    type: {
        name: "Composite",
        className: "ServiceSetPropertiesHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceSetPropertiesExceptionHeaders = {
    serializedName: "Service_setPropertiesExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceSetPropertiesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetPropertiesHeaders = {
    serializedName: "Service_getPropertiesHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetPropertiesHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetPropertiesExceptionHeaders = {
    serializedName: "Service_getPropertiesExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetPropertiesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetStatisticsHeaders = {
    serializedName: "Service_getStatisticsHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetStatisticsHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetStatisticsExceptionHeaders = {
    serializedName: "Service_getStatisticsExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetStatisticsExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceListContainersSegmentHeaders = {
    serializedName: "Service_listContainersSegmentHeaders",
    type: {
        name: "Composite",
        className: "ServiceListContainersSegmentHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceListContainersSegmentExceptionHeaders = {
    serializedName: "Service_listContainersSegmentExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceListContainersSegmentExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetUserDelegationKeyHeaders = {
    serializedName: "Service_getUserDelegationKeyHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetUserDelegationKeyHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetUserDelegationKeyExceptionHeaders = {
    serializedName: "Service_getUserDelegationKeyExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetUserDelegationKeyExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetAccountInfoHeaders = {
    serializedName: "Service_getAccountInfoHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetAccountInfoHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            skuName: {
                serializedName: "x-ms-sku-name",
                xmlName: "x-ms-sku-name",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Standard_LRS",
                        "Standard_GRS",
                        "Standard_RAGRS",
                        "Standard_ZRS",
                        "Premium_LRS",
                    ],
                },
            },
            accountKind: {
                serializedName: "x-ms-account-kind",
                xmlName: "x-ms-account-kind",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Storage",
                        "BlobStorage",
                        "StorageV2",
                        "FileStorage",
                        "BlockBlobStorage",
                    ],
                },
            },
            isHierarchicalNamespaceEnabled: {
                serializedName: "x-ms-is-hns-enabled",
                xmlName: "x-ms-is-hns-enabled",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceGetAccountInfoExceptionHeaders = {
    serializedName: "Service_getAccountInfoExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceGetAccountInfoExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceSubmitBatchHeaders = {
    serializedName: "Service_submitBatchHeaders",
    type: {
        name: "Composite",
        className: "ServiceSubmitBatchHeaders",
        modelProperties: {
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceSubmitBatchExceptionHeaders = {
    serializedName: "Service_submitBatchExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceSubmitBatchExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceFilterBlobsHeaders = {
    serializedName: "Service_filterBlobsHeaders",
    type: {
        name: "Composite",
        className: "ServiceFilterBlobsHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ServiceFilterBlobsExceptionHeaders = {
    serializedName: "Service_filterBlobsExceptionHeaders",
    type: {
        name: "Composite",
        className: "ServiceFilterBlobsExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerCreateHeaders = {
    serializedName: "Container_createHeaders",
    type: {
        name: "Composite",
        className: "ContainerCreateHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerCreateExceptionHeaders = {
    serializedName: "Container_createExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerCreateExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerGetPropertiesHeaders = {
    serializedName: "Container_getPropertiesHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetPropertiesHeaders",
        modelProperties: {
            metadata: {
                serializedName: "x-ms-meta",
                headerCollectionPrefix: "x-ms-meta-",
                xmlName: "x-ms-meta",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseDuration: {
                serializedName: "x-ms-lease-duration",
                xmlName: "x-ms-lease-duration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            leaseState: {
                serializedName: "x-ms-lease-state",
                xmlName: "x-ms-lease-state",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseStatus: {
                serializedName: "x-ms-lease-status",
                xmlName: "x-ms-lease-status",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobPublicAccess: {
                serializedName: "x-ms-blob-public-access",
                xmlName: "x-ms-blob-public-access",
                type: {
                    name: "Enum",
                    allowedValues: ["container", "blob"],
                },
            },
            hasImmutabilityPolicy: {
                serializedName: "x-ms-has-immutability-policy",
                xmlName: "x-ms-has-immutability-policy",
                type: {
                    name: "Boolean",
                },
            },
            hasLegalHold: {
                serializedName: "x-ms-has-legal-hold",
                xmlName: "x-ms-has-legal-hold",
                type: {
                    name: "Boolean",
                },
            },
            defaultEncryptionScope: {
                serializedName: "x-ms-default-encryption-scope",
                xmlName: "x-ms-default-encryption-scope",
                type: {
                    name: "String",
                },
            },
            denyEncryptionScopeOverride: {
                serializedName: "x-ms-deny-encryption-scope-override",
                xmlName: "x-ms-deny-encryption-scope-override",
                type: {
                    name: "Boolean",
                },
            },
            isImmutableStorageWithVersioningEnabled: {
                serializedName: "x-ms-immutable-storage-with-versioning-enabled",
                xmlName: "x-ms-immutable-storage-with-versioning-enabled",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerGetPropertiesExceptionHeaders = {
    serializedName: "Container_getPropertiesExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetPropertiesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerDeleteHeaders = {
    serializedName: "Container_deleteHeaders",
    type: {
        name: "Composite",
        className: "ContainerDeleteHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerDeleteExceptionHeaders = {
    serializedName: "Container_deleteExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerDeleteExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSetMetadataHeaders = {
    serializedName: "Container_setMetadataHeaders",
    type: {
        name: "Composite",
        className: "ContainerSetMetadataHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSetMetadataExceptionHeaders = {
    serializedName: "Container_setMetadataExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerSetMetadataExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerGetAccessPolicyHeaders = {
    serializedName: "Container_getAccessPolicyHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetAccessPolicyHeaders",
        modelProperties: {
            blobPublicAccess: {
                serializedName: "x-ms-blob-public-access",
                xmlName: "x-ms-blob-public-access",
                type: {
                    name: "Enum",
                    allowedValues: ["container", "blob"],
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerGetAccessPolicyExceptionHeaders = {
    serializedName: "Container_getAccessPolicyExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetAccessPolicyExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSetAccessPolicyHeaders = {
    serializedName: "Container_setAccessPolicyHeaders",
    type: {
        name: "Composite",
        className: "ContainerSetAccessPolicyHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSetAccessPolicyExceptionHeaders = {
    serializedName: "Container_setAccessPolicyExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerSetAccessPolicyExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerRestoreHeaders = {
    serializedName: "Container_restoreHeaders",
    type: {
        name: "Composite",
        className: "ContainerRestoreHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerRestoreExceptionHeaders = {
    serializedName: "Container_restoreExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerRestoreExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerRenameHeaders = {
    serializedName: "Container_renameHeaders",
    type: {
        name: "Composite",
        className: "ContainerRenameHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerRenameExceptionHeaders = {
    serializedName: "Container_renameExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerRenameExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSubmitBatchHeaders = {
    serializedName: "Container_submitBatchHeaders",
    type: {
        name: "Composite",
        className: "ContainerSubmitBatchHeaders",
        modelProperties: {
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerSubmitBatchExceptionHeaders = {
    serializedName: "Container_submitBatchExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerSubmitBatchExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerFilterBlobsHeaders = {
    serializedName: "Container_filterBlobsHeaders",
    type: {
        name: "Composite",
        className: "ContainerFilterBlobsHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerFilterBlobsExceptionHeaders = {
    serializedName: "Container_filterBlobsExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerFilterBlobsExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerAcquireLeaseHeaders = {
    serializedName: "Container_acquireLeaseHeaders",
    type: {
        name: "Composite",
        className: "ContainerAcquireLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerAcquireLeaseExceptionHeaders = {
    serializedName: "Container_acquireLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerAcquireLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerReleaseLeaseHeaders = {
    serializedName: "Container_releaseLeaseHeaders",
    type: {
        name: "Composite",
        className: "ContainerReleaseLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerReleaseLeaseExceptionHeaders = {
    serializedName: "Container_releaseLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerReleaseLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerRenewLeaseHeaders = {
    serializedName: "Container_renewLeaseHeaders",
    type: {
        name: "Composite",
        className: "ContainerRenewLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerRenewLeaseExceptionHeaders = {
    serializedName: "Container_renewLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerRenewLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerBreakLeaseHeaders = {
    serializedName: "Container_breakLeaseHeaders",
    type: {
        name: "Composite",
        className: "ContainerBreakLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseTime: {
                serializedName: "x-ms-lease-time",
                xmlName: "x-ms-lease-time",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerBreakLeaseExceptionHeaders = {
    serializedName: "Container_breakLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerBreakLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerChangeLeaseHeaders = {
    serializedName: "Container_changeLeaseHeaders",
    type: {
        name: "Composite",
        className: "ContainerChangeLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const ContainerChangeLeaseExceptionHeaders = {
    serializedName: "Container_changeLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerChangeLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerListBlobFlatSegmentHeaders = {
    serializedName: "Container_listBlobFlatSegmentHeaders",
    type: {
        name: "Composite",
        className: "ContainerListBlobFlatSegmentHeaders",
        modelProperties: {
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerListBlobFlatSegmentExceptionHeaders = {
    serializedName: "Container_listBlobFlatSegmentExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerListBlobFlatSegmentExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerListBlobHierarchySegmentHeaders = {
    serializedName: "Container_listBlobHierarchySegmentHeaders",
    type: {
        name: "Composite",
        className: "ContainerListBlobHierarchySegmentHeaders",
        modelProperties: {
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerListBlobHierarchySegmentExceptionHeaders = {
    serializedName: "Container_listBlobHierarchySegmentExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerListBlobHierarchySegmentExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const ContainerGetAccountInfoHeaders = {
    serializedName: "Container_getAccountInfoHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetAccountInfoHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            skuName: {
                serializedName: "x-ms-sku-name",
                xmlName: "x-ms-sku-name",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Standard_LRS",
                        "Standard_GRS",
                        "Standard_RAGRS",
                        "Standard_ZRS",
                        "Premium_LRS",
                    ],
                },
            },
            accountKind: {
                serializedName: "x-ms-account-kind",
                xmlName: "x-ms-account-kind",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Storage",
                        "BlobStorage",
                        "StorageV2",
                        "FileStorage",
                        "BlockBlobStorage",
                    ],
                },
            },
            isHierarchicalNamespaceEnabled: {
                serializedName: "x-ms-is-hns-enabled",
                xmlName: "x-ms-is-hns-enabled",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const ContainerGetAccountInfoExceptionHeaders = {
    serializedName: "Container_getAccountInfoExceptionHeaders",
    type: {
        name: "Composite",
        className: "ContainerGetAccountInfoExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobDownloadHeaders = {
    serializedName: "Blob_downloadHeaders",
    type: {
        name: "Composite",
        className: "BlobDownloadHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            createdOn: {
                serializedName: "x-ms-creation-time",
                xmlName: "x-ms-creation-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            metadata: {
                serializedName: "x-ms-meta",
                headerCollectionPrefix: "x-ms-meta-",
                xmlName: "x-ms-meta",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            objectReplicationPolicyId: {
                serializedName: "x-ms-or-policy-id",
                xmlName: "x-ms-or-policy-id",
                type: {
                    name: "String",
                },
            },
            objectReplicationRules: {
                serializedName: "x-ms-or",
                headerCollectionPrefix: "x-ms-or-",
                xmlName: "x-ms-or",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            contentLength: {
                serializedName: "content-length",
                xmlName: "content-length",
                type: {
                    name: "Number",
                },
            },
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            contentRange: {
                serializedName: "content-range",
                xmlName: "content-range",
                type: {
                    name: "String",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            contentEncoding: {
                serializedName: "content-encoding",
                xmlName: "content-encoding",
                type: {
                    name: "String",
                },
            },
            cacheControl: {
                serializedName: "cache-control",
                xmlName: "cache-control",
                type: {
                    name: "String",
                },
            },
            contentDisposition: {
                serializedName: "content-disposition",
                xmlName: "content-disposition",
                type: {
                    name: "String",
                },
            },
            contentLanguage: {
                serializedName: "content-language",
                xmlName: "content-language",
                type: {
                    name: "String",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            blobType: {
                serializedName: "x-ms-blob-type",
                xmlName: "x-ms-blob-type",
                type: {
                    name: "Enum",
                    allowedValues: ["BlockBlob", "PageBlob", "AppendBlob"],
                },
            },
            copyCompletedOn: {
                serializedName: "x-ms-copy-completion-time",
                xmlName: "x-ms-copy-completion-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyStatusDescription: {
                serializedName: "x-ms-copy-status-description",
                xmlName: "x-ms-copy-status-description",
                type: {
                    name: "String",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyProgress: {
                serializedName: "x-ms-copy-progress",
                xmlName: "x-ms-copy-progress",
                type: {
                    name: "String",
                },
            },
            copySource: {
                serializedName: "x-ms-copy-source",
                xmlName: "x-ms-copy-source",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "x-ms-copy-status",
                xmlName: "x-ms-copy-status",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            leaseDuration: {
                serializedName: "x-ms-lease-duration",
                xmlName: "x-ms-lease-duration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            leaseState: {
                serializedName: "x-ms-lease-state",
                xmlName: "x-ms-lease-state",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseStatus: {
                serializedName: "x-ms-lease-status",
                xmlName: "x-ms-lease-status",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            isCurrentVersion: {
                serializedName: "x-ms-is-current-version",
                xmlName: "x-ms-is-current-version",
                type: {
                    name: "Boolean",
                },
            },
            acceptRanges: {
                serializedName: "accept-ranges",
                xmlName: "accept-ranges",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobCommittedBlockCount: {
                serializedName: "x-ms-blob-committed-block-count",
                xmlName: "x-ms-blob-committed-block-count",
                type: {
                    name: "Number",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-server-encrypted",
                xmlName: "x-ms-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            blobContentMD5: {
                serializedName: "x-ms-blob-content-md5",
                xmlName: "x-ms-blob-content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            tagCount: {
                serializedName: "x-ms-tag-count",
                xmlName: "x-ms-tag-count",
                type: {
                    name: "Number",
                },
            },
            isSealed: {
                serializedName: "x-ms-blob-sealed",
                xmlName: "x-ms-blob-sealed",
                type: {
                    name: "Boolean",
                },
            },
            lastAccessed: {
                serializedName: "x-ms-last-access-time",
                xmlName: "x-ms-last-access-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyExpiresOn: {
                serializedName: "x-ms-immutability-policy-until-date",
                xmlName: "x-ms-immutability-policy-until-date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyMode: {
                serializedName: "x-ms-immutability-policy-mode",
                xmlName: "x-ms-immutability-policy-mode",
                type: {
                    name: "Enum",
                    allowedValues: ["Mutable", "Unlocked", "Locked"],
                },
            },
            legalHold: {
                serializedName: "x-ms-legal-hold",
                xmlName: "x-ms-legal-hold",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
            contentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
        },
    },
};
const BlobDownloadExceptionHeaders = {
    serializedName: "Blob_downloadExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobDownloadExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobGetPropertiesHeaders = {
    serializedName: "Blob_getPropertiesHeaders",
    type: {
        name: "Composite",
        className: "BlobGetPropertiesHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            createdOn: {
                serializedName: "x-ms-creation-time",
                xmlName: "x-ms-creation-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            metadata: {
                serializedName: "x-ms-meta",
                headerCollectionPrefix: "x-ms-meta-",
                xmlName: "x-ms-meta",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            objectReplicationPolicyId: {
                serializedName: "x-ms-or-policy-id",
                xmlName: "x-ms-or-policy-id",
                type: {
                    name: "String",
                },
            },
            objectReplicationRules: {
                serializedName: "x-ms-or",
                headerCollectionPrefix: "x-ms-or-",
                xmlName: "x-ms-or",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            blobType: {
                serializedName: "x-ms-blob-type",
                xmlName: "x-ms-blob-type",
                type: {
                    name: "Enum",
                    allowedValues: ["BlockBlob", "PageBlob", "AppendBlob"],
                },
            },
            copyCompletedOn: {
                serializedName: "x-ms-copy-completion-time",
                xmlName: "x-ms-copy-completion-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyStatusDescription: {
                serializedName: "x-ms-copy-status-description",
                xmlName: "x-ms-copy-status-description",
                type: {
                    name: "String",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyProgress: {
                serializedName: "x-ms-copy-progress",
                xmlName: "x-ms-copy-progress",
                type: {
                    name: "String",
                },
            },
            copySource: {
                serializedName: "x-ms-copy-source",
                xmlName: "x-ms-copy-source",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "x-ms-copy-status",
                xmlName: "x-ms-copy-status",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            isIncrementalCopy: {
                serializedName: "x-ms-incremental-copy",
                xmlName: "x-ms-incremental-copy",
                type: {
                    name: "Boolean",
                },
            },
            destinationSnapshot: {
                serializedName: "x-ms-copy-destination-snapshot",
                xmlName: "x-ms-copy-destination-snapshot",
                type: {
                    name: "String",
                },
            },
            leaseDuration: {
                serializedName: "x-ms-lease-duration",
                xmlName: "x-ms-lease-duration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            leaseState: {
                serializedName: "x-ms-lease-state",
                xmlName: "x-ms-lease-state",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseStatus: {
                serializedName: "x-ms-lease-status",
                xmlName: "x-ms-lease-status",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            contentLength: {
                serializedName: "content-length",
                xmlName: "content-length",
                type: {
                    name: "Number",
                },
            },
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            contentEncoding: {
                serializedName: "content-encoding",
                xmlName: "content-encoding",
                type: {
                    name: "String",
                },
            },
            contentDisposition: {
                serializedName: "content-disposition",
                xmlName: "content-disposition",
                type: {
                    name: "String",
                },
            },
            contentLanguage: {
                serializedName: "content-language",
                xmlName: "content-language",
                type: {
                    name: "String",
                },
            },
            cacheControl: {
                serializedName: "cache-control",
                xmlName: "cache-control",
                type: {
                    name: "String",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            acceptRanges: {
                serializedName: "accept-ranges",
                xmlName: "accept-ranges",
                type: {
                    name: "String",
                },
            },
            blobCommittedBlockCount: {
                serializedName: "x-ms-blob-committed-block-count",
                xmlName: "x-ms-blob-committed-block-count",
                type: {
                    name: "Number",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-server-encrypted",
                xmlName: "x-ms-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            accessTier: {
                serializedName: "x-ms-access-tier",
                xmlName: "x-ms-access-tier",
                type: {
                    name: "String",
                },
            },
            accessTierInferred: {
                serializedName: "x-ms-access-tier-inferred",
                xmlName: "x-ms-access-tier-inferred",
                type: {
                    name: "Boolean",
                },
            },
            archiveStatus: {
                serializedName: "x-ms-archive-status",
                xmlName: "x-ms-archive-status",
                type: {
                    name: "String",
                },
            },
            accessTierChangedOn: {
                serializedName: "x-ms-access-tier-change-time",
                xmlName: "x-ms-access-tier-change-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            isCurrentVersion: {
                serializedName: "x-ms-is-current-version",
                xmlName: "x-ms-is-current-version",
                type: {
                    name: "Boolean",
                },
            },
            tagCount: {
                serializedName: "x-ms-tag-count",
                xmlName: "x-ms-tag-count",
                type: {
                    name: "Number",
                },
            },
            expiresOn: {
                serializedName: "x-ms-expiry-time",
                xmlName: "x-ms-expiry-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isSealed: {
                serializedName: "x-ms-blob-sealed",
                xmlName: "x-ms-blob-sealed",
                type: {
                    name: "Boolean",
                },
            },
            rehydratePriority: {
                serializedName: "x-ms-rehydrate-priority",
                xmlName: "x-ms-rehydrate-priority",
                type: {
                    name: "Enum",
                    allowedValues: ["High", "Standard"],
                },
            },
            lastAccessed: {
                serializedName: "x-ms-last-access-time",
                xmlName: "x-ms-last-access-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyExpiresOn: {
                serializedName: "x-ms-immutability-policy-until-date",
                xmlName: "x-ms-immutability-policy-until-date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyMode: {
                serializedName: "x-ms-immutability-policy-mode",
                xmlName: "x-ms-immutability-policy-mode",
                type: {
                    name: "Enum",
                    allowedValues: ["Mutable", "Unlocked", "Locked"],
                },
            },
            legalHold: {
                serializedName: "x-ms-legal-hold",
                xmlName: "x-ms-legal-hold",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobGetPropertiesExceptionHeaders = {
    serializedName: "Blob_getPropertiesExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobGetPropertiesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobDeleteHeaders = {
    serializedName: "Blob_deleteHeaders",
    type: {
        name: "Composite",
        className: "BlobDeleteHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobDeleteExceptionHeaders = {
    serializedName: "Blob_deleteExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobDeleteExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobUndeleteHeaders = {
    serializedName: "Blob_undeleteHeaders",
    type: {
        name: "Composite",
        className: "BlobUndeleteHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobUndeleteExceptionHeaders = {
    serializedName: "Blob_undeleteExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobUndeleteExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetExpiryHeaders = {
    serializedName: "Blob_setExpiryHeaders",
    type: {
        name: "Composite",
        className: "BlobSetExpiryHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobSetExpiryExceptionHeaders = {
    serializedName: "Blob_setExpiryExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetExpiryExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetHttpHeadersHeaders = {
    serializedName: "Blob_setHttpHeadersHeaders",
    type: {
        name: "Composite",
        className: "BlobSetHttpHeadersHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetHttpHeadersExceptionHeaders = {
    serializedName: "Blob_setHttpHeadersExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetHttpHeadersExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetImmutabilityPolicyHeaders = {
    serializedName: "Blob_setImmutabilityPolicyHeaders",
    type: {
        name: "Composite",
        className: "BlobSetImmutabilityPolicyHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyExpiry: {
                serializedName: "x-ms-immutability-policy-until-date",
                xmlName: "x-ms-immutability-policy-until-date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            immutabilityPolicyMode: {
                serializedName: "x-ms-immutability-policy-mode",
                xmlName: "x-ms-immutability-policy-mode",
                type: {
                    name: "Enum",
                    allowedValues: ["Mutable", "Unlocked", "Locked"],
                },
            },
        },
    },
};
const BlobSetImmutabilityPolicyExceptionHeaders = {
    serializedName: "Blob_setImmutabilityPolicyExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetImmutabilityPolicyExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobDeleteImmutabilityPolicyHeaders = {
    serializedName: "Blob_deleteImmutabilityPolicyHeaders",
    type: {
        name: "Composite",
        className: "BlobDeleteImmutabilityPolicyHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobDeleteImmutabilityPolicyExceptionHeaders = {
    serializedName: "Blob_deleteImmutabilityPolicyExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobDeleteImmutabilityPolicyExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetLegalHoldHeaders = {
    serializedName: "Blob_setLegalHoldHeaders",
    type: {
        name: "Composite",
        className: "BlobSetLegalHoldHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            legalHold: {
                serializedName: "x-ms-legal-hold",
                xmlName: "x-ms-legal-hold",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const BlobSetLegalHoldExceptionHeaders = {
    serializedName: "Blob_setLegalHoldExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetLegalHoldExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetMetadataHeaders = {
    serializedName: "Blob_setMetadataHeaders",
    type: {
        name: "Composite",
        className: "BlobSetMetadataHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetMetadataExceptionHeaders = {
    serializedName: "Blob_setMetadataExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetMetadataExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobAcquireLeaseHeaders = {
    serializedName: "Blob_acquireLeaseHeaders",
    type: {
        name: "Composite",
        className: "BlobAcquireLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobAcquireLeaseExceptionHeaders = {
    serializedName: "Blob_acquireLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobAcquireLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobReleaseLeaseHeaders = {
    serializedName: "Blob_releaseLeaseHeaders",
    type: {
        name: "Composite",
        className: "BlobReleaseLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobReleaseLeaseExceptionHeaders = {
    serializedName: "Blob_releaseLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobReleaseLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobRenewLeaseHeaders = {
    serializedName: "Blob_renewLeaseHeaders",
    type: {
        name: "Composite",
        className: "BlobRenewLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobRenewLeaseExceptionHeaders = {
    serializedName: "Blob_renewLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobRenewLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobChangeLeaseHeaders = {
    serializedName: "Blob_changeLeaseHeaders",
    type: {
        name: "Composite",
        className: "BlobChangeLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            leaseId: {
                serializedName: "x-ms-lease-id",
                xmlName: "x-ms-lease-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobChangeLeaseExceptionHeaders = {
    serializedName: "Blob_changeLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobChangeLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobBreakLeaseHeaders = {
    serializedName: "Blob_breakLeaseHeaders",
    type: {
        name: "Composite",
        className: "BlobBreakLeaseHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            leaseTime: {
                serializedName: "x-ms-lease-time",
                xmlName: "x-ms-lease-time",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
        },
    },
};
const BlobBreakLeaseExceptionHeaders = {
    serializedName: "Blob_breakLeaseExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobBreakLeaseExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobCreateSnapshotHeaders = {
    serializedName: "Blob_createSnapshotHeaders",
    type: {
        name: "Composite",
        className: "BlobCreateSnapshotHeaders",
        modelProperties: {
            snapshot: {
                serializedName: "x-ms-snapshot",
                xmlName: "x-ms-snapshot",
                type: {
                    name: "String",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobCreateSnapshotExceptionHeaders = {
    serializedName: "Blob_createSnapshotExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobCreateSnapshotExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobStartCopyFromURLHeaders = {
    serializedName: "Blob_startCopyFromURLHeaders",
    type: {
        name: "Composite",
        className: "BlobStartCopyFromURLHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "x-ms-copy-status",
                xmlName: "x-ms-copy-status",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobStartCopyFromURLExceptionHeaders = {
    serializedName: "Blob_startCopyFromURLExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobStartCopyFromURLExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobCopyFromURLHeaders = {
    serializedName: "Blob_copyFromURLHeaders",
    type: {
        name: "Composite",
        className: "BlobCopyFromURLHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                defaultValue: "success",
                isConstant: true,
                serializedName: "x-ms-copy-status",
                type: {
                    name: "String",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobCopyFromURLExceptionHeaders = {
    serializedName: "Blob_copyFromURLExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobCopyFromURLExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobAbortCopyFromURLHeaders = {
    serializedName: "Blob_abortCopyFromURLHeaders",
    type: {
        name: "Composite",
        className: "BlobAbortCopyFromURLHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobAbortCopyFromURLExceptionHeaders = {
    serializedName: "Blob_abortCopyFromURLExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobAbortCopyFromURLExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetTierHeaders = {
    serializedName: "Blob_setTierHeaders",
    type: {
        name: "Composite",
        className: "BlobSetTierHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetTierExceptionHeaders = {
    serializedName: "Blob_setTierExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetTierExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobGetAccountInfoHeaders = {
    serializedName: "Blob_getAccountInfoHeaders",
    type: {
        name: "Composite",
        className: "BlobGetAccountInfoHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            skuName: {
                serializedName: "x-ms-sku-name",
                xmlName: "x-ms-sku-name",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Standard_LRS",
                        "Standard_GRS",
                        "Standard_RAGRS",
                        "Standard_ZRS",
                        "Premium_LRS",
                    ],
                },
            },
            accountKind: {
                serializedName: "x-ms-account-kind",
                xmlName: "x-ms-account-kind",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "Storage",
                        "BlobStorage",
                        "StorageV2",
                        "FileStorage",
                        "BlockBlobStorage",
                    ],
                },
            },
            isHierarchicalNamespaceEnabled: {
                serializedName: "x-ms-is-hns-enabled",
                xmlName: "x-ms-is-hns-enabled",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const BlobGetAccountInfoExceptionHeaders = {
    serializedName: "Blob_getAccountInfoExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobGetAccountInfoExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobQueryHeaders = {
    serializedName: "Blob_queryHeaders",
    type: {
        name: "Composite",
        className: "BlobQueryHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            metadata: {
                serializedName: "x-ms-meta",
                headerCollectionPrefix: "x-ms-meta-",
                xmlName: "x-ms-meta",
                type: {
                    name: "Dictionary",
                    value: { type: { name: "String" } },
                },
            },
            contentLength: {
                serializedName: "content-length",
                xmlName: "content-length",
                type: {
                    name: "Number",
                },
            },
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            contentRange: {
                serializedName: "content-range",
                xmlName: "content-range",
                type: {
                    name: "String",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            contentEncoding: {
                serializedName: "content-encoding",
                xmlName: "content-encoding",
                type: {
                    name: "String",
                },
            },
            cacheControl: {
                serializedName: "cache-control",
                xmlName: "cache-control",
                type: {
                    name: "String",
                },
            },
            contentDisposition: {
                serializedName: "content-disposition",
                xmlName: "content-disposition",
                type: {
                    name: "String",
                },
            },
            contentLanguage: {
                serializedName: "content-language",
                xmlName: "content-language",
                type: {
                    name: "String",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            blobType: {
                serializedName: "x-ms-blob-type",
                xmlName: "x-ms-blob-type",
                type: {
                    name: "Enum",
                    allowedValues: ["BlockBlob", "PageBlob", "AppendBlob"],
                },
            },
            copyCompletionTime: {
                serializedName: "x-ms-copy-completion-time",
                xmlName: "x-ms-copy-completion-time",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyStatusDescription: {
                serializedName: "x-ms-copy-status-description",
                xmlName: "x-ms-copy-status-description",
                type: {
                    name: "String",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyProgress: {
                serializedName: "x-ms-copy-progress",
                xmlName: "x-ms-copy-progress",
                type: {
                    name: "String",
                },
            },
            copySource: {
                serializedName: "x-ms-copy-source",
                xmlName: "x-ms-copy-source",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "x-ms-copy-status",
                xmlName: "x-ms-copy-status",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            leaseDuration: {
                serializedName: "x-ms-lease-duration",
                xmlName: "x-ms-lease-duration",
                type: {
                    name: "Enum",
                    allowedValues: ["infinite", "fixed"],
                },
            },
            leaseState: {
                serializedName: "x-ms-lease-state",
                xmlName: "x-ms-lease-state",
                type: {
                    name: "Enum",
                    allowedValues: [
                        "available",
                        "leased",
                        "expired",
                        "breaking",
                        "broken",
                    ],
                },
            },
            leaseStatus: {
                serializedName: "x-ms-lease-status",
                xmlName: "x-ms-lease-status",
                type: {
                    name: "Enum",
                    allowedValues: ["locked", "unlocked"],
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            acceptRanges: {
                serializedName: "accept-ranges",
                xmlName: "accept-ranges",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobCommittedBlockCount: {
                serializedName: "x-ms-blob-committed-block-count",
                xmlName: "x-ms-blob-committed-block-count",
                type: {
                    name: "Number",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-server-encrypted",
                xmlName: "x-ms-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            blobContentMD5: {
                serializedName: "x-ms-blob-content-md5",
                xmlName: "x-ms-blob-content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
            contentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
        },
    },
};
const BlobQueryExceptionHeaders = {
    serializedName: "Blob_queryExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobQueryExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobGetTagsHeaders = {
    serializedName: "Blob_getTagsHeaders",
    type: {
        name: "Composite",
        className: "BlobGetTagsHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobGetTagsExceptionHeaders = {
    serializedName: "Blob_getTagsExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobGetTagsExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetTagsHeaders = {
    serializedName: "Blob_setTagsHeaders",
    type: {
        name: "Composite",
        className: "BlobSetTagsHeaders",
        modelProperties: {
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlobSetTagsExceptionHeaders = {
    serializedName: "Blob_setTagsExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlobSetTagsExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobCreateHeaders = {
    serializedName: "PageBlob_createHeaders",
    type: {
        name: "Composite",
        className: "PageBlobCreateHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobCreateExceptionHeaders = {
    serializedName: "PageBlob_createExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobCreateExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUploadPagesHeaders = {
    serializedName: "PageBlob_uploadPagesHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUploadPagesHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUploadPagesExceptionHeaders = {
    serializedName: "PageBlob_uploadPagesExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUploadPagesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobClearPagesHeaders = {
    serializedName: "PageBlob_clearPagesHeaders",
    type: {
        name: "Composite",
        className: "PageBlobClearPagesHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobClearPagesExceptionHeaders = {
    serializedName: "PageBlob_clearPagesExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobClearPagesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUploadPagesFromURLHeaders = {
    serializedName: "PageBlob_uploadPagesFromURLHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUploadPagesFromURLHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUploadPagesFromURLExceptionHeaders = {
    serializedName: "PageBlob_uploadPagesFromURLExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUploadPagesFromURLExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobGetPageRangesHeaders = {
    serializedName: "PageBlob_getPageRangesHeaders",
    type: {
        name: "Composite",
        className: "PageBlobGetPageRangesHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            blobContentLength: {
                serializedName: "x-ms-blob-content-length",
                xmlName: "x-ms-blob-content-length",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobGetPageRangesExceptionHeaders = {
    serializedName: "PageBlob_getPageRangesExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobGetPageRangesExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobGetPageRangesDiffHeaders = {
    serializedName: "PageBlob_getPageRangesDiffHeaders",
    type: {
        name: "Composite",
        className: "PageBlobGetPageRangesDiffHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            blobContentLength: {
                serializedName: "x-ms-blob-content-length",
                xmlName: "x-ms-blob-content-length",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobGetPageRangesDiffExceptionHeaders = {
    serializedName: "PageBlob_getPageRangesDiffExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobGetPageRangesDiffExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobResizeHeaders = {
    serializedName: "PageBlob_resizeHeaders",
    type: {
        name: "Composite",
        className: "PageBlobResizeHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobResizeExceptionHeaders = {
    serializedName: "PageBlob_resizeExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobResizeExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUpdateSequenceNumberHeaders = {
    serializedName: "PageBlob_updateSequenceNumberHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUpdateSequenceNumberHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobSequenceNumber: {
                serializedName: "x-ms-blob-sequence-number",
                xmlName: "x-ms-blob-sequence-number",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobUpdateSequenceNumberExceptionHeaders = {
    serializedName: "PageBlob_updateSequenceNumberExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobUpdateSequenceNumberExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobCopyIncrementalHeaders = {
    serializedName: "PageBlob_copyIncrementalHeaders",
    type: {
        name: "Composite",
        className: "PageBlobCopyIncrementalHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            copyId: {
                serializedName: "x-ms-copy-id",
                xmlName: "x-ms-copy-id",
                type: {
                    name: "String",
                },
            },
            copyStatus: {
                serializedName: "x-ms-copy-status",
                xmlName: "x-ms-copy-status",
                type: {
                    name: "Enum",
                    allowedValues: ["pending", "success", "aborted", "failed"],
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const PageBlobCopyIncrementalExceptionHeaders = {
    serializedName: "PageBlob_copyIncrementalExceptionHeaders",
    type: {
        name: "Composite",
        className: "PageBlobCopyIncrementalExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobCreateHeaders = {
    serializedName: "AppendBlob_createHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobCreateHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobCreateExceptionHeaders = {
    serializedName: "AppendBlob_createExceptionHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobCreateExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobAppendBlockHeaders = {
    serializedName: "AppendBlob_appendBlockHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobAppendBlockHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobAppendOffset: {
                serializedName: "x-ms-blob-append-offset",
                xmlName: "x-ms-blob-append-offset",
                type: {
                    name: "String",
                },
            },
            blobCommittedBlockCount: {
                serializedName: "x-ms-blob-committed-block-count",
                xmlName: "x-ms-blob-committed-block-count",
                type: {
                    name: "Number",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobAppendBlockExceptionHeaders = {
    serializedName: "AppendBlob_appendBlockExceptionHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobAppendBlockExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobAppendBlockFromUrlHeaders = {
    serializedName: "AppendBlob_appendBlockFromUrlHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobAppendBlockFromUrlHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            blobAppendOffset: {
                serializedName: "x-ms-blob-append-offset",
                xmlName: "x-ms-blob-append-offset",
                type: {
                    name: "String",
                },
            },
            blobCommittedBlockCount: {
                serializedName: "x-ms-blob-committed-block-count",
                xmlName: "x-ms-blob-committed-block-count",
                type: {
                    name: "Number",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobAppendBlockFromUrlExceptionHeaders = {
    serializedName: "AppendBlob_appendBlockFromUrlExceptionHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobAppendBlockFromUrlExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const AppendBlobSealHeaders = {
    serializedName: "AppendBlob_sealHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobSealHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isSealed: {
                serializedName: "x-ms-blob-sealed",
                xmlName: "x-ms-blob-sealed",
                type: {
                    name: "Boolean",
                },
            },
        },
    },
};
const AppendBlobSealExceptionHeaders = {
    serializedName: "AppendBlob_sealExceptionHeaders",
    type: {
        name: "Composite",
        className: "AppendBlobSealExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobUploadHeaders = {
    serializedName: "BlockBlob_uploadHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobUploadHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobUploadExceptionHeaders = {
    serializedName: "BlockBlob_uploadExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobUploadExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobPutBlobFromUrlHeaders = {
    serializedName: "BlockBlob_putBlobFromUrlHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobPutBlobFromUrlHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobPutBlobFromUrlExceptionHeaders = {
    serializedName: "BlockBlob_putBlobFromUrlExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobPutBlobFromUrlExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobStageBlockHeaders = {
    serializedName: "BlockBlob_stageBlockHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobStageBlockHeaders",
        modelProperties: {
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobStageBlockExceptionHeaders = {
    serializedName: "BlockBlob_stageBlockExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobStageBlockExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobStageBlockFromURLHeaders = {
    serializedName: "BlockBlob_stageBlockFromURLHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobStageBlockFromURLHeaders",
        modelProperties: {
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobStageBlockFromURLExceptionHeaders = {
    serializedName: "BlockBlob_stageBlockFromURLExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobStageBlockFromURLExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobCommitBlockListHeaders = {
    serializedName: "BlockBlob_commitBlockListHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobCommitBlockListHeaders",
        modelProperties: {
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            contentMD5: {
                serializedName: "content-md5",
                xmlName: "content-md5",
                type: {
                    name: "ByteArray",
                },
            },
            xMsContentCrc64: {
                serializedName: "x-ms-content-crc64",
                xmlName: "x-ms-content-crc64",
                type: {
                    name: "ByteArray",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            versionId: {
                serializedName: "x-ms-version-id",
                xmlName: "x-ms-version-id",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            isServerEncrypted: {
                serializedName: "x-ms-request-server-encrypted",
                xmlName: "x-ms-request-server-encrypted",
                type: {
                    name: "Boolean",
                },
            },
            encryptionKeySha256: {
                serializedName: "x-ms-encryption-key-sha256",
                xmlName: "x-ms-encryption-key-sha256",
                type: {
                    name: "String",
                },
            },
            encryptionScope: {
                serializedName: "x-ms-encryption-scope",
                xmlName: "x-ms-encryption-scope",
                type: {
                    name: "String",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobCommitBlockListExceptionHeaders = {
    serializedName: "BlockBlob_commitBlockListExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobCommitBlockListExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobGetBlockListHeaders = {
    serializedName: "BlockBlob_getBlockListHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobGetBlockListHeaders",
        modelProperties: {
            lastModified: {
                serializedName: "last-modified",
                xmlName: "last-modified",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            etag: {
                serializedName: "etag",
                xmlName: "etag",
                type: {
                    name: "String",
                },
            },
            contentType: {
                serializedName: "content-type",
                xmlName: "content-type",
                type: {
                    name: "String",
                },
            },
            blobContentLength: {
                serializedName: "x-ms-blob-content-length",
                xmlName: "x-ms-blob-content-length",
                type: {
                    name: "Number",
                },
            },
            clientRequestId: {
                serializedName: "x-ms-client-request-id",
                xmlName: "x-ms-client-request-id",
                type: {
                    name: "String",
                },
            },
            requestId: {
                serializedName: "x-ms-request-id",
                xmlName: "x-ms-request-id",
                type: {
                    name: "String",
                },
            },
            version: {
                serializedName: "x-ms-version",
                xmlName: "x-ms-version",
                type: {
                    name: "String",
                },
            },
            date: {
                serializedName: "date",
                xmlName: "date",
                type: {
                    name: "DateTimeRfc1123",
                },
            },
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};
const BlockBlobGetBlockListExceptionHeaders = {
    serializedName: "BlockBlob_getBlockListExceptionHeaders",
    type: {
        name: "Composite",
        className: "BlockBlobGetBlockListExceptionHeaders",
        modelProperties: {
            errorCode: {
                serializedName: "x-ms-error-code",
                xmlName: "x-ms-error-code",
                type: {
                    name: "String",
                },
            },
        },
    },
};

var Mappers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AccessPolicy: AccessPolicy,
    AppendBlobAppendBlockExceptionHeaders: AppendBlobAppendBlockExceptionHeaders,
    AppendBlobAppendBlockFromUrlExceptionHeaders: AppendBlobAppendBlockFromUrlExceptionHeaders,
    AppendBlobAppendBlockFromUrlHeaders: AppendBlobAppendBlockFromUrlHeaders,
    AppendBlobAppendBlockHeaders: AppendBlobAppendBlockHeaders,
    AppendBlobCreateExceptionHeaders: AppendBlobCreateExceptionHeaders,
    AppendBlobCreateHeaders: AppendBlobCreateHeaders,
    AppendBlobSealExceptionHeaders: AppendBlobSealExceptionHeaders,
    AppendBlobSealHeaders: AppendBlobSealHeaders,
    ArrowConfiguration: ArrowConfiguration,
    ArrowField: ArrowField,
    BlobAbortCopyFromURLExceptionHeaders: BlobAbortCopyFromURLExceptionHeaders,
    BlobAbortCopyFromURLHeaders: BlobAbortCopyFromURLHeaders,
    BlobAcquireLeaseExceptionHeaders: BlobAcquireLeaseExceptionHeaders,
    BlobAcquireLeaseHeaders: BlobAcquireLeaseHeaders,
    BlobBreakLeaseExceptionHeaders: BlobBreakLeaseExceptionHeaders,
    BlobBreakLeaseHeaders: BlobBreakLeaseHeaders,
    BlobChangeLeaseExceptionHeaders: BlobChangeLeaseExceptionHeaders,
    BlobChangeLeaseHeaders: BlobChangeLeaseHeaders,
    BlobCopyFromURLExceptionHeaders: BlobCopyFromURLExceptionHeaders,
    BlobCopyFromURLHeaders: BlobCopyFromURLHeaders,
    BlobCreateSnapshotExceptionHeaders: BlobCreateSnapshotExceptionHeaders,
    BlobCreateSnapshotHeaders: BlobCreateSnapshotHeaders,
    BlobDeleteExceptionHeaders: BlobDeleteExceptionHeaders,
    BlobDeleteHeaders: BlobDeleteHeaders,
    BlobDeleteImmutabilityPolicyExceptionHeaders: BlobDeleteImmutabilityPolicyExceptionHeaders,
    BlobDeleteImmutabilityPolicyHeaders: BlobDeleteImmutabilityPolicyHeaders,
    BlobDownloadExceptionHeaders: BlobDownloadExceptionHeaders,
    BlobDownloadHeaders: BlobDownloadHeaders,
    BlobFlatListSegment: BlobFlatListSegment,
    BlobGetAccountInfoExceptionHeaders: BlobGetAccountInfoExceptionHeaders,
    BlobGetAccountInfoHeaders: BlobGetAccountInfoHeaders,
    BlobGetPropertiesExceptionHeaders: BlobGetPropertiesExceptionHeaders,
    BlobGetPropertiesHeaders: BlobGetPropertiesHeaders,
    BlobGetTagsExceptionHeaders: BlobGetTagsExceptionHeaders,
    BlobGetTagsHeaders: BlobGetTagsHeaders,
    BlobHierarchyListSegment: BlobHierarchyListSegment,
    BlobItemInternal: BlobItemInternal,
    BlobName: BlobName,
    BlobPrefix: BlobPrefix,
    BlobPropertiesInternal: BlobPropertiesInternal,
    BlobQueryExceptionHeaders: BlobQueryExceptionHeaders,
    BlobQueryHeaders: BlobQueryHeaders,
    BlobReleaseLeaseExceptionHeaders: BlobReleaseLeaseExceptionHeaders,
    BlobReleaseLeaseHeaders: BlobReleaseLeaseHeaders,
    BlobRenewLeaseExceptionHeaders: BlobRenewLeaseExceptionHeaders,
    BlobRenewLeaseHeaders: BlobRenewLeaseHeaders,
    BlobServiceProperties: BlobServiceProperties,
    BlobServiceStatistics: BlobServiceStatistics,
    BlobSetExpiryExceptionHeaders: BlobSetExpiryExceptionHeaders,
    BlobSetExpiryHeaders: BlobSetExpiryHeaders,
    BlobSetHttpHeadersExceptionHeaders: BlobSetHttpHeadersExceptionHeaders,
    BlobSetHttpHeadersHeaders: BlobSetHttpHeadersHeaders,
    BlobSetImmutabilityPolicyExceptionHeaders: BlobSetImmutabilityPolicyExceptionHeaders,
    BlobSetImmutabilityPolicyHeaders: BlobSetImmutabilityPolicyHeaders,
    BlobSetLegalHoldExceptionHeaders: BlobSetLegalHoldExceptionHeaders,
    BlobSetLegalHoldHeaders: BlobSetLegalHoldHeaders,
    BlobSetMetadataExceptionHeaders: BlobSetMetadataExceptionHeaders,
    BlobSetMetadataHeaders: BlobSetMetadataHeaders,
    BlobSetTagsExceptionHeaders: BlobSetTagsExceptionHeaders,
    BlobSetTagsHeaders: BlobSetTagsHeaders,
    BlobSetTierExceptionHeaders: BlobSetTierExceptionHeaders,
    BlobSetTierHeaders: BlobSetTierHeaders,
    BlobStartCopyFromURLExceptionHeaders: BlobStartCopyFromURLExceptionHeaders,
    BlobStartCopyFromURLHeaders: BlobStartCopyFromURLHeaders,
    BlobTag: BlobTag,
    BlobTags: BlobTags,
    BlobUndeleteExceptionHeaders: BlobUndeleteExceptionHeaders,
    BlobUndeleteHeaders: BlobUndeleteHeaders,
    Block: Block,
    BlockBlobCommitBlockListExceptionHeaders: BlockBlobCommitBlockListExceptionHeaders,
    BlockBlobCommitBlockListHeaders: BlockBlobCommitBlockListHeaders,
    BlockBlobGetBlockListExceptionHeaders: BlockBlobGetBlockListExceptionHeaders,
    BlockBlobGetBlockListHeaders: BlockBlobGetBlockListHeaders,
    BlockBlobPutBlobFromUrlExceptionHeaders: BlockBlobPutBlobFromUrlExceptionHeaders,
    BlockBlobPutBlobFromUrlHeaders: BlockBlobPutBlobFromUrlHeaders,
    BlockBlobStageBlockExceptionHeaders: BlockBlobStageBlockExceptionHeaders,
    BlockBlobStageBlockFromURLExceptionHeaders: BlockBlobStageBlockFromURLExceptionHeaders,
    BlockBlobStageBlockFromURLHeaders: BlockBlobStageBlockFromURLHeaders,
    BlockBlobStageBlockHeaders: BlockBlobStageBlockHeaders,
    BlockBlobUploadExceptionHeaders: BlockBlobUploadExceptionHeaders,
    BlockBlobUploadHeaders: BlockBlobUploadHeaders,
    BlockList: BlockList,
    BlockLookupList: BlockLookupList,
    ClearRange: ClearRange,
    ContainerAcquireLeaseExceptionHeaders: ContainerAcquireLeaseExceptionHeaders,
    ContainerAcquireLeaseHeaders: ContainerAcquireLeaseHeaders,
    ContainerBreakLeaseExceptionHeaders: ContainerBreakLeaseExceptionHeaders,
    ContainerBreakLeaseHeaders: ContainerBreakLeaseHeaders,
    ContainerChangeLeaseExceptionHeaders: ContainerChangeLeaseExceptionHeaders,
    ContainerChangeLeaseHeaders: ContainerChangeLeaseHeaders,
    ContainerCreateExceptionHeaders: ContainerCreateExceptionHeaders,
    ContainerCreateHeaders: ContainerCreateHeaders,
    ContainerDeleteExceptionHeaders: ContainerDeleteExceptionHeaders,
    ContainerDeleteHeaders: ContainerDeleteHeaders,
    ContainerFilterBlobsExceptionHeaders: ContainerFilterBlobsExceptionHeaders,
    ContainerFilterBlobsHeaders: ContainerFilterBlobsHeaders,
    ContainerGetAccessPolicyExceptionHeaders: ContainerGetAccessPolicyExceptionHeaders,
    ContainerGetAccessPolicyHeaders: ContainerGetAccessPolicyHeaders,
    ContainerGetAccountInfoExceptionHeaders: ContainerGetAccountInfoExceptionHeaders,
    ContainerGetAccountInfoHeaders: ContainerGetAccountInfoHeaders,
    ContainerGetPropertiesExceptionHeaders: ContainerGetPropertiesExceptionHeaders,
    ContainerGetPropertiesHeaders: ContainerGetPropertiesHeaders,
    ContainerItem: ContainerItem,
    ContainerListBlobFlatSegmentExceptionHeaders: ContainerListBlobFlatSegmentExceptionHeaders,
    ContainerListBlobFlatSegmentHeaders: ContainerListBlobFlatSegmentHeaders,
    ContainerListBlobHierarchySegmentExceptionHeaders: ContainerListBlobHierarchySegmentExceptionHeaders,
    ContainerListBlobHierarchySegmentHeaders: ContainerListBlobHierarchySegmentHeaders,
    ContainerProperties: ContainerProperties,
    ContainerReleaseLeaseExceptionHeaders: ContainerReleaseLeaseExceptionHeaders,
    ContainerReleaseLeaseHeaders: ContainerReleaseLeaseHeaders,
    ContainerRenameExceptionHeaders: ContainerRenameExceptionHeaders,
    ContainerRenameHeaders: ContainerRenameHeaders,
    ContainerRenewLeaseExceptionHeaders: ContainerRenewLeaseExceptionHeaders,
    ContainerRenewLeaseHeaders: ContainerRenewLeaseHeaders,
    ContainerRestoreExceptionHeaders: ContainerRestoreExceptionHeaders,
    ContainerRestoreHeaders: ContainerRestoreHeaders,
    ContainerSetAccessPolicyExceptionHeaders: ContainerSetAccessPolicyExceptionHeaders,
    ContainerSetAccessPolicyHeaders: ContainerSetAccessPolicyHeaders,
    ContainerSetMetadataExceptionHeaders: ContainerSetMetadataExceptionHeaders,
    ContainerSetMetadataHeaders: ContainerSetMetadataHeaders,
    ContainerSubmitBatchExceptionHeaders: ContainerSubmitBatchExceptionHeaders,
    ContainerSubmitBatchHeaders: ContainerSubmitBatchHeaders,
    CorsRule: CorsRule,
    DelimitedTextConfiguration: DelimitedTextConfiguration,
    FilterBlobItem: FilterBlobItem,
    FilterBlobSegment: FilterBlobSegment,
    GeoReplication: GeoReplication,
    JsonTextConfiguration: JsonTextConfiguration,
    KeyInfo: KeyInfo,
    ListBlobsFlatSegmentResponse: ListBlobsFlatSegmentResponse,
    ListBlobsHierarchySegmentResponse: ListBlobsHierarchySegmentResponse,
    ListContainersSegmentResponse: ListContainersSegmentResponse,
    Logging: Logging,
    Metrics: Metrics,
    PageBlobClearPagesExceptionHeaders: PageBlobClearPagesExceptionHeaders,
    PageBlobClearPagesHeaders: PageBlobClearPagesHeaders,
    PageBlobCopyIncrementalExceptionHeaders: PageBlobCopyIncrementalExceptionHeaders,
    PageBlobCopyIncrementalHeaders: PageBlobCopyIncrementalHeaders,
    PageBlobCreateExceptionHeaders: PageBlobCreateExceptionHeaders,
    PageBlobCreateHeaders: PageBlobCreateHeaders,
    PageBlobGetPageRangesDiffExceptionHeaders: PageBlobGetPageRangesDiffExceptionHeaders,
    PageBlobGetPageRangesDiffHeaders: PageBlobGetPageRangesDiffHeaders,
    PageBlobGetPageRangesExceptionHeaders: PageBlobGetPageRangesExceptionHeaders,
    PageBlobGetPageRangesHeaders: PageBlobGetPageRangesHeaders,
    PageBlobResizeExceptionHeaders: PageBlobResizeExceptionHeaders,
    PageBlobResizeHeaders: PageBlobResizeHeaders,
    PageBlobUpdateSequenceNumberExceptionHeaders: PageBlobUpdateSequenceNumberExceptionHeaders,
    PageBlobUpdateSequenceNumberHeaders: PageBlobUpdateSequenceNumberHeaders,
    PageBlobUploadPagesExceptionHeaders: PageBlobUploadPagesExceptionHeaders,
    PageBlobUploadPagesFromURLExceptionHeaders: PageBlobUploadPagesFromURLExceptionHeaders,
    PageBlobUploadPagesFromURLHeaders: PageBlobUploadPagesFromURLHeaders,
    PageBlobUploadPagesHeaders: PageBlobUploadPagesHeaders,
    PageList: PageList,
    PageRange: PageRange,
    QueryFormat: QueryFormat,
    QueryRequest: QueryRequest,
    QuerySerialization: QuerySerialization,
    RetentionPolicy: RetentionPolicy,
    ServiceFilterBlobsExceptionHeaders: ServiceFilterBlobsExceptionHeaders,
    ServiceFilterBlobsHeaders: ServiceFilterBlobsHeaders,
    ServiceGetAccountInfoExceptionHeaders: ServiceGetAccountInfoExceptionHeaders,
    ServiceGetAccountInfoHeaders: ServiceGetAccountInfoHeaders,
    ServiceGetPropertiesExceptionHeaders: ServiceGetPropertiesExceptionHeaders,
    ServiceGetPropertiesHeaders: ServiceGetPropertiesHeaders,
    ServiceGetStatisticsExceptionHeaders: ServiceGetStatisticsExceptionHeaders,
    ServiceGetStatisticsHeaders: ServiceGetStatisticsHeaders,
    ServiceGetUserDelegationKeyExceptionHeaders: ServiceGetUserDelegationKeyExceptionHeaders,
    ServiceGetUserDelegationKeyHeaders: ServiceGetUserDelegationKeyHeaders,
    ServiceListContainersSegmentExceptionHeaders: ServiceListContainersSegmentExceptionHeaders,
    ServiceListContainersSegmentHeaders: ServiceListContainersSegmentHeaders,
    ServiceSetPropertiesExceptionHeaders: ServiceSetPropertiesExceptionHeaders,
    ServiceSetPropertiesHeaders: ServiceSetPropertiesHeaders,
    ServiceSubmitBatchExceptionHeaders: ServiceSubmitBatchExceptionHeaders,
    ServiceSubmitBatchHeaders: ServiceSubmitBatchHeaders,
    SignedIdentifier: SignedIdentifier,
    StaticWebsite: StaticWebsite,
    StorageError: StorageError,
    UserDelegationKey: UserDelegationKey
});

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
const contentType = {
    parameterPath: ["options", "contentType"],
    mapper: {
        defaultValue: "application/xml",
        isConstant: true,
        serializedName: "Content-Type",
        type: {
            name: "String",
        },
    },
};
const blobServiceProperties = {
    parameterPath: "blobServiceProperties",
    mapper: BlobServiceProperties,
};
const accept = {
    parameterPath: "accept",
    mapper: {
        defaultValue: "application/xml",
        isConstant: true,
        serializedName: "Accept",
        type: {
            name: "String",
        },
    },
};
const url = {
    parameterPath: "url",
    mapper: {
        serializedName: "url",
        required: true,
        xmlName: "url",
        type: {
            name: "String",
        },
    },
    skipEncoding: true,
};
const restype = {
    parameterPath: "restype",
    mapper: {
        defaultValue: "service",
        isConstant: true,
        serializedName: "restype",
        type: {
            name: "String",
        },
    },
};
const comp = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "properties",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const timeoutInSeconds = {
    parameterPath: ["options", "timeoutInSeconds"],
    mapper: {
        constraints: {
            InclusiveMinimum: 0,
        },
        serializedName: "timeout",
        xmlName: "timeout",
        type: {
            name: "Number",
        },
    },
};
const version = {
    parameterPath: "version",
    mapper: {
        defaultValue: "2025-01-05",
        isConstant: true,
        serializedName: "x-ms-version",
        type: {
            name: "String",
        },
    },
};
const requestId = {
    parameterPath: ["options", "requestId"],
    mapper: {
        serializedName: "x-ms-client-request-id",
        xmlName: "x-ms-client-request-id",
        type: {
            name: "String",
        },
    },
};
const accept1 = {
    parameterPath: "accept",
    mapper: {
        defaultValue: "application/xml",
        isConstant: true,
        serializedName: "Accept",
        type: {
            name: "String",
        },
    },
};
const comp1 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "stats",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const comp2 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "list",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const prefix = {
    parameterPath: ["options", "prefix"],
    mapper: {
        serializedName: "prefix",
        xmlName: "prefix",
        type: {
            name: "String",
        },
    },
};
const marker = {
    parameterPath: ["options", "marker"],
    mapper: {
        serializedName: "marker",
        xmlName: "marker",
        type: {
            name: "String",
        },
    },
};
const maxPageSize = {
    parameterPath: ["options", "maxPageSize"],
    mapper: {
        constraints: {
            InclusiveMinimum: 1,
        },
        serializedName: "maxresults",
        xmlName: "maxresults",
        type: {
            name: "Number",
        },
    },
};
const include = {
    parameterPath: ["options", "include"],
    mapper: {
        serializedName: "include",
        xmlName: "include",
        xmlElementName: "ListContainersIncludeType",
        type: {
            name: "Sequence",
            element: {
                type: {
                    name: "Enum",
                    allowedValues: ["metadata", "deleted", "system"],
                },
            },
        },
    },
    collectionFormat: "CSV",
};
const keyInfo = {
    parameterPath: "keyInfo",
    mapper: KeyInfo,
};
const comp3 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "userdelegationkey",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const restype1 = {
    parameterPath: "restype",
    mapper: {
        defaultValue: "account",
        isConstant: true,
        serializedName: "restype",
        type: {
            name: "String",
        },
    },
};
const body = {
    parameterPath: "body",
    mapper: {
        serializedName: "body",
        required: true,
        xmlName: "body",
        type: {
            name: "Stream",
        },
    },
};
const comp4 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "batch",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const contentLength = {
    parameterPath: "contentLength",
    mapper: {
        serializedName: "Content-Length",
        required: true,
        xmlName: "Content-Length",
        type: {
            name: "Number",
        },
    },
};
const multipartContentType = {
    parameterPath: "multipartContentType",
    mapper: {
        serializedName: "Content-Type",
        required: true,
        xmlName: "Content-Type",
        type: {
            name: "String",
        },
    },
};
const comp5 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "blobs",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const where = {
    parameterPath: ["options", "where"],
    mapper: {
        serializedName: "where",
        xmlName: "where",
        type: {
            name: "String",
        },
    },
};
const restype2 = {
    parameterPath: "restype",
    mapper: {
        defaultValue: "container",
        isConstant: true,
        serializedName: "restype",
        type: {
            name: "String",
        },
    },
};
const metadata = {
    parameterPath: ["options", "metadata"],
    mapper: {
        serializedName: "x-ms-meta",
        xmlName: "x-ms-meta",
        headerCollectionPrefix: "x-ms-meta-",
        type: {
            name: "Dictionary",
            value: { type: { name: "String" } },
        },
    },
};
const access = {
    parameterPath: ["options", "access"],
    mapper: {
        serializedName: "x-ms-blob-public-access",
        xmlName: "x-ms-blob-public-access",
        type: {
            name: "Enum",
            allowedValues: ["container", "blob"],
        },
    },
};
const defaultEncryptionScope = {
    parameterPath: [
        "options",
        "containerEncryptionScope",
        "defaultEncryptionScope",
    ],
    mapper: {
        serializedName: "x-ms-default-encryption-scope",
        xmlName: "x-ms-default-encryption-scope",
        type: {
            name: "String",
        },
    },
};
const preventEncryptionScopeOverride = {
    parameterPath: [
        "options",
        "containerEncryptionScope",
        "preventEncryptionScopeOverride",
    ],
    mapper: {
        serializedName: "x-ms-deny-encryption-scope-override",
        xmlName: "x-ms-deny-encryption-scope-override",
        type: {
            name: "Boolean",
        },
    },
};
const leaseId = {
    parameterPath: ["options", "leaseAccessConditions", "leaseId"],
    mapper: {
        serializedName: "x-ms-lease-id",
        xmlName: "x-ms-lease-id",
        type: {
            name: "String",
        },
    },
};
const ifModifiedSince = {
    parameterPath: ["options", "modifiedAccessConditions", "ifModifiedSince"],
    mapper: {
        serializedName: "If-Modified-Since",
        xmlName: "If-Modified-Since",
        type: {
            name: "DateTimeRfc1123",
        },
    },
};
const ifUnmodifiedSince = {
    parameterPath: ["options", "modifiedAccessConditions", "ifUnmodifiedSince"],
    mapper: {
        serializedName: "If-Unmodified-Since",
        xmlName: "If-Unmodified-Since",
        type: {
            name: "DateTimeRfc1123",
        },
    },
};
const comp6 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "metadata",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const comp7 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "acl",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const containerAcl = {
    parameterPath: ["options", "containerAcl"],
    mapper: {
        serializedName: "containerAcl",
        xmlName: "SignedIdentifiers",
        xmlIsWrapped: true,
        xmlElementName: "SignedIdentifier",
        type: {
            name: "Sequence",
            element: {
                type: {
                    name: "Composite",
                    className: "SignedIdentifier",
                },
            },
        },
    },
};
const comp8 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "undelete",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const deletedContainerName = {
    parameterPath: ["options", "deletedContainerName"],
    mapper: {
        serializedName: "x-ms-deleted-container-name",
        xmlName: "x-ms-deleted-container-name",
        type: {
            name: "String",
        },
    },
};
const deletedContainerVersion = {
    parameterPath: ["options", "deletedContainerVersion"],
    mapper: {
        serializedName: "x-ms-deleted-container-version",
        xmlName: "x-ms-deleted-container-version",
        type: {
            name: "String",
        },
    },
};
const comp9 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "rename",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const sourceContainerName = {
    parameterPath: "sourceContainerName",
    mapper: {
        serializedName: "x-ms-source-container-name",
        required: true,
        xmlName: "x-ms-source-container-name",
        type: {
            name: "String",
        },
    },
};
const sourceLeaseId = {
    parameterPath: ["options", "sourceLeaseId"],
    mapper: {
        serializedName: "x-ms-source-lease-id",
        xmlName: "x-ms-source-lease-id",
        type: {
            name: "String",
        },
    },
};
const comp10 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "lease",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const action = {
    parameterPath: "action",
    mapper: {
        defaultValue: "acquire",
        isConstant: true,
        serializedName: "x-ms-lease-action",
        type: {
            name: "String",
        },
    },
};
const duration = {
    parameterPath: ["options", "duration"],
    mapper: {
        serializedName: "x-ms-lease-duration",
        xmlName: "x-ms-lease-duration",
        type: {
            name: "Number",
        },
    },
};
const proposedLeaseId = {
    parameterPath: ["options", "proposedLeaseId"],
    mapper: {
        serializedName: "x-ms-proposed-lease-id",
        xmlName: "x-ms-proposed-lease-id",
        type: {
            name: "String",
        },
    },
};
const action1 = {
    parameterPath: "action",
    mapper: {
        defaultValue: "release",
        isConstant: true,
        serializedName: "x-ms-lease-action",
        type: {
            name: "String",
        },
    },
};
const leaseId1 = {
    parameterPath: "leaseId",
    mapper: {
        serializedName: "x-ms-lease-id",
        required: true,
        xmlName: "x-ms-lease-id",
        type: {
            name: "String",
        },
    },
};
const action2 = {
    parameterPath: "action",
    mapper: {
        defaultValue: "renew",
        isConstant: true,
        serializedName: "x-ms-lease-action",
        type: {
            name: "String",
        },
    },
};
const action3 = {
    parameterPath: "action",
    mapper: {
        defaultValue: "break",
        isConstant: true,
        serializedName: "x-ms-lease-action",
        type: {
            name: "String",
        },
    },
};
const breakPeriod = {
    parameterPath: ["options", "breakPeriod"],
    mapper: {
        serializedName: "x-ms-lease-break-period",
        xmlName: "x-ms-lease-break-period",
        type: {
            name: "Number",
        },
    },
};
const action4 = {
    parameterPath: "action",
    mapper: {
        defaultValue: "change",
        isConstant: true,
        serializedName: "x-ms-lease-action",
        type: {
            name: "String",
        },
    },
};
const proposedLeaseId1 = {
    parameterPath: "proposedLeaseId",
    mapper: {
        serializedName: "x-ms-proposed-lease-id",
        required: true,
        xmlName: "x-ms-proposed-lease-id",
        type: {
            name: "String",
        },
    },
};
const include1 = {
    parameterPath: ["options", "include"],
    mapper: {
        serializedName: "include",
        xmlName: "include",
        xmlElementName: "ListBlobsIncludeItem",
        type: {
            name: "Sequence",
            element: {
                type: {
                    name: "Enum",
                    allowedValues: [
                        "copy",
                        "deleted",
                        "metadata",
                        "snapshots",
                        "uncommittedblobs",
                        "versions",
                        "tags",
                        "immutabilitypolicy",
                        "legalhold",
                        "deletedwithversions",
                    ],
                },
            },
        },
    },
    collectionFormat: "CSV",
};
const delimiter = {
    parameterPath: "delimiter",
    mapper: {
        serializedName: "delimiter",
        required: true,
        xmlName: "delimiter",
        type: {
            name: "String",
        },
    },
};
const snapshot = {
    parameterPath: ["options", "snapshot"],
    mapper: {
        serializedName: "snapshot",
        xmlName: "snapshot",
        type: {
            name: "String",
        },
    },
};
const versionId = {
    parameterPath: ["options", "versionId"],
    mapper: {
        serializedName: "versionid",
        xmlName: "versionid",
        type: {
            name: "String",
        },
    },
};
const range = {
    parameterPath: ["options", "range"],
    mapper: {
        serializedName: "x-ms-range",
        xmlName: "x-ms-range",
        type: {
            name: "String",
        },
    },
};
const rangeGetContentMD5 = {
    parameterPath: ["options", "rangeGetContentMD5"],
    mapper: {
        serializedName: "x-ms-range-get-content-md5",
        xmlName: "x-ms-range-get-content-md5",
        type: {
            name: "Boolean",
        },
    },
};
const rangeGetContentCRC64 = {
    parameterPath: ["options", "rangeGetContentCRC64"],
    mapper: {
        serializedName: "x-ms-range-get-content-crc64",
        xmlName: "x-ms-range-get-content-crc64",
        type: {
            name: "Boolean",
        },
    },
};
const encryptionKey = {
    parameterPath: ["options", "cpkInfo", "encryptionKey"],
    mapper: {
        serializedName: "x-ms-encryption-key",
        xmlName: "x-ms-encryption-key",
        type: {
            name: "String",
        },
    },
};
const encryptionKeySha256 = {
    parameterPath: ["options", "cpkInfo", "encryptionKeySha256"],
    mapper: {
        serializedName: "x-ms-encryption-key-sha256",
        xmlName: "x-ms-encryption-key-sha256",
        type: {
            name: "String",
        },
    },
};
const encryptionAlgorithm = {
    parameterPath: ["options", "cpkInfo", "encryptionAlgorithm"],
    mapper: {
        serializedName: "x-ms-encryption-algorithm",
        xmlName: "x-ms-encryption-algorithm",
        type: {
            name: "String",
        },
    },
};
const ifMatch = {
    parameterPath: ["options", "modifiedAccessConditions", "ifMatch"],
    mapper: {
        serializedName: "If-Match",
        xmlName: "If-Match",
        type: {
            name: "String",
        },
    },
};
const ifNoneMatch = {
    parameterPath: ["options", "modifiedAccessConditions", "ifNoneMatch"],
    mapper: {
        serializedName: "If-None-Match",
        xmlName: "If-None-Match",
        type: {
            name: "String",
        },
    },
};
const ifTags = {
    parameterPath: ["options", "modifiedAccessConditions", "ifTags"],
    mapper: {
        serializedName: "x-ms-if-tags",
        xmlName: "x-ms-if-tags",
        type: {
            name: "String",
        },
    },
};
const deleteSnapshots = {
    parameterPath: ["options", "deleteSnapshots"],
    mapper: {
        serializedName: "x-ms-delete-snapshots",
        xmlName: "x-ms-delete-snapshots",
        type: {
            name: "Enum",
            allowedValues: ["include", "only"],
        },
    },
};
const blobDeleteType = {
    parameterPath: ["options", "blobDeleteType"],
    mapper: {
        serializedName: "deletetype",
        xmlName: "deletetype",
        type: {
            name: "String",
        },
    },
};
const comp11 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "expiry",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const expiryOptions = {
    parameterPath: "expiryOptions",
    mapper: {
        serializedName: "x-ms-expiry-option",
        required: true,
        xmlName: "x-ms-expiry-option",
        type: {
            name: "String",
        },
    },
};
const expiresOn = {
    parameterPath: ["options", "expiresOn"],
    mapper: {
        serializedName: "x-ms-expiry-time",
        xmlName: "x-ms-expiry-time",
        type: {
            name: "String",
        },
    },
};
const blobCacheControl = {
    parameterPath: ["options", "blobHttpHeaders", "blobCacheControl"],
    mapper: {
        serializedName: "x-ms-blob-cache-control",
        xmlName: "x-ms-blob-cache-control",
        type: {
            name: "String",
        },
    },
};
const blobContentType = {
    parameterPath: ["options", "blobHttpHeaders", "blobContentType"],
    mapper: {
        serializedName: "x-ms-blob-content-type",
        xmlName: "x-ms-blob-content-type",
        type: {
            name: "String",
        },
    },
};
const blobContentMD5 = {
    parameterPath: ["options", "blobHttpHeaders", "blobContentMD5"],
    mapper: {
        serializedName: "x-ms-blob-content-md5",
        xmlName: "x-ms-blob-content-md5",
        type: {
            name: "ByteArray",
        },
    },
};
const blobContentEncoding = {
    parameterPath: ["options", "blobHttpHeaders", "blobContentEncoding"],
    mapper: {
        serializedName: "x-ms-blob-content-encoding",
        xmlName: "x-ms-blob-content-encoding",
        type: {
            name: "String",
        },
    },
};
const blobContentLanguage = {
    parameterPath: ["options", "blobHttpHeaders", "blobContentLanguage"],
    mapper: {
        serializedName: "x-ms-blob-content-language",
        xmlName: "x-ms-blob-content-language",
        type: {
            name: "String",
        },
    },
};
const blobContentDisposition = {
    parameterPath: ["options", "blobHttpHeaders", "blobContentDisposition"],
    mapper: {
        serializedName: "x-ms-blob-content-disposition",
        xmlName: "x-ms-blob-content-disposition",
        type: {
            name: "String",
        },
    },
};
const comp12 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "immutabilityPolicies",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const immutabilityPolicyExpiry = {
    parameterPath: ["options", "immutabilityPolicyExpiry"],
    mapper: {
        serializedName: "x-ms-immutability-policy-until-date",
        xmlName: "x-ms-immutability-policy-until-date",
        type: {
            name: "DateTimeRfc1123",
        },
    },
};
const immutabilityPolicyMode = {
    parameterPath: ["options", "immutabilityPolicyMode"],
    mapper: {
        serializedName: "x-ms-immutability-policy-mode",
        xmlName: "x-ms-immutability-policy-mode",
        type: {
            name: "Enum",
            allowedValues: ["Mutable", "Unlocked", "Locked"],
        },
    },
};
const comp13 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "legalhold",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const legalHold = {
    parameterPath: "legalHold",
    mapper: {
        serializedName: "x-ms-legal-hold",
        required: true,
        xmlName: "x-ms-legal-hold",
        type: {
            name: "Boolean",
        },
    },
};
const encryptionScope = {
    parameterPath: ["options", "encryptionScope"],
    mapper: {
        serializedName: "x-ms-encryption-scope",
        xmlName: "x-ms-encryption-scope",
        type: {
            name: "String",
        },
    },
};
const comp14 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "snapshot",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const tier = {
    parameterPath: ["options", "tier"],
    mapper: {
        serializedName: "x-ms-access-tier",
        xmlName: "x-ms-access-tier",
        type: {
            name: "Enum",
            allowedValues: [
                "P4",
                "P6",
                "P10",
                "P15",
                "P20",
                "P30",
                "P40",
                "P50",
                "P60",
                "P70",
                "P80",
                "Hot",
                "Cool",
                "Archive",
                "Cold",
            ],
        },
    },
};
const rehydratePriority = {
    parameterPath: ["options", "rehydratePriority"],
    mapper: {
        serializedName: "x-ms-rehydrate-priority",
        xmlName: "x-ms-rehydrate-priority",
        type: {
            name: "Enum",
            allowedValues: ["High", "Standard"],
        },
    },
};
const sourceIfModifiedSince = {
    parameterPath: [
        "options",
        "sourceModifiedAccessConditions",
        "sourceIfModifiedSince",
    ],
    mapper: {
        serializedName: "x-ms-source-if-modified-since",
        xmlName: "x-ms-source-if-modified-since",
        type: {
            name: "DateTimeRfc1123",
        },
    },
};
const sourceIfUnmodifiedSince = {
    parameterPath: [
        "options",
        "sourceModifiedAccessConditions",
        "sourceIfUnmodifiedSince",
    ],
    mapper: {
        serializedName: "x-ms-source-if-unmodified-since",
        xmlName: "x-ms-source-if-unmodified-since",
        type: {
            name: "DateTimeRfc1123",
        },
    },
};
const sourceIfMatch = {
    parameterPath: ["options", "sourceModifiedAccessConditions", "sourceIfMatch"],
    mapper: {
        serializedName: "x-ms-source-if-match",
        xmlName: "x-ms-source-if-match",
        type: {
            name: "String",
        },
    },
};
const sourceIfNoneMatch = {
    parameterPath: [
        "options",
        "sourceModifiedAccessConditions",
        "sourceIfNoneMatch",
    ],
    mapper: {
        serializedName: "x-ms-source-if-none-match",
        xmlName: "x-ms-source-if-none-match",
        type: {
            name: "String",
        },
    },
};
const sourceIfTags = {
    parameterPath: ["options", "sourceModifiedAccessConditions", "sourceIfTags"],
    mapper: {
        serializedName: "x-ms-source-if-tags",
        xmlName: "x-ms-source-if-tags",
        type: {
            name: "String",
        },
    },
};
const copySource = {
    parameterPath: "copySource",
    mapper: {
        serializedName: "x-ms-copy-source",
        required: true,
        xmlName: "x-ms-copy-source",
        type: {
            name: "String",
        },
    },
};
const blobTagsString = {
    parameterPath: ["options", "blobTagsString"],
    mapper: {
        serializedName: "x-ms-tags",
        xmlName: "x-ms-tags",
        type: {
            name: "String",
        },
    },
};
const sealBlob = {
    parameterPath: ["options", "sealBlob"],
    mapper: {
        serializedName: "x-ms-seal-blob",
        xmlName: "x-ms-seal-blob",
        type: {
            name: "Boolean",
        },
    },
};
const legalHold1 = {
    parameterPath: ["options", "legalHold"],
    mapper: {
        serializedName: "x-ms-legal-hold",
        xmlName: "x-ms-legal-hold",
        type: {
            name: "Boolean",
        },
    },
};
const xMsRequiresSync = {
    parameterPath: "xMsRequiresSync",
    mapper: {
        defaultValue: "true",
        isConstant: true,
        serializedName: "x-ms-requires-sync",
        type: {
            name: "String",
        },
    },
};
const sourceContentMD5 = {
    parameterPath: ["options", "sourceContentMD5"],
    mapper: {
        serializedName: "x-ms-source-content-md5",
        xmlName: "x-ms-source-content-md5",
        type: {
            name: "ByteArray",
        },
    },
};
const copySourceAuthorization = {
    parameterPath: ["options", "copySourceAuthorization"],
    mapper: {
        serializedName: "x-ms-copy-source-authorization",
        xmlName: "x-ms-copy-source-authorization",
        type: {
            name: "String",
        },
    },
};
const copySourceTags = {
    parameterPath: ["options", "copySourceTags"],
    mapper: {
        serializedName: "x-ms-copy-source-tag-option",
        xmlName: "x-ms-copy-source-tag-option",
        type: {
            name: "Enum",
            allowedValues: ["REPLACE", "COPY"],
        },
    },
};
const comp15 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "copy",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const copyActionAbortConstant = {
    parameterPath: "copyActionAbortConstant",
    mapper: {
        defaultValue: "abort",
        isConstant: true,
        serializedName: "x-ms-copy-action",
        type: {
            name: "String",
        },
    },
};
const copyId = {
    parameterPath: "copyId",
    mapper: {
        serializedName: "copyid",
        required: true,
        xmlName: "copyid",
        type: {
            name: "String",
        },
    },
};
const comp16 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "tier",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const tier1 = {
    parameterPath: "tier",
    mapper: {
        serializedName: "x-ms-access-tier",
        required: true,
        xmlName: "x-ms-access-tier",
        type: {
            name: "Enum",
            allowedValues: [
                "P4",
                "P6",
                "P10",
                "P15",
                "P20",
                "P30",
                "P40",
                "P50",
                "P60",
                "P70",
                "P80",
                "Hot",
                "Cool",
                "Archive",
                "Cold",
            ],
        },
    },
};
const queryRequest = {
    parameterPath: ["options", "queryRequest"],
    mapper: QueryRequest,
};
const comp17 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "query",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const comp18 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "tags",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const tags = {
    parameterPath: ["options", "tags"],
    mapper: BlobTags,
};
const transactionalContentMD5 = {
    parameterPath: ["options", "transactionalContentMD5"],
    mapper: {
        serializedName: "Content-MD5",
        xmlName: "Content-MD5",
        type: {
            name: "ByteArray",
        },
    },
};
const transactionalContentCrc64 = {
    parameterPath: ["options", "transactionalContentCrc64"],
    mapper: {
        serializedName: "x-ms-content-crc64",
        xmlName: "x-ms-content-crc64",
        type: {
            name: "ByteArray",
        },
    },
};
const blobType = {
    parameterPath: "blobType",
    mapper: {
        defaultValue: "PageBlob",
        isConstant: true,
        serializedName: "x-ms-blob-type",
        type: {
            name: "String",
        },
    },
};
const blobContentLength = {
    parameterPath: "blobContentLength",
    mapper: {
        serializedName: "x-ms-blob-content-length",
        required: true,
        xmlName: "x-ms-blob-content-length",
        type: {
            name: "Number",
        },
    },
};
const blobSequenceNumber = {
    parameterPath: ["options", "blobSequenceNumber"],
    mapper: {
        defaultValue: 0,
        serializedName: "x-ms-blob-sequence-number",
        xmlName: "x-ms-blob-sequence-number",
        type: {
            name: "Number",
        },
    },
};
const contentType1 = {
    parameterPath: ["options", "contentType"],
    mapper: {
        defaultValue: "application/octet-stream",
        isConstant: true,
        serializedName: "Content-Type",
        type: {
            name: "String",
        },
    },
};
const body1 = {
    parameterPath: "body",
    mapper: {
        serializedName: "body",
        required: true,
        xmlName: "body",
        type: {
            name: "Stream",
        },
    },
};
const accept2 = {
    parameterPath: "accept",
    mapper: {
        defaultValue: "application/xml",
        isConstant: true,
        serializedName: "Accept",
        type: {
            name: "String",
        },
    },
};
const comp19 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "page",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const pageWrite = {
    parameterPath: "pageWrite",
    mapper: {
        defaultValue: "update",
        isConstant: true,
        serializedName: "x-ms-page-write",
        type: {
            name: "String",
        },
    },
};
const ifSequenceNumberLessThanOrEqualTo = {
    parameterPath: [
        "options",
        "sequenceNumberAccessConditions",
        "ifSequenceNumberLessThanOrEqualTo",
    ],
    mapper: {
        serializedName: "x-ms-if-sequence-number-le",
        xmlName: "x-ms-if-sequence-number-le",
        type: {
            name: "Number",
        },
    },
};
const ifSequenceNumberLessThan = {
    parameterPath: [
        "options",
        "sequenceNumberAccessConditions",
        "ifSequenceNumberLessThan",
    ],
    mapper: {
        serializedName: "x-ms-if-sequence-number-lt",
        xmlName: "x-ms-if-sequence-number-lt",
        type: {
            name: "Number",
        },
    },
};
const ifSequenceNumberEqualTo = {
    parameterPath: [
        "options",
        "sequenceNumberAccessConditions",
        "ifSequenceNumberEqualTo",
    ],
    mapper: {
        serializedName: "x-ms-if-sequence-number-eq",
        xmlName: "x-ms-if-sequence-number-eq",
        type: {
            name: "Number",
        },
    },
};
const pageWrite1 = {
    parameterPath: "pageWrite",
    mapper: {
        defaultValue: "clear",
        isConstant: true,
        serializedName: "x-ms-page-write",
        type: {
            name: "String",
        },
    },
};
const sourceUrl = {
    parameterPath: "sourceUrl",
    mapper: {
        serializedName: "x-ms-copy-source",
        required: true,
        xmlName: "x-ms-copy-source",
        type: {
            name: "String",
        },
    },
};
const sourceRange = {
    parameterPath: "sourceRange",
    mapper: {
        serializedName: "x-ms-source-range",
        required: true,
        xmlName: "x-ms-source-range",
        type: {
            name: "String",
        },
    },
};
const sourceContentCrc64 = {
    parameterPath: ["options", "sourceContentCrc64"],
    mapper: {
        serializedName: "x-ms-source-content-crc64",
        xmlName: "x-ms-source-content-crc64",
        type: {
            name: "ByteArray",
        },
    },
};
const range1 = {
    parameterPath: "range",
    mapper: {
        serializedName: "x-ms-range",
        required: true,
        xmlName: "x-ms-range",
        type: {
            name: "String",
        },
    },
};
const comp20 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "pagelist",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const prevsnapshot = {
    parameterPath: ["options", "prevsnapshot"],
    mapper: {
        serializedName: "prevsnapshot",
        xmlName: "prevsnapshot",
        type: {
            name: "String",
        },
    },
};
const prevSnapshotUrl = {
    parameterPath: ["options", "prevSnapshotUrl"],
    mapper: {
        serializedName: "x-ms-previous-snapshot-url",
        xmlName: "x-ms-previous-snapshot-url",
        type: {
            name: "String",
        },
    },
};
const sequenceNumberAction = {
    parameterPath: "sequenceNumberAction",
    mapper: {
        serializedName: "x-ms-sequence-number-action",
        required: true,
        xmlName: "x-ms-sequence-number-action",
        type: {
            name: "Enum",
            allowedValues: ["max", "update", "increment"],
        },
    },
};
const comp21 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "incrementalcopy",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const blobType1 = {
    parameterPath: "blobType",
    mapper: {
        defaultValue: "AppendBlob",
        isConstant: true,
        serializedName: "x-ms-blob-type",
        type: {
            name: "String",
        },
    },
};
const comp22 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "appendblock",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const maxSize = {
    parameterPath: ["options", "appendPositionAccessConditions", "maxSize"],
    mapper: {
        serializedName: "x-ms-blob-condition-maxsize",
        xmlName: "x-ms-blob-condition-maxsize",
        type: {
            name: "Number",
        },
    },
};
const appendPosition = {
    parameterPath: [
        "options",
        "appendPositionAccessConditions",
        "appendPosition",
    ],
    mapper: {
        serializedName: "x-ms-blob-condition-appendpos",
        xmlName: "x-ms-blob-condition-appendpos",
        type: {
            name: "Number",
        },
    },
};
const sourceRange1 = {
    parameterPath: ["options", "sourceRange"],
    mapper: {
        serializedName: "x-ms-source-range",
        xmlName: "x-ms-source-range",
        type: {
            name: "String",
        },
    },
};
const comp23 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "seal",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const blobType2 = {
    parameterPath: "blobType",
    mapper: {
        defaultValue: "BlockBlob",
        isConstant: true,
        serializedName: "x-ms-blob-type",
        type: {
            name: "String",
        },
    },
};
const copySourceBlobProperties = {
    parameterPath: ["options", "copySourceBlobProperties"],
    mapper: {
        serializedName: "x-ms-copy-source-blob-properties",
        xmlName: "x-ms-copy-source-blob-properties",
        type: {
            name: "Boolean",
        },
    },
};
const comp24 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "block",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const blockId = {
    parameterPath: "blockId",
    mapper: {
        serializedName: "blockid",
        required: true,
        xmlName: "blockid",
        type: {
            name: "String",
        },
    },
};
const blocks = {
    parameterPath: "blocks",
    mapper: BlockLookupList,
};
const comp25 = {
    parameterPath: "comp",
    mapper: {
        defaultValue: "blocklist",
        isConstant: true,
        serializedName: "comp",
        type: {
            name: "String",
        },
    },
};
const listType = {
    parameterPath: "listType",
    mapper: {
        defaultValue: "committed",
        serializedName: "blocklisttype",
        required: true,
        xmlName: "blocklisttype",
        type: {
            name: "Enum",
            allowedValues: ["committed", "uncommitted", "all"],
        },
    },
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing Service operations. */
class ServiceImpl {
    /**
     * Initialize a new instance of the class Service class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * Sets properties for a storage account's Blob service endpoint, including properties for Storage
     * Analytics and CORS (Cross-Origin Resource Sharing) rules
     * @param blobServiceProperties The StorageService properties.
     * @param options The options parameters.
     */
    setProperties(blobServiceProperties, options) {
        return this.client.sendOperationRequest({ blobServiceProperties, options }, setPropertiesOperationSpec);
    }
    /**
     * gets the properties of a storage account's Blob service, including properties for Storage Analytics
     * and CORS (Cross-Origin Resource Sharing) rules.
     * @param options The options parameters.
     */
    getProperties(options) {
        return this.client.sendOperationRequest({ options }, getPropertiesOperationSpec$2);
    }
    /**
     * Retrieves statistics related to replication for the Blob service. It is only available on the
     * secondary location endpoint when read-access geo-redundant replication is enabled for the storage
     * account.
     * @param options The options parameters.
     */
    getStatistics(options) {
        return this.client.sendOperationRequest({ options }, getStatisticsOperationSpec);
    }
    /**
     * The List Containers Segment operation returns a list of the containers under the specified account
     * @param options The options parameters.
     */
    listContainersSegment(options) {
        return this.client.sendOperationRequest({ options }, listContainersSegmentOperationSpec);
    }
    /**
     * Retrieves a user delegation key for the Blob service. This is only a valid operation when using
     * bearer token authentication.
     * @param keyInfo Key information
     * @param options The options parameters.
     */
    getUserDelegationKey(keyInfo, options) {
        return this.client.sendOperationRequest({ keyInfo, options }, getUserDelegationKeyOperationSpec);
    }
    /**
     * Returns the sku name and account kind
     * @param options The options parameters.
     */
    getAccountInfo(options) {
        return this.client.sendOperationRequest({ options }, getAccountInfoOperationSpec$2);
    }
    /**
     * The Batch operation allows multiple API calls to be embedded into a single HTTP request.
     * @param contentLength The length of the request.
     * @param multipartContentType Required. The value of this header must be multipart/mixed with a batch
     *                             boundary. Example header value: multipart/mixed; boundary=batch_<GUID>
     * @param body Initial data
     * @param options The options parameters.
     */
    submitBatch(contentLength, multipartContentType, body, options) {
        return this.client.sendOperationRequest({ contentLength, multipartContentType, body, options }, submitBatchOperationSpec$1);
    }
    /**
     * The Filter Blobs operation enables callers to list blobs across all containers whose tags match a
     * given search expression.  Filter blobs searches across all containers within a storage account but
     * can be scoped within the expression to a single container.
     * @param options The options parameters.
     */
    filterBlobs(options) {
        return this.client.sendOperationRequest({ options }, filterBlobsOperationSpec$1);
    }
}
// Operation Specifications
const xmlSerializer$5 = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const setPropertiesOperationSpec = {
    path: "/",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: ServiceSetPropertiesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceSetPropertiesExceptionHeaders,
        },
    },
    requestBody: blobServiceProperties,
    queryParameters: [
        restype,
        comp,
        timeoutInSeconds,
    ],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$5,
};
const getPropertiesOperationSpec$2 = {
    path: "/",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: BlobServiceProperties,
            headersMapper: ServiceGetPropertiesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceGetPropertiesExceptionHeaders,
        },
    },
    queryParameters: [
        restype,
        comp,
        timeoutInSeconds,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$5,
};
const getStatisticsOperationSpec = {
    path: "/",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: BlobServiceStatistics,
            headersMapper: ServiceGetStatisticsHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceGetStatisticsExceptionHeaders,
        },
    },
    queryParameters: [
        restype,
        timeoutInSeconds,
        comp1,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$5,
};
const listContainersSegmentOperationSpec = {
    path: "/",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: ListContainersSegmentResponse,
            headersMapper: ServiceListContainersSegmentHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceListContainersSegmentExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        comp2,
        prefix,
        marker,
        maxPageSize,
        include,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$5,
};
const getUserDelegationKeyOperationSpec = {
    path: "/",
    httpMethod: "POST",
    responses: {
        200: {
            bodyMapper: UserDelegationKey,
            headersMapper: ServiceGetUserDelegationKeyHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceGetUserDelegationKeyExceptionHeaders,
        },
    },
    requestBody: keyInfo,
    queryParameters: [
        restype,
        timeoutInSeconds,
        comp3,
    ],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$5,
};
const getAccountInfoOperationSpec$2 = {
    path: "/",
    httpMethod: "GET",
    responses: {
        200: {
            headersMapper: ServiceGetAccountInfoHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceGetAccountInfoExceptionHeaders,
        },
    },
    queryParameters: [
        comp,
        timeoutInSeconds,
        restype1,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$5,
};
const submitBatchOperationSpec$1 = {
    path: "/",
    httpMethod: "POST",
    responses: {
        202: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: ServiceSubmitBatchHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceSubmitBatchExceptionHeaders,
        },
    },
    requestBody: body,
    queryParameters: [timeoutInSeconds, comp4],
    urlParameters: [url],
    headerParameters: [
        accept,
        version,
        requestId,
        contentLength,
        multipartContentType,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$5,
};
const filterBlobsOperationSpec$1 = {
    path: "/",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: FilterBlobSegment,
            headersMapper: ServiceFilterBlobsHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ServiceFilterBlobsExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        marker,
        maxPageSize,
        comp5,
        where,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$5,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing Container operations. */
class ContainerImpl {
    /**
     * Initialize a new instance of the class Container class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * creates a new container under the specified account. If the container with the same name already
     * exists, the operation fails
     * @param options The options parameters.
     */
    create(options) {
        return this.client.sendOperationRequest({ options }, createOperationSpec$2);
    }
    /**
     * returns all user-defined metadata and system properties for the specified container. The data
     * returned does not include the container's list of blobs
     * @param options The options parameters.
     */
    getProperties(options) {
        return this.client.sendOperationRequest({ options }, getPropertiesOperationSpec$1);
    }
    /**
     * operation marks the specified container for deletion. The container and any blobs contained within
     * it are later deleted during garbage collection
     * @param options The options parameters.
     */
    delete(options) {
        return this.client.sendOperationRequest({ options }, deleteOperationSpec$1);
    }
    /**
     * operation sets one or more user-defined name-value pairs for the specified container.
     * @param options The options parameters.
     */
    setMetadata(options) {
        return this.client.sendOperationRequest({ options }, setMetadataOperationSpec$1);
    }
    /**
     * gets the permissions for the specified container. The permissions indicate whether container data
     * may be accessed publicly.
     * @param options The options parameters.
     */
    getAccessPolicy(options) {
        return this.client.sendOperationRequest({ options }, getAccessPolicyOperationSpec);
    }
    /**
     * sets the permissions for the specified container. The permissions indicate whether blobs in a
     * container may be accessed publicly.
     * @param options The options parameters.
     */
    setAccessPolicy(options) {
        return this.client.sendOperationRequest({ options }, setAccessPolicyOperationSpec);
    }
    /**
     * Restores a previously-deleted container.
     * @param options The options parameters.
     */
    restore(options) {
        return this.client.sendOperationRequest({ options }, restoreOperationSpec);
    }
    /**
     * Renames an existing container.
     * @param sourceContainerName Required.  Specifies the name of the container to rename.
     * @param options The options parameters.
     */
    rename(sourceContainerName, options) {
        return this.client.sendOperationRequest({ sourceContainerName, options }, renameOperationSpec);
    }
    /**
     * The Batch operation allows multiple API calls to be embedded into a single HTTP request.
     * @param contentLength The length of the request.
     * @param multipartContentType Required. The value of this header must be multipart/mixed with a batch
     *                             boundary. Example header value: multipart/mixed; boundary=batch_<GUID>
     * @param body Initial data
     * @param options The options parameters.
     */
    submitBatch(contentLength, multipartContentType, body, options) {
        return this.client.sendOperationRequest({ contentLength, multipartContentType, body, options }, submitBatchOperationSpec);
    }
    /**
     * The Filter Blobs operation enables callers to list blobs in a container whose tags match a given
     * search expression.  Filter blobs searches within the given container.
     * @param options The options parameters.
     */
    filterBlobs(options) {
        return this.client.sendOperationRequest({ options }, filterBlobsOperationSpec);
    }
    /**
     * [Update] establishes and manages a lock on a container for delete operations. The lock duration can
     * be 15 to 60 seconds, or can be infinite
     * @param options The options parameters.
     */
    acquireLease(options) {
        return this.client.sendOperationRequest({ options }, acquireLeaseOperationSpec$1);
    }
    /**
     * [Update] establishes and manages a lock on a container for delete operations. The lock duration can
     * be 15 to 60 seconds, or can be infinite
     * @param leaseId Specifies the current lease ID on the resource.
     * @param options The options parameters.
     */
    releaseLease(leaseId, options) {
        return this.client.sendOperationRequest({ leaseId, options }, releaseLeaseOperationSpec$1);
    }
    /**
     * [Update] establishes and manages a lock on a container for delete operations. The lock duration can
     * be 15 to 60 seconds, or can be infinite
     * @param leaseId Specifies the current lease ID on the resource.
     * @param options The options parameters.
     */
    renewLease(leaseId, options) {
        return this.client.sendOperationRequest({ leaseId, options }, renewLeaseOperationSpec$1);
    }
    /**
     * [Update] establishes and manages a lock on a container for delete operations. The lock duration can
     * be 15 to 60 seconds, or can be infinite
     * @param options The options parameters.
     */
    breakLease(options) {
        return this.client.sendOperationRequest({ options }, breakLeaseOperationSpec$1);
    }
    /**
     * [Update] establishes and manages a lock on a container for delete operations. The lock duration can
     * be 15 to 60 seconds, or can be infinite
     * @param leaseId Specifies the current lease ID on the resource.
     * @param proposedLeaseId Proposed lease ID, in a GUID string format. The Blob service returns 400
     *                        (Invalid request) if the proposed lease ID is not in the correct format. See Guid Constructor
     *                        (String) for a list of valid GUID string formats.
     * @param options The options parameters.
     */
    changeLease(leaseId, proposedLeaseId, options) {
        return this.client.sendOperationRequest({ leaseId, proposedLeaseId, options }, changeLeaseOperationSpec$1);
    }
    /**
     * [Update] The List Blobs operation returns a list of the blobs under the specified container
     * @param options The options parameters.
     */
    listBlobFlatSegment(options) {
        return this.client.sendOperationRequest({ options }, listBlobFlatSegmentOperationSpec);
    }
    /**
     * [Update] The List Blobs operation returns a list of the blobs under the specified container
     * @param delimiter When the request includes this parameter, the operation returns a BlobPrefix
     *                  element in the response body that acts as a placeholder for all blobs whose names begin with the
     *                  same substring up to the appearance of the delimiter character. The delimiter may be a single
     *                  character or a string.
     * @param options The options parameters.
     */
    listBlobHierarchySegment(delimiter, options) {
        return this.client.sendOperationRequest({ delimiter, options }, listBlobHierarchySegmentOperationSpec);
    }
    /**
     * Returns the sku name and account kind
     * @param options The options parameters.
     */
    getAccountInfo(options) {
        return this.client.sendOperationRequest({ options }, getAccountInfoOperationSpec$1);
    }
}
// Operation Specifications
const xmlSerializer$4 = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const createOperationSpec$2 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: ContainerCreateHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerCreateExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, restype2],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        access,
        defaultEncryptionScope,
        preventEncryptionScopeOverride,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const getPropertiesOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            headersMapper: ContainerGetPropertiesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerGetPropertiesExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, restype2],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const deleteOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "DELETE",
    responses: {
        202: {
            headersMapper: ContainerDeleteHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerDeleteExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, restype2],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const setMetadataOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerSetMetadataHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerSetMetadataExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp6,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        leaseId,
        ifModifiedSince,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const getAccessPolicyOperationSpec = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: {
                type: {
                    name: "Sequence",
                    element: {
                        type: { name: "Composite", className: "SignedIdentifier" },
                    },
                },
                serializedName: "SignedIdentifiers",
                xmlName: "SignedIdentifiers",
                xmlIsWrapped: true,
                xmlElementName: "SignedIdentifier",
            },
            headersMapper: ContainerGetAccessPolicyHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerGetAccessPolicyExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp7,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const setAccessPolicyOperationSpec = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerSetAccessPolicyHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerSetAccessPolicyExceptionHeaders,
        },
    },
    requestBody: containerAcl,
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp7,
    ],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
        access,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$4,
};
const restoreOperationSpec = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: ContainerRestoreHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerRestoreExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp8,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        deletedContainerName,
        deletedContainerVersion,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const renameOperationSpec = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerRenameHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerRenameExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp9,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        sourceContainerName,
        sourceLeaseId,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const submitBatchOperationSpec = {
    path: "/{containerName}",
    httpMethod: "POST",
    responses: {
        202: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: ContainerSubmitBatchHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerSubmitBatchExceptionHeaders,
        },
    },
    requestBody: body,
    queryParameters: [
        timeoutInSeconds,
        comp4,
        restype2,
    ],
    urlParameters: [url],
    headerParameters: [
        accept,
        version,
        requestId,
        contentLength,
        multipartContentType,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$4,
};
const filterBlobsOperationSpec = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: FilterBlobSegment,
            headersMapper: ContainerFilterBlobsHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerFilterBlobsExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        marker,
        maxPageSize,
        comp5,
        where,
        restype2,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const acquireLeaseOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: ContainerAcquireLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerAcquireLeaseExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp10,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action,
        duration,
        proposedLeaseId,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const releaseLeaseOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerReleaseLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerReleaseLeaseExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp10,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action1,
        leaseId1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const renewLeaseOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerRenewLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerRenewLeaseExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp10,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        leaseId1,
        action2,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const breakLeaseOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: ContainerBreakLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerBreakLeaseExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp10,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action3,
        breakPeriod,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const changeLeaseOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: ContainerChangeLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerChangeLeaseExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        restype2,
        comp10,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        leaseId1,
        action4,
        proposedLeaseId1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const listBlobFlatSegmentOperationSpec = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: ListBlobsFlatSegmentResponse,
            headersMapper: ContainerListBlobFlatSegmentHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerListBlobFlatSegmentExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        comp2,
        prefix,
        marker,
        maxPageSize,
        restype2,
        include1,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const listBlobHierarchySegmentOperationSpec = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: ListBlobsHierarchySegmentResponse,
            headersMapper: ContainerListBlobHierarchySegmentHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerListBlobHierarchySegmentExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        comp2,
        prefix,
        marker,
        maxPageSize,
        restype2,
        include1,
        delimiter,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};
const getAccountInfoOperationSpec$1 = {
    path: "/{containerName}",
    httpMethod: "GET",
    responses: {
        200: {
            headersMapper: ContainerGetAccountInfoHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: ContainerGetAccountInfoExceptionHeaders,
        },
    },
    queryParameters: [
        comp,
        timeoutInSeconds,
        restype1,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$4,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing Blob operations. */
class BlobImpl {
    /**
     * Initialize a new instance of the class Blob class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * The Download operation reads or downloads a blob from the system, including its metadata and
     * properties. You can also call Download to read a snapshot.
     * @param options The options parameters.
     */
    download(options) {
        return this.client.sendOperationRequest({ options }, downloadOperationSpec);
    }
    /**
     * The Get Properties operation returns all user-defined metadata, standard HTTP properties, and system
     * properties for the blob. It does not return the content of the blob.
     * @param options The options parameters.
     */
    getProperties(options) {
        return this.client.sendOperationRequest({ options }, getPropertiesOperationSpec);
    }
    /**
     * If the storage account's soft delete feature is disabled then, when a blob is deleted, it is
     * permanently removed from the storage account. If the storage account's soft delete feature is
     * enabled, then, when a blob is deleted, it is marked for deletion and becomes inaccessible
     * immediately. However, the blob service retains the blob or snapshot for the number of days specified
     * by the DeleteRetentionPolicy section of [Storage service properties]
     * (Set-Blob-Service-Properties.md). After the specified number of days has passed, the blob's data is
     * permanently removed from the storage account. Note that you continue to be charged for the
     * soft-deleted blob's storage until it is permanently removed. Use the List Blobs API and specify the
     * "include=deleted" query parameter to discover which blobs and snapshots have been soft deleted. You
     * can then use the Undelete Blob API to restore a soft-deleted blob. All other operations on a
     * soft-deleted blob or snapshot causes the service to return an HTTP status code of 404
     * (ResourceNotFound).
     * @param options The options parameters.
     */
    delete(options) {
        return this.client.sendOperationRequest({ options }, deleteOperationSpec);
    }
    /**
     * Undelete a blob that was previously soft deleted
     * @param options The options parameters.
     */
    undelete(options) {
        return this.client.sendOperationRequest({ options }, undeleteOperationSpec);
    }
    /**
     * Sets the time a blob will expire and be deleted.
     * @param expiryOptions Required. Indicates mode of the expiry time
     * @param options The options parameters.
     */
    setExpiry(expiryOptions, options) {
        return this.client.sendOperationRequest({ expiryOptions, options }, setExpiryOperationSpec);
    }
    /**
     * The Set HTTP Headers operation sets system properties on the blob
     * @param options The options parameters.
     */
    setHttpHeaders(options) {
        return this.client.sendOperationRequest({ options }, setHttpHeadersOperationSpec);
    }
    /**
     * The Set Immutability Policy operation sets the immutability policy on the blob
     * @param options The options parameters.
     */
    setImmutabilityPolicy(options) {
        return this.client.sendOperationRequest({ options }, setImmutabilityPolicyOperationSpec);
    }
    /**
     * The Delete Immutability Policy operation deletes the immutability policy on the blob
     * @param options The options parameters.
     */
    deleteImmutabilityPolicy(options) {
        return this.client.sendOperationRequest({ options }, deleteImmutabilityPolicyOperationSpec);
    }
    /**
     * The Set Legal Hold operation sets a legal hold on the blob.
     * @param legalHold Specified if a legal hold should be set on the blob.
     * @param options The options parameters.
     */
    setLegalHold(legalHold, options) {
        return this.client.sendOperationRequest({ legalHold, options }, setLegalHoldOperationSpec);
    }
    /**
     * The Set Blob Metadata operation sets user-defined metadata for the specified blob as one or more
     * name-value pairs
     * @param options The options parameters.
     */
    setMetadata(options) {
        return this.client.sendOperationRequest({ options }, setMetadataOperationSpec);
    }
    /**
     * [Update] The Lease Blob operation establishes and manages a lock on a blob for write and delete
     * operations
     * @param options The options parameters.
     */
    acquireLease(options) {
        return this.client.sendOperationRequest({ options }, acquireLeaseOperationSpec);
    }
    /**
     * [Update] The Lease Blob operation establishes and manages a lock on a blob for write and delete
     * operations
     * @param leaseId Specifies the current lease ID on the resource.
     * @param options The options parameters.
     */
    releaseLease(leaseId, options) {
        return this.client.sendOperationRequest({ leaseId, options }, releaseLeaseOperationSpec);
    }
    /**
     * [Update] The Lease Blob operation establishes and manages a lock on a blob for write and delete
     * operations
     * @param leaseId Specifies the current lease ID on the resource.
     * @param options The options parameters.
     */
    renewLease(leaseId, options) {
        return this.client.sendOperationRequest({ leaseId, options }, renewLeaseOperationSpec);
    }
    /**
     * [Update] The Lease Blob operation establishes and manages a lock on a blob for write and delete
     * operations
     * @param leaseId Specifies the current lease ID on the resource.
     * @param proposedLeaseId Proposed lease ID, in a GUID string format. The Blob service returns 400
     *                        (Invalid request) if the proposed lease ID is not in the correct format. See Guid Constructor
     *                        (String) for a list of valid GUID string formats.
     * @param options The options parameters.
     */
    changeLease(leaseId, proposedLeaseId, options) {
        return this.client.sendOperationRequest({ leaseId, proposedLeaseId, options }, changeLeaseOperationSpec);
    }
    /**
     * [Update] The Lease Blob operation establishes and manages a lock on a blob for write and delete
     * operations
     * @param options The options parameters.
     */
    breakLease(options) {
        return this.client.sendOperationRequest({ options }, breakLeaseOperationSpec);
    }
    /**
     * The Create Snapshot operation creates a read-only snapshot of a blob
     * @param options The options parameters.
     */
    createSnapshot(options) {
        return this.client.sendOperationRequest({ options }, createSnapshotOperationSpec);
    }
    /**
     * The Start Copy From URL operation copies a blob or an internet resource to a new blob.
     * @param copySource Specifies the name of the source page blob snapshot. This value is a URL of up to
     *                   2 KB in length that specifies a page blob snapshot. The value should be URL-encoded as it would
     *                   appear in a request URI. The source blob must either be public or must be authenticated via a shared
     *                   access signature.
     * @param options The options parameters.
     */
    startCopyFromURL(copySource, options) {
        return this.client.sendOperationRequest({ copySource, options }, startCopyFromURLOperationSpec);
    }
    /**
     * The Copy From URL operation copies a blob or an internet resource to a new blob. It will not return
     * a response until the copy is complete.
     * @param copySource Specifies the name of the source page blob snapshot. This value is a URL of up to
     *                   2 KB in length that specifies a page blob snapshot. The value should be URL-encoded as it would
     *                   appear in a request URI. The source blob must either be public or must be authenticated via a shared
     *                   access signature.
     * @param options The options parameters.
     */
    copyFromURL(copySource, options) {
        return this.client.sendOperationRequest({ copySource, options }, copyFromURLOperationSpec);
    }
    /**
     * The Abort Copy From URL operation aborts a pending Copy From URL operation, and leaves a destination
     * blob with zero length and full metadata.
     * @param copyId The copy identifier provided in the x-ms-copy-id header of the original Copy Blob
     *               operation.
     * @param options The options parameters.
     */
    abortCopyFromURL(copyId, options) {
        return this.client.sendOperationRequest({ copyId, options }, abortCopyFromURLOperationSpec);
    }
    /**
     * The Set Tier operation sets the tier on a blob. The operation is allowed on a page blob in a premium
     * storage account and on a block blob in a blob storage account (locally redundant storage only). A
     * premium page blob's tier determines the allowed size, IOPS, and bandwidth of the blob. A block
     * blob's tier determines Hot/Cool/Archive storage type. This operation does not update the blob's
     * ETag.
     * @param tier Indicates the tier to be set on the blob.
     * @param options The options parameters.
     */
    setTier(tier, options) {
        return this.client.sendOperationRequest({ tier, options }, setTierOperationSpec);
    }
    /**
     * Returns the sku name and account kind
     * @param options The options parameters.
     */
    getAccountInfo(options) {
        return this.client.sendOperationRequest({ options }, getAccountInfoOperationSpec);
    }
    /**
     * The Query operation enables users to select/project on blob data by providing simple query
     * expressions.
     * @param options The options parameters.
     */
    query(options) {
        return this.client.sendOperationRequest({ options }, queryOperationSpec);
    }
    /**
     * The Get Tags operation enables users to get the tags associated with a blob.
     * @param options The options parameters.
     */
    getTags(options) {
        return this.client.sendOperationRequest({ options }, getTagsOperationSpec);
    }
    /**
     * The Set Tags operation enables users to set tags on a blob.
     * @param options The options parameters.
     */
    setTags(options) {
        return this.client.sendOperationRequest({ options }, setTagsOperationSpec);
    }
}
// Operation Specifications
const xmlSerializer$3 = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const downloadOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: BlobDownloadHeaders,
        },
        206: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: BlobDownloadHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobDownloadExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        range,
        rangeGetContentMD5,
        rangeGetContentCRC64,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const getPropertiesOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "HEAD",
    responses: {
        200: {
            headersMapper: BlobGetPropertiesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobGetPropertiesExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const deleteOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "DELETE",
    responses: {
        202: {
            headersMapper: BlobDeleteHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobDeleteExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        blobDeleteType,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        deleteSnapshots,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const undeleteOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobUndeleteHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobUndeleteExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp8],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setExpiryOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetExpiryHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetExpiryExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp11],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        expiryOptions,
        expiresOn,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setHttpHeadersOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetHttpHeadersHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetHttpHeadersExceptionHeaders,
        },
    },
    queryParameters: [comp, timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setImmutabilityPolicyOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetImmutabilityPolicyHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetImmutabilityPolicyExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        comp12,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifUnmodifiedSince,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const deleteImmutabilityPolicyOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "DELETE",
    responses: {
        200: {
            headersMapper: BlobDeleteImmutabilityPolicyHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobDeleteImmutabilityPolicyExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        comp12,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setLegalHoldOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetLegalHoldHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetLegalHoldExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        comp13,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        legalHold,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setMetadataOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetMetadataHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetMetadataExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp6],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const acquireLeaseOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlobAcquireLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobAcquireLeaseExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp10],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action,
        duration,
        proposedLeaseId,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const releaseLeaseOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobReleaseLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobReleaseLeaseExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp10],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action1,
        leaseId1,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const renewLeaseOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobRenewLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobRenewLeaseExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp10],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        leaseId1,
        action2,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const changeLeaseOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobChangeLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobChangeLeaseExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp10],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        leaseId1,
        action4,
        proposedLeaseId1,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const breakLeaseOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: BlobBreakLeaseHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobBreakLeaseExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp10],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        action3,
        breakPeriod,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const createSnapshotOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlobCreateSnapshotHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobCreateSnapshotExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp14],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const startCopyFromURLOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: BlobStartCopyFromURLHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobStartCopyFromURLExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        tier,
        rehydratePriority,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        sourceIfTags,
        copySource,
        blobTagsString,
        sealBlob,
        legalHold1,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const copyFromURLOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: BlobCopyFromURLHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobCopyFromURLExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        encryptionScope,
        tier,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        copySource,
        blobTagsString,
        legalHold1,
        xMsRequiresSync,
        sourceContentMD5,
        copySourceAuthorization,
        copySourceTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const abortCopyFromURLOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        204: {
            headersMapper: BlobAbortCopyFromURLHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobAbortCopyFromURLExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        comp15,
        copyId,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        copyActionAbortConstant,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setTierOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: BlobSetTierHeaders,
        },
        202: {
            headersMapper: BlobSetTierHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetTierExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        comp16,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifTags,
        rehydratePriority,
        tier1,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const getAccountInfoOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            headersMapper: BlobGetAccountInfoHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobGetAccountInfoExceptionHeaders,
        },
    },
    queryParameters: [
        comp,
        timeoutInSeconds,
        restype1,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const queryOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "POST",
    responses: {
        200: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: BlobQueryHeaders,
        },
        206: {
            bodyMapper: {
                type: { name: "Stream" },
                serializedName: "parsedResponse",
            },
            headersMapper: BlobQueryHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobQueryExceptionHeaders,
        },
    },
    requestBody: queryRequest,
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        comp17,
    ],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$3,
};
const getTagsOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: BlobTags,
            headersMapper: BlobGetTagsHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobGetTagsExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        versionId,
        comp18,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$3,
};
const setTagsOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        204: {
            headersMapper: BlobSetTagsHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlobSetTagsExceptionHeaders,
        },
    },
    requestBody: tags,
    queryParameters: [
        timeoutInSeconds,
        versionId,
        comp18,
    ],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
        leaseId,
        ifTags,
        transactionalContentMD5,
        transactionalContentCrc64,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer$3,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing PageBlob operations. */
class PageBlobImpl {
    /**
     * Initialize a new instance of the class PageBlob class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * The Create operation creates a new page blob.
     * @param contentLength The length of the request.
     * @param blobContentLength This header specifies the maximum size for the page blob, up to 1 TB. The
     *                          page blob size must be aligned to a 512-byte boundary.
     * @param options The options parameters.
     */
    create(contentLength, blobContentLength, options) {
        return this.client.sendOperationRequest({ contentLength, blobContentLength, options }, createOperationSpec$1);
    }
    /**
     * The Upload Pages operation writes a range of pages to a page blob
     * @param contentLength The length of the request.
     * @param body Initial data
     * @param options The options parameters.
     */
    uploadPages(contentLength, body, options) {
        return this.client.sendOperationRequest({ contentLength, body, options }, uploadPagesOperationSpec);
    }
    /**
     * The Clear Pages operation clears a set of pages from a page blob
     * @param contentLength The length of the request.
     * @param options The options parameters.
     */
    clearPages(contentLength, options) {
        return this.client.sendOperationRequest({ contentLength, options }, clearPagesOperationSpec);
    }
    /**
     * The Upload Pages operation writes a range of pages to a page blob where the contents are read from a
     * URL
     * @param sourceUrl Specify a URL to the copy source.
     * @param sourceRange Bytes of source data in the specified range. The length of this range should
     *                    match the ContentLength header and x-ms-range/Range destination range header.
     * @param contentLength The length of the request.
     * @param range The range of bytes to which the source range would be written. The range should be 512
     *              aligned and range-end is required.
     * @param options The options parameters.
     */
    uploadPagesFromURL(sourceUrl, sourceRange, contentLength, range, options) {
        return this.client.sendOperationRequest({ sourceUrl, sourceRange, contentLength, range, options }, uploadPagesFromURLOperationSpec);
    }
    /**
     * The Get Page Ranges operation returns the list of valid page ranges for a page blob or snapshot of a
     * page blob
     * @param options The options parameters.
     */
    getPageRanges(options) {
        return this.client.sendOperationRequest({ options }, getPageRangesOperationSpec);
    }
    /**
     * The Get Page Ranges Diff operation returns the list of valid page ranges for a page blob that were
     * changed between target blob and previous snapshot.
     * @param options The options parameters.
     */
    getPageRangesDiff(options) {
        return this.client.sendOperationRequest({ options }, getPageRangesDiffOperationSpec);
    }
    /**
     * Resize the Blob
     * @param blobContentLength This header specifies the maximum size for the page blob, up to 1 TB. The
     *                          page blob size must be aligned to a 512-byte boundary.
     * @param options The options parameters.
     */
    resize(blobContentLength, options) {
        return this.client.sendOperationRequest({ blobContentLength, options }, resizeOperationSpec);
    }
    /**
     * Update the sequence number of the blob
     * @param sequenceNumberAction Required if the x-ms-blob-sequence-number header is set for the request.
     *                             This property applies to page blobs only. This property indicates how the service should modify the
     *                             blob's sequence number
     * @param options The options parameters.
     */
    updateSequenceNumber(sequenceNumberAction, options) {
        return this.client.sendOperationRequest({ sequenceNumberAction, options }, updateSequenceNumberOperationSpec);
    }
    /**
     * The Copy Incremental operation copies a snapshot of the source page blob to a destination page blob.
     * The snapshot is copied such that only the differential changes between the previously copied
     * snapshot are transferred to the destination. The copied snapshots are complete copies of the
     * original snapshot and can be read or copied from as usual. This API is supported since REST version
     * 2016-05-31.
     * @param copySource Specifies the name of the source page blob snapshot. This value is a URL of up to
     *                   2 KB in length that specifies a page blob snapshot. The value should be URL-encoded as it would
     *                   appear in a request URI. The source blob must either be public or must be authenticated via a shared
     *                   access signature.
     * @param options The options parameters.
     */
    copyIncremental(copySource, options) {
        return this.client.sendOperationRequest({ copySource, options }, copyIncrementalOperationSpec);
    }
}
// Operation Specifications
const xmlSerializer$2 = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const createOperationSpec$1 = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: PageBlobCreateHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobCreateExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        encryptionScope,
        tier,
        blobTagsString,
        legalHold1,
        blobType,
        blobContentLength,
        blobSequenceNumber,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const uploadPagesOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: PageBlobUploadPagesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobUploadPagesExceptionHeaders,
        },
    },
    requestBody: body1,
    queryParameters: [timeoutInSeconds, comp19],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        contentLength,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        range,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        transactionalContentMD5,
        transactionalContentCrc64,
        contentType1,
        accept2,
        pageWrite,
        ifSequenceNumberLessThanOrEqualTo,
        ifSequenceNumberLessThan,
        ifSequenceNumberEqualTo,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "binary",
    serializer: xmlSerializer$2,
};
const clearPagesOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: PageBlobClearPagesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobClearPagesExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp19],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        range,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        ifSequenceNumberLessThanOrEqualTo,
        ifSequenceNumberLessThan,
        ifSequenceNumberEqualTo,
        pageWrite1,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const uploadPagesFromURLOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: PageBlobUploadPagesFromURLHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobUploadPagesFromURLExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp19],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        sourceContentMD5,
        copySourceAuthorization,
        pageWrite,
        ifSequenceNumberLessThanOrEqualTo,
        ifSequenceNumberLessThan,
        ifSequenceNumberEqualTo,
        sourceUrl,
        sourceRange,
        sourceContentCrc64,
        range1,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const getPageRangesOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: PageList,
            headersMapper: PageBlobGetPageRangesHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobGetPageRangesExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        marker,
        maxPageSize,
        snapshot,
        comp20,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        range,
        ifMatch,
        ifNoneMatch,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const getPageRangesDiffOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: PageList,
            headersMapper: PageBlobGetPageRangesDiffHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobGetPageRangesDiffExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        marker,
        maxPageSize,
        snapshot,
        comp20,
        prevsnapshot,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        range,
        ifMatch,
        ifNoneMatch,
        ifTags,
        prevSnapshotUrl,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const resizeOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: PageBlobResizeHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobResizeExceptionHeaders,
        },
    },
    queryParameters: [comp, timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        blobContentLength,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const updateSequenceNumberOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: PageBlobUpdateSequenceNumberHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobUpdateSequenceNumberExceptionHeaders,
        },
    },
    queryParameters: [comp, timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobSequenceNumber,
        sequenceNumberAction,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};
const copyIncrementalOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        202: {
            headersMapper: PageBlobCopyIncrementalHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: PageBlobCopyIncrementalExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp21],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        ifTags,
        copySource,
    ],
    isXML: true,
    serializer: xmlSerializer$2,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing AppendBlob operations. */
class AppendBlobImpl {
    /**
     * Initialize a new instance of the class AppendBlob class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * The Create Append Blob operation creates a new append blob.
     * @param contentLength The length of the request.
     * @param options The options parameters.
     */
    create(contentLength, options) {
        return this.client.sendOperationRequest({ contentLength, options }, createOperationSpec);
    }
    /**
     * The Append Block operation commits a new block of data to the end of an existing append blob. The
     * Append Block operation is permitted only if the blob was created with x-ms-blob-type set to
     * AppendBlob. Append Block is supported only on version 2015-02-21 version or later.
     * @param contentLength The length of the request.
     * @param body Initial data
     * @param options The options parameters.
     */
    appendBlock(contentLength, body, options) {
        return this.client.sendOperationRequest({ contentLength, body, options }, appendBlockOperationSpec);
    }
    /**
     * The Append Block operation commits a new block of data to the end of an existing append blob where
     * the contents are read from a source url. The Append Block operation is permitted only if the blob
     * was created with x-ms-blob-type set to AppendBlob. Append Block is supported only on version
     * 2015-02-21 version or later.
     * @param sourceUrl Specify a URL to the copy source.
     * @param contentLength The length of the request.
     * @param options The options parameters.
     */
    appendBlockFromUrl(sourceUrl, contentLength, options) {
        return this.client.sendOperationRequest({ sourceUrl, contentLength, options }, appendBlockFromUrlOperationSpec);
    }
    /**
     * The Seal operation seals the Append Blob to make it read-only. Seal is supported only on version
     * 2019-12-12 version or later.
     * @param options The options parameters.
     */
    seal(options) {
        return this.client.sendOperationRequest({ options }, sealOperationSpec);
    }
}
// Operation Specifications
const xmlSerializer$1 = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const createOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: AppendBlobCreateHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: AppendBlobCreateExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        encryptionScope,
        blobTagsString,
        legalHold1,
        blobType1,
    ],
    isXML: true,
    serializer: xmlSerializer$1,
};
const appendBlockOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: AppendBlobAppendBlockHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: AppendBlobAppendBlockExceptionHeaders,
        },
    },
    requestBody: body1,
    queryParameters: [timeoutInSeconds, comp22],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        contentLength,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        transactionalContentMD5,
        transactionalContentCrc64,
        contentType1,
        accept2,
        maxSize,
        appendPosition,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "binary",
    serializer: xmlSerializer$1,
};
const appendBlockFromUrlOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: AppendBlobAppendBlockFromUrlHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: AppendBlobAppendBlockFromUrlExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp22],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        encryptionScope,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        sourceContentMD5,
        copySourceAuthorization,
        transactionalContentMD5,
        sourceUrl,
        sourceContentCrc64,
        maxSize,
        appendPosition,
        sourceRange1,
    ],
    isXML: true,
    serializer: xmlSerializer$1,
};
const sealOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        200: {
            headersMapper: AppendBlobSealHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: AppendBlobSealExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds, comp23],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        ifMatch,
        ifNoneMatch,
        appendPosition,
    ],
    isXML: true,
    serializer: xmlSerializer$1,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
/** Class containing BlockBlob operations. */
class BlockBlobImpl {
    /**
     * Initialize a new instance of the class BlockBlob class.
     * @param client Reference to the service client
     */
    constructor(client) {
        this.client = client;
    }
    /**
     * The Upload Block Blob operation updates the content of an existing block blob. Updating an existing
     * block blob overwrites any existing metadata on the blob. Partial updates are not supported with Put
     * Blob; the content of the existing blob is overwritten with the content of the new blob. To perform a
     * partial update of the content of a block blob, use the Put Block List operation.
     * @param contentLength The length of the request.
     * @param body Initial data
     * @param options The options parameters.
     */
    upload(contentLength, body, options) {
        return this.client.sendOperationRequest({ contentLength, body, options }, uploadOperationSpec);
    }
    /**
     * The Put Blob from URL operation creates a new Block Blob where the contents of the blob are read
     * from a given URL.  This API is supported beginning with the 2020-04-08 version. Partial updates are
     * not supported with Put Blob from URL; the content of an existing blob is overwritten with the
     * content of the new blob.  To perform partial updates to a block blob’s contents using a source URL,
     * use the Put Block from URL API in conjunction with Put Block List.
     * @param contentLength The length of the request.
     * @param copySource Specifies the name of the source page blob snapshot. This value is a URL of up to
     *                   2 KB in length that specifies a page blob snapshot. The value should be URL-encoded as it would
     *                   appear in a request URI. The source blob must either be public or must be authenticated via a shared
     *                   access signature.
     * @param options The options parameters.
     */
    putBlobFromUrl(contentLength, copySource, options) {
        return this.client.sendOperationRequest({ contentLength, copySource, options }, putBlobFromUrlOperationSpec);
    }
    /**
     * The Stage Block operation creates a new block to be committed as part of a blob
     * @param blockId A valid Base64 string value that identifies the block. Prior to encoding, the string
     *                must be less than or equal to 64 bytes in size. For a given blob, the length of the value specified
     *                for the blockid parameter must be the same size for each block.
     * @param contentLength The length of the request.
     * @param body Initial data
     * @param options The options parameters.
     */
    stageBlock(blockId, contentLength, body, options) {
        return this.client.sendOperationRequest({ blockId, contentLength, body, options }, stageBlockOperationSpec);
    }
    /**
     * The Stage Block operation creates a new block to be committed as part of a blob where the contents
     * are read from a URL.
     * @param blockId A valid Base64 string value that identifies the block. Prior to encoding, the string
     *                must be less than or equal to 64 bytes in size. For a given blob, the length of the value specified
     *                for the blockid parameter must be the same size for each block.
     * @param contentLength The length of the request.
     * @param sourceUrl Specify a URL to the copy source.
     * @param options The options parameters.
     */
    stageBlockFromURL(blockId, contentLength, sourceUrl, options) {
        return this.client.sendOperationRequest({ blockId, contentLength, sourceUrl, options }, stageBlockFromURLOperationSpec);
    }
    /**
     * The Commit Block List operation writes a blob by specifying the list of block IDs that make up the
     * blob. In order to be written as part of a blob, a block must have been successfully written to the
     * server in a prior Put Block operation. You can call Put Block List to update a blob by uploading
     * only those blocks that have changed, then committing the new and existing blocks together. You can
     * do this by specifying whether to commit a block from the committed block list or from the
     * uncommitted block list, or to commit the most recently uploaded version of the block, whichever list
     * it may belong to.
     * @param blocks Blob Blocks.
     * @param options The options parameters.
     */
    commitBlockList(blocks, options) {
        return this.client.sendOperationRequest({ blocks, options }, commitBlockListOperationSpec);
    }
    /**
     * The Get Block List operation retrieves the list of blocks that have been uploaded as part of a block
     * blob
     * @param listType Specifies whether to return the list of committed blocks, the list of uncommitted
     *                 blocks, or both lists together.
     * @param options The options parameters.
     */
    getBlockList(listType, options) {
        return this.client.sendOperationRequest({ listType, options }, getBlockListOperationSpec);
    }
}
// Operation Specifications
const xmlSerializer = coreClient__namespace.createSerializer(Mappers, /* isXml */ true);
const uploadOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlockBlobUploadHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobUploadExceptionHeaders,
        },
    },
    requestBody: body1,
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        contentLength,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        encryptionScope,
        tier,
        blobTagsString,
        legalHold1,
        transactionalContentMD5,
        transactionalContentCrc64,
        contentType1,
        accept2,
        blobType2,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "binary",
    serializer: xmlSerializer,
};
const putBlobFromUrlOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlockBlobPutBlobFromUrlHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobPutBlobFromUrlExceptionHeaders,
        },
    },
    queryParameters: [timeoutInSeconds],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
        encryptionScope,
        tier,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        sourceIfTags,
        copySource,
        blobTagsString,
        sourceContentMD5,
        copySourceAuthorization,
        copySourceTags,
        transactionalContentMD5,
        blobType2,
        copySourceBlobProperties,
    ],
    isXML: true,
    serializer: xmlSerializer,
};
const stageBlockOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlockBlobStageBlockHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobStageBlockExceptionHeaders,
        },
    },
    requestBody: body1,
    queryParameters: [
        timeoutInSeconds,
        comp24,
        blockId,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        contentLength,
        leaseId,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        encryptionScope,
        transactionalContentMD5,
        transactionalContentCrc64,
        contentType1,
        accept2,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "binary",
    serializer: xmlSerializer,
};
const stageBlockFromURLOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlockBlobStageBlockFromURLHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobStageBlockFromURLExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        comp24,
        blockId,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        contentLength,
        leaseId,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        encryptionScope,
        sourceIfModifiedSince,
        sourceIfUnmodifiedSince,
        sourceIfMatch,
        sourceIfNoneMatch,
        sourceContentMD5,
        copySourceAuthorization,
        sourceUrl,
        sourceContentCrc64,
        sourceRange1,
    ],
    isXML: true,
    serializer: xmlSerializer,
};
const commitBlockListOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "PUT",
    responses: {
        201: {
            headersMapper: BlockBlobCommitBlockListHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobCommitBlockListExceptionHeaders,
        },
    },
    requestBody: blocks,
    queryParameters: [timeoutInSeconds, comp25],
    urlParameters: [url],
    headerParameters: [
        contentType,
        accept,
        version,
        requestId,
        metadata,
        leaseId,
        ifModifiedSince,
        ifUnmodifiedSince,
        encryptionKey,
        encryptionKeySha256,
        encryptionAlgorithm,
        ifMatch,
        ifNoneMatch,
        ifTags,
        blobCacheControl,
        blobContentType,
        blobContentMD5,
        blobContentEncoding,
        blobContentLanguage,
        blobContentDisposition,
        immutabilityPolicyExpiry,
        immutabilityPolicyMode,
        encryptionScope,
        tier,
        blobTagsString,
        legalHold1,
        transactionalContentMD5,
        transactionalContentCrc64,
    ],
    isXML: true,
    contentType: "application/xml; charset=utf-8",
    mediaType: "xml",
    serializer: xmlSerializer,
};
const getBlockListOperationSpec = {
    path: "/{containerName}/{blob}",
    httpMethod: "GET",
    responses: {
        200: {
            bodyMapper: BlockList,
            headersMapper: BlockBlobGetBlockListHeaders,
        },
        default: {
            bodyMapper: StorageError,
            headersMapper: BlockBlobGetBlockListExceptionHeaders,
        },
    },
    queryParameters: [
        timeoutInSeconds,
        snapshot,
        comp25,
        listType,
    ],
    urlParameters: [url],
    headerParameters: [
        version,
        requestId,
        accept1,
        leaseId,
        ifTags,
    ],
    isXML: true,
    serializer: xmlSerializer,
};

/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */
let StorageClient$1 = class StorageClient extends coreHttpCompat__namespace.ExtendedServiceClient {
    /**
     * Initializes a new instance of the StorageClient class.
     * @param url The URL of the service account, container, or blob that is the target of the desired
     *            operation.
     * @param options The parameter options
     */
    constructor(url, options) {
        var _a, _b;
        if (url === undefined) {
            throw new Error("'url' cannot be null");
        }
        // Initializing default values for options
        if (!options) {
            options = {};
        }
        const defaults = {
            requestContentType: "application/json; charset=utf-8",
        };
        const packageDetails = `azsdk-js-azure-storage-blob/12.26.0`;
        const userAgentPrefix = options.userAgentOptions && options.userAgentOptions.userAgentPrefix
            ? `${options.userAgentOptions.userAgentPrefix} ${packageDetails}`
            : `${packageDetails}`;
        const optionsWithDefaults = Object.assign(Object.assign(Object.assign({}, defaults), options), { userAgentOptions: {
                userAgentPrefix,
            }, endpoint: (_b = (_a = options.endpoint) !== null && _a !== void 0 ? _a : options.baseUri) !== null && _b !== void 0 ? _b : "{url}" });
        super(optionsWithDefaults);
        // Parameter assignments
        this.url = url;
        // Assigning values to Constant parameters
        this.version = options.version || "2025-01-05";
        this.service = new ServiceImpl(this);
        this.container = new ContainerImpl(this);
        this.blob = new BlobImpl(this);
        this.pageBlob = new PageBlobImpl(this);
        this.appendBlob = new AppendBlobImpl(this);
        this.blockBlob = new BlockBlobImpl(this);
    }
};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * @internal
 */
class StorageContextClient extends StorageClient$1 {
    async sendOperationRequest(operationArguments, operationSpec) {
        const operationSpecToSend = Object.assign({}, operationSpec);
        if (operationSpecToSend.path === "/{containerName}" ||
            operationSpecToSend.path === "/{containerName}/{blob}") {
            operationSpecToSend.path = "";
        }
        return super.sendOperationRequest(operationArguments, operationSpecToSend);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A StorageClient represents a based URL class for {@link BlobServiceClient}, {@link ContainerClient}
 * and etc.
 */
class StorageClient {
    /**
     * Creates an instance of StorageClient.
     * @param url - url to resource
     * @param pipeline - request policy pipeline.
     */
    constructor(url, pipeline) {
        // URL should be encoded and only once, protocol layer shouldn't encode URL again
        this.url = escapeURLPath(url);
        this.accountName = getAccountNameFromUrl(url);
        this.pipeline = pipeline;
        this.storageClientContext = new StorageContextClient(this.url, getCoreClientOptions(pipeline));
        this.isHttps = iEqual(getURLScheme(this.url) || "", "https");
        this.credential = getCredentialFromPipeline(pipeline);
        // Override protocol layer's default content-type
        const storageClientContext = this.storageClientContext;
        storageClientContext.requestContentType = undefined;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Creates a span using the global tracer.
 * @internal
 */
const tracingClient = coreTracing.createTracingClient({
    packageName: "@azure/storage-blob",
    packageVersion: SDK_VERSION,
    namespace: "Microsoft.Storage",
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * This is a helper class to construct a string representing the permissions granted by a ServiceSAS to a blob. Setting
 * a value to true means that any SAS which uses these permissions will grant permissions for that operation. Once all
 * the values are set, this should be serialized with toString and set as the permissions field on a
 * {@link BlobSASSignatureValues} object. It is possible to construct the permissions string without this class, but
 * the order of the permissions is particular and this class guarantees correctness.
 */
class BlobSASPermissions {
    constructor() {
        /**
         * Specifies Read access granted.
         */
        this.read = false;
        /**
         * Specifies Add access granted.
         */
        this.add = false;
        /**
         * Specifies Create access granted.
         */
        this.create = false;
        /**
         * Specifies Write access granted.
         */
        this.write = false;
        /**
         * Specifies Delete access granted.
         */
        this.delete = false;
        /**
         * Specifies Delete version access granted.
         */
        this.deleteVersion = false;
        /**
         * Specfies Tag access granted.
         */
        this.tag = false;
        /**
         * Specifies Move access granted.
         */
        this.move = false;
        /**
         * Specifies Execute access granted.
         */
        this.execute = false;
        /**
         * Specifies SetImmutabilityPolicy access granted.
         */
        this.setImmutabilityPolicy = false;
        /**
         * Specifies that Permanent Delete is permitted.
         */
        this.permanentDelete = false;
    }
    /**
     * Creates a {@link BlobSASPermissions} from the specified permissions string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid permission.
     *
     * @param permissions -
     */
    static parse(permissions) {
        const blobSASPermissions = new BlobSASPermissions();
        for (const char of permissions) {
            switch (char) {
                case "r":
                    blobSASPermissions.read = true;
                    break;
                case "a":
                    blobSASPermissions.add = true;
                    break;
                case "c":
                    blobSASPermissions.create = true;
                    break;
                case "w":
                    blobSASPermissions.write = true;
                    break;
                case "d":
                    blobSASPermissions.delete = true;
                    break;
                case "x":
                    blobSASPermissions.deleteVersion = true;
                    break;
                case "t":
                    blobSASPermissions.tag = true;
                    break;
                case "m":
                    blobSASPermissions.move = true;
                    break;
                case "e":
                    blobSASPermissions.execute = true;
                    break;
                case "i":
                    blobSASPermissions.setImmutabilityPolicy = true;
                    break;
                case "y":
                    blobSASPermissions.permanentDelete = true;
                    break;
                default:
                    throw new RangeError(`Invalid permission: ${char}`);
            }
        }
        return blobSASPermissions;
    }
    /**
     * Creates a {@link BlobSASPermissions} from a raw object which contains same keys as it
     * and boolean values for them.
     *
     * @param permissionLike -
     */
    static from(permissionLike) {
        const blobSASPermissions = new BlobSASPermissions();
        if (permissionLike.read) {
            blobSASPermissions.read = true;
        }
        if (permissionLike.add) {
            blobSASPermissions.add = true;
        }
        if (permissionLike.create) {
            blobSASPermissions.create = true;
        }
        if (permissionLike.write) {
            blobSASPermissions.write = true;
        }
        if (permissionLike.delete) {
            blobSASPermissions.delete = true;
        }
        if (permissionLike.deleteVersion) {
            blobSASPermissions.deleteVersion = true;
        }
        if (permissionLike.tag) {
            blobSASPermissions.tag = true;
        }
        if (permissionLike.move) {
            blobSASPermissions.move = true;
        }
        if (permissionLike.execute) {
            blobSASPermissions.execute = true;
        }
        if (permissionLike.setImmutabilityPolicy) {
            blobSASPermissions.setImmutabilityPolicy = true;
        }
        if (permissionLike.permanentDelete) {
            blobSASPermissions.permanentDelete = true;
        }
        return blobSASPermissions;
    }
    /**
     * Converts the given permissions to a string. Using this method will guarantee the permissions are in an
     * order accepted by the service.
     *
     * @returns A string which represents the BlobSASPermissions
     */
    toString() {
        const permissions = [];
        if (this.read) {
            permissions.push("r");
        }
        if (this.add) {
            permissions.push("a");
        }
        if (this.create) {
            permissions.push("c");
        }
        if (this.write) {
            permissions.push("w");
        }
        if (this.delete) {
            permissions.push("d");
        }
        if (this.deleteVersion) {
            permissions.push("x");
        }
        if (this.tag) {
            permissions.push("t");
        }
        if (this.move) {
            permissions.push("m");
        }
        if (this.execute) {
            permissions.push("e");
        }
        if (this.setImmutabilityPolicy) {
            permissions.push("i");
        }
        if (this.permanentDelete) {
            permissions.push("y");
        }
        return permissions.join("");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This is a helper class to construct a string representing the permissions granted by a ServiceSAS to a container.
 * Setting a value to true means that any SAS which uses these permissions will grant permissions for that operation.
 * Once all the values are set, this should be serialized with toString and set as the permissions field on a
 * {@link BlobSASSignatureValues} object. It is possible to construct the permissions string without this class, but
 * the order of the permissions is particular and this class guarantees correctness.
 */
class ContainerSASPermissions {
    constructor() {
        /**
         * Specifies Read access granted.
         */
        this.read = false;
        /**
         * Specifies Add access granted.
         */
        this.add = false;
        /**
         * Specifies Create access granted.
         */
        this.create = false;
        /**
         * Specifies Write access granted.
         */
        this.write = false;
        /**
         * Specifies Delete access granted.
         */
        this.delete = false;
        /**
         * Specifies Delete version access granted.
         */
        this.deleteVersion = false;
        /**
         * Specifies List access granted.
         */
        this.list = false;
        /**
         * Specfies Tag access granted.
         */
        this.tag = false;
        /**
         * Specifies Move access granted.
         */
        this.move = false;
        /**
         * Specifies Execute access granted.
         */
        this.execute = false;
        /**
         * Specifies SetImmutabilityPolicy access granted.
         */
        this.setImmutabilityPolicy = false;
        /**
         * Specifies that Permanent Delete is permitted.
         */
        this.permanentDelete = false;
        /**
         * Specifies that Filter Blobs by Tags is permitted.
         */
        this.filterByTags = false;
    }
    /**
     * Creates an {@link ContainerSASPermissions} from the specified permissions string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid permission.
     *
     * @param permissions -
     */
    static parse(permissions) {
        const containerSASPermissions = new ContainerSASPermissions();
        for (const char of permissions) {
            switch (char) {
                case "r":
                    containerSASPermissions.read = true;
                    break;
                case "a":
                    containerSASPermissions.add = true;
                    break;
                case "c":
                    containerSASPermissions.create = true;
                    break;
                case "w":
                    containerSASPermissions.write = true;
                    break;
                case "d":
                    containerSASPermissions.delete = true;
                    break;
                case "l":
                    containerSASPermissions.list = true;
                    break;
                case "t":
                    containerSASPermissions.tag = true;
                    break;
                case "x":
                    containerSASPermissions.deleteVersion = true;
                    break;
                case "m":
                    containerSASPermissions.move = true;
                    break;
                case "e":
                    containerSASPermissions.execute = true;
                    break;
                case "i":
                    containerSASPermissions.setImmutabilityPolicy = true;
                    break;
                case "y":
                    containerSASPermissions.permanentDelete = true;
                    break;
                case "f":
                    containerSASPermissions.filterByTags = true;
                    break;
                default:
                    throw new RangeError(`Invalid permission ${char}`);
            }
        }
        return containerSASPermissions;
    }
    /**
     * Creates a {@link ContainerSASPermissions} from a raw object which contains same keys as it
     * and boolean values for them.
     *
     * @param permissionLike -
     */
    static from(permissionLike) {
        const containerSASPermissions = new ContainerSASPermissions();
        if (permissionLike.read) {
            containerSASPermissions.read = true;
        }
        if (permissionLike.add) {
            containerSASPermissions.add = true;
        }
        if (permissionLike.create) {
            containerSASPermissions.create = true;
        }
        if (permissionLike.write) {
            containerSASPermissions.write = true;
        }
        if (permissionLike.delete) {
            containerSASPermissions.delete = true;
        }
        if (permissionLike.list) {
            containerSASPermissions.list = true;
        }
        if (permissionLike.deleteVersion) {
            containerSASPermissions.deleteVersion = true;
        }
        if (permissionLike.tag) {
            containerSASPermissions.tag = true;
        }
        if (permissionLike.move) {
            containerSASPermissions.move = true;
        }
        if (permissionLike.execute) {
            containerSASPermissions.execute = true;
        }
        if (permissionLike.setImmutabilityPolicy) {
            containerSASPermissions.setImmutabilityPolicy = true;
        }
        if (permissionLike.permanentDelete) {
            containerSASPermissions.permanentDelete = true;
        }
        if (permissionLike.filterByTags) {
            containerSASPermissions.filterByTags = true;
        }
        return containerSASPermissions;
    }
    /**
     * Converts the given permissions to a string. Using this method will guarantee the permissions are in an
     * order accepted by the service.
     *
     * The order of the characters should be as specified here to ensure correctness.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     */
    toString() {
        const permissions = [];
        if (this.read) {
            permissions.push("r");
        }
        if (this.add) {
            permissions.push("a");
        }
        if (this.create) {
            permissions.push("c");
        }
        if (this.write) {
            permissions.push("w");
        }
        if (this.delete) {
            permissions.push("d");
        }
        if (this.deleteVersion) {
            permissions.push("x");
        }
        if (this.list) {
            permissions.push("l");
        }
        if (this.tag) {
            permissions.push("t");
        }
        if (this.move) {
            permissions.push("m");
        }
        if (this.execute) {
            permissions.push("e");
        }
        if (this.setImmutabilityPolicy) {
            permissions.push("i");
        }
        if (this.permanentDelete) {
            permissions.push("y");
        }
        if (this.filterByTags) {
            permissions.push("f");
        }
        return permissions.join("");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * UserDelegationKeyCredential is only used for generation of user delegation SAS.
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas
 */
class UserDelegationKeyCredential {
    /**
     * Creates an instance of UserDelegationKeyCredential.
     * @param accountName -
     * @param userDelegationKey -
     */
    constructor(accountName, userDelegationKey) {
        this.accountName = accountName;
        this.userDelegationKey = userDelegationKey;
        this.key = Buffer.from(userDelegationKey.value, "base64");
    }
    /**
     * Generates a hash signature for an HTTP request or for a SAS.
     *
     * @param stringToSign -
     */
    computeHMACSHA256(stringToSign) {
        // console.log(`stringToSign: ${JSON.stringify(stringToSign)}`);
        return crypto.createHmac("sha256", this.key).update(stringToSign, "utf8").digest("base64");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Generate SasIPRange format string. For example:
 *
 * "8.8.8.8" or "1.1.1.1-255.255.255.255"
 *
 * @param ipRange -
 */
function ipRangeToString(ipRange) {
    return ipRange.end ? `${ipRange.start}-${ipRange.end}` : ipRange.start;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Protocols for generated SAS.
 */
exports.SASProtocol = void 0;
(function (SASProtocol) {
    /**
     * Protocol that allows HTTPS only
     */
    SASProtocol["Https"] = "https";
    /**
     * Protocol that allows both HTTPS and HTTP
     */
    SASProtocol["HttpsAndHttp"] = "https,http";
})(exports.SASProtocol || (exports.SASProtocol = {}));
/**
 * Represents the components that make up an Azure Storage SAS' query parameters. This type is not constructed directly
 * by the user; it is only generated by the {@link AccountSASSignatureValues} and {@link BlobSASSignatureValues}
 * types. Once generated, it can be encoded into a {@link String} and appended to a URL directly (though caution should
 * be taken here in case there are existing query parameters, which might affect the appropriate means of appending
 * these query parameters).
 *
 * NOTE: Instances of this class are immutable.
 */
class SASQueryParameters {
    /**
     * Optional. IP range allowed for this SAS.
     *
     * @readonly
     */
    get ipRange() {
        if (this.ipRangeInner) {
            return {
                end: this.ipRangeInner.end,
                start: this.ipRangeInner.start,
            };
        }
        return undefined;
    }
    constructor(version, signature, permissionsOrOptions, services, resourceTypes, protocol, startsOn, expiresOn, ipRange, identifier, resource, cacheControl, contentDisposition, contentEncoding, contentLanguage, contentType, userDelegationKey, preauthorizedAgentObjectId, correlationId, encryptionScope) {
        this.version = version;
        this.signature = signature;
        if (permissionsOrOptions !== undefined && typeof permissionsOrOptions !== "string") {
            // SASQueryParametersOptions
            this.permissions = permissionsOrOptions.permissions;
            this.services = permissionsOrOptions.services;
            this.resourceTypes = permissionsOrOptions.resourceTypes;
            this.protocol = permissionsOrOptions.protocol;
            this.startsOn = permissionsOrOptions.startsOn;
            this.expiresOn = permissionsOrOptions.expiresOn;
            this.ipRangeInner = permissionsOrOptions.ipRange;
            this.identifier = permissionsOrOptions.identifier;
            this.encryptionScope = permissionsOrOptions.encryptionScope;
            this.resource = permissionsOrOptions.resource;
            this.cacheControl = permissionsOrOptions.cacheControl;
            this.contentDisposition = permissionsOrOptions.contentDisposition;
            this.contentEncoding = permissionsOrOptions.contentEncoding;
            this.contentLanguage = permissionsOrOptions.contentLanguage;
            this.contentType = permissionsOrOptions.contentType;
            if (permissionsOrOptions.userDelegationKey) {
                this.signedOid = permissionsOrOptions.userDelegationKey.signedObjectId;
                this.signedTenantId = permissionsOrOptions.userDelegationKey.signedTenantId;
                this.signedStartsOn = permissionsOrOptions.userDelegationKey.signedStartsOn;
                this.signedExpiresOn = permissionsOrOptions.userDelegationKey.signedExpiresOn;
                this.signedService = permissionsOrOptions.userDelegationKey.signedService;
                this.signedVersion = permissionsOrOptions.userDelegationKey.signedVersion;
                this.preauthorizedAgentObjectId = permissionsOrOptions.preauthorizedAgentObjectId;
                this.correlationId = permissionsOrOptions.correlationId;
            }
        }
        else {
            this.services = services;
            this.resourceTypes = resourceTypes;
            this.expiresOn = expiresOn;
            this.permissions = permissionsOrOptions;
            this.protocol = protocol;
            this.startsOn = startsOn;
            this.ipRangeInner = ipRange;
            this.encryptionScope = encryptionScope;
            this.identifier = identifier;
            this.resource = resource;
            this.cacheControl = cacheControl;
            this.contentDisposition = contentDisposition;
            this.contentEncoding = contentEncoding;
            this.contentLanguage = contentLanguage;
            this.contentType = contentType;
            if (userDelegationKey) {
                this.signedOid = userDelegationKey.signedObjectId;
                this.signedTenantId = userDelegationKey.signedTenantId;
                this.signedStartsOn = userDelegationKey.signedStartsOn;
                this.signedExpiresOn = userDelegationKey.signedExpiresOn;
                this.signedService = userDelegationKey.signedService;
                this.signedVersion = userDelegationKey.signedVersion;
                this.preauthorizedAgentObjectId = preauthorizedAgentObjectId;
                this.correlationId = correlationId;
            }
        }
    }
    /**
     * Encodes all SAS query parameters into a string that can be appended to a URL.
     *
     */
    toString() {
        const params = [
            "sv",
            "ss",
            "srt",
            "spr",
            "st",
            "se",
            "sip",
            "si",
            "ses",
            "skoid", // Signed object ID
            "sktid", // Signed tenant ID
            "skt", // Signed key start time
            "ske", // Signed key expiry time
            "sks", // Signed key service
            "skv", // Signed key version
            "sr",
            "sp",
            "sig",
            "rscc",
            "rscd",
            "rsce",
            "rscl",
            "rsct",
            "saoid",
            "scid",
        ];
        const queries = [];
        for (const param of params) {
            switch (param) {
                case "sv":
                    this.tryAppendQueryParameter(queries, param, this.version);
                    break;
                case "ss":
                    this.tryAppendQueryParameter(queries, param, this.services);
                    break;
                case "srt":
                    this.tryAppendQueryParameter(queries, param, this.resourceTypes);
                    break;
                case "spr":
                    this.tryAppendQueryParameter(queries, param, this.protocol);
                    break;
                case "st":
                    this.tryAppendQueryParameter(queries, param, this.startsOn ? truncatedISO8061Date(this.startsOn, false) : undefined);
                    break;
                case "se":
                    this.tryAppendQueryParameter(queries, param, this.expiresOn ? truncatedISO8061Date(this.expiresOn, false) : undefined);
                    break;
                case "sip":
                    this.tryAppendQueryParameter(queries, param, this.ipRange ? ipRangeToString(this.ipRange) : undefined);
                    break;
                case "si":
                    this.tryAppendQueryParameter(queries, param, this.identifier);
                    break;
                case "ses":
                    this.tryAppendQueryParameter(queries, param, this.encryptionScope);
                    break;
                case "skoid": // Signed object ID
                    this.tryAppendQueryParameter(queries, param, this.signedOid);
                    break;
                case "sktid": // Signed tenant ID
                    this.tryAppendQueryParameter(queries, param, this.signedTenantId);
                    break;
                case "skt": // Signed key start time
                    this.tryAppendQueryParameter(queries, param, this.signedStartsOn ? truncatedISO8061Date(this.signedStartsOn, false) : undefined);
                    break;
                case "ske": // Signed key expiry time
                    this.tryAppendQueryParameter(queries, param, this.signedExpiresOn ? truncatedISO8061Date(this.signedExpiresOn, false) : undefined);
                    break;
                case "sks": // Signed key service
                    this.tryAppendQueryParameter(queries, param, this.signedService);
                    break;
                case "skv": // Signed key version
                    this.tryAppendQueryParameter(queries, param, this.signedVersion);
                    break;
                case "sr":
                    this.tryAppendQueryParameter(queries, param, this.resource);
                    break;
                case "sp":
                    this.tryAppendQueryParameter(queries, param, this.permissions);
                    break;
                case "sig":
                    this.tryAppendQueryParameter(queries, param, this.signature);
                    break;
                case "rscc":
                    this.tryAppendQueryParameter(queries, param, this.cacheControl);
                    break;
                case "rscd":
                    this.tryAppendQueryParameter(queries, param, this.contentDisposition);
                    break;
                case "rsce":
                    this.tryAppendQueryParameter(queries, param, this.contentEncoding);
                    break;
                case "rscl":
                    this.tryAppendQueryParameter(queries, param, this.contentLanguage);
                    break;
                case "rsct":
                    this.tryAppendQueryParameter(queries, param, this.contentType);
                    break;
                case "saoid":
                    this.tryAppendQueryParameter(queries, param, this.preauthorizedAgentObjectId);
                    break;
                case "scid":
                    this.tryAppendQueryParameter(queries, param, this.correlationId);
                    break;
            }
        }
        return queries.join("&");
    }
    /**
     * A private helper method used to filter and append query key/value pairs into an array.
     *
     * @param queries -
     * @param key -
     * @param value -
     */
    tryAppendQueryParameter(queries, key, value) {
        if (!value) {
            return;
        }
        key = encodeURIComponent(key);
        value = encodeURIComponent(value);
        if (key.length > 0 && value.length > 0) {
            queries.push(`${key}=${value}`);
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
function generateBlobSASQueryParameters(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName) {
    return generateBlobSASQueryParametersInternal(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName).sasQueryParameters;
}
function generateBlobSASQueryParametersInternal(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName) {
    const version = blobSASSignatureValues.version ? blobSASSignatureValues.version : SERVICE_VERSION;
    const sharedKeyCredential = sharedKeyCredentialOrUserDelegationKey instanceof StorageSharedKeyCredential
        ? sharedKeyCredentialOrUserDelegationKey
        : undefined;
    let userDelegationKeyCredential;
    if (sharedKeyCredential === undefined && accountName !== undefined) {
        userDelegationKeyCredential = new UserDelegationKeyCredential(accountName, sharedKeyCredentialOrUserDelegationKey);
    }
    if (sharedKeyCredential === undefined && userDelegationKeyCredential === undefined) {
        throw TypeError("Invalid sharedKeyCredential, userDelegationKey or accountName.");
    }
    // Version 2020-12-06 adds support for encryptionscope in SAS.
    if (version >= "2020-12-06") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20201206(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            return generateBlobSASQueryParametersUDK20201206(blobSASSignatureValues, userDelegationKeyCredential);
        }
    }
    // Version 2019-12-12 adds support for the blob tags permission.
    // Version 2018-11-09 adds support for the signed resource and signed blob snapshot time fields.
    // https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas#constructing-the-signature-string
    if (version >= "2018-11-09") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20181109(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            // Version 2020-02-10 delegation SAS signature construction includes preauthorizedAgentObjectId, agentObjectId, correlationId.
            if (version >= "2020-02-10") {
                return generateBlobSASQueryParametersUDK20200210(blobSASSignatureValues, userDelegationKeyCredential);
            }
            else {
                return generateBlobSASQueryParametersUDK20181109(blobSASSignatureValues, userDelegationKeyCredential);
            }
        }
    }
    if (version >= "2015-04-05") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20150405(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            throw new RangeError("'version' must be >= '2018-11-09' when generating user delegation SAS using user delegation key.");
        }
    }
    throw new RangeError("'version' must be >= '2015-04-05'.");
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2015-04-05 AND BEFORE 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20150405(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    if (blobSASSignatureValues.blobName) {
        resource = "b";
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20181109(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-12-06.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20201206(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.encryptionScope,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, undefined, undefined, undefined, blobSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20181109(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-02-10.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20200210(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.preauthorizedAgentObjectId,
        undefined, // agentObjectId
        blobSASSignatureValues.correlationId,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey, blobSASSignatureValues.preauthorizedAgentObjectId, blobSASSignatureValues.correlationId),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-12-06.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20201206(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.preauthorizedAgentObjectId,
        undefined, // agentObjectId
        blobSASSignatureValues.correlationId,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.encryptionScope,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey, blobSASSignatureValues.preauthorizedAgentObjectId, blobSASSignatureValues.correlationId, blobSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}
function getCanonicalName(accountName, containerName, blobName) {
    // Container: "/blob/account/containerName"
    // Blob:      "/blob/account/containerName/blobName"
    const elements = [`/blob/${accountName}/${containerName}`];
    if (blobName) {
        elements.push(`/${blobName}`);
    }
    return elements.join("");
}
function SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues) {
    const version = blobSASSignatureValues.version ? blobSASSignatureValues.version : SERVICE_VERSION;
    if (blobSASSignatureValues.snapshotTime && version < "2018-11-09") {
        throw RangeError("'version' must be >= '2018-11-09' when providing 'snapshotTime'.");
    }
    if (blobSASSignatureValues.blobName === undefined && blobSASSignatureValues.snapshotTime) {
        throw RangeError("Must provide 'blobName' when providing 'snapshotTime'.");
    }
    if (blobSASSignatureValues.versionId && version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'versionId'.");
    }
    if (blobSASSignatureValues.blobName === undefined && blobSASSignatureValues.versionId) {
        throw RangeError("Must provide 'blobName' when providing 'versionId'.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.setImmutabilityPolicy &&
        version < "2020-08-04") {
        throw RangeError("'version' must be >= '2020-08-04' when provided 'i' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.deleteVersion &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'x' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.permanentDelete &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'y' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.tag &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when providing 't' permission.");
    }
    if (version < "2020-02-10" &&
        blobSASSignatureValues.permissions &&
        (blobSASSignatureValues.permissions.move || blobSASSignatureValues.permissions.execute)) {
        throw RangeError("'version' must be >= '2020-02-10' when providing the 'm' or 'e' permission.");
    }
    if (version < "2021-04-10" &&
        blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.filterByTags) {
        throw RangeError("'version' must be >= '2021-04-10' when providing the 'f' permission.");
    }
    if (version < "2020-02-10" &&
        (blobSASSignatureValues.preauthorizedAgentObjectId || blobSASSignatureValues.correlationId)) {
        throw RangeError("'version' must be >= '2020-02-10' when providing 'preauthorizedAgentObjectId' or 'correlationId'.");
    }
    if (blobSASSignatureValues.encryptionScope && version < "2020-12-06") {
        throw RangeError("'version' must be >= '2020-12-06' when provided 'encryptionScope' in SAS.");
    }
    blobSASSignatureValues.version = version;
    return blobSASSignatureValues;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A client that manages leases for a {@link ContainerClient} or a {@link BlobClient}.
 */
class BlobLeaseClient {
    /**
     * Gets the lease Id.
     *
     * @readonly
     */
    get leaseId() {
        return this._leaseId;
    }
    /**
     * Gets the url.
     *
     * @readonly
     */
    get url() {
        return this._url;
    }
    /**
     * Creates an instance of BlobLeaseClient.
     * @param client - The client to make the lease operation requests.
     * @param leaseId - Initial proposed lease id.
     */
    constructor(client, leaseId) {
        const clientContext = client.storageClientContext;
        this._url = client.url;
        if (client.name === undefined) {
            this._isContainer = true;
            this._containerOrBlobOperation = clientContext.container;
        }
        else {
            this._isContainer = false;
            this._containerOrBlobOperation = clientContext.blob;
        }
        if (!leaseId) {
            leaseId = coreUtil.randomUUID();
        }
        this._leaseId = leaseId;
    }
    /**
     * Establishes and manages a lock on a container for delete operations, or on a blob
     * for write and delete operations.
     * The lock duration can be 15 to 60 seconds, or can be infinite.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-container
     * and
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob
     *
     * @param duration - Must be between 15 to 60 seconds, or infinite (-1)
     * @param options - option to configure lease management operations.
     * @returns Response data for acquire lease operation.
     */
    async acquireLease(duration, options = {}) {
        var _a, _b, _c, _d, _e;
        if (this._isContainer &&
            ((((_a = options.conditions) === null || _a === void 0 ? void 0 : _a.ifMatch) && ((_b = options.conditions) === null || _b === void 0 ? void 0 : _b.ifMatch) !== ETagNone) ||
                (((_c = options.conditions) === null || _c === void 0 ? void 0 : _c.ifNoneMatch) && ((_d = options.conditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch) !== ETagNone) ||
                ((_e = options.conditions) === null || _e === void 0 ? void 0 : _e.tagConditions))) {
            throw new RangeError("The IfMatch, IfNoneMatch and tags access conditions are ignored by the service. Values other than undefined or their default values are not acceptable.");
        }
        return tracingClient.withSpan("BlobLeaseClient-acquireLease", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this._containerOrBlobOperation.acquireLease({
                abortSignal: options.abortSignal,
                duration,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                proposedLeaseId: this._leaseId,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * To change the ID of the lease.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-container
     * and
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob
     *
     * @param proposedLeaseId - the proposed new lease Id.
     * @param options - option to configure lease management operations.
     * @returns Response data for change lease operation.
     */
    async changeLease(proposedLeaseId, options = {}) {
        var _a, _b, _c, _d, _e;
        if (this._isContainer &&
            ((((_a = options.conditions) === null || _a === void 0 ? void 0 : _a.ifMatch) && ((_b = options.conditions) === null || _b === void 0 ? void 0 : _b.ifMatch) !== ETagNone) ||
                (((_c = options.conditions) === null || _c === void 0 ? void 0 : _c.ifNoneMatch) && ((_d = options.conditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch) !== ETagNone) ||
                ((_e = options.conditions) === null || _e === void 0 ? void 0 : _e.tagConditions))) {
            throw new RangeError("The IfMatch, IfNoneMatch and tags access conditions are ignored by the service. Values other than undefined or their default values are not acceptable.");
        }
        return tracingClient.withSpan("BlobLeaseClient-changeLease", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this._containerOrBlobOperation.changeLease(this._leaseId, proposedLeaseId, {
                abortSignal: options.abortSignal,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            this._leaseId = proposedLeaseId;
            return response;
        });
    }
    /**
     * To free the lease if it is no longer needed so that another client may
     * immediately acquire a lease against the container or the blob.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-container
     * and
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob
     *
     * @param options - option to configure lease management operations.
     * @returns Response data for release lease operation.
     */
    async releaseLease(options = {}) {
        var _a, _b, _c, _d, _e;
        if (this._isContainer &&
            ((((_a = options.conditions) === null || _a === void 0 ? void 0 : _a.ifMatch) && ((_b = options.conditions) === null || _b === void 0 ? void 0 : _b.ifMatch) !== ETagNone) ||
                (((_c = options.conditions) === null || _c === void 0 ? void 0 : _c.ifNoneMatch) && ((_d = options.conditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch) !== ETagNone) ||
                ((_e = options.conditions) === null || _e === void 0 ? void 0 : _e.tagConditions))) {
            throw new RangeError("The IfMatch, IfNoneMatch and tags access conditions are ignored by the service. Values other than undefined or their default values are not acceptable.");
        }
        return tracingClient.withSpan("BlobLeaseClient-releaseLease", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this._containerOrBlobOperation.releaseLease(this._leaseId, {
                abortSignal: options.abortSignal,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * To renew the lease.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-container
     * and
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob
     *
     * @param options - Optional option to configure lease management operations.
     * @returns Response data for renew lease operation.
     */
    async renewLease(options = {}) {
        var _a, _b, _c, _d, _e;
        if (this._isContainer &&
            ((((_a = options.conditions) === null || _a === void 0 ? void 0 : _a.ifMatch) && ((_b = options.conditions) === null || _b === void 0 ? void 0 : _b.ifMatch) !== ETagNone) ||
                (((_c = options.conditions) === null || _c === void 0 ? void 0 : _c.ifNoneMatch) && ((_d = options.conditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch) !== ETagNone) ||
                ((_e = options.conditions) === null || _e === void 0 ? void 0 : _e.tagConditions))) {
            throw new RangeError("The IfMatch, IfNoneMatch and tags access conditions are ignored by the service. Values other than undefined or their default values are not acceptable.");
        }
        return tracingClient.withSpan("BlobLeaseClient-renewLease", options, async (updatedOptions) => {
            var _a;
            return this._containerOrBlobOperation.renewLease(this._leaseId, {
                abortSignal: options.abortSignal,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            });
        });
    }
    /**
     * To end the lease but ensure that another client cannot acquire a new lease
     * until the current lease period has expired.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-container
     * and
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob
     *
     * @param breakPeriod - Break period
     * @param options - Optional options to configure lease management operations.
     * @returns Response data for break lease operation.
     */
    async breakLease(breakPeriod, options = {}) {
        var _a, _b, _c, _d, _e;
        if (this._isContainer &&
            ((((_a = options.conditions) === null || _a === void 0 ? void 0 : _a.ifMatch) && ((_b = options.conditions) === null || _b === void 0 ? void 0 : _b.ifMatch) !== ETagNone) ||
                (((_c = options.conditions) === null || _c === void 0 ? void 0 : _c.ifNoneMatch) && ((_d = options.conditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch) !== ETagNone) ||
                ((_e = options.conditions) === null || _e === void 0 ? void 0 : _e.tagConditions))) {
            throw new RangeError("The IfMatch, IfNoneMatch and tags access conditions are ignored by the service. Values other than undefined or their default values are not acceptable.");
        }
        return tracingClient.withSpan("BlobLeaseClient-breakLease", options, async (updatedOptions) => {
            var _a;
            const operationOptions = {
                abortSignal: options.abortSignal,
                breakPeriod,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            };
            return assertResponse(await this._containerOrBlobOperation.breakLease(operationOptions));
        });
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * A Node.js ReadableStream will internally retry when internal ReadableStream unexpected ends.
 */
class RetriableReadableStream extends stream.Readable {
    /**
     * Creates an instance of RetriableReadableStream.
     *
     * @param source - The current ReadableStream returned from getter
     * @param getter - A method calling downloading request returning
     *                                      a new ReadableStream from specified offset
     * @param offset - Offset position in original data source to read
     * @param count - How much data in original data source to read
     * @param options -
     */
    constructor(source, getter, offset, count, options = {}) {
        super({ highWaterMark: options.highWaterMark });
        this.retries = 0;
        this.sourceDataHandler = (data) => {
            if (this.options.doInjectErrorOnce) {
                this.options.doInjectErrorOnce = undefined;
                this.source.pause();
                this.sourceErrorOrEndHandler();
                this.source.destroy();
                return;
            }
            // console.log(
            //   `Offset: ${this.offset}, Received ${data.length} from internal stream`
            // );
            this.offset += data.length;
            if (this.onProgress) {
                this.onProgress({ loadedBytes: this.offset - this.start });
            }
            if (!this.push(data)) {
                this.source.pause();
            }
        };
        this.sourceAbortedHandler = () => {
            const abortError = new abortController.AbortError("The operation was aborted.");
            this.destroy(abortError);
        };
        this.sourceErrorOrEndHandler = (err) => {
            if (err && err.name === "AbortError") {
                this.destroy(err);
                return;
            }
            // console.log(
            //   `Source stream emits end or error, offset: ${
            //     this.offset
            //   }, dest end : ${this.end}`
            // );
            this.removeSourceEventHandlers();
            if (this.offset - 1 === this.end) {
                this.push(null);
            }
            else if (this.offset <= this.end) {
                // console.log(
                //   `retries: ${this.retries}, max retries: ${this.maxRetries}`
                // );
                if (this.retries < this.maxRetryRequests) {
                    this.retries += 1;
                    this.getter(this.offset)
                        .then((newSource) => {
                        this.source = newSource;
                        this.setSourceEventHandlers();
                        return;
                    })
                        .catch((error) => {
                        this.destroy(error);
                    });
                }
                else {
                    this.destroy(new Error(`Data corruption failure: received less data than required and reached maxRetires limitation. Received data offset: ${this.offset - 1}, data needed offset: ${this.end}, retries: ${this.retries}, max retries: ${this.maxRetryRequests}`));
                }
            }
            else {
                this.destroy(new Error(`Data corruption failure: Received more data than original request, data needed offset is ${this.end}, received offset: ${this.offset - 1}`));
            }
        };
        this.getter = getter;
        this.source = source;
        this.start = offset;
        this.offset = offset;
        this.end = offset + count - 1;
        this.maxRetryRequests =
            options.maxRetryRequests && options.maxRetryRequests >= 0 ? options.maxRetryRequests : 0;
        this.onProgress = options.onProgress;
        this.options = options;
        this.setSourceEventHandlers();
    }
    _read() {
        this.source.resume();
    }
    setSourceEventHandlers() {
        this.source.on("data", this.sourceDataHandler);
        this.source.on("end", this.sourceErrorOrEndHandler);
        this.source.on("error", this.sourceErrorOrEndHandler);
        // needed for Node14
        this.source.on("aborted", this.sourceAbortedHandler);
    }
    removeSourceEventHandlers() {
        this.source.removeListener("data", this.sourceDataHandler);
        this.source.removeListener("end", this.sourceErrorOrEndHandler);
        this.source.removeListener("error", this.sourceErrorOrEndHandler);
        this.source.removeListener("aborted", this.sourceAbortedHandler);
    }
    _destroy(error, callback) {
        // remove listener from source and release source
        this.removeSourceEventHandlers();
        this.source.destroy();
        callback(error === null ? undefined : error);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * BlobDownloadResponse implements BlobDownloadResponseParsed interface, and in Node.js runtime it will
 * automatically retry when internal read stream unexpected ends. (This kind of unexpected ends cannot
 * trigger retries defined in pipeline retry policy.)
 *
 * The {@link readableStreamBody} stream will retry underlayer, you can just use it as a normal Node.js
 * Readable stream.
 */
class BlobDownloadResponse {
    /**
     * Indicates that the service supports
     * requests for partial file content.
     *
     * @readonly
     */
    get acceptRanges() {
        return this.originalResponse.acceptRanges;
    }
    /**
     * Returns if it was previously specified
     * for the file.
     *
     * @readonly
     */
    get cacheControl() {
        return this.originalResponse.cacheControl;
    }
    /**
     * Returns the value that was specified
     * for the 'x-ms-content-disposition' header and specifies how to process the
     * response.
     *
     * @readonly
     */
    get contentDisposition() {
        return this.originalResponse.contentDisposition;
    }
    /**
     * Returns the value that was specified
     * for the Content-Encoding request header.
     *
     * @readonly
     */
    get contentEncoding() {
        return this.originalResponse.contentEncoding;
    }
    /**
     * Returns the value that was specified
     * for the Content-Language request header.
     *
     * @readonly
     */
    get contentLanguage() {
        return this.originalResponse.contentLanguage;
    }
    /**
     * The current sequence number for a
     * page blob. This header is not returned for block blobs or append blobs.
     *
     * @readonly
     */
    get blobSequenceNumber() {
        return this.originalResponse.blobSequenceNumber;
    }
    /**
     * The blob's type. Possible values include:
     * 'BlockBlob', 'PageBlob', 'AppendBlob'.
     *
     * @readonly
     */
    get blobType() {
        return this.originalResponse.blobType;
    }
    /**
     * The number of bytes present in the
     * response body.
     *
     * @readonly
     */
    get contentLength() {
        return this.originalResponse.contentLength;
    }
    /**
     * If the file has an MD5 hash and the
     * request is to read the full file, this response header is returned so that
     * the client can check for message content integrity. If the request is to
     * read a specified range and the 'x-ms-range-get-content-md5' is set to
     * true, then the request returns an MD5 hash for the range, as long as the
     * range size is less than or equal to 4 MB. If neither of these sets of
     * conditions is true, then no value is returned for the 'Content-MD5'
     * header.
     *
     * @readonly
     */
    get contentMD5() {
        return this.originalResponse.contentMD5;
    }
    /**
     * Indicates the range of bytes returned if
     * the client requested a subset of the file by setting the Range request
     * header.
     *
     * @readonly
     */
    get contentRange() {
        return this.originalResponse.contentRange;
    }
    /**
     * The content type specified for the file.
     * The default content type is 'application/octet-stream'
     *
     * @readonly
     */
    get contentType() {
        return this.originalResponse.contentType;
    }
    /**
     * Conclusion time of the last attempted
     * Copy File operation where this file was the destination file. This value
     * can specify the time of a completed, aborted, or failed copy attempt.
     *
     * @readonly
     */
    get copyCompletedOn() {
        return this.originalResponse.copyCompletedOn;
    }
    /**
     * String identifier for the last attempted Copy
     * File operation where this file was the destination file.
     *
     * @readonly
     */
    get copyId() {
        return this.originalResponse.copyId;
    }
    /**
     * Contains the number of bytes copied and
     * the total bytes in the source in the last attempted Copy File operation
     * where this file was the destination file. Can show between 0 and
     * Content-Length bytes copied.
     *
     * @readonly
     */
    get copyProgress() {
        return this.originalResponse.copyProgress;
    }
    /**
     * URL up to 2KB in length that specifies the
     * source file used in the last attempted Copy File operation where this file
     * was the destination file.
     *
     * @readonly
     */
    get copySource() {
        return this.originalResponse.copySource;
    }
    /**
     * State of the copy operation
     * identified by 'x-ms-copy-id'. Possible values include: 'pending',
     * 'success', 'aborted', 'failed'
     *
     * @readonly
     */
    get copyStatus() {
        return this.originalResponse.copyStatus;
    }
    /**
     * Only appears when
     * x-ms-copy-status is failed or pending. Describes cause of fatal or
     * non-fatal copy operation failure.
     *
     * @readonly
     */
    get copyStatusDescription() {
        return this.originalResponse.copyStatusDescription;
    }
    /**
     * When a blob is leased,
     * specifies whether the lease is of infinite or fixed duration. Possible
     * values include: 'infinite', 'fixed'.
     *
     * @readonly
     */
    get leaseDuration() {
        return this.originalResponse.leaseDuration;
    }
    /**
     * Lease state of the blob. Possible
     * values include: 'available', 'leased', 'expired', 'breaking', 'broken'.
     *
     * @readonly
     */
    get leaseState() {
        return this.originalResponse.leaseState;
    }
    /**
     * The current lease status of the
     * blob. Possible values include: 'locked', 'unlocked'.
     *
     * @readonly
     */
    get leaseStatus() {
        return this.originalResponse.leaseStatus;
    }
    /**
     * A UTC date/time value generated by the service that
     * indicates the time at which the response was initiated.
     *
     * @readonly
     */
    get date() {
        return this.originalResponse.date;
    }
    /**
     * The number of committed blocks
     * present in the blob. This header is returned only for append blobs.
     *
     * @readonly
     */
    get blobCommittedBlockCount() {
        return this.originalResponse.blobCommittedBlockCount;
    }
    /**
     * The ETag contains a value that you can use to
     * perform operations conditionally, in quotes.
     *
     * @readonly
     */
    get etag() {
        return this.originalResponse.etag;
    }
    /**
     * The number of tags associated with the blob
     *
     * @readonly
     */
    get tagCount() {
        return this.originalResponse.tagCount;
    }
    /**
     * The error code.
     *
     * @readonly
     */
    get errorCode() {
        return this.originalResponse.errorCode;
    }
    /**
     * The value of this header is set to
     * true if the file data and application metadata are completely encrypted
     * using the specified algorithm. Otherwise, the value is set to false (when
     * the file is unencrypted, or if only parts of the file/application metadata
     * are encrypted).
     *
     * @readonly
     */
    get isServerEncrypted() {
        return this.originalResponse.isServerEncrypted;
    }
    /**
     * If the blob has a MD5 hash, and if
     * request contains range header (Range or x-ms-range), this response header
     * is returned with the value of the whole blob's MD5 value. This value may
     * or may not be equal to the value returned in Content-MD5 header, with the
     * latter calculated from the requested range.
     *
     * @readonly
     */
    get blobContentMD5() {
        return this.originalResponse.blobContentMD5;
    }
    /**
     * Returns the date and time the file was last
     * modified. Any operation that modifies the file or its properties updates
     * the last modified time.
     *
     * @readonly
     */
    get lastModified() {
        return this.originalResponse.lastModified;
    }
    /**
     * Returns the UTC date and time generated by the service that indicates the time at which the blob was
     * last read or written to.
     *
     * @readonly
     */
    get lastAccessed() {
        return this.originalResponse.lastAccessed;
    }
    /**
     * Returns the date and time the blob was created.
     *
     * @readonly
     */
    get createdOn() {
        return this.originalResponse.createdOn;
    }
    /**
     * A name-value pair
     * to associate with a file storage object.
     *
     * @readonly
     */
    get metadata() {
        return this.originalResponse.metadata;
    }
    /**
     * This header uniquely identifies the request
     * that was made and can be used for troubleshooting the request.
     *
     * @readonly
     */
    get requestId() {
        return this.originalResponse.requestId;
    }
    /**
     * If a client request id header is sent in the request, this header will be present in the
     * response with the same value.
     *
     * @readonly
     */
    get clientRequestId() {
        return this.originalResponse.clientRequestId;
    }
    /**
     * Indicates the version of the Blob service used
     * to execute the request.
     *
     * @readonly
     */
    get version() {
        return this.originalResponse.version;
    }
    /**
     * Indicates the versionId of the downloaded blob version.
     *
     * @readonly
     */
    get versionId() {
        return this.originalResponse.versionId;
    }
    /**
     * Indicates whether version of this blob is a current version.
     *
     * @readonly
     */
    get isCurrentVersion() {
        return this.originalResponse.isCurrentVersion;
    }
    /**
     * The SHA-256 hash of the encryption key used to encrypt the blob. This value is only returned
     * when the blob was encrypted with a customer-provided key.
     *
     * @readonly
     */
    get encryptionKeySha256() {
        return this.originalResponse.encryptionKeySha256;
    }
    /**
     * If the request is to read a specified range and the x-ms-range-get-content-crc64 is set to
     * true, then the request returns a crc64 for the range, as long as the range size is less than
     * or equal to 4 MB. If both x-ms-range-get-content-crc64 & x-ms-range-get-content-md5 is
     * specified in the same request, it will fail with 400(Bad Request)
     */
    get contentCrc64() {
        return this.originalResponse.contentCrc64;
    }
    /**
     * Object Replication Policy Id of the destination blob.
     *
     * @readonly
     */
    get objectReplicationDestinationPolicyId() {
        return this.originalResponse.objectReplicationDestinationPolicyId;
    }
    /**
     * Parsed Object Replication Policy Id, Rule Id(s) and status of the source blob.
     *
     * @readonly
     */
    get objectReplicationSourceProperties() {
        return this.originalResponse.objectReplicationSourceProperties;
    }
    /**
     * If this blob has been sealed.
     *
     * @readonly
     */
    get isSealed() {
        return this.originalResponse.isSealed;
    }
    /**
     * UTC date/time value generated by the service that indicates the time at which the blob immutability policy will expire.
     *
     * @readonly
     */
    get immutabilityPolicyExpiresOn() {
        return this.originalResponse.immutabilityPolicyExpiresOn;
    }
    /**
     * Indicates immutability policy mode.
     *
     * @readonly
     */
    get immutabilityPolicyMode() {
        return this.originalResponse.immutabilityPolicyMode;
    }
    /**
     * Indicates if a legal hold is present on the blob.
     *
     * @readonly
     */
    get legalHold() {
        return this.originalResponse.legalHold;
    }
    /**
     * The response body as a browser Blob.
     * Always undefined in node.js.
     *
     * @readonly
     */
    get contentAsBlob() {
        return this.originalResponse.blobBody;
    }
    /**
     * The response body as a node.js Readable stream.
     * Always undefined in the browser.
     *
     * It will automatically retry when internal read stream unexpected ends.
     *
     * @readonly
     */
    get readableStreamBody() {
        return coreUtil.isNode ? this.blobDownloadStream : undefined;
    }
    /**
     * The HTTP response.
     */
    get _response() {
        return this.originalResponse._response;
    }
    /**
     * Creates an instance of BlobDownloadResponse.
     *
     * @param originalResponse -
     * @param getter -
     * @param offset -
     * @param count -
     * @param options -
     */
    constructor(originalResponse, getter, offset, count, options = {}) {
        this.originalResponse = originalResponse;
        this.blobDownloadStream = new RetriableReadableStream(this.originalResponse.readableStreamBody, getter, offset, count, options);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const AVRO_SYNC_MARKER_SIZE = 16;
const AVRO_INIT_BYTES = new Uint8Array([79, 98, 106, 1]);
const AVRO_CODEC_KEY = "avro.codec";
const AVRO_SCHEMA_KEY = "avro.schema";

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
class AvroParser {
    /**
     * Reads a fixed number of bytes from the stream.
     *
     * @param stream -
     * @param length -
     * @param options -
     */
    static async readFixedBytes(stream, length, options = {}) {
        const bytes = await stream.read(length, { abortSignal: options.abortSignal });
        if (bytes.length !== length) {
            throw new Error("Hit stream end.");
        }
        return bytes;
    }
    /**
     * Reads a single byte from the stream.
     *
     * @param stream -
     * @param options -
     */
    static async readByte(stream, options = {}) {
        const buf = await AvroParser.readFixedBytes(stream, 1, options);
        return buf[0];
    }
    // int and long are stored in variable-length zig-zag coding.
    // variable-length: https://lucene.apache.org/core/3_5_0/fileformats.html#VInt
    // zig-zag: https://developers.google.com/protocol-buffers/docs/encoding?csw=1#types
    static async readZigZagLong(stream, options = {}) {
        let zigZagEncoded = 0;
        let significanceInBit = 0;
        let byte, haveMoreByte, significanceInFloat;
        do {
            byte = await AvroParser.readByte(stream, options);
            haveMoreByte = byte & 0x80;
            zigZagEncoded |= (byte & 0x7f) << significanceInBit;
            significanceInBit += 7;
        } while (haveMoreByte && significanceInBit < 28); // bitwise operation only works for 32-bit integers
        if (haveMoreByte) {
            // Switch to float arithmetic
            // eslint-disable-next-line no-self-assign
            zigZagEncoded = zigZagEncoded;
            significanceInFloat = 268435456; // 2 ** 28.
            do {
                byte = await AvroParser.readByte(stream, options);
                zigZagEncoded += (byte & 0x7f) * significanceInFloat;
                significanceInFloat *= 128; // 2 ** 7
            } while (byte & 0x80);
            const res = (zigZagEncoded % 2 ? -(zigZagEncoded + 1) : zigZagEncoded) / 2;
            if (res < Number.MIN_SAFE_INTEGER || res > Number.MAX_SAFE_INTEGER) {
                throw new Error("Integer overflow.");
            }
            return res;
        }
        return (zigZagEncoded >> 1) ^ -(zigZagEncoded & 1);
    }
    static async readLong(stream, options = {}) {
        return AvroParser.readZigZagLong(stream, options);
    }
    static async readInt(stream, options = {}) {
        return AvroParser.readZigZagLong(stream, options);
    }
    static async readNull() {
        return null;
    }
    static async readBoolean(stream, options = {}) {
        const b = await AvroParser.readByte(stream, options);
        if (b === 1) {
            return true;
        }
        else if (b === 0) {
            return false;
        }
        else {
            throw new Error("Byte was not a boolean.");
        }
    }
    static async readFloat(stream, options = {}) {
        const u8arr = await AvroParser.readFixedBytes(stream, 4, options);
        const view = new DataView(u8arr.buffer, u8arr.byteOffset, u8arr.byteLength);
        return view.getFloat32(0, true); // littleEndian = true
    }
    static async readDouble(stream, options = {}) {
        const u8arr = await AvroParser.readFixedBytes(stream, 8, options);
        const view = new DataView(u8arr.buffer, u8arr.byteOffset, u8arr.byteLength);
        return view.getFloat64(0, true); // littleEndian = true
    }
    static async readBytes(stream, options = {}) {
        const size = await AvroParser.readLong(stream, options);
        if (size < 0) {
            throw new Error("Bytes size was negative.");
        }
        return stream.read(size, { abortSignal: options.abortSignal });
    }
    static async readString(stream, options = {}) {
        const u8arr = await AvroParser.readBytes(stream, options);
        const utf8decoder = new TextDecoder();
        return utf8decoder.decode(u8arr);
    }
    static async readMapPair(stream, readItemMethod, options = {}) {
        const key = await AvroParser.readString(stream, options);
        // FUTURE: this won't work with readFixed (currently not supported) which needs a length as the parameter.
        const value = await readItemMethod(stream, options);
        return { key, value };
    }
    static async readMap(stream, readItemMethod, options = {}) {
        const readPairMethod = (s, opts = {}) => {
            return AvroParser.readMapPair(s, readItemMethod, opts);
        };
        const pairs = await AvroParser.readArray(stream, readPairMethod, options);
        const dict = {};
        for (const pair of pairs) {
            dict[pair.key] = pair.value;
        }
        return dict;
    }
    static async readArray(stream, readItemMethod, options = {}) {
        const items = [];
        for (let count = await AvroParser.readLong(stream, options); count !== 0; count = await AvroParser.readLong(stream, options)) {
            if (count < 0) {
                // Ignore block sizes
                await AvroParser.readLong(stream, options);
                count = -count;
            }
            while (count--) {
                const item = await readItemMethod(stream, options);
                items.push(item);
            }
        }
        return items;
    }
}
var AvroComplex;
(function (AvroComplex) {
    AvroComplex["RECORD"] = "record";
    AvroComplex["ENUM"] = "enum";
    AvroComplex["ARRAY"] = "array";
    AvroComplex["MAP"] = "map";
    AvroComplex["UNION"] = "union";
    AvroComplex["FIXED"] = "fixed";
})(AvroComplex || (AvroComplex = {}));
var AvroPrimitive;
(function (AvroPrimitive) {
    AvroPrimitive["NULL"] = "null";
    AvroPrimitive["BOOLEAN"] = "boolean";
    AvroPrimitive["INT"] = "int";
    AvroPrimitive["LONG"] = "long";
    AvroPrimitive["FLOAT"] = "float";
    AvroPrimitive["DOUBLE"] = "double";
    AvroPrimitive["BYTES"] = "bytes";
    AvroPrimitive["STRING"] = "string";
})(AvroPrimitive || (AvroPrimitive = {}));
class AvroType {
    /**
     * Determines the AvroType from the Avro Schema.
     */
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    static fromSchema(schema) {
        if (typeof schema === "string") {
            return AvroType.fromStringSchema(schema);
        }
        else if (Array.isArray(schema)) {
            return AvroType.fromArraySchema(schema);
        }
        else {
            return AvroType.fromObjectSchema(schema);
        }
    }
    static fromStringSchema(schema) {
        switch (schema) {
            case AvroPrimitive.NULL:
            case AvroPrimitive.BOOLEAN:
            case AvroPrimitive.INT:
            case AvroPrimitive.LONG:
            case AvroPrimitive.FLOAT:
            case AvroPrimitive.DOUBLE:
            case AvroPrimitive.BYTES:
            case AvroPrimitive.STRING:
                return new AvroPrimitiveType(schema);
            default:
                throw new Error(`Unexpected Avro type ${schema}`);
        }
    }
    static fromArraySchema(schema) {
        return new AvroUnionType(schema.map(AvroType.fromSchema));
    }
    static fromObjectSchema(schema) {
        const type = schema.type;
        // Primitives can be defined as strings or objects
        try {
            return AvroType.fromStringSchema(type);
        }
        catch (_a) {
            // no-op
        }
        switch (type) {
            case AvroComplex.RECORD:
                if (schema.aliases) {
                    throw new Error(`aliases currently is not supported, schema: ${schema}`);
                }
                if (!schema.name) {
                    throw new Error(`Required attribute 'name' doesn't exist on schema: ${schema}`);
                }
                // eslint-disable-next-line no-case-declarations
                const fields = {};
                if (!schema.fields) {
                    throw new Error(`Required attribute 'fields' doesn't exist on schema: ${schema}`);
                }
                for (const field of schema.fields) {
                    fields[field.name] = AvroType.fromSchema(field.type);
                }
                return new AvroRecordType(fields, schema.name);
            case AvroComplex.ENUM:
                if (schema.aliases) {
                    throw new Error(`aliases currently is not supported, schema: ${schema}`);
                }
                if (!schema.symbols) {
                    throw new Error(`Required attribute 'symbols' doesn't exist on schema: ${schema}`);
                }
                return new AvroEnumType(schema.symbols);
            case AvroComplex.MAP:
                if (!schema.values) {
                    throw new Error(`Required attribute 'values' doesn't exist on schema: ${schema}`);
                }
                return new AvroMapType(AvroType.fromSchema(schema.values));
            case AvroComplex.ARRAY: // Unused today
            case AvroComplex.FIXED: // Unused today
            default:
                throw new Error(`Unexpected Avro type ${type} in ${schema}`);
        }
    }
}
class AvroPrimitiveType extends AvroType {
    constructor(primitive) {
        super();
        this._primitive = primitive;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    read(stream, options = {}) {
        switch (this._primitive) {
            case AvroPrimitive.NULL:
                return AvroParser.readNull();
            case AvroPrimitive.BOOLEAN:
                return AvroParser.readBoolean(stream, options);
            case AvroPrimitive.INT:
                return AvroParser.readInt(stream, options);
            case AvroPrimitive.LONG:
                return AvroParser.readLong(stream, options);
            case AvroPrimitive.FLOAT:
                return AvroParser.readFloat(stream, options);
            case AvroPrimitive.DOUBLE:
                return AvroParser.readDouble(stream, options);
            case AvroPrimitive.BYTES:
                return AvroParser.readBytes(stream, options);
            case AvroPrimitive.STRING:
                return AvroParser.readString(stream, options);
            default:
                throw new Error("Unknown Avro Primitive");
        }
    }
}
class AvroEnumType extends AvroType {
    constructor(symbols) {
        super();
        this._symbols = symbols;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    async read(stream, options = {}) {
        const value = await AvroParser.readInt(stream, options);
        return this._symbols[value];
    }
}
class AvroUnionType extends AvroType {
    constructor(types) {
        super();
        this._types = types;
    }
    async read(stream, options = {}) {
        const typeIndex = await AvroParser.readInt(stream, options);
        return this._types[typeIndex].read(stream, options);
    }
}
class AvroMapType extends AvroType {
    constructor(itemType) {
        super();
        this._itemType = itemType;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    read(stream, options = {}) {
        const readItemMethod = (s, opts) => {
            return this._itemType.read(s, opts);
        };
        return AvroParser.readMap(stream, readItemMethod, options);
    }
}
class AvroRecordType extends AvroType {
    constructor(fields, name) {
        super();
        this._fields = fields;
        this._name = name;
    }
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    async read(stream, options = {}) {
        // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
        const record = {};
        record["$schema"] = this._name;
        for (const key in this._fields) {
            if (Object.prototype.hasOwnProperty.call(this._fields, key)) {
                record[key] = await this._fields[key].read(stream, options);
            }
        }
        return record;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
function arraysEqual(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
class AvroReader {
    get blockOffset() {
        return this._blockOffset;
    }
    get objectIndex() {
        return this._objectIndex;
    }
    constructor(dataStream, headerStream, currentBlockOffset, indexWithinCurrentBlock) {
        this._dataStream = dataStream;
        this._headerStream = headerStream || dataStream;
        this._initialized = false;
        this._blockOffset = currentBlockOffset || 0;
        this._objectIndex = indexWithinCurrentBlock || 0;
        this._initialBlockOffset = currentBlockOffset || 0;
    }
    async initialize(options = {}) {
        const header = await AvroParser.readFixedBytes(this._headerStream, AVRO_INIT_BYTES.length, {
            abortSignal: options.abortSignal,
        });
        if (!arraysEqual(header, AVRO_INIT_BYTES)) {
            throw new Error("Stream is not an Avro file.");
        }
        // File metadata is written as if defined by the following map schema:
        // { "type": "map", "values": "bytes"}
        this._metadata = await AvroParser.readMap(this._headerStream, AvroParser.readString, {
            abortSignal: options.abortSignal,
        });
        // Validate codec
        const codec = this._metadata[AVRO_CODEC_KEY];
        if (!(codec === undefined || codec === null || codec === "null")) {
            throw new Error("Codecs are not supported");
        }
        // The 16-byte, randomly-generated sync marker for this file.
        this._syncMarker = await AvroParser.readFixedBytes(this._headerStream, AVRO_SYNC_MARKER_SIZE, {
            abortSignal: options.abortSignal,
        });
        // Parse the schema
        const schema = JSON.parse(this._metadata[AVRO_SCHEMA_KEY]);
        this._itemType = AvroType.fromSchema(schema);
        if (this._blockOffset === 0) {
            this._blockOffset = this._initialBlockOffset + this._dataStream.position;
        }
        this._itemsRemainingInBlock = await AvroParser.readLong(this._dataStream, {
            abortSignal: options.abortSignal,
        });
        // skip block length
        await AvroParser.readLong(this._dataStream, { abortSignal: options.abortSignal });
        this._initialized = true;
        if (this._objectIndex && this._objectIndex > 0) {
            for (let i = 0; i < this._objectIndex; i++) {
                await this._itemType.read(this._dataStream, { abortSignal: options.abortSignal });
                this._itemsRemainingInBlock--;
            }
        }
    }
    hasNext() {
        return !this._initialized || this._itemsRemainingInBlock > 0;
    }
    parseObjects() {
        return tslib.__asyncGenerator(this, arguments, function* parseObjects_1(options = {}) {
            if (!this._initialized) {
                yield tslib.__await(this.initialize(options));
            }
            while (this.hasNext()) {
                const result = yield tslib.__await(this._itemType.read(this._dataStream, {
                    abortSignal: options.abortSignal,
                }));
                this._itemsRemainingInBlock--;
                this._objectIndex++;
                if (this._itemsRemainingInBlock === 0) {
                    const marker = yield tslib.__await(AvroParser.readFixedBytes(this._dataStream, AVRO_SYNC_MARKER_SIZE, {
                        abortSignal: options.abortSignal,
                    }));
                    this._blockOffset = this._initialBlockOffset + this._dataStream.position;
                    this._objectIndex = 0;
                    if (!arraysEqual(this._syncMarker, marker)) {
                        throw new Error("Stream is not a valid Avro file.");
                    }
                    try {
                        this._itemsRemainingInBlock = yield tslib.__await(AvroParser.readLong(this._dataStream, {
                            abortSignal: options.abortSignal,
                        }));
                    }
                    catch (_a) {
                        // We hit the end of the stream.
                        this._itemsRemainingInBlock = 0;
                    }
                    if (this._itemsRemainingInBlock > 0) {
                        // Ignore block size
                        yield tslib.__await(AvroParser.readLong(this._dataStream, { abortSignal: options.abortSignal }));
                    }
                }
                yield yield tslib.__await(result);
            }
        });
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
class AvroReadable {
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const ABORT_ERROR = new abortController.AbortError("Reading from the avro stream was aborted.");
class AvroReadableFromStream extends AvroReadable {
    toUint8Array(data) {
        if (typeof data === "string") {
            return Buffer.from(data);
        }
        return data;
    }
    constructor(readable) {
        super();
        this._readable = readable;
        this._position = 0;
    }
    get position() {
        return this._position;
    }
    async read(size, options = {}) {
        var _a;
        if ((_a = options.abortSignal) === null || _a === void 0 ? void 0 : _a.aborted) {
            throw ABORT_ERROR;
        }
        if (size < 0) {
            throw new Error(`size parameter should be positive: ${size}`);
        }
        if (size === 0) {
            return new Uint8Array();
        }
        if (!this._readable.readable) {
            throw new Error("Stream no longer readable.");
        }
        // See if there is already enough data.
        const chunk = this._readable.read(size);
        if (chunk) {
            this._position += chunk.length;
            // chunk.length maybe less than desired size if the stream ends.
            return this.toUint8Array(chunk);
        }
        else {
            // register callback to wait for enough data to read
            return new Promise((resolve, reject) => {
                /* eslint-disable @typescript-eslint/no-use-before-define */
                const cleanUp = () => {
                    this._readable.removeListener("readable", readableCallback);
                    this._readable.removeListener("error", rejectCallback);
                    this._readable.removeListener("end", rejectCallback);
                    this._readable.removeListener("close", rejectCallback);
                    if (options.abortSignal) {
                        options.abortSignal.removeEventListener("abort", abortHandler);
                    }
                };
                const readableCallback = () => {
                    const callbackChunk = this._readable.read(size);
                    if (callbackChunk) {
                        this._position += callbackChunk.length;
                        cleanUp();
                        // callbackChunk.length maybe less than desired size if the stream ends.
                        resolve(this.toUint8Array(callbackChunk));
                    }
                };
                const rejectCallback = () => {
                    cleanUp();
                    reject();
                };
                const abortHandler = () => {
                    cleanUp();
                    reject(ABORT_ERROR);
                };
                this._readable.on("readable", readableCallback);
                this._readable.once("error", rejectCallback);
                this._readable.once("end", rejectCallback);
                this._readable.once("close", rejectCallback);
                if (options.abortSignal) {
                    options.abortSignal.addEventListener("abort", abortHandler);
                }
                /* eslint-enable @typescript-eslint/no-use-before-define */
            });
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * A Node.js BlobQuickQueryStream will internally parse avro data stream for blob query.
 */
class BlobQuickQueryStream extends stream.Readable {
    /**
     * Creates an instance of BlobQuickQueryStream.
     *
     * @param source - The current ReadableStream returned from getter
     * @param options -
     */
    constructor(source, options = {}) {
        super();
        this.avroPaused = true;
        this.source = source;
        this.onProgress = options.onProgress;
        this.onError = options.onError;
        this.avroReader = new AvroReader(new AvroReadableFromStream(this.source));
        this.avroIter = this.avroReader.parseObjects({ abortSignal: options.abortSignal });
    }
    _read() {
        if (this.avroPaused) {
            this.readInternal().catch((err) => {
                this.emit("error", err);
            });
        }
    }
    async readInternal() {
        this.avroPaused = false;
        let avroNext;
        do {
            avroNext = await this.avroIter.next();
            if (avroNext.done) {
                break;
            }
            const obj = avroNext.value;
            const schema = obj.$schema;
            if (typeof schema !== "string") {
                throw Error("Missing schema in avro record.");
            }
            switch (schema) {
                case "com.microsoft.azure.storage.queryBlobContents.resultData":
                    {
                        const data = obj.data;
                        if (data instanceof Uint8Array === false) {
                            throw Error("Invalid data in avro result record.");
                        }
                        if (!this.push(Buffer.from(data))) {
                            this.avroPaused = true;
                        }
                    }
                    break;
                case "com.microsoft.azure.storage.queryBlobContents.progress":
                    {
                        const bytesScanned = obj.bytesScanned;
                        if (typeof bytesScanned !== "number") {
                            throw Error("Invalid bytesScanned in avro progress record.");
                        }
                        if (this.onProgress) {
                            this.onProgress({ loadedBytes: bytesScanned });
                        }
                    }
                    break;
                case "com.microsoft.azure.storage.queryBlobContents.end":
                    if (this.onProgress) {
                        const totalBytes = obj.totalBytes;
                        if (typeof totalBytes !== "number") {
                            throw Error("Invalid totalBytes in avro end record.");
                        }
                        this.onProgress({ loadedBytes: totalBytes });
                    }
                    this.push(null);
                    break;
                case "com.microsoft.azure.storage.queryBlobContents.error":
                    if (this.onError) {
                        const fatal = obj.fatal;
                        if (typeof fatal !== "boolean") {
                            throw Error("Invalid fatal in avro error record.");
                        }
                        const name = obj.name;
                        if (typeof name !== "string") {
                            throw Error("Invalid name in avro error record.");
                        }
                        const description = obj.description;
                        if (typeof description !== "string") {
                            throw Error("Invalid description in avro error record.");
                        }
                        const position = obj.position;
                        if (typeof position !== "number") {
                            throw Error("Invalid position in avro error record.");
                        }
                        this.onError({
                            position,
                            name,
                            isFatal: fatal,
                            description,
                        });
                    }
                    break;
                default:
                    throw Error(`Unknown schema ${schema} in avro progress record.`);
            }
        } while (!avroNext.done && !this.avroPaused);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * BlobQueryResponse implements BlobDownloadResponseModel interface, and in Node.js runtime it will
 * parse avor data returned by blob query.
 */
class BlobQueryResponse {
    /**
     * Indicates that the service supports
     * requests for partial file content.
     *
     * @readonly
     */
    get acceptRanges() {
        return this.originalResponse.acceptRanges;
    }
    /**
     * Returns if it was previously specified
     * for the file.
     *
     * @readonly
     */
    get cacheControl() {
        return this.originalResponse.cacheControl;
    }
    /**
     * Returns the value that was specified
     * for the 'x-ms-content-disposition' header and specifies how to process the
     * response.
     *
     * @readonly
     */
    get contentDisposition() {
        return this.originalResponse.contentDisposition;
    }
    /**
     * Returns the value that was specified
     * for the Content-Encoding request header.
     *
     * @readonly
     */
    get contentEncoding() {
        return this.originalResponse.contentEncoding;
    }
    /**
     * Returns the value that was specified
     * for the Content-Language request header.
     *
     * @readonly
     */
    get contentLanguage() {
        return this.originalResponse.contentLanguage;
    }
    /**
     * The current sequence number for a
     * page blob. This header is not returned for block blobs or append blobs.
     *
     * @readonly
     */
    get blobSequenceNumber() {
        return this.originalResponse.blobSequenceNumber;
    }
    /**
     * The blob's type. Possible values include:
     * 'BlockBlob', 'PageBlob', 'AppendBlob'.
     *
     * @readonly
     */
    get blobType() {
        return this.originalResponse.blobType;
    }
    /**
     * The number of bytes present in the
     * response body.
     *
     * @readonly
     */
    get contentLength() {
        return this.originalResponse.contentLength;
    }
    /**
     * If the file has an MD5 hash and the
     * request is to read the full file, this response header is returned so that
     * the client can check for message content integrity. If the request is to
     * read a specified range and the 'x-ms-range-get-content-md5' is set to
     * true, then the request returns an MD5 hash for the range, as long as the
     * range size is less than or equal to 4 MB. If neither of these sets of
     * conditions is true, then no value is returned for the 'Content-MD5'
     * header.
     *
     * @readonly
     */
    get contentMD5() {
        return this.originalResponse.contentMD5;
    }
    /**
     * Indicates the range of bytes returned if
     * the client requested a subset of the file by setting the Range request
     * header.
     *
     * @readonly
     */
    get contentRange() {
        return this.originalResponse.contentRange;
    }
    /**
     * The content type specified for the file.
     * The default content type is 'application/octet-stream'
     *
     * @readonly
     */
    get contentType() {
        return this.originalResponse.contentType;
    }
    /**
     * Conclusion time of the last attempted
     * Copy File operation where this file was the destination file. This value
     * can specify the time of a completed, aborted, or failed copy attempt.
     *
     * @readonly
     */
    get copyCompletedOn() {
        return undefined;
    }
    /**
     * String identifier for the last attempted Copy
     * File operation where this file was the destination file.
     *
     * @readonly
     */
    get copyId() {
        return this.originalResponse.copyId;
    }
    /**
     * Contains the number of bytes copied and
     * the total bytes in the source in the last attempted Copy File operation
     * where this file was the destination file. Can show between 0 and
     * Content-Length bytes copied.
     *
     * @readonly
     */
    get copyProgress() {
        return this.originalResponse.copyProgress;
    }
    /**
     * URL up to 2KB in length that specifies the
     * source file used in the last attempted Copy File operation where this file
     * was the destination file.
     *
     * @readonly
     */
    get copySource() {
        return this.originalResponse.copySource;
    }
    /**
     * State of the copy operation
     * identified by 'x-ms-copy-id'. Possible values include: 'pending',
     * 'success', 'aborted', 'failed'
     *
     * @readonly
     */
    get copyStatus() {
        return this.originalResponse.copyStatus;
    }
    /**
     * Only appears when
     * x-ms-copy-status is failed or pending. Describes cause of fatal or
     * non-fatal copy operation failure.
     *
     * @readonly
     */
    get copyStatusDescription() {
        return this.originalResponse.copyStatusDescription;
    }
    /**
     * When a blob is leased,
     * specifies whether the lease is of infinite or fixed duration. Possible
     * values include: 'infinite', 'fixed'.
     *
     * @readonly
     */
    get leaseDuration() {
        return this.originalResponse.leaseDuration;
    }
    /**
     * Lease state of the blob. Possible
     * values include: 'available', 'leased', 'expired', 'breaking', 'broken'.
     *
     * @readonly
     */
    get leaseState() {
        return this.originalResponse.leaseState;
    }
    /**
     * The current lease status of the
     * blob. Possible values include: 'locked', 'unlocked'.
     *
     * @readonly
     */
    get leaseStatus() {
        return this.originalResponse.leaseStatus;
    }
    /**
     * A UTC date/time value generated by the service that
     * indicates the time at which the response was initiated.
     *
     * @readonly
     */
    get date() {
        return this.originalResponse.date;
    }
    /**
     * The number of committed blocks
     * present in the blob. This header is returned only for append blobs.
     *
     * @readonly
     */
    get blobCommittedBlockCount() {
        return this.originalResponse.blobCommittedBlockCount;
    }
    /**
     * The ETag contains a value that you can use to
     * perform operations conditionally, in quotes.
     *
     * @readonly
     */
    get etag() {
        return this.originalResponse.etag;
    }
    /**
     * The error code.
     *
     * @readonly
     */
    get errorCode() {
        return this.originalResponse.errorCode;
    }
    /**
     * The value of this header is set to
     * true if the file data and application metadata are completely encrypted
     * using the specified algorithm. Otherwise, the value is set to false (when
     * the file is unencrypted, or if only parts of the file/application metadata
     * are encrypted).
     *
     * @readonly
     */
    get isServerEncrypted() {
        return this.originalResponse.isServerEncrypted;
    }
    /**
     * If the blob has a MD5 hash, and if
     * request contains range header (Range or x-ms-range), this response header
     * is returned with the value of the whole blob's MD5 value. This value may
     * or may not be equal to the value returned in Content-MD5 header, with the
     * latter calculated from the requested range.
     *
     * @readonly
     */
    get blobContentMD5() {
        return this.originalResponse.blobContentMD5;
    }
    /**
     * Returns the date and time the file was last
     * modified. Any operation that modifies the file or its properties updates
     * the last modified time.
     *
     * @readonly
     */
    get lastModified() {
        return this.originalResponse.lastModified;
    }
    /**
     * A name-value pair
     * to associate with a file storage object.
     *
     * @readonly
     */
    get metadata() {
        return this.originalResponse.metadata;
    }
    /**
     * This header uniquely identifies the request
     * that was made and can be used for troubleshooting the request.
     *
     * @readonly
     */
    get requestId() {
        return this.originalResponse.requestId;
    }
    /**
     * If a client request id header is sent in the request, this header will be present in the
     * response with the same value.
     *
     * @readonly
     */
    get clientRequestId() {
        return this.originalResponse.clientRequestId;
    }
    /**
     * Indicates the version of the File service used
     * to execute the request.
     *
     * @readonly
     */
    get version() {
        return this.originalResponse.version;
    }
    /**
     * The SHA-256 hash of the encryption key used to encrypt the blob. This value is only returned
     * when the blob was encrypted with a customer-provided key.
     *
     * @readonly
     */
    get encryptionKeySha256() {
        return this.originalResponse.encryptionKeySha256;
    }
    /**
     * If the request is to read a specified range and the x-ms-range-get-content-crc64 is set to
     * true, then the request returns a crc64 for the range, as long as the range size is less than
     * or equal to 4 MB. If both x-ms-range-get-content-crc64 & x-ms-range-get-content-md5 is
     * specified in the same request, it will fail with 400(Bad Request)
     */
    get contentCrc64() {
        return this.originalResponse.contentCrc64;
    }
    /**
     * The response body as a browser Blob.
     * Always undefined in node.js.
     *
     * @readonly
     */
    get blobBody() {
        return undefined;
    }
    /**
     * The response body as a node.js Readable stream.
     * Always undefined in the browser.
     *
     * It will parse avor data returned by blob query.
     *
     * @readonly
     */
    get readableStreamBody() {
        return coreUtil.isNode ? this.blobDownloadStream : undefined;
    }
    /**
     * The HTTP response.
     */
    get _response() {
        return this.originalResponse._response;
    }
    /**
     * Creates an instance of BlobQueryResponse.
     *
     * @param originalResponse -
     * @param options -
     */
    constructor(originalResponse, options = {}) {
        this.originalResponse = originalResponse;
        this.blobDownloadStream = new BlobQuickQueryStream(this.originalResponse.readableStreamBody, options);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Represents the access tier on a blob.
 * For detailed information about block blob level tiering see {@link https://docs.microsoft.com/azure/storage/blobs/storage-blob-storage-tiers|Hot, cool and archive storage tiers.}
 */
exports.BlockBlobTier = void 0;
(function (BlockBlobTier) {
    /**
     * Optimized for storing data that is accessed frequently.
     */
    BlockBlobTier["Hot"] = "Hot";
    /**
     * Optimized for storing data that is infrequently accessed and stored for at least 30 days.
     */
    BlockBlobTier["Cool"] = "Cool";
    /**
     * Optimized for storing data that is rarely accessed.
     */
    BlockBlobTier["Cold"] = "Cold";
    /**
     * Optimized for storing data that is rarely accessed and stored for at least 180 days
     * with flexible latency requirements (on the order of hours).
     */
    BlockBlobTier["Archive"] = "Archive";
})(exports.BlockBlobTier || (exports.BlockBlobTier = {}));
/**
 * Specifies the page blob tier to set the blob to. This is only applicable to page blobs on premium storage accounts.
 * Please see {@link https://docs.microsoft.com/azure/storage/storage-premium-storage#scalability-and-performance-targets|here}
 * for detailed information on the corresponding IOPS and throughput per PageBlobTier.
 */
exports.PremiumPageBlobTier = void 0;
(function (PremiumPageBlobTier) {
    /**
     * P4 Tier.
     */
    PremiumPageBlobTier["P4"] = "P4";
    /**
     * P6 Tier.
     */
    PremiumPageBlobTier["P6"] = "P6";
    /**
     * P10 Tier.
     */
    PremiumPageBlobTier["P10"] = "P10";
    /**
     * P15 Tier.
     */
    PremiumPageBlobTier["P15"] = "P15";
    /**
     * P20 Tier.
     */
    PremiumPageBlobTier["P20"] = "P20";
    /**
     * P30 Tier.
     */
    PremiumPageBlobTier["P30"] = "P30";
    /**
     * P40 Tier.
     */
    PremiumPageBlobTier["P40"] = "P40";
    /**
     * P50 Tier.
     */
    PremiumPageBlobTier["P50"] = "P50";
    /**
     * P60 Tier.
     */
    PremiumPageBlobTier["P60"] = "P60";
    /**
     * P70 Tier.
     */
    PremiumPageBlobTier["P70"] = "P70";
    /**
     * P80 Tier.
     */
    PremiumPageBlobTier["P80"] = "P80";
})(exports.PremiumPageBlobTier || (exports.PremiumPageBlobTier = {}));
function toAccessTier(tier) {
    if (tier === undefined) {
        return undefined;
    }
    return tier; // No more check if string is a valid AccessTier, and left this to underlay logic to decide(service).
}
function ensureCpkIfSpecified(cpk, isHttps) {
    if (cpk && !isHttps) {
        throw new RangeError("Customer-provided encryption key must be used over HTTPS.");
    }
    if (cpk && !cpk.encryptionAlgorithm) {
        cpk.encryptionAlgorithm = EncryptionAlgorithmAES25;
    }
}
/**
 * Defines the known cloud audiences for Storage.
 */
exports.StorageBlobAudience = void 0;
(function (StorageBlobAudience) {
    /**
     * The OAuth scope to use to retrieve an AAD token for Azure Storage.
     */
    StorageBlobAudience["StorageOAuthScopes"] = "https://storage.azure.com/.default";
    /**
     * The OAuth scope to use to retrieve an AAD token for Azure Disk.
     */
    StorageBlobAudience["DiskComputeOAuthScopes"] = "https://disk.compute.azure.com/.default";
})(exports.StorageBlobAudience || (exports.StorageBlobAudience = {}));
/**
 *
 * To get OAuth audience for a storage account for blob service.
 */
function getBlobServiceAccountAudience(storageAccountName) {
    return `https://${storageAccountName}.blob.core.windows.net/.default`;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Function that converts PageRange and ClearRange to a common Range object.
 * PageRange and ClearRange have start and end while Range offset and count
 * this function normalizes to Range.
 * @param response - Model PageBlob Range response
 */
function rangeResponseFromModel(response) {
    const pageRange = (response._response.parsedBody.pageRange || []).map((x) => ({
        offset: x.start,
        count: x.end - x.start,
    }));
    const clearRange = (response._response.parsedBody.clearRange || []).map((x) => ({
        offset: x.start,
        count: x.end - x.start,
    }));
    return Object.assign(Object.assign({}, response), { pageRange,
        clearRange, _response: Object.assign(Object.assign({}, response._response), { parsedBody: {
                pageRange,
                clearRange,
            } }) });
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This is the poller returned by {@link BlobClient.beginCopyFromURL}.
 * This can not be instantiated directly outside of this package.
 *
 * @hidden
 */
class BlobBeginCopyFromUrlPoller extends coreLro.Poller {
    constructor(options) {
        const { blobClient, copySource, intervalInMs = 15000, onProgress, resumeFrom, startCopyFromURLOptions, } = options;
        let state;
        if (resumeFrom) {
            state = JSON.parse(resumeFrom).state;
        }
        const operation = makeBlobBeginCopyFromURLPollOperation(Object.assign(Object.assign({}, state), { blobClient,
            copySource,
            startCopyFromURLOptions }));
        super(operation);
        if (typeof onProgress === "function") {
            this.onProgress(onProgress);
        }
        this.intervalInMs = intervalInMs;
    }
    delay() {
        return coreUtil.delay(this.intervalInMs);
    }
}
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const cancel = async function cancel(options = {}) {
    const state = this.state;
    const { copyId } = state;
    if (state.isCompleted) {
        return makeBlobBeginCopyFromURLPollOperation(state);
    }
    if (!copyId) {
        state.isCancelled = true;
        return makeBlobBeginCopyFromURLPollOperation(state);
    }
    // if abortCopyFromURL throws, it will bubble up to user's poller.cancelOperation call
    await state.blobClient.abortCopyFromURL(copyId, {
        abortSignal: options.abortSignal,
    });
    state.isCancelled = true;
    return makeBlobBeginCopyFromURLPollOperation(state);
};
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const update = async function update(options = {}) {
    const state = this.state;
    const { blobClient, copySource, startCopyFromURLOptions } = state;
    if (!state.isStarted) {
        state.isStarted = true;
        const result = await blobClient.startCopyFromURL(copySource, startCopyFromURLOptions);
        // copyId is needed to abort
        state.copyId = result.copyId;
        if (result.copyStatus === "success") {
            state.result = result;
            state.isCompleted = true;
        }
    }
    else if (!state.isCompleted) {
        try {
            const result = await state.blobClient.getProperties({ abortSignal: options.abortSignal });
            const { copyStatus, copyProgress } = result;
            const prevCopyProgress = state.copyProgress;
            if (copyProgress) {
                state.copyProgress = copyProgress;
            }
            if (copyStatus === "pending" &&
                copyProgress !== prevCopyProgress &&
                typeof options.fireProgress === "function") {
                // trigger in setTimeout, or swallow error?
                options.fireProgress(state);
            }
            else if (copyStatus === "success") {
                state.result = result;
                state.isCompleted = true;
            }
            else if (copyStatus === "failed") {
                state.error = new Error(`Blob copy failed with reason: "${result.copyStatusDescription || "unknown"}"`);
                state.isCompleted = true;
            }
        }
        catch (err) {
            state.error = err;
            state.isCompleted = true;
        }
    }
    return makeBlobBeginCopyFromURLPollOperation(state);
};
/**
 * Note: Intentionally using function expression over arrow function expression
 * so that the function can be invoked with a different context.
 * This affects what `this` refers to.
 * @hidden
 */
const toString = function toString() {
    return JSON.stringify({ state: this.state }, (key, value) => {
        // remove blobClient from serialized state since a client can't be hydrated from this info.
        if (key === "blobClient") {
            return undefined;
        }
        return value;
    });
};
/**
 * Creates a poll operation given the provided state.
 * @hidden
 */
function makeBlobBeginCopyFromURLPollOperation(state) {
    return {
        state: Object.assign({}, state),
        cancel,
        toString,
        update,
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Generate a range string. For example:
 *
 * "bytes=255-" or "bytes=0-511"
 *
 * @param iRange -
 */
function rangeToString(iRange) {
    if (iRange.offset < 0) {
        throw new RangeError(`Range.offset cannot be smaller than 0.`);
    }
    if (iRange.count && iRange.count <= 0) {
        throw new RangeError(`Range.count must be larger than 0. Leave it undefined if you want a range from offset to the end.`);
    }
    return iRange.count
        ? `bytes=${iRange.offset}-${iRange.offset + iRange.count - 1}`
        : `bytes=${iRange.offset}-`;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// In browser, during webpack or browserify bundling, this module will be replaced by 'events'
// https://github.com/Gozala/events
/**
 * States for Batch.
 */
var BatchStates;
(function (BatchStates) {
    BatchStates[BatchStates["Good"] = 0] = "Good";
    BatchStates[BatchStates["Error"] = 1] = "Error";
})(BatchStates || (BatchStates = {}));
/**
 * Batch provides basic parallel execution with concurrency limits.
 * Will stop execute left operations when one of the executed operation throws an error.
 * But Batch cannot cancel ongoing operations, you need to cancel them by yourself.
 */
class Batch {
    /**
     * Creates an instance of Batch.
     * @param concurrency -
     */
    constructor(concurrency = 5) {
        /**
         * Number of active operations under execution.
         */
        this.actives = 0;
        /**
         * Number of completed operations under execution.
         */
        this.completed = 0;
        /**
         * Offset of next operation to be executed.
         */
        this.offset = 0;
        /**
         * Operation array to be executed.
         */
        this.operations = [];
        /**
         * States of Batch. When an error happens, state will turn into error.
         * Batch will stop execute left operations.
         */
        this.state = BatchStates.Good;
        if (concurrency < 1) {
            throw new RangeError("concurrency must be larger than 0");
        }
        this.concurrency = concurrency;
        this.emitter = new events.EventEmitter();
    }
    /**
     * Add a operation into queue.
     *
     * @param operation -
     */
    addOperation(operation) {
        this.operations.push(async () => {
            try {
                this.actives++;
                await operation();
                this.actives--;
                this.completed++;
                this.parallelExecute();
            }
            catch (error) {
                this.emitter.emit("error", error);
            }
        });
    }
    /**
     * Start execute operations in the queue.
     *
     */
    async do() {
        if (this.operations.length === 0) {
            return Promise.resolve();
        }
        this.parallelExecute();
        return new Promise((resolve, reject) => {
            this.emitter.on("finish", resolve);
            this.emitter.on("error", (error) => {
                this.state = BatchStates.Error;
                reject(error);
            });
        });
    }
    /**
     * Get next operation to be executed. Return null when reaching ends.
     *
     */
    nextOperation() {
        if (this.offset < this.operations.length) {
            return this.operations[this.offset++];
        }
        return null;
    }
    /**
     * Start execute operations. One one the most important difference between
     * this method with do() is that do() wraps as an sync method.
     *
     */
    parallelExecute() {
        if (this.state === BatchStates.Error) {
            return;
        }
        if (this.completed >= this.operations.length) {
            this.emitter.emit("finish");
            return;
        }
        while (this.actives < this.concurrency) {
            const operation = this.nextOperation();
            if (operation) {
                operation();
            }
            else {
                return;
            }
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This class generates a readable stream from the data in an array of buffers.
 */
class BuffersStream extends stream.Readable {
    /**
     * Creates an instance of BuffersStream that will emit the data
     * contained in the array of buffers.
     *
     * @param buffers - Array of buffers containing the data
     * @param byteLength - The total length of data contained in the buffers
     */
    constructor(buffers, byteLength, options) {
        super(options);
        this.buffers = buffers;
        this.byteLength = byteLength;
        this.byteOffsetInCurrentBuffer = 0;
        this.bufferIndex = 0;
        this.pushedBytesLength = 0;
        // check byteLength is no larger than buffers[] total length
        let buffersLength = 0;
        for (const buf of this.buffers) {
            buffersLength += buf.byteLength;
        }
        if (buffersLength < this.byteLength) {
            throw new Error("Data size shouldn't be larger than the total length of buffers.");
        }
    }
    /**
     * Internal _read() that will be called when the stream wants to pull more data in.
     *
     * @param size - Optional. The size of data to be read
     */
    _read(size) {
        if (this.pushedBytesLength >= this.byteLength) {
            this.push(null);
        }
        if (!size) {
            size = this.readableHighWaterMark;
        }
        const outBuffers = [];
        let i = 0;
        while (i < size && this.pushedBytesLength < this.byteLength) {
            // The last buffer may be longer than the data it contains.
            const remainingDataInAllBuffers = this.byteLength - this.pushedBytesLength;
            const remainingCapacityInThisBuffer = this.buffers[this.bufferIndex].byteLength - this.byteOffsetInCurrentBuffer;
            const remaining = Math.min(remainingCapacityInThisBuffer, remainingDataInAllBuffers);
            if (remaining > size - i) {
                // chunkSize = size - i
                const end = this.byteOffsetInCurrentBuffer + size - i;
                outBuffers.push(this.buffers[this.bufferIndex].slice(this.byteOffsetInCurrentBuffer, end));
                this.pushedBytesLength += size - i;
                this.byteOffsetInCurrentBuffer = end;
                i = size;
                break;
            }
            else {
                // chunkSize = remaining
                const end = this.byteOffsetInCurrentBuffer + remaining;
                outBuffers.push(this.buffers[this.bufferIndex].slice(this.byteOffsetInCurrentBuffer, end));
                if (remaining === remainingCapacityInThisBuffer) {
                    // this.buffers[this.bufferIndex] used up, shift to next one
                    this.byteOffsetInCurrentBuffer = 0;
                    this.bufferIndex++;
                }
                else {
                    this.byteOffsetInCurrentBuffer = end;
                }
                this.pushedBytesLength += remaining;
                i += remaining;
            }
        }
        if (outBuffers.length > 1) {
            this.push(Buffer.concat(outBuffers));
        }
        else if (outBuffers.length === 1) {
            this.push(outBuffers[0]);
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const maxBufferLength = buffer.constants.MAX_LENGTH;
/**
 * This class provides a buffer container which conceptually has no hard size limit.
 * It accepts a capacity, an array of input buffers and the total length of input data.
 * It will allocate an internal "buffer" of the capacity and fill the data in the input buffers
 * into the internal "buffer" serially with respect to the total length.
 * Then by calling PooledBuffer.getReadableStream(), you can get a readable stream
 * assembled from all the data in the internal "buffer".
 */
class PooledBuffer {
    /**
     * The size of the data contained in the pooled buffers.
     */
    get size() {
        return this._size;
    }
    constructor(capacity, buffers, totalLength) {
        /**
         * Internal buffers used to keep the data.
         * Each buffer has a length of the maxBufferLength except last one.
         */
        this.buffers = [];
        this.capacity = capacity;
        this._size = 0;
        // allocate
        const bufferNum = Math.ceil(capacity / maxBufferLength);
        for (let i = 0; i < bufferNum; i++) {
            let len = i === bufferNum - 1 ? capacity % maxBufferLength : maxBufferLength;
            if (len === 0) {
                len = maxBufferLength;
            }
            this.buffers.push(Buffer.allocUnsafe(len));
        }
        if (buffers) {
            this.fill(buffers, totalLength);
        }
    }
    /**
     * Fill the internal buffers with data in the input buffers serially
     * with respect to the total length and the total capacity of the internal buffers.
     * Data copied will be shift out of the input buffers.
     *
     * @param buffers - Input buffers containing the data to be filled in the pooled buffer
     * @param totalLength - Total length of the data to be filled in.
     *
     */
    fill(buffers, totalLength) {
        this._size = Math.min(this.capacity, totalLength);
        let i = 0, j = 0, targetOffset = 0, sourceOffset = 0, totalCopiedNum = 0;
        while (totalCopiedNum < this._size) {
            const source = buffers[i];
            const target = this.buffers[j];
            const copiedNum = source.copy(target, targetOffset, sourceOffset);
            totalCopiedNum += copiedNum;
            sourceOffset += copiedNum;
            targetOffset += copiedNum;
            if (sourceOffset === source.length) {
                i++;
                sourceOffset = 0;
            }
            if (targetOffset === target.length) {
                j++;
                targetOffset = 0;
            }
        }
        // clear copied from source buffers
        buffers.splice(0, i);
        if (buffers.length > 0) {
            buffers[0] = buffers[0].slice(sourceOffset);
        }
    }
    /**
     * Get the readable stream assembled from all the data in the internal buffers.
     *
     */
    getReadableStream() {
        return new BuffersStream(this.buffers, this.size);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * This class accepts a Node.js Readable stream as input, and keeps reading data
 * from the stream into the internal buffer structure, until it reaches maxBuffers.
 * Every available buffer will try to trigger outgoingHandler.
 *
 * The internal buffer structure includes an incoming buffer array, and a outgoing
 * buffer array. The incoming buffer array includes the "empty" buffers can be filled
 * with new incoming data. The outgoing array includes the filled buffers to be
 * handled by outgoingHandler. Every above buffer size is defined by parameter bufferSize.
 *
 * NUM_OF_ALL_BUFFERS = BUFFERS_IN_INCOMING + BUFFERS_IN_OUTGOING + BUFFERS_UNDER_HANDLING
 *
 * NUM_OF_ALL_BUFFERS lesser than or equal to maxBuffers
 *
 * PERFORMANCE IMPROVEMENT TIPS:
 * 1. Input stream highWaterMark is better to set a same value with bufferSize
 *    parameter, which will avoid Buffer.concat() operations.
 * 2. concurrency should set a smaller value than maxBuffers, which is helpful to
 *    reduce the possibility when a outgoing handler waits for the stream data.
 *    in this situation, outgoing handlers are blocked.
 *    Outgoing queue shouldn't be empty.
 */
class BufferScheduler {
    /**
     * Creates an instance of BufferScheduler.
     *
     * @param readable - A Node.js Readable stream
     * @param bufferSize - Buffer size of every maintained buffer
     * @param maxBuffers - How many buffers can be allocated
     * @param outgoingHandler - An async function scheduled to be
     *                                          triggered when a buffer fully filled
     *                                          with stream data
     * @param concurrency - Concurrency of executing outgoingHandlers (>0)
     * @param encoding - [Optional] Encoding of Readable stream when it's a string stream
     */
    constructor(readable, bufferSize, maxBuffers, outgoingHandler, concurrency, encoding) {
        /**
         * An internal event emitter.
         */
        this.emitter = new events.EventEmitter();
        /**
         * An internal offset marker to track data offset in bytes of next outgoingHandler.
         */
        this.offset = 0;
        /**
         * An internal marker to track whether stream is end.
         */
        this.isStreamEnd = false;
        /**
         * An internal marker to track whether stream or outgoingHandler returns error.
         */
        this.isError = false;
        /**
         * How many handlers are executing.
         */
        this.executingOutgoingHandlers = 0;
        /**
         * How many buffers have been allocated.
         */
        this.numBuffers = 0;
        /**
         * Because this class doesn't know how much data every time stream pops, which
         * is defined by highWaterMarker of the stream. So BufferScheduler will cache
         * data received from the stream, when data in unresolvedDataArray exceeds the
         * blockSize defined, it will try to concat a blockSize of buffer, fill into available
         * buffers from incoming and push to outgoing array.
         */
        this.unresolvedDataArray = [];
        /**
         * How much data consisted in unresolvedDataArray.
         */
        this.unresolvedLength = 0;
        /**
         * The array includes all the available buffers can be used to fill data from stream.
         */
        this.incoming = [];
        /**
         * The array (queue) includes all the buffers filled from stream data.
         */
        this.outgoing = [];
        if (bufferSize <= 0) {
            throw new RangeError(`bufferSize must be larger than 0, current is ${bufferSize}`);
        }
        if (maxBuffers <= 0) {
            throw new RangeError(`maxBuffers must be larger than 0, current is ${maxBuffers}`);
        }
        if (concurrency <= 0) {
            throw new RangeError(`concurrency must be larger than 0, current is ${concurrency}`);
        }
        this.bufferSize = bufferSize;
        this.maxBuffers = maxBuffers;
        this.readable = readable;
        this.outgoingHandler = outgoingHandler;
        this.concurrency = concurrency;
        this.encoding = encoding;
    }
    /**
     * Start the scheduler, will return error when stream of any of the outgoingHandlers
     * returns error.
     *
     */
    async do() {
        return new Promise((resolve, reject) => {
            this.readable.on("data", (data) => {
                data = typeof data === "string" ? Buffer.from(data, this.encoding) : data;
                this.appendUnresolvedData(data);
                if (!this.resolveData()) {
                    this.readable.pause();
                }
            });
            this.readable.on("error", (err) => {
                this.emitter.emit("error", err);
            });
            this.readable.on("end", () => {
                this.isStreamEnd = true;
                this.emitter.emit("checkEnd");
            });
            this.emitter.on("error", (err) => {
                this.isError = true;
                this.readable.pause();
                reject(err);
            });
            this.emitter.on("checkEnd", () => {
                if (this.outgoing.length > 0) {
                    this.triggerOutgoingHandlers();
                    return;
                }
                if (this.isStreamEnd && this.executingOutgoingHandlers === 0) {
                    if (this.unresolvedLength > 0 && this.unresolvedLength < this.bufferSize) {
                        const buffer = this.shiftBufferFromUnresolvedDataArray();
                        this.outgoingHandler(() => buffer.getReadableStream(), buffer.size, this.offset)
                            .then(resolve)
                            .catch(reject);
                    }
                    else if (this.unresolvedLength >= this.bufferSize) {
                        return;
                    }
                    else {
                        resolve();
                    }
                }
            });
        });
    }
    /**
     * Insert a new data into unresolved array.
     *
     * @param data -
     */
    appendUnresolvedData(data) {
        this.unresolvedDataArray.push(data);
        this.unresolvedLength += data.length;
    }
    /**
     * Try to shift a buffer with size in blockSize. The buffer returned may be less
     * than blockSize when data in unresolvedDataArray is less than bufferSize.
     *
     */
    shiftBufferFromUnresolvedDataArray(buffer) {
        if (!buffer) {
            buffer = new PooledBuffer(this.bufferSize, this.unresolvedDataArray, this.unresolvedLength);
        }
        else {
            buffer.fill(this.unresolvedDataArray, this.unresolvedLength);
        }
        this.unresolvedLength -= buffer.size;
        return buffer;
    }
    /**
     * Resolve data in unresolvedDataArray. For every buffer with size in blockSize
     * shifted, it will try to get (or allocate a buffer) from incoming, and fill it,
     * then push it into outgoing to be handled by outgoing handler.
     *
     * Return false when available buffers in incoming are not enough, else true.
     *
     * @returns Return false when buffers in incoming are not enough, else true.
     */
    resolveData() {
        while (this.unresolvedLength >= this.bufferSize) {
            let buffer;
            if (this.incoming.length > 0) {
                buffer = this.incoming.shift();
                this.shiftBufferFromUnresolvedDataArray(buffer);
            }
            else {
                if (this.numBuffers < this.maxBuffers) {
                    buffer = this.shiftBufferFromUnresolvedDataArray();
                    this.numBuffers++;
                }
                else {
                    // No available buffer, wait for buffer returned
                    return false;
                }
            }
            this.outgoing.push(buffer);
            this.triggerOutgoingHandlers();
        }
        return true;
    }
    /**
     * Try to trigger a outgoing handler for every buffer in outgoing. Stop when
     * concurrency reaches.
     */
    async triggerOutgoingHandlers() {
        let buffer;
        do {
            if (this.executingOutgoingHandlers >= this.concurrency) {
                return;
            }
            buffer = this.outgoing.shift();
            if (buffer) {
                this.triggerOutgoingHandler(buffer);
            }
        } while (buffer);
    }
    /**
     * Trigger a outgoing handler for a buffer shifted from outgoing.
     *
     * @param buffer -
     */
    async triggerOutgoingHandler(buffer) {
        const bufferLength = buffer.size;
        this.executingOutgoingHandlers++;
        this.offset += bufferLength;
        try {
            await this.outgoingHandler(() => buffer.getReadableStream(), bufferLength, this.offset - bufferLength);
        }
        catch (err) {
            this.emitter.emit("error", err);
            return;
        }
        this.executingOutgoingHandlers--;
        this.reuseBuffer(buffer);
        this.emitter.emit("checkEnd");
    }
    /**
     * Return buffer used by outgoing handler into incoming.
     *
     * @param buffer -
     */
    reuseBuffer(buffer) {
        this.incoming.push(buffer);
        if (!this.isError && this.resolveData() && !this.isStreamEnd) {
            this.readable.resume();
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Reads a readable stream into buffer. Fill the buffer from offset to end.
 *
 * @param stream - A Node.js Readable stream
 * @param buffer - Buffer to be filled, length must greater than or equal to offset
 * @param offset - From which position in the buffer to be filled, inclusive
 * @param end - To which position in the buffer to be filled, exclusive
 * @param encoding - Encoding of the Readable stream
 */
async function streamToBuffer(stream, buffer, offset, end, encoding) {
    let pos = 0; // Position in stream
    const count = end - offset; // Total amount of data needed in stream
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`The operation cannot be completed in timeout.`)), REQUEST_TIMEOUT);
        stream.on("readable", () => {
            if (pos >= count) {
                clearTimeout(timeout);
                resolve();
                return;
            }
            let chunk = stream.read();
            if (!chunk) {
                return;
            }
            if (typeof chunk === "string") {
                chunk = Buffer.from(chunk, encoding);
            }
            // How much data needed in this chunk
            const chunkLength = pos + chunk.length > count ? count - pos : chunk.length;
            buffer.fill(chunk.slice(0, chunkLength), offset + pos, offset + pos + chunkLength);
            pos += chunkLength;
        });
        stream.on("end", () => {
            clearTimeout(timeout);
            if (pos < count) {
                reject(new Error(`Stream drains before getting enough data needed. Data read: ${pos}, data need: ${count}`));
            }
            resolve();
        });
        stream.on("error", (msg) => {
            clearTimeout(timeout);
            reject(msg);
        });
    });
}
/**
 * Reads a readable stream into buffer entirely.
 *
 * @param stream - A Node.js Readable stream
 * @param buffer - Buffer to be filled, length must greater than or equal to offset
 * @param encoding - Encoding of the Readable stream
 * @returns with the count of bytes read.
 * @throws `RangeError` If buffer size is not big enough.
 */
async function streamToBuffer2(stream, buffer, encoding) {
    let pos = 0; // Position in stream
    const bufferSize = buffer.length;
    return new Promise((resolve, reject) => {
        stream.on("readable", () => {
            let chunk = stream.read();
            if (!chunk) {
                return;
            }
            if (typeof chunk === "string") {
                chunk = Buffer.from(chunk, encoding);
            }
            if (pos + chunk.length > bufferSize) {
                reject(new Error(`Stream exceeds buffer size. Buffer size: ${bufferSize}`));
                return;
            }
            buffer.fill(chunk, pos, pos + chunk.length);
            pos += chunk.length;
        });
        stream.on("end", () => {
            resolve(pos);
        });
        stream.on("error", reject);
    });
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Writes the content of a readstream to a local file. Returns a Promise which is completed after the file handle is closed.
 *
 * @param rs - The read stream.
 * @param file - Destination file path.
 */
async function readStreamToLocalFile(rs, file) {
    return new Promise((resolve, reject) => {
        const ws = fs__namespace.createWriteStream(file);
        rs.on("error", (err) => {
            reject(err);
        });
        ws.on("error", (err) => {
            reject(err);
        });
        ws.on("close", resolve);
        rs.pipe(ws);
    });
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Promisified version of fs.stat().
 */
const fsStat = util__namespace.promisify(fs__namespace.stat);
const fsCreateReadStream = fs__namespace.createReadStream;

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A BlobClient represents a URL to an Azure Storage blob; the blob may be a block blob,
 * append blob, or page blob.
 */
class BlobClient extends StorageClient {
    /**
     * The name of the blob.
     */
    get name() {
        return this._name;
    }
    /**
     * The name of the storage container the blob is associated with.
     */
    get containerName() {
        return this._containerName;
    }
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        options = options || {};
        let pipeline;
        let url;
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((coreUtil.isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            if (blobNameOrOptions && typeof blobNameOrOptions !== "string") {
                options = blobNameOrOptions;
            }
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (coreUtil.isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        ({ blobName: this._name, containerName: this._containerName } =
            this.getBlobAndContainerNamesFromUrl());
        this.blobContext = this.storageClientContext.blob;
        this._snapshot = getURLParameter(this.url, URLConstants.Parameters.SNAPSHOT);
        this._versionId = getURLParameter(this.url, URLConstants.Parameters.VERSIONID);
    }
    /**
     * Creates a new BlobClient object identical to the source but with the specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new BlobClient object identical to the source but with the specified snapshot timestamp
     */
    withSnapshot(snapshot) {
        return new BlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a new BlobClient object pointing to a version of this blob.
     * Provide "" will remove the versionId and return a Client to the base blob.
     *
     * @param versionId - The versionId.
     * @returns A new BlobClient object pointing to the version of this blob.
     */
    withVersion(versionId) {
        return new BlobClient(setURLParameter(this.url, URLConstants.Parameters.VERSIONID, versionId.length === 0 ? undefined : versionId), this.pipeline);
    }
    /**
     * Creates a AppendBlobClient object.
     *
     */
    getAppendBlobClient() {
        return new AppendBlobClient(this.url, this.pipeline);
    }
    /**
     * Creates a BlockBlobClient object.
     *
     */
    getBlockBlobClient() {
        return new BlockBlobClient(this.url, this.pipeline);
    }
    /**
     * Creates a PageBlobClient object.
     *
     */
    getPageBlobClient() {
        return new PageBlobClient(this.url, this.pipeline);
    }
    /**
     * Reads or downloads a blob from the system, including its metadata and properties.
     * You can also call Get Blob to read a snapshot.
     *
     * * In Node.js, data returns in a Readable stream readableStreamBody
     * * In browsers, data returns in a promise blobBody
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob
     *
     * @param offset - From which position of the blob to download, greater than or equal to 0
     * @param count - How much data to be downloaded, greater than 0. Will download to the end when undefined
     * @param options - Optional options to Blob Download operation.
     *
     *
     * Example usage (Node.js):
     *
     * ```js
     * // Download and convert a blob to a string
     * const downloadBlockBlobResponse = await blobClient.download();
     * const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
     * console.log("Downloaded blob content:", downloaded.toString());
     *
     * async function streamToBuffer(readableStream) {
     * return new Promise((resolve, reject) => {
     * const chunks = [];
     * readableStream.on("data", (data) => {
     * chunks.push(data instanceof Buffer ? data : Buffer.from(data));
     * });
     * readableStream.on("end", () => {
     * resolve(Buffer.concat(chunks));
     * });
     * readableStream.on("error", reject);
     * });
     * }
     * ```
     *
     * Example usage (browser):
     *
     * ```js
     * // Download and convert a blob to a string
     * const downloadBlockBlobResponse = await blobClient.download();
     * const downloaded = await blobToString(await downloadBlockBlobResponse.blobBody);
     * console.log(
     *   "Downloaded blob content",
     *   downloaded
     * );
     *
     * async function blobToString(blob: Blob): Promise<string> {
     *   const fileReader = new FileReader();
     *   return new Promise<string>((resolve, reject) => {
     *     fileReader.onloadend = (ev: any) => {
     *       resolve(ev.target!.result);
     *     };
     *     fileReader.onerror = reject;
     *     fileReader.readAsText(blob);
     *   });
     * }
     * ```
     */
    async download(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-download", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blobContext.download({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onDownloadProgress: coreUtil.isNode ? undefined : options.onProgress, // for Node.js, progress is reported by RetriableReadableStream
                },
                range: offset === 0 && !count ? undefined : rangeToString({ offset, count }),
                rangeGetContentMD5: options.rangeGetContentMD5,
                rangeGetContentCRC64: options.rangeGetContentCrc64,
                snapshot: options.snapshot,
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedRes = Object.assign(Object.assign({}, res), { _response: res._response, objectReplicationDestinationPolicyId: res.objectReplicationPolicyId, objectReplicationSourceProperties: parseObjectReplicationRecord(res.objectReplicationRules) });
            // Return browser response immediately
            if (!coreUtil.isNode) {
                return wrappedRes;
            }
            // We support retrying when download stream unexpected ends in Node.js runtime
            // Following code shouldn't be bundled into browser build, however some
            // bundlers may try to bundle following code and "FileReadResponse.ts".
            // In this case, "FileDownloadResponse.browser.ts" will be used as a shim of "FileDownloadResponse.ts"
            // The config is in package.json "browser" field
            if (options.maxRetryRequests === undefined || options.maxRetryRequests < 0) {
                // TODO: Default value or make it a required parameter?
                options.maxRetryRequests = DEFAULT_MAX_DOWNLOAD_RETRY_REQUESTS;
            }
            if (res.contentLength === undefined) {
                throw new RangeError(`File download response doesn't contain valid content length header`);
            }
            if (!res.etag) {
                throw new RangeError(`File download response doesn't contain valid etag header`);
            }
            return new BlobDownloadResponse(wrappedRes, async (start) => {
                var _a;
                const updatedDownloadOptions = {
                    leaseAccessConditions: options.conditions,
                    modifiedAccessConditions: {
                        ifMatch: options.conditions.ifMatch || res.etag,
                        ifModifiedSince: options.conditions.ifModifiedSince,
                        ifNoneMatch: options.conditions.ifNoneMatch,
                        ifUnmodifiedSince: options.conditions.ifUnmodifiedSince,
                        ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions,
                    },
                    range: rangeToString({
                        count: offset + res.contentLength - start,
                        offset: start,
                    }),
                    rangeGetContentMD5: options.rangeGetContentMD5,
                    rangeGetContentCRC64: options.rangeGetContentCrc64,
                    snapshot: options.snapshot,
                    cpkInfo: options.customerProvidedKey,
                };
                // Debug purpose only
                // console.log(
                //   `Read from internal stream, range: ${
                //     updatedOptions.range
                //   }, options: ${JSON.stringify(updatedOptions)}`
                // );
                return (await this.blobContext.download(Object.assign({ abortSignal: options.abortSignal }, updatedDownloadOptions))).readableStreamBody;
            }, offset, res.contentLength, {
                maxRetryRequests: options.maxRetryRequests,
                onProgress: options.onProgress,
            });
        });
    }
    /**
     * Returns true if the Azure blob resource represented by this client exists; false otherwise.
     *
     * NOTE: use this function with care since an existing blob might be deleted by other clients or
     * applications. Vice versa new blobs might be added by other clients or applications after this
     * function completes.
     *
     * @param options - options to Exists operation.
     */
    async exists(options = {}) {
        return tracingClient.withSpan("BlobClient-exists", options, async (updatedOptions) => {
            try {
                ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
                await this.getProperties({
                    abortSignal: options.abortSignal,
                    customerProvidedKey: options.customerProvidedKey,
                    conditions: options.conditions,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                return true;
            }
            catch (e) {
                if (e.statusCode === 404) {
                    // Expected exception when checking blob existence
                    return false;
                }
                else if (e.statusCode === 409 &&
                    (e.details.errorCode === BlobUsesCustomerSpecifiedEncryptionMsg ||
                        e.details.errorCode === BlobDoesNotUseCustomerSpecifiedEncryption)) {
                    // Expected exception when checking blob existence
                    return true;
                }
                throw e;
            }
        });
    }
    /**
     * Returns all user-defined metadata, standard HTTP properties, and system properties
     * for the blob. It does not return the content of the blob.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob-properties
     *
     * WARNING: The `metadata` object returned in the response will have its keys in lowercase, even if
     * they originally contained uppercase characters. This differs from the metadata keys returned by
     * the methods of {@link ContainerClient} that list blobs using the `includeMetadata` option, which
     * will retain their original casing.
     *
     * @param options - Optional options to Get Properties operation.
     */
    async getProperties(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-getProperties", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blobContext.getProperties({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return Object.assign(Object.assign({}, res), { _response: res._response, objectReplicationDestinationPolicyId: res.objectReplicationPolicyId, objectReplicationSourceProperties: parseObjectReplicationRecord(res.objectReplicationRules) });
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param options - Optional options to Blob Delete operation.
     */
    async delete(options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("BlobClient-delete", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.delete({
                abortSignal: options.abortSignal,
                deleteSnapshots: options.deleteSnapshots,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion if it exists. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param options - Optional options to Blob Delete operation.
     */
    async deleteIfExists(options = {}) {
        return tracingClient.withSpan("BlobClient-deleteIfExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = assertResponse(await this.delete(updatedOptions));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobNotFound") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Restores the contents and metadata of soft deleted blob and any associated
     * soft deleted snapshots. Undelete Blob is supported only on version 2017-07-29
     * or later.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/undelete-blob
     *
     * @param options - Optional options to Blob Undelete operation.
     */
    async undelete(options = {}) {
        return tracingClient.withSpan("BlobClient-undelete", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.undelete({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets system properties on the blob.
     *
     * If no value provided, or no value provided for the specified blob HTTP headers,
     * these blob HTTP headers without a value will be cleared.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-properties
     *
     * @param blobHTTPHeaders - If no value provided, or no value provided for
     *                                                   the specified blob HTTP headers, these blob HTTP
     *                                                   headers without a value will be cleared.
     *                                                   A common header to set is `blobContentType`
     *                                                   enabling the browser to provide functionality
     *                                                   based on file type.
     * @param options - Optional options to Blob Set HTTP Headers operation.
     */
    async setHTTPHeaders(blobHTTPHeaders, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-setHTTPHeaders", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setHttpHeaders({
                abortSignal: options.abortSignal,
                blobHttpHeaders: blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                // cpkInfo: options.customerProvidedKey, // CPK is not included in Swagger, should change this back when this issue is fixed in Swagger.
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets user-defined metadata for the specified blob as one or more name-value pairs.
     *
     * If no option provided, or no metadata defined in the parameter, the blob
     * metadata will be removed.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-metadata
     *
     * @param metadata - Replace existing metadata with this value.
     *                               If no value provided the existing metadata will be removed.
     * @param options - Optional options to Set Metadata operation.
     */
    async setMetadata(metadata, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-setMetadata", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setMetadata({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets tags on the underlying blob.
     * A blob can have up to 10 tags. Tag keys must be between 1 and 128 characters.  Tag values must be between 0 and 256 characters.
     * Valid tag key and value characters include lower and upper case letters, digits (0-9),
     * space (' '), plus ('+'), minus ('-'), period ('.'), foward slash ('/'), colon (':'), equals ('='), and underscore ('_').
     *
     * @param tags -
     * @param options -
     */
    async setTags(tags, options = {}) {
        return tracingClient.withSpan("BlobClient-setTags", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setTags({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
                tags: toBlobTags(tags),
            }));
        });
    }
    /**
     * Gets the tags associated with the underlying blob.
     *
     * @param options -
     */
    async getTags(options = {}) {
        return tracingClient.withSpan("BlobClient-getTags", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.blobContext.getTags({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: response._response, tags: toTags({ blobTagSet: response.blobTagSet }) || {} });
            return wrappedResponse;
        });
    }
    /**
     * Get a {@link BlobLeaseClient} that manages leases on the blob.
     *
     * @param proposeLeaseId - Initial proposed lease Id.
     * @returns A new BlobLeaseClient object for managing leases on the blob.
     */
    getBlobLeaseClient(proposeLeaseId) {
        return new BlobLeaseClient(this, proposeLeaseId);
    }
    /**
     * Creates a read-only snapshot of a blob.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/snapshot-blob
     *
     * @param options - Optional options to the Blob Create Snapshot operation.
     */
    async createSnapshot(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlobClient-createSnapshot", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.createSnapshot({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Asynchronously copies a blob to a destination within the storage account.
     * This method returns a long running operation poller that allows you to wait
     * indefinitely until the copy is completed.
     * You can also cancel a copy before it is completed by calling `cancelOperation` on the poller.
     * Note that the onProgress callback will not be invoked if the operation completes in the first
     * request, and attempting to cancel a completed copy will result in an error being thrown.
     *
     * In version 2012-02-12 and later, the source for a Copy Blob operation can be
     * a committed blob in any Azure storage account.
     * Beginning with version 2015-02-21, the source for a Copy Blob operation can be
     * an Azure file in any Azure storage account.
     * Only storage accounts created on or after June 7th, 2012 allow the Copy Blob
     * operation to copy from another storage account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob
     *
     * Example using automatic polling:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using manual polling:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * while (!poller.isDone()) {
     *    await poller.poll();
     * }
     * const result = copyPoller.getResult();
     * ```
     *
     * Example using progress updates:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url', {
     *   onProgress(state) {
     *     console.log(`Progress: ${state.copyProgress}`);
     *   }
     * });
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using a changing polling interval (default 15 seconds):
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url', {
     *   intervalInMs: 1000 // poll blob every 1 second for copy progress
     * });
     * const result = await copyPoller.pollUntilDone();
     * ```
     *
     * Example using copy cancellation:
     *
     * ```js
     * const copyPoller = await blobClient.beginCopyFromURL('url');
     * // cancel operation after starting it.
     * try {
     *   await copyPoller.cancelOperation();
     *   // calls to get the result now throw PollerCancelledError
     *   await copyPoller.getResult();
     * } catch (err) {
     *   if (err.name === 'PollerCancelledError') {
     *     console.log('The copy was cancelled.');
     *   }
     * }
     * ```
     *
     * @param copySource - url to the source Azure Blob/File.
     * @param options - Optional options to the Blob Start Copy From URL operation.
     */
    async beginCopyFromURL(copySource, options = {}) {
        const client = {
            abortCopyFromURL: (...args) => this.abortCopyFromURL(...args),
            getProperties: (...args) => this.getProperties(...args),
            startCopyFromURL: (...args) => this.startCopyFromURL(...args),
        };
        const poller = new BlobBeginCopyFromUrlPoller({
            blobClient: client,
            copySource,
            intervalInMs: options.intervalInMs,
            onProgress: options.onProgress,
            resumeFrom: options.resumeFrom,
            startCopyFromURLOptions: options,
        });
        // Trigger the startCopyFromURL call by calling poll.
        // Any errors from this method should be surfaced to the user.
        await poller.poll();
        return poller;
    }
    /**
     * Aborts a pending asynchronous Copy Blob operation, and leaves a destination blob with zero
     * length and full metadata. Version 2012-02-12 and newer.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/abort-copy-blob
     *
     * @param copyId - Id of the Copy From URL operation.
     * @param options - Optional options to the Blob Abort Copy From URL operation.
     */
    async abortCopyFromURL(copyId, options = {}) {
        return tracingClient.withSpan("BlobClient-abortCopyFromURL", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.abortCopyFromURL(copyId, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The synchronous Copy From URL operation copies a blob or an internet resource to a new blob. It will not
     * return a response until the copy is complete.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob-from-url
     *
     * @param copySource - The source URL to copy from, Shared Access Signature(SAS) maybe needed for authentication
     * @param options -
     */
    async syncCopyFromURL(copySource, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        return tracingClient.withSpan("BlobClient-syncCopyFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return assertResponse(await this.blobContext.copyFromURL(copySource, {
                abortSignal: options.abortSignal,
                metadata: options.metadata,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                sourceContentMD5: options.sourceContentMD5,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                immutabilityPolicyExpiry: (_f = options.immutabilityPolicy) === null || _f === void 0 ? void 0 : _f.expiriesOn,
                immutabilityPolicyMode: (_g = options.immutabilityPolicy) === null || _g === void 0 ? void 0 : _g.policyMode,
                legalHold: options.legalHold,
                encryptionScope: options.encryptionScope,
                copySourceTags: options.copySourceTags,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets the tier on a blob. The operation is allowed on a page blob in a premium
     * storage account and on a block blob in a blob storage account (locally redundant
     * storage only). A premium page blob's tier determines the allowed size, IOPS,
     * and bandwidth of the blob. A block blob's tier determines Hot/Cool/Archive
     * storage type. This operation does not update the blob's ETag.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-tier
     *
     * @param tier - The tier to be set on the blob. Valid values are Hot, Cool, or Archive.
     * @param options - Optional options to the Blob Set Tier operation.
     */
    async setAccessTier(tier, options = {}) {
        return tracingClient.withSpan("BlobClient-setAccessTier", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.blobContext.setTier(toAccessTier(tier), {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                rehydratePriority: options.rehydratePriority,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    async downloadToBuffer(param1, param2, param3, param4 = {}) {
        var _a;
        let buffer;
        let offset = 0;
        let count = 0;
        let options = param4;
        if (param1 instanceof Buffer) {
            buffer = param1;
            offset = param2 || 0;
            count = typeof param3 === "number" ? param3 : 0;
        }
        else {
            offset = typeof param1 === "number" ? param1 : 0;
            count = typeof param2 === "number" ? param2 : 0;
            options = param3 || {};
        }
        let blockSize = (_a = options.blockSize) !== null && _a !== void 0 ? _a : 0;
        if (blockSize < 0) {
            throw new RangeError("blockSize option must be >= 0");
        }
        if (blockSize === 0) {
            blockSize = DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES;
        }
        if (offset < 0) {
            throw new RangeError("offset option must be >= 0");
        }
        if (count && count <= 0) {
            throw new RangeError("count option must be greater than 0");
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlobClient-downloadToBuffer", options, async (updatedOptions) => {
            // Customer doesn't specify length, get it
            if (!count) {
                const response = await this.getProperties(Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
                count = response.contentLength - offset;
                if (count < 0) {
                    throw new RangeError(`offset ${offset} shouldn't be larger than blob size ${response.contentLength}`);
                }
            }
            // Allocate the buffer of size = count if the buffer is not provided
            if (!buffer) {
                try {
                    buffer = Buffer.alloc(count);
                }
                catch (error) {
                    throw new Error(`Unable to allocate the buffer of size: ${count}(in bytes). Please try passing your own buffer to the "downloadToBuffer" method or try using other methods like "download" or "downloadToFile".\t ${error.message}`);
                }
            }
            if (buffer.length < count) {
                throw new RangeError(`The buffer's size should be equal to or larger than the request count of bytes: ${count}`);
            }
            let transferProgress = 0;
            const batch = new Batch(options.concurrency);
            for (let off = offset; off < offset + count; off = off + blockSize) {
                batch.addOperation(async () => {
                    // Exclusive chunk end position
                    let chunkEnd = offset + count;
                    if (off + blockSize < chunkEnd) {
                        chunkEnd = off + blockSize;
                    }
                    const response = await this.download(off, chunkEnd - off, {
                        abortSignal: options.abortSignal,
                        conditions: options.conditions,
                        maxRetryRequests: options.maxRetryRequestsPerBlock,
                        customerProvidedKey: options.customerProvidedKey,
                        tracingOptions: updatedOptions.tracingOptions,
                    });
                    const stream = response.readableStreamBody;
                    await streamToBuffer(stream, buffer, off - offset, chunkEnd - offset);
                    // Update progress after block is downloaded, in case of block trying
                    // Could provide finer grained progress updating inside HTTP requests,
                    // only if convenience layer download try is enabled
                    transferProgress += chunkEnd - off;
                    if (options.onProgress) {
                        options.onProgress({ loadedBytes: transferProgress });
                    }
                });
            }
            await batch.do();
            return buffer;
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Downloads an Azure Blob to a local file.
     * Fails if the the given file path already exits.
     * Offset and count are optional, pass 0 and undefined respectively to download the entire blob.
     *
     * @param filePath -
     * @param offset - From which position of the block blob to download.
     * @param count - How much data to be downloaded. Will download to the end when passing undefined.
     * @param options - Options to Blob download options.
     * @returns The response data for blob download operation,
     *                                                 but with readableStreamBody set to undefined since its
     *                                                 content is already read and written into a local file
     *                                                 at the specified path.
     */
    async downloadToFile(filePath, offset = 0, count, options = {}) {
        return tracingClient.withSpan("BlobClient-downloadToFile", options, async (updatedOptions) => {
            const response = await this.download(offset, count, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
            if (response.readableStreamBody) {
                await readStreamToLocalFile(response.readableStreamBody, filePath);
            }
            // The stream is no longer accessible so setting it to undefined.
            response.blobDownloadStream = undefined;
            return response;
        });
    }
    getBlobAndContainerNamesFromUrl() {
        let containerName;
        let blobName;
        try {
            //  URL may look like the following
            // "https://myaccount.blob.core.windows.net/mycontainer/blob?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob/a.txt?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer/blob/a.txt";
            // IPv4/IPv6 address hosts, Endpoints - `http://127.0.0.1:10000/devstoreaccount1/containername/blob`
            // http://localhost:10001/devstoreaccount1/containername/blob
            const parsedUrl = new URL(this.url);
            if (parsedUrl.host.split(".")[1] === "blob") {
                // "https://myaccount.blob.core.windows.net/containername/blob".
                // .getPath() -> /containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)(/(.*))?");
                containerName = pathComponents[1];
                blobName = pathComponents[3];
            }
            else if (isIpEndpointStyle(parsedUrl)) {
                // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/containername/blob
                // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/containername/blob
                // .getPath() -> /devstoreaccount1/containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)/([^/]*)(/(.*))?");
                containerName = pathComponents[2];
                blobName = pathComponents[4];
            }
            else {
                // "https://customdomain.com/containername/blob".
                // .getPath() -> /containername/blob
                const pathComponents = parsedUrl.pathname.match("/([^/]*)(/(.*))?");
                containerName = pathComponents[1];
                blobName = pathComponents[3];
            }
            // decode the encoded blobName, containerName - to get all the special characters that might be present in them
            containerName = decodeURIComponent(containerName);
            blobName = decodeURIComponent(blobName);
            // Azure Storage Server will replace "\" with "/" in the blob names
            //   doing the same in the SDK side so that the user doesn't have to replace "\" instances in the blobName
            blobName = blobName.replace(/\\/g, "/");
            if (!containerName) {
                throw new Error("Provided containerName is invalid.");
            }
            return { blobName, containerName };
        }
        catch (error) {
            throw new Error("Unable to extract blobName and containerName with provided information.");
        }
    }
    /**
     * Asynchronously copies a blob to a destination within the storage account.
     * In version 2012-02-12 and later, the source for a Copy Blob operation can be
     * a committed blob in any Azure storage account.
     * Beginning with version 2015-02-21, the source for a Copy Blob operation can be
     * an Azure file in any Azure storage account.
     * Only storage accounts created on or after June 7th, 2012 allow the Copy Blob
     * operation to copy from another storage account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/copy-blob
     *
     * @param copySource - url to the source Azure Blob/File.
     * @param options - Optional options to the Blob Start Copy From URL operation.
     */
    async startCopyFromURL(copySource, options = {}) {
        return tracingClient.withSpan("BlobClient-startCopyFromURL", options, async (updatedOptions) => {
            var _a, _b, _c;
            options.conditions = options.conditions || {};
            options.sourceConditions = options.sourceConditions || {};
            return assertResponse(await this.blobContext.startCopyFromURL(copySource, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: options.sourceConditions.ifMatch,
                    sourceIfModifiedSince: options.sourceConditions.ifModifiedSince,
                    sourceIfNoneMatch: options.sourceConditions.ifNoneMatch,
                    sourceIfUnmodifiedSince: options.sourceConditions.ifUnmodifiedSince,
                    sourceIfTags: options.sourceConditions.tagConditions,
                },
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                rehydratePriority: options.rehydratePriority,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                sealBlob: options.sealBlob,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates a Blob Service Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateSasUrl(options) {
        return new Promise((resolve) => {
            if (!(this.credential instanceof StorageSharedKeyCredential)) {
                throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
            }
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), this.credential).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    generateSasStringToSign(options) {
        if (!(this.credential instanceof StorageSharedKeyCredential)) {
            throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
        }
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), this.credential).stringToSign;
    }
    /**
     *
     * Generates a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasUrl(options, userDelegationKey) {
        return new Promise((resolve) => {
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), userDelegationKey, this.accountName).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for BlobClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Service Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasStringToSign(options, userDelegationKey) {
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName, blobName: this._name, snapshotTime: this._snapshot, versionId: this._versionId }, options), userDelegationKey, this.accountName).stringToSign;
    }
    /**
     * Delete the immutablility policy on the blob.
     *
     * @param options - Optional options to delete immutability policy on the blob.
     */
    async deleteImmutabilityPolicy(options = {}) {
        return tracingClient.withSpan("BlobClient-deleteImmutabilityPolicy", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.deleteImmutabilityPolicy({
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Set immutability policy on the blob.
     *
     * @param options - Optional options to set immutability policy on the blob.
     */
    async setImmutabilityPolicy(immutabilityPolicy, options = {}) {
        return tracingClient.withSpan("BlobClient-setImmutabilityPolicy", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.setImmutabilityPolicy({
                immutabilityPolicyExpiry: immutabilityPolicy.expiriesOn,
                immutabilityPolicyMode: immutabilityPolicy.policyMode,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Set legal hold on the blob.
     *
     * @param options - Optional options to set legal hold on the blob.
     */
    async setLegalHold(legalHoldEnabled, options = {}) {
        return tracingClient.withSpan("BlobClient-setLegalHold", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.setLegalHold(legalHoldEnabled, {
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Get Account Information operation returns the sku name and account kind
     * for the specified account.
     * The Get Account Information operation is available on service versions beginning
     * with version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-account-information
     *
     * @param options - Options to the Service Get Account Info operation.
     * @returns Response data for the Service Get Account Info operation.
     */
    async getAccountInfo(options = {}) {
        return tracingClient.withSpan("BlobClient-getAccountInfo", options, async (updatedOptions) => {
            return assertResponse(await this.blobContext.getAccountInfo({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}
/**
 * AppendBlobClient defines a set of operations applicable to append blobs.
 */
class AppendBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((coreUtil.isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)      url = urlOrConnectionString;
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            // The second parameter is undefined. Use anonymous credential.
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (coreUtil.isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.appendBlobContext = this.storageClientContext.appendBlob;
    }
    /**
     * Creates a new AppendBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new AppendBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new AppendBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a 0-length append blob. Call AppendBlock to append data to an append blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param options - Options to the Append Block Create operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const appendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await appendBlobClient.create();
     * ```
     */
    async create(options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-create", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.appendBlobContext.create(0, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a 0-length append blob. Call AppendBlock to append data to an append blob.
     * If the blob with the same name already exists, the content of the existing blob will remain unchanged.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param options -
     */
    async createIfNotExists(options = {}) {
        const conditions = { ifNoneMatch: ETagAny };
        return tracingClient.withSpan("AppendBlobClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = assertResponse(await this.create(Object.assign(Object.assign({}, updatedOptions), { conditions })));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Seals the append blob, making it read only.
     *
     * @param options -
     */
    async seal(options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("AppendBlobClient-seal", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.appendBlobContext.seal({
                abortSignal: options.abortSignal,
                appendPositionAccessConditions: options.conditions,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Commits a new block of data to the end of the existing append blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/append-block
     *
     * @param body - Data to be appended.
     * @param contentLength - Length of the body in bytes.
     * @param options - Options to the Append Block operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello World!";
     *
     * // Create a new append blob and append data to the blob.
     * const newAppendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await newAppendBlobClient.create();
     * await newAppendBlobClient.appendBlock(content, content.length);
     *
     * // Append data to an existing append blob.
     * const existingAppendBlobClient = containerClient.getAppendBlobClient("<blob name>");
     * await existingAppendBlobClient.appendBlock(content, content.length);
     * ```
     */
    async appendBlock(body, contentLength, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-appendBlock", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.appendBlobContext.appendBlock(contentLength, body, {
                abortSignal: options.abortSignal,
                appendPositionAccessConditions: options.conditions,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Append Block operation commits a new block of data to the end of an existing append blob
     * where the contents are read from a source url.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/append-block-from-url
     *
     * @param sourceURL -
     *                 The url to the blob that will be the source of the copy. A source blob in the same storage account can
     *                 be authenticated via Shared Key. However, if the source is a blob in another account, the source blob
     *                 must either be public or must be authenticated via a shared access signature. If the source blob is
     *                 public, no authentication is required to perform the operation.
     * @param sourceOffset - Offset in source to be appended
     * @param count - Number of bytes to be appended as a block
     * @param options -
     */
    async appendBlockFromURL(sourceURL, sourceOffset, count, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("AppendBlobClient-appendBlockFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e;
            return assertResponse(await this.appendBlobContext.appendBlockFromUrl(sourceURL, 0, {
                abortSignal: options.abortSignal,
                sourceRange: rangeToString({ offset: sourceOffset, count }),
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                leaseAccessConditions: options.conditions,
                appendPositionAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}
/**
 * BlockBlobClient defines a set of operations applicable to block blobs.
 */
class BlockBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((coreUtil.isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            if (blobNameOrOptions && typeof blobNameOrOptions !== "string") {
                options = blobNameOrOptions;
            }
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (coreUtil.isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.blockBlobContext = this.storageClientContext.blockBlob;
        this._blobContext = this.storageClientContext.blob;
    }
    /**
     * Creates a new BlockBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a URL to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new BlockBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new BlockBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Quick query for a JSON or CSV formatted blob.
     *
     * Example usage (Node.js):
     *
     * ```js
     * // Query and convert a blob to a string
     * const queryBlockBlobResponse = await blockBlobClient.query("select * from BlobStorage");
     * const downloaded = (await streamToBuffer(queryBlockBlobResponse.readableStreamBody)).toString();
     * console.log("Query blob content:", downloaded);
     *
     * async function streamToBuffer(readableStream) {
     *   return new Promise((resolve, reject) => {
     *     const chunks = [];
     *     readableStream.on("data", (data) => {
     *       chunks.push(data instanceof Buffer ? data : Buffer.from(data));
     *     });
     *     readableStream.on("end", () => {
     *       resolve(Buffer.concat(chunks));
     *     });
     *     readableStream.on("error", reject);
     *   });
     * }
     * ```
     *
     * @param query -
     * @param options -
     */
    async query(query, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        if (!coreUtil.isNode) {
            throw new Error("This operation currently is only supported in Node.js.");
        }
        return tracingClient.withSpan("BlockBlobClient-query", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this._blobContext.query({
                abortSignal: options.abortSignal,
                queryRequest: {
                    queryType: "SQL",
                    expression: query,
                    inputSerialization: toQuerySerialization(options.inputTextConfiguration),
                    outputSerialization: toQuerySerialization(options.outputTextConfiguration),
                },
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return new BlobQueryResponse(response, {
                abortSignal: options.abortSignal,
                onProgress: options.onProgress,
                onError: options.onError,
            });
        });
    }
    /**
     * Creates a new block blob, or updates the content of an existing block blob.
     * Updating an existing block blob overwrites any existing metadata on the blob.
     * Partial updates are not supported; the content of the existing blob is
     * overwritten with the new content. To perform a partial update of a block blob's,
     * use {@link stageBlock} and {@link commitBlockList}.
     *
     * This is a non-parallel uploading method, please use {@link uploadFile},
     * {@link uploadStream} or {@link uploadBrowserData} for better performance
     * with concurrency uploading.
     *
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param body - Blob, string, ArrayBuffer, ArrayBufferView or a function
     *                               which returns a new Readable stream whose offset is from data source beginning.
     * @param contentLength - Length of body in bytes. Use Buffer.byteLength() to calculate body length for a
     *                               string including non non-Base64/Hex-encoded characters.
     * @param options - Options to the Block Blob Upload operation.
     * @returns Response data for the Block Blob Upload operation.
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello world!";
     * const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
     * ```
     */
    async upload(body, contentLength, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-upload", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.blockBlobContext.upload(contentLength, body, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a new Block Blob where the contents of the blob are read from a given URL.
     * This API is supported beginning with the 2020-04-08 version. Partial updates
     * are not supported with Put Blob from URL; the content of an existing blob is overwritten with
     * the content of the new blob.  To perform partial updates to a block blob’s contents using a
     * source URL, use {@link stageBlockFromURL} and {@link commitBlockList}.
     *
     * @param sourceURL - Specifies the URL of the blob. The value
     *                           may be a URL of up to 2 KB in length that specifies a blob.
     *                           The value should be URL-encoded as it would appear
     *                           in a request URI. The source blob must either be public
     *                           or must be authenticated via a shared access signature.
     *                           If the source blob is public, no authentication is required
     *                           to perform the operation. Here are some examples of source object URLs:
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param options - Optional parameters.
     */
    async syncUploadFromURL(sourceURL, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-syncUploadFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e, _f;
            return assertResponse(await this.blockBlobContext.putBlobFromUrl(0, sourceURL, Object.assign(Object.assign({}, options), { blobHttpHeaders: options.blobHTTPHeaders, leaseAccessConditions: options.conditions, modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }), sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                    sourceIfTags: (_f = options.sourceConditions) === null || _f === void 0 ? void 0 : _f.tagConditions,
                }, cpkInfo: options.customerProvidedKey, copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization), tier: toAccessTier(options.tier), blobTagsString: toBlobTagsString(options.tags), copySourceTags: options.copySourceTags, tracingOptions: updatedOptions.tracingOptions })));
        });
    }
    /**
     * Uploads the specified block to the block blob's "staging area" to be later
     * committed by a call to commitBlockList.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-block
     *
     * @param blockId - A 64-byte value that is base64-encoded
     * @param body - Data to upload to the staging area.
     * @param contentLength - Number of bytes to upload.
     * @param options - Options to the Block Blob Stage Block operation.
     * @returns Response data for the Block Blob Stage Block operation.
     */
    async stageBlock(blockId, body, contentLength, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-stageBlock", options, async (updatedOptions) => {
            return assertResponse(await this.blockBlobContext.stageBlock(blockId, contentLength, body, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Stage Block From URL operation creates a new block to be committed as part
     * of a blob where the contents are read from a URL.
     * This API is available starting in version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/put-block-from-url
     *
     * @param blockId - A 64-byte value that is base64-encoded
     * @param sourceURL - Specifies the URL of the blob. The value
     *                           may be a URL of up to 2 KB in length that specifies a blob.
     *                           The value should be URL-encoded as it would appear
     *                           in a request URI. The source blob must either be public
     *                           or must be authenticated via a shared access signature.
     *                           If the source blob is public, no authentication is required
     *                           to perform the operation. Here are some examples of source object URLs:
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob
     *                           - https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param offset - From which position of the blob to download, greater than or equal to 0
     * @param count - How much data to be downloaded, greater than 0. Will download to the end when undefined
     * @param options - Options to the Block Blob Stage Block From URL operation.
     * @returns Response data for the Block Blob Stage Block From URL operation.
     */
    async stageBlockFromURL(blockId, sourceURL, offset = 0, count, options = {}) {
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-stageBlockFromURL", options, async (updatedOptions) => {
            return assertResponse(await this.blockBlobContext.stageBlockFromURL(blockId, 0, sourceURL, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                sourceRange: offset === 0 && !count ? undefined : rangeToString({ offset, count }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Writes a blob by specifying the list of block IDs that make up the blob.
     * In order to be written as part of a blob, a block must have been successfully written
     * to the server in a prior {@link stageBlock} operation. You can call {@link commitBlockList} to
     * update a blob by uploading only those blocks that have changed, then committing the new and existing
     * blocks together. Any blocks not specified in the block list and permanently deleted.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-block-list
     *
     * @param blocks -  Array of 64-byte value that is base64-encoded
     * @param options - Options to the Block Blob Commit Block List operation.
     * @returns Response data for the Block Blob Commit Block List operation.
     */
    async commitBlockList(blocks, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("BlockBlobClient-commitBlockList", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.blockBlobContext.commitBlockList({ latest: blocks }, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns the list of blocks that have been uploaded as part of a block blob
     * using the specified block list filter.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-block-list
     *
     * @param listType - Specifies whether to return the list of committed blocks,
     *                                        the list of uncommitted blocks, or both lists together.
     * @param options - Options to the Block Blob Get Block List operation.
     * @returns Response data for the Block Blob Get Block List operation.
     */
    async getBlockList(listType, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-getBlockList", options, async (updatedOptions) => {
            var _a;
            const res = assertResponse(await this.blockBlobContext.getBlockList(listType, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            if (!res.committedBlocks) {
                res.committedBlocks = [];
            }
            if (!res.uncommittedBlocks) {
                res.uncommittedBlocks = [];
            }
            return res;
        });
    }
    // High level functions
    /**
     * Uploads a Buffer(Node.js)/Blob(browsers)/ArrayBuffer/ArrayBufferView object to a BlockBlob.
     *
     * When data length is no more than the specifiled {@link BlockBlobParallelUploadOptions.maxSingleShotSize} (default is
     * {@link BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}), this method will use 1 {@link upload} call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call {@link commitBlockList}
     * to commit the block list.
     *
     * A common {@link BlockBlobParallelUploadOptions.blobHTTPHeaders} option to set is
     * `blobContentType`, enabling the browser to provide
     * functionality based on file type.
     *
     * @param data - Buffer(Node.js), Blob, ArrayBuffer or ArrayBufferView
     * @param options -
     */
    async uploadData(data, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadData", options, async (updatedOptions) => {
            if (coreUtil.isNode) {
                let buffer;
                if (data instanceof Buffer) {
                    buffer = data;
                }
                else if (data instanceof ArrayBuffer) {
                    buffer = Buffer.from(data);
                }
                else {
                    data = data;
                    buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
                }
                return this.uploadSeekableInternal((offset, size) => buffer.slice(offset, offset + size), buffer.byteLength, updatedOptions);
            }
            else {
                const browserBlob = new Blob([data]);
                return this.uploadSeekableInternal((offset, size) => browserBlob.slice(offset, offset + size), browserBlob.size, updatedOptions);
            }
        });
    }
    /**
     * ONLY AVAILABLE IN BROWSERS.
     *
     * Uploads a browser Blob/File/ArrayBuffer/ArrayBufferView object to block blob.
     *
     * When buffer length lesser than or equal to 256MB, this method will use 1 upload call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call
     * {@link commitBlockList} to commit the block list.
     *
     * A common {@link BlockBlobParallelUploadOptions.blobHTTPHeaders} option to set is
     * `blobContentType`, enabling the browser to provide
     * functionality based on file type.
     *
     * @deprecated Use {@link uploadData} instead.
     *
     * @param browserData - Blob, File, ArrayBuffer or ArrayBufferView
     * @param options - Options to upload browser data.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadBrowserData(browserData, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadBrowserData", options, async (updatedOptions) => {
            const browserBlob = new Blob([browserData]);
            return this.uploadSeekableInternal((offset, size) => browserBlob.slice(offset, offset + size), browserBlob.size, updatedOptions);
        });
    }
    /**
     *
     * Uploads data to block blob. Requires a bodyFactory as the data source,
     * which need to return a {@link HttpRequestBody} object with the offset and size provided.
     *
     * When data length is no more than the specified {@link BlockBlobParallelUploadOptions.maxSingleShotSize} (default is
     * {@link BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}), this method will use 1 {@link upload} call to finish the upload.
     * Otherwise, this method will call {@link stageBlock} to upload blocks, and finally call {@link commitBlockList}
     * to commit the block list.
     *
     * @param bodyFactory -
     * @param size - size of the data to upload.
     * @param options - Options to Upload to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadSeekableInternal(bodyFactory, size, options = {}) {
        var _a, _b;
        let blockSize = (_a = options.blockSize) !== null && _a !== void 0 ? _a : 0;
        if (blockSize < 0 || blockSize > BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES) {
            throw new RangeError(`blockSize option must be >= 0 and <= ${BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES}`);
        }
        const maxSingleShotSize = (_b = options.maxSingleShotSize) !== null && _b !== void 0 ? _b : BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES;
        if (maxSingleShotSize < 0 || maxSingleShotSize > BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES) {
            throw new RangeError(`maxSingleShotSize option must be >= 0 and <= ${BLOCK_BLOB_MAX_UPLOAD_BLOB_BYTES}`);
        }
        if (blockSize === 0) {
            if (size > BLOCK_BLOB_MAX_STAGE_BLOCK_BYTES * BLOCK_BLOB_MAX_BLOCKS) {
                throw new RangeError(`${size} is too larger to upload to a block blob.`);
            }
            if (size > maxSingleShotSize) {
                blockSize = Math.ceil(size / BLOCK_BLOB_MAX_BLOCKS);
                if (blockSize < DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES) {
                    blockSize = DEFAULT_BLOB_DOWNLOAD_BLOCK_BYTES;
                }
            }
        }
        if (!options.blobHTTPHeaders) {
            options.blobHTTPHeaders = {};
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlockBlobClient-uploadSeekableInternal", options, async (updatedOptions) => {
            if (size <= maxSingleShotSize) {
                return assertResponse(await this.upload(bodyFactory(0, size), size, updatedOptions));
            }
            const numBlocks = Math.floor((size - 1) / blockSize) + 1;
            if (numBlocks > BLOCK_BLOB_MAX_BLOCKS) {
                throw new RangeError(`The buffer's size is too big or the BlockSize is too small;` +
                    `the number of blocks must be <= ${BLOCK_BLOB_MAX_BLOCKS}`);
            }
            const blockList = [];
            const blockIDPrefix = coreUtil.randomUUID();
            let transferProgress = 0;
            const batch = new Batch(options.concurrency);
            for (let i = 0; i < numBlocks; i++) {
                batch.addOperation(async () => {
                    const blockID = generateBlockID(blockIDPrefix, i);
                    const start = blockSize * i;
                    const end = i === numBlocks - 1 ? size : start + blockSize;
                    const contentLength = end - start;
                    blockList.push(blockID);
                    await this.stageBlock(blockID, bodyFactory(start, contentLength), contentLength, {
                        abortSignal: options.abortSignal,
                        conditions: options.conditions,
                        encryptionScope: options.encryptionScope,
                        tracingOptions: updatedOptions.tracingOptions,
                    });
                    // Update progress after block is successfully uploaded to server, in case of block trying
                    // TODO: Hook with convenience layer progress event in finer level
                    transferProgress += contentLength;
                    if (options.onProgress) {
                        options.onProgress({
                            loadedBytes: transferProgress,
                        });
                    }
                });
            }
            await batch.do();
            return this.commitBlockList(blockList, updatedOptions);
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Uploads a local file in blocks to a block blob.
     *
     * When file size lesser than or equal to 256MB, this method will use 1 upload call to finish the upload.
     * Otherwise, this method will call stageBlock to upload blocks, and finally call commitBlockList
     * to commit the block list.
     *
     * @param filePath - Full path of local file
     * @param options - Options to Upload to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadFile(filePath, options = {}) {
        return tracingClient.withSpan("BlockBlobClient-uploadFile", options, async (updatedOptions) => {
            const size = (await fsStat(filePath)).size;
            return this.uploadSeekableInternal((offset, count) => {
                return () => fsCreateReadStream(filePath, {
                    autoClose: true,
                    end: count ? offset + count - 1 : Infinity,
                    start: offset,
                });
            }, size, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions }));
        });
    }
    /**
     * ONLY AVAILABLE IN NODE.JS RUNTIME.
     *
     * Uploads a Node.js Readable stream into block blob.
     *
     * PERFORMANCE IMPROVEMENT TIPS:
     * * Input stream highWaterMark is better to set a same value with bufferSize
     *    parameter, which will avoid Buffer.concat() operations.
     *
     * @param stream - Node.js Readable stream
     * @param bufferSize - Size of every buffer allocated, also the block size in the uploaded block blob. Default value is 8MB
     * @param maxConcurrency -  Max concurrency indicates the max number of buffers that can be allocated,
     *                                 positive correlation with max uploading concurrency. Default value is 5
     * @param options - Options to Upload Stream to Block Blob operation.
     * @returns Response data for the Blob Upload operation.
     */
    async uploadStream(stream, bufferSize = DEFAULT_BLOCK_BUFFER_SIZE_BYTES, maxConcurrency = 5, options = {}) {
        if (!options.blobHTTPHeaders) {
            options.blobHTTPHeaders = {};
        }
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("BlockBlobClient-uploadStream", options, async (updatedOptions) => {
            let blockNum = 0;
            const blockIDPrefix = coreUtil.randomUUID();
            let transferProgress = 0;
            const blockList = [];
            const scheduler = new BufferScheduler(stream, bufferSize, maxConcurrency, async (body, length) => {
                const blockID = generateBlockID(blockIDPrefix, blockNum);
                blockList.push(blockID);
                blockNum++;
                await this.stageBlock(blockID, body, length, {
                    customerProvidedKey: options.customerProvidedKey,
                    conditions: options.conditions,
                    encryptionScope: options.encryptionScope,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                // Update progress after block is successfully uploaded to server, in case of block trying
                transferProgress += length;
                if (options.onProgress) {
                    options.onProgress({ loadedBytes: transferProgress });
                }
            }, 
            // concurrency should set a smaller value than maxConcurrency, which is helpful to
            // reduce the possibility when a outgoing handler waits for stream data, in
            // this situation, outgoing handlers are blocked.
            // Outgoing queue shouldn't be empty.
            Math.ceil((maxConcurrency / 4) * 3));
            await scheduler.do();
            return assertResponse(await this.commitBlockList(blockList, Object.assign(Object.assign({}, options), { tracingOptions: updatedOptions.tracingOptions })));
        });
    }
}
/**
 * PageBlobClient defines a set of operations applicable to page blobs.
 */
class PageBlobClient extends BlobClient {
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, blobNameOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        // In TypeScript we cannot simply pass all parameters to super() like below so have to duplicate the code instead.
        //   super(s, credentialOrPipelineOrContainerNameOrOptions, blobNameOrOptions, options);
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((coreUtil.isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            options = blobNameOrOptions;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string" &&
            blobNameOrOptions &&
            typeof blobNameOrOptions === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const blobName = blobNameOrOptions;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (coreUtil.isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)), encodeURIComponent(blobName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName and blobName parameters");
        }
        super(url, pipeline);
        this.pageBlobContext = this.storageClientContext.pageBlob;
    }
    /**
     * Creates a new PageBlobClient object identical to the source but with the
     * specified snapshot timestamp.
     * Provide "" will remove the snapshot and return a Client to the base blob.
     *
     * @param snapshot - The snapshot timestamp.
     * @returns A new PageBlobClient object identical to the source but with the specified snapshot timestamp.
     */
    withSnapshot(snapshot) {
        return new PageBlobClient(setURLParameter(this.url, URLConstants.Parameters.SNAPSHOT, snapshot.length === 0 ? undefined : snapshot), this.pipeline);
    }
    /**
     * Creates a page blob of the specified length. Call uploadPages to upload data
     * data to a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param size - size of the page blob.
     * @param options - Options to the Page Blob Create operation.
     * @returns Response data for the Page Blob Create operation.
     */
    async create(size, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-create", options, async (updatedOptions) => {
            var _a, _b, _c;
            return assertResponse(await this.pageBlobContext.create(0, size, {
                abortSignal: options.abortSignal,
                blobHttpHeaders: options.blobHTTPHeaders,
                blobSequenceNumber: options.blobSequenceNumber,
                leaseAccessConditions: options.conditions,
                metadata: options.metadata,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                immutabilityPolicyExpiry: (_b = options.immutabilityPolicy) === null || _b === void 0 ? void 0 : _b.expiriesOn,
                immutabilityPolicyMode: (_c = options.immutabilityPolicy) === null || _c === void 0 ? void 0 : _c.policyMode,
                legalHold: options.legalHold,
                tier: toAccessTier(options.tier),
                blobTagsString: toBlobTagsString(options.tags),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Creates a page blob of the specified length. Call uploadPages to upload data
     * data to a page blob. If the blob with the same name already exists, the content
     * of the existing blob will remain unchanged.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param size - size of the page blob.
     * @param options -
     */
    async createIfNotExists(size, options = {}) {
        return tracingClient.withSpan("PageBlobClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const conditions = { ifNoneMatch: ETagAny };
                const res = assertResponse(await this.create(size, Object.assign(Object.assign({}, options), { conditions, tracingOptions: updatedOptions.tracingOptions })));
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "BlobAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Writes 1 or more pages to the page blob. The start and end offsets must be a multiple of 512.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-page
     *
     * @param body - Data to upload
     * @param offset - Offset of destination page blob
     * @param count - Content length of the body, also number of bytes to be uploaded
     * @param options - Options to the Page Blob Upload Pages operation.
     * @returns Response data for the Page Blob Upload Pages operation.
     */
    async uploadPages(body, offset, count, options = {}) {
        options.conditions = options.conditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-uploadPages", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.uploadPages(count, body, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                requestOptions: {
                    onUploadProgress: options.onProgress,
                },
                range: rangeToString({ offset, count }),
                sequenceNumberAccessConditions: options.conditions,
                transactionalContentMD5: options.transactionalContentMD5,
                transactionalContentCrc64: options.transactionalContentCrc64,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Upload Pages operation writes a range of pages to a page blob where the
     * contents are read from a URL.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/put-page-from-url
     *
     * @param sourceURL - Specify a URL to the copy source, Shared Access Signature(SAS) maybe needed for authentication
     * @param sourceOffset - The source offset to copy from. Pass 0 to copy from the beginning of source page blob
     * @param destOffset - Offset of destination page blob
     * @param count - Number of bytes to be uploaded from source page blob
     * @param options -
     */
    async uploadPagesFromURL(sourceURL, sourceOffset, destOffset, count, options = {}) {
        options.conditions = options.conditions || {};
        options.sourceConditions = options.sourceConditions || {};
        ensureCpkIfSpecified(options.customerProvidedKey, this.isHttps);
        return tracingClient.withSpan("PageBlobClient-uploadPagesFromURL", options, async (updatedOptions) => {
            var _a, _b, _c, _d, _e;
            return assertResponse(await this.pageBlobContext.uploadPagesFromURL(sourceURL, rangeToString({ offset: sourceOffset, count }), 0, rangeToString({ offset: destOffset, count }), {
                abortSignal: options.abortSignal,
                sourceContentMD5: options.sourceContentMD5,
                sourceContentCrc64: options.sourceContentCrc64,
                leaseAccessConditions: options.conditions,
                sequenceNumberAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                sourceModifiedAccessConditions: {
                    sourceIfMatch: (_b = options.sourceConditions) === null || _b === void 0 ? void 0 : _b.ifMatch,
                    sourceIfModifiedSince: (_c = options.sourceConditions) === null || _c === void 0 ? void 0 : _c.ifModifiedSince,
                    sourceIfNoneMatch: (_d = options.sourceConditions) === null || _d === void 0 ? void 0 : _d.ifNoneMatch,
                    sourceIfUnmodifiedSince: (_e = options.sourceConditions) === null || _e === void 0 ? void 0 : _e.ifUnmodifiedSince,
                },
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                copySourceAuthorization: httpAuthorizationToString(options.sourceAuthorization),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Frees the specified pages from the page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/put-page
     *
     * @param offset - Starting byte position of the pages to clear.
     * @param count - Number of bytes to clear.
     * @param options - Options to the Page Blob Clear Pages operation.
     * @returns Response data for the Page Blob Clear Pages operation.
     */
    async clearPages(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-clearPages", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.clearPages(0, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                sequenceNumberAccessConditions: options.conditions,
                cpkInfo: options.customerProvidedKey,
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns the list of valid page ranges for a page blob or snapshot of a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns Response data for the Page Blob Get Ranges operation.
     */
    async getPageRanges(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-getPageRanges", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.pageBlobContext.getPageRanges({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(response);
        });
    }
    /**
     * getPageRangesSegment returns a single segment of page ranges starting from the
     * specified Marker. Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call getPageRangesSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to PageBlob Get Page Ranges Segment operation.
     */
    async listPageRangesSegment(offset = 0, count, marker, options = {}) {
        return tracingClient.withSpan("PageBlobClient-getPageRangesSegment", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.getPageRanges({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                range: rangeToString({ offset, count }),
                marker: marker,
                maxPageSize: options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link PageBlobGetPageRangesResponseModel}
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param marker - A string value that identifies the portion of
     *                          the get of page ranges to be returned with the next getting operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          getting operation did not return all page ranges remaining within the current page.
     *                          The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of get
     *                          items. The marker value is opaque to the client.
     * @param options - Options to List Page Ranges operation.
     */
    listPageRangeItemSegments() {
        return tslib.__asyncGenerator(this, arguments, function* listPageRangeItemSegments_1(offset = 0, count, marker, options = {}) {
            let getPageRangeItemSegmentsResponse;
            if (!!marker || marker === undefined) {
                do {
                    getPageRangeItemSegmentsResponse = yield tslib.__await(this.listPageRangesSegment(offset, count, marker, options));
                    marker = getPageRangeItemSegmentsResponse.continuationToken;
                    yield yield tslib.__await(yield tslib.__await(getPageRangeItemSegmentsResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link PageRangeInfo} objects
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to List Page Ranges operation.
     */
    listPageRangeItems() {
        return tslib.__asyncGenerator(this, arguments, function* listPageRangeItems_1(offset = 0, count, options = {}) {
            var _a, e_1, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.listPageRangeItemSegments(offset, count, marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const getPageRangesSegment = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(ExtractPageRangeInfoItems(getPageRangesSegment))));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list of page ranges for a page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     *  .byPage() returns an async iterable iterator to list of page ranges for a page blob.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the pageBlobClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>").getPageBlobClient("<your-blob-name>");`
     * let i = 1;
     * for await (const pageRange of pageBlobClient.listPageRanges()) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = pageBlobClient.listPageRanges();
     * let pageRangeItem = await iter.next();
     * while (!pageRangeItem.done) {
     *   console.log(`Page range ${i++}: ${pageRangeItem.value.start} - ${pageRangeItem.value.end}, IsClear: ${pageRangeItem.value.isClear}`);
     *   pageRangeItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of pageBlobClient.listPageRanges().byPage({ maxPageSize: 20 })) {
     *   for (const pageRange of response) {
     *     console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = pageBlobClient.listPageRanges().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 page ranges
     * for (const pageRange of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = pageBlobClient.listPageRanges().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 page ranges
     * for (const blob of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns An asyncIterableIterator that supports paging.
     */
    listPageRanges(offset = 0, count, options = {}) {
        options.conditions = options.conditions || {};
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listPageRangeItems(offset, count, options);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listPageRangeItemSegments(offset, count, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, options));
            },
        };
    }
    /**
     * Gets the collection of page ranges that differ between a specified snapshot and this page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page blob
     * @param count - Number of bytes to get ranges diff.
     * @param prevSnapshot - Timestamp of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     * @returns Response data for the Page Blob Get Page Range Diff operation.
     */
    async getPageRangesDiff(offset, count, prevSnapshot, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-getPageRangesDiff", options, async (updatedOptions) => {
            var _a;
            const result = assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevsnapshot: prevSnapshot,
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(result);
        });
    }
    /**
     * getPageRangesDiffSegment returns a single segment of page ranges starting from the
     * specified Marker for difference between previous snapshot and the target page blob.
     * Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call getPageRangesDiffSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param marker - A string value that identifies the portion of the get to be returned with the next get operation.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    async listPageRangesDiffSegment(offset, count, prevSnapshotOrUrl, marker, options = {}) {
        return tracingClient.withSpan("PageBlobClient-getPageRangesDiffSegment", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options === null || options === void 0 ? void 0 : options.abortSignal,
                leaseAccessConditions: options === null || options === void 0 ? void 0 : options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.conditions), { ifTags: (_a = options === null || options === void 0 ? void 0 : options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevsnapshot: prevSnapshotOrUrl,
                range: rangeToString({
                    offset: offset,
                    count: count,
                }),
                marker: marker,
                maxPageSize: options === null || options === void 0 ? void 0 : options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link PageBlobGetPageRangesDiffResponseModel}
     *
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param marker - A string value that identifies the portion of
     *                          the get of page ranges to be returned with the next getting operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          getting operation did not return all page ranges remaining within the current page.
     *                          The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of get
     *                          items. The marker value is opaque to the client.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    listPageRangeDiffItemSegments(offset, count, prevSnapshotOrUrl, marker, options) {
        return tslib.__asyncGenerator(this, arguments, function* listPageRangeDiffItemSegments_1() {
            let getPageRangeItemSegmentsResponse;
            if (!!marker || marker === undefined) {
                do {
                    getPageRangeItemSegmentsResponse = yield tslib.__await(this.listPageRangesDiffSegment(offset, count, prevSnapshotOrUrl, marker, options));
                    marker = getPageRangeItemSegmentsResponse.continuationToken;
                    yield yield tslib.__await(yield tslib.__await(getPageRangeItemSegmentsResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link PageRangeInfo} objects
     *
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshotOrUrl - Timestamp of snapshot to retrieve the difference or URL of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     */
    listPageRangeDiffItems(offset, count, prevSnapshotOrUrl, options) {
        return tslib.__asyncGenerator(this, arguments, function* listPageRangeDiffItems_1() {
            var _a, e_2, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.listPageRangeDiffItemSegments(offset, count, prevSnapshotOrUrl, marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const getPageRangesSegment = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(ExtractPageRangeInfoItems(getPageRangesSegment))));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list of page ranges that differ between a specified snapshot and this page blob.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     *  .byPage() returns an async iterable iterator to list of page ranges that differ between a specified snapshot and this page blob.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the pageBlobClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>").getPageBlobClient("<your-blob-name>");`
     * let i = 1;
     * for await (const pageRange of pageBlobClient.listPageRangesDiff()) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = pageBlobClient.listPageRangesDiff();
     * let pageRangeItem = await iter.next();
     * while (!pageRangeItem.done) {
     *   console.log(`Page range ${i++}: ${pageRangeItem.value.start} - ${pageRangeItem.value.end}, IsClear: ${pageRangeItem.value.isClear}`);
     *   pageRangeItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of pageBlobClient.listPageRangesDiff().byPage({ maxPageSize: 20 })) {
     *   for (const pageRange of response) {
     *     console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = pageBlobClient.listPageRangesDiff().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 page ranges
     * for (const pageRange of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = pageBlobClient.listPageRangesDiff().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 page ranges
     * for (const blob of response) {
     *   console.log(`Page range ${i++}: ${pageRange.start} - ${pageRange.end}`);
     * }
     * ```
     * @param offset - Starting byte position of the page ranges.
     * @param count - Number of bytes to get.
     * @param prevSnapshot - Timestamp of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Ranges operation.
     * @returns An asyncIterableIterator that supports paging.
     */
    listPageRangesDiff(offset, count, prevSnapshot, options = {}) {
        options.conditions = options.conditions || {};
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listPageRangeDiffItems(offset, count, prevSnapshot, Object.assign({}, options));
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listPageRangeDiffItemSegments(offset, count, prevSnapshot, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, options));
            },
        };
    }
    /**
     * Gets the collection of page ranges that differ between a specified snapshot and this page blob for managed disks.
     * @see https://docs.microsoft.com/rest/api/storageservices/get-page-ranges
     *
     * @param offset - Starting byte position of the page blob
     * @param count - Number of bytes to get ranges diff.
     * @param prevSnapshotUrl - URL of snapshot to retrieve the difference.
     * @param options - Options to the Page Blob Get Page Ranges Diff operation.
     * @returns Response data for the Page Blob Get Page Range Diff operation.
     */
    async getPageRangesDiffForManagedDisks(offset, count, prevSnapshotUrl, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-GetPageRangesDiffForManagedDisks", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.pageBlobContext.getPageRangesDiff({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                prevSnapshotUrl,
                range: rangeToString({ offset, count }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return rangeResponseFromModel(response);
        });
    }
    /**
     * Resizes the page blob to the specified size (which must be a multiple of 512).
     * @see https://docs.microsoft.com/rest/api/storageservices/set-blob-properties
     *
     * @param size - Target size
     * @param options - Options to the Page Blob Resize operation.
     * @returns Response data for the Page Blob Resize operation.
     */
    async resize(size, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-resize", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.resize(size, {
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                encryptionScope: options.encryptionScope,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets a page blob's sequence number.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-properties
     *
     * @param sequenceNumberAction - Indicates how the service should modify the blob's sequence number.
     * @param sequenceNumber - Required if sequenceNumberAction is max or update
     * @param options - Options to the Page Blob Update Sequence Number operation.
     * @returns Response data for the Page Blob Update Sequence Number operation.
     */
    async updateSequenceNumber(sequenceNumberAction, sequenceNumber, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("PageBlobClient-updateSequenceNumber", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.updateSequenceNumber(sequenceNumberAction, {
                abortSignal: options.abortSignal,
                blobSequenceNumber: sequenceNumber,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Begins an operation to start an incremental copy from one page blob's snapshot to this page blob.
     * The snapshot is copied such that only the differential changes between the previously
     * copied snapshot are transferred to the destination.
     * The copied snapshots are complete copies of the original snapshot and can be read or copied from as usual.
     * @see https://docs.microsoft.com/rest/api/storageservices/incremental-copy-blob
     * @see https://docs.microsoft.com/en-us/azure/virtual-machines/windows/incremental-snapshots
     *
     * @param copySource - Specifies the name of the source page blob snapshot. For example,
     *                            https://myaccount.blob.core.windows.net/mycontainer/myblob?snapshot=<DateTime>
     * @param options - Options to the Page Blob Copy Incremental operation.
     * @returns Response data for the Page Blob Copy Incremental operation.
     */
    async startCopyIncremental(copySource, options = {}) {
        return tracingClient.withSpan("PageBlobClient-startCopyIncremental", options, async (updatedOptions) => {
            var _a;
            return assertResponse(await this.pageBlobContext.copyIncremental(copySource, {
                abortSignal: options.abortSignal,
                modifiedAccessConditions: Object.assign(Object.assign({}, options.conditions), { ifTags: (_a = options.conditions) === null || _a === void 0 ? void 0 : _a.tagConditions }),
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
async function getBodyAsText(batchResponse) {
    let buffer = Buffer.alloc(BATCH_MAX_PAYLOAD_IN_BYTES);
    const responseLength = await streamToBuffer2(batchResponse.readableStreamBody, buffer);
    // Slice the buffer to trim the empty ending.
    buffer = buffer.slice(0, responseLength);
    return buffer.toString();
}
function utf8ByteLength(str) {
    return Buffer.byteLength(str);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const HTTP_HEADER_DELIMITER = ": ";
const SPACE_DELIMITER = " ";
const NOT_FOUND = -1;
/**
 * Util class for parsing batch response.
 */
class BatchResponseParser {
    constructor(batchResponse, subRequests) {
        if (!batchResponse || !batchResponse.contentType) {
            // In special case(reported), server may return invalid content-type which could not be parsed.
            throw new RangeError("batchResponse is malformed or doesn't contain valid content-type.");
        }
        if (!subRequests || subRequests.size === 0) {
            // This should be prevent during coding.
            throw new RangeError("Invalid state: subRequests is not provided or size is 0.");
        }
        this.batchResponse = batchResponse;
        this.subRequests = subRequests;
        this.responseBatchBoundary = this.batchResponse.contentType.split("=")[1];
        this.perResponsePrefix = `--${this.responseBatchBoundary}${HTTP_LINE_ENDING}`;
        this.batchResponseEnding = `--${this.responseBatchBoundary}--`;
    }
    // For example of response, please refer to https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch#response
    async parseBatchResponse() {
        // When logic reach here, suppose batch request has already succeeded with 202, so we can further parse
        // sub request's response.
        if (this.batchResponse._response.status !== HTTPURLConnection.HTTP_ACCEPTED) {
            throw new Error(`Invalid state: batch request failed with status: '${this.batchResponse._response.status}'.`);
        }
        const responseBodyAsText = await getBodyAsText(this.batchResponse);
        const subResponses = responseBodyAsText
            .split(this.batchResponseEnding)[0] // string after ending is useless
            .split(this.perResponsePrefix)
            .slice(1); // string before first response boundary is useless
        const subResponseCount = subResponses.length;
        // Defensive coding in case of potential error parsing.
        // Note: subResponseCount == 1 is special case where sub request is invalid.
        // We try to prevent such cases through early validation, e.g. validate sub request count >= 1.
        // While in unexpected sub request invalid case, we allow sub response to be parsed and return to user.
        if (subResponseCount !== this.subRequests.size && subResponseCount !== 1) {
            throw new Error("Invalid state: sub responses' count is not equal to sub requests' count.");
        }
        const deserializedSubResponses = new Array(subResponseCount);
        let subResponsesSucceededCount = 0;
        let subResponsesFailedCount = 0;
        // Parse sub subResponses.
        for (let index = 0; index < subResponseCount; index++) {
            const subResponse = subResponses[index];
            const deserializedSubResponse = {};
            deserializedSubResponse.headers = coreHttpCompat.toHttpHeadersLike(coreRestPipeline.createHttpHeaders());
            const responseLines = subResponse.split(`${HTTP_LINE_ENDING}`);
            let subRespHeaderStartFound = false;
            let subRespHeaderEndFound = false;
            let subRespFailed = false;
            let contentId = NOT_FOUND;
            for (const responseLine of responseLines) {
                if (!subRespHeaderStartFound) {
                    // Convention line to indicate content ID
                    if (responseLine.startsWith(HeaderConstants.CONTENT_ID)) {
                        contentId = parseInt(responseLine.split(HTTP_HEADER_DELIMITER)[1]);
                    }
                    // Http version line with status code indicates the start of sub request's response.
                    // Example: HTTP/1.1 202 Accepted
                    if (responseLine.startsWith(HTTP_VERSION_1_1)) {
                        subRespHeaderStartFound = true;
                        const tokens = responseLine.split(SPACE_DELIMITER);
                        deserializedSubResponse.status = parseInt(tokens[1]);
                        deserializedSubResponse.statusMessage = tokens.slice(2).join(SPACE_DELIMITER);
                    }
                    continue; // Skip convention headers not specifically for sub request i.e. Content-Type: application/http and Content-ID: *
                }
                if (responseLine.trim() === "") {
                    // Sub response's header start line already found, and the first empty line indicates header end line found.
                    if (!subRespHeaderEndFound) {
                        subRespHeaderEndFound = true;
                    }
                    continue; // Skip empty line
                }
                // Note: when code reach here, it indicates subRespHeaderStartFound == true
                if (!subRespHeaderEndFound) {
                    if (responseLine.indexOf(HTTP_HEADER_DELIMITER) === -1) {
                        // Defensive coding to prevent from missing valuable lines.
                        throw new Error(`Invalid state: find non-empty line '${responseLine}' without HTTP header delimiter '${HTTP_HEADER_DELIMITER}'.`);
                    }
                    // Parse headers of sub response.
                    const tokens = responseLine.split(HTTP_HEADER_DELIMITER);
                    deserializedSubResponse.headers.set(tokens[0], tokens[1]);
                    if (tokens[0] === HeaderConstants.X_MS_ERROR_CODE) {
                        deserializedSubResponse.errorCode = tokens[1];
                        subRespFailed = true;
                    }
                }
                else {
                    // Assemble body of sub response.
                    if (!deserializedSubResponse.bodyAsText) {
                        deserializedSubResponse.bodyAsText = "";
                    }
                    deserializedSubResponse.bodyAsText += responseLine;
                }
            } // Inner for end
            // The response will contain the Content-ID header for each corresponding subrequest response to use for tracking.
            // The Content-IDs are set to a valid index in the subrequests we sent. In the status code 202 path, we could expect it
            // to be 1-1 mapping from the [0, subRequests.size) to the Content-IDs returned. If not, we simply don't return that
            // unexpected subResponse in the parsed reponse and we can always look it up in the raw response for debugging purpose.
            if (contentId !== NOT_FOUND &&
                Number.isInteger(contentId) &&
                contentId >= 0 &&
                contentId < this.subRequests.size &&
                deserializedSubResponses[contentId] === undefined) {
                deserializedSubResponse._request = this.subRequests.get(contentId);
                deserializedSubResponses[contentId] = deserializedSubResponse;
            }
            else {
                logger.error(`subResponses[${index}] is dropped as the Content-ID is not found or invalid, Content-ID: ${contentId}`);
            }
            if (subRespFailed) {
                subResponsesFailedCount++;
            }
            else {
                subResponsesSucceededCount++;
            }
        }
        return {
            subResponses: deserializedSubResponses,
            subResponsesSucceededCount: subResponsesSucceededCount,
            subResponsesFailedCount: subResponsesFailedCount,
        };
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var MutexLockStatus;
(function (MutexLockStatus) {
    MutexLockStatus[MutexLockStatus["LOCKED"] = 0] = "LOCKED";
    MutexLockStatus[MutexLockStatus["UNLOCKED"] = 1] = "UNLOCKED";
})(MutexLockStatus || (MutexLockStatus = {}));
/**
 * An async mutex lock.
 */
class Mutex {
    /**
     * Lock for a specific key. If the lock has been acquired by another customer, then
     * will wait until getting the lock.
     *
     * @param key - lock key
     */
    static async lock(key) {
        return new Promise((resolve) => {
            if (this.keys[key] === undefined || this.keys[key] === MutexLockStatus.UNLOCKED) {
                this.keys[key] = MutexLockStatus.LOCKED;
                resolve();
            }
            else {
                this.onUnlockEvent(key, () => {
                    this.keys[key] = MutexLockStatus.LOCKED;
                    resolve();
                });
            }
        });
    }
    /**
     * Unlock a key.
     *
     * @param key -
     */
    static async unlock(key) {
        return new Promise((resolve) => {
            if (this.keys[key] === MutexLockStatus.LOCKED) {
                this.emitUnlockEvent(key);
            }
            delete this.keys[key];
            resolve();
        });
    }
    static onUnlockEvent(key, handler) {
        if (this.listeners[key] === undefined) {
            this.listeners[key] = [handler];
        }
        else {
            this.listeners[key].push(handler);
        }
    }
    static emitUnlockEvent(key) {
        if (this.listeners[key] !== undefined && this.listeners[key].length > 0) {
            const handler = this.listeners[key].shift();
            setImmediate(() => {
                handler.call(this);
            });
        }
    }
}
Mutex.keys = {};
Mutex.listeners = {};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A BlobBatch represents an aggregated set of operations on blobs.
 * Currently, only `delete` and `setAccessTier` are supported.
 */
class BlobBatch {
    constructor() {
        this.batch = "batch";
        this.batchRequest = new InnerBatchRequest();
    }
    /**
     * Get the value of Content-Type for a batch request.
     * The value must be multipart/mixed with a batch boundary.
     * Example: multipart/mixed; boundary=batch_a81786c8-e301-4e42-a729-a32ca24ae252
     */
    getMultiPartContentType() {
        return this.batchRequest.getMultipartContentType();
    }
    /**
     * Get assembled HTTP request body for sub requests.
     */
    getHttpRequestBody() {
        return this.batchRequest.getHttpRequestBody();
    }
    /**
     * Get sub requests that are added into the batch request.
     */
    getSubRequests() {
        return this.batchRequest.getSubRequests();
    }
    async addSubRequestInternal(subRequest, assembleSubRequestFunc) {
        await Mutex.lock(this.batch);
        try {
            this.batchRequest.preAddSubRequest(subRequest);
            await assembleSubRequestFunc();
            this.batchRequest.postAddSubRequest(subRequest);
        }
        finally {
            await Mutex.unlock(this.batch);
        }
    }
    setBatchType(batchType) {
        if (!this.batchType) {
            this.batchType = batchType;
        }
        if (this.batchType !== batchType) {
            throw new RangeError(`BlobBatch only supports one operation type per batch and it already is being used for ${this.batchType} operations.`);
        }
    }
    async deleteBlob(urlOrBlobClient, credentialOrOptions, options) {
        let url;
        let credential;
        if (typeof urlOrBlobClient === "string" &&
            ((coreUtil.isNode && credentialOrOptions instanceof StorageSharedKeyCredential) ||
                credentialOrOptions instanceof AnonymousCredential ||
                coreAuth.isTokenCredential(credentialOrOptions))) {
            // First overload
            url = urlOrBlobClient;
            credential = credentialOrOptions;
        }
        else if (urlOrBlobClient instanceof BlobClient) {
            // Second overload
            url = urlOrBlobClient.url;
            credential = urlOrBlobClient.credential;
            options = credentialOrOptions;
        }
        else {
            throw new RangeError("Invalid arguments. Either url and credential, or BlobClient need be provided.");
        }
        if (!options) {
            options = {};
        }
        return tracingClient.withSpan("BatchDeleteRequest-addSubRequest", options, async (updatedOptions) => {
            this.setBatchType("delete");
            await this.addSubRequestInternal({
                url: url,
                credential: credential,
            }, async () => {
                await new BlobClient(url, this.batchRequest.createPipeline(credential)).delete(updatedOptions);
            });
        });
    }
    async setBlobAccessTier(urlOrBlobClient, credentialOrTier, tierOrOptions, options) {
        let url;
        let credential;
        let tier;
        if (typeof urlOrBlobClient === "string" &&
            ((coreUtil.isNode && credentialOrTier instanceof StorageSharedKeyCredential) ||
                credentialOrTier instanceof AnonymousCredential ||
                coreAuth.isTokenCredential(credentialOrTier))) {
            // First overload
            url = urlOrBlobClient;
            credential = credentialOrTier;
            tier = tierOrOptions;
        }
        else if (urlOrBlobClient instanceof BlobClient) {
            // Second overload
            url = urlOrBlobClient.url;
            credential = urlOrBlobClient.credential;
            tier = credentialOrTier;
            options = tierOrOptions;
        }
        else {
            throw new RangeError("Invalid arguments. Either url and credential, or BlobClient need be provided.");
        }
        if (!options) {
            options = {};
        }
        return tracingClient.withSpan("BatchSetTierRequest-addSubRequest", options, async (updatedOptions) => {
            this.setBatchType("setAccessTier");
            await this.addSubRequestInternal({
                url: url,
                credential: credential,
            }, async () => {
                await new BlobClient(url, this.batchRequest.createPipeline(credential)).setAccessTier(tier, updatedOptions);
            });
        });
    }
}
/**
 * Inner batch request class which is responsible for assembling and serializing sub requests.
 * See https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch#request-body for how requests are assembled.
 */
class InnerBatchRequest {
    constructor() {
        this.operationCount = 0;
        this.body = "";
        const tempGuid = coreUtil.randomUUID();
        // batch_{batchid}
        this.boundary = `batch_${tempGuid}`;
        // --batch_{batchid}
        // Content-Type: application/http
        // Content-Transfer-Encoding: binary
        this.subRequestPrefix = `--${this.boundary}${HTTP_LINE_ENDING}${HeaderConstants.CONTENT_TYPE}: application/http${HTTP_LINE_ENDING}${HeaderConstants.CONTENT_TRANSFER_ENCODING}: binary`;
        // multipart/mixed; boundary=batch_{batchid}
        this.multipartContentType = `multipart/mixed; boundary=${this.boundary}`;
        // --batch_{batchid}--
        this.batchRequestEnding = `--${this.boundary}--`;
        this.subRequests = new Map();
    }
    /**
     * Create pipeline to assemble sub requests. The idea here is to use existing
     * credential and serialization/deserialization components, with additional policies to
     * filter unnecessary headers, assemble sub requests into request's body
     * and intercept request from going to wire.
     * @param credential -  Such as AnonymousCredential, StorageSharedKeyCredential or any credential from the `@azure/identity` package to authenticate requests to the service. You can also provide an object that implements the TokenCredential interface. If not specified, AnonymousCredential is used.
     */
    createPipeline(credential) {
        const corePipeline = coreRestPipeline.createEmptyPipeline();
        corePipeline.addPolicy(coreClient.serializationPolicy({
            stringifyXML: coreXml.stringifyXML,
            serializerOptions: {
                xml: {
                    xmlCharKey: "#",
                },
            },
        }), { phase: "Serialize" });
        // Use batch header filter policy to exclude unnecessary headers
        corePipeline.addPolicy(batchHeaderFilterPolicy());
        // Use batch assemble policy to assemble request and intercept request from going to wire
        corePipeline.addPolicy(batchRequestAssemblePolicy(this), { afterPhase: "Sign" });
        if (coreAuth.isTokenCredential(credential)) {
            corePipeline.addPolicy(coreRestPipeline.bearerTokenAuthenticationPolicy({
                credential,
                scopes: StorageOAuthScopes,
                challengeCallbacks: { authorizeRequestOnChallenge: coreClient.authorizeRequestOnTenantChallenge },
            }), { phase: "Sign" });
        }
        else if (credential instanceof StorageSharedKeyCredential) {
            corePipeline.addPolicy(storageSharedKeyCredentialPolicy({
                accountName: credential.accountName,
                accountKey: credential.accountKey,
            }), { phase: "Sign" });
        }
        const pipeline = new Pipeline([]);
        // attach the v2 pipeline to this one
        pipeline._credential = credential;
        pipeline._corePipeline = corePipeline;
        return pipeline;
    }
    appendSubRequestToBody(request) {
        // Start to assemble sub request
        this.body += [
            this.subRequestPrefix, // sub request constant prefix
            `${HeaderConstants.CONTENT_ID}: ${this.operationCount}`, // sub request's content ID
            "", // empty line after sub request's content ID
            `${request.method.toString()} ${getURLPathAndQuery(request.url)} ${HTTP_VERSION_1_1}${HTTP_LINE_ENDING}`, // sub request start line with method
        ].join(HTTP_LINE_ENDING);
        for (const [name, value] of request.headers) {
            this.body += `${name}: ${value}${HTTP_LINE_ENDING}`;
        }
        this.body += HTTP_LINE_ENDING; // sub request's headers need be ending with an empty line
        // No body to assemble for current batch request support
        // End to assemble sub request
    }
    preAddSubRequest(subRequest) {
        if (this.operationCount >= BATCH_MAX_REQUEST) {
            throw new RangeError(`Cannot exceed ${BATCH_MAX_REQUEST} sub requests in a single batch`);
        }
        // Fast fail if url for sub request is invalid
        const path = getURLPath(subRequest.url);
        if (!path || path === "") {
            throw new RangeError(`Invalid url for sub request: '${subRequest.url}'`);
        }
    }
    postAddSubRequest(subRequest) {
        this.subRequests.set(this.operationCount, subRequest);
        this.operationCount++;
    }
    // Return the http request body with assembling the ending line to the sub request body.
    getHttpRequestBody() {
        return `${this.body}${this.batchRequestEnding}${HTTP_LINE_ENDING}`;
    }
    getMultipartContentType() {
        return this.multipartContentType;
    }
    getSubRequests() {
        return this.subRequests;
    }
}
function batchRequestAssemblePolicy(batchRequest) {
    return {
        name: "batchRequestAssemblePolicy",
        async sendRequest(request) {
            batchRequest.appendSubRequestToBody(request);
            return {
                request,
                status: 200,
                headers: coreRestPipeline.createHttpHeaders(),
            };
        },
    };
}
function batchHeaderFilterPolicy() {
    return {
        name: "batchHeaderFilterPolicy",
        async sendRequest(request, next) {
            let xMsHeaderName = "";
            for (const [name] of request.headers) {
                if (iEqual(name, HeaderConstants.X_MS_VERSION)) {
                    xMsHeaderName = name;
                }
            }
            if (xMsHeaderName !== "") {
                request.headers.delete(xMsHeaderName); // The subrequests should not have the x-ms-version header.
            }
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A BlobBatchClient allows you to make batched requests to the Azure Storage Blob service.
 *
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
 */
class BlobBatchClient {
    constructor(url, credentialOrPipeline, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        let pipeline;
        if (isPipelineLike(credentialOrPipeline)) {
            pipeline = credentialOrPipeline;
        }
        else if (!credentialOrPipeline) {
            // no credential provided
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else {
            pipeline = newPipeline(credentialOrPipeline, options);
        }
        const storageClientContext = new StorageContextClient(url, getCoreClientOptions(pipeline));
        const path = getURLPath(url);
        if (path && path !== "/") {
            // Container scoped.
            this.serviceOrContainerContext = storageClientContext.container;
        }
        else {
            this.serviceOrContainerContext = storageClientContext.service;
        }
    }
    /**
     * Creates a {@link BlobBatch}.
     * A BlobBatch represents an aggregated set of operations on blobs.
     */
    createBatch() {
        return new BlobBatch();
    }
    async deleteBlobs(urlsOrBlobClients, credentialOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        const batch = new BlobBatch();
        for (const urlOrBlobClient of urlsOrBlobClients) {
            if (typeof urlOrBlobClient === "string") {
                await batch.deleteBlob(urlOrBlobClient, credentialOrOptions, options);
            }
            else {
                await batch.deleteBlob(urlOrBlobClient, credentialOrOptions);
            }
        }
        return this.submitBatch(batch);
    }
    async setBlobsAccessTier(urlsOrBlobClients, credentialOrTier, tierOrOptions, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        const batch = new BlobBatch();
        for (const urlOrBlobClient of urlsOrBlobClients) {
            if (typeof urlOrBlobClient === "string") {
                await batch.setBlobAccessTier(urlOrBlobClient, credentialOrTier, tierOrOptions, options);
            }
            else {
                await batch.setBlobAccessTier(urlOrBlobClient, credentialOrTier, tierOrOptions);
            }
        }
        return this.submitBatch(batch);
    }
    /**
     * Submit batch request which consists of multiple subrequests.
     *
     * Get `blobBatchClient` and other details before running the snippets.
     * `blobServiceClient.getBlobBatchClient()` gives the `blobBatchClient`
     *
     * Example usage:
     *
     * ```js
     * let batchRequest = new BlobBatch();
     * await batchRequest.deleteBlob(urlInString0, credential0);
     * await batchRequest.deleteBlob(urlInString1, credential1, {
     *  deleteSnapshots: "include"
     * });
     * const batchResp = await blobBatchClient.submitBatch(batchRequest);
     * console.log(batchResp.subResponsesSucceededCount);
     * ```
     *
     * Example using a lease:
     *
     * ```js
     * let batchRequest = new BlobBatch();
     * await batchRequest.setBlobAccessTier(blockBlobClient0, "Cool");
     * await batchRequest.setBlobAccessTier(blockBlobClient1, "Cool", {
     *  conditions: { leaseId: leaseId }
     * });
     * const batchResp = await blobBatchClient.submitBatch(batchRequest);
     * console.log(batchResp.subResponsesSucceededCount);
     * ```
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
     *
     * @param batchRequest - A set of Delete or SetTier operations.
     * @param options -
     */
    async submitBatch(batchRequest, options = {}) {
        if (!batchRequest || batchRequest.getSubRequests().size === 0) {
            throw new RangeError("Batch request should contain one or more sub requests.");
        }
        return tracingClient.withSpan("BlobBatchClient-submitBatch", options, async (updatedOptions) => {
            const batchRequestBody = batchRequest.getHttpRequestBody();
            // ServiceSubmitBatchResponseModel and ContainerSubmitBatchResponse are compatible for now.
            const rawBatchResponse = assertResponse(await this.serviceOrContainerContext.submitBatch(utf8ByteLength(batchRequestBody), batchRequest.getMultiPartContentType(), batchRequestBody, Object.assign({}, updatedOptions)));
            // Parse the sub responses result, if logic reaches here(i.e. the batch request succeeded with status code 202).
            const batchResponseParser = new BatchResponseParser(rawBatchResponse, batchRequest.getSubRequests());
            const responseSummary = await batchResponseParser.parseBatchResponse();
            const res = {
                _response: rawBatchResponse._response,
                contentType: rawBatchResponse.contentType,
                errorCode: rawBatchResponse.errorCode,
                requestId: rawBatchResponse.requestId,
                clientRequestId: rawBatchResponse.clientRequestId,
                version: rawBatchResponse.version,
                subResponses: responseSummary.subResponses,
                subResponsesSucceededCount: responseSummary.subResponsesSucceededCount,
                subResponsesFailedCount: responseSummary.subResponsesFailedCount,
            };
            return res;
        });
    }
}

/**
 * A ContainerClient represents a URL to the Azure Storage container allowing you to manipulate its blobs.
 */
class ContainerClient extends StorageClient {
    /**
     * The name of the container.
     */
    get containerName() {
        return this._containerName;
    }
    constructor(urlOrConnectionString, credentialOrPipelineOrContainerName, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        let pipeline;
        let url;
        options = options || {};
        if (isPipelineLike(credentialOrPipelineOrContainerName)) {
            // (url: string, pipeline: Pipeline)
            url = urlOrConnectionString;
            pipeline = credentialOrPipelineOrContainerName;
        }
        else if ((coreUtil.isNode && credentialOrPipelineOrContainerName instanceof StorageSharedKeyCredential) ||
            credentialOrPipelineOrContainerName instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipelineOrContainerName)) {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            url = urlOrConnectionString;
            pipeline = newPipeline(credentialOrPipelineOrContainerName, options);
        }
        else if (!credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName !== "string") {
            // (url: string, credential?: StorageSharedKeyCredential | AnonymousCredential | TokenCredential, options?: StoragePipelineOptions)
            // The second parameter is undefined. Use anonymous credential.
            url = urlOrConnectionString;
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        else if (credentialOrPipelineOrContainerName &&
            typeof credentialOrPipelineOrContainerName === "string") {
            // (connectionString: string, containerName: string, blobName: string, options?: StoragePipelineOptions)
            const containerName = credentialOrPipelineOrContainerName;
            const extractedCreds = extractConnectionStringParts(urlOrConnectionString);
            if (extractedCreds.kind === "AccountConnString") {
                if (coreUtil.isNode) {
                    const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                    url = appendToURLPath(extractedCreds.url, encodeURIComponent(containerName));
                    if (!options.proxyOptions) {
                        options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                    }
                    pipeline = newPipeline(sharedKeyCredential, options);
                }
                else {
                    throw new Error("Account connection string is only supported in Node.js environment");
                }
            }
            else if (extractedCreds.kind === "SASConnString") {
                url =
                    appendToURLPath(extractedCreds.url, encodeURIComponent(containerName)) +
                        "?" +
                        extractedCreds.accountSas;
                pipeline = newPipeline(new AnonymousCredential(), options);
            }
            else {
                throw new Error("Connection string must be either an Account connection string or a SAS connection string");
            }
        }
        else {
            throw new Error("Expecting non-empty strings for containerName parameter");
        }
        super(url, pipeline);
        this._containerName = this.getContainerNameFromUrl();
        this.containerContext = this.storageClientContext.container;
    }
    /**
     * Creates a new container under the specified account. If the container with
     * the same name already exists, the operation fails.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-container
     * Naming rules: @see https://learn.microsoft.com/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
     *
     * @param options - Options to Container Create operation.
     *
     *
     * Example usage:
     *
     * ```js
     * const containerClient = blobServiceClient.getContainerClient("<container name>");
     * const createContainerResponse = await containerClient.create();
     * console.log("Container was created successfully", createContainerResponse.requestId);
     * ```
     */
    async create(options = {}) {
        return tracingClient.withSpan("ContainerClient-create", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.create(updatedOptions));
        });
    }
    /**
     * Creates a new container under the specified account. If the container with
     * the same name already exists, it is not changed.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-container
     * Naming rules: @see https://learn.microsoft.com/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata
     *
     * @param options -
     */
    async createIfNotExists(options = {}) {
        return tracingClient.withSpan("ContainerClient-createIfNotExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = await this.create(updatedOptions);
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "ContainerAlreadyExists") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                else {
                    throw e;
                }
            }
        });
    }
    /**
     * Returns true if the Azure container resource represented by this client exists; false otherwise.
     *
     * NOTE: use this function with care since an existing container might be deleted by other clients or
     * applications. Vice versa new containers with the same name might be added by other clients or
     * applications after this function completes.
     *
     * @param options -
     */
    async exists(options = {}) {
        return tracingClient.withSpan("ContainerClient-exists", options, async (updatedOptions) => {
            try {
                await this.getProperties({
                    abortSignal: options.abortSignal,
                    tracingOptions: updatedOptions.tracingOptions,
                });
                return true;
            }
            catch (e) {
                if (e.statusCode === 404) {
                    return false;
                }
                throw e;
            }
        });
    }
    /**
     * Creates a {@link BlobClient}
     *
     * @param blobName - A blob name
     * @returns A new BlobClient object for the given blob name.
     */
    getBlobClient(blobName) {
        return new BlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates an {@link AppendBlobClient}
     *
     * @param blobName - An append blob name
     */
    getAppendBlobClient(blobName) {
        return new AppendBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates a {@link BlockBlobClient}
     *
     * @param blobName - A block blob name
     *
     *
     * Example usage:
     *
     * ```js
     * const content = "Hello world!";
     *
     * const blockBlobClient = containerClient.getBlockBlobClient("<blob name>");
     * const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
     * ```
     */
    getBlockBlobClient(blobName) {
        return new BlockBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Creates a {@link PageBlobClient}
     *
     * @param blobName - A page blob name
     */
    getPageBlobClient(blobName) {
        return new PageBlobClient(appendToURLPath(this.url, EscapePath(blobName)), this.pipeline);
    }
    /**
     * Returns all user-defined metadata and system properties for the specified
     * container. The data returned does not include the container's list of blobs.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-container-properties
     *
     * WARNING: The `metadata` object returned in the response will have its keys in lowercase, even if
     * they originally contained uppercase characters. This differs from the metadata keys returned by
     * the `listContainers` method of {@link BlobServiceClient} using the `includeMetadata` option, which
     * will retain their original casing.
     *
     * @param options - Options to Container Get Properties operation.
     */
    async getProperties(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-getProperties", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.getProperties(Object.assign(Object.assign({ abortSignal: options.abortSignal }, options.conditions), { tracingOptions: updatedOptions.tracingOptions })));
        });
    }
    /**
     * Marks the specified container for deletion. The container and any blobs
     * contained within it are later deleted during garbage collection.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-container
     *
     * @param options - Options to Container Delete operation.
     */
    async delete(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-delete", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.delete({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Marks the specified container for deletion if it exists. The container and any blobs
     * contained within it are later deleted during garbage collection.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-container
     *
     * @param options - Options to Container Delete operation.
     */
    async deleteIfExists(options = {}) {
        return tracingClient.withSpan("ContainerClient-deleteIfExists", options, async (updatedOptions) => {
            var _a, _b;
            try {
                const res = await this.delete(updatedOptions);
                return Object.assign(Object.assign({ succeeded: true }, res), { _response: res._response });
            }
            catch (e) {
                if (((_a = e.details) === null || _a === void 0 ? void 0 : _a.errorCode) === "ContainerNotFound") {
                    return Object.assign(Object.assign({ succeeded: false }, (_b = e.response) === null || _b === void 0 ? void 0 : _b.parsedHeaders), { _response: e.response });
                }
                throw e;
            }
        });
    }
    /**
     * Sets one or more user-defined name-value pairs for the specified container.
     *
     * If no option provided, or no metadata defined in the parameter, the container
     * metadata will be removed.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-container-metadata
     *
     * @param metadata - Replace existing metadata with this value.
     *                            If no value provided the existing metadata will be removed.
     * @param options - Options to Container Set Metadata operation.
     */
    async setMetadata(metadata, options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        if (options.conditions.ifUnmodifiedSince) {
            throw new RangeError("the IfUnmodifiedSince must have their default values because they are ignored by the blob service");
        }
        return tracingClient.withSpan("ContainerClient-setMetadata", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.setMetadata({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                metadata,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Gets the permissions for the specified container. The permissions indicate
     * whether container data may be accessed publicly.
     *
     * WARNING: JavaScript Date will potentially lose precision when parsing startsOn and expiresOn strings.
     * For example, new Date("2018-12-31T03:44:23.8827891Z").toISOString() will get "2018-12-31T03:44:23.882Z".
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-container-acl
     *
     * @param options - Options to Container Get Access Policy operation.
     */
    async getAccessPolicy(options = {}) {
        if (!options.conditions) {
            options.conditions = {};
        }
        return tracingClient.withSpan("ContainerClient-getAccessPolicy", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.getAccessPolicy({
                abortSignal: options.abortSignal,
                leaseAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const res = {
                _response: response._response,
                blobPublicAccess: response.blobPublicAccess,
                date: response.date,
                etag: response.etag,
                errorCode: response.errorCode,
                lastModified: response.lastModified,
                requestId: response.requestId,
                clientRequestId: response.clientRequestId,
                signedIdentifiers: [],
                version: response.version,
            };
            for (const identifier of response) {
                let accessPolicy = undefined;
                if (identifier.accessPolicy) {
                    accessPolicy = {
                        permissions: identifier.accessPolicy.permissions,
                    };
                    if (identifier.accessPolicy.expiresOn) {
                        accessPolicy.expiresOn = new Date(identifier.accessPolicy.expiresOn);
                    }
                    if (identifier.accessPolicy.startsOn) {
                        accessPolicy.startsOn = new Date(identifier.accessPolicy.startsOn);
                    }
                }
                res.signedIdentifiers.push({
                    accessPolicy,
                    id: identifier.id,
                });
            }
            return res;
        });
    }
    /**
     * Sets the permissions for the specified container. The permissions indicate
     * whether blobs in a container may be accessed publicly.
     *
     * When you set permissions for a container, the existing permissions are replaced.
     * If no access or containerAcl provided, the existing container ACL will be
     * removed.
     *
     * When you establish a stored access policy on a container, it may take up to 30 seconds to take effect.
     * During this interval, a shared access signature that is associated with the stored access policy will
     * fail with status code 403 (Forbidden), until the access policy becomes active.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-container-acl
     *
     * @param access - The level of public access to data in the container.
     * @param containerAcl - Array of elements each having a unique Id and details of the access policy.
     * @param options - Options to Container Set Access Policy operation.
     */
    async setAccessPolicy(access, containerAcl, options = {}) {
        options.conditions = options.conditions || {};
        return tracingClient.withSpan("ContainerClient-setAccessPolicy", options, async (updatedOptions) => {
            const acl = [];
            for (const identifier of containerAcl || []) {
                acl.push({
                    accessPolicy: {
                        expiresOn: identifier.accessPolicy.expiresOn
                            ? truncatedISO8061Date(identifier.accessPolicy.expiresOn)
                            : "",
                        permissions: identifier.accessPolicy.permissions,
                        startsOn: identifier.accessPolicy.startsOn
                            ? truncatedISO8061Date(identifier.accessPolicy.startsOn)
                            : "",
                    },
                    id: identifier.id,
                });
            }
            return assertResponse(await this.containerContext.setAccessPolicy({
                abortSignal: options.abortSignal,
                access,
                containerAcl: acl,
                leaseAccessConditions: options.conditions,
                modifiedAccessConditions: options.conditions,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Get a {@link BlobLeaseClient} that manages leases on the container.
     *
     * @param proposeLeaseId - Initial proposed lease Id.
     * @returns A new BlobLeaseClient object for managing leases on the container.
     */
    getBlobLeaseClient(proposeLeaseId) {
        return new BlobLeaseClient(this, proposeLeaseId);
    }
    /**
     * Creates a new block blob, or updates the content of an existing block blob.
     *
     * Updating an existing block blob overwrites any existing metadata on the blob.
     * Partial updates are not supported; the content of the existing blob is
     * overwritten with the new content. To perform a partial update of a block blob's,
     * use {@link BlockBlobClient.stageBlock} and {@link BlockBlobClient.commitBlockList}.
     *
     * This is a non-parallel uploading method, please use {@link BlockBlobClient.uploadFile},
     * {@link BlockBlobClient.uploadStream} or {@link BlockBlobClient.uploadBrowserData} for better
     * performance with concurrency uploading.
     *
     * @see https://docs.microsoft.com/rest/api/storageservices/put-blob
     *
     * @param blobName - Name of the block blob to create or update.
     * @param body - Blob, string, ArrayBuffer, ArrayBufferView or a function
     *                               which returns a new Readable stream whose offset is from data source beginning.
     * @param contentLength - Length of body in bytes. Use Buffer.byteLength() to calculate body length for a
     *                               string including non non-Base64/Hex-encoded characters.
     * @param options - Options to configure the Block Blob Upload operation.
     * @returns Block Blob upload response data and the corresponding BlockBlobClient instance.
     */
    async uploadBlockBlob(blobName, body, contentLength, options = {}) {
        return tracingClient.withSpan("ContainerClient-uploadBlockBlob", options, async (updatedOptions) => {
            const blockBlobClient = this.getBlockBlobClient(blobName);
            const response = await blockBlobClient.upload(body, contentLength, updatedOptions);
            return {
                blockBlobClient,
                response,
            };
        });
    }
    /**
     * Marks the specified blob or snapshot for deletion. The blob is later deleted
     * during garbage collection. Note that in order to delete a blob, you must delete
     * all of its snapshots. You can delete both at the same time with the Delete
     * Blob operation.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/delete-blob
     *
     * @param blobName -
     * @param options - Options to Blob Delete operation.
     * @returns Block blob deletion response data.
     */
    async deleteBlob(blobName, options = {}) {
        return tracingClient.withSpan("ContainerClient-deleteBlob", options, async (updatedOptions) => {
            let blobClient = this.getBlobClient(blobName);
            if (options.versionId) {
                blobClient = blobClient.withVersion(options.versionId);
            }
            return blobClient.delete(updatedOptions);
        });
    }
    /**
     * listBlobFlatSegment returns a single segment of blobs starting from the
     * specified Marker. Use an empty Marker to start enumeration from the beginning.
     * After getting a segment, process it, and then call listBlobsFlatSegment again
     * (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/list-blobs
     *
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to Container List Blob Flat Segment operation.
     */
    async listBlobFlatSegment(marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-listBlobFlatSegment", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.listBlobFlatSegment(Object.assign(Object.assign({ marker }, options), { tracingOptions: updatedOptions.tracingOptions })));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: Object.assign(Object.assign({}, response._response), { parsedBody: ConvertInternalResponseOfListBlobFlat(response._response.parsedBody) }), segment: Object.assign(Object.assign({}, response.segment), { blobItems: response.segment.blobItems.map((blobItemInternal) => {
                        const blobItem = Object.assign(Object.assign({}, blobItemInternal), { name: BlobNameToString(blobItemInternal.name), tags: toTags(blobItemInternal.blobTags), objectReplicationSourceProperties: parseObjectReplicationRecord(blobItemInternal.objectReplicationMetadata) });
                        return blobItem;
                    }) }) });
            return wrappedResponse;
        });
    }
    /**
     * listBlobHierarchySegment returns a single segment of blobs starting from
     * the specified Marker. Use an empty Marker to start enumeration from the
     * beginning. After getting a segment, process it, and then call listBlobsHierarchicalSegment
     * again (passing the the previously-returned Marker) to get the next segment.
     * @see https://docs.microsoft.com/rest/api/storageservices/list-blobs
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param marker - A string value that identifies the portion of the list to be returned with the next list operation.
     * @param options - Options to Container List Blob Hierarchy Segment operation.
     */
    async listBlobHierarchySegment(delimiter, marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-listBlobHierarchySegment", options, async (updatedOptions) => {
            var _a;
            const response = assertResponse(await this.containerContext.listBlobHierarchySegment(delimiter, Object.assign(Object.assign({ marker }, options), { tracingOptions: updatedOptions.tracingOptions })));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: Object.assign(Object.assign({}, response._response), { parsedBody: ConvertInternalResponseOfListBlobHierarchy(response._response.parsedBody) }), segment: Object.assign(Object.assign({}, response.segment), { blobItems: response.segment.blobItems.map((blobItemInternal) => {
                        const blobItem = Object.assign(Object.assign({}, blobItemInternal), { name: BlobNameToString(blobItemInternal.name), tags: toTags(blobItemInternal.blobTags), objectReplicationSourceProperties: parseObjectReplicationRecord(blobItemInternal.objectReplicationMetadata) });
                        return blobItem;
                    }), blobPrefixes: (_a = response.segment.blobPrefixes) === null || _a === void 0 ? void 0 : _a.map((blobPrefixInternal) => {
                        const blobPrefix = Object.assign(Object.assign({}, blobPrefixInternal), { name: BlobNameToString(blobPrefixInternal.name) });
                        return blobPrefix;
                    }) }) });
            return wrappedResponse;
        });
    }
    /**
     * Returns an AsyncIterableIterator for ContainerListBlobFlatSegmentResponse
     *
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to list blobs operation.
     */
    listSegments(marker_1) {
        return tslib.__asyncGenerator(this, arguments, function* listSegments_1(marker, options = {}) {
            let listBlobsFlatSegmentResponse;
            if (!!marker || marker === undefined) {
                do {
                    listBlobsFlatSegmentResponse = yield tslib.__await(this.listBlobFlatSegment(marker, options));
                    marker = listBlobsFlatSegmentResponse.continuationToken;
                    yield yield tslib.__await(yield tslib.__await(listBlobsFlatSegmentResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator of {@link BlobItem} objects
     *
     * @param options - Options to list blobs operation.
     */
    listItems() {
        return tslib.__asyncGenerator(this, arguments, function* listItems_1(options = {}) {
            var _a, e_1, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.listSegments(marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const listBlobsFlatSegmentResponse = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(listBlobsFlatSegmentResponse.segment.blobItems)));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list all the blobs
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the blobs in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * // Get the containerClient before you run these snippets,
     * // Can be obtained from `blobServiceClient.getContainerClient("<your-container-name>");`
     * let i = 1;
     * for await (const blob of containerClient.listBlobsFlat()) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * let iter = containerClient.listBlobsFlat();
     * let blobItem = await iter.next();
     * while (!blobItem.done) {
     *   console.log(`Blob ${i++}: ${blobItem.value.name}`);
     *   blobItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of containerClient.listBlobsFlat().byPage({ maxPageSize: 20 })) {
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = containerClient.listBlobsFlat().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 blob names
     * for (const blob of response.segment.blobItems) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     *
     * // Passing next marker as continuationToken
     *
     * iterator = containerClient.listBlobsFlat().byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 blob names
     * for (const blob of response.segment.blobItems) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * @param options - Options to list blobs.
     * @returns An asyncIterableIterator that supports paging.
     */
    listBlobsFlat(options = {}) {
        const include = [];
        if (options.includeCopy) {
            include.push("copy");
        }
        if (options.includeDeleted) {
            include.push("deleted");
        }
        if (options.includeMetadata) {
            include.push("metadata");
        }
        if (options.includeSnapshots) {
            include.push("snapshots");
        }
        if (options.includeVersions) {
            include.push("versions");
        }
        if (options.includeUncommitedBlobs) {
            include.push("uncommittedblobs");
        }
        if (options.includeTags) {
            include.push("tags");
        }
        if (options.includeDeletedWithVersions) {
            include.push("deletedwithversions");
        }
        if (options.includeImmutabilityPolicy) {
            include.push("immutabilitypolicy");
        }
        if (options.includeLegalHold) {
            include.push("legalhold");
        }
        if (options.prefix === "") {
            options.prefix = undefined;
        }
        const updatedOptions = Object.assign(Object.assign({}, options), (include.length > 0 ? { include: include } : {}));
        // AsyncIterableIterator to iterate over blobs
        const iter = this.listItems(updatedOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listSegments(settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, updatedOptions));
            },
        };
    }
    /**
     * Returns an AsyncIterableIterator for ContainerListBlobHierarchySegmentResponse
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the ContinuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The ContinuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to list blobs operation.
     */
    listHierarchySegments(delimiter_1, marker_1) {
        return tslib.__asyncGenerator(this, arguments, function* listHierarchySegments_1(delimiter, marker, options = {}) {
            let listBlobsHierarchySegmentResponse;
            if (!!marker || marker === undefined) {
                do {
                    listBlobsHierarchySegmentResponse = yield tslib.__await(this.listBlobHierarchySegment(delimiter, marker, options));
                    marker = listBlobsHierarchySegmentResponse.continuationToken;
                    yield yield tslib.__await(yield tslib.__await(listBlobsHierarchySegmentResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for {@link BlobPrefix} and {@link BlobItem} objects.
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param options - Options to list blobs operation.
     */
    listItemsByHierarchy(delimiter_1) {
        return tslib.__asyncGenerator(this, arguments, function* listItemsByHierarchy_1(delimiter, options = {}) {
            var _a, e_2, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.listHierarchySegments(delimiter, marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const listBlobsHierarchySegmentResponse = _c;
                    const segment = listBlobsHierarchySegmentResponse.segment;
                    if (segment.blobPrefixes) {
                        for (const prefix of segment.blobPrefixes) {
                            yield yield tslib.__await(Object.assign({ kind: "prefix" }, prefix));
                        }
                    }
                    for (const blob of segment.blobItems) {
                        yield yield tslib.__await(Object.assign({ kind: "blob" }, blob));
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list all the blobs by hierarchy.
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the blobs by hierarchy in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * for await (const item of containerClient.listBlobsByHierarchy("/")) {
     *   if (item.kind === "prefix") {
     *     console.log(`\tBlobPrefix: ${item.name}`);
     *   } else {
     *     console.log(`\tBlobItem: name - ${item.name}`);
     *   }
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let iter = containerClient.listBlobsByHierarchy("/", { prefix: "prefix1/" });
     * let entity = await iter.next();
     * while (!entity.done) {
     *   let item = entity.value;
     *   if (item.kind === "prefix") {
     *     console.log(`\tBlobPrefix: ${item.name}`);
     *   } else {
     *     console.log(`\tBlobItem: name - ${item.name}`);
     *   }
     *   entity = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * console.log("Listing blobs by hierarchy by page");
     * for await (const response of containerClient.listBlobsByHierarchy("/").byPage()) {
     *   const segment = response.segment;
     *   if (segment.blobPrefixes) {
     *     for (const prefix of segment.blobPrefixes) {
     *       console.log(`\tBlobPrefix: ${prefix.name}`);
     *     }
     *   }
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`\tBlobItem: name - ${blob.name}`);
     *   }
     * }
     * ```
     *
     * Example using paging with a max page size:
     *
     * ```js
     * console.log("Listing blobs by hierarchy by page, specifying a prefix and a max page size");
     *
     * let i = 1;
     * for await (const response of containerClient
     *   .listBlobsByHierarchy("/", { prefix: "prefix2/sub1/" })
     *   .byPage({ maxPageSize: 2 })) {
     *   console.log(`Page ${i++}`);
     *   const segment = response.segment;
     *
     *   if (segment.blobPrefixes) {
     *     for (const prefix of segment.blobPrefixes) {
     *       console.log(`\tBlobPrefix: ${prefix.name}`);
     *     }
     *   }
     *
     *   for (const blob of response.segment.blobItems) {
     *     console.log(`\tBlobItem: name - ${blob.name}`);
     *   }
     * }
     * ```
     *
     * @param delimiter - The character or string used to define the virtual hierarchy
     * @param options - Options to list blobs operation.
     */
    listBlobsByHierarchy(delimiter, options = {}) {
        if (delimiter === "") {
            throw new RangeError("delimiter should contain one or more characters");
        }
        const include = [];
        if (options.includeCopy) {
            include.push("copy");
        }
        if (options.includeDeleted) {
            include.push("deleted");
        }
        if (options.includeMetadata) {
            include.push("metadata");
        }
        if (options.includeSnapshots) {
            include.push("snapshots");
        }
        if (options.includeVersions) {
            include.push("versions");
        }
        if (options.includeUncommitedBlobs) {
            include.push("uncommittedblobs");
        }
        if (options.includeTags) {
            include.push("tags");
        }
        if (options.includeDeletedWithVersions) {
            include.push("deletedwithversions");
        }
        if (options.includeImmutabilityPolicy) {
            include.push("immutabilitypolicy");
        }
        if (options.includeLegalHold) {
            include.push("legalhold");
        }
        if (options.prefix === "") {
            options.prefix = undefined;
        }
        const updatedOptions = Object.assign(Object.assign({}, options), (include.length > 0 ? { include: include } : {}));
        // AsyncIterableIterator to iterate over blob prefixes and blobs
        const iter = this.listItemsByHierarchy(delimiter, updatedOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            async next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listHierarchySegments(delimiter, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, updatedOptions));
            },
        };
    }
    /**
     * The Filter Blobs operation enables callers to list blobs in the container whose tags
     * match a given search expression.
     *
     * @param tagFilterSqlExpression - The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                        The given expression must evaluate to true for a blob to be returned in the results.
     *                                        The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                        however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    async findBlobsByTagsSegment(tagFilterSqlExpression, marker, options = {}) {
        return tracingClient.withSpan("ContainerClient-findBlobsByTagsSegment", options, async (updatedOptions) => {
            const response = assertResponse(await this.containerContext.filterBlobs({
                abortSignal: options.abortSignal,
                where: tagFilterSqlExpression,
                marker,
                maxPageSize: options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: response._response, blobs: response.blobs.map((blob) => {
                    var _a;
                    let tagValue = "";
                    if (((_a = blob.tags) === null || _a === void 0 ? void 0 : _a.blobTagSet.length) === 1) {
                        tagValue = blob.tags.blobTagSet[0].value;
                    }
                    return Object.assign(Object.assign({}, blob), { tags: toTags(blob.tags), tagValue });
                }) });
            return wrappedResponse;
        });
    }
    /**
     * Returns an AsyncIterableIterator for ContainerFindBlobsByTagsSegmentResponse.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTagsSegments(tagFilterSqlExpression_1, marker_1) {
        return tslib.__asyncGenerator(this, arguments, function* findBlobsByTagsSegments_1(tagFilterSqlExpression, marker, options = {}) {
            let response;
            if (!!marker || marker === undefined) {
                do {
                    response = yield tslib.__await(this.findBlobsByTagsSegment(tagFilterSqlExpression, marker, options));
                    response.blobs = response.blobs || [];
                    marker = response.continuationToken;
                    yield yield tslib.__await(response);
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for blobs.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to findBlobsByTagsItems.
     */
    findBlobsByTagsItems(tagFilterSqlExpression_1) {
        return tslib.__asyncGenerator(this, arguments, function* findBlobsByTagsItems_1(tagFilterSqlExpression, options = {}) {
            var _a, e_3, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.findBlobsByTagsSegments(tagFilterSqlExpression, marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const segment = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(segment.blobs)));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_3) throw e_3.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to find all blobs with specified tag
     * under the specified container.
     *
     * .byPage() returns an async iterable iterator to list the blobs in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * let i = 1;
     * for await (const blob of containerClient.findBlobsByTags("tagkey='tagvalue'")) {
     *   console.log(`Blob ${i++}: ${blob.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * const iter = containerClient.findBlobsByTags("tagkey='tagvalue'");
     * let blobItem = await iter.next();
     * while (!blobItem.done) {
     *   console.log(`Blob ${i++}: ${blobItem.value.name}`);
     *   blobItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of containerClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 20 })) {
     *   if (response.blobs) {
     *     for (const blob of response.blobs) {
     *       console.log(`Blob ${i++}: ${blob.name}`);
     *     }
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = containerClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *     console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     * // Passing next marker as continuationToken
     * iterator = containerClient
     *   .findBlobsByTags("tagkey='tagvalue'")
     *   .byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *      console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     * ```
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTags(tagFilterSqlExpression, options = {}) {
        // AsyncIterableIterator to iterate over blobs
        const listSegmentOptions = Object.assign({}, options);
        const iter = this.findBlobsByTagsItems(tagFilterSqlExpression, listSegmentOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.findBlobsByTagsSegments(tagFilterSqlExpression, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, listSegmentOptions));
            },
        };
    }
    /**
     * The Get Account Information operation returns the sku name and account kind
     * for the specified account.
     * The Get Account Information operation is available on service versions beginning
     * with version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-account-information
     *
     * @param options - Options to the Service Get Account Info operation.
     * @returns Response data for the Service Get Account Info operation.
     */
    async getAccountInfo(options = {}) {
        return tracingClient.withSpan("ContainerClient-getAccountInfo", options, async (updatedOptions) => {
            return assertResponse(await this.containerContext.getAccountInfo({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    getContainerNameFromUrl() {
        let containerName;
        try {
            //  URL may look like the following
            // "https://myaccount.blob.core.windows.net/mycontainer?sasString";
            // "https://myaccount.blob.core.windows.net/mycontainer";
            // IPv4/IPv6 address hosts, Endpoints - `http://127.0.0.1:10000/devstoreaccount1/containername`
            // http://localhost:10001/devstoreaccount1/containername
            const parsedUrl = new URL(this.url);
            if (parsedUrl.hostname.split(".")[1] === "blob") {
                // "https://myaccount.blob.core.windows.net/containername".
                // "https://customdomain.com/containername".
                // .getPath() -> /containername
                containerName = parsedUrl.pathname.split("/")[1];
            }
            else if (isIpEndpointStyle(parsedUrl)) {
                // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/containername
                // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/containername
                // .getPath() -> /devstoreaccount1/containername
                containerName = parsedUrl.pathname.split("/")[2];
            }
            else {
                // "https://customdomain.com/containername".
                // .getPath() -> /containername
                containerName = parsedUrl.pathname.split("/")[1];
            }
            // decode the encoded containerName - to get all the special characters that might be present in it
            containerName = decodeURIComponent(containerName);
            if (!containerName) {
                throw new Error("Provided containerName is invalid.");
            }
            return containerName;
        }
        catch (error) {
            throw new Error("Unable to extract containerName with provided information.");
        }
    }
    /**
     * Only available for ContainerClient constructed with a shared key credential.
     *
     * Generates a Blob Container Service Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateSasUrl(options) {
        return new Promise((resolve) => {
            if (!(this.credential instanceof StorageSharedKeyCredential)) {
                throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
            }
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName }, options), this.credential).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Only available for ContainerClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob Container Service Shared Access Signature (SAS) URI
     * based on the client properties and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    generateSasStringToSign(options) {
        if (!(this.credential instanceof StorageSharedKeyCredential)) {
            throw new RangeError("Can only generate the SAS when the client is initialized with a shared key credential");
        }
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName }, options), this.credential).stringToSign;
    }
    /**
     * Generates a Blob Container Service Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasUrl(options, userDelegationKey) {
        return new Promise((resolve) => {
            const sas = generateBlobSASQueryParameters(Object.assign({ containerName: this._containerName }, options), userDelegationKey, this.accountName).toString();
            resolve(appendToURLQuery(this.url, sas));
        });
    }
    /**
     * Generates string to sign for a Blob Container Service Shared Access Signature (SAS) URI
     * based on the client properties and parameters passed in. The SAS is signed by the input user delegation key.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas
     *
     * @param options - Optional parameters.
     * @param userDelegationKey -  Return value of `blobServiceClient.getUserDelegationKey()`
     * @returns The SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateUserDelegationSasStringToSign(options, userDelegationKey) {
        return generateBlobSASQueryParametersInternal(Object.assign({ containerName: this._containerName }, options), userDelegationKey, this.accountName).stringToSign;
    }
    /**
     * Creates a BlobBatchClient object to conduct batch operations.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
     *
     * @returns A new BlobBatchClient object for this container.
     */
    getBlobBatchClient() {
        return new BlobBatchClient(this.url, this.pipeline);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * This is a helper class to construct a string representing the permissions granted by an AccountSAS. Setting a value
 * to true means that any SAS which uses these permissions will grant permissions for that operation. Once all the
 * values are set, this should be serialized with toString and set as the permissions field on an
 * {@link AccountSASSignatureValues} object. It is possible to construct the permissions string without this class, but
 * the order of the permissions is particular and this class guarantees correctness.
 */
class AccountSASPermissions {
    constructor() {
        /**
         * Permission to read resources and list queues and tables granted.
         */
        this.read = false;
        /**
         * Permission to write resources granted.
         */
        this.write = false;
        /**
         * Permission to delete blobs and files granted.
         */
        this.delete = false;
        /**
         * Permission to delete versions granted.
         */
        this.deleteVersion = false;
        /**
         * Permission to list blob containers, blobs, shares, directories, and files granted.
         */
        this.list = false;
        /**
         * Permission to add messages, table entities, and append to blobs granted.
         */
        this.add = false;
        /**
         * Permission to create blobs and files granted.
         */
        this.create = false;
        /**
         * Permissions to update messages and table entities granted.
         */
        this.update = false;
        /**
         * Permission to get and delete messages granted.
         */
        this.process = false;
        /**
         * Specfies Tag access granted.
         */
        this.tag = false;
        /**
         * Permission to filter blobs.
         */
        this.filter = false;
        /**
         * Permission to set immutability policy.
         */
        this.setImmutabilityPolicy = false;
        /**
         * Specifies that Permanent Delete is permitted.
         */
        this.permanentDelete = false;
    }
    /**
     * Parse initializes the AccountSASPermissions fields from a string.
     *
     * @param permissions -
     */
    static parse(permissions) {
        const accountSASPermissions = new AccountSASPermissions();
        for (const c of permissions) {
            switch (c) {
                case "r":
                    accountSASPermissions.read = true;
                    break;
                case "w":
                    accountSASPermissions.write = true;
                    break;
                case "d":
                    accountSASPermissions.delete = true;
                    break;
                case "x":
                    accountSASPermissions.deleteVersion = true;
                    break;
                case "l":
                    accountSASPermissions.list = true;
                    break;
                case "a":
                    accountSASPermissions.add = true;
                    break;
                case "c":
                    accountSASPermissions.create = true;
                    break;
                case "u":
                    accountSASPermissions.update = true;
                    break;
                case "p":
                    accountSASPermissions.process = true;
                    break;
                case "t":
                    accountSASPermissions.tag = true;
                    break;
                case "f":
                    accountSASPermissions.filter = true;
                    break;
                case "i":
                    accountSASPermissions.setImmutabilityPolicy = true;
                    break;
                case "y":
                    accountSASPermissions.permanentDelete = true;
                    break;
                default:
                    throw new RangeError(`Invalid permission character: ${c}`);
            }
        }
        return accountSASPermissions;
    }
    /**
     * Creates a {@link AccountSASPermissions} from a raw object which contains same keys as it
     * and boolean values for them.
     *
     * @param permissionLike -
     */
    static from(permissionLike) {
        const accountSASPermissions = new AccountSASPermissions();
        if (permissionLike.read) {
            accountSASPermissions.read = true;
        }
        if (permissionLike.write) {
            accountSASPermissions.write = true;
        }
        if (permissionLike.delete) {
            accountSASPermissions.delete = true;
        }
        if (permissionLike.deleteVersion) {
            accountSASPermissions.deleteVersion = true;
        }
        if (permissionLike.filter) {
            accountSASPermissions.filter = true;
        }
        if (permissionLike.tag) {
            accountSASPermissions.tag = true;
        }
        if (permissionLike.list) {
            accountSASPermissions.list = true;
        }
        if (permissionLike.add) {
            accountSASPermissions.add = true;
        }
        if (permissionLike.create) {
            accountSASPermissions.create = true;
        }
        if (permissionLike.update) {
            accountSASPermissions.update = true;
        }
        if (permissionLike.process) {
            accountSASPermissions.process = true;
        }
        if (permissionLike.setImmutabilityPolicy) {
            accountSASPermissions.setImmutabilityPolicy = true;
        }
        if (permissionLike.permanentDelete) {
            accountSASPermissions.permanentDelete = true;
        }
        return accountSASPermissions;
    }
    /**
     * Produces the SAS permissions string for an Azure Storage account.
     * Call this method to set AccountSASSignatureValues Permissions field.
     *
     * Using this method will guarantee the resource types are in
     * an order accepted by the service.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-an-account-sas
     *
     */
    toString() {
        // The order of the characters should be as specified here to ensure correctness:
        // https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-an-account-sas
        // Use a string array instead of string concatenating += operator for performance
        const permissions = [];
        if (this.read) {
            permissions.push("r");
        }
        if (this.write) {
            permissions.push("w");
        }
        if (this.delete) {
            permissions.push("d");
        }
        if (this.deleteVersion) {
            permissions.push("x");
        }
        if (this.filter) {
            permissions.push("f");
        }
        if (this.tag) {
            permissions.push("t");
        }
        if (this.list) {
            permissions.push("l");
        }
        if (this.add) {
            permissions.push("a");
        }
        if (this.create) {
            permissions.push("c");
        }
        if (this.update) {
            permissions.push("u");
        }
        if (this.process) {
            permissions.push("p");
        }
        if (this.setImmutabilityPolicy) {
            permissions.push("i");
        }
        if (this.permanentDelete) {
            permissions.push("y");
        }
        return permissions.join("");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * This is a helper class to construct a string representing the resources accessible by an AccountSAS. Setting a value
 * to true means that any SAS which uses these permissions will grant access to that resource type. Once all the
 * values are set, this should be serialized with toString and set as the resources field on an
 * {@link AccountSASSignatureValues} object. It is possible to construct the resources string without this class, but
 * the order of the resources is particular and this class guarantees correctness.
 */
class AccountSASResourceTypes {
    constructor() {
        /**
         * Permission to access service level APIs granted.
         */
        this.service = false;
        /**
         * Permission to access container level APIs (Blob Containers, Tables, Queues, File Shares) granted.
         */
        this.container = false;
        /**
         * Permission to access object level APIs (Blobs, Table Entities, Queue Messages, Files) granted.
         */
        this.object = false;
    }
    /**
     * Creates an {@link AccountSASResourceTypes} from the specified resource types string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid resource type.
     *
     * @param resourceTypes -
     */
    static parse(resourceTypes) {
        const accountSASResourceTypes = new AccountSASResourceTypes();
        for (const c of resourceTypes) {
            switch (c) {
                case "s":
                    accountSASResourceTypes.service = true;
                    break;
                case "c":
                    accountSASResourceTypes.container = true;
                    break;
                case "o":
                    accountSASResourceTypes.object = true;
                    break;
                default:
                    throw new RangeError(`Invalid resource type: ${c}`);
            }
        }
        return accountSASResourceTypes;
    }
    /**
     * Converts the given resource types to a string.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-an-account-sas
     *
     */
    toString() {
        const resourceTypes = [];
        if (this.service) {
            resourceTypes.push("s");
        }
        if (this.container) {
            resourceTypes.push("c");
        }
        if (this.object) {
            resourceTypes.push("o");
        }
        return resourceTypes.join("");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * This is a helper class to construct a string representing the services accessible by an AccountSAS. Setting a value
 * to true means that any SAS which uses these permissions will grant access to that service. Once all the
 * values are set, this should be serialized with toString and set as the services field on an
 * {@link AccountSASSignatureValues} object. It is possible to construct the services string without this class, but
 * the order of the services is particular and this class guarantees correctness.
 */
class AccountSASServices {
    constructor() {
        /**
         * Permission to access blob resources granted.
         */
        this.blob = false;
        /**
         * Permission to access file resources granted.
         */
        this.file = false;
        /**
         * Permission to access queue resources granted.
         */
        this.queue = false;
        /**
         * Permission to access table resources granted.
         */
        this.table = false;
    }
    /**
     * Creates an {@link AccountSASServices} from the specified services string. This method will throw an
     * Error if it encounters a character that does not correspond to a valid service.
     *
     * @param services -
     */
    static parse(services) {
        const accountSASServices = new AccountSASServices();
        for (const c of services) {
            switch (c) {
                case "b":
                    accountSASServices.blob = true;
                    break;
                case "f":
                    accountSASServices.file = true;
                    break;
                case "q":
                    accountSASServices.queue = true;
                    break;
                case "t":
                    accountSASServices.table = true;
                    break;
                default:
                    throw new RangeError(`Invalid service character: ${c}`);
            }
        }
        return accountSASServices;
    }
    /**
     * Converts the given services to a string.
     *
     */
    toString() {
        const services = [];
        if (this.blob) {
            services.push("b");
        }
        if (this.table) {
            services.push("t");
        }
        if (this.queue) {
            services.push("q");
        }
        if (this.file) {
            services.push("f");
        }
        return services.join("");
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Generates a {@link SASQueryParameters} object which contains all SAS query parameters needed to make an actual
 * REST request.
 *
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-an-account-sas
 *
 * @param accountSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateAccountSASQueryParameters(accountSASSignatureValues, sharedKeyCredential) {
    return generateAccountSASQueryParametersInternal(accountSASSignatureValues, sharedKeyCredential)
        .sasQueryParameters;
}
function generateAccountSASQueryParametersInternal(accountSASSignatureValues, sharedKeyCredential) {
    const version = accountSASSignatureValues.version
        ? accountSASSignatureValues.version
        : SERVICE_VERSION;
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.setImmutabilityPolicy &&
        version < "2020-08-04") {
        throw RangeError("'version' must be >= '2020-08-04' when provided 'i' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.deleteVersion &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when provided 'x' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.permanentDelete &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when provided 'y' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.tag &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when provided 't' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.filter &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when provided 'f' permission.");
    }
    if (accountSASSignatureValues.encryptionScope && version < "2020-12-06") {
        throw RangeError("'version' must be >= '2020-12-06' when provided 'encryptionScope' in SAS.");
    }
    const parsedPermissions = AccountSASPermissions.parse(accountSASSignatureValues.permissions.toString());
    const parsedServices = AccountSASServices.parse(accountSASSignatureValues.services).toString();
    const parsedResourceTypes = AccountSASResourceTypes.parse(accountSASSignatureValues.resourceTypes).toString();
    let stringToSign;
    if (version >= "2020-12-06") {
        stringToSign = [
            sharedKeyCredential.accountName,
            parsedPermissions,
            parsedServices,
            parsedResourceTypes,
            accountSASSignatureValues.startsOn
                ? truncatedISO8061Date(accountSASSignatureValues.startsOn, false)
                : "",
            truncatedISO8061Date(accountSASSignatureValues.expiresOn, false),
            accountSASSignatureValues.ipRange ? ipRangeToString(accountSASSignatureValues.ipRange) : "",
            accountSASSignatureValues.protocol ? accountSASSignatureValues.protocol : "",
            version,
            accountSASSignatureValues.encryptionScope ? accountSASSignatureValues.encryptionScope : "",
            "", // Account SAS requires an additional newline character
        ].join("\n");
    }
    else {
        stringToSign = [
            sharedKeyCredential.accountName,
            parsedPermissions,
            parsedServices,
            parsedResourceTypes,
            accountSASSignatureValues.startsOn
                ? truncatedISO8061Date(accountSASSignatureValues.startsOn, false)
                : "",
            truncatedISO8061Date(accountSASSignatureValues.expiresOn, false),
            accountSASSignatureValues.ipRange ? ipRangeToString(accountSASSignatureValues.ipRange) : "",
            accountSASSignatureValues.protocol ? accountSASSignatureValues.protocol : "",
            version,
            "", // Account SAS requires an additional newline character
        ].join("\n");
    }
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(version, signature, parsedPermissions.toString(), parsedServices, parsedResourceTypes, accountSASSignatureValues.protocol, accountSASSignatureValues.startsOn, accountSASSignatureValues.expiresOn, accountSASSignatureValues.ipRange, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, accountSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}

/**
 * A BlobServiceClient represents a Client to the Azure Storage Blob service allowing you
 * to manipulate blob containers.
 */
class BlobServiceClient extends StorageClient {
    /**
     *
     * Creates an instance of BlobServiceClient from connection string.
     *
     * @param connectionString - Account connection string or a SAS connection string of an Azure storage account.
     *                                  [ Note - Account connection string can only be used in NODE.JS runtime. ]
     *                                  Account connection string example -
     *                                  `DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=accountKey;EndpointSuffix=core.windows.net`
     *                                  SAS connection string example -
     *                                  `BlobEndpoint=https://myaccount.blob.core.windows.net/;QueueEndpoint=https://myaccount.queue.core.windows.net/;FileEndpoint=https://myaccount.file.core.windows.net/;TableEndpoint=https://myaccount.table.core.windows.net/;SharedAccessSignature=sasString`
     * @param options - Optional. Options to configure the HTTP pipeline.
     */
    static fromConnectionString(connectionString, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        options = options || {};
        const extractedCreds = extractConnectionStringParts(connectionString);
        if (extractedCreds.kind === "AccountConnString") {
            if (coreUtil.isNode) {
                const sharedKeyCredential = new StorageSharedKeyCredential(extractedCreds.accountName, extractedCreds.accountKey);
                if (!options.proxyOptions) {
                    options.proxyOptions = coreRestPipeline.getDefaultProxySettings(extractedCreds.proxyUri);
                }
                const pipeline = newPipeline(sharedKeyCredential, options);
                return new BlobServiceClient(extractedCreds.url, pipeline);
            }
            else {
                throw new Error("Account connection string is only supported in Node.js environment");
            }
        }
        else if (extractedCreds.kind === "SASConnString") {
            const pipeline = newPipeline(new AnonymousCredential(), options);
            return new BlobServiceClient(extractedCreds.url + "?" + extractedCreds.accountSas, pipeline);
        }
        else {
            throw new Error("Connection string must be either an Account connection string or a SAS connection string");
        }
    }
    constructor(url, credentialOrPipeline, 
    // Legacy, no fix for eslint error without breaking. Disable it for this interface.
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options*/
    options) {
        let pipeline;
        if (isPipelineLike(credentialOrPipeline)) {
            pipeline = credentialOrPipeline;
        }
        else if ((coreUtil.isNode && credentialOrPipeline instanceof StorageSharedKeyCredential) ||
            credentialOrPipeline instanceof AnonymousCredential ||
            coreAuth.isTokenCredential(credentialOrPipeline)) {
            pipeline = newPipeline(credentialOrPipeline, options);
        }
        else {
            // The second parameter is undefined. Use anonymous credential
            pipeline = newPipeline(new AnonymousCredential(), options);
        }
        super(url, pipeline);
        this.serviceContext = this.storageClientContext.service;
    }
    /**
     * Creates a {@link ContainerClient} object
     *
     * @param containerName - A container name
     * @returns A new ContainerClient object for the given container name.
     *
     * Example usage:
     *
     * ```js
     * const containerClient = blobServiceClient.getContainerClient("<container name>");
     * ```
     */
    getContainerClient(containerName) {
        return new ContainerClient(appendToURLPath(this.url, encodeURIComponent(containerName)), this.pipeline);
    }
    /**
     * Create a Blob container. @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-container
     *
     * @param containerName - Name of the container to create.
     * @param options - Options to configure Container Create operation.
     * @returns Container creation response and the corresponding container client.
     */
    async createContainer(containerName, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-createContainer", options, async (updatedOptions) => {
            const containerClient = this.getContainerClient(containerName);
            const containerCreateResponse = await containerClient.create(updatedOptions);
            return {
                containerClient,
                containerCreateResponse,
            };
        });
    }
    /**
     * Deletes a Blob container.
     *
     * @param containerName - Name of the container to delete.
     * @param options - Options to configure Container Delete operation.
     * @returns Container deletion response.
     */
    async deleteContainer(containerName, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-deleteContainer", options, async (updatedOptions) => {
            const containerClient = this.getContainerClient(containerName);
            return containerClient.delete(updatedOptions);
        });
    }
    /**
     * Restore a previously deleted Blob container.
     * This API is only functional if Container Soft Delete is enabled for the storage account associated with the container.
     *
     * @param deletedContainerName - Name of the previously deleted container.
     * @param deletedContainerVersion - Version of the previously deleted container, used to uniquely identify the deleted container.
     * @param options - Options to configure Container Restore operation.
     * @returns Container deletion response.
     */
    async undeleteContainer(deletedContainerName, deletedContainerVersion, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-undeleteContainer", options, async (updatedOptions) => {
            const containerClient = this.getContainerClient(options.destinationContainerName || deletedContainerName);
            // Hack to access a protected member.
            const containerContext = containerClient["storageClientContext"].container;
            const containerUndeleteResponse = assertResponse(await containerContext.restore({
                deletedContainerName,
                deletedContainerVersion,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            return { containerClient, containerUndeleteResponse };
        });
    }
    /**
     * Rename an existing Blob Container.
     *
     * @param sourceContainerName - The name of the source container.
     * @param destinationContainerName - The new name of the container.
     * @param options - Options to configure Container Rename operation.
     */
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore Need to hide this interface for now. Make it public and turn on the live tests for it when the service is ready.
    async renameContainer(sourceContainerName, destinationContainerName, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-renameContainer", options, async (updatedOptions) => {
            var _a;
            const containerClient = this.getContainerClient(destinationContainerName);
            // Hack to access a protected member.
            const containerContext = containerClient["storageClientContext"].container;
            const containerRenameResponse = assertResponse(await containerContext.rename(sourceContainerName, Object.assign(Object.assign({}, updatedOptions), { sourceLeaseId: (_a = options.sourceCondition) === null || _a === void 0 ? void 0 : _a.leaseId })));
            return { containerClient, containerRenameResponse };
        });
    }
    /**
     * Gets the properties of a storage account’s Blob service, including properties
     * for Storage Analytics and CORS (Cross-Origin Resource Sharing) rules.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob-service-properties
     *
     * @param options - Options to the Service Get Properties operation.
     * @returns Response data for the Service Get Properties operation.
     */
    async getProperties(options = {}) {
        return tracingClient.withSpan("BlobServiceClient-getProperties", options, async (updatedOptions) => {
            return assertResponse(await this.serviceContext.getProperties({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Sets properties for a storage account’s Blob service endpoint, including properties
     * for Storage Analytics, CORS (Cross-Origin Resource Sharing) rules and soft delete settings.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-service-properties
     *
     * @param properties -
     * @param options - Options to the Service Set Properties operation.
     * @returns Response data for the Service Set Properties operation.
     */
    async setProperties(properties, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-setProperties", options, async (updatedOptions) => {
            return assertResponse(await this.serviceContext.setProperties(properties, {
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Retrieves statistics related to replication for the Blob service. It is only
     * available on the secondary location endpoint when read-access geo-redundant
     * replication is enabled for the storage account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob-service-stats
     *
     * @param options - Options to the Service Get Statistics operation.
     * @returns Response data for the Service Get Statistics operation.
     */
    async getStatistics(options = {}) {
        return tracingClient.withSpan("BlobServiceClient-getStatistics", options, async (updatedOptions) => {
            return assertResponse(await this.serviceContext.getStatistics({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * The Get Account Information operation returns the sku name and account kind
     * for the specified account.
     * The Get Account Information operation is available on service versions beginning
     * with version 2018-03-28.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-account-information
     *
     * @param options - Options to the Service Get Account Info operation.
     * @returns Response data for the Service Get Account Info operation.
     */
    async getAccountInfo(options = {}) {
        return tracingClient.withSpan("BlobServiceClient-getAccountInfo", options, async (updatedOptions) => {
            return assertResponse(await this.serviceContext.getAccountInfo({
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
        });
    }
    /**
     * Returns a list of the containers under the specified account.
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/list-containers2
     *
     * @param marker - A string value that identifies the portion of
     *                        the list of containers to be returned with the next listing operation. The
     *                        operation returns the continuationToken value within the response body if the
     *                        listing operation did not return all containers remaining to be listed
     *                        with the current page. The continuationToken value can be used as the value for
     *                        the marker parameter in a subsequent call to request the next page of list
     *                        items. The marker value is opaque to the client.
     * @param options - Options to the Service List Container Segment operation.
     * @returns Response data for the Service List Container Segment operation.
     */
    async listContainersSegment(marker, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-listContainersSegment", options, async (updatedOptions) => {
            return assertResponse(await this.serviceContext.listContainersSegment(Object.assign(Object.assign({ abortSignal: options.abortSignal, marker }, options), { include: typeof options.include === "string" ? [options.include] : options.include, tracingOptions: updatedOptions.tracingOptions })));
        });
    }
    /**
     * The Filter Blobs operation enables callers to list blobs across all containers whose tags
     * match a given search expression. Filter blobs searches across all containers within a
     * storage account but can be scoped within the expression to a single container.
     *
     * @param tagFilterSqlExpression - The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                        The given expression must evaluate to true for a blob to be returned in the results.
     *                                        The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                        however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    async findBlobsByTagsSegment(tagFilterSqlExpression, marker, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-findBlobsByTagsSegment", options, async (updatedOptions) => {
            const response = assertResponse(await this.serviceContext.filterBlobs({
                abortSignal: options.abortSignal,
                where: tagFilterSqlExpression,
                marker,
                maxPageSize: options.maxPageSize,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const wrappedResponse = Object.assign(Object.assign({}, response), { _response: response._response, blobs: response.blobs.map((blob) => {
                    var _a;
                    let tagValue = "";
                    if (((_a = blob.tags) === null || _a === void 0 ? void 0 : _a.blobTagSet.length) === 1) {
                        tagValue = blob.tags.blobTagSet[0].value;
                    }
                    return Object.assign(Object.assign({}, blob), { tags: toTags(blob.tags), tagValue });
                }) });
            return wrappedResponse;
        });
    }
    /**
     * Returns an AsyncIterableIterator for ServiceFindBlobsByTagsSegmentResponse.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param marker - A string value that identifies the portion of
     *                          the list of blobs to be returned with the next listing operation. The
     *                          operation returns the continuationToken value within the response body if the
     *                          listing operation did not return all blobs remaining to be listed
     *                          with the current page. The continuationToken value can be used as the value for
     *                          the marker parameter in a subsequent call to request the next page of list
     *                          items. The marker value is opaque to the client.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTagsSegments(tagFilterSqlExpression_1, marker_1) {
        return tslib.__asyncGenerator(this, arguments, function* findBlobsByTagsSegments_1(tagFilterSqlExpression, marker, options = {}) {
            let response;
            if (!!marker || marker === undefined) {
                do {
                    response = yield tslib.__await(this.findBlobsByTagsSegment(tagFilterSqlExpression, marker, options));
                    response.blobs = response.blobs || [];
                    marker = response.continuationToken;
                    yield yield tslib.__await(response);
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for blobs.
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to findBlobsByTagsItems.
     */
    findBlobsByTagsItems(tagFilterSqlExpression_1) {
        return tslib.__asyncGenerator(this, arguments, function* findBlobsByTagsItems_1(tagFilterSqlExpression, options = {}) {
            var _a, e_1, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.findBlobsByTagsSegments(tagFilterSqlExpression, marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const segment = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(segment.blobs)));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to find all blobs with specified tag
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the blobs in pages.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-blob-service-properties
     *
     * Example using `for await` syntax:
     *
     * ```js
     * let i = 1;
     * for await (const blob of blobServiceClient.findBlobsByTags("tagkey='tagvalue'")) {
     *   console.log(`Blob ${i++}: ${container.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * const iter = blobServiceClient.findBlobsByTags("tagkey='tagvalue'");
     * let blobItem = await iter.next();
     * while (!blobItem.done) {
     *   console.log(`Blob ${i++}: ${blobItem.value.name}`);
     *   blobItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of blobServiceClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 20 })) {
     *   if (response.blobs) {
     *     for (const blob of response.blobs) {
     *       console.log(`Blob ${i++}: ${blob.name}`);
     *     }
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = blobServiceClient.findBlobsByTags("tagkey='tagvalue'").byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *     console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     * // Passing next marker as continuationToken
     * iterator = blobServiceClient
     *   .findBlobsByTags("tagkey='tagvalue'")
     *   .byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints blob names
     * if (response.blobs) {
     *   for (const blob of response.blobs) {
     *      console.log(`Blob ${i++}: ${blob.name}`);
     *   }
     * }
     * ```
     *
     * @param tagFilterSqlExpression -  The where parameter enables the caller to query blobs whose tags match a given expression.
     *                                         The given expression must evaluate to true for a blob to be returned in the results.
     *                                         The[OData - ABNF] filter syntax rule defines the formal grammar for the value of the where query parameter;
     *                                         however, only a subset of the OData filter syntax is supported in the Blob service.
     * @param options - Options to find blobs by tags.
     */
    findBlobsByTags(tagFilterSqlExpression, options = {}) {
        // AsyncIterableIterator to iterate over blobs
        const listSegmentOptions = Object.assign({}, options);
        const iter = this.findBlobsByTagsItems(tagFilterSqlExpression, listSegmentOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.findBlobsByTagsSegments(tagFilterSqlExpression, settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, listSegmentOptions));
            },
        };
    }
    /**
     * Returns an AsyncIterableIterator for ServiceListContainersSegmentResponses
     *
     * @param marker - A string value that identifies the portion of
     *                        the list of containers to be returned with the next listing operation. The
     *                        operation returns the continuationToken value within the response body if the
     *                        listing operation did not return all containers remaining to be listed
     *                        with the current page. The continuationToken value can be used as the value for
     *                        the marker parameter in a subsequent call to request the next page of list
     *                        items. The marker value is opaque to the client.
     * @param options - Options to list containers operation.
     */
    listSegments(marker_1) {
        return tslib.__asyncGenerator(this, arguments, function* listSegments_1(marker, options = {}) {
            let listContainersSegmentResponse;
            if (!!marker || marker === undefined) {
                do {
                    listContainersSegmentResponse = yield tslib.__await(this.listContainersSegment(marker, options));
                    listContainersSegmentResponse.containerItems =
                        listContainersSegmentResponse.containerItems || [];
                    marker = listContainersSegmentResponse.continuationToken;
                    yield yield tslib.__await(yield tslib.__await(listContainersSegmentResponse));
                } while (marker);
            }
        });
    }
    /**
     * Returns an AsyncIterableIterator for Container Items
     *
     * @param options - Options to list containers operation.
     */
    listItems() {
        return tslib.__asyncGenerator(this, arguments, function* listItems_1(options = {}) {
            var _a, e_2, _b, _c;
            let marker;
            try {
                for (var _d = true, _e = tslib.__asyncValues(this.listSegments(marker, options)), _f; _f = yield tslib.__await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const segment = _c;
                    yield tslib.__await(yield* tslib.__asyncDelegator(tslib.__asyncValues(segment.containerItems)));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield tslib.__await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    /**
     * Returns an async iterable iterator to list all the containers
     * under the specified account.
     *
     * .byPage() returns an async iterable iterator to list the containers in pages.
     *
     * Example using `for await` syntax:
     *
     * ```js
     * let i = 1;
     * for await (const container of blobServiceClient.listContainers()) {
     *   console.log(`Container ${i++}: ${container.name}`);
     * }
     * ```
     *
     * Example using `iter.next()`:
     *
     * ```js
     * let i = 1;
     * const iter = blobServiceClient.listContainers();
     * let containerItem = await iter.next();
     * while (!containerItem.done) {
     *   console.log(`Container ${i++}: ${containerItem.value.name}`);
     *   containerItem = await iter.next();
     * }
     * ```
     *
     * Example using `byPage()`:
     *
     * ```js
     * // passing optional maxPageSize in the page settings
     * let i = 1;
     * for await (const response of blobServiceClient.listContainers().byPage({ maxPageSize: 20 })) {
     *   if (response.containerItems) {
     *     for (const container of response.containerItems) {
     *       console.log(`Container ${i++}: ${container.name}`);
     *     }
     *   }
     * }
     * ```
     *
     * Example using paging with a marker:
     *
     * ```js
     * let i = 1;
     * let iterator = blobServiceClient.listContainers().byPage({ maxPageSize: 2 });
     * let response = (await iterator.next()).value;
     *
     * // Prints 2 container names
     * if (response.containerItems) {
     *   for (const container of response.containerItems) {
     *     console.log(`Container ${i++}: ${container.name}`);
     *   }
     * }
     *
     * // Gets next marker
     * let marker = response.continuationToken;
     * // Passing next marker as continuationToken
     * iterator = blobServiceClient
     *   .listContainers()
     *   .byPage({ continuationToken: marker, maxPageSize: 10 });
     * response = (await iterator.next()).value;
     *
     * // Prints 10 container names
     * if (response.containerItems) {
     *   for (const container of response.containerItems) {
     *      console.log(`Container ${i++}: ${container.name}`);
     *   }
     * }
     * ```
     *
     * @param options - Options to list containers.
     * @returns An asyncIterableIterator that supports paging.
     */
    listContainers(options = {}) {
        if (options.prefix === "") {
            options.prefix = undefined;
        }
        const include = [];
        if (options.includeDeleted) {
            include.push("deleted");
        }
        if (options.includeMetadata) {
            include.push("metadata");
        }
        if (options.includeSystem) {
            include.push("system");
        }
        // AsyncIterableIterator to iterate over containers
        const listSegmentOptions = Object.assign(Object.assign({}, options), (include.length > 0 ? { include } : {}));
        const iter = this.listItems(listSegmentOptions);
        return {
            /**
             * The next method, part of the iteration protocol
             */
            next() {
                return iter.next();
            },
            /**
             * The connection to the async iterator, part of the iteration protocol
             */
            [Symbol.asyncIterator]() {
                return this;
            },
            /**
             * Return an AsyncIterableIterator that works a page at a time
             */
            byPage: (settings = {}) => {
                return this.listSegments(settings.continuationToken, Object.assign({ maxPageSize: settings.maxPageSize }, listSegmentOptions));
            },
        };
    }
    /**
     * ONLY AVAILABLE WHEN USING BEARER TOKEN AUTHENTICATION (TokenCredential).
     *
     * Retrieves a user delegation key for the Blob service. This is only a valid operation when using
     * bearer token authentication.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/get-user-delegation-key
     *
     * @param startsOn -      The start time for the user delegation SAS. Must be within 7 days of the current time
     * @param expiresOn -     The end time for the user delegation SAS. Must be within 7 days of the current time
     */
    async getUserDelegationKey(startsOn, expiresOn, options = {}) {
        return tracingClient.withSpan("BlobServiceClient-getUserDelegationKey", options, async (updatedOptions) => {
            const response = assertResponse(await this.serviceContext.getUserDelegationKey({
                startsOn: truncatedISO8061Date(startsOn, false),
                expiresOn: truncatedISO8061Date(expiresOn, false),
            }, {
                abortSignal: options.abortSignal,
                tracingOptions: updatedOptions.tracingOptions,
            }));
            const userDelegationKey = {
                signedObjectId: response.signedObjectId,
                signedTenantId: response.signedTenantId,
                signedStartsOn: new Date(response.signedStartsOn),
                signedExpiresOn: new Date(response.signedExpiresOn),
                signedService: response.signedService,
                signedVersion: response.signedVersion,
                value: response.value,
            };
            const res = Object.assign({ _response: response._response, requestId: response.requestId, clientRequestId: response.clientRequestId, version: response.version, date: response.date, errorCode: response.errorCode }, userDelegationKey);
            return res;
        });
    }
    /**
     * Creates a BlobBatchClient object to conduct batch operations.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
     *
     * @returns A new BlobBatchClient object for this service.
     */
    getBlobBatchClient() {
        return new BlobBatchClient(this.url, this.pipeline);
    }
    /**
     * Only available for BlobServiceClient constructed with a shared key credential.
     *
     * Generates a Blob account Shared Access Signature (SAS) URI based on the client properties
     * and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-account-sas
     *
     * @param expiresOn - Optional. The time at which the shared access signature becomes invalid. Default to an hour later if not provided.
     * @param permissions - Specifies the list of permissions to be associated with the SAS.
     * @param resourceTypes - Specifies the resource types associated with the shared access signature.
     * @param options - Optional parameters.
     * @returns An account SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateAccountSasUrl(expiresOn, permissions = AccountSASPermissions.parse("r"), resourceTypes = "sco", options = {}) {
        if (!(this.credential instanceof StorageSharedKeyCredential)) {
            throw RangeError("Can only generate the account SAS when the client is initialized with a shared key credential");
        }
        if (expiresOn === undefined) {
            const now = new Date();
            expiresOn = new Date(now.getTime() + 3600 * 1000);
        }
        const sas = generateAccountSASQueryParameters(Object.assign({ permissions,
            expiresOn,
            resourceTypes, services: AccountSASServices.parse("b").toString() }, options), this.credential).toString();
        return appendToURLQuery(this.url, sas);
    }
    /**
     * Only available for BlobServiceClient constructed with a shared key credential.
     *
     * Generates string to sign for a Blob account Shared Access Signature (SAS) URI based on
     * the client properties and parameters passed in. The SAS is signed by the shared key credential of the client.
     *
     * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-account-sas
     *
     * @param expiresOn - Optional. The time at which the shared access signature becomes invalid. Default to an hour later if not provided.
     * @param permissions - Specifies the list of permissions to be associated with the SAS.
     * @param resourceTypes - Specifies the resource types associated with the shared access signature.
     * @param options - Optional parameters.
     * @returns An account SAS URI consisting of the URI to the resource represented by this client, followed by the generated SAS token.
     */
    generateSasStringToSign(expiresOn, permissions = AccountSASPermissions.parse("r"), resourceTypes = "sco", options = {}) {
        if (!(this.credential instanceof StorageSharedKeyCredential)) {
            throw RangeError("Can only generate the account SAS when the client is initialized with a shared key credential");
        }
        if (expiresOn === undefined) {
            const now = new Date();
            expiresOn = new Date(now.getTime() + 3600 * 1000);
        }
        return generateAccountSASQueryParametersInternal(Object.assign({ permissions,
            expiresOn,
            resourceTypes, services: AccountSASServices.parse("b").toString() }, options), this.credential).stringToSign;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/** Known values of {@link EncryptionAlgorithmType} that the service accepts. */
exports.KnownEncryptionAlgorithmType = void 0;
(function (KnownEncryptionAlgorithmType) {
    KnownEncryptionAlgorithmType["AES256"] = "AES256";
})(exports.KnownEncryptionAlgorithmType || (exports.KnownEncryptionAlgorithmType = {}));

Object.defineProperty(exports, "RestError", {
    enumerable: true,
    get: function () { return coreRestPipeline.RestError; }
});
exports.AccountSASPermissions = AccountSASPermissions;
exports.AccountSASResourceTypes = AccountSASResourceTypes;
exports.AccountSASServices = AccountSASServices;
exports.AnonymousCredential = AnonymousCredential;
exports.AnonymousCredentialPolicy = AnonymousCredentialPolicy;
exports.AppendBlobClient = AppendBlobClient;
exports.BaseRequestPolicy = BaseRequestPolicy;
exports.BlobBatch = BlobBatch;
exports.BlobBatchClient = BlobBatchClient;
exports.BlobClient = BlobClient;
exports.BlobLeaseClient = BlobLeaseClient;
exports.BlobSASPermissions = BlobSASPermissions;
exports.BlobServiceClient = BlobServiceClient;
exports.BlockBlobClient = BlockBlobClient;
exports.ContainerClient = ContainerClient;
exports.ContainerSASPermissions = ContainerSASPermissions;
exports.Credential = Credential;
exports.CredentialPolicy = CredentialPolicy;
exports.PageBlobClient = PageBlobClient;
exports.Pipeline = Pipeline;
exports.SASQueryParameters = SASQueryParameters;
exports.StorageBrowserPolicy = StorageBrowserPolicy;
exports.StorageBrowserPolicyFactory = StorageBrowserPolicyFactory;
exports.StorageOAuthScopes = StorageOAuthScopes;
exports.StorageRetryPolicy = StorageRetryPolicy;
exports.StorageRetryPolicyFactory = StorageRetryPolicyFactory;
exports.StorageSharedKeyCredential = StorageSharedKeyCredential;
exports.StorageSharedKeyCredentialPolicy = StorageSharedKeyCredentialPolicy;
exports.generateAccountSASQueryParameters = generateAccountSASQueryParameters;
exports.generateBlobSASQueryParameters = generateBlobSASQueryParameters;
exports.getBlobServiceAccountAudience = getBlobServiceAccountAudience;
exports.isPipelineLike = isPipelineLike;
exports.logger = logger;
exports.newPipeline = newPipeline;
//# sourceMappingURL=index.js.map
