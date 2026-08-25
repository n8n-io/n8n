// Every specifier below is a bare package subpath. If any of them needs an alias,
// a Vite plugin, or a `sass` `includePaths` entry to resolve, the package is not
// consumable outside this monorepo — which is the whole question this app answers.
import '@n8n/design-system/style.css';
import '@n8n/design-system/theme.css';
import './styles.scss';

import { IconBodyLoaderKey, loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import { N8nPlugin } from '@n8n/design-system/plugin';
import { createApp } from 'vue';

import App from './App.vue';

const app = createApp(App);
// `app.use(N8nPlugin)` — the conventional call — does not typecheck: N8nPlugin is
// declared `Plugin<N8nPluginOptions>`, and Vue's `Plugin<Options extends unknown[]>`
// reads that single object as a one-element tuple, so the options argument becomes
// required. Passing `{}` is the workaround editor-ui also uses.
app.use(N8nPlugin, {});
app.provide(IconBodyLoaderKey, loadLucideIconBody);
app.mount('#app');
