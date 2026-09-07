import { Container } from '@n8n/di';

import { SystemTask, type SystemTaskClass, type SystemTaskSchedule } from '../system-task';
import { SystemTaskMetadata } from '../system-task-metadata';

let metadata: SystemTaskMetadata;

// Task classes are declared inside each test, so decoration runs after beforeEach
// seeds the container.
beforeEach(() => {
	Container.reset();

	metadata = new SystemTaskMetadata();
	Container.set(SystemTaskMetadata, metadata);
});

it('should make a decorated class injectable without registering it', () => {
	vi.spyOn(metadata, 'register');

	@SystemTask()
	class TestTask implements SystemTask {
		readonly name = 'test-task';

		readonly schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 60 };

		readonly effects = 'idempotent' as const;

		readonly durable = false;

		async run() {}
	}

	expect(metadata.register).not.toHaveBeenCalled();
	expect(Container.get(TestTask)).toBeInstanceOf(TestTask);
});

it('should notify a subscribed listener when a task class is registered later', () => {
	const seen: SystemTaskClass[] = [];
	metadata.subscribe((taskClass) => seen.push(taskClass));

	@SystemTask()
	class LateTask implements SystemTask {
		readonly name = 'late-task';

		readonly schedule: SystemTaskSchedule = {
			kind: 'cron',
			cronExpression: '0 3 * * *',
			timezone: null,
		};

		readonly effects = 'idempotent' as const;

		readonly durable = false;

		async run() {}
	}

	metadata.register(LateTask);

	expect(seen).toEqual([LateTask]);
});

it('should let a subscribed listener resolve the class it is notified of', () => {
	const resolved: SystemTask[] = [];
	metadata.subscribe((taskClass) => resolved.push(Container.get(taskClass)));

	@SystemTask()
	class ResolvableTask implements SystemTask {
		readonly name = 'resolvable-task';

		readonly schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 60 };

		readonly effects = 'idempotent' as const;

		readonly durable = false;

		async run() {}
	}

	metadata.register(ResolvableTask);

	expect(resolved).toHaveLength(1);
	expect(resolved[0]).toBeInstanceOf(ResolvableTask);
	expect(resolved[0].name).toBe('resolvable-task');
});
