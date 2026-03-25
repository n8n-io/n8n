'use strict';

const defaultTrace = async (name, fn, _options) => {
  return await fn({
    name,
    setAttributes: () => {
      return;
    }
  });
};
const TraceAttributes = {
  KIND: "xata.trace.kind",
  VERSION: "xata.sdk.version",
  TABLE: "xata.table",
  HTTP_REQUEST_ID: "http.request_id",
  HTTP_STATUS_CODE: "http.status_code",
  HTTP_HOST: "http.host",
  HTTP_SCHEME: "http.scheme",
  HTTP_USER_AGENT: "http.user_agent",
  HTTP_METHOD: "http.method",
  HTTP_URL: "http.url",
  HTTP_ROUTE: "http.route",
  HTTP_TARGET: "http.target",
  CLOUDFLARE_RAY_ID: "cf.ray"
};

function notEmpty(value) {
  return value !== null && value !== void 0;
}
function compact(arr) {
  return arr.filter(notEmpty);
}
function compactObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => notEmpty(value)));
}
function isBlob(value) {
  try {
    return value instanceof Blob;
  } catch (error) {
    return false;
  }
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !isBlob(value);
}
function isDefined(value) {
  return value !== null && value !== void 0;
}
function isString(value) {
  return isDefined(value) && typeof value === "string";
}
function isStringArray(value) {
  return isDefined(value) && Array.isArray(value) && value.every(isString);
}
function isNumber(value) {
  return isDefined(value) && typeof value === "number";
}
function parseNumber(value) {
  if (isNumber(value)) {
    return value;
  }
  if (isString(value)) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return void 0;
}
function toBase64(value) {
  try {
    return btoa(value);
  } catch (err) {
    const buf = Buffer;
    return buf.from(value).toString("base64");
  }
}
function deepMerge(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
function chunk(array, chunkSize) {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
async function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function timeoutWithCancel(ms) {
  let timeoutId;
  const promise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve();
    }, ms);
  });
  return {
    cancel: () => clearTimeout(timeoutId),
    promise
  };
}
function promiseMap(inputValues, mapper) {
  const reducer = (acc$, inputValue) => acc$.then(
    (acc) => mapper(inputValue).then((result) => {
      acc.push(result);
      return acc;
    })
  );
  return inputValues.reduce(reducer, Promise.resolve([]));
}

function getEnvironment() {
  try {
    if (isDefined(process) && isDefined(process.env)) {
      return {
        apiKey: process.env.XATA_API_KEY ?? getGlobalApiKey(),
        databaseURL: process.env.XATA_DATABASE_URL ?? getGlobalDatabaseURL(),
        branch: process.env.XATA_BRANCH ?? getGlobalBranch(),
        deployPreview: process.env.XATA_PREVIEW,
        deployPreviewBranch: process.env.XATA_PREVIEW_BRANCH,
        vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
        vercelGitRepoOwner: process.env.VERCEL_GIT_REPO_OWNER
      };
    }
  } catch (err) {
  }
  try {
    if (isObject(Deno) && isObject(Deno.env)) {
      return {
        apiKey: Deno.env.get("XATA_API_KEY") ?? getGlobalApiKey(),
        databaseURL: Deno.env.get("XATA_DATABASE_URL") ?? getGlobalDatabaseURL(),
        branch: Deno.env.get("XATA_BRANCH") ?? getGlobalBranch(),
        deployPreview: Deno.env.get("XATA_PREVIEW"),
        deployPreviewBranch: Deno.env.get("XATA_PREVIEW_BRANCH"),
        vercelGitCommitRef: Deno.env.get("VERCEL_GIT_COMMIT_REF"),
        vercelGitRepoOwner: Deno.env.get("VERCEL_GIT_REPO_OWNER")
      };
    }
  } catch (err) {
  }
  return {
    apiKey: getGlobalApiKey(),
    databaseURL: getGlobalDatabaseURL(),
    branch: getGlobalBranch(),
    deployPreview: void 0,
    deployPreviewBranch: void 0,
    vercelGitCommitRef: void 0,
    vercelGitRepoOwner: void 0
  };
}
function getEnableBrowserVariable() {
  try {
    if (isObject(process) && isObject(process.env) && process.env.XATA_ENABLE_BROWSER !== void 0) {
      return process.env.XATA_ENABLE_BROWSER === "true";
    }
  } catch (err) {
  }
  try {
    if (isObject(Deno) && isObject(Deno.env) && Deno.env.get("XATA_ENABLE_BROWSER") !== void 0) {
      return Deno.env.get("XATA_ENABLE_BROWSER") === "true";
    }
  } catch (err) {
  }
  try {
    return XATA_ENABLE_BROWSER === true || XATA_ENABLE_BROWSER === "true";
  } catch (err) {
    return void 0;
  }
}
function getGlobalApiKey() {
  try {
    return XATA_API_KEY;
  } catch (err) {
    return void 0;
  }
}
function getGlobalDatabaseURL() {
  try {
    return XATA_DATABASE_URL;
  } catch (err) {
    return void 0;
  }
}
function getGlobalBranch() {
  try {
    return XATA_BRANCH;
  } catch (err) {
    return void 0;
  }
}
function getDatabaseURL() {
  try {
    const { databaseURL } = getEnvironment();
    return databaseURL;
  } catch (err) {
    return void 0;
  }
}
function getAPIKey() {
  try {
    const { apiKey } = getEnvironment();
    return apiKey;
  } catch (err) {
    return void 0;
  }
}
function getBranch() {
  try {
    const { branch } = getEnvironment();
    return branch;
  } catch (err) {
    return void 0;
  }
}
function buildPreviewBranchName({ org, branch }) {
  return `preview-${org}-${branch}`;
}
function getPreviewBranch() {
  try {
    const { deployPreview, deployPreviewBranch, vercelGitCommitRef, vercelGitRepoOwner } = getEnvironment();
    if (deployPreviewBranch)
      return deployPreviewBranch;
    switch (deployPreview) {
      case "vercel": {
        if (!vercelGitCommitRef || !vercelGitRepoOwner) {
          console.warn("XATA_PREVIEW=vercel but VERCEL_GIT_COMMIT_REF or VERCEL_GIT_REPO_OWNER is not valid");
          return void 0;
        }
        return buildPreviewBranchName({ org: vercelGitRepoOwner, branch: vercelGitCommitRef });
      }
    }
    return void 0;
  } catch (err) {
    return void 0;
  }
}

