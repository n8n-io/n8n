<template>
	<el-card class="box-card" :class="$style.destinationCard">
		<div style="padding: 10px">
				<el-switch
						v-model="destination.enabled"
						size="large"
						@input="onEnabledSwitched($event, destination.id)"
						/>
				&nbsp;
				<span @click="editThis(destination.id)">{{ destination.label }}</span>
			<div>
			<el-row :gutter="20" style="margin-top: 20px;">
				<el-col style="text-align: left;" :span="8">
					<el-button class="button" text @click="editThis(destination.id)">Edit</el-button>
				</el-col>
				<el-col style="text-align: right;" :span="16">
					<span v-if="showRemoveConfirm">
						<el-button class="button" text @click="removeThis">Confirm</el-button>
						<el-button class="button" text @click="toggleRemoveConfirm">No, sorry.</el-button>
					</span>
					<span v-else>
						<el-button class="button" text @click="toggleRemoveConfirm">Remove</el-button>
					</span>
				</el-col>
			</el-row>
			</div>
		</div>
	</el-card>
</template>

<script lang="ts">
import {
	Form as ElForm,
	FormItem as ElFormItem,
	Input as ElInput,
	Collapse as ElCollapse,
	CollapseItem as ElCollapseItem,
} from 'element-ui';
import { get, set, unset } from 'lodash';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { EventNamesTreeCollection, useEventTreeStore } from '../../stores/eventTreeStore';
import { useNDVStore } from '../../stores/ndv';
import { useWorkflowsStore } from '../../stores/workflows';
import { restApi } from '../mixins/restApi';
import EventTreeSelection from './EventTreeSelection.vue';
import EventLevelSelection from './EventLevelSelection.vue';
import { AbstractMessageEventBusDestination, MessageEventBusDestinationTypeNames, MessageEventBusDestinationWebhook } from './types';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { INodeUi, IUpdateInformation } from '../../Interface';
import { deepCopy, INodeProperties, NodeParameterValue } from 'n8n-workflow';
import { useUIStore } from '../../stores/ui';
import Vue from 'vue';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY } from '../../constants';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-card',
	props: {
		destination: AbstractMessageEventBusDestination,
	},
	data() {
		return {
			unchanged: true,
			isOpen: false,
			showRemoveConfirm: false,
			treeData: {} as EventNamesTreeCollection,
			nodeParameters: {} as MessageEventBusDestinationWebhook,
			uiDescription: description,
		};
	},
	components: {
		ParameterInputList,
		NodeCredentials,
		EventTreeSelection,
		EventLevelSelection,
		ElForm,
		ElFormItem,
		ElInput,
		ElCollapse,
		ElCollapseItem,
	},
	computed: {
		...mapStores(
			useUIStore,
			useNDVStore,
			useWorkflowsStore,
			useEventTreeStore,
		),
		isFolder() {
			return true;
		},
		node(): INodeUi {
			return {
				id: this.destination.id,
				name: this.destination.id,
				typeVersion: 1,
				type: MessageEventBusDestinationTypeNames.webhook,
				position: [0, 0],
				parameters: {
					...this.nodeParameters,
				},
			} as INodeUi;
		},
	},
	mounted() {
			// merge destination data with defaults
			this.nodeParameters = Object.assign(new MessageEventBusDestinationWebhook(), this.destination);
			// this.ndvStore.activeNodeName = this.destination.id;
			this.workflowsStore.addNode(this.node);
			this.treeData = this.eventTreeStore.getEventTree(this.destination.id);
		},
	methods: {
		onInput() {
			this.unchanged = false;
		},
		editThis(destinationId: string) {
			this.$emit('edit', destinationId);
		},
		onEnabledSwitched(state: boolean, destinationId: string) {
			console.log(state, destinationId);
			this.valueChanged({name: 'enabled', value: state});
			this.saveDestination();
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.unchanged = false;
			const newValue: NodeParameterValue = parameterData.value as string | number;
			const parameterPath = parameterData.name.startsWith('parameters.') ? parameterData.name.split('.').slice(1).join('.') : parameterData.name;
			console.log(parameterData, newValue);

			const nodeParameters = deepCopy(this.nodeParameters);

			// Check if the path is supposed to change an array and if so get
			// the needed data like path and index
			const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

			// Apply the new value
			if (parameterData.value === undefined && parameterPathArray !== null) {
				// Delete array item
				const path = parameterPathArray[1];
				const index = parameterPathArray[2];
				const data = get(nodeParameters, path);

				if (Array.isArray(data)) {
					data.splice(parseInt(index, 10), 1);
					Vue.set(nodeParameters, path, data);
				}
			} else {
				if (newValue === undefined) {
					unset(nodeParameters, parameterPath);
				} else {
					set(nodeParameters, parameterPath, newValue);
				}
			}

			// console.log(parameterData);

			this.nodeParameters = nodeParameters;
			this.workflowsStore.updateNodeProperties({
				name: this.node.name,
				properties: {parameters: this.node.parameters},
			});
			// console.log(this.node.parameters?.url, this.ndvStore.activeNode?.parameters?.url);
		},
		credentialSelected() {
			this.unchanged = false;
		},
		toggleRemoveConfirm() {
			this.showRemoveConfirm = !this.showRemoveConfirm;
		},
		async removeThis() {
			this.$emit('remove', this.destination.id);
			this.uiStore.closeModal(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async saveDestination() {
			const data: MessageEventBusDestinationWebhook = {
				...this.nodeParameters,
				subscribedEvents: Array.from(this.eventTreeStore.items[this.destination.id].selectedEvents.values()),
				subscribedLevels: Array.from(this.eventTreeStore.items[this.destination.id].selectedLevels.values()),
			};
			await this.restApi().makeRestApiRequest('POST', '/eventbus/destination', data);
			this.unchanged = true;
		},
	},
});

