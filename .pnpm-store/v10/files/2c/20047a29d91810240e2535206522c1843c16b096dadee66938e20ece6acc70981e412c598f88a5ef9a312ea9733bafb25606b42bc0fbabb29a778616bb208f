import transliterations from "./transliterations";

export default function transliterate(string, options = {}) {
  const locale = options.locale || "en";
  const replacement = options.replacement || "?";

  return transliterations(locale).transliterate(string, replacement);
}
