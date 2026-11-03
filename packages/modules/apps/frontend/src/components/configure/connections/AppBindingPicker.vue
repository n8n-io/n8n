<script setup lang="ts">
import type { AppBindingKind } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCheckbox,
	N8nIconButton,
	N8nInput,
	N8nPopover,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { listBindableResources, type BindableResource } from '../../../apps.api';
import {
	BINDING_KINDS,
	PERMISSION_LABELS,
	togglePermission,
	type BindingPermission,
} from './bindingKinds';

const props = defineProps<{
	kind: AppBindingKind;
	projectId: string;
	boundIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
	add: [resource: BindableResource, permissions: BindingPermission[]];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const open = ref(false);
const loading = ref(false);
const resources = ref<BindableResource[]>([]);
const search = ref('');
const selected = ref<BindableResource>();
const permissions = ref<BindingPermission[]>([]);

const config = computed(() => BINDING_KINDS[props.kind]);
const visible = computed(() => {
	const query = search.value.trim().toLowerCase();
	return resources.value.filter((resource) => resource.name.toLowerCase().includes(query));
});

async function onOpen(value: boolean) {
	open.value = value;
	if (!value) return;
	search.value = '';
	selected.value = undefined;
	loading.value = true;
	try {
		resources.value = await listBindableResources(
			rootStore.restApiContext,
			props.projectId,
			props.kind,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.configure.connections.listError'));
		open.value = false;
	} finally {
		loading.value = false;
	}
}

function add(resource: BindableResource, chosen: BindingPermission[]) {
	open.value = false;
	emit('add', resource, chosen);
}

function choose(resource: BindableResource) {
	if (config.value.permissions.length === 0) {
		add(resource, []);
		return;
	}
	selected.value = resource;
	permissions.value = [...config.value.defaultPermissions];
}

function toggle(permission: BindingPermission, checked: boolean) {
	permissions.value = togglePermission(props.kind, permissions.value, permission, checked);
}
</script>

<template>
	<N8nPopover :open="open" width="280px" max-height="320px" align="start" @update:open="onOpen">
		<template #trigger>
			<span>
				<N8nTooltip :content="i18n.baseText(config.addLabel)" placement="top">
					<N8nIconButton
						icon="plus"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText(config.addLabel)"
						:data-test-id="`app-binding-add-${kind}`"
					/>
				</N8nTooltip>
			</span>
		</template>
		<template #content>
			<div :class="$style.content" :data-test-id="`app-binding-picker-${kind}`">
				<template v-if="selected">
					<N8nText bold>{{ selected.name }}</N8nText>
					<N8nCheckbox
						v-for="permission in config.permissions"
						:key="permission"
						:model-value="permissions.includes(permission)"
						:label="i18n.baseText(PERMISSION_LABELS[permission])"
						:data-test-id="`app-binding-picker-permission-${permission}`"
						@update:model-value="toggle(permission, $event)"
					/>
					<N8nButton
						size="small"
						:disabled="permissions.length === 0"
						data-test-id="app-binding-picker-confirm"
						@click="add(selected, permissions)"
					>
						{{ i18n.baseText('apps.configure.connections.add') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nInput
						v-model="search"
						size="small"
						:placeholder="i18n.baseText('apps.configure.connections.search')"
						data-test-id="app-binding-picker-search"
					/>
					<N8nText v-if="loading" size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.loading') }}
					</N8nText>
					<N8nText v-else-if="visible.length === 0" size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.empty') }}
					</N8nText>
					<ul v-else :class="$style.list">
						<li v-for="resource in visible" :key="resource.id">
							<button
								type="button"
								:class="$style.item"
								:disabled="boundIds.has(resource.id)"
								:data-test-id="`app-binding-picker-item-${resource.id}`"
								@click="choose(resource)"
							>
								{{ resource.name }}
							</button>
						</li>
					</ul>
				</template>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	color: var(--text-color);
	font-family: inherit;
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;

	&:hover:not(:disabled) {
		background-color: var(--background--hover);
	}

	&:disabled {
		color: var(--text-color--subtler);
		cursor: not-allowed;
	}
}
</style>
