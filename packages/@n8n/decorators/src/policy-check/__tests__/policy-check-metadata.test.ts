import { Container } from '@n8n/di';

import {
	pointsImplementedBy,
	type PolicyCheckResult,
	type RegisteredPolicyCheck,
	type WorkflowSaveContext,
	type WorkflowStartContext,
} from '../policy-check';
import {
	PolicyCheck,
	PolicyCheckMetadata,
	UnknownEnforcementPointError,
} from '../policy-check-metadata';

const noViolations = async (): Promise<PolicyCheckResult> => ({ violations: [] });

describe('PolicyCheckMetadata', () => {
	let metadata: PolicyCheckMetadata;

	beforeEach(() => {
		metadata = new PolicyCheckMetadata();
	});

	it('should register check classes', () => {
		class TestCheck implements RegisteredPolicyCheck {
			id = 'test.check';
			async onWorkflowSave(_ctx: WorkflowSaveContext) {
				return await noViolations();
			}
		}

		metadata.register({ class: TestCheck });

		expect(metadata.getClasses()).toContain(TestCheck);
	});

	it('should return registered classes in registration order', () => {
		class FirstCheck implements RegisteredPolicyCheck {
			id = 'first.check';
			async onWorkflowSave(_ctx: WorkflowSaveContext) {
				return await noViolations();
			}
		}
		class SecondCheck implements RegisteredPolicyCheck {
			id = 'second.check';
			async onWorkflowStart(_ctx: WorkflowStartContext) {
				return await noViolations();
			}
		}

		metadata.register({ class: FirstCheck });
		metadata.register({ class: SecondCheck });

		expect(metadata.getClasses()).toEqual([FirstCheck, SecondCheck]);
	});
});

describe('@PolicyCheck decorator', () => {
	let metadata: PolicyCheckMetadata;

	beforeEach(() => {
		vi.resetAllMocks();

		metadata = new PolicyCheckMetadata();
		Container.set(PolicyCheckMetadata, metadata);
	});

	it('should register the decorated class and make it DI-resolvable', () => {
		@PolicyCheck()
		class TestCheck implements RegisteredPolicyCheck {
			id = 'policy.test';
			async onWorkflowSave(_ctx: WorkflowSaveContext) {
				return await noViolations();
			}
		}

		const registered = metadata.getClasses();

		expect(registered).toContain(TestCheck);
		expect(registered).toHaveLength(1);
		expect(Container.get(TestCheck)).toBeInstanceOf(TestCheck);
	});

	it('should register multiple decorated classes in registration order', () => {
		@PolicyCheck()
		class NodeTypeCheck implements RegisteredPolicyCheck {
			id = 'node-type-availability';
			async onWorkflowStart(_ctx: WorkflowStartContext) {
				return await noViolations();
			}
		}

		@PolicyCheck()
		class QuotaCheck implements RegisteredPolicyCheck {
			id = 'execution-quota';
			async onWorkflowStart(_ctx: WorkflowStartContext) {
				return await noViolations();
			}
		}

		expect(metadata.getClasses()).toEqual([NodeTypeCheck, QuotaCheck]);
	});

	it('should reject an `on*` method that matches no enforcement point', () => {
		class TypoCheck implements RegisteredPolicyCheck {
			id = 'typo.check';
			async onWorkflowSave(_ctx: WorkflowSaveContext) {
				return await noViolations();
			}
			// Misspelled or removed point — shouldn't silently do nothing.
			async onWorkflowDelete() {
				return await noViolations();
			}
		}

		const decorate = () => {
			PolicyCheck()(TypoCheck);
		};

		expect(decorate).toThrow(UnknownEnforcementPointError);
		expect(decorate).toThrow(/onWorkflowDelete/);
		expect(metadata.getClasses()).toHaveLength(0);
	});

	it('should not treat non-point methods as enforcement points', () => {
		@PolicyCheck()
		class CheckWithHelpers implements RegisteredPolicyCheck {
			id = 'helpers.check';
			async onWorkflowSave(_ctx: WorkflowSaveContext) {
				return await noViolations();
			}
			// Neither is `on` + a capital letter, so neither looks like a point.
			once() {}
			buildViolation() {}
		}

		expect(metadata.getClasses()).toContain(CheckWithHelpers);
	});
});

describe('pointsImplementedBy', () => {
	it('should derive only the points a check implements', () => {
		const check: RegisteredPolicyCheck = {
			id: 'partial.check',
			onWorkflowSave: noViolations,
			onCredentialDecrypt: noViolations,
		};

		expect(pointsImplementedBy(check)).toEqual(['workflowSave', 'credentialDecrypt']);
	});
});
