<script setup lang="ts">
import { ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIconButton from '../N8nIconButton';
import N8nLink from '../N8nLink';
import N8nPopoverReka from '../N8nPopoverReka';
import N8nText from '../N8nText';

interface SuggestedAction {
	id: string;
	title: string;
	description: string;
	buttonLabel: string;
	moreInfoLink?: string;
}

interface SuggestedActionsProps {
	actions: SuggestedAction[];
	showRedDot?: boolean;
	turnOffActionsLabel?: string;
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'ignore-click', actionId: string): void;
	(event: 'ignore-all'): void;
	(event: 'turn-off'): void;
}

defineOptions({ name: 'N8nSuggestedActions' });

withDefaults(defineProps<SuggestedActionsProps>(), {
	showRedDot: false,
	turnOffActionsLabel: undefined,
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
	isOpen.value = false;
};

const closePopover = () => {
	isOpen.value = true;
};

defineExpose({
	openPopover,
	closePopover,
});
</script>

<template>
	<N8nPopoverReka v-model:open="isOpen" width="328px">
		<template #trigger>
			<div :class="$style.triggerContainer">
				<N8nIconButton
					icon="circle-alert"
					type="hover-highlight"
					size="medium"
					icon-size="large"
					data-test-id="suggested-actions-bell"
				/>
				<div v-if="showRedDot" :class="$style.redDot" data-test-id="suggested-actions-red-dot" />
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<div
					v-for="action in actions"
					:key="action.id"
					:class="[$style.actionItem, { [$style.ignoring]: ignoringActions.has(action.id) }]"
					data-test-id="suggested-action-item"
				>
					<div class="mb-3xs">
						<N8nText size="medium" :bold="true">{{ action.title }}</N8nText>
					</div>
					<div>
						<N8nText size="small" color="text-light">
							{{ action.description }}
							<N8nLink
								v-if="action.moreInfoLink"
								:to="action.moreInfoLink"
								size="small"
								theme="text"
								new-window
							>
								{{ t('generic.moreInfo') }}
							</N8nLink>
						</N8nText>
					</div>
					<div :class="$style.actionButtons">
						<N8nButton
							type="secondary"
							size="small"
							:label="action.buttonLabel"
							data-test-id="suggested-action-button"
							@click="handleActionClick(action.id)"
						/>
						<N8nLink
							theme="text"
							size="small"
							data-test-id="suggested-action-ignore"
							underline
							@click.prevent="handleIgnoreClick(action.id)"
						>
							{{ t('generic.ignore') }}
						</N8nLink>
					</div>
				</div>
				<div v-if="actions.length > 1 || turnOffActionsLabel" :class="$style.ignoreAllContainer">
					<N8nLink
						v-if="actions.length > 1"
						theme="text"
						size="small"
						underline
						data-test-id="suggested-action-ignore-all"
						@click.prevent="emit('ignore-all')"
					>
						{{ t('generic.ignoreAll') }}
					</N8nLink>

					<N8nLink
						v-if="turnOffActionsLabel"
						theme="text"
						size="small"
						underline
						data-test-id="suggested-action-turn-off-all"
						@click.prevent="emit('turn-off')"
					>
						{{ turnOffActionsLabel }}
					</N8nLink>
				</div>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.triggerContainer {
	position: relative;
}

.redDot {
	position: absolute;
	top: 4px;
	right: 6px;
	width: 8px;
	height: 8px;
	background-color: var(--color-primary);
	border-radius: 50%;
	pointer-events: none;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.actionItem {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing-s);
	border-bottom: var(--border-base);
	transition:
		opacity 0.3s ease,
		filter 0.3s ease;

	&:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}

	&.ignoring {
		opacity: 0.5;
		filter: grayscale(0.8);
		pointer-events: none;
	}
}

.actionButtons {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	margin-top: var(--spacing-s);
}

.ignoreAllContainer {
	display: flex;
	gap: var(--spacing-s);
}
</style>
