<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		maxWidth="800px"
		minHeight="500px"
		maxHeight="700px"
	>
	<template #header>
			<el-row :gutter="20" justify="start">
					<el-col :span="12">
						Edit &nbsp;<strong>{{ destination.label }}</strong> settings
					</el-col>
					<el-col :span="11" style="text-align: right">
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
					<parameter-input-list
						:parameters="uiDescription"
						:hideDelete="true"
						:nodeValues="nodeParameters"
						:isReadOnly="false"
						path=""
						@valueChanged="valueChanged"
					/>
					<div class="multi-parameter">
						<n8n-input-label
							:class="$style.labelMargins"
							label="Levels"
							tooltipText="Select event levels you want to listen to"
							:bold="true"
							size="small"
							:underline="true"
						></n8n-input-label>
						<event-level-selection
							class="collection-parameter"
							:destinationId="destination.id"
							@input="onInput"
						/>
						<n8n-input-label
							:class="$style.labelMargins"
							label="Events"
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
				</div>
		</template>
	</Modal>
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
import { restApi } from '../../mixins/restApi';
import EventTreeSelection from './EventTreeSelection.vue';
import EventLevelSelection from './EventLevelSelection.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { INodeUi, IUpdateInformation } from '../../Interface';
import { deepCopy, defaultMessageEventBusDestinationSentryOptions, IDataObject, INodeCredentials, INodeProperties, MessageEventBusDestinationTypeNames, MessageEventBusDestinationSentryOptions, NodeParameterValue } from 'n8n-workflow';
import Vue from 'vue';
import {SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY} from '../../constants';
import Modal from '@/components/Modal.vue';
import { useUIStore } from '../../stores/ui';
import { destinationToFakeINodeUi } from './Helpers';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-sentry-modal',
	props: {
		modalName: String,
		destination: {
			type: Object,
			default: deepCopy(defaultMessageEventBusDestinationSentryOptions),
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
		EventLevelSelection,
		ElForm,
		ElFormItem,
		ElInput,
		ElCollapse,
		ElCollapseItem,
	},
	data() {
		return {
			unchanged: !this.$props.isNew,
			isOpen: false,
			loading: false,
			showRemoveConfirm: false,
			treeData: {} as EventNamesTreeCollection,
			nodeParameters:  deepCopy(defaultMessageEventBusDestinationSentryOptions),
			uiDescription: description,
			modalBus: new Vue(),
			SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY,
			destinationTypeNames: MessageEventBusDestinationTypeNames,
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
		// merge destination data with defaults
		this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationSentryOptions), this.destination);
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
			this.uiStore.closeModal(SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async saveDestination() {
			if (this.unchanged || !this.destination.id) {
				return;
			}
			const data: MessageEventBusDestinationSentryOptions = {
				...this.nodeParameters,
				subscribedEvents: Array.from(this.eventTreeStore.items[this.destination.id].selectedEvents.values()),
				subscribedLevels: Array.from(this.eventTreeStore.items[this.destination.id].selectedLevels.values()),
			};
			await this.restApi().makeRestApiRequest('POST', '/eventbus/destination', data);
			this.unchanged = true;
			this.eventTreeStore.updateDestination(this.nodeParameters);
			this.$props.eventBus.$emit('destinationWasUpdated', this.destination.id);
			this.uiStore.closeModal(SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY);
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
					default: 'Sentry DSN',
					noDataExpression: true,
					description: 'Custom label',
				},
				{
					displayName: 'DSN',
					name: 'dsn',
					type: 'string',
					default: 'https://',
					noDataExpression: true,
					description: 'Your Sentry DSN Client Key',
				},
				// {
				// 	displayName: 'Authentication',
				// 	name: 'authentication',
				// 	noDataExpression: true,
				// 	type: 'options',
				// 	default: 'none',
				// 	options: [
				// 		{
				// 			name: 'None',
				// 			value: 'none',
				// 		},
				// 		{
				// 			name: 'Predefined Credential Type',
				// 			value: 'predefinedCredentialType',
				// 			description:
				// 				"We've already implemented auth for many services so that you don't have to set it up manually",
				// 		},
				// 	],
				// },
				// {
				// 	displayName: 'Credential Type',
				// 	name: 'nodeCredentialType',
				// 	type: 'credentialsSelect',
				// 	noDataExpression: true,
				// 	default: '',
				// 	credentialTypes: ['sentryIoApi'],
				// 	displayOptions: {
				// 		show: {
				// 			authentication: ['predefinedCredentialType'],
				// 		},
				// 	},
				// },
				{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'Team',
						value: 'team',
					},
				],
				default: 'event',
			},
				{
					displayName: 'Send Payload',
					name: 'sendPayload',
					type: 'boolean',
					default: true,
					noDataExpression: true,
					description: 'Whether the events payload (if any) is sent or not (to reduce bandwidth)',
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
