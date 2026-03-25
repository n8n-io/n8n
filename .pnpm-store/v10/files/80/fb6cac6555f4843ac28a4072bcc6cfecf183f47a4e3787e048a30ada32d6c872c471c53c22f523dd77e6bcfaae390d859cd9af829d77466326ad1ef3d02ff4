// source/ip-key-generator.ts
import { isIPv6 } from "node:net";
import { Address6 } from "ip-address";
function ipKeyGenerator(ip, ipv6Subnet = 56) {
  if (isIPv6(ip)) {
    const address = new Address6(ip);
    if (address.is4()) return address.to4().correctForm();
    if (ipv6Subnet) {
      const subnet = new Address6(`${ip}/${ipv6Subnet}`);
      return `${subnet.startAddress().correctForm()}/${ipv6Subnet}`;
    }
  }
  return ip;
}

// source/memory-store.ts
var MemoryStore = class {
  constructor(validations2) {
    this.validations = validations2;
    /**
     * These two maps store usage (requests) and reset time by key (for example, IP
     * addresses or API keys).
     *
     * They are split into two to avoid having to iterate through the entire set to
     * determine which ones need reset. Instead, `Client`s are moved from `previous`
     * to `current` as they hit the endpoint. Once `windowMs` has elapsed, all clients
     * left in `previous`, i.e., those that have not made any recent requests, are
     * known to be expired and can be deleted in bulk.
     */
    this.previous = /* @__PURE__ */ new Map();
    this.current = /* @__PURE__ */ new Map();
    /**
     * Confirmation that the keys incremented in once instance of MemoryStore
     * cannot affect other instances.
     */
    this.localKeys = true;
  }
  /**
   * Method that initializes the store.
   *
   * @param options {Options} - The options used to setup the middleware.
   */
  init(options) {
    this.windowMs = options.windowMs;
    this.validations?.windowMs(this.windowMs);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.clearExpired();
    }, this.windowMs);
    this.interval.unref?.();
  }
  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo | undefined} - The number of hits and reset time for that client.
   *
   * @public
   */
  async get(key) {
    return this.current.get(key) ?? this.previous.get(key);
  }
  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   *
   * @public
   */
  async increment(key) {
    const client = this.getClient(key);
    const now = Date.now();
    if (client.resetTime.getTime() <= now) {
      this.resetClient(client, now);
    }
    client.totalHits++;
    return client;
  }
  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @public
   */
  async decrement(key) {
    const client = this.getClient(key);
    if (client.totalHits > 0) client.totalHits--;
  }
  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @public
   */
  async resetKey(key) {
    this.current.delete(key);
    this.previous.delete(key);
  }
  /**
   * Method to reset everyone's hit counter.
   *
   * @public
   */
  async resetAll() {
    this.current.clear();
    this.previous.clear();
  }
  /**
   * Method to stop the timer (if currently running) and prevent any memory
   * leaks.
   *
   * @public
   */
  shutdown() {
    clearInterval(this.interval);
    void this.resetAll();
  }
  /**
   * Recycles a client by setting its hit count to zero, and reset time to
   * `windowMs` milliseconds from now.
   *
   * NOT to be confused with `#resetKey()`, which removes a client from both the
   * `current` and `previous` maps.
   *
   * @param client {Client} - The client to recycle.
   * @param now {number} - The current time, to which the `windowMs` is added to get the `resetTime` for the client.
   *
   * @return {Client} - The modified client that was passed in, to allow for chaining.
   */
  resetClient(client, now = Date.now()) {
    client.totalHits = 0;
    client.resetTime.setTime(now + this.windowMs);
    return client;
  }
  /**
   * Retrieves or creates a client, given a key. Also ensures that the client being
   * returned is in the `current` map.
   *
   * @param key {string} - The key under which the client is (or is to be) stored.
   *
   * @returns {Client} - The requested client.
   */
  getClient(key) {
    if (this.current.has(key)) return this.current.get(key);
    let client;
    if (this.previous.has(key)) {
      client = this.previous.get(key);
      this.previous.delete(key);
    } else {
      client = { totalHits: 0, resetTime: /* @__PURE__ */ new Date() };
      this.resetClient(client);
    }
    this.current.set(key, client);
    return client;
  }
  /**
   * Move current clients to previous, create a new map for current.
   *
   * This function is called every `windowMs`.
   */
  clearExpired() {
    this.previous = this.current;
    this.current = /* @__PURE__ */ new Map();
  }
};

