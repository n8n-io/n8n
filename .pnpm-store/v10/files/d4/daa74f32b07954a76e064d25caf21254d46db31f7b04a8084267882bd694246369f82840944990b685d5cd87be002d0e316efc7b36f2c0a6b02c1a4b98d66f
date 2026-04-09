import { fetch, Request } from "cross-fetch";
import { Client } from "../client.js";
import { ClientError, ClosedError, ProtocolVersionError } from "../errors.js";
import { HttpStream } from "./stream.js";
export const checkEndpoints = [
    {
        versionPath: "v3-protobuf",
        pipelinePath: "v3-protobuf/pipeline",
        cursorPath: "v3-protobuf/cursor",
        version: 3,
        encoding: "protobuf",
    },
    /*
    {
        versionPath: "v3",
        pipelinePath: "v3/pipeline",
        cursorPath: "v3/cursor",
        version: 3,
        encoding: "json",
    },
    */
];
const fallbackEndpoint = {
    versionPath: "v2",
    pipelinePath: "v2/pipeline",
    cursorPath: undefined,
    version: 2,
    encoding: "json",
};
/** A client for the Hrana protocol over HTTP. */
export class HttpClient extends Client {
    #url;
    #jwt;
    #fetch;
    #remoteEncryptionKey;
    #closed;
    #streams;
    /** @private */
    _endpointPromise;
    /** @private */
    _endpoint;
    /** @private */
    constructor(url, jwt, customFetch, remoteEncryptionKey, protocolVersion = 2) {
        super();
        this.#url = url;
        this.#jwt = jwt;
        this.#fetch = customFetch ?? fetch;
        this.#remoteEncryptionKey = remoteEncryptionKey;
        this.#closed = undefined;
        this.#streams = new Set();
        if (protocolVersion == 3) {
            this._endpointPromise = findEndpoint(this.#fetch, this.#url);
            this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
        }
        else {
            this._endpointPromise = Promise.resolve(fallbackEndpoint);
            this._endpointPromise.then((endpoint) => this._endpoint = endpoint, (error) => this.#setClosed(error));
        }
    }
    /** Get the protocol version supported by the server. */
    async getVersion() {
        if (this._endpoint !== undefined) {
            return this._endpoint.version;
        }
        return (await this._endpointPromise).version;
    }
    // Make sure that the negotiated version is at least `minVersion`.
    /** @private */
    _ensureVersion(minVersion, feature) {
        if (minVersion <= fallbackEndpoint.version) {
            return;
        }
        else if (this._endpoint === undefined) {
            throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` +
                "but the version supported by the HTTP server is not yet known. " +
                "Use Client.getVersion() to wait until the version is available.");
        }
        else if (this._endpoint.version < minVersion) {
            throw new ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` +
                `but the HTTP server only supports version ${this._endpoint.version}.`);
        }
    }
    /** Open a {@link HttpStream}, a stream for executing SQL statements. */
    openStream() {
        if (this.#closed !== undefined) {
            throw new ClosedError("Client is closed", this.#closed);
        }
        const stream = new HttpStream(this, this.#url, this.#jwt, this.#fetch, this.#remoteEncryptionKey);
        this.#streams.add(stream);
        return stream;
    }
    /** @private */
    _streamClosed(stream) {
        this.#streams.delete(stream);
    }
    /** Close the client and all its streams. */
    close() {
        this.#setClosed(new ClientError("Client was manually closed"));
    }
    /** True if the client is closed. */
    get closed() {
        return this.#closed !== undefined;
    }
    #setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        for (const stream of Array.from(this.#streams)) {
            stream._setClosed(new ClosedError("Client was closed", error));
        }
    }
}
async function findEndpoint(customFetch, clientUrl) {
    const fetch = customFetch;
    for (const endpoint of checkEndpoints) {
        const url = new URL(endpoint.versionPath, clientUrl);
        const request = new Request(url.toString(), { method: "GET" });
        const response = await fetch(request);
        await response.arrayBuffer();
        if (response.ok) {
            return endpoint;
        }
    }
    return fallbackEndpoint;
}
