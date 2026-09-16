<script setup lang="ts">
/**
 * Where the Teams app may be used and how much it may read there.
 *
 * Shared by the setup stepper and the channel settings, because these are
 * manifest fields: changing one produces a new app package either way.
 */
import { computed, ref } from 'vue';
import { N8nCollapsiblePanel, N8nIcon, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

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

// Local, because `startCollapsed` is only where the panels begin. Binding it
// straight to the panel made them emit an open state that nothing applied, so
// they never opened.
const whereOpen = ref(!props.startCollapsed);
const readingOpen = ref(!props.startCollapsed);

function set(patch: Partial<TeamsAvailability>) {
	const next = { ...value.value, ...patch };
	// A read permission without its surface is rejected by the backend schema, so
	// it cannot be left on when its scope goes off.
	if (!next.teamChannels) next.readAllChannelMessages = false;
	if (!next.groupChats) next.readAllGroupMessages = false;
	value.value = next;
}

/** Collapsed panels still have to say what they are set to. */
const whereSummary = computed(() =>
	[
		i18n.baseText('agents.channels.teams.setup.availability.directChat'),
		...(value.value.teamChannels
			? [i18n.baseText('agents.channels.teams.setup.availability.teamChannels')]
			: []),
		...(value.value.groupChats
			? [i18n.baseText('agents.channels.teams.setup.availability.groupChats')]
			: []),
	].join(', '),
);

const readingSummary = computed(() => {
	const reads = [
		...(value.value.readAllChannelMessages
			? [i18n.baseText('agents.channels.teams.setup.availability.readAllChannelMessages')]
			: []),
		...(value.value.readAllGroupMessages
			? [i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessages')]
			: []),
	];
	return reads.length > 0
		? reads.join(', ')
		: i18n.baseText('agents.channels.teams.setup.availability.readingSummaryNone');
});
</script>

<template>
	<div :class="$style.panels">
		<N8nCollapsiblePanel v-model="whereOpen" :class="$style.panel">
			<template #title>
				<span :class="$style.panelTitle">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.teams.setup.availability.whereTitle') }}
					</N8nText>
					<N8nText size="small" :class="$style.hint" data-testid="teams-where-summary">
						{{ whereSummary }}
					</N8nText>
				</span>
			</template>

			<div :class="$style.panelBody">
				<div :class="$style.row" data-testid="teams-scope-direct">
					<div :class="$style.rowText">
						<N8nText size="small">
							{{ i18n.baseText('agents.channels.teams.setup.availability.directChat') }}
						</N8nText>
						<N8nText size="small" :class="$style.hint">
							{{ i18n.baseText('agents.channels.teams.setup.availability.directChatHint') }}
						</N8nText>
					</div>
					<!-- Fixed, so a tick rather than a control that cannot move. -->
					<N8nIcon icon="check" size="small" :class="$style.fixed" />
				</div>

				<div :class="$style.row">
					<div :class="$style.rowText">
						<N8nText size="small">
							{{ i18n.baseText('agents.channels.teams.setup.availability.teamChannels') }}
						</N8nText>
						<N8nText size="small" :class="$style.hint">
							{{ i18n.baseText('agents.channels.teams.setup.availability.teamChannelsHint') }}
						</N8nText>
					</div>
					<N8nSwitch2
						:model-value="value.teamChannels"
						:aria-label="i18n.baseText('agents.channels.teams.setup.availability.teamChannels')"
						data-testid="teams-scope-channels"
						@update:model-value="set({ teamChannels: $event })"
					/>
				</div>

				<div :class="$style.row">
					<div :class="$style.rowText">
						<N8nText size="small">
							{{ i18n.baseText('agents.channels.teams.setup.availability.groupChats') }}
						</N8nText>
						<N8nText size="small" :class="$style.hint">
							{{ i18n.baseText('agents.channels.teams.setup.availability.groupChatsHint') }}
						</N8nText>
					</div>
					<N8nSwitch2
						:model-value="value.groupChats"
						:aria-label="i18n.baseText('agents.channels.teams.setup.availability.groupChats')"
						data-testid="teams-scope-groups"
						@update:model-value="set({ groupChats: $event })"
					/>
				</div>
			</div>
		</N8nCollapsiblePanel>

		<N8nCollapsiblePanel v-model="readingOpen" :class="$style.panel">
			<template #title>
				<span :class="$style.panelTitle">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.teams.setup.availability.readingTitle') }}
					</N8nText>
					<N8nText size="small" :class="$style.hint" data-testid="teams-reading-summary">
						{{ readingSummary }}
					</N8nText>
				</span>
			</template>

			<div :class="$style.panelBody">
				<N8nText size="small" :class="$style.hint">
					{{ i18n.baseText('agents.channels.teams.setup.availability.readingNote') }}
				</N8nText>

				<div :class="$style.row">
					<div :class="$style.rowText">
						<N8nText size="small" :class="{ [$style.hint]: !value.teamChannels }">
							{{ i18n.baseText('agents.channels.teams.setup.availability.readAllChannelMessages') }}
						</N8nText>
						<N8nText size="small" :class="$style.hint">
							{{
								i18n.baseText('agents.channels.teams.setup.availability.readAllChannelMessagesHint')
							}}
						</N8nText>
					</div>
					<N8nSwitch2
						:model-value="value.readAllChannelMessages"
						:disabled="!value.teamChannels"
						:aria-label="
							i18n.baseText('agents.channels.teams.setup.availability.readAllChannelMessages')
						"
						data-testid="teams-read-channels"
						@update:model-value="set({ readAllChannelMessages: $event })"
					/>
				</div>

				<div :class="$style.row">
					<div :class="$style.rowText">
						<N8nText size="small" :class="{ [$style.hint]: !value.groupChats }">
							{{ i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessages') }}
						</N8nText>
						<N8nText size="small" :class="$style.hint">
							{{
								i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessagesHint')
							}}
						</N8nText>
					</div>
					<N8nSwitch2
						:model-value="value.readAllGroupMessages"
						:disabled="!value.groupChats"
						:aria-label="
							i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessages')
						"
						data-testid="teams-read-groups"
						@update:model-value="set({ readAllGroupMessages: $event })"
					/>
				</div>
			</div>
		</N8nCollapsiblePanel>
	</div>
</template>

<style module lang="scss">
.panels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

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

.fixed {
	color: var(--text-color--subtler);
	flex-shrink: 0;
}
</style>
