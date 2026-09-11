import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { resetUserRegexEngine, safeRegex, safeUserRegex } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EncryptionBootstrapService } from '@/encryption/encryption-bootstrap.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { PostHogClient } from '@/posthog';
import { ShutdownService } from '@/shutdown/shutdown.service';

import { BaseCommand } from '../base-command';

class TestCommand extends BaseCommand {
	async run() {}
}

// `new RegExp` rejects PCRE2 recursion syntax, so `(?R)` tells the engines apart.
const PCRE2_ONLY_PATTERN = '\\((?:[^()]|(?R))*\\)';
const PCRE2_ONLY_SUBJECT = '(a(b))';

function expectPcre2Engine() {
	expect(safeUserRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toBe(true);
}

function expectDefaultEngine() {
	expect(() => safeUserRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toThrow();
	expect(safeUserRegex.test('a', 'a')).toBe(true);
}

const logger = mockInstance(Logger);

afterEach(() => {
	vi.resetAllMocks();
});

describe('logError', () => {
	const error = new Error('Something went wrong');
	error.stack = 'the stack';

	it('should log the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error);

		expect(logger.error.mock.calls.flat()).toEqual([
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});

	it('should log the summary before the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error, 'Error updating database.');

		expect(logger.error.mock.calls.flat()).toEqual([
			'Error updating database.',
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});
});

describe('needsRegexEngine wiring', () => {
	const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
	const dbConnection = mockInstance(DbConnection);
	const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
	mockInstance(EncryptionBootstrapService);
	mockInstance(MessageEventBus);
	const posthogClient = mockInstance(PostHogClient);
	const telemetryEventRelay = mockInstance(TelemetryEventRelay);
	mockInstance(ActivityEventRelay);
	mockInstance(WorkflowFailureNotificationEventRelay);
	mockInstance(ErrorReporter);
	mockInstance(ShutdownService);

	class RegexEngineCommand extends BaseCommand {
		needsRegexEngine = true;

		async run() {}
	}

	function stubEngine(overrides: Record<string, unknown> = {}) {
		return {
			test: vi.fn(),
			exec: vi.fn(),
			replace: vi.fn(),
			matchAll: vi.fn(),
			split: vi.fn(),
			dispose: vi.fn(),
			...overrides,
		};
	}

	function mockPcre2Module(exports: Record<string, unknown>) {
		vi.doMock('@n8n/regex-engine-pcre2', () => ({
			initPcre2Engine: vi.fn().mockResolvedValue(undefined),
			createPcre2RegexEngine: vi.fn().mockReturnValue(stubEngine()),
			...exports,
		}));
	}

	function setGlobalConfig(regexEngine?: { engine: 'js' | 'pcre2' }) {
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				taskRunners: {},
				nodes: {},
				expressionEngine: { engine: 'legacy' },
				generic: { gracefulShutdownTimeout: 30 },
				...(regexEngine ? { regexEngine } : {}),
			}),
		);
	}

	beforeEach(() => {
		loadNodesAndCredentials.init.mockResolvedValue(undefined);
		dbConnection.init.mockResolvedValue(undefined);
		dbConnection.migrate.mockResolvedValue(undefined);
		deploymentKeyRepository.findActiveByType.mockResolvedValue(null);
		deploymentKeyRepository.insertOrIgnore.mockResolvedValue(undefined);
		posthogClient.init.mockResolvedValue();
		telemetryEventRelay.init.mockResolvedValue();

		setGlobalConfig();
	});

	afterEach(() => {
		resetUserRegexEngine();
		vi.doUnmock('@n8n/regex-engine-pcre2');
		vi.resetModules();
	});

	it.each([
		{
			name: 'needsRegexEngine is false and no engine is configured',
			command: TestCommand,
			engine: undefined,
			assertEngine: expectDefaultEngine,
		},
		{
			name: 'needsRegexEngine is false and pcre2 is configured',
			command: TestCommand,
			engine: 'pcre2' as const,
			assertEngine: expectDefaultEngine,
		},
		{
			name: 'needsRegexEngine is true and js is configured',
			command: RegexEngineCommand,
			engine: 'js' as const,
			assertEngine: expectDefaultEngine,
		},
		{
			name: 'needsRegexEngine is true and pcre2 is configured',
			command: RegexEngineCommand,
			engine: 'pcre2' as const,
			assertEngine: expectPcre2Engine,
		},
	])('wires safeUserRegex correctly when $name', async ({ command, engine, assertEngine }) => {
		setGlobalConfig(engine ? { engine } : undefined);

		const cmd = new command();

		await cmd.init();

		assertEngine();
	});

	it('leaves n8n\'s own patterns on the default engine', async () => {
		setGlobalConfig({ engine: 'pcre2' });

		await new RegexEngineCommand().init();

		expectPcre2Engine();
		// `safeRegex` serves patterns n8n authored in the JS dialect, so selecting
		// pcre2 must not reach it.
		expect(() => safeRegex.test(PCRE2_ONLY_PATTERN, PCRE2_ONLY_SUBJECT)).toThrow();
	});

	it('honours the g/u/y flags configured for the pcre2 engine', async () => {
		setGlobalConfig({ engine: 'pcre2' });

		const cmd = new RegexEngineCommand();

		await cmd.init();

		// Without `jsFlags: ['g', 'u', 'y']`, pcre2 throws "Unsupported regex flag" here.
		expect(safeUserRegex.matchAll('a', 'aaa', 'g')).toHaveLength(3);
		expect(safeUserRegex.test('\\p{L}', 'é', 'u')).toBe(true);
		expect(safeUserRegex.exec('foo', 'xfoo', 'y')).toBeNull();
	});

	it('passes the configured operationTimeoutMs to the pcre2 engine constructor', async () => {
		// A real wall-clock budget has no fast deterministic outcome test, so pin the value.
		const createPcre2RegexEngine = vi.fn().mockReturnValue(stubEngine());
		mockPcre2Module({ createPcre2RegexEngine });

		setGlobalConfig({ engine: 'pcre2' });

		const cmd = new RegexEngineCommand();

		await cmd.init();

		expect(createPcre2RegexEngine).toHaveBeenCalledWith(
			expect.objectContaining({ operationTimeoutMs: 250 }),
		);
	});

	it.each([
		{
			name: 'loading the wasm module fails',
			exports: () => ({
				initPcre2Engine: vi.fn().mockRejectedValue(new Error('wasm failed to load')),
			}),
		},
		{
			name: 'the constructor rejects its options',
			exports: () => ({
				createPcre2RegexEngine: vi.fn().mockImplementation(() => {
					throw new Error('Unknown jsFlags entry: bogus');
				}),
			}),
		},
	])('crashes the process when $name', async ({ exports }) => {
		const exitSpy = vi
			// @ts-expect-error Protected method
			.spyOn(BaseCommand.prototype, 'exitWithCrash')
			.mockResolvedValue(undefined);
		mockPcre2Module(exports());
		setGlobalConfig({ engine: 'pcre2' });

		await new RegexEngineCommand().init();

		expect(exitSpy).toHaveBeenCalledWith(expect.stringContaining('PCRE2'), expect.any(Error));
	});

	it('disposes the pcre2 engine on a successful exit and leaves safeUserRegex usable', async () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const dispose = vi.fn();
		mockPcre2Module({ createPcre2RegexEngine: vi.fn().mockReturnValue(stubEngine({ dispose })) });

		setGlobalConfig({ engine: 'pcre2' });

		const cmd = new RegexEngineCommand();

		await cmd.init();
		// @ts-expect-error Protected method
		await cmd.exitSuccessFully();

		expect(exitSpy).toHaveBeenCalled();
		// Freeing the engine has no observable result, so assert the call itself.
		expect(dispose).toHaveBeenCalled();
		expectDefaultEngine();
	});

	it('exits successfully without error when the pcre2 engine was never initialized', async () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

		const cmd = new TestCommand();

		await cmd.init();

		// @ts-expect-error Protected method
		await expect(cmd.exitSuccessFully()).resolves.toBeUndefined();

		expect(exitSpy).toHaveBeenCalled();
		expectDefaultEngine();
	});
});
