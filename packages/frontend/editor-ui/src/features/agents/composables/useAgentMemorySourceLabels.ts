import type { AgentMemoryEntrySourceKind, AgentMemoryFilterSource } from '@n8n/api-types';
import { updatedIconSet, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useAgentIntegrationsCatalog } from './useAgentIntegrationsCatalog';

/** A source of a memory row, or a group of the source filter. */
type MemorySourceKind = AgentMemoryEntrySourceKind | AgentMemoryFilterSource;

const SURFACE_ICONS: Partial<Record<MemorySourceKind, IconName>> = {
	users: 'users',
	'n8n-chat': 'message-circle',
	preview: 'flask-conical',
	build: 'wrench',
};

const SURFACE_LABELS: Partial<Record<MemorySourceKind, BaseTextKey>> = {
	users: 'agents.builder.memory.entries.filter.users' as BaseTextKey,
	'n8n-chat': 'agents.builder.memory.entries.source.chat' as BaseTextKey,
	preview: 'agents.builder.memory.entries.source.preview' as BaseTextKey,
	build: 'agents.builder.memory.entries.source.build' as BaseTextKey,
};

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

/** Icons and labels of the integrations and chat surfaces that memories come from. */
export function useAgentMemorySourceLabels() {
	const i18n = useI18n();
	const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();

	function catalogEntry(kind: string) {
		return catalog.value?.find(({ type }) => type === kind);
	}

	function kindIcon(kind: MemorySourceKind): IconName {
		const surfaceIcon = SURFACE_ICONS[kind];
		if (surfaceIcon) return surfaceIcon;
		const icon = catalogEntry(kind)?.icon;
		return isIconName(icon) ? icon : 'zap';
	}

	/** Undefined until the integrations catalog knows the kind. */
	function kindLabel(kind: MemorySourceKind): string | undefined {
		const surfaceLabel = SURFACE_LABELS[kind];
		if (surfaceLabel) return i18n.baseText(surfaceLabel);
		return catalogEntry(kind)?.label;
	}

	return { kindIcon, kindLabel, ensureLoaded };
}
