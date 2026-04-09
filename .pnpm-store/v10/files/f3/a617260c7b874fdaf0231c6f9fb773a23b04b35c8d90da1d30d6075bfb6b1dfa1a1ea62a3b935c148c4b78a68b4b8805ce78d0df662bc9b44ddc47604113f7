"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMtlsClient = createMtlsClient;
const undici_1 = require("undici");
function createMtlsClient(parsedPathToFetch, mtlsCerts = {}) {
    const { clientCert, clientKey, caCert } = mtlsCerts;
    const baseUrl = new URL(parsedPathToFetch).origin;
    if (clientCert && clientKey) {
        return new undici_1.Client(baseUrl, {
            connect: {
                key: Buffer.from(clientKey),
                cert: Buffer.from(clientCert),
                ...(caCert && { ca: Buffer.from(caCert) }),
                // Keeping this `false` to have the ability to call different servers in one Arazzo file
                // some of them might not require mTLS.
                rejectUnauthorized: false,
            },
        });
    }
    return undefined;
}
//# sourceMappingURL=create-mtls-client.js.map