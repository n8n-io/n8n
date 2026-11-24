import type { PromotionMissingDependencyGroup } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

/**
 * The status of a dependency that a Promote leaves out. The Issues tab and the dialogs show the
 * same label, icon and tone for it.
 */

export type StatusStyle = { tone: 'warning' | 'success' | 'neutral'; icon: IconName };

/** The status of each group of a Promote. The key is the last part of the label key. */
export const PROMOTE_GROUP_STATUS = {
	'other-project': 'otherProject',
	'outside-access': 'outside',
	personal: 'personal',
} as const satisfies Partial<Record<PromotionMissingDependencyGroup, string>>;

type PromoteGroup = keyof typeof PROMOTE_GROUP_STATUS;
export type PromoteGroupStatus = (typeof PROMOTE_GROUP_STATUS)[PromoteGroup];

// A Promote continues without these dependencies. Only a personal one needs a move first.
export const PROMOTE_STATUS_STYLES: Record<PromoteGroupStatus, StatusStyle> = {
	otherProject: { tone: 'neutral', icon: 'circle-minus' },
	outside: { tone: 'neutral', icon: 'lock' },
	personal: { tone: 'warning', icon: 'circle-alert' },
};

const isPromoteGroup = (group: string): group is PromoteGroup =>
	Object.hasOwn(PROMOTE_GROUP_STATUS, group);

/** `undefined` for a group that a Promote does not use. */
export function promoteGroupStatus(
	group: PromotionMissingDependencyGroup,
): ({ key: PromoteGroupStatus } & StatusStyle) | undefined {
	if (!isPromoteGroup(group)) return undefined;
	const key = PROMOTE_GROUP_STATUS[group];
	return { key, ...PROMOTE_STATUS_STYLES[key] };
}
