
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
Object.defineProperty(exports, 'DATE_SEGMENT_PARTS', {
  enumerable: true,
  get: function () {
    return DATE_SEGMENT_PARTS;
  }
});
Object.defineProperty(exports, 'EDITABLE_SEGMENT_PARTS', {
  enumerable: true,
  get: function () {
    return EDITABLE_SEGMENT_PARTS;
  }
});
Object.defineProperty(exports, 'TIME_SEGMENT_PARTS', {
  enumerable: true,
  get: function () {
    return TIME_SEGMENT_PARTS;
  }
});
Object.defineProperty(exports, 'isDateSegmentPart', {
  enumerable: true,
  get: function () {
    return isDateSegmentPart;
  }
});
Object.defineProperty(exports, 'isSegmentPart', {
  enumerable: true,
  get: function () {
    return isSegmentPart;
  }
});
//# sourceMappingURL=parts.cjs.map