import {
	MultiMainMetadata,
	LEADER_STEPDOWN_EVENT_NAME,
	type MultiMainEventHandler,
} from '../multi-main-metadata';

class SecondService {
	onStepdown() {}
}

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

	// The replay and notify semantics live in ReplayableRegistry and are covered
	// against it in the system task tests; on-multi-main-event covers both paths
	// end to end. What is only reachable through this subclass is its error text.
	it('should name the handler when a listener throws', () => {
		metadata.subscribe(() => {
			throw new Error('listener failed');
		});

		expect(() => metadata.register(stepdownHandler)).toThrowError(
			'Failed to handle the registration of multi-main event handler "SecondService.onStepdown"',
		);
	});
});
