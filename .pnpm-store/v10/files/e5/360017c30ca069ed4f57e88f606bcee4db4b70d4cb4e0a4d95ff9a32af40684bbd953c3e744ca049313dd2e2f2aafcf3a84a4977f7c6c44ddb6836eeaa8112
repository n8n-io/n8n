import { buildOptions, registerCommonValueParsers } from './ParserOptionsBuilder.js';

export default class OutputBuilder {
  constructor(options) {
    this.options = buildOptions(options);
    this.registeredParsers = registerCommonValueParsers(this.options);
  }

  registerValueParser(name, parserInstance) {//existing name will override the parser without warning
    this.registeredParsers[name] = parserInstance;
  }

  getInstance(parserOptions) {
    return new JsArrBuilder(parserOptions, this.options, this.registeredParsers);
  }
}

const rootName = '!js_arr';
import BaseOutputBuilder from './BaseOutputBuilder.js';

class JsArrBuilder extends BaseOutputBuilder {

  constructor(parserOptions, options, registeredParsers) {
    super();
    this.tagsStack = [];
    this.parserOptions = parserOptions;
    this.options = options;
    this.registeredParsers = registeredParsers;

    this.root = new Node(rootName);
    this.currentNode = this.root;
    this.attributes = {};
  }

  addTag(tag) {
    //when a new tag is added, it should be added as child of current node
    //TODO: shift this check to the parser
    if (tag.name === "__proto__") tag.name = "#__proto__";

    this.tagsStack.push(this.currentNode);
    this.currentNode = new Node(tag.name, this.attributes);
    this.attributes = {};
  }

  /**
   * Check if the node should be added by checking user's preference
   * @param {Node} node 
   * @returns boolean: true if the node should not be added
   */
  closeTag() {
    const node = this.currentNode;
    this.currentNode = this.tagsStack.pop(); //set parent node in scope
    if (this.options.onClose !== undefined) {
      //TODO TagPathMatcher 
      const resultTag = this.options.onClose(node,
        new TagPathMatcher(this.tagsStack, node));

      if (resultTag) return;
    }
    this.currentNode.child.push(node);  //to parent node
  }

  //Called by parent class methods
  _addChild(key, val) {
    // if(key === "__proto__") tagName = "#__proto__";
    this.currentNode.child.push({ [key]: val });
    // this.currentNode.leafType = false;
  }

  /**
   * Add text value child node 
   * @param {string} text 
   */
  addValue(text) {
    this.currentNode.child.push({ [this.options.nameFor.text]: this.parseValue(text, this.options.tags.valueParsers) });
  }

  addPi(name) {
    //TODO: set pi flag
    if (!this.options.ignorePiTags) {
      const node = new Node(name, this.attributes);
      this.currentNode[":@"] = this.attributes;
      this.currentNode.child.push(node);
    }
    this.attributes = {};
  }
  getOutput() {
    return this.root.child[0];
  }
}



class Node {
  constructor(tagname, attributes) {
    this.tagname = tagname;
    this.child = []; //nested tags, text, cdata, comments
    if (attributes && Object.keys(attributes).length > 0)
      this[":@"] = attributes;
  }
}

module.exports = OutputBuilder;