var __accessCheck$8 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$8 = (obj, member, getter) => {
  __accessCheck$8(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$8 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$8 = (obj, member, value, setter) => {
  __accessCheck$8(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod$4 = (obj, member, method) => {
  __accessCheck$8(obj, member, "access private method");
  return method;
};
var _fetch, _queue, _concurrency, _enqueue, enqueue_fn;
const REQUEST_TIMEOUT = 5 * 60 * 1e3;
function getFetchImplementation(userFetch) {
  const globalFetch = typeof fetch !== "undefined" ? fetch : void 0;
  const globalThisFetch = typeof globalThis !== "undefined" ? globalThis.fetch : void 0;
  const fetchImpl = userFetch ?? globalFetch ?? globalThisFetch;
  if (!fetchImpl) {
    throw new Error(`Couldn't find a global \`fetch\`. Pass a fetch implementation explicitly.`);
  }
  return fetchImpl;
}
class ApiRequestPool {
  constructor(concurrency = 10) {
    __privateAdd$8(this, _enqueue);
    __privateAdd$8(this, _fetch, void 0);
    __privateAdd$8(this, _queue, void 0);
    __privateAdd$8(this, _concurrency, void 0);
    __privateSet$8(this, _queue, []);
    __privateSet$8(this, _concurrency, concurrency);
    this.running = 0;
    this.started = 0;
  }
  setFetch(fetch2) {
    __privateSet$8(this, _fetch, fetch2);
  }
  getFetch() {
    if (!__privateGet$8(this, _fetch)) {
      throw new Error("Fetch not set");
    }
    return __privateGet$8(this, _fetch);
  }
  request(url, options) {
    const start = /* @__PURE__ */ new Date();
    const fetchImpl = this.getFetch();
    const runRequest = async (stalled = false) => {
      const { promise, cancel } = timeoutWithCancel(REQUEST_TIMEOUT);
      const response = await Promise.race([fetchImpl(url, options), promise.then(() => null)]).finally(cancel);
      if (!response) {
        throw new Error("Request timed out");
      }
      if (response.status === 429) {
        const rateLimitReset = parseNumber(response.headers?.get("x-ratelimit-reset")) ?? 1;
        await timeout(rateLimitReset * 1e3);
        return await runRequest(true);
      }
      if (stalled) {
        const stalledTime = (/* @__PURE__ */ new Date()).getTime() - start.getTime();
        console.warn(`A request to Xata hit branch rate limits, was retried and stalled for ${stalledTime}ms`);
      }
      return response;
    };
    return __privateMethod$4(this, _enqueue, enqueue_fn).call(this, async () => {
      return await runRequest();
    });
  }
}
_fetch = new WeakMap();
_queue = new WeakMap();
_concurrency = new WeakMap();
_enqueue = new WeakSet();
enqueue_fn = function(task) {
  const promise = new Promise((resolve) => __privateGet$8(this, _queue).push(resolve)).finally(() => {
    this.started--;
    this.running++;
  }).then(() => task()).finally(() => {
    this.running--;
    const next = __privateGet$8(this, _queue).shift();
    if (next !== void 0) {
      this.started++;
      next();
    }
  });
  if (this.running + this.started < __privateGet$8(this, _concurrency)) {
    const next = __privateGet$8(this, _queue).shift();
    if (next !== void 0) {
      this.started++;
      next();
    }
  }
  return promise;
};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

async function getBytes(stream, onChunk) {
  const reader = stream.getReader();
  let result;
  while (!(result = await reader.read()).done) {
    onChunk(result.value);
  }
}
function getLines(onLine) {
  let buffer;
  let position;
  let fieldLength;
  let discardTrailingNewline = false;
  return function onChunk(arr) {
    if (buffer === void 0) {
      buffer = arr;
      position = 0;
      fieldLength = -1;
    } else {
      buffer = concat(buffer, arr);
    }
    const bufLength = buffer.length;
    let lineStart = 0;
    while (position < bufLength) {
      if (discardTrailingNewline) {
        if (buffer[position] === 10 /* NewLine */) {
          lineStart = ++position;
        }
        discardTrailingNewline = false;
      }
      let lineEnd = -1;
      for (; position < bufLength && lineEnd === -1; ++position) {
        switch (buffer[position]) {
          case 58 /* Colon */:
            if (fieldLength === -1) {
              fieldLength = position - lineStart;
            }
            break;
          case 13 /* CarriageReturn */:
            discardTrailingNewline = true;
          case 10 /* NewLine */:
            lineEnd = position;
            break;
        }
      }
      if (lineEnd === -1) {
        break;
      }
      onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
      lineStart = position;
      fieldLength = -1;
    }
    if (lineStart === bufLength) {
      buffer = void 0;
    } else if (lineStart !== 0) {
      buffer = buffer.subarray(lineStart);
      position -= lineStart;
    }
  };
}
function getMessages(onId, onRetry, onMessage) {
  let message = newMessage();
  const decoder = new TextDecoder();
  return function onLine(line, fieldLength) {
    if (line.length === 0) {
      onMessage?.(message);
      message = newMessage();
    } else if (fieldLength > 0) {
      const field = decoder.decode(line.subarray(0, fieldLength));
      const valueOffset = fieldLength + (line[fieldLength + 1] === 32 /* Space */ ? 2 : 1);
      const value = decoder.decode(line.subarray(valueOffset));
      switch (field) {
        case "data":
          message.data = message.data ? message.data + "\n" + value : value;
          break;
        case "event":
          message.event = value;
          break;
        case "id":
          onId(message.id = value);
          break;
        case "retry":
          const retry = parseInt(value, 10);
          if (!isNaN(retry)) {
            onRetry(message.retry = retry);
          }
          break;
      }
    }
  };
}
function concat(a, b) {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}
function newMessage() {
  return {
    data: "",
    event: "",
    id: "",
    retry: void 0
  };
}
const EventStreamContentType = "text/event-stream";
const LastEventId = "last-event-id";
function fetchEventSource(input, {
  signal: inputSignal,
  headers: inputHeaders,
  onopen: inputOnOpen,
  onmessage,
  onclose,
  onerror,
  fetch: inputFetch,
  ...rest
}) {
  return new Promise((resolve, reject) => {
    const headers = { ...inputHeaders };
    if (!headers.accept) {
      headers.accept = EventStreamContentType;
    }
    let curRequestController;
    function dispose() {
      curRequestController.abort();
    }
    inputSignal?.addEventListener("abort", () => {
      dispose();
      resolve();
    });
    const fetchImpl = inputFetch ?? fetch;
    const onopen = inputOnOpen ?? defaultOnOpen;
    async function create() {
      curRequestController = new AbortController();
      try {
        const response = await fetchImpl(input, {
          ...rest,
          headers,
          signal: curRequestController.signal
        });
        await onopen(response);
        await getBytes(
          response.body,
          getLines(
            getMessages(
              (id) => {
                if (id) {
                  headers[LastEventId] = id;
                } else {
                  delete headers[LastEventId];
                }
              },
              (_retry) => {
              },
              onmessage
            )
          )
        );
        onclose?.();
        dispose();
        resolve();
      } catch (err) {
      }
    }
    create();
  });
}
function defaultOnOpen(response) {
  const contentType = response.headers?.get("content-type");
  if (!contentType?.startsWith(EventStreamContentType)) {
    throw new Error(`Expected content-type to be ${EventStreamContentType}, Actual: ${contentType}`);
  }
}

const VERSION = "0.28.4";

class ErrorWithCause extends Error {
  constructor(message, options) {
    super(message, options);
  }
}
class FetcherError extends ErrorWithCause {
  constructor(status, data, requestId) {
    super(getMessage(data));
    this.status = status;
    this.errors = isBulkError(data) ? data.errors : [{ message: getMessage(data), status }];
    this.requestId = requestId;
    if (data instanceof Error) {
      this.stack = data.stack;
      this.cause = data.cause;
    }
  }
  toString() {
    const error = super.toString();
    return `[${this.status}] (${this.requestId ?? "Unknown"}): ${error}`;
  }
}
function isBulkError(error) {
  return isObject(error) && Array.isArray(error.errors);
}
function isErrorWithMessage(error) {
  return isObject(error) && isString(error.message);
}
function getMessage(data) {
  if (data instanceof Error) {
    return data.message;
  } else if (isString(data)) {
    return data;
  } else if (isErrorWithMessage(data)) {
    return data.message;
  } else if (isBulkError(data)) {
    return "Bulk operation failed";
  } else {
    return "Unexpected error";
  }
}

function getHostUrl(provider, type) {
  if (isHostProviderAlias(provider)) {
    return providers[provider][type];
  } else if (isHostProviderBuilder(provider)) {
    return provider[type];
  }
  throw new Error("Invalid API provider");
}
const providers = {
  production: {
    main: "https://api.xata.io",
    workspaces: "https://{workspaceId}.{region}.xata.sh"
  },
  staging: {
    main: "https://api.staging-xata.dev",
    workspaces: "https://{workspaceId}.{region}.staging-xata.dev"
  },
  dev: {
    main: "https://api.dev-xata.dev",
    workspaces: "https://{workspaceId}.{region}.dev-xata.dev"
  },
  local: {
    main: "http://localhost:6001",
    workspaces: "http://{workspaceId}.{region}.localhost:6001"
  }
};
function isHostProviderAlias(alias) {
  return isString(alias) && Object.keys(providers).includes(alias);
}
function isHostProviderBuilder(builder) {
  return isObject(builder) && isString(builder.main) && isString(builder.workspaces);
}
function parseProviderString(provider = "production") {
  if (isHostProviderAlias(provider)) {
    return provider;
  }
  const [main, workspaces] = provider.split(",");
  if (!main || !workspaces)
    return null;
  return { main, workspaces };
}
function buildProviderString(provider) {
  if (isHostProviderAlias(provider))
    return provider;
  return `${provider.main},${provider.workspaces}`;
}
function parseWorkspacesUrlParts(url) {
  if (!isString(url))
    return null;
  const matches = {
    production: url.match(/(?:https:\/\/)?([^.]+)(?:\.([^.]+))\.xata\.sh.*/),
    staging: url.match(/(?:https:\/\/)?([^.]+)(?:\.([^.]+))\.staging-xata\.dev.*/),
    dev: url.match(/(?:https:\/\/)?([^.]+)(?:\.([^.]+))\.dev-xata\.dev.*/),
    local: url.match(/(?:https?:\/\/)?([^.]+)(?:\.([^.]+))\.localhost:(\d+)/)
  };
  const [host, match] = Object.entries(matches).find(([, match2]) => match2 !== null) ?? [];
  if (!isHostProviderAlias(host) || !match)
    return null;
  return { workspace: match[1], region: match[2], host };
}

const pool = new ApiRequestPool();
const resolveUrl = (url, queryParams = {}, pathParams = {}) => {
  const cleanQueryParams = Object.entries(queryParams).reduce((acc, [key, value]) => {
    if (value === void 0 || value === null)
      return acc;
    return { ...acc, [key]: value };
  }, {});
  const query = new URLSearchParams(cleanQueryParams).toString();
  const queryString = query.length > 0 ? `?${query}` : "";
  const cleanPathParams = Object.entries(pathParams).reduce((acc, [key, value]) => {
    return { ...acc, [key]: encodeURIComponent(String(value ?? "")).replace("%3A", ":") };
  }, {});
  return url.replace(/\{\w*\}/g, (key) => cleanPathParams[key.slice(1, -1)]) + queryString;
};
function buildBaseUrl({
  method,
  endpoint,
  path,
  workspacesApiUrl,
  apiUrl,
  pathParams = {}
}) {
  if (endpoint === "dataPlane") {
    let url = isString(workspacesApiUrl) ? `${workspacesApiUrl}${path}` : workspacesApiUrl(path, pathParams);
    if (method.toUpperCase() === "PUT" && [
      "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file",
      "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file/{fileId}"
    ].includes(path)) {
      const { host } = parseWorkspacesUrlParts(url) ?? {};
      switch (host) {
        case "production":
          url = url.replace("xata.sh", "upload.xata.sh");
          break;
        case "staging":
          url = url.replace("staging-xata.dev", "upload.staging-xata.dev");
          break;
        case "dev":
          url = url.replace("dev-xata.dev", "upload.dev-xata.dev");
          break;
      }
    }
    const urlWithWorkspace = isString(pathParams.workspace) ? url.replace("{workspaceId}", String(pathParams.workspace)) : url;
    return isString(pathParams.region) ? urlWithWorkspace.replace("{region}", String(pathParams.region)) : urlWithWorkspace;
  }
  return `${apiUrl}${path}`;
}
function hostHeader(url) {
  const pattern = /.*:\/\/(?<host>[^/]+).*/;
  const { groups } = pattern.exec(url) ?? {};
  return groups?.host ? { Host: groups.host } : {};
}
async function parseBody(body, headers) {
  if (!isDefined(body))
    return void 0;
  if (isBlob(body) || typeof body.text === "function") {
    return body;
  }
  const { "Content-Type": contentType } = headers ?? {};
  if (String(contentType).toLowerCase() === "application/json" && isObject(body)) {
    return JSON.stringify(body);
  }
  return body;
}
const defaultClientID = generateUUID();
async function fetch$1({
  url: path,
  method,
  body,
  headers: customHeaders,
  pathParams,
  queryParams,
  fetch: fetch2,
  apiKey,
  endpoint,
  apiUrl,
  workspacesApiUrl,
  trace,
  signal,
  clientID,
  sessionID,
  clientName,
  xataAgentExtra,
  fetchOptions = {},
  rawResponse = false
}) {
  pool.setFetch(fetch2);
  return await trace(
    `${method.toUpperCase()} ${path}`,
    async ({ setAttributes }) => {
      const baseUrl = buildBaseUrl({ method, endpoint, path, workspacesApiUrl, pathParams, apiUrl });
      const fullUrl = resolveUrl(baseUrl, queryParams, pathParams);
      const url = fullUrl.includes("localhost") ? fullUrl.replace(/^[^.]+\.[^.]+\./, "http://") : fullUrl;
      setAttributes({
        [TraceAttributes.HTTP_URL]: url,
        [TraceAttributes.HTTP_TARGET]: resolveUrl(path, queryParams, pathParams)
      });
      const xataAgent = compact([
        ["client", "TS_SDK"],
        ["version", VERSION],
        isDefined(clientName) ? ["service", clientName] : void 0,
        ...Object.entries(xataAgentExtra ?? {})
      ]).map(([key, value]) => `${key}=${value}`).join("; ");
      const headers = compactObject({
        "Accept-Encoding": "identity",
        "Content-Type": "application/json",
        "X-Xata-Client-ID": clientID ?? defaultClientID,
        "X-Xata-Session-ID": sessionID ?? generateUUID(),
        "X-Xata-Agent": xataAgent,
        ...customHeaders,
        ...hostHeader(fullUrl),
        Authorization: `Bearer ${apiKey}`
      });
      const response = await pool.request(url, {
        ...fetchOptions,
        method: method.toUpperCase(),
        body: await parseBody(body, headers),
        headers,
        signal
      });
      const { host, protocol } = parseUrl(response.url);
      const requestId = response.headers?.get("x-request-id") ?? void 0;
      setAttributes({
        [TraceAttributes.KIND]: "http",
        [TraceAttributes.HTTP_REQUEST_ID]: requestId,
        [TraceAttributes.HTTP_STATUS_CODE]: response.status,
        [TraceAttributes.HTTP_HOST]: host,
        [TraceAttributes.HTTP_SCHEME]: protocol?.replace(":", ""),
        [TraceAttributes.CLOUDFLARE_RAY_ID]: response.headers?.get("cf-ray") ?? void 0
      });
      const message = response.headers?.get("x-xata-message");
      if (message)
        console.warn(message);
      if (response.status === 204) {
        return {};
      }
      if (response.status === 429) {
        throw new FetcherError(response.status, "Rate limit exceeded", requestId);
      }
      try {
        const jsonResponse = rawResponse ? await response.blob() : await response.json();
        if (response.ok) {
          return jsonResponse;
        }
        throw new FetcherError(response.status, jsonResponse, requestId);
      } catch (error) {
        throw new FetcherError(response.status, error, requestId);
      }
    },
    { [TraceAttributes.HTTP_METHOD]: method.toUpperCase(), [TraceAttributes.HTTP_ROUTE]: path }
  );
}
function fetchSSERequest({
  url: path,
  method,
  body,
  headers: customHeaders,
  pathParams,
  queryParams,
  fetch: fetch2,
  apiKey,
  endpoint,
  apiUrl,
  workspacesApiUrl,
  onMessage,
  onError,
  onClose,
  signal,
  clientID,
  sessionID,
  clientName,
  xataAgentExtra
}) {
  const baseUrl = buildBaseUrl({ method, endpoint, path, workspacesApiUrl, pathParams, apiUrl });
  const fullUrl = resolveUrl(baseUrl, queryParams, pathParams);
  const url = fullUrl.includes("localhost") ? fullUrl.replace(/^[^.]+\./, "http://") : fullUrl;
  void fetchEventSource(url, {
    method,
    body: JSON.stringify(body),
    fetch: fetch2,
    signal,
    headers: {
      "X-Xata-Client-ID": clientID ?? defaultClientID,
      "X-Xata-Session-ID": sessionID ?? generateUUID(),
      "X-Xata-Agent": compact([
        ["client", "TS_SDK"],
        ["version", VERSION],
        isDefined(clientName) ? ["service", clientName] : void 0,
        ...Object.entries(xataAgentExtra ?? {})
      ]).map(([key, value]) => `${key}=${value}`).join("; "),
      ...customHeaders,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    onmessage(ev) {
      onMessage?.(JSON.parse(ev.data));
    },
    onerror(ev) {
      onError?.(JSON.parse(ev.data));
    },
    onclose() {
      onClose?.();
    }
  });
}
function parseUrl(url) {
  try {
    const { host, protocol } = new URL(url);
    return { host, protocol };
  } catch (error) {
    return {};
  }
}

const dataPlaneFetch = async (options) => fetch$1({ ...options, endpoint: "dataPlane" });

const applyMigration = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/pgroll/apply", method: "post", ...variables, signal });
const pgRollStatus = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/pgroll/status",
  method: "get",
  ...variables,
  signal
});
const pgRollJobStatus = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/pgroll/jobs/{jobId}",
  method: "get",
  ...variables,
  signal
});
const pgRollMigrationHistory = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/pgroll/migrations", method: "get", ...variables, signal });
const getBranchList = (variables, signal) => dataPlaneFetch({
  url: "/dbs/{dbName}",
  method: "get",
  ...variables,
  signal
});
const getBranchDetails = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}",
  method: "get",
  ...variables,
  signal
});
const createBranch = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}", method: "put", ...variables, signal });
const deleteBranch = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}",
  method: "delete",
  ...variables,
  signal
});
const getSchema = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/schema",
  method: "get",
  ...variables,
  signal
});
const copyBranch = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/copy",
  method: "post",
  ...variables,
  signal
});
const updateBranchMetadata = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/metadata",
  method: "put",
  ...variables,
  signal
});
const getBranchMetadata = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/metadata",
  method: "get",
  ...variables,
  signal
});
const getBranchStats = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/stats",
  method: "get",
  ...variables,
  signal
});
const getGitBranchesMapping = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/gitBranches", method: "get", ...variables, signal });
const addGitBranchesEntry = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/gitBranches", method: "post", ...variables, signal });
const removeGitBranchesEntry = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/gitBranches", method: "delete", ...variables, signal });
const resolveBranch = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/resolveBranch", method: "get", ...variables, signal });
const getBranchMigrationHistory = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/migrations", method: "get", ...variables, signal });
const getBranchMigrationPlan = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/migrations/plan", method: "post", ...variables, signal });
const executeBranchMigrationPlan = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/migrations/execute", method: "post", ...variables, signal });
const queryMigrationRequests = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations/query", method: "post", ...variables, signal });
const createMigrationRequest = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations", method: "post", ...variables, signal });
const getMigrationRequest = (variables, signal) => dataPlaneFetch({
  url: "/dbs/{dbName}/migrations/{mrNumber}",
  method: "get",
  ...variables,
  signal
});
const updateMigrationRequest = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations/{mrNumber}", method: "patch", ...variables, signal });
const listMigrationRequestsCommits = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations/{mrNumber}/commits", method: "post", ...variables, signal });
const compareMigrationRequest = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations/{mrNumber}/compare", method: "post", ...variables, signal });
const getMigrationRequestIsMerged = (variables, signal) => dataPlaneFetch({ url: "/dbs/{dbName}/migrations/{mrNumber}/merge", method: "get", ...variables, signal });
const mergeMigrationRequest = (variables, signal) => dataPlaneFetch({
  url: "/dbs/{dbName}/migrations/{mrNumber}/merge",
  method: "post",
  ...variables,
  signal
});
const getBranchSchemaHistory = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/history", method: "post", ...variables, signal });
const compareBranchWithUserSchema = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/compare", method: "post", ...variables, signal });
const compareBranchSchemas = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/compare/{branchName}", method: "post", ...variables, signal });
const updateBranchSchema = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/update", method: "post", ...variables, signal });
const previewBranchSchemaEdit = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/preview", method: "post", ...variables, signal });
const applyBranchSchemaEdit = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/apply", method: "post", ...variables, signal });
const pushBranchMigrations = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/schema/push", method: "post", ...variables, signal });
const createTable = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}",
  method: "put",
  ...variables,
  signal
});
const deleteTable = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}",
  method: "delete",
  ...variables,
  signal
});
const updateTable = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}", method: "patch", ...variables, signal });
const getTableSchema = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/schema",
  method: "get",
  ...variables,
  signal
});
const setTableSchema = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/schema", method: "put", ...variables, signal });
const getTableColumns = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/columns",
  method: "get",
  ...variables,
  signal
});
const addTableColumn = (variables, signal) => dataPlaneFetch(
  { url: "/db/{dbBranchName}/tables/{tableName}/columns", method: "post", ...variables, signal }
);
const getColumn = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/columns/{columnName}",
  method: "get",
  ...variables,
  signal
});
const updateColumn = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/columns/{columnName}", method: "patch", ...variables, signal });
const deleteColumn = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/columns/{columnName}",
  method: "delete",
  ...variables,
  signal
});
const branchTransaction = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/transaction", method: "post", ...variables, signal });
const insertRecord = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/data", method: "post", ...variables, signal });
const getFileItem = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file/{fileId}",
  method: "get",
  ...variables,
  signal
});
const putFileItem = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file/{fileId}",
  method: "put",
  ...variables,
  signal
});
const deleteFileItem = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file/{fileId}",
  method: "delete",
  ...variables,
  signal
});
const getFile = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file",
  method: "get",
  ...variables,
  signal
});
const putFile = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file",
  method: "put",
  ...variables,
  signal
});
const deleteFile = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}/column/{columnName}/file",
  method: "delete",
  ...variables,
  signal
});
const getRecord = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}",
  method: "get",
  ...variables,
  signal
});
const insertRecordWithID = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}", method: "put", ...variables, signal });
const updateRecordWithID = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}", method: "patch", ...variables, signal });
const upsertRecordWithID = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}", method: "post", ...variables, signal });
const deleteRecord = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/data/{recordId}", method: "delete", ...variables, signal });
const bulkInsertTableRecords = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/bulk", method: "post", ...variables, signal });
const queryTable = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/query",
  method: "post",
  ...variables,
  signal
});
const searchBranch = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/search",
  method: "post",
  ...variables,
  signal
});
const searchTable = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/search",
  method: "post",
  ...variables,
  signal
});
const vectorSearchTable = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/vectorSearch", method: "post", ...variables, signal });
const askTable = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/tables/{tableName}/ask",
  method: "post",
  ...variables,
  signal
});
const askTableSession = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/ask/{sessionId}", method: "post", ...variables, signal });
const summarizeTable = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/summarize", method: "post", ...variables, signal });
const aggregateTable = (variables, signal) => dataPlaneFetch({ url: "/db/{dbBranchName}/tables/{tableName}/aggregate", method: "post", ...variables, signal });
const fileAccess = (variables, signal) => dataPlaneFetch({
  url: "/file/{fileId}",
  method: "get",
  ...variables,
  signal
});
const fileUpload = (variables, signal) => dataPlaneFetch({
  url: "/file/{fileId}",
  method: "put",
  ...variables,
  signal
});
const sqlQuery = (variables, signal) => dataPlaneFetch({
  url: "/db/{dbBranchName}/sql",
  method: "post",
  ...variables,
  signal
});
const operationsByTag$2 = {
  branch: {
    applyMigration,
    pgRollStatus,
    pgRollJobStatus,
    pgRollMigrationHistory,
    getBranchList,
    getBranchDetails,
    createBranch,
    deleteBranch,
    copyBranch,
    updateBranchMetadata,
    getBranchMetadata,
    getBranchStats,
    getGitBranchesMapping,
    addGitBranchesEntry,
    removeGitBranchesEntry,
    resolveBranch
  },
  migrations: {
    getSchema,
    getBranchMigrationHistory,
    getBranchMigrationPlan,
    executeBranchMigrationPlan,
    getBranchSchemaHistory,
    compareBranchWithUserSchema,
    compareBranchSchemas,
    updateBranchSchema,
    previewBranchSchemaEdit,
    applyBranchSchemaEdit,
    pushBranchMigrations
  },
  migrationRequests: {
    queryMigrationRequests,
    createMigrationRequest,
    getMigrationRequest,
    updateMigrationRequest,
    listMigrationRequestsCommits,
    compareMigrationRequest,
    getMigrationRequestIsMerged,
    mergeMigrationRequest
  },
  table: {
    createTable,
    deleteTable,
    updateTable,
    getTableSchema,
    setTableSchema,
    getTableColumns,
    addTableColumn,
    getColumn,
    updateColumn,
    deleteColumn
  },
  records: {
    branchTransaction,
    insertRecord,
    getRecord,
    insertRecordWithID,
    updateRecordWithID,
    upsertRecordWithID,
    deleteRecord,
    bulkInsertTableRecords
  },
  files: { getFileItem, putFileItem, deleteFileItem, getFile, putFile, deleteFile, fileAccess, fileUpload },
  searchAndFilter: {
    queryTable,
    searchBranch,
    searchTable,
    vectorSearchTable,
    askTable,
    askTableSession,
    summarizeTable,
    aggregateTable
  },
  sql: { sqlQuery }
};

const controlPlaneFetch = async (options) => fetch$1({ ...options, endpoint: "controlPlane" });

