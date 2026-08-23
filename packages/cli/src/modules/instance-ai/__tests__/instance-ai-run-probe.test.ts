import { InstanceAiRunProbe } from '../instance-ai-run-probe';

describe('InstanceAiRunProbe', () => {
	it('defaults to 0 when no provider is registered', () => {
		expect(new InstanceAiRunProbe().activeRunCount()).toBe(0);
	});

	it('reads from the registered provider', () => {
		const probe = new InstanceAiRunProbe();
		let count = 2;
		probe.registerActiveRunCountProvider(() => count);

		expect(probe.activeRunCount()).toBe(2);
		count = 5;
		expect(probe.activeRunCount()).toBe(5);
	});
});
