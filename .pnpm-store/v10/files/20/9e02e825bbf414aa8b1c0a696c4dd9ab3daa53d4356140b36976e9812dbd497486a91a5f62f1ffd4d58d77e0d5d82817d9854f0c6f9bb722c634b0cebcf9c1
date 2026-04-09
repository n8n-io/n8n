"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMtlsCertificates = resolveMtlsCertificates;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
function resolveMtlsCertificates(mtlsCertificates = {}, arazzoFilePath) {
    const { clientCert, clientKey, caCert } = mtlsCertificates;
    return {
        clientCert: resolveCertificate(clientCert, arazzoFilePath),
        clientKey: resolveCertificate(clientKey, arazzoFilePath),
        caCert: resolveCertificate(caCert, arazzoFilePath),
    };
}
function resolveCertificate(cert, arazzoFilePath) {
    if (!cert)
        return undefined;
    try {
        // Check if the string looks like a certificate content
        const isCertContent = cert.includes('-----BEGIN') && cert.includes('-----END');
        if (!isCertContent) {
            const currentArazzoFileFolder = path.dirname(arazzoFilePath);
            const certPath = path.resolve(currentArazzoFileFolder, cert);
            // If not a certificate content, treat as file path
            fs.accessSync(certPath, fs.constants.R_OK);
            return fs.readFileSync(certPath, 'utf-8');
        }
        // Return the certificate content as-is
        return formatCertificate(cert);
    }
    catch (error) {
        throw new Error(`Failed to read certificate: ${error.message}`);
    }
}
function formatCertificate(cert) {
    // Split the content into header, body, and footer
    const matches = cert.match(/^(-----BEGIN[^-]+-----)\r?\n([A-Za-z0-9+/=\r\n\t ]+)\r?\n(-----END[^-]+-----)/);
    if (!matches) {
        throw new Error('Invalid certificate format');
    }
    const [, header, body, footer] = matches;
    // Format the body with proper line breaks (64 characters per line)
    const formattedBody = body
        .replace(/\s+/g, '') // Remove all whitespace
        .match(/.{1,64}/g) // Split into 64-character chunks
        ?.join('\n') || ''; // Join with newlines
    // Reconstruct the properly formatted certificate
    return `${header}\n${formattedBody}\n${footer}`;
}
//# sourceMappingURL=resolve-mtls-certificates.js.map