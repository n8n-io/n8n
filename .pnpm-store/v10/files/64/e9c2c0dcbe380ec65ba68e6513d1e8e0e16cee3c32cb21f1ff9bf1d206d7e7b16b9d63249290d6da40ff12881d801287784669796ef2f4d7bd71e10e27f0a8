const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_comparators = require('../date/comparators.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

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
	const locale = (0, vue.ref)(initialLocale);
	function getLocale() {
		return locale.value;
	}
	function setLocale(newLocale) {
		locale.value = newLocale;
	}
	function custom(date, options) {
		return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			...options
		}).format(date);
	}
	function selectedDate(date, includeTime = true) {
		if (require_date_comparators.hasTime(date) && includeTime) return custom(require_date_comparators.toDate(date), {
			dateStyle: "long",
			timeStyle: "long"
		});
		else return custom(require_date_comparators.toDate(date), { dateStyle: "long" });
	}
	function fullMonthAndYear(date, options = {}) {
		return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			month: "long",
			year: "numeric",
			...options
		}).format(date);
	}
	function fullMonth(date, options = {}) {
		return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			month: "long",
			...options
		}).format(date);
	}
	function getMonths() {
		const defaultDate = (0, __internationalized_date.today)((0, __internationalized_date.getLocalTimeZone)());
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
			label: fullMonth(require_date_comparators.toDate(defaultDate.set({ month: item }))),
			value: item
		}));
	}
	function fullYear(date, options = {}) {
		return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			year: "numeric",
			...options
		}).format(date);
	}
	function toParts(date, options) {
		if (require_date_comparators.isZonedDateTime(date)) return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			...options,
			timeZone: date.timeZone
		}).formatToParts(require_date_comparators.toDate(date));
		else return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			...options
		}).formatToParts(require_date_comparators.toDate(date));
	}
	function dayOfWeek(date, length = "narrow") {
		return new __internationalized_date.DateFormatter(locale.value, {
			...opts,
			weekday: length
		}).format(date);
	}
	function dayPeriod(date) {
		const parts = new __internationalized_date.DateFormatter(locale.value, {
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
Object.defineProperty(exports, 'useDateFormatter', {
  enumerable: true,
  get: function () {
    return useDateFormatter;
  }
});
//# sourceMappingURL=useDateFormatter.cjs.map