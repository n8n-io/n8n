<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import { useProjectPolicies } from '../composables/useProjectPolicies';
import {
	deleteProjectPolicy,
	fetchProjectPolicyVersions,
	type ProjectPolicyVersions,
} from '../type-availability-policies.api';
import { POLICIES_LANDING_VIEW } from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const { entryRouteName } = usePolicyAdminAccess();
const { projects, load } = useProjectPolicies();

const projectId = computed(() => String(route.params.teamProjectId));

const project = computed(() =>
	projects.value?.find((candidate) => candidate.projectId === projectId.value),
);

/** The versions that a delete sends. `null` until a read succeeds, which keeps the delete off. */
const versions = shallowRef<ProjectPolicyVersions | null>(null);
const deleting = ref(false);

const title = computed(() =>
	project.value
		? i18n.baseText('typeAvailabilityPolicies.projectPolicy.title', {
				interpolate: { name: project.value.name },
			})
		: '',
);

const pageActions = computed(() => {
	const hasPolicy = project.value?.hasPolicy === true;
	return [
		{
			label: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.action'),
			value: 'delete' as const,
			destructive: true,
			disabled: !hasPolicy || !versions.value || deleting.value,
			tooltip: hasPolicy
				? undefined
				: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.noPolicy'),
		},
	];
});

watch(title, (value) => {
	if (value) documentTitle.set(value);
});

async function loadVersions() {
	try {
		versions.value = await fetchProjectPolicyVersions(rootStore.restApiContext, projectId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('typeAvailabilityPolicies.projectPolicy.loadError'));
	}
}

function openLandingPage() {
	void router.push({ name: POLICIES_LANDING_VIEW });
}

/** An admin who left the page while the delete ran stays where they went. */
function isStillOn(deletedProjectId: string) {
	return projectId.value === deletedProjectId;
}

async function onDeletePolicy() {
	const current = project.value;
	const readVersions = versions.value;
	if (!current || !readVersions) return;

	const answer = await message.confirm(
		i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.confirm.message'),
		i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.confirm.title', {
			interpolate: { name: current.name },
		}),
		{
			confirmButtonText: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.action'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (answer !== 'confirm') return;

	deleting.value = true;
	try {
		await deleteProjectPolicy(rootStore.restApiContext, current.projectId, readVersions);
	} catch (error) {
		onDeleteError(error, current.projectId);
		return;
	} finally {
		deleting.value = false;
	}

	toast.showMessage({
		type: 'success',
		title: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.success.title', {
			interpolate: { name: current.name },
		}),
		message: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.success.message'),
	});
	if (isStillOn(current.projectId)) openLandingPage();
}

function onDeleteError(error: unknown, deletedProjectId: string) {
	const status = error instanceof ResponseError ? error.httpStatusCode : undefined;

	if (status === 409) {
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.changed.title'),
			message: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.changed.message'),
		});
		if (!isStillOn(deletedProjectId)) return;
		versions.value = null;
		void load();
		void loadVersions();
		return;
	}

	if (status === 404) {
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.notFound.title'),
			message: i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.notFound.message'),
		});
		if (isStillOn(deletedProjectId)) openLandingPage();
		return;
	}

	toast.showError(error, i18n.baseText('typeAvailabilityPolicies.projectPolicy.delete.error'));
}

onMounted(() => {
	// The route opens for either policy scope. A project policy covers both kinds.
	if (entryRouteName.value !== POLICIES_LANDING_VIEW) {
		void router.replace({ name: entryRouteName.value });
		return;
	}
	void load();
	void loadVersions();
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.back')"
		:class="$style.layout"
		data-test-id="project-policy-view"
		@back="openLandingPage"
	>
		<N8nSettingsPageHeader
			v-if="project"
			:title="title"
			:description="i18n.baseText('typeAvailabilityPolicies.projectPolicy.description')"
		>
			<template #titleTrailing>
				<N8nActionToggle
					:class="$style.pageMenu"
					:actions="pageActions"
					:aria-label="i18n.baseText('typeAvailabilityPolicies.projectPolicy.menu')"
					data-test-id="project-policy-menu"
					@action="onDeletePolicy"
				/>
			</template>
		</N8nSettingsPageHeader>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

.layout {
	@include settings-subpage.layout;
}

.pageMenu {
	margin-left: auto;
}
</style>
