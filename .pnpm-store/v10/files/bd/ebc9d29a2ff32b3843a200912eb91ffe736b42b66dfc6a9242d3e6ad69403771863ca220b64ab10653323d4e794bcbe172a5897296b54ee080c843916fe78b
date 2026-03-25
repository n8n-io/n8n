"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS: () => NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS,
  S3ExpressIdentityCache: () => S3ExpressIdentityCache,
  S3ExpressIdentityCacheEntry: () => S3ExpressIdentityCacheEntry,
  S3ExpressIdentityProviderImpl: () => S3ExpressIdentityProviderImpl,
  SignatureV4S3Express: () => SignatureV4S3Express,
  checkContentLengthHeader: () => checkContentLengthHeader,
  checkContentLengthHeaderMiddlewareOptions: () => checkContentLengthHeaderMiddlewareOptions,
  getCheckContentLengthHeaderPlugin: () => getCheckContentLengthHeaderPlugin,
  getRegionRedirectMiddlewarePlugin: () => getRegionRedirectMiddlewarePlugin,
  getS3ExpiresMiddlewarePlugin: () => getS3ExpiresMiddlewarePlugin,
  getS3ExpressHttpSigningPlugin: () => getS3ExpressHttpSigningPlugin,
  getS3ExpressPlugin: () => getS3ExpressPlugin,
  getThrow200ExceptionsPlugin: () => getThrow200ExceptionsPlugin,
  getValidateBucketNamePlugin: () => getValidateBucketNamePlugin,
  regionRedirectEndpointMiddleware: () => regionRedirectEndpointMiddleware,
  regionRedirectEndpointMiddlewareOptions: () => regionRedirectEndpointMiddlewareOptions,
  regionRedirectMiddleware: () => regionRedirectMiddleware,
  regionRedirectMiddlewareOptions: () => regionRedirectMiddlewareOptions,
  resolveS3Config: () => resolveS3Config,
  s3ExpiresMiddleware: () => s3ExpiresMiddleware,
  s3ExpiresMiddlewareOptions: () => s3ExpiresMiddlewareOptions,
  s3ExpressHttpSigningMiddleware: () => s3ExpressHttpSigningMiddleware,
  s3ExpressHttpSigningMiddlewareOptions: () => s3ExpressHttpSigningMiddlewareOptions,
  s3ExpressMiddleware: () => s3ExpressMiddleware,
  s3ExpressMiddlewareOptions: () => s3ExpressMiddlewareOptions,
  throw200ExceptionsMiddleware: () => throw200ExceptionsMiddleware,
  throw200ExceptionsMiddlewareOptions: () => throw200ExceptionsMiddlewareOptions,
  validateBucketNameMiddleware: () => validateBucketNameMiddleware,
  validateBucketNameMiddlewareOptions: () => validateBucketNameMiddlewareOptions
});
module.exports = __toCommonJS(index_exports);

// src/check-content-length-header.ts
var import_protocol_http = require("@smithy/protocol-http");
var import_smithy_client = require("@smithy/smithy-client");
var CONTENT_LENGTH_HEADER = "content-length";
var DECODED_CONTENT_LENGTH_HEADER = "x-amz-decoded-content-length";
function checkContentLengthHeader() {
  return (next, context) => async (args) => {
    const { request } = args;
    if (import_protocol_http.HttpRequest.isInstance(request)) {
      if (!(CONTENT_LENGTH_HEADER in request.headers) && !(DECODED_CONTENT_LENGTH_HEADER in request.headers)) {
        const message = `Are you using a Stream of unknown length as the Body of a PutObject request? Consider using Upload instead from @aws-sdk/lib-storage.`;
        if (typeof context?.logger?.warn === "function" && !(context.logger instanceof import_smithy_client.NoOpLogger)) {
          context.logger.warn(message);
        } else {
          console.warn(message);
        }
      }
    }
    return next({ ...args });
  };
}
__name(checkContentLengthHeader, "checkContentLengthHeader");
var checkContentLengthHeaderMiddlewareOptions = {
  step: "finalizeRequest",
  tags: ["CHECK_CONTENT_LENGTH_HEADER"],
  name: "getCheckContentLengthHeaderPlugin",
  override: true
};
var getCheckContentLengthHeaderPlugin = /* @__PURE__ */ __name((unused) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(checkContentLengthHeader(), checkContentLengthHeaderMiddlewareOptions);
  }, "applyToStack")
}), "getCheckContentLengthHeaderPlugin");

