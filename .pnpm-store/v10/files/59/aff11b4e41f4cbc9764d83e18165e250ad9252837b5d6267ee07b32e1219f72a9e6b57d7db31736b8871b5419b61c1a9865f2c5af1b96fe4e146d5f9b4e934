"use strict";
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentials = getCredentials;
const path = require("path");
const fs = require("fs");
const util_1 = require("util");
const errorWithCode_1 = require("./errorWithCode");
const readFile = fs.readFile
    ? (0, util_1.promisify)(fs.readFile)
    : async () => {
        // if running in the web-browser, fs.readFile may not have been shimmed.
        throw new errorWithCode_1.ErrorWithCode('use key rather than keyFile.', 'MISSING_CREDENTIALS');
    };
var ExtensionFiles;
(function (ExtensionFiles) {
    ExtensionFiles["JSON"] = ".json";
    ExtensionFiles["DER"] = ".der";
    ExtensionFiles["CRT"] = ".crt";
    ExtensionFiles["PEM"] = ".pem";
    ExtensionFiles["P12"] = ".p12";
    ExtensionFiles["PFX"] = ".pfx";
})(ExtensionFiles || (ExtensionFiles = {}));
/**
 * Provides credentials from a JSON key file.
 */
class JsonCredentialsProvider {
    keyFilePath;
    constructor(keyFilePath) {
        this.keyFilePath = keyFilePath;
    }
    /**
     * Reads a JSON key file and extracts the private key and client email.
     * @returns A promise that resolves with the credentials.
     */
    async getCredentials() {
        const key = await readFile(this.keyFilePath, 'utf8');
        let body;
        try {
            body = JSON.parse(key);
        }
        catch (error) {
            const err = error;
            throw new Error(`Invalid JSON key file: ${err.message}`);
        }
        const privateKey = body.private_key;
        const clientEmail = body.client_email;
        if (!privateKey || !clientEmail) {
            throw new errorWithCode_1.ErrorWithCode('private_key and client_email are required.', 'MISSING_CREDENTIALS');
        }
        return { privateKey, clientEmail };
    }
}
/**
 * Provides credentials from a PEM-like key file.
 */
class PemCredentialsProvider {
    keyFilePath;
    constructor(keyFilePath) {
        this.keyFilePath = keyFilePath;
    }
    /**
     * Reads a PEM-like key file.
     * @returns A promise that resolves with the private key.
     */
    async getCredentials() {
        const privateKey = await readFile(this.keyFilePath, 'utf8');
        return { privateKey };
    }
}
/**
 * Handles unsupported P12/PFX certificate types.
 */
class P12CredentialsProvider {
    /**
     * Throws an error as P12/PFX certificates are not supported.
     * @returns A promise that rejects with an error.
     */
    async getCredentials() {
        throw new errorWithCode_1.ErrorWithCode('*.p12 certificates are not supported after v6.1.2. ' +
            'Consider utilizing *.json format or converting *.p12 to *.pem using the OpenSSL CLI.', 'UNKNOWN_CERTIFICATE_TYPE');
    }
}
/**
 * Factory class to create the appropriate credentials provider.
 */
class CredentialsProviderFactory {
    /**
     * Creates a credential provider based on the key file extension.
     * @param keyFilePath The path to the key file.
     * @returns An instance of a class that implements ICredentialsProvider.
     */
    static create(keyFilePath) {
        const keyFileExtension = path.extname(keyFilePath);
        switch (keyFileExtension) {
            case ExtensionFiles.JSON:
                return new JsonCredentialsProvider(keyFilePath);
            case ExtensionFiles.DER:
            case ExtensionFiles.CRT:
            case ExtensionFiles.PEM:
                return new PemCredentialsProvider(keyFilePath);
            case ExtensionFiles.P12:
            case ExtensionFiles.PFX:
                return new P12CredentialsProvider();
            default:
                throw new errorWithCode_1.ErrorWithCode('Unknown certificate type. Type is determined based on file extension. ' +
                    'Current supported extensions are *.json, and *.pem.', 'UNKNOWN_CERTIFICATE_TYPE');
        }
    }
}
/**
 * Given a keyFile, extract the key and client email if available
 * @param keyFile Path to a json, pem, or p12 file that contains the key.
 * @returns an object with privateKey and clientEmail properties
 */
async function getCredentials(keyFilePath) {
    const provider = CredentialsProviderFactory.create(keyFilePath);
    return provider.getCredentials();
}
//# sourceMappingURL=getCredentials.js.map