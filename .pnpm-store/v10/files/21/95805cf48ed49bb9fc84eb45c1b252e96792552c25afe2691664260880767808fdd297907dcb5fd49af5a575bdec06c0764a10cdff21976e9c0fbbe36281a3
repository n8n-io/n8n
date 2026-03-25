import { consoleSandbox, getLocationHref } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';

/**
 * Returns true if the SDK is running in an embedded browser extension.
 * Stand-alone browser extensions (which do not share the same data as the main browser page) are fine.
 */
function checkAndWarnIfIsEmbeddedBrowserExtension() {
  if (_isEmbeddedBrowserExtension()) {
    if (DEBUG_BUILD) {
      consoleSandbox(() => {
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
  if (typeof WINDOW.window === 'undefined') {
    // No need to show the error if we're not in a browser window environment (e.g. service workers)
    return false;
  }

  const _window = WINDOW ;

  // Running the SDK in NW.js, which appears like a browser extension but isn't, is also fine
  // see: https://github.com/getsentry/sentry-javascript/issues/12668
  if (_window.nw) {
    return false;
  }

  const extensionObject = _window['chrome'] || _window['browser'];

  if (!extensionObject?.runtime?.id) {
    return false;
  }

  const href = getLocationHref();
  const extensionProtocols = ['chrome-extension', 'moz-extension', 'ms-browser-extension', 'safari-web-extension'];

  // Running the SDK in a dedicated extension page and calling Sentry.init is fine; no risk of data leakage
  const isDedicatedExtensionPage =
    WINDOW === WINDOW.top && extensionProtocols.some(protocol => href.startsWith(`${protocol}://`));

  return !isDedicatedExtensionPage;
}

export { checkAndWarnIfIsEmbeddedBrowserExtension };
//# sourceMappingURL=detectBrowserExtension.js.map
