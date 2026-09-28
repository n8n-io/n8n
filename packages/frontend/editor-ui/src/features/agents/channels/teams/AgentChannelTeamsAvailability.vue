<script setup lang="ts">
/**
 * Where the Teams app may be used and how much it may read there.
 *
 * Shared by the setup stepper and the channel settings, because these are
 * manifest fields: changing one produces a new app package either way.
 */
import { computed, ref } from 'vue';
import { N8nCollapsiblePanel, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

export interface TeamsAvailability {
	teamChannels: boolean;
	groupChats: boolean;
	readAllChannelMessages: boolean;
	readAllGroupMessages: boolean;
}

const value = defineModel<TeamsAvailability>({ required: true });

const props = withDefaults(defineProps<{ startCollapsed?: boolean }>(), {
	startCollapsed: false,
});

const i18n = useI18n();

// Local, because `startCollapsed` is only where the panel begins: bound
// straight to the panel, the open state it emits has nothing to apply it.
const open = ref(!props.startCollapsed);

function set(patch: Partial<TeamsAvailability>) {
	const next = { ...value.value, ...patch };
	// A read permission without its surface is rejected by the backend schema, so
	// it cannot be left on when its scope goes off.
	if (!next.teamChannels) next.readAllChannelMessages = false;
	if (!next.groupChats) next.readAllGroupMessages = false;
	value.value = next;
}

const K = 'agents.channels.teams.setup.availability';

// A read permission is offered only under its surface, which it depends on.
const rows = computed(() => [
	{
		key: 'teamChannels' as const,
		label: `${K}.teamChannels` as const,
		hint: `${K}.teamChannelsHint` as const,
		testId: 'teams-scope-channels',
		nested: false,
		shown: true,
	},
	{
		key: 'readAllChannelMessages' as const,
		label: `${K}.readAllChannelMessages` as const,
		hint: `${K}.readAllChannelMessagesHint` as const,
		testId: 'teams-read-channels',
		nested: true,
		shown: value.value.teamChannels,
	},
	{
		key: 'groupChats' as const,
		label: `${K}.groupChats` as const,
		hint: `${K}.groupChatsHint` as const,
		testId: 'teams-scope-groups',
		nested: false,
		shown: true,
	},
	{
		key: 'readAllGroupMessages' as const,
		label: `${K}.readAllGroupMessages` as const,
		hint: `${K}.readAllGroupMessagesHint` as const,
		testId: 'teams-read-groups',
		nested: true,
		shown: value.value.groupChats,
	},
]);

/** A collapsed panel still has to say what it is set to. */
const summary = computed(() =>
	[
		`${K}.directChat`,
		value.value.teamChannels && `${K}.teamChannels`,
		value.value.readAllChannelMessages && `${K}.readsChannels`,
		value.value.groupChats && `${K}.groupChats`,
		value.value.readAllGroupMessages && `${K}.readsGroupChats`,
	]
		.filter((key): key is BaseTextKey => Boolean(key))
		.map((key) => i18n.baseText(key))
		.join(i18n.baseText(`${K}.summarySeparator`)),
);
</script>

<template>
	<N8nCollapsiblePanel v-model="open" :class="$style.panel">
		<template #title>
			<span :class="$style.panelTitle">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.teams.setup.availability.whereTitle') }}
				</N8nText>
				<N8nText size="small" :class="$style.hint" data-testid="teams-where-summary">
					{{ summary }}
				</N8nText>
			</span>
		</template>

		<div :class="$style.panelBody">
			<template v-for="row in rows" :key="row.key">
				<div v-if="row.shown" :class="[$style.row, { [$style.nested]: row.nested }]">
					<div :class="$style.rowText">
						<N8nText size="small">{{ i18n.baseText(row.label) }}</N8nText>
						<N8nText size="small" :class="$style.hint">{{ i18n.baseText(row.hint) }}</N8nText>
					</div>
					<N8nSwitch2
						:model-value="value[row.key]"
						:aria-label="i18n.baseText(row.label)"
						:data-testid="row.testId"
						@update:model-value="set({ [row.key]: $event })"
					/>
				</div>
			</template>
		</div>
	</N8nCollapsiblePanel>
</template>

<style module lang="scss">
.panel {
	width: 100%;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);
}

.panelTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	text-align: left;
	/* Air between the chevron and the heading. */
	padding-left: var(--spacing--3xs);
}

/* One left edge for every row and note, matching the header's own padding. */
.panelBody {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
}

.rowText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.hint {
	color: var(--text-color--subtler);
}

.nested {
	padding-left: var(--spacing--md);
}
</style>
