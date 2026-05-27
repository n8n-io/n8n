<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import N8nStepper from '@n8n/design-system/components/N8nStepper/Stepper.vue';
import AgentChannelSlackSetupSnapshots from './AgentChannelSlackSetupSnapshots.vue';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		connected?: boolean;
		disabled?: boolean;
		setupSlackApp?: (appConfigurationToken: string) => Promise<boolean>;
	}>(),
	{
		connected: false,
		disabled: false,
		setupSlackApp: undefined,
	},
);

const i18n = useI18n();

const appConfigurationToken = shallowRef('');
const showAppConfigurationToken = shallowRef(false);
const setupLoading = shallowRef(false);
const setupError = shallowRef(false);

const steps = computed(() => [
	{
		id: 'create-token',
		title: i18n.baseText('agents.channels.slack.setup.createToken.title'),
		description: i18n.baseText('agents.channels.slack.setup.createToken.description'),
	},
	{
		id: 'copy-access-token',
		title: i18n.baseText('agents.channels.slack.setup.copyAccessToken.title'),
		description: i18n.baseText('agents.channels.slack.setup.copyAccessToken.description'),
	},
	{
		id: 'install-app',
		title: i18n.baseText('agents.channels.slack.setup.installApp.title'),
		description: i18n.baseText('agents.channels.slack.setup.installApp.description'),
	},
]);

const canInstallApp = computed(
	() =>
		appConfigurationToken.value.trim().length > 0 &&
		!props.disabled &&
		!setupLoading.value &&
		!props.connected &&
		props.setupSlackApp !== undefined,
);

const appConfigurationTokenInputType = computed(() =>
	showAppConfigurationToken.value ? 'text' : 'password',
);

const appConfigurationTokenVisibilityLabel = computed(() =>
	i18n.baseText(
		showAppConfigurationToken.value
			? 'agents.channels.slack.setup.copyAccessToken.hideToken'
			: 'agents.channels.slack.setup.copyAccessToken.showToken',
	),
);

async function installSlackApp() {
	const token = appConfigurationToken.value.trim();
	if (!token || !props.setupSlackApp || props.disabled || props.connected) return;

	setupLoading.value = true;
	setupError.value = false;
	try {
		const completed = await props.setupSlackApp(token);
		if (completed) {
			appConfigurationToken.value = '';
		}
	} catch {
		setupError.value = true;
	} finally {
		setupLoading.value = false;
	}
}
</script>

<template>
	<div :class="$style.slackSetup">
		<N8nStepper :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'create-token'" :class="$style.createTokenContainer">
						<N8nButton
							href="https://api.slack.com/apps"
							target="_blank"
							variant="subtle"
							size="medium"
							icon="slack"
							data-testid="slack-app-configuration-token-link"
						>
							{{ i18n.baseText('agents.channels.slack.setup.createToken.link') }}
						</N8nButton>
						<AgentChannelSlackSetupSnapshots />
					</div>

					<N8nInput
						v-else-if="step.id === 'copy-access-token'"
						v-model="appConfigurationToken"
						:type="appConfigurationTokenInputType"
						size="large"
						:placeholder="i18n.baseText('agents.channels.slack.setup.copyAccessToken.placeholder')"
						data-testid="slack-app-configuration-token"
						:disabled="disabled || setupLoading"
						@keydown.enter.prevent="installSlackApp"
					>
						<template #suffix>
							<button
								type="button"
								:class="$style.tokenVisibilityButton"
								:aria-label="appConfigurationTokenVisibilityLabel"
								:disabled="disabled || setupLoading"
								data-testid="slack-app-configuration-token-visibility"
								@click.stop="showAppConfigurationToken = !showAppConfigurationToken"
							>
								<N8nIcon :icon="showAppConfigurationToken ? 'eye-off' : 'eye'" size="small" />
							</button>
						</template>
					</N8nInput>

					<template v-else-if="step.id === 'install-app'">
						<N8nButton
							variant="subtle"
							size="medium"
							:loading="setupLoading"
							:disabled="!canInstallApp"
							data-testid="slack-create-app"
							@click="installSlackApp"
						>
							{{ i18n.baseText('agents.channels.slack.setup.installApp.button') }}
						</N8nButton>
						<N8nText
							v-if="setupError"
							:class="$style.setupError"
							size="small"
							data-testid="slack-app-setup-error"
						>
							{{ i18n.baseText('agents.channels.slack.setup.installApp.error') }}
						</N8nText>
					</template>
				</div>
			</template>
		</N8nStepper>
	</div>
</template>

<style module lang="scss">
.slackSetup {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.stepContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--xs);
}

.setupError {
	color: var(--color--danger);
}

.tokenVisibilityButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover:not(:disabled) {
		color: var(--color--text);
	}

	&:disabled {
		cursor: not-allowed;
		color: var(--color--text--tint-3);
	}
}

.createTokenContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
