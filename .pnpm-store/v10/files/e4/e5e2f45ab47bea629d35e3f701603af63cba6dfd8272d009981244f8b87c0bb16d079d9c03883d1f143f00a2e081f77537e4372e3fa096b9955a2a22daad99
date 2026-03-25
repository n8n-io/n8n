"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtlpGrpcExporterTransport = exports.GrpcExporterTransport = exports.createEmptyMetadata = exports.createSslCredentials = exports.createInsecureCredentials = void 0;
// values taken from '@grpc/grpc-js` so that we don't need to require/import it.
const GRPC_COMPRESSION_NONE = 0;
const GRPC_COMPRESSION_GZIP = 2;
function toGrpcCompression(compression) {
    return compression === 'gzip' ? GRPC_COMPRESSION_GZIP : GRPC_COMPRESSION_NONE;
}
function createInsecureCredentials() {
    // Lazy-load so that we don't need to require/import '@grpc/grpc-js' before it can be wrapped by instrumentation.
    const { credentials,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
     } = require('@grpc/grpc-js');
    return credentials.createInsecure();
}
exports.createInsecureCredentials = createInsecureCredentials;
function createSslCredentials(rootCert, privateKey, certChain) {
    // Lazy-load so that we don't need to require/import '@grpc/grpc-js' before it can be wrapped by instrumentation.
    const { credentials,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
     } = require('@grpc/grpc-js');
    return credentials.createSsl(rootCert, privateKey, certChain);
}
exports.createSslCredentials = createSslCredentials;
function createEmptyMetadata() {
    // Lazy-load so that we don't need to require/import '@grpc/grpc-js' before it can be wrapped by instrumentation.
    const { Metadata,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
     } = require('@grpc/grpc-js');
    return new Metadata();
}
exports.createEmptyMetadata = createEmptyMetadata;
class GrpcExporterTransport {
    _parameters;
    _client;
    _metadata;
    constructor(_parameters) {
        this._parameters = _parameters;
    }
    shutdown() {
        this._client?.close();
    }
    send(data, timeoutMillis) {
        // We need to make a for gRPC
        const buffer = Buffer.from(data);
        if (this._client == null) {
            // Lazy require to ensure that grpc is not loaded before instrumentations can wrap it
            const { createServiceClientConstructor,
            // eslint-disable-next-line @typescript-eslint/no-require-imports
             } = require('./create-service-client-constructor');
            try {
                this._metadata = this._parameters.metadata();
            }
            catch (error) {
                return Promise.resolve({
                    status: 'failure',
                    error: error,
                });
            }
            const clientConstructor = createServiceClientConstructor(this._parameters.grpcPath, this._parameters.grpcName);
            try {
                this._client = new clientConstructor(this._parameters.address, this._parameters.credentials(), {
                    'grpc.default_compression_algorithm': toGrpcCompression(this._parameters.compression),
                });
            }
            catch (error) {
                return Promise.resolve({
                    status: 'failure',
                    error: error,
                });
            }
        }
        return new Promise(resolve => {
            const deadline = Date.now() + timeoutMillis;
            // this should never happen
            if (this._metadata == null) {
                return resolve({
                    error: new Error('metadata was null'),
                    status: 'failure',
                });
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore The gRPC client constructor is created on runtime, so we don't have any types for the resulting client.
            this._client.export(buffer, this._metadata, { deadline: deadline }, (err, response) => {
                if (err) {
                    resolve({
                        status: 'failure',
                        error: err,
                    });
                }
                else {
                    resolve({
                        data: response,
                        status: 'success',
                    });
                }
            });
        });
    }
}
exports.GrpcExporterTransport = GrpcExporterTransport;
function createOtlpGrpcExporterTransport(options) {
    return new GrpcExporterTransport(options);
}
exports.createOtlpGrpcExporterTransport = createOtlpGrpcExporterTransport;
//# sourceMappingURL=grpc-exporter-transport.js.map