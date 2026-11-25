//#region src/features/ai/instanceAi/autoApproval.ts
/** Card messages can carry a preview after the first line. The label keeps the first line. */
function autoApprovalLabel(i18n, approval) {
	return i18n.baseText("instanceAi.autoApproval.label", { interpolate: { action: approval.message.split("\n")[0].trim() } });
}
/** The judge explains its own decision. The low-risk rule has one fixed reason. */
function autoApprovalReason(i18n, approval) {
	return approval.decidedBy === "rule" ? i18n.baseText("instanceAi.autoApproval.lowRisk") : approval.reason;
}
//#endregion
export { autoApprovalReason as n, autoApprovalLabel as t };
