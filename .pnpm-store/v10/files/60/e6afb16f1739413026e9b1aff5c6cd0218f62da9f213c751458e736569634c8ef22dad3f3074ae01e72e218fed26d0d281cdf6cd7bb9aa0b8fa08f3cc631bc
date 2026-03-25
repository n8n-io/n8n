import {
  __publicField
} from "./chunk-NSSMTXJJ.mjs";

// src/deno.ts
if (typeof globalThis.Deno !== "undefined") {
  const OriginalRequest = globalThis.Request;
  const PatchedRequest = function(input, init) {
    if (init && typeof init === "object") {
      const cleanInit = { ...init };
      if ("client" in cleanInit) {
        delete cleanInit.client;
      }
      return new OriginalRequest(input, cleanInit);
    }
    return new OriginalRequest(input, init);
  };
  Object.setPrototypeOf(PatchedRequest, OriginalRequest);
  Object.defineProperty(PatchedRequest, "prototype", {
    value: OriginalRequest.prototype,
    writable: false
  });
  globalThis.Request = PatchedRequest;
}

// src/types.ts
var baseRecordSetFields = [
  "ids",
  "embeddings",
  "metadatas",
  "documents",
  "uris"
];
var recordSetFields = [...baseRecordSetFields, "ids"];
var IncludeEnum = /* @__PURE__ */ ((IncludeEnum2) => {
  IncludeEnum2["distances"] = "distances";
  IncludeEnum2["documents"] = "documents";
  IncludeEnum2["embeddings"] = "embeddings";
  IncludeEnum2["metadatas"] = "metadatas";
  IncludeEnum2["uris"] = "uris";
  return IncludeEnum2;
})(IncludeEnum || {});
var GetResult = class {
  /**
   * Creates a new GetResult instance.
   * @param data - The result data containing all fields
   */
  constructor({
    documents,
    embeddings,
    ids,
    include,
    metadatas,
    uris
  }) {
    this.documents = documents;
    this.embeddings = embeddings;
    this.ids = ids;
    this.include = include;
    this.metadatas = metadatas;
    this.uris = uris;
  }
  /**
   * Converts the result to a row-based format for easier iteration.
   * @returns Object containing include fields and array of record objects
   */
  rows() {
    return this.ids.map((id, index) => {
      return {
        id,
        document: this.include.includes("documents") ? this.documents[index] : void 0,
        embedding: this.include.includes("embeddings") ? this.embeddings[index] : void 0,
        metadata: this.include.includes("metadatas") ? this.metadatas[index] : void 0,
        uri: this.include.includes("uris") ? this.uris[index] : void 0
      };
    });
  }
};
var QueryResult = class {
  /**
   * Creates a new QueryResult instance.
   * @param data - The query result data containing all fields
   */
  constructor({
    distances,
    documents,
    embeddings,
    ids,
    include,
    metadatas,
    uris
  }) {
    this.distances = distances;
    this.documents = documents;
    this.embeddings = embeddings;
    this.ids = ids;
    this.include = include;
    this.metadatas = metadatas;
    this.uris = uris;
  }
  /**
   * Converts the query result to a row-based format for easier iteration.
   * @returns Object containing include fields and structured query results
   */
  rows() {
    const queries = [];
    for (let q2 = 0; q2 < this.ids.length; q2++) {
      const records = this.ids[q2].map((id, index) => {
        return {
          id,
          document: this.include.includes("documents") ? this.documents[q2][index] : void 0,
          embedding: this.include.includes("embeddings") ? this.embeddings[q2][index] : void 0,
          metadata: this.include.includes("metadatas") ? this.metadatas[q2][index] : void 0,
          uri: this.include.includes("uris") ? this.uris[q2][index] : void 0,
          distance: this.include.includes("distances") ? this.distances[q2][index] : void 0
        };
      });
      queries.push(records);
    }
    return queries;
  }
};

// ../../node_modules/.pnpm/@hey-api+client-fetch@0.10.0_@hey-api+openapi-ts@0.67.3_typescript@5.8.3_/node_modules/@hey-api/client-fetch/dist/index.js
var A = async (t, r) => {
  let e = typeof r == "function" ? await r(t) : r;
  if (e) return t.scheme === "bearer" ? `Bearer ${e}` : t.scheme === "basic" ? `Basic ${btoa(e)}` : e;
};
var R = { bodySerializer: (t) => JSON.stringify(t, (r, e) => typeof e == "bigint" ? e.toString() : e) };
var U = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var _ = (t) => {
  switch (t) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var D = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var O = ({ allowReserved: t, explode: r, name: e, style: a, value: i }) => {
  if (!r) {
    let s = (t ? i : i.map((l) => encodeURIComponent(l))).join(_(a));
    switch (a) {
      case "label":
        return `.${s}`;
      case "matrix":
        return `;${e}=${s}`;
      case "simple":
        return s;
      default:
        return `${e}=${s}`;
    }
  }
  let o = U(a), n = i.map((s) => a === "label" || a === "simple" ? t ? s : encodeURIComponent(s) : y({ allowReserved: t, name: e, value: s })).join(o);
  return a === "label" || a === "matrix" ? o + n : n;
};
var y = ({ allowReserved: t, name: r, value: e }) => {
  if (e == null) return "";
  if (typeof e == "object") throw new Error("Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these.");
  return `${r}=${t ? e : encodeURIComponent(e)}`;
};
var q = ({ allowReserved: t, explode: r, name: e, style: a, value: i }) => {
  if (i instanceof Date) return `${e}=${i.toISOString()}`;
  if (a !== "deepObject" && !r) {
    let s = [];
    Object.entries(i).forEach(([f, u]) => {
      s = [...s, f, t ? u : encodeURIComponent(u)];
    });
    let l = s.join(",");
    switch (a) {
      case "form":
        return `${e}=${l}`;
      case "label":
        return `.${l}`;
      case "matrix":
        return `;${e}=${l}`;
      default:
        return l;
    }
  }
  let o = D(a), n = Object.entries(i).map(([s, l]) => y({ allowReserved: t, name: a === "deepObject" ? `${e}[${s}]` : s, value: l })).join(o);
  return a === "label" || a === "matrix" ? o + n : n;
};
var H = /\{[^{}]+\}/g;
var B = ({ path: t, url: r }) => {
  let e = r, a = r.match(H);
  if (a) for (let i of a) {
    let o = false, n = i.substring(1, i.length - 1), s = "simple";
    n.endsWith("*") && (o = true, n = n.substring(0, n.length - 1)), n.startsWith(".") ? (n = n.substring(1), s = "label") : n.startsWith(";") && (n = n.substring(1), s = "matrix");
    let l = t[n];
    if (l == null) continue;
    if (Array.isArray(l)) {
      e = e.replace(i, O({ explode: o, name: n, style: s, value: l }));
      continue;
    }
    if (typeof l == "object") {
      e = e.replace(i, q({ explode: o, name: n, style: s, value: l }));
      continue;
    }
    if (s === "matrix") {
      e = e.replace(i, `;${y({ name: n, value: l })}`);
      continue;
    }
    let f = encodeURIComponent(s === "label" ? `.${l}` : l);
    e = e.replace(i, f);
  }
  return e;
};
var E = ({ allowReserved: t, array: r, object: e } = {}) => (i) => {
  let o = [];
  if (i && typeof i == "object") for (let n in i) {
    let s = i[n];
    if (s != null) {
      if (Array.isArray(s)) {
        o = [...o, O({ allowReserved: t, explode: true, name: n, style: "form", value: s, ...r })];
        continue;
      }
      if (typeof s == "object") {
        o = [...o, q({ allowReserved: t, explode: true, name: n, style: "deepObject", value: s, ...e })];
        continue;
      }
      o = [...o, y({ allowReserved: t, name: n, value: s })];
    }
  }
  return o.join("&");
};
var P = (t) => {
  if (!t) return "stream";
  let r = t.split(";")[0]?.trim();
  if (r) {
    if (r.startsWith("application/json") || r.endsWith("+json")) return "json";
    if (r === "multipart/form-data") return "formData";
    if (["application/", "audio/", "image/", "video/"].some((e) => r.startsWith(e))) return "blob";
    if (r.startsWith("text/")) return "text";
  }
};
var I = async ({ security: t, ...r }) => {
  for (let e of t) {
    let a = await A(e, r.auth);
    if (!a) continue;
    let i = e.name ?? "Authorization";
    switch (e.in) {
      case "query":
        r.query || (r.query = {}), r.query[i] = a;
        break;
      case "cookie":
        r.headers.append("Cookie", `${i}=${a}`);
        break;
      case "header":
      default:
        r.headers.set(i, a);
        break;
    }
    return;
  }
};
var S = (t) => W({ baseUrl: t.baseUrl, path: t.path, query: t.query, querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : E(t.querySerializer), url: t.url });
var W = ({ baseUrl: t, path: r, query: e, querySerializer: a, url: i }) => {
  let o = i.startsWith("/") ? i : `/${i}`, n = (t ?? "") + o;
  r && (n = B({ path: r, url: n }));
  let s = e ? a(e) : "";
  return s.startsWith("?") && (s = s.substring(1)), s && (n += `?${s}`), n;
};
var C = (t, r) => {
  let e = { ...t, ...r };
  return e.baseUrl?.endsWith("/") && (e.baseUrl = e.baseUrl.substring(0, e.baseUrl.length - 1)), e.headers = x(t.headers, r.headers), e;
};
var x = (...t) => {
  let r = new Headers();
  for (let e of t) {
    if (!e || typeof e != "object") continue;
    let a = e instanceof Headers ? e.entries() : Object.entries(e);
    for (let [i, o] of a) if (o === null) r.delete(i);
    else if (Array.isArray(o)) for (let n of o) r.append(i, n);
    else o !== void 0 && r.set(i, typeof o == "object" ? JSON.stringify(o) : o);
  }
  return r;
};
var h = class {
  constructor() {
    __publicField(this, "_fns");
    this._fns = [];
  }
  clear() {
    this._fns = [];
  }
  exists(r) {
    return this._fns.indexOf(r) !== -1;
  }
  eject(r) {
    let e = this._fns.indexOf(r);
    e !== -1 && (this._fns = [...this._fns.slice(0, e), ...this._fns.slice(e + 1)]);
  }
  use(r) {
    this._fns = [...this._fns, r];
  }
};
var T = () => ({ error: new h(), request: new h(), response: new h() });
var N = E({ allowReserved: false, array: { explode: true, style: "form" }, object: { explode: true, style: "deepObject" } });
var Q = { "Content-Type": "application/json" };
var w = (t = {}) => ({ ...R, headers: Q, parseAs: "auto", querySerializer: N, ...t });
var J = (t = {}) => {
  let r = C(w(), t), e = () => ({ ...r }), a = (n) => (r = C(r, n), e()), i = T(), o = async (n) => {
    let s = { ...r, ...n, fetch: n.fetch ?? r.fetch ?? globalThis.fetch, headers: x(r.headers, n.headers) };
    s.security && await I({ ...s, security: s.security }), s.body && s.bodySerializer && (s.body = s.bodySerializer(s.body)), (s.body === void 0 || s.body === "") && s.headers.delete("Content-Type");
    let l = S(s), f = { redirect: "follow", ...s }, u = new Request(l, f);
    for (let p of i.request._fns) u = await p(u, s);
    let k = s.fetch, c = await k(u);
    for (let p of i.response._fns) c = await p(c, u, s);
    let m = { request: u, response: c };
    if (c.ok) {
      if (c.status === 204 || c.headers.get("Content-Length") === "0") return { data: {}, ...m };
      let p = (s.parseAs === "auto" ? P(c.headers.get("Content-Type")) : s.parseAs) ?? "json";
      if (p === "stream") return { data: c.body, ...m };
      let b = await c[p]();
      return p === "json" && (s.responseValidator && await s.responseValidator(b), s.responseTransformer && (b = await s.responseTransformer(b))), { data: b, ...m };
    }
    let g = await c.text();
    try {
      g = JSON.parse(g);
    } catch {
    }
    let d = g;
    for (let p of i.error._fns) d = await p(g, c, u, s);
    if (d = d || {}, s.throwOnError) throw d;
    return { error: d, ...m };
  };
  return { buildUrl: S, connect: (n) => o({ ...n, method: "CONNECT" }), delete: (n) => o({ ...n, method: "DELETE" }), get: (n) => o({ ...n, method: "GET" }), getConfig: e, head: (n) => o({ ...n, method: "HEAD" }), interceptors: i, options: (n) => o({ ...n, method: "OPTIONS" }), patch: (n) => o({ ...n, method: "PATCH" }), post: (n) => o({ ...n, method: "POST" }), put: (n) => o({ ...n, method: "PUT" }), request: o, setConfig: a, trace: (n) => o({ ...n, method: "TRACE" }) };
};

// src/api/client.gen.ts
var client = J(w({
  baseUrl: "http://localhost:8000",
  throwOnError: true
}));

// src/api/sdk.gen.ts
var DefaultService = class {
  /**
   * Retrieves the current user's identity, tenant, and databases.
   */
  static getUserIdentity(options) {
    return (options?.client ?? client).get({
      url: "/api/v2/auth/identity",
      ...options
    });
  }
  /**
   * Retrieves a collection by Chroma Resource Name.
   */
  static getCollectionByCrn(options) {
    return (options.client ?? client).get({
      url: "/api/v2/collections/{crn}",
      ...options
    });
  }
  /**
   * Health check endpoint that returns 200 if the server and executor are ready
   */
  static healthcheck(options) {
    return (options?.client ?? client).get({
      url: "/api/v2/healthcheck",
      ...options
    });
  }
  /**
   * Heartbeat endpoint that returns a nanosecond timestamp of the current time.
   */
  static heartbeat(options) {
    return (options?.client ?? client).get({
      url: "/api/v2/heartbeat",
      ...options
    });
  }
  /**
   * Pre-flight checks endpoint reporting basic readiness info.
   */
  static preFlightChecks(options) {
    return (options?.client ?? client).get({
      url: "/api/v2/pre-flight-checks",
      ...options
    });
  }
  /**
   * Reset endpoint allowing authorized users to reset the database.
   */
  static reset(options) {
    return (options?.client ?? client).post({
      url: "/api/v2/reset",
      ...options
    });
  }
  /**
   * Creates a new tenant.
   */
  static createTenant(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Returns an existing tenant by name.
   */
  static getTenant(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant_name}",
      ...options
    });
  }
  /**
   * Updates an existing tenant by name.
   */
  static updateTenant(options) {
    return (options.client ?? client).patch({
      url: "/api/v2/tenants/{tenant_name}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Lists all databases for a given tenant.
   */
  static listDatabases(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases",
      ...options
    });
  }
  /**
   * Creates a new database for a given tenant.
   */
  static createDatabase(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Deletes a specific database.
   */
  static deleteDatabase(options) {
    return (options.client ?? client).delete({
      url: "/api/v2/tenants/{tenant}/databases/{database}",
      ...options
    });
  }
  /**
   * Retrieves a specific database by name.
   */
  static getDatabase(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}",
      ...options
    });
  }
  /**
   * Lists all collections in the specified database.
   */
  static listCollections(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections",
      ...options
    });
  }
  /**
   * Creates a new collection under the specified database.
   */
  static createCollection(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Deletes a collection in a given database.
   */
  static deleteCollection(options) {
    return (options.client ?? client).delete({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}",
      ...options
    });
  }
  /**
   * Retrieves a collection by ID or name.
   */
  static getCollection(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}",
      ...options
    });
  }
  /**
   * Updates an existing collection's name or metadata.
   */
  static updateCollection(options) {
    return (options.client ?? client).put({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Adds records to a collection.
   */
  static collectionAdd(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/add",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Detach a function
   */
  static detachFunction(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/attached_functions/{name}/detach",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Retrieves the number of records in a collection.
   */
  static collectionCount(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/count",
      ...options
    });
  }
  /**
   * Deletes records in a collection. Can filter by IDs or metadata.
   */
  static collectionDelete(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/delete",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Forks an existing collection.
   */
  static forkCollection(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/fork",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Attach a function to a collection
   */
  static attachFunction(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/functions/attach",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Get an attached function by name
   */
  static getAttachedFunction(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/functions/{function_name}",
      ...options
    });
  }
  /**
   * Retrieves records from a collection by ID or metadata filter.
   */
  static collectionGet(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/get",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Query a collection in a variety of ways, including vector search, metadata filtering, and full-text search
   */
  static collectionQuery(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/query",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Search records from a collection with hybrid criterias.
   */
  static collectionSearch(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/search",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Updates records in a collection by ID.
   */
  static collectionUpdate(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/update",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Upserts records in a collection (create if not exists, otherwise update).
   */
  static collectionUpsert(options) {
    return (options.client ?? client).post({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/upsert",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Retrieves the total number of collections in a given database.
   */
  static countCollections(options) {
    return (options.client ?? client).get({
      url: "/api/v2/tenants/{tenant}/databases/{database}/collections_count",
      ...options
    });
  }
  /**
   * Returns the version of the server.
   */
  static version(options) {
    return (options?.client ?? client).get({
      url: "/api/v2/version",
      ...options
    });
  }
};

// src/errors.ts
var ChromaError = class extends Error {
  constructor(name, message, cause) {
    super(message);
    this.cause = cause;
    this.name = name;
  }
};
var ChromaConnectionError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaConnectionError";
  }
};
var ChromaServerError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaServerError";
  }
};
var ChromaClientError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaClientError";
  }
};
var ChromaUnauthorizedError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaAuthError";
  }
};
var ChromaForbiddenError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaForbiddenError";
  }
};
var ChromaNotFoundError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaNotFoundError";
  }
};
var ChromaValueError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaValueError";
  }
};
var InvalidCollectionError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "InvalidCollectionError";
  }
};
var InvalidArgumentError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "InvalidArgumentError";
  }
};
var ChromaUniqueError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaUniqueError";
  }
};
var ChromaQuotaExceededError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaQuotaExceededError";
  }
};
var ChromaRateLimitError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ChromaRateLimitError";
  }
};
function createErrorByType(type, message) {
  switch (type) {
    case "InvalidCollection":
      return new InvalidCollectionError(message);
    case "InvalidArgumentError":
      return new InvalidArgumentError(message);
    default:
      return void 0;
  }
}