const getAuthorizationCode = (variables, signal) => controlPlaneFetch({ url: "/oauth/authorize", method: "get", ...variables, signal });
const grantAuthorizationCode = (variables, signal) => controlPlaneFetch({ url: "/oauth/authorize", method: "post", ...variables, signal });
const getUser = (variables, signal) => controlPlaneFetch({
  url: "/user",
  method: "get",
  ...variables,
  signal
});
const updateUser = (variables, signal) => controlPlaneFetch({
  url: "/user",
  method: "put",
  ...variables,
  signal
});
const deleteUser = (variables, signal) => controlPlaneFetch({
  url: "/user",
  method: "delete",
  ...variables,
  signal
});
const getUserAPIKeys = (variables, signal) => controlPlaneFetch({
  url: "/user/keys",
  method: "get",
  ...variables,
  signal
});
const createUserAPIKey = (variables, signal) => controlPlaneFetch({
  url: "/user/keys/{keyName}",
  method: "post",
  ...variables,
  signal
});
const deleteUserAPIKey = (variables, signal) => controlPlaneFetch({
  url: "/user/keys/{keyName}",
  method: "delete",
  ...variables,
  signal
});
const getUserOAuthClients = (variables, signal) => controlPlaneFetch({
  url: "/user/oauth/clients",
  method: "get",
  ...variables,
  signal
});
const deleteUserOAuthClient = (variables, signal) => controlPlaneFetch({
  url: "/user/oauth/clients/{clientId}",
  method: "delete",
  ...variables,
  signal
});
const getUserOAuthAccessTokens = (variables, signal) => controlPlaneFetch({
  url: "/user/oauth/tokens",
  method: "get",
  ...variables,
  signal
});
const deleteOAuthAccessToken = (variables, signal) => controlPlaneFetch({
  url: "/user/oauth/tokens/{token}",
  method: "delete",
  ...variables,
  signal
});
const updateOAuthAccessToken = (variables, signal) => controlPlaneFetch({ url: "/user/oauth/tokens/{token}", method: "patch", ...variables, signal });
const getWorkspacesList = (variables, signal) => controlPlaneFetch({
  url: "/workspaces",
  method: "get",
  ...variables,
  signal
});
const createWorkspace = (variables, signal) => controlPlaneFetch({
  url: "/workspaces",
  method: "post",
  ...variables,
  signal
});
const getWorkspace = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}",
  method: "get",
  ...variables,
  signal
});
const updateWorkspace = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}",
  method: "put",
  ...variables,
  signal
});
const deleteWorkspace = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}",
  method: "delete",
  ...variables,
  signal
});
const getWorkspaceMembersList = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/members", method: "get", ...variables, signal });
const updateWorkspaceMemberRole = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/members/{userId}", method: "put", ...variables, signal });
const removeWorkspaceMember = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}/members/{userId}",
  method: "delete",
  ...variables,
  signal
});
const inviteWorkspaceMember = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/invites", method: "post", ...variables, signal });
const updateWorkspaceMemberInvite = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/invites/{inviteId}", method: "patch", ...variables, signal });
const cancelWorkspaceMemberInvite = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/invites/{inviteId}", method: "delete", ...variables, signal });
const acceptWorkspaceMemberInvite = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/invites/{inviteKey}/accept", method: "post", ...variables, signal });
const resendWorkspaceMemberInvite = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/invites/{inviteId}/resend", method: "post", ...variables, signal });
const listClusters = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/clusters", method: "get", ...variables, signal });
const createCluster = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/clusters", method: "post", ...variables, signal });
const getCluster = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}/clusters/{clusterId}",
  method: "get",
  ...variables,
  signal
});
const updateCluster = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/clusters/{clusterId}", method: "patch", ...variables, signal });
const getDatabaseList = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}/dbs",
  method: "get",
  ...variables,
  signal
});
const createDatabase = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}", method: "put", ...variables, signal });
const deleteDatabase = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}/dbs/{dbName}",
  method: "delete",
  ...variables,
  signal
});
const getDatabaseMetadata = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}", method: "get", ...variables, signal });
const updateDatabaseMetadata = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}", method: "patch", ...variables, signal });
const renameDatabase = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}/rename", method: "post", ...variables, signal });
const getDatabaseGithubSettings = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}/github", method: "get", ...variables, signal });
const updateDatabaseGithubSettings = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}/github", method: "put", ...variables, signal });
const deleteDatabaseGithubSettings = (variables, signal) => controlPlaneFetch({ url: "/workspaces/{workspaceId}/dbs/{dbName}/github", method: "delete", ...variables, signal });
const listRegions = (variables, signal) => controlPlaneFetch({
  url: "/workspaces/{workspaceId}/regions",
  method: "get",
  ...variables,
  signal
});
const operationsByTag$1 = {
  oAuth: {
    getAuthorizationCode,
    grantAuthorizationCode,
    getUserOAuthClients,
    deleteUserOAuthClient,
    getUserOAuthAccessTokens,
    deleteOAuthAccessToken,
    updateOAuthAccessToken
  },
  users: { getUser, updateUser, deleteUser },
  authentication: { getUserAPIKeys, createUserAPIKey, deleteUserAPIKey },
  workspaces: {
    getWorkspacesList,
    createWorkspace,
    getWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembersList,
    updateWorkspaceMemberRole,
    removeWorkspaceMember
  },
  invites: {
    inviteWorkspaceMember,
    updateWorkspaceMemberInvite,
    cancelWorkspaceMemberInvite,
    acceptWorkspaceMemberInvite,
    resendWorkspaceMemberInvite
  },
  xbcontrolOther: { listClusters, createCluster, getCluster, updateCluster },
  databases: {
    getDatabaseList,
    createDatabase,
    deleteDatabase,
    getDatabaseMetadata,
    updateDatabaseMetadata,
    renameDatabase,
    getDatabaseGithubSettings,
    updateDatabaseGithubSettings,
    deleteDatabaseGithubSettings,
    listRegions
  }
};

const operationsByTag = deepMerge(operationsByTag$2, operationsByTag$1);

