<script lang="ts" setup>
import type { INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	OPEN_URL_PANEL_TRIGGER_NODE_TYPES,
	PRODUCTION_ONLY_TRIGGER_NODE_TYPES,
} from '@/constants';
import { useClipboard } from '@/composables/useClipboard';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { INodeUi } from '@/Interface';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';

import { ElCol, ElCollapseTransition, ElRow } from 'element-plus';
import { N8nIcon, N8nRadioButtons, N8nTooltip } from '@n8n/design-system';
const props = defineProps<{
	node: INodeUi;
	nodeTypeDescription: INodeTypeDescription | null;
}>();

const clipboard = useClipboard();
const workflowHelpers = useWorkflowHelpers();
const toast = useToast();
const i18n = useI18n();
const telemetry = useTelemetry();

const isMinimized = ref(
	props.nodeTypeDescription &&
		!OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name),
);
const showUrlFor = ref<'test' | 'production'>('test');

const isProductionOnly = computed(() => {
	return (
		props.nodeTypeDescription &&
		PRODUCTION_ONLY_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name)
	);
});

const urlOptions = computed(() => [
	...(isProductionOnly.value ? [] : [{ label: baseText.value.testUrl, value: 'test' }]),
	{
		label: baseText.value.productionUrl,
		value: 'production',
	},
]);

const visibleWebhookUrls = computed(() => {
	return webhooksNode.value.filter((webhook) => {
		if (typeof webhook.ndvHideUrl === 'string') {
			return !workflowHelpers.getWebhookExpressionValue(webhook, 'ndvHideUrl');
		}

		return !webhook.ndvHideUrl;
	});
});

const webhooksNode = computed(() => {
	if (props.nodeTypeDescription?.webhooks === undefined) {
		return [];
	}

	return props.nodeTypeDescription.webhooks.filter(
		(webhookData) => webhookData.restartWebhook !== true,
	);
});

const baseText = computed(() => {
	const nodeType = props.nodeTypeDescription?.name;
	switch (nodeType) {
		case CHAT_TRIGGER_NODE_TYPE:
			return {
				toggleTitle: i18n.baseText('nodeWebhooks.webhookUrls.chatTrigger'),
				clickToDisplay: i18n.baseText('nodeWebhooks.clickToDisplayWebhookUrls.formTrigger'),
				clickToHide: i18n.baseText('nodeWebhooks.clickToHideWebhookUrls.chatTrigger'),
				clickToCopy: i18n.baseText('nodeWebhooks.clickToCopyWebhookUrls.chatTrigger'),
				testUrl: i18n.baseText('nodeWebhooks.testUrl'),
				productionUrl: i18n.baseText('nodeWebhooks.productionUrl'),
				copyTitle: i18n.baseText('nodeWebhooks.showMessage.title.chatTrigger'),
				copyMessage: i18n.baseText('nodeWebhooks.showMessage.message.chatTrigger'),
			};

		case FORM_TRIGGER_NODE_TYPE:
			return {
				toggleTitle: i18n.baseText('nodeWebhooks.webhookUrls.formTrigger'),
				clickToDisplay: i18n.baseText('nodeWebhooks.clickToDisplayWebhookUrls.formTrigger'),
				clickToHide: i18n.baseText('nodeWebhooks.clickToHideWebhookUrls.formTrigger'),
				clickToCopy: i18n.baseText('nodeWebhooks.clickToCopyWebhookUrls.formTrigger'),
				testUrl: i18n.baseText('nodeWebhooks.testUrl'),
				productionUrl: i18n.baseText('nodeWebhooks.productionUrl'),
				copyTitle: i18n.baseText('nodeWebhooks.showMessage.title.formTrigger'),
				copyMessage: i18n.baseText('nodeWebhooks.showMessage.message.formTrigger'),
			};

		case MCP_TRIGGER_NODE_TYPE:
			return {
				toggleTitle: i18n.baseText('nodeWebhooks.webhookUrls.mcpTrigger'),
				clickToDisplay: i18n.baseText('nodeWebhooks.clickToDisplayWebhookUrls.mcpTrigger'),
				clickToHide: i18n.baseText('nodeWebhooks.clickToHideWebhookUrls.mcpTrigger'),
				clickToCopy: i18n.baseText('nodeWebhooks.clickToCopyWebhookUrls.mcpTrigger'),
				testUrl: i18n.baseText('nodeWebhooks.testUrl'),
				productionUrl: i18n.baseText('nodeWebhooks.productionUrl'),
				copyTitle: i18n.baseText('nodeWebhooks.showMessage.title.mcpTrigger'),
				copyMessage: undefined,
			};

		default:
			return {
				toggleTitle: i18n.baseText('nodeWebhooks.webhookUrls'),
				clickToDisplay: i18n.baseText('nodeWebhooks.clickToDisplayWebhookUrls'),
				clickToHide: i18n.baseText('nodeWebhooks.clickToHideWebhookUrls'),
				clickToCopy: i18n.baseText('nodeWebhooks.clickToCopyWebhookUrls'),
				testUrl: i18n.baseText('nodeWebhooks.testUrl'),
				productionUrl: i18n.baseText('nodeWebhooks.productionUrl'),
				copyTitle: i18n.baseText('nodeWebhooks.showMessage.title'),
				copyMessage: undefined,
			};
	}
});

