import {readPiExp} from './XmlPartReader.js';

export function readCdata(parser){
  //<![ are already read till this point
  let str = parser.source.readStr(6); //CDATA[
  parser.source.updateBufferBoundary(6);

  if(str !== "CDATA[") throw new Error(`Invalid CDATA expression at ${parser.source.line}:${parser.source.cols}`);

  let text = parser.source.readUpto("]]>");
  parser.outputBuilder.addCdata(text);
}
export function readPiTag(parser){
  //<? are already read till this point
  let tagExp = readPiExp(parser, "?>");
  if(!tagExp) throw new Error("Invalid Pi Tag expression.");

  if (tagExp.tagName === "?xml") {//TODO: test if tagName is just xml
    parser.outputBuilder.addDeclaration();
  } else {
    parser.outputBuilder.addPi("?"+tagExp.tagName);
  }
}

export function readComment(parser){
  //<!- are already read till this point
  let ch = parser.source.readCh();
  if(ch !== "-") throw new Error(`Invalid comment expression at ${parser.source.line}:${parser.source.cols}`);

  let text = parser.source.readUpto("-->");
  parser.outputBuilder.addComment(text);
}

const DOCTYPE_tags = {
  "EL":/^EMENT\s+([^\s>]+)\s+(ANY|EMPTY|\(.+\)\s*$)/m,
  "AT":/^TLIST\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+[^\s]+\s+$/m,
  "NO":/^TATION.+$/m
}
export function readDocType(parser){
  //<!D are already read till this point
  let str = parser.source.readStr(6); //OCTYPE
  parser.source.updateBufferBoundary(6);

  if(str !== "OCTYPE") throw new Error(`Invalid DOCTYPE expression at ${parser.source.line}:${parser.source.cols}`);

  let hasBody = false, lastch = "";

  while(parser.source.canRead()){
    //TODO: use readChAt like used in partReader
    let ch = parser.source.readCh();
    if(hasBody){
      if (ch === '<') { //Determine the tag type
        let str = parser.source.readStr(2);
        parser.source.updateBufferBoundary(2);
        if(str === "EN"){ //ENTITY
          let str = parser.source.readStr(4);
          parser.source.updateBufferBoundary(4);
          if(str !== "TITY") throw new Error("Invalid DOCTYPE ENTITY expression");

          registerEntity(parser);
        }else if(str === "!-") {//comment
          readComment(parser);
        }else{ //ELEMENT, ATTLIST, NOTATION
          let dTagExp = parser.source.readUpto(">");
          const regx = DOCTYPE_tags[str];
          if(regx){
            const match = dTagExp.match(regx);
            if(!match) throw new Error("Invalid DOCTYPE");
          }else throw new Error("Invalid DOCTYPE");
        }
      }else if( ch === '>' && lastch === "]"){//end of doctype
        return;  
      }
    }else if( ch === '>'){//end of doctype
      return;
    }else if( ch === '['){
      hasBody = true;
    }else{
      lastch = ch;
    }
  }//End While loop

}

function registerEntity(parser){
  //read Entity
  let attrBoundary="";
  let name ="", val ="";
  while(source.canRead()){
    let ch = source.readCh();

    if(attrBoundary){
      if (ch === attrBoundary){
        val = text;
        text = ""
      }
    }else if(ch === " " || ch === "\t"){
      if(!name){
        name = text.trimStart();
        text = "";
      }
    }else if (ch === '"' || ch === "'") {//start of attrBoundary
      attrBoundary = ch;
    }else if(ch === ">"){
      parser.entityParser.addExternalEntity(name,val);
      return;
    }else{
      text+=ch;
    }
  }
}
