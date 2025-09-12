import { i18n, i18nInstance, setLanguage, updateLocaleMessages } from '@n8n/i18n';
import type { LocaleMessages } from '@n8n/i18n/types';
import { locale as designLocale } from '@n8n/design-system';

if (import.meta.hot) {
	// Eagerly import locale JSONs so this module becomes their HMR owner
	const localeModules = import.meta.glob('@n8n/i18n/locales/*.json', { eager: true }) as Record<
		string,
		{ default?: LocaleMessages }
	>;
	const localePaths = Object.keys(localeModules);

	const lcOf = (p: string) => p.match(/\/locales\/([^/]+)\.json$/)?.[1] ?? 'en';
	const apply = (lc: string, msgs: LocaleMessages) =>
		updateLocaleMessages(lc, msgs as unknown as Record<string, unknown>);
	const refresh = () => {
		const current = (i18nInstance.global.locale.value as string) || 'en';
		i18n.clearCache();
		setLanguage(current);
		void designLocale.use(current);
	};
	// Fetch with cache-buster to avoid stale content (one-update-behind);
	// falls back to the eager map if network fetch is unavailable.
	const fetchAndApply = async (file: string) => {
		try {
			const res = await fetch(`/@fs${file}?t=${Date.now()}`);
			apply(lcOf(file), (await res.json()) as LocaleMessages);
		} catch {
			const msgs = localeModules[file]?.default;
			if (msgs) apply(lcOf(file), msgs);
		}
	};

	// 1) Apply fresh modules provided by Vite HMR
	import.meta.hot.accept(localePaths, (mods) => {
		mods.forEach((mod, i) => apply(lcOf(localePaths[i] ?? 'en'), (mod as any)?.default ?? {}));
		refresh();
	});

	// 2) Handle explicit locale update events (fetch ensures latest content)
	import.meta.hot.on(
		'n8n:locale-update',
		async (payload: { locales?: string[]; file?: string }) => {
			if (payload.file) await fetchAndApply(payload.file);
			refresh();
		},
	);

	// 3) Last resort for cases where accept doesn’t trigger
	import.meta.hot.on(
		'vite:afterUpdate',
		async (payload: { updates?: Array<{ path?: string; acceptedPath?: string }> }) => {
			const updates = payload?.updates ?? [];
			const files = updates
				.map((u) => (u.path || u.acceptedPath || '') as string)
				.filter((p) => p.includes('/locales/') && p.endsWith('.json'));
			if (files.length === 0) return;
			for (const file of files) await fetchAndApply(file);
			refresh();
		},
	);
}
