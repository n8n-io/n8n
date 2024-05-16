<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import type { PropType } from 'vue';
import { computed } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useToast } from '@/composables/useToast';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import type {
	IDataObject,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeApiError,
	NodeError,
	NodeOperationError,
} from 'n8n-workflow';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { MAX_DISPLAY_DATA_SIZE } from '@/constants';
import type { BaseTextKey } from '@/plugins/i18n';

const props = defineProps({
	error: {
		type: Object as PropType<NodeError | NodeApiError | NodeOperationError>,
		required: true,
	},
});

const clipboard = useClipboard();
const toast = useToast();
const i18n = useI18n();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const rootStore = useRootStore();

const displayCause = computed(() => {
	return JSON.stringify(props.error.cause).length < MAX_DISPLAY_DATA_SIZE;
});

const parameters = computed<INodeProperties[]>(() => {
	const node = ndvStore.activeNode;
	if (!node) {
		return [];
	}
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

	if (nodeType === null) {
		return [];
	}

	return nodeType.properties;
});

const n8nVersion = computed(() => {
	const baseUrl = rootStore.urlBaseEditor;
	let instanceType = 'Self Hosted';

	if (baseUrl.includes('n8n.cloud')) {
		instanceType = 'Cloud';
	}

	return rootStore.versionCli + ` (${instanceType})`;
});

const hasManyInputItems = computed(() => {
	return ndvStore.ndvInputData.length > 1;
});

const nodeDefaultName = computed(() => {
	const node = props.error?.node;
	if (!node) {
		return 'Node';
	}

	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	return nodeType?.defaults?.name || node.name;
});

