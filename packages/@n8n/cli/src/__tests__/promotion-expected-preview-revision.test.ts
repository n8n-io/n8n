import { describe, it, expect } from 'vitest';

import PromotionEnvironmentApply from '../commands/promotion-environment/apply';
import PromotionEnvironmentApplyContinue from '../commands/promotion-environment/apply-continue';
import PromotionEnvironmentApplySelection from '../commands/promotion-environment/apply-selection';
import PromotionEnvironmentApplySelectionContinue from '../commands/promotion-environment/apply-selection-continue';
import PromotionEnvironmentPromote from '../commands/promotion-environment/promote';
import PromotionEnvironmentPromoteSelection from '../commands/promotion-environment/promote-selection';

const SOURCES = [
	'promote-check <id> --json',
	'list-changes <projectId> promote --json',
	'list-apply-changes <id> --json',
	'list-changes <projectId> apply --json',
];

describe('the help of --expected-preview-revision', () => {
	it.each([
		{
			name: 'promote',
			commandClass: PromotionEnvironmentPromote,
			description: 'Revision of the reviewed Promote check, from `promote-check <id> --json`',
		},
		{
			name: 'promote-selection',
			commandClass: PromotionEnvironmentPromoteSelection,
			description:
				'Revision of the reviewed Promote preview, from `list-changes <projectId> promote --json`',
		},
		{
			name: 'apply',
			commandClass: PromotionEnvironmentApply,
			description: 'Revision of the reviewed Apply preview, from `list-apply-changes <id> --json`',
		},
		{
			name: 'apply-continue',
			commandClass: PromotionEnvironmentApplyContinue,
			description: 'Revision of the reviewed Apply preview, from `list-apply-changes <id> --json`',
		},
		{
			name: 'apply-selection',
			commandClass: PromotionEnvironmentApplySelection,
			description:
				'Revision of the reviewed Apply preview, from `list-changes <projectId> apply --json`',
		},
		{
			name: 'apply-selection-continue',
			commandClass: PromotionEnvironmentApplySelectionContinue,
			description:
				'Revision of the reviewed Apply preview, from `list-changes <projectId> apply --json`',
		},
	])('names only the command that gives the revision of $name', ({ commandClass, description }) => {
		const help = commandClass.flags.expectedPreviewRevision.description;

		expect(help).toBe(description);
		// A revision from a different command never matches, so the help must not name one.
		expect(SOURCES.filter((source) => help?.includes(source))).toHaveLength(1);
	});
});
