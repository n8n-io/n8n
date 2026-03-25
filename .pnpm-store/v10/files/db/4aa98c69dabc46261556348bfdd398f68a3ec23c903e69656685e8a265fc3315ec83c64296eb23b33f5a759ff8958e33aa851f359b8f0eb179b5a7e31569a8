import { isZonedDateTime, toDate } from "./comparators.js";
import { getOptsByGranularity, normalizeHourCycle } from "./utils.js";
import { DATE_SEGMENT_PARTS, EDITABLE_SEGMENT_PARTS, TIME_SEGMENT_PARTS, isDateSegmentPart, isSegmentPart } from "./parts.js";
import { getPlaceholder } from "./placeholders.js";

//#region src/shared/date/parser.ts
const calendarDateTimeGranularities = [
	"hour",
	"minute",
	"second"
];
function syncTimeSegmentValues(props) {
	return Object.fromEntries(TIME_SEGMENT_PARTS.map((part) => {
		if (part === "dayPeriod") return [part, props.formatter.dayPeriod(toDate(props.value))];
		return [part, props.value[part]];
	}));
}
function syncSegmentValues(props) {
	const { formatter } = props;
	const dateValues = DATE_SEGMENT_PARTS.map((part) => {
		return [part, props.value[part]];
	});
	if ("hour" in props.value) {
		const timeValues = syncTimeSegmentValues({
			value: props.value,
			formatter
		});
		return {
			...Object.fromEntries(dateValues),
			...timeValues
		};
	}
	return Object.fromEntries(dateValues);
}
function initializeTimeSegmentValues(granularity) {
	return Object.fromEntries(TIME_SEGMENT_PARTS.map((part) => {
		if (part === "dayPeriod") return [part, "AM"];
		return [part, null];
	}).filter(([key]) => {
		if (key === "literal" || key === null) return false;
		if (granularity === "minute" && key === "second") return false;
		if (granularity === "hour" && (key === "second" || key === "minute")) return false;
		else return true;
	}));
}
function initializeSegmentValues(granularity) {
	const initialParts = EDITABLE_SEGMENT_PARTS.map((part) => {
		if (part === "dayPeriod") return [part, "AM"];
		return [part, null];
	}).filter(([key]) => {
		if (key === "literal" || key === null) return false;
		if (granularity === "minute" && key === "second") return false;
		if (granularity === "hour" && (key === "second" || key === "minute")) return false;
		if (granularity === "day") return !calendarDateTimeGranularities.includes(key) && key !== "dayPeriod";
		else return true;
	});
	return Object.fromEntries(initialParts);
}
function createContentObj(props) {
	const { segmentValues, formatter, locale } = props;
	function getPartContent(part) {
		if ("hour" in segmentValues) {
			const value = segmentValues[part];
			if (value !== null) {
				if (part === "day") return formatter.part(props.dateRef.set({
					[part]: value,
					month: segmentValues.month ?? 1
				}), part, { hourCycle: normalizeHourCycle(props.hourCycle) });
				return formatter.part(props.dateRef.set({ [part]: value }), part, { hourCycle: normalizeHourCycle(props.hourCycle) });
			} else return getPlaceholder(part, "", locale.value);
		} else {
			if (isDateSegmentPart(part)) {
				const value = segmentValues[part];
				if (value !== null) {
					if (part === "day") return formatter.part(props.dateRef.set({
						[part]: value,
						month: segmentValues.month ?? 1
					}), part);
					return formatter.part(props.dateRef.set({ [part]: value }), part);
				} else return getPlaceholder(part, "", locale.value);
			}
			return "";
		}
	}
	const content = Object.keys(segmentValues).reduce((obj, part) => {
		if (!isSegmentPart(part)) return obj;
		if ("hour" in segmentValues && part === "dayPeriod") {
			const value = segmentValues[part];
			if (value !== null) obj[part] = value;
			else obj[part] = getPlaceholder(part, "AM", locale.value);
		} else obj[part] = getPartContent(part);
		return obj;
	}, {});
	return content;
}
function createContentArr(props) {
	const { granularity, formatter, contentObj, hideTimeZone, hourCycle, isTimeValue } = props;
	const parts = formatter.toParts(props.dateRef, getOptsByGranularity(granularity, hourCycle, isTimeValue));
	const segmentContentArr = parts.map((part) => {
		const defaultParts = [
			"literal",
			"timeZoneName",
			null
		];
		if (defaultParts.includes(part.type) || !isSegmentPart(part.type)) return {
			part: part.type,
			value: part.value
		};
		return {
			part: part.type,
			value: contentObj[part.type]
		};
	}).filter((segment) => {
		if (segment.part === null || segment.value === null) return false;
		if (segment.part === "timeZoneName" && (!isZonedDateTime(props.dateRef) || hideTimeZone)) return false;
		return true;
	});
	return segmentContentArr;
}
function createContent(props) {
	const contentObj = createContentObj(props);
	const contentArr = createContentArr({
		contentObj,
		...props
	});
	return {
		obj: contentObj,
		arr: contentArr
	};
}

//#endregion
export { createContent, initializeSegmentValues, initializeTimeSegmentValues, syncSegmentValues, syncTimeSegmentValues };
//# sourceMappingURL=parser.js.map