// src/region-redirect-endpoint-middleware.ts
var regionRedirectEndpointMiddleware = /* @__PURE__ */ __name((config) => {
  return (next, context) => async (args) => {
    const originalRegion = await config.region();
    const regionProviderRef = config.region;
    let unlock = /* @__PURE__ */ __name(() => {
    }, "unlock");
    if (context.__s3RegionRedirect) {
      Object.defineProperty(config, "region", {
        writable: false,
        value: /* @__PURE__ */ __name(async () => {
          return context.__s3RegionRedirect;
        }, "value")
      });
      unlock = /* @__PURE__ */ __name(() => Object.defineProperty(config, "region", {
        writable: true,
        value: regionProviderRef
      }), "unlock");
    }
    try {
      const result = await next(args);
      if (context.__s3RegionRedirect) {
        unlock();
        const region = await config.region();
        if (originalRegion !== region) {
          throw new Error("Region was not restored following S3 region redirect.");
        }
      }
      return result;
    } catch (e) {
      unlock();
      throw e;
    }
  };
}, "regionRedirectEndpointMiddleware");
var regionRedirectEndpointMiddlewareOptions = {
  tags: ["REGION_REDIRECT", "S3"],
  name: "regionRedirectEndpointMiddleware",
  override: true,
  relation: "before",
  toMiddleware: "endpointV2Middleware"
};

// src/region-redirect-middleware.ts
function regionRedirectMiddleware(clientConfig) {
  return (next, context) => async (args) => {
    try {
      return await next(args);
    } catch (err) {
      if (clientConfig.followRegionRedirects) {
        if (err?.$metadata?.httpStatusCode === 301 || // err.name === "PermanentRedirect" && --> removing the error name check, as that allows for HEAD operations (which have the 301 status code, but not the same error name) to be covered for region redirection as well
        err?.$metadata?.httpStatusCode === 400 && err?.name === "IllegalLocationConstraintException") {
          try {
            const actualRegion = err.$response.headers["x-amz-bucket-region"];
            context.logger?.debug(`Redirecting from ${await clientConfig.region()} to ${actualRegion}`);
            context.__s3RegionRedirect = actualRegion;
          } catch (e) {
            throw new Error("Region redirect failed: " + e);
          }
          return next(args);
        }
      }
      throw err;
    }
  };
}
__name(regionRedirectMiddleware, "regionRedirectMiddleware");
var regionRedirectMiddlewareOptions = {
  step: "initialize",
  tags: ["REGION_REDIRECT", "S3"],
  name: "regionRedirectMiddleware",
  override: true
};
var getRegionRedirectMiddlewarePlugin = /* @__PURE__ */ __name((clientConfig) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(regionRedirectMiddleware(clientConfig), regionRedirectMiddlewareOptions);
    clientStack.addRelativeTo(regionRedirectEndpointMiddleware(clientConfig), regionRedirectEndpointMiddlewareOptions);
  }, "applyToStack")
}), "getRegionRedirectMiddlewarePlugin");

// src/s3-expires-middleware.ts


