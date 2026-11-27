import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { Themed } from 'n8n-workflow';
import { computed, onBeforeUnmount, ref } from 'vue';

import { ANY_TRIGGER, TRIGGER_OPTIONS } from '../runtime-credentials.presets';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';

/** The props of `N8nNodeIcon` that this page uses. */
export type TypeIcon =
	| { type: 'file'; src: string }
	| { type: 'icon'; name: string; color?: string }
	| { type: 'unknown' };

type IconFields = {
	icon?: Themed<string>;
	iconUrl?: Themed<string>;
	iconColor?: string;
};

type AppliedTheme = 'light' | 'dark';

const ABSOLUTE_URL = /^(https?:)?\/\//;

/**
 * The theme that the editor shows. The editor sets `data-theme` on the body, or removes it to
 * follow the system. A module cannot read the editor's UI store, so it reads the same signal.
 */
function useAppliedTheme() {
	const bodyTheme = ref(document.body.getAttribute('data-theme'));
	const query =
		typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-color-scheme: dark)')
			: undefined;
	const prefersDark = ref(query?.matches ?? false);

	const observer = new MutationObserver(() => {
		bodyTheme.value = document.body.getAttribute('data-theme');
	});
	observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
	const onQueryChange = (event: MediaQueryListEvent) => {
		prefersDark.value = event.matches;
	};
	query?.addEventListener('change', onQueryChange);
	onBeforeUnmount(() => {
		observer.disconnect();
		query?.removeEventListener('change', onQueryChange);
	});

	return computed<AppliedTheme>(() => {
		if (bodyTheme.value === 'dark' || bodyTheme.value === 'light') return bodyTheme.value;
		return prefersDark.value ? 'dark' : 'light';
	});
}

function themed(value: Themed<string> | undefined, theme: AppliedTheme): string | undefined {
	return typeof value === 'object' ? value[theme] : value;
}

/** Follows the editor's icon resolution, which a module cannot import. */
function resolveIcon(
	fields: IconFields,
	theme: AppliedTheme,
	baseUrl: string,
): TypeIcon | undefined {
	const iconUrl = themed(fields.iconUrl, theme);
	if (iconUrl) {
		return { type: 'file', src: ABSOLUTE_URL.test(iconUrl) ? iconUrl : baseUrl + iconUrl };
	}
	const icon = themed(fields.icon, theme);
	const color = fields.iconColor ? `var(--node--icon--color--${fields.iconColor})` : undefined;
	if (icon?.startsWith('fa:')) return { type: 'icon', name: icon.slice('fa:'.length), color };
	// `node:<package>.<type>` points at a node type, so it has no icon of its own here.
	if (icon?.startsWith('node:') && !icon.includes('.')) return { type: 'icon', name: icon, color };
	return undefined;
}

const FALLBACK_CREDENTIAL_ICON: TypeIcon = { type: 'icon', name: 'key-round' satisfies IconName };
const FALLBACK_NODE_ICON: TypeIcon = { type: 'icon', name: 'zap' satisfies IconName };

/** Names and icons for the node and credential types a rule mentions. */
export function useTypeIcons() {
	const i18n = useI18n();
	const store = useRuntimeCredentialsStore();
	const rootStore = useRootStore();
	const theme = useAppliedTheme();

	function credentialIcon(name: string, visited = new Set<string>()): TypeIcon {
		const info = store.credentialTypes.get(name);
		if (!info || visited.has(name)) return FALLBACK_CREDENTIAL_ICON;
		visited.add(name);
		const own = resolveIcon(info, theme.value, rootStore.baseUrl);
		if (own) return own;
		for (const parent of info.extends ?? []) {
			const inherited = credentialIcon(parent, visited);
			if (inherited !== FALLBACK_CREDENTIAL_ICON) return inherited;
		}
		return FALLBACK_CREDENTIAL_ICON;
	}

	function credentialLabel(name: string): string {
		return store.credentialTypes.get(name)?.displayName ?? name;
	}

	function nodeIcon(nodeType: string): TypeIcon {
		const option = TRIGGER_OPTIONS.find((candidate) => candidate.nodeType === nodeType);
		const info = store.nodeTypes.get(nodeType);
		const resolved = info ? resolveIcon(info, theme.value, rootStore.baseUrl) : undefined;
		if (resolved) return resolved;
		return option ? { type: 'icon', name: option.fallbackIcon } : FALLBACK_NODE_ICON;
	}

	function nodeLabel(nodeType: string): string {
		if (nodeType === ANY_TRIGGER) return i18n.baseText('runtimeCredentials.wizard.trigger.any');
		const option = TRIGGER_OPTIONS.find((candidate) => candidate.nodeType === nodeType);
		if (option) return i18n.baseText(option.labelKey);
		return store.nodeTypes.get(nodeType)?.displayName ?? nodeType;
	}

	return { credentialIcon, credentialLabel, nodeIcon, nodeLabel };
}
