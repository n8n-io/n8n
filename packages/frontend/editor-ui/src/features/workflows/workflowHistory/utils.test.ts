import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';
import {
	computeTimelineEntries,
	generateVersionLabelFromId,
	getVersionLabel,
	toVersionDiffWorkflow,
	type TimelineGroupHeader,
	type TimelineVersionEntry,
} from './utils';
import { workflowHistoryDataFactory, workflowVersionDataFactory } from './__tests__/utils';
import type { IWorkflowDb } from '@/Interface';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const createNamedItem = (overrides: Partial<WorkflowHistory> = {}): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: 'Named Version',
	...overrides,
});

const createUnnamedItem = (overrides: Partial<WorkflowHistory> = {}): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: null,
	...overrides,
});

describe('computeTimelineEntries', () => {
	it('should return empty array for empty input', () => {
		const result = computeTimelineEntries([]);
		expect(result).toEqual([]);
	});

	it('should return single version entry for single named item', () => {
		const item = createNamedItem();
		const result = computeTimelineEntries([item]);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('version');

		const entry = result[0] as TimelineVersionEntry;
		expect(entry.item).toBe(item);
		expect(entry.originalIndex).toBe(0);
		expect(entry.isGrouped).toBe(false);
	});

	it('should not group first item even if unnamed', () => {
		const item = createUnnamedItem();
		const result = computeTimelineEntries([item]);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('version');

		const entry = result[0] as TimelineVersionEntry;
		expect(entry.item).toBe(item);
		expect(entry.originalIndex).toBe(0);
		expect(entry.isGrouped).toBe(false);
	});

	it('should return version entries for multiple named items', () => {
		const items = [createNamedItem(), createNamedItem(), createNamedItem()];
		const result = computeTimelineEntries(items);

		expect(result).toHaveLength(3);
		result.forEach((entry, index) => {
			expect(entry.type).toBe('version');
			const versionEntry = entry as TimelineVersionEntry;
			expect(versionEntry.item).toBe(items[index]);
			expect(versionEntry.originalIndex).toBe(index);
			expect(versionEntry.isGrouped).toBe(false);
		});
	});

	it('should group consecutive unnamed items after named item', () => {
		const namedItem = createNamedItem();
		const unnamedItems = [createUnnamedItem(), createUnnamedItem(), createUnnamedItem()];
		const items = [namedItem, ...unnamedItems];

		const result = computeTimelineEntries(items);

		expect(result).toHaveLength(2);

		// First entry is the named version
		expect(result[0].type).toBe('version');
		const namedEntry = result[0] as TimelineVersionEntry;
		expect(namedEntry.item).toBe(namedItem);
		expect(namedEntry.isGrouped).toBe(false);

		// Second entry is a group header
		expect(result[1].type).toBe('group-header');
		const groupHeader = result[1] as TimelineGroupHeader;
		expect(groupHeader.count).toBe(3);
		expect(groupHeader.versions).toHaveLength(3);
		groupHeader.versions.forEach((version, index) => {
			expect(version.item).toBe(unnamedItems[index]);
			expect(version.originalIndex).toBe(index + 1);
			expect(version.isGrouped).toBe(true);
		});
	});

	it('should create separate group when named item interrupts unnamed items', () => {
		const items = [
			createNamedItem(), // index 0
			createUnnamedItem(), // index 1
			createUnnamedItem(), // index 2
			createNamedItem(), // index 3
			createUnnamedItem(), // index 4
		];

		const result = computeTimelineEntries(items);

		expect(result).toHaveLength(4);

		// First named version
		expect(result[0].type).toBe('version');
		expect((result[0] as TimelineVersionEntry).originalIndex).toBe(0);

		// First group (2 unnamed)
		expect(result[1].type).toBe('group-header');
		expect((result[1] as TimelineGroupHeader).count).toBe(2);

		// Second named version
		expect(result[2].type).toBe('version');
		expect((result[2] as TimelineVersionEntry).originalIndex).toBe(3);

		// Second group (1 unnamed)
		expect(result[3].type).toBe('group-header');
		expect((result[3] as TimelineGroupHeader).count).toBe(1);
	});

	it('should keep first unnamed item separate and group the rest', () => {
		const items = [
			createUnnamedItem(), // index 0 - first, never grouped
			createUnnamedItem(), // index 1
			createUnnamedItem(), // index 2
		];

		const result = computeTimelineEntries(items);

		expect(result).toHaveLength(2);

		// First item is separate version entry
		expect(result[0].type).toBe('version');
		const firstEntry = result[0] as TimelineVersionEntry;
		expect(firstEntry.originalIndex).toBe(0);
		expect(firstEntry.isGrouped).toBe(false);

		// Rest are grouped
		expect(result[1].type).toBe('group-header');
		const groupHeader = result[1] as TimelineGroupHeader;
		expect(groupHeader.count).toBe(2);
		expect(groupHeader.versions[0].originalIndex).toBe(1);
		expect(groupHeader.versions[1].originalIndex).toBe(2);
	});

	it('should treat empty string name as unnamed', () => {
		const items = [
			createNamedItem(),
			createUnnamedItem({ name: '' }),
			createUnnamedItem({ name: '   ' }), // whitespace only
		];

		const result = computeTimelineEntries(items);

		expect(result).toHaveLength(2);
		expect(result[0].type).toBe('version');
		expect(result[1].type).toBe('group-header');
		expect((result[1] as TimelineGroupHeader).count).toBe(2);
	});

	it('should generate unique group IDs', () => {
		const items = [createNamedItem(), createUnnamedItem(), createNamedItem(), createUnnamedItem()];

		const result = computeTimelineEntries(items);
		const groupHeaders = result.filter((e) => e.type === 'group-header');

		expect(groupHeaders).toHaveLength(2);
		expect(groupHeaders[0].groupId).not.toBe(groupHeaders[1].groupId);
	});

	it('should preserve original items in version entries', () => {
		const items = [createNamedItem(), createUnnamedItem()];
		const result = computeTimelineEntries(items);

		const versionEntry = result[0] as TimelineVersionEntry;
		const groupHeader = result[1] as TimelineGroupHeader;

		expect(versionEntry.item).toBe(items[0]);
		expect(groupHeader.versions[0].item).toBe(items[1]);
	});
});

