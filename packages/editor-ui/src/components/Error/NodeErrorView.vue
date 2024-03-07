<template>
	<div class="node-error-view">
		<div class="node-error-view__header">
			<div class="node-error-view__header-message" v-text="getErrorMessage()" />
			<div
				class="node-error-view__header-description"
				v-if="error.description"
				v-html="getErrorDescription()"
			></div>
		</div>

		<div class="node-error-view__info">
			<div class="node-error-view__info-header">
				<p class="node-error-view__info-title">
					{{ $locale.baseText('nodeErrorView.details.title') }}
				</p>
				<n8n-tooltip
					class="item"
					:content="$locale.baseText('nodeErrorView.copyToClipboard.tooltip')"
					placement="left"
				>
					<div class="copy-button">
						<n8n-icon-button
							icon="copy"
							type="secondary"
							size="mini"
							text="true"
							transparent-background="transparent"
							@click="copyErrorDetails"
						/>
					</div>
				</n8n-tooltip>
			</div>

			<div class="node-error-view__info-content">
				<details
					class="node-error-view__details"
					v-if="error.httpCode || prepareRawMessages.length || error?.context?.data || error.extra"
				>
					<summary class="node-error-view__details-summary">
						<font-awesome-icon class="node-error-view__details-icon" icon="angle-right" />
						{{
							$locale.baseText('nodeErrorView.details.from', {
								interpolate: { node: getNodeDefaultName(error?.node) as string },
							})
						}}
					</summary>
					<div class="node-error-view__details-content">
						<div class="node-error-view__details-row" v-if="error.httpCode">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.errorCode') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.httpCode }}</code>
							</p>
						</div>
						<div class="node-error-view__details-row" v-if="prepareRawMessages.length">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.rawMessages') }}
							</p>
							<div class="node-error-view__details-value">
								<div v-for="(msg, index) in prepareRawMessages" :key="index">
									<pre><code>{{ msg }}</code></pre>
								</div>
							</div>
						</div>
						<div class="node-error-view__details-row" v-if="error?.context?.data">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.errorData') }}
							</p>
							<div class="node-error-view__details-value">
								<pre><code>{{ error.context.data }}</code></pre>
							</div>
						</div>
						<div class="node-error-view__details-row" v-if="error.extra">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.errorExtra') }}
							</p>
							<div class="node-error-view__details-value">
								<pre><code>{{ error.extra }}</code></pre>
							</div>
						</div>
						<div class="node-error-view__details-row" v-if="error.context && error.context.request">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.request') }}
							</p>
							<div class="node-error-view__details-value">
								<pre><code>{{ error.context.request }}</code></pre>
							</div>
						</div>
					</div>
				</details>

				<details class="node-error-view__details">
					<summary class="node-error-view__details-summary">
						<font-awesome-icon class="node-error-view__details-icon" icon="angle-right" />
						{{ $locale.baseText('nodeErrorView.details.info') }}
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
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.runIndex') }}
							</p>
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

						<div class="node-error-view__details-row" v-if="error.node && error.node.type">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.nodeType') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.node.type }}</code>
							</p>
						</div>

						<div class="node-error-view__details-row" v-if="error.node && error.node.typeVersion">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.nodeVersion') }}
							</p>
							<p class="node-error-view__details-value">
								<code>
									<span>{{ error.node.typeVersion + ' ' }}</span>
									<span>({{ nodeVersionTag(error.node) }})</span>
								</code>
							</p>
						</div>

						<div class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.n8nVersion') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ n8nVersion }}</code>
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
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.errorCause') }}
							</p>

							<pre class="node-error-view__details-value"><code>{{ error.cause }}</code></pre>
						</div>

						<div
							class="node-error-view__details-row"
							v-if="error.context && error.context.causeDetailed"
						>
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.causeDetailed') }}
							</p>

							<pre
								class="node-error-view__details-value"
							><code>{{ error.context.causeDetailed }}</code></pre>
						</div>

						<div class="node-error-view__details-row" v-if="error.stack">
							<p class="node-error-view__details-label">
								{{ $locale.baseText('nodeErrorView.details.stackTrace') }}
							</p>

							<pre class="node-error-view__details-value"><code>{{ error.stack }}</code></pre>
						</div>
					</div>
				</details>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

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
import { useRootStore } from '@/stores/n8nRoot.store';
import { useClipboard } from '@/composables/useClipboard';
import type { IDataObject } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

