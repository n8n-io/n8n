'use strict';

var luxon = require('luxon');

CronDate.prototype.addYear = function() {
  this._date = this._date.plus({ years: 1 });
};

CronDate.prototype.addMonth = function() {
  this._date = this._date.plus({ months: 1 }).startOf('month');
};

CronDate.prototype.addDay = function() {
  this._date = this._date.plus({ days: 1 }).startOf('day');
};

CronDate.prototype.addHour = function() {
  var prev = this._date;
  this._date = this._date.plus({ hours: 1 }).startOf('hour');
  if (this._date <= prev) {
    this._date = this._date.plus({ hours: 1 });
  }
};

CronDate.prototype.addMinute = function() {
  var prev = this._date;
  this._date = this._date.plus({ minutes: 1 }).startOf('minute');
  if (this._date < prev) {
    this._date = this._date.plus({ hours: 1 });
  }
};

CronDate.prototype.addSecond = function() {
  var prev = this._date;
  this._date = this._date.plus({ seconds: 1 }).startOf('second');
  if (this._date < prev) {
    this._date = this._date.plus({ hours: 1 });
  }
};

CronDate.prototype.subtractYear = function() {
  this._date = this._date.minus({ years: 1 });
};

CronDate.prototype.subtractMonth = function() {
  this._date = this._date
    .minus({ months: 1 })
    .endOf('month')
    .startOf('second');
};

CronDate.prototype.subtractDay = function() {
  this._date = this._date
    .minus({ days: 1 })
    .endOf('day')
    .startOf('second');
};

CronDate.prototype.subtractHour = function() {
  var prev = this._date;
  this._date = this._date
    .minus({ hours: 1 })
    .endOf('hour')
    .startOf('second');
  if (this._date >= prev) {
    this._date = this._date.minus({ hours: 1 });
  }
};

CronDate.prototype.subtractMinute = function() {
  var prev = this._date;
  this._date = this._date.minus({ minutes: 1 })
    .endOf('minute')
    .startOf('second');
  if (this._date > prev) {
    this._date = this._date.minus({ hours: 1 });
  }
};

CronDate.prototype.subtractSecond = function() {
  var prev = this._date;
  this._date = this._date
    .minus({ seconds: 1 })
    .startOf('second');
  if (this._date > prev) {
    this._date = this._date.minus({ hours: 1 });
  }
};

CronDate.prototype.getDate = function() {
  return this._date.day;
};

CronDate.prototype.getFullYear = function() {
  return this._date.year;
};

CronDate.prototype.getDay = function() {
  var weekday = this._date.weekday;
  return weekday == 7 ? 0 : weekday;
};

CronDate.prototype.getMonth = function() {
  return this._date.month - 1;
};

CronDate.prototype.getHours = function() {
  return this._date.hour;
};

CronDate.prototype.getMinutes = function() {
  return this._date.minute;
};

CronDate.prototype.getSeconds = function() {
  return this._date.second;
};

CronDate.prototype.getMilliseconds = function() {
  return this._date.millisecond;
};

CronDate.prototype.getTime = function() {
  return this._date.valueOf();
};

CronDate.prototype.getUTCDate = function() {
  return this._getUTC().day;
};

CronDate.prototype.getUTCFullYear = function() {
  return this._getUTC().year;
};

CronDate.prototype.getUTCDay = function() {
  var weekday = this._getUTC().weekday;
  return weekday == 7 ? 0 : weekday;
};

CronDate.prototype.getUTCMonth = function() {
  return this._getUTC().month - 1;
};

CronDate.prototype.getUTCHours = function() {
  return this._getUTC().hour;
};

CronDate.prototype.getUTCMinutes = function() {
  return this._getUTC().minute;
};

CronDate.prototype.getUTCSeconds = function() {
  return this._getUTC().second;
};

CronDate.prototype.toISOString = function() {
  return this._date.toUTC().toISO();
};

CronDate.prototype.toJSON = function() {
  return this._date.toJSON();
};

CronDate.prototype.setDate = function(d) {
  this._date = this._date.set({ day: d });
};

CronDate.prototype.setFullYear = function(y) {
  this._date = this._date.set({ year: y });
};

CronDate.prototype.setDay = function(d) {
  this._date = this._date.set({ weekday: d });
};

CronDate.prototype.setMonth = function(m) {
  this._date = this._date.set({ month: m + 1 });
};

CronDate.prototype.setHours = function(h) {
  this._date = this._date.set({ hour: h });
};

CronDate.prototype.setMinutes = function(m) {
  this._date = this._date.set({ minute: m });
};

CronDate.prototype.setSeconds = function(s) {
  this._date = this._date.set({ second: s });
};

CronDate.prototype.setMilliseconds = function(s) {
  this._date = this._date.set({ millisecond: s });
};

CronDate.prototype._getUTC = function() {
  return this._date.toUTC();
};

CronDate.prototype.toString = function() {
  return this.toDate().toString();
};

CronDate.prototype.toDate = function() {
  return this._date.toJSDate();
};

CronDate.prototype.isLastDayOfMonth = function() {
  //next day
  var newDate = this._date.plus({ days: 1 }).startOf('day');
  return this._date.month !== newDate.month;
};

/**
 * Returns true when the current weekday is the last occurrence of this weekday
 * for the present month.
 */
CronDate.prototype.isLastWeekdayOfMonth = function() {
  // Check this by adding 7 days to the current date and seeing if it's
  // a different month
  var newDate = this._date.plus({ days: 7 }).startOf('day');
  return this._date.month !== newDate.month;
};

function CronDate (timestamp, tz) {
  var dateOpts = { zone: tz };
  if (!timestamp) {
    this._date = luxon.DateTime.local();
  } else if (timestamp instanceof CronDate) {
    this._date = timestamp._date;
  } else if (timestamp instanceof Date) {
    this._date = luxon.DateTime.fromJSDate(timestamp, dateOpts);
  } else if (typeof timestamp === 'number') {
    this._date = luxon.DateTime.fromMillis(timestamp, dateOpts);
  } else if (typeof timestamp === 'string') {
    this._date = luxon.DateTime.fromISO(timestamp, dateOpts);
    this._date.isValid || (this._date = luxon.DateTime.fromRFC2822(timestamp, dateOpts));
    this._date.isValid || (this._date = luxon.DateTime.fromSQL(timestamp, dateOpts));
    // RFC2822-like format without the required timezone offset (used in tests)
    this._date.isValid || (this._date = luxon.DateTime.fromFormat(timestamp, 'EEE, d MMM yyyy HH:mm:ss', dateOpts));
  }

  if (!this._date || !this._date.isValid) {
    throw new Error('CronDate: unhandled timestamp: ' + JSON.stringify(timestamp));
  }
  
  if (tz && tz !== this._date.zoneName) {
    this._date = this._date.setZone(tz);
  }
}

module.exports = CronDate;
