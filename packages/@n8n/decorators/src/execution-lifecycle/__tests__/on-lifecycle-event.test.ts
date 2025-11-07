import { Container, Service } from '@n8n/di';

import { NonMethodError } from '../../errors';
import { LifecycleMetadata } from '../lifecycle-metadata';
import { OnLifecycleEvent } from '../on-lifecycle-event';

describe('OnLifecycleEvent', () => {
	let lifecycleMetadata: LifecycleMetadata;

	beforeEach(() => {
		lifecycleMetadata = new LifecycleMetadata();
		Container.set(LifecycleMetadata, lifecycleMetadata);
		jest.spyOn(lifecycleMetadata, 'register');
	});

	it('should register a method decorated with OnLifecycleEvent', () => {
		@Service()
		class TestService {
			@OnLifecycleEvent('nodeExecuteBefore')
			async handleNodeExecuteBefore() {}
		}

		expect(lifecycleMetadata.register).toHaveBeenCalledTimes(1);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith({
			handlerClass: TestService,
			methodName: 'handleNodeExecuteBefore',
			eventName: 'nodeExecuteBefore',
		});
	});

	it('should register methods for all lifecycle event types', () => {
		@Service()
		// @ts-expect-error Testing
		class TestService {
			@OnLifecycleEvent('nodeExecuteBefore')
			async handleNodeExecuteBefore() {}

			@OnLifecycleEvent('nodeExecuteAfter')
			async handleNodeExecuteAfter() {}

			@OnLifecycleEvent('workflowExecuteBefore')
			async handleWorkflowExecuteBefore() {}

			@OnLifecycleEvent('workflowExecuteAfter')
			async handleWorkflowExecuteAfter() {}
		}

		expect(lifecycleMetadata.register).toHaveBeenCalledTimes(4);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({ eventName: 'nodeExecuteBefore' }),
		);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({ eventName: 'nodeExecuteAfter' }),
		);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({ eventName: 'workflowExecuteBefore' }),
		);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({ eventName: 'workflowExecuteAfter' }),
		);
	});

	it('should register multiple handlers in the same class', () => {
		@Service()
		class TestService {
			@OnLifecycleEvent('nodeExecuteBefore')
			async handleNodeExecuteBefore1() {}

			@OnLifecycleEvent('nodeExecuteBefore')
			async handleNodeExecuteBefore2() {}
		}

		expect(lifecycleMetadata.register).toHaveBeenCalledTimes(2);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith({
			handlerClass: TestService,
			methodName: 'handleNodeExecuteBefore1',
			eventName: 'nodeExecuteBefore',
		});
		expect(lifecycleMetadata.register).toHaveBeenCalledWith({
			handlerClass: TestService,
			methodName: 'handleNodeExecuteBefore2',
			eventName: 'nodeExecuteBefore',
		});
	});

	it('should throw an error if the decorated target is not a method', () => {
		expect(() => {
			@Service()
			class TestService {
				// @ts-expect-error Testing invalid code
				@OnLifecycleEvent('nodeExecuteBefore')
				notAFunction = 'string';
			}

			new TestService();
		}).toThrow(NonMethodError);
	});

	it('should register handlers from multiple service classes', () => {
		@Service()
		class FirstService {
			@OnLifecycleEvent('nodeExecuteBefore')
			async handleNodeExecuteBefore() {}
		}

		@Service()
		class SecondService {
			@OnLifecycleEvent('workflowExecuteAfter')
			async handleWorkflowExecuteAfter() {}
		}

		expect(lifecycleMetadata.register).toHaveBeenCalledTimes(2);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({
				handlerClass: FirstService,
				eventName: 'nodeExecuteBefore',
			}),
		);
		expect(lifecycleMetadata.register).toHaveBeenCalledWith(
			expect.objectContaining({
				handlerClass: SecondService,
				eventName: 'workflowExecuteAfter',
			}),
		);
	});
});
