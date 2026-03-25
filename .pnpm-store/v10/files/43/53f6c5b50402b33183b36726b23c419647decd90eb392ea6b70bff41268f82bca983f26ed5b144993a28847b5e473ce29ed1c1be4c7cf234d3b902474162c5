// unit is ms
type DriftTolerance = [number, number];

function verifyTime(
  utcNotBefore: string | undefined,
  utcNotOnOrAfter: string | undefined,
  drift: DriftTolerance = [0, 0]
): boolean {

  const now = new Date();

  if (!utcNotBefore && !utcNotOnOrAfter) {
    // show warning because user intends to have time check but the document doesn't include corresponding information
    console.warn('You intend to have time validation however the document doesn\'t include the valid range.');
    return true; 
  }

  let notBeforeLocal: Date | null = null;
  let notOnOrAfterLocal: Date | null = null;

  const [notBeforeDrift, notOnOrAfterDrift] = drift;

  if (utcNotBefore && !utcNotOnOrAfter) {
    notBeforeLocal = new Date(utcNotBefore);
    return +notBeforeLocal + notBeforeDrift <= +now;
  }
  if (!utcNotBefore && utcNotOnOrAfter) {
    notOnOrAfterLocal = new Date(utcNotOnOrAfter);
    return +now < +notOnOrAfterLocal + notOnOrAfterDrift;
  }

  notBeforeLocal = new Date(utcNotBefore!);
  notOnOrAfterLocal = new Date(utcNotOnOrAfter!);

  return (
    +notBeforeLocal + notBeforeDrift <= +now &&
    +now < +notOnOrAfterLocal + notOnOrAfterDrift
  );

}

export {
  verifyTime
};