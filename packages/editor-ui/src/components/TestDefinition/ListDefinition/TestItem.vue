<script setup lang="ts">
import TimeAgo from '@/components/TimeAgo.vue';
// import { useI18n } from '@/composables/useI18n';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { N8nIcon, N8nText } from 'n8n-design-system';

defineProps<{
	name: string;
	testCases: number;
	execution?: TestRunRecord;
}>();
// const locale = useI18n();

const statusesColorDictionary: Record<TestRunRecord['status'], string> = {
	new: 'var(--color-primary)',
	running: 'var(--color-secondary)',
	completed: 'var(--color-success)',
	error: 'var(--color-danger)',
	cancelled: 'var(--color-foreground-dark)',
	warning: 'var(--color-warning)',
	success: 'var(--color-success)',
};
</script>

<template>
	<div :class="$style.testCard">
		<div :class="$style.testCardContent">
			<div>
				<N8nText bold tag="div">{{ name }}</N8nText>
				<N8nText tag="div" color="text-base" size="small"> {{ testCases }} test cases </N8nText>
			</div>

			<div>
				<template v-if="execution">
					<div
						style="display: inline-flex; gap: 8px; text-transform: capitalize; align-items: center"
					>
						<N8nIcon
							icon="circle"
							size="xsmall"
							:style="{ color: statusesColorDictionary[execution.status] }"
						></N8nIcon>
						<N8nText size="small" bold color="text-base">
							{{ execution.status }}
						</N8nText>
					</div>

					<N8nText tag="div" color="text-base" size="small">
						<TimeAgo :date="execution.updatedAt" />
					</N8nText>
				</template>
				<template v-else>
					<N8nText tag="div" color="text-base" size="small"> Never run </N8nText>
				</template>
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
							{{ value }}
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
	gap: 16px;
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
	}
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