var __accessCheck$7 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$7 = (obj, member, getter) => {
  __accessCheck$7(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$7 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$7 = (obj, member, value, setter) => {
  __accessCheck$7(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _extraProps, _namespaces;
class XataApiClient {
  constructor(options = {}) {
    __privateAdd$7(this, _extraProps, void 0);
    __privateAdd$7(this, _namespaces, {});
    const provider = options.host ?? "production";
    const apiKey = options.apiKey ?? getAPIKey();
    const trace = options.trace ?? defaultTrace;
    const clientID = generateUUID();
    if (!apiKey) {
      throw new Error("Could not resolve a valid apiKey");
    }
    __privateSet$7(this, _extraProps, {
      apiUrl: getHostUrl(provider, "main"),
      workspacesApiUrl: getHostUrl(provider, "workspaces"),
      fetch: getFetchImplementation(options.fetch),
      apiKey,
      trace,
      clientName: options.clientName,
      xataAgentExtra: options.xataAgentExtra,
      clientID
    });
  }
  get user() {
    if (!__privateGet$7(this, _namespaces).user)
      __privateGet$7(this, _namespaces).user = new UserApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).user;
  }
  get authentication() {
    if (!__privateGet$7(this, _namespaces).authentication)
      __privateGet$7(this, _namespaces).authentication = new AuthenticationApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).authentication;
  }
  get workspaces() {
    if (!__privateGet$7(this, _namespaces).workspaces)
      __privateGet$7(this, _namespaces).workspaces = new WorkspaceApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).workspaces;
  }
  get invites() {
    if (!__privateGet$7(this, _namespaces).invites)
      __privateGet$7(this, _namespaces).invites = new InvitesApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).invites;
  }
  get database() {
    if (!__privateGet$7(this, _namespaces).database)
      __privateGet$7(this, _namespaces).database = new DatabaseApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).database;
  }
  get branches() {
    if (!__privateGet$7(this, _namespaces).branches)
      __privateGet$7(this, _namespaces).branches = new BranchApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).branches;
  }
  get migrations() {
    if (!__privateGet$7(this, _namespaces).migrations)
      __privateGet$7(this, _namespaces).migrations = new MigrationsApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).migrations;
  }
  get migrationRequests() {
    if (!__privateGet$7(this, _namespaces).migrationRequests)
      __privateGet$7(this, _namespaces).migrationRequests = new MigrationRequestsApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).migrationRequests;
  }
  get tables() {
    if (!__privateGet$7(this, _namespaces).tables)
      __privateGet$7(this, _namespaces).tables = new TableApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).tables;
  }
  get records() {
    if (!__privateGet$7(this, _namespaces).records)
      __privateGet$7(this, _namespaces).records = new RecordsApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).records;
  }
  get files() {
    if (!__privateGet$7(this, _namespaces).files)
      __privateGet$7(this, _namespaces).files = new FilesApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).files;
  }
  get searchAndFilter() {
    if (!__privateGet$7(this, _namespaces).searchAndFilter)
      __privateGet$7(this, _namespaces).searchAndFilter = new SearchAndFilterApi(__privateGet$7(this, _extraProps));
    return __privateGet$7(this, _namespaces).searchAndFilter;
  }
}
_extraProps = new WeakMap();
_namespaces = new WeakMap();
class UserApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getUser() {
    return operationsByTag.users.getUser({ ...this.extraProps });
  }
  updateUser({ user }) {
    return operationsByTag.users.updateUser({ body: user, ...this.extraProps });
  }
  deleteUser() {
    return operationsByTag.users.deleteUser({ ...this.extraProps });
  }
}
class AuthenticationApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getUserAPIKeys() {
    return operationsByTag.authentication.getUserAPIKeys({ ...this.extraProps });
  }
  createUserAPIKey({ name }) {
    return operationsByTag.authentication.createUserAPIKey({
      pathParams: { keyName: name },
      ...this.extraProps
    });
  }
  deleteUserAPIKey({ name }) {
    return operationsByTag.authentication.deleteUserAPIKey({
      pathParams: { keyName: name },
      ...this.extraProps
    });
  }
}
class WorkspaceApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getWorkspacesList() {
    return operationsByTag.workspaces.getWorkspacesList({ ...this.extraProps });
  }
  createWorkspace({ data }) {
    return operationsByTag.workspaces.createWorkspace({
      body: data,
      ...this.extraProps
    });
  }
  getWorkspace({ workspace }) {
    return operationsByTag.workspaces.getWorkspace({
      pathParams: { workspaceId: workspace },
      ...this.extraProps
    });
  }
  updateWorkspace({
    workspace,
    update
  }) {
    return operationsByTag.workspaces.updateWorkspace({
      pathParams: { workspaceId: workspace },
      body: update,
      ...this.extraProps
    });
  }
  deleteWorkspace({ workspace }) {
    return operationsByTag.workspaces.deleteWorkspace({
      pathParams: { workspaceId: workspace },
      ...this.extraProps
    });
  }
  getWorkspaceMembersList({ workspace }) {
    return operationsByTag.workspaces.getWorkspaceMembersList({
      pathParams: { workspaceId: workspace },
      ...this.extraProps
    });
  }
  updateWorkspaceMemberRole({
    workspace,
    user,
    role
  }) {
    return operationsByTag.workspaces.updateWorkspaceMemberRole({
      pathParams: { workspaceId: workspace, userId: user },
      body: { role },
      ...this.extraProps
    });
  }
  removeWorkspaceMember({
    workspace,
    user
  }) {
    return operationsByTag.workspaces.removeWorkspaceMember({
      pathParams: { workspaceId: workspace, userId: user },
      ...this.extraProps
    });
  }
}
class InvitesApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  inviteWorkspaceMember({
    workspace,
    email,
    role
  }) {
    return operationsByTag.invites.inviteWorkspaceMember({
      pathParams: { workspaceId: workspace },
      body: { email, role },
      ...this.extraProps
    });
  }
  updateWorkspaceMemberInvite({
    workspace,
    invite,
    role
  }) {
    return operationsByTag.invites.updateWorkspaceMemberInvite({
      pathParams: { workspaceId: workspace, inviteId: invite },
      body: { role },
      ...this.extraProps
    });
  }
  cancelWorkspaceMemberInvite({
    workspace,
    invite
  }) {
    return operationsByTag.invites.cancelWorkspaceMemberInvite({
      pathParams: { workspaceId: workspace, inviteId: invite },
      ...this.extraProps
    });
  }
  acceptWorkspaceMemberInvite({
    workspace,
    key
  }) {
    return operationsByTag.invites.acceptWorkspaceMemberInvite({
      pathParams: { workspaceId: workspace, inviteKey: key },
      ...this.extraProps
    });
  }
  resendWorkspaceMemberInvite({
    workspace,
    invite
  }) {
    return operationsByTag.invites.resendWorkspaceMemberInvite({
      pathParams: { workspaceId: workspace, inviteId: invite },
      ...this.extraProps
    });
  }
}
class BranchApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getBranchList({
    workspace,
    region,
    database
  }) {
    return operationsByTag.branch.getBranchList({
      pathParams: { workspace, region, dbName: database },
      ...this.extraProps
    });
  }
  getBranchDetails({
    workspace,
    region,
    database,
    branch
  }) {
    return operationsByTag.branch.getBranchDetails({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      ...this.extraProps
    });
  }
  createBranch({
    workspace,
    region,
    database,
    branch,
    from,
    metadata
  }) {
    return operationsByTag.branch.createBranch({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { from, metadata },
      ...this.extraProps
    });
  }
  deleteBranch({
    workspace,
    region,
    database,
    branch
  }) {
    return operationsByTag.branch.deleteBranch({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      ...this.extraProps
    });
  }
  copyBranch({
    workspace,
    region,
    database,
    branch,
    destinationBranch,
    limit
  }) {
    return operationsByTag.branch.copyBranch({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { destinationBranch, limit },
      ...this.extraProps
    });
  }
  updateBranchMetadata({
    workspace,
    region,
    database,
    branch,
    metadata
  }) {
    return operationsByTag.branch.updateBranchMetadata({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: metadata,
      ...this.extraProps
    });
  }
  getBranchMetadata({
    workspace,
    region,
    database,
    branch
  }) {
    return operationsByTag.branch.getBranchMetadata({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      ...this.extraProps
    });
  }
  getBranchStats({
    workspace,
    region,
    database,
    branch
  }) {
    return operationsByTag.branch.getBranchStats({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      ...this.extraProps
    });
  }
  getGitBranchesMapping({
    workspace,
    region,
    database
  }) {
    return operationsByTag.branch.getGitBranchesMapping({
      pathParams: { workspace, region, dbName: database },
      ...this.extraProps
    });
  }
  addGitBranchesEntry({
    workspace,
    region,
    database,
    gitBranch,
    xataBranch
  }) {
    return operationsByTag.branch.addGitBranchesEntry({
      pathParams: { workspace, region, dbName: database },
      body: { gitBranch, xataBranch },
      ...this.extraProps
    });
  }
  removeGitBranchesEntry({
    workspace,
    region,
    database,
    gitBranch
  }) {
    return operationsByTag.branch.removeGitBranchesEntry({
      pathParams: { workspace, region, dbName: database },
      queryParams: { gitBranch },
      ...this.extraProps
    });
  }
  resolveBranch({
    workspace,
    region,
    database,
    gitBranch,
    fallbackBranch
  }) {
    return operationsByTag.branch.resolveBranch({
      pathParams: { workspace, region, dbName: database },
      queryParams: { gitBranch, fallbackBranch },
      ...this.extraProps
    });
  }
}
class TableApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  createTable({
    workspace,
    region,
    database,
    branch,
    table
  }) {
    return operationsByTag.table.createTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      ...this.extraProps
    });
  }
  deleteTable({
    workspace,
    region,
    database,
    branch,
    table
  }) {
    return operationsByTag.table.deleteTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      ...this.extraProps
    });
  }
  updateTable({
    workspace,
    region,
    database,
    branch,
    table,
    update
  }) {
    return operationsByTag.table.updateTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: update,
      ...this.extraProps
    });
  }
  getTableSchema({
    workspace,
    region,
    database,
    branch,
    table
  }) {
    return operationsByTag.table.getTableSchema({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      ...this.extraProps
    });
  }
  setTableSchema({
    workspace,
    region,
    database,
    branch,
    table,
    schema
  }) {
    return operationsByTag.table.setTableSchema({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: schema,
      ...this.extraProps
    });
  }
  getTableColumns({
    workspace,
    region,
    database,
    branch,
    table
  }) {
    return operationsByTag.table.getTableColumns({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      ...this.extraProps
    });
  }
  addTableColumn({
    workspace,
    region,
    database,
    branch,
    table,
    column
  }) {
    return operationsByTag.table.addTableColumn({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: column,
      ...this.extraProps
    });
  }
  getColumn({
    workspace,
    region,
    database,
    branch,
    table,
    column
  }) {
    return operationsByTag.table.getColumn({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, columnName: column },
      ...this.extraProps
    });
  }
  updateColumn({
    workspace,
    region,
    database,
    branch,
    table,
    column,
    update
  }) {
    return operationsByTag.table.updateColumn({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, columnName: column },
      body: update,
      ...this.extraProps
    });
  }
  deleteColumn({
    workspace,
    region,
    database,
    branch,
    table,
    column
  }) {
    return operationsByTag.table.deleteColumn({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, columnName: column },
      ...this.extraProps
    });
  }
}
class RecordsApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  insertRecord({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    columns
  }) {
    return operationsByTag.records.insertRecord({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      queryParams: { columns },
      body: record,
      ...this.extraProps
    });
  }
  getRecord({
    workspace,
    region,
    database,
    branch,
    table,
    id,
    columns
  }) {
    return operationsByTag.records.getRecord({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, recordId: id },
      queryParams: { columns },
      ...this.extraProps
    });
  }
  insertRecordWithID({
    workspace,
    region,
    database,
    branch,
    table,
    id,
    record,
    columns,
    createOnly,
    ifVersion
  }) {
    return operationsByTag.records.insertRecordWithID({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, recordId: id },
      queryParams: { columns, createOnly, ifVersion },
      body: record,
      ...this.extraProps
    });
  }
  updateRecordWithID({
    workspace,
    region,
    database,
    branch,
    table,
    id,
    record,
    columns,
    ifVersion
  }) {
    return operationsByTag.records.updateRecordWithID({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, recordId: id },
      queryParams: { columns, ifVersion },
      body: record,
      ...this.extraProps
    });
  }
  upsertRecordWithID({
    workspace,
    region,
    database,
    branch,
    table,
    id,
    record,
    columns,
    ifVersion
  }) {
    return operationsByTag.records.upsertRecordWithID({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, recordId: id },
      queryParams: { columns, ifVersion },
      body: record,
      ...this.extraProps
    });
  }
  deleteRecord({
    workspace,
    region,
    database,
    branch,
    table,
    id,
    columns
  }) {
    return operationsByTag.records.deleteRecord({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, recordId: id },
      queryParams: { columns },
      ...this.extraProps
    });
  }
  bulkInsertTableRecords({
    workspace,
    region,
    database,
    branch,
    table,
    records,
    columns
  }) {
    return operationsByTag.records.bulkInsertTableRecords({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      queryParams: { columns },
      body: { records },
      ...this.extraProps
    });
  }
  branchTransaction({
    workspace,
    region,
    database,
    branch,
    operations
  }) {
    return operationsByTag.records.branchTransaction({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { operations },
      ...this.extraProps
    });
  }
}
class FilesApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getFileItem({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column,
    fileId
  }) {
    return operationsByTag.files.getFileItem({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column,
        fileId
      },
      ...this.extraProps
    });
  }
  putFileItem({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column,
    fileId,
    file
  }) {
    return operationsByTag.files.putFileItem({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column,
        fileId
      },
      // @ts-ignore
      body: file,
      ...this.extraProps
    });
  }
  deleteFileItem({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column,
    fileId
  }) {
    return operationsByTag.files.deleteFileItem({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column,
        fileId
      },
      ...this.extraProps
    });
  }
  getFile({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column
  }) {
    return operationsByTag.files.getFile({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column
      },
      ...this.extraProps
    });
  }
  putFile({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column,
    file
  }) {
    return operationsByTag.files.putFile({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column
      },
      body: file,
      ...this.extraProps
    });
  }
  deleteFile({
    workspace,
    region,
    database,
    branch,
    table,
    record,
    column
  }) {
    return operationsByTag.files.deleteFile({
      pathParams: {
        workspace,
        region,
        dbBranchName: `${database}:${branch}`,
        tableName: table,
        recordId: record,
        columnName: column
      },
      ...this.extraProps
    });
  }
  fileAccess({
    workspace,
    region,
    fileId,
    verify
  }) {
    return operationsByTag.files.fileAccess({
      pathParams: {
        workspace,
        region,
        fileId
      },
      queryParams: { verify },
      ...this.extraProps
    });
  }
}
class SearchAndFilterApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  queryTable({
    workspace,
    region,
    database,
    branch,
    table,
    filter,
    sort,
    page,
    columns,
    consistency
  }) {
    return operationsByTag.searchAndFilter.queryTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { filter, sort, page, columns, consistency },
      ...this.extraProps
    });
  }
  searchTable({
    workspace,
    region,
    database,
    branch,
    table,
    query,
    fuzziness,
    target,
    prefix,
    filter,
    highlight,
    boosters
  }) {
    return operationsByTag.searchAndFilter.searchTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { query, fuzziness, target, prefix, filter, highlight, boosters },
      ...this.extraProps
    });
  }
  searchBranch({
    workspace,
    region,
    database,
    branch,
    tables,
    query,
    fuzziness,
    prefix,
    highlight
  }) {
    return operationsByTag.searchAndFilter.searchBranch({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { tables, query, fuzziness, prefix, highlight },
      ...this.extraProps
    });
  }
  vectorSearchTable({
    workspace,
    region,
    database,
    branch,
    table,
    queryVector,
    column,
    similarityFunction,
    size,
    filter
  }) {
    return operationsByTag.searchAndFilter.vectorSearchTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { queryVector, column, similarityFunction, size, filter },
      ...this.extraProps
    });
  }
  askTable({
    workspace,
    region,
    database,
    branch,
    table,
    options
  }) {
    return operationsByTag.searchAndFilter.askTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { ...options },
      ...this.extraProps
    });
  }
  askTableSession({
    workspace,
    region,
    database,
    branch,
    table,
    sessionId,
    message
  }) {
    return operationsByTag.searchAndFilter.askTableSession({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table, sessionId },
      body: { message },
      ...this.extraProps
    });
  }
  summarizeTable({
    workspace,
    region,
    database,
    branch,
    table,
    filter,
    columns,
    summaries,
    sort,
    summariesFilter,
    page,
    consistency
  }) {
    return operationsByTag.searchAndFilter.summarizeTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { filter, columns, summaries, sort, summariesFilter, page, consistency },
      ...this.extraProps
    });
  }
  aggregateTable({
    workspace,
    region,
    database,
    branch,
    table,
    filter,
    aggs
  }) {
    return operationsByTag.searchAndFilter.aggregateTable({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, tableName: table },
      body: { filter, aggs },
      ...this.extraProps
    });
  }
}
class MigrationRequestsApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  queryMigrationRequests({
    workspace,
    region,
    database,
    filter,
    sort,
    page,
    columns
  }) {
    return operationsByTag.migrationRequests.queryMigrationRequests({
      pathParams: { workspace, region, dbName: database },
      body: { filter, sort, page, columns },
      ...this.extraProps
    });
  }
  createMigrationRequest({
    workspace,
    region,
    database,
    migration
  }) {
    return operationsByTag.migrationRequests.createMigrationRequest({
      pathParams: { workspace, region, dbName: database },
      body: migration,
      ...this.extraProps
    });
  }
  getMigrationRequest({
    workspace,
    region,
    database,
    migrationRequest
  }) {
    return operationsByTag.migrationRequests.getMigrationRequest({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      ...this.extraProps
    });
  }
  updateMigrationRequest({
    workspace,
    region,
    database,
    migrationRequest,
    update
  }) {
    return operationsByTag.migrationRequests.updateMigrationRequest({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      body: update,
      ...this.extraProps
    });
  }
  listMigrationRequestsCommits({
    workspace,
    region,
    database,
    migrationRequest,
    page
  }) {
    return operationsByTag.migrationRequests.listMigrationRequestsCommits({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      body: { page },
      ...this.extraProps
    });
  }
  compareMigrationRequest({
    workspace,
    region,
    database,
    migrationRequest
  }) {
    return operationsByTag.migrationRequests.compareMigrationRequest({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      ...this.extraProps
    });
  }
  getMigrationRequestIsMerged({
    workspace,
    region,
    database,
    migrationRequest
  }) {
    return operationsByTag.migrationRequests.getMigrationRequestIsMerged({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      ...this.extraProps
    });
  }
  mergeMigrationRequest({
    workspace,
    region,
    database,
    migrationRequest
  }) {
    return operationsByTag.migrationRequests.mergeMigrationRequest({
      pathParams: { workspace, region, dbName: database, mrNumber: migrationRequest },
      ...this.extraProps
    });
  }
}
class MigrationsApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getBranchMigrationHistory({
    workspace,
    region,
    database,
    branch,
    limit,
    startFrom
  }) {
    return operationsByTag.migrations.getBranchMigrationHistory({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { limit, startFrom },
      ...this.extraProps
    });
  }
  getBranchMigrationPlan({
    workspace,
    region,
    database,
    branch,
    schema
  }) {
    return operationsByTag.migrations.getBranchMigrationPlan({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: schema,
      ...this.extraProps
    });
  }
  executeBranchMigrationPlan({
    workspace,
    region,
    database,
    branch,
    plan
  }) {
    return operationsByTag.migrations.executeBranchMigrationPlan({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: plan,
      ...this.extraProps
    });
  }
  getBranchSchemaHistory({
    workspace,
    region,
    database,
    branch,
    page
  }) {
    return operationsByTag.migrations.getBranchSchemaHistory({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { page },
      ...this.extraProps
    });
  }
  compareBranchWithUserSchema({
    workspace,
    region,
    database,
    branch,
    schema,
    schemaOperations,
    branchOperations
  }) {
    return operationsByTag.migrations.compareBranchWithUserSchema({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { schema, schemaOperations, branchOperations },
      ...this.extraProps
    });
  }
  compareBranchSchemas({
    workspace,
    region,
    database,
    branch,
    compare,
    sourceBranchOperations,
    targetBranchOperations
  }) {
    return operationsByTag.migrations.compareBranchSchemas({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}`, branchName: compare },
      body: { sourceBranchOperations, targetBranchOperations },
      ...this.extraProps
    });
  }
  updateBranchSchema({
    workspace,
    region,
    database,
    branch,
    migration
  }) {
    return operationsByTag.migrations.updateBranchSchema({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: migration,
      ...this.extraProps
    });
  }
  previewBranchSchemaEdit({
    workspace,
    region,
    database,
    branch,
    data
  }) {
    return operationsByTag.migrations.previewBranchSchemaEdit({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: data,
      ...this.extraProps
    });
  }
  applyBranchSchemaEdit({
    workspace,
    region,
    database,
    branch,
    edits
  }) {
    return operationsByTag.migrations.applyBranchSchemaEdit({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { edits },
      ...this.extraProps
    });
  }
  pushBranchMigrations({
    workspace,
    region,
    database,
    branch,
    migrations
  }) {
    return operationsByTag.migrations.pushBranchMigrations({
      pathParams: { workspace, region, dbBranchName: `${database}:${branch}` },
      body: { migrations },
      ...this.extraProps
    });
  }
}
class DatabaseApi {
  constructor(extraProps) {
    this.extraProps = extraProps;
  }
  getDatabaseList({ workspace }) {
    return operationsByTag.databases.getDatabaseList({
      pathParams: { workspaceId: workspace },
      ...this.extraProps
    });
  }
  createDatabase({
    workspace,
    database,
    data,
    headers
  }) {
    return operationsByTag.databases.createDatabase({
      pathParams: { workspaceId: workspace, dbName: database },
      body: data,
      headers,
      ...this.extraProps
    });
  }
  deleteDatabase({
    workspace,
    database
  }) {
    return operationsByTag.databases.deleteDatabase({
      pathParams: { workspaceId: workspace, dbName: database },
      ...this.extraProps
    });
  }
  getDatabaseMetadata({
    workspace,
    database
  }) {
    return operationsByTag.databases.getDatabaseMetadata({
      pathParams: { workspaceId: workspace, dbName: database },
      ...this.extraProps
    });
  }
  updateDatabaseMetadata({
    workspace,
    database,
    metadata
  }) {
    return operationsByTag.databases.updateDatabaseMetadata({
      pathParams: { workspaceId: workspace, dbName: database },
      body: metadata,
      ...this.extraProps
    });
  }
  renameDatabase({
    workspace,
    database,
    newName
  }) {
    return operationsByTag.databases.renameDatabase({
      pathParams: { workspaceId: workspace, dbName: database },
      body: { newName },
      ...this.extraProps
    });
  }
  getDatabaseGithubSettings({
    workspace,
    database
  }) {
    return operationsByTag.databases.getDatabaseGithubSettings({
      pathParams: { workspaceId: workspace, dbName: database },
      ...this.extraProps
    });
  }
  updateDatabaseGithubSettings({
    workspace,
    database,
    settings
  }) {
    return operationsByTag.databases.updateDatabaseGithubSettings({
      pathParams: { workspaceId: workspace, dbName: database },
      body: settings,
      ...this.extraProps
    });
  }
  deleteDatabaseGithubSettings({
    workspace,
    database
  }) {
    return operationsByTag.databases.deleteDatabaseGithubSettings({
      pathParams: { workspaceId: workspace, dbName: database },
      ...this.extraProps
    });
  }
  listRegions({ workspace }) {
    return operationsByTag.databases.listRegions({
      pathParams: { workspaceId: workspace },
      ...this.extraProps
    });
  }
}

class XataApiPlugin {
  build(options) {
    return new XataApiClient(options);
  }
}

class XataPlugin {
}

function buildTransformString(transformations) {
  return transformations.flatMap(
    (t) => Object.entries(t).map(([key, value]) => {
      if (key === "trim") {
        const { left = 0, top = 0, right = 0, bottom = 0 } = value;
        return `${key}=${[top, right, bottom, left].join(";")}`;
      }
      if (key === "gravity" && typeof value === "object") {
        const { x = 0.5, y = 0.5 } = value;
        return `${key}=${[x, y].join("x")}`;
      }
      return `${key}=${value}`;
    })
  ).join(",");
}
function transformImage(url, ...transformations) {
  if (!isDefined(url))
    return void 0;
  const newTransformations = buildTransformString(transformations);
  const { hostname, pathname, search } = new URL(url);
  const pathParts = pathname.split("/");
  const transformIndex = pathParts.findIndex((part) => part === "transform");
  const removedItems = transformIndex >= 0 ? pathParts.splice(transformIndex, 2) : [];
  const transform = `/transform/${[removedItems[1], newTransformations].filter(isDefined).join(",")}`;
  const path = pathParts.join("/");
  return `https://${hostname}${transform}${path}${search}`;
}

class XataFile {
  constructor(file) {
    this.id = file.id;
    this.name = file.name;
    this.mediaType = file.mediaType;
    this.base64Content = file.base64Content;
    this.enablePublicUrl = file.enablePublicUrl;
    this.signedUrlTimeout = file.signedUrlTimeout;
    this.uploadUrlTimeout = file.uploadUrlTimeout;
    this.size = file.size;
    this.version = file.version;
    this.url = file.url;
    this.signedUrl = file.signedUrl;
    this.uploadUrl = file.uploadUrl;
    this.attributes = file.attributes;
  }
  static fromBuffer(buffer, options = {}) {
    const base64Content = buffer.toString("base64");
    return new XataFile({ ...options, base64Content });
  }
  toBuffer() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    return Buffer.from(this.base64Content, "base64");
  }
  static fromArrayBuffer(arrayBuffer, options = {}) {
    const uint8Array = new Uint8Array(arrayBuffer);
    return this.fromUint8Array(uint8Array, options);
  }
  toArrayBuffer() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    const binary = atob(this.base64Content);
    return new ArrayBuffer(binary.length);
  }
  static fromUint8Array(uint8Array, options = {}) {
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Content = btoa(binary);
    return new XataFile({ ...options, base64Content });
  }
  toUint8Array() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    const binary = atob(this.base64Content);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    return uint8Array;
  }
  static async fromBlob(file, options = {}) {
    const name = options.name ?? file.name;
    const mediaType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    return this.fromArrayBuffer(arrayBuffer, { ...options, name, mediaType });
  }
  toBlob() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    const binary = atob(this.base64Content);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: this.mediaType });
  }
  static fromString(string, options = {}) {
    const base64Content = btoa(string);
    return new XataFile({ ...options, base64Content });
  }
  toString() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    return atob(this.base64Content);
  }
  static fromBase64(base64Content, options = {}) {
    return new XataFile({ ...options, base64Content });
  }
  toBase64() {
    if (!this.base64Content) {
      throw new Error(`File content is not available, please select property "base64Content" when querying the file`);
    }
    return this.base64Content;
  }
  transform(...options) {
    return {
      url: transformImage(this.url, ...options),
      signedUrl: transformImage(this.signedUrl, ...options),
      metadataUrl: transformImage(this.url, ...options, { format: "json" }),
      metadataSignedUrl: transformImage(this.signedUrl, ...options, { format: "json" })
    };
  }
}
const parseInputFileEntry = async (entry) => {
  if (!isDefined(entry))
    return null;
  const { id, name, mediaType, base64Content, enablePublicUrl, signedUrlTimeout, uploadUrlTimeout } = await entry;
  return compactObject({
    id,
    // Name cannot be an empty string in our API
    name: name ? name : void 0,
    mediaType,
    base64Content,
    enablePublicUrl,
    signedUrlTimeout,
    uploadUrlTimeout
  });
};

function cleanFilter(filter) {
  if (!isDefined(filter))
    return void 0;
  if (!isObject(filter))
    return filter;
  const values = Object.fromEntries(
    Object.entries(filter).reduce((acc, [key, value]) => {
      if (!isDefined(value))
        return acc;
      if (Array.isArray(value)) {
        const clean = value.map((item) => cleanFilter(item)).filter((item) => isDefined(item));
        if (clean.length === 0)
          return acc;
        return [...acc, [key, clean]];
      }
      if (isObject(value)) {
        const clean = cleanFilter(value);
        if (!isDefined(clean))
          return acc;
        return [...acc, [key, clean]];
      }
      return [...acc, [key, value]];
    }, [])
  );
  return Object.keys(values).length > 0 ? values : void 0;
}

function stringifyJson(value) {
  if (!isDefined(value))
    return value;
  if (isString(value))
    return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return value;
  }
}
function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

