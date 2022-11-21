<template>
  <el-card class="box-card">
		<template #header>
      <div class="card-header">
				<el-row :gutter="20" justify="start">
					<el-col :span="12">
						<span>Webhook Endpoint</span>
					</el-col>
					<el-col :span="12" style="text-align: right">
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
      </div>
    </template>
		<template>
			<el-button type="primary" @click="testbt" >Test</el-button>
			<el-form :model="form" label-width="120px">
				<el-form-item label="Enabled">
					<el-switch v-model="form.enabled" @input="onInput"/>
				</el-form-item>
				<el-form-item label="Id" size="small">
					<el-input v-model="form.id" disabled placeholder="Destination Id" size="small" @input="onInput"/>
				</el-form-item>
				<el-form-item label="Name">
					<el-input v-model="form.name" placeholder="Destination Name" @input="onInput"/>
				</el-form-item>
				<el-form-item label="Endpoint">
					<el-input v-model="form.url" placeholder="https://..." @input="onInput"/>
				</el-form-item>
				<el-form-item label="Response">
					<el-row :gutter="20">
						<el-col :span="7">
							<el-checkbox v-model="form.responseCodeMustMatch" @input="onInput">Expect status code:</el-checkbox>
						</el-col>
						<el-col :span="4">
							<el-input v-model="form.expectedStatusCode" :disabled="!form.responseCodeMustMatch" @input="onInput"/>
						</el-col>
					</el-row>
				</el-form-item>
				<el-form-item label="Events">
					<event-tree
						v-for="(child, index) in treeData.children"
						class="item"
						:key="index"
						:item="child"
						:destinationId="destination.id"
						:depth="0"
						@input="onInput"
					></event-tree>
				</el-form-item>
			</el-form>
			<el-row :gutter="20">
				<el-col :span="21">&nbsp;</el-col>
				<el-col :span="2"><el-button type="primary" @click="saveDestination" :disabled="unchanged">Save</el-button></el-col>
			</el-row>
		</template>
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
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useEventTreeStore } from '../../stores/eventTreeStore';
import { restApi } from '../mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import EventTree, { EventNamesTreeCollection } from './EventTree.vue';
import { MessageEventBusDestinationWebhook } from './types';

export default mixins(
	restApi,
).extend({
	name: 'event-destination-settings-webhook',
	props: {
		destination: MessageEventBusDestinationWebhook,
		treeData: EventNamesTreeCollection,
	},
	data() {
		return {
			unchanged: true,
			isOpen: false,
			form: this.$props.destination,
			showRemoveConfirm: false,
		};
	},
	components: {
		EventTree,
		ElForm,
		ElFormItem,
		ElInput,
		ElCollapse,
		ElCollapseItem,
	},
	computed: {
		...mapStores(
			useEventTreeStore,
		),
		isFolder() {
			return true;
		},
	},
	methods: {
		onInput() {
			this.unchanged = false;
		},
		toggleRemoveConfirm() {
			this.showRemoveConfirm = !this.showRemoveConfirm;
		},
		async removeThis() {
			this.$emit('remove', this.destination.id);
		},
		testbt() {
			console.log({
				...this.form,
				subscribedEvents: Array.from(this.eventTreeStore.items[this.destination.id].selectedEvents.values()),
				subscribedLevels: Array.from(this.eventTreeStore.items[this.destination.id].selectedLevels.values()),
			});
		},
		async saveDestination() {
			if (this.unchanged) {
				return;
			}
			const data: MessageEventBusDestinationWebhook = {
				...this.form,
				subscribedEvents: Array.from(this.eventTreeStore.items[this.destination.id].selectedEvents.values()),
				subscribedLevels: Array.from(this.eventTreeStore.items[this.destination.id].selectedLevels.values()),
			};
			await this.restApi().makeRestApiRequest('POST', '/eventbus/destination', data);
		},
	},
});
</script>

<style lang="scss" module>

.item {
  cursor: pointer;
}

ul {
  padding-left: 1em;
  line-height: 1.5em;
  list-style-type: dot;
	margin-bottom: 0;
}

.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
	padding-bottom: 100px;
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
}
</style>
