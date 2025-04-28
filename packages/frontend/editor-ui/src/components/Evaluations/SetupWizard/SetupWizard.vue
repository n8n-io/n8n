<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { N8nText } from '@n8n/design-system';
import N8nLink from '@n8n/design-system/components/N8nLink';

defineProps<{
	isLoading: boolean;
}>();

const locale = useI18n();
</script>

<template>
	<div>
		<div>
			<div>
				<N8nText size="large" color="text-dark" tag="h3" bold>
					{{ locale.baseText('evaluations.setupWizard.title') }}
				</N8nText>
				<N8nText tag="p" size="small" color="text-base" :class="$style.description">
					{{ locale.baseText('evaluations.setupWizard.description') }}<br />
					<N8nLink size="small" color="text-base" href="https://google.com/">{{
						locale.baseText('evaluations.setupWizard.moreInfo')
					}}</N8nLink>
				</N8nText>
			</div>
			<div>
				<div>
					1. Create a dataset and wire it up to your workflow
					<div>
						Populate a Google Sheet with one test input per row. Add an ‘Evaluation trigger’ node to
						run once per row.

						<button>Add ‘Evaluation trigger’</button>
					</div>
				</div>
				<div>
					2. Write outputs back to dataset
					<div>
						Connect the ‘Evaluation node’ to the LLM or Agent node that outputs the response. Add an
						‘Evaluation trigger’ to your workflow. It runs once per dataset row and passes that row
						into your workflow. Use the ‘Set outputs’ operation to log each output back to Google
						Sheets so you can view them all in one place.

						<button>Add ‘Evaluation node</button>
					</div>
				</div>
				<div>
					3. Calculate a quality score [Optional]
					<div>
						Add custom logic and nodes before the ‘Evaluation node’ to calculate your metrics. In
						the ‘Evaluation node,’ use the ‘Set evaluation metrics’ operation and map each metric
						you want to track.

						<button>Back to editor</button> <button>Skip</button>
					</div>
				</div>
				<div>
					<button>Test evaluation</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.description {
}
</style>
