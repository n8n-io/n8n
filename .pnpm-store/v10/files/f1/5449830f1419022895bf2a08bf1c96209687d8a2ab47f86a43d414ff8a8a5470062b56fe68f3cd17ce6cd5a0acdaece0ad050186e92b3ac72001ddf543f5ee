

import { buildOptions, registerCommonValueParsers } from './ParserOptionsBuilder.js';

export default class OutputBuilder {
  constructor(builderOptions) {
    this.options = buildOptions(builderOptions);
    this.registeredParsers = registerCommonValueParsers(this.options);
  }

  registerValueParser(name, parserInstance) {//existing name will override the parser without warning
    this.registeredParsers[name] = parserInstance;
  }

  getInstance(parserOptions) {
    return new JsObjBuilder(parserOptions, this.options, this.registeredParsers);
  }
}

import BaseOutputBuilder from './BaseOutputBuilder.js';
const rootName = '^';

class JsObjBuilder extends BaseOutputBuilder {

  constructor(parserOptions, builderOptions, registeredParsers) {
    super();
    //hold the raw detail of a tag and sequence with reference to the output
    this.tagsStack = [];
    this.parserOptions = parserOptions;
    this.options = builderOptions;
    this.registeredParsers = registeredParsers;

    this.root = {};
    this.parent = this.root;
    this.tagName = rootName;
    this.value = {};
    this.textValue = "";
    this.attributes = {};
  }

  addTag(tag) {

    let value = "";
    if (!isEmpty(this.attributes)) {
      value = {};
      if (this.options.attributes.groupBy) {
        value[this.options.attributes.groupBy] = this.attributes;
      } else {
        value = this.attributes;
      }
    }

    this.tagsStack.push([this.tagName, this.textValue, this.value]); //parent tag, parent text value, parent tag value (jsobj)
    this.tagName = tag.name;
    this.value = value;
    this.textValue = "";
    this.attributes = {};
  }

  /**
   * Check if the node should be added by checking user's preference
   * @param {Node} node 
   * @returns boolean: true if the node should not be added
   */
  closeTag() {
    const tagName = this.tagName;
    let value = this.value;
    let textValue = this.textValue;

    //update tag text value
    if (typeof value !== "object" && !Array.isArray(value)) {
      value = this.parseValue(textValue.trim(), this.options.tags.valueParsers);
    } else if (textValue.length > 0) {
      value[this.options.nameFor.text] = this.parseValue(textValue.trim(), this.options.tags.valueParsers);
    }


    let resultTag = {
      tagName: tagName,
      value: value
    };

    if (this.options.onTagClose !== undefined) {
      //TODO TagPathMatcher 
      resultTag = this.options.onClose(tagName, value, this.textValue, new TagPathMatcher(this.tagsStack, node));

      if (!resultTag) return;
    }

    //set parent node in scope
    let arr = this.tagsStack.pop();
    let parentTag = arr[2];
    parentTag = this._addChildTo(resultTag.tagName, resultTag.value, parentTag);

    this.tagName = arr[0];
    this.textValue = arr[1];
    this.value = parentTag;
  }

  _addChild(key, val) {
    if (typeof this.value === "string") {
      this.value = { [this.options.nameFor.text]: this.value };
    }

    this._addChildTo(key, val, this.value);
    // this.currentNode.leafType = false;
    this.attributes = {};
  }

  _addChildTo(key, val, node) {
    if (typeof node === 'string') node = {};
    if (!node[key]) {
      node[key] = val;
    } else { //Repeated
      if (!Array.isArray(node[key])) { //but not stored as array
        node[key] = [node[key]];
      }
      node[key].push(val);
    }
    return node;
  }


  /**
   * Add text value child node 
   * @param {string} text 
   */
  addValue(text) {
    //TODO: use bytes join
    if (this.textValue.length > 0) this.textValue += " " + text;
    else this.textValue = text;
  }

  addPi(name) {
    let value = "";
    if (!isEmpty(this.attributes)) {
      value = {};
      if (this.options.attributes.groupBy) {
        value[this.options.attributes.groupBy] = this.attributes;
      } else {
        value = this.attributes;
      }
    }
    this._addChild(name, value);

  }
  getOutput() {
    return this.value;
  }
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}
