import type { CSSProperties } from 'vue';

export const FOLLOW_UP_RESERVE_VARIABLE = '--generative-ui--follow-up--reserve';

export const FOLLOW_UP_RESERVE_VALUE =
	'calc(var(--spacing--3xl) + var(--spacing--lg) + env(safe-area-inset-bottom, 0px))';

export const followUpReserveStyle: CSSProperties = {
	[FOLLOW_UP_RESERVE_VARIABLE]: FOLLOW_UP_RESERVE_VALUE,
};
