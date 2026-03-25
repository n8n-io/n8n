'use strict';

const pa = require('path');

const {NodeVM, VMError} = require('../');

if (process.argv[2]) {
	const path = pa.resolve(process.argv[2]);

	console.log(`\x1B[90m[vm] creating VM for ${path}\x1B[39m`);
	const started = Date.now();

	try {
		NodeVM.file(path, {
			verbose: true,
			require: {
				external: true
			}
		});

		console.log(`\x1B[90m[vm] VM completed in ${Date.now() - started}ms\x1B[39m`);
	} catch (ex) {
		if (ex instanceof VMError) {
			console.error(`\x1B[31m[vm:error] ${ex.message}\x1B[39m`);
		} else {
			const {stack} = ex;

			if (stack) {
				console.error(`\x1B[31m[vm:error] ${stack}\x1B[39m`);
			} else {
				console.error(`\x1B[31m[vm:error] ${ex}\x1B[39m`);
			}
		}
	}
}
