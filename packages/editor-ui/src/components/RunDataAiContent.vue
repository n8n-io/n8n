<template>
	<div class="aiContent" v-if="inputData">
		<div class="node-name-wrapper">
			<span class="node-name">{{ inputData.node }}</span
			>&nbsp;(Run-Index: {{ inputData.runIndex }})
		</div>
		<div v-for="fullData of inputData.data">
			<div :class="['content', fullData.inOut]">
				<div class="in-out">
					{{ fullData.inOut === 'input' ? 'Input' : 'Output' }}
					<span
						class="type"
						:style="{ 'background-color': `var(${CONNECTOR_COLOR[fullData.type]})` }"
						>{{ fullData.type }}</span
					>
				</div>

				<div v-for="typeData in fullData.data">
					{{ void (contentData = getContent(typeData.json)) }}
					<div v-if="contentData.type === 'text'" class="content-text">
						{{ contentData.data }}
					</div>
					<div v-else-if="contentData.type === 'markdown'" class="content-markdown">
						<vue-markdown :source="contentData.data" class="markdown"></vue-markdown>
					</div>
					<div v-else-if="contentData.type === 'json'" class="content-markdown">
						<vue-markdown
							:source="jsonToMarkdown(contentData.data)"
							class="markdown"
						></vue-markdown>
					</div>
					{{ void (tokenData = getTokens(typeData.json)) }}
					<div class="tokens" v-if="tokenData">
						<strong>Tokens:</strong> {{ tokenData.totalTokens }} ({{
							tokenData.completionTokens
						}}
						Completion + {{ tokenData.promptTokens }} Prompt)
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { IAiData } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import VueMarkdown from 'vue-markdown-render';
import { CONNECTOR_COLOR } from '@/utils/nodeViewUtils';

export default defineComponent({
	name: 'run-data-json',
	mixins: [],
	components: {
		VueMarkdown,
	},
	props: {
		inputData: {
			type: Object as PropType<IAiData>,
		},
	},
	data() {
		return {
			CONNECTOR_COLOR,
		};
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
	},
	methods: {
		getTokens(
			data: IDataObject,
		): { completionTokens: number; promptTokens: number; totalTokens: number } | undefined {
			if (data.response) {
				if (data.response.llmOutput) {
					return data.response.llmOutput.tokenUsage;
				}
			}
			return undefined;
		},
		jsonToMarkdown(data: string | object): string {
			if (Array.isArray(data)) {
				return data
					.map((item) => this.jsonToMarkdown(item))
					.join('\n\n')
					.trim();
			}
			if (typeof data === 'string') {
				return '```json\n' + data + '\n```';
			}
			return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
		},
		getContent(
			data: IDataObject,
		): { type: 'json' | 'text' | 'markdown'; data: string | IDataObject } | undefined {
			if (data.response) {
				if (data.response.generations) {
					return {
						type: 'json',
						data: data.response.generations.map((content) => content.text),
					};
				}
			} else if (data.messages) {
				return {
					type: 'markdown',
					data: data.messages.map((content) => content.kwargs.content).join('\n\n'),
				};
			}

			return {
				type: 'json',
				data,
			};
		},
	},
});
</script>

<style lang="scss" module></style>

<style lang="scss">
.aiContent {
	padding: 0 1em 1em 1em;
	margin-top: 0.5em;

	.content {
		border: 1px solid #ccc;
		padding: 1em;

		.content-markdown {
			margin-top: 1em;
			white-space: pre-wrap;

			.markdown {
				h1 {
					font-size: 1.4em;
				}

				h2 {
					font-size: 1.2em;
				}

				h3 {
					font-size: 1em;
				}

				pre {
					background-color: #0000000d;
					border-radius: 4px;
					padding: 1em;
					white-space: pre-wrap;
				}
			}
		}

		.content-text {
			white-space: pre-line;
		}

		.in-out {
			font-size: 1.5em;
			font-weight: bold;
		}

		.tokens {
			font-size: 0.8em;
		}

		&.input {
			background-color: var(--color-background-xlight);
			border-radius: 4px 4px 0px 0px;
			border-width: 1px 1px 0 1px;
		}
		&.output {
			background-color: #00000004;
			border-width: 0 1px 1px 1px;
			border-radius: 0px 0px 4px 4px;
		}
	}

	.node-name-wrapper {
		font-size: 1.5em;
		margin-bottom: 0.5em;

		.node-name {
			border-radius: 4px;
			font-weight: bold;
		}
	}

	.type {
		border-radius: 4px;
		color: white;
		font-size: 0.45em;
		padding: 0.25em 0.5em;
		position: relative;
		top: -4px;
	}
}
</style>
