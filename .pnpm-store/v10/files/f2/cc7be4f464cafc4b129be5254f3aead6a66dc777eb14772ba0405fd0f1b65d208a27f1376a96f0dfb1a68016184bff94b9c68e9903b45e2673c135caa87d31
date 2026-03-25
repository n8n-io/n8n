/* eslint-env mocha */
'use strict';

const os = require('os');
const path = require('path');
const fs = require('mz/fs');
const madge = require('../lib/api');

require('should');

describe('API', () => {
	it('throws error on missing path argument', () => {
		(() => {
			madge();
		}).should.throw('path argument not provided');
	});

	it('returns a Promise', () => {
		madge(__dirname + '/cjs/a.js').should.be.Promise(); // eslint-disable-line new-cap
	});

	it('throws error if file or directory does not exists', (done) => {
		madge(__dirname + '/missing.js').catch((err) => {
			err.message.should.match(/no such file or directory/);
			done();
		}).catch(done);
	});

	it('takes single file as path', (done) => {
		madge(__dirname + '/cjs/a.js').then((res) => {
			res.obj().should.eql({
				'a.js': ['b.js', 'c.js'],
				'b.js': ['c.js'],
				'c.js': []
			});
			done();
		}).catch(done);
	});

	it('takes an array of files as path and combines the result', (done) => {
		madge([__dirname + '/cjs/a.js', __dirname + '/cjs/normal/d.js']).then((res) => {
			res.obj().should.eql({
				'a.js': ['b.js', 'c.js'],
				'b.js': ['c.js'],
				'c.js': [],
				'normal/d.js': []
			});
			done();
		}).catch(done);
	});

	it('take a single directory as path and find files in it', (done) => {
		madge(__dirname + '/cjs/normal').then((res) => {
			res.obj().should.eql({
				'a.js': ['sub/b.js'],
				'd.js': [],
				'sub/b.js': ['sub/c.js'],
				'sub/c.js': ['d.js']
			});
			done();
		}).catch(done);
	});

	it('takes an array of directories as path and compute the basedir correctly', (done) => {
		madge([__dirname + '/cjs/multibase/1', __dirname + '/cjs/multibase/2']).then((res) => {
			res.obj().should.eql({
				'1/a.js': [],
				'2/b.js': []
			});
			done();
		}).catch(done);
	});

	it('takes a predefined tree', (done) => {
		madge({
			a: ['b', 'c', 'd'],
			b: ['c'],
			c: [],
			d: ['a']
		}).then((res) => {
			res.obj().should.eql({
				a: ['b', 'c', 'd'],
				b: ['c'],
				c: [],
				d: ['a']
			});
			done();
		}).catch(done);
	});

	it('can exclude modules using RegExp', (done) => {
		madge(__dirname + '/cjs/a.js', {
			excludeRegExp: ['^b.js$']
		}).then((res) => {
			res.obj().should.eql({
				'a.js': ['c.js'],
				'c.js': []
			});
			done();
		}).catch(done);
	});

	it('extracts dependencies but excludes .git', (done) => {
		// eslint-disable-next-line no-sync
		fs.renameSync(`${__dirname}/git/.git_tmp`, `${__dirname}/git/.git`);

		madge(__dirname + '/git/a.js', {}).then((res) => {
			res.obj().should.eql({
				'a.js': ['b.js', 'c.js'],
				'b.js': ['c.js'],
				'c.js': []
			});
			done();
		}).catch(() => {
			done();
		}).finally(() => {
			// eslint-disable-next-line no-sync
			fs.renameSync(`${__dirname}/git/.git`, `${__dirname}/git/.git_tmp`);
		});
	});

	describe('dependencyFilter', () => {
		it('will stop traversing when returning false', (done) => {
			madge(__dirname + '/cjs/a.js', {
				dependencyFilter: () => {
					return false;
				}
			}).then((res) => {
				res.obj().should.eql({
					'a.js': []
				});
				done();
			}).catch(done);
		});

		it('will not stop traversing when not returning anything', (done) => {
			madge(__dirname + '/cjs/a.js', {
				dependencyFilter: () => {}
			}).then((res) => {
				res.obj().should.eql({
					'a.js': ['b.js', 'c.js'],
					'b.js': ['c.js'],
					'c.js': []
				});
				done();
			}).catch(done);
		});

		it('will pass arguments to the function', (done) => {
			let counter = 0;

			madge(__dirname + '/cjs/a.js', {
				dependencyFilter: (dependencyFilePath, traversedFilePath, baseDir) => {
					if (counter === 0) {
						dependencyFilePath.should.match(/test\/cjs\/b\.js$/);
						traversedFilePath.should.match(/test\/cjs\/a\.js$/);
						baseDir.should.match(/test\/cjs$/);
					}

					if (counter === 1) {
						dependencyFilePath.should.match(/test\/cjs\/c\.js$/);
						traversedFilePath.should.match(/test\/cjs\/a\.js$/);
						baseDir.should.match(/test\/cjs$/);
					}

					if (counter === 2) {
						dependencyFilePath.should.match(/test\/cjs\/c\.js$/);
						traversedFilePath.should.match(/test\/cjs\/b\.js$/);
						baseDir.should.match(/test\/cjs$/);
					}

					counter++;
				}
			}).then(() => {
				done();
			}).catch(done);
		});
	});

	describe('obj()', () => {
		it('returns dependency object', (done) => {
			madge(__dirname + '/cjs/a.js').then((res) => {
				res.obj().should.eql({
					'a.js': ['b.js', 'c.js'],
					'b.js': ['c.js'],
					'c.js': []
				});
				done();
			}).catch(done);
		});
	});

	describe('circular()', () => {
		it('returns list of circular dependencies', (done) => {
			madge(__dirname + '/cjs/circular/a.js').then((res) => {
				res.circular().should.eql([
					['a.js', 'd.js']
				]);
				done();
			}).catch(done);
		});
	});

	describe('circularGraph()', () => {
		it('returns graph with only circular dependencies', (done) => {
			madge(__dirname + '/cjs/circular/a.js').then((res) => {
				res.circularGraph().should.eql({
					'a.js': ['d.js'],
					'd.js': ['a.js']
				});
				done();
			}).catch(done);
		});
	});

	describe('warnings()', () => {
		it('returns an array of skipped files', (done) => {
			madge(__dirname + '/cjs/missing.js').then((res) => {
				res.obj().should.eql({
					'missing.js': ['c.js'],
					'c.js': []
				});
				res.warnings().should.eql({
					skipped: ['./path/non/existing/file']
				});
				done();
			}).catch(done);
		});
	});

	describe('dot()', () => {
		it('returns a promise resolved with graphviz DOT output', async () => {
			const res = await madge(__dirname + '/cjs/b.js');
			const output = await res.dot();
			output.should.match(/digraph G/);
			output.should.match(/bgcolor="#111111"/);
			output.should.match(/fontcolor="#c6c5fe"/);
			output.should.match(/color="#757575"/);
			output.should.match(/fontcolor="#cfffac"/);
		});
	});

	describe('depends()', () => {
		it('returns modules that depends on another', (done) => {
			madge(__dirname + '/cjs/a.js').then((res) => {
				res.depends('c.js').should.eql(['a.js', 'b.js']);
				done();
			}).catch(done);
		});
	});

	describe('orphans()', () => {
		it('returns modules that no one is depending on', (done) => {
			madge(__dirname + '/cjs/normal').then((res) => {
				res.orphans().should.eql(['a.js']);
				done();
			}).catch(done);
		});
	});

	describe('leaves()', () => {
		it('returns modules that have no dependencies', (done) => {
			madge(__dirname + '/cjs/normal').then((res) => {
				res.leaves().should.eql(['d.js']);
				done();
			}).catch(done);
		});
	});

	describe('svg()', () => {
		it('returns a promise resolved with XML SVG output in a Buffer', (done) => {
			madge(__dirname + '/cjs/b.js')
				.then((res) => res.svg())
				.then((output) => {
					output.should.instanceof(Buffer);
					output.toString().should.match(/<svg.*/);
					done();
				})
				.catch(done);
		});
	});

	describe('image()', () => {
		let imagePath;

		beforeEach(() => {
			imagePath = path.join(os.tmpdir(), 'madge_' + Date.now() + '_image.png');
		});

		afterEach(() => {
			return fs.unlink(imagePath).catch(() => {});
		});

		it('rejects if a filename is not supplied', (done) => {
			madge(__dirname + '/cjs/a.js')
				.then((res) => res.image())
				.catch((err) => {
					err.message.should.eql('imagePath not provided');
					done();
				});
		});

		it('rejects on unsupported image format', (done) => {
			madge(__dirname + '/cjs/a.js')
				.then((res) => res.image('image.zyx'))
				.catch((err) => {
					err.message.should.match(/Format: "zyx" not recognized/);
					done();
				});
		});

		it('rejects if graphviz is not installed', (done) => {
			madge(__dirname + '/cjs/a.js', {graphVizPath: '/invalid/path'})
				.then((res) => res.image('image.png'))
				.catch((err) => {
					err.message.should.eql('Graphviz could not be found. Ensure that "gvpr" is in your $PATH. Error: spawn /invalid/path/gvpr ENOENT');
					done();
				});
		});

		it('writes image to file', (done) => {
			madge(__dirname + '/cjs/a.js')
				.then((res) => res.image(imagePath))
				.then((writtenImagePath) => {
					writtenImagePath.should.eql(imagePath);

					return fs
						.exists(imagePath)
						.then((exists) => {
							if (!exists) {
								throw new Error(imagePath + ' not created');
							}
							done();
						});
				})
				.catch(done);
		});
	});
});
