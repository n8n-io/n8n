<script setup lang="ts">
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nHeading from '../N8nHeading';
import N8nIcon from '../N8nIcon';
import N8nLink from '../N8nLink';
import N8nPopoverReka from '../N8nPopoverReka';
import N8nTag from '../N8nTag';
import N8nText from '../N8nText';

interface SuggestedAction {
	id: string;
	title: string;
	description: string;
	moreInfoLink?: string;
	completed?: boolean;
}

export interface SuggestedActionsProps {
	title: string;
	actions: SuggestedAction[];
	open: boolean;
	ignoreAllLabel?: string;
	popoverAlignment?: 'start' | 'end' | 'center';
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'ignore-click', actionId: string): void;
	(event: 'ignore-all'): void;
	(event: 'update:open', open: boolean): void;
}

defineOptions({ name: 'N8nSuggestedActions' });

const props = withDefaults(defineProps<SuggestedActionsProps>(), {
	ignoreAllLabel: undefined,
	popoverAlignment: undefined,
});

const emit = defineEmits<SuggestedActionsEmits>();
const { t } = useI18n();

const ignoringActions = ref<Set<string>>(new Set());

const completedCount = computed(() => props.actions.filter((action) => action.completed).length);

const handleActionClick = (action: SuggestedAction) => {
	if (!action.completed) {
		emit('action-click', action.id);
	}
};

const handleIgnoreClick = (actionId: string) => {
	ignoringActions.value.add(actionId);
	setTimeout(() => {
		emit('ignore-click', actionId);
		ignoringActions.value.delete(actionId);
	}, 500);
};
</script>

<template>
	<N8nPopoverReka
		v-if="completedCount !== actions.length"
		:open="open"
		width="360px"
		max-height="500px"
		:align="popoverAlignment"
		@update:open="$emit('update:open', $event)"
	>
		<template #trigger>
			<div :class="$style.triggerContainer" data-test-id="suggested-action-count">
				<N8nTag :text="`${completedCount} / ${actions.length}`" />
			</div>
		</template>
		<template #content>
			<div :class="$style.popoverContent">
				<N8nHeading tag="h4">{{ title }}</N8nHeading>
				<div
					v-for="action in actions"
					:key="action.id"
					:class="[
						{
							[$style.actionItem]: true,
							[$style.ignoring]: ignoringActions.has(action.id),
							[$style.actionable]: !action.completed,
						},
					]"
					data-test-id="suggested-action-item"
					:data-action-id="action.id"
					@click.prevent.stop="() => handleActionClick(action)"
				>
					<div :class="$style.checkboxContainer">
						<N8nIcon v-if="action.completed" icon="circle-check" color="success" />
						<N8nIcon v-else icon="circle" color="foreground-dark" />
					</div>
					<div :class="$style.actionItemBody">
						<div :class="[action.completed ? '' : 'mb-3xs', $style.actionHeader]">
							<N8nText size="medium" :bold="true">{{ action.title }}</N8nText>

							<N8nIcon v-if="!action.completed" icon="chevron-right" />
						</div>
						<div v-if="!action.completed">
							<N8nText size="small" color="text-base">
								{{ action.description }}
								<N8nLink
									v-if="action.moreInfoLink"
									:to="action.moreInfoLink"
									size="small"
									theme="text"
									new-window
									underline
									@click.stop
								>
									{{ t('generic.moreInfo') }}
								</N8nLink>
							</N8nText>
						</div>
						<div v-if="!action.completed" :class="$style.actionButtons">
							<N8nLink
								theme="text"
								size="small"
								data-test-id="suggested-action-ignore"
								underline
								@click.prevent.stop="handleIgnoreClick(action.id)"
							>
								{{ t('generic.ignore') }}
							</N8nLink>
						</div>
					</div>
				</div>
				<div :class="$style.ignoreAllContainer">
					<N8nLink
						theme="text"
						size="small"
						underline
						data-test-id="suggested-action-ignore-all"
						@click.prevent.stop="emit('ignore-all')"
					>
						{{ ignoreAllLabel ?? t('generic.ignoreAll') }}
					</N8nLink>
				</div>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.triggerContainer {
	display: inline-block;
	position: relative;
	--tag-height: 24px;
}

.popoverContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
	padding: var(--spacing-m) var(--spacing-s);
}

.actionItem {
	display: flex;
	flex-direction: row;
	transition:
		opacity 0.3s ease,
		filter 0.3s ease;

	&.ignoring {
		opacity: 0.5;
		filter: grayscale(0.8);
		pointer-events: none;
		cursor: not-allowed;
	}
}

.actionable {
	&:hover {
		cursor: pointer;

		.actionHeader {
			color: var(--color-primary);
		}

		&:has(a:hover) {
			.actionHeader {
				color: var(--color-text-dark);
			}
		}
	}
}

.actionItemBody {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	border-bottom: var(--border-base);
	padding-bottom: var(--spacing-s);
}

.checkboxContainer {
	padding-top: 1px;
	padding-right: var(--spacing-xs);
}

.actionHeader {
	display: flex;
	align-items: flex-start;

	> :first-child {
		flex-grow: 1;
	}
}

.actionButtons {
	margin-top: var(--spacing-2xs);
}

.ignoreAllContainer {
	padding-left: var(--spacing-l);
}
</style>
