<template>
	<div v-if="webhooksNode.length && visibleWebhookUrls.length > 0" class="webhooks">
		<div
			class="clickable headline"
			:class="{ expanded: !isMinimized }"
			:title="isMinimized ? baseText.clickToDisplay : baseText.clickToHide"
			@click="isMinimized = !isMinimized"
		>
			<font-awesome-icon icon="angle-right" class="minimize-button minimize-icon" />
			{{ baseText.toggleTitle }}
		</div>
		<el-collapse-transition>
			<div v-if="!isMinimized" class="node-webhooks">
				<div v-if="!isProductionOnly" class="url-selection">
					<el-row>
						<el-col :span="24">
							<n8n-radio-buttons v-model="showUrlFor" :options="urlOptions" />
						</el-col>
					</el-row>
				</div>

				<n8n-tooltip
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
				</n8n-tooltip>
			</div>
		</el-collapse-transition>
	</div>
</template>

<script lang="ts">
import type { INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';
import { defineComponent } from 'vue';

import { useToast } from '@/composables/useToast';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	OPEN_URL_PANEL_TRIGGER_NODE_TYPES,
	PRODUCTION_ONLY_TRIGGER_NODE_TYPES,
} from '@/constants';
import { useClipboard } from '@/composables/useClipboard';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';

