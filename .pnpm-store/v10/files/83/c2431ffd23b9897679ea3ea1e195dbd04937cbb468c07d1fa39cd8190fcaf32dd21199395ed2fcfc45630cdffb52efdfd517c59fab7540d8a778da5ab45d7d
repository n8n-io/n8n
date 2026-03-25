import { getLine } from "@/lib/parse/utils/line";

import { parseIcsTrigger } from "@/lib/parse/trigger";

it("Test Ics Trigger Parse", async () => {
  const trigger = `TRIGGER:-PT15M`;

  const { value, options } = getLine(trigger);

  expect(() => parseIcsTrigger(value, options)).not.toThrowError();
});

it("Test Ics Trigger Parse", async () => {
  const trigger = `TRIGGER;RELATED=END:PT5M`;

  const { value, options } = getLine(trigger);

  expect(() => parseIcsTrigger(value, options)).not.toThrowError();
});

it("Test Ics Trigger Parse", async () => {
  const trigger = `TRIGGER;VALUE=DATE-TIME:19980101T050000Z`;

  const { value, options } = getLine(trigger);

  expect(() => parseIcsTrigger(value, options)).not.toThrowError();
});
