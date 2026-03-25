Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const http = require('node:http');
const https = require('node:https');
const node_stream = require('node:stream');
const node_zlib = require('node:zlib');
const core = require('@sentry/core');
const index = require('../proxy/index.js');

// Estimated maximum size for reasonable standalone event
const GZIP_THRESHOLD = 1024 * 32;

/**
 * Gets a stream from a Uint8Array or string
 * Readable.from is ideal but was added in node.js v12.3.0 and v10.17.0
 */
function streamFromBody(body) {
  return new node_stream.Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  });
}

/**
 * Creates a Transport that uses native the native 'http' and 'https' modules to send events to Sentry.
 */
function makeNodeTransport(options) {
  let urlSegments;

  try {
    urlSegments = new URL(options.url);
  } catch (e) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn(
        '[@sentry/node]: Invalid dsn or tunnel option, will not send any events. The tunnel option must be a full URL when used.',
      );
    });
    return core.createTransport(options, () => Promise.resolve({}));
  }

  const isHttps = urlSegments.protocol === 'https:';

  // Proxy prioritization: http => `options.proxy` | `process.env.http_proxy`
  // Proxy prioritization: https => `options.proxy` | `process.env.https_proxy` | `process.env.http_proxy`
  const proxy = applyNoProxyOption(
    urlSegments,
    options.proxy || (isHttps ? process.env.https_proxy : undefined) || process.env.http_proxy,
  );

  const nativeHttpModule = isHttps ? https : http;
  const keepAlive = options.keepAlive === undefined ? false : options.keepAlive;

  // TODO(v11): Evaluate if we can set keepAlive to true. This would involve testing for memory leaks in older node
  // versions(>= 8) as they had memory leaks when using it: #2555
  const agent = proxy
    ? (new index.HttpsProxyAgent(proxy) )
    : new nativeHttpModule.Agent({ keepAlive, maxSockets: 30, timeout: 2000 });

  const requestExecutor = createRequestExecutor(options, options.httpModule ?? nativeHttpModule, agent);
  return core.createTransport(options, requestExecutor);
}

/**
 * Honors the `no_proxy` env variable with the highest priority to allow for hosts exclusion.
 *
 * @param transportUrl The URL the transport intends to send events to.
 * @param proxy The client configured proxy.
 * @returns A proxy the transport should use.
 */
function applyNoProxyOption(transportUrlSegments, proxy) {
  const { no_proxy } = process.env;

  const urlIsExemptFromProxy = no_proxy
    ?.split(',')
    .some(
      exemption => transportUrlSegments.host.endsWith(exemption) || transportUrlSegments.hostname.endsWith(exemption),
    );

  if (urlIsExemptFromProxy) {
    return undefined;
  } else {
    return proxy;
  }
}

/**
 * Creates a RequestExecutor to be used with `createTransport`.
 */
function createRequestExecutor(
  options,
  httpModule,
  agent,
) {
  const { hostname, pathname, port, protocol, search } = new URL(options.url);
  return function makeRequest(request) {
    return new Promise((resolve, reject) => {
      // This ensures we do not generate any spans in OpenTelemetry for the transport
      core.suppressTracing(() => {
        let body = streamFromBody(request.body);

        const headers = { ...options.headers };

        if (request.body.length > GZIP_THRESHOLD) {
          headers['content-encoding'] = 'gzip';
          body = body.pipe(node_zlib.createGzip());
        }

        const hostnameIsIPv6 = hostname.startsWith('[');

        const req = httpModule.request(
          {
            method: 'POST',
            agent,
            headers,
            // Remove "[" and "]" from IPv6 hostnames
            hostname: hostnameIsIPv6 ? hostname.slice(1, -1) : hostname,
            path: `${pathname}${search}`,
            port,
            protocol,
            ca: options.caCerts,
          },
          res => {
            res.on('data', () => {
              // Drain socket
            });

            res.on('end', () => {
              // Drain socket
            });

            res.setEncoding('utf8');

            // "Key-value pairs of header names and values. Header names are lower-cased."
            // https://nodejs.org/api/http.html#http_message_headers
            const retryAfterHeader = res.headers['retry-after'] ?? null;
            const rateLimitsHeader = res.headers['x-sentry-rate-limits'] ?? null;

            resolve({
              statusCode: res.statusCode,
              headers: {
                'retry-after': retryAfterHeader,
                'x-sentry-rate-limits': Array.isArray(rateLimitsHeader)
                  ? rateLimitsHeader[0] || null
                  : rateLimitsHeader,
              },
            });
          },
        );

        req.on('error', reject);
        body.pipe(req);
      });
    });
  };
}

exports.makeNodeTransport = makeNodeTransport;
//# sourceMappingURL=http.js.map
