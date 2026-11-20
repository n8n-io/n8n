<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
	N8nIcon,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useInstancePolicyCounts } from './useInstancePolicyCounts';
import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import {
	INSTANCE_POLICY_DOCS_URL,
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
} from '../type-availability-policies.constants';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { entryRouteName } = usePolicyAdminAccess();
const { counts, load: loadCounts } = useInstancePolicyCounts();

const countsText = computed(() => {
	if (!counts.value) return null;
	const { node, credential } = counts.value;
	return [
		i18n.baseText('typeAvailabilityPolicies.landing.nodeCount', {
			adjustToNumber: node.total,
			interpolate: { restricted: node.restricted, total: node.total },
		}),
		i18n.baseText('typeAvailabilityPolicies.landing.credentialCount', {
			adjustToNumber: credential.total,
			interpolate: { restricted: credential.restricted, total: credential.total },
		}),
	].join(' · ');
});

function onBack() {
	void router.push({ name: VIEWS.SECURITY_SETTINGS });
}

function openInstancePolicy() {
	void router.push({ name: INSTANCE_POLICY_VIEW });
}

onMounted(() => {
	// The Policies row skips this page for some users, and a direct link must skip it too.
	if (entryRouteName.value !== POLICIES_LANDING_VIEW) {
		void router.replace({ name: entryRouteName.value });
		return;
	}
	documentTitle.set(i18n.baseText('typeAvailabilityPolicies.landing.title'));
	void loadCounts();
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('typeAvailabilityPolicies.backToPolicies')"
		:class="$style.layout"
		data-test-id="policies-landing-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('typeAvailabilityPolicies.landing.title')"
			:description="i18n.baseText('typeAvailabilityPolicies.landing.description')"
			:docs-url="INSTANCE_POLICY_DOCS_URL"
		/>
		<N8nSettingsSection
			:title="i18n.baseText('typeAvailabilityPolicies.landing.global')"
			data-test-id="policies-landing-global-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					clickable
					data-test-id="policies-landing-instance-row"
					data-attr="policies-landing-instance-row"
					@click="openInstancePolicy"
				>
					<template #visual>
						<N8nIcon icon="globe" color="text-dark" />
					</template>
					<template #info>
						<N8nText bold size="medium" color="text-dark">
							{{ i18n.baseText('typeAvailabilityPolicies.instancePolicy.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('typeAvailabilityPolicies.instancePolicy.description') }}
						</N8nText>
						<N8nText
							v-if="countsText"
							size="xsmall"
							color="text-light"
							data-test-id="policies-landing-instance-counts"
						>
							{{ countsText }}
						</N8nText>
					</template>
					<template #action>
						<N8nSettingsRowConfigure :value="i18n.baseText('generic.configure')" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

.layout {
	@include settings-subpage.layout;
}
</style>
