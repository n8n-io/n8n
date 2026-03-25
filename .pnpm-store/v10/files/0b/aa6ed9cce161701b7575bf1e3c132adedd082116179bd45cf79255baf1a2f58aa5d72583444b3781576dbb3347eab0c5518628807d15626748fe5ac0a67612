import { parseIcsAttachment } from "@/lib/parse/attachment";
import { getLine } from "@/lib/parse/utils/line";

it("Test Ics Attachment Parse", async () => {
  const attachment = `ATTACH:CID:jsmith.part3.960817T083000.xyzMail@example.com`;

  const { value, options } = getLine(attachment);

  expect(() => parseIcsAttachment(value, options)).not.toThrowError();
});

it("Test Ics Attachment Parse", async () => {
  const attachment = `ATTACH;FMTTYPE=application/postscript:ftp://example.com/pub/reports/r-960812.ps`;

  const { value, options } = getLine(attachment);

  expect(() => parseIcsAttachment(value, options)).not.toThrowError();
});
