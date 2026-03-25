"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeys = getApiKeys;
const path_1 = require("path");
const os_1 = require("os");
const fs_1 = require("fs");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const redocly_1 = require("@redocly/openapi-core/lib/redocly");
function readCredentialsFile(credentialsPath) {
    return (0, fs_1.existsSync)(credentialsPath) ? JSON.parse((0, fs_1.readFileSync)(credentialsPath, 'utf-8')) : {};
}
function getApiKeys(domain) {
    const apiKey = process.env.REDOCLY_AUTHORIZATION;
    if (apiKey) {
        return apiKey;
    }
    const credentialsPath = (0, path_1.resolve)((0, os_1.homedir)(), redocly_1.TOKEN_FILENAME);
    const credentials = readCredentialsFile(credentialsPath);
    if ((0, utils_1.isNotEmptyObject)(credentials) && credentials[domain]) {
        return credentials[domain];
    }
    throw new Error('No api key provided, please use environment variable REDOCLY_AUTHORIZATION.');
}