var __accessCheck$6 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$6 = (obj, member, getter) => {
  __accessCheck$6(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$6 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$6 = (obj, member, value, setter) => {
  __accessCheck$6(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _query, _page;
class Page {
  constructor(query, meta, records = []) {
    __privateAdd$6(this, _query, void 0);
    __privateSet$6(this, _query, query);
    this.meta = meta;
    this.records = new RecordArray(this, records);
  }
  /**
   * Retrieves the next page of results.
   * @param size Maximum number of results to be retrieved.
   * @param offset Number of results to skip when retrieving the results.
   * @returns The next page or results.
   */
  async nextPage(size, offset) {
    return __privateGet$6(this, _query).getPaginated({ pagination: { size, offset, after: this.meta.page.cursor } });
  }
  /**
   * Retrieves the previous page of results.
   * @param size Maximum number of results to be retrieved.
   * @param offset Number of results to skip when retrieving the results.
   * @returns The previous page or results.
   */
  async previousPage(size, offset) {
    return __privateGet$6(this, _query).getPaginated({ pagination: { size, offset, before: this.meta.page.cursor } });
  }
  /**
   * Retrieves the start page of results.
   * @param size Maximum number of results to be retrieved.
   * @param offset Number of results to skip when retrieving the results.
   * @returns The start page or results.
   */
  async startPage(size, offset) {
    return __privateGet$6(this, _query).getPaginated({ pagination: { size, offset, start: this.meta.page.cursor } });
  }
  /**
   * Retrieves the end page of results.
   * @param size Maximum number of results to be retrieved.
   * @param offset Number of results to skip when retrieving the results.
   * @returns The end page or results.
   */
  async endPage(size, offset) {
    return __privateGet$6(this, _query).getPaginated({ pagination: { size, offset, end: this.meta.page.cursor } });
  }
  /**
   * Shortcut method to check if there will be additional results if the next page of results is retrieved.
   * @returns Whether or not there will be additional results in the next page of results.
   */
  hasNextPage() {
    return this.meta.page.more;
  }
}
_query = new WeakMap();
const PAGINATION_MAX_SIZE = 1e3;
const PAGINATION_DEFAULT_SIZE = 20;
const PAGINATION_MAX_OFFSET = 49e3;
const PAGINATION_DEFAULT_OFFSET = 0;
function isCursorPaginationOptions(options) {
  return isDefined(options) && (isDefined(options.start) || isDefined(options.end) || isDefined(options.after) || isDefined(options.before));
}
const _RecordArray = class _RecordArray extends Array {
  constructor(...args) {
    super(..._RecordArray.parseConstructorParams(...args));
    __privateAdd$6(this, _page, void 0);
    __privateSet$6(this, _page, isObject(args[0]?.meta) ? args[0] : { meta: { page: { cursor: "", more: false } }, records: [] });
  }
  static parseConstructorParams(...args) {
    if (args.length === 1 && typeof args[0] === "number") {
      return new Array(args[0]);
    }
    if (args.length <= 2 && isObject(args[0]?.meta) && Array.isArray(args[1] ?? [])) {
      const result = args[1] ?? args[0].records ?? [];
      return new Array(...result);
    }
    return new Array(...args);
  }
  toArray() {
    return new Array(...this);
  }
  toSerializable() {
    return JSON.parse(this.toString());
  }
  toString() {
    return JSON.stringify(this.toArray());
  }
  map(callbackfn, thisArg) {
    return this.toArray().map(callbackfn, thisArg);
  }
  /**
   * Retrieve next page of records
   *
   * @returns A new array of objects
   */
  async nextPage(size, offset) {
    const newPage = await __privateGet$6(this, _page).nextPage(size, offset);
    return new _RecordArray(newPage);
  }
  /**
   * Retrieve previous page of records
   *
   * @returns A new array of objects
   */
  async previousPage(size, offset) {
    const newPage = await __privateGet$6(this, _page).previousPage(size, offset);
    return new _RecordArray(newPage);
  }
  /**
   * Retrieve start page of records
   *
   * @returns A new array of objects
   */
  async startPage(size, offset) {
    const newPage = await __privateGet$6(this, _page).startPage(size, offset);
    return new _RecordArray(newPage);
  }
  /**
   * Retrieve end page of records
   *
   * @returns A new array of objects
   */
  async endPage(size, offset) {
    const newPage = await __privateGet$6(this, _page).endPage(size, offset);
    return new _RecordArray(newPage);
  }
  /**
   * @returns Boolean indicating if there is a next page
   */
  hasNextPage() {
    return __privateGet$6(this, _page).meta.page.more;
  }
};
_page = new WeakMap();
let RecordArray = _RecordArray;

var __accessCheck$5 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$5 = (obj, member, getter) => {
  __accessCheck$5(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$5 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$5 = (obj, member, value, setter) => {
  __accessCheck$5(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod$3 = (obj, member, method) => {
  __accessCheck$5(obj, member, "access private method");
  return method;
};
var _table$1, _repository, _data, _cleanFilterConstraint, cleanFilterConstraint_fn;
const _Query = class _Query {
  constructor(repository, table, data, rawParent) {
    __privateAdd$5(this, _cleanFilterConstraint);
    __privateAdd$5(this, _table$1, void 0);
    __privateAdd$5(this, _repository, void 0);
    __privateAdd$5(this, _data, { filter: {} });
    // Implements pagination
    this.meta = { page: { cursor: "start", more: true, size: PAGINATION_DEFAULT_SIZE } };
    this.records = new RecordArray(this, []);
    __privateSet$5(this, _table$1, table);
    if (repository) {
      __privateSet$5(this, _repository, repository);
    } else {
      __privateSet$5(this, _repository, this);
    }
    const parent = cleanParent(data, rawParent);
    __privateGet$5(this, _data).filter = data.filter ?? parent?.filter ?? {};
    __privateGet$5(this, _data).filter.$any = data.filter?.$any ?? parent?.filter?.$any;
    __privateGet$5(this, _data).filter.$all = data.filter?.$all ?? parent?.filter?.$all;
    __privateGet$5(this, _data).filter.$not = data.filter?.$not ?? parent?.filter?.$not;
    __privateGet$5(this, _data).filter.$none = data.filter?.$none ?? parent?.filter?.$none;
    __privateGet$5(this, _data).sort = data.sort ?? parent?.sort;
    __privateGet$5(this, _data).columns = data.columns ?? parent?.columns;
    __privateGet$5(this, _data).consistency = data.consistency ?? parent?.consistency;
    __privateGet$5(this, _data).pagination = data.pagination ?? parent?.pagination;
    __privateGet$5(this, _data).cache = data.cache ?? parent?.cache;
    __privateGet$5(this, _data).fetchOptions = data.fetchOptions ?? parent?.fetchOptions;
    this.any = this.any.bind(this);
    this.all = this.all.bind(this);
    this.not = this.not.bind(this);
    this.filter = this.filter.bind(this);
    this.sort = this.sort.bind(this);
    this.none = this.none.bind(this);
    Object.defineProperty(this, "table", { enumerable: false });
    Object.defineProperty(this, "repository", { enumerable: false });
  }
  getQueryOptions() {
    return __privateGet$5(this, _data);
  }
  key() {
    const { columns = [], filter = {}, sort = [], pagination = {} } = __privateGet$5(this, _data);
    const key = JSON.stringify({ columns, filter, sort, pagination });
    return toBase64(key);
  }
  /**
   * Builds a new query object representing a logical OR between the given subqueries.
   * @param queries An array of subqueries.
   * @returns A new Query object.
   */
  any(...queries) {
    const $any = queries.map((query) => query.getQueryOptions().filter ?? {});
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $any } }, __privateGet$5(this, _data));
  }
  /**
   * Builds a new query object representing a logical AND between the given subqueries.
   * @param queries An array of subqueries.
   * @returns A new Query object.
   */
  all(...queries) {
    const $all = queries.map((query) => query.getQueryOptions().filter ?? {});
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $all } }, __privateGet$5(this, _data));
  }
  /**
   * Builds a new query object representing a logical OR negating each subquery. In pseudo-code: !q1 OR !q2
   * @param queries An array of subqueries.
   * @returns A new Query object.
   */
  not(...queries) {
    const $not = queries.map((query) => query.getQueryOptions().filter ?? {});
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $not } }, __privateGet$5(this, _data));
  }
  /**
   * Builds a new query object representing a logical AND negating each subquery. In pseudo-code: !q1 AND !q2
   * @param queries An array of subqueries.
   * @returns A new Query object.
   */
  none(...queries) {
    const $none = queries.map((query) => query.getQueryOptions().filter ?? {});
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $none } }, __privateGet$5(this, _data));
  }
  filter(a, b) {
    if (arguments.length === 1) {
      const constraints = Object.entries(a ?? {}).map(([column, constraint]) => ({
        [column]: __privateMethod$3(this, _cleanFilterConstraint, cleanFilterConstraint_fn).call(this, column, constraint)
      }));
      const $all = compact([__privateGet$5(this, _data).filter?.$all].flat().concat(constraints));
      return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $all } }, __privateGet$5(this, _data));
    } else {
      const constraints = isDefined(a) && isDefined(b) ? [{ [a]: __privateMethod$3(this, _cleanFilterConstraint, cleanFilterConstraint_fn).call(this, a, b) }] : void 0;
      const $all = compact([__privateGet$5(this, _data).filter?.$all].flat().concat(constraints));
      return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { filter: { $all } }, __privateGet$5(this, _data));
    }
  }
  sort(column, direction = "asc") {
    const originalSort = [__privateGet$5(this, _data).sort ?? []].flat();
    const sort = [...originalSort, { column, direction }];
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { sort }, __privateGet$5(this, _data));
  }
  /**
   * Builds a new query specifying the set of columns to be returned in the query response.
   * @param columns Array of column names to be returned by the query.
   * @returns A new Query object.
   */
  select(columns) {
    return new _Query(
      __privateGet$5(this, _repository),
      __privateGet$5(this, _table$1),
      { columns },
      __privateGet$5(this, _data)
    );
  }
  getPaginated(options = {}) {
    const query = new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), options, __privateGet$5(this, _data));
    return __privateGet$5(this, _repository).query(query);
  }
  /**
   * Get results in an iterator
   *
   * @async
   * @returns Async interable of results
   */
  async *[Symbol.asyncIterator]() {
    for await (const [record] of this.getIterator({ batchSize: 1 })) {
      yield record;
    }
  }
  async *getIterator(options = {}) {
    const { batchSize = 1 } = options;
    let page = await this.getPaginated({ ...options, pagination: { size: batchSize, offset: 0 } });
    let more = page.hasNextPage();
    yield page.records;
    while (more) {
      page = await page.nextPage();
      more = page.hasNextPage();
      yield page.records;
    }
  }
  async getMany(options = {}) {
    const { pagination = {}, ...rest } = options;
    const { size = PAGINATION_DEFAULT_SIZE, offset } = pagination;
    const batchSize = size <= PAGINATION_MAX_SIZE ? size : PAGINATION_MAX_SIZE;
    let page = await this.getPaginated({ ...rest, pagination: { size: batchSize, offset } });
    const results = [...page.records];
    while (page.hasNextPage() && results.length < size) {
      page = await page.nextPage();
      results.push(...page.records);
    }
    if (page.hasNextPage() && options.pagination?.size === void 0) {
      console.trace("Calling getMany does not return all results. Paginate to get all results or call getAll.");
    }
    const array = new RecordArray(page, results.slice(0, size));
    return array;
  }
  async getAll(options = {}) {
    const { batchSize = PAGINATION_MAX_SIZE, ...rest } = options;
    const results = [];
    for await (const page of this.getIterator({ ...rest, batchSize })) {
      results.push(...page);
    }
    return results;
  }
  async getFirst(options = {}) {
    const records = await this.getMany({ ...options, pagination: { size: 1 } });
    return records[0] ?? null;
  }
  async getFirstOrThrow(options = {}) {
    const records = await this.getMany({ ...options, pagination: { size: 1 } });
    if (records[0] === void 0)
      throw new Error("No results found.");
    return records[0];
  }
  async summarize(params = {}) {
    const { summaries, summariesFilter, ...options } = params;
    const query = new _Query(
      __privateGet$5(this, _repository),
      __privateGet$5(this, _table$1),
      options,
      __privateGet$5(this, _data)
    );
    return __privateGet$5(this, _repository).summarizeTable(query, summaries, summariesFilter);
  }
  /**
   * Builds a new query object adding a cache TTL in milliseconds.
   * @param ttl The cache TTL in milliseconds.
   * @returns A new Query object.
   */
  cache(ttl) {
    return new _Query(__privateGet$5(this, _repository), __privateGet$5(this, _table$1), { cache: ttl }, __privateGet$5(this, _data));
  }
  /**
   * Retrieve next page of records
   *
   * @returns A new page object.
   */
  nextPage(size, offset) {
    return this.startPage(size, offset);
  }
  /**
   * Retrieve previous page of records
   *
   * @returns A new page object
   */
  previousPage(size, offset) {
    return this.startPage(size, offset);
  }
  /**
   * Retrieve start page of records
   *
   * @returns A new page object
   */
  startPage(size, offset) {
    return this.getPaginated({ pagination: { size, offset } });
  }
  /**
   * Retrieve last page of records
   *
   * @returns A new page object
   */
  endPage(size, offset) {
    return this.getPaginated({ pagination: { size, offset, before: "end" } });
  }
  /**
   * @returns Boolean indicating if there is a next page
   */
  hasNextPage() {
    return this.meta.page.more;
  }
};
_table$1 = new WeakMap();
_repository = new WeakMap();
_data = new WeakMap();
_cleanFilterConstraint = new WeakSet();
cleanFilterConstraint_fn = function(column, value) {
  const columnType = __privateGet$5(this, _table$1).schema?.columns.find(({ name }) => name === column)?.type;
  if (columnType === "multiple" && (isString(value) || isStringArray(value))) {
    return { $includes: value };
  }
  if (columnType === "link" && isObject(value) && isString(value.id)) {
    return value.id;
  }
  return value;
};
let Query = _Query;
function cleanParent(data, parent) {
  if (isCursorPaginationOptions(data.pagination)) {
    return { ...parent, sort: void 0, filter: void 0 };
  }
  return parent;
}

const RecordColumnTypes = [
  "bool",
  "int",
  "float",
  "string",
  "text",
  "email",
  "multiple",
  "link",
  "object",
  "datetime",
  "vector",
  "file[]",
  "file",
  "json"
];
function isIdentifiable(x) {
  return isObject(x) && isString(x?.id);
}
function isXataRecord(x) {
  const record = x;
  const metadata = record?.getMetadata();
  return isIdentifiable(x) && isObject(metadata) && typeof metadata.version === "number";
}

function isValidExpandedColumn(column) {
  return isObject(column) && isString(column.name);
}
function isValidSelectableColumns(columns) {
  if (!Array.isArray(columns)) {
    return false;
  }
  return columns.every((column) => {
    if (typeof column === "string") {
      return true;
    }
    if (typeof column === "object") {
      return isValidExpandedColumn(column);
    }
    return false;
  });
}

function isSortFilterString(value) {
  return isString(value);
}
function isSortFilterBase(filter) {
  return isObject(filter) && Object.entries(filter).every(([key, value]) => {
    if (key === "*")
      return value === "random";
    return value === "asc" || value === "desc";
  });
}
function isSortFilterObject(filter) {
  return isObject(filter) && !isSortFilterBase(filter) && filter.column !== void 0;
}
function buildSortFilter(filter) {
  if (isSortFilterString(filter)) {
    return { [filter]: "asc" };
  } else if (Array.isArray(filter)) {
    return filter.map((item) => buildSortFilter(item));
  } else if (isSortFilterBase(filter)) {
    return filter;
  } else if (isSortFilterObject(filter)) {
    return { [filter.column]: filter.direction ?? "asc" };
  } else {
    throw new Error(`Invalid sort filter: ${filter}`);
  }
}

