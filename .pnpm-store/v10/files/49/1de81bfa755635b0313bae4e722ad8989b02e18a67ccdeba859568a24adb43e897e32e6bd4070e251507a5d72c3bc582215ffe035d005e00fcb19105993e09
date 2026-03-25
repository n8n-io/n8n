/* global globalThis */
export default function(Handlebars) {
  /* istanbul ignore next */
  // https://mathiasbynens.be/notes/globalthis
  (function() {
    if (typeof globalThis === 'object') return;
    Object.prototype.__defineGetter__('__magic__', function() {
      return this;
    });
    __magic__.globalThis = __magic__; // eslint-disable-line no-undef
    delete Object.prototype.__magic__;
  })();

  const $Handlebars = globalThis.Handlebars;

  /* istanbul ignore next */
  Handlebars.noConflict = function() {
    if (globalThis.Handlebars === Handlebars) {
      globalThis.Handlebars = $Handlebars;
    }
    return Handlebars;
  };
}