// src/utils.ts
var DEFAULT_TENANT = "default_tenant";
var DEFAULT_DATABASE = "default_database";
var defaultAdminClientArgs = {
  host: "localhost",
  port: 8e3,
  ssl: false
};
var defaultChromaClientArgs = {
  ...defaultAdminClientArgs,
  tenant: DEFAULT_TENANT,
  database: DEFAULT_DATABASE
};
var normalizeMethod = (method) => {
  if (method) {
    switch (method.toUpperCase()) {
      case "GET":
        return "GET";
      case "POST":
        return "POST";
      case "PUT":
        return "PUT";
      case "DELETE":
        return "DELETE";
      case "HEAD":
        return "HEAD";
      case "CONNECT":
        return "CONNECT";
      case "OPTIONS":
        return "OPTIONS";
      case "PATCH":
        return "PATCH";
      case "TRACE":
        return "TRACE";
      default:
        return void 0;
    }
  }
  return void 0;
};
var validateRecordSetLengthConsistency = (recordSet) => {
  const lengths = Object.entries(recordSet).filter(
    ([field, value]) => recordSetFields.includes(field) && value !== void 0
  ).map(([field, value]) => [field, value.length]);
  if (lengths.length === 0) {
    throw new ChromaValueError(
      `At least one of ${recordSetFields.join(", ")} must be provided`
    );
  }
  const zeroLength = lengths.filter(([_2, length]) => length === 0).map(([field, _2]) => field);
  if (zeroLength.length > 0) {
    throw new ChromaValueError(
      `Non-empty lists are required for ${zeroLength.join(", ")}`
    );
  }
  if (new Set(lengths.map(([_2, length]) => length)).size > 1) {
    throw new ChromaValueError(
      `Unequal lengths for fields ${lengths.map(([field, _2]) => field).join(", ")}`
    );
  }
};
var validateEmbeddings = ({
  embeddings,
  fieldName = "embeddings"
}) => {
  if (!Array.isArray(embeddings)) {
    throw new ChromaValueError(
      `Expected '${fieldName}' to be an array, but got ${typeof embeddings}`
    );
  }
  if (embeddings.length === 0) {
    throw new ChromaValueError(
      "Expected embeddings to be an array with at least one item"
    );
  }
  if (!embeddings.filter((e) => e.every((n) => typeof n === "number"))) {
    throw new ChromaValueError(
      "Expected each embedding to be an array of numbers"
    );
  }
  embeddings.forEach((embedding, i) => {
    if (embedding.length === 0) {
      throw new ChromaValueError(
        `Expected each embedding to be a non-empty array of numbers, but got an empty array at index ${i}`
      );
    }
  });
};
var validateDocuments = ({
  documents,
  nullable = false,
  fieldName = "documents"
}) => {
  if (!Array.isArray(documents)) {
    throw new ChromaValueError(
      `Expected '${fieldName}' to be an array, but got ${typeof documents}`
    );
  }
  if (documents.length === 0) {
    throw new ChromaValueError(
      `Expected '${fieldName}' to be a non-empty list`
    );
  }
  documents.forEach((document) => {
    if (!nullable && typeof document !== "string" && !document) {
      throw new ChromaValueError(
        `Expected each document to be a string, but got ${typeof document}`
      );
    }
  });
};
var validateIDs = (ids) => {
  if (!Array.isArray(ids)) {
    throw new ChromaValueError(
      `Expected 'ids' to be an array, but got ${typeof ids}`
    );
  }
  if (ids.length === 0) {
    throw new ChromaValueError("Expected 'ids' to be a non-empty list");
  }
  const nonStrings = ids.map((id, i) => [id, i]).filter(([id, _2]) => typeof id !== "string").map(([_2, i]) => i);
  if (nonStrings.length > 0) {
    throw new ChromaValueError(
      `Found non-string IDs at ${nonStrings.join(", ")}`
    );
  }
  const seen = /* @__PURE__ */ new Set();
  const duplicates = ids.filter((id) => {
    if (seen.has(id)) {
      return id;
    }
    seen.add(id);
  });
  let message = "Expected IDs to be unique, but found duplicates of";
  if (duplicates.length > 0 && duplicates.length <= 5) {
    throw new ChromaValueError(`${message} ${duplicates.join(", ")}`);
  }
  if (duplicates.length > 0) {
    throw new ChromaValueError(
      `${message} ${duplicates.slice(0, 5).join(", ")}, ..., ${duplicates.slice(duplicates.length - 5).join(", ")}`
    );
  }
};
var validateSparseVector = (v) => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const candidate = v;
  const indices = candidate.indices;
  const values = candidate.values;
  if (!Array.isArray(indices) || !Array.isArray(values)) {
    return false;
  }
  return indices.every((e) => typeof e === "number") && values.every((e) => typeof e === "number");
};
var validateMetadata = (metadata) => {
  if (!metadata) {
    return;
  }
  if (Object.keys(metadata).length === 0) {
    throw new ChromaValueError("Expected metadata to be non-empty");
  }
  if (!Object.values(metadata).every(
    (v) => v === null || v === void 0 || typeof v === "string" || typeof v === "number" || typeof v === "boolean" || validateSparseVector(v)
  )) {
    throw new ChromaValueError(
      "Expected metadata to be a string, number, boolean, SparseVector, or nullable"
    );
  }
};
var SPARSE_VECTOR_TYPE = "sparse_vector";
var toSerializedSparseVector = (vector) => ({
  "#type": SPARSE_VECTOR_TYPE,
  indices: vector.indices,
  values: vector.values
});
var serializeMetadata = (metadata) => {
  if (metadata === void 0) {
    return void 0;
  }
  if (metadata === null) {
    return null;
  }
  const result = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (validateSparseVector(value)) {
      result[key] = toSerializedSparseVector(value);
    } else {
      result[key] = value ?? null;
    }
  });
  return result;
};
var serializeMetadatas = (metadatas) => {
  if (metadatas === void 0) {
    return void 0;
  }
  if (metadatas === null) {
    return null;
  }
  return metadatas.map((metadata) => serializeMetadata(metadata) ?? null);
};
var isSerializedSparseVector = (value) => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["#type"] !== SPARSE_VECTOR_TYPE) {
    return false;
  }
  return validateSparseVector(candidate);
};
var deserializeMetadataValue = (value) => {
  if (isSerializedSparseVector(value)) {
    return {
      indices: value.indices,
      values: value.values
    };
  }
  return value;
};
var deserializeMetadata = (metadata) => {
  if (metadata === void 0) {
    return void 0;
  }
  if (metadata === null) {
    return null;
  }
  const result = {};
  Object.entries(metadata).forEach(([key, value]) => {
    result[key] = deserializeMetadataValue(value);
  });
  return result;
};
var deserializeMetadatas = (metadatas) => {
  if (metadatas === void 0) {
    return void 0;
  }
  if (metadatas === null) {
    return null;
  }
  return metadatas.map((metadata) => deserializeMetadata(metadata) ?? null);
};
var deserializeMetadataMatrix = (metadatas) => {
  if (metadatas === void 0) {
    return void 0;
  }
  if (metadatas === null) {
    return null;
  }
  return metadatas.map((metadataArray) => {
    if (metadataArray === null) {
      return null;
    }
    const deserialized = deserializeMetadatas(metadataArray);
    return deserialized ?? [];
  });
};
var validateMetadatas = (metadatas) => {
  if (!Array.isArray(metadatas)) {
    throw new ChromaValueError(
      `Expected metadatas to be an array, but got ${typeof metadatas}`
    );
  }
  metadatas.forEach((metadata) => validateMetadata(metadata));
};
var validateBaseRecordSet = ({
  recordSet,
  update = false,
  embeddingsField = "embeddings",
  documentsField = "documents"
}) => {
  if (!recordSet.embeddings && !recordSet.documents && !update) {
    throw new ChromaValueError(
      `At least one of '${embeddingsField}' and '${documentsField}' must be provided`
    );
  }
  if (recordSet.embeddings) {
    validateEmbeddings({
      embeddings: recordSet.embeddings,
      fieldName: embeddingsField
    });
  }
  if (recordSet.documents) {
    validateDocuments({
      documents: recordSet.documents,
      fieldName: documentsField
    });
  }
  if (recordSet.metadatas) {
    validateMetadatas(recordSet.metadatas);
  }
};
var validateMaxBatchSize = (recordSetLength, maxBatchSize) => {
  if (recordSetLength > maxBatchSize) {
    throw new ChromaValueError(
      `Record set length ${recordSetLength} exceeds max batch size ${maxBatchSize}`
    );
  }
};
var validateWhere = (where) => {
  if (typeof where !== "object") {
    throw new ChromaValueError("Expected where to be a non-empty object");
  }
  if (Object.keys(where).length != 1) {
    throw new ChromaValueError(
      `Expected 'where' to have exactly one operator, but got ${Object.keys(where).length}`
    );
  }
  Object.entries(where).forEach(([key, value]) => {
    if (key !== "$and" && key !== "$or" && key !== "$in" && key !== "$nin" && !["string", "number", "boolean", "object"].includes(typeof value)) {
      throw new ChromaValueError(
        `Expected 'where' value to be a string, number, boolean, or an operator expression, but got ${value}`
      );
    }
    if (key === "$and" || key === "$or") {
      if (Object.keys(value).length <= 1) {
        throw new ChromaValueError(
          `Expected 'where' value for $and or $or to be a list of 'where' expressions, but got ${value}`
        );
      }
      value.forEach((w2) => validateWhere(w2));
      return;
    }
    if (typeof value === "object") {
      if (Object.keys(value).length != 1) {
        throw new ChromaValueError(
          `Expected operator expression to have one operator, but got ${value}`
        );
      }
      const [operator, operand] = Object.entries(value)[0];
      if (["$gt", "$gte", "$lt", "$lte"].includes(operator) && typeof operand !== "number") {
        throw new ChromaValueError(
          `Expected operand value to be a number for ${operator}, but got ${typeof operand}`
        );
      }
      if (["$in", "$nin"].includes(operator) && !Array.isArray(operand)) {
        throw new ChromaValueError(
          `Expected operand value to be an array for ${operator}, but got ${operand}`
        );
      }
      if (!["$gt", "$gte", "$lt", "$lte", "$ne", "$eq", "$in", "$nin"].includes(
        operator
      )) {
        throw new ChromaValueError(
          `Expected operator to be one of $gt, $gte, $lt, $lte, $ne, $eq, $in, $nin, but got ${operator}`
        );
      }
      if (!["string", "number", "boolean"].includes(typeof operand) && !Array.isArray(operand)) {
        throw new ChromaValueError(
          "Expected operand value to be a string, number, boolean, or a list of those types"
        );
      }
      if (Array.isArray(operand) && (operand.length === 0 || !operand.every((item) => typeof item === typeof operand[0]))) {
        throw new ChromaValueError(
          "Expected 'where' operand value to be a non-empty list and all values to be of the same type"
        );
      }
    }
  });
};
var validateWhereDocument = (whereDocument) => {
  if (typeof whereDocument !== "object") {
    throw new ChromaValueError(
      "Expected 'whereDocument' to be a non-empty object"
    );
  }
  if (Object.keys(whereDocument).length != 1) {
    throw new ChromaValueError(
      `Expected 'whereDocument' to have exactly one operator, but got ${whereDocument}`
    );
  }
  const [operator, operand] = Object.entries(whereDocument)[0];
  if (![
    "$contains",
    "$not_contains",
    "$matches",
    "$not_matches",
    "$regex",
    "$not_regex",
    "$and",
    "$or"
  ].includes(operator)) {
    throw new ChromaValueError(
      `Expected 'whereDocument' operator to be one of $contains, $not_contains, $matches, $not_matches, $regex, $not_regex, $and, or $or, but got ${operator}`
    );
  }
  if (operator === "$and" || operator === "$or") {
    if (!Array.isArray(operand)) {
      throw new ChromaValueError(
        `Expected operand for ${operator} to be a list of 'whereDocument' expressions, but got ${operand}`
      );
    }
    if (operand.length <= 1) {
      throw new ChromaValueError(
        `Expected 'whereDocument' operand for ${operator} to be a list with at least two 'whereDocument' expressions`
      );
    }
    operand.forEach((item) => validateWhereDocument(item));
  }
  if ((operand === "$contains" || operand === "$not_contains" || operand === "$regex" || operand === "$not_regex") && (typeof operator !== "string" || operator.length === 0)) {
    throw new ChromaValueError(
      `Expected operand for ${operator} to be a non empty string, but got ${operand}`
    );
  }
};
var validateInclude = ({
  include,
  exclude
}) => {
  if (!Array.isArray(include)) {
    throw new ChromaValueError("Expected 'include' to be a non-empty array");
  }
  const validValues = Object.keys(IncludeEnum);
  include.forEach((item) => {
    if (typeof item !== "string") {
      throw new ChromaValueError("Expected 'include' items to be strings");
    }
    if (!validValues.includes(item)) {
      throw new ChromaValueError(
        `Expected 'include' items to be one of ${validValues.join(
          ", "
        )}, but got ${item}`
      );
    }
    if (exclude?.includes(item)) {
      throw new ChromaValueError(`${item} is not allowed for this operation`);
    }
  });
};
var validateNResults = (nResults) => {
  if (typeof nResults !== "number") {
    throw new ChromaValueError(
      `Expected 'nResults' to be a number, but got ${typeof nResults}`
    );
  }
  if (nResults <= 0) {
    throw new ChromaValueError("Number of requested results has to positive");
  }
};
var parseConnectionPath = (path) => {
  try {
    const url = new URL(path);
    const ssl = url.protocol === "https:";
    const host = url.hostname;
    const port = url.port;
    return {
      ssl,
      host,
      port: Number(port)
    };
  } catch {
    throw new ChromaValueError(`Invalid URL: ${path}`);
  }
};
var packEmbedding = (embedding) => {
  const buffer = new ArrayBuffer(embedding.length * 4);
  const view = new Float32Array(buffer);
  for (let i = 0; i < embedding.length; i++) {
    view[i] = embedding[i];
  }
  return buffer;
};
var embeddingsToBase64Bytes = (embeddings) => {
  return embeddings.map((embedding) => {
    const buffer = packEmbedding(embedding);
    const uint8Array = new Uint8Array(buffer);
    const binaryString = Array.from(
      uint8Array,
      (byte) => String.fromCharCode(byte)
    ).join("");
    return btoa(binaryString);
  });
};

// src/embedding-function.ts
var knownEmbeddingFunctions = /* @__PURE__ */ new Map();
var pythonEmbeddingFunctions = {
  onnx_mini_lm_l6_v2: "default-embed",
  default: "default-embed",
  together_ai: "together-ai",
  sentence_transformer: "sentence-transformer"
};
var unsupportedEmbeddingFunctions = /* @__PURE__ */ new Set([
  "amazon_bedrock",
  "baseten",
  "langchain",
  "google_palm",
  "huggingface",
  "instructor",
  "open_clip",
  "roboflow",
  "text2vec"
]);
var knownSparseEmbeddingFunctions = /* @__PURE__ */ new Map();
var pythonSparseEmbeddingFunctions = {
  chroma_bm25: "chroma-bm25"
};
var unsupportedSparseEmbeddingFunctions = /* @__PURE__ */ new Set([
  "bm25",
  "fastembed_sparse",
  "huggingface_sparse"
]);
var registerEmbeddingFunction = (name, fn) => {
  if (knownEmbeddingFunctions.has(name)) {
    throw new ChromaValueError(
      `Embedding function with name ${name} is already registered.`
    );
  }
  knownEmbeddingFunctions.set(name, fn);
};
var registerSparseEmbeddingFunction = (name, fn) => {
  if (knownSparseEmbeddingFunctions.has(name)) {
    throw new ChromaValueError(
      `Sparse embedding function with name ${name} is already registered.`
    );
  }
  knownSparseEmbeddingFunctions.set(name, fn);
};
var getEmbeddingFunction = async (args) => {
  const { collectionName, client: client2, efConfig } = args;
  if (!efConfig) {
    console.warn(
      `No embedding function configuration found for collection ${collectionName}. 'add' and 'query' will fail unless you provide them embeddings directly.`
    );
    return void 0;
  }
  if (efConfig.type === "legacy") {
    console.warn(
      `No embedding function configuration found for collection ${collectionName}. 'add' and 'query' will fail unless you provide them embeddings directly.`
    );
    return void 0;
  }
  if (efConfig.type === "unknown") {
    console.warn(
      `Unknown embedding function configuration for collection ${collectionName}. 'add' and 'query' will fail unless you provide them embeddings directly.`
    );
    return void 0;
  }
  if (efConfig.type !== "known") {
    return void 0;
  }
  if (unsupportedEmbeddingFunctions.has(efConfig.name)) {
    console.warn(
      `Embedding function ${efConfig.name} is not supported in the JS/TS SDK. 'add' and 'query' will fail unless you provide them embeddings directly.`
    );
    return void 0;
  }
  const packageName = pythonEmbeddingFunctions[efConfig.name] || efConfig.name;
  if (packageName === "default-embed") {
    await getDefaultEFConfig();
  }
  let embeddingFunction = knownEmbeddingFunctions.get(packageName);
  if (!embeddingFunction) {
    try {
      const fullPackageName = `@chroma-core/${packageName}`;
      await import(fullPackageName);
      embeddingFunction = knownEmbeddingFunctions.get(packageName);
    } catch (error) {
    }
    if (!embeddingFunction) {
      console.warn(
        `Collection ${collectionName} was created with the ${packageName} embedding function. However, the @chroma-core/${packageName} package is not installed. 'add' and 'query' will fail unless you provide them embeddings directly, or install the @chroma-core/${packageName} package.`
      );
      return void 0;
    }
  }
  let constructorConfig = efConfig.type === "known" ? efConfig.config : {};
  try {
    if (embeddingFunction.buildFromConfig) {
      return embeddingFunction.buildFromConfig(constructorConfig, client2);
    }
    console.warn(
      `Embedding function ${packageName} does not define a 'buildFromConfig' function. 'add' and 'query' will fail unless you provide them embeddings directly.`
    );
    return void 0;
  } catch (e) {
    console.warn(
      `Embedding function ${packageName} failed to build with config: ${constructorConfig}. 'add' and 'query' will fail unless you provide them embeddings directly. Error: ${e}`
    );
    return void 0;
  }
};
var getSparseEmbeddingFunction = async (collectionName, client2, efConfig) => {
  if (!efConfig) {
    return void 0;
  }
  if (efConfig.type === "legacy") {
    return void 0;
  }
  if (efConfig.type !== "known") {
    return void 0;
  }
  if (unsupportedSparseEmbeddingFunctions.has(efConfig.name)) {
    console.warn(
      "Embedding function ${efConfig.name} is not supported in the JS/TS SDK. 'add' and 'query' will fail unless you provide them embeddings directly."
    );
    return void 0;
  }
  const packageName = pythonSparseEmbeddingFunctions[efConfig.name] || efConfig.name;
  let sparseEmbeddingFunction = knownSparseEmbeddingFunctions.get(packageName);
  if (!sparseEmbeddingFunction) {
    try {
      const fullPackageName = `@chroma-core/${packageName}`;
      await import(fullPackageName);
      sparseEmbeddingFunction = knownSparseEmbeddingFunctions.get(packageName);
    } catch (error) {
    }
    if (!sparseEmbeddingFunction) {
      console.warn(
        `Collection ${collectionName} was created with the ${packageName} sparse embedding function. However, the @chroma-core/${packageName} package is not installed.`
      );
      return void 0;
    }
  }
  let constructorConfig = efConfig.type === "known" ? efConfig.config : {};
  try {
    if (sparseEmbeddingFunction.buildFromConfig) {
      return sparseEmbeddingFunction.buildFromConfig(constructorConfig, client2);
    }
    console.warn(
      `Sparse embedding function ${packageName} does not define a 'buildFromConfig' function.`
    );
    return void 0;
  } catch (e) {
    console.warn(
      `Sparse embedding function ${packageName} failed to build with config: ${constructorConfig}. Error: ${e}`
    );
    return void 0;
  }
};
var serializeEmbeddingFunction = ({
  embeddingFunction,
  configEmbeddingFunction
}) => {
  if (embeddingFunction && configEmbeddingFunction) {
    throw new ChromaValueError(
      "Embedding function provided when already defined in the collection configuration"
    );
  }
  if (!embeddingFunction && !configEmbeddingFunction) {
    return void 0;
  }
  const ef = embeddingFunction || configEmbeddingFunction;
  if (!ef.getConfig || !ef.name || !ef.constructor.buildFromConfig) {
    return { type: "legacy" };
  }
  if (ef.validateConfig) ef.validateConfig(ef.getConfig());
  return {
    name: ef.name,
    type: "known",
    config: ef.getConfig()
  };
};
var getDefaultEFConfig = async () => {
  try {
    const { DefaultEmbeddingFunction } = await import("@chroma-core/default-embed");
    if (!knownEmbeddingFunctions.has("default-embed")) {
      registerEmbeddingFunction("default-embed", DefaultEmbeddingFunction);
    }
  } catch (e) {
    console.warn(
      "Cannot instantiate a collection with the DefaultEmbeddingFunction. Please install @chroma-core/default-embed, or provide a different embedding function"
    );
  }
  return {
    name: "default",
    type: "known",
    config: {}
  };
};

