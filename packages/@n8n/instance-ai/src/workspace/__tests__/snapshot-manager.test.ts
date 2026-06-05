/* eslint-disable import-x/order */
import type { Mock } from 'vitest';

// The Daytona SDK is consumed in source via `loadDaytona()` (which `require()`s
// @daytonaio/sdk — a path the test runner can't resolve in this monorepo), so we
// mock the first-party `lazy-daytona` module. The mock classes live in vi.hoisted
// so they are shared between the mock factory and the test (`instanceof` checks in
// source must see the same DaytonaError the test constructs).
const { DaytonaError, DaytonaNotFoundError, Image } = vi.hoisted(() => {
	class DaytonaError extends Error {
		statusCode?: number;
		constructor(message: string, statusCode?: number) {
			super(message);
			this.name = 'DaytonaError';
			this.statusCode = statusCode;
		}
	}
	class DaytonaNotFoundError extends DaytonaError {
		constructor(message: string, statusCode = 404) {
			super(message, statusCode);
			this.name = 'DaytonaNotFoundError';
		}
	}
	class Image {
		dockerfile: string;
		contextList: Array<{ sourcePath: string; archivePath: string }>;
		constructor(base = 'node:20') {
			this.dockerfile = `FROM ${base}`;
			this.contextList = [];
		}
		static base(base: string) {
			return new Image(base);
		}
		addLocalDir(localPath: string, remotePath: string) {
			this.contextList.push({ sourcePath: localPath, archivePath: localPath });
			this.dockerfile += `\nCOPY ${localPath} ${remotePath}`;
			return this;
		}
		runCommands(...commands: string[]) {
			this.dockerfile += commands.map((command) => `\nRUN ${command}`).join('');
			return this;
		}
	}
	return { DaytonaError, DaytonaNotFoundError, Image };
});

vi.mock('../lazy-daytona', () => ({
	loadDaytona: () => ({ DaytonaError, DaytonaNotFoundError, Image }),
}));

vi.mock('../builder-templates-service', () => {
	class MockBuilderTemplatesService {
		getBundle = vi.fn().mockResolvedValue({ archive: null, version: null });
	}
	return {
		BuilderTemplatesService: MockBuilderTemplatesService,
		builderTemplatesOptionsFromEnv: vi.fn().mockReturnValue({}),
	};
});

import {
	RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
	type RuntimeSkillLinkedFiles,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Logger } from '../../logger';
import { SnapshotManager } from '../snapshot-manager';

const SNAPSHOT_NAME_PATTERN = /^n8n\/instance-ai:1\.123\.0-[a-f0-9]{12}-[a-f0-9]{12}$/;
const SKILLS_HASH_A = 'aaaaaaaaaaaa';
const SKILLS_HASH_B = 'bbbbbbbbbbbb';

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

interface CreateSnapshotParams {
	name: string;
	image: { dockerfile: string };
}

interface FakeSnapshotApi {
	get: Mock<(...args: [string]) => Promise<{ name: string }>>;
	create: Mock<(...args: [CreateSnapshotParams, unknown?]) => Promise<{ name: string }>>;
}

interface FakeDaytona {
	snapshot: FakeSnapshotApi;
}

function emptyLinkedFiles(): RuntimeSkillLinkedFiles {
	return {
		references: [],
		templates: [],
		scripts: [],
		assets: [],
		examples: [],
		other: [],
	};
}

function createRuntimeSkillSource(skillsHash: string): RuntimeSkillSource {
	return {
		registry: {
			schemaVersion: RUNTIME_SKILL_REGISTRY_SCHEMA_VERSION,
			skillsHash,
			skills: [
				{
					id: 'snapshot-skill',
					name: 'snapshot-skill',
					description: 'Snapshot skill',
					hash: skillsHash,
					linkedFiles: emptyLinkedFiles(),
				},
			],
		},
		loadSkill: async () =>
			await Promise.resolve({
				id: 'snapshot-skill',
				name: 'snapshot-skill',
				description: 'Snapshot skill',
				instructions: 'Use baked skills.',
			}),
	};
}

function makeFakeDaytona(): FakeDaytona {
	return {
		snapshot: {
			get: vi.fn<(...args: [string]) => Promise<{ name: string }>>(),
			create: vi.fn<(...args: [CreateSnapshotParams, unknown?]) => Promise<{ name: string }>>(),
		},
	};
}

