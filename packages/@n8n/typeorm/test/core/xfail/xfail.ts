import { expect } from 'chai';
import { xfail } from '../../utils/xfail';

describe('xfail', () => {
	describe('it', () => {
		xfail.it('chai', () => {
			expect(1).to.equal(0);
		});

		xfail.it('standard mocha', () => {
			const foo = 1;
			foo.should.be.equal(0);
		});

		xfail.it('async chai', async () => {
			expect(1).to.equal(0);
		});
	});
});
