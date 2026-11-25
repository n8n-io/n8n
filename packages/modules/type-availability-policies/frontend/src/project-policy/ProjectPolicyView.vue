<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import { useProjectPolicies } from '../composables/useProjectPolicies';
import { POLICIES_LANDING_VIEW } from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { entryRouteName } = usePolicyAdminAccess();
const { projects, load } = useProjectPolicies();

const project = computed(() =>
	projects.value?.find((candidate) => candidate.projectId === route.params.teamProjectId),
);

const title = computed(() =>
	project.value
		? i18n.baseText('typeAvailabilityPolicies.projectPolicy.title', {
				interpolate: { name: project.value.name },
			})
		: '',
);

watch(title, (value) => {
	if (value) documentTitle.set(value);
});

function onBack() {
	void router.push({ name: POLICIES_LANDING_VIEW });
}

onMounted(() => {
	// The route opens for either policy scope. A project policy covers both kinds.
	if (entryRouteName.value !== POLICIES_LANDING_VIEW) {
		void router.replace({ name: entryRouteName.value });
		return;
	}
	void load();
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.back')"
		:class="$style.layout"
		data-test-id="project-policy-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			v-if="project"
			:title="title"
			:description="i18n.baseText('typeAvailabilityPolicies.projectPolicy.description')"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

.layout {
	@include settings-subpage.layout;
}
</style>
