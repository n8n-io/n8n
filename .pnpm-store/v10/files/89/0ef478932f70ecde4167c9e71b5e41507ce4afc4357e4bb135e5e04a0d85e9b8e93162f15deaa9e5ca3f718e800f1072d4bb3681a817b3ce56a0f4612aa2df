/**
* vue v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var compilerDom = require('@vue/compiler-dom');
var runtimeDom = require('@vue/runtime-dom');
var shared = require('@vue/shared');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    for (var k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return Object.freeze(n);
}

var runtimeDom__namespace = /*#__PURE__*/_interopNamespaceDefault(runtimeDom);

const compileCache = /* @__PURE__ */ Object.create(null);
function compileToFunction(template, options) {
  if (!shared.isString(template)) {
    if (template.nodeType) {
      template = template.innerHTML;
    } else {
      return shared.NOOP;
    }
  }
  const key = shared.genCacheKey(template, options);
  const cached = compileCache[key];
  if (cached) {
    return cached;
  }
  if (template[0] === "#") {
    const el = document.querySelector(template);
    template = el ? el.innerHTML : ``;
  }
  const opts = shared.extend(
    {
      hoistStatic: true,
      onError: void 0,
      onWarn: shared.NOOP
    },
    options
  );
  if (!opts.isCustomElement && typeof customElements !== "undefined") {
    opts.isCustomElement = (tag) => !!customElements.get(tag);
  }
  const { code } = compilerDom.compile(template, opts);
  const render = new Function("Vue", code)(runtimeDom__namespace);
  render._rc = true;
  return compileCache[key] = render;
}
runtimeDom.registerRuntimeCompiler(compileToFunction);

exports.compile = compileToFunction;
Object.keys(runtimeDom).forEach(function (k) {
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = runtimeDom[k];
});
