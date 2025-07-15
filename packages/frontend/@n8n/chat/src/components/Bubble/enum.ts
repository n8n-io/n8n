export const Role = {
	end: 'user',
	start: 'ai',
} as const;

export const RolePlacement = {
	user: 'end',
	ai: 'start',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
export type PlacementType = keyof typeof Role;
