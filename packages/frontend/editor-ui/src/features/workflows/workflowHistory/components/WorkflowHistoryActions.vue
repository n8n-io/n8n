<script setup lang="ts">
import { computed, ref } from 'vue';
import type { UserAction } from '@/Interface';
import type {
	WorkflowVersion,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';

import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { IS_DRAFT_PUBLISH_ENABLED } from '@/app/constants';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		workflowVersion: WorkflowVersion;
		actions: Array<UserAction<IUser>>;
		isVersionActive?: boolean;
		isFirstItemShown?: boolean;
		formattedCreatedAt: string;
		versionNameDisplay: string;
		description: string;
		focusPanelWidth?: number;
		isFocusPanelActive?: boolean;
	}>(),
	{
		focusPanelWidth: 0,
		isFocusPanelActive: false,
	},
);

const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
}>();

const isDraftPublishEnabled = IS_DRAFT_PUBLISH_ENABLED;

const MAX_DESCRIPTION_LENGTH = 200;
const isDescriptionExpanded = ref(false);

const containerStyle = computed(() => {
	if (props.isFocusPanelActive && props.focusPanelWidth > 0) {
		return { width: `calc(100% - ${props.focusPanelWidth}px)` };
	}
	return {};
});

const isDescriptionLong = computed(() => props.description.length > MAX_DESCRIPTION_LENGTH);

const displayDescription = computed(() => {
	if (!isDescriptionLong.value || isDescriptionExpanded.value) {
		return props.description;
	}
	return props.description.substring(0, MAX_DESCRIPTION_LENGTH) + '... ';
});

const filteredActions = computed(() => {
	const excludedActions = new Set<string>();

	if (props.isFirstItemShown) {
		excludedActions.add('restore');
	}

	if (IS_DRAFT_PUBLISH_ENABLED) {
		excludedActions.add(props.isVersionActive ? 'publish' : 'unpublish');
	} else {
		excludedActions.add('publish');
		excludedActions.add('unpublish');
	}

	return props.actions.filter((action) => !excludedActions.has(action.value));
});

const toggleDescription = () => {
	isDescriptionExpanded.value = !isDescriptionExpanded.value;
};

const onAction = (value: string) => {
	emit('action', {
		action: value as WorkflowHistoryActionTypes[number],
		id: props.workflowVersion.versionId,
		data: {
			formattedCreatedAt: props.formattedCreatedAt,
			versionName: props.versionNameDisplay,
			description: props.description,
		},
	});
};
</script>

<template>
	<div :class="$style.info" :style="containerStyle">
		<div :class="$style.card">
			<div v-if="isDraftPublishEnabled" :class="$style.descriptionBox">
				<N8nTooltip v-if="versionNameDisplay" :content="versionNameDisplay">
					<N8nText :class="$style.mainLine" bold color="text-dark">{{
						versionNameDisplay
					}}</N8nText>
				</N8nTooltip>
				<N8nText v-if="description" size="small" color="text-base">
					{{ displayDescription }}
					<N8nLink v-if="isDescriptionLong" size="small" @click="toggleDescription">
						{{
							isDescriptionExpanded
								? i18n.baseText('generic.showLess')
								: i18n.baseText('generic.showMore')
						}}
					</N8nLink>
				</N8nText>
			</div>
			<section v-else :class="$style.textOld">
				<p>
					<span :class="$style.label"> {{ i18n.baseText('workflowHistory.content.title') }}: </span>
					<time :datetime="props.workflowVersion.createdAt">{{ formattedCreatedAt }}</time>
				</p>
				<p>
					<span :class="$style.label">
						{{ i18n.baseText('workflowHistory.content.editedBy') }}:
					</span>
					<span>{{ props.workflowVersion.authors }}</span>
				</p>
				<p>
					<span :class="$style.label">
						{{ i18n.baseText('workflowHistory.content.versionId') }}:
					</span>
					<data :value="props.workflowVersion.versionId">{{
						props.workflowVersion.versionId
					}}</data>
				</p>
			</section>
			<N8nActionToggle
				:class="$style.actions"
				:actions="filteredActions"
				placement="bottom-end"
				data-test-id="workflow-history-content-actions"
				@action="onAction"
			>
				<N8nButton type="tertiary" size="large" data-test-id="action-toggle-button">
					{{ i18n.baseText('workflowHistory.content.actions') }}
					<N8nIcon class="ml-3xs" icon="chevron-down" size="small" />
				</N8nButton>
			</N8nActionToggle>
		</div>
	</div>
</template>

<style module lang="scss">
.info {
	position: absolute;
	z-index: 1;
	top: 0;
	left: 0;
	width: 100%;
}

$descriptionBoxMaxWidth: 330px;

.card {
	display: flex;
	align-items: start;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--lg) 0;
}

.descriptionBox {
	display: flex;
	flex-direction: column;
	max-width: $descriptionBoxMaxWidth;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.mainLine {
	@include mixins.utils-ellipsis;
	cursor: default;
}

.textOld {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;

	p {
		display: flex;
		align-items: center;
		padding: 0;
		cursor: default;

		&:first-child {
			padding-top: var(--spacing--3xs);
			padding-bottom: var(--spacing--4xs);
			* {
				margin-top: auto;
				font-size: var(--font-size--md);
			}
		}

		&:last-child {
			padding-top: var(--spacing--3xs);

			* {
				font-size: var(--font-size--2xs);
			}
		}

		* {
			max-width: unset;
			justify-self: unset;
			white-space: unset;
			overflow: hidden;
			text-overflow: unset;
			padding: 0;
			font-size: var(--font-size--sm);
		}
	}
}

.label {
	color: var(--color--text--tint-1);
	padding-right: var(--spacing--4xs);
}

.actions {
	display: block;
	padding: var(--spacing--3xs);
}
</style>
