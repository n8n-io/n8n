import type {
	WorkflowHistory,
	WorkflowPublishHistory,
} from '@n8n/rest-api-client/api/workflowHistory';
import dateformat from 'dateformat';

import type { WorkflowHistoryTimelineEntry } from './types';

export const getLastPublishedByUser = (workflowPublishHistory: WorkflowPublishHistory[]) => {
	return workflowPublishHistory.findLast(
		(history) => history.event === 'activated' && history.userId !== null,
	);
};

export const generateVersionName = (versionId: string) => {
	return `Version ${versionId.substring(0, 8)}`;
};

export const formatTimestamp = (value: string) => {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		value,
		`${value.startsWith(currentYear) ? '' : 'yyyy '}mmm d"#"HH:MM:ss`,
	).split('#');

	return { date, time };
};

const isUnnamedAndUnpublished = (item: WorkflowHistory) => {
	const hasName = Boolean(item.name && item.name.trim().length > 0);
	if (hasName) {
		return false;
	}

	const hasActivationEvent = item.workflowPublishHistory.some(
		(history) => history.event === 'activated',
	);

	return !hasActivationEvent;
};

export const groupUnnamedVersions = (items: WorkflowHistory[]): WorkflowHistoryTimelineEntry[] => {
	const entries: WorkflowHistoryTimelineEntry[] = [];

	let groupStartIndex: number | null = null;

	const flushGroup = (endExclusive: number) => {
		if (groupStartIndex === null) {
			return;
		}

		const count = endExclusive - groupStartIndex;

		// Single unnamed, unpublished versions are not grouped.
		if (count < 2) {
			for (let index = groupStartIndex; index < endExclusive; index += 1) {
				const item = items[index];
				entries.push({
					type: 'item',
					item,
					itemIndex: index,
				});
			}
		} else {
			const groupItems = items.slice(groupStartIndex, endExclusive);
			const itemIndexes = groupItems.map((_, offset) => groupStartIndex + offset);

			entries.push({
				type: 'group',
				id: `unnamed-${itemIndexes[0]}-${itemIndexes[itemIndexes.length - 1]}`,
				items: groupItems,
				itemIndexes,
				count,
			});
		}

		groupStartIndex = null;
	};

	items.forEach((item, index) => {
		if (isUnnamedAndUnpublished(item)) {
			if (groupStartIndex === null) {
				groupStartIndex = index;
			}
		} else {
			flushGroup(index);

			entries.push({
				type: 'item',
				item,
				itemIndex: index,
			});
		}
	});

	flushGroup(items.length);

	return entries;
};
