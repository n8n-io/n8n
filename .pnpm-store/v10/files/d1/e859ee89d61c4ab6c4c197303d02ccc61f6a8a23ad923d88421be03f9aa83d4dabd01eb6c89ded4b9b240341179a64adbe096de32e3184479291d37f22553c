"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getTimeZones;

var _rawTimeZones = _interopRequireDefault(require("../raw-time-zones.json"));

var _formatTimeZone = _interopRequireDefault(require("./formatTimeZone.js"));

var _timeZone = require("./utils/timeZone.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getTimeZones(opts) {
  const includeUtc = !!opts && opts.includeUtc;
  return _rawTimeZones.default.reduce(function (acc, timeZone) {
    const timeZoneName = timeZone.name;
    const currentOffset = (0, _timeZone.getZoneOffset)(timeZoneName); // We build on the latest Node.js version, Node.js embed IANA databases
    // it might happen that the environment that will execute getTimeZones() will not know about some
    // timezones. So we ignore the timezone at runtim
    // See https://github.com/vvo/tzdb/issues/43

    if (currentOffset === false) {
      return acc;
    }

    const timeZoneWithCurrentTimeData = { ...timeZone,
      currentTimeOffsetInMinutes: currentOffset
    };
    acc.push({ ...timeZoneWithCurrentTimeData,
      currentTimeFormat: (0, _formatTimeZone.default)(timeZoneWithCurrentTimeData, {
        useCurrentOffset: true
      })
    });
    return acc;
  }, includeUtc ? [utcTimezone] : []).sort((a, b) => {
    return compareNumbers(a, b) || compareStrings(a.alternativeName, b.alternativeName) || compareStrings(a.mainCities[0], b.mainCities[0]);
  });
}

function compareNumbers(x, y) {
  return x.currentTimeOffsetInMinutes - y.currentTimeOffsetInMinutes;
}

function compareStrings(x, y) {
  if (typeof x === "string" && typeof y === "string") {
    return x.localeCompare(y);
  }

  return 0;
}

const utcTimezone = {
  name: "Etc/UTC",
  alternativeName: "Coordinated Universal Time (UTC)",
  abbreviation: "UTC",
  group: ["Etc/UTC", "Etc/UCT", "UCT", "UTC", "Universal", "Zulu"],
  countryName: "",
  continentCode: "",
  continentName: "",
  mainCities: [""],
  rawOffsetInMinutes: 0,
  rawFormat: "+00:00 Coordinated Universal Time (UTC)",
  currentTimeOffsetInMinutes: 0,
  currentTimeFormat: "+00:00 Coordinated Universal Time (UTC)"
};
//# sourceMappingURL=getTimeZones.js.map