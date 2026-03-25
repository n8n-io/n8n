import { readFileSync } from "fs";

import { getTimezoneRegex } from "@/constants";
import { parseIcsTimezone } from "@/lib";
import { parseicsTimeStamp } from "@/lib/parse/timeStamp";
import { getLine } from "@/lib/parse/utils/line";

it("Test Ics Timestamp Parse - Date", async () => {
  const timestamp = `DTSTART;VALUE=DATE:20230401`;

  const { value, options } = getLine(timestamp);

  expect(() => parseicsTimeStamp(value, options)).not.toThrowError();
});

it("Test Ics Timestamp Parse - Datetime", async () => {
  const timestamp = `DTSTART:20230118T073000Z`;

  const { value, options } = getLine(timestamp);

  expect(() => parseicsTimeStamp(value, options)).not.toThrowError();
});

it("Test Ics Timestamp Parse - UTC", async () => {
  const timestamp = `DTSTART:20230118T090000Z`;

  const { value, options } = getLine(timestamp);

  const parsed = parseicsTimeStamp(value, options);

  expect(parsed.date.getUTCHours()).toEqual(9);

  expect(parsed.local).toBeUndefined();

  expect(() => parsed).not.toThrowError();
});

it("Test Ics Timestamp Parse - VTimezones - Standard", async () => {
  const timestamp = `DTSTART;TZID=Europe/Berlin:20231106T140000`;

  const timezoneString = readFileSync(
    `${__dirname}/fixtures/timezones.ics`,
    "utf8"
  );
  const timezoneStrings = [...timezoneString.matchAll(getTimezoneRegex)].map(
    (match) => match[0]
  );

  const timezones = timezoneStrings.map((timezoneString) =>
    parseIcsTimezone(timezoneString)
  );

  const { value, options } = getLine(timestamp);

  const parsed = parseicsTimeStamp(value, options, timezones);

  expect(parsed.date.getUTCHours()).toEqual(13);

  expect(parsed.local).toBeDefined();
  if (parsed.local) expect(parsed.local?.date.getUTCHours()).toEqual(14);

  expect(() => parsed).not.toThrowError();
});

it("Test Ics Timestamp Parse - VTimezones - Daylight", async () => {
  const timestamp = `DTSTART;TZID=Europe/Berlin:20230906T140000`;

  const timezoneString = readFileSync(
    `${__dirname}/fixtures/timezones.ics`,
    "utf8"
  );
  const timezoneStrings = [...timezoneString.matchAll(getTimezoneRegex)].map(
    (match) => match[0]
  );

  const timezones = timezoneStrings.map((timezoneString) =>
    parseIcsTimezone(timezoneString)
  );

  const { value, options } = getLine(timestamp);

  const parsed = parseicsTimeStamp(value, options, timezones);

  expect(parsed.date.getUTCHours()).toEqual(12);

  expect(parsed.local).toBeDefined();
  if (parsed.local) expect(parsed.local?.date.getUTCHours()).toEqual(14);

  expect(() => parsed).not.toThrowError();
});

it("Test Ics Timestamp Parse - IANA Timezone", async () => {
  const timestamp = `DTSTART;TZID=Europe/Berlin:20230910T020000`;

  const { value, options } = getLine(timestamp);

  const parsed = parseicsTimeStamp(value, options);

  expect(parsed.date.getUTCHours()).toEqual(0);

  expect(parsed.local).toBeDefined();
  if (parsed.local) expect(parsed.local?.date.getUTCHours()).toEqual(2);

  expect(() => parsed).not.toThrowError();
});
