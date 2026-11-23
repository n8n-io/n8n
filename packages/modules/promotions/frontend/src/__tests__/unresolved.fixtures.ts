import type { PromotionOutsideAccessDependency } from '../promotions.types';

const consumer = (...names: string[]) => [
	{
		project: { id: 'p1', name: 'Sales' },
		workflows: names.map((name, index) => ({ id: `w${index}`, name })),
	},
];

/** A credential and a workflow from a project that the user cannot access. */
export const outsideAccess: PromotionOutsideAccessDependency[] = [
	{ kind: 'credential', name: 'Billing database', consumers: consumer('Sync orders') },
	{
		kind: 'workflow',
		name: 'Normalize contact data',
		consumers: consumer('Sync orders', 'Churn alert', 'Onboarding emails', 'Support triage'),
	},
];

/** A credential in a personal project. */
export const personal: PromotionOutsideAccessDependency[] = [
	{
		kind: 'credential',
		name: 'My Notion token',
		reason: 'personal',
		consumers: consumer('Sync orders'),
	},
];