// src/collection-configuration.ts
var processCreateCollectionConfig = async ({
  configuration,
  embeddingFunction,
  metadata,
  schema
}) => {
  let schemaEmbeddingFunction = void 0;
  if (schema) {
    schemaEmbeddingFunction = schema.resolveEmbeddingFunction();
  }
  if (configuration?.hnsw && configuration?.spann) {
    throw new ChromaValueError(
      "Cannot specify both HNSW and SPANN configurations"
    );
  }
  let embeddingFunctionConfiguration = serializeEmbeddingFunction({
    embeddingFunction: embeddingFunction ?? void 0,
    configEmbeddingFunction: configuration?.embeddingFunction
  });
  if (!embeddingFunctionConfiguration && embeddingFunction !== null && schemaEmbeddingFunction === void 0) {
    embeddingFunctionConfiguration = await getDefaultEFConfig();
  }
  const overallEf = embeddingFunction || configuration?.embeddingFunction;
  if (overallEf && overallEf.defaultSpace && overallEf.supportedSpaces) {
    if (configuration?.hnsw === void 0 && configuration?.spann === void 0) {
      if (metadata === void 0 || metadata?.["hnsw:space"] === void 0) {
        if (!configuration) configuration = {};
        configuration.hnsw = { space: overallEf.defaultSpace() };
      }
    }
    if (configuration?.hnsw && !configuration.hnsw.space && overallEf.defaultSpace) {
      configuration.hnsw.space = overallEf.defaultSpace();
    }
    if (configuration?.spann && !configuration.spann.space && overallEf.defaultSpace) {
      configuration.spann.space = overallEf.defaultSpace();
    }
    if (overallEf.supportedSpaces) {
      const supportedSpaces = overallEf.supportedSpaces();
      if (configuration?.hnsw?.space && !supportedSpaces.includes(configuration.hnsw.space)) {
        console.warn(
          `Space '${configuration.hnsw.space}' is not supported by embedding function '${overallEf.name || "unknown"}'. Supported spaces: ${supportedSpaces.join(", ")}`
        );
      }
      if (configuration?.spann?.space && !supportedSpaces.includes(configuration.spann.space)) {
        console.warn(
          `Space '${configuration.spann.space}' is not supported by embedding function '${overallEf.name || "unknown"}'. Supported spaces: ${supportedSpaces.join(", ")}`
        );
      }
      if (!configuration?.hnsw && !configuration?.spann && metadata && typeof metadata["hnsw:space"] === "string" && !supportedSpaces.includes(
        metadata["hnsw:space"]
      )) {
        console.warn(
          `Space '${metadata["hnsw:space"]}' from metadata is not supported by embedding function '${overallEf.name || "unknown"}'. Supported spaces: ${supportedSpaces.join(", ")}`
        );
      }
    }
  }
  return {
    ...configuration || {},
    embedding_function: embeddingFunctionConfiguration
  };
};
var processUpdateCollectionConfig = async ({
  collectionName,
  currentConfiguration,
  currentEmbeddingFunction,
  newConfiguration,
  client: client2
}) => {
  if (newConfiguration.hnsw && typeof newConfiguration.hnsw !== "object") {
    throw new ChromaValueError(
      "Invalid HNSW config provided in UpdateCollectionConfiguration"
    );
  }
  if (newConfiguration.spann && typeof newConfiguration.spann !== "object") {
    throw new ChromaValueError(
      "Invalid SPANN config provided in UpdateCollectionConfiguration"
    );
  }
  const embeddingFunction = currentEmbeddingFunction || await getEmbeddingFunction({
    collectionName,
    client: client2,
    efConfig: currentConfiguration.embeddingFunction ?? void 0
  });
  const newEmbeddingFunction = newConfiguration.embeddingFunction;
  if (embeddingFunction && embeddingFunction.validateConfigUpdate && newEmbeddingFunction && newEmbeddingFunction.getConfig) {
    embeddingFunction.validateConfigUpdate(newEmbeddingFunction.getConfig());
  }
  return {
    updateConfiguration: {
      hnsw: newConfiguration.hnsw,
      spann: newConfiguration.spann,
      embedding_function: newEmbeddingFunction && serializeEmbeddingFunction({ embeddingFunction: newEmbeddingFunction })
    },
    updateEmbeddingFunction: newEmbeddingFunction
  };
};

// src/execution/expression/common.ts
var isPlainObject = (value) => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
var deepClone = (value) => JSON.parse(JSON.stringify(value));
var iterableToArray = (values) => {
  if (Array.isArray(values)) {
    return values.slice();
  }
  return Array.from(values);
};
var assertNonEmptyArray = (values, message) => {
  if (values.length === 0) {
    throw new Error(message);
  }
};

// src/execution/expression/where.ts
var WhereExpressionBase = class {
  and(other) {
    const target = WhereExpression.from(other);
    if (!target) {
      return this;
    }
    return AndWhere.combine(this, target);
  }
  or(other) {
    const target = WhereExpression.from(other);
    if (!target) {
      return this;
    }
    return OrWhere.combine(this, target);
  }
};
var WhereExpression = class _WhereExpression extends WhereExpressionBase {
  static from(input) {
    if (input instanceof _WhereExpression) {
      return input;
    }
    if (input === null || input === void 0) {
      return void 0;
    }
    if (!isPlainObject(input)) {
      throw new TypeError("Where input must be a WhereExpression or plain object");
    }
    return parseWhereDict(input);
  }
};
var AndWhere = class _AndWhere extends WhereExpression {
  constructor(conditions) {
    super();
    this.conditions = conditions;
  }
  toJSON() {
    return { $and: this.conditions.map((condition) => condition.toJSON()) };
  }
  get operands() {
    return this.conditions.slice();
  }
  static combine(left, right) {
    const flattened = [];
    const add = (expr) => {
      if (expr instanceof _AndWhere) {
        flattened.push(...expr.operands);
      } else {
        flattened.push(expr);
      }
    };
    add(left);
    add(right);
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _AndWhere(flattened);
  }
};
var OrWhere = class _OrWhere extends WhereExpression {
  constructor(conditions) {
    super();
    this.conditions = conditions;
  }
  toJSON() {
    return { $or: this.conditions.map((condition) => condition.toJSON()) };
  }
  get operands() {
    return this.conditions.slice();
  }
  static combine(left, right) {
    const flattened = [];
    const add = (expr) => {
      if (expr instanceof _OrWhere) {
        flattened.push(...expr.operands);
      } else {
        flattened.push(expr);
      }
    };
    add(left);
    add(right);
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _OrWhere(flattened);
  }
};
var ComparisonWhere = class extends WhereExpression {
  constructor(key, operator, value) {
    super();
    this.key = key;
    this.operator = operator;
    this.value = value;
  }
  toJSON() {
    return {
      [this.key]: {
        [this.operator]: this.value
      }
    };
  }
};
var comparisonOperatorMap = /* @__PURE__ */ new Map([
  ["$eq", (key, value) => new ComparisonWhere(key, "$eq", value)],
  ["$ne", (key, value) => new ComparisonWhere(key, "$ne", value)],
  ["$gt", (key, value) => new ComparisonWhere(key, "$gt", value)],
  ["$gte", (key, value) => new ComparisonWhere(key, "$gte", value)],
  ["$lt", (key, value) => new ComparisonWhere(key, "$lt", value)],
  ["$lte", (key, value) => new ComparisonWhere(key, "$lte", value)],
  ["$in", (key, value) => new ComparisonWhere(key, "$in", value)],
  ["$nin", (key, value) => new ComparisonWhere(key, "$nin", value)],
  ["$contains", (key, value) => new ComparisonWhere(key, "$contains", value)],
  ["$not_contains", (key, value) => new ComparisonWhere(key, "$not_contains", value)],
  ["$regex", (key, value) => new ComparisonWhere(key, "$regex", value)],
  ["$not_regex", (key, value) => new ComparisonWhere(key, "$not_regex", value)]
]);
var parseWhereDict = (data) => {
  if ("$and" in data) {
    if (Object.keys(data).length !== 1) {
      throw new Error("$and cannot be combined with other keys");
    }
    const rawConditions = data["$and"];
    if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
      throw new TypeError("$and must be a non-empty array");
    }
    const conditions = rawConditions.map((item, index) => {
      const expr = WhereExpression.from(item);
      if (!expr) {
        throw new TypeError(`Invalid where clause at index ${index}`);
      }
      return expr;
    });
    if (conditions.length === 1) {
      return conditions[0];
    }
    return conditions.slice(1).reduce((acc, condition) => AndWhere.combine(acc, condition), conditions[0]);
  }
  if ("$or" in data) {
    if (Object.keys(data).length !== 1) {
      throw new Error("$or cannot be combined with other keys");
    }
    const rawConditions = data["$or"];
    if (!Array.isArray(rawConditions) || rawConditions.length === 0) {
      throw new TypeError("$or must be a non-empty array");
    }
    const conditions = rawConditions.map((item, index) => {
      const expr = WhereExpression.from(item);
      if (!expr) {
        throw new TypeError(`Invalid where clause at index ${index}`);
      }
      return expr;
    });
    if (conditions.length === 1) {
      return conditions[0];
    }
    return conditions.slice(1).reduce((acc, condition) => OrWhere.combine(acc, condition), conditions[0]);
  }
  const entries = Object.entries(data);
  if (entries.length !== 1) {
    throw new Error("Where dictionary must contain exactly one field");
  }
  const [field, value] = entries[0];
  if (!isPlainObject(value)) {
    return new ComparisonWhere(field, "$eq", value);
  }
  const operatorEntries = Object.entries(value);
  if (operatorEntries.length !== 1) {
    throw new Error(`Operator dictionary for field "${field}" must contain exactly one operator`);
  }
  const [operator, operand] = operatorEntries[0];
  const factory = comparisonOperatorMap.get(operator);
  if (!factory) {
    throw new Error(`Unsupported where operator: ${operator}`);
  }
  return factory(field, operand);
};
var createComparisonWhere = (key, operator, value) => new ComparisonWhere(key, operator, value);

// src/execution/expression/key.ts
var _Key = class _Key {
  constructor(name) {
    this.name = name;
  }
  eq(value) {
    return createComparisonWhere(this.name, "$eq", value);
  }
  ne(value) {
    return createComparisonWhere(this.name, "$ne", value);
  }
  gt(value) {
    return createComparisonWhere(this.name, "$gt", value);
  }
  gte(value) {
    return createComparisonWhere(this.name, "$gte", value);
  }
  lt(value) {
    return createComparisonWhere(this.name, "$lt", value);
  }
  lte(value) {
    return createComparisonWhere(this.name, "$lte", value);
  }
  isIn(values) {
    const array = iterableToArray(values);
    assertNonEmptyArray(array, "$in requires at least one value");
    return createComparisonWhere(this.name, "$in", array);
  }
  notIn(values) {
    const array = iterableToArray(values);
    assertNonEmptyArray(array, "$nin requires at least one value");
    return createComparisonWhere(this.name, "$nin", array);
  }
  contains(value) {
    if (typeof value !== "string") {
      throw new TypeError("$contains requires a string value");
    }
    return createComparisonWhere(this.name, "$contains", value);
  }
  notContains(value) {
    if (typeof value !== "string") {
      throw new TypeError("$not_contains requires a string value");
    }
    return createComparisonWhere(this.name, "$not_contains", value);
  }
  regex(pattern) {
    if (typeof pattern !== "string") {
      throw new TypeError("$regex requires a string pattern");
    }
    return createComparisonWhere(this.name, "$regex", pattern);
  }
  notRegex(pattern) {
    if (typeof pattern !== "string") {
      throw new TypeError("$not_regex requires a string pattern");
    }
    return createComparisonWhere(this.name, "$not_regex", pattern);
  }
};
_Key.ID = new _Key("#id");
_Key.DOCUMENT = new _Key("#document");
_Key.EMBEDDING = new _Key("#embedding");
_Key.METADATA = new _Key("#metadata");
_Key.SCORE = new _Key("#score");
var Key = _Key;
var createKeyFactory = () => {
  const factory = (name) => new Key(name);
  factory.ID = Key.ID;
  factory.DOCUMENT = Key.DOCUMENT;
  factory.EMBEDDING = Key.EMBEDDING;
  factory.METADATA = Key.METADATA;
  factory.SCORE = Key.SCORE;
  return factory;
};
var K = createKeyFactory();

// src/execution/expression/limit.ts
var Limit = class _Limit {
  constructor(options = {}) {
    const { offset = 0, limit } = options;
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TypeError("Limit offset must be a non-negative integer");
    }
    if (limit !== null && limit !== void 0) {
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new TypeError("Limit must be a positive integer when provided");
      }
      this.limit = limit;
    }
    this.offset = offset;
  }
  static from(input, offsetOverride) {
    if (input instanceof _Limit) {
      return new _Limit({ offset: input.offset, limit: input.limit });
    }
    if (typeof input === "number") {
      return new _Limit({ limit: input, offset: offsetOverride ?? 0 });
    }
    if (input === null || input === void 0) {
      return new _Limit();
    }
    if (typeof input === "object") {
      return new _Limit(input);
    }
    throw new TypeError("Invalid limit input");
  }
  toJSON() {
    const result = { offset: this.offset };
    if (this.limit !== void 0) {
      result.limit = this.limit;
    }
    return result;
  }
};

// src/execution/expression/select.ts
var Select = class _Select {
  constructor(keys = []) {
    const unique = /* @__PURE__ */ new Set();
    for (const key of keys) {
      const normalized = key instanceof Key ? key.name : key;
      if (typeof normalized !== "string") {
        throw new TypeError("Select keys must be strings or Key instances");
      }
      unique.add(normalized);
    }
    this.keys = Array.from(unique);
  }
  static from(input) {
    if (input instanceof _Select) {
      return new _Select(input.keys);
    }
    if (input === null || input === void 0) {
      return new _Select();
    }
    if (Symbol.iterator in Object(input)) {
      return new _Select(input);
    }
    if (typeof input === "object" && "keys" in input) {
      const { keys } = input;
      return new _Select(keys ?? []);
    }
    throw new TypeError("Unsupported select input");
  }
  static all() {
    return new _Select([Key.DOCUMENT, Key.EMBEDDING, Key.METADATA, Key.SCORE]);
  }
  get values() {
    return this.keys.slice();
  }
  toJSON() {
    return { keys: this.values };
  }
};

