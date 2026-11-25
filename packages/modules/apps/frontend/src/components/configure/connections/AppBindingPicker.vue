<script setup lang="ts">
import type { AppBindingKind } from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { computed, onScopeDispose, ref } from 'vue';

import { listBindableResources, type BindableResource } from '../../../apps.api';
import { BINDING_KINDS } from './bindingKinds';

const props = defineProps<{
	kind: AppBindingKind;
	projectId: string;
	boundIds: ReadonlySet<string>;
	/** The row already has connections, so the add action is an icon-only button. */
	hasItems: boolean;
	/** Saves the new connection. The picker waits for it, so a second click can't add it twice. */
	addResource: (resource: BindableResource) => Promise<void>;
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
const adding = ref(new Set<string>());

const config = computed(() => BINDING_KINDS[props.kind]);
const addLabel = computed(() => i18n.baseText(config.value.addLabel));
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

async function add(resource: BindableResource) {
	if (adding.value.has(resource.id)) return;
	adding.value.add(resource.id);
	try {
		await props.addResource(resource);
	} finally {
		adding.value.delete(resource.id);
	}
}

async function show() {
	open.value = true;
	search.value = '';
	resources.value = [];
	resourceCount.value = 0;
	await fetchResources('');
}

function onOpenChange(value: boolean) {
	open.value = value;
	if (value) return;
	fetchResourcesDebounced.cancel();
	latestFetch.invalidate();
	loading.value = false;
}

onScopeDispose(() => {
	fetchResourcesDebounced.cancel();
	latestFetch.invalidate();
});
</script>

<template>
	<!-- One root for the add action; the dialog itself renders in a portal. -->
	<span :class="$style.root">
		<N8nTooltip v-if="hasItems" :content="addLabel" placement="top">
			<N8nIconButton
				icon="plus"
				variant="ghost"
				size="medium"
				:aria-label="addLabel"
				:data-test-id="`app-binding-add-${kind}`"
				@click="show"
			/>
		</N8nTooltip>
		<N8nButton
			v-else
			icon="plus"
			variant="ghost"
			size="medium"
			:class="$style.emptyAdd"
			:data-test-id="`app-binding-add-${kind}`"
			@click="show"
		>
			{{ addLabel }}
		</N8nButton>
		<N8nDialog
			:open="open"
			size="medium"
			:header="addLabel"
			:data-test-id="`app-binding-picker-${kind}`"
			@update:open="onOpenChange"
		>
			<N8nDialogBody :class="$style.body">
				<N8nInput
					v-model="search"
					:placeholder="i18n.baseText('apps.configure.connections.search')"
					:aria-label="i18n.baseText('apps.configure.connections.search')"
					data-test-id="app-binding-picker-search"
					@update:model-value="onSearch"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nText v-if="loading" color="text-light">
					{{ i18n.baseText('apps.configure.connections.loading') }}
				</N8nText>
				<N8nText v-else-if="resources.length === 0" color="text-light">
					{{
						search.trim()
							? i18n.baseText(config.noMatches)
							: i18n.baseText('apps.configure.connections.empty')
					}}
				</N8nText>
				<ul v-else :class="$style.list">
					<li
						v-for="resource in resources"
						:key="resource.id"
						:class="$style.item"
						:data-test-id="`app-binding-picker-item-${resource.id}`"
					>
						<N8nIcon :icon="config.icon" :size="16" :class="$style.icon" />
						<N8nText bold :class="$style.name">{{ resource.name }}</N8nText>
						<N8nText
							v-if="boundIds.has(resource.id)"
							color="text-light"
							:class="$style.added"
							:data-test-id="`app-binding-picker-added-${resource.id}`"
						>
							<N8nIcon icon="check" :size="14" />
							{{ i18n.baseText('apps.configure.connections.added') }}
						</N8nText>
						<N8nButton
							v-else
							variant="outline"
							size="small"
							:data-test-id="`app-binding-picker-add-${resource.id}`"
							:loading="adding.has(resource.id)"
							@click="add(resource)"
						>
							{{ addLabel }}
						</N8nButton>
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
			</N8nDialogBody>
		</N8nDialog>
	</span>
</template>

<style lang="scss" module>
.root {
	display: contents;
}

/* Same as the empty add action of an Agent chip row: muted until hover, aligned with the row text. */
.emptyAdd {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));

	&:hover {
		--button--color: var(--text-color);
	}
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.added {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
