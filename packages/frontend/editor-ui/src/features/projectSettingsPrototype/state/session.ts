import { computed } from 'vue';
import type { Member, ProjectRole, User } from '@/features/projectSettingsPrototype/data/types';
import { CURRENT_USER_ID, userById } from '@/features/projectSettingsPrototype/data/users';
import {
	protoParams,
	type MembersPlacement,
	type ProtoParams,
	type ViewingAs,
} from '@/features/projectSettingsPrototype/params';

export type Capability =
	| 'project:settings:view'
	| 'project:settings:edit'
	| 'project:members:view'
	| 'project:members:edit'
	| 'instance:settings:view'
	| 'instance:settings:edit';

type Who = Pick<ProtoParams, 'viewingAs' | 'membersPlacement' | 'variant'>;

/** The baseline keeps members inside the settings form, as on master. */
export function membersPlacementFor(
	params: Pick<ProtoParams, 'membersPlacement' | 'variant'>,
): MembersPlacement {
	return params.variant === 'baseline' ? 'settings' : params.membersPlacement;
}

const PROJECT_CAPABILITIES: Capability[] = [
	'project:settings:view',
	'project:settings:edit',
	'project:members:view',
	'project:members:edit',
];

/**
 * `instance:settings:view` is the instance settings area beyond Personal: a
 * project admin gets as far as their own projects there, and changes nothing.
 */
export function can(capability: Capability, params: Who): boolean {
	if (params.viewingAs === 'owner') return true;
	if (params.viewingAs === 'admin') {
		return PROJECT_CAPABILITIES.includes(capability) || capability === 'instance:settings:view';
	}
	return capability === 'project:members:view' && membersPlacementFor(params) === 'resources';
}

/** The same check against the live parameters, for templates. */
export function useCan() {
	return (capability: Capability) => can(capability, protoParams);
}

const INSTANCE_ROLES: Record<ViewingAs, User['instanceRole']> = {
	owner: 'owner',
	admin: 'member',
	editor: 'member',
};

const PROJECT_ROLES: Record<ViewingAs, ProjectRole> = {
	owner: 'project:admin',
	admin: 'project:admin',
	editor: 'project:editor',
};

/** The person using the prototype, with the instance role the parameter gives them. */
export const currentUser = computed<User>(() => ({
	...userById(CURRENT_USER_ID),
	instanceRole: INSTANCE_ROLES[protoParams.viewingAs],
}));

/** Their membership of every project in the sidebar. */
export const currentMembership = computed<Member>(() => ({
	userId: CURRENT_USER_ID,
	role: PROJECT_ROLES[protoParams.viewingAs],
}));

export const isInstanceOwner = computed(() => protoParams.viewingAs === 'owner');
