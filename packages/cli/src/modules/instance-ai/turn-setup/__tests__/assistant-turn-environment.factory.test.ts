import type { InstanceAiCredits } from '@n8n/api-types';
import { ModuleRegistry, type Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	isQuotaExhaustedError,
	WorkflowTaskCoordinator,
	type InstanceAiContext,
	type SandboxConfig,
} from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { QuotaExhaustedStreamError } from '../assistant-credits';
import { AssistantTurnEnvironmentFactory } from '../assistant-turn-environment.factory';
import type { AssistantTurnRuntime } from '../assistant-turn-runtime';

const user = { id: 'user-1' } as User;

type FactoryFields = Record<string, unknown>;

function createFactory(fields: FactoryFields): AssistantTurnEnvironmentFactory {
	return Object.assign(
		Object.create(AssistantTurnEnvironmentFactory.prototype) as AssistantTurnEnvironmentFactory,
		fields,
	);
}

function createSetupFactory() {
	const createContext = vi.fn((): InstanceAiContext => mock<InstanceAiContext>({}));
	const fields = {
		logger: { warn: vi.fn(), debug: vi.fn() },
		instanceAiConfig: {},
		aiConfig: {},
		oauth2CallbackUrl: 'http://localhost/rest/oauth2-credential/callback',
		defaultTimeZone: 'UTC',
		adapterService: {
			createContext,
			getNodeDefinitionDirs: vi.fn(() => []),
			resolveExperimentGates: vi.fn(async () => ({
				configEvalsEnabled: false,
				conversationHistoryEnabled: false,
				progressiveBuildingEnabled: false,
				conciseStyleEnabled: false,
				setupPanelEnabled: false,
				setupPanelVariant: 'control',
				folderExplorationEnabled: false,
				credentialDescriptionsEnabled: false,
				aiPreferencesEnabled: false,
				instanceContextEnabled: false,
				nodeUsageEnabled: false,
			})),
		},
		settingsService: {
			getAdminSettings: vi.fn(async () => ({ browserUseEnabled: false })),
			getPermissions: vi.fn(() => ({})),
			getSandboxStatus: vi.fn(() => ({ workflowBuilderAvailable: true })),
			isMcpAccessEnabled: vi.fn(() => false),
		},
		browserSessionService: { findMcpServer: vi.fn() },
		aiService: { isProxyEnabled: vi.fn(() => false) },
		instanceWriteAccess: { isReadOnly: vi.fn(() => false) },
		telemetry: { track: vi.fn() },
		evalCredentialAllowlists: {},
		modelService: {
			getCredits: vi.fn(async () => ({ creditsQuota: -1, creditsClaimed: 0 })),
			resolveAgentModelConfig: vi.fn(async () => 'anthropic/claude-sonnet'),
			resolveMemoryModelConfig: vi.fn(async () => undefined),
			getModelFetch: vi.fn(() => undefined),
		},
		creditService: { claimRunUsage: vi.fn() },
		instanceAiErrorReporter: {
			withBoundary: vi.fn(async (_c, _x, fn: () => unknown) => await fn()),
		},
		conversationHistoryService: {},
		aiUsageService: { isParameterValueSharingAllowed: vi.fn(async () => false) },
		skillsService: {
			loadSkills: vi.fn(async () => ({
				source: { registry: { skillsHash: 'hash', skills: [] }, loadSkill: vi.fn() },
				disabledTools: [],
			})),
		},
		areMcpConnectionsAvailable: () => false,
	};
	return { factory: createFactory(fields), fields };
}

