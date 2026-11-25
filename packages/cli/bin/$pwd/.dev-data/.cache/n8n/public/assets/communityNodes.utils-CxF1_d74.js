import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, la as require_semver, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { AN as i18n, Cw as uninstallPackage, EA as STORES, Sm as isAuthenticated, Sw as installNewPackage, bC as useRootStore, bw as getAvailableCommunityPackageCount, ww as updatePackage, xw as getInstalledCommunityNodes } from "./app-D5flEmb-.js";
//#region src/features/settings/communityNodes/communityNodes.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var LOADER_DELAY = 300;
var useCommunityNodesStore = defineStore(STORES.COMMUNITY_NODES, () => {
	const availablePackageCount = ref(-1);
	const installedPackages = ref({});
	const rootStore = useRootStore();
	const getInstalledPackages = computed(() => {
		return Object.values(installedPackages.value).sort((a, b) => a.packageName.localeCompare(b.packageName));
	});
	const fetchAvailableCommunityPackageCount = async () => {
		if (availablePackageCount.value === -1) availablePackageCount.value = await getAvailableCommunityPackageCount();
	};
	const setInstalledPackages = (packages) => {
		installedPackages.value = packages.reduce((packageMap, pack) => {
			packageMap[pack.packageName] = pack;
			return packageMap;
		}, {});
	};
	const fetchInstalledPackages = async () => {
		if (!isAuthenticated()) return;
		const installedPackages = await getInstalledCommunityNodes(rootStore.restApiContext);
		setInstalledPackages(installedPackages);
		const timeout = installedPackages.length > 0 ? 0 : LOADER_DELAY;
		setTimeout(() => {}, timeout);
	};
	const installPackage = async (packageName, version) => {
		const installedPackage = await installNewPackage(rootStore.restApiContext, packageName, version);
		await fetchInstalledPackages();
		return installedPackage;
	};
	const uninstallPackage$1 = async (packageName) => {
		await uninstallPackage(rootStore.restApiContext, packageName);
		removePackageByName(packageName);
	};
	const removePackageByName = (name) => {
		const { [name]: removedPackage, ...remainingPackages } = installedPackages.value;
		installedPackages.value = remainingPackages;
	};
	const updatePackageObject = (newPackage) => {
		installedPackages.value[newPackage.packageName] = newPackage;
	};
	const updatePackage$1 = async (packageName, version) => {
		const packageToUpdate = installedPackages.value[packageName];
		const updatedPackage = await updatePackage(rootStore.restApiContext, packageToUpdate.packageName, version);
		updatePackageObject(updatedPackage);
	};
	const getInstalledPackage = async (packageName) => {
		if (!getInstalledPackages.value.length) await fetchInstalledPackages();
		return getInstalledPackages.value.find((p) => p.packageName === packageName);
	};
	return {
		installedPackages,
		getInstalledPackage,
		getInstalledPackages,
		availablePackageCount,
		fetchAvailableCommunityPackageCount,
		fetchInstalledPackages,
		installPackage,
		uninstallPackage: uninstallPackage$1,
		updatePackage: updatePackage$1,
		setInstalledPackages
	};
});
//#endregion
//#region src/features/settings/communityNodes/communityNodes.utils.ts
var import_semver = /* @__PURE__ */ __toESM(require_semver(), 1);
async function findVettedCommunityNodeAttributes(nodeTypes, getCommunityNodeAttributes) {
	for (const nodeType of nodeTypes) {
		const attributes = await getCommunityNodeAttributes(nodeType);
		if (attributes) return attributes;
	}
	return null;
}
function isCommunityPackageUpdateAvailable({ installedVersion, updateAvailable, latestVerifiedVersion, isCommunityNodesFeatureEnabled, isUnverifiedPackagesEnabled, isManagedByEnv }) {
	if (isManagedByEnv) return false;
	if (isUnverifiedPackagesEnabled && updateAvailable) return true;
	return Boolean(isCommunityNodesFeatureEnabled && latestVerifiedVersion && import_semver.default.gt(latestVerifiedVersion, installedVersion));
}
/** True when the error rejects a package because of its node API version. */
var isNodesApiVersionError = (error) => {
	const e = error;
	return e?.httpStatusCode === 400 && "requiredNodesApiVersion" in (e.meta ?? {});
};
/** The install toast message, or `undefined` when no policy blocks a node from the package. */
function describeInstallPolicyNote(restrictions, totalNodes) {
	const blocked = restrictions?.nodeTypes ?? [];
	const onInstance = blocked.filter((node) => node.blockedOn === "instance");
	const inProjects = blocked.filter((node) => node.blockedOn === "projects");
	const sentences = [];
	if (onInstance.length > 0) {
		sentences.push(i18n.baseText("settings.communityNodes.messages.install.policyNote.instance", {
			adjustToNumber: onInstance.length,
			interpolate: {
				count: String(onInstance.length),
				total: String(totalNodes)
			}
		}));
		if (onInstance.some((node) => node.optInAvailable)) sentences.push(i18n.baseText("settings.communityNodes.messages.install.policyNote.optIn"));
	}
	if (inProjects.length > 0) sentences.push(i18n.baseText("settings.communityNodes.messages.install.policyNote.projects", {
		adjustToNumber: inProjects.length,
		interpolate: { count: String(inProjects.length) }
	}));
	return sentences.length > 0 ? sentences.join(" ") : void 0;
}
/** The install toast message for the node the user installed the package to use. */
function describeSelectedNodeRestriction(displayName, scope) {
	return i18n.baseText(scope === "project" ? "settings.communityNodes.messages.install.policyNote.selected.project" : "settings.communityNodes.messages.install.policyNote.selected.instance", { interpolate: { nodeType: displayName } });
}
//#endregion
export { isNodesApiVersionError as a, isCommunityPackageUpdateAvailable as i, describeSelectedNodeRestriction as n, useCommunityNodesStore as o, findVettedCommunityNodeAttributes as r, describeInstallPolicyNote as t };
