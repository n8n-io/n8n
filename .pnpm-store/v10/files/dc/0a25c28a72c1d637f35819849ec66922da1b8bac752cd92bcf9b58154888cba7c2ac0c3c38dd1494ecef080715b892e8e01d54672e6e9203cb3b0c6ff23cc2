import { addMilliseconds, compareDesc } from "date-fns";
import { getTimezoneOffset } from "date-fns-tz";

import { generateIcsTimeStamp, parseicsTimeStamp } from "@/lib";
import { getLine } from "@/lib/parse/utils/line";
import { zDateObject } from "@/types";

import { fictiveTimezone } from "./fixtures/timezones";

it("Test Ics Timestamp Generate - UTC", async () => {
  const date = new Date(2023, 6, 12, 14, 30);

  const dateObject = zDateObject.parse({ date, type: "DATE-TIME" });

  const dateTimeString = generateIcsTimeStamp("DTSTART", dateObject);

  const { value, options } = getLine(dateTimeString);

  const parsed = parseicsTimeStamp(value, options);

  expect(parsed.date).toEqual(dateObject.date);
});

it("Test Ics Timestamp Generate - VTimezone", async () => {
  const date = new Date(2023, 6, 2, 14, 30);

  const offset = fictiveTimezone.props.sort((a, b) =>
    compareDesc(a.start, b.start)
  )[0]?.offsetTo;

  const dateObject = zDateObject.parse({
    date,
    type: "DATE-TIME",
    local: {
      date: addMilliseconds(date, getTimezoneOffset(offset)),
      timezone: fictiveTimezone.id,
      tzoffset: offset,
    },
  });

  const dateTimeString = generateIcsTimeStamp("DTSTART", dateObject);

  const { value, options } = getLine(dateTimeString);

  const parsed = parseicsTimeStamp(value, options, [fictiveTimezone]);

  expect(parsed.date).toEqual(dateObject.date);
});

it("Test Ics Timestamp Generate - IANA Timezone", async () => {
  const date = new Date(2023, 6, 2, 14, 30);

  const dateObject = zDateObject.parse({
    date,
    type: "DATE-TIME",
    local: {
      date: addMilliseconds(date, getTimezoneOffset("America/New_York", date)),
      timezone: "America/New_York",
      tzoffset: "-0400",
    },
  });

  const dateTimeString = generateIcsTimeStamp("DTSTART", dateObject);

  const { value, options } = getLine(dateTimeString);

  const parsed = parseicsTimeStamp(value, options);

  expect(parsed.date).toEqual(dateObject.date);
});
