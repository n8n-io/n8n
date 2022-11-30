<template>
	<el-card class="box-card" :class="$style.destinationCard">
		<div style="padding: 10px">
				<el-switch
						v-model="nodeParameters.enabled"
						size="large"
						@input="onEnabledSwitched($event, destination.id)"
						/>
				&nbsp;
				<n8n-text size="large" color="text-dark" @click="editThis(destination.id)" :class="$style.item">{{ nodeParameters.label }}</n8n-text>
			<div>
			<el-row :gutter="10" style="margin-top: 20px;">
				<!-- <el-col style="text-align: left;" :span="8">
					<el-button class="button" text @click="editThis(destination.id)">Edit</el-button>
				</el-col> -->
				<el-col style="text-align: right;" :span="24">
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
import { get, set, unset } from 'lodash';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useEventTreeStore } from '../../stores/eventTreeStore';
import EventTreeSelection from './EventTreeSelection.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { IUpdateInformation } from '../../Interface';
import { deepCopy, defaultMessageEventBusDestinationOptions, MessageEventBusDestinationOptions, NodeParameterValue } from 'n8n-workflow';
import { useUIStore } from '../../stores/ui';
import Vue from 'vue';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY } from '../../constants';
import { restApi } from '../../mixins/restApi';
import { saveDestinationToDb } from './Helpers';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-card',
	props: {
		destination: {
			type: Object,
			default: deepCopy(defaultMessageEventBusDestinationOptions),
		},
		eventBus: {
			type: Vue,
		},
	},
	data() {
		return {
			showRemoveConfirm: false,
			nodeParameters: {} as MessageEventBusDestinationOptions,
		};
	},
	components: {
		ParameterInputList,
		NodeCredentials,
		EventTreeSelection,
	},
	computed: {
		...mapStores(
			useUIStore,
			useEventTreeStore,
		),
		isFolder() {
			return true;
		},
	},
	mounted() {
			this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), this.destination);
			this.eventBus.$on('destinationWasUpdated', () => {
				const updatedDestination = this.eventTreeStore.getDestination(this.destination.id);
				if (updatedDestination) {
					this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), this.destination);
				}
			});
		},
	methods: {
		editThis(destinationId: string) {
			this.$emit('edit', destinationId);
		},
		onEnabledSwitched(state: boolean, destinationId: string) {
			this.valueChanged({name: 'enabled', value: state});
			this.saveDestination();
		},
		valueChanged(parameterData: IUpdateInformation) {
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
			this.nodeParameters = nodeParameters;
		},
		toggleRemoveConfirm() {
			this.showRemoveConfirm = !this.showRemoveConfirm;
		},
		removeThis() {
			this.$emit('remove', this.destination.id);
			this.uiStore.closeModal(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async saveDestination() {
			await saveDestinationToDb(this.restApi(), this.nodeParameters);
		},
	},
});

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
  width: 100%;
}

.narrowCardBody {
	padding: 0 70px 20px 70px;
}
</style>
