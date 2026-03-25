import StringSource from './inputSource/StringSource.js';
import BufferSource from './inputSource/BufferSource.js';
import {readTagExp,readClosingTagName} from './XmlPartReader.js';
import {readComment, readCdata,readDocType,readPiTag} from './XmlSpecialTagsReader.js';
import TagPath from './TagPath.js';
import TagPathMatcher from './TagPathMatcher.js';
import EntitiesParser from './EntitiesParser.js';

//To hold the data of current tag
//This is usually used to compare jpath expression against current tag
class TagDetail{
  constructor(name){
    this.name = name;
    this.position = 0;
    // this.attributes = {};
  }
}

export default class Xml2JsParser {
    constructor(options) {
      this.options = options;
      
      this.currentTagDetail = null;
      this.tagTextData = "";
      this.tagsStack = [];
      this.entityParser = new EntitiesParser(options.htmlEntities);
      this.stopNodes = [];
      for (let i = 0; i < this.options.stopNodes.length; i++) {
        this.stopNodes.push(new TagPath(this.options.stopNodes[i]));
      }
    }

    parse(strData) {
        this.source = new StringSource(strData);
        this.parseXml();
        return this.outputBuilder.getOutput();
    }
    parseBytesArr(data) {
        this.source = new BufferSource(data );
        this.parseXml();
        return this.outputBuilder.getOutput();
    }
  
    parseXml() {
      //TODO: Separate TagValueParser as separate class. So no scope issue in node builder class 

      //OutputBuilder should be set in XML Parser
      this.outputBuilder = this.options.OutputBuilder.getInstance(this.options);
      this.root = { root: true};
      this.currentTagDetail = this.root;

      while(this.source.canRead()){
        let ch = this.source.readCh();
        if (ch === "") break;
        
        if(ch === "<"){//tagStart
          let nextChar = this.source.readChAt(0);
          if (nextChar === "" ) throw new Error("Unexpected end of source");
          
        
          if(nextChar === "!" || nextChar === "?"){
            this.source.updateBufferBoundary();
            //previously collected text should be added to current node
            this.addTextNode(); 
            
            this.readSpecialTag(nextChar);// Read DOCTYPE, comment, CDATA, PI tag
          }else if(nextChar === "/"){
            this.source.updateBufferBoundary();
            this.readClosingTag();
            // console.log(this.source.buffer.length, this.source.readable);
            // console.log(this.tagsStack.length);
          }else{//opening tag
            this.readOpeningTag();
          }
        }else{
          this.tagTextData += ch;
        }
      }//End While loop
      if(this.tagsStack.length > 0 || ( this.tagTextData !== "undefined" && this.tagTextData.trimEnd().length > 0) ) throw new Error("Unexpected data in the end of document");
    }
  
    /**
     * read closing paired tag. Set parent tag in scope.
     * skip a node on user's choice
     */
    readClosingTag(){
      const tagName = this.processTagName(readClosingTagName(this.source));
      // console.log(tagName, this.tagsStack.length);
      this.validateClosingTag(tagName);
      // All the text data collected, belongs to current tag.
      if(!this.currentTagDetail.root) this.addTextNode();
      this.outputBuilder.closeTag();
      // Since the tag is closed now, parent tag comes in scope
      this.currentTagDetail = this.tagsStack.pop(); 
    }

    validateClosingTag(tagName){
      // This can't be unpaired tag, or a stop tag.
      if(this.isUnpaired(tagName) || this.isStopNode(tagName)) throw new Error(`Unexpected closing tag '${tagName}'`);
      // This must match with last opening tag
      else if(tagName !== this.currentTagDetail.name) 
        throw new Error(`Unexpected closing tag '${tagName}' expecting '${this.currentTagDetail.name}'`)
    }

