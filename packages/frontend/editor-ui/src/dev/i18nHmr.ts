import { i18n, i18nInstance, setLanguage, updateLocaleMessages } from '@n8n/i18n';
import type { LocaleMessages } from '@n8n/i18n/types';
import { locale as designLocale } from '@n8n/design-system';
if (import.meta.hot) {
	// Eagerly import locale JSONs so this module becomes their HMR owner
	const localeModules = import.meta.glob('@n8n/i18n/locales/*.json', { eager: true });
	const localePaths = Object.keys(localeModules);
	const loadLocale = async (lc: string): Promise<LocaleMessages | undefined> => {
		for (const p of localePaths) {
			const match = p.match(/\/locales\/([^/]+)\.json$/);
			if (match?.[1] === lc) {
				const mod: any = (localeModules as Record<string, any>)[p];
				return (mod?.default ?? {}) as LocaleMessages;
			}
		}
		return undefined;
	};
	const applyMessages = (localeCode: string, msgs: LocaleMessages) => {
		updateLocaleMessages(localeCode, msgs as unknown as Record<string, unknown>);
	};

	const pendingLocales = new Set<string>();
	let pendingFiles: string[] = [];
	let flushTimer: number | undefined;

	const flushQueued = async () => {
		const current = (i18nInstance.global.locale.value as string) || 'en';
		if (pendingFiles.length > 0) {
			for (const file of pendingFiles.splice(0)) {
				const lc = file.match(/\/locales\/([^/]+)\.json$/)?.[1] ?? current;
				try {
					const res = await fetch(`/@fs${file}?t=${Date.now()}`);
					const messages = (await res.json()) as LocaleMessages;
					applyMessages(lc, messages);
				} catch {
					const msgs = await loadLocale(lc);
					if (msgs) applyMessages(lc, msgs);
				}
			}
		} else {
			const localesToRefresh = new Set<string>(['en', current, ...pendingLocales]);
			pendingLocales.clear();
			for (const lc of localesToRefresh) {
				const msgs = await loadLocale(lc);
				if (msgs) applyMessages(lc, msgs);
			}
		}

		i18n.clearCache();
		setLanguage(current);
		void designLocale.use(current);
	};

	import.meta.hot.on('n8n:locale-update', (payload: { locales?: string[]; file?: string }) => {
		(payload.locales ?? []).forEach((lc) => pendingLocales.add(lc));
		if (payload.file) pendingFiles.push(payload.file);
		clearTimeout(flushTimer as any);
		flushTimer = window.setTimeout(() => void flushQueued(), 30);
	});
	import.meta.hot.on('custom:n8n:locale-update' as any, (payload: { locales?: string[] }) => {
		(payload.locales ?? []).forEach((lc) => pendingLocales.add(lc));
	});

	import.meta.hot!.accept(localePaths as any, (mods: any[]) => {
		const current = (i18nInstance.global.locale.value as string) || 'en';
		mods.forEach((mod, idx) => {
			const path = localePaths[idx] ?? '';
			const lc = path.match(/\/locales\/([^/]+)\.json$/)?.[1] ?? 'en';
			const messages = (mod?.default ?? {}) as LocaleMessages;
			applyMessages(lc, messages);
		});
		i18n.clearCache();
		setLanguage(current);
		void designLocale.use(current);
	});

	import.meta.hot.on(
		'vite:afterUpdate',
		async (payload: { updates?: Array<{ path?: string; acceptedPath?: string }> }) => {
			const updates = (payload as any)?.updates ?? [];
			const hasLocaleInUpdates = updates.some((u: any) => {
				const p = (u.path || u.acceptedPath || '') as string;
				return p.includes('/locales/') && p.endsWith('.json');
			});
			if (pendingLocales.size === 0 && !hasLocaleInUpdates && pendingFiles.length === 0) return;
			await flushQueued();
		},
	);
}
