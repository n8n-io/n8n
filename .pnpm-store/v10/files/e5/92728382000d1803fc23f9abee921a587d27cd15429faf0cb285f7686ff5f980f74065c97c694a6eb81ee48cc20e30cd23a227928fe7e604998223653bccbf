/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * HTTP status codes enumeration for agent hosting responses.
 *
 * This enum provides a comprehensive set of HTTP status codes commonly used
 * in agent hosting scenarios, including success, redirection, client error,
 * and server error status codes.
 */
export enum StatusCodes {
  /**
   * The request has succeeded.
   * Standard response for successful HTTP requests.
   */
  OK = 200,

  /**
   * The request has been fulfilled and resulted in a new resource being created.
   * Typically returned when a new agent, conversation, or resource is successfully created.
   */
  CREATED = 201,

  /**
   * Indicates multiple options for the resource that the client may follow.
   * Used when there are multiple possible responses or resource locations available.
   */
  MULTIPLE_CHOICES = 300,

  /**
   * The server cannot or will not process the request due to a client error.
   * Returned when the request contains invalid syntax, malformed parameters,
   * or violates agent hosting protocol requirements.
   */
  BAD_REQUEST = 400,

  /**
   * The request requires user authentication.
   * Indicates that the client must authenticate itself to get the requested response.
   * Common in agent scenarios requiring valid authentication tokens or credentials.
   */
  UNAUTHORIZED = 401,

  /**
   * The requested resource could not be found.
   * Returned when the specified agent, conversation, or endpoint does not exist
   * or is not accessible with the current permissions.
   */
  NOT_FOUND = 404,

  /**
   * The request method is not allowed for the requested resource.
   * Indicates that the HTTP method used is not supported for the specific
   * agent endpoint or resource being accessed.
   */
  METHOD_NOT_ALLOWED = 405,

  /**
   * The request could not be completed due to a conflict with the current state of the resource.
   * Common when attempting to create duplicate resources or when agent state
   * conflicts prevent the operation from completing.
   */
  CONFLICT = 409,

  /**
   * The server does not meet one of the preconditions specified by the client.
   * Returned when conditional requests fail, such as when required headers
   * or agent capabilities are not present or valid.
   */
  PRECONDITION_FAILED = 412,

  /**
   * The client should switch to a different protocol.
   * Used to indicate that the agent hosting service requires a protocol upgrade
   * or different communication method to fulfill the request.
   */
  UPGRADE_REQUIRED = 426,

  /**
   * The server encountered an unexpected condition that prevented it from fulfilling the request.
   * Generic error message when an unexpected agent hosting error occurs
   * and no more specific message is suitable.
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * The server does not support the functionality required to fulfill the request.
   * Returned when the agent hosting service does not implement the requested
   * feature or capability.
   */
  NOT_IMPLEMENTED = 501,

  /**
   * The server received an invalid response from the upstream server.
   * Common when agent hosting services depend on external services
   * that return invalid or malformed responses.
   */
  BAD_GATEWAY = 502,
}
