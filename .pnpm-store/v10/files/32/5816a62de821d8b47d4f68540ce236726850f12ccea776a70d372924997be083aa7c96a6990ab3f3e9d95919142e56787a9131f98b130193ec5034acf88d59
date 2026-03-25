Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');

/**
 * Returns true if the SDK is running in an embedded browser extension.
 * Stand-alone browser extensions (which do not share the same data as the main browser page) are fine.
 */
function checkAndWarnIfIsEmbeddedBrowserExtension() {
  if (_isEmbeddedBrowserExtension()) {
    if (debugBuild.DEBUG_BUILD) {
      core.consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.error(
          '[Sentry] You cannot use Sentry.init() in a browser extension, see: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/',
        );
      });
    }

    return true;
  }

  return false;
}

function _isEmbeddedBrowserExtension() {
  if (typeof helpers.WINDOW.window === 'undefined') {
    // No need to show the error if we're not in a browser window environment (e.g. service workers)
    return false;
  }

  const _window = helpers.WINDOW ;

  // Running the SDK in NW.js, which appears like a browser extension but isn't, is also fine
  // see: https://github.com/getsentry/sentry-javascript/issues/12668
  if (_window.nw) {
    return false;
  }

  const extensionObject = _window['chrome'] || _window['browser'];

  if (!extensionObject?.runtime?.id) {
    return false;
  }

  const href = core.getLocationHref();
  const extensionProtocols = ['chrome-extension', 'moz-extension', 'ms-browser-extension', 'safari-web-extension'];

  // Running the SDK in a dedicated extension page and calling Sentry.init is fine; no risk of data leakage
  const isDedicatedExtensionPage =
    helpers.WINDOW === helpers.WINDOW.top && extensionProtocols.some(protocol => href.startsWith(`${protocol}://`));

  return !isDedicatedExtensionPage;
}

exports.checkAndWarnIfIsEmbeddedBrowserExtension = checkAndWarnIfIsEmbeddedBrowserExtension;
//# sourceMappingURL=detectBrowserExtension.js.map
