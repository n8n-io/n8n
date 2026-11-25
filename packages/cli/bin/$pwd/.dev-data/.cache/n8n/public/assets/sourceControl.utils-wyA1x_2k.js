import { o as __toESM, t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Er as require__baseEach, Zd as h, ba as require__baseAssignValue, bi as require__baseIteratee, if as nextTick, jo as require_isArray, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { d_ as PROTECTED_INSTANCE_DOCS_URL, fC as VIEWS, jN as useI18n, p as telemetry, vE as SOURCE_CONTROL_FILE_STATUS } from "./app-D5flEmb-.js";
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_arrayAggregator.js
var require__arrayAggregator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* A specialized version of `baseAggregator` for arrays.
	*
	* @private
	* @param {Array} [array] The array to iterate over.
	* @param {Function} setter The function to set `accumulator` values.
	* @param {Function} iteratee The iteratee to transform keys.
	* @param {Object} accumulator The initial aggregated object.
	* @returns {Function} Returns `accumulator`.
	*/
	function arrayAggregator(array, setter, iteratee, accumulator) {
		var index = -1, length = array == null ? 0 : array.length;
		while (++index < length) {
			var value = array[index];
			setter(accumulator, value, iteratee(value), array);
		}
		return accumulator;
	}
	module.exports = arrayAggregator;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_baseAggregator.js
var require__baseAggregator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseEach = require__baseEach();
	/**
	* Aggregates elements of `collection` on `accumulator` with keys transformed
	* by `iteratee` and values set by `setter`.
	*
	* @private
	* @param {Array|Object} collection The collection to iterate over.
	* @param {Function} setter The function to set `accumulator` values.
	* @param {Function} iteratee The iteratee to transform keys.
	* @param {Object} accumulator The initial aggregated object.
	* @returns {Function} Returns `accumulator`.
	*/
	function baseAggregator(collection, setter, iteratee, accumulator) {
		baseEach(collection, function(value, key, collection) {
			setter(accumulator, value, iteratee(value), collection);
		});
		return accumulator;
	}
	module.exports = baseAggregator;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_createAggregator.js
var require__createAggregator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var arrayAggregator = require__arrayAggregator();
	var baseAggregator = require__baseAggregator();
	var baseIteratee = require__baseIteratee();
	var isArray = require_isArray();
	/**
	* Creates a function like `_.groupBy`.
	*
	* @private
	* @param {Function} setter The function to set accumulator values.
	* @param {Function} [initializer] The accumulator object initializer.
	* @returns {Function} Returns the new aggregator function.
	*/
	function createAggregator(setter, initializer) {
		return function(collection, iteratee) {
			var func = isArray(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
			return func(collection, setter, baseIteratee(iteratee, 2), accumulator);
		};
	}
	module.exports = createAggregator;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/groupBy.js
var require_groupBy = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var baseAssignValue = require__baseAssignValue();
	var createAggregator = require__createAggregator();
	/** Used to check objects for own properties. */
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	module.exports = createAggregator(function(result, value, key) {
		if (hasOwnProperty.call(result, key)) result[key].push(value);
		else baseAssignValue(result, key, [value]);
	});
}));
//#endregion
//#region src/features/integrations/sourceControl.ee/sourceControl.utils.ts
init_runtime_core_esm_bundler();
var import_groupBy = /* @__PURE__ */ __toESM(require_groupBy(), 1);
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var i18n = useI18n();
/** Tooltip HTML that explains why an action is disabled on a protected instance. */
var getProtectedInstanceTooltip = () => i18n.baseText("readOnlyEnv.tooltip", { interpolate: { link: `<a href="${PROTECTED_INSTANCE_DOCS_URL}" target="_blank">${i18n.baseText("readOnlyEnv.tooltip.link")}</a>` } });
var getStatusText = (status) => i18n.baseText(`settings.sourceControl.status.${status}`);
var getStatusTheme = (status) => {
	return {
		[SOURCE_CONTROL_FILE_STATUS.created]: "success",
		[SOURCE_CONTROL_FILE_STATUS.deleted]: "danger",
		[SOURCE_CONTROL_FILE_STATUS.modified]: "warning"
	}[status];
};
/** A content-import policy blocks this file, so the pull skips it. */
var isBlockedByPolicy = (file) => (file.contentImportPolicy?.violations.length ?? 0) > 0;
/** A policy check failed on this file, so the pull is likely to fail as a whole. */
var isPolicyCheckFailed = (file) => !isBlockedByPolicy(file) && (file.contentImportPolicy?.checkErrors.length ?? 0) > 0;
var pullStatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.modified]: 2,
	[SOURCE_CONTROL_FILE_STATUS.created]: 1,
	[SOURCE_CONTROL_FILE_STATUS.deleted]: 3
};
var getPullPriorityByStatus = (status) => pullStatusPriority[status] ?? 0;
var pushStatusPriority = {
	[SOURCE_CONTROL_FILE_STATUS.modified]: 1,
	[SOURCE_CONTROL_FILE_STATUS.renamed]: 2,
	[SOURCE_CONTROL_FILE_STATUS.created]: 3,
	[SOURCE_CONTROL_FILE_STATUS.deleted]: 4
};
var getPushPriorityByStatus = (status) => pushStatusPriority[status] ?? 0;
var createVariablesToast = (router) => {
	const route = {
		name: VIEWS.HOME_VARIABLES,
		query: { incomplete: "true" }
	};
	const { href } = router.resolve(route);
	return {
		title: i18n.baseText("settings.sourceControl.pull.upToDate.variables.title"),
		message: h("a", {
			href,
			onClick: (e) => {
				e.preventDefault();
				telemetry.track("User clicked review variables");
				router.push(route);
			}
		}, i18n.baseText("settings.sourceControl.pull.upToDate.variables.description")),
		type: "info",
		duration: 0
	};
};
var createCredentialsToast = (router) => {
	const route = {
		name: VIEWS.CREDENTIALS,
		query: { setupNeeded: "true" }
	};
	const { href } = router.resolve(route);
	return {
		title: i18n.baseText("settings.sourceControl.pull.upToDate.credentials.title"),
		message: h("a", {
			href,
			onClick: (e) => {
				e.preventDefault();
				telemetry.track("User clicked review credentials");
				router.push(route);
			}
		}, i18n.baseText("settings.sourceControl.pull.upToDate.credentials.description")),
		type: "info",
		duration: 0
	};
};
var pullMessage = ({ credential, tags, variables, datatable, workflow, folders, project }) => {
	const messages = [];
	if (workflow?.length) messages.push(i18n.baseText("generic.workflow", {
		adjustToNumber: workflow.length,
		interpolate: { count: workflow.length }
	}));
	if (credential?.length) messages.push(i18n.baseText("generic.credential", {
		adjustToNumber: credential.length,
		interpolate: { count: credential.length }
	}));
	if (variables?.length) messages.push(i18n.baseText("generic.variable_plural"));
	if (datatable?.length) messages.push(i18n.baseText("generic.datatable", {
		adjustToNumber: datatable.length,
		interpolate: { count: datatable.length }
	}));
	if (tags?.length) messages.push(i18n.baseText("generic.tag_plural"));
	if (folders?.length) messages.push(i18n.baseText("generic.folders_plural"));
	if (project?.length) messages.push(i18n.baseText("generic.projects"));
	const totalCount = (workflow?.length ?? 0) + (credential?.length ?? 0) + (variables?.length ?? 0) + (datatable?.length ?? 0) + (tags?.length ?? 0) + (folders?.length ?? 0) + (project?.length ?? 0);
	const verbCount = !!(variables?.length || tags?.length || folders?.length || project?.length) ? Math.max(totalCount, 2) : totalCount;
	return [new Intl.ListFormat(i18n.locale, {
		style: "long",
		type: "conjunction"
	}).format(messages), i18n.baseText("settings.sourceControl.pull.success.description", { adjustToNumber: verbCount })].join(" ");
};
function buildWorkflowTreeRows(workflows) {
	const rows = [];
	const seenFolders = /* @__PURE__ */ new Set();
	for (const workflow of workflows) {
		const path = workflow.folderPath ?? [];
		let pathKey = "";
		for (const [index, segment] of path.entries()) {
			pathKey = pathKey ? `${pathKey}/${segment}` : segment;
			if (seenFolders.has(pathKey)) continue;
			rows.push({
				id: `folder:${pathKey}`,
				type: "folder",
				name: segment,
				depth: index
			});
			seenFolders.add(pathKey);
		}
		rows.push({
			id: `file:${workflow.id}`,
			type: "file",
			file: workflow,
			depth: path.length
		});
	}
	return rows;
}
var buildFolderFilterOptions = (workflows) => {
	const folderPathSet = /* @__PURE__ */ new Set();
	for (const workflow of workflows) for (const pathSegments of [workflow.folderPath, workflow.remoteFolderPath]) {
		let path = "";
		for (const segment of pathSegments ?? []) {
			path = path ? `${path}/${segment}` : segment;
			folderPathSet.add(path);
		}
	}
	return Array.from(folderPathSet).sort((a, b) => {
		const depthDiff = a.split("/").length - b.split("/").length;
		if (depthDiff !== 0) return depthDiff;
		return a.localeCompare(b);
	}).map((path) => ({
		label: path.replaceAll("/", " / "),
		value: path
	}));
};
var formatSourceControlUpdatedAt = (updatedAt) => {
	const currentYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
	return i18n.baseText("settings.sourceControl.lastUpdated", { interpolate: {
		date: (0, import_dateformat.default)(updatedAt, `d mmm${updatedAt?.startsWith(currentYear) ? "" : ", yyyy"}`),
		time: (0, import_dateformat.default)(updatedAt, "HH:MM")
	} });
};
var notifyUserAboutPullWorkFolderOutcome = async (files, toast, router) => {
	if (!files?.length) {
		toast.showMessage({
			title: i18n.baseText("settings.sourceControl.pull.upToDate.title"),
			message: i18n.baseText("settings.sourceControl.pull.upToDate.description"),
			type: "success"
		});
		return;
	}
	const pulled = files.filter((file) => !isBlockedByPolicy(file));
	const { credential, tags, variables, datatable, workflow, folders, project } = (0, import_groupBy.default)(pulled, "type");
	const successToast = {
		title: i18n.baseText("settings.sourceControl.pull.success.title"),
		message: pullMessage({
			credential,
			tags,
			variables,
			datatable,
			workflow,
			folders,
			project
		}),
		type: "success"
	};
	const toastMessages = [
		...variables?.length ? [createVariablesToast(router)] : [],
		...credential?.length ? [createCredentialsToast(router)] : [],
		...pulled.length ? [successToast] : []
	];
	for (const message of toastMessages) {
		/**
		* the toasts stack in a reversed way, resulting in
		* Success
		* Credentials
		* Variables
		*/
		toast.showToast(message);
		await nextTick();
	}
};
//#endregion
export { getPullPriorityByStatus as a, getStatusTheme as c, notifyUserAboutPullWorkFolderOutcome as d, getProtectedInstanceTooltip as i, isBlockedByPolicy as l, buildWorkflowTreeRows as n, getPushPriorityByStatus as o, formatSourceControlUpdatedAt as r, getStatusText as s, buildFolderFilterOptions as t, isPolicyCheckFailed as u };
