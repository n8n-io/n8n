<template>
	<n8n-card :class="$style.cardLink" @click="onClick">
		<template #prepend>
			<CredentialIcon :credential-type-name="credentialType ? credentialType.name : ''" />
		</template>
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading">
				{{ data.name }}
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-if="credentialType">{{ credentialType.displayName }} | </span>
				<span v-show="data"
					>{{ $locale.baseText('credentials.item.updated') }} <TimeAgo :date="data.updatedAt" /> |
				</span>
				<span v-show="data"
					>{{ $locale.baseText('credentials.item.created') }} {{ formattedCreatedAtDate }}
				</span>
			</n8n-text>
		</div>
		<template #append>
			<ProjectCardBadge :resource="data" :personal-project="projectsStore.personalProject" />
			<div ref="cardActions" :class="$style.cardActions">
				<n8n-action-toggle :actions="actions" theme="dark" @action="onAction" @click.stop />
			</div>
		</template>
	</n8n-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { ICredentialsResponse, IUser } from '@/Interface';
import type { ICredentialType } from 'n8n-workflow';
import { MODAL_CONFIRM } from '@/constants';
import { useMessage } from '@/composables/useMessage';
import CredentialIcon from '@/components/CredentialIcon.vue';
import type { PermissionsMap } from '@/permissions';
import { getCredentialPermissions } from '@/permissions';
import dateformat from 'dateformat';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import TimeAgo from '@/components/TimeAgo.vue';
import type { ProjectSharingData } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import type { CredentialScope } from '@n8n/permissions';
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';

export const CREDENTIAL_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
};

export default defineComponent({
	components: {
		TimeAgo,
		CredentialIcon,
		ProjectCardBadge,
	},
	props: {
		data: {
			type: Object as PropType<ICredentialsResponse>,
			required: true,
			default: (): ICredentialsResponse => ({
				id: '',
				createdAt: '',
				updatedAt: '',
				type: '',
				name: '',
				sharedWithProjects: [],
				homeProject: {} as ProjectSharingData,
			}),
		},
		readonly: {
			type: Boolean,
			default: false,
		},
	},
	setup() {
		return {
			...useMessage(),
		};
	},
	computed: {
		...mapStores(useCredentialsStore, useUIStore, useUsersStore, useProjectsStore),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		credentialType(): ICredentialType | undefined {
			return this.credentialsStore.getCredentialTypeByName(this.data.type);
		},
		credentialPermissions(): PermissionsMap<CredentialScope> | null {
			return !this.currentUser ? null : getCredentialPermissions(this.data);
		},
		actions(): Array<{ label: string; value: string }> {
			if (!this.credentialPermissions) {
				return [];
			}

			return [
				{
					label: this.$locale.baseText('credentials.item.open'),
					value: CREDENTIAL_LIST_ITEM_ACTIONS.OPEN,
				},
			].concat(
				this.credentialPermissions.delete
					? [
							{
								label: this.$locale.baseText('credentials.item.delete'),
								value: CREDENTIAL_LIST_ITEM_ACTIONS.DELETE,
							},
						]
					: [],
			);
		},
		formattedCreatedAtDate(): string {
			const currentYear = new Date().getFullYear().toString();

			return dateformat(
				this.data.createdAt,
				`d mmmm${this.data.createdAt.startsWith(currentYear) ? '' : ', yyyy'}`,
			);
		},
	},
	methods: {
		async onClick(event: Event) {
			const cardActionsEl = this.$refs.cardActions as HTMLDivElement | undefined;
			const clickTarget = event.target as HTMLElement | null;
			if (cardActionsEl === clickTarget || (clickTarget && cardActionsEl?.contains(clickTarget))) {
				return;
			}

			this.uiStore.openExistingCredential(this.data.id);
		},
		async onAction(action: string) {
			if (action === CREDENTIAL_LIST_ITEM_ACTIONS.OPEN) {
				await this.onClick(new Event('click'));
			} else if (action === CREDENTIAL_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirm(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.message',
						{
							interpolate: { savedCredentialName: this.data.name },
						},
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline',
					),
					{
						confirmButtonText: this.$locale.baseText(
							'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
						),
					},
				);

				if (deleteConfirmed === MODAL_CONFIRM) {
					await this.credentialsStore.deleteCredential({ id: this.data.id });
				}
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

.cardHeading {
	font-size: var(--font-size-s);
	padding: var(--spacing-s) 0 0;

	span {
		color: var(--color-text-light);
	}
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s);
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
