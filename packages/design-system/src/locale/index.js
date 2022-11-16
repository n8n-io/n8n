import defaultLang from '../locale/lang/en';
import Vue from 'vue';
import Format from './format';

import ElementLocale from 'element-ui/lib/locale';
import ElementLang from 'element-ui/lib/locale/lang/en';
ElementLocale.use(ElementLang);

const format = Format(Vue);
let lang = defaultLang;

let i18nHandler;

export const t = function (path, options) {
	if (typeof i18nHandler === 'function') {
		const value = i18nHandler.apply(this, arguments);
		if (value !== null && value !== undefined && value !== path) return String(value);
	}

	// only support flat keys
	if (lang[path] !== undefined) {
		return format(lang[path], options);
	}

	return '';
};

export const use = function (l) {
	try {
		const ndsLang = require(`./lang/${l}`);
		lang = ndsLang.default;

		// todo breaks select empty data
		// const elLang = require(`element-ui/lib/locale/lang/${l}`);;
		// ElementLocale.use(elLang);
	} catch (e) {}
};

export const i18n = function (fn) {
	i18nHandler = fn || i18nHandler;
};

export default { use, t, i18n };
