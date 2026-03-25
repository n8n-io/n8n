'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var en = require('../../locale/lang/en.js');

const buildTranslator = (locale) => (path, option) => translate(path, option, vue.unref(locale));
const translate = (path, option, locale) => lodashUnified.get(locale, path, path).replace(/\{(\w+)\}/g, (_, key) => {
  var _a;
  return `${(_a = option == null ? void 0 : option[key]) != null ? _a : `{${key}}`}`;
});
const buildLocaleContext = (locale) => {
  const lang = vue.computed(() => vue.unref(locale).name);
  const localeRef = vue.isRef(locale) ? locale : vue.ref(locale);
  return {
    lang,
    locale: localeRef,
    t: buildTranslator(locale)
  };
};
const localeContextKey = Symbol("localeContextKey");
const useLocale = (localeOverrides) => {
  const locale = localeOverrides || vue.inject(localeContextKey, vue.ref());
  return buildLocaleContext(vue.computed(() => locale.value || en["default"]));
};

exports.buildLocaleContext = buildLocaleContext;
exports.buildTranslator = buildTranslator;
exports.localeContextKey = localeContextKey;
exports.translate = translate;
exports.useLocale = useLocale;
//# sourceMappingURL=index.js.map