const prepareRawMessages = computed(() => {
	const returnData: Array<string | IDataObject> = [];
	if (!props.error.messages?.length) {
		return [];
	}
	const errorMessage = getErrorMessage();

	Array.from(new Set(props.error.messages)).forEach((message) => {
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
});

function nodeVersionTag(nodeType: NodeError['node']): string {
	if (!nodeType || ('hidden' in nodeType && nodeType.hidden)) {
		return i18n.baseText('nodeSettings.deprecated');
	}

	const latestNodeVersion = Math.max(...nodeTypesStore.getNodeVersions(nodeType.type));

	if (latestNodeVersion === nodeType.typeVersion) {
		return i18n.baseText('nodeSettings.latest');
	}

	return i18n.baseText('nodeSettings.latestVersion', {
		interpolate: { version: latestNodeVersion.toString() },
	});
}

function prepareDescription(description: string): string {
	return sanitizeHtml(description.replace(/`(.*?)`/g, '<code>$1</code>'));
}

function getErrorDescription(): string {
	const isSubNodeError =
		props.error.name === 'NodeOperationError' &&
		(props.error as NodeOperationError).functionality === 'configuration-node';

	if (isSubNodeError) {
		return prepareDescription(
			props.error.description +
				i18n.baseText('pushConnection.executionError.openNode', {
					interpolate: { node: props.error.node.name },
				}),
		);
	}

	if (props.error.context?.descriptionKey) {
		const interpolate = {
			nodeCause: props.error.context.nodeCause as string,
			runIndex: (props.error.context.runIndex as string) ?? '0',
			itemIndex: (props.error.context.itemIndex as string) ?? '0',
		};
		return prepareDescription(
			i18n.baseText(
				`nodeErrorView.description.${props.error.context.descriptionKey as string}` as BaseTextKey,
				{ interpolate },
			),
		);
	}

	if (!props.error.context?.descriptionTemplate) {
		return prepareDescription(props.error.description ?? '');
	}

	const parameterName = parameterDisplayName(props.error.context.parameter as string);
	return prepareDescription(
		(props.error.context.descriptionTemplate as string).replace(/%%PARAMETER%%/g, parameterName),
	);
}

function addItemIndexSuffix(message: string): string {
	let itemIndexSuffix = '';

	const ITEM_INDEX_SUFFIX_TEXT = '[item ';

	if (
		hasManyInputItems.value &&
		!message.includes(ITEM_INDEX_SUFFIX_TEXT) &&
		props.error?.context?.itemIndex !== undefined
	) {
		itemIndexSuffix = ` [item ${props.error.context.itemIndex}]`;
	}

	return message + itemIndexSuffix;
}

function getErrorMessage(): string {
	const baseErrorMessage = '';
	let message = '';

	const isSubNodeError =
		props.error.name === 'NodeOperationError' &&
		(props.error as NodeOperationError).functionality === 'configuration-node';

	if (isSubNodeError) {
		message = i18n.baseText('nodeErrorView.errorSubNode', {
			interpolate: { node: props.error.node.name },
		});
	} else if (
		props.error.message === props.error.description ||
		!props.error.context?.messageTemplate
	) {
		message = baseErrorMessage + props.error.message;
	} else {
		const parameterName = parameterDisplayName(props.error.context.parameter as string);

		message =
			baseErrorMessage +
			(props.error.context.messageTemplate as string).replace(/%%PARAMETER%%/g, parameterName);
	}

	return addItemIndexSuffix(message);
}

function parameterDisplayName(path: string, fullPath = true) {
	try {
		const params = getParameterName(parameters.value, path.split('.'));
		if (!params.length) {
			throw new Error();
		}

		if (!fullPath) {
			return params.pop()!.displayName;
		}
		return params.map((parameter) => parameter.displayName).join(' > ');
	} catch (error) {
		return `Could not find parameter "${path}"`;
	}
}

function getParameterName(
	params: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>,
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
	const currentParameter = params.find(
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
			...getParameterName((currentParameter as INodeProperties).options!, pathParts),
		];
	}

	if (currentParameter.hasOwnProperty('values')) {
		return [
			currentParameter,
			...getParameterName((currentParameter as INodePropertyCollection).values, pathParts),
		];
	}

	// We can not resolve any deeper so lets stop here and at least return hopefully something useful
	return [currentParameter];
}

function copyErrorDetails() {
	const error = props.error;

	const errorInfo: IDataObject = {
		errorMessage: getErrorMessage(),
	};
	if (error.description) {
		errorInfo.errorDescription = error.description;
	}

	//add error details
	const errorDetails: IDataObject = {};

	if (error?.messages?.length) {
		errorDetails.rawErrorMessage = error.messages;
	}

	if ('httpCode' in error && error.httpCode) {
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

	n8nDetails.n8nVersion = n8nVersion.value;

	n8nDetails.binaryDataMode = rootStore.binaryDataMode;

	if (error.cause) {
		n8nDetails.cause = error.cause;
	}

	n8nDetails.stackTrace = error.stack?.split('\n');

	errorInfo.n8nDetails = n8nDetails;

	void clipboard.copy(JSON.stringify(errorInfo, null, 2));
	copySuccess();
}

function copySuccess() {
	toast.showMessage({
		title: i18n.baseText('nodeErrorView.showMessage.title'),
		type: 'info',
	});
}
</script>

<template>
	<div class="node-error-view">
		<div class="node-error-view__header">
			<div class="node-error-view__header-message">
				<div>
					{{ getErrorMessage() }}
				</div>
			</div>
			<div
				v-if="error.description || error.context?.descriptionKey"
				class="node-error-view__header-description"
				v-html="getErrorDescription()"
			></div>
		</div>

		<div class="node-error-view__info">
			<div class="node-error-view__info-header">
				<p class="node-error-view__info-title">
					{{ i18n.baseText('nodeErrorView.details.title') }}
				</p>
				<n8n-tooltip
					class="item"
					:content="i18n.baseText('nodeErrorView.copyToClipboard.tooltip')"
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
					v-if="
						('httpCode' in error && error.httpCode) ||
						prepareRawMessages.length ||
						error?.context?.data ||
						error.extra
					"
					class="node-error-view__details"
				>
					<summary class="node-error-view__details-summary">
						<font-awesome-icon class="node-error-view__details-icon" icon="angle-right" />
						{{
							i18n.baseText('nodeErrorView.details.from', {
								interpolate: { node: `${nodeDefaultName}` },
							})
						}}
					</summary>
					<div class="node-error-view__details-content">
						<div v-if="'httpCode' in error && error.httpCode" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.errorCode') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.httpCode }}</code>
							</p>
						</div>
						<div v-if="prepareRawMessages.length" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.rawMessages') }}
							</p>
							<div class="node-error-view__details-value">
								<div v-for="(msg, index) in prepareRawMessages" :key="index">
									<pre><code>{{ msg }}</code></pre>
								</div>
							</div>
						</div>
						<div v-if="error?.context?.data" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.errorData') }}
							</p>
							<div class="node-error-view__details-value">
								<pre><code>{{ error.context.data }}</code></pre>
							</div>
						</div>
						<div v-if="error.extra" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.errorExtra') }}
							</p>
							<div class="node-error-view__details-value">
								<pre><code>{{ error.extra }}</code></pre>
							</div>
						</div>
						<div v-if="error.context && error.context.request" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.request') }}
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
						{{ i18n.baseText('nodeErrorView.details.info') }}
					</summary>
					<div class="node-error-view__details-content">
						<div
							v-if="error.context && error.context.itemIndex !== undefined"
							class="node-error-view__details-row"
						>
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.itemIndex') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.context.itemIndex }}</code>
							</p>
						</div>

						<div
							v-if="error.context && error.context.runIndex !== undefined"
							class="node-error-view__details-row"
						>
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.runIndex') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.context.runIndex }}</code>
							</p>
						</div>

						<div
							v-if="error.context && error.context.parameter !== undefined"
							class="node-error-view__details-row"
						>
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.inParameter') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ parameterDisplayName(`${error.context.parameter}`) }}</code>
							</p>
						</div>

						<div v-if="error.node && error.node.type" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.nodeType') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ error.node.type }}</code>
							</p>
						</div>

						<div v-if="error.node && error.node.typeVersion" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.nodeVersion') }}
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
								{{ i18n.baseText('nodeErrorView.details.n8nVersion') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ n8nVersion }}</code>
							</p>
						</div>

						<div v-if="error.timestamp" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.time') }}
							</p>
							<p class="node-error-view__details-value">
								<code>{{ new Date(error.timestamp).toLocaleString() }}</code>
							</p>
						</div>

						<div v-if="error.cause && displayCause" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.errorCause') }}
							</p>

							<pre class="node-error-view__details-value"><code>{{ error.cause }}</code></pre>
						</div>

						<div
							v-if="error.context && error.context.causeDetailed"
							class="node-error-view__details-row"
						>
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.causeDetailed') }}
							</p>

							<pre
								class="node-error-view__details-value"
							><code>{{ error.context.causeDetailed }}</code></pre>
						</div>

						<div v-if="error.stack" class="node-error-view__details-row">
							<p class="node-error-view__details-label">
								{{ i18n.baseText('nodeErrorView.details.stackTrace') }}
							</p>

							<pre class="node-error-view__details-value"><code>{{ error.stack }}</code></pre>
						</div>
					</div>
				</details>
			</div>
		</div>
	</div>
</template>

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
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-s) var(--spacing-3xs) var(--spacing-s);
		color: var(--color-ndv-output-error-message);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-s);
	}

	&__header-description {
		padding: 0 var(--spacing-s) var(--spacing-3xs) var(--spacing-s);
		font-size: var(--font-size-xs);

		ul {
			padding: var(--spacing-s) 0;
			padding-left: var(--spacing-l);
		}

		code {
			font-size: var(--font-size-xs);
			color: var(--color-text-base);
			background: var(--color-background-base);
			padding: var(--spacing-5xs);
			border-radius: var(--border-radius-base);
		}
	}

	&__debugging {
		font-size: var(--font-size-s);

		ul,
		ol,
		dl {
			padding-left: var(--spacing-s);
			margin-top: var(--spacing-2xs);
			margin-bottom: var(--spacing-2xs);
		}

		pre {
			padding: var(--spacing-s);
			width: 100%;
			overflow: auto;
			background: var(--color-background-light);
			code {
				font-size: var(--font-size-s);
			}
		}
	}

	&__feedback-toolbar {
		display: flex;
		align-items: center;
		margin-top: var(--spacing-s);
		padding-top: var(--spacing-3xs);
		border-top: 1px solid var(--color-foreground-base);
	}

	&__feedback-button {
		width: var(--spacing-2xl);
		height: var(--spacing-2xl);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		&:hover {
			color: var(--color-primary);
		}
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
			white-space: normal;
			word-wrap: break-word;
		}
	}
}
</style>
