import { parseIcsEvent } from "@/lib/parse/event";
import { readFile } from "fs/promises";

it("Test Ics Event Parse", async () => {
  const event = `BEGIN:VEVENT
UID:19970901T130000Z-123401@example.com
DTSTAMP:19970901T130000Z
DTSTART:19970903T163000Z
DTEND:19970903T190000Z
SUMMARY:Annual Employee Review
CLASS:PRIVATE
CATEGORIES:BUSINESS,HUMAN RESOURCES
END:VEVENT`;

  expect(() => parseIcsEvent(event)).not.toThrowError();
});

it("Test Ics Event Parse", async () => {
  const event = `BEGIN:VEVENT
UID:19970901T130000Z-123402@example.com
DTSTAMP:19970901T130000Z
DTSTART:19970401T163000Z
DTEND:19970402T010000Z
SUMMARY:Laurel is in sensitivity awareness class.
CLASS:PUBLIC
CATEGORIES:BUSINESS,HUMAN RESOURCES
TRANSP:TRANSPARENT
END:VEVENT`;

  expect(() => parseIcsEvent(event)).not.toThrowError();
});

it("Test Ics Event Parse", async () => {
  const event = `BEGIN:VEVENT
UID:19970901T130000Z-123403@example.com
DTSTAMP:19970901T130000Z
DTSTART;VALUE=DATE:19971102
DURATION:P1D
SUMMARY:Our Blissful Anniversary
TRANSP:TRANSPARENT
CLASS:CONFIDENTIAL
CATEGORIES:ANNIVERSARY,PERSONAL,SPECIAL OCCASION
RRULE:FREQ=YEARLY
END:VEVENT`;

  expect(() => parseIcsEvent(event)).not.toThrowError();
});

it("Test Ics Event Parse", async () => {
  const event = `BEGIN:VEVENT
UID:20070423T123432Z-541111@example.com
DTSTAMP:20070423T123432Z
DTSTART;VALUE=DATE:20070628
DTEND;VALUE=DATE:20070709
SUMMARY:Festival International de Jazz de Montreal
TRANSP:TRANSPARENT
END:VEVENT`;

  expect(() => parseIcsEvent(event)).not.toThrowError();
});

it("Test ICS Event With Long Description Parse", async () => {
  const buffer = await readFile(`${__dirname}/fixtures/longDescriptionEvent.ics`);
  const event = buffer.toString();
  
  expect(() => parseIcsEvent(event)).not.toThrowError();
})