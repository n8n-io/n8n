import { IconBodyLoaderKey } from '@n8n/design-system';
import { loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import '@n8n/design-system/theme.css';
import '@n8n/design-system/style.css';
import {
	ArcElement,
	BarElement,
	CategoryScale,
	Chart,
	Legend,
	LinearScale,
	Tooltip,
} from 'chart.js';
import { createApp } from 'vue';

import App from './App.vue';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

createApp(App).provide(IconBodyLoaderKey, loadLucideIconBody).mount('#app');
