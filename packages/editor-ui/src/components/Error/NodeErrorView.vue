<template>
	<div class="node-error-view">
		<!-- Main info: Message and description -->
		<div class="node-error-view__header">
			<!-- <div class="node-error-view__header-title">ERROR</div> -->
			<div class="node-error-view__header-message" v-text="getErrorMessage()" />
			<div
				class="node-error-view__header-description"
				v-if="error.description"
				v-html="getErrorDescription()"
			></div>
		</div>

		<div class="node-error-view__info">
			<div class="node-error-view__info-header">
				<p class="node-error-view__info-title">Error details</p>
				<div class="copy-button">
					<n8n-icon-button
						:title="$locale.baseText('nodeErrorView.copyToClipboard')"
						icon="copy"
						type="secondary"
						size="mini"
						text="true"
						transparent-background="transparent"
						@click="copyCause"
					/>
				</div>
			</div>
			<div class="node-error-view__info-content">
				<!-- From the service (e.g. from Airtable) -->
				<details class="node-error-view__details" v-if="error.httpCode">
					<summary class="node-error-view__details-summary">
						<font-awesome-icon class="node-error-view__details-icon" icon="angle-right" />From
						{{ error.node.name }}
					</summary>
					<div class="node-error-view__details-content">
						<div class="node-error-view__details-row" v-if="error.httpCode">
							<p class="node-error-view__details-label">Error code</p>
							<p class="node-error-view__details-value">
								<code>{{ error.httpCode }}</code>
							</p>
						</div>
						<div class="node-error-view__details-row">
							<p class="node-error-view__details-label">Error message</p>
							<p class="node-error-view__details-value">
								<code v-text="getErrorMessage()"></code>
							</p>
						</div>
						<div class="node-error-view__details-row" v-if="error.description">
							<p class="node-error-view__details-label">Full message</p>
							<p class="node-error-view__details-value">
								<code>{{ error.description }}</code>
							</p>
						</div>
						<div class="node-error-view__details-row">
							<p class="node-error-view__details-label">Request</p>
							<p class="node-error-view__details-value">
								<code>...</code>
							</p>
						</div>
						<div class="node-error-view__details-row">
							<p class="node-error-view__details-label">Response</p>
							<p class="node-error-view__details-value">
								<code>...</code>
							</p>
						</div>
					</div>
				</details>

				<!-- Additional info -->
				<details class="node-error-view__details">
					<summary class="node-error-view__details-summary">
						<font-awesome-icon class="node-error-view__details-icon" icon="angle-right" />Other info
					</summary>
					<div class="node-error-view__details-content">
						<div
							class="node-error-view__details-row"
							v-if="error.context && error.context.itemIndex !== undefined"
						>
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.itemIndex') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.context.itemIndex }}</code>
							</p>
						</div>

						<div
							class="node-error-view__details-row"
							v-if="error.context && error.context.runIndex !== undefined"
						>
							<p class="node-error-view__details-label">Run indes</p>
							<p class="node-error-view__details-value">
								<code>{{ error.context.runIndex }}</code>
							</p>
						</div>

						<div
							class="node-error-view__details-row"
							v-if="error.context && error.context.parameter !== undefined"
						>
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.inParameter') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ parameterDisplayName(error.context.parameter) }}</code>
							</p>
						</div>

						<div class="node-error-view__details-row" v-if="error.node && error.node.typeVersion">
							<p class="node-error-view__details-label">Node version</p>
							<p class="node-error-view__details-value">
								<code>{{ error.node.typeVersion }}</code>
							</p>
						</div>

						<div class="node-error-view__details-row">
							<p class="node-error-view__details-label">n8n version</p>
							<p class="node-error-view__details-value">
								<code>Cloud 1.28.0</code>
							</p>
						</div>

						<div class="node-error-view__details-row" v-if="error.timestamp">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.time') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ new Date(error.timestamp).toLocaleString() }}</code>
							</p>
						</div>

						<div class="node-error-view__details-row" v-if="error.cause && displayCause">
							<p class="node-error-view__details-label">Error cause</p>

							<pre class="node-error-view__details-value"><code>{{ error.cause }}</code></pre>
						</div>

						<div
							class="node-error-view__details-row"
							v-if="error.context && error.context.causeDetailed"
						>
							<p class="node-error-view__details-label">Cause detailed</p>

							<pre
								class="node-error-view__details-value"
							><code>{{ error.context.causeDetailed }}</code></pre>
						</div>

						<div class="node-error-view__details-row" v-if="error.stack">
							<p class="node-error-view__details-label">Stack trace</p>

							<pre class="node-error-view__details-value"><code>{{ error.stack }}</code></pre>
						</div>
					</div>
				</details>
			</div>
		</div>
	</div>

	<!-- 	<br />
	<hr />
	<br />
	<pre class="node-error-view__details-value"><code>{{ error }}</code></pre>
