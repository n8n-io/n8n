<script setup lang="ts">
import type { AgentTeamsIntegrationSettings, TeamsManagedSetupState } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSpinner,
	N8nStepper,
	N8nText,
} from '@n8n/design-system';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';
import { saveAs } from 'file-saver';

import CredentialsDropdown, {
	type CredentialOption,
} from '@/features/credentials/components/CredentialPicker/CredentialsDropdown.vue';
import { fetchTeamsAppPackage } from './api';
import AgentChannelTeamsAvailability from './AgentChannelTeamsAvailability.vue';
import { availabilityFrom, TEAMS_PACKAGE_FILENAME, type TeamsAvailability } from './constants';
import AgentChannelTeamsIdentityCard from './AgentChannelTeamsIdentityCard.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

const selectedCredentialId = defineModel<string>({ default: '' });

const props = defineProps<{
	runtime: TeamsChannelRuntime;
	setup: TeamsManagedSetupState;
	loading: boolean;
	credentialPermissions: PermissionsRecord['credential'];
	savedSettings?: AgentTeamsIntegrationSettings;
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	persist: [];
	/**
	 * The channel credential the Entra step wrote. The view holds it, because
	 * saving binds that credential to the agent — not the sign-in this component
	 * is modelled on.
	 */
	provisioned: [credentialId: string];
	/** The user is finished here, whether or not Microsoft is. */
	done: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const busy = ref<string | null>(null);
const errorMessage = ref('');

const describeError = (error: unknown) =>
	getErrorMessage(error ?? i18n.baseText('generic.unknownError'));

/** Which step each action belongs to, so a failure is reported where it happened. */
const STEP_OF_ACTION: Record<string, string> = {
	connect: 'connect',
	'create-app': 'create-app',
	'create-bot': 'create-bot',
	download: 'install',
};
const errorStepId = ref('');
const connectFailed = ref(false);
const subscriptionId = ref('');
/**
 * Whether Azure has answered. Until it has -- because the question is still in
 * flight, or because it was refused -- neither branch of the bot step is the
 * truth, and the no-subscription fallback would be a lie.
 */
const subscriptionsChecked = ref(false);
/** Only true while Azure is actually being asked, so the wait cannot outlive it. */
const subscriptionsChecking = ref(false);
const availability = ref<TeamsAvailability>(availabilityFrom());

const selectedCredential = computed(() =>
	props.setup.managerCredentials.find(({ id }) => id === selectedCredentialId.value),
);
const credentialOptions = computed<CredentialOption[]>(() =>
	props.setup.managerCredentials.map(({ id, name }) => ({ id, name, typeDisplayName: undefined })),
);
const hasCredentials = computed(() => props.setup.managerCredentials.length > 0);
const reconnectRequired = computed(() => selectedCredential.value?.reconnectRequired === true);
const connected = computed(
	() => selectedCredential.value?.connected === true && !reconnectRequired.value,
);

const provisionedApp = computed(() => props.runtime.provisionedApp.value);
const provisionedBot = computed(() => props.runtime.provisionedBot.value);
const subscriptions = computed(() => props.runtime.subscriptions.value);
const botReady = computed(() => provisionedBot.value !== null);

/** The agent's own name and blurb, which is how it appears in Teams. */
const identityName = computed(
	() =>
		props.savedSettings?.displayName || props.runtime.botSetupState.value?.defaultDisplayName || '',
);
const identityDescription = computed(
	() =>
		props.savedSettings?.description || props.runtime.botSetupState.value?.defaultDescription || '',
);

/**
 * What the install step offers, and what it is reporting. Held as two values
 * rather than a flag each, because most combinations of the flags described a
 * step that cannot exist -- waiting on an upload while also saying the app
 * is already there.
 */
type InstallRoute = 'choose' | 'downloaded';
type InstallOutcome = 'none' | 'waiting' | 'waitingSlow' | 'skipped';

const installRoute = ref<InstallRoute>('choose');
const installOutcome = ref<InstallOutcome>('none');

const waiting = computed(
	() => installOutcome.value === 'waiting' || installOutcome.value === 'waitingSlow',
);

/** What is running, for the status row the step shows in place of the menu. */
const installProgress = computed(() => {
	if (busy.value === 'download')
		return i18n.baseText('agents.channels.teams.managed.install.preparing');
	return '';
});

/**
 * Publishing and installing are separate: publishing puts the app in the
 * organisation catalogue, installing adds it to your own Teams. Only the add
 * finishes the step, because only it proves the agent is reachable.
 */
const installDone = computed(() => props.runtime.installed.value);

const connectSummary = computed(() =>
	selectedCredential.value?.organizationName
		? i18n.baseText('agents.channels.teams.managed.connect.summary', {
				interpolate: { organization: selectedCredential.value.organizationName },
			})
		: i18n.baseText('agents.channels.teams.managed.connect.summaryUnknown'),
);

const currentSettings = computed<AgentTeamsIntegrationSettings>(() => ({
	...props.savedSettings,
	...availability.value,
}));

/**
 * Every step after the first runs on the sign-in, so a sign-in that has to be
 * redone locks them rather than leaving one of them looking actionable. A step
 * already finished stays finished: the work was really done.
 */
const statusOf = computed<Record<string, 'complete' | 'active' | 'locked'>>(() => {
	const appDone = provisionedApp.value !== null;
	const status = (done: boolean, unlocked: boolean) =>
		done ? ('complete' as const) : unlocked ? ('active' as const) : ('locked' as const);

	return {
		connect: status(connected.value, true),
		'create-app': status(appDone, connected.value),
		'create-bot': status(botReady.value, appDone && connected.value),
		availability: botReady.value && connected.value ? ('active' as const) : ('locked' as const),
		install: status(installDone.value, botReady.value && connected.value),
	};
});

const steps = computed(() => {
	const status = statusOf.value;
	return [
		{
			id: 'connect',
			title: i18n.baseText('agents.channels.teams.managed.connect.title'),
			description: i18n.baseText('agents.channels.teams.managed.connect.description'),
		},
		{
			id: 'create-app',
			title: i18n.baseText(
				status['create-app'] === 'complete'
					? 'agents.channels.teams.managed.createApp.titleDone'
					: 'agents.channels.teams.managed.createApp.title',
			),
			description: i18n.baseText('agents.channels.teams.managed.createApp.description'),
		},
		{
			id: 'create-bot',
			title: i18n.baseText(
				status['create-bot'] === 'complete'
					? 'agents.channels.teams.managed.createBot.titleDone'
					: 'agents.channels.teams.managed.createBot.title',
			),
			description: i18n.baseText('agents.channels.teams.managed.createBot.description'),
		},
		{
			id: 'availability',
			title: i18n.baseText('agents.channels.teams.setup.availability.title'),
			description: i18n.baseText('agents.channels.teams.setup.availability.description'),
		},
		{
			id: 'install',
			title: i18n.baseText(
				status.install !== 'complete'
					? 'agents.channels.teams.managed.install.title'
					: 'agents.channels.teams.managed.install.titleDone',
			),
			description: i18n.baseText('agents.channels.teams.managed.install.description'),
		},
	];
});

// A sign-in that has to be redone blocks every one of them, and the usual
// chain would point at a step that is already done. A sign-in not made yet
// needs no such help: nothing is done, so the chain reads true.
const lockedHints = computed<Record<string, string>>(() => {
	if (reconnectRequired.value) {
		const signIn = i18n.baseText('agents.channels.teams.managed.connect.lockedBySignIn');
		return {
			'create-app': signIn,
			'create-bot': signIn,
			availability: signIn,
			install: signIn,
		};
	}
	return {
		'create-app': i18n.baseText('agents.channels.teams.managed.createApp.locked'),
		'create-bot': i18n.baseText('agents.channels.teams.managed.createBot.locked'),
		availability: i18n.baseText('agents.channels.teams.managed.availability.locked'),
		install: i18n.baseText('agents.channels.teams.managed.install.locked'),
	};
});

watch(
	() => props.setup.managerCredentials,
	(credentials) => {
		if (!credentials.some(({ id }) => id === selectedCredentialId.value)) {
			selectedCredentialId.value =
				credentials.find(({ connected: isConnected }) => isConnected)?.id ??
				credentials[0]?.id ??
				'';
		}
	},
	{ immediate: true },
);

// Pre-selects rather than leaving the picker empty: most tenants that have a
// subscription at all have exactly one, and an empty picker reads as a missing
// step. Re-runs on change, so a late-arriving list is still selected.
watch(
	subscriptions,
	(available) => {
		if (!available.some(({ id }) => id === subscriptionId.value)) {
			subscriptionId.value = available[0]?.id ?? '';
		}
	},
	{ immediate: true },
);

// Immediate, so it also covers reopening a setup that was signed in earlier.
// Keyed on the credential too: switching between two signed-in accounts leaves
// `connected` true, and the new tenant still has to be asked.
watch(
	[connected, selectedCredentialId],
	([isConnected, credentialId], previous) => {
		// Everything the steps below produce belongs to the tenant that was signed
		// in to: its subscriptions, its app registration, its bot. Another sign-in
		// has to forget them, or the bot step offers a subscription from the one
		// before it.
		if (previous?.[1] && previous[1] !== credentialId) {
			subscriptionsChecked.value = false;
			subscriptionId.value = '';
			props.runtime.subscriptions.value = [];
			props.runtime.provisionedApp.value = null;
			props.runtime.provisionedBot.value = null;
			props.runtime.installed.value = false;
			// The install step and the channel it wrote belonged to the old
			// account too: leaving them would offer Done for a bot credential this
			// account has nothing to do with.
			stopWaiting();
			installRoute.value = 'choose';
			installOutcome.value = 'none';
			persisted.value = false;
		}
		if (isConnected && !subscriptionsChecked.value) void checkSubscriptions();
	},
	{ immediate: true },
);

watch(
	() => props.savedSettings,
	(settings) => {
		if (!settings) return;
		availability.value = availabilityFrom(settings);
	},
	{ immediate: true },
);

/** One runner, so every step reports a failure the same way. */
async function run(name: string, action: () => Promise<void>) {
	if (busy.value) return;
	busy.value = name;
	errorMessage.value = '';
	errorStepId.value = '';
	try {
		await action();
	} catch (error) {
		errorMessage.value = describeError(error);
		errorStepId.value = STEP_OF_ACTION[name] ?? '';
	} finally {
		busy.value = null;
	}
}

/**
 * With a credential id this signs that one in; without one it makes a new
 * credential first. The picker already names one whenever the project has any,
 * so passing it is what keeps a second sign-in from piling up beside it.
 */
async function connect(credentialId?: string) {
	await run('connect', async () => {
		connectFailed.value = !(await props.runtime.connectManagerCredential(credentialId));
	});
}

const provisionApp = async () =>
	await run('create-app', async () => {
		await props.runtime.provisionApp();
		const credentialId = props.runtime.provisionedApp.value?.credentialId;
		if (credentialId) emit('provisioned', credentialId);
	});

/**
 * Asked once per setup, as soon as there is a sign-in to ask with. Nothing
 * about the answer depends on the app, and an account that cannot reach a
 * subscription cannot finish here -- so it learns that before it registers
 * anything, not three steps after.
 *
 * Asking can fail for reasons that are not "no subscription" -- a sign-in that
 * never covered Azure is the common one -- and the fallback below cannot tell
 * them apart, so a failure is reported on the step instead.
 */
async function checkSubscriptions() {
	subscriptionsChecking.value = true;
	try {
		await props.runtime.loadSubscriptions();
		subscriptionsChecked.value = true;
	} catch (error) {
		// Left unchecked on purpose: Azure never answered, so neither branch of
		// the step is the truth and the error stands in their place. It runs from
		// a watcher rather than a click, so it never takes the busy lock -- and so
		// must not overwrite an error a step the user did start has reported.
		if (!errorMessage.value) {
			errorMessage.value = describeError(error);
			errorStepId.value = STEP_OF_ACTION['create-bot'];
		}
	} finally {
		subscriptionsChecking.value = false;
	}
}

/**
 * Azure is asked from a watcher rather than a click, so a refusal would leave
 * the step with nothing on it to press. Clears the refusal it is retrying, and
 * leaves one that a step the user did start has reported.
 */
async function retrySubscriptions() {
	if (errorStepId.value === STEP_OF_ACTION['create-bot']) {
		errorMessage.value = '';
		errorStepId.value = '';
	}
	await checkSubscriptions();
}

const provisionBot = async () =>
	await run('create-bot', async () => {
		await props.runtime.provisionBot(subscriptionId.value);
	});

/** True once there is a channel to come back to, so leaving loses nothing. */
const persisted = ref(false);

/**
 * Binds the provisioned credential to the agent, which is what starts it.
 *
 * The package route calls this once it has been handed over: the setup is
 * finished from n8n's side even though the upload happens in Teams. It does
 * not close the dialog, because the upload is still to come.
 *
 * The credential is re-announced first, because saving reads it from the
 * view's model and nothing else guarantees the view heard about it in this
 * session.
 */
function persistChannel() {
	emit('persist');
	persisted.value = true;
}

/**
 * The credential is announced as soon as it exists, not only on the routes
 * that save straight away. Done saves what the view holds, so a step finished
 * some other way -- an app already published, an upload the poll noticed --
 * would otherwise leave it with no credential to bind.
 */
watch(
	() => provisionedApp.value?.credentialId,
	(credentialId) => {
		if (credentialId) emit('provisioned', credentialId);
	},
	{ immediate: true },
);

// Read by the channel modal when it saves, so the availability chosen here is
// what gets stored rather than the defaults.
// The steps past the connect -- publishing and adding -- happen here, and
// some of them wait on Microsoft for hours. The modal stays until the user
// says otherwise.
/**
 * Leaving is allowed once the step is finished, however it got there. Only
 * publishing and handing over the package ran through here, so a setup
 * reopened onto an app Microsoft already lists had nothing left to do and no
 * way to save it.
 */
const canFinish = computed(() => persisted.value || installDone.value);

defineExpose({ currentSettings, keepOpenAfterConnect: true, canFinish });

/**
 * The upload happens in Teams, so nothing reaches n8n when it does. Microsoft
 * is asked on a timer instead, and the app turning up in the user's installed
 * apps is what closes the step.
 */
const POLL_MS = 3000;
/** After this the wait stops looking normal, so a way out is offered. */
const SLOW_AFTER_MS = 20000;
/**
 * Every tick costs a token mint, a credential write and a Graph call, and
 * what it waits for is an upload in another application that may never happen.
 * So it asks for a couple of minutes and then leaves the button to ask again,
 * rather than polling a dialog somebody left open overnight.
 */
const POLL_GIVE_UP_AFTER_MS = 120_000;

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let slowTimer: ReturnType<typeof setTimeout> | undefined;
let pollUntil = 0;

function stopWaiting() {
	clearTimeout(pollTimer);
	clearTimeout(slowTimer);
	pollTimer = undefined;
	slowTimer = undefined;
	if (waiting.value) installOutcome.value = 'none';
}

async function pollInstalled() {
	try {
		if (await props.runtime.checkInstalled()) {
			stopWaiting();
			return;
		}
	} catch {
		// A failed poll is not a failed install: Teams may simply not have it yet.
	}
	if (!waiting.value) return;
	if (Date.now() >= pollUntil) {
		stopWaiting();
		installOutcome.value = 'skipped';
		return;
	}
	pollTimer = setTimeout(pollInstalled, POLL_MS);
}

function startWaiting() {
	stopWaiting();
	installOutcome.value = 'waiting';
	pollUntil = Date.now() + POLL_GIVE_UP_AFTER_MS;
	slowTimer = setTimeout(() => {
		if (installOutcome.value === 'waiting') installOutcome.value = 'waitingSlow';
	}, SLOW_AFTER_MS);
	pollTimer = setTimeout(pollInstalled, POLL_MS);
}

/** Stops asking, and says the step was left unverified rather than failed. */
function skipWaiting() {
	stopWaiting();
	installOutcome.value = 'skipped';
}

let unmounted = false;
onBeforeUnmount(() => {
	unmounted = true;
	stopWaiting();
});

/**
 * Hands the setup to the manual flow, for the walls this one cannot climb: a
 * tenant that will not let this account register an app, or an account with no
 * Azure subscription. Both are someone else's rights to grant, and the manual
 * flow is the route that takes what they hand back.
 */
function useOwnMicrosoftApp() {
	props.runtime.setupKind.value = 'manual';
}

const downloadPackage = async () =>
	await run('download', async () => {
		const blob = await fetchTeamsAppPackage(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			provisionedApp.value?.credentialId,
			currentSettings.value,
		);
		// The request can outlive the step. Starting a poll now would leave a
		// timer nothing clears, and persisting would bind a channel the user has
		// already walked away from.
		if (unmounted) return;
		saveAs(blob, TEAMS_PACKAGE_FILENAME);
		installRoute.value = 'downloaded';
		persistChannel();
		startWaiting();
	});
</script>

<template>
	<div :class="$style.managedSetup">
		<N8nStepper :steps="steps" data-testid="teams-managed-stepper">
			<template #default="{ step }">
				<div
					v-if="step.id === 'connect' && statusOf[step.id] === 'complete'"
					:class="$style.stepContent"
				>
					<div :class="$style.credentialRow">
						<CredentialsDropdown
							:credential-options="credentialOptions"
							:selected-credential-id="selectedCredentialId"
							:permissions="credentialPermissions"
							:loading="loading"
							data-testid="teams-manager-credential-select"
							@credential-selected="selectedCredentialId = $event"
							@new-credential="connect()"
						/>
						<N8nIconButton
							v-if="credentialPermissions.update"
							icon="pen"
							variant="outline"
							size="medium"
							:title="i18n.baseText('agents.channels.teams.managed.connect.edit')"
							data-testid="teams-manager-credential-edit"
							@click="runtime.editManagerCredential(selectedCredentialId)"
						/>
					</div>
					<N8nText size="small" color="text-light" data-testid="teams-manager-organization">
						{{ connectSummary }}
					</N8nText>
				</div>

				<div
					v-else-if="step.id === 'create-app' && statusOf[step.id] === 'complete'"
					:class="$style.stepContent"
				>
					<div :class="$style.summaryLine">
						<N8nText size="small" color="text-light" data-testid="teams-app-summary">
							{{
								i18n.baseText('agents.channels.teams.managed.createApp.summary', {
									interpolate: { organization: provisionedApp?.organizationName ?? '' },
								})
							}}
						</N8nText>
						<!--
							Rendered through N8nText so it carries the same size class as the
							line beside it. A hand-written font-size drifts from the token the
							sibling uses, and lost to the anchor styling anyway.
						-->
						<N8nText
							v-if="provisionedApp"
							tag="a"
							size="small"
							:href="provisionedApp.entraAppUrl"
							target="_blank"
							rel="noopener noreferrer"
							data-testid="teams-app-entra-link"
						>
							{{ i18n.baseText('agents.channels.teams.managed.createApp.viewInEntra') }}
						</N8nText>
					</div>
				</div>

				<div
					v-else-if="step.id === 'create-bot' && statusOf[step.id] === 'complete'"
					:class="$style.stepContent"
				>
					<N8nText size="small" color="text-light" data-testid="teams-bot-summary">
						{{
							i18n.baseText('agents.channels.teams.managed.createBot.summary', {
								interpolate: { botName: provisionedBot?.botName ?? '' },
							})
						}}
					</N8nText>
				</div>

				<div
					v-else-if="step.id === 'install' && statusOf[step.id] === 'complete'"
					:class="$style.stepContent"
				>
					<!--
						The design system's own success surface, rather than a border
						and a text colour chosen here: those two resolve to the same
						light green in dark mode, which left the row unreadable.
					-->
					<N8nCallout theme="success" :class="$style.doneCallout" data-testid="teams-install-done">
						{{ i18n.baseText('agents.channels.teams.managed.install.done') }}
					</N8nCallout>
				</div>

				<div v-else-if="step.id === 'connect'" :class="$style.stepContent">
					<div v-if="hasCredentials" :class="$style.credentialRow">
						<CredentialsDropdown
							:credential-options="credentialOptions"
							:selected-credential-id="selectedCredentialId"
							:permissions="credentialPermissions"
							:loading="loading"
							data-testid="teams-manager-credential-select"
							@credential-selected="selectedCredentialId = $event"
							@new-credential="connect()"
						/>
					</div>
					<N8nText
						v-if="reconnectRequired"
						size="small"
						color="danger"
						data-testid="teams-manager-reconnect"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.reconnect') }}
					</N8nText>
					<N8nButton
						variant="outline"
						size="medium"
						icon="teams"
						:loading="busy === 'connect'"
						:disabled="loading || busy !== null"
						data-testid="teams-manager-connect"
						@click="connect(selectedCredentialId || undefined)"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.button') }}
					</N8nButton>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.channels.teams.managed.connect.hint') }}
					</N8nText>
					<!--
						The one prompt that covers Graph and Azure together. A sign-in cannot:
						a code is redeemed for one resource at a time.
					-->
					<N8nButton
						v-if="setup.adminConsentUrl"
						:href="setup.adminConsentUrl"
						tag="a"
						target="_blank"
						variant="ghost"
						size="small"
						data-testid="teams-admin-consent"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.adminConsent') }}
					</N8nButton>
					<N8nText v-if="setup.adminConsentUrl" size="small" color="text-light">
						{{ i18n.baseText('agents.channels.teams.managed.connect.adminConsentHint') }}
					</N8nText>
					<N8nText
						v-if="connectFailed"
						size="small"
						color="danger"
						data-testid="teams-manager-error"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.failed') }}
					</N8nText>
				</div>

				<div
					v-else-if="step.id === 'create-app' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<!-- Offered for the two walls this step can hit: no subscription for
						the bot that comes next, and a tenant that will not let this account
						register the app at all. -->
					<N8nButton
						v-if="
							(subscriptionsChecked && subscriptions.length === 0) || errorStepId === 'create-app'
						"
						variant="ghost"
						size="small"
						data-testid="teams-use-own-app-from-app-step"
						@click="useOwnMicrosoftApp"
					>
						{{ i18n.baseText('agents.channels.teams.managed.useOwnApp') }}
					</N8nButton>
					<N8nButton
						variant="outline"
						size="medium"
						:loading="busy === 'create-app'"
						:disabled="busy !== null"
						data-testid="teams-create-app"
						@click="provisionApp"
					>
						{{ i18n.baseText('agents.channels.teams.managed.createApp.button') }}
					</N8nButton>
					<N8nText
						v-if="busy === 'create-app'"
						size="small"
						color="text-light"
						data-testid="teams-create-app-progress"
					>
						{{ i18n.baseText('agents.channels.teams.managed.createApp.progress') }}
					</N8nText>
				</div>

				<div
					v-else-if="step.id === 'create-bot' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<!-- Only while Azure is really being asked. Tied to "has not answered
						yet" instead, a question that was never asked waits for ever. -->
					<template v-if="subscriptionsChecking">
						<N8nText size="small" color="text-light" data-testid="teams-bot-checking">
							{{ i18n.baseText('agents.channels.teams.managed.createBot.checking') }}
						</N8nText>
					</template>

					<!--
						Azure never answered, so neither branch below is the truth. The
						question runs from a watcher rather than a click, so without this
						the step would have no action left on it at all.
					-->
					<template v-else-if="!subscriptionsChecked">
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="busy !== null"
							data-testid="teams-bot-retry"
							@click="retrySubscriptions"
						>
							{{ i18n.baseText('agents.channels.teams.managed.createBot.retry') }}
						</N8nButton>
					</template>

					<template v-else-if="subscriptions.length > 0">
						<N8nInputLabel
							:label="i18n.baseText('agents.channels.teams.managed.createBot.subscription')"
							:class="$style.field"
						>
							<N8nSelect
								v-model="subscriptionId"
								size="medium"
								:teleported="false"
								data-testid="teams-bot-subscription"
							>
								<N8nOption
									v-for="subscription in subscriptions"
									:key="subscription.id"
									:value="subscription.id"
									:label="subscription.name"
								/>
							</N8nSelect>
						</N8nInputLabel>
						<N8nText size="small" color="text-light" data-testid="teams-bot-free-tier">
							{{ i18n.baseText('agents.channels.teams.managed.createBot.freeTier') }}
						</N8nText>
						<N8nButton
							variant="outline"
							size="medium"
							:loading="busy === 'create-bot'"
							:disabled="busy !== null || !subscriptionId"
							data-testid="teams-create-bot"
							@click="provisionBot"
						>
							{{ i18n.baseText('agents.channels.teams.managed.createBot.create') }}
						</N8nButton>
						<N8nText
							v-if="busy === 'create-bot'"
							size="small"
							color="text-light"
							data-testid="teams-create-bot-progress"
						>
							{{ i18n.baseText('agents.channels.teams.managed.createBot.progress') }}
						</N8nText>
					</template>

					<template v-else>
						<N8nInputLabel
							:label="i18n.baseText('agents.channels.teams.managed.createBot.subscription')"
							:class="$style.field"
						>
							<N8nSelect
								disabled
								size="medium"
								:placeholder="
									i18n.baseText('agents.channels.teams.managed.createBot.noSubscriptionsFound')
								"
								data-testid="teams-bot-no-subscriptions-select"
							/>
						</N8nInputLabel>
						<N8nText size="small" color="danger" data-testid="teams-bot-no-subscription">
							{{ i18n.baseText('agents.channels.teams.managed.createBot.noSubscription') }}
						</N8nText>
						<N8nButton
							variant="ghost"
							size="small"
							data-testid="teams-use-own-app-from-bot-step"
							@click="useOwnMicrosoftApp"
						>
							{{ i18n.baseText('agents.channels.teams.managed.useOwnApp') }}
						</N8nButton>
					</template>
				</div>

				<div
					v-else-if="step.id === 'availability' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<AgentChannelTeamsAvailability v-model="availability" start-collapsed />
				</div>

				<div
					v-else-if="step.id === 'install' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<N8nText
						v-if="installRoute === 'downloaded'"
						size="small"
						color="text-light"
						data-testid="teams-install-yourself-hint"
					>
						{{ i18n.baseText('agents.channels.teams.managed.install.downloaded') }}
					</N8nText>
					<!-- Only worth raising once the upload is the thing being attempted. -->
					<N8nText
						v-if="installRoute === 'downloaded'"
						size="small"
						color="text-light"
						data-testid="teams-install-upload-blocked"
					>
						{{ i18n.baseText('agents.channels.teams.managed.install.noUploadOption') }}
					</N8nText>

					<N8nText
						v-if="installProgress"
						size="small"
						color="text-light"
						data-testid="teams-install-progress"
					>
						{{ installProgress }}
					</N8nText>

					<!--
						The card goes while the wait runs. It offers a download that has
						already happened, beside a row saying the upload it produced is being
						watched for. The hints above stay: they are what to do during the wait.
					-->
					<template v-if="!waiting">
						<AgentChannelTeamsIdentityCard
							:name="identityName"
							:description="identityDescription"
							:tooltip="i18n.baseText('agents.channels.teams.managed.install.identityTooltip')"
							ready
						>
							<template #action>
								<N8nSpinner
									v-if="installProgress"
									size="medium"
									data-testid="teams-install-spinner"
								/>
								<N8nButton
									v-else-if="installRoute === 'downloaded'"
									variant="outline"
									size="medium"
									:loading="busy === 'download'"
									:disabled="busy !== null"
									data-testid="teams-install-download-package"
									@click="downloadPackage"
								>
									{{ i18n.baseText('agents.channels.teams.managed.install.downloadAgain') }}
								</N8nButton>
								<N8nButton
									v-else
									variant="solid"
									size="medium"
									:loading="busy === 'download'"
									:disabled="busy !== null"
									data-testid="teams-install-download-package"
									@click="downloadPackage"
								>
									{{ i18n.baseText('agents.channels.teams.managed.install.forMe') }}
								</N8nButton>
							</template>
						</AgentChannelTeamsIdentityCard>
					</template>

					<!--
						The wait is its own row, as the design draws it: what is being
						waited for on the left, the way out on the right. Retry and skip
						only appear once it has gone on long enough to look stuck.
					-->
					<template v-if="waiting">
						<div :class="$style.waitRow">
							<N8nSpinner size="small" />
							<N8nText size="small" color="text-light" data-testid="teams-install-waiting">
								{{
									i18n.baseText('agents.channels.teams.managed.install.waitingUpload', {
										interpolate: { app: identityName },
									})
								}}
							</N8nText>
							<N8nButton
								variant="ghost"
								size="small"
								:class="$style.waitAction"
								data-testid="teams-install-cancel-wait"
								@click="stopWaiting"
							>
								{{ i18n.baseText('agents.channels.teams.managed.install.cancel') }}
							</N8nButton>
						</div>
						<div v-if="installOutcome === 'waitingSlow'" :class="$style.buttonRow">
							<N8nText size="small" color="text-light" data-testid="teams-install-slow">
								{{ i18n.baseText('agents.channels.teams.managed.install.slow') }}
							</N8nText>
							<N8nButton
								variant="ghost"
								size="small"
								data-testid="teams-install-retry"
								@click="startWaiting"
							>
								{{ i18n.baseText('agents.channels.teams.managed.install.retry') }}
							</N8nButton>
							<N8nButton
								variant="ghost"
								size="small"
								data-testid="teams-install-skip"
								@click="skipWaiting"
							>
								{{ i18n.baseText('agents.channels.teams.managed.install.skip') }}
							</N8nButton>
						</div>
						<N8nText v-else size="small" color="text-light">
							{{ i18n.baseText('agents.channels.teams.managed.install.waitingUsual') }}
						</N8nText>
					</template>
					<N8nText
						v-else-if="installOutcome === 'skipped'"
						size="small"
						color="text-light"
						data-testid="teams-install-skipped"
					>
						{{
							i18n.baseText('agents.channels.teams.managed.install.skipped', {
								interpolate: { app: identityName },
							})
						}}
					</N8nText>
				</div>

				<div
					v-else-if="statusOf[step.id] === 'locked'"
					:class="[$style.stepContent, $style.locked]"
					inert
				>
					<!-- Greyed out rather than hidden, the way the manual setup marks a
					     step nobody can start yet. -->
					<N8nText size="small" color="text-light" :data-testid="`teams-managed-locked-${step.id}`">
						{{ lockedHints[step.id] }}
					</N8nText>
				</div>

				<!-- Beside the step that failed. At the foot of the stepper it sat below
				     the fold, so a failure read as a spinner that stopped. -->
				<N8nText
					v-if="errorStepId === step.id"
					size="small"
					color="danger"
					:class="$style.stepError"
					:data-testid="`teams-managed-error-${step.id}`"
				>
					{{ errorMessage }}
				</N8nText>
			</template>
		</N8nStepper>

		<!-- Only for a failure that belongs to no step in particular. -->
		<N8nText
			v-if="errorMessage && !errorStepId"
			size="small"
			color="danger"
			data-testid="teams-managed-error"
		>
			{{
				i18n.baseText('agents.channels.teams.managed.error', {
					interpolate: { message: errorMessage },
				})
			}}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.managedSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.locked {
	opacity: 0.45;
	pointer-events: none;
}

.stepContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--xs);
	width: 100%;
}

.credentialRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.stepError {
	padding-top: var(--spacing--2xs);
}

.summaryLine {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.buttonRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.waitRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width, 1px) dashed var(--border-color--subtle);
	border-radius: var(--radius--xs);
}

.waitAction {
	margin-left: auto;
}

/*
 * The step content aligns to the start, so a callout would sit at its own
 * width beside the full-width card below it. Shorter too: one line of text
 * does not need the padding a paragraph of it would.
 */
.doneCallout {
	width: 100%;
	padding-block: var(--spacing--2xs);
}

.field {
	width: 100%;
}
</style>