export default defineComponent({
	name: 'NodeErrorView',
	props: ['error'],
	setup() {
		const clipboard = useClipboard();

		return {
			clipboard,
			...useToast(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useRootStore),
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
		n8nVersion() {
			const baseUrl = this.rootStore.urlBaseEditor;
			let instanceType = 'Self Hosted';

			if (baseUrl.includes('n8n.cloud')) {
				instanceType = 'Cloud';
			}

			return this.rootStore.versionCli + ` (${instanceType})`;
		},
		prepareRawMessages() {
			const returnData: Array<string | IDataObject> = [];
			if (!this.error.messages || !this.error.messages.length) {
				return [];
			}
			const errorMessage = this.getErrorMessage();

			(Array.from(new Set(this.error.messages)) as string[]).forEach((message) => {
				const isParsable = /^\d{3} - \{/.test(message);
				const parts = isParsable ? message.split(' - ').map((part) => part.trim()) : [];

				//try to parse the message as JSON
				for (const part of parts) {
					try {
						const parsed = JSON.parse(part);
						if (typeof parsed === 'object') {
							returnData.push(parsed);
							return;
						}
					} catch (error) {}
				}
				//if message is the same as error message, do not include it
				if (message === errorMessage) return;
				returnData.push(message);
			});
			return returnData;
		},
	},
	methods: {
		getNodeDefaultName(node: INodeUi) {
			if (!node) return 'Node';
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
			return nodeType?.defaults?.name || node.name;
		},
		nodeVersionTag(nodeType: IDataObject): string {
			if (!nodeType || nodeType.hidden) {
				return this.$locale.baseText('nodeSettings.deprecated');
			}

			const latestNodeVersion = Math.max(
				...this.nodeTypesStore.getNodeVersions(nodeType.type as string),
			);

			if (latestNodeVersion === nodeType.typeVersion) {
				return this.$locale.baseText('nodeSettings.latest');
			}

			return this.$locale.baseText('nodeSettings.latestVersion', {
				interpolate: { version: latestNodeVersion.toString() },
			});
		},
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

		copyErrorDetails() {
			const error = this.error;

			const errorInfo: IDataObject = {
				errorMessage: this.getErrorMessage(),
			};
			if (error.description) {
				errorInfo.errorDescription = error.description;
			}

			//add error details
			const errorDetails: IDataObject = {};

			if (error?.messages?.length) {
				errorDetails.rawErrorMessage = error.messages;
			}

			if (error.httpCode) {
				errorDetails.httpCode = error.httpCode;
			}

			if (error.context && error.context.data) {
				errorDetails.errorData = error.context.data;
			}

			if (error.extra) {
				errorDetails.errorExtra = error.extra;
			}

			errorInfo.errorDetails = errorDetails;

			//add n8n details
			const n8nDetails: IDataObject = {};

			if (error.node) {
				n8nDetails.nodeName = error.node.name;
				n8nDetails.nodeType = error.node.type;
				n8nDetails.nodeVersion = error.node.typeVersion;

				if (error.node?.parameters?.resource) {
					n8nDetails.resource = error.node.parameters.resource;
				}
				if (error?.node?.parameters?.operation) {
					n8nDetails.operation = error.node.parameters.operation;
				}
			}

			if (error.context) {
				if (error.context.itemIndex !== undefined) {
					n8nDetails.itemIndex = error.context.itemIndex;
				}

				if (error.context.runIndex !== undefined) {
					n8nDetails.runIndex = error.context.runIndex;
				}

				if (error.context.parameter !== undefined) {
					n8nDetails.parameter = error.context.parameter;
				}

				if (error.context.causeDetailed) {
					n8nDetails.causeDetailed = error.context.causeDetailed;
				}
			}

			if (error.timestamp) {
				n8nDetails.time = new Date(error.timestamp).toLocaleString();
			}

			n8nDetails.n8nVersion = this.n8nVersion;

			n8nDetails.binaryDataMode = this.rootStore.binaryDataMode;

			if (error.cause) {
				n8nDetails.cause = error.cause;
			}

			n8nDetails.stackTrace = error.stack && error.stack.split('\n');

			errorInfo.n8nDetails = n8nDetails;

			void this.clipboard.copy(JSON.stringify(errorInfo, null, 2));
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
		padding-bottom: var(--spacing-3xs);
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
		color: var(--color-danger);
		color: var(--color-danger);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-s);
	}

	&__header-description {
		padding: 0 var(--spacing-s) var(--spacing-3xs) var(--spacing-s);
		font-size: var(--font-size-xs);
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

	&__details:not(:last-child) {
		margin-bottom: var(--spacing-2xs);
	}

	&__details[open] {
		.node-error-view__details {
			&-icon {
				transform: rotate(90deg);
				transition: transform 0.3s ease;
			}
		}
	}

	&__details-summary {
		padding: var(--spacing-5xs) 0;
		font-size: var(--font-size-2xs);
		color: var(--color-text-dark);
		cursor: pointer;
		list-style-type: none;
		outline: none;
	}

	&__details-content {
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
		word-wrap: break-word;

		code {
			color: var(--color-json-string);
			text-wrap: wrap;
			word-wrap: break-word;
		}
	}
}
</style>
