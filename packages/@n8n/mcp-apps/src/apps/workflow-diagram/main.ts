import { App as McpApp } from '@modelcontextprotocol/ext-apps';
import { createApp } from 'vue';

import RootApp from './App.vue';
import './styles.css';

const mcp = new McpApp({ name: 'Workflow Diagram', version: '0.1.0' });
const app = createApp(RootApp, { mcp });

app.mount('#app');

void mcp.connect();
