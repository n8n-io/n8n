import type { App, Plugin } from 'vue';

export const gtagPlugin: Plugin = {
	install(app: App) {
		app.config.globalProperties.$gtag = (event: string, eventData: Record<string, unknown>) => {
			if (window?.dataLayer) window.dataLayer.push({ event, ...eventData });
		};
	},
};
