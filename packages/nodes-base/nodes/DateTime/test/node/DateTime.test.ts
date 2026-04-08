import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import moment from 'moment-timezone';

describe('Test DateTime Node', () => {
	// ! When making changes to the Workflow test files make sure to export env TZ=UTC as Github Actions runs in UTC timezone
	if (new Date().getTimezoneOffset() === 0 || moment().utcOffset() === 0) {
		new NodeTestHarness().setupTests();
	} else {
		it('Skipped because timezone is not UTC', () => {
			expect(true).toBe(true);
		});
	}
});
