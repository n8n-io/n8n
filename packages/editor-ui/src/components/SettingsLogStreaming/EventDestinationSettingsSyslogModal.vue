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
		<template slot="header">
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
		<template slot="content">
			<div :class="$style.narrowCardBody">
					<parameter-input-list
						:parameters="uiDescription"
						:hideDelete="true"
						:nodeValues="nodeParameters"
						:isReadOnly="false"
						path=""
						@valueChanged="valueChanged"
					>
					</parameter-input-list>
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
import { restApi } from '../mixins/restApi';
import EventTreeSelection from './EventTreeSelection.vue';
import EventLevelSelection from './EventLevelSelection.vue';
import { MessageEventBusDestinationSyslog, MessageEventBusDestinationTypeNames } from './types';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { INodeUi, IUpdateInformation } from '../../Interface';
import { deepCopy, IDataObject, INodeProperties, NodeParameterValue } from 'n8n-workflow';
import Vue from 'vue';
import {SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY} from '../../constants';
import Modal from '@/components/Modal.vue';
import { useUIStore } from '../../stores/ui';
import { destinationToFakeINodeUi } from './Helpers';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-syslog-modal',
	props: {
		modalName: String,
		destination: MessageEventBusDestinationSyslog,
		isNew: Boolean,
		eventBus: {
			type: Vue,
		},
	},
	data() {
		return {
			unchanged: !this.$props.isNew,
			isOpen: false,
			loading: false,
			showRemoveConfirm: false,
			modalBus: new Vue(),
			treeData: {} as EventNamesTreeCollection,
			nodeParameters: {} as MessageEventBusDestinationSyslog,
			uiDescription: description,
			SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY,
			destinationTypeNames: MessageEventBusDestinationTypeNames,
		};
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
		this.ndvStore.activeNodeName = this.destination.id;
		// merge destination data with defaults
		this.nodeParameters = Object.assign(new MessageEventBusDestinationSyslog(), this.destination);
		this.treeData = this.eventTreeStore.getEventTree(this.destination.id);
	},
	methods: {
		onInput() {
			this.unchanged = false;
		},
		valueChanged(parameterData: IUpdateInformation) {
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
			this.uiStore.closeModal(SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async saveDestination() {
			if (this.unchanged) {
				return;
			}
			const data: MessageEventBusDestinationSyslog = {
				...this.nodeParameters,
				subscribedEvents: Array.from(this.eventTreeStore.items[this.destination.id].selectedEvents.values()),
				subscribedLevels: Array.from(this.eventTreeStore.items[this.destination.id].selectedLevels.values()),
			};
			await this.restApi().makeRestApiRequest('POST', '/eventbus/destination', data);
			this.unchanged = true;
			this.eventTreeStore.updateDestination(this.nodeParameters);
			this.$props.eventBus.$emit('destinationWasUpdated', this.destination.id);
			this.uiStore.closeModal(SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY);
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
					default: 'Syslog Server',
					noDataExpression: true,
					description: 'Custom label',
				},
				{
					displayName: 'Host',
					name: 'host',
					type: 'string',
					default: '127.0.0.1',
					placeholder: '127.0.0.1',
					description: 'The IP or host name to make the request to',
				},
				{
					displayName: 'Port',
					name: 'port',
					type: 'number',
					default: '514',
					placeholder: '514',
					description: 'The port number to make the request to',
				},
				{
					displayName: 'Protocol',
					name: 'protocol',
					type: 'options',
					options: [
						{
							name: 'TCP',
							value: 'tcp',
						},
						{
							name: 'UDP',
							value: 'udp',
						},
					],
					default: 'udp',
					description: 'The protocol to use for the connection',
				},
				{
					displayName: 'Facility',
					name: 'facility',
					type: 'options',
					options: [
						{name: 'Kernel', value:  0},
						{name: 'User',   value:  1},
						{name: 'System', value:  3},
						{name: 'Audit',  value: 13},
						{name: 'Alert',  value: 14},
						{name: 'Local0', value: 16},
						{name: 'Local1', value: 17},
						{name: 'Local2', value: 18},
						{name: 'Local3', value: 19},
						{name: 'Local4', value: 20},
						{name: 'Local5', value: 21},
						{name: 'Local6', value: 22},
						{name: 'Local7', value: 23},
					],
					default: '16',
					description: 'Syslog facility parameter',
				},
				{
					displayName: 'App Name',
					name: 'app_name',
					type: 'string',
					default: 'n8n',
					placeholder: 'n8n',
					description: 'Syslog app name parameter',
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
