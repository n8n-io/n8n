/**
 * Stand-in for projects that exist on the apply branch and not on this instance.
 * An empty list is the muted state on the Apply card.
 */
export type PrototypeMissingProject = {
	id: string;
	name: string;
};

export const PROTOTYPE_MISSING_PROJECTS: PrototypeMissingProject[] = [
	{ id: 'protoBilling0001', name: 'Billing' },
	{ id: 'protoMarketing01', name: 'Marketing' },
	{ id: 'protoSupport0001', name: 'Support' },
];
