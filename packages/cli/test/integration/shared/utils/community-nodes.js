'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.emptyPackage = exports.mockNode = exports.mockPackage = exports.mockPackageName = void 0;
exports.mockPackagePair = mockPackagePair;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const constants_1 = require('@/constants');
const constants_2 = require('../constants');
const mockPackageName = () =>
	constants_1.NODE_PACKAGE_PREFIX + (0, backend_test_utils_1.randomName)();
exports.mockPackageName = mockPackageName;
const mockPackage = () =>
	di_1.Container.get(db_1.InstalledPackagesRepository).create({
		packageName: (0, exports.mockPackageName)(),
		installedVersion: constants_2.COMMUNITY_PACKAGE_VERSION.CURRENT,
		installedNodes: [],
	});
exports.mockPackage = mockPackage;
const mockNode = (packageName) => {
	const nodeName = (0, backend_test_utils_1.randomName)();
	return di_1.Container.get(db_1.InstalledNodesRepository).create({
		name: nodeName,
		type: `${packageName}.${nodeName}`,
		latestVersion: constants_2.COMMUNITY_NODE_VERSION.CURRENT,
		package: { packageName },
	});
};
exports.mockNode = mockNode;
const emptyPackage = async () => {
	const installedPackage = new db_1.InstalledPackages();
	installedPackage.installedNodes = [];
	return installedPackage;
};
exports.emptyPackage = emptyPackage;
function mockPackagePair() {
	const pkgA = (0, exports.mockPackage)();
	const nodeA = (0, exports.mockNode)(pkgA.packageName);
	pkgA.installedNodes = [nodeA];
	const pkgB = (0, exports.mockPackage)();
	const nodeB1 = (0, exports.mockNode)(pkgB.packageName);
	const nodeB2 = (0, exports.mockNode)(pkgB.packageName);
	pkgB.installedNodes = [nodeB1, nodeB2];
	return [pkgA, pkgB];
}
//# sourceMappingURL=community-nodes.js.map
