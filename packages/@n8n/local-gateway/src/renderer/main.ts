import '@n8n/design-system/css/index.scss';

import { N8nPlugin } from '@n8n/design-system';
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).use(N8nPlugin).mount('#app');
