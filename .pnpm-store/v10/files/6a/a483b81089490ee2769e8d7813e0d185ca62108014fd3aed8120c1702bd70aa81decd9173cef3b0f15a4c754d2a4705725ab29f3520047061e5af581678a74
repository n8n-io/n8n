/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { HttpStatus, Logger } from '@azure/msal-common/node';
import { ProxyStatus, Constants, HttpMethod } from '../utils/Constants.mjs';
import { NetworkUtils } from '../utils/NetworkUtils.mjs';
import { name, version } from '../packageMetadata.mjs';
import http from 'http';
import https from 'https';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements the API for network requests.
 */
class HttpClient {
    constructor(proxyUrl, customAgentOptions, loggerOptions) {
        this.networkRequestViaProxy = (httpMethod, destinationUrlString, options, timeout) => {
            const destinationUrl = new URL(destinationUrlString);
            const proxyUrl = new URL(this.proxyUrl);
            // "method: connect" must be used to establish a connection to the proxy
            const headers = options?.headers || {};
            const tunnelRequestOptions = {
                host: proxyUrl.hostname,
                port: proxyUrl.port,
                method: "CONNECT",
                path: destinationUrl.hostname,
                headers: headers,
            };
            if (this.customAgentOptions &&
                Object.keys(this.customAgentOptions).length) {
                tunnelRequestOptions.agent = new http.Agent(this.customAgentOptions);
            }
            // compose a request string for the socket
            let postRequestStringContent = "";
            if (httpMethod === HttpMethod.POST) {
                const body = options?.body || "";
                postRequestStringContent =
                    "Content-Type: application/x-www-form-urlencoded\r\n" +
                        `Content-Length: ${body.length}\r\n` +
                        `\r\n${body}`;
            }
            else {
                // optional timeout is only for get requests (regionDiscovery, for example)
                if (timeout) {
                    tunnelRequestOptions.timeout = timeout;
                }
            }
            const outgoingRequestString = `${httpMethod.toUpperCase()} ${destinationUrl.href} HTTP/1.1\r\n` +
                `Host: ${destinationUrl.host}\r\n` +
                "Connection: close\r\n" +
                postRequestStringContent +
                "\r\n";
            return new Promise((resolve, reject) => {
                const request = http.request(tunnelRequestOptions);
                if (timeout) {
                    request.on("timeout", () => {
                        this.logUrlWithPiiAwareness(`Request timeout after ${timeout}ms for URL`, destinationUrlString);
                        request.destroy();
                        reject(new Error(`Request time out after ${timeout}ms`));
                    });
                }
                request.end();
                // establish connection to the proxy
                request.on("connect", (response, socket) => {
                    const proxyStatusCode = response?.statusCode || ProxyStatus.SERVER_ERROR;
                    if (proxyStatusCode < ProxyStatus.SUCCESS_RANGE_START ||
                        proxyStatusCode > ProxyStatus.SUCCESS_RANGE_END) {
                        request.destroy();
                        socket.destroy();
                        reject(new Error(`Error connecting to proxy. Http status code: ${response.statusCode}. Http status message: ${response?.statusMessage || "Unknown"}`));
                    }
                    // make a request over an HTTP tunnel
                    socket.write(outgoingRequestString);
                    const data = [];
                    socket.on("data", (chunk) => {
                        data.push(chunk);
                    });
                    socket.on("end", () => {
                        // combine all received buffer streams into one buffer, and then into a string
                        const dataString = Buffer.concat([...data]).toString();
                        // separate each line into it's own entry in an arry
                        const dataStringArray = dataString.split("\r\n");
                        // the first entry will contain the statusCode and statusMessage
                        const httpStatusCode = parseInt(dataStringArray[0].split(" ")[1]);
                        // remove "HTTP/1.1" and the status code to get the status message
                        const statusMessage = dataStringArray[0]
                            .split(" ")
                            .slice(2)
                            .join(" ");
                        // the last entry will contain the body
                        const body = dataStringArray[dataStringArray.length - 1];
                        // everything in between the first and last entries are the headers
                        const headersArray = dataStringArray.slice(1, dataStringArray.length - 2);
                        // build an object out of all the headers
                        const entries = new Map();
                        headersArray.forEach((header) => {
                            /**
                             * the header might look like "Content-Length: 1531", but that is just a string
                             * it needs to be converted to a key/value pair
                             * split the string at the first instance of ":"
                             * there may be more than one ":" if the value of the header is supposed to be a JSON object
                             */
                            const headerKeyValue = header.split(new RegExp(/:\s(.*)/s));
                            const headerKey = headerKeyValue[0];
                            let headerValue = headerKeyValue[1];
                            // check if the value of the header is supposed to be a JSON object
                            try {
                                const object = JSON.parse(headerValue);
                                // if it is, then convert it from a string to a JSON object
                                if (object && typeof object === "object") {
                                    headerValue = object;
                                }
                            }
                            catch (e) {
                                // otherwise, leave it as a string
                            }
                            entries.set(headerKey, headerValue);
                        });
                        const headers = Object.fromEntries(entries);
                        const parsedHeaders = headers;
                        const networkResponse = NetworkUtils.getNetworkResponse(parsedHeaders, this.parseBody(httpStatusCode, statusMessage, parsedHeaders, body), httpStatusCode);
                        if (this.shouldDestroyRequest(httpStatusCode, networkResponse)) {
                            request.destroy();
                        }
                        resolve(networkResponse);
                    });
                    socket.on("error", (chunk) => {
                        request.destroy();
                        socket.destroy();
                        reject(new Error(chunk.toString()));
                    });
                });
                request.on("error", (chunk) => {
                    this.logger.error(`HttpClient - Proxy request error: ${chunk.toString()}`, "");
                    this.logUrlWithPiiAwareness("Destination URL", destinationUrlString);
                    this.logUrlWithPiiAwareness("Proxy URL", this.proxyUrl);
                    this.logger.error(`HttpClient - Method: ${httpMethod}`, "");
                    this.logger.errorPii(`HttpClient - Headers: ${JSON.stringify(headers)}`, "");
                    request.destroy();
                    reject(new Error(chunk.toString()));
                });
            });
        };
        this.networkRequestViaHttps = (httpMethod, urlString, options, timeout) => {
            const isPostRequest = httpMethod === HttpMethod.POST;
            const body = options?.body || "";
            const url = new URL(urlString);
            const headers = options?.headers || {};
            const customOptions = {
                method: httpMethod,
                headers: headers,
                ...NetworkUtils.urlToHttpOptions(url),
            };
            if (this.customAgentOptions &&
                Object.keys(this.customAgentOptions).length) {
                customOptions.agent = new https.Agent(this.customAgentOptions);
            }
            if (isPostRequest) {
                // needed for post request to work
                customOptions.headers = {
                    ...customOptions.headers,
                    "Content-Length": body.length,
                };
            }
            else {
                // optional timeout is only for get requests (regionDiscovery, for example)
                if (timeout) {
                    customOptions.timeout = timeout;
                }
            }
            return new Promise((resolve, reject) => {
                let request;
                // managed identity sources use http instead of https
                if (customOptions.protocol === "http:") {
                    request = http.request(customOptions);
                }
                else {
                    request = https.request(customOptions);
                }
                if (isPostRequest) {
                    request.write(body);
                }
                if (timeout) {
                    request.on("timeout", () => {
                        this.logUrlWithPiiAwareness(`HTTPS request timeout after ${timeout}ms for URL`, urlString);
                        request.destroy();
                        reject(new Error(`Request time out after ${timeout}ms`));
                    });
                }
                request.end();
                request.on("response", (response) => {
                    const headers = response.headers;
                    const statusCode = response.statusCode;
                    const statusMessage = response.statusMessage;
                    const data = [];
                    response.on("data", (chunk) => {
                        data.push(chunk);
                    });
                    response.on("end", () => {
                        // combine all received buffer streams into one buffer, and then into a string
                        const body = Buffer.concat([...data]).toString();
                        const parsedHeaders = headers;
                        const networkResponse = NetworkUtils.getNetworkResponse(parsedHeaders, this.parseBody(statusCode, statusMessage, parsedHeaders, body), statusCode);
                        if (this.shouldDestroyRequest(statusCode, networkResponse)) {
                            request.destroy();
                        }
                        resolve(networkResponse);
                    });
                });
                request.on("error", (chunk) => {
                    this.logger.error(`HttpClient - HTTPS request error: ${chunk.toString()}`, "");
                    this.logUrlWithPiiAwareness("URL", urlString);
                    this.logger.error(`HttpClient - Method: ${httpMethod}`, "");
                    this.logger.errorPii(`HttpClient - Headers: ${JSON.stringify(headers)}`, "");
                    request.destroy();
                    reject(new Error(chunk.toString()));
                });
            });
        };
        /**
         * Check if extra parsing is needed on the repsonse from the server
         * @param statusCode {number} the status code of the response from the server
         * @param statusMessage {string | undefined} the status message of the response from the server
         * @param headers {Record<string, string>} the headers of the response from the server
         * @param body {string} the body from the response of the server
         * @returns {Object} JSON parsed body or error object
         */
        this.parseBody = (statusCode, statusMessage, headers, body) => {
            /*
             * Informational responses (100 – 199)
             * Successful responses (200 – 299)
             * Redirection messages (300 – 399)
             * Client error responses (400 – 499)
             * Server error responses (500 – 599)
             */
            let parsedBody;
            try {
                parsedBody = JSON.parse(body);
            }
            catch (error) {
                let errorType;
                let errorDescriptionHelper;
                if (statusCode >= HttpStatus.CLIENT_ERROR_RANGE_START &&
                    statusCode <= HttpStatus.CLIENT_ERROR_RANGE_END) {
                    errorType = "client_error";
                    errorDescriptionHelper = "A client";
                }
                else if (statusCode >= HttpStatus.SERVER_ERROR_RANGE_START &&
                    statusCode <= HttpStatus.SERVER_ERROR_RANGE_END) {
                    errorType = "server_error";
                    errorDescriptionHelper = "A server";
                }
                else {
                    errorType = "unknown_error";
                    errorDescriptionHelper = "An unknown";
                }
                parsedBody = {
                    error: errorType,
                    error_description: `${errorDescriptionHelper} error occured.\nHttp status code: ${statusCode}\nHttp status message: ${statusMessage || "Unknown"}\nHeaders: ${JSON.stringify(headers)}`,
                };
            }
            return parsedBody;
        };
        /**
         * Helper function to log a formatted message containing URLs, with PII-aware sanitization
         * @param label {string} the label for the log message
         * @param urlString {string} the URL to log
         */
        this.logUrlWithPiiAwareness = (label, urlString) => {
            if (this.isPiiEnabled) {
                this.logger.errorPii(`HttpClient - ${label}: ${urlString}`, "");
            }
            else {
                let urlHelper;
                try {
                    const url = new URL(urlString);
                    urlHelper = `${url.protocol}//${url.host}${url.pathname}`;
                }
                catch {
                    urlHelper = urlString.split("?")[0] || "unknown";
                }
                this.logger.error(`HttpClient - ${label}: ${urlHelper} [Enable PII logging to see additional details]`, "");
            }
        };
        /**
         * Helper function to determine if a request should be destroyed based on status code and response body.
         * Checks if the response is an error and not part of the device code flow (authorization_pending).
         * @param statusCode {number} the status code of the response
         * @param networkResponse {NetworkResponse<T>} the network response object
         * @returns {boolean} true if the request should be destroyed, false otherwise
         */
        this.shouldDestroyRequest = (statusCode, networkResponse) => {
            return ((statusCode < HttpStatus.SUCCESS_RANGE_START ||
                statusCode > HttpStatus.SUCCESS_RANGE_END) &&
                // do not destroy the request for the device code flow
                !(networkResponse.body &&
                    typeof networkResponse.body === "object" &&
                    "error" in networkResponse.body &&
                    networkResponse.body.error ===
                        Constants.AUTHORIZATION_PENDING));
        };
        this.proxyUrl = proxyUrl || "";
        this.customAgentOptions = customAgentOptions || {};
        this.logger = new Logger(loggerOptions || {}, name, version);
        this.isPiiEnabled = this.logger.isPiiLoggingEnabled();
    }
    /**
     * Http Get request
     * @param url
     * @param options
     */
    async sendGetRequestAsync(url, options, timeout) {
        if (this.proxyUrl) {
            return this.networkRequestViaProxy(HttpMethod.GET, url, options, timeout);
        }
        else {
            return this.networkRequestViaHttps(HttpMethod.GET, url, options, timeout);
        }
    }
    /**
     * Http Post request
     * @param url
     * @param options
     */
    async sendPostRequestAsync(url, options) {
        if (this.proxyUrl) {
            return this.networkRequestViaProxy(HttpMethod.POST, url, options);
        }
        else {
            return this.networkRequestViaHttps(HttpMethod.POST, url, options);
        }
    }
}

export { HttpClient };
//# sourceMappingURL=HttpClient.mjs.map
