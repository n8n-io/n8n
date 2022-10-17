// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';

import './plugins';
import 'prismjs';
import 'prismjs/themes/prism.css';
import 'vue-prism-editor/dist/VuePrismEditor.css';
import 'vue-json-pretty/lib/styles.css';

import 'n8n-design-system/css/index.scss';
import './n8n-theme.scss';

import "@fontsource/open-sans/latin-400.css";
import "@fontsource/open-sans/latin-600.css";
import "@fontsource/open-sans/latin-700.css";

import App from '@/App.vue';
import router from './router';

import { runExternalHook } from './components/mixins/externalHooks';
import { TelemetryPlugin } from './plugins/telemetry';
import { I18nPlugin, i18nInstance } from './plugins/i18n';

import { store } from './store';

Vue.config.productionTip = false;
router.afterEach((to, from) => {
	runExternalHook('main.routeChange', store, { from, to });
});

Vue.use(TelemetryPlugin);
Vue.use((vue) => I18nPlugin(vue, store));

// @ts-ignore
window.$loadScript = (src, force = false, props = {}) => {
	return new Promise( (resolve, reject) => {
		const existingEl = document.querySelector(`script[src="${src}"]`);
		if (existingEl && !force) {
			if (existingEl.classList.contains("is-loading")) {
				existingEl.addEventListener("load", resolve);
				existingEl.addEventListener("error", reject);
				existingEl.addEventListener("abort", reject);
			} else {
				// @ts-ignore
				resolve();
			}
			return;
		}
		const el = document.createElement("script");
		el.type = "text/javascript";
		el.async = true;
		el.src = src;
		if (props instanceof Object) {
			if (Object.keys(props).length) {
				for (const key of Object.keys(props)) {
					// @ts-ignore
					el.setAttribute(key, props[key]);
				}
			}
		}
		el.classList.add("is-loading");
		el.addEventListener("load", () => {
			el.classList.remove("is-loading");
			// @ts-ignore
			resolve();
		});
		el.addEventListener("error", reject);
		el.addEventListener("abort", reject);
		document.head.appendChild(el);
	});
};

// @ts-ignore
window.$loadStyle = (href, force = false) => {
	return new Promise( (resolve, reject) => {
		const existingEl = document.querySelector(`link[href="${href}"]`);
		if (existingEl && !force) {
			if (existingEl.classList.contains("is-loading")) {
				existingEl.addEventListener("load", resolve);
				existingEl.addEventListener("error", reject);
				existingEl.addEventListener("abort", reject);
			} else {
				// @ts-ignore
				resolve();
			}
			return;
		}
		const el = document.createElement("link");
		el.rel = "stylesheet";
		el.href = href;
		el.type = 'text/css';
		el.classList.add("is-loading");
		el.addEventListener("load", () => {
			el.classList.remove("is-loading");
			// @ts-ignore
			resolve();
		});
		el.addEventListener("error", reject);
		el.addEventListener("abort", reject);
		document.head.appendChild(el);
	});
};

new Vue({
	i18n: i18nInstance,
	router,
	store,
	render: h => h(App),
}).$mount('#app');

if (import.meta.env.NODE_ENV !== 'production') {
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
