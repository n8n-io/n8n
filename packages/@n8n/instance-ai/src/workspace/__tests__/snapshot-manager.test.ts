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

interface FakeSnapshot {
	name: string;
	state: string;
	errorReason?: string;
	createdAt?: string;
	lastUsedAt?: string;
}

interface FakeSnapshotList {
	items: FakeSnapshot[];
	total: number;
	page: number;
	totalPages: number;
}

interface FakeSnapshotApi {
	get: Mock<(...args: [string]) => Promise<FakeSnapshot>>;
	create: Mock<(...args: [CreateSnapshotParams, unknown?]) => Promise<{ name: string }>>;
	list: Mock<(...args: [number?, number?]) => Promise<FakeSnapshotList>>;
	delete: Mock<(...args: [FakeSnapshot]) => Promise<void>>;
	activate: Mock<(...args: [FakeSnapshot]) => Promise<FakeSnapshot>>;
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
			get: vi
				.fn<(...args: [string]) => Promise<FakeSnapshot>>()
				.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'active' }),
			create: vi.fn<(...args: [CreateSnapshotParams, unknown?]) => Promise<{ name: string }>>(),
			list: vi
				.fn<(...args: [number?, number?]) => Promise<FakeSnapshotList>>()
				.mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 1 }),
			delete: vi.fn<(...args: [FakeSnapshot]) => Promise<void>>().mockResolvedValue(undefined),
			activate: vi
				.fn<(...args: [FakeSnapshot]) => Promise<FakeSnapshot>>()
				.mockImplementation(async (snapshot) => await Promise.resolve(snapshot)),
		},
	};
}

function snapshotPage(items: FakeSnapshot[], page = 1, totalPages = 1): FakeSnapshotList {
	return { items, total: items.length, page, totalPages };
}

