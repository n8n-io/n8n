/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { JwtPayload } from 'jsonwebtoken';
/**
 * Represents a Node.js HTTP Request, including the minimal set of use properties.
 * Compatible with Restify, Express, and Node.js core http.
 */
export interface Request<Body extends Record<string, unknown> = Record<string, unknown>, Headers extends Record<string, string[] | string | undefined> = Record<string, string[] | string | undefined>> {
    /**
     * The body of the HTTP request, containing parsed data.
     */
    body?: Body;
    /**
     * The headers of the HTTP request, represented as key-value pairs.
     */
    headers: Headers;
    /**
     * The HTTP method of the request (e.g., GET, POST, PUT, DELETE).
     */
    method?: string;
    /**
     * The user information extracted from a JWT payload, if available.
     */
    user?: JwtPayload;
}
