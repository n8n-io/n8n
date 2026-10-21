// cdxgen 12.8.x pins undici 7.28.0. Resolve 7.29.1 instead. A workspace
// override does not work here, because CI installs this project with
// --ignore-workspace.
module.exports = {
	hooks: {
		readPackage(pkg) {
			if (pkg.name === '@cyclonedx/cdxgen' && pkg.dependencies?.undici) {
				pkg.dependencies.undici = '7.29.1';
			}
			return pkg;
		},
	},
};
