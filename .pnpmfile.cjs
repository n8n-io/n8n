function readPackage(pkg) {
	/**
	 * Remove @swc/core from ts-node's peer dependencies to prevent ts-node in n8n packages
	 * from switching over from tsc to swc. Client packages rely on ts-node using tsc and
	 * will produce an incorrect bundle when their ts-node uses @swc/core
	 */
	if (pkg.name === 'ts-node') {
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