async function knowledgeBaseHash(): Promise<string> {
	const { buildKnowledgeBaseWorkspaceBundle } = await import(
		'../../knowledge-base/materialize-knowledge-base'
	);
	return buildKnowledgeBaseWorkspaceBundle({ root: '/home/daytona/workspace' }).contentHash;
}

describe('SnapshotManager.ensureImage', () => {
	it('stages workspace files and builds a small COPY-based Daytona image descriptor', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');

		const image = await manager.ensureImage();

		expect(image.dockerfile).toContain('COPY');
		expect(image.dockerfile).toContain('/tmp/n8n-workspace-bake');
		expect(image.dockerfile).toContain('cp -a /tmp/n8n-workspace-bake/. /home/daytona/workspace/');
		expect(image.dockerfile).toContain(
			'mkdir -p /home/daytona/workspace/src /home/daytona/workspace/chunks /home/daytona/workspace/node-types',
		);
		expect(image.dockerfile).toContain('npm install --ignore-scripts');

		const stagingDir = image.contextList[0]?.sourcePath;
		expect(stagingDir).toBeDefined();
		await expect(
			readFile(join(stagingDir, 'skills/data-table-manager/SKILL.md'), 'utf-8'),
		).resolves.toContain('data-table');
		await expect(
			readFile(
				join(stagingDir, 'skills/data-table-manager/references/data-table-playbook.md'),
				'utf-8',
			),
		).resolves.toBeDefined();
		await expect(
			readFile(join(stagingDir, 'skills/registry.json'), 'utf-8'),
		).resolves.toBeDefined();
		await expect(
			readFile(join(stagingDir, 'skills/.manifest.json'), 'utf-8'),
		).resolves.toBeDefined();
		await expect(
			readFile(join(stagingDir, 'knowledge-base/best-practices/scheduling.md'), 'utf-8'),
		).resolves.toBeDefined();
		await expect(
			readFile(join(stagingDir, 'knowledge-base/best-practices/index.json'), 'utf-8'),
		).resolves.toBeDefined();
		await expect(
			readFile(join(stagingDir, 'knowledge-base/.manifest.json'), 'utf-8'),
		).resolves.toBeDefined();
	});

	it('changes the snapshot suffix when the runtime skills hash changes', async () => {
		const daytonaA = makeFakeDaytona();
		const daytonaB = makeFakeDaytona();
		daytonaA.snapshot.create.mockResolvedValue({ name: 'ignored-a' });
		daytonaB.snapshot.create.mockResolvedValue({ name: 'ignored-b' });
		const managerA = new SnapshotManager(
			undefined,
			NOOP_LOGGER,
			'1.123.0',
			undefined,
			createRuntimeSkillSource(SKILLS_HASH_A),
		);
		const managerB = new SnapshotManager(
			undefined,
			NOOP_LOGGER,
			'1.123.0',
			undefined,
			createRuntimeSkillSource(SKILLS_HASH_B),
		);

		const snapshotA = await managerA.createSnapshot(daytonaA as never);
		const snapshotB = await managerB.createSnapshot(daytonaB as never);

		expect(snapshotA).toMatch(SNAPSHOT_NAME_PATTERN);
		expect(snapshotB).toMatch(SNAPSHOT_NAME_PATTERN);
		expect(snapshotA).toBe(`n8n/instance-ai:1.123.0-${SKILLS_HASH_A}-${await knowledgeBaseHash()}`);
		expect(snapshotB).toBe(`n8n/instance-ai:1.123.0-${SKILLS_HASH_B}-${await knowledgeBaseHash()}`);
		expect(snapshotA).not.toBe(snapshotB);
	});

	it('keeps the snapshot suffix stable when the base image changes', async () => {
		const daytonaA = makeFakeDaytona();
		const daytonaB = makeFakeDaytona();
		daytonaA.snapshot.create.mockResolvedValue({ name: 'ignored-a' });
		daytonaB.snapshot.create.mockResolvedValue({ name: 'ignored-b' });
		const managerA = new SnapshotManager(
			'daytonaio/sandbox:0.5.0',
			NOOP_LOGGER,
			'1.123.0',
			undefined,
			createRuntimeSkillSource(SKILLS_HASH_A),
		);
		const managerB = new SnapshotManager(
			'node:24',
			NOOP_LOGGER,
			'1.123.0',
			undefined,
			createRuntimeSkillSource(SKILLS_HASH_A),
		);

		const snapshotA = await managerA.createSnapshot(daytonaA as never);
		const snapshotB = await managerB.createSnapshot(daytonaB as never);

		expect(snapshotA).toBe(`n8n/instance-ai:1.123.0-${SKILLS_HASH_A}-${await knowledgeBaseHash()}`);
		expect(snapshotB).toBe(snapshotA);
		expect(daytonaA.snapshot.create.mock.calls[0][0].image.dockerfile).toContain(
			'FROM daytonaio/sandbox:0.5.0',
		);
		expect(daytonaB.snapshot.create.mock.calls[0][0].image.dockerfile).toContain('FROM node:24');
	});
});

