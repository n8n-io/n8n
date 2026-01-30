<script setup lang="ts">
import TimeAgo from '@/app/components/TimeAgo.vue';
import type { CredentialResolver } from '@n8n/api-types';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import dateformat from 'dateformat';
import { computed, onMounted } from 'vue';
import { useCredentialResolvers } from './composables/useCredentialResolvers';

const i18n = useI18n();

const {
	resolvers,
	resolverTypes,
	isLoading,
	fetchResolvers,
	fetchResolverTypes,
	deleteResolver,
	openCreateModal,
	openEditModal,
} = useCredentialResolvers();

// TODO: use actual docs link when available
const docsUrl = 'https://docs.n8n.io/';

const RESOLVER_LIST_ITEM_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
} as const;

onMounted(async () => {
	await Promise.all([fetchResolvers(), fetchResolverTypes()]);
});

const currentYear = new Date().getFullYear().toString();

function getDateFormat(date: Date): string {
	return `d mmmm${String(date).startsWith(currentYear) ? '' : ', yyyy'}`;
}

const actions = computed(() => {
	return [
		{
			label: i18n.baseText('credentialResolver.action.edit'),
			value: RESOLVER_LIST_ITEM_ACTIONS.EDIT,
		},
		{
			label: i18n.baseText('credentialResolver.action.delete'),
			value: RESOLVER_LIST_ITEM_ACTIONS.DELETE,
		},
	];
});

function createResolver() {
	openCreateModal();
}

function editResolver(resolver: CredentialResolver) {
	openEditModal(resolver.id);
}

async function handleDeleteResolver(resolver: CredentialResolver) {
	const deleted = await deleteResolver(resolver);
	if (deleted) {
		void fetchResolvers();
	}
}

async function onAction(action: string, resolver: CredentialResolver) {
	switch (action) {
		case RESOLVER_LIST_ITEM_ACTIONS.EDIT:
			editResolver(resolver);
			break;
		case RESOLVER_LIST_ITEM_ACTIONS.DELETE:
			await handleDeleteResolver(resolver);
			break;
	}
}
</script>

<template>
	<div :class="$style.container">
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('credentialResolver.view.title') }}
				</N8nHeading>
				<N8nText v-if="resolvers.length" color="text-base" size="medium">
					{{ i18n.baseText('credentialResolver.view.description') }}
					{{ i18n.baseText('credentialResolver.view.learnMore') }}
					<N8nLink theme="text" :href="docsUrl" size="medium" new-window>
						<span :class="$style.link">
							{{ i18n.baseText('generic.documentation') }}
							<N8nIcon icon="arrow-up-right" />
						</span>
					</N8nLink>
				</N8nText>
			</div>
		</div>
		<N8nLoading2 v-if="isLoading && resolvers.length === 0" :rows="5" :shrink-last="false" />
		<div v-else-if="resolvers.length === 0">
			<N8nActionBox class="mt-2xl mb-l" description="yes">
				<template #description>
					<div :class="$style.iconCardContainer">
						<div :class="$style.iconCard"><N8nIcon icon="key-round" /></div>
						<div :class="$style.iconCard"><N8nIcon icon="split" /></div>
						<div :class="$style.iconCard"><N8nIcon icon="user" /></div>
					</div>
					<N8nHeading tag="h2" size="medium" align="center" class="mb-2xs">
						Resolve dynamic credentials from user identity
					</N8nHeading>
					<div>
						{{ i18n.baseText('credentialResolver.view.description') }}
					</div>
				</template>
				<template #additionalContent>
					<N8nButton
						variant="ghost"
						class="mr-2xs n8n-button--highlight"
						:href="docsUrl"
						target="_blank"
					>
						Learn more <N8nIcon icon="arrow-up-right" />
					</N8nButton>
					<N8nButton variant="solid" @click="createResolver">
						{{ i18n.baseText('credentialResolver.addNew') }}
					</N8nButton>
				</template>
			</N8nActionBox>
		</div>
		<div v-else>
			<div :class="$style.actionBar">
				<N8nButton variant="solid" class="ml-auto" icon="plus" @click="createResolver">
					{{ i18n.baseText('credentialResolver.addNew') }}
				</N8nButton>
			</div>
			<N8nCard
				v-for="resolver in resolvers"
				:key="resolver.id"
				class="mb-2xs"
				hoverable
				@click.stop="editResolver(resolver)"
			>
				<template #prepend>
					<N8nIcon icon="resolver" color="text-dark" :size="28" />
				</template>
				<template #header>
					<N8nText tag="h2" bold> {{ resolver.name }} </N8nText>
				</template>
				<div :class="$style.cardDescription">
					<N8nText color="text-light" size="small">
						{{
							resolverTypes.find(({ name }) => name === resolver.type)?.displayName || resolver.type
						}}
						|
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('credentialResolver.item.updated') }}
						<TimeAgo :date="resolver.updatedAt.toString()" /> |
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('credentialResolver.item.created') }}
						{{ dateformat(resolver.createdAt, getDateFormat(resolver.createdAt)) }}
					</N8nText>
				</div>
				<template #append>
					<N8nActionToggle :actions="actions" @action="onAction($event, resolver)" />
				</template>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="css" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}
.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.actionBar {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--sm);
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.iconCardContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: var(--spacing--lg);
}

.iconCard {
	width: 40px;
	height: 40px;
	border: 1px solid var(--color--neutral-100);
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--color--background--light-2);
	box-shadow: var(--shadow--dark);
	border-radius: var(--radius);

	&:nth-child(1) {
		transform: rotate(-8deg);
	}

	&:nth-child(2) {
		z-index: 1;
		margin-top: -5px;
	}

	&:nth-child(3) {
		transform: rotate(8deg);
	}
}

.link {
	text-transform: lowercase;
	display: inline-flex;
	align-items: center;
}
</style>