// src/execution/expression/rank.ts
var requireNumber = (value, message) => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError(message);
  }
  return value;
};
var RankExpressionBase = class {
  add(...others) {
    if (others.length === 0) {
      return this;
    }
    const expressions = [
      this,
      ...others.map((item, index) => requireRank(item, `add operand ${index}`))
    ];
    return SumRankExpression.create(expressions);
  }
  subtract(other) {
    return new SubRankExpression(
      this,
      requireRank(other, "subtract operand")
    );
  }
  multiply(...others) {
    if (others.length === 0) {
      return this;
    }
    const expressions = [
      this,
      ...others.map((item, index) => requireRank(item, `multiply operand ${index}`))
    ];
    return MulRankExpression.create(expressions);
  }
  divide(other) {
    return new DivRankExpression(
      this,
      requireRank(other, "divide operand")
    );
  }
  negate() {
    return this.multiply(-1);
  }
  abs() {
    return new AbsRankExpression(this);
  }
  exp() {
    return new ExpRankExpression(this);
  }
  log() {
    return new LogRankExpression(this);
  }
  max(...others) {
    if (others.length === 0) {
      return this;
    }
    const expressions = [
      this,
      ...others.map((item, index) => requireRank(item, `max operand ${index}`))
    ];
    return MaxRankExpression.create(expressions);
  }
  min(...others) {
    if (others.length === 0) {
      return this;
    }
    const expressions = [
      this,
      ...others.map((item, index) => requireRank(item, `min operand ${index}`))
    ];
    return MinRankExpression.create(expressions);
  }
};
var RankExpression = class _RankExpression extends RankExpressionBase {
  static from(input) {
    if (input instanceof _RankExpression) {
      return input;
    }
    if (input === null || input === void 0) {
      return void 0;
    }
    if (typeof input === "number") {
      return new ValueRankExpression(input);
    }
    if (isPlainObject(input)) {
      return new RawRankExpression(input);
    }
    throw new TypeError("Rank input must be a RankExpression, number, or plain object");
  }
};
var RawRankExpression = class extends RankExpression {
  constructor(raw) {
    super();
    this.raw = raw;
  }
  toJSON() {
    return deepClone(this.raw);
  }
};
var ValueRankExpression = class extends RankExpression {
  constructor(value) {
    super();
    this.value = value;
  }
  toJSON() {
    return { $val: this.value };
  }
};
var SumRankExpression = class _SumRankExpression extends RankExpression {
  constructor(ranks) {
    super();
    this.ranks = ranks;
  }
  static create(ranks) {
    const flattened = [];
    for (const rank of ranks) {
      if (rank instanceof _SumRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _SumRankExpression(flattened);
  }
  get operands() {
    return this.ranks.slice();
  }
  toJSON() {
    return { $sum: this.ranks.map((rank) => rank.toJSON()) };
  }
};
var SubRankExpression = class extends RankExpression {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  toJSON() {
    return {
      $sub: {
        left: this.left.toJSON(),
        right: this.right.toJSON()
      }
    };
  }
};
var MulRankExpression = class _MulRankExpression extends RankExpression {
  constructor(ranks) {
    super();
    this.ranks = ranks;
  }
  static create(ranks) {
    const flattened = [];
    for (const rank of ranks) {
      if (rank instanceof _MulRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _MulRankExpression(flattened);
  }
  get operands() {
    return this.ranks.slice();
  }
  toJSON() {
    return { $mul: this.ranks.map((rank) => rank.toJSON()) };
  }
};
var DivRankExpression = class extends RankExpression {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  toJSON() {
    return {
      $div: {
        left: this.left.toJSON(),
        right: this.right.toJSON()
      }
    };
  }
};
var AbsRankExpression = class extends RankExpression {
  constructor(operand) {
    super();
    this.operand = operand;
  }
  toJSON() {
    return { $abs: this.operand.toJSON() };
  }
};
var ExpRankExpression = class extends RankExpression {
  constructor(operand) {
    super();
    this.operand = operand;
  }
  toJSON() {
    return { $exp: this.operand.toJSON() };
  }
};
var LogRankExpression = class extends RankExpression {
  constructor(operand) {
    super();
    this.operand = operand;
  }
  toJSON() {
    return { $log: this.operand.toJSON() };
  }
};
var MaxRankExpression = class _MaxRankExpression extends RankExpression {
  constructor(ranks) {
    super();
    this.ranks = ranks;
  }
  static create(ranks) {
    const flattened = [];
    for (const rank of ranks) {
      if (rank instanceof _MaxRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _MaxRankExpression(flattened);
  }
  get operands() {
    return this.ranks.slice();
  }
  toJSON() {
    return { $max: this.ranks.map((rank) => rank.toJSON()) };
  }
};
var MinRankExpression = class _MinRankExpression extends RankExpression {
  constructor(ranks) {
    super();
    this.ranks = ranks;
  }
  static create(ranks) {
    const flattened = [];
    for (const rank of ranks) {
      if (rank instanceof _MinRankExpression) {
        flattened.push(...rank.operands);
      } else {
        flattened.push(rank);
      }
    }
    if (flattened.length === 1) {
      return flattened[0];
    }
    return new _MinRankExpression(flattened);
  }
  get operands() {
    return this.ranks.slice();
  }
  toJSON() {
    return { $min: this.ranks.map((rank) => rank.toJSON()) };
  }
};
var KnnRankExpression = class extends RankExpression {
  constructor(config) {
    super();
    this.config = config;
  }
  toJSON() {
    const base = {
      query: this.config.query,
      key: this.config.key,
      limit: this.config.limit
    };
    if (this.config.defaultValue !== void 0) {
      base.default = this.config.defaultValue;
    }
    if (this.config.returnRank) {
      base.return_rank = true;
    }
    return { $knn: base };
  }
};
var normalizeDenseVector = (vector) => {
  if (Array.isArray(vector)) {
    return vector.slice();
  }
  return Array.from(vector, (value) => {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new TypeError("Dense query vector values must be finite numbers");
    }
    return value;
  });
};
var normalizeKnnOptions = (options) => {
  const limit = options.limit ?? 128;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError("Knn limit must be a positive integer");
  }
  const queryInput = options.query;
  let query;
  if (typeof queryInput === "string") {
    query = queryInput;
  } else if (isPlainObject(queryInput) && Array.isArray(queryInput.indices) && Array.isArray(queryInput.values)) {
    const sparse = queryInput;
    query = {
      indices: sparse.indices.slice(),
      values: sparse.values.slice()
    };
  } else {
    query = normalizeDenseVector(queryInput);
  }
  const key = options.key instanceof Key ? options.key.name : options.key ?? "#embedding";
  if (typeof key !== "string") {
    throw new TypeError("Knn key must be a string or Key instance");
  }
  const defaultValue = options.default === null || options.default === void 0 ? void 0 : requireNumber(options.default, "Knn default must be a number");
  if (defaultValue !== void 0 && !Number.isFinite(defaultValue)) {
    throw new TypeError("Knn default must be a finite number");
  }
  return {
    query: Array.isArray(query) || typeof query === "string" ? query : deepClone(query),
    key,
    limit,
    defaultValue,
    returnRank: options.returnRank ?? false
  };
};
var requireRank = (input, context) => {
  const result = RankExpression.from(input);
  if (!result) {
    throw new TypeError(`${context} must be a rank expression`);
  }
  return result;
};
var Val = (value) => new ValueRankExpression(requireNumber(value, "Val requires a numeric value"));
var Knn = (options) => new KnnRankExpression(normalizeKnnOptions(options));
var Rrf = ({ ranks, k = 60, weights, normalize = false }) => {
  if (!Number.isInteger(k) || k <= 0) {
    throw new TypeError("Rrf k must be a positive integer");
  }
  if (!Array.isArray(ranks) || ranks.length === 0) {
    throw new TypeError("Rrf requires at least one rank expression");
  }
  const expressions = ranks.map((rank, index) => requireRank(rank, `ranks[${index}]`));
  let weightValues = weights ? weights.slice() : new Array(expressions.length).fill(1);
  if (weightValues.length !== expressions.length) {
    throw new Error("Number of weights must match number of ranks");
  }
  if (weightValues.some((value) => typeof value !== "number" || value < 0)) {
    throw new TypeError("Weights must be non-negative numbers");
  }
  if (normalize) {
    const total = weightValues.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      throw new Error("Weights must sum to a positive value when normalize=true");
    }
    weightValues = weightValues.map((value) => value / total);
  }
  const terms = expressions.map((rank, index) => {
    const weight = weightValues[index];
    const numerator = Val(weight);
    const denominator = rank.add(k);
    return numerator.divide(denominator);
  });
  const fused = terms.reduce((acc, term) => acc.add(term));
  return fused.negate();
};
var Sum = (...inputs) => {
  if (inputs.length === 0) {
    throw new Error("Sum requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) => requireRank(rank, `Sum operand ${index}`));
  return SumRankExpression.create(expressions);
};
var Sub = (left, right) => new SubRankExpression(requireRank(left, "Sub left"), requireRank(right, "Sub right"));
var Mul = (...inputs) => {
  if (inputs.length === 0) {
    throw new Error("Mul requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) => requireRank(rank, `Mul operand ${index}`));
  return MulRankExpression.create(expressions);
};
var Div = (left, right) => new DivRankExpression(requireRank(left, "Div left"), requireRank(right, "Div right"));
var Abs = (input) => requireRank(input, "Abs").abs();
var Exp = (input) => requireRank(input, "Exp").exp();
var Log = (input) => requireRank(input, "Log").log();
var Max = (...inputs) => {
  if (inputs.length === 0) {
    throw new Error("Max requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) => requireRank(rank, `Max operand ${index}`));
  return MaxRankExpression.create(expressions);
};
var Min = (...inputs) => {
  if (inputs.length === 0) {
    throw new Error("Min requires at least one rank expression");
  }
  const expressions = inputs.map((rank, index) => requireRank(rank, `Min operand ${index}`));
  return MinRankExpression.create(expressions);
};

// src/execution/expression/groupBy.ts
var Aggregate = class _Aggregate {
  static from(input) {
    if (input instanceof _Aggregate) {
      return input;
    }
    if (isPlainObject(input)) {
      if ("$min_k" in input) {
        const data = input.$min_k;
        return new MinK(
          data.keys.map((k) => new Key(k)),
          data.k
        );
      }
      if ("$max_k" in input) {
        const data = input.$max_k;
        return new MaxK(
          data.keys.map((k) => new Key(k)),
          data.k
        );
      }
    }
    throw new TypeError(
      "Aggregate input must be an Aggregate instance or object with $min_k or $max_k"
    );
  }
  static minK(keys, k) {
    return new MinK(
      keys.map((key) => key instanceof Key ? key : new Key(key)),
      k
    );
  }
  static maxK(keys, k) {
    return new MaxK(
      keys.map((key) => key instanceof Key ? key : new Key(key)),
      k
    );
  }
};
var MinK = class extends Aggregate {
  constructor(keys, k) {
    super();
    this.keys = keys;
    this.k = k;
    if (keys.length === 0) {
      throw new Error("MinK keys cannot be empty");
    }
    if (k <= 0) {
      throw new Error("MinK k must be positive");
    }
  }
  toJSON() {
    return {
      $min_k: {
        keys: this.keys.map((key) => key.name),
        k: this.k
      }
    };
  }
};
var MaxK = class extends Aggregate {
  constructor(keys, k) {
    super();
    this.keys = keys;
    this.k = k;
    if (keys.length === 0) {
      throw new Error("MaxK keys cannot be empty");
    }
    if (k <= 0) {
      throw new Error("MaxK k must be positive");
    }
  }
  toJSON() {
    return {
      $max_k: {
        keys: this.keys.map((key) => key.name),
        k: this.k
      }
    };
  }
};
var GroupBy = class _GroupBy {
  constructor(keys, aggregate) {
    this.keys = keys;
    this.aggregate = aggregate;
    if (keys.length === 0) {
      throw new Error("GroupBy keys cannot be empty");
    }
  }
  static from(input) {
    if (input === void 0 || input === null) {
      return void 0;
    }
    if (input instanceof _GroupBy) {
      return input;
    }
    if (isPlainObject(input)) {
      const data = input;
      if (!data.keys || !Array.isArray(data.keys)) {
        throw new TypeError("GroupBy requires 'keys' array");
      }
      if (!data.aggregate) {
        throw new TypeError("GroupBy requires 'aggregate'");
      }
      return new _GroupBy(
        data.keys.map((k) => new Key(k)),
        Aggregate.from(data.aggregate)
      );
    }
    throw new TypeError("GroupBy input must be a GroupBy instance or plain object");
  }
  toJSON() {
    return {
      keys: this.keys.map((key) => key.name),
      aggregate: this.aggregate.toJSON()
    };
  }
};

// src/execution/expression/search.ts
var Search = class _Search {
  constructor(init = {}) {
    this._where = init.where ? WhereExpression.from(init.where) : void 0;
    this._rank = init.rank ? RankExpression.from(init.rank) : void 0;
    this._groupBy = init.groupBy ? GroupBy.from(init.groupBy) : void 0;
    this._limit = Limit.from(init.limit ?? void 0);
    this._select = Select.from(init.select ?? void 0);
  }
  clone(overrides) {
    const next = Object.create(_Search.prototype);
    next._where = overrides.where ?? this._where;
    next._rank = overrides.rank ?? this._rank;
    next._groupBy = overrides.groupBy ?? this._groupBy;
    next._limit = overrides.limit ?? this._limit;
    next._select = overrides.select ?? this._select;
    return next;
  }
  where(where) {
    return this.clone({ where: WhereExpression.from(where) });
  }
  rank(rank) {
    return this.clone({ rank: RankExpression.from(rank ?? void 0) });
  }
  groupBy(groupBy) {
    return this.clone({ groupBy: GroupBy.from(groupBy) });
  }
  limit(limit, offset) {
    if (typeof limit === "number") {
      return this.clone({ limit: Limit.from(limit, offset) });
    }
    return this.clone({ limit: Limit.from(limit ?? void 0) });
  }
  select(first, ...rest) {
    if (Array.isArray(first) || first instanceof Set) {
      return this.clone({
        select: Select.from(first)
      });
    }
    if (first instanceof Select) {
      return this.clone({ select: Select.from(first) });
    }
    if (typeof first === "object" && first !== null && "keys" in first) {
      return this.clone({ select: Select.from(first) });
    }
    const allKeys = [];
    if (first !== void 0) {
      allKeys.push(first);
    }
    if (rest.length) {
      allKeys.push(...rest);
    }
    return this.clone({ select: Select.from(allKeys) });
  }
  selectAll() {
    return this.clone({ select: Select.all() });
  }
  get whereClause() {
    return this._where;
  }
  get rankExpression() {
    return this._rank;
  }
  get groupByConfig() {
    return this._groupBy;
  }
  get limitConfig() {
    return this._limit;
  }
  get selectConfig() {
    return this._select;
  }
  toPayload() {
    const payload = {
      limit: this._limit.toJSON(),
      select: this._select.toJSON()
    };
    if (this._where) {
      payload.filter = this._where.toJSON();
    }
    if (this._rank) {
      payload.rank = this._rank.toJSON();
    }
    if (this._groupBy) {
      payload.group_by = this._groupBy.toJSON();
    }
    return payload;
  }
};
var toSearch = (input) => input instanceof Search ? input : new Search(input);

// src/execution/expression/searchResult.ts
var normalizePayloadArray = (payload, count) => {
  if (!payload) {
    return Array(count).fill(null);
  }
  if (payload.length === count) {
    return payload.map((item) => item ? item.slice() : null);
  }
  const result = payload.map((item) => item ? item.slice() : null);
  while (result.length < count) {
    result.push(null);
  }
  return result;
};
var SearchResult = class {
  constructor(response) {
    this.ids = response.ids;
    const payloadCount = this.ids.length;
    this.documents = normalizePayloadArray(response.documents, payloadCount);
    this.embeddings = normalizePayloadArray(response.embeddings, payloadCount);
    const rawMetadatas = normalizePayloadArray(response.metadatas, payloadCount);
    this.metadatas = rawMetadatas.map((payload) => {
      if (!payload) {
        return null;
      }
      return deserializeMetadatas(payload) ?? [];
    });
    this.scores = normalizePayloadArray(response.scores, payloadCount);
    this.select = response.select ?? [];
  }
  rows() {
    const results = [];
    for (let payloadIndex = 0; payloadIndex < this.ids.length; payloadIndex += 1) {
      const ids = this.ids[payloadIndex];
      const docPayload = this.documents[payloadIndex] ?? [];
      const embedPayload = this.embeddings[payloadIndex] ?? [];
      const metaPayload = this.metadatas[payloadIndex] ?? [];
      const scorePayload = this.scores[payloadIndex] ?? [];
      const rows = ids.map((id, rowIndex) => {
        const row = { id };
        const document = docPayload[rowIndex];
        if (document !== void 0 && document !== null) {
          row.document = document;
        }
        const embedding = embedPayload[rowIndex];
        if (embedding !== void 0 && embedding !== null) {
          row.embedding = embedding;
        }
        const metadata = metaPayload[rowIndex];
        if (metadata !== void 0 && metadata !== null) {
          row.metadata = metadata;
        }
        const score = scorePayload[rowIndex];
        if (score !== void 0 && score !== null) {
          row.score = score;
        }
        return row;
      });
      results.push(rows);
    }
    return results;
  }
};

// src/schema.ts
var DOCUMENT_KEY = "#document";
var EMBEDDING_KEY = "#embedding";
var CmekProvider = /* @__PURE__ */ ((CmekProvider2) => {
  CmekProvider2["GCP"] = "gcp";
  return CmekProvider2;
})(CmekProvider || {});
var _Cmek = class _Cmek {
  constructor(provider, resource) {
    this.provider = provider;
    this.resource = resource;
  }
  /**
   * Create a CMEK instance for Google Cloud Platform.
   *
   * @param resource - GCP Cloud KMS resource name in the format:
   *   projects/{project-id}/locations/{location}/keyRings/{key-ring}/cryptoKeys/{key-name}
   *
   * @returns A new CMEK instance configured for GCP
   *
   * @example
   * ```typescript
   * const cmek = Cmek.gcp(
   *   "projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"
   * );
   * ```
   */
  static gcp(resource) {
    return new _Cmek("gcp" /* GCP */, resource);
  }
  /**
   * Validate the CMEK resource name format.
   *
   * Validates that the resource name matches the expected pattern for the
   * provider. This is a format check only and does not verify that the key
   * exists or that you have access to it.
   *
   * For GCP, the expected format is:
   *   projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{cryptoKey}
   *
   * @returns true if the resource name format is valid, false otherwise
   *
   * @example
   * ```typescript
   * const cmek = Cmek.gcp("projects/p/locations/l/keyRings/r/cryptoKeys/k");
   * cmek.validatePattern(); // Returns true
   *
   * const badCmek = Cmek.gcp("invalid-format");
   * badCmek.validatePattern(); // Returns false
   * ```
   */
  validatePattern() {
    if (this.provider === "gcp" /* GCP */) {
      return _Cmek.GCP_PATTERN.test(this.resource);
    }
    return false;
  }
  /**
   * Serialize CMEK to object format for API transport.
   *
   * Returns an object with the provider variant as the key and resource as the value.
   *
   * @returns Object containing the provider variant and resource identifier
   *
   * @example
   * ```typescript
   * const cmek = Cmek.gcp("projects/p/locations/l/keyRings/r/cryptoKeys/k");
   * cmek.toJSON();
   * // Returns: { gcp: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' }
   * ```
   */
  toJSON() {
    if (this.provider === "gcp" /* GCP */) {
      return { gcp: this.resource };
    }
    throw new Error(`Unknown CMEK provider: ${this.provider}`);
  }
  /**
   * Deserialize CMEK from object format.
   *
   * Expects the provider variant as the key and resource as the value.
   *
   * @param data - Object containing provider variant and resource
   * @returns Deserialized CMEK instance
   * @throws Error if the provider is unsupported or data is malformed
   *
   * @example
   * ```typescript
   * const data = { gcp: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' };
   * const cmek = Cmek.fromJSON(data);
   * ```
   */
  static fromJSON(data) {
    if ("gcp" in data && typeof data.gcp === "string") {
      return _Cmek.gcp(data.gcp);
    }
    throw new Error(
      `Unsupported or missing CMEK provider in data: ${JSON.stringify(data)}`
    );
  }
};
_Cmek.GCP_PATTERN = /^projects\/.+\/locations\/.+\/keyRings\/.+\/cryptoKeys\/.+$/;
var Cmek = _Cmek;
var STRING_VALUE_NAME = "string";
var FLOAT_LIST_VALUE_NAME = "float_list";
var SPARSE_VECTOR_VALUE_NAME = "sparse_vector";
var INT_VALUE_NAME = "int";
var FLOAT_VALUE_NAME = "float";
var BOOL_VALUE_NAME = "bool";
var FTS_INDEX_NAME = "fts_index";
var STRING_INVERTED_INDEX_NAME = "string_inverted_index";
var VECTOR_INDEX_NAME = "vector_index";
var SPARSE_VECTOR_INDEX_NAME = "sparse_vector_index";
var INT_INVERTED_INDEX_NAME = "int_inverted_index";
var FLOAT_INVERTED_INDEX_NAME = "float_inverted_index";
var BOOL_INVERTED_INDEX_NAME = "bool_inverted_index";
var FtsIndexConfig = class {
  constructor() {
    this.type = "FtsIndexConfig";
  }
};
var StringInvertedIndexConfig = class {
  constructor() {
    this.type = "StringInvertedIndexConfig";
  }
};
var IntInvertedIndexConfig = class {
  constructor() {
    this.type = "IntInvertedIndexConfig";
  }
};
var FloatInvertedIndexConfig = class {
  constructor() {
    this.type = "FloatInvertedIndexConfig";
  }
};
var BoolInvertedIndexConfig = class {
  constructor() {
    this.type = "BoolInvertedIndexConfig";
  }
};
var VectorIndexConfig = class {
  constructor(options = {}) {
    this.type = "VectorIndexConfig";
    this.space = options.space ?? null;
    this.embeddingFunction = options.embeddingFunction;
    this.sourceKey = options.sourceKey instanceof Key ? options.sourceKey.name : options.sourceKey ?? null;
    this.hnsw = options.hnsw ?? null;
    this.spann = options.spann ?? null;
  }
};
var SparseVectorIndexConfig = class {
  constructor(options = {}) {
    this.type = "SparseVectorIndexConfig";
    this.embeddingFunction = options.embeddingFunction;
    this.sourceKey = options.sourceKey instanceof Key ? options.sourceKey.name : options.sourceKey ?? null;
    this.bm25 = options.bm25 ?? null;
  }
};
var FtsIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var StringInvertedIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var VectorIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var SparseVectorIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var IntInvertedIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var FloatInvertedIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var BoolInvertedIndexType = class {
  constructor(enabled, config) {
    this.enabled = enabled;
    this.config = config;
  }
};
var StringValueType = class {
  constructor(ftsIndex = null, stringInvertedIndex = null) {
    this.ftsIndex = ftsIndex;
    this.stringInvertedIndex = stringInvertedIndex;
  }
};
var FloatListValueType = class {
  constructor(vectorIndex = null) {
    this.vectorIndex = vectorIndex;
  }
};
var SparseVectorValueType = class {
  constructor(sparseVectorIndex = null) {
    this.sparseVectorIndex = sparseVectorIndex;
  }
};
var IntValueType = class {
  constructor(intInvertedIndex = null) {
    this.intInvertedIndex = intInvertedIndex;
  }
};
var FloatValueType = class {
  constructor(floatInvertedIndex = null) {
    this.floatInvertedIndex = floatInvertedIndex;
  }
};
var BoolValueType = class {
  constructor(boolInvertedIndex = null) {
    this.boolInvertedIndex = boolInvertedIndex;
  }
};
var ValueTypes = class {
  constructor() {
    this.string = null;
    this.floatList = null;
    this.sparseVector = null;
    this.intValue = null;
    this.floatValue = null;
    this.boolean = null;
  }
};
var cloneObject = (value) => {
  if (value === null || value === void 0) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  return Array.isArray(value) ? value.map((item) => cloneObject(item)) : Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      cloneObject(v)
    ])
  );
};
var resolveEmbeddingFunctionName = (fn) => {
  if (!fn) return void 0;
  if (typeof fn.name === "function") {
    try {
      const value = fn.name();
      return typeof value === "string" ? value : void 0;
    } catch (_err) {
      return void 0;
    }
  }
  if (typeof fn.name === "string") {
    return fn.name;
  }
  return void 0;
};
var prepareEmbeddingFunctionConfig = (fn) => {
  if (!fn) {
    return { type: "legacy" };
  }
  const name = resolveEmbeddingFunctionName(fn);
  const getConfig = typeof fn.getConfig === "function" ? fn.getConfig.bind(fn) : void 0;
  const buildFromConfig = fn.constructor?.buildFromConfig;
  if (!name || !getConfig || typeof buildFromConfig !== "function") {
    return { type: "legacy" };
  }
  const config = getConfig();
  if (typeof fn.validateConfig === "function") {
    fn.validateConfig(config);
  }
  return {
    type: "known",
    name,
    config
  };
};
var ensureValueTypes = (valueTypes) => valueTypes ?? new ValueTypes();
var ensureStringValueType = (valueTypes) => {
  if (!valueTypes.string) {
    valueTypes.string = new StringValueType();
  }
  return valueTypes.string;
};
var ensureFloatListValueType = (valueTypes) => {
  if (!valueTypes.floatList) {
    valueTypes.floatList = new FloatListValueType();
  }
  return valueTypes.floatList;
};
var ensureSparseVectorValueType = (valueTypes) => {
  if (!valueTypes.sparseVector) {
    valueTypes.sparseVector = new SparseVectorValueType();
  }
  return valueTypes.sparseVector;
};
var ensureIntValueType = (valueTypes) => {
  if (!valueTypes.intValue) {
    valueTypes.intValue = new IntValueType();
  }
  return valueTypes.intValue;
};
var ensureFloatValueType = (valueTypes) => {
  if (!valueTypes.floatValue) {
    valueTypes.floatValue = new FloatValueType();
  }
  return valueTypes.floatValue;
};
var ensureBoolValueType = (valueTypes) => {
  if (!valueTypes.boolean) {
    valueTypes.boolean = new BoolValueType();
  }
  return valueTypes.boolean;
};
var Schema = class _Schema {
  constructor() {
    this.defaults = new ValueTypes();
    this.keys = {};
    this.cmek = null;
    this.initializeDefaults();
    this.initializeKeys();
  }
  /**
   * Set the customer-managed encryption key for this collection.
   *
   * CMEK allows you to use your own encryption keys managed by cloud providers'
   * key management services instead of default provider-managed keys.
   *
   * @param cmek - CMEK instance or null to remove encryption
   * @returns this for method chaining
   *
   * @example
   * ```typescript
   * const schema = new Schema();
   * schema.setCmek(Cmek.gcp(
   *   "projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"
   * ));
   * ```
   */
  setCmek(cmek) {
    this.cmek = cmek;
    return this;
  }
  createIndex(config, key) {
    const configProvided = config !== void 0 && config !== null;
    const keyProvided = key !== void 0 && key !== null;
    if (!configProvided && !keyProvided) {
      throw new Error(
        "Cannot enable all index types globally. Must specify either config or key."
      );
    }
    if (keyProvided && key && (key === EMBEDDING_KEY || key === DOCUMENT_KEY)) {
      throw new Error(
        `Cannot create index on special key '${key}'. These keys are managed automatically by the system.`
      );
    }
    if (config instanceof VectorIndexConfig) {
      if (!keyProvided) {
        this.setVectorIndexConfig(config);
        return this;
      }
      throw new Error(
        "Vector index cannot be enabled on specific keys. Use createIndex(config=VectorIndexConfig(...)) without specifying a key to configure the vector index globally."
      );
    }
    if (config instanceof FtsIndexConfig) {
      if (!keyProvided) {
        this.setFtsIndexConfig(config);
        return this;
      }
      throw new Error(
        "FTS index cannot be enabled on specific keys. Use createIndex(config=FtsIndexConfig(...)) without specifying a key to configure the FTS index globally."
      );
    }
    if (config instanceof SparseVectorIndexConfig && !keyProvided) {
      throw new Error(
        "Sparse vector index must be created on a specific key. Please specify a key using: createIndex(config=SparseVectorIndexConfig(...), key='your_key')"
      );
    }
    if (!configProvided && keyProvided && key) {
      throw new Error(
        `Cannot enable all index types for key '${key}'. Please specify a specific index configuration.`
      );
    }
    if (configProvided && !keyProvided) {
      this.setIndexInDefaults(config, true);
    } else if (configProvided && keyProvided && key) {
      this.setIndexForKey(key, config, true);
    }
    return this;
  }
  deleteIndex(config, key) {
    const configProvided = config !== void 0 && config !== null;
    const keyProvided = key !== void 0 && key !== null;
    if (!configProvided && !keyProvided) {
      throw new Error(
        "Cannot disable all indexes. Must specify either config or key."
      );
    }
    if (keyProvided && key && (key === EMBEDDING_KEY || key === DOCUMENT_KEY)) {
      throw new Error(
        `Cannot delete index on special key '${key}'. These keys are managed automatically by the system.`
      );
    }
    if (config instanceof VectorIndexConfig) {
      throw new Error("Deleting vector index is not currently supported.");
    }
    if (config instanceof FtsIndexConfig) {
      throw new Error("Deleting FTS index is not currently supported.");
    }
    if (config instanceof SparseVectorIndexConfig) {
      throw new Error(
        "Deleting sparse vector index is not currently supported."
      );
    }
    if (keyProvided && !configProvided && key) {
      throw new Error(
        `Cannot disable all index types for key '${key}'. Please specify a specific index configuration.`
      );
    }
    if (keyProvided && configProvided && key) {
      this.setIndexForKey(key, config, false);
    } else if (!keyProvided && configProvided) {
      this.setIndexInDefaults(config, false);
    }
    return this;
  }
  serializeToJSON() {
    const defaults = this.serializeValueTypes(this.defaults);
    const keys = {};
    for (const [keyName, valueTypes] of Object.entries(this.keys)) {
      keys[keyName] = this.serializeValueTypes(valueTypes);
    }
    const result = {
      defaults,
      keys
    };
    if (this.cmek !== null) {
      result.cmek = this.cmek.toJSON();
    }
    return result;
  }
  static async deserializeFromJSON(json, client2) {
    if (json == null) {
      return void 0;
    }
    const data = json;
    const instance = Object.create(_Schema.prototype);
    instance.defaults = await _Schema.deserializeValueTypes(
      data.defaults ?? {},
      client2
    );
    instance.keys = {};
    const keys = data.keys ?? {};
    for (const [keyName, value] of Object.entries(keys)) {
      instance.keys[keyName] = await _Schema.deserializeValueTypes(
        value,
        client2
      );
    }
    instance.cmek = null;
    if (data.cmek && typeof data.cmek === "object") {
      instance.cmek = Cmek.fromJSON(data.cmek);
    }
    return instance;
  }
  setVectorIndexConfig(config) {
    const defaultsFloatList = ensureFloatListValueType(this.defaults);
    const currentDefaultsVector = defaultsFloatList.vectorIndex ?? new VectorIndexType(false, new VectorIndexConfig());
    defaultsFloatList.vectorIndex = new VectorIndexType(
      currentDefaultsVector.enabled,
      new VectorIndexConfig({
        space: config.space ?? null,
        embeddingFunction: config.embeddingFunction,
        sourceKey: config.sourceKey ?? null,
        hnsw: config.hnsw ? cloneObject(config.hnsw) : null,
        spann: config.spann ? cloneObject(config.spann) : null
      })
    );
    const embeddingValueTypes = ensureValueTypes(this.keys[EMBEDDING_KEY]);
    this.keys[EMBEDDING_KEY] = embeddingValueTypes;
    const overrideFloatList = ensureFloatListValueType(embeddingValueTypes);
    const currentOverrideVector = overrideFloatList.vectorIndex ?? new VectorIndexType(
      true,
      new VectorIndexConfig({ sourceKey: DOCUMENT_KEY })
    );
    const preservedSourceKey = currentOverrideVector.config.sourceKey ?? DOCUMENT_KEY;
    overrideFloatList.vectorIndex = new VectorIndexType(
      currentOverrideVector.enabled,
      new VectorIndexConfig({
        space: config.space ?? null,
        embeddingFunction: config.embeddingFunction,
        sourceKey: preservedSourceKey,
        hnsw: config.hnsw ? cloneObject(config.hnsw) : null,
        spann: config.spann ? cloneObject(config.spann) : null
      })
    );
  }
  setFtsIndexConfig(config) {
    const defaultsString = ensureStringValueType(this.defaults);
    const currentDefaultsFts = defaultsString.ftsIndex ?? new FtsIndexType(false, new FtsIndexConfig());
    defaultsString.ftsIndex = new FtsIndexType(
      currentDefaultsFts.enabled,
      config
    );
    const documentValueTypes = ensureValueTypes(this.keys[DOCUMENT_KEY]);
    this.keys[DOCUMENT_KEY] = documentValueTypes;
    const overrideString = ensureStringValueType(documentValueTypes);
    const currentOverrideFts = overrideString.ftsIndex ?? new FtsIndexType(true, new FtsIndexConfig());
    overrideString.ftsIndex = new FtsIndexType(
      currentOverrideFts.enabled,
      config
    );
  }
  setIndexInDefaults(config, enabled) {
    if (config instanceof FtsIndexConfig) {
      const valueType = ensureStringValueType(this.defaults);
      valueType.ftsIndex = new FtsIndexType(enabled, config);
    } else if (config instanceof StringInvertedIndexConfig) {
      const valueType = ensureStringValueType(this.defaults);
      valueType.stringInvertedIndex = new StringInvertedIndexType(
        enabled,
        config
      );
    } else if (config instanceof VectorIndexConfig) {
      const valueType = ensureFloatListValueType(this.defaults);
      valueType.vectorIndex = new VectorIndexType(enabled, config);
    } else if (config instanceof SparseVectorIndexConfig) {
      const valueType = ensureSparseVectorValueType(this.defaults);
      valueType.sparseVectorIndex = new SparseVectorIndexType(enabled, config);
    } else if (config instanceof IntInvertedIndexConfig) {
      const valueType = ensureIntValueType(this.defaults);
      valueType.intInvertedIndex = new IntInvertedIndexType(enabled, config);
    } else if (config instanceof FloatInvertedIndexConfig) {
      const valueType = ensureFloatValueType(this.defaults);
      valueType.floatInvertedIndex = new FloatInvertedIndexType(
        enabled,
        config
      );
    } else if (config instanceof BoolInvertedIndexConfig) {
      const valueType = ensureBoolValueType(this.defaults);
      valueType.boolInvertedIndex = new BoolInvertedIndexType(enabled, config);
    }
  }
  setIndexForKey(key, config, enabled) {
    if (config instanceof SparseVectorIndexConfig && enabled) {
      this.validateSingleSparseVectorIndex(key);
      this.validateSparseVectorConfig(config);
    }
    const current = this.keys[key] = ensureValueTypes(this.keys[key]);
    if (config instanceof StringInvertedIndexConfig) {
      const valueType = ensureStringValueType(current);
      valueType.stringInvertedIndex = new StringInvertedIndexType(
        enabled,
        config
      );
    } else if (config instanceof FtsIndexConfig) {
      const valueType = ensureStringValueType(current);
      valueType.ftsIndex = new FtsIndexType(enabled, config);
    } else if (config instanceof SparseVectorIndexConfig) {
      const valueType = ensureSparseVectorValueType(current);
      valueType.sparseVectorIndex = new SparseVectorIndexType(enabled, config);
    } else if (config instanceof VectorIndexConfig) {
      const valueType = ensureFloatListValueType(current);
      valueType.vectorIndex = new VectorIndexType(enabled, config);
    } else if (config instanceof IntInvertedIndexConfig) {
      const valueType = ensureIntValueType(current);
      valueType.intInvertedIndex = new IntInvertedIndexType(enabled, config);
    } else if (config instanceof FloatInvertedIndexConfig) {
      const valueType = ensureFloatValueType(current);
      valueType.floatInvertedIndex = new FloatInvertedIndexType(
        enabled,
        config
      );
    } else if (config instanceof BoolInvertedIndexConfig) {
      const valueType = ensureBoolValueType(current);
      valueType.boolInvertedIndex = new BoolInvertedIndexType(enabled, config);
    }
  }
  enableAllIndexesForKey(key) {
    if (key === EMBEDDING_KEY || key === DOCUMENT_KEY) {
      throw new Error(
        `Cannot enable all indexes for special key '${key}'. These keys are managed automatically by the system.`
      );
    }
    const current = this.keys[key] = ensureValueTypes(this.keys[key]);
    current.string = new StringValueType(
      new FtsIndexType(true, new FtsIndexConfig()),
      new StringInvertedIndexType(true, new StringInvertedIndexConfig())
    );
    current.floatList = new FloatListValueType(
      new VectorIndexType(true, new VectorIndexConfig())
    );
    current.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig())
    );
    current.intValue = new IntValueType(
      new IntInvertedIndexType(true, new IntInvertedIndexConfig())
    );
    current.floatValue = new FloatValueType(
      new FloatInvertedIndexType(true, new FloatInvertedIndexConfig())
    );
    current.boolean = new BoolValueType(
      new BoolInvertedIndexType(true, new BoolInvertedIndexConfig())
    );
  }
  disableAllIndexesForKey(key) {
    if (key === EMBEDDING_KEY || key === DOCUMENT_KEY) {
      throw new Error(
        `Cannot disable all indexes for special key '${key}'. These keys are managed automatically by the system.`
      );
    }
    const current = this.keys[key] = ensureValueTypes(this.keys[key]);
    current.string = new StringValueType(
      new FtsIndexType(false, new FtsIndexConfig()),
      new StringInvertedIndexType(false, new StringInvertedIndexConfig())
    );
    current.floatList = new FloatListValueType(
      new VectorIndexType(false, new VectorIndexConfig())
    );
    current.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig())
    );
    current.intValue = new IntValueType(
      new IntInvertedIndexType(false, new IntInvertedIndexConfig())
    );
    current.floatValue = new FloatValueType(
      new FloatInvertedIndexType(false, new FloatInvertedIndexConfig())
    );
    current.boolean = new BoolValueType(
      new BoolInvertedIndexType(false, new BoolInvertedIndexConfig())
    );
  }
  validateSingleSparseVectorIndex(targetKey) {
    for (const [existingKey, valueTypes] of Object.entries(this.keys)) {
      if (existingKey === targetKey) continue;
      const sparseIndex = valueTypes.sparseVector?.sparseVectorIndex;
      if (sparseIndex?.enabled) {
        throw new Error(
          `Cannot enable sparse vector index on key '${targetKey}'. A sparse vector index is already enabled on key '${existingKey}'. Only one sparse vector index is allowed per collection.`
        );
      }
    }
  }
  validateSparseVectorConfig(config) {
    if (config.sourceKey !== null && config.sourceKey !== void 0 && !config.embeddingFunction) {
      throw new Error(
        `If sourceKey is provided then embeddingFunction must also be provided since there is no default embedding function. Config: ${JSON.stringify(config)}`
      );
    }
  }
  initializeDefaults() {
    this.defaults.string = new StringValueType(
      new FtsIndexType(false, new FtsIndexConfig()),
      new StringInvertedIndexType(true, new StringInvertedIndexConfig())
    );
    this.defaults.floatList = new FloatListValueType(
      new VectorIndexType(false, new VectorIndexConfig())
    );
    this.defaults.sparseVector = new SparseVectorValueType(
      new SparseVectorIndexType(false, new SparseVectorIndexConfig())
    );
    this.defaults.intValue = new IntValueType(
      new IntInvertedIndexType(true, new IntInvertedIndexConfig())
    );
    this.defaults.floatValue = new FloatValueType(
      new FloatInvertedIndexType(true, new FloatInvertedIndexConfig())
    );
    this.defaults.boolean = new BoolValueType(
      new BoolInvertedIndexType(true, new BoolInvertedIndexConfig())
    );
  }
  initializeKeys() {
    this.keys[DOCUMENT_KEY] = new ValueTypes();
    this.keys[DOCUMENT_KEY].string = new StringValueType(
      new FtsIndexType(true, new FtsIndexConfig()),
      new StringInvertedIndexType(false, new StringInvertedIndexConfig())
    );
    this.keys[EMBEDDING_KEY] = new ValueTypes();
    this.keys[EMBEDDING_KEY].floatList = new FloatListValueType(
      new VectorIndexType(
        true,
        new VectorIndexConfig({ sourceKey: DOCUMENT_KEY })
      )
    );
  }
  serializeValueTypes(valueTypes) {
    const result = {};
    if (valueTypes.string) {
      const serialized = this.serializeStringValueType(valueTypes.string);
      if (Object.keys(serialized).length > 0) {
        result[STRING_VALUE_NAME] = serialized;
      }
    }
    if (valueTypes.floatList) {
      const serialized = this.serializeFloatListValueType(valueTypes.floatList);
      if (Object.keys(serialized).length > 0) {
        result[FLOAT_LIST_VALUE_NAME] = serialized;
      }
    }
    if (valueTypes.sparseVector) {
      const serialized = this.serializeSparseVectorValueType(
        valueTypes.sparseVector
      );
      if (Object.keys(serialized).length > 0) {
        result[SPARSE_VECTOR_VALUE_NAME] = serialized;
      }
    }
    if (valueTypes.intValue) {
      const serialized = this.serializeIntValueType(valueTypes.intValue);
      if (Object.keys(serialized).length > 0) {
        result[INT_VALUE_NAME] = serialized;
      }
    }
    if (valueTypes.floatValue) {
      const serialized = this.serializeFloatValueType(valueTypes.floatValue);
      if (Object.keys(serialized).length > 0) {
        result[FLOAT_VALUE_NAME] = serialized;
      }
    }
    if (valueTypes.boolean) {
      const serialized = this.serializeBoolValueType(valueTypes.boolean);
      if (Object.keys(serialized).length > 0) {
        result[BOOL_VALUE_NAME] = serialized;
      }
    }
    return result;
  }
  serializeStringValueType(valueType) {
    const result = {};
    if (valueType.ftsIndex) {
      result[FTS_INDEX_NAME] = {
        enabled: valueType.ftsIndex.enabled,
        config: this.serializeConfig(valueType.ftsIndex.config)
      };
    }
    if (valueType.stringInvertedIndex) {
      result[STRING_INVERTED_INDEX_NAME] = {
        enabled: valueType.stringInvertedIndex.enabled,
        config: this.serializeConfig(valueType.stringInvertedIndex.config)
      };
    }
    return result;
  }
  serializeFloatListValueType(valueType) {
    const result = {};
    if (valueType.vectorIndex) {
      result[VECTOR_INDEX_NAME] = {
        enabled: valueType.vectorIndex.enabled,
        config: this.serializeConfig(valueType.vectorIndex.config)
      };
    }
    return result;
  }
  serializeSparseVectorValueType(valueType) {
    const result = {};
    if (valueType.sparseVectorIndex) {
      result[SPARSE_VECTOR_INDEX_NAME] = {
        enabled: valueType.sparseVectorIndex.enabled,
        config: this.serializeConfig(valueType.sparseVectorIndex.config)
      };
    }
    return result;
  }
  serializeIntValueType(valueType) {
    const result = {};
    if (valueType.intInvertedIndex) {
      result[INT_INVERTED_INDEX_NAME] = {
        enabled: valueType.intInvertedIndex.enabled,
        config: this.serializeConfig(valueType.intInvertedIndex.config)
      };
    }
    return result;
  }
  serializeFloatValueType(valueType) {
    const result = {};
    if (valueType.floatInvertedIndex) {
      result[FLOAT_INVERTED_INDEX_NAME] = {
        enabled: valueType.floatInvertedIndex.enabled,
        config: this.serializeConfig(valueType.floatInvertedIndex.config)
      };
    }
    return result;
  }
  serializeBoolValueType(valueType) {
    const result = {};
    if (valueType.boolInvertedIndex) {
      result[BOOL_INVERTED_INDEX_NAME] = {
        enabled: valueType.boolInvertedIndex.enabled,
        config: this.serializeConfig(valueType.boolInvertedIndex.config)
      };
    }
    return result;
  }
  serializeConfig(config) {
    if (config instanceof VectorIndexConfig) {
      return this.serializeVectorConfig(config);
    }
    if (config instanceof SparseVectorIndexConfig) {
      return this.serializeSparseVectorConfig(config);
    }
    return {};
  }
  serializeVectorConfig(config) {
    const serialized = {};
    const embeddingFunction = config.embeddingFunction;
    const efConfig = prepareEmbeddingFunctionConfig(embeddingFunction);
    serialized["embedding_function"] = efConfig;
    let resolvedSpace = config.space ?? null;
    if (!resolvedSpace && embeddingFunction?.defaultSpace) {
      resolvedSpace = embeddingFunction.defaultSpace();
    }
    if (resolvedSpace && embeddingFunction?.supportedSpaces && !embeddingFunction.supportedSpaces().includes(resolvedSpace)) {
      console.warn(
        `Space '${resolvedSpace}' is not supported by embedding function '${resolveEmbeddingFunctionName(embeddingFunction) ?? "unknown"}'. Supported spaces: ${embeddingFunction.supportedSpaces().join(", ")}`
      );
    }
    if (resolvedSpace) {
      serialized.space = resolvedSpace;
    }
    if (config.sourceKey) {
      serialized.source_key = config.sourceKey;
    }
    if (config.hnsw) {
      serialized.hnsw = cloneObject(config.hnsw);
    }
    if (config.spann) {
      serialized.spann = cloneObject(config.spann);
    }
    return serialized;
  }
  serializeSparseVectorConfig(config) {
    const serialized = {};
    const embeddingFunction = config.embeddingFunction;
    serialized["embedding_function"] = prepareEmbeddingFunctionConfig(embeddingFunction);
    if (config.sourceKey) {
      serialized.source_key = config.sourceKey;
    }
    if (typeof config.bm25 === "boolean") {
      serialized.bm25 = config.bm25;
    }
    return serialized;
  }
  static async deserializeValueTypes(json, client2) {
    const result = new ValueTypes();
    if (json[STRING_VALUE_NAME]) {
      result.string = _Schema.deserializeStringValueType(
        json[STRING_VALUE_NAME]
      );
    }
    if (json[FLOAT_LIST_VALUE_NAME]) {
      result.floatList = await _Schema.deserializeFloatListValueType(
        json[FLOAT_LIST_VALUE_NAME],
        client2
      );
    }
    if (json[SPARSE_VECTOR_VALUE_NAME]) {
      result.sparseVector = await _Schema.deserializeSparseVectorValueType(
        json[SPARSE_VECTOR_VALUE_NAME],
        client2
      );
    }
    if (json[INT_VALUE_NAME]) {
      result.intValue = _Schema.deserializeIntValueType(json[INT_VALUE_NAME]);
    }
    if (json[FLOAT_VALUE_NAME]) {
      result.floatValue = _Schema.deserializeFloatValueType(
        json[FLOAT_VALUE_NAME]
      );
    }
    if (json[BOOL_VALUE_NAME]) {
      result.boolean = _Schema.deserializeBoolValueType(json[BOOL_VALUE_NAME]);
    }
    return result;
  }
  static deserializeStringValueType(json) {
    let ftsIndex = null;
    let stringIndex = null;
    if (json[FTS_INDEX_NAME]) {
      const data = json[FTS_INDEX_NAME];
      ftsIndex = new FtsIndexType(Boolean(data.enabled), new FtsIndexConfig());
    }
    if (json[STRING_INVERTED_INDEX_NAME]) {
      const data = json[STRING_INVERTED_INDEX_NAME];
      stringIndex = new StringInvertedIndexType(
        Boolean(data.enabled),
        new StringInvertedIndexConfig()
      );
    }
    return new StringValueType(ftsIndex, stringIndex);
  }
  static async deserializeFloatListValueType(json, client2) {
    let vectorIndex = null;
    if (json[VECTOR_INDEX_NAME]) {
      const data = json[VECTOR_INDEX_NAME];
      const enabled = Boolean(data.enabled);
      const config = await _Schema.deserializeVectorConfig(
        data.config ?? {},
        client2
      );
      vectorIndex = new VectorIndexType(enabled, config);
    }
    return new FloatListValueType(vectorIndex);
  }
  static async deserializeSparseVectorValueType(json, client2) {
    let sparseIndex = null;
    if (json[SPARSE_VECTOR_INDEX_NAME]) {
      const data = json[SPARSE_VECTOR_INDEX_NAME];
      const enabled = Boolean(data.enabled);
      const config = await _Schema.deserializeSparseVectorConfig(
        data.config ?? {},
        client2
      );
      sparseIndex = new SparseVectorIndexType(enabled, config);
    }
    return new SparseVectorValueType(sparseIndex);
  }
  static deserializeIntValueType(json) {
    let index = null;
    if (json[INT_INVERTED_INDEX_NAME]) {
      const data = json[INT_INVERTED_INDEX_NAME];
      index = new IntInvertedIndexType(
        Boolean(data.enabled),
        new IntInvertedIndexConfig()
      );
    }
    return new IntValueType(index);
  }
  static deserializeFloatValueType(json) {
    let index = null;
    if (json[FLOAT_INVERTED_INDEX_NAME]) {
      const data = json[FLOAT_INVERTED_INDEX_NAME];
      index = new FloatInvertedIndexType(
        Boolean(data.enabled),
        new FloatInvertedIndexConfig()
      );
    }
    return new FloatValueType(index);
  }
  static deserializeBoolValueType(json) {
    let index = null;
    if (json[BOOL_INVERTED_INDEX_NAME]) {
      const data = json[BOOL_INVERTED_INDEX_NAME];
      index = new BoolInvertedIndexType(
        Boolean(data.enabled),
        new BoolInvertedIndexConfig()
      );
    }
    return new BoolValueType(index);
  }
  static async deserializeVectorConfig(json, client2) {
    const config = new VectorIndexConfig({
      space: json.space ?? null,
      sourceKey: json.source_key ?? null,
      hnsw: json.hnsw ? cloneObject(json.hnsw) : null,
      spann: json.spann ? cloneObject(json.spann) : null
    });
    config.embeddingFunction = await getEmbeddingFunction({
      collectionName: "schema deserialization",
      client: client2,
      efConfig: json.embedding_function
    });
    if (!config.space && config.embeddingFunction?.defaultSpace) {
      config.space = config.embeddingFunction.defaultSpace();
    }
    return config;
  }
  static async deserializeSparseVectorConfig(json, client2) {
    const config = new SparseVectorIndexConfig({
      sourceKey: json.source_key ?? null,
      bm25: typeof json.bm25 === "boolean" ? json.bm25 : null
    });
    const embeddingFunction = await getSparseEmbeddingFunction(
      "schema deserialization",
      client2,
      json.embedding_function
    ) ?? config.embeddingFunction ?? void 0;
    config.embeddingFunction = embeddingFunction ?? null;
    return config;
  }
  resolveEmbeddingFunction() {
    const embeddingOverride = this.keys[EMBEDDING_KEY]?.floatList?.vectorIndex?.config.embeddingFunction;
    if (embeddingOverride !== void 0) {
      return embeddingOverride;
    }
    return this.defaults.floatList?.vectorIndex?.config.embeddingFunction;
  }
};

// src/collection.ts
var CollectionImpl = class _CollectionImpl {
  /**
   * Creates a new CollectionAPIImpl instance.
   * @param options - Configuration for the collection API
   */
  constructor({
    chromaClient,
    apiClient,
    id,
    tenant,
    database,
    name,
    metadata,
    configuration,
    embeddingFunction,
    schema
  }) {
    this.chromaClient = chromaClient;
    this.apiClient = apiClient;
    this.id = id;
    this.tenant = tenant;
    this.database = database;
    this._name = name;
    this._metadata = metadata;
    this._configuration = configuration;
    this._embeddingFunction = embeddingFunction;
    this._schema = schema;
  }
  get name() {
    return this._name;
  }
  set name(name) {
    this._name = name;
  }
  get configuration() {
    return this._configuration;
  }
  set configuration(configuration) {
    this._configuration = configuration;
  }
  get metadata() {
    return this._metadata;
  }
  set metadata(metadata) {
    this._metadata = metadata;
  }
  get embeddingFunction() {
    return this._embeddingFunction;
  }
  set embeddingFunction(embeddingFunction) {
    this._embeddingFunction = embeddingFunction;
  }
  get schema() {
    return this._schema;
  }
  set schema(schema) {
    this._schema = schema;
  }
  async path() {
    return {
      tenant: this.tenant,
      database: this.database,
      collection_id: this.id
    };
  }
  async embed(inputs, isQuery) {
    const embeddingFunction = this._embeddingFunction ?? this.getSchemaEmbeddingFunction();
    if (!embeddingFunction) {
      throw new ChromaValueError(
        "Embedding function must be defined for operations requiring embeddings."
      );
    }
    if (isQuery && embeddingFunction.generateForQueries) {
      return await embeddingFunction.generateForQueries(inputs);
    }
    return await embeddingFunction.generate(inputs);
  }
  async sparseEmbed(sparseEmbeddingFunction, inputs, isQuery) {
    if (isQuery && sparseEmbeddingFunction.generateForQueries) {
      return await sparseEmbeddingFunction.generateForQueries(inputs);
    }
    return await sparseEmbeddingFunction.generate(inputs);
  }
  getSparseEmbeddingTargets() {
    const schema = this._schema;
    if (!schema) return {};
    const targets = {};
    for (const [key, valueTypes] of Object.entries(schema.keys)) {
      const sparseVector = valueTypes.sparseVector;
      const sparseIndex = sparseVector?.sparseVectorIndex;
      if (!sparseIndex?.enabled) continue;
      const config = sparseIndex.config;
      if (!config.embeddingFunction || !config.sourceKey) continue;
      targets[key] = config;
    }
    return targets;
  }
  async applySparseEmbeddingsToMetadatas(metadatas, documents) {
    const sparseTargets = this.getSparseEmbeddingTargets();
    if (Object.keys(sparseTargets).length === 0) {
      return metadatas;
    }
    if (!metadatas) {
      if (!documents) {
        return void 0;
      }
      metadatas = Array(documents.length).fill(null).map(() => ({}));
    }
    const updatedMetadatas = metadatas.map(
      (metadata) => metadata !== null && metadata !== void 0 ? { ...metadata } : {}
    );
    const documentsList = documents ? [...documents] : void 0;
    for (const [targetKey, config] of Object.entries(sparseTargets)) {
      const sourceKey = config.sourceKey;
      const embeddingFunction = config.embeddingFunction;
      if (!sourceKey || !embeddingFunction) {
        continue;
      }
      const inputs = [];
      const positions = [];
      if (sourceKey === DOCUMENT_KEY) {
        if (!documentsList) {
          continue;
        }
        updatedMetadatas.forEach((metadata, index) => {
          if (targetKey in metadata) {
            return;
          }
          if (index < documentsList.length) {
            const doc = documentsList[index];
            if (typeof doc === "string") {
              inputs.push(doc);
              positions.push(index);
            }
          }
        });
        if (inputs.length === 0) {
          continue;
        }
        const sparseEmbeddings2 = await this.sparseEmbed(
          embeddingFunction,
          inputs,
          false
        );
        if (sparseEmbeddings2.length !== positions.length) {
          throw new ChromaValueError(
            "Sparse embedding function returned unexpected number of embeddings."
          );
        }
        positions.forEach((position, idx) => {
          updatedMetadatas[position][targetKey] = sparseEmbeddings2[idx];
        });
        continue;
      }
      updatedMetadatas.forEach((metadata, index) => {
        if (targetKey in metadata) {
          return;
        }
        const sourceValue = metadata[sourceKey];
        if (typeof sourceValue !== "string") {
          return;
        }
        inputs.push(sourceValue);
        positions.push(index);
      });
      if (inputs.length === 0) {
        continue;
      }
      const sparseEmbeddings = await this.sparseEmbed(
        embeddingFunction,
        inputs,
        false
      );
      if (sparseEmbeddings.length !== positions.length) {
        throw new ChromaValueError(
          "Sparse embedding function returned unexpected number of embeddings."
        );
      }
      positions.forEach((position, idx) => {
        updatedMetadatas[position][targetKey] = sparseEmbeddings[idx];
      });
    }
    const resultMetadatas = updatedMetadatas.map(
      (metadata) => Object.keys(metadata).length === 0 ? null : metadata
    );
    return resultMetadatas;
  }
  async embedKnnLiteral(knn) {
    const queryValue = knn.query;
    if (typeof queryValue !== "string") {
      return { ...knn };
    }
    const keyValue = knn.key;
    const key = typeof keyValue === "string" ? keyValue : EMBEDDING_KEY;
    if (key === EMBEDDING_KEY) {
      const embeddings = await this.embed([queryValue], true);
      if (!embeddings || embeddings.length !== 1) {
        throw new ChromaValueError(
          "Embedding function returned unexpected number of embeddings."
        );
      }
      return { ...knn, query: embeddings[0] };
    }
    const schema = this._schema;
    if (!schema) {
      throw new ChromaValueError(
        `Cannot embed string query for key '${key}': schema is not available. Provide an embedded vector or configure an embedding function.`
      );
    }
    const valueTypes = schema.keys[key];
    if (!valueTypes) {
      throw new ChromaValueError(
        `Cannot embed string query for key '${key}': key not found in schema. Provide an embedded vector or configure an embedding function.`
      );
    }
    const sparseIndex = valueTypes.sparseVector?.sparseVectorIndex;
    if (sparseIndex?.enabled && sparseIndex.config.embeddingFunction) {
      const sparseEmbeddingFunction = sparseIndex.config.embeddingFunction;
      const sparseEmbeddings = await this.sparseEmbed(
        sparseEmbeddingFunction,
        [queryValue],
        true
      );
      if (!sparseEmbeddings || sparseEmbeddings.length !== 1) {
        throw new ChromaValueError(
          "Sparse embedding function returned unexpected number of embeddings."
        );
      }
      return { ...knn, query: sparseEmbeddings[0] };
    }
    const vectorIndex = valueTypes.floatList?.vectorIndex;
    if (vectorIndex?.enabled && vectorIndex.config.embeddingFunction) {
      const embeddingFunction = vectorIndex.config.embeddingFunction;
      const embeddings = embeddingFunction.generateForQueries ? await embeddingFunction.generateForQueries([queryValue]) : await embeddingFunction.generate([queryValue]);
      if (!embeddings || embeddings.length !== 1) {
        throw new ChromaValueError(
          "Embedding function returned unexpected number of embeddings."
        );
      }
      return { ...knn, query: embeddings[0] };
    }
    throw new ChromaValueError(
      `Cannot embed string query for key '${key}': no embedding function configured. Provide an embedded vector or configure an embedding function.`
    );
  }
  async embedRankLiteral(rank) {
    if (rank === null || rank === void 0) {
      return rank;
    }
    if (Array.isArray(rank)) {
      return Promise.all(rank.map((item) => this.embedRankLiteral(item)));
    }
    if (!isPlainObject(rank)) {
      return rank;
    }
    const entries = await Promise.all(
      Object.entries(rank).map(async ([key, value]) => {
        if (key === "$knn" && isPlainObject(value)) {
          return [key, await this.embedKnnLiteral(value)];
        }
        return [key, await this.embedRankLiteral(value)];
      })
    );
    return Object.fromEntries(entries);
  }
  async embedSearchPayload(payload) {
    if (!payload.rank) {
      return payload;
    }
    const embeddedRank = await this.embedRankLiteral(payload.rank);
    if (!isPlainObject(embeddedRank)) {
      return payload;
    }
    return {
      ...payload,
      rank: embeddedRank
    };
  }
  getSchemaEmbeddingFunction() {
    const schema = this._schema;
    if (!schema) return void 0;
    const schemaOverride = schema.keys[EMBEDDING_KEY];
    const overrideFunction = schemaOverride?.floatList?.vectorIndex?.config.embeddingFunction;
    if (overrideFunction) {
      return overrideFunction;
    }
    const defaultFunction = schema.defaults.floatList?.vectorIndex?.config.embeddingFunction;
    return defaultFunction ?? void 0;
  }
  async prepareRecords({
    recordSet,
    update = false
  }) {
    const maxBatchSize = await this.chromaClient.getMaxBatchSize();
    validateRecordSetLengthConsistency(recordSet);
    validateIDs(recordSet.ids);
    validateBaseRecordSet({ recordSet, update });
    validateMaxBatchSize(recordSet.ids.length, maxBatchSize);
    if (!recordSet.embeddings && recordSet.documents) {
      recordSet.embeddings = await this.embed(recordSet.documents, false);
    }
    const metadatasWithSparse = await this.applySparseEmbeddingsToMetadatas(
      recordSet.metadatas,
      recordSet.documents
    );
    const preparedRecordSet = {
      ...recordSet,
      metadatas: metadatasWithSparse
    };
    const base64Supported = await this.chromaClient.supportsBase64Encoding();
    if (base64Supported && recordSet.embeddings) {
      preparedRecordSet.embeddings = embeddingsToBase64Bytes(
        recordSet.embeddings
      );
    }
    return preparedRecordSet;
  }
  validateGet(include, ids, where, whereDocument) {
    validateInclude({ include, exclude: ["distances"] });
    if (ids) validateIDs(ids);
    if (where) validateWhere(where);
    if (whereDocument) validateWhereDocument(whereDocument);
  }
  async prepareQuery(recordSet, include, ids, where, whereDocument, nResults) {
    validateBaseRecordSet({
      recordSet,
      embeddingsField: "queryEmbeddings",
      documentsField: "queryTexts"
    });
    validateInclude({ include });
    if (ids) validateIDs(ids);
    if (where) validateWhere(where);
    if (whereDocument) validateWhereDocument(whereDocument);
    if (nResults) validateNResults(nResults);
    let embeddings;
    if (!recordSet.embeddings) {
      embeddings = await this.embed(recordSet.documents, true);
    } else {
      embeddings = recordSet.embeddings;
    }
    return {
      ...recordSet,
      ids,
      embeddings
    };
  }
  validateDelete(ids, where, whereDocument) {
    if (ids) validateIDs(ids);
    if (where) validateWhere(where);
    if (whereDocument) validateWhereDocument(whereDocument);
  }
  async count() {
    const { data } = await DefaultService.collectionCount({
      client: this.apiClient,
      path: await this.path()
    });
    return data;
  }
  async add({
    ids,
    embeddings,
    metadatas,
    documents,
    uris
  }) {
    const recordSet = {
      ids,
      embeddings,
      documents,
      metadatas,
      uris
    };
    const preparedRecordSet = await this.prepareRecords({ recordSet });
    await DefaultService.collectionAdd({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids: preparedRecordSet.ids,
        embeddings: preparedRecordSet.embeddings,
        documents: preparedRecordSet.documents,
        metadatas: serializeMetadatas(preparedRecordSet.metadatas),
        uris: preparedRecordSet.uris
      }
    });
  }
  async get(args = {}) {
    const {
      ids,
      where,
      limit,
      offset,
      whereDocument,
      include = ["documents", "metadatas"]
    } = args;
    this.validateGet(include, ids, where, whereDocument);
    const { data } = await DefaultService.collectionGet({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids,
        where,
        limit,
        offset,
        where_document: whereDocument,
        include
      }
    });
    const deserializedMetadatas = deserializeMetadatas(data.metadatas) ?? [];
    return new GetResult({
      documents: data.documents ?? [],
      embeddings: data.embeddings ?? [],
      ids: data.ids,
      include: data.include,
      metadatas: deserializedMetadatas,
      uris: data.uris ?? []
    });
  }
  async peek({ limit = 10 }) {
    return this.get({ limit });
  }
  async query({
    queryEmbeddings,
    queryTexts,
    queryURIs,
    ids,
    nResults = 10,
    where,
    whereDocument,
    include = ["metadatas", "documents", "distances"]
  }) {
    const recordSet = {
      embeddings: queryEmbeddings,
      documents: queryTexts,
      uris: queryURIs
    };
    const queryRecordSet = await this.prepareQuery(
      recordSet,
      include,
      ids,
      where,
      whereDocument,
      nResults
    );
    const { data } = await DefaultService.collectionQuery({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids: queryRecordSet.ids,
        include,
        n_results: nResults,
        query_embeddings: queryRecordSet.embeddings,
        where,
        where_document: whereDocument
      }
    });
    const deserializedMetadatas = deserializeMetadataMatrix(data.metadatas) ?? [];
    return new QueryResult({
      distances: data.distances ?? [],
      documents: data.documents ?? [],
      embeddings: data.embeddings ?? [],
      ids: data.ids ?? [],
      include: data.include,
      metadatas: deserializedMetadatas,
      uris: data.uris ?? []
    });
  }
  async search(searches) {
    const items = Array.isArray(searches) ? searches : [searches];
    if (items.length === 0) {
      throw new ChromaValueError(
        "At least one search payload must be provided."
      );
    }
    const payloads = await Promise.all(
      items.map(async (search) => {
        const payload = toSearch(search).toPayload();
        return this.embedSearchPayload(payload);
      })
    );
    const { data } = await DefaultService.collectionSearch({
      client: this.apiClient,
      path: await this.path(),
      body: { searches: payloads }
    });
    return new SearchResult(data);
  }
  async modify({
    name,
    metadata,
    configuration
  }) {
    if (name) this.name = name;
    if (metadata) {
      validateMetadata(metadata);
      this.metadata = metadata;
    }
    const { updateConfiguration, updateEmbeddingFunction } = configuration ? await processUpdateCollectionConfig({
      collectionName: this.name,
      currentConfiguration: this.configuration,
      newConfiguration: configuration,
      currentEmbeddingFunction: this.embeddingFunction,
      client: this.chromaClient
    }) : {};
    if (updateEmbeddingFunction) {
      this.embeddingFunction = updateEmbeddingFunction;
    }
    if (updateConfiguration) {
      this.configuration = {
        hnsw: { ...this.configuration.hnsw, ...updateConfiguration.hnsw },
        spann: { ...this.configuration.spann, ...updateConfiguration.spann },
        embeddingFunction: updateConfiguration.embedding_function
      };
    }
    await DefaultService.updateCollection({
      client: this.apiClient,
      path: await this.path(),
      body: {
        new_name: name,
        new_metadata: serializeMetadata(metadata),
        new_configuration: updateConfiguration
      }
    });
  }
  async fork({ name }) {
    const { data } = await DefaultService.forkCollection({
      client: this.apiClient,
      path: await this.path(),
      body: { new_name: name }
    });
    return new _CollectionImpl({
      chromaClient: this.chromaClient,
      apiClient: this.apiClient,
      name: data.name,
      tenant: this.tenant,
      database: this.database,
      id: data.id,
      embeddingFunction: this._embeddingFunction,
      metadata: deserializeMetadata(data.metadata ?? void 0) ?? void 0,
      configuration: data.configuration_json
    });
  }
  async update({
    ids,
    embeddings,
    metadatas,
    documents,
    uris
  }) {
    const recordSet = {
      ids,
      embeddings,
      documents,
      metadatas,
      uris
    };
    const preparedRecordSet = await this.prepareRecords({
      recordSet,
      update: true
    });
    await DefaultService.collectionUpdate({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids: preparedRecordSet.ids,
        embeddings: preparedRecordSet.embeddings,
        metadatas: serializeMetadatas(preparedRecordSet.metadatas),
        uris: preparedRecordSet.uris,
        documents: preparedRecordSet.documents
      }
    });
  }
  async upsert({
    ids,
    embeddings,
    metadatas,
    documents,
    uris
  }) {
    const recordSet = {
      ids,
      embeddings,
      documents,
      metadatas,
      uris
    };
    const preparedRecordSet = await this.prepareRecords({
      recordSet
    });
    await DefaultService.collectionUpsert({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids: preparedRecordSet.ids,
        embeddings: preparedRecordSet.embeddings,
        metadatas: serializeMetadatas(preparedRecordSet.metadatas),
        uris: preparedRecordSet.uris,
        documents: preparedRecordSet.documents
      }
    });
  }
  async delete({
    ids,
    where,
    whereDocument
  }) {
    this.validateDelete(ids, where, whereDocument);
    await DefaultService.collectionDelete({
      client: this.apiClient,
      path: await this.path(),
      body: {
        ids,
        where,
        where_document: whereDocument
      }
    });
  }
};

