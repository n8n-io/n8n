"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromInstanceMetadata = void 0;
const client_1 = require("@aws-sdk/core/client");
const credential_provider_imds_1 = require("@smithy/credential-provider-imds");
const fromInstanceMetadata = (init) => {
    init?.logger?.debug("@smithy/credential-provider-imds", "fromInstanceMetadata");
    return async () => (0, credential_provider_imds_1.fromInstanceMetadata)(init)().then((creds) => (0, client_1.setCredentialFeature)(creds, "CREDENTIALS_IMDS", "0"));
};
exports.fromInstanceMetadata = fromInstanceMetadata;
