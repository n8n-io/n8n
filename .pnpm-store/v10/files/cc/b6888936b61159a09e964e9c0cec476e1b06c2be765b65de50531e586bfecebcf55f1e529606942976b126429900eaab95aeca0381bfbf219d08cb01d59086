import rawTimeZones from "../raw-time-zones.json";

import formatTimeZone from "./formatTimeZone.js";
import { getZoneOffset } from "./utils/timeZone.js";

export default function getTimeZones(opts) {
  const includeUtc = !!opts && opts.includeUtc;
  return rawTimeZones
    .reduce(
      function (acc, timeZone) {
        const timeZoneName = timeZone.name;
        const currentOffset = getZoneOffset(timeZoneName);

        // We build on the latest Node.js version, Node.js embed IANA databases
        // it might happen that the environment that will execute getTimeZones() will not know about some
        // timezones. So we ignore the timezone at runtim
        // See https://github.com/vvo/tzdb/issues/43
        if (currentOffset === false) {
          return acc;
        }

        const timeZoneWithCurrentTimeData = {
          ...timeZone,
          currentTimeOffsetInMinutes: currentOffset,
        };

        acc.push({
          ...timeZoneWithCurrentTimeData,
          currentTimeFormat: formatTimeZone(timeZoneWithCurrentTimeData, {
            useCurrentOffset: true,
          }),
        });

        return acc;
      },
      includeUtc ? [utcTimezone] : [],
    )
    .sort((a, b) => {
      return (
        compareNumbers(a, b) ||
        compareStrings(a.alternativeName, b.alternativeName) ||
        compareStrings(a.mainCities[0], b.mainCities[0])
      );
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
  currentTimeFormat: "+00:00 Coordinated Universal Time (UTC)",
};
