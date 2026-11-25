import type { AiPreferenceService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createManifestEntry, entityFilePath } from '@/modules/n8n-packages/io/manifest-entry';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { PreferenceSerializer } from '@/modules/n8n-packages/entities/preference/preference.serializer';
import type { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

import { parsePackageFiles } from '../base-branch-files';
import { buildPreview } from '../promotion-preview';
import {
	PromotionPreferenceService,
	selectPromotionPreferences,
} from '../promotion-preference.service';
import { WorkingCopyUpdater } from '../working-copy-updater';

const project = createManifestEntry('projects', 'projects', { id: 'project-1', name: 'Orders' });
const id = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const preference = createManifestEntry('preferences', `${project.target}/preferences`, {
	id,
	name: 'Preference',
});
const instancePreference = createManifestEntry('preferences', 'preferences', {
	id: otherId,
	name: 'Preference',
});
const manifest = (preferences?: PackageManifest['preferences']): PackageManifest => ({
	packageFormatVersion: preferences === undefined ? '1' : '3',
	sourceN8nVersion: '2.50.0',
	sourceId: 'source',
	projects: [project],
	...(preferences === undefined ? {} : { preferences }),
});

describe('Preference selection for Promotions', () => {
	it('selects project changes and preserves instance Preferences in a project operation', () => {
		expect(
			selectPromotionPreferences(
				manifest([preference, instancePreference]),
				manifest([]),
				project.id,
			),
		).toEqual({ selectedPreferenceIds: [id], deletedPreferenceIds: [] });
	});
	it('preserves unselected Preferences and selects an explicit removal', () => {
		expect(
			selectPromotionPreferences(
				manifest([]),
				manifest([preference, instancePreference]),
				project.id,
				[id],
			),
		).toEqual({ selectedPreferenceIds: [], deletedPreferenceIds: [id] });
	});
	it('does not infer removals from an absent collection', () => {
		expect(selectPromotionPreferences(manifest(), manifest([preference]))).toEqual({
			selectedPreferenceIds: [],
			deletedPreferenceIds: [],
		});
		expect(() =>
			selectPromotionPreferences(manifest(), manifest([preference]), project.id, [id]),
		).toThrow('unavailable');
	});
	it('keeps incoming Preferences in the plan when destination Preferences are unavailable', () => {
		expect(selectPromotionPreferences(manifest([preference]), manifest(), project.id)).toEqual({
			selectedPreferenceIds: [id],
			deletedPreferenceIds: [],
		});
	});
	it('rejects instance IDs in a project selection', () => {
		expect(() =>
			selectPromotionPreferences(manifest([instancePreference]), manifest([]), project.id, [
				otherId,
			]),
		).toThrow('outside the reviewed scope');
	});
	it('rejects a project Preference that moved to instance scope', () => {
		const moved = createManifestEntry('preferences', 'preferences', { id, name: 'Preference' });
		expect(() =>
			selectPromotionPreferences(manifest([moved]), manifest([preference]), project.id, [id]),
		).toThrow('another scope');
	});
	it('decodes UUID file paths without losing identity', () => {
		const file = `n8n/${entityFilePath('preferences', preference.target)}`;
		expect(
			parsePackageFiles([{ path: file, blobSha: 'sha' }], {
				exportRoot: 'n8n',
				projectIds: [project.id],
			}),
		).toMatchObject([{ entityId: id, type: 'preference', projectId: project.id }]);
	});
	it('lists content changes and reviewed removals as independent selections', () => {
		const file = `n8n/${entityFilePath('preferences', preference.target)}`;
		const side = { manifest: manifest([preference]), blobByPath: new Map([[file, 'old']]) };
		const changed = buildPreview({
			operation: {
				direction: 'apply',
				planned: new Map([[`preference:${id}`, { change: 'modified' }]]),
			},
			projectIds: [project.id],
			base: side,
			desired: { ...side, blobByPath: new Map([[file, 'new']]) },
		});
		expect(changed.resources).toContainEqual(
			expect.objectContaining({
				key: `preference:${id}`,
				parentKey: `project:${project.id}`,
				change: 'modified',
				selectable: true,
			}),
		);
		const removed = buildPreview({
			operation: {
				direction: 'apply',
				planned: new Map([[`preference:${id}`, { change: 'deleted' }]]),
			},
			projectIds: [project.id],
			base: side,
			desired: { manifest: manifest([]), blobByPath: new Map() },
		});
		expect(removed.resources).toContainEqual(
			expect.objectContaining({ key: `preference:${id}`, change: 'deleted' }),
		);
	});
	it('omits instance Preferences from project previews', () => {
		const result = buildPreview({
			operation: { direction: 'promote', planned: null },
			projectIds: [project.id],
			base: { manifest: manifest([instancePreference]), blobByPath: new Map() },
			desired: { manifest: manifest([]), blobByPath: new Map() },
		});
		expect(result.resources.some(({ type }) => type === 'preference')).toBe(false);
	});

	it('marks an available empty instance collection explicitly', async () => {
		const preferences = mock<AiPreferenceService>();
		preferences.list.mockResolvedValue({ data: [], count: 0 });
		const service = new PromotionPreferenceService(
			preferences,
			mock<AiPreferenceSettingsService>({ isEnabled: true }),
			new PreferenceSerializer(),
		);
		expect(await service.exportOptions(mock<User>(), [], true)).toEqual({ preferenceIds: [] });
	});
	it('includes instance Preferences when comparing complete review commits', () => {
		const result = buildPreview({
			operation: null,
			projectIds: [],
			base: { manifest: manifest([]), blobByPath: new Map(), includeInstancePreferences: true },
			desired: {
				manifest: manifest([instancePreference]),
				blobByPath: new Map(),
				includeInstancePreferences: true,
			},
		});
		expect(result.resources).toContainEqual(
			expect.objectContaining({
				type: 'preference',
				id: otherId,
				parentKey: null,
				change: 'added',
			}),
		);
	});
	it('does not read Preferences when the feature is unavailable', async () => {
		const preferences = mock<AiPreferenceService>();
		const service = new PromotionPreferenceService(
			preferences,
			mock<AiPreferenceSettingsService>({ isEnabled: false }),
			new PreferenceSerializer(),
		);
		expect(await service.exportOptions(mock<User>(), [project.id], true)).toEqual({});
		expect(preferences.list).not.toHaveBeenCalled();
	});
});

describe('Preference Git overlay', () => {
	let root: string;
	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'promotion-preferences-'));
	});
	afterEach(async () => await rm(root, { recursive: true, force: true }));

	it('removes only the selected file and preserves format 3 after the last removal', async () => {
		const branch = path.join(root, 'branch');
		const staging = path.join(root, 'staging');
		const write = async (folder: string, relative: string, value: unknown) => {
			const target = path.join(folder, relative);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, JSON.stringify(value));
		};
		await write(branch, `${project.target}/project.json`, project);
		await write(branch, entityFilePath('preferences', preference.target), {
			id,
			scope: 'project',
			content: 'Use short sentences.',
		});
		await write(branch, 'manifest.json', manifest([preference]));
		await write(staging, `${project.target}/project.json`, project);
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const updater = new WorkingCopyUpdater(
			mock<InstanceSettings>({ instanceId: 'instance' }),
			logger,
		);
		const selection = {
			projectId: project.id,
			workflowIds: [],
			folderIds: [],
			deletedWorkflowIds: [],
			preferenceIds: [],
			deletedPreferenceIds: [id],
		};
		const scanned = await updater.assertSelectionFitsBranch(branch, selection);
		await updater.applySelection(branch, staging, manifest(), selection, scanned);
		const result: unknown = JSON.parse(await readFile(path.join(branch, 'manifest.json'), 'utf8'));
		expect(result).toMatchObject({
			packageFormatVersion: '3',
			preferences: [],
			projects: [project],
		});
		await expect(
			readFile(path.join(branch, entityFilePath('preferences', preference.target))),
		).rejects.toThrow();
		await expect(
			readFile(path.join(branch, project.target, 'project.json')),
		).resolves.toBeDefined();
	});
});