// src/next.ts
function withChroma(userNextConfig = {}) {
  const originalWebpackFunction = userNextConfig.webpack;
  const newWebpackFunction = (config, options) => {
    if (!Array.isArray(config.externals)) {
      config.externals = [];
    }
    const externalsToAdd = ["@huggingface/transformers", "chromadb"];
    for (const ext of externalsToAdd) {
      if (!config.externals.includes(ext)) {
        config.externals.push(ext);
      }
    }
    if (typeof originalWebpackFunction === "function") {
      return originalWebpackFunction(config, options);
    }
    return config;
  };
  return {
    ...userNextConfig,
    webpack: newWebpackFunction
  };
}

// src/chroma-fetch.ts
var offlineError = (error) => {
  return Boolean(
    (error?.name === "TypeError" || error?.name === "FetchError") && (error.message?.includes("fetch failed") || error.message?.includes("Failed to fetch") || error.message?.includes("ENOTFOUND"))
  );
};
var getErrorMessage = async (response) => {
  try {
    const body = await response.clone().json();
    return body.message || body.error || `${response.status}: ${response.statusText}`;
  } catch {
    return `${response.status}: ${response.statusText}`;
  }
};
var chromaFetch = async (input, init) => {
  let response;
  try {
    response = await fetch(input, init);
  } catch (err) {
    if (offlineError(err)) {
      throw new ChromaConnectionError(
        "Failed to connect to chromadb. Make sure your server is running and try again. If you are running from a browser, make sure that your chromadb instance is configured to allow requests from the current origin using the CHROMA_SERVER_CORS_ALLOW_ORIGINS environment variable."
      );
    }
    throw new ChromaConnectionError("Failed to connect to Chroma");
  }
  if (response.ok) {
    return response;
  }
  switch (response.status) {
    case 400:
      let status = "Bad Request";
      try {
        const responseBody = await response.json();
        status = responseBody.message || status;
      } catch {
      }
      throw new ChromaClientError(
        `Bad request to ${input.url || "Chroma"} with status: ${status}`
      );
    case 401:
      throw new ChromaUnauthorizedError(`Unauthorized`);
    case 403:
      throw new ChromaForbiddenError(
        `You do not have permission to access the requested resource.`
      );
    case 404:
      throw new ChromaNotFoundError(
        `The requested resource could not be found`
      );
    case 409:
      throw new ChromaUniqueError("The resource already exists");
    case 422:
      try {
        const body = await response.json();
        if (body && body.message && (body.message.startsWith("Quota exceeded") || body.message.startsWith("Billing limit exceeded"))) {
          throw new ChromaQuotaExceededError(body?.message);
        }
        throw new ChromaClientError(body?.message || "Unprocessable Entity");
      } catch (error) {
        if (error instanceof ChromaQuotaExceededError || error instanceof ChromaClientError) {
          throw error;
        }
        throw new ChromaClientError(`Unprocessable Entity: ${response.statusText}`);
      }
    case 429:
      throw new ChromaRateLimitError("Rate limit exceeded");
  }
  const errorMessage = await getErrorMessage(response);
  throw new ChromaServerError(errorMessage);
};