var s3ExpiresMiddleware = /* @__PURE__ */ __name((config) => {
  return (next, context) => async (args) => {
    const result = await next(args);
    const { response } = result;
    if (import_protocol_http.HttpResponse.isInstance(response)) {
      if (response.headers.expires) {
        response.headers.expiresstring = response.headers.expires;
        try {
          (0, import_smithy_client.parseRfc7231DateTime)(response.headers.expires);
        } catch (e) {
          context.logger?.warn(
            `AWS SDK Warning for ${context.clientName}::${context.commandName} response parsing (${response.headers.expires}): ${e}`
          );
          delete response.headers.expires;
        }
      }
    }
    return result;
  };
}, "s3ExpiresMiddleware");
var s3ExpiresMiddlewareOptions = {
  tags: ["S3"],
  name: "s3ExpiresMiddleware",
  override: true,
  relation: "after",
  toMiddleware: "deserializerMiddleware"
};
var getS3ExpiresMiddlewarePlugin = /* @__PURE__ */ __name((clientConfig) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.addRelativeTo(s3ExpiresMiddleware(clientConfig), s3ExpiresMiddlewareOptions);
  }, "applyToStack")
}), "getS3ExpiresMiddlewarePlugin");

// src/s3-express/classes/S3ExpressIdentityCache.ts
var S3ExpressIdentityCache = class _S3ExpressIdentityCache {
  constructor(data = {}) {
    this.data = data;
  }
  static {
    __name(this, "S3ExpressIdentityCache");
  }
  lastPurgeTime = Date.now();
  static EXPIRED_CREDENTIAL_PURGE_INTERVAL_MS = 3e4;
  get(key) {
    const entry = this.data[key];
    if (!entry) {
      return;
    }
    return entry;
  }
  set(key, entry) {
    this.data[key] = entry;
    return entry;
  }
  delete(key) {
    delete this.data[key];
  }
  async purgeExpired() {
    const now = Date.now();
    if (this.lastPurgeTime + _S3ExpressIdentityCache.EXPIRED_CREDENTIAL_PURGE_INTERVAL_MS > now) {
      return;
    }
    for (const key in this.data) {
      const entry = this.data[key];
      if (!entry.isRefreshing) {
        const credential = await entry.identity;
        if (credential.expiration) {
          if (credential.expiration.getTime() < now) {
            delete this.data[key];
          }
        }
      }
    }
  }
};

// src/s3-express/classes/S3ExpressIdentityCacheEntry.ts
var S3ExpressIdentityCacheEntry = class {
  /**
   * @param identity - stored identity.
   * @param accessed - timestamp of last access in epoch ms.
   * @param isRefreshing - this key is currently in the process of being refreshed (background).
   */
  constructor(_identity, isRefreshing = false, accessed = Date.now()) {
    this._identity = _identity;
    this.isRefreshing = isRefreshing;
    this.accessed = accessed;
  }
  static {
    __name(this, "S3ExpressIdentityCacheEntry");
  }
  get identity() {
    this.accessed = Date.now();
    return this._identity;
  }
};

// src/s3-express/classes/S3ExpressIdentityProviderImpl.ts
var S3ExpressIdentityProviderImpl = class _S3ExpressIdentityProviderImpl {
  constructor(createSessionFn, cache = new S3ExpressIdentityCache()) {
    this.createSessionFn = createSessionFn;
    this.cache = cache;
  }
  static {
    __name(this, "S3ExpressIdentityProviderImpl");
  }
  static REFRESH_WINDOW_MS = 6e4;
  async getS3ExpressIdentity(awsIdentity, identityProperties) {
    const key = identityProperties.Bucket;
    const { cache } = this;
    const entry = cache.get(key);
    if (entry) {
      return entry.identity.then((identity) => {
        const isExpired = (identity.expiration?.getTime() ?? 0) < Date.now();
        if (isExpired) {
          return cache.set(key, new S3ExpressIdentityCacheEntry(this.getIdentity(key))).identity;
        }
        const isExpiringSoon = (identity.expiration?.getTime() ?? 0) < Date.now() + _S3ExpressIdentityProviderImpl.REFRESH_WINDOW_MS;
        if (isExpiringSoon && !entry.isRefreshing) {
          entry.isRefreshing = true;
          this.getIdentity(key).then((id) => {
            cache.set(key, new S3ExpressIdentityCacheEntry(Promise.resolve(id)));
          });
        }
        return identity;
      });
    }
    return cache.set(key, new S3ExpressIdentityCacheEntry(this.getIdentity(key))).identity;
  }
  async getIdentity(key) {
    await this.cache.purgeExpired().catch((error) => {
      console.warn("Error while clearing expired entries in S3ExpressIdentityCache: \n" + error);
    });
    const session = await this.createSessionFn(key);
    if (!session.Credentials?.AccessKeyId || !session.Credentials?.SecretAccessKey) {
      throw new Error("s3#createSession response credential missing AccessKeyId or SecretAccessKey.");
    }
    const identity = {
      accessKeyId: session.Credentials.AccessKeyId,
      secretAccessKey: session.Credentials.SecretAccessKey,
      sessionToken: session.Credentials.SessionToken,
      expiration: session.Credentials.Expiration ? new Date(session.Credentials.Expiration) : void 0
    };
    return identity;
  }
};

