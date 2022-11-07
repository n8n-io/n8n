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
			<div :class="$style.cardDescription">
				<n8n-text color="text-light" size="small">
					<span v-show="data">{{$locale.baseText('workflows.item.updated')}} <time-ago :date="data.updatedAt" /> | </span>
					<span v-show="data" class="mr-2xs">{{$locale.baseText('workflows.item.created')}} {{ formattedCreatedAtDate }} </span>
					<span v-if="settingsStore.areTagsEnabled && data.tags && data.tags.length > 0" v-show="data">
					<n8n-tags
						:tags="data.tags"
						:truncateAt="3"
						truncate
						@click="onClickTag"
					/>
				</span>
				</n8n-text>
			</div>
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

					<workflow-activator
						class="mr-s"
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
import {IWorkflowDb, IUser, ITag} from "@/Interface";
import {DUPLICATE_MODAL_KEY, EnterpriseEditionFeature, VIEWS} from '@/constants';
import {showMessage} from "@/components/mixins/showMessage";
import {getWorkflowPermissions, IPermissions} from "@/permissions";
import dateformat from "dateformat";
import { restApi } from '@/components/mixins/restApi';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import Vue from "vue";
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';

export const WORKFLOW_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DUPLICATE: 'duplicate',
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
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
		),
		currentUser (): IUser {
			return this.usersStore.currentUser || {} as IUser;
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
				{
					label: this.$locale.baseText('workflows.item.duplicate'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE,
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
		onClickTag(tagId: string, event: PointerEvent) {
			event.stopPropagation();

			this.$emit('click:tag', tagId, event);
		},
		async onAction(action: string) {
			if (action === WORKFLOW_LIST_ITEM_ACTIONS.OPEN) {
				await this.onClick();
			} else if (action === WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE) {
				this.uiStore.openModalWithData({
					name: DUPLICATE_MODAL_KEY,
					data: {
						id: this.data.id,
						name: this.data.name,
						tags: (this.data.tags || []).map((tag: ITag) => tag.id),
					},
				});
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
					this.workflowsStore.deleteWorkflow(this.data.id);
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


