import { Container, Service } from '@n8n/di';
import { EventEmitter } from 'node:events';

import { NonMethodError } from '../../errors';
import {
	MultiMainMetadata,
	LEADER_TAKEOVER_EVENT_NAME,
	LEADER_STEPDOWN_EVENT_NAME,
} from '../multi-main-metadata';
import { OnLeaderStepdown, OnLeaderTakeover } from '../on-multi-main-event';

class MockMultiMainSetup extends EventEmitter {
	registerEventHandlers() {
		const handlers = Container.get(MultiMainMetadata).getHandlers();

		for (const { eventHandlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(eventHandlerClass);
			this.on(eventName, async () => {
				return await instance[methodName].call(instance);
			});
		}
	}
}

let multiMainSetup: MockMultiMainSetup;
let metadata: MultiMainMetadata;

beforeEach(() => {
	Container.reset();

	metadata = new MultiMainMetadata();
	Container.set(MultiMainMetadata, metadata);

	multiMainSetup = new MockMultiMainSetup();
});

it('should register methods decorated with @OnLeaderTakeover', () => {
	jest.spyOn(metadata, 'register');

	@Service()
	class TestService {
		@OnLeaderTakeover()
		async handleLeaderTakeover() {}
	}

	expect(metadata.register).toHaveBeenCalledWith({
		eventName: LEADER_TAKEOVER_EVENT_NAME,
		methodName: 'handleLeaderTakeover',
		eventHandlerClass: TestService,
	});
});

it('should register methods decorated with @OnLeaderStepdown', () => {
	jest.spyOn(metadata, 'register');

	@Service()
	class TestService {
		@OnLeaderStepdown()
		async handleLeaderStepdown() {}
	}

	expect(metadata.register).toHaveBeenCalledTimes(1);
	expect(metadata.register).toHaveBeenCalledWith({
		eventName: LEADER_STEPDOWN_EVENT_NAME,
		methodName: 'handleLeaderStepdown',
		eventHandlerClass: TestService,
	});
});

it('should throw an error if the decorated target is not a method', () => {
	expect(() => {
		@Service()
		class TestService {
			// @ts-expect-error Testing invalid code
			@OnLeaderTakeover()
			notAFunction = 'string';
		}

		new TestService();
	}).toThrowError(NonMethodError);
});

it('should call decorated methods when events are emitted', async () => {
	@Service()
	class TestService {
		takeoverCalled = false;

		stepdownCalled = false;

		@OnLeaderTakeover()
		async handleLeaderTakeover() {
			this.takeoverCalled = true;
		}

		@OnLeaderStepdown()
		async handleLeaderStepdown() {
			this.stepdownCalled = true;
		}
	}

	const testService = Container.get(TestService);
	jest.spyOn(testService, 'handleLeaderTakeover');
	jest.spyOn(testService, 'handleLeaderStepdown');

	multiMainSetup.registerEventHandlers();

	multiMainSetup.emit(LEADER_TAKEOVER_EVENT_NAME);
	multiMainSetup.emit(LEADER_STEPDOWN_EVENT_NAME);

	expect(testService.handleLeaderTakeover).toHaveBeenCalledTimes(1);
	expect(testService.handleLeaderStepdown).toHaveBeenCalledTimes(1);
	expect(testService.takeoverCalled).toBe(true);
	expect(testService.stepdownCalled).toBe(true);
});

it('should register multiple handlers for the same event', async () => {
	@Service()
	class TestService {
		firstHandlerCalled = false;

		secondHandlerCalled = false;

		@OnLeaderTakeover()
		async firstHandler() {
			this.firstHandlerCalled = true;
		}

		@OnLeaderTakeover()
		async secondHandler() {
			this.secondHandlerCalled = true;
		}
	}

	const testService = Container.get(TestService);

	multiMainSetup.registerEventHandlers();

	multiMainSetup.emit(LEADER_TAKEOVER_EVENT_NAME);

	expect(testService.firstHandlerCalled).toBe(true);
	expect(testService.secondHandlerCalled).toBe(true);
});

it('should register handlers from multiple service classes', async () => {
	@Service()
	class FirstService {
		handlerCalled = false;

		@OnLeaderTakeover()
		async handleTakeover() {
			this.handlerCalled = true;
		}
	}

	@Service()
	class SecondService {
		handlerCalled = false;

		@OnLeaderTakeover()
		async handleTakeover() {
			this.handlerCalled = true;
		}
	}

	const firstService = Container.get(FirstService);
	const secondService = Container.get(SecondService);

	multiMainSetup.registerEventHandlers();

	multiMainSetup.emit(LEADER_TAKEOVER_EVENT_NAME);

	expect(firstService.handlerCalled).toBe(true);
	expect(secondService.handlerCalled).toBe(true);
});

it('should handle async methods correctly', async () => {
	@Service()
	class TestService {
		result = '';

		@OnLeaderTakeover()
		async handleLeaderTakeover() {
			await new Promise((resolve) => setTimeout(resolve, 10));
			this.result = 'completed';
		}
	}

	const testService = Container.get(TestService);

	multiMainSetup.registerEventHandlers();
	multiMainSetup.emit(LEADER_TAKEOVER_EVENT_NAME);

	await new Promise((resolve) => setTimeout(resolve, 20));

	expect(testService.result).toBe('completed');
});
