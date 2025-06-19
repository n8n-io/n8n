<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSetupTemplateStore } from './setupTemplate.store';
import N8nHeading from '@n8n/design-system/components/N8nHeading';
import N8nLink from '@n8n/design-system/components/N8nLink';
import AppsRequiringCredsNotice from './AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from './SetupTemplateFormStep.vue';
import TemplatesView from '../TemplatesView.vue';
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';

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
			<n8n-loading v-else variant="h1" />
		</template>

		<template #content>
			<div :class="$style.grid">
				<div :class="$style.notice" data-test-id="info-callout">
					<AppsRequiringCredsNotice
						v-if="isReady"
						:app-credentials="setupTemplateStore.appCredentials"
					/>
					<n8n-loading v-else variant="p" />
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
						<n8n-loading :class="$style.appCredential" variant="p" :rows="3" />
						<n8n-loading :class="$style.appCredential" variant="p" :rows="3" />
					</div>
				</div>

				<div :class="$style.actions">
					<N8nLink :href="skipSetupUrl" :new-window="false" @click="onSkipSetup($event)">{{
						i18n.baseText('templateSetup.skip')
					}}</N8nLink>

					<n8n-tooltip
						v-if="isReady"
						:content="i18n.baseText('templateSetup.continue.button.fillRemaining')"
						:disabled="setupTemplateStore.numFilledCredentials > 0"
					>
						<n8n-button
							size="large"
							:label="i18n.baseText('templateSetup.continue.button')"
							:disabled="
								setupTemplateStore.isSaving || setupTemplateStore.numFilledCredentials === 0
							"
							data-test-id="continue-button"
							@click="setupTemplateStore.createWorkflow({ router })"
						/>
					</n8n-tooltip>
					<div v-else>
						<n8n-loading variant="button" />
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
	margin-bottom: var(--spacing-2xl);
}

.appCredentialsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xl);
}

.appCredential:not(:last-of-type) {
	padding-bottom: var(--spacing-2xl);
	border-bottom: 1px solid var(--color-foreground-light);
}

.actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: var(--spacing-3xl);
	margin-bottom: var(--spacing-3xl);
}
</style>
