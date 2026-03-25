import { parseStringToURLObject, isURLObjectRelative } from './url.js';

/**
 * Checks whether given url points to Sentry server
 *
 * @param url url to verify
 */
function isSentryRequestUrl(url, client) {
  const dsn = client?.getDsn();
  const tunnel = client?.getOptions().tunnel;
  return checkDsn(url, dsn) || checkTunnel(url, tunnel);
}

function checkTunnel(url, tunnel) {
  if (!tunnel) {
    return false;
  }

  return removeTrailingSlash(url) === removeTrailingSlash(tunnel);
}

function checkDsn(url, dsn) {
  // Requests to Sentry's ingest endpoint must have a `sentry_key` in the query string
  // This is equivalent to the public_key which is required in the DSN
  // see https://develop.sentry.dev/sdk/overview/#parsing-the-dsn
  // Therefore, a request to the same host and with a `sentry_key` in the query string
  // can be considered a request to the ingest endpoint.
  const urlParts = parseStringToURLObject(url);
  if (!urlParts || isURLObjectRelative(urlParts)) {
    return false;
  }

  return dsn ? urlParts.host.includes(dsn.host) && /(^|&|\?)sentry_key=/.test(urlParts.search) : false;
}

function removeTrailingSlash(str) {
  return str[str.length - 1] === '/' ? str.slice(0, -1) : str;
}

export { isSentryRequestUrl };
//# sourceMappingURL=isSentryRequestUrl.js.map
