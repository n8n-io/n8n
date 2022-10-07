<template>
	<n8n-card
		:class="$style.cardLink"
		@click="onClick"
	>
			<template #header>
				<n8n-heading tag="h2" bold class="ph-no-capture" :class="$style.cardHeading">
					{{ data.name }}
				</n8n-heading>
			</template>
			<n8n-text color="text-light" size="small">
				<span v-show="data">{{$locale.baseText('workflows.item.updated')}} <time-ago :date="data.updatedAt" /> | </span>
				<span v-show="data">{{$locale.baseText('workflows.item.created')}} {{ formattedCreatedAtDate }} </span>
				<span v-if="areTagsEnabled && data.tags && data.tags.length > 0" v-show="data">
					<n8n-tags
						:tags="data.tags"
						:truncateAt="3"
						truncate
					/>
				</span>
			</n8n-text>
			<template #append>
				<div :class="$style.cardActions">
					<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" v-show="false">
						<n8n-badge
							v-if="credentialPermissions.isOwner"
							class="mr-xs"
							theme="tertiary"
							bold
						>
							{{$locale.baseText('workflows.item.owner')}}
						</n8n-badge>
					</enterprise-edition>

					<div :class="$style.activeStatusText">
						<n8n-text v-if="data.active" color="success" size="small" bold>
							{{ $locale.baseText('workflows.item.active') }}
						</n8n-text>
						<n8n-text v-else color="text-base" size="small" bold>
							{{ $locale.baseText('workflows.item.inactive') }}
						</n8n-text>
					</div>

					<workflow-activator
						class="mr-xs"
						:workflow-active="data.active"
						:workflow-id="data.id"
						ref="activator"
					/>

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
import {IWorkflowDb, IUser} from "@/Interface";
import {EnterpriseEditionFeature, VIEWS} from '@/constants';
import {showMessage} from "@/components/mixins/showMessage";
import {getWorkflowPermissions, IPermissions} from "@/permissions";
import dateformat from "dateformat";
import { restApi } from '@/components/mixins/restApi';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import Vue from "vue";

export const WORKFLOW_LIST_ITEM_ACTIONS = {
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
		};
	},
	components: {
		WorkflowActivator,
	},
	props: {
		data: {
			type: Object,
			required: true,
			default: (): IWorkflowDb => ({
				id: '',
				createdAt: '',
				updatedAt: '',
				active: false,
				connections: {},
				nodes: [],
				name: '',
				sharedWith: [],
				ownedBy: {} as IUser,
			}),
		},
		readonly: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		currentUser (): IUser {
			return this.$store.getters['users/currentUser'];
		},
		areTagsEnabled(): boolean {
			return this.$store.getters['settings/areTagsEnabled'];
		},
		credentialPermissions(): IPermissions {
			return getWorkflowPermissions(this.currentUser, this.data, this.$store);
		},
		actions(): Array<{ label: string; value: string; }> {
			return [
				{
					label: this.$locale.baseText('workflows.item.open'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.OPEN,
				},
			].concat(this.credentialPermissions.delete ? [{
				label: this.$locale.baseText('workflows.item.delete'),
				value: WORKFLOW_LIST_ITEM_ACTIONS.DELETE,
			}]: []);
		},
		formattedCreatedAtDate(): string {
			const currentYear = new Date().getFullYear();

			return dateformat(this.data.createdAt, `d mmmm${this.data.createdAt.startsWith(currentYear) ? '' : ', yyyy'}`);
		},
	},
	methods: {
		async onClick(event?: PointerEvent) {
			if (event) {
				if ((this.$refs.activator as Vue)?.$el.contains(event.target as HTMLElement)) {
					return;
				}

				if (event.metaKey || event.ctrlKey) {
					const route = this.$router.resolve({name: VIEWS.WORKFLOW, params: { name: this.data.id }});
					window.open(route.href, '_blank');

					return;
				}
			}

			this.$router.push({
				name: VIEWS.WORKFLOW,
				params: { name: this.data.id },
			});
		},
		async onAction(action: string) {
			if (action === WORKFLOW_LIST_ITEM_ACTIONS.OPEN) {
				this.onClick();
			} else if (action === WORKFLOW_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirmMessage(
					this.$locale.baseText(
						'mainSidebar.confirmMessage.workflowDelete.message',
						{ interpolate: { workflowName: this.data.name } },
					),
					this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
					'warning',
					this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.confirmButtonText'),
					this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.cancelButtonText'),
				);

				if (deleteConfirmed === false) {
					return;
				}

				try {
					await this.restApi().deleteWorkflow(this.data.id);
					this.$store.commit('deleteWorkflow', this.data.id);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('mainSidebar.showError.stopExecution.title'),
					);
					return;
				}

				// Reset tab title since workflow is deleted.
				this.$showMessage({
					title: this.$locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
					type: 'success',
				});
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

.cardHeading {
	font-size: var(--font-size-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}

.activeStatusText {
	width: 64px; // Required to avoid jumping when changing active state
	padding-right: var(--spacing-xs);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}
</style>