// src/s3-express/classes/SignatureV4S3Express.ts
var import_signature_v4 = require("@smithy/signature-v4");

// src/s3-express/constants.ts
var import_util_config_provider = require("@smithy/util-config-provider");
var S3_EXPRESS_BUCKET_TYPE = "Directory";
var S3_EXPRESS_BACKEND = "S3Express";
var S3_EXPRESS_AUTH_SCHEME = "sigv4-s3express";
var SESSION_TOKEN_QUERY_PARAM = "X-Amz-S3session-Token";
var SESSION_TOKEN_HEADER = SESSION_TOKEN_QUERY_PARAM.toLowerCase();
var NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_ENV_NAME = "AWS_S3_DISABLE_EXPRESS_SESSION_AUTH";
var NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_INI_NAME = "s3_disable_express_session_auth";
var NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => (0, import_util_config_provider.booleanSelector)(env, NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_ENV_NAME, import_util_config_provider.SelectorType.ENV), "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => (0, import_util_config_provider.booleanSelector)(profile, NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_INI_NAME, import_util_config_provider.SelectorType.CONFIG), "configFileSelector"),
  default: false
};

// src/s3-express/classes/SignatureV4S3Express.ts
var SignatureV4S3Express = class extends import_signature_v4.SignatureV4 {
  static {
    __name(this, "SignatureV4S3Express");
  }
  /**
   * Signs with alternate provided credentials instead of those provided in the
   * constructor.
   *
   * Additionally omits the credential sessionToken and assigns it to the
   * alternate header field for S3 Express.
   */
  async signWithCredentials(requestToSign, credentials, options) {
    const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
    requestToSign.headers[SESSION_TOKEN_HEADER] = credentials.sessionToken;
    const privateAccess = this;
    setSingleOverride(privateAccess, credentialsWithoutSessionToken);
    return privateAccess.signRequest(requestToSign, options ?? {});
  }
  /**
   * Similar to {@link SignatureV4S3Express#signWithCredentials} but for presigning.
   */
  async presignWithCredentials(requestToSign, credentials, options) {
    const credentialsWithoutSessionToken = getCredentialsWithoutSessionToken(credentials);
    delete requestToSign.headers[SESSION_TOKEN_HEADER];
    requestToSign.headers[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
    requestToSign.query = requestToSign.query ?? {};
    requestToSign.query[SESSION_TOKEN_QUERY_PARAM] = credentials.sessionToken;
    const privateAccess = this;
    setSingleOverride(privateAccess, credentialsWithoutSessionToken);
    return this.presign(requestToSign, options);
  }
};
function getCredentialsWithoutSessionToken(credentials) {
  const credentialsWithoutSessionToken = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    expiration: credentials.expiration
  };
  return credentialsWithoutSessionToken;
}
__name(getCredentialsWithoutSessionToken, "getCredentialsWithoutSessionToken");
function setSingleOverride(privateAccess, credentialsWithoutSessionToken) {
  const id = setTimeout(() => {
    throw new Error("SignatureV4S3Express credential override was created but not called.");
  }, 10);
  const currentCredentialProvider = privateAccess.credentialProvider;
  const overrideCredentialsProviderOnce = /* @__PURE__ */ __name(() => {
    clearTimeout(id);
    privateAccess.credentialProvider = currentCredentialProvider;
    return Promise.resolve(credentialsWithoutSessionToken);
  }, "overrideCredentialsProviderOnce");
  privateAccess.credentialProvider = overrideCredentialsProviderOnce;
}
__name(setSingleOverride, "setSingleOverride");

