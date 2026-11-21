// Dev-only preload for the local telemetry stand (see ../SKILL.md). Makes the features listed in
// N8N_STAND_LICENSE_FEATURES (comma-separated `feat:*` keys) look licensed so that license-gated
// modules boot. Loaded through NODE_OPTIONS=--require; never use it outside a local stand.
const { isMainThread } = require('node:worker_threads');

if (isMainThread) {
	// Workers and child processes (xmllint-wasm, task runners) must not inherit this preload.
	process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '')
		.replace(/--require[= ]\S*license-preload\.cjs/g, '')
		.trim();

	const features = new Set(
		(process.env.N8N_STAND_LICENSE_FEATURES || '')
			.split(',')
			.map((feature) => feature.trim())
			.filter(Boolean),
	);

	if (features.size > 0) {
		const Module = require('node:module');
		const originalLoad = Module._load;

		Module._load = function (...args) {
			const exported = originalLoad.apply(this, args);
			const License = exported?.License;
			if (
				License?.prototype &&
				typeof License.prototype.isLicensed === 'function' &&
				!License.prototype.isLicensed.standPatched
			) {
				const original = License.prototype.isLicensed;
				const patched = function (feature) {
					return features.has(feature) || original.call(this, feature);
				};
				patched.standPatched = true;
				License.prototype.isLicensed = patched;
				process.stderr.write(`[stand] faking licensed features: ${[...features].join(', ')}\n`);
			}
			return exported;
		};
	}
}
