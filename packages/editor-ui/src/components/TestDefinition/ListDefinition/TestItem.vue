<script setup lang="ts">
import TimeAgo from '@/components/TimeAgo.vue';
// import { useI18n } from '@/composables/useI18n';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import { N8nText, N8nIcon } from 'n8n-design-system';

defineProps<{
	name: string;
	testCases: number;
	execution?: TestRunRecord;
}>();
// const locale = useI18n();
</script>

<template>
	<div :class="$style.testCard">
		<slot name="prepend"></slot>
		<div :class="$style.testCardContent">
			<div>
				<N8nText bold tag="div">{{ name }}</N8nText>
				<N8nText tag="div" color="text-base" size="small"> {{ testCases }} test cases </N8nText>
			</div>

			<div>
				<template v-if="execution">
					<div>
						<N8nIcon icon="check-circle" color="success"></N8nIcon>
						<N8nIcon icon="exclamation-triangle" color="danger"></N8nIcon>
						<N8nIcon icon="spinner" spin color="warning"></N8nIcon>
						<N8nText size="small">
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
						<N8nText color="text-base" size="small" bold style="text-align: right">
							{{ value }}
						</N8nText>
					</template>
				</template>
			</div>
		</div>

		<slot name="append"></slot>
	</div>
</template>

<style module lang="scss">
.testCard {
	display: flex;
	align-items: center;
	background-color: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	padding: var(--spacing-xs) 20px var(--spacing-xs) var(--spacing-m);
	gap: 16px;
	border-radius: var(--border-radius-base);
	cursor: pointer;
	&:hover {
		background-color: var(--color-background-light);
	}
}

.testCardContent {
	display: grid;
	grid-template-columns: 1fr 1fr 150px;
	align-items: center;
	flex: 1;
}

.metrics {
	display: grid;
	grid-template-columns: 84px 1fr;
	column-gap: 18px;
}
</style>
