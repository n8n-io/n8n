<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nSegmentControl, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import {
	POLICIES_LANDING_VIEW,
	POLICY_TAB_LABEL_KEY,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { manageableKinds, entryRouteName } = usePolicyAdminAccess();

const tabOptions = computed(() =>
	manageableKinds.value.map((kind) => ({
		value: kind,
		label: i18n.baseText(POLICY_TAB_LABEL_KEY[kind]),
	})),
);

// The tab lives in the query so that a link can open the Credentials tab directly.
const activeTab = computed<RestrictedTypeKind | undefined>({
	get: () => {
		const requested = route.query.tab;
		return manageableKinds.value.find((kind) => kind === requested) ?? manageableKinds.value[0];
	},
	set: (tab) => {
		void router.replace({ query: { ...route.query, tab } });
	},
});

// A user who skips the landing page on the way in goes back to Policies.
const back = computed(() =>
	entryRouteName.value === POLICIES_LANDING_VIEW
		? {
				name: POLICIES_LANDING_VIEW,
				label: i18n.baseText('typeAvailabilityPolicies.instancePolicy.back'),
			}
		: {
				name: VIEWS.SECURITY_SETTINGS,
				label: i18n.baseText('typeAvailabilityPolicies.backToPolicies'),
			},
);

function onBack() {
	void router.push({ name: back.value.name });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('typeAvailabilityPolicies.instancePolicy.title'));
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="back.label"
		:class="$style.layout"
		data-test-id="instance-policy-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('typeAvailabilityPolicies.instancePolicy.title')"
			:description="i18n.baseText('typeAvailabilityPolicies.instancePolicy.description')"
			:show-docs-link="false"
		/>
		<N8nSegmentControl
			v-if="activeTab"
			v-model="activeTab"
			:options="tabOptions"
			data-test-id="instance-policy-tabs"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

.layout {
	@include settings-subpage.layout;
}
</style>
