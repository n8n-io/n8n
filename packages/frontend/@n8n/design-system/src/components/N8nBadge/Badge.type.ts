export const BADGE_SIZE = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

export type BadgeSize = (typeof BADGE_SIZE)[number];
