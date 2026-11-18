import { createApp } from 'vue';
import PrintStudio from '../PrintStudio.vue';
import { studioCopy } from '../copy';
import { sampleWorkflow } from '../sample';
import en from '../../../../../../@n8n/i18n/src/locales/en.json';

createApp(PrintStudio, {
	workflow: sampleWorkflow,
	copy: studioCopy((key) => en[key]),
	allowImport: true,
}).mount('#app');