var __accessCheck$4 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$4 = (obj, member, getter) => {
  __accessCheck$4(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$4 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$4 = (obj, member, value, setter) => {
  __accessCheck$4(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod$2 = (obj, member, method) => {
  __accessCheck$4(obj, member, "access private method");
  return method;
};
var _table, _getFetchProps, _db, _cache, _schemaTables$2, _trace, _insertRecordWithoutId, insertRecordWithoutId_fn, _insertRecordWithId, insertRecordWithId_fn, _insertRecords, insertRecords_fn, _updateRecordWithID, updateRecordWithID_fn, _updateRecords, updateRecords_fn, _upsertRecordWithID, upsertRecordWithID_fn, _deleteRecord, deleteRecord_fn, _deleteRecords, deleteRecords_fn, _setCacheQuery, setCacheQuery_fn, _getCacheQuery, getCacheQuery_fn, _getSchemaTables$1, getSchemaTables_fn$1, _transformObjectToApi, transformObjectToApi_fn;
const BULK_OPERATION_MAX_SIZE = 1e3;
class Repository extends Query {
}
class RestRepository extends Query {
  constructor(options) {
    super(
      null,
      { name: options.table, schema: options.schemaTables?.find((table) => table.name === options.table) },
      {}
    );
    __privateAdd$4(this, _insertRecordWithoutId);
    __privateAdd$4(this, _insertRecordWithId);
    __privateAdd$4(this, _insertRecords);
    __privateAdd$4(this, _updateRecordWithID);
    __privateAdd$4(this, _updateRecords);
    __privateAdd$4(this, _upsertRecordWithID);
    __privateAdd$4(this, _deleteRecord);
    __privateAdd$4(this, _deleteRecords);
    __privateAdd$4(this, _setCacheQuery);
    __privateAdd$4(this, _getCacheQuery);
    __privateAdd$4(this, _getSchemaTables$1);
    __privateAdd$4(this, _transformObjectToApi);
    __privateAdd$4(this, _table, void 0);
    __privateAdd$4(this, _getFetchProps, void 0);
    __privateAdd$4(this, _db, void 0);
    __privateAdd$4(this, _cache, void 0);
    __privateAdd$4(this, _schemaTables$2, void 0);
    __privateAdd$4(this, _trace, void 0);
    __privateSet$4(this, _table, options.table);
    __privateSet$4(this, _db, options.db);
    __privateSet$4(this, _cache, options.pluginOptions.cache);
    __privateSet$4(this, _schemaTables$2, options.schemaTables);
    __privateSet$4(this, _getFetchProps, () => ({ ...options.pluginOptions, sessionID: generateUUID() }));
    const trace = options.pluginOptions.trace ?? defaultTrace;
    __privateSet$4(this, _trace, async (name, fn, options2 = {}) => {
      return trace(name, fn, {
        ...options2,
        [TraceAttributes.TABLE]: __privateGet$4(this, _table),
        [TraceAttributes.KIND]: "sdk-operation",
        [TraceAttributes.VERSION]: VERSION
      });
    });
  }
  async create(a, b, c, d) {
    return __privateGet$4(this, _trace).call(this, "create", async () => {
      const ifVersion = parseIfVersion(b, c, d);
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        const ids = await __privateMethod$2(this, _insertRecords, insertRecords_fn).call(this, a, { ifVersion, createOnly: true });
        const columns = isValidSelectableColumns(b) ? b : ["*"];
        const result = await this.read(ids, columns);
        return result;
      }
      if (isString(a) && isObject(b)) {
        if (a === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(c) ? c : void 0;
        return await __privateMethod$2(this, _insertRecordWithId, insertRecordWithId_fn).call(this, a, b, columns, { createOnly: true, ifVersion });
      }
      if (isObject(a) && isString(a.id)) {
        if (a.id === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(b) ? b : void 0;
        return await __privateMethod$2(this, _insertRecordWithId, insertRecordWithId_fn).call(this, a.id, { ...a, id: void 0 }, columns, { createOnly: true, ifVersion });
      }
      if (isObject(a)) {
        const columns = isValidSelectableColumns(b) ? b : void 0;
        return __privateMethod$2(this, _insertRecordWithoutId, insertRecordWithoutId_fn).call(this, a, columns);
      }
      throw new Error("Invalid arguments for create method");
    });
  }
  async read(a, b) {
    return __privateGet$4(this, _trace).call(this, "read", async () => {
      const columns = isValidSelectableColumns(b) ? b : ["*"];
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        const ids = a.map((item) => extractId(item));
        const finalObjects = await this.getAll({ filter: { id: { $any: compact(ids) } }, columns });
        const dictionary = finalObjects.reduce((acc, object) => {
          acc[object.id] = object;
          return acc;
        }, {});
        return ids.map((id2) => dictionary[id2 ?? ""] ?? null);
      }
      const id = extractId(a);
      if (id) {
        try {
          const response = await getRecord({
            pathParams: {
              workspace: "{workspaceId}",
              dbBranchName: "{dbBranch}",
              region: "{region}",
              tableName: __privateGet$4(this, _table),
              recordId: id
            },
            queryParams: { columns },
            ...__privateGet$4(this, _getFetchProps).call(this)
          });
          const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
          return initObject(
            __privateGet$4(this, _db),
            schemaTables,
            __privateGet$4(this, _table),
            response,
            columns
          );
        } catch (e) {
          if (isObject(e) && e.status === 404) {
            return null;
          }
          throw e;
        }
      }
      return null;
    });
  }
  async readOrThrow(a, b) {
    return __privateGet$4(this, _trace).call(this, "readOrThrow", async () => {
      const result = await this.read(a, b);
      if (Array.isArray(result)) {
        const missingIds = compact(
          a.filter((_item, index) => result[index] === null).map((item) => extractId(item))
        );
        if (missingIds.length > 0) {
          throw new Error(`Could not find records with ids: ${missingIds.join(", ")}`);
        }
        return result;
      }
      if (result === null) {
        const id = extractId(a) ?? "unknown";
        throw new Error(`Record with id ${id} not found`);
      }
      return result;
    });
  }
  async update(a, b, c, d) {
    return __privateGet$4(this, _trace).call(this, "update", async () => {
      const ifVersion = parseIfVersion(b, c, d);
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        const existing = await this.read(a, ["id"]);
        const updates = a.filter((_item, index) => existing[index] !== null);
        await __privateMethod$2(this, _updateRecords, updateRecords_fn).call(this, updates, {
          ifVersion,
          upsert: false
        });
        const columns = isValidSelectableColumns(b) ? b : ["*"];
        const result = await this.read(a, columns);
        return result;
      }
      try {
        if (isString(a) && isObject(b)) {
          const columns = isValidSelectableColumns(c) ? c : void 0;
          return await __privateMethod$2(this, _updateRecordWithID, updateRecordWithID_fn).call(this, a, b, columns, { ifVersion });
        }
        if (isObject(a) && isString(a.id)) {
          const columns = isValidSelectableColumns(b) ? b : void 0;
          return await __privateMethod$2(this, _updateRecordWithID, updateRecordWithID_fn).call(this, a.id, { ...a, id: void 0 }, columns, { ifVersion });
        }
      } catch (error) {
        if (error.status === 422)
          return null;
        throw error;
      }
      throw new Error("Invalid arguments for update method");
    });
  }
  async updateOrThrow(a, b, c, d) {
    return __privateGet$4(this, _trace).call(this, "updateOrThrow", async () => {
      const result = await this.update(a, b, c, d);
      if (Array.isArray(result)) {
        const missingIds = compact(
          a.filter((_item, index) => result[index] === null).map((item) => extractId(item))
        );
        if (missingIds.length > 0) {
          throw new Error(`Could not find records with ids: ${missingIds.join(", ")}`);
        }
        return result;
      }
      if (result === null) {
        const id = extractId(a) ?? "unknown";
        throw new Error(`Record with id ${id} not found`);
      }
      return result;
    });
  }
  async createOrUpdate(a, b, c, d) {
    return __privateGet$4(this, _trace).call(this, "createOrUpdate", async () => {
      const ifVersion = parseIfVersion(b, c, d);
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        await __privateMethod$2(this, _updateRecords, updateRecords_fn).call(this, a, {
          ifVersion,
          upsert: true
        });
        const columns = isValidSelectableColumns(b) ? b : ["*"];
        const result = await this.read(a, columns);
        return result;
      }
      if (isString(a) && isObject(b)) {
        if (a === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(c) ? c : void 0;
        return await __privateMethod$2(this, _upsertRecordWithID, upsertRecordWithID_fn).call(this, a, b, columns, { ifVersion });
      }
      if (isObject(a) && isString(a.id)) {
        if (a.id === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(c) ? c : void 0;
        return await __privateMethod$2(this, _upsertRecordWithID, upsertRecordWithID_fn).call(this, a.id, { ...a, id: void 0 }, columns, { ifVersion });
      }
      if (!isDefined(a) && isObject(b)) {
        return await this.create(b, c);
      }
      if (isObject(a) && !isDefined(a.id)) {
        return await this.create(a, b);
      }
      throw new Error("Invalid arguments for createOrUpdate method");
    });
  }
  async createOrReplace(a, b, c, d) {
    return __privateGet$4(this, _trace).call(this, "createOrReplace", async () => {
      const ifVersion = parseIfVersion(b, c, d);
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        const ids = await __privateMethod$2(this, _insertRecords, insertRecords_fn).call(this, a, { ifVersion, createOnly: false });
        const columns = isValidSelectableColumns(b) ? b : ["*"];
        const result = await this.read(ids, columns);
        return result;
      }
      if (isString(a) && isObject(b)) {
        if (a === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(c) ? c : void 0;
        return await __privateMethod$2(this, _insertRecordWithId, insertRecordWithId_fn).call(this, a, b, columns, { createOnly: false, ifVersion });
      }
      if (isObject(a) && isString(a.id)) {
        if (a.id === "")
          throw new Error("The id can't be empty");
        const columns = isValidSelectableColumns(c) ? c : void 0;
        return await __privateMethod$2(this, _insertRecordWithId, insertRecordWithId_fn).call(this, a.id, { ...a, id: void 0 }, columns, { createOnly: false, ifVersion });
      }
      if (!isDefined(a) && isObject(b)) {
        return await this.create(b, c);
      }
      if (isObject(a) && !isDefined(a.id)) {
        return await this.create(a, b);
      }
      throw new Error("Invalid arguments for createOrReplace method");
    });
  }
  async delete(a, b) {
    return __privateGet$4(this, _trace).call(this, "delete", async () => {
      if (Array.isArray(a)) {
        if (a.length === 0)
          return [];
        const ids = a.map((o) => {
          if (isString(o))
            return o;
          if (isString(o.id))
            return o.id;
          throw new Error("Invalid arguments for delete method");
        });
        const columns = isValidSelectableColumns(b) ? b : ["*"];
        const result = await this.read(a, columns);
        await __privateMethod$2(this, _deleteRecords, deleteRecords_fn).call(this, ids);
        return result;
      }
      if (isString(a)) {
        return __privateMethod$2(this, _deleteRecord, deleteRecord_fn).call(this, a, b);
      }
      if (isObject(a) && isString(a.id)) {
        return __privateMethod$2(this, _deleteRecord, deleteRecord_fn).call(this, a.id, b);
      }
      throw new Error("Invalid arguments for delete method");
    });
  }
  async deleteOrThrow(a, b) {
    return __privateGet$4(this, _trace).call(this, "deleteOrThrow", async () => {
      const result = await this.delete(a, b);
      if (Array.isArray(result)) {
        const missingIds = compact(
          a.filter((_item, index) => result[index] === null).map((item) => extractId(item))
        );
        if (missingIds.length > 0) {
          throw new Error(`Could not find records with ids: ${missingIds.join(", ")}`);
        }
        return result;
      } else if (result === null) {
        const id = extractId(a) ?? "unknown";
        throw new Error(`Record with id ${id} not found`);
      }
      return result;
    });
  }
  async search(query, options = {}) {
    return __privateGet$4(this, _trace).call(this, "search", async () => {
      const { records, totalCount } = await searchTable({
        pathParams: {
          workspace: "{workspaceId}",
          dbBranchName: "{dbBranch}",
          region: "{region}",
          tableName: __privateGet$4(this, _table)
        },
        body: {
          query,
          fuzziness: options.fuzziness,
          prefix: options.prefix,
          highlight: options.highlight,
          filter: options.filter,
          boosters: options.boosters,
          page: options.page,
          target: options.target
        },
        ...__privateGet$4(this, _getFetchProps).call(this)
      });
      const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
      return {
        records: records.map((item) => initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), item, ["*"])),
        totalCount
      };
    });
  }
  async vectorSearch(column, query, options) {
    return __privateGet$4(this, _trace).call(this, "vectorSearch", async () => {
      const { records, totalCount } = await vectorSearchTable({
        pathParams: {
          workspace: "{workspaceId}",
          dbBranchName: "{dbBranch}",
          region: "{region}",
          tableName: __privateGet$4(this, _table)
        },
        body: {
          column,
          queryVector: query,
          similarityFunction: options?.similarityFunction,
          size: options?.size,
          filter: options?.filter
        },
        ...__privateGet$4(this, _getFetchProps).call(this)
      });
      const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
      return {
        records: records.map((item) => initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), item, ["*"])),
        totalCount
      };
    });
  }
  async aggregate(aggs, filter) {
    return __privateGet$4(this, _trace).call(this, "aggregate", async () => {
      const result = await aggregateTable({
        pathParams: {
          workspace: "{workspaceId}",
          dbBranchName: "{dbBranch}",
          region: "{region}",
          tableName: __privateGet$4(this, _table)
        },
        body: { aggs, filter },
        ...__privateGet$4(this, _getFetchProps).call(this)
      });
      return result;
    });
  }
  async query(query) {
    return __privateGet$4(this, _trace).call(this, "query", async () => {
      const cacheQuery = await __privateMethod$2(this, _getCacheQuery, getCacheQuery_fn).call(this, query);
      if (cacheQuery)
        return new Page(query, cacheQuery.meta, cacheQuery.records);
      const data = query.getQueryOptions();
      const { meta, records: objects } = await queryTable({
        pathParams: {
          workspace: "{workspaceId}",
          dbBranchName: "{dbBranch}",
          region: "{region}",
          tableName: __privateGet$4(this, _table)
        },
        body: {
          filter: cleanFilter(data.filter),
          sort: data.sort !== void 0 ? buildSortFilter(data.sort) : void 0,
          page: data.pagination,
          columns: data.columns ?? ["*"],
          consistency: data.consistency
        },
        fetchOptions: data.fetchOptions,
        ...__privateGet$4(this, _getFetchProps).call(this)
      });
      const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
      const records = objects.map(
        (record) => initObject(
          __privateGet$4(this, _db),
          schemaTables,
          __privateGet$4(this, _table),
          record,
          data.columns ?? ["*"]
        )
      );
      await __privateMethod$2(this, _setCacheQuery, setCacheQuery_fn).call(this, query, meta, records);
      return new Page(query, meta, records);
    });
  }
  async summarizeTable(query, summaries, summariesFilter) {
    return __privateGet$4(this, _trace).call(this, "summarize", async () => {
      const data = query.getQueryOptions();
      const result = await summarizeTable({
        pathParams: {
          workspace: "{workspaceId}",
          dbBranchName: "{dbBranch}",
          region: "{region}",
          tableName: __privateGet$4(this, _table)
        },
        body: {
          filter: cleanFilter(data.filter),
          sort: data.sort !== void 0 ? buildSortFilter(data.sort) : void 0,
          columns: data.columns,
          consistency: data.consistency,
          page: data.pagination?.size !== void 0 ? { size: data.pagination?.size } : void 0,
          summaries,
          summariesFilter
        },
        ...__privateGet$4(this, _getFetchProps).call(this)
      });
      const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
      return {
        ...result,
        summaries: result.summaries.map(
          (summary) => initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), summary, data.columns ?? [])
        )
      };
    });
  }
  ask(question, options) {
    const questionParam = options?.sessionId ? { message: question } : { question };
    const params = {
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}",
        tableName: __privateGet$4(this, _table),
        sessionId: options?.sessionId
      },
      body: {
        ...questionParam,
        rules: options?.rules,
        searchType: options?.searchType,
        search: options?.searchType === "keyword" ? options?.search : void 0,
        vectorSearch: options?.searchType === "vector" ? options?.vectorSearch : void 0
      },
      ...__privateGet$4(this, _getFetchProps).call(this)
    };
    if (options?.onMessage) {
      fetchSSERequest({
        endpoint: "dataPlane",
        url: "/db/{dbBranchName}/tables/{tableName}/ask/{sessionId}",
        method: "POST",
        onMessage: (message) => {
          options.onMessage?.({ answer: message.text, records: message.records });
        },
        ...params
      });
    } else {
      return askTableSession(params);
    }
  }
}
_table = new WeakMap();
_getFetchProps = new WeakMap();
_db = new WeakMap();
_cache = new WeakMap();
_schemaTables$2 = new WeakMap();
_trace = new WeakMap();
_insertRecordWithoutId = new WeakSet();
insertRecordWithoutId_fn = async function(object, columns = ["*"]) {
  const record = await __privateMethod$2(this, _transformObjectToApi, transformObjectToApi_fn).call(this, object);
  const response = await insertRecord({
    pathParams: {
      workspace: "{workspaceId}",
      dbBranchName: "{dbBranch}",
      region: "{region}",
      tableName: __privateGet$4(this, _table)
    },
    queryParams: { columns },
    body: record,
    ...__privateGet$4(this, _getFetchProps).call(this)
  });
  const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
  return initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), response, columns);
};
_insertRecordWithId = new WeakSet();
insertRecordWithId_fn = async function(recordId, object, columns = ["*"], { createOnly, ifVersion }) {
  if (!recordId)
    return null;
  const record = await __privateMethod$2(this, _transformObjectToApi, transformObjectToApi_fn).call(this, object);
  const response = await insertRecordWithID({
    pathParams: {
      workspace: "{workspaceId}",
      dbBranchName: "{dbBranch}",
      region: "{region}",
      tableName: __privateGet$4(this, _table),
      recordId
    },
    body: record,
    queryParams: { createOnly, columns, ifVersion },
    ...__privateGet$4(this, _getFetchProps).call(this)
  });
  const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
  return initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), response, columns);
};
_insertRecords = new WeakSet();
insertRecords_fn = async function(objects, { createOnly, ifVersion }) {
  const operations = await promiseMap(objects, async (object) => {
    const record = await __privateMethod$2(this, _transformObjectToApi, transformObjectToApi_fn).call(this, object);
    return { insert: { table: __privateGet$4(this, _table), record, createOnly, ifVersion } };
  });
  const chunkedOperations = chunk(operations, BULK_OPERATION_MAX_SIZE);
  const ids = [];
  for (const operations2 of chunkedOperations) {
    const { results } = await branchTransaction({
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}"
      },
      body: { operations: operations2 },
      ...__privateGet$4(this, _getFetchProps).call(this)
    });
    for (const result of results) {
      if (result.operation === "insert") {
        ids.push(result.id);
      } else {
        ids.push(null);
      }
    }
  }
  return ids;
};
_updateRecordWithID = new WeakSet();
updateRecordWithID_fn = async function(recordId, object, columns = ["*"], { ifVersion }) {
  if (!recordId)
    return null;
  const { id: _id, ...record } = await __privateMethod$2(this, _transformObjectToApi, transformObjectToApi_fn).call(this, object);
  try {
    const response = await updateRecordWithID({
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}",
        tableName: __privateGet$4(this, _table),
        recordId
      },
      queryParams: { columns, ifVersion },
      body: record,
      ...__privateGet$4(this, _getFetchProps).call(this)
    });
    const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
    return initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), response, columns);
  } catch (e) {
    if (isObject(e) && e.status === 404) {
      return null;
    }
    throw e;
  }
};
_updateRecords = new WeakSet();
updateRecords_fn = async function(objects, { ifVersion, upsert }) {
  const operations = await promiseMap(objects, async ({ id, ...object }) => {
    const fields = await __privateMethod$2(this, _transformObjectToApi, transformObjectToApi_fn).call(this, object);
    return { update: { table: __privateGet$4(this, _table), id, ifVersion, upsert, fields } };
  });
  const chunkedOperations = chunk(operations, BULK_OPERATION_MAX_SIZE);
  const ids = [];
  for (const operations2 of chunkedOperations) {
    const { results } = await branchTransaction({
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}"
      },
      body: { operations: operations2 },
      ...__privateGet$4(this, _getFetchProps).call(this)
    });
    for (const result of results) {
      if (result.operation === "update") {
        ids.push(result.id);
      } else {
        ids.push(null);
      }
    }
  }
  return ids;
};
_upsertRecordWithID = new WeakSet();
upsertRecordWithID_fn = async function(recordId, object, columns = ["*"], { ifVersion }) {
  if (!recordId)
    return null;
  const response = await upsertRecordWithID({
    pathParams: {
      workspace: "{workspaceId}",
      dbBranchName: "{dbBranch}",
      region: "{region}",
      tableName: __privateGet$4(this, _table),
      recordId
    },
    queryParams: { columns, ifVersion },
    body: object,
    ...__privateGet$4(this, _getFetchProps).call(this)
  });
  const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
  return initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), response, columns);
};
_deleteRecord = new WeakSet();
deleteRecord_fn = async function(recordId, columns = ["*"]) {
  if (!recordId)
    return null;
  try {
    const response = await deleteRecord({
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}",
        tableName: __privateGet$4(this, _table),
        recordId
      },
      queryParams: { columns },
      ...__privateGet$4(this, _getFetchProps).call(this)
    });
    const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
    return initObject(__privateGet$4(this, _db), schemaTables, __privateGet$4(this, _table), response, columns);
  } catch (e) {
    if (isObject(e) && e.status === 404) {
      return null;
    }
    throw e;
  }
};
_deleteRecords = new WeakSet();
deleteRecords_fn = async function(recordIds) {
  const chunkedOperations = chunk(
    compact(recordIds).map((id) => ({ delete: { table: __privateGet$4(this, _table), id } })),
    BULK_OPERATION_MAX_SIZE
  );
  for (const operations of chunkedOperations) {
    await branchTransaction({
      pathParams: {
        workspace: "{workspaceId}",
        dbBranchName: "{dbBranch}",
        region: "{region}"
      },
      body: { operations },
      ...__privateGet$4(this, _getFetchProps).call(this)
    });
  }
};
_setCacheQuery = new WeakSet();
setCacheQuery_fn = async function(query, meta, records) {
  await __privateGet$4(this, _cache)?.set(`query_${__privateGet$4(this, _table)}:${query.key()}`, { date: /* @__PURE__ */ new Date(), meta, records });
};
_getCacheQuery = new WeakSet();
getCacheQuery_fn = async function(query) {
  const key = `query_${__privateGet$4(this, _table)}:${query.key()}`;
  const result = await __privateGet$4(this, _cache)?.get(key);
  if (!result)
    return null;
  const defaultTTL = __privateGet$4(this, _cache)?.defaultQueryTTL ?? -1;
  const { cache: ttl = defaultTTL } = query.getQueryOptions();
  if (ttl < 0)
    return null;
  const hasExpired = result.date.getTime() + ttl < Date.now();
  return hasExpired ? null : result;
};
_getSchemaTables$1 = new WeakSet();
getSchemaTables_fn$1 = async function() {
  if (__privateGet$4(this, _schemaTables$2))
    return __privateGet$4(this, _schemaTables$2);
  const { schema } = await getBranchDetails({
    pathParams: { workspace: "{workspaceId}", dbBranchName: "{dbBranch}", region: "{region}" },
    ...__privateGet$4(this, _getFetchProps).call(this)
  });
  __privateSet$4(this, _schemaTables$2, schema.tables);
  return schema.tables;
};
_transformObjectToApi = new WeakSet();
transformObjectToApi_fn = async function(object) {
  const schemaTables = await __privateMethod$2(this, _getSchemaTables$1, getSchemaTables_fn$1).call(this);
  const schema = schemaTables.find((table) => table.name === __privateGet$4(this, _table));
  if (!schema)
    throw new Error(`Table ${__privateGet$4(this, _table)} not found in schema`);
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (key === "xata")
      continue;
    const type = schema.columns.find((column) => column.name === key)?.type;
    switch (type) {
      case "link": {
        result[key] = isIdentifiable(value) ? value.id : value;
        break;
      }
      case "datetime": {
        result[key] = value instanceof Date ? value.toISOString() : value;
        break;
      }
      case `file`:
        result[key] = await parseInputFileEntry(value);
        break;
      case "file[]":
        result[key] = await promiseMap(value, (item) => parseInputFileEntry(item));
        break;
      case "json":
        result[key] = stringifyJson(value);
        break;
      default:
        result[key] = value;
    }
  }
  return result;
};
const initObject = (db, schemaTables, table, object, selectedColumns) => {
  const data = {};
  const { xata, ...rest } = object ?? {};
  Object.assign(data, rest);
  const { columns } = schemaTables.find(({ name }) => name === table) ?? {};
  if (!columns)
    console.error(`Table ${table} not found in schema`);
  for (const column of columns ?? []) {
    if (!isValidColumn(selectedColumns, column))
      continue;
    const value = data[column.name];
    switch (column.type) {
      case "datetime": {
        const date = value !== void 0 ? new Date(value) : null;
        if (date !== null && isNaN(date.getTime())) {
          console.error(`Failed to parse date ${value} for field ${column.name}`);
        } else {
          data[column.name] = date;
        }
        break;
      }
      case "link": {
        const linkTable = column.link?.table;
        if (!linkTable) {
          console.error(`Failed to parse link for field ${column.name}`);
        } else if (isObject(value)) {
          const selectedLinkColumns = selectedColumns.reduce((acc, item) => {
            if (item === column.name) {
              return [...acc, "*"];
            }
            if (isString(item) && item.startsWith(`${column.name}.`)) {
              const [, ...path] = item.split(".");
              return [...acc, path.join(".")];
            }
            return acc;
          }, []);
          data[column.name] = initObject(
            db,
            schemaTables,
            linkTable,
            value,
            selectedLinkColumns
          );
        } else {
          data[column.name] = null;
        }
        break;
      }
      case "file":
        data[column.name] = isDefined(value) ? new XataFile(value) : null;
        break;
      case "file[]":
        data[column.name] = value?.map((item) => new XataFile(item)) ?? null;
        break;
      case "json":
        data[column.name] = parseJson(value);
        break;
      default:
        data[column.name] = value ?? null;
        if (column.notNull === true && value === null) {
          console.error(`Parse error, column ${column.name} is non nullable and value resolves null`);
        }
        break;
    }
  }
  const record = { ...data };
  const metadata = xata !== void 0 ? { ...xata, createdAt: new Date(xata.createdAt), updatedAt: new Date(xata.updatedAt) } : void 0;
  record.read = function(columns2) {
    return db[table].read(record["id"], columns2);
  };
  record.update = function(data2, b, c) {
    const columns2 = isValidSelectableColumns(b) ? b : ["*"];
    const ifVersion = parseIfVersion(b, c);
    return db[table].update(record["id"], data2, columns2, { ifVersion });
  };
  record.replace = function(data2, b, c) {
    const columns2 = isValidSelectableColumns(b) ? b : ["*"];
    const ifVersion = parseIfVersion(b, c);
    return db[table].createOrReplace(record["id"], data2, columns2, { ifVersion });
  };
  record.delete = function() {
    return db[table].delete(record["id"]);
  };
  if (metadata !== void 0) {
    record.xata = Object.freeze(metadata);
  }
  record.getMetadata = function() {
    return record.xata;
  };
  record.toSerializable = function() {
    return JSON.parse(JSON.stringify(record));
  };
  record.toString = function() {
    return JSON.stringify(record);
  };
  for (const prop of ["read", "update", "replace", "delete", "getMetadata", "toSerializable", "toString"]) {
    Object.defineProperty(record, prop, { enumerable: false });
  }
  Object.freeze(record);
  return record;
};
function extractId(value) {
  if (isString(value))
    return value;
  if (isObject(value) && isString(value.id))
    return value.id;
  return void 0;
}
function isValidColumn(columns, column) {
  if (columns.includes("*"))
    return true;
  return columns.filter((item) => isString(item) && item.startsWith(column.name)).length > 0;
}
function parseIfVersion(...args) {
  for (const arg of args) {
    if (isObject(arg) && isNumber(arg.ifVersion)) {
      return arg.ifVersion;
    }
  }
  return void 0;
}

