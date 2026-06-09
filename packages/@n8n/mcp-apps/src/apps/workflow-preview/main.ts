import { createApp } from 'vue';

import { i18n } from '@mcp-apps/i18n';

import App from './App.vue';
import './tokens.scss';

createApp(App).use(i18n).mount('#app');
