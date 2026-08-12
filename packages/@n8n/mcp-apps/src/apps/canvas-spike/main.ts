import { N8nPlugin } from '@n8n/design-system';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';

import '../workflow-preview/tokens.scss';

import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.use(N8nPlugin, {});
app.mount('#app');