// src/admin-client.ts
var AdminClient = class {
  /**
   * Creates a new AdminClient instance.
   * @param args - Optional configuration for the admin client
   */
  constructor(args) {
    const { host, port, ssl, headers, fetchOptions } = args || defaultAdminClientArgs;
    const baseUrl = `${ssl ? "https" : "http"}://${host}:${port}`;
    const configOptions = {
      ...fetchOptions,
      method: normalizeMethod(fetchOptions?.method),
      baseUrl,
      headers
    };
    this.apiClient = J(w(configOptions));
    this.apiClient.setConfig({ fetch: chromaFetch });
  }
  /**
   * Creates a new database within a tenant.
   * @param options - Database creation options
   * @param options.name - Name of the database to create
   * @param options.tenant - Tenant that will own the database
   */
  async createDatabase({
    name,
    tenant
  }) {
    await DefaultService.createDatabase({
      client: this.apiClient,
      path: { tenant },
      body: { name }
    });
  }
  /**
   * Retrieves information about a specific database.
   * @param options - Database retrieval options
   * @param options.name - Name of the database to retrieve
   * @param options.tenant - Tenant that owns the database
   * @returns Promise resolving to database information
   */
  async getDatabase({
    name,
    tenant
  }) {
    const { data } = await DefaultService.getDatabase({
      client: this.apiClient,
      path: { tenant, database: name }
    });
    return data;
  }
  /**
   * Deletes a database and all its data.
   * @param options - Database deletion options
   * @param options.name - Name of the database to delete
   * @param options.tenant - Tenant that owns the database
   * @warning This operation is irreversible and will delete all data
   */
  async deleteDatabase({
    name,
    tenant
  }) {
    await DefaultService.deleteDatabase({
      client: this.apiClient,
      path: { tenant, database: name }
    });
  }
  /**
   * Lists all databases within a tenant.
   * @param args - Listing parameters including tenant and pagination
   * @returns Promise resolving to an array of database information
   */
  async listDatabases(args) {
    const { limit = 100, offset = 0, tenant } = args;
    const { data } = await DefaultService.listDatabases({
      client: this.apiClient,
      path: { tenant },
      query: { limit, offset }
    });
    return data;
  }
  /**
   * Creates a new tenant.
   * @param options - Tenant creation options
   * @param options.name - Name of the tenant to create
   */
  async createTenant({ name }) {
    await DefaultService.createTenant({
      client: this.apiClient,
      body: { name }
    });
  }
  /**
   * Retrieves information about a specific tenant.
   * @param options - Tenant retrieval options
   * @param options.name - Name of the tenant to retrieve
   * @returns Promise resolving to the tenant name
   */
  async getTenant({ name }) {
    const { data } = await DefaultService.getTenant({
      client: this.apiClient,
      path: { tenant_name: name }
    });
    return data.name;
  }
};

