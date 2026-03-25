import has from "lodash/has";

/**
  @hide
*/
export default function extend(protoProps, staticProps) {
  class Child extends this {
    constructor(...args) {
      super(...args);
      // The constructor function for the new subclass is optionally defined by you
      // in your `extend` definition
      if (protoProps && has(protoProps, "constructor")) {
        protoProps.constructor.call(this, ...args);
      }
    }
  }

  // Add static properties to the constructor function, if supplied.

  Object.assign(Child, this, staticProps);

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) {
    Object.assign(Child.prototype, protoProps);
  }

  return Child;
}
