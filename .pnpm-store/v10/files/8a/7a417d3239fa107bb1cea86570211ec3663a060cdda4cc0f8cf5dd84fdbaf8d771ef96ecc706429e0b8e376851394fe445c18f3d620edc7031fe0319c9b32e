"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallCredentials = void 0;
const metadata_1 = require("./metadata");
function isCurrentOauth2Client(client) {
    return ('getRequestHeaders' in client &&
        typeof client.getRequestHeaders === 'function');
}
/**
 * A class that represents a generic method of adding authentication-related
 * metadata on a per-request basis.
 */
class CallCredentials {
    /**
     * Creates a new CallCredentials object from a given function that generates
     * Metadata objects.
     * @param metadataGenerator A function that accepts a set of options, and
     * generates a Metadata object based on these options, which is passed back
     * to the caller via a supplied (err, metadata) callback.
     */
    static createFromMetadataGenerator(metadataGenerator) {
        return new SingleCallCredentials(metadataGenerator);
    }
    /**
     * Create a gRPC credential from a Google credential object.
     * @param googleCredentials The authentication client to use.
     * @return The resulting CallCredentials object.
     */
    static createFromGoogleCredential(googleCredentials) {
        return CallCredentials.createFromMetadataGenerator((options, callback) => {
            let getHeaders;
            if (isCurrentOauth2Client(googleCredentials)) {
                getHeaders = googleCredentials.getRequestHeaders(options.service_url);
            }
            else {
                getHeaders = new Promise((resolve, reject) => {
                    googleCredentials.getRequestMetadata(options.service_url, (err, headers) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!headers) {
                            reject(new Error('Headers not set by metadata plugin'));
                            return;
                        }
                        resolve(headers);
                    });
                });
            }
            getHeaders.then(headers => {
                const metadata = new metadata_1.Metadata();
                for (const key of Object.keys(headers)) {
                    metadata.add(key, headers[key]);
                }
                callback(null, metadata);
            }, err => {
                callback(err);
            });
        });
    }
    static createEmpty() {
        return new EmptyCallCredentials();
    }
}
exports.CallCredentials = CallCredentials;
class ComposedCallCredentials extends CallCredentials {
    constructor(creds) {
        super();
        this.creds = creds;
    }
    async generateMetadata(options) {
        const base = new metadata_1.Metadata();
        const generated = await Promise.all(this.creds.map(cred => cred.generateMetadata(options)));
        for (const gen of generated) {
            base.merge(gen);
        }
        return base;
    }
    compose(other) {
        return new ComposedCallCredentials(this.creds.concat([other]));
    }
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof ComposedCallCredentials) {
            return this.creds.every((value, index) => value._equals(other.creds[index]));
        }
        else {
            return false;
        }
    }
}
class SingleCallCredentials extends CallCredentials {
    constructor(metadataGenerator) {
        super();
        this.metadataGenerator = metadataGenerator;
    }
    generateMetadata(options) {
        return new Promise((resolve, reject) => {
            this.metadataGenerator(options, (err, metadata) => {
                if (metadata !== undefined) {
                    resolve(metadata);
                }
                else {
                    reject(err);
                }
            });
        });
    }
    compose(other) {
        return new ComposedCallCredentials([this, other]);
    }
    _equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof SingleCallCredentials) {
            return this.metadataGenerator === other.metadataGenerator;
        }
        else {
            return false;
        }
    }
}
class EmptyCallCredentials extends CallCredentials {
    generateMetadata(options) {
        return Promise.resolve(new metadata_1.Metadata());
    }
    compose(other) {
        return other;
    }
    _equals(other) {
        return other instanceof EmptyCallCredentials;
    }
}
//# sourceMappingURL=call-credentials.js.map