// src/s3-express/functions/s3ExpressMiddleware.ts
var import_core = require("@aws-sdk/core");

var s3ExpressMiddleware = /* @__PURE__ */ __name((options) => {
  return (next, context) => async (args) => {
    if (context.endpointV2) {
      const endpoint = context.endpointV2;
      const isS3ExpressAuth = endpoint.properties?.authSchemes?.[0]?.name === S3_EXPRESS_AUTH_SCHEME;
      const isS3ExpressBucket = endpoint.properties?.backend === S3_EXPRESS_BACKEND || endpoint.properties?.bucketType === S3_EXPRESS_BUCKET_TYPE;
      if (isS3ExpressBucket) {
        (0, import_core.setFeature)(context, "S3_EXPRESS_BUCKET", "J");
        context.isS3ExpressBucket = true;
      }
      if (isS3ExpressAuth) {
        const requestBucket = args.input.Bucket;
        if (requestBucket) {
          const s3ExpressIdentity = await options.s3ExpressIdentityProvider.getS3ExpressIdentity(
            await options.credentials(),
            {
              Bucket: requestBucket
            }
          );
          context.s3ExpressIdentity = s3ExpressIdentity;
          if (import_protocol_http.HttpRequest.isInstance(args.request) && s3ExpressIdentity.sessionToken) {
            args.request.headers[SESSION_TOKEN_HEADER] = s3ExpressIdentity.sessionToken;
          }
        }
      }
    }
    return next(args);
  };
}, "s3ExpressMiddleware");
var s3ExpressMiddlewareOptions = {
  name: "s3ExpressMiddleware",
  step: "build",
  tags: ["S3", "S3_EXPRESS"],
  override: true
};
var getS3ExpressPlugin = /* @__PURE__ */ __name((options) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(s3ExpressMiddleware(options), s3ExpressMiddlewareOptions);
  }, "applyToStack")
}), "getS3ExpressPlugin");

// src/s3-express/functions/s3ExpressHttpSigningMiddleware.ts
var import_core2 = require("@smithy/core");

var import_util_middleware = require("@smithy/util-middleware");

// src/s3-express/functions/signS3Express.ts
var signS3Express = /* @__PURE__ */ __name(async (s3ExpressIdentity, signingOptions, request, sigV4MultiRegionSigner) => {
  const signedRequest = await sigV4MultiRegionSigner.signWithCredentials(request, s3ExpressIdentity, {});
  if (signedRequest.headers["X-Amz-Security-Token"] || signedRequest.headers["x-amz-security-token"]) {
    throw new Error("X-Amz-Security-Token must not be set for s3-express requests.");
  }
  return signedRequest;
}, "signS3Express");

// src/s3-express/functions/s3ExpressHttpSigningMiddleware.ts
var defaultErrorHandler = /* @__PURE__ */ __name((signingProperties) => (error) => {
  throw error;
}, "defaultErrorHandler");
var defaultSuccessHandler = /* @__PURE__ */ __name((httpResponse, signingProperties) => {
}, "defaultSuccessHandler");
var s3ExpressHttpSigningMiddlewareOptions = import_core2.httpSigningMiddlewareOptions;
var s3ExpressHttpSigningMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
  if (!import_protocol_http.HttpRequest.isInstance(args.request)) {
    return next(args);
  }
  const smithyContext = (0, import_util_middleware.getSmithyContext)(context);
  const scheme = smithyContext.selectedHttpAuthScheme;
  if (!scheme) {
    throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
  }
  const {
    httpAuthOption: { signingProperties = {} },
    identity,
    signer
  } = scheme;
  let request;
  if (context.s3ExpressIdentity) {
    request = await signS3Express(
      context.s3ExpressIdentity,
      signingProperties,
      args.request,
      await config.signer()
    );
  } else {
    request = await signer.sign(args.request, identity, signingProperties);
  }
  const output = await next({
    ...args,
    request
  }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
  (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
  return output;
}, "s3ExpressHttpSigningMiddleware");
var getS3ExpressHttpSigningPlugin = /* @__PURE__ */ __name((config) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.addRelativeTo(
      s3ExpressHttpSigningMiddleware(config),
      import_core2.httpSigningMiddlewareOptions
    );
  }, "applyToStack")
}), "getS3ExpressHttpSigningPlugin");

