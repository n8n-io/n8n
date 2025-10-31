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

const formatPrice = (pricePerMil: number): string => {
	if (pricePerMil === 0) return 'Free';
	if (pricePerMil < 1) return `$${pricePerMil.toFixed(3)} / 1M`;
	return `$${pricePerMil.toFixed(2)} / 1M`;
};

const getIntelligenceIcon = (level: string): string => {
	return 'brain';
};

const capabilities = computed(() => {
	const caps = [];
	if (props.metadata.capabilities.functionCalling) {
		caps.push({ icon: 'wrench', label: 'Functions' });
	}
	if (props.metadata.capabilities.vision) {
		caps.push({ icon: 'eye', label: 'Vision' });
	}
	if (props.metadata.capabilities.structuredOutput) {
		caps.push({ icon: 'code', label: 'Structured Output' });
	}
	if (props.metadata.capabilities.imageGeneration) {
		caps.push({ icon: 'palette', label: 'Image Generation' });
	}
	if (props.metadata.capabilities.audio) {
		caps.push({ icon: 'mic', label: 'Audio' });
	}
	if (props.metadata.capabilities.extendedThinking) {
		caps.push({ icon: 'lightbulb', label: 'Extended Thinking' });
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
			<!-- Provider -->
			<span :class="$style.metadataText">{{ metadata.provider }}</span>

			<!-- Context Length -->
			<template v-if="metadata.contextLength > 0">
				<span :class="$style.separator">•</span>
				<span :class="$style.metadataText"
					>{{ formatContextLength(metadata.contextLength) }} context</span
				>
			</template>

			<!-- Price -->
			<template v-if="metadata.pricing.promptPerMilTokenUsd > 0">
				<span :class="$style.separator">•</span>
				<span :class="$style.metadataText">{{
					formatPrice(metadata.pricing.promptPerMilTokenUsd)
				}}</span>
			</template>

			<!-- Intelligence Level -->
			<span :class="$style.separator">•</span>
			<N8nIcon
				:icon="getIntelligenceIcon(metadata.intelligenceLevel)"
				size="small"
				:class="$style.intelligenceIcon"
			/>
			<span :class="$style.metadataText">{{ metadata.intelligenceLevel }}</span>

			<!-- Capability Icons -->
			<template v-if="capabilities.length > 0">
				<span :class="$style.separator">•</span>
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
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.separator {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xs);
	line-height: 1;
}

.metadataText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	text-transform: capitalize;
}

.intelligenceIcon {
	color: var(--color--text--tint-1);
}

.capabilities {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;
}

.capabilityIcon {
	color: var(--color--text--tint-1);
	cursor: help;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
