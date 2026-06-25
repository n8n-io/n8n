/* eslint-disable import-x/order */
import type * as SharedSandboxMod from '@n8n/agents/sandbox';
import type { Mock } from 'vitest';

// The Daytona SDK is consumed in source via `loadDaytona()` (which `require()`s
// @daytona/sdk — a path the test runner can't resolve in this monorepo), so we
// mock the shared sandbox module. The mock classes live in vi.hoisted
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

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof SharedSandboxMod>()),
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

const SNAPSHOT_NAME = 'n8n/instance-ai:1.123.0';
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
		expect(stagingDir).toContain('n8n-snapshot-context-1.123.0');
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

	it('uses a content-hash cache key when no n8n version is configured', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);

		const image = await manager.ensureImage();
		const stagingDir = image.contextList[0]?.sourcePath;

		expect(stagingDir).toBeDefined();
		expect(stagingDir).not.toContain('n8n-snapshot-context-temp-');
		expect(stagingDir).toMatch(/n8n-snapshot-context-.+-/);
	});

	it('uses the same snapshot name regardless of runtime skills hash', async () => {
		const daytonaA = makeFakeDaytona();
		const daytonaB = makeFakeDaytona();
		daytonaA.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytonaB.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		const managerA = new SnapshotManager(
			undefined,
			NOOP_LOGGER,
			'1.123.0',
			createRuntimeSkillSource(SKILLS_HASH_A),
		);
		const managerB = new SnapshotManager(
			undefined,
			NOOP_LOGGER,
			'1.123.0',
			createRuntimeSkillSource(SKILLS_HASH_B),
		);

		const snapshotA = await managerA.createSnapshot(daytonaA as never);
		const snapshotB = await managerB.createSnapshot(daytonaB as never);

		expect(snapshotA).toBe(SNAPSHOT_NAME);
		expect(snapshotB).toBe(SNAPSHOT_NAME);
	});

	it('keeps the snapshot name stable when the base image changes', async () => {
		const daytonaA = makeFakeDaytona();
		const daytonaB = makeFakeDaytona();
		daytonaA.snapshot.create.mockResolvedValue({ name: 'ignored-a' });
		daytonaB.snapshot.create.mockResolvedValue({ name: 'ignored-b' });
		const managerA = new SnapshotManager(
			'daytonaio/sandbox:0.5.0',
			NOOP_LOGGER,
			'1.123.0',
			createRuntimeSkillSource(SKILLS_HASH_A),
		);
		const managerB = new SnapshotManager(
			'node:24',
			NOOP_LOGGER,
			'1.123.0',
			createRuntimeSkillSource(SKILLS_HASH_A),
		);

		const snapshotA = await managerA.createSnapshot(daytonaA as never);
		const snapshotB = await managerB.createSnapshot(daytonaB as never);

		expect(snapshotA).toBe(SNAPSHOT_NAME);
		expect(snapshotB).toBe(SNAPSHOT_NAME);
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

		expect(result).toBe(SNAPSHOT_NAME);
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		const callArgs = daytona.snapshot.create.mock.calls[0][0];
		expect(callArgs.name).toBe(SNAPSHOT_NAME);
		expect(callArgs.image).toBeDefined();
	});

	it('treats 409 conflict as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toBe(SNAPSHOT_NAME);
	});

	it('treats messages mentioning "already exists" as success', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot with this name already exists', 400),
		);

		const result = await manager.createSnapshot(daytona as never);

		expect(result).toBe(SNAPSHOT_NAME);
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
		expect(snapshotParams.name).toBe(SNAPSHOT_NAME);
		expect(options).toMatchObject({ timeout: 1800, onLogs });
	});
});

describe('SnapshotManager.snapshotName', () => {
	it('returns null when no version is configured', () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, undefined);

		expect(manager.snapshotName()).toBeNull();
	});

	it('returns the versioned snapshot name', () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');

		expect(manager.snapshotName()).toBe(SNAPSHOT_NAME);
	});
});