// src/s3Configuration.ts
var resolveS3Config = /* @__PURE__ */ __name((input, {
  session
}) => {
  const [s3ClientProvider, CreateSessionCommandCtor] = session;
  const {
    forcePathStyle,
    useAccelerateEndpoint,
    disableMultiregionAccessPoints,
    followRegionRedirects,
    s3ExpressIdentityProvider,
    bucketEndpoint
  } = input;
  return Object.assign(input, {
    forcePathStyle: forcePathStyle ?? false,
    useAccelerateEndpoint: useAccelerateEndpoint ?? false,
    disableMultiregionAccessPoints: disableMultiregionAccessPoints ?? false,
    followRegionRedirects: followRegionRedirects ?? false,
    s3ExpressIdentityProvider: s3ExpressIdentityProvider ?? new S3ExpressIdentityProviderImpl(
      async (key) => s3ClientProvider().send(
        new CreateSessionCommandCtor({
          Bucket: key
        })
      )
    ),
    bucketEndpoint: bucketEndpoint ?? false
  });
}, "resolveS3Config");

// src/throw-200-exceptions.ts

var import_util_stream = require("@smithy/util-stream");
var THROW_IF_EMPTY_BODY = {
  CopyObjectCommand: true,
  UploadPartCopyCommand: true,
  CompleteMultipartUploadCommand: true
};
var MAX_BYTES_TO_INSPECT = 3e3;
var throw200ExceptionsMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
  const result = await next(args);
  const { response } = result;
  if (!import_protocol_http.HttpResponse.isInstance(response)) {
    return result;
  }
  const { statusCode, body: sourceBody } = response;
  if (statusCode < 200 || statusCode >= 300) {
    return result;
  }
  const isSplittableStream = typeof sourceBody?.stream === "function" || typeof sourceBody?.pipe === "function" || typeof sourceBody?.tee === "function";
  if (!isSplittableStream) {
    return result;
  }
  let bodyCopy = sourceBody;
  let body = sourceBody;
  if (sourceBody && typeof sourceBody === "object" && !(sourceBody instanceof Uint8Array)) {
    [bodyCopy, body] = await (0, import_util_stream.splitStream)(sourceBody);
  }
  response.body = body;
  const bodyBytes = await collectBody(bodyCopy, {
    streamCollector: /* @__PURE__ */ __name(async (stream) => {
      return (0, import_util_stream.headStream)(stream, MAX_BYTES_TO_INSPECT);
    }, "streamCollector")
  });
  if (typeof bodyCopy?.destroy === "function") {
    bodyCopy.destroy();
  }
  const bodyStringTail = config.utf8Encoder(bodyBytes.subarray(bodyBytes.length - 16));
  if (bodyBytes.length === 0 && THROW_IF_EMPTY_BODY[context.commandName]) {
    const err = new Error("S3 aborted request");
    err.name = "InternalError";
    throw err;
  }
  if (bodyStringTail && bodyStringTail.endsWith("</Error>")) {
    response.statusCode = 400;
  }
  return result;
}, "throw200ExceptionsMiddleware");
var collectBody = /* @__PURE__ */ __name((streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
}, "collectBody");
var throw200ExceptionsMiddlewareOptions = {
  relation: "after",
  toMiddleware: "deserializerMiddleware",
  tags: ["THROW_200_EXCEPTIONS", "S3"],
  name: "throw200ExceptionsMiddleware",
  override: true
};
var getThrow200ExceptionsPlugin = /* @__PURE__ */ __name((config) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.addRelativeTo(throw200ExceptionsMiddleware(config), throw200ExceptionsMiddlewareOptions);
  }, "applyToStack")
}), "getThrow200ExceptionsPlugin");