--></template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import VueJsonPretty from 'vue-json-pretty';
import { useToast } from '@/composables/useToast';
import { MAX_DISPLAY_DATA_SIZE } from '@/constants';

import type {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useClipboard } from '@/composables/useClipboard';

export default defineComponent({
	name: 'NodeErrorView',
	components: {
		VueJsonPretty,
	},
	props: ['error'],
	setup() {
		const clipboard = useClipboard();

		return {
			clipboard,
			...useToast(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore),
		displayCause(): boolean {
			return JSON.stringify(this.error.cause).length < MAX_DISPLAY_DATA_SIZE;
		},
		parameters(): INodeProperties[] {
			const node = this.ndvStore.activeNode;
			if (!node) {
				return [];
			}
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

			if (nodeType === null) {
				return [];
			}

			return nodeType.properties;
		},
	},
	methods: {
		replacePlaceholders(parameter: string, message: string): string {
			const parameterName = this.parameterDisplayName(parameter, false);
			const parameterFullName = this.parameterDisplayName(parameter, true);
			return message
				.replace(/%%PARAMETER%%/g, parameterName)
				.replace(/%%PARAMETER_FULL%%/g, parameterFullName);
		},
		getErrorDescription(): string {
			const isSubNodeError =
				this.error.name === 'NodeOperationError' &&
				(this.error as NodeOperationError).functionality === 'configuration-node';

			if (isSubNodeError) {
				return sanitizeHtml(
					this.error.description +
						this.$locale.baseText('pushConnection.executionError.openNode', {
							interpolate: { node: this.error.node.name },
						}),
				);
			}
			if (!this.error.context?.descriptionTemplate) {
				return sanitizeHtml(this.error.description);
			}

			const parameterName = this.parameterDisplayName(this.error.context.parameter);
			return sanitizeHtml(
				this.error.context.descriptionTemplate.replace(/%%PARAMETER%%/g, parameterName),
			);
		},
		getErrorMessage(): string {
			const baseErrorMessage = '';

			const isSubNodeError =
				this.error.name === 'NodeOperationError' &&
				(this.error as NodeOperationError).functionality === 'configuration-node';

			if (isSubNodeError) {
				const baseErrorMessageSubNode = this.$locale.baseText('nodeErrorView.errorSubNode', {
					interpolate: { node: this.error.node.name },
				});
				return baseErrorMessageSubNode;
			}

			if (this.error.message === this.error.description) {
				return baseErrorMessage;
			}
			if (!this.error.context?.messageTemplate) {
				return baseErrorMessage + this.error.message;
			}

			const parameterName = this.parameterDisplayName(this.error.context.parameter);

			return (
				baseErrorMessage +
				this.error.context.messageTemplate.replace(/%%PARAMETER%%/g, parameterName)
			);
		},
		parameterDisplayName(path: string, fullPath = true) {
			try {
				const parameters = this.parameterName(this.parameters, path.split('.'));
				if (!parameters.length) {
					throw new Error();
				}

				if (!fullPath) {
					return parameters.pop()!.displayName;
				}
				return parameters.map((parameter) => parameter.displayName).join(' > ');
			} catch (error) {
				return `Could not find parameter "${path}"`;
			}
		},
		parameterName(
			parameters: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>,
			pathParts: string[],
		): Array<INodeProperties | INodePropertyCollection> {
			let currentParameterName = pathParts.shift();

			if (currentParameterName === undefined) {
				return [];
			}

			const arrayMatch = currentParameterName.match(/(.*)\[([\d])\]$/);
			if (arrayMatch !== null && arrayMatch.length > 0) {
				currentParameterName = arrayMatch[1];
			}
			const currentParameter = parameters.find(
				(parameter) => parameter.name === currentParameterName,
			) as unknown as INodeProperties | INodePropertyCollection;

			if (currentParameter === undefined) {
				throw new Error(`Could not find parameter "${currentParameterName}"`);
			}

			if (pathParts.length === 0) {
				return [currentParameter];
			}

			if (currentParameter.hasOwnProperty('options')) {
				return [
					currentParameter,
					...this.parameterName((currentParameter as INodeProperties).options!, pathParts),
				];
			}

			if (currentParameter.hasOwnProperty('values')) {
				return [
					currentParameter,
					...this.parameterName((currentParameter as INodePropertyCollection).values, pathParts),
				];
			}

			// We can not resolve any deeper so lets stop here and at least return hopefully something useful
			return [currentParameter];
		},
		copyCause() {
			void this.clipboard.copy(JSON.stringify(this.error.cause));
			this.copySuccess();
		},
		copySuccess() {
			this.showMessage({
				title: this.$locale.baseText('nodeErrorView.showMessage.title'),
				type: 'info',
			});
		},
	},
});
</script>

<style lang="scss">
.node-error-view {
	&__header {
		max-width: 960px;
		margin: 0 auto var(--spacing-s) auto;
		// padding: var(--spacing-m);
		padding-bottom: var(--spacing-4xs);
		background-color: var(--color-background-xlight);
		border: 1px solid var(--color-foreground-base);
		border-radius: var(--border-radius-large);
	}

	&__header-title {
		padding: var(--spacing-2xs) var(--spacing-s);
		border-bottom: 1px solid var(--color-danger-tint-1);
		font-size: var(--font-size-3xs);
		font-weight: var(--font-weight-bold);
		background-color: var(--color-danger-tint-2);
		border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
		color: var(--color-danger);
	}

	&__header-message {
		padding: var(--spacing-xs) var(--spacing-s) var(--spacing-3xs) var(--spacing-s);
		// color: var(--color-primary);
		color: var(--color-danger);
		color: var(--color-danger);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-s);
	}

	&__header-description {
		// margin-top: var(--spacing-2xs);
		padding: 0 var(--spacing-s) var(--spacing-xs) var(--spacing-s);
		font-size: var(--font-size-s);
	}

	&__info {
		max-width: 960px;
		margin: 0 auto;
		border: 1px solid var(--color-foreground-base);
		border-radius: var(--border-radius-large);
	}

	&__info-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-3xs) var(--spacing-3xs) var(--spacing-3xs) var(--spacing-s);
		border-bottom: 1px solid var(--color-foreground-base);
	}

	&__info-title {
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-dark);
	}

	&__info-content {
		padding: var(--spacing-2xs) var(--spacing-s);
	}

	&__details {
	}

	&__details:not(:last-child) {
		margin-bottom: var(--spacing-2xs);
	}

	&__details-summary {
		padding: var(--spacing-5xs) 0;
		font-size: var(--font-size-2xs);
		// font-weight: var(--font-weight-bold);
		color: var(--color-text-dark);
		cursor: pointer;
		list-style-type: none;
		outline: none;
	}

	&__details-content {
		// margin-top: var(--spacing-3xs);
		padding: var(--spacing-2xs) var(--spacing-s);
	}

	&__details-row {
		display: flex;
		padding: var(--spacing-4xs) 0;
	}

	&__details-row:not(:first-child) {
		border-top: 1px solid var(--color-foreground-base);
	}

	&__details-icon {
		margin-right: var(--spacing-xs);
	}

	&__details-label {
		flex-grow: 0;
		flex-shrink: 0;
		width: 120px;
		color: var(--color-text);
		font-size: var(--font-size-2xs);
	}

	&__details-value {
		flex: 1;
		overflow: hidden;
		margin-right: auto;
		color: var(--color-text);
		font-size: var(--font-size-2xs);

		code {
			color: var(--color-json-string);
			text-wrap: wrap;
		}
	}
}

/*
details > summary::-webkit-details-marker {
	display: none;
}

details[open] {
	.error-details__summary {
		border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
	}

	.error-details__icon {
		transform: rotate(90deg);
	}
}

.el-divider__text {
	background-color: var(--color-background-light);
}

.box-card {
	margin-top: 1em;
	overflow: auto;
}

.box-card__title {
	font-weight: 400;
}

.box-card__subtitle {
	font-weight: 200;
	font-style: italic;
	font-size: 0.7rem;
} */

/* .copy-button {
	position: absolute;
	right: 50px;
	z-index: 1000;
} */
</style>
