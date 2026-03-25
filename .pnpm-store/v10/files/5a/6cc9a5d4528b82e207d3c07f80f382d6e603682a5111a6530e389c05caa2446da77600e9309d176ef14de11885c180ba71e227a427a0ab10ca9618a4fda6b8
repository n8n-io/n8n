import { getClient, SDK_VERSION } from '@sentry/core';
import { WINDOW } from '../helpers.js';

// This is a map of integration function method to bundle file name.
const LazyLoadableIntegrations = {
  replayIntegration: 'replay',
  replayCanvasIntegration: 'replay-canvas',
  feedbackIntegration: 'feedback',
  feedbackModalIntegration: 'feedback-modal',
  feedbackScreenshotIntegration: 'feedback-screenshot',
  captureConsoleIntegration: 'captureconsole',
  contextLinesIntegration: 'contextlines',
  linkedErrorsIntegration: 'linkederrors',
  dedupeIntegration: 'dedupe',
  extraErrorDataIntegration: 'extraerrordata',
  graphqlClientIntegration: 'graphqlclient',
  httpClientIntegration: 'httpclient',
  reportingObserverIntegration: 'reportingobserver',
  rewriteFramesIntegration: 'rewriteframes',
  browserProfilingIntegration: 'browserprofiling',
  moduleMetadataIntegration: 'modulemetadata',
  instrumentAnthropicAiClient: 'instrumentanthropicaiclient',
  instrumentOpenAiClient: 'instrumentopenaiclient',
  instrumentGoogleGenAIClient: 'instrumentgooglegenaiclient',
  instrumentLangGraph: 'instrumentlanggraph',
  createLangChainCallbackHandler: 'createlangchaincallbackhandler',
} ;

const WindowWithMaybeIntegration = WINDOW

;

/**
 * Lazy load an integration from the CDN.
 * Rejects if the integration cannot be loaded.
 */
async function lazyLoadIntegration(
  name,
  scriptNonce,
) {
  const bundle = LazyLoadableIntegrations[name];

  // `window.Sentry` is only set when using a CDN bundle, but this method can also be used via the NPM package
  const sentryOnWindow = (WindowWithMaybeIntegration.Sentry = WindowWithMaybeIntegration.Sentry || {});

  if (!bundle) {
    throw new Error(`Cannot lazy load integration: ${name}`);
  }

  // Bail if the integration already exists
  const existing = sentryOnWindow[name];
  // The `feedbackIntegration` is loaded by default in the CDN bundles,
  // so we need to differentiate between the real integration and the shim.
  // if only the shim exists, we still want to lazy load the real integration.
  if (typeof existing === 'function' && !('_isShim' in existing)) {
    return existing;
  }

  const url = getScriptURL(bundle);
  const script = WINDOW.document.createElement('script');
  script.src = url;
  script.crossOrigin = 'anonymous';
  script.referrerPolicy = 'strict-origin';

  if (scriptNonce) {
    script.setAttribute('nonce', scriptNonce);
  }

  const waitForLoad = new Promise((resolve, reject) => {
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', reject);
  });

  const currentScript = WINDOW.document.currentScript;
  const parent = WINDOW.document.body || WINDOW.document.head || currentScript?.parentElement;

  if (parent) {
    parent.appendChild(script);
  } else {
    throw new Error(`Could not find parent element to insert lazy-loaded ${name} script`);
  }

  try {
    await waitForLoad;
  } catch {
    throw new Error(`Error when loading integration: ${name}`);
  }

  const integrationFn = sentryOnWindow[name];

  if (typeof integrationFn !== 'function') {
    throw new Error(`Could not load integration: ${name}`);
  }

  return integrationFn;
}

function getScriptURL(bundle) {
  const client = getClient();
  const baseURL = client?.getOptions()?.cdnBaseUrl || 'https://browser.sentry-cdn.com';

  return new URL(`/${SDK_VERSION}/${bundle}.min.js`, baseURL).toString();
}

export { lazyLoadIntegration };
//# sourceMappingURL=lazyLoadIntegration.js.map
