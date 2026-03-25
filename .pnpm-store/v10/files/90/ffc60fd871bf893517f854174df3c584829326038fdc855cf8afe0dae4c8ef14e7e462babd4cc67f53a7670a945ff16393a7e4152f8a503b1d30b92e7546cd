'use strict';

/**
 * find paired tag for a stop node
 * @param {string} xmlDoc
 * @param {string} tagName
 * @param {number} i : start index
 */
export function readStopNode(xmlDoc, tagName, i){
    const startIndex = i;
    // Starting at 1 since we already have an open tag
    let openTagCount = 1;

    for (; i < xmlDoc.length; i++) {
      if( xmlDoc[i] === "<"){
        if (xmlDoc[i+1] === "/") {//close tag
            const closeIndex = findSubStrIndex(xmlDoc, ">", i, `${tagName} is not closed`);
            let closeTagName = xmlDoc.substring(i+2,closeIndex).trim();
            if(closeTagName === tagName){
              openTagCount--;
              if (openTagCount === 0) {
                return {
                  tagContent: xmlDoc.substring(startIndex, i),
                  i : closeIndex
                }
              }
            }
            i=closeIndex;
          } else if(xmlDoc[i+1] === '?') {
            const closeIndex = findSubStrIndex(xmlDoc, "?>", i+1, "StopNode is not closed.")
            i=closeIndex;
          } else if(xmlDoc.substr(i + 1, 3) === '!--') {
            const closeIndex = findSubStrIndex(xmlDoc, "-->", i+3, "StopNode is not closed.")
            i=closeIndex;
          } else if(xmlDoc.substr(i + 1, 2) === '![') {
            const closeIndex = findSubStrIndex(xmlDoc, "]]>", i, "StopNode is not closed.") - 2;
            i=closeIndex;
          } else {
            const tagData = readTagExp(xmlDoc, i, '>')

            if (tagData) {
              const openTagName = tagData && tagData.tagName;
              if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
                openTagCount++;
              }
              i=tagData.closeIndex;
            }
          }
        }
    }//end for loop
}

/**
 * Read closing tag name
 * @param {Source} source
 * @returns tag name
 */
export function readClosingTagName(source){
  let text = ""; //temporary data
  while(source.canRead()){
    let ch = source.readCh();
    // if (ch === null || ch === undefined) break;
    // source.updateBuffer();

    if (ch === ">") return text.trimEnd();
    else text += ch;
  }
  throw new Error(`Unexpected end of source. Reading '${substr}'`);
}

/**
 * Read XML tag and build attributes map
 * This function can be used to read normal tag, pi tag.
 * This function can't be used to read comment, CDATA, DOCTYPE.
 * Eg <tag attr = ' some"' attr= ">" bool>
 * @param {string} xmlDoc
 * @param {number} startIndex starting index
 * @returns tag expression includes tag name & attribute string
 */
export function readTagExp(parser) {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let i;
  let EOE = false;

  for (i = 0; parser.source.canRead(i); i++) {
    const char = parser.source.readChAt(i);

    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
    } else if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
    } else if (char === '>' && !inSingleQuotes && !inDoubleQuotes) {
      // If not inside quotes, stop reading at '>'
      EOE = true;
      break;
    }

  }
  if(inSingleQuotes || inDoubleQuotes){
    throw new Error("Invalid attribute expression. Quote is not properly closed");
  }else if(!EOE) throw new Error("Unexpected closing of source. Waiting for '>'");


  const exp = parser.source.readStr(i);
  parser.source.updateBufferBoundary(i + 1);
  return buildTagExpObj(exp, parser)
}

export function readPiExp(parser) {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let i;
  let EOE = false;

  for (i = 0; parser.source.canRead(i) ; i++) {
    const currentChar = parser.source.readChAt(i);
    const nextChar =  parser.source.readChAt(i+1);

    if (currentChar === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
    } else if (currentChar === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
    }

    if (!inSingleQuotes && !inDoubleQuotes) {
      if (currentChar === '?' && nextChar === '>') {
        EOE = true;
        break; // Exit the loop when '?>' is found
      }
    }
  }
  if(inSingleQuotes || inDoubleQuotes){
    throw new Error("Invalid attribute expression. Quote is not properly closed in PI tag expression");
  }else if(!EOE) throw new Error("Unexpected closing of source. Waiting for '?>'");

  if(!parser.options.attributes.ignore){
    //TODO: use regex to verify attributes if not set to ignore
  }

  const exp = parser.source.readStr(i);
  parser.source.updateBufferBoundary(i + 1);
  return buildTagExpObj(exp, parser)
}

function buildTagExpObj(exp, parser){
  const tagExp = {
    tagName: "",
    selfClosing: false
  };
  let attrsExp = "";

  // Check for self-closing tag before setting the name
  if(exp[exp.length -1] === "/") {
    tagExp.selfClosing = true;
    exp = exp.slice(0, -1); // Remove the trailing slash
  }

  //separate tag name
  let i = 0;
  for (; i < exp.length; i++) {
    const char = exp[i];
    if(char === " "){
      tagExp.tagName = exp.substring(0, i);
      attrsExp = exp.substring(i + 1);
      break;
    }
  }
  //only tag
  if(tagExp.tagName.length === 0 && i === exp.length)tagExp.tagName = exp;

  tagExp.tagName = tagExp.tagName.trimEnd();

  if(!parser.options.attributes.ignore && attrsExp.length > 0){
    parseAttributesExp(attrsExp,parser)
  }

  return tagExp;
}

const attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])([\\s\\S]*?)\\3)?', 'gm');

function parseAttributesExp(attrStr, parser) {
  const matches = getAllMatches(attrStr, attrsRegx);
  const len = matches.length; //don't make it inline
  for (let i = 0; i < len; i++) {
    let attrName = parser.processAttrName(matches[i][1]);
    let attrVal = parser.replaceEntities(matches[i][4] || true);

    parser.outputBuilder.addAttribute(attrName, attrVal);
  }
}


const getAllMatches = function(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
};

