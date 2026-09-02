<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nCallout from '../N8nCallout';
import N8nHeading from '../N8nHeading';
import N8nIcon from '../N8nIcon';
import N8nLink from '../N8nLink';
import N8nPopover from '../N8nPopover';
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
	popoverAlignment?: 'start' | 'end' | 'center';
	notice?: string;
	/** Render an invisible popover anchor instead of the count pill; opening is then fully controlled via `open`. */
	hideTrigger?: boolean;
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'update:open', open: boolean): void;
}

defineOptions({ name: 'N8nSuggestedActions' });

const props = withDefaults(defineProps<SuggestedActionsProps>(), {
	popoverAlignment: undefined,
	notice: undefined,
});

const emit = defineEmits<SuggestedActionsEmits>();
const { t } = useI18n();

const completedCount = computed(() => props.actions.filter((action) => action.completed).length);

const handleActionClick = (action: SuggestedAction) => {
	if (!action.completed) {
		emit('action-click', action.id);
	}
};
</script>

<template>
	<N8nPopover
		:open="open"
		width="360px"
		max-height="500px"
		:align="popoverAlignment"
		@update:open="$emit('update:open', $event)"
	>
		<template #trigger>
			<span v-if="hideTrigger" :class="$style.hiddenTrigger" />
			<div
				v-else
				:class="[$style.triggerContainer, open ? $style.activeTrigger : '']"
				data-test-id="suggested-action-count"
			>
				<N8nTag :text="`${completedCount} / ${actions.length}`" />
			</div>
		</template>
		<template #content>
			<div :class="$style.popoverContent">
				<div :class="$style.header">
					<N8nHeading tag="h4">{{ title }}</N8nHeading>
					<N8nLink
						theme="text"
						:title="t('generic.close')"
						data-test-id="suggested-actions-close"
						@click.prevent.stop="emit('update:open', false)"
					>
						<N8nIcon icon="x" size="large" />
					</N8nLink>
				</div>
				<N8nCallout v-if="notice" theme="warning">{{ notice }}</N8nCallout>
				<div
					v-for="action in actions"
					:key="action.id"
					:class="[
						{
							[$style.actionItem]: true,
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
					</div>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.triggerContainer {
	display: inline-block;
	position: relative;
	--tag--height: 24px;
}

.hiddenTrigger {
	display: block;
	width: 0;
	height: 0;
}

.activeTrigger {
	--tag--color--text: var(--color--primary);
	--tag--border-color: var(--color--primary);
}

.popoverContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--sm);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.actionItem {
	display: flex;
	flex-direction: row;
	&:not(:last-child) {
		border-bottom: var(--border);
	}
}

.actionable {
	&:hover {
		cursor: pointer;

		.actionHeader {
			color: var(--color--primary);
		}

		&:has(a:hover) {
			.actionHeader {
				color: var(--color--text--shade-1);
			}
		}
	}
}

.actionItemBody {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	padding-bottom: var(--spacing--sm);
}

.checkboxContainer {
	padding-top: 1px;
	padding-right: var(--spacing--xs);
}
</style>
