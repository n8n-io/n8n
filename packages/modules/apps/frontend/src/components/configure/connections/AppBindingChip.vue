<script setup lang="ts">
import type { AppBindingWarning, AppDescribedBinding } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nLink,
	N8nPopover,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
	BINDING_KINDS,
	PERMISSION_LABELS,
	WARNING_LABELS,
	permissionsOf,
	resourceIdOf,
	togglePermission,
	type BindingPermission,
} from './bindingKinds';

const props = defineProps<{
	binding: AppDescribedBinding;
	projectId: string;
	warning?: AppBindingWarning;
	canUpdate: boolean;
}>();

const emit = defineEmits<{
	update: [permissions: BindingPermission[]];
	remove: [];
}>();

const i18n = useI18n();
const router = useRouter();
const open = ref(false);

const config = computed(() => BINDING_KINDS[props.binding.kind]);
const permissions = computed(() => permissionsOf(props.binding));
const missing = computed(() => 'missing' in props.binding);
const href = computed(() =>
	missing.value
		? undefined
		: router.resolve(config.value.route(props.projectId, resourceIdOf(props.binding))).fullPath,
);

function toggle(permission: BindingPermission, checked: boolean) {
	emit('update', togglePermission(props.binding.kind, permissions.value, permission, checked));
}

function isLastChecked(permission: BindingPermission) {
	return permissions.value.length === 1 && permissions.value[0] === permission;
}

function remove() {
	open.value = false;
	emit('remove');
}
</script>

<template>
	<N8nPopover v-model:open="open" width="260px" align="start">
		<template #trigger>
			<button
				type="button"
				:class="[$style.chip, { [$style.warning]: warning }]"
				:data-test-id="`app-binding-${binding.key}`"
			>
				<N8nIcon :icon="config.icon" :size="14" :class="$style.icon" />
				<span>{{ binding.name }}</span>
				<N8nTooltip v-if="warning" placement="top">
					<N8nIcon
						icon="triangle-alert"
						:size="14"
						:class="$style.warningIcon"
						:data-test-id="`app-binding-${binding.key}-warning`"
					/>
					<template #content>{{ i18n.baseText(WARNING_LABELS[warning.code]) }}</template>
				</N8nTooltip>
			</button>
		</template>
		<template #content>
			<div :class="$style.content" :data-test-id="`app-binding-${binding.key}-details`">
				<div :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.key') }}
					</N8nText>
					<code :class="$style.key">{{ binding.key }}</code>
				</div>
				<div v-if="config.permissions.length > 0" :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.permissions') }}
					</N8nText>
					<N8nCheckbox
						v-for="permission in config.permissions"
						:key="permission"
						:model-value="permissions.includes(permission)"
						:label="i18n.baseText(PERMISSION_LABELS[permission])"
						:disabled="!canUpdate || isLastChecked(permission)"
						:data-test-id="`app-binding-${binding.key}-permission-${permission}`"
						@update:model-value="toggle(permission, $event)"
					/>
				</div>
				<div :class="$style.actions">
					<N8nLink v-if="href" :to="href" :new-window="true" size="small">
						{{ i18n.baseText('apps.configure.connections.open') }}
					</N8nLink>
					<N8nButton
						v-if="canUpdate"
						variant="ghost"
						size="small"
						icon="trash-2"
						:data-test-id="`app-binding-${binding.key}-remove`"
						@click="remove"
					>
						{{ i18n.baseText('apps.configure.connections.remove') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--text-color);
	font-family: inherit;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.warning {
	border-color: var(--color--warning);
}

.icon {
	color: var(--text-color--subtler);
}

.warningIcon {
	color: var(--color--warning);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.key {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
}

.actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