var __accessCheck$3 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$3 = (obj, member, getter) => {
  __accessCheck$3(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$3 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$3 = (obj, member, value, setter) => {
  __accessCheck$3(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
class SimpleCache {
  constructor(options = {}) {
    __privateAdd$3(this, _map, void 0);
    __privateSet$3(this, _map, /* @__PURE__ */ new Map());
    this.capacity = options.max ?? 500;
    this.defaultQueryTTL = options.defaultQueryTTL ?? 60 * 1e3;
  }
  async getAll() {
    return Object.fromEntries(__privateGet$3(this, _map));
  }
  async get(key) {
    return __privateGet$3(this, _map).get(key) ?? null;
  }
  async set(key, value) {
    await this.delete(key);
    __privateGet$3(this, _map).set(key, value);
    if (__privateGet$3(this, _map).size > this.capacity) {
      const leastRecentlyUsed = __privateGet$3(this, _map).keys().next().value;
      await this.delete(leastRecentlyUsed);
    }
  }
  async delete(key) {
    __privateGet$3(this, _map).delete(key);
  }
  async clear() {
    return __privateGet$3(this, _map).clear();
  }
}
_map = new WeakMap();

const greaterThan = (value) => ({ $gt: value });
const gt = greaterThan;
const greaterThanEquals = (value) => ({ $ge: value });
const greaterEquals = greaterThanEquals;
const gte = greaterThanEquals;
const ge = greaterThanEquals;
const lessThan = (value) => ({ $lt: value });
const lt = lessThan;
const lessThanEquals = (value) => ({ $le: value });
const lessEquals = lessThanEquals;
const lte = lessThanEquals;
const le = lessThanEquals;
const exists = (column) => ({ $exists: column });
const notExists = (column) => ({ $notExists: column });
const startsWith = (value) => ({ $startsWith: value });
const endsWith = (value) => ({ $endsWith: value });
const pattern = (value) => ({ $pattern: value });
const iPattern = (value) => ({ $iPattern: value });
const is = (value) => ({ $is: value });
const equals = is;
const isNot = (value) => ({ $isNot: value });
const contains = (value) => ({ $contains: value });
const iContains = (value) => ({ $iContains: value });
const includes = (value) => ({ $includes: value });
const includesAll = (value) => ({ $includesAll: value });
const includesNone = (value) => ({ $includesNone: value });
const includesAny = (value) => ({ $includesAny: value });

var __accessCheck$2 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$2 = (obj, member, getter) => {
  __accessCheck$2(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$2 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$2 = (obj, member, value, setter) => {
  __accessCheck$2(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _tables, _schemaTables$1;
class SchemaPlugin extends XataPlugin {
  constructor(schemaTables) {
    super();
    __privateAdd$2(this, _tables, {});
    __privateAdd$2(this, _schemaTables$1, void 0);
    __privateSet$2(this, _schemaTables$1, schemaTables);
  }
  build(pluginOptions) {
    const db = new Proxy(
      {},
      {
        get: (_target, table) => {
          if (!isString(table))
            throw new Error("Invalid table name");
          if (__privateGet$2(this, _tables)[table] === void 0) {
            __privateGet$2(this, _tables)[table] = new RestRepository({ db, pluginOptions, table, schemaTables: __privateGet$2(this, _schemaTables$1) });
          }
          return __privateGet$2(this, _tables)[table];
        }
      }
    );
    const tableNames = __privateGet$2(this, _schemaTables$1)?.map(({ name }) => name) ?? [];
    for (const table of tableNames) {
      db[table] = new RestRepository({ db, pluginOptions, table, schemaTables: __privateGet$2(this, _schemaTables$1) });
    }
    return db;
  }
}
_tables = new WeakMap();
_schemaTables$1 = new WeakMap();

class FilesPlugin extends XataPlugin {
  build(pluginOptions) {
    return {
      download: async (location) => {
        const { table, record, column, fileId = "" } = location ?? {};
        return await getFileItem({
          pathParams: {
            workspace: "{workspaceId}",
            dbBranchName: "{dbBranch}",
            region: "{region}",
            tableName: table ?? "",
            recordId: record ?? "",
            columnName: column ?? "",
            fileId
          },
          ...pluginOptions,
          rawResponse: true
        });
      },
      upload: async (location, file, options) => {
        const { table, record, column, fileId = "" } = location ?? {};
        const resolvedFile = await file;
        const contentType = options?.mediaType || getContentType(resolvedFile);
        const body = resolvedFile instanceof XataFile ? resolvedFile.toBlob() : resolvedFile;
        return await putFileItem({
          ...pluginOptions,
          pathParams: {
            workspace: "{workspaceId}",
            dbBranchName: "{dbBranch}",
            region: "{region}",
            tableName: table ?? "",
            recordId: record ?? "",
            columnName: column ?? "",
            fileId
          },
          body,
          headers: { "Content-Type": contentType }
        });
      },
      delete: async (location) => {
        const { table, record, column, fileId = "" } = location ?? {};
        return await deleteFileItem({
          pathParams: {
            workspace: "{workspaceId}",
            dbBranchName: "{dbBranch}",
            region: "{region}",
            tableName: table ?? "",
            recordId: record ?? "",
            columnName: column ?? "",
            fileId
          },
          ...pluginOptions
        });
      }
    };
  }
}
function getContentType(file) {
  if (typeof file === "string") {
    return "text/plain";
  }
  if ("mediaType" in file && file.mediaType !== void 0) {
    return file.mediaType;
  }
  if (isBlob(file)) {
    return file.type;
  }
  try {
    return file.type;
  } catch (e) {
  }
  return "application/octet-stream";
}

var __accessCheck$1 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$1 = (obj, member, getter) => {
  __accessCheck$1(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$1 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$1 = (obj, member, value, setter) => {
  __accessCheck$1(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod$1 = (obj, member, method) => {
  __accessCheck$1(obj, member, "access private method");
  return method;
};
var _schemaTables, _search, search_fn, _getSchemaTables, getSchemaTables_fn;
class SearchPlugin extends XataPlugin {
  constructor(db, schemaTables) {
    super();
    this.db = db;
    __privateAdd$1(this, _search);
    __privateAdd$1(this, _getSchemaTables);
    __privateAdd$1(this, _schemaTables, void 0);
    __privateSet$1(this, _schemaTables, schemaTables);
  }
  build(pluginOptions) {
    return {
      all: async (query, options = {}) => {
        const { records, totalCount } = await __privateMethod$1(this, _search, search_fn).call(this, query, options, pluginOptions);
        const schemaTables = await __privateMethod$1(this, _getSchemaTables, getSchemaTables_fn).call(this, pluginOptions);
        return {
          totalCount,
          records: records.map((record) => {
            const { table = "orphan" } = record.xata;
            return { table, record: initObject(this.db, schemaTables, table, record, ["*"]) };
          })
        };
      },
      byTable: async (query, options = {}) => {
        const { records: rawRecords, totalCount } = await __privateMethod$1(this, _search, search_fn).call(this, query, options, pluginOptions);
        const schemaTables = await __privateMethod$1(this, _getSchemaTables, getSchemaTables_fn).call(this, pluginOptions);
        const records = rawRecords.reduce((acc, record) => {
          const { table = "orphan" } = record.xata;
          const items = acc[table] ?? [];
          const item = initObject(this.db, schemaTables, table, record, ["*"]);
          return { ...acc, [table]: [...items, item] };
        }, {});
        return { totalCount, records };
      }
    };
  }
}
_schemaTables = new WeakMap();
_search = new WeakSet();
search_fn = async function(query, options, pluginOptions) {
  const { tables, fuzziness, highlight, prefix, page } = options ?? {};
  const { records, totalCount } = await searchBranch({
    pathParams: { workspace: "{workspaceId}", dbBranchName: "{dbBranch}", region: "{region}" },
    // @ts-ignore https://github.com/xataio/client-ts/issues/313
    body: { tables, query, fuzziness, prefix, highlight, page },
    ...pluginOptions
  });
  return { records, totalCount };
};
_getSchemaTables = new WeakSet();
getSchemaTables_fn = async function(pluginOptions) {
  if (__privateGet$1(this, _schemaTables))
    return __privateGet$1(this, _schemaTables);
  const { schema } = await getBranchDetails({
    pathParams: { workspace: "{workspaceId}", dbBranchName: "{dbBranch}", region: "{region}" },
    ...pluginOptions
  });
  __privateSet$1(this, _schemaTables, schema.tables);
  return schema.tables;
};

function escapeElement(elementRepresentation) {
  const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return '"' + escaped + '"';
}
function arrayString(val) {
  let result = "{";
  for (let i = 0; i < val.length; i++) {
    if (i > 0) {
      result = result + ",";
    }
    if (val[i] === null || typeof val[i] === "undefined") {
      result = result + "NULL";
    } else if (Array.isArray(val[i])) {
      result = result + arrayString(val[i]);
    } else if (val[i] instanceof Buffer) {
      result += "\\\\x" + val[i].toString("hex");
    } else {
      result += escapeElement(prepareValue(val[i]));
    }
  }
  result = result + "}";
  return result;
}
function prepareValue(value) {
  if (!isDefined(value))
    return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return arrayString(value);
  }
  if (isObject(value)) {
    return JSON.stringify(value);
  }
  try {
    return value.toString();
  } catch (e) {
    return value;
  }
}
function prepareParams(param1, param2) {
  if (isString(param1)) {
    return { statement: param1, params: param2?.map((value) => prepareValue(value)) };
  }
  if (isStringArray(param1)) {
    const statement = param1.reduce((acc, curr, index) => {
      return acc + curr + (index < (param2?.length ?? 0) ? "$" + (index + 1) : "");
    }, "");
    return { statement, params: param2?.map((value) => prepareValue(value)) };
  }
  if (isObject(param1)) {
    const { statement, params, consistency } = param1;
    return { statement, params: params?.map((value) => prepareValue(value)), consistency };
  }
  throw new Error("Invalid query");
}

class SQLPlugin extends XataPlugin {
  build(pluginOptions) {
    return async (param1, ...param2) => {
      const { statement, params, consistency } = prepareParams(param1, param2);
      const { records, warning } = await sqlQuery({
        pathParams: { workspace: "{workspaceId}", dbBranchName: "{dbBranch}", region: "{region}" },
        body: { statement, params, consistency },
        ...pluginOptions
      });
      return { records, warning };
    };
  }
}

class TransactionPlugin extends XataPlugin {
  build(pluginOptions) {
    return {
      run: async (operations) => {
        const response = await branchTransaction({
          pathParams: { workspace: "{workspaceId}", dbBranchName: "{dbBranch}", region: "{region}" },
          body: { operations },
          ...pluginOptions
        });
        return response;
      }
    };
  }
}

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
const buildClient = (plugins) => {
  var _options, _parseOptions, parseOptions_fn, _getFetchProps, getFetchProps_fn, _a;
  return _a = class {
    constructor(options = {}, schemaTables) {
      __privateAdd(this, _parseOptions);
      __privateAdd(this, _getFetchProps);
      __privateAdd(this, _options, void 0);
      const safeOptions = __privateMethod(this, _parseOptions, parseOptions_fn).call(this, options);
      __privateSet(this, _options, safeOptions);
      const pluginOptions = {
        ...__privateMethod(this, _getFetchProps, getFetchProps_fn).call(this, safeOptions),
        cache: safeOptions.cache,
        host: safeOptions.host
      };
      const db = new SchemaPlugin(schemaTables).build(pluginOptions);
      const search = new SearchPlugin(db, schemaTables).build(pluginOptions);
      const transactions = new TransactionPlugin().build(pluginOptions);
      const sql = new SQLPlugin().build(pluginOptions);
      const files = new FilesPlugin().build(pluginOptions);
      this.db = db;
      this.search = search;
      this.transactions = transactions;
      this.sql = sql;
      this.files = files;
      for (const [key, namespace] of Object.entries(plugins ?? {})) {
        if (namespace === void 0)
          continue;
        this[key] = namespace.build(pluginOptions);
      }
    }
    async getConfig() {
      const databaseURL = __privateGet(this, _options).databaseURL;
      const branch = __privateGet(this, _options).branch;
      return { databaseURL, branch };
    }
  }, _options = new WeakMap(), _parseOptions = new WeakSet(), parseOptions_fn = function(options) {
    const enableBrowser = options?.enableBrowser ?? getEnableBrowserVariable() ?? false;
    const isBrowser = typeof window !== "undefined" && typeof Deno === "undefined";
    if (isBrowser && !enableBrowser) {
      throw new Error(
        "You are trying to use Xata from the browser, which is potentially a non-secure environment. If you understand the security concerns, such as leaking your credentials, pass `enableBrowser: true` to the client options to remove this error."
      );
    }
    const fetch = getFetchImplementation(options?.fetch);
    const databaseURL = options?.databaseURL || getDatabaseURL();
    const apiKey = options?.apiKey || getAPIKey();
    const cache = options?.cache ?? new SimpleCache({ defaultQueryTTL: 0 });
    const trace = options?.trace ?? defaultTrace;
    const clientName = options?.clientName;
    const host = options?.host ?? "production";
    const xataAgentExtra = options?.xataAgentExtra;
    if (!apiKey) {
      throw new Error("Option apiKey is required");
    }
    if (!databaseURL) {
      throw new Error("Option databaseURL is required");
    }
    const envBranch = getBranch();
    const previewBranch = getPreviewBranch();
    const branch = options?.branch || previewBranch || envBranch || "main";
    if (!!previewBranch && branch !== previewBranch) {
      console.warn(
        `Ignoring preview branch ${previewBranch} because branch option was passed to the client constructor with value ${branch}`
      );
    } else if (!!envBranch && branch !== envBranch) {
      console.warn(
        `Ignoring branch ${envBranch} because branch option was passed to the client constructor with value ${branch}`
      );
    } else if (!!previewBranch && !!envBranch && previewBranch !== envBranch) {
      console.warn(
        `Ignoring preview branch ${previewBranch} and branch ${envBranch} because branch option was passed to the client constructor with value ${branch}`
      );
    } else if (!previewBranch && !envBranch && options?.branch === void 0) {
      console.warn(
        `No branch was passed to the client constructor. Using default branch ${branch}. You can set the branch with the environment variable XATA_BRANCH or by passing the branch option to the client constructor.`
      );
    }
    return {
      fetch,
      databaseURL,
      apiKey,
      branch,
      cache,
      trace,
      host,
      clientID: generateUUID(),
      enableBrowser,
      clientName,
      xataAgentExtra
    };
  }, _getFetchProps = new WeakSet(), getFetchProps_fn = function({
    fetch,
    apiKey,
    databaseURL,
    branch,
    trace,
    clientID,
    clientName,
    xataAgentExtra
  }) {
    return {
      fetch,
      apiKey,
      apiUrl: "",
      // Instead of using workspace and dbBranch, we inject a probably CNAME'd URL
      workspacesApiUrl: (path, params) => {
        const hasBranch = params.dbBranchName ?? params.branch;
        const newPath = path.replace(/^\/db\/[^/]+/, hasBranch !== void 0 ? `:${branch}` : "");
        return databaseURL + newPath;
      },
      trace,
      clientID,
      clientName,
      xataAgentExtra
    };
  }, _a;
};
class BaseClient extends buildClient() {
}

const META = "__";
const VALUE = "___";
class Serializer {
  constructor() {
    this.classes = {};
  }
  add(clazz) {
    this.classes[clazz.name] = clazz;
  }
  toJSON(data) {
    function visit(obj) {
      if (Array.isArray(obj))
        return obj.map(visit);
      const type = typeof obj;
      if (type === "undefined")
        return { [META]: "undefined" };
      if (type === "bigint")
        return { [META]: "bigint", [VALUE]: obj.toString() };
      if (obj === null || type !== "object")
        return obj;
      const constructor = obj.constructor;
      const o = { [META]: constructor.name };
      for (const [key, value] of Object.entries(obj)) {
        o[key] = visit(value);
      }
      if (constructor === Date)
        o[VALUE] = obj.toISOString();
      if (constructor === Map)
        o[VALUE] = Object.fromEntries(obj);
      if (constructor === Set)
        o[VALUE] = [...obj];
      return o;
    }
    return JSON.stringify(visit(data));
  }
  fromJSON(json) {
    return JSON.parse(json, (key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const { [META]: clazz, [VALUE]: val, ...rest } = value;
        const constructor = this.classes[clazz];
        if (constructor) {
          return Object.assign(Object.create(constructor.prototype), rest);
        }
        if (clazz === "Date")
          return new Date(val);
        if (clazz === "Set")
          return new Set(val);
        if (clazz === "Map")
          return new Map(Object.entries(val));
        if (clazz === "bigint")
          return BigInt(val);
        if (clazz === "undefined")
          return void 0;
        return rest;
      }
      return value;
    });
  }
}
const defaultSerializer = new Serializer();
const serialize = (data) => {
  return defaultSerializer.toJSON(data);
};
const deserialize = (json) => {
  return defaultSerializer.fromJSON(json);
};

class XataError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

exports.BaseClient = BaseClient;
exports.FetcherError = FetcherError;
exports.FilesPlugin = FilesPlugin;
exports.Operations = operationsByTag;
exports.PAGINATION_DEFAULT_OFFSET = PAGINATION_DEFAULT_OFFSET;
exports.PAGINATION_DEFAULT_SIZE = PAGINATION_DEFAULT_SIZE;
exports.PAGINATION_MAX_OFFSET = PAGINATION_MAX_OFFSET;
exports.PAGINATION_MAX_SIZE = PAGINATION_MAX_SIZE;
exports.Page = Page;
exports.Query = Query;
exports.RecordArray = RecordArray;
exports.RecordColumnTypes = RecordColumnTypes;
exports.Repository = Repository;
exports.RestRepository = RestRepository;
exports.SQLPlugin = SQLPlugin;
exports.SchemaPlugin = SchemaPlugin;
exports.SearchPlugin = SearchPlugin;
exports.Serializer = Serializer;
exports.SimpleCache = SimpleCache;
exports.TransactionPlugin = TransactionPlugin;
exports.XataApiClient = XataApiClient;
exports.XataApiPlugin = XataApiPlugin;
exports.XataError = XataError;
exports.XataFile = XataFile;
exports.XataPlugin = XataPlugin;
exports.acceptWorkspaceMemberInvite = acceptWorkspaceMemberInvite;
exports.addGitBranchesEntry = addGitBranchesEntry;
exports.addTableColumn = addTableColumn;
exports.aggregateTable = aggregateTable;
exports.applyBranchSchemaEdit = applyBranchSchemaEdit;
exports.applyMigration = applyMigration;
exports.askTable = askTable;
exports.askTableSession = askTableSession;
exports.branchTransaction = branchTransaction;
exports.buildClient = buildClient;
exports.buildPreviewBranchName = buildPreviewBranchName;
exports.buildProviderString = buildProviderString;
exports.bulkInsertTableRecords = bulkInsertTableRecords;
exports.cancelWorkspaceMemberInvite = cancelWorkspaceMemberInvite;
exports.compareBranchSchemas = compareBranchSchemas;
exports.compareBranchWithUserSchema = compareBranchWithUserSchema;
exports.compareMigrationRequest = compareMigrationRequest;
exports.contains = contains;
exports.copyBranch = copyBranch;
exports.createBranch = createBranch;
exports.createCluster = createCluster;
exports.createDatabase = createDatabase;
exports.createMigrationRequest = createMigrationRequest;
exports.createTable = createTable;
exports.createUserAPIKey = createUserAPIKey;
exports.createWorkspace = createWorkspace;
exports.deleteBranch = deleteBranch;
exports.deleteColumn = deleteColumn;
exports.deleteDatabase = deleteDatabase;
exports.deleteDatabaseGithubSettings = deleteDatabaseGithubSettings;
exports.deleteFile = deleteFile;
exports.deleteFileItem = deleteFileItem;
exports.deleteOAuthAccessToken = deleteOAuthAccessToken;
exports.deleteRecord = deleteRecord;
exports.deleteTable = deleteTable;
exports.deleteUser = deleteUser;
exports.deleteUserAPIKey = deleteUserAPIKey;
exports.deleteUserOAuthClient = deleteUserOAuthClient;
exports.deleteWorkspace = deleteWorkspace;
exports.deserialize = deserialize;
exports.endsWith = endsWith;
exports.equals = equals;
exports.executeBranchMigrationPlan = executeBranchMigrationPlan;
exports.exists = exists;
exports.fileAccess = fileAccess;
exports.fileUpload = fileUpload;
exports.ge = ge;
exports.getAPIKey = getAPIKey;
exports.getAuthorizationCode = getAuthorizationCode;
exports.getBranch = getBranch;
exports.getBranchDetails = getBranchDetails;
exports.getBranchList = getBranchList;
exports.getBranchMetadata = getBranchMetadata;
exports.getBranchMigrationHistory = getBranchMigrationHistory;
exports.getBranchMigrationPlan = getBranchMigrationPlan;
exports.getBranchSchemaHistory = getBranchSchemaHistory;
exports.getBranchStats = getBranchStats;
exports.getCluster = getCluster;
exports.getColumn = getColumn;
exports.getDatabaseGithubSettings = getDatabaseGithubSettings;
exports.getDatabaseList = getDatabaseList;
exports.getDatabaseMetadata = getDatabaseMetadata;
exports.getDatabaseURL = getDatabaseURL;
exports.getFile = getFile;
exports.getFileItem = getFileItem;
exports.getGitBranchesMapping = getGitBranchesMapping;
exports.getHostUrl = getHostUrl;
exports.getMigrationRequest = getMigrationRequest;
exports.getMigrationRequestIsMerged = getMigrationRequestIsMerged;
exports.getPreviewBranch = getPreviewBranch;
exports.getRecord = getRecord;
exports.getSchema = getSchema;
exports.getTableColumns = getTableColumns;
exports.getTableSchema = getTableSchema;
exports.getUser = getUser;
exports.getUserAPIKeys = getUserAPIKeys;
exports.getUserOAuthAccessTokens = getUserOAuthAccessTokens;
exports.getUserOAuthClients = getUserOAuthClients;
exports.getWorkspace = getWorkspace;
exports.getWorkspaceMembersList = getWorkspaceMembersList;
exports.getWorkspacesList = getWorkspacesList;
exports.grantAuthorizationCode = grantAuthorizationCode;
exports.greaterEquals = greaterEquals;
exports.greaterThan = greaterThan;
exports.greaterThanEquals = greaterThanEquals;
exports.gt = gt;
exports.gte = gte;
exports.iContains = iContains;
exports.iPattern = iPattern;
exports.includes = includes;
exports.includesAll = includesAll;
exports.includesAny = includesAny;
exports.includesNone = includesNone;
exports.insertRecord = insertRecord;
exports.insertRecordWithID = insertRecordWithID;
exports.inviteWorkspaceMember = inviteWorkspaceMember;
exports.is = is;
exports.isCursorPaginationOptions = isCursorPaginationOptions;
exports.isHostProviderAlias = isHostProviderAlias;
exports.isHostProviderBuilder = isHostProviderBuilder;
exports.isIdentifiable = isIdentifiable;
exports.isNot = isNot;
exports.isValidExpandedColumn = isValidExpandedColumn;
exports.isValidSelectableColumns = isValidSelectableColumns;
exports.isXataRecord = isXataRecord;
exports.le = le;
exports.lessEquals = lessEquals;
exports.lessThan = lessThan;
exports.lessThanEquals = lessThanEquals;
exports.listClusters = listClusters;
exports.listMigrationRequestsCommits = listMigrationRequestsCommits;
exports.listRegions = listRegions;
exports.lt = lt;
exports.lte = lte;
exports.mergeMigrationRequest = mergeMigrationRequest;
exports.notExists = notExists;
exports.operationsByTag = operationsByTag;
exports.parseProviderString = parseProviderString;
exports.parseWorkspacesUrlParts = parseWorkspacesUrlParts;
exports.pattern = pattern;
exports.pgRollJobStatus = pgRollJobStatus;
exports.pgRollMigrationHistory = pgRollMigrationHistory;
exports.pgRollStatus = pgRollStatus;
exports.previewBranchSchemaEdit = previewBranchSchemaEdit;
exports.pushBranchMigrations = pushBranchMigrations;
exports.putFile = putFile;
exports.putFileItem = putFileItem;
exports.queryMigrationRequests = queryMigrationRequests;
exports.queryTable = queryTable;
exports.removeGitBranchesEntry = removeGitBranchesEntry;
exports.removeWorkspaceMember = removeWorkspaceMember;
exports.renameDatabase = renameDatabase;
exports.resendWorkspaceMemberInvite = resendWorkspaceMemberInvite;
exports.resolveBranch = resolveBranch;
exports.searchBranch = searchBranch;
exports.searchTable = searchTable;
exports.serialize = serialize;
exports.setTableSchema = setTableSchema;
exports.sqlQuery = sqlQuery;
exports.startsWith = startsWith;
exports.summarizeTable = summarizeTable;
exports.transformImage = transformImage;
exports.updateBranchMetadata = updateBranchMetadata;
exports.updateBranchSchema = updateBranchSchema;
exports.updateCluster = updateCluster;
exports.updateColumn = updateColumn;
exports.updateDatabaseGithubSettings = updateDatabaseGithubSettings;
exports.updateDatabaseMetadata = updateDatabaseMetadata;
exports.updateMigrationRequest = updateMigrationRequest;
exports.updateOAuthAccessToken = updateOAuthAccessToken;
exports.updateRecordWithID = updateRecordWithID;
exports.updateTable = updateTable;
exports.updateUser = updateUser;
exports.updateWorkspace = updateWorkspace;
exports.updateWorkspaceMemberInvite = updateWorkspaceMemberInvite;
exports.updateWorkspaceMemberRole = updateWorkspaceMemberRole;
exports.upsertRecordWithID = upsertRecordWithID;
exports.vectorSearchTable = vectorSearchTable;
//# sourceMappingURL=index.cjs.map
