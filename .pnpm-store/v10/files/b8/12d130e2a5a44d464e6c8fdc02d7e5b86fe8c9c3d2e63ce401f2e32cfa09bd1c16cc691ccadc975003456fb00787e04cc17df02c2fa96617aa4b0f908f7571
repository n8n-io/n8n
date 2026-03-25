//#region src/shared/date/parts.ts
const DATE_SEGMENT_PARTS = [
	"day",
	"month",
	"year"
];
const TIME_SEGMENT_PARTS = [
	"hour",
	"minute",
	"second",
	"dayPeriod"
];
const NON_EDITABLE_SEGMENT_PARTS = ["literal", "timeZoneName"];
const EDITABLE_SEGMENT_PARTS = [...DATE_SEGMENT_PARTS, ...TIME_SEGMENT_PARTS];
const EDITABLE_TIME_SEGMENT_PARTS = [...TIME_SEGMENT_PARTS];
const ALL_SEGMENT_PARTS = [...EDITABLE_SEGMENT_PARTS, ...NON_EDITABLE_SEGMENT_PARTS];
const ALL_EXCEPT_LITERAL_PARTS = ALL_SEGMENT_PARTS.filter((part) => part !== "literal");
function isDateSegmentPart(part) {
	return DATE_SEGMENT_PARTS.includes(part);
}
function isSegmentPart(part) {
	return EDITABLE_SEGMENT_PARTS.includes(part);
}

//#endregion
export { DATE_SEGMENT_PARTS, EDITABLE_SEGMENT_PARTS, TIME_SEGMENT_PARTS, isDateSegmentPart, isSegmentPart };
//# sourceMappingURL=parts.js.map