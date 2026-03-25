// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export function generateUUID() {
    let uuid = "";
    for (let i = 0; i < 32; i++) {
        // Generate a random number between 0 and 15
        const randomNumber = Math.floor(Math.random() * 16);
        // Set the UUID version to 4 in the 13th position
        if (i === 12) {
            uuid += "4";
        }
        else if (i === 16) {
            // Set the UUID variant to "10" in the 17th position
            uuid += (randomNumber & 0x3) | 0x8;
        }
        else {
            // Add a random hexadecimal digit to the UUID string
            uuid += randomNumber.toString(16);
        }
        // Add hyphens to the UUID string at the appropriate positions
        if (i === 7 || i === 11 || i === 15 || i === 19) {
            uuid += "-";
        }
    }
    return uuid;
}
/**
 * Generated Universally Unique Identifier
 *
 * @returns RFC4122 v4 UUID.
 */
export function randomUUID() {
    return generateUUID();
}
//# sourceMappingURL=uuidUtils.common.js.map