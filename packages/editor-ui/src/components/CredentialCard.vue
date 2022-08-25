<template>
	<n8n-card
		:class="$style['card-link']"
		@click="onClick"
	>
			<template #prepend>
				<credential-icon :credential-type-name="credentialType.name" />
			</template>
			<template #header>
				<n8n-heading tag="h2" bold :class="$style['card-heading']">
					{{ data.name }}
					<n8n-badge v-if="credentialPermissions.isOwner" class="ml-2xs">
						{{$locale.baseText('credentials.item.owner')}}
					</n8n-badge>
				</n8n-heading>
			</template>
			<n8n-text color="text-light" size="small" class="mt-4xs">
				<span v-show="credentialType">{{ credentialType.displayName }} | </span>
				<span v-show="data">{{$locale.baseText('credentials.item.updated')}} <time-ago :date="data.updatedAt" /> | </span>
				<span v-show="data">{{$locale.baseText('credentials.item.created')}} <time-ago :date="data.createdAt" /></span>
			</n8n-text>
			<template #append v-if="!readonly">
				<n8n-action-toggle
					:actions="actions"
					@action="onAction"
				/>
			</template>
	</n8n-card>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import {ICredentialsResponse, IUser} from "@/Interface";
import {ICredentialType} from "n8n-workflow";
import {CREDENTIAL_LIST_ITEM_ACTIONS, EnterpriseEditionFeature} from '@/constants';
import {showMessage} from "@/components/mixins/showMessage";
import CredentialIcon from '@/components/CredentialIcon.vue';
import {getCredentialPermissions, IPermissions} from "@/permissions";
import {mapGetters} from "vuex";

export default mixins(
	showMessage,
).extend({
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
	data() {
		return {
			actions: [
				{
					label: this.$locale.baseText('credentials.item.remove'),
					value: CREDENTIAL_LIST_ITEM_ACTIONS.REMOVE,
				},
			],
		};
	},
	computed: {
		...mapGetters('users', ['currentUser']),
		credentialType(): ICredentialType {
			return this.$store.getters['credentials/getCredentialTypeByName'](this.data.type);
		},
		credentialPermissions(): IPermissions {
			return getCredentialPermissions(this.currentUser, this.data, this.$store);
		},
	},
	methods: {
		async onClick() {
			this.$store.dispatch('ui/openExisitngCredential', { id: this.data.id});
		},
		async onAction(action: string) {
			if (action === CREDENTIAL_LIST_ITEM_ACTIONS.REMOVE) {
				const deleteConfirmed = await this.confirmMessage(
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', {
						interpolate: { savedCredentialName: this.data.name },
					}),
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
					null,
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText'),
				);

				if (deleteConfirmed) {
					await this.$store.dispatch('credentials/deleteCredential', {
						id: this.data.id,
					});
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
		box-shadow: 0 2px 8px rgba(#441C17, 0.1);
	}
}

.card-heading {
	display: inline-flex;
	align-items: center;
}
</style>


