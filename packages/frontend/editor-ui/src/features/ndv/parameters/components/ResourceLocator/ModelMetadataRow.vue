<script setup lang="ts">
import type { IModelMetadata } from 'n8n-workflow';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

type Props = {
	metadata: IModelMetadata;
	name: string;
};

const props = defineProps<Props>();

const formatContextLength = (length: number): string => {
	if (length >= 1_000_000) {
		return `${(length / 1_000_000).toFixed(1)}M`;
	}
	if (length >= 1_000) {
		return `${Math.round(length / 1_000)}K`;
	}
	return length.toString();
};

const formatPrice = (inputPrice: number, outputPrice: number): string => {
	const formatSinglePrice = (price: number): string => {
		if (price === 0) return '0';
		if (price < 1) return `$${price.toFixed(3)}`;
		return `$${price.toFixed(2)}`;
	};

	const input = formatSinglePrice(inputPrice);
	const output = formatSinglePrice(outputPrice);

	// If both are the same or output is 0, just show one price
	if (inputPrice === outputPrice || outputPrice === 0) {
		return `${input}/1M`;
	}

	// Show both with arrow indicating input → output
	return `${input}→${output}/1M`;
};

type CapabilityIcon = 'wrench' | 'eye' | 'code' | 'palette' | 'mic' | 'lightbulb';

const capabilities = computed(() => {
	const caps: Array<{ icon: CapabilityIcon; label: string }> = [];
	if (props.metadata.capabilities.functionCalling) {
		caps.push({ icon: 'wrench' as const, label: 'Tool Calling' });
	}
	if (props.metadata.capabilities.vision) {
		caps.push({ icon: 'eye' as const, label: 'Vision' });
	}
	if (props.metadata.capabilities.structuredOutput) {
		caps.push({ icon: 'code' as const, label: 'Structured Output' });
	}
	if (props.metadata.capabilities.imageGeneration) {
		caps.push({ icon: 'palette' as const, label: 'Image Generation' });
	}
	if (props.metadata.capabilities.audio) {
		caps.push({ icon: 'mic' as const, label: 'Audio' });
	}
	if (props.metadata.capabilities.extendedThinking) {
		caps.push({ icon: 'lightbulb' as const, label: 'Extended Thinking' });
	}
	return caps;
});
</script>

<template>
	<div :class="$style.container">
		<!-- Model Name -->
		<div :class="$style.modelName">
			<N8nText bold size="small">{{ name }}</N8nText>
		</div>

		<!-- Metadata Line -->
		<div :class="$style.metadataLine">
			<!-- Context Length -->
			<template v-if="metadata.contextLength > 0">
				<span :class="$style.metadataText"
					>{{ formatContextLength(metadata.contextLength) }} context</span
				>
			</template>

			<!-- Price (Input → Output) -->
			<template
				v-if="
					metadata.pricing.promptPerMilTokenUsd > 0 || metadata.pricing.completionPerMilTokenUsd > 0
				"
			>
				<span :class="$style.separator">&middot;</span>
				<span :class="$style.metadataText">{{
					formatPrice(
						metadata.pricing.promptPerMilTokenUsd,
						metadata.pricing.completionPerMilTokenUsd,
					)
				}}</span>
				<span :class="$style.separator">&middot;</span>
			</template>

			<!-- Intelligence Level -->
			<N8nIcon icon="brain" size="small" />
			<span :class="$style.metadataText">{{ metadata.intelligenceLevel }}</span>

			<!-- Capability Icons -->
			<template v-if="capabilities.length > 0">
				<span :class="$style.separator">&middot;</span>
				<div :class="$style.capabilities">
					<N8nTooltip
						v-for="cap in capabilities"
						:key="cap.icon"
						:content="cap.label"
						placement="top"
					>
						<N8nIcon :icon="cap.icon" size="small" :class="$style.capabilityIcon" />
					</N8nTooltip>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	width: 100%;
}

.modelName {
	line-height: 1.2;
}

.metadataLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: nowrap;
	overflow: hidden;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.separator {
	font-size: var(--font-size-3xs);
	font-weight: bold;
	line-height: 1;
}

.metadataText {
	white-space: nowrap;
	text-transform: capitalize;
}

.capabilities {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;
}

.capabilityIcon {
	cursor: help;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
