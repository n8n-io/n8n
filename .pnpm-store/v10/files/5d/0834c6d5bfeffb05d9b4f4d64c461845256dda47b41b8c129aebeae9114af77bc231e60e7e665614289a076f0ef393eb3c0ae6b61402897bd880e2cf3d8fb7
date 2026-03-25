/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InvalidArgumentError } from "../error/InvalidArgumentError.js";

export function ensureArgumentIsNotNullOrUndefined<T>(
    argName: string,
    argValue: T | undefined | null,
    correlationId?: string
): asserts argValue is T {
    if (argValue === null || argValue === undefined) {
        throw new InvalidArgumentError(argName, correlationId);
    }
}

export function ensureArgumentIsNotEmptyString(
    argName: string,
    argValue: string | undefined,
    correlationId?: string
): void {
    if (!argValue || argValue.trim() === "") {
        throw new InvalidArgumentError(argName, correlationId);
    }
}

export function ensureArgumentIsJSONString(
    argName: string,
    argValue: string,
    correlationId?: string
): void {
    try {
        const parsed = JSON.parse(argValue);
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            throw new InvalidArgumentError(argName, correlationId);
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new InvalidArgumentError(argName, correlationId);
        }
        throw e; // Rethrow unexpected errors
    }
}
