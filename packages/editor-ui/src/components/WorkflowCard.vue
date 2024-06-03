<template>
	<n8n-card :class="$style.cardLink" @click="onClick">
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading" data-test-id="workflow-card-name">
				{{ data.name }}
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-show="data"
					>{{ $locale.baseText('workflows.item.updated') }}
					<TimeAgo :date="String(data.updatedAt)" /> |
				</span>
				<span v-show="data" class="mr-2xs"
					>{{ $locale.baseText('workflows.item.created') }} {{ formattedCreatedAtDate }}
				</span>
				<span
					v-if="settingsStore.areTagsEnabled && data.tags && data.tags.length > 0"
					v-show="data"
				>
					<n8n-tags
						:tags="data.tags"
						:truncate-at="3"
						truncate
						data-test-id="workflow-card-tags"
						@click:tag="onClickTag"
						@expand="onExpandTags"
					/>
				</span>
			</n8n-text>
		</div>
		<template #append>
			<div :class="$style.cardActions" @click.stop>
				<ProjectCardBadge :resource="data" :personal-project="projectsStore.personalProject" />
				<WorkflowActivator
					class="mr-s"
					:workflow-active="data.active"
					:workflow-id="data.id"
					data-test-id="workflow-card-activator"
				/>

				<n8n-action-toggle
					:actions="actions"
					theme="dark"
					data-test-id="workflow-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</n8n-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { IWorkflowDb, IUser } from '@/Interface';
import { DUPLICATE_MODAL_KEY, MODAL_CONFIRM, VIEWS, WORKFLOW_SHARE_MODAL_KEY } from '@/constants';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import type { PermissionsMap } from '@/permissions';
import type { WorkflowScope } from '@n8n/permissions';
import { getWorkflowPermissions } from '@/permissions';
import dateformat from 'dateformat';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ProjectSharingData } from '@/features/projects/projects.types';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectCardBadge from '@/features/projects/components/ProjectCardBadge.vue';

export const WORKFLOW_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	SHARE: 'share',
	DUPLICATE: 'duplicate',
	DELETE: 'delete',
};

export default defineComponent({
	components: {
		TimeAgo,
		WorkflowActivator,
		ProjectCardBadge,
	},
	props: {
		data: {
			type: Object as PropType<IWorkflowDb>,
			required: true,
			default: (): IWorkflowDb => ({
				id: '',
				createdAt: '',
				updatedAt: '',
				active: false,
				connections: {},
				nodes: [],
				name: '',
				sharedWithProjects: [],
				homeProject: {} as ProjectSharingData,
				versionId: '',
			}),
		},
		readOnly: {
			type: Boolean,
			default: false,
		},
	},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useWorkflowsStore, useProjectsStore),
		currentUser(): IUser {
			return this.usersStore.currentUser || ({} as IUser);
		},
		workflowPermissions(): PermissionsMap<WorkflowScope> {
			return getWorkflowPermissions(this.data);
		},
		actions(): Array<{ label: string; value: string }> {
			const actions = [
				{
					label: this.$locale.baseText('workflows.item.open'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.OPEN,
				},
				{
					label: this.$locale.baseText('workflows.item.share'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.SHARE,
				},
			];

			if (!this.readOnly) {
				actions.push({
					label: this.$locale.baseText('workflows.item.duplicate'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.DUPLICATE,
				});
			}

			if (this.workflowPermissions.delete && !this.readOnly) {
				actions.push({
					label: this.$locale.baseText('workflows.item.delete'),
					value: WORKFLOW_LIST_ITEM_ACTIONS.DELETE,
				});
			}

			return actions;
		},
		formattedCreatedAtDate(): string {
			const currentYear = new Date().getFullYear().toString();

			return dateformat(
				this.data.createdAt,
				`d mmmm${String(this.data.createdAt).startsWith(currentYear) ? '' : ', yyyy'}`,
			);
		},
	},
	methods: {
		async onClick(event?: KeyboardEvent | PointerEvent) {
			if (event?.ctrlKey || event?.metaKey) {
				const route = this.$router.resolve({
					name: VIEWS.WORKFLOW,
					params: { name: this.data.id },
				});
				window.open(route.href, '_blank');

				return;
			}

			await this.$router.push({
				name: VIEWS.WORKFLOW,
				params: { name: this.data.id },
			});
		},
		onClickTag(tagId: string, event: PointerEvent) {
			event.stopPropagation();

			this.$emit('click:tag', tagId, event);
		},
		onExpandTags() {
			this.$emit('expand:tags');
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
						tags: (this.data.tags ?? []).map((tag) =>
							typeof tag !== 'string' && 'id' in tag ? tag.id : tag,
						),
					},
				});
			} else if (action === WORKFLOW_LIST_ITEM_ACTIONS.SHARE) {
				this.uiStore.openModalWithData({
					name: WORKFLOW_SHARE_MODAL_KEY,
					data: { id: this.data.id },
				});

				this.$telemetry.track('User opened sharing modal', {
					workflow_id: this.data.id,
					user_id_sharer: this.currentUser.id,
					sub_view: 'Workflows listing',
				});
			} else if (action === WORKFLOW_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirm(
					this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
						interpolate: { workflowName: this.data.name },
					}),
					this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
					{
						type: 'warning',
						confirmButtonText: this.$locale.baseText(
							'mainSidebar.confirmMessage.workflowDelete.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'mainSidebar.confirmMessage.workflowDelete.cancelButtonText',
						),
					},
				);

				if (deleteConfirmed !== MODAL_CONFIRM) {
					return;
				}

				try {
					await this.workflowsStore.deleteWorkflow(this.data.id);
				} catch (error) {
					this.showError(error, this.$locale.baseText('generic.deleteWorkflowError'));
					return;
				}

				// Reset tab title since workflow is deleted.
				this.showMessage({
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
	padding: 0;
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
	padding: var(--spacing-s) 0 0 var(--spacing-s);

	span {
		color: var(--color-text-light);
	}
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
	align-self: stretch;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}
</style>
