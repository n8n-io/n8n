export default class BaseOutputBuilder {
  constructor() {
    // this.attributes = {};
  }

  addAttribute(name, value) {
    if (this.options.onAttribute) {
      //TODO: better to pass tag path
      const v = this.options.onAttribute(name, value, this.tagName);
      if (v) this.attributes[v.name] = v.value;
    } else {
      name = this.options.attributes.prefix + name + this.options.attributes.suffix;
      this.attributes[name] = this.parseValue(value, this.options.attributes.valueParsers);
    }
  }

  /**
   * parse value by chain of parsers
   * @param {string} val 
   * @returns {any} parsed value if matching parser found
   */
  parseValue = function (val, valParsers) {
    for (let i = 0; i < valParsers.length; i++) {
      let valParser = valParsers[i];
      if (typeof valParser === "string") {
        valParser = this.registeredParsers[valParser];
      }
      if (valParser) {
        val = valParser.parse(val);
      }
    }
    return val;
  }

  /**
   * To add a nested empty tag.
   * @param {string} key 
   * @param {any} val 
   */
  _addChild(key, val) { }

  /**
   * skip the comment if property is not set
   */
  addComment(text) {
    if (this.options.nameFor.comment)
      this._addChild(this.options.nameFor.comment, text);
  }

  //store CDATA separately if property is set
  //otherwise add to tag's value
  addCdata(text) {
    if (this.options.nameFor.cdata) {
      this._addChild(this.options.nameFor.cdata, text);
    } else {
      this.addRawValue(text || "");
    }
  }

  addRawValue = text => this.addValue(text);

  addDeclaration() {
    if (!this.options.declaration) {
    } else {
      this.addPi("?xml");
    }
    this.attributes = {}
  }
}
