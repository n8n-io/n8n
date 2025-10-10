<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSetupTemplateStore } from '../setupTemplate.store';
import AppsRequiringCredsNotice from '../components/AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from '../components/SetupTemplateFormStep.vue';
import TemplatesView from '@/features/templates/views/TemplatesView.vue';
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nHeading, N8nLink, N8nLoading, N8nTooltip } from '@n8n/design-system';
// Store
const setupTemplateStore = useSetupTemplateStore();
const i18n = useI18n();

// Router
const route = useRoute();
const router = useRouter();

//#region Computed

const templateId = computed(() =>
	Array.isArray(route.params.id) ? route.params.id[0] : route.params.id,
);
const title = computed(() => setupTemplateStore.template?.name ?? 'unknown');
const isReady = computed(() => !setupTemplateStore.isLoading);

const skipSetupUrl = computed(() => {
	const resolvedRoute = router.resolve({
		name: VIEWS.TEMPLATE_IMPORT,
		params: { id: templateId.value },
	});
	return resolvedRoute.fullPath;
});

//#endregion Computed

//#region Watchers

watch(templateId, async (newTemplateId) => {
	setupTemplateStore.setTemplateId(newTemplateId);
	await setupTemplateStore.loadTemplateIfNeeded();
});

//#endregion Watchers

//#region Methods

const onSkipSetup = async (event: MouseEvent) => {
	event.preventDefault();

	await setupTemplateStore.skipSetup({
		router,
	});
};

const skipIfTemplateHasNoCreds = async () => {
	const isTemplateLoaded = !!setupTemplateStore.template;
	if (!isTemplateLoaded) {
		return false;
	}

	if (setupTemplateStore.credentialUsages.length === 0) {
		await setupTemplateStore.skipSetup({
			router,
		});
		return true;
	}

	return false;
};

//#endregion Methods

//#region Lifecycle hooks

setupTemplateStore.setTemplateId(templateId.value);

onMounted(async () => {
	await setupTemplateStore.init();
	await skipIfTemplateHasNoCreds();
});

//#endregion Lifecycle hooks
</script>

<template>
	<TemplatesView :go-back-enabled="true">
		<template #header>
			<N8nHeading v-if="isReady" tag="h1" size="2xlarge"
				>{{ i18n.baseText('templateSetup.title', { interpolate: { name: title } }) }}
			</N8nHeading>
			<N8nLoading v-else variant="h1" />
		</template>

		<template #content>
			<div :class="$style.grid">
				<div :class="$style.notice" data-test-id="info-callout">
					<AppsRequiringCredsNotice
						v-if="isReady"
						:app-credentials="setupTemplateStore.appCredentials"
					/>
					<N8nLoading v-else variant="p" />
				</div>

				<div>
					<ol v-if="isReady" :class="$style.appCredentialsContainer">
						<SetupTemplateFormStep
							v-for="(credentials, index) in setupTemplateStore.credentialUsages"
							:key="credentials.key"
							:class="$style.appCredential"
							:order="index + 1"
							:credentials="credentials"
							:selected-credential-id="
								setupTemplateStore.selectedCredentialIdByKey[credentials.key]
							"
							@credential-selected="
								setupTemplateStore.setSelectedCredentialId(
									$event.credentialUsageKey,
									$event.credentialId,
								)
							"
							@credential-deselected="
								setupTemplateStore.unsetSelectedCredential($event.credentialUsageKey)
							"
						/>
					</ol>
					<div v-else :class="$style.appCredentialsContainer">
						<N8nLoading :class="$style.appCredential" variant="p" :rows="3" />
						<N8nLoading :class="$style.appCredential" variant="p" :rows="3" />
					</div>
				</div>

				<div :class="$style.actions">
					<N8nLink :href="skipSetupUrl" :new-window="false" @click="onSkipSetup($event)">{{
						i18n.baseText('templateSetup.skip')
					}}</N8nLink>

					<N8nTooltip
						v-if="isReady"
						:content="i18n.baseText('templateSetup.continue.button.fillRemaining')"
						:disabled="setupTemplateStore.numFilledCredentials > 0"
					>
						<N8nButton
							size="large"
							:label="i18n.baseText('templateSetup.continue.button')"
							:disabled="
								setupTemplateStore.isSaving || setupTemplateStore.numFilledCredentials === 0
							"
							data-test-id="continue-button"
							@click="setupTemplateStore.createWorkflow({ router })"
						/>
					</N8nTooltip>
					<div v-else>
						<N8nLoading variant="button" />
					</div>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<style lang="scss" module>
.grid {
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	justify-content: center;
	max-width: 768px;
}

.notice {
	margin-bottom: var(--spacing--2xl);
}

.appCredentialsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
}

.appCredential:not(:last-of-type) {
	padding-bottom: var(--spacing--2xl);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: var(--spacing--3xl);
	margin-bottom: var(--spacing--3xl);
}
</style>
