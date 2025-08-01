<script setup lang="ts">
import { ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nLink from '../N8nLink';
import N8nPopoverReka from '../N8nPopoverReka';
import N8nText from '../N8nText';

interface SuggestedAction {
	id: string;
	title: string;
	description: string;
	moreInfoLink?: string;
	completed?: boolean;
}

interface SuggestedActionsProps {
	actions: SuggestedAction[];
	ignoreAllLabel?: string;
	popoverAlignment?: 'start' | 'end' | 'center';
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'ignore-click', actionId: string): void;
	(event: 'ignore-all'): void;
}

defineOptions({ name: 'N8nSuggestedActions' });

withDefaults(defineProps<SuggestedActionsProps>(), {
	ignoreAllLabel: undefined,
	popoverAlignment: undefined,
});

const emit = defineEmits<SuggestedActionsEmits>();
const { t } = useI18n();

const isOpen = ref(false);
const ignoringActions = ref<Set<string>>(new Set());

const handleActionClick = (actionId: string) => {
	emit('action-click', actionId);
};

const handleIgnoreClick = (actionId: string) => {
	ignoringActions.value.add(actionId);
	setTimeout(() => {
		emit('ignore-click', actionId);
		ignoringActions.value.delete(actionId);
	}, 500);
};

const openPopover = () => {
	isOpen.value = true;
};

const closePopover = () => {
	isOpen.value = false;
};

defineExpose({
	openPopover,
	closePopover,
});
</script>

<template>
	<N8nPopoverReka v-model:open="isOpen" width="360px" max-height="500px" :align="popoverAlignment">
		<template #trigger>
			<div :class="$style.triggerContainer">
				<N8nIconButton
					icon="circle-alert"
					type="highlight"
					size="medium"
					icon-size="large"
					data-test-id="suggested-actions-bell"
				/>
			</div>
		</template>
		<template #content>
			<div :class="$style.popoverContent">
				<div
					v-for="action in actions"
					:key="action.id"
					:class="[$style.actionItem, { [$style.ignoring]: ignoringActions.has(action.id) }]"
					data-test-id="suggested-action-item"
					@click.prevent.stop="() => handleActionClick(action.id)"
				>
					<div :class="$style.checkboxContainer">
						<N8nIcon v-if="action.completed" icon="circle-check" color="success" />
						<N8nIcon v-else icon="circle" color="foreground-dark" />
					</div>
					<div :class="$style.actionItemBody">
						<div :class="['mb-3xs', $style.actionHeader]">
							<N8nText size="medium" :bold="true">{{ action.title }}</N8nText>

							<N8nIcon icon="chevron-right" />
						</div>
						<div>
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
						<div :class="$style.actionButtons">
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
	padding-top: var(--spacing-5xs);
	padding-right: var(--spacing-xs);
}

.actionHeader {
	display: flex;
	align-items: center;

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
