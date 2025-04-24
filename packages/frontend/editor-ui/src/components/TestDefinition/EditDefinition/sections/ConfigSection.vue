<script setup lang="ts">
import BlockArrow from '@/components/TestDefinition/EditDefinition/BlockArrow.vue';
import { useI18n } from '@/composables/useI18n';
import { N8nText } from '@n8n/design-system';

defineProps<{
	isLoading: boolean;
	hasRuns: boolean;
	getFieldIssues: (key: string) => Array<{ field: string; message: string }>;
}>();

const locale = useI18n();
</script>

<template>
	<div>
		<div :class="$style.editForm">
			<template v-if="!hasRuns">
				<N8nText tag="div" color="text-dark" size="large" class="text-center">
					{{ locale.baseText('testDefinition.edit.step.intro') }}
				</N8nText>
				<BlockArrow class="mt-5xs mb-5xs" />
			</template>

			<template v-if="hasRuns">
				<N8nText tag="div" color="text-dark" size="large">
					<ul>
						<li>[ ] Add dataset trigger node</li>
						<li>[ ] Add evaluation metric node(s)</li>
					</ul>
				</N8nText>
			</template>

			<!-- Select Executions -->
			<!-- <EvaluationStep
				:issues="getFieldIssues('tags')"
				:tooltip="locale.baseText('testDefinition.edit.step.executions.tooltip')"
				:external-tooltip="!hasRuns"
			>
				<template #title>
					{{
						locale.baseText('testDefinition.edit.step.executions', {
							adjustToNumber: selectedTag?.usageCount ?? 0,
						})
					}}
				</template>
				<template #cardContent>
					<div :class="$style.tagInputTag">
						<i18n-t keypath="testDefinition.edit.step.tag">
							<template #tag>
								<N8nTag :text="selectedTag.name" :clickable="true" @click="renameTag">
									<template #tag>
										{{ selectedTag.name }} <font-awesome-icon icon="pen" size="sm" />
									</template>
								</N8nTag>
							</template>
						</i18n-t>
					</div>
					<N8nButton
						label="Select executions"
						type="tertiary"
						size="small"
						@click="openExecutionsView"
					/>
				</template>
			</EvaluationStep> -->
		</div>
	</div>
</template>

<style module lang="scss">
.pinnigModal {
	--dialog-max-width: none;
	margin: 0;
}

.nestedSteps {
	display: grid;
	grid-template-columns: 20% 1fr;
}

.tagInputTag {
	display: flex;
	gap: var(--spacing-3xs);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin-bottom: var(--spacing-xs);
}
</style>
