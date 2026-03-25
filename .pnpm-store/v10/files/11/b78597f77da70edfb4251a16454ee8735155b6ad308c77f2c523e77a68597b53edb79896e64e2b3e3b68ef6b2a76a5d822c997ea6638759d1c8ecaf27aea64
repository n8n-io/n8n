export default function format(
  {
    alternativeName,
    mainCities,
    rawOffsetInMinutes,
    currentTimeOffsetInMinutes,
  },
  { useCurrentOffset = false } = {},
) {
  const offsetInHours = useCurrentOffset
    ? getOffsetString(currentTimeOffsetInMinutes)
    : getOffsetString(rawOffsetInMinutes);

  return `${offsetInHours.padStart(
    6,
    "+",
  )} ${alternativeName} - ${mainCities.join(", ")}`;
}

function getOffsetString(offsetInMinutes) {
  const absOffsetInMinutes = Math.abs(offsetInMinutes);
  const [hours, minutes] = [
    Math.floor(absOffsetInMinutes / 60),
    absOffsetInMinutes % 60,
  ].map((v) => {
    return v.toString().padStart(2, "0");
  });
  const durationInHoursMinutes = `${hours}:${minutes}`;

  return `${offsetInMinutes >= 0 ? "+" : "-"}${durationInHoursMinutes}`;
}