describe('SnapshotManager.createSnapshot', () => {
	it('returns the snapshot name on successful create', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		const callArgs = daytona.snapshot.create.mock.calls[0][0];
		expect(callArgs.name).toMatch(SNAPSHOT_NAME_PATTERN);
		expect(callArgs.image).toBeDefined();
	});

	it('treats 409 conflict as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
	});

	it('treats messages mentioning "already exists" as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot with this name already exists', 400),
		);

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
	});

	it('throws on transient errors', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('upstream 500', 500));

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow('upstream 500');
	});

	it('throws when no version is configured', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
		const daytona = makeFakeDaytona();

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow();
		expect(daytona.snapshot.create).not.toHaveBeenCalled();
	});

	it('forwards options to daytona.snapshot.create', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });
		const onLogs = vi.fn();

		await manager.createSnapshot(daytona as never, { timeout: 1800, onLogs });

		const [snapshotParams, options] = daytona.snapshot.create.mock.calls[0];
		expect(snapshotParams.name).toMatch(SNAPSHOT_NAME_PATTERN);
		expect(options).toMatchObject({ timeout: 1800, onLogs });
	});
});

describe('SnapshotManager.ensureSnapshot', () => {
	describe('when no version is provided', () => {
		it('returns null without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toBeNull();
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
			expect(daytona.snapshot.create).not.toHaveBeenCalled();
		});

		it('returns null in proxy mode without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'proxy');

			expect(result).toBeNull();
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
		});
	});

	describe('proxy mode', () => {
		it('returns the snapshot name without calling daytona', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();

			const result = await manager.ensureSnapshot(daytona as never, 'proxy');

			expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
			expect(daytona.snapshot.create).not.toHaveBeenCalled();
		});
	});

	describe('direct mode', () => {
		it('optimistically creates and returns the snapshot name', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.get).not.toHaveBeenCalled();
		});

		it('treats 409 conflict as success', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

			const result = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(result).toMatch(SNAPSHOT_NAME_PATTERN);
		});

		it('returns null and clears memoization on transient errors', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create
				.mockRejectedValueOnce(new DaytonaError('upstream 500', 500))
				.mockResolvedValueOnce({ name: 'n8n/instance-ai:1.123.0' });

			const first = await manager.ensureSnapshot(daytona as never, 'direct');
			const second = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(first).toBeNull();
			expect(second).toMatch(SNAPSHOT_NAME_PATTERN);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		});

		it('memoizes a successful create — does not call create twice', async () => {
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			await manager.ensureSnapshot(daytona as never, 'direct');
			const second = await manager.ensureSnapshot(daytona as never, 'direct');

			expect(second).toMatch(SNAPSHOT_NAME_PATTERN);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		});

		it('reports transient failures via the error reporter', async () => {
			const errorReporter = { error: vi.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			const error = new DaytonaError('upstream 500', 500);
			daytona.snapshot.create.mockRejectedValue(error);

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					tags: expect.objectContaining({ component: 'snapshot-manager' }) as unknown,
				}),
			);
		});

		it('does not report when create succeeds', async () => {
			const errorReporter = { error: vi.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockResolvedValue({ name: 'n8n/instance-ai:1.123.0' });

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('does not report 409/already-exists as an error', async () => {
			const errorReporter = { error: vi.fn() };
			const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0', errorReporter);
			const daytona = makeFakeDaytona();
			daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

			await manager.ensureSnapshot(daytona as never, 'direct');

			expect(errorReporter.error).not.toHaveBeenCalled();
		});
	});
});
