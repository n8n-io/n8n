<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { INodeUi } from '@/Interface';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { N8nIcon, N8nText } from '@n8n/design-system';

interface Props {
	node: INodeUi | null;
}

const props = defineProps<Props>();
const i18n = useI18n();

const activeSettings = computed(() => {
	if (!props.node || props.node.disabled) {
		return props.node?.disabled
			? [
					{
						key: 'disabled',
						message: i18n.baseText('ndv.nodeHints.disabled'),
						icon: 'power-off' as IconName,
					},
				]
			: [];
	}

	const settings = [];

	if (props.node.alwaysOutputData) {
		settings.push({
			key: 'alwaysOutputData',
			message: i18n.baseText('ndv.nodeHints.alwaysOutputData'),
			icon: 'always-output-data' as IconName,
		});
	}

	if (props.node.executeOnce) {
		settings.push({
			key: 'executeOnce',
			message: i18n.baseText('ndv.nodeHints.executeOnce'),
			icon: 'execute-once' as IconName,
		});
	}

	if (props.node.retryOnFail) {
		settings.push({
			key: 'retryOnFail',
			message: i18n.baseText('ndv.nodeHints.retryOnFail'),
			icon: 'retry-on-fail' as IconName,
		});
	}

	if (
		props.node.onError === 'continueRegularOutput' ||
		props.node.onError === 'continueErrorOutput'
	) {
		settings.push({
			key: 'continueOnError',
			message: i18n.baseText('ndv.nodeHints.continueOnError'),
			icon: 'continue-on-error' as IconName,
		});
	}

	return settings;
});
</script>

<template>
	<div v-if="activeSettings.length > 0" :class="$style.settingsHint">
		<div v-for="setting in activeSettings" :key="setting.key" :class="$style.settingItem">
			<div :class="$style.iconWrapper">
				<N8nIcon :icon="setting.icon" :class="$style.icon" />
			</div>
			<N8nText size="small" :class="$style.message">
				{{ setting.message }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.settingsHint {
	background-color: var(--color-callout-info-background);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style);
	border-color: var(--color-callout-info-border);
	color: var(--color-callout-info-font);
	margin-top: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--sm);
	padding: var(--spacing--xs);
}

.settingItem {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);

	&:not(:last-child) {
		margin-bottom: var(--spacing--xs);
	}
}

.iconWrapper {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	margin-top: 1px;
}

.icon {
	color: var(--color-callout-info-icon);
	font-size: var(--font-size--sm);
	line-height: 1;
}

.message {
	line-height: var(--line-height--md);
	flex: 1;
}
</style>
