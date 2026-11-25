import { $d as init_runtime_core_esm_bundler, Zd as h } from "./vendor-Hx42-oQF.js";
//#region ../../modules/promotions/frontend/src/promotionResult.ts
init_runtime_core_esm_bundler();
/** Returns the URL when it uses http or https. */
function httpUrl(value) {
	if (!value) return void 0;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:" ? url.href : void 0;
	} catch {
		return;
	}
}
/** Renders the translated sentence when the warning has a safe link. */
function warningSegments(warning, reviewNotRecorded) {
	const url = httpUrl(warning.linkUrl);
	if (!url) return [{
		kind: "text",
		text: warning.message
	}];
	const [before, after = ""] = reviewNotRecorded.split("%%url%%");
	return [
		...before ? [{
			kind: "text",
			text: before
		}] : [],
		{
			kind: "link",
			url
		},
		...after ? [{
			kind: "text",
			text: after
		}] : []
	];
}
var externalLink = (href, label) => h("a", {
	href,
	target: "_blank",
	rel: "noopener noreferrer"
}, label);
/** Toast body for a selection promote. A link or a warning keeps the toast open. */
function promoteSuccessToast(result, text) {
	const warnings = result.warnings ?? [];
	const mergeRequestUrl = httpUrl(result.review?.webUrl);
	if (!mergeRequestUrl && warnings.length === 0) return { message: text.pushed };
	const summary = mergeRequestUrl ? externalLink(mergeRequestUrl, text.viewMergeRequest) : text.pushed;
	return {
		message: h("div", [h("div", [summary]), ...warnings.map((warning) => h("div", warningNodes(warning, text.reviewNotRecorded)))]),
		duration: 0
	};
}
var warningNodes = (warning, reviewNotRecorded) => warningSegments(warning, reviewNotRecorded).map((segment) => segment.kind === "link" ? externalLink(segment.url, segment.url) : segment.text);
/**
* Appends how many folders an Apply created, how many workflows and folders it moved within their
* projects, and how many folders it renamed, so prod does not change without notice. Moved
* workflows are part of the updated count.
*/
function withFolderNotes(i18n, message, { workflows, folders }) {
	const folderCount = (count) => i18n.baseText("promotions.applied.moved.folders", {
		adjustToNumber: count,
		interpolate: { count: String(count) }
	});
	const notes = message ? [message] : [];
	if (folders.created > 0) notes.push(i18n.baseText("promotions.applied.created", { interpolate: { folders: folderCount(folders.created) } }));
	if (workflows.moved + folders.moved > 0) notes.push(i18n.baseText("promotions.applied.moved", { interpolate: {
		workflows: i18n.baseText("promotions.applied.moved.workflows", {
			adjustToNumber: workflows.moved,
			interpolate: { count: String(workflows.moved) }
		}),
		folders: folderCount(folders.moved)
	} }));
	if (folders.renamed > 0) notes.push(i18n.baseText("promotions.applied.renamed", { interpolate: { folders: folderCount(folders.renamed) } }));
	return notes.join(" ");
}
//#endregion
export { withFolderNotes as i, promoteSuccessToast as n, warningSegments as r, httpUrl as t };
