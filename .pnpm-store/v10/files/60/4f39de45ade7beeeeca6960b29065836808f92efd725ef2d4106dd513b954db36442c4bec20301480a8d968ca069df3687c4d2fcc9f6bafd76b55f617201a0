/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface InvalidAttribute {
    name: string;
    reason: string;
}

/**
 * Detailed error interface for Microsoft Entra signup errors
 */
export interface ApiErrorResponse {
    error: string;
    error_description: string;
    correlation_id: string;
    error_codes?: number[];
    suberror?: string;
    continuation_token?: string;
    timestamp?: string;
    trace_id?: string;
    required_attributes?: Array<UserAttribute>;
    invalid_attributes?: Array<UserAttribute>;
}

export interface UserAttribute {
    name: string;
    type?: string;
    required?: boolean;
    options?: UserAttributeOption;
}

export interface UserAttributeOption {
    regex?: string;
}
