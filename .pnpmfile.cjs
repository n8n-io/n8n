function readPackage(pkg) {
	/**
	 * Remove @swc/core from all packages' peer dependencies, except for unplugin-swc.
	 * Client packages rely on tsc and will produce incorrect bundles when using @swc/core.
	 */
	if (pkg.name !== 'unplugin-swc') {
		if (pkg.peerDependencies?.['@swc/core']) delete pkg.peerDependencies['@swc/core'];
		if (pkg.peerDependenciesMeta?.['@swc/core']) delete pkg.peerDependenciesMeta['@swc/core'];
	}

	return pkg;
}

module.exports = {
	hooks: {
		readPackage,
	},
};
