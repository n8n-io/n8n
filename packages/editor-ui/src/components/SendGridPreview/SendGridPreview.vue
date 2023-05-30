<template>
	<n8n-input-label
		size="small"
		color="text-dark"
		:bold="false"
		:label="$locale.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltipText="$locale.nodeText().inputLabelDescription(parameter, path)"
	>
		<iframe :srcdoc="srcdoc" class="iframe" ref="previewIframe" />

		<n8n-input-label label="Test Data" :bold="false" size="small" color="text-dark">
			<pre class="testData">{{ testData }}</pre>
		</n8n-input-label>
	</n8n-input-label>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PropType } from 'vue';
import mixins from 'vue-typed-mixins';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';

export default mixins(workflowHelpers).extend({
	name: 'SendGridPreview',
	props: {
		nodeValues: {
			type: Object as PropType<INodeParameters>,
			required: true,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		parameters: {
			type: Array as PropType<INodeProperties[]>,
			required: true,
		},
		path: {
			type: String,
			required: true,
		},
	},
	data() {
		return {
			srcdoc: '',
			testData: '',
		};
	},
	methods: {
		getApiKey() {
			const selectedApp = this.getParameterValue(this.nodeValues, 'esaApp', 'parameters');
			const esaApp = this.parameter.options?.find((app) => (app as any).appKey === selectedApp);
			return (esaApp as any)?.sendgridApiKey;
		},
		async getTemplate(templateId: string) {
			try {
				const apiKey = this.getApiKey();

				if (!apiKey) throw new Error('Selected app not configured.');

				const response = await fetch(`https://api.sendgrid.com/v3/templates/${templateId}`, {
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
				});

				const body = await response.json();
				const [latest] = body.versions;
				this.srcdoc = latest.html_content;
				this.testData = latest.test_data;
			} catch (error) {
				console.error({ error });
			}
		},
	},
	computed: {
		hasValue() {
			return (
				this.getParameterValue(this.$props.nodeValues, 'templateId', 'parameters') && this.srcdoc
			);
		},
	},
	watch: {
		'nodeValues.parameters.templateId'(nextValue: string) {
			this.getTemplate(nextValue);
		},
		hasValue(nextValue) {
			if (!nextValue) {
				(this.$refs.previewIframe as Element).classList.remove('withHeight');
			} else {
				(this.$refs.previewIframe as Element).classList.add('withHeight');
			}
		},
	},
});
</script>

<style scoped>
.iframe {
	margin-bottom: 1rem;
}

.withHeight {
	height: 25rem;
}

pre {
	white-space: pre-wrap;
}
</style>
