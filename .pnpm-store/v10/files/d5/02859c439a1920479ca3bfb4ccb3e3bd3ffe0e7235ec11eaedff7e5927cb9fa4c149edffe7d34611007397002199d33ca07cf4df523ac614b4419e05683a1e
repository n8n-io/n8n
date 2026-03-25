export default function ordinal(number) {
  const absNumber = Math.abs(Number(number));
  const mod100 = absNumber % 100;

  if (mod100 === 11 || mod100 === 12 || mod100 === 13) {
    return "th";
  } else {
    switch (absNumber % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
}
