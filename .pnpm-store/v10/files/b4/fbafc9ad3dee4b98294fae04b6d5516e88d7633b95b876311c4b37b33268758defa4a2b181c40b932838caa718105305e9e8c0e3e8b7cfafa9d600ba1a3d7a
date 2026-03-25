import {
  underscore as _underscore,
  capitalize as _capitalize,
  camelize as _camelize,
  dasherize as _dasherize,
} from "inflected";
import lowerFirst from "lodash/lowerFirst";

const camelizeCache = {};
const dasherizeCache = {};
const underscoreCache = {};
const capitalizeCache = {};

/**
 * @param {String} word
 * @hide
 */
export function camelize(word) {
  if (typeof camelizeCache[word] !== "string") {
    let camelizedWord = _camelize(underscore(word), false);

    /*
     The `ember-inflector` package's version of camelize lower-cases the first
     word after a slash, e.g.

         camelize('my-things/nice-watch'); // 'myThings/niceWatch'

     The `inflected` package doesn't, so we make that change here to not break
     existing functionality. (This affects the name of the schema collections.)
    */
    const camelized = camelizedWord.split("/").map(lowerFirst).join("/");

    camelizeCache[word] = camelized;
  }

  return camelizeCache[word];
}

/**
 * @param {String} word
 * @hide
 */
export function dasherize(word) {
  if (typeof dasherizeCache[word] !== "string") {
    const dasherized = _dasherize(underscore(word));

    dasherizeCache[word] = dasherized;
  }

  return dasherizeCache[word];
}

export function underscore(word) {
  if (typeof underscoreCache[word] !== "string") {
    const underscored = _underscore(word);

    underscoreCache[word] = underscored;
  }

  return underscoreCache[word];
}

export function capitalize(word) {
  if (typeof capitalizeCache[word] !== "string") {
    const capitalized = _capitalize(word);

    capitalizeCache[word] = capitalized;
  }

  return capitalizeCache[word];
}
