<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';
import { useUIStore } from '@/stores/ui.store';

import { N8nActionBox } from '@n8n/design-system';
const i18n = useI18n();
const uiStore = useUIStore();

const goToUpgrade = async () => {
	uiStore.openModalWithData({
		name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		data: {
			customHeading: undefined,
		},
	});
};
</script>

<template>
	<N8nActionBox
		data-test-id="evaluations-unlicensed"
		:heading="i18n.baseText('evaluations.paywall.title')"
		:description="i18n.baseText('evaluations.paywall.description')"
		:button-text="i18n.baseText('evaluations.paywall.cta')"
		@click="goToUpgrade"
	></N8nActionBox>
</template>
