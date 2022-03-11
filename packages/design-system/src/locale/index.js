import defaultLang from '../locale/lang/en';
import Vue from 'vue';
import Format from './format';

import ElementLocale from 'element-ui/lib/locale';
import ElementLang from 'element-ui/lib/locale/lang/en';
ElementLocale.use(ElementLang);

const format = Format(Vue);
let lang = defaultLang;

export const t = function(path, options) {
	// only support flat keys
	if (lang[path] !== undefined) {
		return format(lang[path], options);
	}

	return '';
};

function override(current, overides = {}) {
	return {
		...current,
		...overides,
	};
}

export const use = function(l, overrides) {
	try {
		const ndsLang = require(`./lang/${l}`);
		lang = override(ndsLang.default, overrides);

		const elLang = require(`element-ui/lib/locale/lang/${l}`);;
		ElementLocale.use(elLang);
	} catch (e) {
	}
};

export default { use, t };
