// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';

import './plugins';
import 'prismjs';
import 'prismjs/themes/prism.css';
import 'vue-prism-editor/dist/VuePrismEditor.css';
import 'vue-json-pretty/lib/styles.css';
import './n8n-theme.scss';

import App from '@/App.vue';
import router from './router';

import { runExternalHook } from './components/mixins/externalHooks';

import { store } from './store';

Vue.config.productionTip = false;
router.afterEach((to, from) => {
	runExternalHook('main.routeChange', store, { from, to });
});

new Vue({
	router,
	store,
	render: h => h(App),
}).$mount('#app');

if (process.env.NODE_ENV !== 'production') {
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
