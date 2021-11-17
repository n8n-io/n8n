import Vue from 'vue';
import VueI18n from 'vue-i18n';
import englishBaseText from './locales/en';
import axios from 'axios';
import path from 'path';

Vue.use(VueI18n);

// TODO i18n: Remove next line
console.log('About to initialize i18n'); // eslint-disable-line no-console

export const i18n = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	silentTranslationWarn: true,
});

const loadedLanguages = ['en'];

function setLanguage(language: string) {
	i18n.locale = language;
	axios.defaults.headers.common['Accept-Language'] = language;
	document!.querySelector('html')!.setAttribute('lang', language);

	return language;
}

export async function loadLanguage(language?: string) {
	console.log(`loadLanguage called with ${language}`); // eslint-disable-line no-console

	if (!language) return Promise.resolve();

	if (i18n.locale === language) {
		return Promise.resolve(setLanguage(language));
	}

	if (loadedLanguages.includes(language)) {
		return Promise.resolve(setLanguage(language));
	}

	const baseText = require(`./locales/${language}`).default; // TODO i18n: `path.join()`
	i18n.setLocaleMessage(language, baseText);
	loadedLanguages.push(language);

	return setLanguage(language);
}

export function addNodeTranslation(
	nodeTranslation: { [key: string]: object },
	language: string,
) {
	const newNodesBase = {
		'n8n-nodes-base': Object.assign(
			i18n.messages[language]['n8n-nodes-base'] || {},
			nodeTranslation,
		),
	};

	// TODO i18n: Remove next line
	console.log('newNodesBase', newNodesBase); // eslint-disable-line no-console

	i18n.setLocaleMessage(
		language,
		Object.assign(i18n.messages[language], newNodesBase),
	);
}