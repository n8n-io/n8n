<script setup lang="ts">
import type { AppBindingKind } from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
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
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { computed, onScopeDispose, ref } from 'vue';

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
const { debounce } = useDebounce();
const latestFetch = useLatestFetch();

const open = ref(false);
const loading = ref(false);
const resources = ref<BindableResource[]>([]);
const resourceCount = ref(0);
const search = ref('');
const selected = ref<BindableResource>();
const permissions = ref<BindingPermission[]>([]);

const config = computed(() => BINDING_KINDS[props.kind]);
const moreResults = computed(() => Math.max(0, resourceCount.value - resources.value.length));

async function fetchResources(query: string) {
	const isLatest = latestFetch.next();
	loading.value = true;
	try {
		const result = await listBindableResources(
			rootStore.restApiContext,
			props.projectId,
			props.kind,
			query || undefined,
		);
		if (!isLatest()) return;
		resources.value = result.data;
		resourceCount.value = result.count;
	} catch (error) {
		if (!isLatest()) return;
		toast.showError(error, i18n.baseText('apps.configure.connections.listError'));
		open.value = false;
	} finally {
		if (isLatest()) loading.value = false;
	}
}

const fetchResourcesDebounced = debounce(fetchResources, {
	debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
	trailing: true,
});

function onSearch(value: string) {
	latestFetch.invalidate();
	loading.value = true;
	void fetchResourcesDebounced(value.trim());
}

async function onOpen(value: boolean) {
	open.value = value;
	if (!value) {
		fetchResourcesDebounced.cancel();
		latestFetch.invalidate();
		loading.value = false;
		return;
	}
	search.value = '';
	selected.value = undefined;
	resources.value = [];
	resourceCount.value = 0;
	await fetchResources('');
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

onScopeDispose(() => {
	fetchResourcesDebounced.cancel();
	latestFetch.invalidate();
});
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
						@update:model-value="onSearch"
					/>
					<N8nText v-if="loading" size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.loading') }}
					</N8nText>
					<N8nText v-else-if="resources.length === 0" size="small" color="text-light">
						{{ i18n.baseText('apps.configure.connections.empty') }}
					</N8nText>
					<ul v-else :class="$style.list">
						<li v-for="resource in resources" :key="resource.id">
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
					<N8nText
						v-if="!loading && moreResults > 0"
						size="small"
						color="text-light"
						data-test-id="app-binding-picker-more-results"
					>
						{{
							i18n.baseText('apps.configure.connections.moreResults', {
								interpolate: { count: moreResults },
							})
						}}
					</N8nText>
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
