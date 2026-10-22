<script setup lang="ts">
import type { AgentTeamsIntegrationSettings, TeamsManagedSetupState } from '@n8n/api-types';
import {
	N8nActionDropdown,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nStepper,
	N8nText,
} from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
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
import {
	availabilityFrom,
	entraApiPermissionsUrl,
	permissionUseFor,
	TEAMS_PACKAGE_FILENAME,
	type TeamsAvailability,
} from './constants';
import AgentChannelTeamsIdentityCard from './AgentChannelTeamsIdentityCard.vue';
import AgentChannelTeamsOptionLabel from './AgentChannelTeamsOptionLabel.vue';
import { useTeamsFileAccessMenu } from './useTeamsFileAccessMenu';
import type { AgentChannelRestart } from '../types';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { useTeamsSetupRestart } from './useTeamsSetupRestart';
import { useTeamsUploadInstruction } from './useTeamsUploadInstruction';

const selectedCredentialId = defineModel<string>({ default: '' });

const props = defineProps<{
	runtime: TeamsChannelRuntime;
	setup: TeamsManagedSetupState;
	loading: boolean;
	credentialPermissions: PermissionsRecord['credential'];
	savedSettings?: AgentTeamsIntegrationSettings;
	/**
	 * Whether the channel is already on the agent. A setup reopened over one
	 * still has the upload to do, and the step holding those instructions would
	 * otherwise only ever show them in the session that downloaded.
	 */
	channelConnected?: boolean;
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
	/** The sign-in changed under a saved channel: remove it and start from the first step. */
	restart: [restart: AgentChannelRestart];
}>();

const TEAMS_MANAGE_APPS_URL = 'https://admin.teams.microsoft.com/policies/manage-apps';

const i18n = useI18n();
const clipboard = useClipboard();
const rootStore = useRootStore();
const uploadInstruction = useTeamsUploadInstruction();

const busy = ref<string | null>(null);
const errorMessage = ref('');

const describeError = (error: unknown) =>
	getErrorMessage(error ?? i18n.baseText('generic.unknownError'));