function createRuntime(overrides: Partial<AssistantTurnRuntime> = {}): AssistantTurnRuntime {
	return {
		memory: mock<AssistantTurnRuntime['memory']>({
			getThread: vi.fn(async () => null),
		}),
		resourceId: 'user-1',
		getProjectId: vi.fn(async () => 'project-1'),
		eventBus: mock<AssistantTurnRuntime['eventBus']>(),
		turnState: {
			getBuildMode: vi.fn(() => 'progressive' as const),
			setBuildMode: vi.fn(),
			getPromptVersion: vi.fn(() => undefined),
			setPromptConfiguration: vi.fn(),
			setSetupPanelEnabled: vi.fn(),
			getBrowserUseAvailable: vi.fn(() => undefined),
			getObserverThresholdTokens: vi.fn(() => undefined),
		},
		sessionGrants: {
			load: vi.fn(async () => new Set(['tool:run'])),
			grant: vi.fn(async () => {}),
			revoke: vi.fn(async () => {}),
		},
		onDomainAccessTracker: vi.fn(),
		readSetupItemsSnapshots: vi.fn(async () => []),
		syncWorkflowTasks: vi.fn(async () => {}),
		sandbox: {
			resolveConfig: vi.fn(async () => ({ enabled: false }) as SandboxConfig),
			getOrCreateWorkspace: vi.fn(async () => undefined),
		},
		...overrides,
	};
}

