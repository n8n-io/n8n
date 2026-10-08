<script setup lang="ts">
import type { LinkedInstanceSummary } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nDropdownMenu,
	N8nIconButton,
	N8nSettingsRow,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useId } from 'vue';

import { LINKED_INSTANCE_STATUS_DISPLAY } from '../linkedInstanceStatus';
import StableButtonLabel from './StableButtonLabel.vue';

const props = defineProps<{
	instance: LinkedInstanceSummary;
	/** The check result replaces the row, so the other actions are off until it lands. */
	checking: boolean;
	/** The row goes away when the request ends. Until then its actions are off. */
	unlinking: boolean;
}>();

const emit = defineEmits<{
	check: [];
	changeToken: [];
	unlink: [];
}>();

const UNLINK = 'unlink';

const i18n = useI18n();
// The row actions repeat on every row, so each action names its row and its status for screen
// readers. Focus on an action then also tells the result of a link, a check or a token change.
const nameId = useId();
const statusId = useId();
const actionDescription = `${nameId} ${statusId}`;

const status = computed(() => LINKED_INSTANCE_STATUS_DISPLAY[props.instance.status]);
const busy = computed(() => props.checking || props.unlinking);

// Both texts of the check button. The longer one sets the width of the button.
const checkLabels = computed(() => [
	i18n.baseText('settings.linkedInstances.row.check'),
	i18n.baseText('settings.linkedInstances.row.checking'),
]);
const checkLabel = computed(() =>
	i18n.baseText(
		props.checking ? 'settings.linkedInstances.row.checking' : 'settings.linkedInstances.row.check',
	),
);

const defaultProjectLine = computed(() => {
	const project = props.instance.defaultRemoteProject;
	return project
		? i18n.baseText('settings.linkedInstances.row.defaultProject', {
				interpolate: { project: project.name },
			})
		: i18n.baseText('settings.linkedInstances.row.defaultProject.notSet');
});

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: UNLINK,
		label: i18n.baseText('settings.linkedInstances.row.unlink'),
		icon: { type: 'icon', value: 'unlink' },
		destructive: true,
		testId: 'linked-instance-unlink',
	},
]);

function onMenuSelect(id: string) {
	if (id === UNLINK) emit('unlink');
}
</script>

<template>
	<N8nSettingsRow
		layout="custom"
		role="listitem"
		:aria-busy="unlinking || undefined"
		:data-instance-id="instance.id"
		data-test-id="linked-instance-row"
	>
		<div :class="$style.content">
			<div :class="$style.info">
				<div :class="$style.titleLine">
					<N8nText :id="nameId" tag="h2" bold size="medium" color="text-dark" :class="$style.wrap">
						{{ instance.name }}
					</N8nText>
					<N8nBadge
						:id="statusId"
						:variant="status.variant"
						size="small"
						data-test-id="linked-instance-status"
					>
						{{ i18n.baseText(status.labelKey) }}
					</N8nBadge>
					<!-- Here, not next to the buttons, so the buttons do not move when it shows. -->
					<N8nText
						v-if="unlinking"
						size="small"
						color="text-base"
						data-test-id="linked-instance-unlinking"
					>
						{{ i18n.baseText('settings.linkedInstances.row.unlinking') }}
					</N8nText>
				</div>
				<N8nText
					size="small"
					color="text-base"
					:class="$style.wrap"
					data-test-id="linked-instance-url"
				>
					{{ instance.baseUrl }}
				</N8nText>
				<N8nText size="small" color="text-base" data-test-id="linked-instance-default-project">
					{{ defaultProjectLine }}
				</N8nText>
			</div>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					size="small"
					:disabled="busy"
					:aria-describedby="actionDescription"
					data-action="check"
					data-test-id="linked-instance-check"
					@click="emit('check')"
				>
					<StableButtonLabel :label="checkLabel" :labels="checkLabels" />
				</N8nButton>
				<N8nButton
					variant="outline"
					size="small"
					:disabled="busy"
					:label="i18n.baseText('settings.linkedInstances.row.changeToken')"
					:aria-describedby="actionDescription"
					data-test-id="linked-instance-change-token"
					@click="emit('changeToken')"
				/>
				<N8nDropdownMenu
					:items="menuItems"
					:disabled="busy"
					placement="bottom-end"
					@select="onMenuSelect"
				>
					<template #trigger>
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="ellipsis"
							:aria-label="
								i18n.baseText('settings.linkedInstances.row.moreActions', {
									interpolate: { name: instance.name },
								})
							"
							data-action="menu"
							data-test-id="linked-instance-menu"
						/>
					</template>
				</N8nDropdownMenu>
			</div>
		</div>
	</N8nSettingsRow>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs) var(--spacing--sm);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	// Wide enough for a name and a URL; below that width the actions move under the text.
	flex: 1 1 18rem;
	min-width: 0;
}

.titleLine {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.wrap {
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
