import { createApp } from 'vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';

import 'vue-json-pretty/lib/styles.css';
import '@n8n/design-system/css/index.scss';
// import '@n8n/design-system/css/tailwind/index.css';

import './n8n-theme.scss';

import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';

import App from '@/App.vue';
import router from './router';

import { TelemetryPlugin } from './plugins/telemetry';
import { i18nInstance } from './plugins/i18n';
import { GlobalComponentsPlugin } from './plugins/components';
import { GlobalDirectivesPlugin } from './plugins/directives';
import { FontAwesomePlugin } from './plugins/icons';

import { createPinia, PiniaVuePlugin } from 'pinia';
import { ChartJSPlugin } from '@/plugins/chartjs';
import { SentryPlugin } from '@/plugins/sentry';

const pinia = createPinia();

const app = createApp(App);

app.use(SentryPlugin);
app.use(TelemetryPlugin);
app.use(PiniaVuePlugin);
app.use(FontAwesomePlugin);
app.use(GlobalComponentsPlugin);
app.use(GlobalDirectivesPlugin);
app.use(pinia);
app.use(router);
app.use(i18nInstance);
app.use(ChartJSPlugin);

app.mount('#app');

if (!import.meta.env.PROD) {
	// Make sure that we get all error messages properly displayed
	// as long as we are not in production mode
	window.onerror = (message, _source, _lineno, _colno, error) => {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		if (message.toString().includes('ResizeObserver')) {
			// That error can apparently be ignored and can probably
			// not do anything about it anyway
			return;
		}
		console.error('error caught in main.ts');
		console.error(message);
		console.error(error);
	};
}
