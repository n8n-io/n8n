<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTabs,
	N8nText,
	N8nTooltip,
	type TabOptions,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	HTTP_ACTION_EDIT_VIEW,
	HTTP_ACTION_VIEW,
	NODES_SETTINGS_INSTALLED_TAB,
} from '../next-nodes-instance.constants';
import { useNextNodesInstanceStore } from '../next-nodes-instance.store';

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const rbac = useRBACStore();
const store = useNextNodesInstanceStore();
const { actions } = storeToRefs(store);

const loading = ref(true);
const hiding = ref<string | undefined>();

const canCreate = computed(() => rbac.hasScope('nodeDefinition:create'));
const canHide = computed(() => rbac.hasScope('nodeDefinition:hide'));

// The same gate as the shell route of the Community nodes settings page.
const communityNodes = computed(() =>
	useSettingsStore().isCommunityNodesFeatureEnabled &&
	rbac.hasScope(['communityPackage:list', 'communityPackage:update'])
		? componentRegistry.get('community-nodes')
		: undefined,
);

const ACTIONS_TAB = 'actions';
const tabs = computed<Array<TabOptions<string>>>(() => [
	{ label: i18n.baseText('settings.nodes.tab.actions'), value: ACTIONS_TAB },
	{ label: i18n.baseText('settings.nodes.tab.installed'), value: NODES_SETTINGS_INSTALLED_TAB },
]);
// The URL keeps the tab, so a link can open "Installed".
const tab = computed({
	get: () =>
		communityNodes.value && route.query.tab === NODES_SETTINGS_INSTALLED_TAB
			? NODES_SETTINGS_INSTALLED_TAB
			: ACTIONS_TAB,
	set: (value: string) => {
		void router.replace({ query: { tab: value } });
	},
});

const dateOf = (iso: string) =>
	new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const newAction = async () => await router.push({ name: HTTP_ACTION_VIEW });
const editAction = async (actionId: string) =>
	await router.push({ name: HTTP_ACTION_EDIT_VIEW, params: { actionId } });

async function hide(actionId: string) {
	hiding.value = actionId;
	try {
		await store.hide(actionId);
		toast.showMessage({ title: i18n.baseText('settings.nodes.hide.success'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.error.hide'));
	} finally {
		hiding.value = undefined;
	}
}

onMounted(async () => {
	useDocumentTitle().set(i18n.baseText('settings.nodes'));
	try {
		await store.fetchVersions();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.error.load'));
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.nodes')"
			:description="i18n.baseText('settings.nodes.description')"
			:show-docs-link="false"
		>
		</N8nSettingsPageHeader>

		<N8nTabs v-if="communityNodes" v-model="tab" :options="tabs" data-test-id="nodes-tabs" />

		<component
			:is="communityNodes"
			v-if="communityNodes && tab === NODES_SETTINGS_INSTALLED_TAB"
			embedded
		/>

		<N8nEmptyState
			v-else-if="!loading && !actions.length"
			:icon="{ type: 'icon', value: 'box' }"
			:heading="i18n.baseText('settings.nodes.empty.heading')"
			:description="i18n.baseText('settings.nodes.empty.description')"
			:button-text="canCreate ? i18n.baseText('settings.nodes.newAction') : undefined"
			button-icon="plus"
			@click:button="newAction"
		/>

		<N8nSettingsSection v-else-if="actions.length">
			<template #title>
				<div :class="$style.sectionTitle">
					<N8nHeading tag="h2" step="md" color="text-dark">
						{{ i18n.baseText('settings.nodes.section.actions') }}
					</N8nHeading>
					<N8nButton v-if="canCreate" data-test-id="nodes-new-action" @click="newAction">
						<template #icon><N8nIcon icon="plus" /></template>
						{{ i18n.baseText('settings.nodes.newAction') }}
					</N8nButton>
				</div>
			</template>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="{ actionId, newest, versions } in actions"
					:key="actionId"
					:title="newest.displayName"
					:description="newest.summary"
					expandable
					:expand-label="i18n.baseText('settings.nodes.versions')"
					:data-test-id="`nodes-action-${actionId}`"
				>
					<template #info>
						<div :class="$style.info">
							<N8nText bold size="medium" color="text-dark">{{ newest.displayName }}</N8nText>
							<N8nText size="small" color="text-light">{{ newest.summary }}</N8nText>
							<N8nText v-if="newest.publishedBy" size="small" color="text-light">
								{{ i18n.baseText('settings.nodes.publishedBy') }}
								<N8nLink
									:to="`mailto:${newest.publishedBy.email}`"
									size="small"
									theme="text"
									underline
									:data-test-id="`nodes-published-by-${actionId}`"
								>
									{{ newest.publishedBy.name }}
								</N8nLink>
							</N8nText>
						</div>
					</template>
					<template #action>
						<div :class="$style.actions">
							<N8nBadge :variant="newest.status === 'hidden' ? 'subtle' : 'success'">
								{{ i18n.baseText(`settings.nodes.status.${newest.status}`) }}
							</N8nBadge>
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText('settings.nodes.version', {
										interpolate: { version: newest.semver },
									})
								}}
							</N8nText>
							<N8nButton
								v-if="canCreate"
								variant="ghost"
								:data-test-id="`nodes-edit-${actionId}`"
								@click="editAction(actionId)"
							>
								<template #icon><N8nIcon icon="pencil" /></template>
								{{ i18n.baseText('settings.nodes.edit') }}
							</N8nButton>
							<N8nTooltip
								v-if="canHide && newest.status === 'published'"
								:content="i18n.baseText('settings.nodes.hide.tooltip')"
							>
								<N8nButton
									variant="ghost"
									:loading="hiding === actionId"
									:data-test-id="`nodes-hide-${actionId}`"
									@click="hide(actionId)"
								>
									<template #icon><N8nIcon icon="eye-off" /></template>
									{{ i18n.baseText('settings.nodes.hide') }}
								</N8nButton>
							</N8nTooltip>
						</div>
					</template>
					<template #expanded>
						<ul :class="$style.versions">
							<li v-for="version in versions" :key="version.semver">
								<N8nText size="small">
									{{
										i18n.baseText('settings.nodes.version', {
											interpolate: { version: version.semver },
										})
									}}
								</N8nText>
								<N8nText size="small" color="text-light">{{ dateOf(version.createdAt) }}</N8nText>
								<N8nLink
									v-if="version.publishedBy"
									:to="`mailto:${version.publishedBy.email}`"
									size="small"
								>
									{{ version.publishedBy.name }}
								</N8nLink>
								<N8nText
									v-if="version !== versions[versions.length - 1]"
									size="small"
									color="text-base"
									:class="$style.changes"
									:data-test-id="`nodes-version-changes-${version.semver}`"
								>
									{{
										version.changes.length
											? version.changes.join('; ')
											: i18n.baseText('settings.nodes.version.noContractChange')
									}}
								</N8nText>
							</li>
						</ul>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.changes {
	flex-basis: 100%;
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.sectionTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.versions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--sm);
	list-style: none;

	li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing--xs);
	}
}
</style>