function daysAgo(days: number): string {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** After a prune, lookups of deleted snapshots must 404 for the removal wait. */
function mockGetActiveOnlyFor(daytona: FakeDaytona, name: string): void {
	daytona.snapshot.get.mockImplementation(async (requested) => {
		if (requested !== name) throw new DaytonaNotFoundError(`Snapshot ${requested} not found`);
		return await Promise.resolve({ name, state: 'active' });
	});
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
		expect(image.dockerfile).toContain(
			'npm install --ignore-scripts --no-audit --no-fund --prefer-offline',
		);

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
		expect(daytona.snapshot.get).toHaveBeenCalledWith(SNAPSHOT_NAME);
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

	it('deletes an unusable snapshot, rebuilds once, and throws when the rebuild also fails', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		// Every build lands in a failed state; the record 404s while deleted.
		let record: FakeSnapshot | undefined = {
			name: SNAPSHOT_NAME,
			state: 'build_failed',
			errorReason: 'npm install exited 1',
		};
		daytona.snapshot.create.mockImplementation(async () => {
			record = { name: SNAPSHOT_NAME, state: 'build_failed', errorReason: 'npm install exited 1' };
			return await Promise.resolve({ name: SNAPSHOT_NAME });
		});
		daytona.snapshot.get.mockImplementation(async () => {
			if (!record) throw new DaytonaNotFoundError('removed');
			return await Promise.resolve(record);
		});
		daytona.snapshot.delete.mockImplementation(async () => {
			record = undefined;
			await Promise.resolve();
		});

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(manager.createSnapshot(daytona as never)).rejects.toThrow(
				`Versioned Daytona snapshot "${SNAPSHOT_NAME}" exists but is unusable (state: build_failed, reason: npm install exited 1)`,
			);
			await vi.runAllTimersAsync();
			await assertion;
			expect(daytona.snapshot.delete).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('deletes the failed record left by a concurrent operation and retries the create', async () => {
		// The 2.36.3 incident: the SDK's create poll saw the record land in `error`
		// with "An operation is already in progress for this resource" and threw a
		// synthesized DaytonaError without a statusCode. The failed record blocks
		// every retry until deleted (previously a manual step in the Daytona UI).
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		let record: FakeSnapshot | undefined;
		daytona.snapshot.create
			.mockImplementationOnce(async () => {
				await Promise.resolve();
				record = {
					name: SNAPSHOT_NAME,
					state: 'error',
					errorReason: 'An operation is already in progress for this resource',
				};
				throw new DaytonaError(
					`Failed to create snapshot. Name: ${SNAPSHOT_NAME} Reason: An operation is already in progress for this resource`,
				);
			})
			.mockImplementationOnce(async () => {
				record = { name: SNAPSHOT_NAME, state: 'active' };
				return await Promise.resolve({ name: SNAPSHOT_NAME });
			});
		daytona.snapshot.get.mockImplementation(async () => {
			if (!record) throw new DaytonaNotFoundError('removed');
			return await Promise.resolve(record);
		});
		daytona.snapshot.delete.mockImplementation(async () => {
			record = undefined;
			await Promise.resolve();
		});

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.delete).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('recovers a re-run blocked by a leftover failed record', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		let record: FakeSnapshot | undefined = {
			name: SNAPSHOT_NAME,
			state: 'error',
			errorReason: 'An operation is already in progress for this resource',
		};
		daytona.snapshot.create
			.mockImplementationOnce(async () => {
				await Promise.resolve();
				throw new DaytonaError('already exists', 409);
			})
			.mockImplementationOnce(async () => {
				record = { name: SNAPSHOT_NAME, state: 'active' };
				return await Promise.resolve({ name: SNAPSHOT_NAME });
			});
		daytona.snapshot.get.mockImplementation(async () => {
			if (!record) throw new DaytonaNotFoundError('removed');
			return await Promise.resolve(record);
		});
		daytona.snapshot.delete.mockImplementation(async () => {
			record = undefined;
			await Promise.resolve();
		});

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.delete).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('bounds failed-record cleanups and surfaces the create failure', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		let record: FakeSnapshot | undefined;
		// Every create attempt re-registers a record that lands in `error`.
		daytona.snapshot.create.mockImplementation(async () => {
			await Promise.resolve();
			record = {
				name: SNAPSHOT_NAME,
				state: 'error',
				errorReason: 'An operation is already in progress for this resource',
			};
			throw new DaytonaError(
				`Failed to create snapshot. Name: ${SNAPSHOT_NAME} Reason: An operation is already in progress for this resource`,
			);
		});
		daytona.snapshot.get.mockImplementation(async () => {
			if (!record) throw new DaytonaNotFoundError('removed');
			return await Promise.resolve(record);
		});
		daytona.snapshot.delete.mockImplementation(async () => {
			record = undefined;
			await Promise.resolve();
		});

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(manager.createSnapshot(daytona as never)).rejects.toThrow(
				/Failed to create snapshot/,
			);
			await vi.runAllTimersAsync();
			await assertion;
			// 1 initial attempt + 2 cleanup retries, then give up.
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(3);
			expect(daytona.snapshot.delete).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('waits for an existing snapshot that is still building', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));
		daytona.snapshot.get
			.mockResolvedValueOnce({ name: SNAPSHOT_NAME, state: 'building' })
			.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'active' });

		// Warm the image cache before faking timers; staging does real fs work.
		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.get).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('retries transient errors and throws after exhausting retries', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('upstream 500', 500));

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(manager.createSnapshot(daytona as never)).rejects.toThrow(
				'upstream 500',
			);
			await vi.runAllTimersAsync();
			await assertion;
			// 1 initial attempt + 3 transient retries
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(4);
		} finally {
			vi.useRealTimers();
		}
	});

	it('recovers when a transient error is followed by already-exists on retry', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create
			.mockRejectedValueOnce(new DaytonaError('<html>502 Bad Gateway</html>', 502))
			.mockRejectedValueOnce(new DaytonaError('already exists', 409));

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not retry non-transient errors', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('invalid image', 400));

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow('invalid image');
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
	});

	it('reactivates an existing inactive snapshot instead of failing', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));
		daytona.snapshot.get
			.mockResolvedValueOnce({ name: SNAPSHOT_NAME, state: 'inactive' })
			.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'active' });

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.activate).toHaveBeenCalledTimes(1);
			expect(daytona.snapshot.activate).toHaveBeenCalledWith(
				expect.objectContaining({ name: SNAPSHOT_NAME, state: 'inactive' }),
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('retries activation on a transient error at the next settle window', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));
		let polls = 0;
		daytona.snapshot.get.mockImplementation(
			async () =>
				// 8 inactive polls: attempt 1 fails on poll 1, the settle window
				// elapses over polls 2-7, attempt 2 succeeds on poll 8.
				await Promise.resolve({ name: SNAPSHOT_NAME, state: ++polls <= 8 ? 'inactive' : 'active' }),
		);
		daytona.snapshot.activate
			.mockRejectedValueOnce(new DaytonaError('<html>502 Bad Gateway</html>', 502))
			.mockImplementation(async (snapshot) => await Promise.resolve(snapshot));

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.activate).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('gives up after exhausting activation attempts on a stuck-inactive snapshot', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));
		daytona.snapshot.get.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'inactive' });

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(manager.createSnapshot(daytona as never)).rejects.toThrow(
				'remained inactive after 3 activation requests',
			);
			await vi.runAllTimersAsync();
			await assertion;
			expect(daytona.snapshot.activate).toHaveBeenCalledTimes(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('waits after requesting activation and times out if the snapshot stays inactive', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(new DaytonaError('already exists', 409));
		daytona.snapshot.get.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'inactive' });

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(
				manager.createSnapshot(daytona as never, { timeout: 1 }),
			).rejects.toThrow('Timed out waiting');
			await vi.runAllTimersAsync();
			await assertion;
			expect(daytona.snapshot.activate).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('bounds a hung status poll with the overall deadline', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		// A request that never settles (stalled transport, no error).
		daytona.snapshot.get.mockImplementation(async () => await new Promise<never>(() => {}));

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const assertion = expect(
				manager.createSnapshot(daytona as never, { timeout: 60 }),
			).rejects.toThrow('Timed out fetching state');
			await vi.runAllTimersAsync();
			await assertion;
		} finally {
			vi.useRealTimers();
		}
	});

	it('tolerates a transient error while polling snapshot state', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.get
			.mockRejectedValueOnce(new DaytonaError('<html>502 Bad Gateway</html>', 502))
			.mockResolvedValue({ name: SNAPSHOT_NAME, state: 'active' });

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			expect(daytona.snapshot.get).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
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

describe('SnapshotManager snapshot pruning', () => {
	it('prunes on quota exhaustion and retries the create once', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create
			.mockRejectedValueOnce(new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'))
			.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: 'n8n/instance-ai:1.122.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.120.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.119.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.118.0', state: 'inactive' },
			]),
		);
		mockGetActiveOnlyFor(daytona, SNAPSHOT_NAME);

		const result = await manager.createSnapshot(daytona as never, { retention: 2 });

		expect(result).toBe(SNAPSHOT_NAME);
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		// The count backstop evicts beyond the newest-3 floor.
		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toContain('n8n/instance-ai:1.119.0');
		expect(deletedNames).toContain('n8n/instance-ai:1.118.0');
	});

	it('waits for pruned snapshots to finish removing before retrying after a quota error', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create
			.mockRejectedValueOnce(new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'))
			.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: 'n8n/instance-ai:1.122.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.120.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.119.0', state: 'active' },
			]),
		);
		// The deleted snapshot lingers in `removing` before disappearing.
		daytona.snapshot.get.mockImplementation(async (requested) => {
			if (requested === SNAPSHOT_NAME)
				return await Promise.resolve({ name: SNAPSHOT_NAME, state: 'active' });
			if (daytona.snapshot.get.mock.calls.filter(([n]) => n === requested).length <= 1)
				return await Promise.resolve({ name: requested, state: 'removing' });
			throw new DaytonaNotFoundError(`Snapshot ${requested} not found`);
		});

		await manager.ensureImage();
		vi.useFakeTimers();
		try {
			const promise = manager.createSnapshot(daytona as never, { retention: 3 });
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toBe(SNAPSHOT_NAME);
			// The retry happened only after the pruned snapshot was gone.
			expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
			const removalPolls = daytona.snapshot.get.mock.calls.filter(
				([requested]) => requested === 'n8n/instance-ai:1.119.0',
			);
			expect(removalPolls.length).toBeGreaterThanOrEqual(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('throws the quota error when no retention is configured', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'),
		);

		await expect(manager.createSnapshot(daytona as never)).rejects.toThrow('quota exceeded');
		expect(daytona.snapshot.list).not.toHaveBeenCalled();
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
	});

	it('treats an explicit retention of 0 as pruning disabled on the quota path', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'),
		);

		await expect(manager.createSnapshot(daytona as never, { retention: 0 })).rejects.toThrow(
			'quota exceeded',
		);
		expect(daytona.snapshot.list).not.toHaveBeenCalled();
	});

	it('force-evicts the least-recently-used snapshot when quota is held below the retention window', async () => {
		// Foreign snapshots can exhaust the org quota while our own count is
		// within policy — the publish still needs one slot freed.
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create
			.mockRejectedValueOnce(new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'))
			.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: 'n8n/instance-ai:1.122.0', state: 'active', lastUsedAt: daysAgo(1) },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active', lastUsedAt: daysAgo(2) },
				{ name: 'n8n/instance-ai:1.120.0', state: 'active', lastUsedAt: daysAgo(3) },
				{ name: 'n8n/instance-ai:1.119.0', state: 'active', lastUsedAt: daysAgo(10) },
			]),
		);
		mockGetActiveOnlyFor(daytona, SNAPSHOT_NAME);

		const result = await manager.createSnapshot(daytona as never, { retention: 15 });

		expect(result).toBe(SNAPSHOT_NAME);
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(2);
		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.119.0']);
	});

	it('throws the quota error when pruning frees nothing', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockRejectedValue(
			new DaytonaError('Snapshot quota exceeded. Maximum allowed: 30'),
		);
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([{ name: 'n8n/instance-ai:1.122.0', state: 'active' }]),
		);

		await expect(manager.createSnapshot(daytona as never, { retention: 5 })).rejects.toThrow(
			'quota exceeded',
		);
		expect(daytona.snapshot.create).toHaveBeenCalledTimes(1);
		expect(daytona.snapshot.delete).not.toHaveBeenCalled();
	});

	it('enforces the count cap after a successful publish, sparing the newest versions and in-progress builds', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: 'n8n/instance-ai:1.122.0', state: 'active' },
				{ name: SNAPSHOT_NAME, state: 'active' },
				{ name: 'n8n/instance-ai:1.121.0', state: 'inactive' },
				{ name: 'n8n/instance-ai:1.121.0-abc123', state: 'active' },
				{ name: 'n8n/instance-ai:1.120.0', state: 'building' },
				{ name: 'someone-elses/snapshot:1.0.0', state: 'active' },
			]),
		);

		await manager.createSnapshot(daytona as never, { retention: 2 });

		// The newest 3 versions (1.123.0, 1.122.0, 1.121.0 — suffixed
		// 1.121.0-abc123 ranks below plain 1.121.0) are floor-protected; the
		// building and foreign snapshots are untouched.
		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.121.0-abc123']);
	});

	it('age-prunes snapshots unused beyond maxAgeDays, keeping recently used and floor-protected ones', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: SNAPSHOT_NAME, state: 'active', createdAt: daysAgo(0), lastUsedAt: daysAgo(0) },
				// Aged but within the newest-3 floor → kept.
				{
					name: 'n8n/instance-ai:1.122.0',
					state: 'active',
					createdAt: daysAgo(40),
					lastUsedAt: daysAgo(25),
				},
				// Created long ago but recently used → kept.
				{
					name: 'n8n/instance-ai:1.121.0',
					state: 'active',
					createdAt: daysAgo(30),
					lastUsedAt: daysAgo(2),
				},
				// Idle past the cutoff → pruned.
				{
					name: 'n8n/instance-ai:1.120.0',
					state: 'inactive',
					createdAt: daysAgo(40),
					lastUsedAt: daysAgo(25),
				},
				// No lastUsedAt → createdAt fallback → pruned.
				{ name: 'n8n/instance-ai:1.119.0', state: 'active', createdAt: daysAgo(25) },
			]),
		);

		await manager.createSnapshot(daytona as never, { maxAgeDays: 20 });

		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.120.0', 'n8n/instance-ai:1.119.0']);
	});

	it('does not let failed or suffixed snapshots consume rollback-floor slots', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: SNAPSHOT_NAME, state: 'active', lastUsedAt: daysAgo(0) },
				// Failed build: deleted, and must not occupy a floor slot.
				{ name: 'n8n/instance-ai:1.122.0', state: 'build_failed', lastUsedAt: daysAgo(1) },
				// Suffixed build: not a rollback target; aged out → pruned.
				{ name: 'n8n/instance-ai:1.121.0-pr1', state: 'active', lastUsedAt: daysAgo(25) },
				// Idle plain releases: floor-protected because the failed and
				// suffixed snapshots above don't count toward the newest-3 floor.
				{ name: 'n8n/instance-ai:1.120.0', state: 'active', lastUsedAt: daysAgo(25) },
				{ name: 'n8n/instance-ai:1.119.0', state: 'active', lastUsedAt: daysAgo(25) },
			]),
		);

		await manager.createSnapshot(daytona as never, { maxAgeDays: 20 });

		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.122.0', 'n8n/instance-ai:1.121.0-pr1']);
	});

	it('count-cap eviction is LRU: an old version still in use outlives an idle newer one', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: SNAPSHOT_NAME, state: 'active', lastUsedAt: daysAgo(0) },
				{ name: 'n8n/instance-ai:1.122.0', state: 'active', lastUsedAt: daysAgo(1) },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active', lastUsedAt: daysAgo(1) },
				// Oldest version but used yesterday (a pinned instance) → kept.
				{ name: 'n8n/instance-ai:1.100.0', state: 'active', lastUsedAt: daysAgo(1) },
				// Idle for two weeks → evicted first.
				{ name: 'n8n/instance-ai:1.119.0', state: 'active', lastUsedAt: daysAgo(15) },
				{ name: 'n8n/instance-ai:1.118.0', state: 'active', lastUsedAt: daysAgo(10) },
			]),
		);

		await manager.createSnapshot(daytona as never, { retention: 5 });

		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.119.0']);
	});

	it('deletes failed snapshots even within the retention window', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: SNAPSHOT_NAME, state: 'active' },
				{ name: 'n8n/instance-ai:1.122.0', state: 'build_failed', errorReason: 'npm exit 1' },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active' },
			]),
		);

		await manager.createSnapshot(daytona as never, { retention: 3 });

		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.122.0']);
	});

	it('never deletes the snapshot being published', async () => {
		// Republish of an old version that ranks outside the retention window.
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: 'n8n/instance-ai:2.0.0', state: 'active' },
				{ name: SNAPSHOT_NAME, state: 'active' },
			]),
		);

		await manager.createSnapshot(daytona as never, { retention: 1 });

		expect(daytona.snapshot.delete).not.toHaveBeenCalled();
	});

	it('paginates through the snapshot list', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list
			.mockResolvedValueOnce(snapshotPage([{ name: SNAPSHOT_NAME, state: 'active' }], 1, 2))
			.mockResolvedValueOnce(
				snapshotPage([{ name: 'n8n/instance-ai:1.100.0', state: 'build_failed' }], 2, 2),
			);

		await manager.createSnapshot(daytona as never, { retention: 1 });

		expect(daytona.snapshot.list).toHaveBeenCalledTimes(2);
		const deletedNames = daytona.snapshot.delete.mock.calls.map(([snapshot]) => snapshot.name);
		expect(deletedNames).toEqual(['n8n/instance-ai:1.100.0']);
	});

	it('does not fail the publish when pruning fails', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockRejectedValue(new DaytonaError('boom', 500));

		await expect(manager.createSnapshot(daytona as never, { retention: 2 })).resolves.toBe(
			SNAPSHOT_NAME,
		);
	});

	it('does not fail the publish when a single delete fails', async () => {
		const manager = new SnapshotManager(undefined, NOOP_LOGGER, '1.123.0');
		const daytona = makeFakeDaytona();
		daytona.snapshot.create.mockResolvedValue({ name: SNAPSHOT_NAME });
		daytona.snapshot.list.mockResolvedValue(
			snapshotPage([
				{ name: SNAPSHOT_NAME, state: 'active' },
				{ name: 'n8n/instance-ai:1.122.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.121.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.120.0', state: 'active' },
				{ name: 'n8n/instance-ai:1.119.0', state: 'active' },
			]),
		);
		daytona.snapshot.delete
			.mockRejectedValueOnce(new DaytonaError('delete failed', 500))
			.mockResolvedValue(undefined);

		await expect(manager.createSnapshot(daytona as never, { retention: 1 })).resolves.toBe(
			SNAPSHOT_NAME,
		);
		expect(daytona.snapshot.delete).toHaveBeenCalledTimes(2);
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
