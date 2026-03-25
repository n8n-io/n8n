import { parseIcsAlarm } from "@/lib/parse/alarm";

it("Test Ics Alarm Parse", async () => {
  const alarm = `BEGIN:VALARM
TRIGGER;VALUE=DATE-TIME:19970317T133000Z
REPEAT:4
DURATION:PT15M
ACTION:AUDIO
ATTACH;FMTTYPE=audio/basic:ftp://example.com/pub/sounds/bell-01.aud
END:VALARM`;

  expect(() => parseIcsAlarm(alarm)).not.toThrowError();
});

it("Test Ics Alarm Parse", async () => {
  const alarm = `BEGIN:VALARM
TRIGGER:-PT30M
REPEAT:2
DURATION:PT15M
ACTION:DISPLAY
DESCRIPTION:Breakfast meeting with executive\n
  team at 8:30 AM EST.
END:VALARM`;

  expect(() => parseIcsAlarm(alarm)).not.toThrowError();
});

it("Test Ics Alarm Parse", async () => {
  const alarm = `BEGIN:VALARM
TRIGGER;RELATED=END:-P2D
ACTION:EMAIL
ATTENDEE:mailto:john_doe@example.com
SUMMARY:*** REMINDER: SEND AGENDA FOR WEEKLY STAFF MEETING ***
DESCRIPTION:A draft agenda needs to be sent out to the attendees to the we
  ekly managers meeting (MGR-LIST). Attached is a pointer the document templ
  ate for the agenda file.
ATTACH;FMTTYPE=application/msword:http://example.com/templates/agenda.doc
END:VALARM`;

  expect(() => parseIcsAlarm(alarm)).not.toThrowError();
});
