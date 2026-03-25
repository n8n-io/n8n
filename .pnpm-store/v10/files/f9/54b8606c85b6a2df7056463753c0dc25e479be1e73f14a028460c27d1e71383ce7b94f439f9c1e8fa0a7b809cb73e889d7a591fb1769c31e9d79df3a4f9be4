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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOverride = exports.parseAWSEvent = exports.getEndpointFromUrl = exports.getAuthHeaders = exports.getUrl = exports.mapResponseFromBedrock = void 0;
const sha256_js_1 = require("@aws-crypto/sha256-js");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const protocol_http_1 = require("@aws-sdk/protocol-http");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const readable_stream_1 = require("readable-stream");
const core_1 = require("./core");
const Stream_1 = require("./core/streaming-fetcher/Stream");
const streaming_utils_1 = require("./core/streaming-fetcher/streaming-utils");
const serializers = __importStar(require("./serialization"));
const withTempEnv = (updateEnv, fn) => __awaiter(void 0, void 0, void 0, function* () {
    const previousEnv = Object.assign({}, process.env);
    try {
        updateEnv();
        return yield fn();
    }
    finally {
        process.env = previousEnv;
    }
});
const streamingResponseParser = {
    "chat": serializers.StreamedChatResponse,
    "generate": serializers.GenerateStreamedResponse,
};
const nonStreamedResponseParser = {
    "chat": serializers.NonStreamedChatResponse,
    "embed": serializers.EmbedResponse,
    "generate": serializers.Generation,
};
const mapResponseFromBedrock = (streaming, endpoint, obj) => __awaiter(void 0, void 0, void 0, function* () {
    const parser = streaming ? streamingResponseParser[endpoint] : nonStreamedResponseParser[endpoint];
    const config = {
        unrecognizedObjectKeys: "passthrough",
        allowUnrecognizedUnionMembers: true,
        allowUnrecognizedEnumValues: true,
        skipValidation: true,
        breadcrumbsPrefix: ["response"],
    };
    const parsed = yield parser.parseOrThrow(obj, config);
    return parser.jsonOrThrow(parsed, config);
});
exports.mapResponseFromBedrock = mapResponseFromBedrock;
const getUrl = (platform, awsRegion, model, stream) => {
    const endpoint = {
        "bedrock": stream ? "invoke-with-response-stream" : "invoke",
        "sagemaker": stream ? "invocations-response-stream" : "invocations"
    }[platform];
    return {
        "bedrock": `https://${platform}-runtime.${awsRegion}.amazonaws.com/model/${model}/${endpoint}`,
        "sagemaker": `https://runtime.sagemaker.${awsRegion}.amazonaws.com/endpoints/${model}/${endpoint}`
    }[platform];
};
exports.getUrl = getUrl;
const getAuthHeaders = (url, method, headers, body, service, props) => __awaiter(void 0, void 0, void 0, function* () {
    const providerChain = (0, credential_providers_1.fromNodeProviderChain)();
    const credentials = yield withTempEnv(() => {
        // Temporarily set the appropriate environment variables if we've been
        // explicitly given credentials so that the credentials provider can
        // resolve them.
        //
        // Note: the environment provider is only not run first if the `AWS_PROFILE`
        // environment variable is set.
        // https://github.com/aws/aws-sdk-js-v3/blob/44a18a34b2c93feccdfcd162928d13e6dbdcaf30/packages/credential-provider-node/src/defaultProvider.ts#L49
        if (props.awsAccessKey) {
            process.env['AWS_ACCESS_KEY_ID'] = props.awsAccessKey;
        }
        if (props.awsSecretKey) {
            process.env['AWS_SECRET_ACCESS_KEY'] = props.awsSecretKey;
        }
        if (props.awsSessionToken) {
            process.env['AWS_SESSION_TOKEN'] = props.awsSessionToken;
        }
    }, () => providerChain());
    const signer = new signature_v4_1.SignatureV4({
        service,
        region: props.awsRegion,
        credentials,
        sha256: sha256_js_1.Sha256,
    });
    // The connection header may be stripped by a proxy somewhere, so the receiver
    // of this message may not see this header, so we remove it from the set of headers
    // that are signed.
    delete headers['connection'];
    headers['host'] = url.hostname;
    const request = new protocol_http_1.HttpRequest({
        method: method.toUpperCase(),
        protocol: url.protocol,
        path: url.pathname,
        headers,
        body: body,
    });
    const signed = yield signer.sign(request);
    return signed.headers;
});
exports.getAuthHeaders = getAuthHeaders;
const getEndpointFromUrl = (url, chatModel, embedModel, generateModel) => {
    if (chatModel && url.includes(chatModel)) {
        return "chat";
    }
    if (embedModel && url.includes(embedModel)) {
        return "embed";
    }
    if (generateModel && url.includes(generateModel)) {
        return "generate";
    }
    throw new Error(`Unknown endpoint in url: ${url}`);
};
exports.getEndpointFromUrl = getEndpointFromUrl;
const parseAWSEvent = (line) => {
    const regex = /{[^\}]*}/;
    const match = line.match(regex);
    if (match === null || match === void 0 ? void 0 : match[0]) {
        const obj = JSON.parse(match[0]);
        if (obj.bytes) {
            const base64Payload = Buffer.from(obj.bytes, 'base64').toString('utf-8');
            const streamedObj = JSON.parse(base64Payload);
            if (streamedObj.event_type) {
                return streamedObj;
            }
        }
    }
};
exports.parseAWSEvent = parseAWSEvent;
const fetchOverride = (platform, { awsRegion, awsAccessKey, awsSecretKey, awsSessionToken, }) => (fetcherArgs) => __awaiter(void 0, void 0, void 0, function* () {
    var e_1, _a;
    const endpoint = fetcherArgs.url.split('/').pop();
    const bodyJson = fetcherArgs.body;
    console.assert(bodyJson.model, "model is required");
    const isStreaming = Boolean(bodyJson.stream);
    const url = (0, exports.getUrl)(platform, awsRegion, bodyJson.model, isStreaming);
    delete bodyJson["stream"];
    delete bodyJson["model"];
    delete fetcherArgs.headers['Authorization'];
    fetcherArgs.headers["Host"] = new URL(url).hostname;
    const authHeaders = yield (0, exports.getAuthHeaders)(new URL(url), fetcherArgs.method, fetcherArgs.headers, JSON.stringify(bodyJson), platform, {
        awsRegion,
        awsAccessKey,
        awsSecretKey,
        awsSessionToken,
    });
    fetcherArgs.url = url;
    fetcherArgs.headers = authHeaders;
    const response = yield (0, core_1.fetcher)(fetcherArgs);
    if (!response.ok) {
        return response;
    }
    try {
        if (isStreaming) {
            const responseStream = (0, Stream_1.readableStreamAsyncIterable)(response.body);
            const lineDecoder = new streaming_utils_1.LineDecoder();
            const newBody = new readable_stream_1.PassThrough();
            try {
                for (var responseStream_1 = __asyncValues(responseStream), responseStream_1_1; responseStream_1_1 = yield responseStream_1.next(), !responseStream_1_1.done;) {
                    const chunk = responseStream_1_1.value;
                    for (const line of lineDecoder.decode(chunk)) {
                        const event = (0, exports.parseAWSEvent)(line);
                        if (event) {
                            const obj = yield (0, exports.mapResponseFromBedrock)(isStreaming, endpoint, event);
                            newBody.push(JSON.stringify(obj) + "\n");
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (responseStream_1_1 && !responseStream_1_1.done && (_a = responseStream_1.return)) yield _a.call(responseStream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            for (const line of lineDecoder.flush()) {
                const event = (0, exports.parseAWSEvent)(line);
                if (event) {
                    const obj = yield (0, exports.mapResponseFromBedrock)(isStreaming, endpoint, event);
                    newBody.push(JSON.stringify(obj) + "\n");
                }
            }
            newBody.end();
            return {
                ok: true,
                body: newBody
            };
        }
        else {
            const oldBody = yield response.body;
            const mappedResponse = yield (0, exports.mapResponseFromBedrock)(isStreaming, endpoint, oldBody);
            return {
                ok: true,
                body: mappedResponse
            };
        }
    }
    catch (e) {
        throw e;
    }
});
exports.fetchOverride = fetchOverride;
