/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { v4 } from 'uuid';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class GuidGenerator {
    /**
     *
     * RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or pseudo-random numbers.
     * uuidv4 generates guids from cryprtographically-string random
     */
    generateGuid() {
        return v4();
    }
    /**
     * verifies if a string is  GUID
     * @param guid
     */
    isGuid(guid) {
        const regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regexGuid.test(guid);
    }
}

export { GuidGenerator };
//# sourceMappingURL=GuidGenerator.mjs.map
