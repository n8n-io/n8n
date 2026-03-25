const getVendorPrefixedName = eventName => [
	`webkit${eventName}`,
	`o${eventName.toLowerCase()}`,
	eventName.toLowerCase(),
];

// https://github.com/google/closure-library/blob/8782d8ba16ef2dd4a508d2081a6938f054fc60e8/closure/goog/events/eventtype.js#L44
const domEvents = new Set([
	// Mouse events
	'click',
	'rightclick',
	'dblclick',
	'auxclick',
	'mousedown',
	'mouseup',
	'mouseover',
	'mouseout',
	'mousemove',
	'mouseenter',
	'mouseleave',

	// Non-existent event; will never fire. This exists as a mouse counterpart to
	// POINTERCANCEL.
	'mousecancel',

	// Selection events.
	// https://www.w3.org/TR/selection-api/
	'selectionchange',
	'selectstart',	// IE, Safari, Chrome

	// Wheel events
	// http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
	'wheel',

	// Key events
	'keypress',
	'keydown',
	'keyup',

	// Focus
	'blur',
	'focus',
	'deactivate',	// IE only
	'focusin',
	'focusout',

	// Forms
	'change',
	'reset',
	'select',
	'submit',
	'input',
	'propertychange',	// IE only

	// Drag and drop
	'dragstart',
	'drag',
	'dragenter',
	'dragover',
	'dragleave',
	'drop',
	'dragend',

	// Touch events
	// Note that other touch events exist, but we should follow the W3C list here.
	// http://www.w3.org/TR/touch-events/#list-of-touchevent-types
	'touchstart',
	'touchmove',
	'touchend',
	'touchcancel',

	// Misc
	'beforeunload',
	'consolemessage',
	'contextmenu',
	'devicechange',
	'devicemotion',
	'deviceorientation',
	'DOMContentLoaded',
	'error',
	'help',
	'load',
	'losecapture',
	'orientationchange',
	'readystatechange',
	'resize',
	'scroll',
	'unload',

	// Media events
	'canplay',
	'canplaythrough',
	'durationchange',
	'emptied',
	'ended',
	'loadeddata',
	'loadedmetadata',
	'pause',
	'play',
	'playing',
	'progress',
	'ratechange',
	'seeked',
	'seeking',
	'stalled',
	'suspend',
	'timeupdate',
	'volumechange',
	'waiting',

	// Media Source Extensions events
	// https://www.w3.org/TR/media-source/#mediasource-events
	'sourceopen',
	'sourceended',
	'sourceclosed',
	// https://www.w3.org/TR/media-source/#sourcebuffer-events
	'abort',
	'update',
	'updatestart',
	'updateend',

	// HTML 5 History events
	// See http://www.w3.org/TR/html5/browsers.html#event-definitions-0
	'hashchange',
	'pagehide',
	'pageshow',
	'popstate',

	// Copy and Paste
	// Support is limited. Make sure it works on your favorite browser
	// before using.
	// http://www.quirksmode.org/dom/events/cutcopypaste.html
	'copy',
	'paste',
	'cut',
	'beforecopy',
	'beforecut',
	'beforepaste',

	// HTML5 online/offline events.
	// http://www.w3.org/TR/offline-webapps/#related
	'online',
	'offline',

	// HTML 5 worker events
	'message',
	'connect',

	// Service Worker Events - ServiceWorkerGlobalScope context
	// See https://w3c.github.io/ServiceWorker/#execution-context-events
	// message event defined in worker events section
	'install',
	'activate',
	'fetch',
	'foreignfetch',
	'messageerror',

	// Service Worker Events - Document context
	// See https://w3c.github.io/ServiceWorker/#document-context-events
	'statechange',
	'updatefound',
	'controllerchange',

	// CSS animation events.
	...getVendorPrefixedName('AnimationStart'),
	...getVendorPrefixedName('AnimationEnd'),
	...getVendorPrefixedName('AnimationIteration'),

	// CSS transition events. Based on the browser support described at:
	// https://developer.mozilla.org/en/css/css_transitions#Browser_compatibility
	...getVendorPrefixedName('TransitionEnd'),

	// W3C Pointer Events
	// http://www.w3.org/TR/pointerevents/
	'pointerdown',
	'pointerup',
	'pointercancel',
	'pointermove',
	'pointerover',
	'pointerout',
	'pointerenter',
	'pointerleave',
	'gotpointercapture',
	'lostpointercapture',

	// IE specific events.
	// See http://msdn.microsoft.com/en-us/library/ie/hh772103(v=vs.85).aspx
	// these events will be supplanted in IE11.
	'MSGestureChange',
	'MSGestureEnd',
	'MSGestureHold',
	'MSGestureStart',
	'MSGestureTap',
	'MSGotPointerCapture',
	'MSInertiaStart',
	'MSLostPointerCapture',
	'MSPointerCancel',
	'MSPointerDown',
	'MSPointerEnter',
	'MSPointerHover',
	'MSPointerLeave',
	'MSPointerMove',
	'MSPointerOut',
	'MSPointerOver',
	'MSPointerUp',

	// Native IMEs/input tools events.
	'text',
	// The textInput event is supported in IE9+, but only in lower case. All other
	// browsers use the camel-case event name.
	'textinput',
	'textInput',
	'compositionstart',
	'compositionupdate',
	'compositionend',

	// The beforeinput event is initially only supported in Safari. See
	// https://bugs.chromium.org/p/chromium/issues/detail?id=342670 for Chrome
	// implementation tracking.
	'beforeinput',

	// Webview tag events
	// See https://developer.chrome.com/apps/tags/webview
	'exit',
	'loadabort',
	'loadcommit',
	'loadredirect',
	'loadstart',
	'loadstop',
	'responsive',
	'sizechanged',
	'unresponsive',

	// HTML5 Page Visibility API.	See details at
	// `goog.labs.dom.PageVisibilityMonitor`.
	'visibilitychange',

	// LocalStorage event.
	'storage',

	// DOM Level 2 mutation events (deprecated).
	'DOMSubtreeModified',
	'DOMNodeInserted',
	'DOMNodeRemoved',
	'DOMNodeRemovedFromDocument',
	'DOMNodeInsertedIntoDocument',
	'DOMAttrModified',
	'DOMCharacterDataModified',

	// Print events.
	'beforeprint',
	'afterprint',

	// Web app manifest events.
	'beforeinstallprompt',
	'appinstalled',

	// https://github.com/facebook/react/blob/cae635054e17a6f107a39d328649137b83f25972/packages/react-dom/src/events/DOMEventNames.js#L12
	'afterblur',
	'beforeblur',
	'cancel',
	'close',
	'dragexit',
	'encrypted',
	'fullscreenchange',
	'invalid',
	'toggle',

	// https://github.com/sindresorhus/eslint-plugin-unicorn/pull/147
	'search',
	'open',
	'show',
]);

export default domEvents;
