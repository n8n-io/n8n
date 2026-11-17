import { failsStep, ServiceCallError } from '../service-calls';

describe('an error of a step that reaches the process outside a result', () => {
	const failed = new ServiceCallError('Unknown service "credentials"');

	it('ends the step when a service call failed and the step still runs', () => {
		expect(failsStep(failed, { done: false })).toBe(true);
	});

	it('does not end a step that has ended, and needs a step', () => {
		expect(failsStep(failed, { done: true })).toBe(false);
		expect(failsStep(failed, undefined)).toBe(false);
	});

	it('leaves each other error to the log, as n8n does', () => {
		expect(failsStep(new Error('socket hang up'), { done: false })).toBe(false);
		expect(failsStep('text', { done: false })).toBe(false);
	});
});
