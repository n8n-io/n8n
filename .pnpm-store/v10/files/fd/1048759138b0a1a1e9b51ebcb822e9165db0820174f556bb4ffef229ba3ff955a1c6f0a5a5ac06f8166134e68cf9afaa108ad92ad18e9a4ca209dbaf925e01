Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrument = require('./metrics/instrument.js');
const browserMetrics = require('./metrics/browserMetrics.js');
const elementTiming = require('./metrics/elementTiming.js');
const utils = require('./metrics/utils.js');
const dom = require('./instrument/dom.js');
const history = require('./instrument/history.js');
const getNativeImplementation = require('./getNativeImplementation.js');
const xhr = require('./instrument/xhr.js');
const networkUtils = require('./networkUtils.js');
const resourceTiming = require('./metrics/resourceTiming.js');
const inp = require('./metrics/inp.js');



exports.addClsInstrumentationHandler = instrument.addClsInstrumentationHandler;
exports.addInpInstrumentationHandler = instrument.addInpInstrumentationHandler;
exports.addLcpInstrumentationHandler = instrument.addLcpInstrumentationHandler;
exports.addPerformanceInstrumentationHandler = instrument.addPerformanceInstrumentationHandler;
exports.addTtfbInstrumentationHandler = instrument.addTtfbInstrumentationHandler;
exports.addPerformanceEntries = browserMetrics.addPerformanceEntries;
exports.startTrackingInteractions = browserMetrics.startTrackingInteractions;
exports.startTrackingLongAnimationFrames = browserMetrics.startTrackingLongAnimationFrames;
exports.startTrackingLongTasks = browserMetrics.startTrackingLongTasks;
exports.startTrackingWebVitals = browserMetrics.startTrackingWebVitals;
exports.startTrackingElementTiming = elementTiming.startTrackingElementTiming;
exports.extractNetworkProtocol = utils.extractNetworkProtocol;
exports.addClickKeypressInstrumentationHandler = dom.addClickKeypressInstrumentationHandler;
exports.addHistoryInstrumentationHandler = history.addHistoryInstrumentationHandler;
exports.clearCachedImplementation = getNativeImplementation.clearCachedImplementation;
exports.fetch = getNativeImplementation.fetch;
exports.getNativeImplementation = getNativeImplementation.getNativeImplementation;
exports.setTimeout = getNativeImplementation.setTimeout;
exports.SENTRY_XHR_DATA_KEY = xhr.SENTRY_XHR_DATA_KEY;
exports.addXhrInstrumentationHandler = xhr.addXhrInstrumentationHandler;
exports.getBodyString = networkUtils.getBodyString;
exports.getFetchRequestArgBody = networkUtils.getFetchRequestArgBody;
exports.parseXhrResponseHeaders = networkUtils.parseXhrResponseHeaders;
exports.serializeFormData = networkUtils.serializeFormData;
exports.resourceTimingToSpanAttributes = resourceTiming.resourceTimingToSpanAttributes;
exports.registerInpInteractionListener = inp.registerInpInteractionListener;
exports.startTrackingINP = inp.startTrackingINP;
//# sourceMappingURL=index.js.map
