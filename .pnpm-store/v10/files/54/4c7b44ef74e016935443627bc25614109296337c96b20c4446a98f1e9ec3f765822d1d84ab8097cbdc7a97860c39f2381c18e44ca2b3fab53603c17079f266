'use strict';
var type_1 = require("../type");
var YAML_TIMESTAMP_REGEXP = new RegExp('^([0-9][0-9][0-9][0-9])' +
    '-([0-9][0-9]?)' +
    '-([0-9][0-9]?)' +
    '(?:(?:[Tt]|[ \\t]+)' +
    '([0-9][0-9]?)' +
    ':([0-9][0-9])' +
    ':([0-9][0-9])' +
    '(?:\\.([0-9]*))?' +
    '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' +
    '(?::([0-9][0-9]))?))?)?$');
function resolveYamlTimestamp(data) {
    if (null === data) {
        return false;
    }
    var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
    match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (null === match) {
        return false;
    }
    return true;
}
function constructYamlTimestamp(data) {
    var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
    match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (null === match) {
        throw new Error('Date resolve error');
    }
    year = +(match[1]);
    month = +(match[2]) - 1;
    day = +(match[3]);
    if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
    }
    hour = +(match[4]);
    minute = +(match[5]);
    second = +(match[6]);
    if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
            fraction = fraction + '0';
        }
        fraction = +fraction;
    }
    if (match[9]) {
        tz_hour = +(match[10]);
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 60000;
        if ('-' === match[9]) {
            delta = -delta;
        }
    }
    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) {
        date.setTime(date.getTime() - delta);
    }
    return date;
}
function representYamlTimestamp(object) {
    return object.toISOString();
}
module.exports = new type_1.Type('tag:yaml.org,2002:timestamp', {
    kind: 'scalar',
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
});
//# sourceMappingURL=timestamp.js.map