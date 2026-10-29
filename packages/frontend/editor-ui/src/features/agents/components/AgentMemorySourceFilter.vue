<script setup lang="ts">
import { computed } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type {
	AgentMemorySourceFacet,
	AgentMemorySourceFacetGroupDto,
	AgentMemorySourceFacetItemDto,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { AgentMemorySourceSelection } from '../composables/useAgentApi';
import { useAgentMemorySourceLabels } from '../composables/useAgentMemorySourceLabels';

/** Sub-menus with more items than this get a search field. */
const SEARCHABLE_MIN_ITEMS = 8;
const ALL_ID = '__all__';

const props = defineProps<{
	groups: AgentMemorySourceFacetGroupDto[];
	disabled?: boolean;
}>();

const selection = defineModel<AgentMemorySourceSelection>({ default: () => ({}) });

const i18n = useI18n();
const { kindIcon, kindLabel } = useAgentMemorySourceLabels();

type MenuItem = DropdownMenuItemProps<string>;

const FACET_HEADERS: Record<AgentMemorySourceFacet, BaseTextKey> = {
	channel: 'agents.builder.memory.entries.filter.channels' as BaseTextKey,
	team: 'agents.builder.memory.entries.filter.teams' as BaseTextKey,
	user: 'agents.builder.memory.entries.filter.users' as BaseTextKey,
};

function selectionId(next: AgentMemorySourceSelection): string {
	return JSON.stringify([next.source, next.sourceFacet, next.sourceFacetId]);
}

function groupLabel(group: AgentMemorySourceFacetGroupDto): string {
	return kindLabel(group.kind) ?? group.kind;
}

function facetLabel(facet: AgentMemorySourceFacet, item: AgentMemorySourceFacetItemDto): string {
	if (item.isViewer)
		return i18n.baseText('agents.builder.memory.entries.source.you' as BaseTextKey);
	if (facet === 'channel') return `#${item.name ?? item.id}`;
	if (item.name) return item.name;
	if (facet === 'user') {
		return i18n.baseText('agents.builder.memory.entries.filter.unknownUser' as BaseTextKey);
	}
	return item.id;
}

/** Every selectable option by its menu id, to resolve a selection and the trigger label. */
const options = computed(() => {
	const byId = new Map<string, { selection: AgentMemorySourceSelection; label: string }>();
	for (const group of props.groups) {
		byId.set(selectionId({ source: group.kind }), {
			selection: { source: group.kind },
			label: groupLabel(group),
		});
		for (const [facet, items] of facetSections(group)) {
			for (const item of items) {
				const next = { source: group.kind, sourceFacet: facet, sourceFacetId: item.id };
				byId.set(selectionId(next), { selection: next, label: facetLabel(facet, item) });
			}
		}
	}
	return byId;
});

function facetSections(
	group: AgentMemorySourceFacetGroupDto,
): Array<[AgentMemorySourceFacet, AgentMemorySourceFacetItemDto[]]> {
	const sections: Array<[AgentMemorySourceFacet, AgentMemorySourceFacetItemDto[] | undefined]> = [
		['channel', group.channels],
		['team', group.teams],
		['user', group.users],
	];
	return sections.flatMap(([facet, items]) => (items?.length ? [[facet, items]] : []));
}

const currentId = computed(() => selectionId(selection.value));

function toFacetItems(
	group: AgentMemorySourceFacetGroupDto,
	facet: AgentMemorySourceFacet,
	items: AgentMemorySourceFacetItemDto[],
	withHeader: boolean,
): MenuItem[] {
	const header: MenuItem = {
		id: `${group.kind}-${facet}-header`,
		label: i18n.baseText(FACET_HEADERS[facet]),
		header: true,
	};
	return [
		...(withHeader ? [header] : []),
		...items.map((item) => {
			const id = selectionId({ source: group.kind, sourceFacet: facet, sourceFacetId: item.id });
			return { id, label: facetLabel(facet, item), checked: id === currentId.value };
		}),
	];
}

function allLabel(group: AgentMemorySourceFacetGroupDto): string {
	if (group.kind === 'users') {
		return i18n.baseText('agents.builder.memory.entries.filter.allUsers' as BaseTextKey);
	}
	return i18n.baseText('agents.builder.memory.entries.filter.allFrom' as BaseTextKey, {
		interpolate: { source: groupLabel(group) },
	});
}

function toGroupItem(group: AgentMemorySourceFacetGroupDto): MenuItem {
	const allId = selectionId({ source: group.kind });
	const sections = facetSections(group);
	// A header only helps to tell sections apart.
	const facetItems = sections.flatMap(([facet, items]) =>
		toFacetItems(group, facet, items, sections.length > 1),
	);
	const allItem: MenuItem = {
		id: allId,
		label: allLabel(group),
		checked: allId === currentId.value,
	};
	return {
		id: `${group.kind}-group`,
		label: groupLabel(group),
		icon: { type: 'icon', value: kindIcon(group.kind) },
		checked: selection.value.source === group.kind,
		searchable: facetItems.length > SEARCHABLE_MIN_ITEMS,
		children: [allItem, ...facetItems],
		testId: `agent-memory-source-group-${group.kind}`,
	};
}

const menuItems = computed<MenuItem[]>(() => [
	{
		id: ALL_ID,
		label: i18n.baseText('agents.builder.memory.entries.filter.all' as BaseTextKey),
		checked: !selection.value.source,
	},
	...props.groups.map((group, index) => ({ ...toGroupItem(group), divided: index === 0 })),
]);

const triggerLabel = computed(() => {
	const label = selection.value.source
		? options.value.get(currentId.value)?.label
		: i18n.baseText('agents.builder.memory.entries.filter.all' as BaseTextKey);
	return i18n.baseText('agents.builder.memory.entries.filter.trigger' as BaseTextKey, {
		interpolate: { source: label ?? '' },
	});
});

function onSelect(id: string) {
	if (id === ALL_ID) {
		selection.value = {};
		return;
	}
	const option = options.value.get(id);
	if (option) selection.value = option.selection;
}
</script>

<template>
	<N8nDropdownMenu
		:items="menuItems"
		:disabled="props.disabled"
		placement="bottom-end"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				:disabled="props.disabled"
				data-testid="agent-memory-source-filter"
			>
				<N8nText>{{ triggerLabel }}</N8nText>
				<N8nIcon icon="chevron-down" size="small" />
			</N8nButton>
		</template>
	</N8nDropdownMenu>
</template>
