<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nSegmentControl, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { createReusableTemplate } from '@vueuse/core';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import CredentialTypesTab from './CredentialTypesTab.vue';
import NodeTypesTab from './NodeTypesTab.vue';
import { useInstancePolicy } from './useInstancePolicy';
import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import {
	INSTANCE_POLICY_DOCS_URL,
	POLICIES_LANDING_VIEW,
	POLICY_TAB_LABEL_KEY,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { manageableKinds, entryRouteName } = usePolicyAdminAccess();
const instancePolicy = useInstancePolicy();
// The tabs sit in the table's toolbar, so a tab with a table renders them there.
const [DefineTabs, ReuseTabs] = createReusableTemplate();

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
	void instancePolicy.load();
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
			:docs-url="INSTANCE_POLICY_DOCS_URL"
		/>
		<DefineTabs>
			<N8nSegmentControl
				v-model="activeTab"
				:options="tabOptions"
				size="xlarge"
				data-test-id="instance-policy-tabs"
			/>
		</DefineTabs>
		<CredentialTypesTab v-if="activeTab === 'credential'">
			<template #toolbar-start>
				<ReuseTabs />
			</template>
		</CredentialTypesTab>
		<NodeTypesTab v-else-if="activeTab === 'node'">
			<template #toolbar-start>
				<ReuseTabs />
			</template>
		</NodeTypesTab>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

/* Doubled to win over the layout's own rules: the policy table needs the full page width, and the
   design keeps the tabs close to the header. */
.layout.layout {
	--settings-content--max-width: none;

	:global(header) + * {
		margin-block-start: var(--spacing--lg);
	}
}

.layout {
	@include settings-subpage.layout;
}
</style>