describe('AssistantTurnEnvironmentFactory', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('create', () => {
		const params = {
			user,
			threadId: 'thread-1',
			runId: 'run-1',
			abortSignal: new AbortController().signal,
		};

		it('reads and stores the turn settings through the runtime', async () => {
			const { factory } = createSetupFactory();
			const runtime = createRuntime();

			const environment = await factory.create(params, runtime);

			expect(runtime.turnState.setSetupPanelEnabled).toHaveBeenCalledWith(false);
			expect(runtime.turnState.setBuildMode).toHaveBeenCalledWith('progressive');
			expect(runtime.turnState.setPromptConfiguration).toHaveBeenCalledWith(
				expect.objectContaining({ version: 'progressive@1' }),
			);
			expect(environment.orchestrationContext.promptConfiguration).toMatchObject({
				version: 'progressive@1',
			});
		});

		it('wires the runtime hooks into the contexts', async () => {
			const { factory } = createSetupFactory();
			const touchRun = vi.fn(() => true);
			const runtime = createRuntime({ touchRun });

			const { context, orchestrationContext } = await factory.create(params, runtime);

			expect(orchestrationContext.eventBus).toBe(runtime.eventBus);
			expect(orchestrationContext.touchRun).toBe(touchRun);
			expect(context.threadMemory).toBe(runtime.memory);
			expect(runtime.sessionGrants.load).toHaveBeenCalledTimes(1);
			expect(context.sessionApprovedToolKeys).toEqual(new Set(['tool:run']));
			expect(runtime.onDomainAccessTracker).toHaveBeenCalledWith(context.domainAccessTracker);
		});

		it('leaves out the optional hooks that a runtime does not supply', async () => {
			const { factory } = createSetupFactory();

			const { orchestrationContext } = await factory.create(params, createRuntime());

			expect(orchestrationContext.cancelBackgroundTask).toBeUndefined();
			expect(orchestrationContext.sendCorrectionToTask).toBeUndefined();
		});

		it('uses the workflow task coordinator directly when the runtime does not sync tasks', async () => {
			const { factory } = createSetupFactory();

			const { workflowTasks, orchestrationContext } = await factory.create(
				params,
				createRuntime({ syncWorkflowTasks: undefined }),
			);

			expect(workflowTasks).toBeInstanceOf(WorkflowTaskCoordinator);
			expect(orchestrationContext.workflowTaskService).toBe(workflowTasks);
		});

		it('syncs the workflow tasks after a workflow loop write', async () => {
			const { factory } = createSetupFactory();
			const runtime = createRuntime();

			const { workflowTasks } = await factory.create(params, runtime);
			await workflowTasks.updateBuildOutcome('work-item-1', {});

			expect(workflowTasks).not.toBeInstanceOf(WorkflowTaskCoordinator);
			expect(runtime.syncWorkflowTasks).toHaveBeenCalledTimes(1);
		});

		it('refuses a thread that another user owns', async () => {
			const { factory, fields } = createSetupFactory();
			const runtime = createRuntime({
				memory: mock<AssistantTurnRuntime['memory']>({
					getThread: vi.fn(async () => ({ resourceId: 'user-2' }) as never),
				}),
			});

			await expect(factory.create(params, runtime)).rejects.toThrow(
				'Not authorized for this thread',
			);
			expect(
				(fields.adapterService as { createContext: unknown }).createContext,
			).not.toHaveBeenCalled();
		});
	});

	describe('areMcpConnectionsAvailable', () => {
		it.each([
			{ moduleActive: true, accessEnabled: true, expected: true },
			{ moduleActive: false, accessEnabled: true, expected: false },
			{ moduleActive: true, accessEnabled: false, expected: false },
		])(
			'returns $expected when moduleActive=$moduleActive and accessEnabled=$accessEnabled',
			({ moduleActive, accessEnabled, expected }) => {
				const factory = createFactory({
					settingsService: { isMcpAccessEnabled: vi.fn(() => accessEnabled) },
				});
				vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
					if (token === ModuleRegistry) return { isActive: () => moduleActive };
					throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
				});

				expect(factory.areMcpConnectionsAvailable()).toBe(expected);
			},
		);
	});

	describe('assertAssistantCreditsAvailable', () => {
		function createCreditFactory(getCredits: () => Promise<InstanceAiCredits>) {
			const modelService = { getCredits: vi.fn(getCredits) };
			const factory = createFactory({ modelService, logger: { debug: vi.fn() } });
			return { factory, modelService };
		}

		it('fails the run with quota_exhausted before a model call when the balance is used up', async () => {
			const { factory, modelService } = createCreditFactory(async () => ({
				creditsQuota: 800,
				creditsClaimed: 800,
			}));

			const rejected = await factory.assertAssistantCreditsAvailable(user).then(
				() => undefined,
				(error: unknown) => error,
			);

			expect(rejected).toBeInstanceOf(QuotaExhaustedStreamError);
			expect(isQuotaExhaustedError(rejected)).toBe(true);
			expect(modelService.getCredits).toHaveBeenCalledTimes(1);
		});

		it('allows a run that still has credits', async () => {
			const { factory } = createCreditFactory(async () => ({
				creditsQuota: 800,
				creditsClaimed: 10,
			}));

			await expect(factory.assertAssistantCreditsAvailable(user)).resolves.toBeUndefined();
		});

		it('allows the unlimited-credits sentinel', async () => {
			const { factory } = createCreditFactory(async () => ({
				creditsQuota: -1,
				creditsClaimed: 0,
			}));

			await expect(factory.assertAssistantCreditsAvailable(user)).resolves.toBeUndefined();
		});

		it('allows the run when the balance cannot be read', async () => {
			const { factory } = createCreditFactory(async () => {
				throw new Error('service unavailable');
			});

			await expect(factory.assertAssistantCreditsAvailable(user)).resolves.toBeUndefined();
		});
	});

	describe('OAuth callback URL', () => {
		// Regression: the OAuth callback URL exposed to browser-assisted credential
		// setup must come from urlService.getInstanceBaseUrl() (which honors WEBHOOK_URL
		// on cloud), not from globalConfig.editorBaseUrl with a localhost fallback.
		it('builds the callback URL from urlService.getInstanceBaseUrl()', () => {
			const factory = new AssistantTurnEnvironmentFactory(
				mock<Logger>({ scoped: vi.fn() }),
				mock<GlobalConfig>({
					instanceAi: {},
					ai: {},
					generic: { timezone: 'UTC' },
					endpoints: { rest: 'rest' },
					editorBaseUrl: '',
				}),
				mock<UrlService>({ getInstanceBaseUrl: vi.fn(() => 'https://acme.example.com') }),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
			);

			expect(Reflect.get(factory, 'oauth2CallbackUrl')).toBe(
				'https://acme.example.com/rest/oauth2-credential/callback',
			);
		});
	});
});
