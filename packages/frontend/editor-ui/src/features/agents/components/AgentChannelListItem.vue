<script setup lang="ts">
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { computed } from 'vue';

type ChannelAction = 'edit' | 'disconnect';

interface Props {
	integration: ChatIntegrationDescriptor;
	connected: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	setup: [channelType: string];
	edit: [channelType: string];
	disconnect: [channelType: string];
}>();

const i18n = useI18n();

const connectedActions = computed<Array<DropdownMenuItemProps<ChannelAction>>>(() => {
	const actions: Array<DropdownMenuItemProps<ChannelAction>> = [
		{
			id: 'edit',
			label: i18n.baseText('generic.edit'),
		},
		{
			id: 'disconnect',
			label: i18n.baseText('generic.disconnect'),
		},
	];

	return actions;
});

function toIconName(icon: string): IconName {
	return icon as IconName;
}

function handleConnectedAction(action: ChannelAction) {
	if (action === 'edit') {
		emit('edit', props.integration.type);
		return;
	}

	emit('disconnect', props.integration.type);
}
</script>

<template>
	<li :class="$style.channelItem">
		<div :class="$style.iconWrapper">
			<N8nIcon
				:icon="integration.icon ? toIconName(integration.icon) : 'zap'"
				:size="28"
				:class="$style.channelIcon"
			/>
		</div>
		<div :class="$style.content">
			<N8nText :class="$style.name" size="medium" bold color="text-dark">
				{{ integration.label }}
			</N8nText>
		</div>

		<div :class="$style.channelActions">
			<N8nDropdownMenu
				v-if="connected"
				:items="connectedActions"
				placement="bottom-end"
				:modal="false"
				@select="handleConnectedAction"
			>
				<template #trigger>
					<N8nButton variant="ghost" size="medium" :class="$style.connectedTrigger">
						<div :class="$style.connectedDotContainer">
							<span :class="[$style.connectedDot, $style.ping]" />
							<span :class="$style.connectedDot" />
						</div>
						{{ i18n.baseText('agents.channels.modal.connected') }}
					</N8nButton>
				</template>
			</N8nDropdownMenu>
			<N8nButton v-else variant="subtle" size="medium" @click="emit('setup', integration.type)">
				{{ i18n.baseText('generic.connect') }}
			</N8nButton>
		</div>
	</li>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.channelItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.channelIcon {
	color: var(--icon-color--strong);
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.channelActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.connectedTrigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.connectedDotContainer {
	display: grid;
	place-content: center;

	> * {
		grid-area: 1 / 1;
	}
}

.connectedDot {
	width: 6px;
	height: 6px;
	border-radius: var(--radius--full);
	background: var(--color--green-500);
}
.ping {
	@include motion.ping;
}
</style>
