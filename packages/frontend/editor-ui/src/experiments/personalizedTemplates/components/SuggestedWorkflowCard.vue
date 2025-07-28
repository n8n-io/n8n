<script setup lang="ts">
import { usePersonalizedTemplatesStore } from '@/experiments/personalizedTemplates/stores/personalizedTemplates.store';
import { useI18n } from '@n8n/i18n';

type SuggestedWorkflow = {
	id: number;
	name: string;
};

const props = defineProps<{
	data: SuggestedWorkflow;
}>();
const { data } = props;

const {
	dismissSuggestedWorkflow,
	getTemplateRoute,
	trackUserClickedOnPersonalizedTemplate,
	trackUserDismissedCallout,
} = usePersonalizedTemplatesStore();
const locale = useI18n();

const onDismissCallout = () => {
	trackUserDismissedCallout(data.id);
	dismissSuggestedWorkflow(data.id);
};

const onTryTemplate = () => {
	trackUserClickedOnPersonalizedTemplate(data.id);
	dismissSuggestedWorkflow(data.id);
};
</script>

<template>
	<N8nCallout
		theme="secondary"
		:iconless="true"
		:class="$style['suggested-workflow-callout']"
		:slim="true"
	>
		<div :class="$style['callout-content']">
			{{ data.name }}
		</div>
		<template #trailingContent>
			<div :class="$style['callout-trailing-content']">
				<N8nLink
					data-test-id="suggested-workflow-button"
					size="small"
					:to="getTemplateRoute(data.id)"
					@click="onTryTemplate"
				>
					{{ locale.baseText('workflows.itemSuggestion.try') }}
				</N8nLink>
				<N8nIcon
					size="small"
					icon="x"
					:title="locale.baseText('generic.dismiss')"
					class="clickable"
					@click="onDismissCallout"
				/>
			</div>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.suggested-workflow-callout {
	margin-top: var(--spacing-xs);
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-m);
	border-style: dashed;

	.callout-content {
		display: flex;
		flex-direction: column;
	}

	.callout-trailing-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-m);
	}

	a {
		span {
			span {
				color: var(--color-callout-secondary-font);
			}
		}
	}
}
</style>
