import { hasTime, isZonedDateTime, toDate } from "../date/comparators.js";
import { ref } from "vue";
import { DateFormatter, getLocalTimeZone, today } from "@internationalized/date";

//#region src/shared/useDateFormatter.ts
/**
* Creates a wrapper around the `DateFormatter`, which is
* an improved version of the {@link Intl.DateTimeFormat} API,
* that is used internally by the various date builders to
* easily format dates in a consistent way.
*
* @see [DateFormatter](https://react-spectrum.adobe.com/internationalized/date/DateFormatter.html)
*/
function useDateFormatter(initialLocale, opts = {}) {
	const locale = ref(initialLocale);
	function getLocale() {
		return locale.value;
	}
	function setLocale(newLocale) {
		locale.value = newLocale;
	}
	function custom(date, options) {
		return new DateFormatter(locale.value, {
			...opts,
			...options
		}).format(date);
	}
	function selectedDate(date, includeTime = true) {
		if (hasTime(date) && includeTime) return custom(toDate(date), {
			dateStyle: "long",
			timeStyle: "long"
		});
		else return custom(toDate(date), { dateStyle: "long" });
	}
	function fullMonthAndYear(date, options = {}) {
		return new DateFormatter(locale.value, {
			...opts,
			month: "long",
			year: "numeric",
			...options
		}).format(date);
	}
	function fullMonth(date, options = {}) {
		return new DateFormatter(locale.value, {
			...opts,
			month: "long",
			...options
		}).format(date);
	}
	function getMonths() {
		const defaultDate = today(getLocalTimeZone());
		const months = [
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11,
			12
		];
		return months.map((item) => ({
			label: fullMonth(toDate(defaultDate.set({ month: item }))),
			value: item
		}));
	}
	function fullYear(date, options = {}) {
		return new DateFormatter(locale.value, {
			...opts,
			year: "numeric",
			...options
		}).format(date);
	}
	function toParts(date, options) {
		if (isZonedDateTime(date)) return new DateFormatter(locale.value, {
			...opts,
			...options,
			timeZone: date.timeZone
		}).formatToParts(toDate(date));
		else return new DateFormatter(locale.value, {
			...opts,
			...options
		}).formatToParts(toDate(date));
	}
	function dayOfWeek(date, length = "narrow") {
		return new DateFormatter(locale.value, {
			...opts,
			weekday: length
		}).format(date);
	}
	function dayPeriod(date) {
		const parts = new DateFormatter(locale.value, {
			...opts,
			hour: "numeric",
			minute: "numeric"
		}).formatToParts(date);
		const value = parts.find((p) => p.type === "dayPeriod")?.value;
		if (value === "PM" || value === "p.m.") return "PM";
		return "AM";
	}
	const defaultPartOptions = {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric"
	};
	function part(dateObj, type, options = {}) {
		const opts$1 = {
			...defaultPartOptions,
			...options
		};
		const parts = toParts(dateObj, opts$1);
		const part$1 = parts.find((p) => p.type === type);
		return part$1 ? part$1.value : "";
	}
	return {
		setLocale,
		getLocale,
		fullMonth,
		fullYear,
		fullMonthAndYear,
		toParts,
		custom,
		part,
		dayPeriod,
		selectedDate,
		dayOfWeek,
		getMonths
	};
}

//#endregion
export { useDateFormatter };
//# sourceMappingURL=useDateFormatter.js.map