import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';
import {
	computeTimelineEntries,
	type TimelineGroupHeader,
	type TimelineVersionEntry,
} from './utils';
import { workflowHistoryDataFactory } from './__tests__/utils';

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
		const groupHeaders = result.filter((e) => e.type === 'group-header') as TimelineGroupHeader[];

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
