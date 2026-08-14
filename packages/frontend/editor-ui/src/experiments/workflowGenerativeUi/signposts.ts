export const signpostRoles = ['comesIn', 'works', 'goesOut'] as const;

export type SignpostRole = (typeof signpostRoles)[number];

export const signpostLabels: Record<SignpostRole, string> = {
	comesIn: 'Comes in',
	works: 'Works',
	goesOut: 'Goes out',
};
