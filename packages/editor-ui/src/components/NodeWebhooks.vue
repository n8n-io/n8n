<template>
	<div v-if="webhooksNode.length" class="webhoooks">
		<div class="clickable headline" :class="{expanded: !isMinimized}" @click="isMinimized=!isMinimized" :title="isMinimized ? $locale.baseText('nodeWebhooks.clickToDisplayWebhookUrls') : $locale.baseText('nodeWebhooks.clickToHideWebhookUrls')">
			<font-awesome-icon icon="angle-down" class="minimize-button minimize-icon" />
			{{ $locale.baseText('nodeWebhooks.webhookUrls') }}
		</div>
		<el-collapse-transition>
			<div class="node-webhooks" v-if="!isMinimized">
				<div class="url-selection">
					<el-row>
						<el-col :span="24">
							<el-radio-group v-model="showUrlFor" size="mini">
								<el-radio-button label="test">{{ $locale.baseText('nodeWebhooks.testUrl') }}</el-radio-button>
								<el-radio-button label="production">{{ $locale.baseText('nodeWebhooks.productionUrl') }}</el-radio-button>
							</el-radio-group>
						</el-col>
					</el-row>
				</div>

				<n8n-tooltip v-for="(webhook, index) in webhooksNode" :key="index" class="item"  :content="$locale.baseText('nodeWebhooks.clickToCopyWebhookUrls')" placement="left">
					<div class="webhook-wrapper">
							<div class="http-field">
								<div class="http-method">
									{{getValue(webhook, 'httpMethod')}}<br />
								</div>
							</div>
							<div class="url-field">
								<div class="webhook-url left-ellipsis clickable" @click="copyWebhookUrl(webhook)">
									{{getWebhookUrlDisplay(webhook)}}<br />
								</div>
							</div>
					</div>
				</n8n-tooltip>

			</div>
		</el-collapse-transition>
	</div>
</template>

<script lang="ts">
import {
	INodeTypeDescription,
	IWebhookDescription,
	NodeHelpers,
} from 'n8n-workflow';

import { WEBHOOK_NODE_TYPE } from '@/constants';
import { copyPaste } from '@/components/mixins/copyPaste';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	copyPaste,
	showMessage,
	workflowHelpers,
)
	.extend({
		name: 'NodeWebhooks',
		props: [
			'node', // NodeUi
			'nodeType', // INodeTypeDescription
		],
		data () {
			return {
				isMinimized: this.nodeType && this.nodeType.name !== WEBHOOK_NODE_TYPE,
				showUrlFor: 'test',
			};
		},
		computed: {
			webhooksNode (): IWebhookDescription[] {
				if (this.nodeType === null || this.nodeType.webhooks === undefined) {
					return [];
				}

				return (this.nodeType as INodeTypeDescription).webhooks!.filter(webhookData => webhookData.restartWebhook !== true);
			},
		},
		methods: {
			copyWebhookUrl (webhookData: IWebhookDescription): void {
				const webhookUrl = this.getWebhookUrl(webhookData);
				this.copyToClipboard(webhookUrl);

				this.$showMessage({
					title: this.$locale.baseText('nodeWebhooks.showMessage.title'),
					message: this.$locale.baseText('nodeWebhooks.showMessage.message'),
					type: 'success',
				});
			},
			getValue (webhookData: IWebhookDescription, key: string): string {
				if (webhookData[key] === undefined) {
					return 'empty';
				}
				try {
					return this.resolveExpression(webhookData[key] as string) as string;
				} catch (e) {
					return this.$locale.baseText('nodeWebhooks.invalidExpression');
				}
			},
			getWebhookUrl (webhookData: IWebhookDescription): string {
				if (webhookData.restartWebhook === true) {
					return '$resumeWebhookUrl';
				}
				let baseUrl = this.$store.getters.getWebhookUrl;
				if (this.showUrlFor === 'test') {
					baseUrl = this.$store.getters.getWebhookTestUrl;
				}

				const workflowId = this.$store.getters.workflowId;
				const path = this.getValue(webhookData, 'path');
				const isFullPath = this.getValue(webhookData, 'isFullPath') as unknown as boolean || false;

				return NodeHelpers.getNodeWebhookUrl(baseUrl, workflowId, this.node, path, isFullPath);
			},
			getWebhookUrlDisplay (webhookData: IWebhookDescription): string {
				return this.getWebhookUrl(webhookData);
			},
		},
		watch: {
			node () {
				this.isMinimized = this.nodeType.name !== WEBHOOK_NODE_TYPE;
			},
		},
	});
</script>

<style scoped lang="scss">

.webhoooks {
	padding-bottom: var(--spacing-xs);
	margin: var(--spacing-xs) 0;
	border-bottom: 1px solid #ccc;

	.headline {
		color: $--color-primary;
		font-weight: 600;
		font-size: var(--font-size-2xs);
	}
}

.http-field {
	position: absolute;
	width: 50px;
	display: inline-block;
	top: calc(50% - 8px)
}

.http-method {
	background-color: green;
	width: 40px;
	height: 16px;
	line-height: 16px;
	margin-left: 5px;
	text-align: center;
	border-radius: 2px;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: #fff;
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
	color: #404040;
	text-align: left;
	direction: ltr;
	word-break: break-all;
}

.webhook-wrapper {
	line-height: 1.5;
	position: relative;
	margin-top: var(--spacing-xs);
	background-color: #fff;
	border-radius: 3px;
}
</style>
