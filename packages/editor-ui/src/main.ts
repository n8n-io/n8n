import { h, createApp } from 'vue';

import 'prismjs';
import 'prismjs/themes/prism.css';
import 'vue-prism-editor/dist/VuePrismEditor.css';
import 'vue-json-pretty/lib/styles.css';

import 'n8n-design-system-next/n8n.scss';

// import 'n8n-design-system/css/index.scss';
import './n8n-theme.scss';

import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';

import App from '@/App.vue';
import router from './router';

// import { runExternalHook } from '@/mixins/externalHooks';
import { ComponentsPlugin, i18nInstance, I18nPlugin, TelemetryPlugin } from './plugins';

import { createPinia, PiniaVuePlugin } from 'pinia';

// import { useWebhooksStore } from './stores/webhooks';
//
// import Vue2TouchEvents from 'vue2-touch-events';
// import vClickOutside from 'v-click-outside';

const pinia = createPinia();

const app = createApp(App);

app.use(router);
app.use(ComponentsPlugin);
app.use(TelemetryPlugin);
app.use(I18nPlugin);
app.use(i18nInstance);
app.use(pinia);
app.use(PiniaVuePlugin);

// app.use(Vue2TouchEvents);
// app.use(vClickOutside);

app.mount('#app');

// router.afterEach((to, from) => {
// 	runExternalHook('main.routeChange', useWebhooksStore(), { from, to });
// });

if (!import.meta.env.PROD) {
	// Make sure that we get all error messages properly displayed
	// as long as we are not in production mode
	window.onerror = (message, source, lineno, colno, error) => {
		if (message.toString().includes('ResizeObserver')) {
			// That error can apparently be ignored and can probably
			// not do anything about it anyway
			return;
		}
		console.error('error caught in main.ts'); // eslint-disable-line no-console
		console.error(message); // eslint-disable-line no-console
		console.error(error); // eslint-disable-line no-console
	};
}
