<script setup lang="ts">
import type { TestRunRecord } from '@/api/evaluation.ee';
import TimeAgo from '@/components/TimeAgo.vue';
import { useI18n } from '@/composables/useI18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconColor } from '@n8n/design-system/types/icon';
import { computed } from 'vue';

const props = defineProps<{
	name: string;
	testCases: number;
	execution?: TestRunRecord;
	errors?: Array<{ field: string; message: string }>;
}>();

const locale = useI18n();

type IconDefinition = { icon: string; color: IconColor; spin?: boolean };

const statusesColorDictionary: Record<TestRunRecord['status'], IconDefinition> = {
	new: {
		icon: 'circle',
		color: 'foreground-dark',
	},
	running: {
		icon: 'spinner',
		color: 'secondary',
		spin: true,
	},
	completed: {
		icon: 'exclamation-circle',
		color: 'success',
	},
	error: {
		icon: 'exclamation-triangle',
		color: 'danger',
	},
	cancelled: {
		icon: 'minus-circle',
		color: 'foreground-xdark',
	},
	warning: {
		icon: 'exclamation-circle',
		color: 'warning',
	},
	success: {
		icon: 'circle-check',
		color: 'success',
	},
} as const;

const statusRender = computed<IconDefinition & { label: string }>(() => {
	if (props.errors?.length) {
		return {
			icon: 'adjust',
			color: 'foreground-dark',
			label: 'Incomplete',
		};
	}

	if (!props.execution) {
		return {
			icon: 'circle',
			color: 'foreground-dark',
			label: 'Never ran',
		};
	}

	return {
		...statusesColorDictionary[props.execution.status],
		label: props.execution.status,
	};
});
</script>

<template>
	<div :class="$style.testCard">
		<div :class="$style.testCardContent">
			<div>
				<N8nText bold tag="div" :class="$style.name">{{ name }}</N8nText>
				<N8nText tag="div" color="text-base" size="small">
					{{
						locale.baseText('evaluation.list.item.tests', {
							adjustToNumber: testCases,
						})
					}}
				</N8nText>
			</div>
			<div>
				<div :class="$style.status">
					<N8nIcon v-bind="statusRender" size="small" />
					<N8nText size="small" color="text-base">
						{{ statusRender.label }}
					</N8nText>
				</div>

				<N8nText v-if="errors?.length" tag="div" color="text-base" size="small" class="ml-m">
					{{
						locale.baseText('evaluation.list.item.missingFields', {
							adjustToNumber: errors.length,
						})
					}}
				</N8nText>
				<N8nText v-else-if="execution" tag="div" color="text-base" size="small" class="ml-m">
					<TimeAgo :date="execution.updatedAt" />
				</N8nText>
			</div>

			<div :class="$style.metrics">
				<template v-if="execution?.metrics">
					<template v-for="[key, value] in Object.entries(execution.metrics)" :key>
						<N8nText
							color="text-base"
							size="small"
							style="overflow: hidden; text-overflow: ellipsis"
						>
							{{ key }}
						</N8nText>
						<N8nText color="text-base" size="small" bold>
							{{ Math.round((value + Number.EPSILON) * 100) / 100 }}
						</N8nText>
					</template>
				</template>
			</div>
		</div>

		<slot name="prepend"></slot>
		<slot name="append"></slot>
	</div>
</template>

<style module lang="scss">
.testCard {
	display: flex;
	align-items: center;
	background-color: var(--color-background-xlight);
	padding: var(--spacing-xs) 20px var(--spacing-xs) var(--spacing-m);
	gap: var(--spacing-s);
	border-bottom: 1px solid var(--color-foreground-base);
	cursor: pointer;

	&:first-child {
		border-top-left-radius: inherit;
		border-top-right-radius: inherit;
	}
	&:last-child {
		border-bottom-color: transparent;
		border-bottom-left-radius: inherit;
		border-bottom-right-radius: inherit;
	}

	&:hover {
		background-color: var(--color-background-light);
		.name {
			color: var(--color-primary);
		}
	}
}

.status {
	display: inline-flex;
	gap: 8px;
	text-transform: capitalize;
	align-items: center;
}

.testCardContent {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	align-items: center;
	flex: 1;
	gap: var(--spacing-xs);
}

.metrics {
	display: grid;
	grid-template-columns: 120px 1fr;
	column-gap: 18px;
}
</style>