// src/validate-bucket-name.ts
var import_util_arn_parser = require("@aws-sdk/util-arn-parser");

// src/bucket-endpoint-middleware.ts
function bucketEndpointMiddleware(options) {
  return (next, context) => async (args) => {
    if (options.bucketEndpoint) {
      const endpoint = context.endpointV2;
      if (endpoint) {
        const bucket = args.input.Bucket;
        if (typeof bucket === "string") {
          try {
            const bucketEndpointUrl = new URL(bucket);
            context.endpointV2 = {
              ...endpoint,
              url: bucketEndpointUrl
            };
          } catch (e) {
            const warning = `@aws-sdk/middleware-sdk-s3: bucketEndpoint=true was set but Bucket=${bucket} could not be parsed as URL.`;
            if (context.logger?.constructor?.name === "NoOpLogger") {
              console.warn(warning);
            } else {
              context.logger?.warn?.(warning);
            }
            throw e;
          }
        }
      }
    }
    return next(args);
  };
}
__name(bucketEndpointMiddleware, "bucketEndpointMiddleware");
var bucketEndpointMiddlewareOptions = {
  name: "bucketEndpointMiddleware",
  override: true,
  relation: "after",
  toMiddleware: "endpointV2Middleware"
};

// src/validate-bucket-name.ts
function validateBucketNameMiddleware({ bucketEndpoint }) {
  return (next) => async (args) => {
    const {
      input: { Bucket }
    } = args;
    if (!bucketEndpoint && typeof Bucket === "string" && !(0, import_util_arn_parser.validate)(Bucket) && Bucket.indexOf("/") >= 0) {
      const err = new Error(`Bucket name shouldn't contain '/', received '${Bucket}'`);
      err.name = "InvalidBucketName";
      throw err;
    }
    return next({ ...args });
  };
}
__name(validateBucketNameMiddleware, "validateBucketNameMiddleware");
var validateBucketNameMiddlewareOptions = {
  step: "initialize",
  tags: ["VALIDATE_BUCKET_NAME"],
  name: "validateBucketNameMiddleware",
  override: true
};
var getValidateBucketNamePlugin = /* @__PURE__ */ __name((options) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(validateBucketNameMiddleware(options), validateBucketNameMiddlewareOptions);
    clientStack.addRelativeTo(bucketEndpointMiddleware(options), bucketEndpointMiddlewareOptions);
  }, "applyToStack")
}), "getValidateBucketNamePlugin");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  checkContentLengthHeaderMiddlewareOptions,
  getCheckContentLengthHeaderPlugin,
  checkContentLengthHeader,
  regionRedirectEndpointMiddleware,
  regionRedirectEndpointMiddlewareOptions,
  regionRedirectMiddlewareOptions,
  getRegionRedirectMiddlewarePlugin,
  regionRedirectMiddleware,
  s3ExpiresMiddleware,
  s3ExpiresMiddlewareOptions,
  getS3ExpiresMiddlewarePlugin,
  S3ExpressIdentityCache,
  S3ExpressIdentityCacheEntry,
  S3ExpressIdentityProviderImpl,
  SignatureV4S3Express,
  NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS,
  getS3ExpressPlugin,
  s3ExpressMiddleware,
  s3ExpressMiddlewareOptions,
  getS3ExpressHttpSigningPlugin,
  s3ExpressHttpSigningMiddleware,
  s3ExpressHttpSigningMiddlewareOptions,
  resolveS3Config,
  throw200ExceptionsMiddleware,
  throw200ExceptionsMiddlewareOptions,
  getThrow200ExceptionsPlugin,
  validateBucketNameMiddlewareOptions,
  getValidateBucketNamePlugin,
  validateBucketNameMiddleware
});

