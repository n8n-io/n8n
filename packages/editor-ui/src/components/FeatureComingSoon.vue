<script setup lang="ts">
import { computed } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@/composables/useI18n';

import type { IFakeDoor } from '@/Interface';

const props = defineProps<{
	featureId: string;
	showTitle?: boolean;
}>();

const rootStore = useRootStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const locale = useI18n();
const userId = computed(() => usersStore.currentUserId ?? '');
const instanceId = computed(() => rootStore.instanceId);
const featureInfo = computed<IFakeDoor | undefined>(() => uiStore.getFakeDoorById(props.featureId));

const openLinkPage = () => {
	if (featureInfo.value) {
		window.open(
			`${featureInfo.value.linkURL}&u=${instanceId.value}#${userId.value}&v=${rootStore.versionCli}`,
			'_blank',
		);
		telemetry.track('user clicked feature waiting list button', {
			feature: props.featureId,
		});
	}
};
</script>

<template>
	<div v-if="featureInfo" :class="[$style.container]">
		<div v-if="showTitle" class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{ locale.baseText(featureInfo.featureName) }}
			</n8n-heading>
		</div>
		<div v-if="featureInfo.infoText" class="mb-l">
			<n8n-info-tip theme="info" type="note">
				<span v-html="locale.baseText(featureInfo.infoText)"></span>
			</n8n-info-tip>
		</div>
		<div :class="$style.actionBoxContainer">
			<n8n-action-box
				:description="locale.baseText(featureInfo.actionBoxDescription)"
				:button-text="
					locale.baseText(featureInfo.actionBoxButtonLabel || 'fakeDoor.actionBox.button.label')
				"
				@click:button="openLinkPage"
			>
				<template #heading>
					<span v-html="locale.baseText(featureInfo.actionBoxTitle)" />
				</template>
			</n8n-action-box>
		</div>
	</div>
</template>

<style lang="scss" module>
.actionBoxContainer {
	text-align: center;
}
</style>
