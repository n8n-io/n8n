<script lang="ts" setup>
import type { McpServerToolKind, McpServerToolTargetDto } from '@n8n/api-types';
import {
	N8nBadge,
	N8nDialog,
	N8nDialogBody,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';

import { useMcpServersStore } from '../mcpServers.store';

const props = defineProps<{
	/** Show only one kind, e.g. for "Pick another workflow". */
	kind?: McpServerToolKind;
	/** Targets already on the server. They show as added. */
	addedTargetIds?: string[];
	title?: string;
}>();

const emit = defineEmits<{
	close: [];
	pick: [target: McpServerToolTargetDto];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useMcpServersStore();

const search = ref('');
const loading = ref(true);
const targets = ref<McpServerToolTargetDto[]>([]);

async function load() {
	loading.value = true;
	try {
		targets.value = await store.searchTargets(search.value.trim());
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.picker.loadError'));
	} finally {
		loading.value = false;
	}
}

const debouncedLoad = useDebounceFn(load, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(search, () => void debouncedLoad());
onMounted(() => void load());

const added = computed(() => new Set(props.addedTargetIds ?? []));

const groups = computed(() => {
	const kinds: McpServerToolKind[] = props.kind ? [props.kind] : ['workflow', 'agent'];
	return kinds.map((kind) => ({
		kind,
		label: i18n.baseText(
			kind === 'workflow' ? 'mcpServers.picker.group.workflows' : 'mcpServers.picker.group.agents',
		),
		items: targets.value
			.filter((target) => target.kind === kind)
			.sort((a, b) => Number(b.compatible) - Number(a.compatible)),
	}));
});

function onPick(target: McpServerToolTargetDto) {
	if (!target.compatible) return;
	emit('pick', target);
}
</script>

<template>
	<N8nDialog
		open
		size="large"
		:header="title ?? i18n.baseText('mcpServers.picker.title')"
		data-testid="mcp-server-tool-picker"
		@update:open="!$event && emit('close')"
	>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nInput
					v-model="search"
					:placeholder="i18n.baseText('mcpServers.picker.search')"
					size="medium"
					clearable
					autofocus
					data-testid="mcp-server-tool-picker-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<div v-if="loading && targets.length === 0" :class="$style.loading">
					<N8nLoading :rows="4" />
				</div>
				<div v-else :class="$style.groups">
					<section v-for="group in groups" :key="group.kind" :class="$style.group">
						<N8nText size="small" bold color="text-light" :class="$style.groupLabel">
							{{ group.label }}
						</N8nText>
						<N8nText v-if="group.items.length === 0" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.picker.none') }}
						</N8nText>
						<N8nTooltip
							v-for="target in group.items"
							:key="target.id"
							:disabled="target.compatible"
							:content="target.reason"
							placement="left"
						>
							<button
								type="button"
								:class="[$style.item, { [$style.disabled]: !target.compatible }]"
								:disabled="!target.compatible"
								data-testid="mcp-server-tool-picker-item"
								@click="onPick(target)"
							>
								<N8nIcon
									:icon="target.kind === 'workflow' ? 'workflow' : 'bot'"
									:class="$style.itemIcon"
								/>
								<span :class="$style.itemText">
									<N8nText size="medium" bold :class="$style.itemName">{{ target.name }}</N8nText>
									<N8nText
										v-if="!target.compatible && target.reason"
										size="small"
										color="warning"
										:class="$style.itemDescription"
									>
										{{ target.reason }}
									</N8nText>
									<N8nText
										v-else-if="target.description"
										size="small"
										color="text-light"
										:class="$style.itemDescription"
									>
										{{ target.description }}
									</N8nText>
								</span>
								<N8nBadge v-if="added.has(target.id)" variant="subtle" size="small">
									{{ i18n.baseText('mcpServers.picker.added') }}
								</N8nBadge>
								<N8nIcon v-else-if="target.compatible" icon="plus" :class="$style.itemAdd" />
							</button>
						</N8nTooltip>
					</section>
					<section v-if="!kind" :class="$style.group">
						<N8nText size="small" bold color="text-light" :class="$style.groupLabel">
							{{ i18n.baseText('mcpServers.picker.group.external') }}
						</N8nText>
						<div :class="[$style.item, $style.disabled, $style.soon]">
							<N8nIcon icon="plug" :class="$style.itemIcon" />
							<span :class="$style.itemText">
								<N8nText size="medium">{{
									i18n.baseText('mcpServers.build.externalTools')
								}}</N8nText>
							</span>
							<N8nBadge variant="subtle" size="small">
								{{ i18n.baseText('mcpServers.comingSoon') }}
							</N8nBadge>
						</div>
					</section>
				</div>
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.loading {
	padding-block: var(--spacing--sm);
}

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	max-height: 60vh;
	overflow-y: auto;
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.groupLabel {
	text-transform: uppercase;
	letter-spacing: 0.04em;
	margin-bottom: var(--spacing--4xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
	font: inherit;

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}
}

.disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.soon {
	border-style: dashed;
}

.itemIcon {
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.itemText {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.itemName,
.itemDescription {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemAdd {
	color: var(--text-color--subtle);
}
</style>
