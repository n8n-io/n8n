import { Container, Service } from '@n8n/di';

import type { ClusterCheckContext, ClusterCheckResult, IClusterCheck } from '../cluster-check';
import { ClusterCheck, ClusterCheckMetadata } from '../cluster-check-metadata';

describe('ClusterCheckMetadata', () => {
	let metadata: ClusterCheckMetadata;

	beforeEach(() => {
		metadata = new ClusterCheckMetadata();
	});

	it('should register check classes', () => {
		class TestCheck implements IClusterCheck {
			checkDescription = { name: 'test.check' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		metadata.register({ class: TestCheck });

		expect(metadata.getClasses()).toContain(TestCheck);
	});

	it('should return registered classes in registration order', () => {
		class FirstCheck implements IClusterCheck {
			checkDescription = { name: 'first.check' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}
		class SecondCheck implements IClusterCheck {
			checkDescription = { name: 'second.check' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		metadata.register({ class: FirstCheck });
		metadata.register({ class: SecondCheck });

		expect(metadata.getClasses()).toEqual([FirstCheck, SecondCheck]);
	});
});

describe('@ClusterCheck decorator', () => {
	let metadata: ClusterCheckMetadata;

	beforeEach(() => {
		vi.resetAllMocks();

		metadata = new ClusterCheckMetadata();
		Container.set(ClusterCheckMetadata, metadata);
	});

	it('should register the decorated class in ClusterCheckMetadata', () => {
		@ClusterCheck()
		class TestCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.test' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		const registered = metadata.getClasses();

		expect(registered).toContain(TestCheck);
		expect(registered).toHaveLength(1);
	});

	it('should register multiple decorated classes', () => {
		@ClusterCheck()
		class VersionCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.versionMismatch' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		@ClusterCheck()
		class LeaderCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.leaderMissing' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		const registered = metadata.getClasses();

		expect(registered).toContain(VersionCheck);
		expect(registered).toContain(LeaderCheck);
		expect(registered).toHaveLength(2);
	});

	it('should apply @Service() so the class is resolvable via DI', () => {
		@ClusterCheck()
		class TestCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.test' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		expect(Container.has(TestCheck)).toBe(true);

		const instance = Container.get(TestCheck);

		expect(instance).toBeInstanceOf(TestCheck);
		expect(instance.checkDescription).toEqual({ name: 'cluster.test' });
	});

	it('should support checks with constructor-injected dependencies', () => {
		@Service()
		class Logger {
			log(message: string) {
				return message;
			}
		}

		@ClusterCheck()
		class TestCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.test' };
			constructor(private readonly logger: Logger) {}
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				this.logger.log('run');
				return {};
			}
		}

		const instance = Container.get(TestCheck);

		expect(instance).toBeInstanceOf(TestCheck);
	});

	it('should expose different description names for different checks', () => {
		@ClusterCheck()
		class VersionCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.versionMismatch', displayName: 'Version Mismatch' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		@ClusterCheck()
		class LeaderCheck implements IClusterCheck {
			checkDescription = { name: 'cluster.leaderMissing', displayName: 'Leader Missing' };
			async run(_context: ClusterCheckContext): Promise<ClusterCheckResult> {
				return {};
			}
		}

		const versionInstance = Container.get(VersionCheck);
		const leaderInstance = Container.get(LeaderCheck);

		expect(versionInstance.checkDescription.name).toBe('cluster.versionMismatch');
		expect(leaderInstance.checkDescription.name).toBe('cluster.leaderMissing');
	});
});
