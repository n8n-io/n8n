"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCodes = void 0;
/**
 * HTTP status codes enumeration for agent hosting responses.
 *
 * This enum provides a comprehensive set of HTTP status codes commonly used
 * in agent hosting scenarios, including success, redirection, client error,
 * and server error status codes.
 */
var StatusCodes;
(function (StatusCodes) {
    /**
     * The request has succeeded.
     * Standard response for successful HTTP requests.
     */
    StatusCodes[StatusCodes["OK"] = 200] = "OK";
    /**
     * The request has been fulfilled and resulted in a new resource being created.
     * Typically returned when a new agent, conversation, or resource is successfully created.
     */
    StatusCodes[StatusCodes["CREATED"] = 201] = "CREATED";
    /**
     * Indicates multiple options for the resource that the client may follow.
     * Used when there are multiple possible responses or resource locations available.
     */
    StatusCodes[StatusCodes["MULTIPLE_CHOICES"] = 300] = "MULTIPLE_CHOICES";
    /**
     * The server cannot or will not process the request due to a client error.
     * Returned when the request contains invalid syntax, malformed parameters,
     * or violates agent hosting protocol requirements.
     */
    StatusCodes[StatusCodes["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    /**
     * The request requires user authentication.
     * Indicates that the client must authenticate itself to get the requested response.
     * Common in agent scenarios requiring valid authentication tokens or credentials.
     */
    StatusCodes[StatusCodes["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    /**
     * The requested resource could not be found.
     * Returned when the specified agent, conversation, or endpoint does not exist
     * or is not accessible with the current permissions.
     */
    StatusCodes[StatusCodes["NOT_FOUND"] = 404] = "NOT_FOUND";
    /**
     * The request method is not allowed for the requested resource.
     * Indicates that the HTTP method used is not supported for the specific
     * agent endpoint or resource being accessed.
     */
    StatusCodes[StatusCodes["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    /**
     * The request could not be completed due to a conflict with the current state of the resource.
     * Common when attempting to create duplicate resources or when agent state
     * conflicts prevent the operation from completing.
     */
    StatusCodes[StatusCodes["CONFLICT"] = 409] = "CONFLICT";
    /**
     * The server does not meet one of the preconditions specified by the client.
     * Returned when conditional requests fail, such as when required headers
     * or agent capabilities are not present or valid.
     */
    StatusCodes[StatusCodes["PRECONDITION_FAILED"] = 412] = "PRECONDITION_FAILED";
    /**
     * The client should switch to a different protocol.
     * Used to indicate that the agent hosting service requires a protocol upgrade
     * or different communication method to fulfill the request.
     */
    StatusCodes[StatusCodes["UPGRADE_REQUIRED"] = 426] = "UPGRADE_REQUIRED";
    /**
     * The server encountered an unexpected condition that prevented it from fulfilling the request.
     * Generic error message when an unexpected agent hosting error occurs
     * and no more specific message is suitable.
     */
    StatusCodes[StatusCodes["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    /**
     * The server does not support the functionality required to fulfill the request.
     * Returned when the agent hosting service does not implement the requested
     * feature or capability.
     */
    StatusCodes[StatusCodes["NOT_IMPLEMENTED"] = 501] = "NOT_IMPLEMENTED";
    /**
     * The server received an invalid response from the upstream server.
     * Common when agent hosting services depend on external services
     * that return invalid or malformed responses.
     */
    StatusCodes[StatusCodes["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
})(StatusCodes || (exports.StatusCodes = StatusCodes = {}));
//# sourceMappingURL=statusCodes.js.map