import {
	MultiMainMetadata,
	LEADER_TAKEOVER_EVENT_NAME,
	LEADER_STEPDOWN_EVENT_NAME,
	type MultiMainEventHandler,
} from '../multi-main-metadata';

class FirstService {
	onTakeover() {}
}
class SecondService {
	onStepdown() {}
}

const takeoverHandler: MultiMainEventHandler = {
	eventHandlerClass: FirstService as unknown as MultiMainEventHandler['eventHandlerClass'],
	methodName: 'onTakeover',
	eventName: LEADER_TAKEOVER_EVENT_NAME,
};

const stepdownHandler: MultiMainEventHandler = {
	eventHandlerClass: SecondService as unknown as MultiMainEventHandler['eventHandlerClass'],
	methodName: 'onStepdown',
	eventName: LEADER_STEPDOWN_EVENT_NAME,
};

describe('MultiMainMetadata', () => {
	let metadata: MultiMainMetadata;

	beforeEach(() => {
		metadata = new MultiMainMetadata();
	});

	it('should replay handlers registered before subscribe()', () => {
		metadata.register(takeoverHandler);

		const listener = vi.fn();
		metadata.subscribe(listener);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(takeoverHandler);
	});

	it('should notify on handlers registered after subscribe()', () => {
		const listener = vi.fn();
		metadata.subscribe(listener);

		metadata.register(stepdownHandler);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(stepdownHandler);
	});

	it('should replay existing handlers then notify on subsequent ones', () => {
		metadata.register(takeoverHandler);

		const listener = vi.fn();
		metadata.subscribe(listener);
		metadata.register(stepdownHandler);

		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenNthCalledWith(1, takeoverHandler);
		expect(listener).toHaveBeenNthCalledWith(2, stepdownHandler);
	});

	it('should not notify before subscribe()', () => {
		const listener = vi.fn();

		metadata.register(takeoverHandler);

		expect(listener).not.toHaveBeenCalled();
	});
});
