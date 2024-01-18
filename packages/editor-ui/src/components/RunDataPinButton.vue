<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { usePinnedData } from '@/composables/usePinnedData';

type Props = {
	tooltipContentsVisibility: {
		binaryDataTooltipContent: boolean;
		controlledPinDataTooltipContent: boolean;
	};
	dataPinningDocsUrl: string;
	pinnedData: ReturnType<typeof usePinnedData>;
	isTooltipVisible?: boolean;
	disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isTooltipVisible: undefined,
	disabled: false,
});

const emit = defineEmits<{
	(event: 'togglePinData'): void;
}>();

const locale = useI18n();
</script>

<template>
	<n8n-tooltip v-show="true" placement="bottom-end" :visible="props.isTooltipVisible">
		<template #content>
			<div v-if="props.tooltipContentsVisibility.binaryDataTooltipContent">
				{{ locale.baseText('ndv.pinData.pin.binary') }}
			</div>
			<div v-else-if="props.tooltipContentsVisibility.controlledPinDataTooltipContent">
				<strong>{{ locale.baseText('ndv.pinData.pin.title') }}</strong>
				<n8n-text size="small" tag="p">
					{{ locale.baseText('ndv.pinData.pin.description') }}

					<n8n-link :to="props.dataPinningDocsUrl" size="small">
						{{ locale.baseText('ndv.pinData.pin.link') }}
					</n8n-link>
				</n8n-text>
			</div>
			<div v-else>
				{{ locale.baseText('node.discovery.pinData.ndv') }}
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
	margin-left: var(--spacing-2xs);
	svg {
		transition: transform 0.3s ease;
	}
}
</style>
