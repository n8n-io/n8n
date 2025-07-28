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
	moreInfoLink?: string;
	buttonLabel: string;
}

interface SuggestedActionsProps {
	actions: SuggestedAction[];
	showRedDot?: boolean;
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'ignore-click', actionId: string): void;
}

defineOptions({ name: 'N8nSuggestedActions' });

withDefaults(defineProps<SuggestedActionsProps>(), {
	showRedDot: false,
});

const emit = defineEmits<SuggestedActionsEmits>();
const { t } = useI18n();

const isOpen = ref(false);

const handleActionClick = (actionId: string) => {
	emit('action-click', actionId);
};

const handleIgnoreClick = (actionId: string) => {
	emit('ignore-click', actionId);
};

const openPopover = () => {
	isOpen.value = true;
};

defineExpose({
	openPopover,
});
</script>

<template>
	<N8nPopoverReka v-model:open="isOpen" width="400px" max-height="400px">
		<template #trigger>
			<div :class="$style.triggerContainer">
				<N8nIconButton
					icon="bell"
					type="tertiary"
					size="medium"
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
					:class="$style.actionItem"
					data-test-id="suggested-action-item"
				>
					<div :class="$style.actionHeader">
						<N8nText size="medium" :bold="true">{{ action.title }}</N8nText>
					</div>
					<div :class="$style.actionDescription">
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
							@click.prevent="handleIgnoreClick(action.id)"
						>
							{{ t('generic.ignore') }}
						</N8nLink>
					</div>
				</div>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.triggerContainer {
	position: relative;
	display: inline-block;
}

.redDot {
	position: absolute;
	top: 0;
	right: 0;
	width: 8px;
	height: 8px;
	background-color: var(--color-danger);
	border-radius: 50%;
	pointer-events: none;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.actionItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	padding-bottom: var(--spacing-m);
	border-bottom: 1px solid var(--color-foreground-base);

	&:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}
}

.actionHeader {
	display: flex;
	align-items: center;
}

.actionDescription {
	line-height: var(--font-line-height-regular);
}

.actionButtons {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	margin-top: var(--spacing-xs);
}
</style>