export default defineComponent({
	name: 'NodeWebhooks',
	props: [
		'node', // NodeUi
		'nodeType', // INodeTypeDescription
	],
	setup() {
		const router = useRouter();
		const clipboard = useClipboard();
		const workflowHelpers = useWorkflowHelpers({ router });
		return {
			clipboard,
			workflowHelpers,
			...useToast(),
		};
	},
	data() {
		return {
			isMinimized: this.nodeType && !OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(this.nodeType.name),
			showUrlFor: 'test',
		};
	},
	computed: {
		isProductionOnly(): boolean {
			return this.nodeType && PRODUCTION_ONLY_TRIGGER_NODE_TYPES.includes(this.nodeType.name);
		},
		urlOptions(): Array<{ label: string; value: string }> {
			return [
				...(this.isProductionOnly ? [] : [{ label: this.baseText.testUrl, value: 'test' }]),
				{
					label: this.baseText.productionUrl,
					value: 'production',
				},
			];
		},
		visibleWebhookUrls(): IWebhookDescription[] {
			return this.webhooksNode.filter((webhook) => {
				if (typeof webhook.ndvHideUrl === 'string') {
					return !this.workflowHelpers.getWebhookExpressionValue(webhook, 'ndvHideUrl');
				}

				return !webhook.ndvHideUrl;
			});
		},
		webhooksNode(): IWebhookDescription[] {
			if (this.nodeType === null || this.nodeType.webhooks === undefined) {
				return [];
			}

			return (this.nodeType as INodeTypeDescription).webhooks!.filter(
				(webhookData) => webhookData.restartWebhook !== true,
			);
		},
		baseText() {
			const nodeType = this.nodeType.name;
			switch (nodeType) {
				case CHAT_TRIGGER_NODE_TYPE:
					return {
						toggleTitle: this.$locale.baseText('nodeWebhooks.webhookUrls.chatTrigger'),
						clickToDisplay: this.$locale.baseText(
							'nodeWebhooks.clickToDisplayWebhookUrls.formTrigger',
						),
						clickToHide: this.$locale.baseText('nodeWebhooks.clickToHideWebhookUrls.chatTrigger'),
						clickToCopy: this.$locale.baseText('nodeWebhooks.clickToCopyWebhookUrls.chatTrigger'),
						testUrl: this.$locale.baseText('nodeWebhooks.testUrl'),
						productionUrl: this.$locale.baseText('nodeWebhooks.productionUrl'),
						copyTitle: this.$locale.baseText('nodeWebhooks.showMessage.title.chatTrigger'),
						copyMessage: this.$locale.baseText('nodeWebhooks.showMessage.message.chatTrigger'),
					};

				case FORM_TRIGGER_NODE_TYPE:
					return {
						toggleTitle: this.$locale.baseText('nodeWebhooks.webhookUrls.formTrigger'),
						clickToDisplay: this.$locale.baseText(
							'nodeWebhooks.clickToDisplayWebhookUrls.formTrigger',
						),
						clickToHide: this.$locale.baseText('nodeWebhooks.clickToHideWebhookUrls.formTrigger'),
						clickToCopy: this.$locale.baseText('nodeWebhooks.clickToCopyWebhookUrls.formTrigger'),
						testUrl: this.$locale.baseText('nodeWebhooks.testUrl'),
						productionUrl: this.$locale.baseText('nodeWebhooks.productionUrl'),
						copyTitle: this.$locale.baseText('nodeWebhooks.showMessage.title.formTrigger'),
						copyMessage: this.$locale.baseText('nodeWebhooks.showMessage.message.formTrigger'),
					};

				default:
					return {
						toggleTitle: this.$locale.baseText('nodeWebhooks.webhookUrls'),
						clickToDisplay: this.$locale.baseText('nodeWebhooks.clickToDisplayWebhookUrls'),
						clickToHide: this.$locale.baseText('nodeWebhooks.clickToHideWebhookUrls'),
						clickToCopy: this.$locale.baseText('nodeWebhooks.clickToCopyWebhookUrls'),
						testUrl: this.$locale.baseText('nodeWebhooks.testUrl'),
						productionUrl: this.$locale.baseText('nodeWebhooks.productionUrl'),
						copyTitle: this.$locale.baseText('nodeWebhooks.showMessage.title'),
						copyMessage: undefined,
					};
			}
		},
	},
	watch: {
		node() {
			this.isMinimized = !OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(this.nodeType.name);
		},
	},
	methods: {
		copyWebhookUrl(webhookData: IWebhookDescription): void {
			const webhookUrl = this.getWebhookUrlDisplay(webhookData);
			void this.clipboard.copy(webhookUrl);

			this.showMessage({
				title: this.baseText.copyTitle,
				message: this.baseText.copyMessage,
				type: 'success',
			});
			this.$telemetry.track('User copied webhook URL', {
				pane: 'parameters',
				type: `${this.showUrlFor} url`,
			});
		},
		getWebhookUrlDisplay(webhookData: IWebhookDescription): string {
			if (this.node) {
				return this.workflowHelpers.getWebhookUrl(
					webhookData,
					this.node,
					this.isProductionOnly ? 'production' : this.showUrlFor,
				);
			}
			return '';
		},
		isWebhookMethodVisible(webhook: IWebhookDescription): boolean {
			try {
				const method = this.workflowHelpers.getWebhookExpressionValue(webhook, 'httpMethod', false);
				if (Array.isArray(method) && method.length !== 1) {
					return false;
				}
			} catch (error) {}

			if (typeof webhook.ndvHideMethod === 'string') {
				return !this.workflowHelpers.getWebhookExpressionValue(webhook, 'ndvHideMethod');
			}

			return !webhook.ndvHideMethod;
		},

		getWebhookHttpMethod(webhook: IWebhookDescription): string {
			const method = this.workflowHelpers.getWebhookExpressionValue(webhook, 'httpMethod', false);
			if (Array.isArray(method)) {
				return method[0];
			}
			return method;
		},
	},
});
</script>

<style scoped lang="scss">
.webhooks {
	padding-bottom: var(--spacing-xs);
	margin: var(--spacing-xs) 0;
	border-bottom: 1px solid var(--color-text-lighter);

	.headline {
		color: $color-primary;
		font-weight: 600;
		font-size: var(--font-size-2xs);
	}
}

.http-field {
	position: absolute;
	width: 50px;
	display: inline-block;
	top: calc(50% - 8px);
}

.http-method {
	background-color: var(--color-foreground-xdark);
	width: 40px;
	height: 16px;
	line-height: 16px;
	margin-left: 5px;
	text-align: center;
	border-radius: 2px;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-foreground-xlight);
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
	margin-top: var(--spacing-xs);
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
	font-size: var(--font-size-2xs);
	white-space: normal;
	overflow: visible;
	text-overflow: initial;
	color: var(--color-text-dark);
	text-align: left;
	direction: ltr;
	word-break: break-all;
}

.webhook-wrapper {
	line-height: 1.5;
	position: relative;
	margin-top: var(--spacing-xs);
	background-color: var(--color-foreground-xlight);
	border-radius: 3px;
}
</style>