function copyWebhookUrl(webhookData: IWebhookDescription): void {
	const webhookUrl = getWebhookUrlDisplay(webhookData);
	void clipboard.copy(webhookUrl);

	toast.showMessage({
		title: baseText.value.copyTitle,
		message: baseText.value.copyMessage,
		type: 'success',
	});

	telemetry.track('User copied webhook URL', {
		pane: 'parameters',
		type: `${showUrlFor.value} url`,
	});
}

function getWebhookUrlDisplay(webhookData: IWebhookDescription): string {
	if (props.node) {
		return workflowHelpers.getWebhookUrl(
			webhookData,
			props.node,
			isProductionOnly.value ? 'production' : showUrlFor.value,
		);
	}
	return '';
}

function isWebhookMethodVisible(webhook: IWebhookDescription): boolean {
	try {
		const method = workflowHelpers.getWebhookExpressionValue(webhook, 'httpMethod', false);
		if (Array.isArray(method) && method.length !== 1) {
			return false;
		}
	} catch (error) {}

	if (typeof webhook.ndvHideMethod === 'string') {
		return !workflowHelpers.getWebhookExpressionValue(webhook, 'ndvHideMethod');
	}

	return !webhook.ndvHideMethod;
}

function getWebhookHttpMethod(webhook: IWebhookDescription): string {
	const method = workflowHelpers.getWebhookExpressionValue(webhook, 'httpMethod', false);
	if (Array.isArray(method)) {
		return method[0];
	}
	return method;
}

watch(
	() => props.node,
	() => {
		isMinimized.value =
			props.nodeTypeDescription &&
			!OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name);
	},
);
</script>

<template>
	<div v-if="webhooksNode.length && visibleWebhookUrls.length > 0" class="webhooks">
		<div
			class="clickable headline"
			:class="{ expanded: !isMinimized }"
			:title="isMinimized ? baseText.clickToDisplay : baseText.clickToHide"
			@click="isMinimized = !isMinimized"
		>
			<N8nIcon icon="chevron-right" class="minimize-button minimize-icon" />
			{{ baseText.toggleTitle }}
		</div>
		<ElCollapseTransition>
			<div v-if="!isMinimized" class="node-webhooks">
				<div v-if="!isProductionOnly" class="url-selection">
					<ElRow>
						<ElCol :span="24">
							<N8nRadioButtons v-model="showUrlFor" :options="urlOptions" />
						</ElCol>
					</ElRow>
				</div>

				<N8nTooltip
					v-for="(webhook, index) in visibleWebhookUrls"
					:key="index"
					class="item"
					:content="baseText.clickToCopy"
					placement="left"
				>
					<div v-if="isWebhookMethodVisible(webhook)" class="webhook-wrapper">
						<div class="http-field">
							<div class="http-method">{{ getWebhookHttpMethod(webhook) }}<br /></div>
						</div>
						<div class="url-field">
							<div class="webhook-url left-ellipsis clickable" @click="copyWebhookUrl(webhook)">
								{{ getWebhookUrlDisplay(webhook) }}<br />
							</div>
						</div>
					</div>
					<div v-else class="webhook-wrapper">
						<div class="url-field-full-width">
							<div class="webhook-url left-ellipsis clickable" @click="copyWebhookUrl(webhook)">
								{{ getWebhookUrlDisplay(webhook) }}<br />
							</div>
						</div>
					</div>
				</N8nTooltip>
			</div>
		</ElCollapseTransition>
	</div>
</template>

<style scoped lang="scss">
.webhooks {
	padding-bottom: var(--spacing--xs);
	margin: var(--spacing--xs) 0;
	border-bottom: 1px solid var(--color--text--tint-2);

	.headline {
		color: $color-primary;
		font-weight: var(--font-weight--bold);
		font-size: var(--font-size--2xs);
	}
}

.http-field {
	position: absolute;
	width: 50px;
	display: inline-block;
	top: calc(50% - 8px);
}

.http-method {
	background-color: var(--color--foreground--shade-2);
	width: 40px;
	height: 16px;
	line-height: 16px;
	margin-left: 5px;
	text-align: center;
	border-radius: 2px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--foreground--tint-2);
}

.minimize-icon {
	font-size: 1.3em;
	margin-right: 0.5em;
}

.mode-selection-headline {
	line-height: 1.8em;
}

.node-webhooks {
	margin-left: 1em;
}

.url-field {
	display: inline-block;
	width: calc(100% - 60px);
	margin-left: 55px;
}
.url-field-full-width {
	display: inline-block;
	margin: 5px 10px;
}

.url-selection {
	margin-top: var(--spacing--xs);
}

.minimize-button {
	display: inline-block;
	-webkit-transition-duration: 0.5s;
	-moz-transition-duration: 0.5s;
	-o-transition-duration: 0.5s;
	transition-duration: 0.5s;

	-webkit-transition-property: -webkit-transform;
	-moz-transition-property: -moz-transform;
	-o-transition-property: -o-transform;
	transition-property: transform;
}
.expanded .minimize-button {
	-webkit-transform: rotate(90deg);
	-moz-transform: rotate(90deg);
	-o-transform: rotate(90deg);
	transform: rotate(90deg);
}

.webhook-url {
	position: relative;
	top: 0;
	width: 100%;
	font-size: var(--font-size--2xs);
	white-space: normal;
	overflow: visible;
	text-overflow: initial;
	color: var(--color--text--shade-1);
	text-align: left;
	direction: ltr;
	word-break: break-all;
}

.webhook-wrapper {
	line-height: 1.5;
	position: relative;
	margin-top: var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: 3px;
}
</style>
