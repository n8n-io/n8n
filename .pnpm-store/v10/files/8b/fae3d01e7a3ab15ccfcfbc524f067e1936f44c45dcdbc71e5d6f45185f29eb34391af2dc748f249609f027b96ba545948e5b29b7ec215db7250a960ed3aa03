import { dateInTimeZone, timeToUntilString } from './dateutil';
var DateWithZone = /** @class */ (function () {
    function DateWithZone(date, tzid) {
        if (isNaN(date.getTime())) {
            throw new RangeError('Invalid date passed to DateWithZone');
        }
        this.date = date;
        this.tzid = tzid;
    }
    Object.defineProperty(DateWithZone.prototype, "isUTC", {
        get: function () {
            return !this.tzid || this.tzid.toUpperCase() === 'UTC';
        },
        enumerable: false,
        configurable: true
    });
    DateWithZone.prototype.toString = function () {
        var datestr = timeToUntilString(this.date.getTime(), this.isUTC);
        if (!this.isUTC) {
            return ";TZID=".concat(this.tzid, ":").concat(datestr);
        }
        return ":".concat(datestr);
    };
    DateWithZone.prototype.getTime = function () {
        return this.date.getTime();
    };
    DateWithZone.prototype.rezonedDate = function () {
        if (this.isUTC) {
            return this.date;
        }
        return dateInTimeZone(this.date, this.tzid);
    };
    return DateWithZone;
}());
export { DateWithZone };
//# sourceMappingURL=datewithzone.js.map