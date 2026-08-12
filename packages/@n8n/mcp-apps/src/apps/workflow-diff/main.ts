import { N8nPlugin } from '@n8n/design-system';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { i18n } from '@mcp-apps/i18n';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';

import App from './App.vue';
import '../workflow-preview/tokens.scss';

createApp(App).use(i18n).use(createPinia()).use(N8nPlugin, {}).mount('#app');
