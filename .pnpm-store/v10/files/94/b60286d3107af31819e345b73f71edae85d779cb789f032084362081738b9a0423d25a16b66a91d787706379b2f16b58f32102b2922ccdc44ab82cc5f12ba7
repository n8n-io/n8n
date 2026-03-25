import { getLine } from "@/lib/parse/utils/line";

import { parseIcsRecurrenceId } from "@/lib/parse/recurrenceId";

it("Test Ics Recurrence Id Parse", async () => {
  const rId = `RECURRENCE-ID;VALUE=DATE:19960401`;

  const { value, options } = getLine(rId);

  expect(() => parseIcsRecurrenceId(value, options)).not.toThrowError();
});

it("Test Ics Recurrence Id Parse", async () => {
  const rId = `RECURRENCE-ID;RANGE=THISANDFUTURE:19960120T120000Z`;

  const { value, options } = getLine(rId);

  expect(() => parseIcsRecurrenceId(value, options)).not.toThrowError();
});
