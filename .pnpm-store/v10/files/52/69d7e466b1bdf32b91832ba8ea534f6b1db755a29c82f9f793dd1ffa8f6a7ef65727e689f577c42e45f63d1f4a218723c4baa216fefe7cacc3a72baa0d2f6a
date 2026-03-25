/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type EncryptedData = {
    id: string;
    nonce: string;
    data: string;
    lastUpdatedAt: string;
};

export function isEncrypted(data: object): data is EncryptedData {
    return (
        data.hasOwnProperty("id") &&
        data.hasOwnProperty("nonce") &&
        data.hasOwnProperty("data")
    );
}
