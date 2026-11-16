<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { N8nSegmentControl, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import {
	POLICY_TAB_LABEL_KEY,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { manageableKinds } = usePolicyAdminAccess();

const tabOptions = computed(() =>
	manageableKinds.value.map((kind) => ({
		value: kind,
		label: i18n.baseText(POLICY_TAB_LABEL_KEY[kind]),
	})),
);

// The tab lives in the query so that a link can open the Credential types tab directly.
const activeTab = computed<RestrictedTypeKind | undefined>({
	get: () => {
		const requested = route.query.tab;
		return manageableKinds.value.find((kind) => kind === requested) ?? manageableKinds.value[0];
	},
	set: (tab) => {
		void router.replace({ query: { ...route.query, tab } });
	},
});

function onBack() {
	void router.push({ name: VIEWS.SECURITY_SETTINGS });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('typeAvailabilityPolicies.instancePolicy.title'));
});
</script>

<template>
	<N8nSettingsLayout
		full-width
		show-back
		:back-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.back')"
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
		<div
			v-if="activeTab"
			:key="activeTab"
			:class="$style.tableArea"
			:data-test-id="`instance-policy-${activeTab}-table`"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}

/* Pin the back action to the top-left of the settings area (the shell's
   content container is position: relative), independent of the centered column. */
.layout > div:first-child {
	position: absolute;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	width: auto;
}

.tableArea {
	margin-top: var(--spacing--sm);
}
</style>
