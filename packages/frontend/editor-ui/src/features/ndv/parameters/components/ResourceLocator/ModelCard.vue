<script setup lang="ts">
import type { IResourceLocatorResultExpanded } from '@/Interface';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref } from 'vue';

type Props = {
	model: IResourceLocatorResultExpanded;
	selected: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	select: [];
}>();

const expanded = ref(false);

const toggleExpand = (e: Event) => {
	e.stopPropagation();
	expanded.value = !expanded.value;
};

const metadata = computed(() => props.model.metadata);

const capabilityIcons = computed(() => {
	if (!metadata.value?.capabilities) return [];

	const icons: Array<{ icon: string; label: string }> = [];

	if (metadata.value.capabilities.functionCalling) {
		icons.push({ icon: 'wrench', label: 'Functions' });
	}
	if (metadata.value.capabilities.vision) {
		icons.push({ icon: 'eye', label: 'Vision' });
	}
	if (metadata.value.capabilities.imageGeneration) {
		icons.push({ icon: 'palette', label: 'Image Generation' });
	}
	if (metadata.value.capabilities.audio) {
		icons.push({ icon: 'mic', label: 'Audio' });
	}
	if (metadata.value.capabilities.structuredOutput) {
		icons.push({ icon: 'code', label: 'Structured Output' });
	}

	return icons;
});

const formatContextLength = (length: number): string => {
	if (length >= 1_000_000) {
		return `${(length / 1_000_000).toFixed(1)}M`;
	}
	if (length >= 1_000) {
		return `${(length / 1_000).toFixed(0)}K`;
	}
	return length.toString();
};

const formatPrice = (pricePerMil: number): string => {
	if (pricePerMil === 0) return 'Free';
	if (pricePerMil < 1) return `$${pricePerMil.toFixed(3)}/1M`;
	return `$${pricePerMil.toFixed(2)}/1M`;
};

const hasValidMetadata = computed(() => {
	return (
		metadata.value &&
		(metadata.value.contextLength > 0 || metadata.value.pricing.promptPerMilTokenUsd > 0)
	);
});

const getIntelligenceIcon = (level: string): string => {
	const icons = {
		low: 'chart-simple',
		medium: 'chart-line',
		high: 'brain',
	};
	return icons[level as keyof typeof icons] || 'chart-line';
};

const formatUseCase = (useCase: string): string => {
	return useCase
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};
</script>

