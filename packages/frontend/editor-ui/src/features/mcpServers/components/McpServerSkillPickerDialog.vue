<script lang="ts" setup>
import type { McpServerSkillTargetDto } from '@n8n/api-types';
import {
	N8nBadge,
	N8nDialog,
	N8nDialogBody,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';

import { useMcpServersStore } from '../mcpServers.store';

const props = defineProps<{ addedSkillIds?: string[] }>();

const emit = defineEmits<{
	close: [];
	pick: [skill: McpServerSkillTargetDto];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useMcpServersStore();

const search = ref('');
const loading = ref(true);
const skills = ref<McpServerSkillTargetDto[]>([]);
const added = computed(() => new Set(props.addedSkillIds ?? []));

async function load() {
	loading.value = true;
	try {
		skills.value = await store.searchSkills(search.value.trim());
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.skillPicker.loadError'));
	} finally {
		loading.value = false;
	}
}

const debouncedLoad = useDebounceFn(load, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(search, () => void debouncedLoad());
onMounted(() => void load());
</script>

<template>
	<N8nDialog
		open
		size="large"
		:header="i18n.baseText('mcpServers.skillPicker.title')"
		data-testid="mcp-server-skill-picker"
		@update:open="!$event && emit('close')"
	>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nInput
					v-model="search"
					:placeholder="i18n.baseText('mcpServers.skillPicker.search')"
					size="medium"
					clearable
					autofocus
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nLoading v-if="loading && skills.length === 0" :rows="4" />
				<N8nText v-else-if="skills.length === 0" size="small" color="text-light">
					{{ i18n.baseText('mcpServers.skillPicker.none') }}
				</N8nText>
				<div v-else :class="$style.list">
					<button
						v-for="skill in skills"
						:key="skill.id"
						type="button"
						:class="$style.item"
						:disabled="added.has(skill.id)"
						data-testid="mcp-server-skill-picker-item"
						@click="emit('pick', skill)"
					>
						<N8nIcon icon="book-open" :class="$style.icon" />
						<span :class="$style.text">
							<N8nText bold>{{ skill.name }}</N8nText>
							<N8nText
								v-if="skill.description"
								size="small"
								color="text-light"
								:class="$style.desc"
							>
								{{ skill.description }}
							</N8nText>
						</span>
						<N8nBadge v-if="added.has(skill.id)" variant="subtle" size="small">
							{{ i18n.baseText('mcpServers.picker.added') }}
						</N8nBadge>
						<N8nIcon v-else icon="plus" :class="$style.icon" />
					</button>
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

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-height: 60vh;
	overflow-y: auto;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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

	&:disabled {
		cursor: default;
		opacity: 0.6;
	}
}

.icon {
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.desc {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
