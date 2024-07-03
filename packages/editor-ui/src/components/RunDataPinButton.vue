<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { usePinnedData } from '@/composables/usePinnedData';

const locale = useI18n();

type Props = {
	tooltipContentsVisibility: {
		binaryDataTooltipContent: boolean;
		pinDataDiscoveryTooltipContent: boolean;
	};
	dataPinningDocsUrl: string;
	pinnedData: ReturnType<typeof usePinnedData>;
	disabled: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'togglePinData'): void;
}>();

const visible = computed(() =>
	props.tooltipContentsVisibility.pinDataDiscoveryTooltipContent ? true : undefined,
);
</script>

<template>
	<n8n-tooltip placement="bottom-end" :visible="visible">
		<template #content>
			<div v-if="props.tooltipContentsVisibility.binaryDataTooltipContent">
				{{ locale.baseText('ndv.pinData.pin.binary') }}
			</div>
			<div v-else-if="props.tooltipContentsVisibility.pinDataDiscoveryTooltipContent">
				{{ locale.baseText('node.discovery.pinData.ndv') }}
			</div>
			<div v-else>
				<strong>{{ locale.baseText('ndv.pinData.pin.title') }}</strong>
				<n8n-text size="small" tag="p">
					{{ locale.baseText('ndv.pinData.pin.description') }}

					<n8n-link :to="props.dataPinningDocsUrl" size="small">
						{{ locale.baseText('ndv.pinData.pin.link') }}
					</n8n-link>
				</n8n-text>
			</div>
		</template>
		<n8n-icon-button
			:class="$style.pinDataButton"
			type="tertiary"
			:active="props.pinnedData.hasData.value"
			icon="thumbtack"
			:disabled="props.disabled"
			data-test-id="ndv-pin-data"
			@click="emit('togglePinData')"
		/>
	</n8n-tooltip>
</template>

<style lang="scss" module>
.pinDataButton {
	svg {
		transition: transform 0.3s ease;
	}
}
</style>
