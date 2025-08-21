<script lang="ts" setup>
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.ee.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useExecutionsStore } from '@/stores/executions.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed, ref } from 'vue';

const props = defineProps<{
	execution: ExecutionSummary;
}>();
const locale = useI18n();
const telemetry = useTelemetry();
const { showError } = useToast();
const executionsStore = useExecutionsStore();

const tagIds = computed(() => props.execution.annotation?.tags.map((tag) => tag.id) ?? []);
const tags = computed(() => props.execution.annotation?.tags);
const tagsEventBus = createEventBus();
const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);

const tagsHasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const onTagsEditEnable = () => {
	appliedTagIds.value = tagIds.value;
	isTagsEditEnabled.value = true;

	tagsEventBus.emit('focus');
};

const onTagsBlur = async () => {
	if (!props.execution) {
		return;
	}

	const currentTagIds = tagIds.value ?? [];
	const newTagIds = appliedTagIds.value;

	if (!tagsHasChanged(currentTagIds, newTagIds)) {
		isTagsEditEnabled.value = false;
		return;
	}

	if (tagsSaving.value) {
		return;
	}

	tagsSaving.value = true;

	try {
		await executionsStore.annotateExecution(props.execution.id, { tags: newTagIds });

		if (newTagIds.length > 0) {
			telemetry.track('User added execution annotation tag', {
				tag_ids: newTagIds,
				execution_id: props.execution.id,
			});
		}
	} catch (e) {
		showError(e, 'executionAnnotationView.tag.error');
	}

	tagsSaving.value = false;
	isTagsEditEnabled.value = false;
};

const onTagsEditEsc = () => {
	isTagsEditEnabled.value = false;
};
</script>

<template>
	<div :class="$style.executionDetailsTags">
		<span :class="$style.tags" data-test-id="annotation-tags-container">
			<AnnotationTagsDropdown
				v-if="isTagsEditEnabled"
				ref="dropdown"
				v-model="appliedTagIds"
				:create-enabled="true"
				:event-bus="tagsEventBus"
				:placeholder="locale.baseText('executionAnnotationView.chooseOrCreateATag')"
				class="tags-edit"
				data-test-id="workflow-tags-dropdown"
				@blur="onTagsBlur"
				@esc="onTagsEditEsc"
			/>
			<div v-else-if="tagIds.length === 0">
				<N8nButton
					:class="[$style.addTagButton, 'clickable']"
					:label="locale.baseText('executionAnnotationView.addTag')"
					type="secondary"
					size="mini"
					:outline="false"
					:text="true"
					data-test-id="new-tag-link"
					icon="plus"
					@click="onTagsEditEnable"
				/>
			</div>

			<span
				v-else
				:class="[
					'tags-container', // FIXME: There are some global styles for tags relying on this classname
					$style.tagsContainer,
				]"
				data-test-id="execution-annotation-tags"
				@click="onTagsEditEnable"
			>
				<span v-for="tag in tags" :key="tag.id" class="clickable">
					<el-tag :title="tag.name" type="info" size="small" :disable-transitions="true">
						{{ tag.name }}
					</el-tag>
				</span>
				<span :class="$style.addTagWrapper">
					<N8nButton
						:class="[$style.addTagButton, $style.addTagButtonIconOnly, 'clickable']"
						type="secondary"
						size="mini"
						:outline="false"
						:text="true"
						data-test-id="new-tag-link"
						icon="plus"
						@click="onTagsEditEnable"
					/>
				</span>
			</span>
		</span>
	</div>
</template>

<style module lang="scss">
.executionDetailsTags {
	// Container styles if needed
}

.tags {
	display: block;
	margin-top: var(--spacing-4xs);
}

.addTagButton {
	height: 24px;
	font-size: var(--font-size-2xs);
	white-space: nowrap;
	padding: var(--spacing-4xs) var(--spacing-3xs);
	background-color: var(--color-button-secondary-background);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-regular);

	&:hover {
		color: $color-primary;
		text-decoration: none;
		background-color: var(--color-button-secondary-hover-background);
		border: 1px solid var(--color-button-secondary-hover-active-focus-border);
		border-radius: var(--border-radius-base);
	}

	span + span {
		margin-left: var(--spacing-4xs);
	}
}

.addTagButtonIconOnly {
	height: 20px;
	width: 20px;
}

.tagsContainer {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing-4xs);
	max-width: 360px;

	:global(.el-tag) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: max-content;
		height: var(--tag-height);
		padding: var(--tag-padding);
		line-height: var(--tag-line-height);
		color: var(--tag-text-color);
		background-color: var(--tag-background-color);
		border: 1px solid var(--tag-border-color);
		border-radius: var(--tag-border-radius);
		font-size: var(--tag-font-size);
	}
}

.addTagWrapper {
	// Wrapper styles if needed
}
</style>
