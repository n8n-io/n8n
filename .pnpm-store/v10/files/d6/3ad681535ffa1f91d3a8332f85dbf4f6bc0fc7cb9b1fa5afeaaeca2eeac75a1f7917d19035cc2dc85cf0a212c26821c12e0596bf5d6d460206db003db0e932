Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const semanticAttributes = require('../semanticAttributes.js');

// Curious about `thismessage:/`? See: https://www.rfc-editor.org/rfc/rfc2557.html
//  > When the methods above do not yield an absolute URI, a base URL
//  > of "thismessage:/" MUST be employed. This base URL has been
//  > defined for the sole purpose of resolving relative references
//  > within a multipart/related structure when no other base URI is
//  > specified.
//
// We need to provide a base URL to `parseStringToURLObject` because the fetch API gives us a
// relative URL sometimes.
//
// This is the only case where we need to provide a base URL to `parseStringToURLObject`
// because the relative URL is not valid on its own.
const DEFAULT_BASE_URL = 'thismessage:/';

/**
 * Checks if the URL object is relative
 *
 * @param url - The URL object to check
 * @returns True if the URL object is relative, false otherwise
 */
function isURLObjectRelative(url) {
  return 'isRelative' in url;
}

/**
 * Parses string to a URL object
 *
 * @param url - The URL to parse
 * @returns The parsed URL object or undefined if the URL is invalid
 */
function parseStringToURLObject(url, urlBase) {
  const isRelative = url.indexOf('://') <= 0 && url.indexOf('//') !== 0;
  const base = urlBase ?? (isRelative ? DEFAULT_BASE_URL : undefined);
  try {
    // Use `canParse` to short-circuit the URL constructor if it's not a valid URL
    // This is faster than trying to construct the URL and catching the error
    // Node 20+, Chrome 120+, Firefox 115+, Safari 17+
    if ('canParse' in URL && !(URL ).canParse(url, base)) {
      return undefined;
    }

    const fullUrlObject = new URL(url, base);
    if (isRelative) {
      // Because we used a fake base URL, we need to return a relative URL object.
      // We cannot return anything about the origin, host, etc. because it will refer to the fake base URL.
      return {
        isRelative,
        pathname: fullUrlObject.pathname,
        search: fullUrlObject.search,
        hash: fullUrlObject.hash,
      };
    }
    return fullUrlObject;
  } catch {
    // empty body
  }

  return undefined;
}

/**
 * Takes a URL object and returns a sanitized string which is safe to use as span name
 * see: https://develop.sentry.dev/sdk/data-handling/#structuring-data
 */
function getSanitizedUrlStringFromUrlObject(url) {
  if (isURLObjectRelative(url)) {
    return url.pathname;
  }

  const newUrl = new URL(url);
  newUrl.search = '';
  newUrl.hash = '';
  if (['80', '443'].includes(newUrl.port)) {
    newUrl.port = '';
  }
  if (newUrl.password) {
    newUrl.password = '%filtered%';
  }
  if (newUrl.username) {
    newUrl.username = '%filtered%';
  }

  return newUrl.toString();
}

function getHttpSpanNameFromUrlObject(
  urlObject,
  kind,
  request,
  routeName,
) {
  const method = request?.method?.toUpperCase() ?? 'GET';
  const route = routeName
    ? routeName
    : urlObject
      ? kind === 'client'
        ? getSanitizedUrlStringFromUrlObject(urlObject)
        : urlObject.pathname
      : '/';

  return `${method} ${route}`;
}

/**
 * Takes a parsed URL object and returns a set of attributes for the span
 * that represents the HTTP request for that url. This is used for both server
 * and client http spans.
 *
 * Follows https://opentelemetry.io/docs/specs/semconv/http/.
 *
 * @param urlObject - see {@link parseStringToURLObject}
 * @param kind - The type of HTTP operation (server or client)
 * @param spanOrigin - The origin of the span
 * @param request - The request object, see {@link PartialRequest}
 * @param routeName - The name of the route, must be low cardinality
 * @returns The span name and attributes for the HTTP operation
 */
