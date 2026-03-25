import applyInflections from "./applyInflections";
import inflections from "./inflections";

export default function pluralize(word, locale = "en") {
  return applyInflections(word, inflections(locale).plurals);
}
