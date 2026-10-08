import { createComponentRenderer } from '@/__tests__/render';
import type { TeamsManagedSetupState } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

const copySpy = vi.fn();

import AgentChannelTeamsManagedSetup from './AgentChannelTeamsManagedSetup.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./api', () => ({
	fetchTeamsAppPackage: vi.fn().mockResolvedValue(new Blob()),
}));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: copySpy }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

// The shared default is `data-test-id`; these components use `data-testid`.
configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentChannelTeamsManagedSetup);

const connectedCredential = {
	id: 'cred-1',
	name: 'Microsoft organization',
	connected: true,
	reconnectRequired: false,
	organizationName: 'Acme Corp',
	tenantId: 'tenant-1',
};

const setupState = (overrides: Partial<TeamsManagedSetupState> = {}): TeamsManagedSetupState => ({
	managedSetupAvailable: true,
	managerCredentials: [],
	adminConsentUrl: 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=x',
	...overrides,
});

const buildRuntime = (overrides: Partial<TeamsChannelRuntime> = {}): TeamsChannelRuntime => ({
	managedSetup: ref(setupState()),
	setupKind: ref('managed'),
	managerCredentialId: ref(''),
	loading: computed(() => false),
	load: vi.fn(),
	connectManagerCredential: vi.fn().mockResolvedValue(true),
	editManagerCredential: vi.fn(),
	provisionedApp: ref(null),
	botSetupState: ref(null),
	provisionedBot: ref(null),
	subscriptions: ref([]),
	installed: ref(false),
	provisionApp: vi.fn(),
	loadSubscriptions: vi.fn(),
	provisionBot: vi.fn(),
	checkInstalled: vi.fn().mockResolvedValue(false),
	...overrides,
});

const props = (overrides: Record<string, unknown> = {}) => {
	const { runtime, ...rest } = overrides as { runtime?: TeamsChannelRuntime };
	return {
		modelValue: '',
		setup: setupState(),
		loading: false,
		credentialPermissions: { create: true, update: true },
		projectId: 'project-1',
		agentId: 'agent-1',
		runtime: runtime ?? buildRuntime(),
		...rest,
	};
};

/**
 * The real menu hides its items behind a popper. Stubbed flat so a test can
 * click the route it means, the way the other dropdown tests here do.
 */
const stubs = {
	ActionDropdown: {
		name: 'ActionDropdown',
		template:
			'<div><slot name="activator" /><button v-for="item in items" :key="item.id" :data-testid="item.testId" @click="$emit(\'select\', item.id)">{{ item.label }}</button></div>',
		props: ['items', 'placement', 'teleported'],
		emits: ['select'],
	},
};

const render = (overrides: Record<string, unknown> = {}) =>
	renderComponent({ props: props(overrides), pinia: createTestingPinia(), global: { stubs } });

describe('AgentChannelTeamsManagedSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The install wait polls on a timer; anything that leaves them faked would
	// stall every test after it.
	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows all five steps of the recommended flow', () => {
		const { getByText } = render();

		expect(getByText('agents.channels.teams.managed.connect.title')).toBeVisible();
		expect(getByText('agents.channels.teams.managed.createApp.title')).toBeVisible();
		expect(getByText('agents.channels.teams.managed.createBot.title')).toBeVisible();
		expect(getByText('agents.channels.teams.setup.availability.title')).toBeVisible();
		expect(getByText('agents.channels.teams.managed.install.title')).toBeVisible();
	});

	it('offers a Microsoft sign-in when nothing is connected yet', () => {
		const { getByTestId, queryByTestId } = render();

		expect(getByTestId('teams-manager-connect')).toBeVisible();
		expect(queryByTestId('teams-manager-credential-select')).not.toBeInTheDocument();
	});

	/**
	 * A sign-in cannot ask for Graph and Azure together — a code is redeemed for
	 * one resource — so the single prompt covering both is the administrator
	 * consent, offered here.
	 */
	it('offers one administrator prompt covering both Microsoft APIs', () => {
		const { getByTestId } = render();

		expect(getByTestId('teams-admin-consent').getAttribute('href')).toContain('adminconsent');
	});

	it('offers no administrator prompt where the setup cannot run', () => {
		const { queryByTestId } = render({ setup: setupState({ adminConsentUrl: null }) });

		expect(queryByTestId('teams-admin-consent')).not.toBeInTheDocument();
	});

	it('tells the user what to do first on every step after Connect', () => {
		const { getByTestId } = render();

		expect(getByTestId('teams-managed-locked-create-app')).toHaveTextContent(
			'agents.channels.teams.managed.createApp.locked',
		);
		expect(getByTestId('teams-managed-locked-create-bot')).toBeVisible();
		expect(getByTestId('teams-managed-locked-availability')).toBeVisible();
		expect(getByTestId('teams-managed-locked-install')).toBeVisible();
	});

	it('collapses the Connect step to the organisation once signed in', async () => {
		const { getByTestId, queryByTestId } = render({
			modelValue: 'cred-1',
			setup: setupState({ managerCredentials: [connectedCredential] }),
		});

		await waitFor(() => {
			expect(getByTestId('teams-manager-organization')).toHaveTextContent(
				'agents.channels.teams.managed.connect.summary Acme Corp',
			);
		});
		expect(queryByTestId('teams-manager-connect')).not.toBeInTheDocument();
	});

	it('unlocks the next step once signed in', async () => {
		const { queryByTestId } = render({
			modelValue: 'cred-1',
			setup: setupState({ managerCredentials: [connectedCredential] }),
		});

		await waitFor(() => {
			expect(queryByTestId('teams-managed-locked-create-app')).not.toBeInTheDocument();
		});
		// The steps after it stay blocked until their own work is done.
		expect(queryByTestId('teams-managed-locked-create-bot')).toBeInTheDocument();
	});

	it('offers a picker when the project already has a sign-in', () => {
		const { getByTestId } = render({
			setup: setupState({
				managerCredentials: [{ ...connectedCredential, connected: false }],
			}),
		});

		expect(getByTestId('teams-manager-credential-select')).toBeVisible();
	});

	/**
	 * A sign-in can go stale after the steps that ran on it succeeded. The work
	 * already done stays done, but nothing may run on a sign-in that cannot be
	 * used -- including the question Azure is asked, which would otherwise wait
	 * for an answer nobody went to fetch.
	 */
	it('locks the rest behind a sign-in that has to be redone', async () => {
		const loadSubscriptions = vi.fn();
		const { getByTestId, queryByTestId } = render({
			modelValue: 'cred-1',
			setup: setupState({
				managerCredentials: [{ ...connectedCredential, reconnectRequired: true }],
			}),
			runtime: buildRuntime({
				loadSubscriptions,
				provisionedApp: ref({
					credentialId: 'bot-cred-1',
					appId: 'app-1',
					appName: 'Support Bot (n8n)',
					organizationName: 'Acme Corp',
					entraAppUrl: 'https://entra.microsoft.com/app-1',
					secretExpiresAt: '2028-09-17T00:00:00Z',
				}),
			}),
		});

		await waitFor(() =>
			expect(getByTestId('teams-managed-locked-create-bot')).toHaveTextContent(
				'agents.channels.teams.managed.connect.lockedBySignIn',
			),
		);
		// Never asked, so it must not claim to be asking.
		expect(loadSubscriptions).not.toHaveBeenCalled();
		expect(queryByTestId('teams-bot-checking')).not.toBeInTheDocument();
	});

	it('asks for a reconnect when the grant is missing a scope', async () => {
		const connectManagerCredential = vi.fn().mockResolvedValue(true);
		const { getByTestId } = render({
			modelValue: 'cred-1',
			setup: setupState({
				managerCredentials: [{ ...connectedCredential, reconnectRequired: true }],
			}),
			runtime: buildRuntime({ connectManagerCredential }),
		});

		expect(getByTestId('teams-manager-reconnect')).toBeVisible();

		await fireEvent.click(getByTestId('teams-manager-connect'));
		// Re-consents the same credential rather than creating a second one.
		await waitFor(() => expect(connectManagerCredential).toHaveBeenCalledWith('cred-1'));
	});

	it('signs in with a new credential when there is none to reuse', async () => {
		const connectManagerCredential = vi.fn().mockResolvedValue(true);
		const { getByTestId } = render({ runtime: buildRuntime({ connectManagerCredential }) });

		await fireEvent.click(getByTestId('teams-manager-connect'));

		await waitFor(() => expect(connectManagerCredential).toHaveBeenCalledWith(undefined));
	});

	it('reports a sign-in that did not finish', async () => {
		const { getByTestId } = render({
			runtime: buildRuntime({ connectManagerCredential: vi.fn().mockResolvedValue(false) }),
		});

		await fireEvent.click(getByTestId('teams-manager-connect'));

		await waitFor(() => {
			expect(getByTestId('teams-manager-error')).toHaveTextContent(
				'agents.channels.teams.managed.connect.failed',
			);
		});
	});

	it('reports a sign-in that threw', async () => {
		const { getByTestId } = render({
			runtime: buildRuntime({
				connectManagerCredential: vi.fn().mockRejectedValue(new Error('popup blocked')),
			}),
		});

		await fireEvent.click(getByTestId('teams-manager-connect'));

		// A thrown sign-in reports what actually failed, rather than the generic
		// "did not finish" that a plain `false` gets — and it reports it at the
		// Connect step rather than at the foot of the stepper.
		await waitFor(() =>
			expect(getByTestId('teams-managed-error-connect')).toHaveTextContent('popup blocked'),
		);
	});

	describe('the steps after Connect', () => {
		const signedIn = (overrides: Partial<Parameters<typeof buildRuntime>[0]> = {}) => ({
			modelValue: 'cred-1',
			setup: setupState({ managerCredentials: [connectedCredential] }),
			runtime: buildRuntime(overrides),
		});

		/**
		 * The last step often waits on Microsoft for hours, so leaving is the
		 * ordinary ending. A Done button at the foot of the stepper sits below the
		 * fold and under the scrollbar, so the modal draws it in its own footer
		 * and this only reports when one is due.
		 */
		it('leaves the Done button to the modal footer', async () => {
			const Host = defineComponent({
				components: { AgentChannelTeamsManagedSetup },
				props: { hostProps: { type: Object, required: true } },
				setup: () => ({ view: ref<{ canFinish?: boolean }>() }),
				template: `
					<div>
						<AgentChannelTeamsManagedSetup ref="view" v-bind="hostProps" />
						<span data-testid="can-finish">{{ String(view?.canFinish) }}</span>
					</div>
				`,
			});
			const hostProps = props(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
				}),
			);
			const { getByTestId, queryByTestId } = createComponentRenderer(Host, {
				global: { stubs },
			})({ props: { hostProps }, pinia: createTestingPinia() });

			await waitFor(() => expect(getByTestId('can-finish')).toHaveTextContent('false'));

			// Handing over the package is what persists the channel here.
			await fireEvent.click(getByTestId('teams-install-download-package'));

			await waitFor(() => expect(getByTestId('can-finish')).toHaveTextContent('true'));
			// The stepper never draws one itself, at any point.
			expect(queryByTestId('teams-managed-done')).not.toBeInTheDocument();
		});

		/**
		 * A failure reported at the foot of the stepper sits below the fold, so the
		 * step just looked like a spinner that stopped.
		 */
		/**
		 * Running the setup again over an app Microsoft already lists finishes
		 * the step without this component publishing or handing over anything.
		 * Without a Done button there was no way to bind the credential, so the
		 * channel could not be saved to the agent at all.
		 */
		it('offers Done when the step was already finished elsewhere', async () => {
			const Host = defineComponent({
				components: { AgentChannelTeamsManagedSetup },
				props: { hostProps: { type: Object, required: true } },
				setup: () => ({ view: ref<{ canFinish?: boolean }>() }),
				template: `
					<div>
						<AgentChannelTeamsManagedSetup ref="view" v-bind="hostProps" />
						<span data-testid="can-finish">{{ String(view?.canFinish) }}</span>
					</div>
				`,
			});
			const hostProps = props(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
					installed: ref(true),
				}),
			);
			const { getByTestId } = createComponentRenderer(Host, { global: { stubs } })({
				props: { hostProps },
				pinia: createTestingPinia(),
			});

			await waitFor(() => expect(getByTestId('can-finish')).toHaveTextContent('true'));
		});

		/** Done saves what the view holds, so it has to hold the credential. */
		it('hands over the credential without waiting to be told to save', async () => {
			const { emitted } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
					installed: ref(true),
				}),
			);

			await waitFor(() => expect(emitted().provisioned).toEqual([['bot-cred-1']]));
			// Saving is the Done button's job, not something the open does.
			expect(emitted().persist).toBeUndefined();
		});

		it('reports a failed step beside that step', async () => {
			const provisionApp = vi
				.fn()
				.mockRejectedValue(
					new Error('This Microsoft sign-in is no longer valid. Sign in again to continue.'),
				);
			const { getByTestId, queryByTestId } = render(signedIn({ provisionApp }));

			await fireEvent.click(getByTestId('teams-create-app'));

			await waitFor(() =>
				expect(getByTestId('teams-managed-error-create-app')).toHaveTextContent('no longer valid'),
			);
			// Not duplicated at the foot of the stepper.
			expect(queryByTestId('teams-managed-error')).not.toBeInTheDocument();
		});

		/**
		 * Nothing about the answer depends on the app, and an account that cannot
		 * reach a subscription cannot finish here. Asking at sign-in is what lets
		 * the app step say so before it registers anything.
		 */
		/**
		 * A tenant that will not let this account register an app is the other
		 * wall this step can hit, and the way past it is the same: somebody with
		 * the rights hands over a registration, and the manual flow takes it.
		 */
		it('offers the manual flow when the app cannot be registered', async () => {
			const runtime = buildRuntime({
				provisionApp: vi
					.fn()
					.mockRejectedValue(
						new Error('This account is not allowed to register applications in the organisation.'),
					),
			});
			const { getByTestId } = render({
				modelValue: 'cred-1',
				setup: setupState({ managerCredentials: [connectedCredential] }),
				runtime,
			});

			await fireEvent.click(getByTestId('teams-create-app'));

			await waitFor(() => expect(getByTestId('teams-managed-error-create-app')).toBeVisible());
			await fireEvent.click(getByTestId('teams-use-own-app-from-app-step'));
			expect(runtime.setupKind.value).toBe('manual');
		});

		it('looks for a subscription on sign-in, before anything is created', async () => {
			const loadSubscriptions = vi.fn();
			const provisionApp = vi.fn();
			render(signedIn({ provisionApp, loadSubscriptions }));

			await waitFor(() => expect(loadSubscriptions).toHaveBeenCalled());
			expect(provisionApp).not.toHaveBeenCalled();
		});

		/**
		 * The app, the bot and the subscriptions all belong to the tenant that was
		 * signed in to. Keeping them across a change of sign-in would offer the bot
		 * step a subscription the new account cannot use.
		 */
		it('forgets what the previous sign-in produced when the account changes', async () => {
			const otherCredential = { ...connectedCredential, id: 'cred-2', name: 'Other organization' };
			const runtime = buildRuntime({
				subscriptions: ref([{ id: 'sub-1', name: 'Production' }]),
				provisionedApp: ref({
					credentialId: 'bot-cred-1',
					appId: 'app-1',
					appName: 'Support Bot (n8n)',
					organizationName: 'Acme Corp',
					entraAppUrl: 'https://entra.microsoft.com/app-1',
					secretExpiresAt: '2028-09-17T00:00:00Z',
				}),
			});
			const { rerender } = render({
				modelValue: 'cred-1',
				setup: setupState({ managerCredentials: [connectedCredential, otherCredential] }),
				runtime,
			});
			await waitFor(() => expect(runtime.loadSubscriptions).toHaveBeenCalledTimes(1));

			await rerender(
				props({
					modelValue: 'cred-2',
					setup: setupState({ managerCredentials: [connectedCredential, otherCredential] }),
					runtime,
				}),
			);

			await waitFor(() => expect(runtime.subscriptions.value).toEqual([]));
			expect(runtime.provisionedApp.value).toBeNull();
			expect(runtime.loadSubscriptions).toHaveBeenCalledTimes(2);
		});

		/** The subscription is the bot step's problem, and it says so there. */
		it('says nothing about Azure before the app is registered', async () => {
			const { getByTestId, queryByTestId } = render(signedIn({ subscriptions: ref([]) }));

			await waitFor(() => expect(getByTestId('teams-create-app')).toBeVisible());
			expect(queryByTestId('teams-app-needs-azure')).not.toBeInTheDocument();
		});

		it('offers a subscription picker when Azure has one to use', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([{ id: 'sub-1', name: 'Production' }]),
				}),
			);

			await waitFor(() => expect(getByTestId('teams-bot-subscription')).toBeVisible());
			expect(getByTestId('teams-create-bot')).toBeVisible();
		});

		it('pre-selects a subscription, so the picker never reads as an unfinished step', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([
						{ id: 'sub-1', name: 'Production' },
						{ id: 'sub-2', name: 'Sandbox' },
					]),
				}),
			);

			// Selected, so the create button is usable without touching the picker.
			await waitFor(() => expect(getByTestId('teams-create-bot')).not.toBeDisabled());
		});

		/**
		 * Reopening a setup whose app already exists puts the bot step on screen
		 * with no run in flight. Without asking Azure first it would show the
		 * no-subscription fallback and then correct itself, which reads as a bug.
		 */
		it('asks Azure before deciding anything, on a setup reopened later', async () => {
			// Held open, so the state before Azure answers is observable at all.
			let answer: () => void = () => {};
			const loadSubscriptions = vi.fn(
				async () => await new Promise<void>((resolve) => (answer = resolve)),
			);
			const { getByTestId, queryByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([]),
					loadSubscriptions,
				}),
			);

			await waitFor(() => expect(loadSubscriptions).toHaveBeenCalled());

			// Nothing claimed about subscriptions until Azure has answered.
			expect(getByTestId('teams-bot-checking')).toBeVisible();
			expect(queryByTestId('teams-bot-no-subscription')).not.toBeInTheDocument();

			answer();
			await waitFor(() => expect(getByTestId('teams-bot-no-subscription')).toBeVisible());
		});

		/**
		 * A sign-in that never covered Azure answers the same way as an account
		 * with nothing in it. Reporting the refusal as "no subscription" sends the
		 * user off to build a bot by hand over a sign-in they could just redo.
		 */
		it('reports a refused Azure lookup instead of inventing an empty account', async () => {
			const loadSubscriptions = vi
				.fn()
				.mockRejectedValue(
					new Error('This Microsoft sign-in is no longer valid. Sign in again to continue.'),
				);
			const { getByTestId, queryByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([]),
					loadSubscriptions,
				}),
			);

			await waitFor(() =>
				expect(getByTestId('teams-managed-error-create-bot')).toHaveTextContent('no longer valid'),
			);
			expect(queryByTestId('teams-bot-no-subscription')).not.toBeInTheDocument();
		});

		/**
		 * Azure is the only place left that registers a bot, so this account cannot
		 * reach the end of the recommended setup. It is told which access would
		 * unblock it, and offered the manual flow instead.
		 */
		it('stops at the bot step when there is no subscription', async () => {
			const { getByTestId, queryByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([]),
					botSetupState: ref({
						messagingEndpointUrl: 'https://n8n.example.com/webhook',
						botId: 'app-1',
						deployToAzureUrl: 'https://portal.azure.com/template',
						credentialClaimedBy: null,
						defaultDisplayName: 'Support Bot',
						defaultDescription: 'An agent',
					}),
				}),
			);

			await waitFor(() => expect(getByTestId('teams-bot-no-subscription')).toBeVisible());
			expect(getByTestId('teams-bot-no-subscriptions-select')).toBeVisible();
			expect(getByTestId('teams-use-own-app-from-bot-step')).toBeVisible();
			expect(queryByTestId('teams-create-bot')).not.toBeInTheDocument();
			// Microsoft stopped allowing new Bot Channels Registrations, so the
			// portal that used to make one without Azure cannot any more.
			expect(queryByTestId('teams-bot-dev-portal')).not.toBeInTheDocument();
			// Nothing here finishes the bot, so the step after it stays out of reach.
			expect(queryByTestId('teams-install-download-package')).not.toBeInTheDocument();
		});

		it('warns that an administrator may have blocked custom uploads', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
				}),
			);

			// Only once the upload is the thing being attempted.
			await waitFor(() => expect(getByTestId('teams-install-download-package')).toBeVisible());
			await fireEvent.click(getByTestId('teams-install-download-package'));

			await waitFor(() => expect(getByTestId('teams-install-upload-blocked')).toBeVisible());
		});

		/** Nothing else asserts the button actually provisions what was chosen. */
		it('creates the bot against the subscription the user picked', async () => {
			const provisionBot = vi.fn();
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					subscriptions: ref([{ id: 'sub-1', name: 'Production' }]),
					provisionBot,
				}),
			);

			await waitFor(() => expect(getByTestId('teams-create-bot')).toBeVisible());
			await fireEvent.click(getByTestId('teams-create-bot'));

			await waitFor(() => expect(provisionBot).toHaveBeenCalledWith('sub-1'));
		});

		it('keeps the availability panel editable once the bot is up', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
				}),
			);

			// Settings stay editable once the bot is up, and the install step opens
			// beside them rather than behind a gate.
			await waitFor(() => expect(getByTestId('teams-availability')).toBeVisible());
			expect(getByTestId('teams-install-download-package')).toBeVisible();
		});

		// The secret's expiry belongs to the connected channel's settings, not here:
		// at this point it is years away and says nothing about whether setup worked.
		it('names the app and links to it in Entra once created', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
				}),
			);

			await waitFor(() =>
				expect(getByTestId('teams-app-summary')).toHaveTextContent(
					'agents.channels.teams.managed.createApp.summary Acme Corp',
				),
			);
			const link = getByTestId('teams-app-entra-link');
			expect(link).toHaveAttribute('href', 'https://entra.microsoft.com/app-1');
			// Carries the design system's own small size, so it matches the line it
			// sits beside instead of shouting over it.
			expect(link.tagName).toBe('A');
			expect(link.className).toMatch(/size-small/);
		});

		it('names the bot once Azure has created it', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
				}),
			);

			await waitFor(() =>
				expect(getByTestId('teams-bot-summary')).toHaveTextContent('support-bot-1'),
			);
		});

		it('offers the same availability controls as the manual setup', async () => {
			const { getByTestId, queryByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
				}),
			);

			// The manual stepper's own component, not a second copy of the choices,
			// and collapsed to its summary exactly as the manual one is.
			await waitFor(() => expect(getByTestId('teams-availability')).toBeVisible());
			expect(queryByTestId('teams-scope-channels')).not.toBeInTheDocument();

			await fireEvent.click(
				within(getByTestId('teams-availability')).getByLabelText(
					'Toggle agents.channels.teams.setup.availability.whereTitle',
				),
			);

			await waitFor(() => expect(getByTestId('teams-scope-channels')).toBeVisible());
			expect(getByTestId('teams-scope-groups')).toBeVisible();
		});

		/**
		 * The upload happens in the Teams client, so nothing reaches n8n when it
		 * does. Asking Microsoft is the only way the step can close honestly.
		 */
		it('closes the step on an upload it confirms with Microsoft', async () => {
			const installed = ref(false);
			const checkInstalled = vi.fn(async () => {
				installed.value = true;
				return true;
			});
			const { getByTestId, queryByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
					installed,
					checkInstalled,
				}),
			);

			vi.useFakeTimers({ shouldAdvanceTime: true });
			// Downloading starts the wait; the install Microsoft reports closes it.
			await waitFor(() => expect(getByTestId('teams-install-download-package')).toBeVisible());
			await fireEvent.click(getByTestId('teams-install-download-package'));
			await waitFor(() => expect(getByTestId('teams-install-waiting')).toBeVisible());

			// The wait is the whole step while it runs: a card still offering the
			// download argues with a row saying the upload is being watched for.
			expect(queryByTestId('teams-identity')).not.toBeInTheDocument();
			// The hints stay: they are what to do while it is being waited for.
			expect(getByTestId('teams-install-upload-blocked')).toBeVisible();

			// Driven by the poll alone: setting `installed` here would show the done
			// state even if the wait stopped without ever asking Microsoft.
			await vi.advanceTimersByTimeAsync(3000);

			await waitFor(() => expect(getByTestId('teams-install-done')).toBeVisible());
			expect(queryByTestId('teams-install-waiting')).not.toBeInTheDocument();
		});

		it('offers a way out when the app never turns up', async () => {
			const { getByTestId } = render(
				signedIn({
					provisionedApp: ref({
						credentialId: 'bot-cred-1',
						appId: 'app-1',
						appName: 'Support Bot (n8n)',
						organizationName: 'Acme Corp',
						entraAppUrl: 'https://entra.microsoft.com/app-1',
						secretExpiresAt: '2028-09-17T00:00:00Z',
					}),
					provisionedBot: ref({
						botName: 'support-bot-1',
						resourceGroup: 'n8n-agents',
						subscriptionId: 'sub-1',
					}),
					checkInstalled: vi.fn().mockResolvedValue(false),
				}),
			);

			vi.useFakeTimers({ shouldAdvanceTime: true });
			await waitFor(() => expect(getByTestId('teams-install-download-package')).toBeVisible());
			await fireEvent.click(getByTestId('teams-install-download-package'));
			await waitFor(() => expect(getByTestId('teams-install-waiting')).toBeVisible());

			// Nothing arrives, so the wait eventually says so and offers a way out.
			await vi.advanceTimersByTimeAsync(20000);
			await waitFor(() => expect(getByTestId('teams-install-skip')).toBeVisible());

			await fireEvent.click(getByTestId('teams-install-skip'));
			await waitFor(() => expect(getByTestId('teams-install-skipped')).toBeVisible());
		});

		/**
		 * No Azure subscription is a wall this flow cannot climb, and the manual
		 * flow is the one that takes what an admin hands back. Offering the switch
		 * beside the warning beats leaving the user to find the header picker.
		 */
		it('offers the manual flow when the bot cannot be created here', async () => {
			const runtime = buildRuntime({
				provisionedApp: ref({
					credentialId: 'bot-cred-1',
					appId: 'app-1',
					appName: 'Support Bot (n8n)',
					organizationName: 'Acme Corp',
					entraAppUrl: 'https://entra.microsoft.com/app-1',
					secretExpiresAt: '2028-09-17T00:00:00Z',
				}),
				subscriptions: ref([]),
			});
			const { getByTestId } = render({
				modelValue: 'cred-1',
				setup: setupState({ managerCredentials: [connectedCredential] }),
				runtime,
			});

			await waitFor(() => expect(getByTestId('teams-use-own-app-from-bot-step')).toBeVisible());
			await fireEvent.click(getByTestId('teams-use-own-app-from-bot-step'));

			expect(runtime.setupKind.value).toBe('manual');
		});
	});

	it('selects a connected sign-in by itself', async () => {
		const { emitted } = render({
			setup: setupState({
				managerCredentials: [
					{ ...connectedCredential, id: 'cred-unconnected', connected: false },
					connectedCredential,
				],
			}),
		});

		await waitFor(() => {
			expect(emitted()['update:modelValue']).toEqual([['cred-1']]);
		});
	});
});
