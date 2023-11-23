<template>
	<div class="grid">
		<div class="gridContent">
			<div class="goBack">
				<GoBackButton />
			</div>

			<n8n-heading v-if="isReady" class="title" tag="h1" size="2xlarge"
				>{{ $locale.baseText('templateSetup.title', { interpolate: { name: title } }) }}
			</n8n-heading>
			<n8n-loading v-else variant="h1" />

			<div class="notice">
				<AppsRequiringCredsNotice v-if="isReady" />
				<n8n-loading v-else variant="p" />
			</div>

			<div>
				<ol v-if="isReady">
					<SetupTemplateFormStep
						class="appCredential appCredentialBorder"
						v-bind:key="credentials.credentialName"
						v-for="(credentials, index) in setupTemplateStore.credentialUsages"
						:order="index + 1"
						:credentials="credentials"
						:credentialName="credentials.credentialName"
					/>
				</ol>
				<div v-else>
					<n8n-loading class="appCredential appCredentialBorder" variant="p" :rows="3" />
					<n8n-loading class="appCredential appCredentialBorder" variant="p" :rows="3" />
				</div>
			</div>

			<div class="actions">
				<n8n-link :href="skipSetupUrl" :newWindow="false" @click="onSkipSetup($event)">{{
					$locale.baseText('templateSetup.skip')
				}}</n8n-link>

				<n8n-tooltip
					v-if="isReady"
					:content="buttonTooltip"
					:disabled="setupTemplateStore.numCredentialsLeft === 0"
				>
					<n8n-button
						:label="$locale.baseText('templateSetup.continue.button')"
						:disabled="setupTemplateStore.numCredentialsLeft > 0 || setupTemplateStore.isSaving"
						@click="setupTemplateStore.createWorkflow($router)"
					/>
				</n8n-tooltip>
				<div v-else>
					<n8n-loading variant="button" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import GoBackButton from '@/components/GoBackButton.vue';
import N8nHeading from 'n8n-design-system/components/N8nHeading';
import N8nLink from 'n8n-design-system/components/N8nLink';
import { useSetupTemplateStore } from './setupTemplate.store';
import AppsRequiringCredsNotice from './AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from './SetupTemplateFormStep.vue';
import { externalHooks } from '@/mixins/externalHooks';
import { VIEWS } from '@/constants';

export default defineComponent({
	name: 'SetupWorkflowFromTemplateView',
	mixins: [externalHooks],
	components: {
		GoBackButton,
		N8nHeading,
		N8nLink,
		AppsRequiringCredsNotice,
		SetupTemplateFormStep,
	},
	computed: {
		...mapStores(useSetupTemplateStore),
		templateId() {
			return Array.isArray(this.$route.params.id)
				? this.$route.params.id[0]
				: this.$route.params.id;
		},
		title() {
			return this.setupTemplateStore.template?.name ?? 'unknown';
		},
		isReady() {
			return !this.setupTemplateStore.isLoading;
		},
		skipSetupUrl() {
			const route = this.$router.resolve({
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: this.templateId },
			});

			return route.fullPath;
		},
		buttonTooltip() {
			const numLeft = this.setupTemplateStore.numCredentialsLeft;

			return this.$locale.baseText('templateSetup.continue.tooltip', {
				adjustToNumber: numLeft,
				interpolate: { numLeft: numLeft.toString() },
			});
		},
	},
	watch: {
		templateId(newTemplateId) {
			this.setupTemplateStore.setTemplateId(newTemplateId);
			void this.setupTemplateStore.loadTemplateIfNeeded();
		},
	},
	methods: {
		async onSkipSetup(event: MouseEvent) {
			event.preventDefault();

			await this.setupTemplateStore.skipSetup({
				$externalHooks: this.$externalHooks(),
				$telemetry: this.$telemetry,
				$router: this.$router,
			});
		},
		async skipIfTemplateHasNoCreds() {
			const isTemplateLoaded = !!this.setupTemplateStore.template;
			if (!isTemplateLoaded) {
				return;
			}

			if (this.setupTemplateStore.credentialUsages.length === 0) {
				await this.setupTemplateStore.skipSetup({
					$externalHooks: this.$externalHooks(),
					$telemetry: this.$telemetry,
					$router: this.$router,
				});
			}
		},
	},
	async created() {
		this.setupTemplateStore.setTemplateId(this.templateId);
	},
	async mounted() {
		await this.setupTemplateStore.init();
		await this.skipIfTemplateHasNoCreds();
	},
});
</script>

<style lang="scss" scoped>
.grid {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	padding: var(--spacing-l) var(--spacing-l) 0;
	justify-content: center;
}

.gridContent {
	grid-column: 4 / span 6;

	@media (max-width: 800px) {
		grid-column: 3 / span 8;
	}

	@media (max-width: 640px) {
		grid-column: 2 / span 10;
	}
}

.goBack {
	margin-bottom: var(--spacing-2xs);
}

.notice {
	margin-bottom: var(--spacing-2xl);
}

.appCredential:not(:last-of-type) {
	padding-bottom: var(--spacing-2xl);
	margin-bottom: var(--spacing-2xl);
}

.appCredentialBorder:not(:last-of-type) {
	border-bottom: 1px solid var(--prim-gray-540);
}

.title {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing-2xl);
}

.actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 4rem;
	margin-bottom: 4rem;
}
</style>
