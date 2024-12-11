import type { App } from 'vue';

export const ExternalRouterLinksPlugin = {
	install(app: App) {
		const router = app.config.globalProperties.$router;
		document.body.addEventListener(
			'click',
			async (event: MouseEvent) => {
				const target = event.target as HTMLElement;
				const link = target.closest('a') as HTMLAnchorElement;

				if (!link?.href) return;

				const url = new URL(link.href);
				if (url.origin === window.location.origin) {
					const path = url.pathname;
					const hasMatchingRoute = router.getRoutes().some((route) => route.path === path);

					if (hasMatchingRoute) {
						event.preventDefault();
						await router.push(path);
					}
				}
			},
			true,
		);
	},
};
