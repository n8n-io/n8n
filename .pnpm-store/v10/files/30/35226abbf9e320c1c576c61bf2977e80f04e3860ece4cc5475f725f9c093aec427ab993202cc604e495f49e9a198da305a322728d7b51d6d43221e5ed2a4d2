Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const sdk = require('./sdk.js');
const browserTracingIntegration = require('./browserTracingIntegration.js');
const errorhandler = require('./errorhandler.js');
const tracing = require('./tracing.js');
const integration = require('./integration.js');
const pinia = require('./pinia.js');



exports.init = sdk.init;
exports.browserTracingIntegration = browserTracingIntegration.browserTracingIntegration;
exports.attachErrorHandler = errorhandler.attachErrorHandler;
exports.createTracingMixins = tracing.createTracingMixins;
exports.vueIntegration = integration.vueIntegration;
exports.createSentryPiniaPlugin = pinia.createSentryPiniaPlugin;
Object.prototype.hasOwnProperty.call(browser, '__proto__') &&
	!Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
	Object.defineProperty(exports, '__proto__', {
		enumerable: true,
		value: browser['__proto__']
	});

Object.keys(browser).forEach(k => {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = browser[k];
});
//# sourceMappingURL=index.js.map
