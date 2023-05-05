// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';

import './plugins';
import 'vue-json-pretty/lib/styles.css';
import '@jsplumb/browser-ui/css/jsplumbtoolkit.css';
import 'n8n-design-system/css/index.scss';
import './n8n-theme.scss';

import './styles/autocomplete-theme.scss';

import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';

import App from '@/App.vue';
import router from './router';

import { runExternalHook } from '@/utils';
import { TelemetryPlugin } from './plugins/telemetry';
import { I18nPlugin, i18nInstance } from './plugins/i18n';

import { createPinia, PiniaVuePlugin } from 'pinia';

import { useWebhooksStore, useUsersStore } from '@/stores';
import { VIEWS } from '@/constants';

Vue.config.productionTip = false;

Vue.use(TelemetryPlugin);
Vue.use((vue) => I18nPlugin(vue));
Vue.use(PiniaVuePlugin);

const pinia = createPinia();

new Vue({
	i18n: i18nInstance,
	router,
	pinia,
	render: (h) => h(App),
}).$mount('#app');

router.afterEach((to, from) => {
	runExternalHook('main.routeChange', useWebhooksStore(), { from, to });
	const userStore = useUsersStore();
	if (userStore.currentUser && to.name && to.name !== VIEWS.SIGNOUT && !to.name.includes('Modal')) {
		userStore.showUserActivationSurveyModal();
	}
});

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
