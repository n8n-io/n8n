/*
 * mockserver
 * http://mock-server.com
 *
 * Copyright (c) 2014 James Bloom
 * Licensed under the Apache License, Version 2.0
 */

/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type Expectations = Expectation | Expectation[];

export type Expectation = {
  id?: string;
  priority?: number;
  httpRequest?: RequestDefinition;
  openAPIDefinition?: OpenAPIDefinition;
  httpResponse?: HttpResponse;
  httpResponseTemplate?: HttpTemplate;
  httpResponseClassCallback?: HttpClassCallback;
  httpResponseObjectCallback?: HttpObjectCallback;
  httpForward?: HttpForward;
  httpForwardTemplate?: HttpTemplate;
  httpForwardClassCallback?: HttpClassCallback;
  httpForwardObjectCallback?: HttpObjectCallback;
  httpOverrideForwardedRequest?: HttpOverrideForwardedRequest;
  httpError?: HttpError;
  times?: Times;
  timeToLive?: TimeToLive;
};

export interface ExpectationId {
  id: string;
}

export type OpenAPIExpectations = OpenAPIExpectation | OpenAPIExpectation[];

export interface OpenAPIExpectation {
  specUrlOrPayload: string | object;
  operationsAndResponses?: Record<string, string>;
}

export type RequestDefinition = HttpRequest | OpenAPIDefinition;

export interface HttpRequest {
  secure?: boolean;
  keepAlive?: boolean;
  method?: StringOrJsonSchema;
  path?: StringOrJsonSchema;
  pathParameters?: KeyToMultiValue;
  queryStringParameters?: KeyToMultiValue;

  /** request body matcher */
  body?: Body;
  headers?: KeyToMultiValue;
  cookies?: KeyToValue;
  socketAddress?: SocketAddress;
}

export interface OpenAPIDefinition {
  specUrlOrPayload?: string;
  operationId?: string;
}

export interface HttpResponse {
  /** response delay */
  delay?: Delay;

  /** response body */
  body?: BodyWithContentType;
  cookies?: KeyToValue;

  /** connection options */
  connectionOptions?: ConnectionOptions;
  headers?: KeyToMultiValue;
  statusCode?: number;
  reasonPhrase?: string;
}

export interface HttpTemplate {
  /** response delay */
  delay?: Delay;
  templateType?: "VELOCITY" | "JAVASCRIPT" | "MUSTACHE";
  template?: string;
}

export interface HttpForward {
  /** response delay */
  delay?: Delay;
  host?: string;
  port?: number;
  scheme?: "HTTP" | "HTTPS";
}

export interface HttpClassCallback {
  /** response delay */
  delay?: Delay;
  callbackClass?: string;
}

export interface HttpObjectCallback {
  /** response delay */
  delay?: Delay;
  clientId?: string;
  responseCallback?: boolean;
}

export type HttpOverrideForwardedRequest =
  | {
      delay?: Delay;
      requestOverride?: HttpRequest;
      requestModifier?: {
        path?: { regex?: string; substitution?: string };
        queryStringParameters?: { add?: KeyToMultiValue; replace?: KeyToMultiValue; remove?: string[] };
        headers?: { add?: KeyToMultiValue; replace?: KeyToMultiValue; remove?: string[] };
        cookies?: { add?: KeyToValue; replace?: KeyToValue; remove?: string[] };
      };
      responseOverride?: HttpResponse;
      responseModifier?: {
        headers?: { add?: KeyToMultiValue; replace?: KeyToMultiValue; remove?: string[] };
        cookies?: { add?: KeyToValue; replace?: KeyToValue; remove?: string[] };
      };
    }
  | { delay?: Delay; httpRequest?: HttpRequest; httpResponse?: HttpResponse };

export interface HttpError {
  /** response delay */
  delay?: Delay;
  dropConnection?: boolean;
  responseBytes?: string;
}

export interface Times {
  remainingTimes?: number;
  unlimited?: boolean;
}

export interface TimeToLive {
  timeUnit?: "DAYS" | "HOURS" | "MINUTES" | "SECONDS" | "MILLISECONDS" | "MICROSECONDS" | "NANOSECONDS";
  timeToLive?: number;
  unlimited?: boolean;
}

export type KeyToMultiValue =
  | { name?: string; values?: string[] }[]
  | { keyMatchStyle?: "MATCHING_KEY" | "SUB_SET"; [key: string]: any };

export type KeyToValue = { name?: string; value?: string }[] | Record<string, any>;

export type StringOrJsonSchema =
  | string
  | {
      not?: boolean;
      optional?: boolean;
      value?: string;
      schema?: any;
      parameterStyle?:
        | "SIMPLE"
        | "SIMPLE_EXPLODED"
        | "LABEL"
        | "LABEL_EXPLODED"
        | "MATRIX"
        | "MATRIX_EXPLODED"
        | "FORM_EXPLODED"
        | "FORM"
        | "SPACE_DELIMITED_EXPLODED"
        | "SPACE_DELIMITED"
        | "PIPE_DELIMITED_EXPLODED"
        | "PIPE_DELIMITED"
        | "DEEP_OBJECT";
    };

