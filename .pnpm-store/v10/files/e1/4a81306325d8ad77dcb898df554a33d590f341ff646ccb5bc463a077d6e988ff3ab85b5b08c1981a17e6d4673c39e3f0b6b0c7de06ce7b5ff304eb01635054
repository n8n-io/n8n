'use strict';

function findInternalPreloadModule() {
	/* This song-and-dance is to keep esm happy. */
	let mod = module;
	const seen = new Set([mod]);
	while ((mod = mod.parent)) {
		/* Generally if we're being preloaded then
		 * mod.parent.id should be 'internal/preload' */
		/* istanbul ignore next: paranoia */
		if (seen.has(mod)) {
			return module;
		}

		seen.add(mod);
		/* istanbul ignore next: this is hit but coverage cannot be collected */
		if (mod.id === 'internal/preload') {
			return mod;
		}
	}

	return module;
}

module.exports = findInternalPreloadModule();
