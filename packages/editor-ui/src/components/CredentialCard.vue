<template>
	<n8n-card :class="$style['card-link']" @click="onClick">
		<template #prepend>
			<credential-icon :credential-type-name="credentialType ? credentialType.name : ''" />
		</template>
		<template #header>
			<n8n-heading tag="h2" bold class="ph-no-capture" :class="$style['card-heading']">
				{{ data.name }}
			</n8n-heading>
		</template>
		<n8n-text color="text-light" size="small">
			<span v-if="credentialType">{{ credentialType.displayName }} | </span>
			<span v-show="data"
				>{{ $locale.baseText('credentials.item.updated') }} <time-ago :date="data.updatedAt" /> |
			</span>
			<span v-show="data"
				>{{ $locale.baseText('credentials.item.created') }} {{ formattedCreatedAtDate }}
			</span>
		</n8n-text>
		<template #append>
			<div :class="$style['card-actions']">
				<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
					<n8n-badge v-if="credentialPermissions.isOwner" class="mr-xs" theme="tertiary" bold>
						{{ $locale.baseText('credentials.item.owner') }}
					</n8n-badge>
				</enterprise-edition>
				<n8n-action-toggle :actions="actions" theme="dark" @action="onAction" />
			</div>
		</template>
	</n8n-card>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { ICredentialsResponse, IUser } from '@/Interface';
import { ICredentialType } from 'n8n-workflow';
import { EnterpriseEditionFeature } from '@/constants';
import { showMessage } from '@/mixins/showMessage';
import CredentialIcon from '@/components/CredentialIcon.vue';
import { getCredentialPermissions, IPermissions } from '@/permissions';
import dateformat from 'dateformat';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { useCredentialsStore } from '@/stores/credentials';

export const CREDENTIAL_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
};

export default mixins(showMessage).extend({
	data() {
		return {
			EnterpriseEditionFeature,
		};
	},
	components: {
		CredentialIcon,
	},
	props: {
		data: {
			type: Object,
			required: true,
			default: (): ICredentialsResponse => ({
				id: '',
				createdAt: '',
				updatedAt: '',
				type: '',
				name: '',
				nodesAccess: [],
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
		...mapStores(useCredentialsStore, useUIStore, useUsersStore),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		credentialType(): ICredentialType {
			return this.credentialsStore.getCredentialTypeByName(this.data.type);
		},
		credentialPermissions(): IPermissions | null {
			return !this.currentUser ? null : getCredentialPermissions(this.currentUser, this.data);
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
			const currentYear = new Date().getFullYear();

			return dateformat(
				this.data.createdAt,
				`d mmmm${this.data.createdAt.startsWith(currentYear) ? '' : ', yyyy'}`,
			);
		},
	},
	methods: {
		async onClick() {
			this.uiStore.openExistingCredential(this.data.id);
		},
		async onAction(action: string) {
			if (action === CREDENTIAL_LIST_ITEM_ACTIONS.OPEN) {
				this.onClick();
			} else if (action === CREDENTIAL_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirmMessage(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.message',
						{
							interpolate: { savedCredentialName: this.data.name },
						},
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline',
					),
					null,
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
					),
				);

				if (deleteConfirmed) {
					this.credentialsStore.deleteCredential({ id: this.data.id });
				}
			}
		},
	},
});
</script>

<style lang="scss" module>
.card-link {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.card-heading {
	font-size: var(--font-size-s);
}

.card-actions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}
</style>
