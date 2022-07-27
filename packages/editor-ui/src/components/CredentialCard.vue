<template>
	<n8n-card>
			<template #prepend>
				<NodeIcon class="node-icon" :nodeType="nodeType" :size="24" :shrink="false" />
			</template>
			<template #header>
				<n8n-heading tag="h2" bold>
					{{ data.name }}
				</n8n-heading>
			</template>
			<n8n-text color="text-light" size="small" class="mt-4xs">
				{{ credentialType.displayName }}
				|
				{{ data.updatedAt }}
				|
				{{ data.createdAt }}
			</n8n-text>
			<template #append>
				<n8n-text color="text-light" size="medium">
					3 workflows
				</n8n-text>
				xxx
			</template>
	</n8n-card>
</template>

<script lang="ts">
import Vue from 'vue';
import {ICredentialsResponse} from "@/Interface";
import {ICredentialType, INodeTypeDescription} from "n8n-workflow";
import { DEFAULT_NODETYPE_VERSION } from '@/constants';

export default Vue.extend({
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
	computed: {
		nodeType (): INodeTypeDescription {
			return this.$store.getters.nodeType(this.data.nodesAccess[0].nodeType, DEFAULT_NODETYPE_VERSION);
		},
		credentialType(): ICredentialType {
			return this.$store.getters['credentials/getCredentialTypeByName'](this.data.type);
		},
	},
});
</script>


