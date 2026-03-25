Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');

/**
 * web-vitals 5.1.0 switched listeners to be added on the window rather than the document.
 * Instead of having to check for window/document every time we add a listener, we can use this function.
 */
function addPageListener(type, listener, options) {
  if (types.WINDOW.document) {
    types.WINDOW.addEventListener(type, listener, options);
  }
}
/**
 * web-vitals 5.1.0 switched listeners to be removed from the window rather than the document.
 * Instead of having to check for window/document every time we remove a listener, we can use this function.
 */
function removePageListener(type, listener, options) {
  if (types.WINDOW.document) {
    types.WINDOW.removeEventListener(type, listener, options);
  }
}

exports.addPageListener = addPageListener;
exports.removePageListener = removePageListener;
//# sourceMappingURL=globalListeners.js.map
