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
import { get, set, unset } from 'lodash';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { EventNamesTreeCollection, useEventTreeStore } from '../../stores/eventTreeStore';
import { restApi } from '../../mixins/restApi';
import EventTreeSelection from './EventTreeSelection.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { IUpdateInformation } from '../../Interface';
import { deepCopy, defaultMessageEventBusDestinationSyslogOptions, INodeProperties, NodeParameterValue } from 'n8n-workflow';
import Vue from 'vue';
import {SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY} from '../../constants';
import Modal from '@/components/Modal.vue';
import { useUIStore } from '../../stores/ui';
import { saveDestinationToDb } from './Helpers';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-syslog-modal',
	props: {
		modalName: String,
		destination: {
			type: Object,
			default: ()=>deepCopy(defaultMessageEventBusDestinationSyslogOptions),
		},
		isNew: Boolean,
		eventBus: {
			type: Vue,
		},
	},
	data() {
		return {
			unchanged: !this.$props.isNew,
			loading: false,
			showRemoveConfirm: false,
			modalBus: new Vue(),
			treeData: {} as EventNamesTreeCollection,
			nodeParameters: deepCopy(defaultMessageEventBusDestinationSyslogOptions),
			uiDescription: description,
			SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY,
		};
	},
	components: {
		Modal,
		ParameterInputList,
		NodeCredentials,
		EventTreeSelection,
	},
	computed: {
		...mapStores(
			useUIStore,
			useEventTreeStore,
		),
	},
	mounted() {
		this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationSyslogOptions), this.destination);
		this.treeData = this.eventTreeStore.getEventTree(this.destination.id ?? '');
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
		},
		toggleRemoveConfirm() {
			this.showRemoveConfirm = !this.showRemoveConfirm;
		},
		removeThis() {
			this.$props.eventBus.$emit('remove', this.destination.id);
			this.uiStore.closeModal(SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY);
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
			this.uiStore.closeModal(SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY);
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
				{
					displayName: 'Anonymize Messages',
					name: 'anonymizeMessages',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: 'Anonymize user information where possible',
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
