<script lang="ts">
import type { AnnotationVote, ExecutionSummary } from 'n8n-workflow';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useExecutionsStore } from '@/stores/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.vue';
import { createEventBus } from 'n8n-design-system';
import VoteButtons from '@/components/executions/workflow/VoteButtons.vue';
import { useToast } from '@/composables/useToast';

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

export default defineComponent({
	name: 'WorkflowExecutionAnnotationSidebar',
	components: {
		VoteButtons,
		AnnotationTagsDropdown,
	},
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
			// FIXME: this is a temporary workaround to make TS happy. activeExecution may contain customData, but it is type-casted to ExecutionSummary after fetching from the backend
			return this.executionsStore.activeExecution as ExecutionSummary & {
				customData?: Record<string, string>;
			};
		},
		tagIds() {
			return this.activeExecution?.annotation?.tags.map((tag) => tag.id) ?? [];
		},
		tags() {
			return this.activeExecution?.annotation?.tags;
		},
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			tagsEventBus: createEventBus(),
			isTagsEditEnabled: false,
			appliedTagIds: [] as string[],
			tagsSaving: false,
		};
	},
	methods: {
		async onVoteClick(vote: AnnotationVote) {
			if (!this.activeExecution) {
				return;
			}

			// If user clicked on the same vote, remove it
			// so that vote buttons act as toggle buttons
			const voteToSet = vote === this.vote ? null : vote;

			try {
				await this.executionsStore.annotateExecution(this.activeExecution.id, { vote: voteToSet });
			} catch (e) {
				this.showError(e, this.$locale.baseText('executionAnnotationView.vote.error'));
			}
		},
		onTagsEditEnable() {
			this.appliedTagIds = this.tagIds;
			this.isTagsEditEnabled = true;

			setTimeout(() => {
				this.tagsEventBus.emit('focus');
			}, 0);
		},
		async onTagsBlur() {
			if (!this.activeExecution) {
				return;
			}

			const current = (this.tagIds ?? []) as string[];
			const tags = this.appliedTagIds;

			if (!hasChanged(current, tags)) {
				this.isTagsEditEnabled = false;
				return;
			}

			if (this.tagsSaving) {
				return;
			}

			this.tagsSaving = true;

			try {
				await this.executionsStore.annotateExecution(this.activeExecution.id, { tags });
			} catch (e) {
				this.showError(e, this.$locale.baseText('executionAnnotationView.tag.error'));
			}

			this.tagsSaving = false;
			this.isTagsEditEnabled = false;
		},
		onTagsEditEsc() {
			this.isTagsEditEnabled = false;
		},
	},
});
</script>

<template>
	<div
		ref="container"
		:class="['execution-annotation-sidebar', $style.container]"
		data-test-id="execution-annotation-sidebar"
	>
		<div :class="$style.section">
			<div :class="$style.vote">
				<div>{{ $locale.baseText('generic.rating') }}</div>
				<VoteButtons :vote="vote" @vote-click="onVoteClick" />
			</div>
			<span class="tags" data-test-id="annotation-tags-container">
				<AnnotationTagsDropdown
					v-if="isTagsEditEnabled"
					v-model="appliedTagIds"
					ref="dropdown"
					:create-enabled="true"
					:event-bus="tagsEventBus"
					:placeholder="$locale.baseText('executionAnnotationView.chooseOrCreateATag')"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
					@blur="onTagsBlur"
					@esc="onTagsEditEsc"
				/>
				<div v-else-if="tagIds.length === 0">
					<span
						class="add-tag add-tag-standalone clickable"
						data-test-id="new-tag-link"
						@click="onTagsEditEnable"
					>
						+ {{ $locale.baseText('executionAnnotationView.addTag') }}
					</span>
				</div>

				<span
					v-else
					class="tags-container"
					data-test-id="execution-annotation-tags"
					@click="onTagsEditEnable"
				>
					<span v-for="tag in tags" :key="tag.id" class="clickable">
						<el-tag :title="tag.name" type="info" size="small" :disable-transitions="true">
							{{ tag.name }}
						</el-tag>
					</span>
					<span class="add-tag-wrapper">
						<n8n-button
							class="add-tag"
							:label="`+ ` + $locale.baseText('executionAnnotationView.addTag')"
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
					{{ $locale.baseText('generic.annotationData') }}
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
			<div v-else :class="$style.noResultsContainer" data-test-id="execution-list-empty">
				<n8n-text color="text-base" size="small" align="center">
					<span v-html="$locale.baseText('executionAnnotationView.data.notFound')" />
				</n8n-text>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	flex: 250px 0 0;
	background-color: var(--color-background-xlight);
	border-left: var(--border-base);
	z-index: 1;
	display: flex;
	flex-direction: column;
	overflow: auto;
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
	margin-top: var(--spacing-s);
	//text-align: center;
}
</style>

<style lang="scss" scoped>
.execution-annotation-sidebar {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}

.tags-container {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;

	margin-top: calc(var(--spacing-4xs) * -1); // Cancel out top margin of first tags row

	* {
		margin: var(--spacing-4xs) var(--spacing-4xs) 0 0;
	}
}

.add-tag {
	font-size: 12px;
	color: $custom-font-very-light;
	font-weight: 600;
	white-space: nowrap;
	&:hover {
		color: $color-primary;
		text-decoration: none;
	}
}

.add-tag-standalone {
	padding: 20px 0; // to be more clickable
}

.add-tag-wrapper {
	margin-left: calc(var(--spacing-2xs) * -1); // Cancel out right margin of last tag
}
</style>
