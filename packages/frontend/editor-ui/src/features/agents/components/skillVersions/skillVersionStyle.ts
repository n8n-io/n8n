import type { BadgeVariant, IconName } from '@n8n/design-system';

/**
 * What a skill version badge says about a version:
 * - `latest`: the draft follows the latest version.
 * - `pinned`: the draft stays on one version.
 * - `published`: the published agent runs this version.
 * - `unpublished`: the draft uses a version that the published agent does not run yet.
 */
export type SkillVersionStyleKind = 'latest' | 'pinned' | 'published' | 'unpublished';

export type SkillVersionStyle = { variant: BadgeVariant; icon?: IconName };

/**
 * The colors match workflow history: green for published, yellow for changes that
 * are not published yet (the same as the dot on the Publish button). The draft
 * states stay neutral.
 */
const STYLES: Record<SkillVersionStyleKind, SkillVersionStyle> = {
	latest: { variant: 'outline' },
	pinned: { variant: 'outline', icon: 'pin' },
	published: { variant: 'success' },
	unpublished: { variant: 'warning' },
};

export function skillVersionStyle(kind: SkillVersionStyleKind): SkillVersionStyle {
	return STYLES[kind];
}
