import {buildOptions,registerCommonValueParsers} from"./ParserOptionsBuilder.js";

export default class OutputBuilder{
  constructor(options){
    this.options = buildOptions(options);
      this.registeredParsers = registerCommonValueParsers(this.options);
    }
    
    registerValueParser(name,parserInstance){//existing name will override the parser without warning
      this.registeredParsers[name] = parserInstance;
    }

  getInstance(parserOptions){
    return new JsMinArrBuilder(parserOptions, this.options, this.registeredParsers);
  }
}

import BaseOutputBuilder  from "./BaseOutputBuilder.js";
const rootName = '^';

class JsMinArrBuilder extends BaseOutputBuilder{

  constructor(parserOptions, options,registeredParsers) {
    super();
    this.tagsStack = [];
    this.parserOptions = parserOptions;
    this.options = options;
    this.registeredParsers = registeredParsers;

    this.root = {[rootName]: []};
    this.currentNode = this.root;
    this.currentNodeTagName = rootName;
    this.attributes = {};
  }

  addTag(tag){
    //when a new tag is added, it should be added as child of current node
    //TODO: shift this check to the parser
    if(tag.name === "__proto__") tag.name = "#__proto__";

    this.tagsStack.push([this.currentNodeTagName,this.currentNode]); //this.currentNode is parent node here
    this.currentNodeTagName = tag.name;
    this.currentNode = { [tag.name]:[]}
    if(Object.keys(this.attributes).length > 0){
      this.currentNode[":@"] = this.attributes;
      this.attributes = {};
    }
  }

  /**
   * Check if the node should be added by checking user's preference
   * @param {Node} node 
   * @returns boolean: true if the node should not be added
   */
  closeTag(){
    const node = this.currentNode;
    const nodeName = this.currentNodeTagName;
    const arr = this.tagsStack.pop(); //set parent node in scope
    this.currentNodeTagName = arr[0];
    this.currentNode = arr[1];

    if(this.options.onClose !== undefined){
      //TODO TagPathMatcher 
      const resultTag = this.options.onClose(node, 
        new TagPathMatcher(this.tagsStack,node));

      if(resultTag) return;
    }
    this.currentNode[this.currentNodeTagName].push(node);  //to parent node
  }

  //Called by parent class methods
  _addChild(key, val){
    // if(key === "__proto__") tagName = "#__proto__";
    this.currentNode.push( {[key]: val });
    // this.currentNode.leafType = false;
  }

  /**
   * Add text value child node 
   * @param {string} text 
   */
  addValue(text){
    this.currentNode[this.currentNodeTagName].push( {[this.options.nameFor.text]: this.parseValue(text, this.options.tags.valueParsers) });
  }

  addPi(name){
    if(!this.options.ignorePiTags){
      const node = { [name]:[]}
      if(this.attributes){
        node[":@"] = this.attributes;
      }
      this.currentNode.push(node);
    }
    this.attributes = {};
  }
  getOutput(){
    return this.root[rootName];
  }
}
