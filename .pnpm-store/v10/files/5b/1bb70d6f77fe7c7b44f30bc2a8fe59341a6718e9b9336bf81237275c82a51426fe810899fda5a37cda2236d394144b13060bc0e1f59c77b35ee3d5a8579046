import humanize from "./humanize";
import underscore from "./underscore";

export default function titleize(word) {
  return humanize(underscore(word)).replace(/(^|[\s¿/]+)([a-z])/g, function(
    match,
    boundary,
    letter,
    idx,
    string
  ) {
    return match.replace(letter, letter.toUpperCase());
  });
}