/** Which step each action belongs to, so a failure is reported where it happened. */
const STEP_OF_ACTION: Record<string, string> = {
	connect: 'connect',
	'create-app': 'create-app',
	'create-bot': 'create-bot',
	publish: 'install',
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
/** Set once the approval request has been put on the clipboard. */
const requestCopied = ref(false);
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
const catalogState = computed(() => props.runtime.catalogState.value);
const botReady = computed(() => provisionedBot.value !== null);
const published = computed(() => catalogState.value?.status === 'published');

/** The agent's own name and blurb, which is how it appears in Teams. */
const identityName = computed(
	() =>
		props.savedSettings?.displayName || props.runtime.botSetupState.value?.defaultDisplayName || '',
);
const identityDescription = computed(
	() =>
		props.savedSettings?.description || props.runtime.botSetupState.value?.defaultDescription || '',
);

/** Whether the package has been handed over yet. */
type InstallRoute = 'choose' | 'downloaded';

const installRoute = ref<InstallRoute>('choose');
/**
 * Spelled out rather than built from the status, so the keys stay greppable
 * and the unused-key tooling can see them.
 */
const CATALOG_STATE_TEXT = {
	published: 'agents.channels.teams.managed.install.published',
	submitted: 'agents.channels.teams.managed.install.submitted',
	rejected: 'agents.channels.teams.managed.install.rejected',
	unknown: 'agents.channels.teams.managed.install.unknown',
} as const;

/**
 * Whether this setup has published yet. The catalogue is read when the step
 * opens, and before a publish its "not listed" answer is just the truth about
 * an app nobody published -- not something to report. Downloading the package
 * does not count: a sideloaded app never enters the catalogue, so its silence
 * about one says nothing about an upload that happened in Teams.
 */
const hasPublished = ref(false);

/**
 * The two routes are independent, so downloading the package once must not take
 * publishing away. Publishing is offered once: a pending review cannot take
 * another submission, and a published app is already in the catalog.
 */
const installMenuItems = computed(() => [
	{
		id: 'for-me',
		testId: 'teams-install-download-package',
		label: i18n.baseText(
			installRoute.value === 'downloaded'
				? 'agents.channels.teams.managed.install.downloadAgain'
				: 'agents.channels.teams.managed.install.forMe',
		),
		description: i18n.baseText('agents.channels.teams.managed.install.forMeHint'),
	},
	{
		id: 'publish',
		testId: 'teams-publish',
		label: i18n.baseText('agents.channels.teams.managed.install.publish'),
		description: i18n.baseText('agents.channels.teams.managed.install.publishHintShort'),
		disabled:
			hasPublished.value || ['published', 'submitted'].includes(catalogState.value?.status ?? ''),
	},
]);

const onInstallMenu = async (id: string) =>
	id === 'publish' ? await publishApp() : await downloadPackage();

/** What is running, for the status row the step shows in place of the menu. */
const installProgress = computed(() => {
	if (busy.value === 'publish')
		return i18n.baseText('agents.channels.teams.managed.install.publishing');
	if (busy.value === 'download')
		return i18n.baseText('agents.channels.teams.managed.install.preparing');
	return '';
});

/**
 * Publishing is the only finish n8n can see. A sideload happens in the Teams
 * client, so that route ends on the step after this one instead.
 */
const installDone = computed(() => published.value);

/** Without a consent link the instance has no address Entra accepts to return to. */
const fileAccessUrl = computed(() => {
	const app = provisionedApp.value;
	if (!app) return '';
	return app.fileAccessConsentUrl ?? entraApiPermissionsUrl(app.appId);
});

const organization = computed(
	() => provisionedApp.value?.organizationName ?? selectedCredential.value?.organizationName ?? '',
);

const { items: fileAccessMenuItems, onSelect: onFileAccessMenu } = useTeamsFileAccessMenu({
	url: fileAccessUrl,
	organization,
});

const currentSettings = computed<AgentTeamsIntegrationSettings>(() => ({
	...props.savedSettings,
	...availability.value,
}));

/** True once there is a channel to come back to, so leaving loses nothing. */
const persisted = ref(false);

/**
 * Leaving is allowed once there is something worth saving: a package handed
 * over, or an app already in the catalogue. The second case is the one a
 * re-run lands in -- Microsoft keeps the app through a disconnect, so nothing
 * here writes the channel again, and without Done there is no way to bind the
 * credential back to the agent at all.
 */
const canFinish = computed(() => persisted.value || published.value);

/**
 * A saved channel runs on the bot this sign-in made. Another sign-in would
 * make a second bot beside it, so switching it sets the channel up again.
 */
const signInLocked = computed(() => persisted.value || props.channelConnected === true);
const { confirmRestart } = useTeamsSetupRestart();

// Under a saved channel the new sign-in is applied only once the host has
// removed the channel, so a removal that fails leaves this setup as it was.
async function selectSignIn(credentialId: string) {
	if (credentialId === selectedCredentialId.value) return;
	if (!signInLocked.value) {
		selectedCredentialId.value = credentialId;
		return;
	}
	if (await confirmRestart()) {
		emit('restart', { credentialId: '', signInCredentialId: credentialId });
	}
}

async function addSignIn() {
	if (!signInLocked.value) {
		await connect();
		return;
	}
	if (!(await confirmRestart())) return;
	const signedIn = await connect(undefined, { select: false });
	if (signedIn) emit('restart', { credentialId: '', signInCredentialId: signedIn });
}

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
		'file-access': botReady.value && connected.value ? ('active' as const) : ('locked' as const),
		// The upload happens in the Teams client, so this step never reports
		// itself finished -- the user says when it is. Gated on the sign-in like
		// the steps above: one that has to be redone locks them, and leaving
		// this one actionable would read as the odd one out.
		// Done saves through the modal, which writes only when `canFinish` holds,
		// so the step unlocks on that and nothing else.
		finish:
			connected.value && (canFinish.value || props.channelConnected === true)
				? ('active' as const)
				: ('locked' as const),
	};
});

const awaitingCatalog = computed(() => installRoute.value !== 'downloaded' && published.value);

const finishDescription = computed(() => {
	if (statusOf.value.finish === 'locked')
		return i18n.baseText(
			reconnectRequired.value
				? 'agents.channels.teams.managed.connect.lockedBySignIn'
				: 'agents.channels.teams.managed.finish.locked',
		);
	if (awaitingCatalog.value) {
		return organization.value
			? i18n.baseText('agents.channels.teams.managed.finish.published', {
					interpolate: { organization: organization.value },
				})
			: i18n.baseText('agents.channels.teams.managed.finish.publishedUnknown');
	}
	return uploadInstruction(availability.value);
});

