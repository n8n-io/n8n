<script setup lang="ts">
import { computed } from 'vue';
import { DOMAIN_RESTRICTION_FIELDS, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const HIDDEN_FIELDS = new Set([
	...DOMAIN_RESTRICTION_FIELDS.map((field) => field.name),
	'organizationId',
	'header',
	'headerName',
	'headerValue',
]);

const props = defineProps<{
	credentialType: string;
	data: ICredentialDataDecryptedObject;
}>();

const emit = defineEmits<{ update: [name: string, value: IUpdateInformation['value']] }>();

const credentialsStore = useCredentialsStore();

const type = computed(() => credentialsStore.getCredentialTypeByName(props.credentialType));

const properties = computed(() =>
	(type.value?.properties ?? []).filter((property) => !HIDDEN_FIELDS.has(property.name)),
);

function onUpdate(parameterData: IUpdateInformation) {
	emit('update', parameterData.name, parameterData.value);
}
</script>

<template>
	<CredentialInputs
		:credential-properties="properties"
		:credential-data="data"
		:documentation-url="type?.documentationUrl ?? ''"
		@update="onUpdate"
	/>
</template>