function getHttpSpanDetailsFromUrlObject(
  urlObject,
  kind,
  spanOrigin,
  request,
  routeName,
) {
  const attributes = {
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: spanOrigin,
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
  };

  if (routeName) {
    // This is based on https://opentelemetry.io/docs/specs/semconv/http/http-spans/#name
    attributes[kind === 'server' ? 'http.route' : 'url.template'] = routeName;
    attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] = 'route';
  }

  if (request?.method) {
    attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_HTTP_REQUEST_METHOD] = request.method.toUpperCase();
  }

  if (urlObject) {
    if (urlObject.search) {
      attributes['url.query'] = urlObject.search;
    }
    if (urlObject.hash) {
      attributes['url.fragment'] = urlObject.hash;
    }
    if (urlObject.pathname) {
      attributes['url.path'] = urlObject.pathname;
      if (urlObject.pathname === '/') {
        attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] = 'route';
      }
    }

    if (!isURLObjectRelative(urlObject)) {
      attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_URL_FULL] = urlObject.href;
      if (urlObject.port) {
        attributes['url.port'] = urlObject.port;
      }
      if (urlObject.protocol) {
        attributes['url.scheme'] = urlObject.protocol;
      }
      if (urlObject.hostname) {
        attributes[kind === 'server' ? 'server.address' : 'url.domain'] = urlObject.hostname;
      }
    }
  }

  return [getHttpSpanNameFromUrlObject(urlObject, kind, request, routeName), attributes];
}

/**
 * Parses string form of URL into an object
 * // borrowed from https://tools.ietf.org/html/rfc3986#appendix-B
 * // intentionally using regex and not <a/> href parsing trick because React Native and other
 * // environments where DOM might not be available
 * @returns parsed URL object
 */
function parseUrl(url) {
  if (!url) {
    return {};
  }

  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);

  if (!match) {
    return {};
  }

  // coerce to undefined values to empty string so we don't get 'undefined'
  const query = match[6] || '';
  const fragment = match[8] || '';
  return {
    host: match[4],
    path: match[5],
    protocol: match[2],
    search: query,
    hash: fragment,
    relative: match[5] + query + fragment, // everything minus origin
  };
}

/**
 * Strip the query string and fragment off of a given URL or path (if present)
 *
 * @param urlPath Full URL or path, including possible query string and/or fragment
 * @returns URL or path without query string or fragment
 */
function stripUrlQueryAndFragment(urlPath) {
  return (urlPath.split(/[?#]/, 1) )[0];
}

/**
 * Takes a URL object and returns a sanitized string which is safe to use as span name
 * see: https://develop.sentry.dev/sdk/data-handling/#structuring-data
 */
function getSanitizedUrlString(url) {
  const { protocol, host, path } = url;

  const filteredHost =
    host
      // Always filter out authority
      ?.replace(/^.*@/, '[filtered]:[filtered]@')
      // Don't show standard :80 (http) and :443 (https) ports to reduce the noise
      // TODO: Use new URL global if it exists
      .replace(/(:80)$/, '')
      .replace(/(:443)$/, '') || '';

  return `${protocol ? `${protocol}://` : ''}${filteredHost}${path}`;
}

/**
 * Strips the content from a data URL, returning a placeholder with the MIME type.
 *
 * Data URLs can be very long (e.g. base64 encoded scripts for Web Workers),
 * with little valuable information, often leading to envelopes getting dropped due
 * to size limit violations. Therefore, we strip data URLs and replace them with a
 * placeholder.
 *
 * @param url - The URL to process
 * @param includeDataPrefix - If true, includes the first 10 characters of the data stream
 *                            for debugging (e.g., to identify magic bytes like WASM's AGFzbQ).
 *                            Defaults to true.
 * @returns For data URLs, returns a short format like `data:text/javascript;base64,SGVsbG8gV2... [truncated]`.
 *          For non-data URLs, returns the original URL unchanged.
 */
function stripDataUrlContent(url, includeDataPrefix = true) {
  if (url.startsWith('data:')) {
    // Match the MIME type (everything after 'data:' until the first ';' or ',')
    const match = url.match(/^data:([^;,]+)/);
    const mimeType = match ? match[1] : 'text/plain';
    const isBase64 = url.includes(';base64,');

    // Find where the actual data starts (after the comma)
    const dataStart = url.indexOf(',');
    let dataPrefix = '';
    if (includeDataPrefix && dataStart !== -1) {
      const data = url.slice(dataStart + 1);
      // Include first 10 chars of data to help identify content (e.g., magic bytes)
      dataPrefix = data.length > 10 ? `${data.slice(0, 10)}... [truncated]` : data;
    }

    return `data:${mimeType}${isBase64 ? ',base64' : ''}${dataPrefix ? `,${dataPrefix}` : ''}`;
  }
  return url;
}

exports.getHttpSpanDetailsFromUrlObject = getHttpSpanDetailsFromUrlObject;
exports.getSanitizedUrlString = getSanitizedUrlString;
exports.getSanitizedUrlStringFromUrlObject = getSanitizedUrlStringFromUrlObject;
exports.isURLObjectRelative = isURLObjectRelative;
exports.parseStringToURLObject = parseStringToURLObject;
exports.parseUrl = parseUrl;
exports.stripDataUrlContent = stripDataUrlContent;
exports.stripUrlQueryAndFragment = stripUrlQueryAndFragment;
//# sourceMappingURL=url.js.map
