<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import N8nStepper from '@n8n/design-system/components/N8nStepper/Stepper.vue';
import AgentChannelSlackSetupSnapshots from './AgentChannelSlackSetupSnapshots.vue';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		connected?: boolean;
		disabled?: boolean;
		mode?: 'setup' | 'edit';
		setupSlackApp?: (appConfigurationToken: string) => Promise<boolean>;
		disconnectSlackApp?: () => Promise<void>;
	}>(),
	{
		connected: false,
		disabled: false,
		mode: 'setup',
		setupSlackApp: undefined,
		disconnectSlackApp: undefined,
	},
);

const i18n = useI18n();

const appConfigurationToken = shallowRef('');
const showAppConfigurationToken = shallowRef(false);
const setupLoading = shallowRef(false);
const disconnectLoading = shallowRef(false);
const setupError = shallowRef<'invalidToken' | 'generic' | null>(null);

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

const visibleTokenPlaceholder = '••••••••••••••••';

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

function isInvalidSlackTokenError(error: unknown) {
	return error instanceof Error && error.message.includes('invalid_auth');
}

async function installSlackApp() {
	const token = appConfigurationToken.value.trim();
	if (!token || !props.setupSlackApp || props.disabled || props.connected) return;

	setupLoading.value = true;
	setupError.value = null;
	try {
		const completed = await props.setupSlackApp(token);
		if (completed) {
			appConfigurationToken.value = '';
		}
	} catch (error) {
		setupError.value = isInvalidSlackTokenError(error) ? 'invalidToken' : 'generic';
	} finally {
		setupLoading.value = false;
	}
}

async function disconnectSlackApp() {
	if (!props.disconnectSlackApp || props.disabled || disconnectLoading.value) return;

	disconnectLoading.value = true;
	try {
		await props.disconnectSlackApp();
	} finally {
		disconnectLoading.value = false;
	}
}
</script>

<template>
	<div :class="$style.slackSetup">
		<div v-if="mode === 'edit'" :class="$style.editTokenContainer">
			<div :class="$style.tokenField">
				<label for="slack-app-configuration-token" :class="$style.tokenLabel">
					<N8nText bold size="medium">
						{{ i18n.baseText('agents.channels.slack.setup.copyAccessToken.label') }}
					</N8nText>
				</label>
				<N8nInput
					id="slack-app-configuration-token"
					:model-value="visibleTokenPlaceholder"
					type="password"
					size="large"
					readonly
					data-testid="slack-app-configuration-token"
				/>
			</div>
			<N8nButton
				variant="destructive"
				size="medium"
				:loading="disconnectLoading"
				:disabled="disabled || disconnectLoading"
				data-testid="slack-disconnect-app"
				@click="disconnectSlackApp"
			>
				{{ i18n.baseText('generic.disconnect') }}
			</N8nButton>
		</div>
		<N8nStepper v-else :steps="steps">
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

					<div v-else-if="step.id === 'copy-access-token'" :class="$style.tokenInputContainer">
						<N8nInput
							v-model="appConfigurationToken"
							:type="appConfigurationTokenInputType"
							size="large"
							:placeholder="
								i18n.baseText('agents.channels.slack.setup.copyAccessToken.placeholder')
							"
							data-testid="slack-app-configuration-token"
							:disabled="disabled || setupLoading"
							@keydown.enter.prevent="installSlackApp"
						>
							<template #suffix>
								<N8nIconButton
									variant="ghost"
									size="small"
									:icon="showAppConfigurationToken ? 'eye-off' : 'eye'"
									:class="$style.tokenVisibilityButton"
									:aria-label="appConfigurationTokenVisibilityLabel"
									:disabled="disabled || setupLoading"
									data-testid="slack-app-configuration-token-visibility"
									@click.stop="showAppConfigurationToken = !showAppConfigurationToken"
								/>
							</template>
						</N8nInput>
						<div :class="$style.setupDescriptionContainer">
							<N8nText
								:class="setupError === 'invalidToken' ? $style.setupError : $style.setupDescription"
								size="small"
								data-testid="slack-app-configuration-token-description"
							>
								{{
									i18n.baseText(
										setupError === 'invalidToken'
											? 'agents.channels.slack.setup.copyAccessToken.invalidToken'
											: 'agents.channels.slack.setup.copyAccessToken.hint',
									)
								}}
							</N8nText>
						</div>
					</div>
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
							v-if="setupError === 'generic'"
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

.setupDescriptionContainer {
	display: flex;
	align-items: center;
	height: var(--height--xs);
}

.setupDescription {
	color: var(--text-color--subtler);
}

.setupError {
	color: var(--color--danger);
}

.tokenInputContainer,
.editTokenContainer {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.editTokenContainer {
	gap: var(--spacing--sm);
	align-items: flex-start;
}

.tokenField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	padding-inline: var(--spacing--3xs);
	margin-inline: calc(var(--spacing--3xs) * -1);
}

.tokenLabel {
	display: inline-flex;
}

.tokenVisibilityButton {
	margin-right: calc(var(--spacing--3xs) * -1);
}

.createTokenContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
