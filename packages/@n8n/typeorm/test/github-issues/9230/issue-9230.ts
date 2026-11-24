import { DateUtils } from '../../../src/util/DateUtils';
import { expect } from 'chai';

describe('github issues > #9230 Incorrect date parsing for year 1-999', () => {
	describe('mixedDateToDateString', () => {
		it('should format a year less than 1000 with correct 0 padding', () => {
			expect(DateUtils.mixedDateToDateString(new Date('0202-01-01'))).to.eq('0202-01-01');
		});
	});
});
