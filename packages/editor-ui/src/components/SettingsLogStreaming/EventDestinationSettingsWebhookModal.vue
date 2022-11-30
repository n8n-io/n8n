<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		minWidth="750px"
		maxWidth="900px"
		minHeight="500px"
		maxHeight="80%"
		:beforeClose="onModalClose"
	>
	<template #header>
			<el-row :gutter="20" justify="start">
					<el-col :span="16">
						Edit &nbsp;<strong>{{ destination.label }}</strong> settings
					</el-col>
					<el-col :span="8" style="text-align: right">
						<span v-if="showRemoveConfirm">
							<el-button class="button" text @click="removeThis">Confirm</el-button>
							<el-button class="button" text @click="toggleRemoveConfirm">No, sorry.</el-button>
						</span>
						<span v-else>
							<el-button class="button" text @click="toggleRemoveConfirm">Remove</el-button>
						</span>
						<el-button type="primary" @click="saveDestination" :disabled="unchanged">Save</el-button>
					</el-col>
				</el-row>
	</template>
	<template #content>
			<div :class="$style.narrowCardBody">
				<el-row :gutter="20" justify="start">
					<el-col :span="16">
					<parameter-input-list
						:parameters="uiDescription"
						:hideDelete="true"
						:nodeValues="nodeParameters"
						:isReadOnly="false"
						path=""
						@valueChanged="valueChanged"
					/>
				</el-col>
					<el-col :span="8">
					<div class="multi-parameter">
						<n8n-input-label
							:class="$style.labelMargins"
							label="Subscribed Events"
							tooltipText="Select event names and groups you want to listen to"
							:bold="true"
							size="small"
							:underline="true"
						></n8n-input-label>
							<event-tree-selection
								v-for="(child, index) in treeData.children"
								class="item collection-parameter"
								:key="index"
								:item="child"
								:destinationId="destination.id"
								:depth="0"
								@input="onInput"
							></event-tree-selection>
					</div>
				</el-col>
			</el-row>
				</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { get, set, unset } from 'lodash';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { EventNamesTreeCollection, useEventTreeStore } from '../../stores/eventTreeStore';
import { useNDVStore } from '../../stores/ndv';
import { useWorkflowsStore } from '../../stores/workflows';
import { restApi } from '../../mixins/restApi';
import EventTreeSelection from './EventTreeSelection.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { INodeUi, IUpdateInformation } from '../../Interface';
import { deepCopy, defaultMessageEventBusDestinationWebhookOptions, IDataObject, INodeCredentials, INodeProperties, NodeParameterValue } from 'n8n-workflow';
import Vue from 'vue';
import {WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY} from '../../constants';
import Modal from '@/components/Modal.vue';
import { useUIStore } from '../../stores/ui';
import { destinationToFakeINodeUi, saveDestinationToDb } from './Helpers';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-webhook-modal',
	props: {
		modalName: String,
		destination: {
			type: Object,
			default: ()=>deepCopy(defaultMessageEventBusDestinationWebhookOptions),
		},
		isNew: Boolean,
		eventBus: {
			type: Vue,
		},
	},
	components: {
		Modal,
		ParameterInputList,
		NodeCredentials,
		EventTreeSelection,
	},
	data() {
		return {
			unchanged: !this.$props.isNew,
			loading: false,
			showRemoveConfirm: false,
			treeData: {} as EventNamesTreeCollection,
			nodeParameters:  deepCopy(defaultMessageEventBusDestinationWebhookOptions),
			uiDescription: description,
			modalBus: new Vue(),
			WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY,
		};
	},
	computed: {
		...mapStores(
			useUIStore,
			useEventTreeStore,
			useNDVStore,
			useWorkflowsStore,
		),
		node(): INodeUi {
			return destinationToFakeINodeUi(this.nodeParameters);
		},
	},
	mounted() {
		this.ndvStore.activeNodeName = this.destination.id ?? 'thisshouldnothappen';
		this.workflowsStore.addNode(destinationToFakeINodeUi(this.destination, "n8n-nodes-base.stickyNote"));
		this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationWebhookOptions), this.destination);
		this.treeData = this.eventTreeStore.getEventTree(this.destination.id ?? 'thisshouldnothappen');
		this.workflowsStore.$onAction(
		({
			name, // name of the action
			args, // array of parameters passed to the action
		}) => {
			if (name === 'updateNodeProperties') {
				for (const arg of args) {
					if (arg.name === this.destination.id) {
						if ('credentials' in arg.properties) {
							this.unchanged = false;
							this.nodeParameters.credentials = arg.properties.credentials as INodeCredentials;
						}
					}
				}
			}
		});
	},
	methods: {
		onInput() {
			this.unchanged = false;
		},
		valueChanged(parameterData: IUpdateInformation) {
			console.log(parameterData);
			this.unchanged = false;
			const newValue: NodeParameterValue = parameterData.value as string | number;
			const parameterPath = parameterData.name.startsWith('parameters.') ? parameterData.name.split('.').slice(1).join('.') : parameterData.name;

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

			this.nodeParameters = deepCopy(nodeParameters);
			this.workflowsStore.updateNodeProperties({
				name: this.node.name,
				properties: { parameters: this.nodeParameters as unknown as IDataObject },
			});
		},
		toggleRemoveConfirm() {
			this.showRemoveConfirm = !this.showRemoveConfirm;
		},
		removeThis() {
			this.$props.eventBus.$emit('remove', this.destination.id);
			this.uiStore.closeModal(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
			this.uiStore.stateIsDirty = false;
		},
		onModalClose() {
			this.$props.eventBus.$emit('closing', this.destination.id);
			this.uiStore.stateIsDirty = false;
		},
		async saveDestination() {
			if (this.unchanged || !this.destination.id) {
				return;
			}
			await saveDestinationToDb(this.restApi(), this.nodeParameters);
			this.unchanged = true;
			this.$props.eventBus.$emit('destinationWasUpdated', this.destination.id);
			this.uiStore.closeModal(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
			this.uiStore.stateIsDirty = false;
		},
	},
});

