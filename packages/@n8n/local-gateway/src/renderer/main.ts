import '@n8n/design-system/css/index.scss';
import './assistant-theme.css';

import { N8nPlugin } from '@n8n/design-system';
import { i18nInstance } from '@n8n/i18n';
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).use(N8nPlugin).use(i18nInstance).mount('#app');
