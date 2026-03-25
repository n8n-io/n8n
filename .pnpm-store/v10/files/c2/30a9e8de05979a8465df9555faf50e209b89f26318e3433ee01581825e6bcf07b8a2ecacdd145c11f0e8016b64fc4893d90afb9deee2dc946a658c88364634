import { parseIcsDuration } from "@/lib/parse/duration";

it("Test Ics Duration Parse", async () => {
  const duration = `P15DT5H0M20S`;

  expect(() => parseIcsDuration(duration)).not.toThrowError();
});

it("Test Ics Duration Parse", async () => {
  const duration = `P7W`;

  expect(() => parseIcsDuration(duration)).not.toThrowError();
});