<template>
	<div
		:class="{
			[$style.modelCard]: true,
			[$style.selected]: selected,
		}"
		data-test-id="model-card"
		@click="emit('select')"
	>
		<!-- Model Name and Provider -->
		<div :class="$style.modelName">
			<N8nText :class="$style.nameText" bold>{{ model.name }}</N8nText>
		</div>
		<div :class="$style.providerRow">
			<N8nText v-if="metadata?.provider" size="xsmall" color="text-light">{{
				metadata.provider
			}}</N8nText>
			<div v-if="metadata?.intelligenceLevel" :class="$style.intelligenceLevel">
				<N8nIcon :icon="getIntelligenceIcon(metadata.intelligenceLevel)" size="xsmall" />
				<N8nText size="xsmall" :class="$style.intelligenceLevelText" color="text-light">
					{{ metadata.intelligenceLevel }}
				</N8nText>
			</div>
		</div>

		<!-- Badges (Context and Price) -->
		<div v-if="hasValidMetadata" :class="$style.badges">
			<div v-if="metadata.contextLength > 0" :class="$style.badge">
				<N8nIcon icon="cube" size="xsmall" />
				<N8nText size="xsmall">{{ formatContextLength(metadata.contextLength) }} tokens</N8nText>
			</div>
			<div v-if="metadata.pricing.promptPerMilTokenUsd > 0" :class="$style.badge">
				<N8nIcon icon="dollar-sign" size="xsmall" />
				<N8nText size="xsmall">{{ formatPrice(metadata.pricing.promptPerMilTokenUsd) }}</N8nText>
			</div>
		</div>

		<!-- Capability Icons -->
		<div v-if="capabilityIcons.length > 0" :class="$style.capabilities">
			<N8nTooltip
				v-for="capability in capabilityIcons"
				:key="capability.icon"
				:content="capability.label"
				placement="top"
			>
				<N8nIcon :icon="capability.icon" size="small" :class="$style.capabilityIcon" />
			</N8nTooltip>
		</div>

		<!-- Expand Button -->
		<div
			v-if="metadata?.description || hasValidMetadata"
			:class="$style.expandButton"
			@click="toggleExpand"
		>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="xsmall" />
			<N8nText size="xsmall" color="primary">{{
				expanded ? 'Less details' : 'More details'
			}}</N8nText>
		</div>

		<!-- Expanded Details -->
		<div v-if="expanded" :class="$style.expandedDetails">
			<!-- Token Limits Section -->
			<div
				v-if="metadata?.contextLength || metadata?.maxOutputTokens"
				:class="$style.detailSection"
			>
				<N8nText :class="$style.sectionTitle" size="xsmall" bold color="text-dark"
					>Token Limits</N8nText
				>
				<div :class="$style.detailGrid">
					<div v-if="metadata.contextLength" :class="$style.detailItem">
						<N8nText size="xsmall" color="text-light">Context:</N8nText>
						<N8nText size="xsmall" bold>{{ metadata.contextLength.toLocaleString() }}</N8nText>
					</div>
					<div v-if="metadata.maxOutputTokens" :class="$style.detailItem">
						<N8nText size="xsmall" color="text-light">Max output:</N8nText>
						<N8nText size="xsmall" bold>{{ metadata.maxOutputTokens.toLocaleString() }}</N8nText>
					</div>
				</div>
			</div>

			<!-- Modalities Section -->
			<div
				v-if="
					(metadata?.inputModalities && metadata.inputModalities.length > 0) ||
					(metadata?.outputModalities && metadata.outputModalities.length > 0)
				"
				:class="$style.detailSection"
			>
				<N8nText :class="$style.sectionTitle" size="xsmall" bold color="text-dark"
					>Supported Formats</N8nText
				>
				<div :class="$style.detailGrid">
					<div
						v-if="metadata.inputModalities && metadata.inputModalities.length > 0"
						:class="$style.detailItem"
					>
						<N8nText size="xsmall" color="text-light">Input:</N8nText>
						<N8nText size="xsmall" bold>{{ metadata.inputModalities.join(', ') }}</N8nText>
					</div>
					<div
						v-if="metadata.outputModalities && metadata.outputModalities.length > 0"
						:class="$style.detailItem"
					>
						<N8nText size="xsmall" color="text-light">Output:</N8nText>
						<N8nText size="xsmall" bold>{{ metadata.outputModalities.join(', ') }}</N8nText>
					</div>
				</div>
			</div>

			<!-- Pricing Section -->
			<div v-if="metadata?.pricing" :class="$style.detailSection">
				<N8nText :class="$style.sectionTitle" size="xsmall" bold color="text-dark"
					>Pricing (per 1M tokens)</N8nText
				>
				<div :class="$style.detailGrid">
					<div :class="$style.detailItem">
						<N8nText size="xsmall" color="text-light">Input:</N8nText>
						<N8nText size="xsmall" bold>{{
							formatPrice(metadata.pricing.promptPerMilTokenUsd)
						}}</N8nText>
					</div>
					<div :class="$style.detailItem">
						<N8nText size="xsmall" color="text-light">Output:</N8nText>
						<N8nText size="xsmall" bold>{{
							formatPrice(metadata.pricing.completionPerMilTokenUsd)
						}}</N8nText>
					</div>
				</div>
			</div>

			<!-- Recommended For Section -->
			<div
				v-if="metadata?.recommendedFor && metadata.recommendedFor.length > 0"
				:class="$style.detailSection"
			>
				<N8nText :class="$style.sectionTitle" size="xsmall" bold color="text-dark"
					>Best For</N8nText
				>
				<div :class="$style.recommendedTags">
					<span
						v-for="useCase in metadata.recommendedFor"
						:key="useCase"
						:class="$style.recommendedTag"
					>
						{{ formatUseCase(useCase) }}
					</span>
				</div>
			</div>

			<!-- Description Section -->
			<div v-if="metadata?.description" :class="$style.description">
				<N8nText size="xsmall" color="text-light">{{ metadata.description }}</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.modelCard {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs);
	background: var(--color--background--light-3);
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	&:hover {
		border-color: var(--color--primary--tint-1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	&.selected {
		border-color: var(--color--primary);
		border-width: 2px;
		box-shadow: 0 0 0 2px var(--color--primary--tint-3);
	}
}

.modelName {
	margin-bottom: var(--spacing--5xs);
}

.nameText {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	word-break: break-word;
}

.modelProvider {
	margin-bottom: var(--spacing--3xs);
}

.providerRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--3xs);
	gap: var(--spacing--xs);
}

.intelligenceLevel {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: var(--color--background--light-2);
	border-radius: var(--radius--sm);
}

.intelligenceLevelText {
	text-transform: capitalize;
	font-weight: var(--font-weight--bold);
}

.badges {
	display: flex;
	gap: var(--spacing--4xs);
	flex-wrap: wrap;
	margin-bottom: var(--spacing--3xs);
}

.badge {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius--sm);
	color: var(--color--text);
}

.capabilities {
	display: flex;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
	margin-bottom: var(--spacing--3xs);
}

.capabilityIcon {
	color: var(--color--text--tint-1);
	transition: color 0.2s;

	&:hover {
		color: var(--color--primary);
	}
}

.expandButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	cursor: pointer;
	margin-top: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);

	&:hover {
		span {
			color: var(--color--primary--shade-1);
		}
	}
}

.expandedDetails {
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.detailSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.sectionTitle {
	margin-bottom: var(--spacing--4xs);
}

.detailGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--2xs) var(--spacing--xs);
}

.detailItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.description {
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	line-height: var(--line-height--xl);
}

.recommendedTags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.recommendedTag {
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: var(--color--primary--tint-3);
	border-radius: var(--radius--sm);
	color: var(--color--primary);
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
}
</style>
