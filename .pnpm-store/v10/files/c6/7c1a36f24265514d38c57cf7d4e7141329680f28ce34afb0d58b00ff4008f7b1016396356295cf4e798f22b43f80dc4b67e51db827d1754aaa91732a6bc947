/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IGuidGenerator } from "@azure/msal-common/node";
import { v4 as uuidv4 } from "uuid";

export class GuidGenerator implements IGuidGenerator {
    /**
     *
     * RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or pseudo-random numbers.
     * uuidv4 generates guids from cryprtographically-string random
     */
    generateGuid(): string {
        return uuidv4();
    }

    /**
     * verifies if a string is  GUID
     * @param guid
     */
    isGuid(guid: string): boolean {
        const regexGuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regexGuid.test(guid);
    }
}
