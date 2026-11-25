import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import "./useWorkflowVersionLabel-cYv19BC7.js";
//#region src/features/workflows/workflowHistory/utils.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var getLastPublishedVersion = (workflowPublishHistory) => {
	return workflowPublishHistory.findLast((history) => history.event === "activated");
};
var formatTimestamp = (value) => {
	const currentYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
	const [date, time] = (0, import_dateformat.default)(value, `${value.startsWith(currentYear) ? "" : "yyyy "}mmm d"#"HH:MM:ss`).split("#");
	return {
		date,
		time
	};
};
/**
* Computes timeline entries from workflow history, grouping consecutive unnamed versions.
* Named versions are shown as individual entries.
* Consecutive unnamed versions are grouped into collapsible blocks.
* The first item is always shown separately (never grouped).
*/
var computeTimelineEntries = (items) => {
	const entries = [];
	let currentGroup = [];
	let groupCounter = 0;
	const flushGroup = () => {
		if (currentGroup.length > 0) {
			entries.push({
				type: "group-header",
				groupId: `group-${groupCounter++}`,
				count: currentGroup.length,
				versions: [...currentGroup]
			});
			currentGroup = [];
		}
	};
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!(i === 0) && !item.name?.trim()) currentGroup.push({
			type: "version",
			item,
			originalIndex: i,
			isGrouped: true
		});
		else {
			flushGroup();
			entries.push({
				type: "version",
				item,
				originalIndex: i,
				isGrouped: false
			});
		}
	}
	flushGroup();
	return entries;
};
var getPublishedVersionId = (workflow) => {
	if (!workflow) return;
	return workflow.activeVersionId ?? workflow.activeVersion?.versionId ?? void 0;
};
//#endregion
export { getPublishedVersionId as i, formatTimestamp as n, getLastPublishedVersion as r, computeTimelineEntries as t };
