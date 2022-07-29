<template>
	<n8n-card
		:class="$style['card-link']"
		@click="onClick"
	>
			<template #prepend>
				<NodeIcon class="node-icon" :nodeType="nodeType" :size="24" :shrink="false" />
			</template>
			<template #header>
				<n8n-heading tag="h2" bold>
					{{ data.name }}
				</n8n-heading>
			</template>
			<n8n-text color="text-light" size="small" class="mt-4xs">
				<span v-show="credentialType">{{ credentialType.displayName }} | </span>
				<span v-show="data"><time-ago :date="data.updatedAt" /> | </span>
				<span v-show="data"><time-ago :date="data.createdAt" /></span>
			</n8n-text>
			<template #append>
				<n8n-text color="text-light" size="medium" class="mr-s">
					3 workflows (TODO)
				</n8n-text>
				<n8n-action-toggle
					:actions="actions"
					@action="onAction"
				/>
			</template>
	</n8n-card>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import {ICredentialsResponse} from "@/Interface";
import {ICredentialType, INodeTypeDescription} from "n8n-workflow";
import {CREDENTIAL_LIST_ITEM_ACTIONS, DEFAULT_NODETYPE_VERSION} from '@/constants';
import {showMessage} from "@/components/mixins/showMessage";

export default mixins(
	showMessage,
).extend({
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
			}),
		},
	},
	data() {
		return {
			actions: [
				{
					label: this.$locale.baseText('credentials.list.remove'),
					value: CREDENTIAL_LIST_ITEM_ACTIONS.REMOVE,
				},
			],
		};
	},
	computed: {
		nodeType (): INodeTypeDescription {
			return this.$store.getters.nodeType(this.data.nodesAccess[0].nodeType, DEFAULT_NODETYPE_VERSION);
		},
		credentialType(): ICredentialType {
			return this.$store.getters['credentials/getCredentialTypeByName'](this.data.type);
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
</style>