// src/chroma-client.ts
import * as process from "node:process";
var resolveSchemaEmbeddingFunction = (schema) => {
  if (!schema) {
    return void 0;
  }
  const embeddingOverride = schema.keys[EMBEDDING_KEY]?.floatList?.vectorIndex?.config.embeddingFunction ?? void 0;
  if (embeddingOverride) {
    return embeddingOverride;
  }
  return schema.defaults.floatList?.vectorIndex?.config.embeddingFunction ?? void 0;
};
var ChromaClient = class {
  /**
   * Creates a new ChromaClient instance.
   * @param args - Configuration options for the client
   */
  constructor(args = {}) {
    let {
      host = defaultChromaClientArgs.host,
      port = defaultChromaClientArgs.port,
      ssl = defaultChromaClientArgs.ssl,
      tenant = defaultChromaClientArgs.tenant,
      database = defaultChromaClientArgs.database,
      headers = defaultChromaClientArgs.headers,
      fetchOptions = defaultChromaClientArgs.fetchOptions
    } = args;
    if (args.path) {
      console.warn(
        "The 'path' argument is deprecated. Please use 'ssl', 'host', and 'port' instead"
      );
      const parsedPath = parseConnectionPath(args.path);
      ssl = parsedPath.ssl;
      host = parsedPath.host;
      port = parsedPath.port;
    }
    if (args.auth) {
      console.warn(
        "The 'auth' argument is deprecated. Please use 'headers' instead"
      );
      if (!headers) {
        headers = {};
      }
      if (!headers["x-chroma-token"] && args.auth.tokenHeaderType === "X_CHROMA_TOKEN" && args.auth.credentials) {
        headers["x-chroma-token"] = args.auth.credentials;
      }
    }
    const baseUrl = `${ssl ? "https" : "http"}://${host}:${port}`;
    this._tenant = tenant || process.env.CHROMA_TENANT;
    this._database = database || process.env.CHROMA_DATABASE;
    this._headers = headers;
    const configOptions = {
      ...fetchOptions,
      method: normalizeMethod(fetchOptions?.method),
      baseUrl,
      headers
    };
    this.apiClient = J(w(configOptions));
    this.apiClient.setConfig({ fetch: chromaFetch });
  }
  /**
   * Gets the current tenant name.
   * @returns The tenant name or undefined if not set
   */
  get tenant() {
    return this._tenant;
  }
  set tenant(tenant) {
    this._tenant = tenant;
  }
  /**
   * Gets the current database name.
   * @returns The database name or undefined if not set
   */
  get database() {
    return this._database;
  }
  set database(database) {
    this._database = database;
  }
  /**
   * Gets the preflight checks
   * @returns The preflight checks or undefined if not set
   */
  get preflightChecks() {
    return this._preflightChecks;
  }
  set preflightChecks(preflightChecks) {
    this._preflightChecks = preflightChecks;
  }
  get headers() {
    return this._headers;
  }
  /** @ignore */
  async _path() {
    if (!this._tenant || !this._database) {
      const { tenant, databases } = await this.getUserIdentity();
      const uniqueDBs = [...new Set(databases)];
      this._tenant = tenant;
      if (uniqueDBs.length === 0) {
        throw new ChromaUnauthorizedError(
          `Your API key does not have access to any DBs for tenant ${this.tenant}`
        );
      }
      if (uniqueDBs.length > 1 || uniqueDBs[0] === "*") {
        throw new ChromaValueError(
          "Your API key is scoped to more than 1 DB. Please provide a DB name to the CloudClient constructor"
        );
      }
      this._database = uniqueDBs[0];
    }
    return { tenant: this._tenant, database: this._database };
  }
  /**
   * Gets the user identity information including tenant and accessible databases.
   * @returns Promise resolving to user identity data
   */
  async getUserIdentity() {
    const { data } = await DefaultService.getUserIdentity({
      client: this.apiClient
    });
    return data;
  }
  /**
   * Sends a heartbeat request to check server connectivity.
   * @returns Promise resolving to the server's nanosecond heartbeat timestamp
   */
  async heartbeat() {
    const { data } = await DefaultService.heartbeat({
      client: this.apiClient
    });
    return data["nanosecond heartbeat"];
  }
  /**
   * Lists all collections in the current database.
   * @param args - Optional pagination parameters
   * @param args.limit - Maximum number of collections to return (default: 100)
   * @param args.offset - Number of collections to skip (default: 0)
   * @returns Promise resolving to an array of Collection instances
   */
  async listCollections(args) {
    const { limit = 100, offset = 0 } = args || {};
    const { data } = await DefaultService.listCollections({
      client: this.apiClient,
      path: await this._path(),
      query: { limit, offset }
    });
    return Promise.all(
      data.map(async (collection) => {
        const schema = await Schema.deserializeFromJSON(
          collection.schema ?? null,
          this
        );
        const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
        const resolvedEmbeddingFunction = await getEmbeddingFunction({
          collectionName: collection.name,
          client: this,
          efConfig: collection.configuration_json.embedding_function ?? void 0
        }) ?? schemaEmbeddingFunction;
        return new CollectionImpl({
          chromaClient: this,
          apiClient: this.apiClient,
          tenant: collection.tenant,
          database: collection.database,
          name: collection.name,
          id: collection.id,
          embeddingFunction: resolvedEmbeddingFunction,
          configuration: collection.configuration_json,
          metadata: deserializeMetadata(collection.metadata ?? void 0) ?? void 0,
          schema
        });
      })
    );
  }
  /**
   * Gets the total number of collections in the current database.
   * @returns Promise resolving to the collection count
   */
  async countCollections() {
    const { data } = await DefaultService.countCollections({
      client: this.apiClient,
      path: await this._path()
    });
    return data;
  }
  /**
   * Creates a new collection with the specified configuration.
   * @param options - Collection creation options
   * @param options.name - The name of the collection
   * @param options.configuration - Optional collection configuration
   * @param options.metadata - Optional metadata for the collection
   * @param options.embeddingFunction - Optional embedding function to use. Defaults to `DefaultEmbeddingFunction` from @chroma-core/default-embed
   * @returns Promise resolving to the created Collection instance
   * @throws Error if a collection with the same name already exists
   */
  async createCollection({
    name,
    configuration,
    metadata,
    embeddingFunction,
    schema
  }) {
    const collectionConfig = await processCreateCollectionConfig({
      configuration,
      embeddingFunction,
      metadata,
      schema
    });
    const { data } = await DefaultService.createCollection({
      client: this.apiClient,
      path: await this._path(),
      body: {
        name,
        configuration: collectionConfig,
        metadata: serializeMetadata(metadata),
        get_or_create: false,
        schema: schema ? schema.serializeToJSON() : void 0
      }
    });
    const serverSchema = await Schema.deserializeFromJSON(
      data.schema ?? null,
      this
    );
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(serverSchema);
    const resolvedEmbeddingFunction = embeddingFunction ?? await getEmbeddingFunction({
      collectionName: data.name,
      client: this,
      efConfig: data.configuration_json.embedding_function ?? void 0
    }) ?? schemaEmbeddingFunction;
    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? void 0) ?? void 0,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema: serverSchema
    });
  }
  /**
   * Retrieves an existing collection by name.
   * @param options - Collection retrieval options
   * @param options.name - The name of the collection to retrieve
   * @param options.embeddingFunction - Optional embedding function. Should match the one used to create the collection.
   * @returns Promise resolving to the Collection instance
   * @throws Error if the collection does not exist
   */
  async getCollection({
    name,
    embeddingFunction
  }) {
    const { data } = await DefaultService.getCollection({
      client: this.apiClient,
      path: { ...await this._path(), collection_id: name }
    });
    const schema = await Schema.deserializeFromJSON(data.schema ?? null, this);
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
    const resolvedEmbeddingFunction = embeddingFunction ?? await getEmbeddingFunction({
      collectionName: data.name,
      client: this,
      efConfig: data.configuration_json.embedding_function ?? void 0
    }) ?? schemaEmbeddingFunction;
    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? void 0) ?? void 0,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema
    });
  }
  /**
   * Retrieves an existing collection by its Chroma Resource Name (CRN).
   * @param crn - The Chroma Resource Name of the collection to retrieve
   * @returns Promise resolving to the Collection instance
   * @throws Error if the collection does not exist
   */
  async getCollectionByCrn(crn) {
    const { data } = await DefaultService.getCollectionByCrn({
      client: this.apiClient,
      path: { crn }
    });
    const schema = await Schema.deserializeFromJSON(data.schema ?? null, this);
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
    const resolvedEmbeddingFunction = await getEmbeddingFunction({
      collectionName: data.name,
      efConfig: data.configuration_json.embedding_function ?? void 0,
      client: this
    }) ?? schemaEmbeddingFunction;
    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name: data.name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? void 0) ?? void 0,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema
    });
  }
  /**
   * Retrieves multiple collections by name.
   * @param items - Array of collection names or objects with name and optional embedding function (should match the ones used to create the collections)
   * @returns Promise resolving to an array of Collection instances
   */
  async getCollections(items) {
    if (items.length === 0) return [];
    let requestedCollections = items;
    if (typeof items[0] === "string") {
      requestedCollections = items.map((item) => {
        return { name: item, embeddingFunction: void 0 };
      });
    }
    let collections = requestedCollections;
    return Promise.all(
      collections.map(async (collection) => {
        return this.getCollection({ ...collection });
      })
    );
  }
  /**
   * Gets an existing collection or creates it if it doesn't exist.
   * @param options - Collection options
   * @param options.name - The name of the collection
   * @param options.configuration - Optional collection configuration (used only if creating)
   * @param options.metadata - Optional metadata for the collection (used only if creating)
   * @param options.embeddingFunction - Optional embedding function to use
   * @returns Promise resolving to the Collection instance
   */
  async getOrCreateCollection({
    name,
    configuration,
    metadata,
    embeddingFunction,
    schema
  }) {
    const collectionConfig = await processCreateCollectionConfig({
      configuration,
      embeddingFunction,
      metadata,
      schema
    });
    const { data } = await DefaultService.createCollection({
      client: this.apiClient,
      path: await this._path(),
      body: {
        name,
        configuration: collectionConfig,
        metadata: serializeMetadata(metadata),
        get_or_create: true,
        schema: schema ? schema.serializeToJSON() : void 0
      }
    });
    const serverSchema = await Schema.deserializeFromJSON(
      data.schema ?? null,
      this
    );
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(serverSchema);
    const resolvedEmbeddingFunction = embeddingFunction ?? await getEmbeddingFunction({
      collectionName: name,
      efConfig: data.configuration_json.embedding_function ?? void 0,
      client: this
    }) ?? schemaEmbeddingFunction;
    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? void 0) ?? void 0,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema: serverSchema
    });
  }
  /**
   * Deletes a collection and all its data.
   * @param options - Deletion options
   * @param options.name - The name of the collection to delete
   */
  async deleteCollection({ name }) {
    await DefaultService.deleteCollection({
      client: this.apiClient,
      path: { ...await this._path(), collection_id: name }
    });
  }
  /**
   * Resets the entire database, deleting all collections and data.
   * @returns Promise that resolves when the reset is complete
   * @warning This operation is irreversible and will delete all data
   */
  async reset() {
    await DefaultService.reset({
      client: this.apiClient
    });
  }
  /**
   * Gets the version of the Chroma server.
   * @returns Promise resolving to the server version string
   */
  async version() {
    const { data } = await DefaultService.version({
      client: this.apiClient
    });
    return data;
  }
  /**
   * Gets the preflight checks
   * @returns Promise resolving to the preflight checks
   */
  async getPreflightChecks() {
    if (!this.preflightChecks) {
      const { data } = await DefaultService.preFlightChecks({
        client: this.apiClient
      });
      this.preflightChecks = data;
      return this.preflightChecks;
    }
    return this.preflightChecks;
  }
  /**
   * Gets the max batch size
   * @returns Promise resolving to the max batch size
   */
  async getMaxBatchSize() {
    const preflightChecks = await this.getPreflightChecks();
    return preflightChecks.max_batch_size ?? -1;
  }
  /**
   * Gets whether base64_encoding is supported by the connected server
   * @returns Promise resolving to whether base64_encoding is supported
   */
  async supportsBase64Encoding() {
    const preflightChecks = await this.getPreflightChecks();
    return preflightChecks.supports_base64_encoding ?? false;
  }
};

