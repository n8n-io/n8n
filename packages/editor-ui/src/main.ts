// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';

import * as ElementUI from 'element-ui';
// @ts-ignore
import locale from 'element-ui/lib/locale/lang/en';

import './n8n-theme.scss';

import App from '@/App.vue';
import router from './router';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
	faAngleDoubleLeft,
	faAngleDown,
	faAngleRight,
	faAngleUp,
	faAt,
	faBug,
	faCalendar,
	faCheck,
	faCode,
	faCog,
	faCogs,
	faClone,
	faCloud,
	faCopy,
	faDotCircle,
	faEnvelope,
	faExclamationTriangle,
	faExternalLinkAlt,
	faFile,
	faFileDownload,
	faFolderOpen,
	faGlobe,
	faHdd,
	faHourglass,
	faImage,
	faInbox,
	faInfo,
	faInfoCircle,
	faKey,
	faNetworkWired,
	faPause,
	faPen,
	faPlay,
	faPlayCircle,
	faPlus,
	faQuestionCircle,
	faRedo,
	faRss,
	faSave,
	faSearchMinus,
	faSearchPlus,
	faSlidersH,
	faSpinner,
	faStop,
	faSun,
	faSync,
	faSyncAlt,
	faTable,
	faTasks,
	faTerminal,
	faTimes,
	faTrash,
	faUndo,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { store } from './store';
Vue.use(ElementUI, { locale });

library.add(faAngleDoubleLeft);
library.add(faAngleDown);
library.add(faAngleRight);
library.add(faAngleUp);
library.add(faAt);
library.add(faBug);
library.add(faCalendar);
library.add(faCheck);
library.add(faCode);
library.add(faCog);
library.add(faCogs);
library.add(faClone);
library.add(faCloud);
library.add(faCopy);
library.add(faDotCircle);
library.add(faEnvelope);
library.add(faExclamationTriangle);
library.add(faExternalLinkAlt);
library.add(faFile);
library.add(faFileDownload);
library.add(faFolderOpen);
library.add(faGlobe);
library.add(faHdd);
library.add(faHourglass);
library.add(faImage);
library.add(faInbox);
library.add(faInfo);
library.add(faInfoCircle);
library.add(faKey);
library.add(faNetworkWired);
library.add(faPause);
library.add(faPen);
library.add(faPlay);
library.add(faPlayCircle);
library.add(faPlus);
library.add(faQuestionCircle);
library.add(faRedo);
library.add(faRss);
library.add(faSave);
library.add(faSearchMinus);
library.add(faSearchPlus);
library.add(faSlidersH);
library.add(faSpinner);
library.add(faStop);
library.add(faSun);
library.add(faSync);
library.add(faSyncAlt);
library.add(faTable);
library.add(faTasks);
library.add(faTerminal);
library.add(faTimes);
library.add(faTrash);
library.add(faUndo);

Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.config.productionTip = false;

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
		console.error('error cought in main.ts');
		console.error(message);
		console.error(error);
	};
}