const steps = computed(() => [
	{
		id: 'connect',
		title: i18n.baseText('agents.channels.teams.managed.connect.title'),
		description: i18n.baseText('agents.channels.teams.managed.connect.description'),
	},
	{
		id: 'create-app',
		title: i18n.baseText('agents.channels.teams.managed.createApp.title'),
		description:
			statusOf.value['create-app'] === 'complete'
				? i18n.baseText('agents.channels.teams.managed.createApp.summary', {
						interpolate: { organization: provisionedApp.value?.organizationName ?? '' },
					})
				: i18n.baseText('agents.channels.teams.managed.createApp.description'),
	},
	{
		id: 'create-bot',
		title: i18n.baseText('agents.channels.teams.managed.createBot.title'),
		description:
			statusOf.value['create-bot'] === 'complete'
				? i18n.baseText('agents.channels.teams.managed.createBot.summary', {
						interpolate: { botName: provisionedBot.value?.botName ?? '' },
					})
				: i18n.baseText('agents.channels.teams.managed.createBot.description'),
	},
	{
		id: 'availability',
		title: i18n.baseText('agents.channels.teams.setup.availability.title'),
		description: i18n.baseText('agents.channels.teams.managed.availability.description'),
	},
	{
		id: 'install',
		title: i18n.baseText('agents.channels.teams.managed.install.title'),
		description: i18n.baseText('agents.channels.teams.managed.install.description'),
	},
	{
		id: 'file-access',
		title: i18n.baseText('agents.channels.teams.managed.fileAccess.title'),
		description: i18n.baseText(
			`agents.channels.teams.managed.fileAccess.description.${permissionUseFor(availability.value)}`,
		),
	},
	{
		id: 'finish',
		title: i18n.baseText('agents.channels.teams.managed.finish.title'),
		description: finishDescription.value,
	},
]);

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
			// The install step and the channel it wrote belonged to the old account
			// too: leaving them would offer Done for a bot credential this account
			// has nothing to do with.
			installRoute.value = 'choose';
			persisted.value = false;
			// The catalogue answer belongs to the tenant that gave it, and
			// `refreshCatalogState` refuses to let an `unknown` read overwrite a
			// known one -- so leaving it here does not just flicker, it sticks.
			props.runtime.catalogState.value = null;
			hasPublished.value = false;
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
async function connect(
	credentialId?: string,
	options?: { select?: boolean },
): Promise<string | null> {
	let signedIn: string | null = null;
	await run('connect', async () => {
		signedIn = await props.runtime.connectManagerCredential(credentialId, options);
		connectFailed.value = !signedIn;
	});
	return signedIn;
}

