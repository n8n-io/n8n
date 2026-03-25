import inflections from "./inflections";

export default function underscore(camelCasedWord) {
  let result = "" + camelCasedWord;

  result = result.replace(
    new RegExp(
      "(?:([A-Za-z\\d])|^)(" +
        inflections().acronymRegex.source +
        ")(?=\\b|[^a-z])",
      "g"
    ),
    function(match, $1, $2) {
      return "" + ($1 || "") + ($1 ? "_" : "") + $2.toLowerCase();
    }
  );

  result = result.replace(/([A-Z\d]+)([A-Z][a-z])/g, "$1_$2");
  result = result.replace(/([a-z\d])([A-Z])/g, "$1_$2");
  result = result.replace(/-/g, "_");

  return result.toLowerCase();
}
