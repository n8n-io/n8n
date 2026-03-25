/* eslint no-console: 0 */
let errorProps = [
  "description",
  "fileName",
  "lineNumber",
  "message",
  "name",
  "number",
  "stack",
];
/**
  @hide
*/
export default function assert(bool, text) {
  if (typeof bool === "string" && !text) {
    // console.error(`Mirage: ${bool}`);
    throw new MirageError(bool);
  }

  if (!bool) {
    // console.error(`Mirage: ${text}`);
    throw new MirageError(text.replace(/^ +/gm, "") || "Assertion failed");
  }
}

/**
  @public
  @hide
  Copied from ember-metal/error
*/
export function MirageError(message, stack) {
  let tmp = Error(message);

  if (stack) {
    tmp.stack = stack;
  }

  for (let idx = 0; idx < errorProps.length; idx++) {
    let prop = errorProps[idx];

    if (["description", "message", "stack"].indexOf(prop) > -1) {
      this[prop] = `Mirage: ${tmp[prop]}`;
    } else {
      this[prop] = tmp[prop];
    }
  }
}

MirageError.prototype = Object.create(Error.prototype);