const provisionApp = async () =>
	await run('create-app', async () => {
		if (!(await props.runtime.provisionApp())) return;
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
		// Only on an answer that was kept. A reply for a sign-in the setup has
		// moved on from is dropped, and marking the step checked on one would put
		// the manual ladder behind an account Azure was never asked about.
		if (await props.runtime.loadSubscriptions()) subscriptionsChecked.value = true;
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

/**
 * Publishes, and stops there. Adding the app to someone's Teams is the step
 * after, and the design keeps the two apart: publishing is a decision about
 * the organisation, adding is one about your own account.
 */
const publishApp = async () =>
	await run('publish', async () => {
		// Only once it went through, and only for the account it went through for:
		// set before, a refused publish leaves the catalogue's "not listed yet"
		// sitting beside the error explaining why, and a reply the setup has moved
		// on from would bind the channel for a tenant nobody published to.
		if (!(await props.runtime.publishApp(currentSettings.value))) return;
		hasPublished.value = true;
		persistChannel();
	});

/**
 * Binds the provisioned credential to the agent, which is what starts it.
 *
 * Every route that puts the app in front of someone calls this -- publishing
 * and the package alike -- because each finishes the setup on its own, and
 * which of them a tenant allows is not ours to choose. None of them closes the
 * dialog: another may still follow.
 */
function persistChannel() {
	emit('persist');
	persisted.value = true;
}

/**
 * The credential is announced as soon as it exists, not only on the route that
 * saves straight away. Done saves what the view holds, so a setup the user
 * leaves without downloading would otherwise leave it nothing to bind.
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

defineExpose({ currentSettings, keepOpenAfterConnect: true, canFinish });

// The package request can outlive the step, and a continuation that persisted
// the channel afterwards would bind one the user had walked away from.
let unmounted = false;
onBeforeUnmount(() => {
	unmounted = true;
});

/**
 * Puts the whole request on the clipboard rather than on the screen: the user
 * pastes it to whoever can approve it, and has nothing to compose or look up.
 *
 * The link is the Manage apps page, which is as deep as Microsoft goes — there
 * is no URL for one pending app — so the app's name carries the rest. The
 * administrator finds it under Pending approval.
 */
async function copyApprovalRequest() {
	await clipboard.copy(
		i18n.baseText('agents.channels.teams.managed.install.approvalRequest', {
			interpolate: { app: provisionedApp.value?.appName ?? '', url: TEAMS_MANAGE_APPS_URL },
		}),
	);
	requestCopied.value = true;
}

/** The person signing in is often not the admin who can approve n8n. */
const { onSelect: onAdminConsentMenu } = useTeamsFileAccessMenu({
	url: () => props.setup.adminConsentUrl ?? '',
	organization: '',
});
const copyAdminConsentLink = async () => await onAdminConsentMenu('copy');

/**
 * Hands the setup to the manual flow, for the walls this one cannot climb: a
 * tenant that will not let this account register an app, or an account with no
 * Azure subscription. Both are someone else's rights to grant, and the manual
 * flow is the route that takes what they hand back.
 */
function useOwnMicrosoftApp() {
	props.runtime.setupKind.value = 'manual';
}

/**
 * The same move, made from the bot step, where it means something the ladder
 * is counting: the setup reached the rung n8n cannot pass for this account and
 * the user went to make the bot themselves. Leaving from the app step is a
 * different answer and is not reported here.
 */
function useOwnMicrosoftAppForBot() {
	void props.runtime.reportManualBotRoute();
	useOwnMicrosoftApp();
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
		if (unmounted) return;
		saveAs(blob, TEAMS_PACKAGE_FILENAME);
		installRoute.value = 'downloaded';
		persistChannel();
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
							:disabled="busy !== null"
							data-testid="teams-manager-credential-select"
							@credential-selected="selectSignIn"
							@new-credential="addSignIn"
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
				</div>

				<div v-else-if="step.id === 'connect'" :class="$style.stepContent">
					<div v-if="hasCredentials" :class="$style.credentialRow">
						<CredentialsDropdown
							:credential-options="credentialOptions"
							:selected-credential-id="selectedCredentialId"
							:permissions="credentialPermissions"
							:loading="loading"
							:disabled="busy !== null"
							data-testid="teams-manager-credential-select"
							@credential-selected="selectSignIn"
							@new-credential="addSignIn"
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
						icon="microsoft"
						:loading="busy === 'connect'"
						:disabled="loading || busy !== null"
						data-testid="teams-manager-connect"
						@click="connect(selectedCredentialId || undefined)"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.button') }}
					</N8nButton>
					<!--
						The one prompt that covers Graph and Azure together. A sign-in cannot:
						a code is redeemed for one resource at a time.
					-->
					<N8nText v-if="setup.adminConsentUrl && !connectFailed" size="small" color="text-light">
						{{ i18n.baseText('agents.channels.teams.managed.connect.adminConsent') }}
						<N8nLink
							theme="text"
							size="small"
							underline
							data-testid="teams-admin-consent"
							@click="copyAdminConsentLink"
						>
							{{ i18n.baseText('agents.channels.teams.managed.connect.adminConsentLink') }}
						</N8nLink>
					</N8nText>
					<N8nText
						v-if="connectFailed"
						size="small"
						color="danger"
						data-testid="teams-manager-error"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.failed') }}
						<N8nLink
							v-if="setup.adminConsentUrl"
							theme="danger"
							size="small"
							underline
							data-testid="teams-manager-error-admin-consent"
							@click="copyAdminConsentLink"
						>
							{{ i18n.baseText('agents.channels.teams.managed.connect.adminConsentLink') }}
						</N8nLink>
					</N8nText>
				</div>

				<div
					v-else-if="step.id === 'create-app' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<!-- No subscription for the bot that comes next. A tenant that will not
						let this account register the app links from the error instead. -->
					<N8nButton
						v-if="
							subscriptionsChecked && subscriptions.length === 0 && errorStepId !== 'create-app'
						"
						variant="ghost"
						size="small"
						data-testid="teams-use-own-app-from-app-step"
						@click="useOwnMicrosoftApp"
					>
						{{ i18n.baseText('agents.channels.teams.managed.useOwnApp') }}
					</N8nButton>
					<div :class="$style.actionWithProgress">
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
						<div :class="$style.actionWithProgress">
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
						</div>
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
							<N8nLink
								theme="danger"
								size="small"
								underline
								data-testid="teams-use-own-app-from-bot-step"
								@click="useOwnMicrosoftAppForBot"
								>{{
									i18n.baseText('agents.channels.teams.managed.createBot.noSubscriptionLink')
								}}</N8nLink
							>{{ i18n.baseText('agents.channels.teams.managed.createBot.noSubscriptionAfter') }}
						</N8nText>
					</template>
				</div>

				<div
					v-else-if="step.id === 'availability' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<AgentChannelTeamsAvailability v-model="availability" start-collapsed hide-file-access />
				</div>

				<div
					v-else-if="step.id === 'file-access' && statusOf[step.id] === 'active'"
					:class="$style.stepContent"
				>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.channels.teams.managed.fileAccess.hint') }}
					</N8nText>
					<N8nActionDropdown
						:items="fileAccessMenuItems"
						placement="bottom-start"
						:teleported="false"
						@select="onFileAccessMenu"
					>
						<template #activator>
							<N8nButton variant="outline" size="medium" data-testid="teams-file-access-menu">
								{{ i18n.baseText('agents.channels.teams.managed.fileAccess.button') }}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
					</N8nActionDropdown>
				</div>

				<div
					v-else-if="step.id === 'install' && statusOf[step.id] !== 'locked'"
					:class="$style.stepContent"
				>
					<N8nText
						v-if="installProgress"
						size="small"
						color="text-light"
						data-testid="teams-install-progress"
					>
						{{ installProgress }}
					</N8nText>

					<AgentChannelTeamsIdentityCard
						:name="identityName"
						:description="identityDescription"
						:tooltip="i18n.baseText('agents.channels.teams.managed.install.identityTooltip')"
						ready
					>
						<template #action>
							<!-- Outside the menu: its trigger lays the button out as flex, which
								pushes the loading spinner to the left edge. -->
							<N8nButton
								v-if="installProgress"
								variant="solid"
								size="medium"
								loading
								data-testid="teams-install-menu"
							>
								{{ i18n.baseText('agents.channels.teams.managed.install.menu') }}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
							<N8nActionDropdown
								v-else
								:items="installMenuItems"
								placement="bottom-end"
								:teleported="false"
								@select="onInstallMenu"
							>
								<template #menuItem="item">
									<AgentChannelTeamsOptionLabel
										:label="item.label"
										:description="item.description"
										:disabled="item.disabled"
									/>
								</template>
								<template #activator>
									<N8nButton
										variant="solid"
										size="medium"
										:disabled="busy !== null"
										data-testid="teams-install-menu"
									>
										{{ i18n.baseText('agents.channels.teams.managed.install.menu') }}
										<N8nIcon icon="chevron-down" size="small" />
									</N8nButton>
								</template>
							</N8nActionDropdown>
						</template>
					</AgentChannelTeamsIdentityCard>

					<!--
						Nothing is said about the catalogue while a call to it is in
						flight: what it last answered is about to be replaced, and
						"Microsoft has not listed the app yet" beside a publish that is
						still running reads as the answer to that publish.
					-->
					<template
						v-if="
							!installProgress &&
							catalogState &&
							(catalogState.status !== 'unknown' || hasPublished)
						"
					>
						<!--
							A review is a wall, not a status line: nobody can add the app
							until someone acts. The state the user can do nothing about
							stays quiet text.
						-->
						<N8nCallout
							v-if="catalogState.status === 'submitted'"
							theme="warning"
							data-testid="teams-catalog-state"
						>
							{{ i18n.baseText('agents.channels.teams.managed.install.submitted') }}
						</N8nCallout>
						<N8nText v-else size="small" color="text-light" data-testid="teams-catalog-state">
							{{ i18n.baseText(CATALOG_STATE_TEXT[catalogState.status]) }}
						</N8nText>
						<!-- Said here because the one-off fix is an administrator's to make. -->
						<N8nText
							v-if="catalogState.status === 'submitted'"
							size="small"
							color="text-light"
							data-testid="teams-catalog-submitted-why"
						>
							{{ i18n.baseText('agents.channels.teams.managed.install.submittedWhy') }}
						</N8nText>
						<N8nButton
							v-if="catalogState.status === 'submitted'"
							variant="ghost"
							size="small"
							data-testid="teams-copy-approval-request"
							@click="copyApprovalRequest"
						>
							{{
								i18n.baseText(
									requestCopied
										? 'agents.channels.teams.managed.install.approvalRequestCopied'
										: 'agents.channels.teams.managed.install.copyApprovalRequest',
								)
							}}
						</N8nButton>
					</template>
				</div>

				<!--
					The upload happens in the Teams client, so this step is what the
					user does there and then says they are finished with. n8n cannot
					see the upload, so nothing here claims it happened.
				-->
				<div v-else-if="step.id === 'finish'" :class="$style.stepContent">
					<template v-if="statusOf[step.id] === 'active'">
						<N8nText
							v-if="!awaitingCatalog"
							size="small"
							color="text-light"
							data-testid="teams-finish-upload-hint"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.hint') }}
						</N8nText>
						<!--
							One sentence with the action inside it. A button here carries
							its own padding, which pushes the line out of alignment with
							the paragraph above and reads as a second block.
						-->
						<N8nText v-else size="small" color="text-light" data-testid="teams-finish-sooner">
							{{ i18n.baseText('agents.channels.teams.managed.finish.soonerBefore') }}
							<N8nLink
								theme="text"
								size="small"
								underline
								data-testid="teams-finish-download-package"
								@click="downloadPackage"
							>
								{{ i18n.baseText('agents.channels.teams.managed.finish.soonerLink') }}
							</N8nLink>
							{{ i18n.baseText('agents.channels.teams.managed.finish.soonerAfter') }}
						</N8nText>
					</template>
					<N8nButton
						variant="outline"
						size="medium"
						:disabled="statusOf[step.id] !== 'active'"
						:loading="loading"
						data-testid="teams-managed-done"
						@click="emit('done')"
					>
						{{ i18n.baseText('agents.channels.teams.setup.install.done') }}
					</N8nButton>
				</div>

				<div
					v-else-if="statusOf[step.id] === 'locked'"
					:class="$style.stepContent"
					:data-testid="`teams-managed-preview-${step.id}`"
				>
					<div :class="$style.preview" inert>
						<N8nButton v-if="step.id === 'create-app'" variant="outline" size="medium" disabled>
							{{ i18n.baseText('agents.channels.teams.managed.createApp.button') }}
						</N8nButton>
						<N8nButton
							v-else-if="step.id === 'create-bot'"
							variant="outline"
							size="medium"
							disabled
						>
							{{ i18n.baseText('agents.channels.teams.managed.createBot.create') }}
						</N8nButton>
						<AgentChannelTeamsAvailability
							v-else-if="step.id === 'availability'"
							:model-value="availability"
							start-collapsed
							hide-file-access
						/>
						<N8nButton
							v-else-if="step.id === 'file-access'"
							variant="outline"
							size="medium"
							disabled
						>
							{{ i18n.baseText('agents.channels.teams.managed.fileAccess.button') }}
							<N8nIcon icon="chevron-down" size="small" />
						</N8nButton>
						<AgentChannelTeamsIdentityCard
							v-else-if="step.id === 'install'"
							:name="identityName"
							:description="identityDescription"
							ready
						>
							<template #action>
								<N8nButton variant="outline" size="medium" disabled>
									{{ i18n.baseText('agents.channels.teams.managed.install.menu') }}
									<N8nIcon icon="chevron-down" size="small" />
								</N8nButton>
							</template>
						</AgentChannelTeamsIdentityCard>
					</div>
					<N8nText
						v-if="reconnectRequired"
						size="small"
						color="text-light"
						:data-testid="`teams-managed-locked-${step.id}`"
					>
						{{ i18n.baseText('agents.channels.teams.managed.connect.lockedBySignIn') }}
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
					<N8nLink
						v-if="step.id === 'create-app'"
						theme="danger"
						size="small"
						underline
						data-testid="teams-use-own-app-from-app-step"
						@click="useOwnMicrosoftApp"
					>
						{{ i18n.baseText('agents.channels.teams.managed.useOwnApp') }}
					</N8nLink>
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

.preview {
	opacity: 0.45;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
}

/* The progress line sits beside the button and drops below it when narrow, as in the Assistant chat. */
.actionWithProgress {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs) var(--spacing--sm);
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

.field {
	width: 100%;
}
</style>