const description = [
				{
					displayName: 'Enabled',
					name: 'enabled',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Whether events are actually sent to the destination',
				},
				{
					displayName: 'Label',
					name: 'label',
					type: 'string',
					default: 'Webhook Endpoint',
					noDataExpression: true,
					description: 'Custom label',
				},
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					options: [
						{
							name: 'GET',
							value: 'GET',
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
						// {
						// 	name: 'Predefined Credential Type',
						// 	value: 'predefinedCredentialType',
						// 	description:
						// 		"We've already implemented auth for many services so that you don't have to set it up manually",
						// },
						{
							name: 'Generic Credential Type',
							value: 'genericCredentialType',
							description: 'Fully customizable. Choose between basic, header, OAuth2, etc.',
						},
					],
					default: 'none',
				},
				// {
				// 	displayName: 'Credential Type',
				// 	name: 'nodeCredentialType',
				// 	type: 'credentialsSelect',
				// 	noDataExpression: true,
				// 	default: '',
				// 	credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate'],
				// 	displayOptions: {
				// 		show: {
				// 			authentication: ['predefinedCredentialType'],
				// 		},
				// 	},
				// },
				{
					displayName: 'Generic Auth Type (OAuth not supported yet)',
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
					displayName: 'Anonymize Messages',
					name: 'anonymizeMessages',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Anonymize user information where possible',
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					options: [
						{
							displayName: 'Ignore SSL Issues',
							name: 'allowUnauthorizedCerts',
							type: 'boolean',
							noDataExpression: true,
							default: false,
							description:
								'Whether to ignore SSL certificate validation',
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
							displayName: 'Proxy',
							name: 'proxy',
							description: 'Add Proxy',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: false,
							},
							default: {
								proxy: {},
							},
							options: [
								{
									displayName: 'Proxy',
									name: 'proxy',
									values: [
										{
											displayName: 'Protocol',
											name: 'protocol',
											type: 'options',
											default: 'https',
											options: [
												{
													name: 'HTTPS',
													value: 'https',
												},
												{
													name: 'HTTP',
													value: 'http',
												},
											],
										},
										{
											displayName: 'Host',
											name: 'host',
											type: 'string',
											default: '127.0.0.1',
											description:
												'Proxy Host (without protocol or port)',
										},
										{
											displayName: 'Port',
											name: 'port',
											type: 'number',
											default: 9000,
											description:
												'Proxy Port',
										},
									],
								},
							],
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
	.labelMargins {
		margin-bottom: 1em;
		margin-top: 1em;
	}

	.narrowCardBody {
		padding: 0 70px 20px 70px;
		overflow: auto;
		max-height: 600px;
	}
</style>