    /**
     * Read paired, unpaired, self-closing, stop and special tags.
     * Create a new node
     * Push paired tag in stack.
     */
    readOpeningTag(){
      //save previously collected text data to current node
      this.addTextNode();

      //create new tag
      let tagExp = readTagExp(this, ">" );
      
      // process and skip from tagsStack For unpaired tag, self closing tag, and stop node
      const tagDetail = new TagDetail(tagExp.tagName);
      if(this.isUnpaired(tagExp.tagName)) {
        //TODO: this will lead 2 extra stack operation
        this.outputBuilder.addTag(tagDetail);
        this.outputBuilder.closeTag();
      } else if(tagExp.selfClosing){
        this.outputBuilder.addTag(tagDetail);
        this.outputBuilder.closeTag();
      } else if(this.isStopNode(this.currentTagDetail)){
        // TODO: let's user set a stop node boundary detector for complex contents like script tag
        //TODO: pass tag name only to avoid string operations
        const content = source.readUptoCloseTag(`</${tagExp.tagName}`);
        this.outputBuilder.addTag(tagDetail);
        this.outputBuilder.addValue(content);
        this.outputBuilder.closeTag();
      }else{//paired tag
        //set new nested tag in scope.
        this.tagsStack.push(this.currentTagDetail);
        this.outputBuilder.addTag(tagDetail);
        this.currentTagDetail = tagDetail;
      }
      // console.log(tagExp.tagName,this.tagsStack.length);
      // this.options.onClose()

    }

    readSpecialTag(startCh){
      if(startCh == "!"){
        let nextChar = this.source.readCh();
        if (nextChar === null || nextChar === undefined) throw new Error("Unexpected ending of the source");
        
        if(nextChar === "-"){//comment
          readComment(this);
        }else if(nextChar === "["){//CDATA
          readCdata(this);
        }else if(nextChar === "D"){//DOCTYPE
          readDocType(this);
        }
      }else if(startCh === "?"){
        readPiTag(this);
      }else{
        throw new Error(`Invalid tag '<${startCh}' at ${this.source.line}:${this.source.col}`)
      }
    }
    addTextNode = function() {
      // if(this.currentTagDetail){
        //save text as child node
        // if(this.currentTagDetail.tagname !== '!xml')
        if (this.tagTextData !== undefined && this.tagTextData !== "") { //store previously collected data as textNode
          if(this.tagTextData.trim().length > 0){
            //TODO: shift parsing to output builder

            this.outputBuilder.addValue(this.replaceEntities(this.tagTextData));
          }
          this.tagTextData = "";
        }
      // }
    }

    processAttrName(name){
      if(name === "__proto__") name  = "#__proto__";
      name = resolveNameSpace(name, this.removeNSPrefix);
      return name;
    }
    
    processTagName(name){
      if(name === "__proto__") name  = "#__proto__";
      name = resolveNameSpace(name, this.removeNSPrefix);
      return name;
    }

    /**
     * Generate tags path from tagsStack
     */
    tagsPath(tagName){
      //TODO: return TagPath Object. User can call match method with path
      return "";
    }

    isUnpaired(tagName){
      return this.options.tags.unpaired.indexOf(tagName) !== -1;
    }

    /**
     * valid expressions are 
     * tag nested
     * * nested
     * tag nested[attribute]
     * tag nested[attribute=""]
     * tag nested[attribute!=""]
     * tag nested:0 //for future
     * @param {string} tagName 
     * @returns 
     */
    isStopNode(node){
      for (let i = 0; i < this.stopNodes.length; i++) {
        const givenPath = this.stopNodes[i];
        if(givenPath.match(this.tagsStack, node)) return true;
      }
      return false 
    }

    replaceEntities(text){
      //TODO: if option is set then replace entities
      return this.entityParser.parse(text)
    }
}

function resolveNameSpace(name, removeNSPrefix) {
  if (removeNSPrefix) {
    const parts = name.split(':');
    if(parts.length === 2){
      if (parts[0] === 'xmlns') return '';
      else return parts[1];
    }else reportError(`Multiple namespaces ${name}`)
  }
  return name;
}
