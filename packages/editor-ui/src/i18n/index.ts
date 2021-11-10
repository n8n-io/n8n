import Vue from 'vue';
import VueI18n from 'vue-i18n';
import englishBaseText from './locales/en';
import axios from 'axios';

Vue.use(VueI18n);

console.log('About to initialize i18n'); // eslint-disable-line no-console

export const i18n = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: englishBaseText,
	silentTranslationWarn: true,
});

const loadedLanguages = ['en'];

function setLanguage(language: string): string {
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

	const { default: { [language]: messages }} = require(`./locales/${language}`);
	i18n.setLocaleMessage(language, messages);
	loadedLanguages.push(language);

	return setLanguage(language);
}

export function addNodeTranslations(translations: { [key: string]: string | object }) {
	const lang = Object.keys(translations)[0];
	const messages = translations[lang];
	const newNodesBase = {
		'n8n-nodes-base': Object.assign(
			i18n.messages[lang]['n8n-nodes-base'],
			messages,
		),
	};
	i18n.setLocaleMessage(lang, Object.assign(i18n.messages[lang], newNodesBase));
}