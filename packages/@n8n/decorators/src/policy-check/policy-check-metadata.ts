import { Container, Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	ENFORCEMENT_POINT_METHODS,
	ENFORCEMENT_POINTS,
	type PolicyCheckClass,
	type RegisteredPolicyCheck,
} from './policy-check';

/**
 * One registered check.
 *
 * Wraps the class so we can attach more per-check data later without changing how
 * registration is called.
 *
 * @internal
 */
type PolicyCheckEntry = {
	class: PolicyCheckClass;
};

/**
 * Thrown when a check has an `on*` method that isn't a known enforcement point.
 *
 * Without this, a misspelled or removed method name would simply never be called, and the
 * author would think their check was working. Better to fail at startup.
 */
export class UnknownEnforcementPointError extends UnexpectedError {
	constructor(checkClassName: string, unknownMethods: string[]) {
		super(
			`Policy check "${checkClassName}" declares ${unknownMethods.join(', ')}, which ` +
				`match no known enforcement point. Known points: ${ENFORCEMENT_POINTS.join(', ')}.`,
		);
	}
}

/**
 * Holds every class decorated with `@PolicyCheck()`.
 *
 * Filled in as modules load, so checks are found without any manual wiring.
 *
 * ```
 * @PolicyCheck()   →   PolicyCheckMetadata   →   PEP implementation   →   host call site
 *  (registration)        (collection)              (resolve & run)          (enforcement)
 * ```
 *
 * Not this class's job: creating instances (DI does that), checking ids are unique, or
 * running anything.
 *
 * Read this registry when you need it, not once during your own startup — module load
 * order shouldn't decide whether a check gets found.
 */
@Service()
export class PolicyCheckMetadata {
	private readonly policyChecks: Set<PolicyCheckEntry> = new Set();

	/**
	 * Adds a check class.
	 *
	 * Called by the `@PolicyCheck()` decorator; not meant to be called directly.
	 *
	 * @internal Called by decorator only.
	 */
	register(entry: PolicyCheckEntry) {
		this.policyChecks.add(entry);
	}

	/** Every registered check class, in the order they were registered. */
	getClasses(): PolicyCheckClass[] {
		return [...this.policyChecks.values()].map((entry) => entry.class);
	}
}

/** A class as the decorator sees it: its prototype holds the check's methods. */
type DecoratedPolicyCheckClass = PolicyCheckClass & {
	readonly prototype: RegisteredPolicyCheck;
};

const KNOWN_POINT_METHODS = new Set<string>(Object.values(ENFORCEMENT_POINT_METHODS));

/**
 * Rejects `on*` methods that don't match a known point.
 *
 * Runs when the class is defined, so a mistake is a startup error instead of a check that
 * silently does nothing.
 *
 * This only sees methods on the prototype, which is how checks are meant to be written. A
 * point written as an arrow-function property won't be spotted here, and a check with no
 * points at all shows up in the PEP's startup log instead.
 */
function assertPointsAreKnown(target: DecoratedPolicyCheckClass) {
	const unknown = Object.getOwnPropertyNames(target.prototype).filter(
		(name) => /^on[A-Z]/.test(name) && !KNOWN_POINT_METHODS.has(name),
	);

	if (unknown.length > 0) throw new UnknownEnforcementPointError(target.name, unknown);
}

/**
 * Marks a class as a policy check, so it gets found and run automatically.
 *
 * When the class is defined it: checks that every `on*` method is a real point, adds the
 * class to {@link PolicyCheckMetadata}, and applies `@Service()` so DI can build it.
 *
 * Takes no arguments — the check's id lives on the instance
 * ({@link RegisteredPolicyCheck.id}), and there's no priority to set because every check
 * has to pass anyway.
 *
 * @example
 * ```typescript
 * @PolicyCheck()
 * export class NodeTypePolicyCheck implements RegisteredPolicyCheck {
 *   readonly id = 'node-type-availability';
 *
 *   async onWorkflowStart({ workflow, projectId }: WorkflowStartContext) {
 *     return { violations: [] };
 *   }
 * }
 * ```
 *
 * @throws {UnknownEnforcementPointError} An `on*` method isn't a known point.
 */
export const PolicyCheck =
	() =>
	<T extends DecoratedPolicyCheckClass>(target: T) => {
		assertPointsAreKnown(target);

		Container.get(PolicyCheckMetadata).register({ class: target });

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