// source/rate-limit.ts
import { isIPv6 as isIPv62 } from "node:net";

// source/headers.ts
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
var SUPPORTED_DRAFT_VERSIONS = [
  "draft-6",
  "draft-7",
  "draft-8"
];
var getResetSeconds = (windowMs, resetTime) => {
  let resetSeconds;
  if (resetTime) {
    const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1e3);
    resetSeconds = Math.max(0, deltaSeconds);
  } else {
    resetSeconds = Math.ceil(windowMs / 1e3);
  }
  return resetSeconds;
};
var getPartitionKey = (key) => {
  const hash = createHash("sha256");
  hash.update(key);
  const partitionKey = hash.digest("hex").slice(0, 12);
  return Buffer.from(partitionKey).toString("base64");
};
var setLegacyHeaders = (response, info) => {
  if (response.headersSent) return;
  response.setHeader("X-RateLimit-Limit", info.limit.toString());
  response.setHeader("X-RateLimit-Remaining", info.remaining.toString());
  if (info.resetTime instanceof Date) {
    response.setHeader("Date", (/* @__PURE__ */ new Date()).toUTCString());
    response.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(info.resetTime.getTime() / 1e3).toString()
    );
  }
};
var setDraft6Headers = (response, info, windowMs) => {
  if (response.headersSent) return;
  const windowSeconds = Math.ceil(windowMs / 1e3);
  const resetSeconds = getResetSeconds(windowMs, info.resetTime);
  response.setHeader("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  response.setHeader("RateLimit-Limit", info.limit.toString());
  response.setHeader("RateLimit-Remaining", info.remaining.toString());
  if (typeof resetSeconds === "number")
    response.setHeader("RateLimit-Reset", resetSeconds.toString());
};
var setDraft7Headers = (response, info, windowMs) => {
  if (response.headersSent) return;
  const windowSeconds = Math.ceil(windowMs / 1e3);
  const resetSeconds = getResetSeconds(windowMs, info.resetTime);
  response.setHeader("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  response.setHeader(
    "RateLimit",
    `limit=${info.limit}, remaining=${info.remaining}, reset=${resetSeconds}`
  );
};
var setDraft8Headers = (response, info, windowMs, name, key) => {
  if (response.headersSent) return;
  const windowSeconds = Math.ceil(windowMs / 1e3);
  const resetSeconds = getResetSeconds(windowMs, info.resetTime);
  const partitionKey = getPartitionKey(key);
  const header = `r=${info.remaining}; t=${resetSeconds}`;
  const policy = `q=${info.limit}; w=${windowSeconds}; pk=:${partitionKey}:`;
  response.append("RateLimit", `"${name}"; ${header}`);
  response.append("RateLimit-Policy", `"${name}"; ${policy}`);
};
var setRetryAfterHeader = (response, info, windowMs) => {
  if (response.headersSent) return;
  const resetSeconds = getResetSeconds(windowMs, info.resetTime);
  response.setHeader("Retry-After", resetSeconds.toString());
};

// source/utils.ts
var omitUndefinedProperties = (passedOptions) => {
  const omittedOptions = {};
  for (const k of Object.keys(passedOptions)) {
    const key = k;
    if (passedOptions[key] !== void 0) {
      omittedOptions[key] = passedOptions[key];
    }
  }
  return omittedOptions;
};

// source/validations.ts
import { isIP } from "node:net";
var ValidationError = class extends Error {
  /**
   * The code must be a string, in snake case and all capital, that starts with
   * the substring `ERR_ERL_`.
   *
   * The message must be a string, starting with an uppercase character,
   * describing the issue in detail.
   */
  constructor(code, message) {
    const url = `https://express-rate-limit.github.io/${code}/`;
    super(`${message} See ${url} for more information.`);
    this.name = this.constructor.name;
    this.code = code;
    this.help = url;
  }
};
var ChangeWarning = class extends ValidationError {
};
var usedStores = /* @__PURE__ */ new Set();
var singleCountKeys = /* @__PURE__ */ new WeakMap();
var validations = {
  enabled: {
    default: true
  },
  // Should be EnabledValidations type, but that's a circular reference
  disable() {
    for (const k of Object.keys(this.enabled)) this.enabled[k] = false;
  },
  /**
   * Checks whether the IP address is valid, and that it does not have a port
   * number in it.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_invalid_ip_address.
   *
   * @param ip {string | undefined} - The IP address provided by Express as request.ip.
   *
   * @returns {void}
   */
  ip(ip) {
    if (ip === void 0) {
      throw new ValidationError(
        "ERR_ERL_UNDEFINED_IP_ADDRESS",
        `An undefined 'request.ip' was detected. This might indicate a misconfiguration or the connection being destroyed prematurely.`
      );
    }
    if (!isIP(ip)) {
      throw new ValidationError(
        "ERR_ERL_INVALID_IP_ADDRESS",
        `An invalid 'request.ip' (${ip}) was detected. Consider passing a custom 'keyGenerator' function to the rate limiter.`
      );
    }
  },
  /**
   * Makes sure the trust proxy setting is not set to `true`.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_permissive_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  trustProxy(request) {
    if (request.app.get("trust proxy") === true) {
      throw new ValidationError(
        "ERR_ERL_PERMISSIVE_TRUST_PROXY",
        `The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting.`
      );
    }
  },
  /**
   * Makes sure the trust proxy setting is set in case the `X-Forwarded-For`
   * header is present.
   *
   * See https://github.com/express-rate-limit/express-rate-limit/wiki/Error-Codes#err_erl_unset_trust_proxy.
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  xForwardedForHeader(request) {
    if (request.headers["x-forwarded-for"] && request.app.get("trust proxy") === false) {
      throw new ValidationError(
        "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR",
        `The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default). This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.`
      );
    }
  },
  /**
   * Alert the user if the Forwarded header is set (standardized version of X-Forwarded-For - not supported by express as of version 5.1.0)
   *
   * @param request {Request} - The Express request object.
   *
   * @returns {void}
   */
  forwardedHeader(request) {
    if (request.headers.forwarded && request.ip === request.socket?.remoteAddress) {
      throw new ValidationError(
        "ERR_ERL_FORWARDED_HEADER",
        `The 'Forwarded' header (standardized X-Forwarded-For) is set but currently being ignored. Add a custom keyGenerator to use a value from this header.`
      );
    }
  },
  /**
   * Ensures totalHits value from store is a positive integer.
   *
   * @param hits {any} - The `totalHits` returned by the store.
   */
  positiveHits(hits) {
    if (typeof hits !== "number" || hits < 1 || hits !== Math.round(hits)) {
      throw new ValidationError(
        "ERR_ERL_INVALID_HITS",
        `The totalHits value returned from the store must be a positive integer, got ${hits}`
      );
    }
  },
  /**
   * Ensures a single store instance is not used with multiple express-rate-limit instances
   */
  unsharedStore(store) {
    if (usedStores.has(store)) {
      const maybeUniquePrefix = store?.localKeys ? "" : " (with a unique prefix)";
      throw new ValidationError(
        "ERR_ERL_STORE_REUSE",
        `A Store instance must not be shared across multiple rate limiters. Create a new instance of ${store.constructor.name}${maybeUniquePrefix} for each limiter instead.`
      );
    }
    usedStores.add(store);
  },
  /**
   * Ensures a given key is incremented only once per request.
   *
   * @param request {Request} - The Express request object.
   * @param store {Store} - The store class.
   * @param key {string} - The key used to store the client's hit count.
   *
   * @returns {void}
   */
  singleCount(request, store, key) {
    let storeKeys = singleCountKeys.get(request);
    if (!storeKeys) {
      storeKeys = /* @__PURE__ */ new Map();
      singleCountKeys.set(request, storeKeys);
    }
    const storeKey = store.localKeys ? store : store.constructor.name;
    let keys = storeKeys.get(storeKey);
    if (!keys) {
      keys = [];
      storeKeys.set(storeKey, keys);
    }
    const prefixedKey = `${store.prefix ?? ""}${key}`;
    if (keys.includes(prefixedKey)) {
      throw new ValidationError(
        "ERR_ERL_DOUBLE_COUNT",
        `The hit count for ${key} was incremented more than once for a single request.`
      );
    }
    keys.push(prefixedKey);
  },
  /**
   * Warns the user that the behaviour for `max: 0` / `limit: 0` is
   * changing in the next major release.
   *
   * @param limit {number} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  limit(limit) {
    if (limit === 0) {
      throw new ChangeWarning(
        "WRN_ERL_MAX_ZERO",
        "Setting limit or max to 0 disables rate limiting in express-rate-limit v6 and older, but will cause all requests to be blocked in v7"
      );
    }
  },
  /**
   * Warns the user that the `draft_polli_ratelimit_headers` option is deprecated
   * and will be removed in the next major release.
   *
   * @param draft_polli_ratelimit_headers {any | undefined} - The now-deprecated setting that was used to enable standard headers.
   *
   * @returns {void}
   */
  draftPolliHeaders(draft_polli_ratelimit_headers) {
    if (draft_polli_ratelimit_headers) {
      throw new ChangeWarning(
        "WRN_ERL_DEPRECATED_DRAFT_POLLI_HEADERS",
        `The draft_polli_ratelimit_headers configuration option is deprecated and has been removed in express-rate-limit v7, please set standardHeaders: 'draft-6' instead.`
      );
    }
  },
  /**
   * Warns the user that the `onLimitReached` option is deprecated and
   * will be removed in the next major release.
   *
   * @param onLimitReached {any | undefined} - The maximum number of hits per client.
   *
   * @returns {void}
   */
  onLimitReached(onLimitReached) {
    if (onLimitReached) {
      throw new ChangeWarning(
        "WRN_ERL_DEPRECATED_ON_LIMIT_REACHED",
        "The onLimitReached configuration option is deprecated and has been removed in express-rate-limit v7."
      );
    }
  },
  /**
   * Warns the user when an invalid/unsupported version of the draft spec is passed.
   *
   * @param version {any | undefined} - The version passed by the user.
   *
   * @returns {void}
   */
  headersDraftVersion(version) {
    if (typeof version !== "string" || // @ts-expect-error This is fine. If version is not in the array, it will just return false.
    !SUPPORTED_DRAFT_VERSIONS.includes(version)) {
      const versionString = SUPPORTED_DRAFT_VERSIONS.join(", ");
      throw new ValidationError(
        "ERR_ERL_HEADERS_UNSUPPORTED_DRAFT_VERSION",
        `standardHeaders: only the following versions of the IETF draft specification are supported: ${versionString}.`
      );
    }
  },
  /**
   * Warns the user when the selected headers option requires a reset time but
   * the store does not provide one.
   *
   * @param resetTime {Date | undefined} - The timestamp when the client's hit count will be reset.
   *
   * @returns {void}
   */
  headersResetTime(resetTime) {
    if (!resetTime) {
      throw new ValidationError(
        "ERR_ERL_HEADERS_NO_RESET",
        `standardHeaders:  'draft-7' requires a 'resetTime', but the store did not provide one. The 'windowMs' value will be used instead, which may cause clients to wait longer than necessary.`
      );
    }
  },
  knownOptions(passedOptions) {
    if (!passedOptions) return;
    const optionsMap = {
      windowMs: true,
      limit: true,
      message: true,
      statusCode: true,
      legacyHeaders: true,
      standardHeaders: true,
      identifier: true,
      requestPropertyName: true,
      skipFailedRequests: true,
      skipSuccessfulRequests: true,
      keyGenerator: true,
      ipv6Subnet: true,
      handler: true,
      skip: true,
      requestWasSuccessful: true,
      store: true,
      validate: true,
      headers: true,
      max: true,
      passOnStoreError: true
    };
    const validOptions = Object.keys(optionsMap).concat(
      "draft_polli_ratelimit_headers",
      // not a valid option anymore, but we have a more specific check for this one, so don't warn for it here
      // from express-slow-down - https://github.com/express-rate-limit/express-slow-down/blob/main/source/types.ts#L65
      "delayAfter",
      "delayMs",
      "maxDelayMs"
    );
    for (const key of Object.keys(passedOptions)) {
      if (!validOptions.includes(key)) {
        throw new ValidationError(
          "ERR_ERL_UNKNOWN_OPTION",
          `Unexpected configuration option: ${key}`
          // todo: suggest a valid option with a short levenstein distance?
        );
      }
    }
  },
  /**
   * Checks the options.validate setting to ensure that only recognized
   * validations are enabled or disabled.
   *
   * If any unrecognized values are found, an error is logged that
   * includes the list of supported validations.
   */
  validationsConfig() {
    const supportedValidations = Object.keys(this).filter(
      (k) => !["enabled", "disable"].includes(k)
    );
    supportedValidations.push("default");
    for (const key of Object.keys(this.enabled)) {
      if (!supportedValidations.includes(key)) {
        throw new ValidationError(
          "ERR_ERL_UNKNOWN_VALIDATION",
          `options.validate.${key} is not recognized. Supported validate options are: ${supportedValidations.join(
            ", "
          )}.`
        );
      }
    }
  },
  /**
   * Checks to see if the instance was created inside of a request handler,
   * which would prevent it from working correctly, with the default memory
   * store (or any other store with localKeys.)
   */
  creationStack(store) {
    const { stack } = new Error(
      "express-rate-limit validation check (set options.validate.creationStack=false to disable)"
    );
    if (stack?.includes("Layer.handle [as handle_request]") || // express v4
    stack?.includes("Layer.handleRequest")) {
      if (!store.localKeys) {
        throw new ValidationError(
          "ERR_ERL_CREATED_IN_REQUEST_HANDLER",
          "express-rate-limit instance should *usually* be created at app initialization, not when responding to a request."
        );
      }
      throw new ValidationError(
        "ERR_ERL_CREATED_IN_REQUEST_HANDLER",
        "express-rate-limit instance should be created at app initialization, not when responding to a request."
      );
    }
  },
  ipv6Subnet(ipv6Subnet) {
    if (ipv6Subnet === false) {
      return;
    }
    if (!Number.isInteger(ipv6Subnet) || ipv6Subnet < 32 || ipv6Subnet > 64) {
      throw new ValidationError(
        "ERR_ERL_IPV6_SUBNET",
        `Unexpected ipv6Subnet value: ${ipv6Subnet}. Expected an integer between 32 and 64 (usually 48-64).`
      );
    }
  },
  ipv6SubnetOrKeyGenerator(options) {
    if (options.ipv6Subnet !== void 0 && options.keyGenerator) {
      throw new ValidationError(
        "ERR_ERL_IPV6SUBNET_OR_KEYGENERATOR",
        `Incompatible options: the 'ipv6Subnet' option is ignored when a custom 'keyGenerator' function is also set.`
      );
    }
  },
  keyGeneratorIpFallback(keyGenerator) {
    if (!keyGenerator) {
      return;
    }
    const src = keyGenerator.toString();
    if ((src.includes("req.ip") || src.includes("request.ip")) && !src.includes("ipKeyGenerator")) {
      throw new ValidationError(
        "ERR_ERL_KEY_GEN_IPV6",
        "Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses. This could allow IPv6 users to bypass limits."
      );
    }
  },
  /**
   * Checks to see if the window duration is greater than 2^32 - 1. This is only
   * called by the default MemoryStore, since it uses Node's setInterval method.
   *
   * See https://nodejs.org/api/timers.html#setintervalcallback-delay-args.
   */
  windowMs(windowMs) {
    const SET_TIMEOUT_MAX = 2 ** 31 - 1;
    if (typeof windowMs !== "number" || Number.isNaN(windowMs) || windowMs < 1 || windowMs > SET_TIMEOUT_MAX) {
      throw new ValidationError(
        "ERR_ERL_WINDOW_MS",
        `Invalid windowMs value: ${windowMs}${typeof windowMs !== "number" ? ` (${typeof windowMs})` : ""}, must be a number between 1 and ${SET_TIMEOUT_MAX} when using the default MemoryStore`
      );
    }
  }
};
var getValidations = (_enabled) => {
  let enabled;
  if (typeof _enabled === "boolean") {
    enabled = {
      default: _enabled
    };
  } else {
    enabled = {
      default: true,
      ..._enabled
    };
  }
  const wrappedValidations = { enabled };
  for (const [name, validation] of Object.entries(validations)) {
    if (typeof validation === "function")
      wrappedValidations[name] = (...args) => {
        if (!(enabled[name] ?? enabled.default)) {
          return;
        }
        try {
          ;
          validation.apply(
            wrappedValidations,
            args
          );
        } catch (error) {
          if (error instanceof ChangeWarning) console.warn(error);
          else console.error(error);
        }
      };
  }
  return wrappedValidations;
};

// source/rate-limit.ts
var isLegacyStore = (store) => (
  // Check that `incr` exists but `increment` does not - store authors might want
  // to keep both around for backwards compatibility.
  typeof store.incr === "function" && typeof store.increment !== "function"
);
var promisifyStore = (passedStore) => {
  if (!isLegacyStore(passedStore)) {
    return passedStore;
  }
  const legacyStore = passedStore;
  class PromisifiedStore {
    async increment(key) {
      return new Promise((resolve, reject) => {
        legacyStore.incr(
          key,
          (error, totalHits, resetTime) => {
            if (error) reject(error);
            resolve({ totalHits, resetTime });
          }
        );
      });
    }
    async decrement(key) {
      return legacyStore.decrement(key);
    }
    async resetKey(key) {
      return legacyStore.resetKey(key);
    }
    /* istanbul ignore next */
    async resetAll() {
      if (typeof legacyStore.resetAll === "function")
        return legacyStore.resetAll();
    }
  }
  return new PromisifiedStore();
};
var getOptionsFromConfig = (config) => {
  const { validations: validations2, ...directlyPassableEntries } = config;
  return {
    ...directlyPassableEntries,
    validate: validations2.enabled
  };
};
var parseOptions = (passedOptions) => {
  const notUndefinedOptions = omitUndefinedProperties(passedOptions);
  const validations2 = getValidations(notUndefinedOptions?.validate ?? true);
  validations2.validationsConfig();
  validations2.knownOptions(passedOptions);
  validations2.draftPolliHeaders(
    // @ts-expect-error see the note above.
    notUndefinedOptions.draft_polli_ratelimit_headers
  );
  validations2.onLimitReached(notUndefinedOptions.onLimitReached);
  if (notUndefinedOptions.ipv6Subnet !== void 0 && typeof notUndefinedOptions.ipv6Subnet !== "function") {
    validations2.ipv6Subnet(notUndefinedOptions.ipv6Subnet);
  }
  validations2.keyGeneratorIpFallback(notUndefinedOptions.keyGenerator);
  validations2.ipv6SubnetOrKeyGenerator(notUndefinedOptions);
  let standardHeaders = notUndefinedOptions.standardHeaders ?? false;
  if (standardHeaders === true) standardHeaders = "draft-6";
  const config = {
    windowMs: 60 * 1e3,
    limit: passedOptions.max ?? 5,
    // `max` is deprecated, but support it anyways.
    message: "Too many requests, please try again later.",
    statusCode: 429,
    legacyHeaders: passedOptions.headers ?? true,
    identifier(request, _response) {
      let duration = "";
      const property = config.requestPropertyName;
      const { limit } = request[property];
      const seconds = config.windowMs / 1e3;
      const minutes = config.windowMs / (1e3 * 60);
      const hours = config.windowMs / (1e3 * 60 * 60);
      const days = config.windowMs / (1e3 * 60 * 60 * 24);
      if (seconds < 60) duration = `${seconds}sec`;
      else if (minutes < 60) duration = `${minutes}min`;
      else if (hours < 24) duration = `${hours}hr${hours > 1 ? "s" : ""}`;
      else duration = `${days}day${days > 1 ? "s" : ""}`;
      return `${limit}-in-${duration}`;
    },
    requestPropertyName: "rateLimit",
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    requestWasSuccessful: (_request, response) => response.statusCode < 400,
    skip: (_request, _response) => false,
    async keyGenerator(request, response) {
      validations2.ip(request.ip);
      validations2.trustProxy(request);
      validations2.xForwardedForHeader(request);
      validations2.forwardedHeader(request);
      const ip = request.ip;
      let subnet = 56;
      if (isIPv62(ip)) {
        subnet = typeof config.ipv6Subnet === "function" ? await config.ipv6Subnet(request, response) : config.ipv6Subnet;
        if (typeof config.ipv6Subnet === "function")
          validations2.ipv6Subnet(subnet);
      }
      return ipKeyGenerator(ip, subnet);
    },
    ipv6Subnet: 56,
    async handler(request, response, _next, _optionsUsed) {
      response.status(config.statusCode);
      const message = typeof config.message === "function" ? await config.message(
        request,
        response
      ) : config.message;
      if (!response.writableEnded) response.send(message);
    },
    passOnStoreError: false,
    // Allow the default options to be overridden by the passed options.
    ...notUndefinedOptions,
    // `standardHeaders` is resolved into a draft version above, use that.
    standardHeaders,
    // Note that this field is declared after the user's options are spread in,
    // so that this field doesn't get overridden with an un-promisified store!
    store: promisifyStore(
      notUndefinedOptions.store ?? new MemoryStore(validations2)
    ),
    // Print an error to the console if a few known misconfigurations are detected.
    validations: validations2
  };
  if (typeof config.store.increment !== "function" || typeof config.store.decrement !== "function" || typeof config.store.resetKey !== "function" || config.store.resetAll !== void 0 && typeof config.store.resetAll !== "function" || config.store.init !== void 0 && typeof config.store.init !== "function") {
    throw new TypeError(
      "An invalid store was passed. Please ensure that the store is a class that implements the `Store` interface."
    );
  }
  return config;
};
var handleAsyncErrors = (fn) => async (request, response, next) => {
  try {
    await Promise.resolve(fn(request, response, next)).catch(next);
  } catch (error) {
    next(error);
  }
};
var rateLimit = (passedOptions) => {
  const config = parseOptions(passedOptions ?? {});
  const options = getOptionsFromConfig(config);
  config.validations.creationStack(config.store);
  config.validations.unsharedStore(config.store);
  if (typeof config.store.init === "function") config.store.init(options);
  const middleware = handleAsyncErrors(
    async (request, response, next) => {
      const skip = await config.skip(request, response);
      if (skip) {
        next();
        return;
      }
      const augmentedRequest = request;
      const key = await config.keyGenerator(request, response);
      let totalHits = 0;
      let resetTime;
      try {
        const incrementResult = await config.store.increment(key);
        totalHits = incrementResult.totalHits;
        resetTime = incrementResult.resetTime;
      } catch (error) {
        if (config.passOnStoreError) {
          console.error(
            "express-rate-limit: error from store, allowing request without rate-limiting.",
            error
          );
          next();
          return;
        }
        throw error;
      }
      config.validations.positiveHits(totalHits);
      config.validations.singleCount(request, config.store, key);
      const retrieveLimit = typeof config.limit === "function" ? config.limit(request, response) : config.limit;
      const limit = await retrieveLimit;
      config.validations.limit(limit);
      const info = {
        limit,
        used: totalHits,
        remaining: Math.max(limit - totalHits, 0),
        resetTime,
        key
      };
      Object.defineProperty(info, "current", {
        configurable: false,
        enumerable: false,
        value: totalHits
      });
      augmentedRequest[config.requestPropertyName] = info;
      if (config.legacyHeaders && !response.headersSent) {
        setLegacyHeaders(response, info);
      }
      if (config.standardHeaders && !response.headersSent) {
        switch (config.standardHeaders) {
          case "draft-6": {
            setDraft6Headers(response, info, config.windowMs);
            break;
          }
          case "draft-7": {
            config.validations.headersResetTime(info.resetTime);
            setDraft7Headers(response, info, config.windowMs);
            break;
          }
          case "draft-8": {
            const retrieveName = typeof config.identifier === "function" ? config.identifier(request, response) : config.identifier;
            const name = await retrieveName;
            config.validations.headersResetTime(info.resetTime);
            setDraft8Headers(response, info, config.windowMs, name, key);
            break;
          }
          default: {
            config.validations.headersDraftVersion(config.standardHeaders);
            break;
          }
        }
      }
      if (config.skipFailedRequests || config.skipSuccessfulRequests) {
        let decremented = false;
        const decrementKey = async () => {
          if (!decremented) {
            await config.store.decrement(key);
            decremented = true;
          }
        };
        if (config.skipFailedRequests) {
          response.on("finish", async () => {
            if (!await config.requestWasSuccessful(request, response))
              await decrementKey();
          });
          response.on("close", async () => {
            if (!response.writableEnded) await decrementKey();
          });
          response.on("error", async () => {
            await decrementKey();
          });
        }
        if (config.skipSuccessfulRequests) {
          response.on("finish", async () => {
            if (await config.requestWasSuccessful(request, response))
              await decrementKey();
          });
        }
      }
      config.validations.disable();
      if (totalHits > limit) {
        if (config.legacyHeaders || config.standardHeaders) {
          setRetryAfterHeader(response, info, config.windowMs);
        }
        config.handler(request, response, next, options);
        return;
      }
      next();
    }
  );
  const getThrowFn = () => {
    throw new Error("The current store does not support the get/getKey method");
  };
  middleware.resetKey = config.store.resetKey.bind(config.store);
  middleware.getKey = typeof config.store.get === "function" ? config.store.get.bind(config.store) : getThrowFn;
  return middleware;
};
var rate_limit_default = rateLimit;
export {
  MemoryStore,
  rate_limit_default as default,
  ipKeyGenerator,
  rate_limit_default as rateLimit
};
