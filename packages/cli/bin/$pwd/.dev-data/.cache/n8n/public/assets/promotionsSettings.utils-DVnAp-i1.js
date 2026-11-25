import { sE as promotionProviderTypeCapabilities } from "./app-D5flEmb-.js";
//#region ../../modules/promotions/frontend/src/promotionsSettings.utils.ts
var promotionProviderIcon = {
	git: "git-branch",
	gitlab: "gitlab"
};
var promotionEnvironmentBranch = (environment) => environment.direction === "apply" ? environment.settings.branchName : environment.settings.baseBranchName;
var promotionEnvironmentDirectionFields = (direction, branch, createBranchOnPromotion) => direction === "apply" ? {
	direction,
	settings: {
		schemaVersion: 1,
		branchName: branch
	}
} : {
	direction,
	settings: {
		schemaVersion: 1,
		baseBranchName: branch,
		createBranchOnPromotion
	}
};
var isSamePromotionHostUrl = (current, next) => {
	try {
		return new URL(current).href.replace(/\/$/, "") === new URL(next).href.replace(/\/$/, "");
	} catch {
		return false;
	}
};
/**
* A short repository name, such as `acme/workflows`. GitLab remotes store their full path. For
* other remotes, the name comes from the clone URL. A URL in an unknown form shows as is.
*/
var repositoryDisplayName = (remote) => {
	if (remote.repositoryPath) return remote.repositoryPath;
	const url = remote.remoteUrl.replace(/\/+$/, "").replace(/\.git$/, "");
	const match = /^[a-z][a-z\d+.-]*:\/\/[^/]+\/(.+)$/i.exec(url) ?? /^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/.exec(url);
	return match ? match[1] : url;
};
var emptyProviderForm = (type = "git") => ({
	name: "",
	type,
	baseUrl: "",
	authType: promotionProviderTypeCapabilities[type].authTypes[0],
	keyType: "ed25519",
	username: "",
	password: "",
	regenerateKey: false
});
var providerFormFrom = (provider) => ({
	...emptyProviderForm(),
	name: provider.name,
	type: provider.type,
	baseUrl: "baseUrl" in provider.config ? provider.config.baseUrl : "",
	authType: provider.authType,
	keyType: "keyType" in provider.config ? provider.config.keyType : "ed25519"
});
var buildProviderCreatePayload = (form) => ({
	name: form.name.trim(),
	type: form.type,
	...promotionProviderTypeCapabilities[form.type].hasHostApi && { config: {
		schemaVersion: 1,
		baseUrl: form.baseUrl.trim()
	} },
	auth: form.authType === "ssh-key" ? {
		authType: "ssh-key",
		keyType: form.keyType
	} : {
		authType: "token",
		...form.type === "git" && { username: form.username.trim() },
		password: form.password
	}
});
/** If credentials are absent, the API keeps them. SSH rotation keeps the key type. */
var buildProviderUpdatePayload = (form, current) => {
	const payload = {};
	const name = form.name.trim();
	if (name !== current.name) payload.name = name;
	if ("baseUrl" in current.config && !isSamePromotionHostUrl(current.config.baseUrl, form.baseUrl)) payload.config = {
		schemaVersion: 1,
		baseUrl: form.baseUrl.trim()
	};
	const username = form.username.trim();
	if (form.authType === "ssh-key" && form.regenerateKey) payload.auth = { authType: "ssh-key" };
	else if (form.authType === "token" && form.password && (current.type !== "git" || username)) payload.auth = {
		authType: "token",
		...current.type === "git" && { username },
		password: form.password
	};
	return payload;
};
//#endregion
export { promotionEnvironmentBranch as a, providerFormFrom as c, isSamePromotionHostUrl as i, repositoryDisplayName as l, buildProviderUpdatePayload as n, promotionEnvironmentDirectionFields as o, emptyProviderForm as r, promotionProviderIcon as s, buildProviderCreatePayload as t };
