<template>
	<div
		ref="container"
		:class="['execution-annotation-sidebar', $style.container]"
		data-test-id="execution-annotation-sidebar"
	>
		<div :class="$style.section">
			<div :class="$style.heading">
				<n8n-heading tag="h2" size="medium" color="text-dark">
					{{ $locale.baseText('generic.annotations') }}
				</n8n-heading>
			</div>
			<div :class="$style.vote">
				<div>{{ $locale.baseText('generic.rating') }}:</div>
				<div :class="$style.ratingIcon">
					<n8n-icon-button
						:class="{ [$style.highlight]: vote === 'up' }"
						type="tertiary"
						text
						size="medium"
						icon="thumbs-up"
						@click="onVote('up')"
					/>
					<n8n-icon-button
						:class="{ [$style.highlight]: vote === 'down' }"
						type="tertiary"
						text
						size="medium"
						icon="thumbs-down"
						@click="onVote('down')"
					/>
				</div>
			</div>
			<span class="tags" data-test-id="annotation-tags-container">
				<AnnotationTagsDropdown
					ref="dropdown"
					v-if="activeExecution?.annotation"
					:v-model="tagIds"
					:create-enabled="true"
					:event-bus="tagsEventBus"
					:placeholder="$locale.baseText('workflowDetails.chooseOrCreateATag')"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
				/>
			</span>
			<!--			<div :class="$style.tags" data-test-id="execution-annotation-tags-container">-->
			<!--				<N8nTags-->
			<!--					v-if="activeExecution?.annotation?.tags && activeExecution?.annotation.tags.length > 0"-->
			<!--					:tags="activeExecution?.annotation?.tags"-->
			<!--				></N8nTags>-->
			<!--								<span class="add-tag clickable" data-test-id="new-tag-link">-->
			<!--									+ {{ $locale.baseText('workflowDetails.addTag') }}-->
			<!--								</span>-->
			<!--								<TagsContainer-->
			<!--									v-else-->
			<!--									:key="execution.id"-->
			<!--									:tag-ids="execution.annotation?.tags.map(({ id }) => id) ?? []"-->
			<!--									:clickable="true"-->
			<!--									:responsive="true"-->
			<!--									data-test-id="execution-annotation-tags"-->
			<!--								/>-->
			<!--			</div>-->
		</div>
		<div :class="$style.section">
			<div :class="$style.heading">
				<n8n-heading tag="h2" size="medium" color="text-dark">
					{{ $locale.baseText('generic.annotationData') }}
				</n8n-heading>
			</div>
			<!--			<div-->
			<!--				v-if="!loading && executions.length === 0"-->
			<!--				:class="$style.noResultsContainer"-->
			<!--				data-test-id="execution-annotation-data-empty"-->
			<!--			>-->
			<!--				<n8n-text color="text-base" size="medium" align="center">-->
			<!--					{{ $locale.baseText('executionsLandingPage.noResults') }}-->
			<!--				</n8n-text>-->
			<!--			</div>-->
			<div
				v-if="activeExecution?.customData && Object.keys(activeExecution?.customData).length > 0"
				:class="$style.metadata"
			>
				<n8n-input-label
					v-for="attr in Object.keys(activeExecution?.customData)"
					v-bind="{ label: attr, tooltipText: 'more info...' }"
					:class="$style.customDataEntry"
				>
					<n8n-text size="small" color="text-base">
						{{ activeExecution?.customData[attr] }}
					</n8n-text>
				</n8n-input-label>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { AnnotationVote, ExecutionSummary } from 'n8n-workflow';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useExecutionsStore } from '@/stores/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import TagsContainer from '@/components/TagsContainer.vue';
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'WorkflowExecutionAnnotationSidebar',
	components: { WorkflowTagsDropdown, FontAwesomeIcon, TagsContainer, AnnotationTagsDropdown },
	props: {
		execution: {
			type: Object as PropType<ExecutionSummary>,
			default: null,
		},
		loading: {
			type: Boolean,
			default: true,
		},
	},

	computed: {
		...mapStores(useExecutionsStore, useWorkflowsStore),
		vote() {
			return this.activeExecution?.annotation?.vote || null;
		},
		activeExecution() {
			return this.executionsStore.activeExecution;
		},
		tagIds() {
			return this.activeExecution?.annotation?.tags.map((tag) => tag.id) ?? [];
		},
	},
	data() {
		return {
			tagsEventBus: createEventBus(),
		};
	},
	methods: {
		async onVote(vote: AnnotationVote) {
			if (this.activeExecution) {
				await this.executionsStore.annotateExecution(this.activeExecution?.id, { vote });
			}
		},
	},
});
</script>

<style module lang="scss">
.container {
	flex: 310px 0 0;
	background-color: var(--color-background-xlight);
	border-left: var(--border-base);
	z-index: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.section {
	padding: var(--spacing-l);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		display: flex;
		padding-bottom: var(--spacing-l);
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
	padding: var(--spacing-s) 0 var(--spacing-xs);
	font-size: var(--font-size-s);
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

.customDataEntry:not(:first-of-type) {
	margin-top: var(--spacing-s);
}

.executionList {
	flex: 1;
	overflow: auto;
	margin-bottom: var(--spacing-m);
	background-color: var(--color-background-xlight) !important;

	// Scrolling fader
	&::before {
		position: absolute;
		display: block;
		width: 270px;
		height: 6px;
		background: linear-gradient(to bottom, rgba(251, 251, 251, 1) 0%, rgba(251, 251, 251, 0) 100%);
		z-index: 999;
	}

	// Lower first execution card so fader is not visible when not scrolled
	& > div:first-child {
		margin-top: 3px;
	}
}

.infoAccordion {
	position: absolute;
	bottom: 0;
	margin-left: calc(-1 * var(--spacing-l));
	border-top: var(--border-base);

	& > div {
		width: 309px;
		background-color: var(--color-background-light);
		margin-top: 0 !important;
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing-2xl);
	text-align: center;
}
</style>

<style lang="scss" scoped>
.execution-annotation-sidebar {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
