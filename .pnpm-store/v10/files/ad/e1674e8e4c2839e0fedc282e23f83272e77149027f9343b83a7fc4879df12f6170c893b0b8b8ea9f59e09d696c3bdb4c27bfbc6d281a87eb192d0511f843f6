const ddd = `(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:[ne|u?r]?s?day)?`;
const mmm = `(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)`;
const time = `(\\d?\\d):(\\d{2}):(\\d{2})(?:\\.(\\d+))?`;
const date = `(\\d?\\d)`;
const year = `(\\d{4})`;
const RFC3339_WITH_OFFSET = new RegExp(/^(\d{4})-(\d\d)-(\d\d)[tT](\d\d):(\d\d):(\d\d)(\.(\d+))?(([-+]\d\d:\d\d)|[zZ])$/);
const IMF_FIXDATE = new RegExp(`^${ddd}, ${date} ${mmm} ${year} ${time} GMT$`);
const RFC_850_DATE = new RegExp(`^${ddd}, ${date}-${mmm}-(\\d\\d) ${time} GMT$`);
const ASC_TIME = new RegExp(`^${ddd} ${mmm} ( [1-9]|\\d\\d) ${time} ${year}$`);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const _parseEpochTimestamp = (value) => {
    if (value == null) {
        return void 0;
    }
    let num = NaN;
    if (typeof value === "number") {
        num = value;
    }
    else if (typeof value === "string") {
        if (!/^-?\d*\.?\d+$/.test(value)) {
            throw new TypeError(`parseEpochTimestamp - numeric string invalid.`);
        }
        num = Number.parseFloat(value);
    }
    else if (typeof value === "object" && value.tag === 1) {
        num = value.value;
    }
    if (isNaN(num) || Math.abs(num) === Infinity) {
        throw new TypeError("Epoch timestamps must be valid finite numbers.");
    }
    return new Date(Math.round(num * 1000));
};
export const _parseRfc3339DateTimeWithOffset = (value) => {
    if (value == null) {
        return void 0;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC3339 timestamps must be strings");
    }
    const matches = RFC3339_WITH_OFFSET.exec(value);
    if (!matches) {
        throw new TypeError(`Invalid RFC3339 timestamp format ${value}`);
    }
    const [, yearStr, monthStr, dayStr, hours, minutes, seconds, , ms, offsetStr] = matches;
    range(monthStr, 1, 12);
    range(dayStr, 1, 31);
    range(hours, 0, 23);
    range(minutes, 0, 59);
    range(seconds, 0, 60);
    const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr), Number(hours), Number(minutes), Number(seconds), Number(ms) ? Math.round(parseFloat(`0.${ms}`) * 1000) : 0));
    date.setUTCFullYear(Number(yearStr));
    if (offsetStr.toUpperCase() != "Z") {
        const [, sign, offsetH, offsetM] = /([+-])(\d\d):(\d\d)/.exec(offsetStr) || [void 0, "+", 0, 0];
        const scalar = sign === "-" ? 1 : -1;
        date.setTime(date.getTime() + scalar * (Number(offsetH) * 60 * 60 * 1000 + Number(offsetM) * 60 * 1000));
    }
    return date;
};
export const _parseRfc7231DateTime = (value) => {
    if (value == null) {
        return void 0;
    }
    if (typeof value !== "string") {
        throw new TypeError("RFC7231 timestamps must be strings.");
    }
    let day;
    let month;
    let year;
    let hour;
    let minute;
    let second;
    let fraction;
    let matches;
    if ((matches = IMF_FIXDATE.exec(value))) {
        [, day, month, year, hour, minute, second, fraction] = matches;
    }
    else if ((matches = RFC_850_DATE.exec(value))) {
        [, day, month, year, hour, minute, second, fraction] = matches;
        year = (Number(year) + 1900).toString();
    }
    else if ((matches = ASC_TIME.exec(value))) {
        [, month, day, hour, minute, second, fraction, year] = matches;
    }
    if (year && second) {
        const timestamp = Date.UTC(Number(year), months.indexOf(month), Number(day), Number(hour), Number(minute), Number(second), fraction ? Math.round(parseFloat(`0.${fraction}`) * 1000) : 0);
        range(day, 1, 31);
        range(hour, 0, 23);
        range(minute, 0, 59);
        range(second, 0, 60);
        const date = new Date(timestamp);
        date.setUTCFullYear(Number(year));
        return date;
    }
    throw new TypeError(`Invalid RFC7231 date-time value ${value}.`);
};
function range(v, min, max) {
    const _v = Number(v);
    if (_v < min || _v > max) {
        throw new Error(`Value ${_v} out of range [${min}, ${max}]`);
    }
}
