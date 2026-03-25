import isFunction from "./util/isFunction";
import Transliterator from "./Transliterator";

export default function transliterations(locale, fn) {
  if (isFunction(locale)) {
    fn = locale;
    locale = null;
  }

  locale = locale || "en";

  if (fn) {
    fn(Transliterator.getInstance(locale));
  } else {
    return Transliterator.getInstance(locale);
  }
}
