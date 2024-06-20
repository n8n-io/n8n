<template>
	<n8n-card :class="$style.cardLink" data-test-id="destination-card" @click="onClick">
		<template #header>
			<div>
				<n8n-heading tag="h2" bold :class="$style.cardHeading">
					{{ destination.label }}
				</n8n-heading>
				<div :class="$style.cardDescription">
					<n8n-text color="text-light" size="small">
						<span>{{ $locale.baseText(typeLabelName) }}</span>
					</n8n-text>
				</div>
			</div>
		</template>
		<template #append>
			<div ref="cardActions" :class="$style.cardActions">
				<div :class="$style.activeStatusText" data-test-id="destination-activator-status">
					<n8n-text v-if="nodeParameters.enabled" :color="'success'" size="small" bold>
						{{ $locale.baseText('workflowActivator.active') }}
					</n8n-text>
					<n8n-text v-else color="text-base" size="small" bold>
						{{ $locale.baseText('workflowActivator.inactive') }}
					</n8n-text>
				</div>

				<el-switch
					class="mr-s"
					:disabled="readonly"
					:model-value="nodeParameters.enabled"
					:title="
						nodeParameters.enabled
							? $locale.baseText('workflowActivator.deactivateWorkflow')
							: $locale.baseText('workflowActivator.activateWorkflow')
					"
					active-color="#13ce66"
					inactive-color="#8899AA"
					data-test-id="workflow-activate-switch"
					@update:model-value="onEnabledSwitched($event)"
				>
				</el-switch>

				<n8n-action-toggle :actions="actions" theme="dark" @action="onAction" />
			</div>
		</template>
	</n8n-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import { useMessage } from '@/composables/useMessage';
import { useLogStreamingStore } from '@/stores/logStreaming.store';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { deepCopy, defaultMessageEventBusDestinationOptions } from 'n8n-workflow';
import type { BaseTextKey } from '@/plugins/i18n';
import type { EventBus } from 'n8n-design-system';

export const DESTINATION_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
};

export default defineComponent({
	components: {},
	setup() {
		return {
			...useMessage(),
		};
	},
	data() {
		return {
			EnterpriseEditionFeature,
			nodeParameters: {} as MessageEventBusDestinationOptions,
		};
	},
	props: {
		eventBus: {
			type: Object as PropType<EventBus>,
		},
		destination: {
			type: Object,
			required: true,
			default: deepCopy(defaultMessageEventBusDestinationOptions),
		},
		readonly: Boolean,
	},
	mounted() {
		this.nodeParameters = Object.assign(
			deepCopy(defaultMessageEventBusDestinationOptions),
			this.destination,
		);
		this.eventBus?.on('destinationWasSaved', this.onDestinationWasSaved);
	},
	beforeUnmount() {
		this.eventBus?.off('destinationWasSaved', this.onDestinationWasSaved);
	},
	computed: {
		...mapStores(useLogStreamingStore),
		actions(): Array<{ label: string; value: string }> {
			const actions = [
				{
					label: this.$locale.baseText('workflows.item.open'),
					value: DESTINATION_LIST_ITEM_ACTIONS.OPEN,
				},
			];
			if (!this.readonly) {
				actions.push({
					label: this.$locale.baseText('workflows.item.delete'),
					value: DESTINATION_LIST_ITEM_ACTIONS.DELETE,
				});
			}
			return actions;
		},
		typeLabelName(): BaseTextKey {
			return `settings.log-streaming.${this.destination.__type}` as BaseTextKey;
		},
	},
	methods: {
		onDestinationWasSaved() {
			const updatedDestination = this.logStreamingStore.getDestination(this.destination.id);
			if (updatedDestination) {
				this.nodeParameters = Object.assign(
					deepCopy(defaultMessageEventBusDestinationOptions),
					this.destination,
				);
			}
		},
		async onClick(event: Event) {
			const cardActions = this.$refs.cardActions as HTMLDivElement | null;
			const target = event.target as HTMLDivElement | null;
			if (
				cardActions === target ||
				cardActions?.contains(target) ||
				target?.contains(cardActions)
			) {
				return;
			}

			this.$emit('edit', this.destination.id);
		},
		onEnabledSwitched(state: boolean) {
			this.nodeParameters.enabled = state;
			void this.saveDestination();
		},
		async saveDestination() {
			await this.logStreamingStore.saveDestination(this.nodeParameters);
		},
		async onAction(action: string) {
			if (action === DESTINATION_LIST_ITEM_ACTIONS.OPEN) {
				this.$emit('edit', this.destination.id);
			} else if (action === DESTINATION_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirm(
					this.$locale.baseText('settings.log-streaming.destinationDelete.message', {
						interpolate: { destinationName: this.destination.label },
					}),
					this.$locale.baseText('settings.log-streaming.destinationDelete.headline'),
					{
						type: 'warning',
						confirmButtonText: this.$locale.baseText(
							'settings.log-streaming.destinationDelete.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'settings.log-streaming.destinationDelete.cancelButtonText',
						),
					},
				);

				if (deleteConfirmed !== MODAL_CONFIRM) {
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
	padding: 0 0 0 var(--spacing-s);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
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
	padding: var(--spacing-s) 0 0 var(--spacing-s);
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s) var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}
</style>