describe('toVersionDiffWorkflow', () => {
	const createWorkflow = (settings: IWorkflowDb['settings']): IWorkflowDb => ({
		id: 'wf-1',
		name: 'Workflow',
		active: false,
		isArchived: false,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		versionId: 'live',
		activeVersionId: null,
		nodes: [],
		connections: {},
		settings,
	});

	it('should use the default engine for a version with no engine', () => {
		const version = { ...workflowVersionDataFactory(), settings: {} };

		const result = toVersionDiffWorkflow(
			createWorkflow({ engineType: 'v2', executionOrder: 'v1' }),
			version,
		);

		expect(result.settings?.engineType).toBe('v1');
	});

	it('should use the engine of the version and keep the live settings', () => {
		const version = { ...workflowVersionDataFactory(), settings: { engineType: 'v2' as const } };

		const result = toVersionDiffWorkflow(
			createWorkflow({ engineType: 'v1', timezone: 'UTC', executionOrder: 'v1' }),
			version,
		);

		expect(result.settings).toEqual({ engineType: 'v2', timezone: 'UTC', executionOrder: 'v1' });
		expect(result.versionId).toBe(version.versionId);
	});

	it('should use the legacy execution order for a workflow with no settings', () => {
		const result = toVersionDiffWorkflow(createWorkflow(undefined), workflowVersionDataFactory());

		expect(result.settings).toEqual({ engineType: 'v1', executionOrder: 'v0' });
	});
});

describe('generateVersionLabelFromId', () => {
	it('should generate version name with first 8 characters of versionId', () => {
		const versionId = '12345678abcdef';
		const result = generateVersionLabelFromId(versionId);

		expect(result).toBe('Version 12345678');
	});

	it('should handle versionId shorter than 8 characters', () => {
		const versionId = 'abc123';
		const result = generateVersionLabelFromId(versionId);

		expect(result).toBe('Version abc123');
	});

	it('should handle versionId exactly 8 characters', () => {
		const versionId = '12345678';
		const result = generateVersionLabelFromId(versionId);

		expect(result).toBe('Version 12345678');
	});

	it('should truncate versionId longer than 8 characters', () => {
		const versionId = '123456789abcdefghijklmnop';
		const result = generateVersionLabelFromId(versionId);

		expect(result).toBe('Version 12345678');
	});
});

describe('getVersionLabel', () => {
	it('returns the version name when current version is named', () => {
		const result = getVersionLabel({
			workflowHistory: { versionId: 'v1', name: 'Named Version' },
			currentVersionId: 'v1',
		});

		expect(result).toBe('Named Version');
	});

	it('returns generated label when version has no name', () => {
		const result = getVersionLabel({
			workflowHistory: { versionId: '12345678abcdef', name: null },
			currentVersionId: 'other',
		});

		expect(result).toBe('Version 12345678');
	});

	it('returns generated label when no current version is provided', () => {
		const result = getVersionLabel({
			workflowHistory: { versionId: '87654321abcdef', name: null },
		});

		expect(result).toBe('Version 87654321');
	});

	it('returns current changes label for unnamed current version', () => {
		const result = getVersionLabel({
			workflowHistory: { versionId: 'v1', name: null },
			currentVersionId: 'v1',
		});

		expect(result).toBe('workflowHistory.item.currentChanges');
	});
});