const description = [
				{
					displayName: 'Enabled',
					name: 'enabled',
					type: 'boolean',
					default: true,
					noDataExpression: true,
					description: 'Whether events are actually sent to the destination',
				},
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					options: [
						{
							name: 'DELETE',
							value: 'DELETE',
						},
						{
							name: 'GET',
							value: 'GET',
						},
						{
							name: 'HEAD',
							value: 'HEAD',
						},
						{
							name: 'OPTIONS',
							value: 'OPTIONS',
						},
						{
							name: 'PATCH',
							value: 'PATCH',
						},
						{
							name: 'POST',
							value: 'POST',
						},
						{
							name: 'PUT',
							value: 'PUT',
						},
					],
					default: 'POST',
					description: 'The request method to use',
				},
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
					placeholder: 'http://example.com/index.html',
					description: 'The URL to make the request to',
				},
				{
					displayName: 'Authentication',
					name: 'authentication',
					noDataExpression: true,
					type: 'options',
					options: [
						{
							name: 'None',
							value: 'none',
						},
						{
							name: 'Predefined Credential Type',
							value: 'predefinedCredentialType',
							description:
								"We've already implemented auth for many services so that you don't have to set it up manually",
						},
						{
							name: 'Generic Credential Type',
							value: 'genericCredentialType',
							description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
						},
					],
					default: 'none',
				},
				{
					displayName: 'Credential Type',
					name: 'nodeCredentialType',
					type: 'credentialsSelect',
					noDataExpression: true,
					default: '',
					credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
					displayOptions: {
						show: {
							authentication: ['predefinedCredentialType'],
						},
					},
				},
				{
					displayName: 'Generic Auth Type',
					name: 'genericAuthType',
					type: 'credentialsSelect',
					default: '',
					credentialTypes: ['has:genericAuth'],
					displayOptions: {
						show: {
							authentication: ['genericCredentialType'],
						},
					},
				},
				{
					displayName: 'Send Query Parameters',
					name: 'sendQuery',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether the request has query params or not',
				},
				{
					displayName: 'Specify Query Parameters',
					name: 'specifyQuery',
					type: 'options',
					displayOptions: {
						show: {
							sendQuery: [true],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
							value: 'keypair',
						},
						{
							name: 'Using JSON',
							value: 'json',
						},
					],
					default: 'keypair',
				},
				{
					displayName: 'Query Parameters',
					name: 'queryParameters',
					type: 'fixedCollection',
					displayOptions: {
						show: {
							sendQuery: [true],
							specifyQuery: ['keypair'],
						},
					},
					typeOptions: {
						multipleValues: true,
					},
					placeholder: 'Add Parameter',
					default: {
						parameters: [
							{
								name: '',
								value: '',
							},
						],
					},
					options: [
						{
							name: 'parameters',
							displayName: 'Parameter',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: 'JSON',
					name: 'jsonQuery',
					type: 'json',
					displayOptions: {
						show: {
							sendQuery: [true],
							specifyQuery: ['json'],
						},
					},
					default: '',
				},
				{
					displayName: 'Send Headers',
					name: 'sendHeaders',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether the request has headers or not',
				},
				{
					displayName: 'Specify Headers',
					name: 'specifyHeaders',
					type: 'options',
					displayOptions: {
						show: {
							sendHeaders: [true],
						},
					},
					options: [
						{
							name: 'Using Fields Below',
							value: 'keypair',
						},
						{
							name: 'Using JSON',
							value: 'json',
						},
					],
					default: 'keypair',
				},
				{
					displayName: 'Header Parameters',
					name: 'headerParameters',
					type: 'fixedCollection',
					displayOptions: {
						show: {
							sendHeaders: [true],
							specifyHeaders: ['keypair'],
						},
					},
					typeOptions: {
						multipleValues: true,
					},
					placeholder: 'Add Parameter',
					default: {
						parameters: [
							{
								name: '',
								value: '',
							},
						],
					},
					options: [
						{
							name: 'parameters',
							displayName: 'Parameter',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: 'JSON',
					name: 'jsonHeaders',
					type: 'json',
					displayOptions: {
						show: {
							sendHeaders: [true],
							specifyHeaders: ['json'],
						},
					},
					default: '',
				},
				{
					displayName: 'Send Payload',
					name: 'sendPayload',
					type: 'boolean',
					default: true,
					noDataExpression: true,
					description: 'Whether the events payload (if any) is sent or not (to reduce bandwidth)',
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					options: [
						{
							displayName: 'Batching',
							name: 'batching',
							placeholder: 'Add Batching',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								batch: {},
							},
							options: [
								{
									displayName: 'Batching',
									name: 'batch',
									values: [
										{
											displayName: 'Items per Batch',
											name: 'batchSize',
											type: 'number',
											typeOptions: {
												minValue: -1,
											},
											default: 50,
											description:
												'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
										},
										{
											displayName: 'Batch Interval (ms)',
											name: 'batchInterval',
											type: 'number',
											typeOptions: {
												minValue: 0,
											},
											default: 1000,
											description:
												'Time (in milliseconds) between each batch of requests. 0 for disabled.',
										},
									],
								},
							],
						},
						{
							displayName: 'Ignore SSL Issues',
							name: 'allowUnauthorizedCerts',
							type: 'boolean',
							noDataExpression: true,
							default: false,
							description:
								'Whether to download the response even if SSL certificate validation is not possible',
						},
						{
							displayName: 'Array Format in Query Parameters',
							name: 'queryParameterArrays',
							type: 'options',
							displayOptions: {
								show: {
									'/sendQuery': [true],
								},
							},
							options: [
								{
									name: 'No Brackets',
									value: 'repeat',
									description: 'e.g. foo=bar&foo=qux',
								},
								{
									name: 'Brackets Only',
									value: 'brackets',
									description: 'e.g. foo[]=bar&foo[]=qux',
								},
								{
									name: 'Brackets with Indices',
									value: 'indices',
									description: 'e.g. foo[0]=bar&foo[1]=qux',
								},
							],
							default: 'brackets',
						},
						{
							displayName: 'Redirects',
							name: 'redirect',
							placeholder: 'Add Redirect',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								redirect: {},
							},
							options: [
								{
									displayName: 'Redirect',
									name: 'redirect',
									values: [
										{
											displayName: 'Follow Redirects',
											name: 'followRedirects',
											type: 'boolean',
											default: false,
											noDataExpression: true,
											description: 'Whether to follow all redirects',
										},
										{
											displayName: 'Max Redirects',
											name: 'maxRedirects',
											type: 'number',
											displayOptions: {
												show: {
													followRedirects: [true],
												},
											},
											default: 21,
											description: 'Max number of redirects to follow',
										},
									],
								},
							],
						},
						{
							displayName: 'Response',
							name: 'response',
							placeholder: 'Add response',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								response: {},
							},
							options: [
								{
									displayName: 'Response',
									name: 'response',
									values: [
										{
											displayName: 'Include Response Headers and Status',
											name: 'fullResponse',
											type: 'boolean',
											default: false,
											description:
												'Whether to return the full reponse (headers and response status code) data instead of only the body',
										},
										{
											displayName: 'Never Error',
											name: 'neverError',
											type: 'boolean',
											default: false,
											description: 'Whether to succeeds also when status code is not 2xx',
										},
										{
											displayName: 'Response Format',
											name: 'responseFormat',
											type: 'options',
											noDataExpression: true,
											options: [
												{
													name: 'Autodetect',
													value: 'autodetect',
												},
												{
													name: 'File',
													value: 'file',
												},
												{
													name: 'JSON',
													value: 'json',
												},
												{
													name: 'Text',
													value: 'text',
												},
											],
											default: 'autodetect',
											description: 'The format in which the data gets returned from the URL',
										},
										{
											displayName: 'Put Output in Field',
											name: 'outputPropertyName',
											type: 'string',
											default: 'data',
											displayOptions: {
												show: {
													responseFormat: ['file', 'text'],
												},
											},
											description:
												'Name of the binary property to which to write the data of the read file',
										},
									],
								},
							],
						},
						{
							displayName: 'Proxy',
							name: 'proxy',
							type: 'string',
							default: '',
							placeholder: 'e.g. http://myproxy:3128',
							description: 'HTTP proxy to use',
						},
						{
							displayName: 'Timeout',
							name: 'timeout',
							type: 'number',
							typeOptions: {
								minValue: 1,
							},
							default: 10000,
							description:
								'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
						},
					],
				},
			] as INodeProperties[];
</script>

<style lang="scss" module>
.item {
  cursor: pointer;
}

.labelMargins {
	margin-bottom: 1em;
	margin-top: 1em;
}

.destinationCard {
  width: 340px;
}

.narrowCardBody {
	padding: 0 70px 20px 70px;
}
</style>
