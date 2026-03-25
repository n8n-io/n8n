/* eslint-env mocha */
'use strict';

const madge = require('../lib/api');
require('should');

describe('JSX', () => {
	const dir = __dirname + '/jsx';

	it('finds import in JSX files', (done) => {
		madge(dir + '/basic.jsx').then((res) => {
			res.obj().should.eql({
				'basic.jsx': ['other.jsx'],
				'other.jsx': []
			});
			done();
		}).catch(done);
	});
});
