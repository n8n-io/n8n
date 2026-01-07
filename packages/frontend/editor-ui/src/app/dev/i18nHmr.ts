import { i18n, i18nInstance, setLanguage, updateLocaleMessages } from '@n8n/i18n';
import type { LocaleMessages } from '@n8n/i18n/types';
import { locale as designLocale } from '@n8n/design-system';

const hot = import.meta.hot;
const DEFAULT_LOCALE = 'en';

if (hot) {
	// Eagerly import locale JSONs so this module becomes their HMR owner
	const localeModules = import.meta.glob('@n8n/i18n/locales/*.json', { eager: true }) as Record<
		string,
		{ default?: LocaleMessages }
	>;
	const localePaths = Object.keys(localeModules);

	const lcOf = (p: string) => p.match(/\/locales\/([^/]+)\.json$/)?.[1] ?? DEFAULT_LOCALE;
	const apply = (lc: string, msgs: LocaleMessages) => updateLocaleMessages(lc, msgs);

	// Seed all locales on initial load in dev so switching locales
	// does not require component-level dynamic imports (avoids hard reload chains)
	for (const p of localePaths) {
		const lc = lcOf(p);
		const msgs = (localeModules[p] as { default?: LocaleMessages })?.default;
		if (msgs && lc) apply(lc, msgs);
	}
	const refresh = () => {
		const current = (i18nInstance.global.locale.value as string) || DEFAULT_LOCALE;
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
	hot.accept(localePaths, (mods) => {
		mods.forEach((mod, i) => apply(lcOf(localePaths[i] ?? DEFAULT_LOCALE), mod?.default ?? {}));
		refresh();
	});

	// 2) Handle explicit locale update events (fetch ensures latest content)
	hot.on('n8n:locale-update', async (payload: { locales?: string[]; file?: string }) => {
		if (payload.file) await fetchAndApply(payload.file);
		refresh();
	});

	// 3) Last resort for cases where accept doesn’t trigger
	hot.on(
		'vite:afterUpdate',
		async (payload: { updates?: Array<{ path?: string; acceptedPath?: string }> }) => {
			const updates = payload?.updates ?? [];
			const files = updates
				.map((u) => (u.path ?? u.acceptedPath ?? '') as string)
				.filter((p) => p.includes('/locales/') && p.endsWith('.json'));
			if (files.length === 0) return;
			for (const file of files) await fetchAndApply(file);
			refresh();
		},
	);
}
