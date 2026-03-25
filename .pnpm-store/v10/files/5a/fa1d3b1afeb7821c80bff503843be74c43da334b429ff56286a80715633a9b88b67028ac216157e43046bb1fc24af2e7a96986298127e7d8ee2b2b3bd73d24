'use strict';
const fs = require('fs');
const path = require('path');
const hasha = require('hasha');
const makeDir = require('make-dir');
const writeFileAtomic = require('write-file-atomic');
const packageHash = require('package-hash');

let ownHash = '';
function getOwnHash() {
	ownHash = packageHash.sync(path.join(__dirname, 'package.json'));
	return ownHash;
}

function wrap(opts) {
	if (!(opts.factory || opts.transform) || (opts.factory && opts.transform)) {
		throw new Error('Specify factory or transform but not both');
	}

	if (typeof opts.cacheDir !== 'string' && !opts.disableCache) {
		throw new Error('cacheDir must be a string');
	}

	opts = {
		ext: '',
		salt: '',
		hashData: () => [],
		filenamePrefix: () => '',
		onHash: () => {},
		...opts
	};

	let transformFn = opts.transform;
	const {factory, cacheDir, shouldTransform, disableCache, hashData, onHash, filenamePrefix, ext, salt} = opts;
	const cacheDirCreated = opts.createCacheDir === false;
	let created = transformFn && cacheDirCreated;
	const encoding = opts.encoding === 'buffer' ? undefined : opts.encoding || 'utf8';

	function transform(input, metadata, hash) {
		if (!created) {
			if (!cacheDirCreated && !disableCache) {
				makeDir.sync(cacheDir);
			}

			if (!transformFn) {
				transformFn = factory(cacheDir);
			}

			created = true;
		}

		return transformFn(input, metadata, hash);
	}

	return function (input, metadata) {
		if (shouldTransform && !shouldTransform(input, metadata)) {
			return input;
		}

		if (disableCache) {
			return transform(input, metadata);
		}

		const data = [
			ownHash || getOwnHash(),
			input,
			salt,
			...[].concat(hashData(input, metadata))
		];
		const hash = hasha(data, {algorithm: 'sha256'});
		const cachedPath = path.join(cacheDir, filenamePrefix(metadata) + hash + ext);

		onHash(input, metadata, hash);

		let result;
		let retry = 0;
		/* eslint-disable-next-line no-constant-condition */
		while (true) {
			try {
				return fs.readFileSync(cachedPath, encoding);
			} catch (readError) {
				if (!result) {
					result = transform(input, metadata, hash);
				}

				try {
					writeFileAtomic.sync(cachedPath, result, {encoding});
					return result;
				} catch (error) {
					/* Likely https://github.com/npm/write-file-atomic/issues/28
					 * Make up to 3 attempts to read or write the cache. */
					retry++;
					if (retry > 3) {
						throw error;
					}
				}
			}
		}
	};
}

module.exports = wrap;
