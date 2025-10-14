<script setup lang="ts">
import type { RouteLocationNamedRaw } from 'vue-router';
import type { ICredentialsResponse, IUsedCredential } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';
import { VIEWS } from '@/constants';

const props = withDefaults(
	defineProps<{
		credentials?: Array<ICredentialsResponse | IUsedCredential>;
		currentProjectId?: string;
	}>(),
	{
		credentials: () => [],
		currentProjectId: '',
	},
);

const isCredentialReadable = (credential: ICredentialsResponse | IUsedCredential) =>
	'scopes' in credential ? getResourcePermissions(credential.scopes).credential.read : false;

const getCredentialRouterLocation = (
	credential: ICredentialsResponse | IUsedCredential,
): RouteLocationNamedRaw => {
	const isSharedWithCurrentProject = credential.sharedWithProjects?.find(
		(p) => p.id === props.currentProjectId,
	);
	const params: {
		projectId?: string;
		credentialId: string;
	} = { credentialId: credential.id };

	if (isSharedWithCurrentProject ?? credential.homeProject?.id) {
		params.projectId = isSharedWithCurrentProject
			? props.currentProjectId
			: credential.homeProject?.id;
	}

	return {
		name: isSharedWithCurrentProject ? VIEWS.PROJECTS_CREDENTIALS : VIEWS.CREDENTIALS,
		params,
	};
};
</script>

<template>
	<ul :class="$style.credentialsList">
		<li v-for="credential in props.credentials" :key="credential.id">
			<RouterLink
				v-if="isCredentialReadable(credential)"
				target="_blank"
				:to="getCredentialRouterLocation(credential)"
			>
				{{ credential.name }}
			</RouterLink>
			<span v-else>{{ credential.name }}</span>
		</li>
	</ul>
</template>

<style module lang="scss">
.credentialsList {
	list-style-type: none;
	padding: 0;
	margin: 0;

	li {
		padding: 0 0 var(--spacing--3xs);

		&:last-child {
			padding-bottom: 0;
		}
	}
}
</style>
