import { Container } from '@n8n/di';

import { NonMethodError } from '../../errors';
import { Scheduled } from '../on-scheduled';
import { ScheduledMetadata } from '../scheduled-metadata';

describe('ScheduledMetadata', () => {
	it('should register and return handlers in registration order', () => {
		const metadata = new ScheduledMetadata();
		class A {}
		class B {}

		metadata.register({ handlerClass: A, methodName: 'run', taskType: 'a' });
		metadata.register({ handlerClass: B, methodName: 'run', taskType: 'b' });

		expect(metadata.getHandlers().map((h) => h.taskType)).toEqual(['a', 'b']);
	});
});

describe('@Scheduled decorator', () => {
	let metadata: ScheduledMetadata;

	beforeEach(() => {
		metadata = new ScheduledMetadata();
		Container.set(ScheduledMetadata, metadata);
	});

	it('should register the decorated method with its task type', () => {
		class MyHandler {
			@Scheduled({ type: 'poc-toy' })
			async handle() {}
		}

		const handlers = metadata.getHandlers();

		expect(handlers).toHaveLength(1);
		expect(handlers[0]).toMatchObject({
			handlerClass: MyHandler,
			methodName: 'handle',
			taskType: 'poc-toy',
		});
	});

	it('should carry through instanceTypes when set', () => {
		class MyHandler {
			@Scheduled({ type: 'poc-toy', instanceTypes: ['main'] })
			async handle() {}
		}

		expect(metadata.getHandlers()[0].instanceTypes).toEqual(['main']);
		expect(MyHandler).toBeDefined();
	});

	it('should throw NonMethodError when applied to a non-method', () => {
		expect(() => {
			class Bad {
				// @ts-expect-error deliberately misapplied to a property
				@Scheduled({ type: 'x' })
				notAMethod = 42;
			}
			return Bad;
		}).toThrow(NonMethodError);
	});
});
