import '@testing-library/jest-dom';
import Vue from 'vue';
import '../plugins';
import { I18nPlugin } from '@/plugins/i18n';

Vue.config.productionTip = false;
Vue.config.devtools = false;

// TODO: Investigate why this is needed
// Without having this 3rd party library imported like this, any component test using 'vue-json-pretty' fail with:
// [Vue warn]: Failed to mount component: template or render function not defined.
Vue.component('vue-json-pretty', require('vue-json-pretty').default);
Vue.use((vue) => I18nPlugin(vue));

