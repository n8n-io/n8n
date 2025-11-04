function readPackage(pkg) {
	/**
	 * Remove @swc/core from ts-node's and tsup's peer dependencies to prevent them from
	 * switching over from tsc to swc. Client packages rely on these using tsc and will
	 * produce an incorrect bundle when using @swc/core.
	 */
	if (pkg.name === 'ts-node' || pkg.name === 'tsup') {
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
