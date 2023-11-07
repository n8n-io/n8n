<template>
	<div v-if="webhooksNode.length" class="webhooks">
		<div
			class="clickable headline"
			:class="{ expanded: !isMinimized }"
			@click="isMinimized = !isMinimized"
			:title="isMinimized ? baseText.clickToDisplay : baseText.clickToHide"
		>
			<font-awesome-icon icon="angle-down" class="minimize-button minimize-icon" />
			{{ baseText.toggleTitle }}
		</div>
		<el-collapse-transition>
			<div class="node-webhooks" v-if="!isMinimized">
				<div class="url-selection">
					<el-row>
						<el-col :span="24">
							<n8n-radio-buttons
								v-model="showUrlFor"
								:options="[
									{ label: baseText.testUrl, value: 'test' },
									{
										label: baseText.productionUrl,
										value: 'production',
									},
								]"
							/>
						</el-col>
					</el-row>
				</div>

				<n8n-tooltip
					v-for="(webhook, index) in webhooksNode.filter((webhook) => !webhook.ndvHideUrl)"
					:key="index"
					class="item"
					:content="baseText.clickToCopy"
					placement="left"
				>
					<div v-if="!webhook.ndvHideMethod" class="webhook-wrapper">
						<div class="http-field">
							<div class="http-method">
								{{ getWebhookExpressionValue(webhook, 'httpMethod') }}<br />
							</div>
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

import { useToast } from '@/composables';
import { FORM_TRIGGER_NODE_TYPE, OPEN_URL_PANEL_TRIGGER_NODE_TYPES } from '@/constants';
import { copyPaste } from '@/mixins/copyPaste';
import { workflowHelpers } from '@/mixins/workflowHelpers';

export default defineComponent({
	name: 'NodeWebhooks',
	mixins: [copyPaste, workflowHelpers],
	props: [
		'node', // NodeUi
		'nodeType', // INodeTypeDescription
	],
	setup() {
		return {
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
		webhooksNode(): IWebhookDescription[] {
			if (this.nodeType === null || this.nodeType.webhooks === undefined) {
				return [];
			}

			return (this.nodeType as INodeTypeDescription).webhooks!.filter(
				(webhookData) => webhookData.restartWebhook !== true && !webhookData.hasLifecycleMethods,
			);
		},
		baseText() {
			const nodeType = this.nodeType.name;
			switch (nodeType) {
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
	methods: {
		copyWebhookUrl(webhookData: IWebhookDescription): void {
			const webhookUrl = this.getWebhookUrlDisplay(webhookData);
			this.copyToClipboard(webhookUrl);

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
				return this.getWebhookUrl(webhookData, this.node, this.showUrlFor);
			}
			return '';
		},
	},
	watch: {
		node() {
			this.isMinimized = !OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(this.nodeType.name);
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
	width: 100%;
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
	-webkit-transform: rotate(180deg);
	-moz-transform: rotate(180deg);
	-o-transform: rotate(180deg);
	transform: rotate(180deg);
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
