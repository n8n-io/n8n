function readPackage(pkg) {
	/**
	 * Remove @swc/core from all packages' peer dependencies, except for unplugin-swc.
	 * Client packages rely on tsc and will produce incorrect bundles when using @swc/core.
	 */
	if (
		pkg.name !== 'unplugin-swc' &&
		pkg.name != 'reka-ui' &&
		pkg.name != '@internationalized/date' &&
		pkg.name != '@internationalized/number'
	) {
		if (pkg.peerDependencies?.['@swc/core']) delete pkg.peerDependencies['@swc/core'];
		if (pkg.peerDependencies?.['@swc/helpers']) delete pkg.peerDependencies['@swc/helpers'];
		if (pkg.peerDependenciesMeta?.['@swc/core']) delete pkg.peerDependenciesMeta['@swc/core'];
		if (pkg.peerDependenciesMeta?.['@swc/helpers']) delete pkg.peerDependenciesMeta['@swc/helpers'];
	}

	return pkg;
}

module.exports = {
	hooks: {
		readPackage,
	},
};
