import { Time } from '@n8n/constants';

import { getCompactionWindowDeltas } from '../workflow-history-compaction.utils';

describe('getCompactionWindowDeltas', () => {
	it('should offset the start delta by the time window and leave the end delta at the minimum age', () => {
		expect(getCompactionWindowDeltas(24, 2, Time.hours.toMilliseconds)).toEqual({
			startDelta: 26 * Time.hours.toMilliseconds,
			endDelta: 24 * Time.hours.toMilliseconds,
		});
	});

	it('should return equal deltas for an empty time window', () => {
		expect(getCompactionWindowDeltas(7, 0, Time.days.toMilliseconds)).toEqual({
			startDelta: 7 * Time.days.toMilliseconds,
			endDelta: 7 * Time.days.toMilliseconds,
		});
	});
});
