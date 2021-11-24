import Vue from 'vue';
import VueI18n from 'vue-i18n';
const englishBaseText = require('./locales/en');
import axios from 'axios';
import { INodeTranslationHeaders } from '@/Interface';

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
	// TODO i18n: Remove next line
	console.log(`loadLanguage called with ${language}`); // eslint-disable-line no-console

	if (!language) return Promise.resolve();

	if (i18n.locale === language) {
		return Promise.resolve(setLanguage(language));
	}

	if (loadedLanguages.includes(language)) {
		return Promise.resolve(setLanguage(language));
	}

	const { numberFormats, ...rest } = require(`./locales/${language}.json`);

	i18n.setLocaleMessage(language, rest);

	if (numberFormats) {
		i18n.setNumberFormat(language, numberFormats);
	}

	loadedLanguages.push(language);

	setLanguage(language);
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

export function addHeaders(
	headers: INodeTranslationHeaders,
	language: string,
) {
	i18n.setLocaleMessage(
		language,
		Object.assign(i18n.messages[language], { headers }),
	);

	// TODO i18n: Remove next line
	console.log(i18n.messages.de.headers); // eslint-disable-line no-console
}