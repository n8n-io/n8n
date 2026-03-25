import { generateIcsDateTime } from "@/lib";
import { parseIcsDate, parseIcsDateTime } from "@/lib/parse/date";
import { zDateObject } from "@/types";

it("Test Ics Date Time Parse", async () => {
  const dateTime = `20230118T073000Z`;

  expect(() => parseIcsDateTime(dateTime)).not.toThrowError();
});

it("Test Ics Date Parse", async () => {
  const date = `20230118`;

  expect(() => parseIcsDate(date)).not.toThrowError();
});

it("Strip Milliseconds - Milliseconds are not allowed in Ics", async () => {
  const date = new Date("2023-01-18T07:30:00.123Z");

  const dateObject = zDateObject.parse({ date });

  const icsDate = generateIcsDateTime(dateObject.date);

  expect(parseIcsDateTime(icsDate)).toEqual(dateObject.date);
});
