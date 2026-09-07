import '@n8n/design-system/style.css';
import { N8nPlugin } from '@n8n/design-system';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';

createApp(App).use(N8nPlugin, {}).use(router).mount('#app');
