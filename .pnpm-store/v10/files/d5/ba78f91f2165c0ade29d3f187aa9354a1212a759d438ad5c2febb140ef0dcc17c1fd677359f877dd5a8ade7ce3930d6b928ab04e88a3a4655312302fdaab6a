/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AuthConfiguration } from './authConfiguration';
import { Response, NextFunction } from 'express';
import { Request } from './request';
/**
 * Middleware to authorize JWT tokens.
 * @param authConfig The authentication configuration.
 * @returns An Express middleware function.
 */
export declare const authorizeJWT: (authConfig: AuthConfiguration) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
