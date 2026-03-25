import applyInflections from "./applyInflections";
import inflections from "./inflections";

export default function singularize(word, locale = "en") {
  return applyInflections(word, inflections(locale).singulars);
}
