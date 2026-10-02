import { isCloudBrowserEnabledForRun } from '../browser/cloud-browser-availability';

const allOn = {
	allowed: true,
	rolledOut: true,
	onCloud: true,
	browserUseEnabled: true,
	cloudBrowserEnabled: true,
};

describe('isCloudBrowserEnabledForRun', () => {
	it('is enabled when every condition holds', () => {
		expect(isCloudBrowserEnabledForRun(allOn)).toBe(true);
	});

	it.each([
		['the run does not allow it (background task)', { allowed: false }],
		['the rollout flag is off', { rolledOut: false }],
		['the instance is not on cloud', { onCloud: false }],
		['Browser Use is turned off', { browserUseEnabled: false }],
		['the admin switch is off', { cloudBrowserEnabled: false }],
	])('is disabled when %s', (_case, override) => {
		expect(isCloudBrowserEnabledForRun({ ...allOn, ...override })).toBe(false);
	});
});
