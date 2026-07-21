<script setup lang="ts">
import { computed } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const props = defineProps<{
	credentialType: string;
	data: ICredentialDataDecryptedObject;
}>();

const emit = defineEmits<{ update: [name: string, value: unknown] }>();

const credentialsStore = useCredentialsStore();

const type = computed(() => credentialsStore.getCredentialTypeByName(props.credentialType));

function onUpdate(parameterData: IUpdateInformation) {
	emit('update', parameterData.name, parameterData.value);
}
</script>

<template>
	<CredentialInputs
		:credential-properties="type?.properties ?? []"
		:credential-data="data"
		:documentation-url="type?.documentationUrl ?? ''"
		@update="onUpdate"
	/>
</template>
