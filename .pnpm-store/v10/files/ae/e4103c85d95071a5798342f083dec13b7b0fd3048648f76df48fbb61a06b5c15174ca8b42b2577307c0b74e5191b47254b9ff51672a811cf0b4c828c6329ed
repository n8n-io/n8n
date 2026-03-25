import { DotObject } from "./DotObject.js";
class AttributesBase extends DotObject {
  /** @hidden */
  #attrs = /* @__PURE__ */ new Map();
  constructor(attributes) {
    super();
    if (attributes !== void 0) {
      this.apply(attributes);
    }
  }
  get values() {
    return Array.from(this.#attrs.entries());
  }
  get size() {
    return this.#attrs.size;
  }
  get(key) {
    return this.#attrs.get(key);
  }
  set(key, value) {
    if (value !== null && value !== void 0) {
      this.#attrs.set(key, value);
    }
  }
  delete(key) {
    this.#attrs.delete(key);
  }
  apply(attributes) {
    const entries = Array.isArray(attributes) ? attributes : Object.entries(attributes);
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }
  clear() {
    this.#attrs.clear();
  }
}
export {
  AttributesBase
};
