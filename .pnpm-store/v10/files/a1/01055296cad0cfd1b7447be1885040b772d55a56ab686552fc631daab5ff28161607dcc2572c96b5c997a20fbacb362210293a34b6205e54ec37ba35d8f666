// Most of the code here is from Luxon
// Copyright 2019 JS Foundation and other contributors

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const ianaRegex =
  /^[A-Za-z_+-]{1,256}(:?\/[A-Za-z_+-]{1,256}(\/[A-Za-z_+-]{1,256})?)?$/;

const typeToPos = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
  minute: 4,
  second: 5,
};

function isValidIanaSpecifier(s) {
  return !!(s && s.match(ianaRegex));
}

function hackyOffset(dtf, date) {
  const formatted = dtf.format(date).replace(/\u200E/g, "");
  const parsed = /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+):(\d+)/.exec(formatted);
  const [, fMonth, fDay, fYear, fHour, fMinute, fSecond] = parsed;
  return [fYear, fMonth, fDay, fHour, fMinute, fSecond];
}

function partsOffset(dtf, date) {
  const formatted = dtf.formatToParts(date);
  const filled = [];
  for (let i = 0; i < formatted.length; i++) {
    const { type, value } = formatted[i];
    const pos = typeToPos[type];

    if (typeof pos !== "undefined") {
      filled[pos] = parseInt(value, 10);
    }
  }
  return filled;
}

function makeDTF(zone) {
  return new Intl.DateTimeFormat("en-US", {
    hourCycle: "h23",
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// covert a calendar object to a local timestamp (epoch, but with the offset baked in)
function objToLocalTS(obj) {
  let d = Date.UTC(
    obj.year,
    obj.month - 1,
    obj.day,
    obj.hour,
    obj.minute,
    obj.second,
    obj.millisecond,
  );

  // for legacy reasons, years between 0 and 99 are interpreted as 19XX; revert that
  if (obj.year < 100 && obj.year >= 0) {
    d = new Date(d);
    d.setUTCFullYear(d.getUTCFullYear() - 1900);
  }
  return +d;
}

export function getZoneOffset(timeZoneName) {
  if (!isValidIanaSpecifier(timeZoneName)) {
    return false;
  }

  const date = new Date(Date.now());

  let dtf;

  try {
    dtf = makeDTF(timeZoneName);
  } catch (_) {
    return false;
  }

  const [year, month, day, hour, minute, second] = dtf.formatToParts
    ? partsOffset(dtf, date)
    : hackyOffset(dtf, date);

  const asUTC = objToLocalTS({
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond: 0,
  });

  let asTS = +date;
  const over = asTS % 1000;
  asTS -= over >= 0 ? over : 1000 + over;
  return (asUTC - asTS) / (60 * 1000);
}
