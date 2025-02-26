<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AnnotationVote, ExecutionSummary } from 'n8n-workflow';
import { useExecutionsStore } from '@/stores/executions.store';
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.ee.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import VoteButtons from '@/components/executions/workflow/VoteButtons.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';

const executionsStore = useExecutionsStore();

const { showError } = useToast();
const i18n = useI18n();
const telemetry = useTelemetry();

const tagsEventBus = createEventBus();
const isTagsEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);

const activeExecution = computed(() => {
	return executionsStore.activeExecution as ExecutionSummary & {
		customData?: Record<string, string>;
	};
});

const vote = computed(() => activeExecution.value?.annotation?.vote || null);
const tagIds = computed(() => activeExecution.value?.annotation?.tags.map((tag) => tag.id) ?? []);
const tags = computed(() => activeExecution.value?.annotation?.tags);

const tagsHasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const onVoteClick = async (voteValue: AnnotationVote) => {
	if (!activeExecution.value) {
		return;
	}

	const voteToSet = voteValue === vote.value ? null : voteValue;

	try {
		await executionsStore.annotateExecution(activeExecution.value.id, { vote: voteToSet });
	} catch (e) {
		showError(e, 'executionAnnotationView.vote.error');
	}
};

const onTagsEditEnable = () => {
	appliedTagIds.value = tagIds.value;
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		tagsEventBus.emit('focus');
	}, 0);
};

const onTagsBlur = async () => {
	if (!activeExecution.value) {
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
		await executionsStore.annotateExecution(activeExecution.value.id, { tags: newTagIds });

		if (newTagIds.length > 0) {
			telemetry.track('User added execution annotation tag', {
				tag_ids: newTagIds,
				execution_id: activeExecution.value.id,
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
	<div
		ref="container"
		:class="['execution-annotation-panel', $style.container]"
		data-test-id="execution-annotation-panel"
	>
		<div :class="$style.section">
			<div :class="$style.vote">
				<div>{{ i18n.baseText('generic.rating') }}</div>
				<VoteButtons :vote="vote" @vote-click="onVoteClick" />
			</div>
			<span :class="$style.tags" data-test-id="annotation-tags-container">
				<AnnotationTagsDropdown
					v-if="isTagsEditEnabled"
					ref="dropdown"
					v-model="appliedTagIds"
					:create-enabled="true"
					:event-bus="tagsEventBus"
					:placeholder="i18n.baseText('executionAnnotationView.chooseOrCreateATag')"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
					@blur="onTagsBlur"
					@esc="onTagsEditEsc"
				/>
				<div v-else-if="tagIds.length === 0">
					<span
						:class="[$style.addTag, $style.addTagStandalone, 'clickable']"
						data-test-id="new-tag-link"
						@click="onTagsEditEnable"
					>
						+ {{ i18n.baseText('executionAnnotationView.addTag') }}
					</span>
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
						<n8n-button
							:class="$style.addTag"
							:label="`+ ` + i18n.baseText('executionAnnotationView.addTag')"
							type="secondary"
							size="mini"
							:outline="false"
							:text="true"
							@click="onTagsEditEnable"
						/>
					</span>
				</span>
			</span>
		</div>
		<div :class="$style.section">
			<div :class="$style.heading">
				<n8n-heading tag="h3" size="small" color="text-dark">
					{{ i18n.baseText('generic.annotationData') }}
				</n8n-heading>
			</div>
			<div
				v-if="activeExecution?.customData && Object.keys(activeExecution?.customData).length > 0"
				:class="$style.metadata"
			>
				<div
					v-for="attr in Object.keys(activeExecution?.customData)"
					v-bind:key="attr"
					:class="$style.customDataEntry"
				>
					<n8n-text :class="$style.key" size="small" color="text-base">
						{{ attr }}
					</n8n-text>
					<n8n-text :class="$style.value" size="small" color="text-base">
						{{ activeExecution?.customData[attr] }}
					</n8n-text>
				</div>
			</div>
			<div v-else :class="$style.noResultsContainer" data-test-id="execution-annotation-data-empty">
				<n8n-text color="text-base" size="small" align="center">
					<span v-n8n-html="i18n.baseText('executionAnnotationView.data.notFound')" />
				</n8n-text>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	z-index: 1;
	position: absolute;
	bottom: 0;
	right: var(--spacing-xl);
	transform: translate(0, 100%);
	max-height: calc(100vh - 250px);
	width: 250px;

	display: flex;
	flex-direction: column;
	overflow: auto;

	background-color: var(--color-background-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.section {
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: var(--border-base);
	}
}

.metadata {
	padding-top: var(--spacing-s);
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing-l);
}

.controls {
	padding: var(--spacing-s) 0 var(--spacing-xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-m);

	button {
		display: flex;
		align-items: center;
	}
}

.vote {
	padding: 0 0 var(--spacing-xs);
	font-size: var(--font-size-xs);
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;

	.ratingIcon {
		display: flex;
		flex-direction: row;

		.highlight {
			color: var(--color-primary);
		}
	}
}

.customDataEntry {
	display: flex;
	flex-direction: column;

	&:not(:first-of-type) {
		margin-top: var(--spacing-s);
	}

	.key {
		font-weight: bold;
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-s);
}

.execution-annotation-panel {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}

.tagsContainer {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;

	margin-top: calc(var(--spacing-4xs) * -1); // Cancel out top margin of first tags row

	* {
		margin: var(--spacing-4xs) var(--spacing-4xs) 0 0;
	}
}

.addTag {
	font-size: var(--font-size-2xs);
	color: $custom-font-very-light;
	font-weight: var(--font-weight-bold);
	white-space: nowrap;
	&:hover {
		color: $color-primary;
		text-decoration: none;
	}
}

.addTagStandalone {
	padding: var(--spacing-m) 0; // to be more clickable
}

.addTagWrapper {
	margin-left: calc(var(--spacing-2xs) * -1); // Cancel out right margin of last tag
}
</style>
