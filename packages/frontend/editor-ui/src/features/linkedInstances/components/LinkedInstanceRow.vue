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

const props = defineProps<{
	instance: LinkedInstanceSummary;
	checking: boolean;
}>();

const emit = defineEmits<{
	check: [];
	changeToken: [];
	unlink: [];
}>();

const UNLINK = 'unlink';

const i18n = useI18n();
// The row actions repeat on every row, so each action names its row for screen readers.
const nameId = useId();

const status = computed(() => LINKED_INSTANCE_STATUS_DISPLAY[props.instance.status]);

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
	<N8nSettingsRow layout="custom" :data-instance-id="instance.id" data-test-id="linked-instance-row">
		<div :class="$style.content">
			<div :class="$style.info">
				<div :class="$style.titleLine">
					<N8nText :id="nameId" bold size="medium" color="text-dark" :class="$style.wrap">
						{{ instance.name }}
					</N8nText>
					<N8nBadge :variant="status.variant" size="small" data-test-id="linked-instance-status">
						{{ i18n.baseText(status.labelKey) }}
					</N8nBadge>
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
					:disabled="checking"
					:label="
						checking
							? i18n.baseText('settings.linkedInstances.row.checking')
							: i18n.baseText('settings.linkedInstances.row.check')
					"
					:aria-describedby="nameId"
					data-test-id="linked-instance-check"
					@click="emit('check')"
				/>
				<N8nButton
					variant="outline"
					size="small"
					:label="i18n.baseText('settings.linkedInstances.row.changeToken')"
					:aria-describedby="nameId"
					data-test-id="linked-instance-change-token"
					@click="emit('changeToken')"
				/>
				<N8nDropdownMenu :items="menuItems" placement="bottom-end" @select="onMenuSelect">
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
