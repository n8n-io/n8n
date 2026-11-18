import type { InstanceRule } from '@/features/projectSettingsPrototype/data/types';

/**
 * Where a project's value comes from.
 * `instance`: the project follows the instance and could set its own.
 * `project`: the project set its own.
 * `locked`: the instance decides, and the project can't change it.
 */
export type Source = 'instance' | 'project' | 'locked';

export interface Resolved<T> {
	value: T;
	source: Source;
	instanceValue: T;
}

/** A setting with one value per level: a worker pool, a credential resolver. */
export function resolveOverride<T>(
	instanceValue: T,
	projectValue: T | undefined,
	allowProjects: boolean,
): Resolved<T> {
	if (!allowProjects) return { value: instanceValue, source: 'locked', instanceValue };
	if (projectValue === undefined)
		return { value: instanceValue, source: 'instance', instanceValue };
	return { value: projectValue, source: 'project', instanceValue };
}

export type AccessState = 'allowed' | 'restricted' | 'not-enabled';
export type AccessAction = 'restrict' | 'allow-again' | 'enable' | 'disable';

export interface ResolvedAccess {
	state: AccessState;
	source: Source;
	/** What a project admin can do next, or `null` when the row is locked. */
	action: AccessAction | null;
}

/**
 * One node or credential type in one project. A project can restrict what
 * the instance allows and enable what the instance leaves to projects. It
 * can never loosen what the instance restricts.
 */
export function resolveAccess(
	rule: InstanceRule,
	project: { restricted: boolean; enabled: boolean },
	allowProjects = true,
): ResolvedAccess {
	if (rule === 'restricted') return { state: 'restricted', source: 'locked', action: null };

	if (!allowProjects) {
		return {
			state: rule === 'opt-in' ? 'not-enabled' : 'allowed',
			source: 'locked',
			action: null,
		};
	}

	if (rule === 'opt-in') {
		return project.enabled
			? { state: 'allowed', source: 'project', action: 'disable' }
			: { state: 'not-enabled', source: 'instance', action: 'enable' };
	}

	return project.restricted
		? { state: 'restricted', source: 'project', action: 'allow-again' }
		: { state: 'allowed', source: 'instance', action: 'restrict' };
}