// src/cloud-client.ts
import * as process2 from "node:process";
var CloudClient = class extends ChromaClient {
  /**
   * Creates a new CloudClient instance for Chroma Cloud.
   * @param args - Cloud client configuration options
   */
  constructor(args = {}) {
    const apiKey = args.apiKey || process2.env.CHROMA_API_KEY;
    if (!apiKey) {
      throw new ChromaValueError(
        "Missing API key. Please provide it to the CloudClient constructor or set your CHROMA_API_KEY environment variable"
      );
    }
    const tenant = args.tenant || process2.env.CHROMA_TENANT;
    const database = args.database || process2.env.CHROMA_DATABASE;
    super({
      host: args.host || "api.trychroma.com",
      port: args.port || 443,
      ssl: true,
      tenant,
      database,
      headers: { "x-chroma-token": apiKey },
      fetchOptions: args.fetchOptions
    });
    this.tenant = tenant;
    this.database = database;
  }
};
var AdminCloudClient = class extends AdminClient {
  /**
   * Creates a new AdminCloudClient instance for cloud admin operations.
   * @param args - Admin cloud client configuration options
   */
  constructor(args = {}) {
    const apiKey = args.apiKey || process2.env.CHROMA_API_KEY;
    if (!apiKey) {
      throw new ChromaValueError(
        "Missing API key. Please provide it to the CloudClient constructor or set your CHROMA_API_KEY environment variable"
      );
    }
    super({
      host: args.host || "api.trychroma.com",
      port: args.port || 443,
      ssl: true,
      headers: { "x-chroma-token": apiKey },
      fetchOptions: args.fetchOptions
    });
  }
};
export {
  Abs,
  AdminClient,
  AdminCloudClient,
  Aggregate,
  BoolInvertedIndexConfig,
  BoolInvertedIndexType,
  BoolValueType,
  ChromaClient,
  ChromaClientError,
  ChromaConnectionError,
  ChromaError,
  ChromaForbiddenError,
  ChromaNotFoundError,
  ChromaQuotaExceededError,
  ChromaRateLimitError,
  ChromaServerError,
  ChromaUnauthorizedError,
  ChromaUniqueError,
  ChromaValueError,
  CloudClient,
  Cmek,
  CmekProvider,
  DOCUMENT_KEY,
  Div,
  EMBEDDING_KEY,
  Exp,
  FloatInvertedIndexConfig,
  FloatInvertedIndexType,
  FloatListValueType,
  FloatValueType,
  FtsIndexConfig,
  FtsIndexType,
  GetResult,
  GroupBy,
  IncludeEnum,
  IntInvertedIndexConfig,
  IntInvertedIndexType,
  IntValueType,
  InvalidArgumentError,
  InvalidCollectionError,
  K,
  Key,
  Knn,
  Limit,
  Log,
  Max,
  MaxK,
  Min,
  MinK,
  Mul,
  QueryResult,
  RankExpression,
  Rrf,
  Schema,
  Search,
  SearchResult,
  Select,
  SparseVectorIndexConfig,
  SparseVectorIndexType,
  SparseVectorValueType,
  StringInvertedIndexConfig,
  StringInvertedIndexType,
  StringValueType,
  Sub,
  Sum,
  Val,
  ValueTypes,
  VectorIndexConfig,
  VectorIndexType,
  WhereExpression,
  baseRecordSetFields,
  createErrorByType,
  getDefaultEFConfig,
  getEmbeddingFunction,
  getSparseEmbeddingFunction,
  knownEmbeddingFunctions,
  knownSparseEmbeddingFunctions,
  processCreateCollectionConfig,
  processUpdateCollectionConfig,
  recordSetFields,
  registerEmbeddingFunction,
  registerSparseEmbeddingFunction,
  serializeEmbeddingFunction,
  toSearch,
  withChroma
};
//# sourceMappingURL=chromadb.mjs.map