// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';

import 'prismjs';
import 'prismjs/themes/prism.css';
import 'vue-prism-editor/dist/VuePrismEditor.css';
import 'vue-json-pretty/lib/styles.css';
import Vue2TouchEvents from 'vue2-touch-events';

import * as ElementUI from 'element-ui';
// @ts-ignore
import locale from 'element-ui/lib/locale/lang/en';

import './n8n-theme.scss';

import App from '@/App.vue';
import router from './router';

import { runExternalHook } from './components/mixins/externalHooks';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
	faAngleDoubleLeft,
	faAngleDown,
	faAngleRight,
	faAngleUp,
	faArrowRight,
	faAt,
	faBook,
	faBug,
	faCalendar,
	faCheck,
	faCode,
	faCodeBranch,
	faCog,
	faCogs,
	faClone,
	faCloud,
	faCloudDownloadAlt,
	faCopy,
	faCut,
	faDotCircle,
	faEdit,
	faEnvelope,
	faEye,
	faExclamationTriangle,
	faExternalLinkAlt,
	faExchangeAlt,
	faFile,
	faFileArchive,
	faFileCode,
	faFileDownload,
	faFileExport,
	faFileImport,
	faFilePdf,
	faFolderOpen,
	faHdd,
	faHome,
	faHourglass,
	faImage,
	faInbox,
	faInfo,
	faInfoCircle,
	faKey,
	faMapSigns,
	faNetworkWired,
	faPause,
	faPen,
	faPlay,
	faPlayCircle,
	faPlus,
	faQuestion,
	faQuestionCircle,
	faRedo,
	faRss,
	faSave,
	faSearchMinus,
	faSearchPlus,
	faServer,
	faSignInAlt,
	faSlidersH,
	faSpinner,
	faStop,
	faSun,
	faSync,
	faSyncAlt,
	faTable,
	faTasks,
	faTerminal,
	faThLarge,
	faTimes,
	faTrash,
	faUndo,
	faUsers,
	faClock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { store } from './store';

Vue.use(Vue2TouchEvents);

Vue.use(ElementUI, { locale });

library.add(faAngleDoubleLeft);
library.add(faAngleDown);
library.add(faAngleRight);
library.add(faAngleUp);
library.add(faArrowRight);
library.add(faAt);
library.add(faBook);
library.add(faBug);
library.add(faCalendar);
library.add(faCheck);
library.add(faCode);
library.add(faCodeBranch);
library.add(faCog);
library.add(faCogs);
library.add(faClone);
library.add(faCloud);
library.add(faCloudDownloadAlt);
library.add(faCopy);
library.add(faCut);
library.add(faDotCircle);
library.add(faEdit);
library.add(faEnvelope);
library.add(faEye);
library.add(faExclamationTriangle);
library.add(faExternalLinkAlt);
library.add(faExchangeAlt);
library.add(faFile);
library.add(faFileArchive);
library.add(faFileCode);
library.add(faFileDownload);
library.add(faFileExport);
library.add(faFileImport);
library.add(faFilePdf);
library.add(faFolderOpen);
library.add(faHdd);
library.add(faHome);
library.add(faHourglass);
library.add(faImage);
library.add(faInbox);
library.add(faInfo);
library.add(faInfoCircle);
library.add(faKey);
library.add(faMapSigns);
library.add(faNetworkWired);
library.add(faPause);
library.add(faPen);
library.add(faPlay);
library.add(faPlayCircle);
library.add(faPlus);
library.add(faQuestion);
library.add(faQuestionCircle);
library.add(faRedo);
library.add(faRss);
library.add(faSave);
library.add(faSearchMinus);
library.add(faSearchPlus);
library.add(faServer);
library.add(faSignInAlt);
library.add(faSlidersH);
library.add(faSpinner);
library.add(faStop);
library.add(faSun);
library.add(faSync);
library.add(faSyncAlt);
library.add(faTable);
library.add(faTasks);
library.add(faTerminal);
library.add(faThLarge);
library.add(faTimes);
library.add(faTrash);
library.add(faUndo);
library.add(faUsers);
library.add(faClock);

Vue.component('font-awesome-icon', FontAwesomeIcon);

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
