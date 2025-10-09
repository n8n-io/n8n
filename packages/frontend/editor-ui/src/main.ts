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
// Ensure i18n HMR owner is evaluated as early as possible in dev
import '@/dev/i18nHmr';

import App from '@/App.vue';
import router from './router';

import { i18nInstance } from '@n8n/i18n';

import { TelemetryPlugin } from './plugins/telemetry';
import { GlobalComponentsPlugin } from './plugins/components';
import { GlobalDirectivesPlugin } from './plugins/directives';
import { FontAwesomePlugin } from './plugins/icons';

import { createPinia, PiniaVuePlugin } from 'pinia';
import { ChartJSPlugin } from '@/plugins/chartjs';
import { SentryPlugin } from '@/plugins/sentry';
import { registerModuleRoutes } from '@/moduleInitializer/moduleInitializer';

import type { VueScanOptions } from 'z-vue-scan';

const pinia = createPinia();

const app = createApp(App);

app.use(SentryPlugin);

// Register module routes
// We do this here so landing straight on a module page works
registerModuleRoutes(router);

app.use(TelemetryPlugin);
app.use(PiniaVuePlugin);
app.use(FontAwesomePlugin);
app.use(GlobalComponentsPlugin);
app.use(GlobalDirectivesPlugin);
app.use(pinia);
app.use(router);
app.use(i18nInstance);
app.use(ChartJSPlugin);

if (import.meta.env.VUE_SCAN) {
	const { default: VueScan } = await import('z-vue-scan');
	app.use<VueScanOptions>(VueScan, {
		enable: true,
	});
}

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
