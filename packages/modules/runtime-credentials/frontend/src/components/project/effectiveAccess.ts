import type { PolicyRule, RequestFedPolicy } from '../../runtime-credentials.api';

/**
 * Client side copy of the first-match evaluation and the instance and project composition in
 * `policy-evaluator.ts` (backend). It knows the `name` and `extends` selectors. A `package`
 * selector needs the package of a credential type, which the client does not have. A rule like
 * that makes the result `exact: false` when it could change the outcome.
 */
export type PolicedCredentialType = {
	name: string;
	/** Every type that this type builds on, directly or not. */
	ancestors: readonly string[];
};

type Match = 'yes' | 'no' | 'unknown';

type Verdict = {
	action: PolicyRule['action'];
	/** The id of the rule that decided. `null` when the default action decided. */
	ruleId: string | null;
	exact: boolean;
};

export type EffectiveAccess = {
	access: 'allow' | 'deny';
	/** Who decided a denial. `null` for an allow. */
	deniedBy: 'instance' | 'project' | null;
	/** The instance lets the project opt in, so an explicit project allow lifts the denial. */
	canOptIn: boolean;
	/** False when a rule that the client cannot evaluate could change the result. */
	exact: boolean;
};

function matches(rule: PolicyRule, type: PolicedCredentialType): Match {
	switch (rule.selector.kind) {
		case 'name':
			return rule.selector.value === type.name ? 'yes' : 'no';
		case 'extends':
			return rule.selector.value === type.name || type.ancestors.includes(rule.selector.value)
				? 'yes'
				: 'no';
		case 'package':
			return 'unknown';
	}
}

function evaluate(
	rules: readonly PolicyRule[],
	defaultAction: RequestFedPolicy['defaultAction'],
	type: PolicedCredentialType,
): Verdict {
	const unknownActions: Array<PolicyRule['action']> = [];

	for (const rule of rules) {
		const match = matches(rule, type);
		if (match === 'unknown') {
			unknownActions.push(rule.action);
		} else if (match === 'yes') {
			return {
				action: rule.action,
				ruleId: rule.id,
				exact: unknownActions.every((action) => action === rule.action),
			};
		}
	}

	return {
		action: defaultAction,
		ruleId: null,
		exact: unknownActions.every((action) => action === defaultAction),
	};
}

/** The project's own verdict, before the composition with the instance policy. */
export function projectVerdict(policy: RequestFedPolicy, type: PolicedCredentialType): Verdict {
	return evaluate(policy.rules, policy.defaultAction, type);
}

/**
 * Composes the two scopes like the backend. A project can only restrict further. `delegate` is the
 * one exception: only an explicit project `allow` rule lifts it. `instance` is `null` when the
 * user cannot read the instance policy, so only the project decides.
 */
export function effectiveAccess(
	instance: RequestFedPolicy | null,
	project: RequestFedPolicy,
	type: PolicedCredentialType,
): EffectiveAccess {
	const own = projectVerdict(project, type);
	// A project `delegate` is not valid. The backend treats it as `deny`.
	const projectAction = own.action === 'allow' ? 'allow' : 'deny';

	if (!instance) {
		return {
			access: projectAction,
			deniedBy: projectAction === 'deny' ? 'project' : null,
			canOptIn: false,
			exact: own.exact,
		};
	}

	const inst = evaluate(instance.rules, instance.defaultAction, type);

	if (inst.action === 'deny') {
		return { access: 'deny', deniedBy: 'instance', canOptIn: false, exact: inst.exact };
	}

	if (inst.action === 'delegate') {
		const exact = inst.exact && own.exact;
		if (projectAction === 'allow' && own.ruleId !== null) {
			return { access: 'allow', deniedBy: null, canOptIn: false, exact };
		}
		return {
			access: 'deny',
			deniedBy: projectAction === 'allow' ? 'instance' : 'project',
			canOptIn: true,
			exact,
		};
	}

	return {
		access: projectAction,
		deniedBy: projectAction === 'deny' ? 'project' : null,
		canOptIn: false,
		exact: inst.exact && own.exact,
	};
}

function isOwnNameRule(rule: PolicyRule, typeName: string): boolean {
	return rule.selector.kind === 'name' && rule.selector.value === typeName;
}

/**
 * The project rules after a change of access for one type. It drops the rules that name the type,
 * then adds one rule only when the project would still decide the other way, for example because
 * of a broader rule or a default action. First match wins, so an allow goes to the front and a
 * deny to the end.
 */
export function projectRulesFor(
	instance: RequestFedPolicy | null,
	project: RequestFedPolicy,
	type: PolicedCredentialType,
	desired: 'allow' | 'deny',
	newId: () => string,
): PolicyRule[] {
	const kept = project.rules.filter((rule) => !isOwnNameRule(rule, type.name));
	const result = effectiveAccess(instance, { ...project, rules: kept }, type);
	if (result.access === desired) return kept;

	const rule: PolicyRule = {
		id: newId(),
		action: desired,
		selector: { kind: 'name', value: type.name },
	};
	return desired === 'allow' ? [rule, ...kept] : [...kept, rule];
}
