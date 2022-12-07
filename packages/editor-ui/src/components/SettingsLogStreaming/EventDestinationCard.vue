<template>
	<n8n-card
		:class="$style.cardLink"
	>
			<template #header>
				<div @click="onClick">
					<n8n-heading tag="h2" bold class="ph-no-capture" :class="$style.cardHeading">
						{{ destination.label }}
					</n8n-heading>
					<div :class="$style.cardDescription">
						<n8n-text color="text-light" size="small">
							<span>{{$locale.baseText('settings.logstreaming.type')}}: {{$locale.baseText(typeLabelName)}}</span>
						</n8n-text>
					</div>
				</div>
			</template>
			<template #append>
				<div :class="$style.cardActions">
					<div :class="$style.activeStatusText" data-test-id="workflow-activator-status">
						<n8n-text v-if="nodeParameters.enabled" :color="'success'" size="small" bold>
							{{ $locale.baseText('workflowActivator.active') }}
						</n8n-text>
						<n8n-text v-else color="text-base" size="small" bold>
							{{ $locale.baseText('workflowActivator.inactive') }}
						</n8n-text>
					</div>

					<el-switch
						:value="nodeParameters.enabled"
						@change="onEnabledSwitched($event, destination.id)"
						:title="nodeParameters.enabled ? $locale.baseText('workflowActivator.deactivateWorkflow') : $locale.baseText('workflowActivator.activateWorkflow')"
						active-color="#13ce66"
						inactive-color="#8899AA"
						element-loading-spinner="el-icon-loading"
						data-test-id="workflow-activate-switch"
					>
					</el-switch>

					<n8n-action-toggle
						:actions="actions"
						theme="dark"
						@action="onAction"
					/>
				</div>
			</template>
	</n8n-card>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import {EnterpriseEditionFeature} from '@/constants';
import {showMessage} from "@/mixins/showMessage";
import { useLogStreamingStore } from '../../stores/logStreamingStore';
import { restApi } from '@/mixins/restApi';
import Vue from "vue";
import { mapStores } from 'pinia';
import { deepCopy, defaultMessageEventBusDestinationOptions, MessageEventBusDestinationOptions } from 'n8n-workflow';
import { saveDestinationToDb } from './Helpers';
import { BaseTextKey } from '../../plugins/i18n';

export const DESTINATION_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
};

export default mixins(
	showMessage,
	restApi,
).extend({
	data() {
		return {
			EnterpriseEditionFeature,
			nodeParameters: {} as MessageEventBusDestinationOptions,
		};
	},
	components: {
	},
	props: {
		eventBus: {
			type: Vue,
		},
		destination: {
			type: Object,
			required: true,
			default: deepCopy(defaultMessageEventBusDestinationOptions) as MessageEventBusDestinationOptions,
		},
	},
	mounted() {
			this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), this.destination);
			this.eventBus.$on('destinationWasUpdated', () => {
				const updatedDestination = this.logStreamingStore.getDestination(this.destination.id);
				if (updatedDestination) {
					this.nodeParameters = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), this.destination);
				}
			});
		},
	computed: {
		...mapStores(
			useLogStreamingStore,
		),
		actions(): Array<{ label: string; value: string; }> {
			return [
				{
					label: this.$locale.baseText('workflows.item.open'),
					value: DESTINATION_LIST_ITEM_ACTIONS.OPEN,
				},
			].concat([{
				label: this.$locale.baseText('workflows.item.delete'),
				value: DESTINATION_LIST_ITEM_ACTIONS.DELETE,
			}]);
		},
		typeLabelName(): BaseTextKey {
			return `settings.logstreaming.${this.destination.__type}` as BaseTextKey;
		},
	},
	methods: {
		async onClick() {
			this.$emit('edit', this.destination.id);
		},
		onEnabledSwitched(state: boolean, destinationId: string) {
			this.nodeParameters.enabled = state;
			this.saveDestination();
		},
		async saveDestination() {
			await saveDestinationToDb(this.restApi(), this.nodeParameters);
		},
		async onAction(action: string) {
			if (action === DESTINATION_LIST_ITEM_ACTIONS.OPEN) {
				this.$emit('edit', this.destination.id);
			} else if (action === DESTINATION_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirmMessage(
					this.$locale.baseText(
						'settings.logstreaming.destinationDelete.message',
						{ interpolate: { destinationName: this.destination.label } },
					),
					this.$locale.baseText('settings.logstreaming.destinationDelete.headline'),
					'warning',
					this.$locale.baseText('settings.logstreaming.destinationDelete.confirmButtonText'),
					this.$locale.baseText('settings.logstreaming.destinationDelete.cancelButtonText'),
				);

				if (deleteConfirmed === false) {
					return;
				}

				this.$emit('remove', this.destination.id);
			}
		},
	},
});
</script>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441C17, 0.1);
	}
}

.activeStatusText {
	width: 64px; // Required to avoid jumping when changing active state
	padding-right: var(--spacing-2xs);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}
</style>
