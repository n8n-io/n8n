import isFunction from "./util/isFunction";
import Inflector from "./Inflector";
import defaults from "./defaults";

export default function inflections(locale, fn) {
  if (isFunction(locale)) {
    fn = locale;
    locale = null;
  }

  locale = locale || "en";

  if (fn) {
    fn(Inflector.getInstance(locale));
  } else {
    return Inflector.getInstance(locale);
  }
}

for (let locale in defaults) {
  inflections(locale, defaults[locale]);
}
