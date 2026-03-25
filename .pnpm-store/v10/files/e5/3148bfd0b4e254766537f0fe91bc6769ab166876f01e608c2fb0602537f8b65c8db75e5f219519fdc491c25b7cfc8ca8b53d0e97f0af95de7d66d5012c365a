import { ono } from "@jsdevtools/ono";
import * as url from "../util/url.js";
import { ResolverError } from "../util/errors.js";
import type { FileInfo, HTTPResolverOptions, JSONSchema } from "../types/index.js";

export default {
  /**
   * The order that this resolver will run, in relation to other resolvers.
   */
  order: 200,

  /**
   * HTTP headers to send when downloading files.
   *
   * @example:
   * {
   *   "User-Agent": "JSON Schema $Ref Parser",
   *   Accept: "application/json"
   * }
   */
  headers: null,

  /**
   * HTTP request timeout (in milliseconds).
   */
  timeout: 60_000, // 60 seconds

  /**
   * The maximum number of HTTP redirects to follow.
   * To disable automatic following of redirects, set this to zero.
   */
  redirects: 5,

  /**
   * The `withCredentials` option of XMLHttpRequest.
   * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
   */
  withCredentials: false,

  /**
   * Determines whether this resolver can read a given file reference.
   * Resolvers that return true will be tried in order, until one successfully resolves the file.
   * Resolvers that return false will not be given a chance to resolve the file.
   */
  canRead(file: FileInfo) {
    return url.isHttp(file.url);
  },

  /**
   * Reads the given URL and returns its raw contents as a Buffer.
   */
  read(file: FileInfo) {
    const u = url.parse(file.url);

    if (typeof window !== "undefined" && !u.protocol) {
      // Use the protocol of the current page
      u.protocol = url.parse(location.href).protocol;
    }

    return download(u, this);
  },
} as HTTPResolverOptions<JSONSchema>;

/**
 * Downloads the given file.
 * @returns
 * The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
 */
async function download<S extends object = JSONSchema>(
  u: URL | string,
  httpOptions: HTTPResolverOptions<S>,
  _redirects?: string[],
): Promise<Buffer> {
  u = url.parse(u);
  const redirects = _redirects || [];
  redirects.push(u.href);

  try {
    const res = await get(u, httpOptions);
    if (res.status >= 400) {
      throw ono({ status: res.status }, `HTTP ERROR ${res.status}`);
    } else if (res.status >= 300) {
      if (!Number.isNaN(httpOptions.redirects) && redirects.length > httpOptions.redirects!) {
        throw new ResolverError(
          ono(
            { status: res.status },
            `Error downloading ${redirects[0]}. \nToo many redirects: \n  ${redirects.join(" \n  ")}`,
          ),
        );
      } else if (!("location" in res.headers) || !res.headers.location) {
        throw ono({ status: res.status }, `HTTP ${res.status} redirect with no location header`);
      } else {
        const redirectTo = url.resolve(u.href, res.headers.location as string);
        return download(redirectTo, httpOptions, redirects);
      }
    } else {
      if (res.body) {
        const buf = await res.arrayBuffer();
        return Buffer.from(buf);
      }
      return Buffer.alloc(0);
    }
  } catch (err: any) {
    throw new ResolverError(ono(err, `Error downloading ${u.href}`), u.href);
  }
}

/**
 * Sends an HTTP GET request.
 * The promise resolves with the HTTP Response object.
 */
async function get<S extends object = JSONSchema>(u: RequestInfo | URL, httpOptions: HTTPResolverOptions<S>) {
  let controller: any;
  let timeoutId: any;
  if (httpOptions.timeout) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), httpOptions.timeout);
  }

  const response = await fetch(u, {
    method: "GET",
    headers: httpOptions.headers || {},
    credentials: httpOptions.withCredentials ? "include" : "same-origin",
    signal: controller ? controller.signal : null,
  });
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return response;
}