export interface SocketAddress {
  host?: string;
  port?: number;
  scheme?: "HTTP" | "HTTPS";
}

/**
 * request body matcher
 */
export type Body =
  | { not?: boolean; type?: "BINARY"; base64Bytes?: string; contentType?: string }
  | { not?: boolean; type?: "JSON"; json?: string; contentType?: string; matchType?: "STRICT" | "ONLY_MATCHING_FIELDS" }
  | Record<string, any>
  | { not?: boolean; type?: "JSON_SCHEMA"; jsonSchema?: any }
  | { not?: boolean; type?: "JSON_PATH"; jsonPath?: string }
  | { not?: boolean; type?: "PARAMETERS"; parameters?: KeyToMultiValue }
  | { not?: boolean; type?: "REGEX"; regex?: string }
  | { not?: boolean; type?: "STRING"; string?: string; contentType?: string; subString?: boolean }
  | string
  | { not?: boolean; type?: "XML"; xml?: string; contentType?: string }
  | { not?: boolean; type?: "XML_SCHEMA"; xmlSchema?: string }
  | { not?: boolean; type?: "XPATH"; xpath?: string }
  | ({ not?: boolean; type?: "BINARY"; base64Bytes?: string; contentType?: string } & {
      not?: boolean;
      type?: "JSON";
      json?: string;
      contentType?: string;
      matchType?: "STRICT" | "ONLY_MATCHING_FIELDS";
    } & Record<string, any> & { not?: boolean; type?: "JSON_SCHEMA"; jsonSchema?: any } & {
        not?: boolean;
        type?: "JSON_PATH";
        jsonPath?: string;
      } & { not?: boolean; type?: "PARAMETERS"; parameters?: KeyToMultiValue } & {
        not?: boolean;
        type?: "REGEX";
        regex?: string;
      } & { not?: boolean; type?: "STRING"; string?: string; contentType?: string; subString?: boolean } & {
        not?: boolean;
        type?: "XML";
        xml?: string;
        contentType?: string;
      } & { not?: boolean; type?: "XML_SCHEMA"; xmlSchema?: string } & {
        not?: boolean;
        type?: "XPATH";
        xpath?: string;
      });

/**
 * response body
 */
export type BodyWithContentType =
  | { not?: boolean; type?: "BINARY"; base64Bytes?: string; contentType?: string }
  | { not?: boolean; type?: "JSON"; json?: string; contentType?: string }
  | Record<string, any>
  | { not?: boolean; type?: "STRING"; string?: string; contentType?: string }
  | string
  | { not?: boolean; type?: "XML"; xml?: string; contentType?: string }
  | ({ not?: boolean; type?: "BINARY"; base64Bytes?: string; contentType?: string } & {
      not?: boolean;
      type?: "JSON";
      json?: string;
      contentType?: string;
    } & Record<string, any> & { not?: boolean; type?: "STRING"; string?: string; contentType?: string } & {
        not?: boolean;
        type?: "XML";
        xml?: string;
        contentType?: string;
      });

/**
 * response delay
 */
export interface Delay {
  timeUnit?: string;
  value?: number;
}

/**
 * connection options
 */
export interface ConnectionOptions {
  suppressContentLengthHeader?: boolean;
  contentLengthHeaderOverride?: number;
  suppressConnectionHeader?: boolean;
  chunkSize?: number;
  keepAliveOverride?: boolean;
  closeSocket?: boolean;

  /** response delay */
  closeSocketDelay?: Delay;
}

/**
 * verification
 */
export type Verification = {
  expectationId?: ExpectationId;
  httpRequest?: RequestDefinition;
  times?: VerificationTimes;
  maximumNumberOfRequestToReturnInVerificationFailure?: number;
};

/**
 * number of request to verify
 */
export interface VerificationTimes {
  atLeast?: number;
  atMost?: number;
}

/**
 * verification sequence
 */
export type VerificationSequence = {
  expectationIds?: ExpectationId[];
  httpRequests?: RequestDefinition[];
  maximumNumberOfRequestToReturnInVerificationFailure?: number;
};

/**
 * list of ports
 */
export interface Ports {
  ports?: number[];
}

/**
 * verification sequence
 */
export type HttpRequestAndHttpResponse = {
    httpRequest?: HttpRequest[];
    httpResponse?: HttpResponse[];
    timestamp?: string;
};

export type ClearUpdatePayload = RequestDefinition | ExpectationId;

export interface RetrieveUpdateParams {
  /** changes response format, default if not specificed is "json", supported values are "java", "json", "log_entries" */
  format?: "java" | "json" | "log_entries";

  /** specifies the type of object that is retrieve, default if not specified is "requests", supported values are "logs", "requests", "recorded_expectations", "active_expectations" */
  type?: "logs" | "requests" | "request_responses" | "recorded_expectations" | "active_expectations";
}
