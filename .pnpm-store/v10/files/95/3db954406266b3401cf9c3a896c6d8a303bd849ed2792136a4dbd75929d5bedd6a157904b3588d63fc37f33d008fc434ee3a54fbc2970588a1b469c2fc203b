(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.OpenAPISampler = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(()=>{"use strict";var t={d:(e,i)=>{for(var n in i)t.o(i,n)&&!t.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:i[n]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},e={};t.r(e),t.d(e,{XMLBuilder:()=>vt,XMLParser:()=>ht,XMLValidator:()=>Tt});const i=":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD",n=new RegExp("^["+i+"]["+i+"\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");function s(t,e){const i=[];let n=e.exec(t);for(;n;){const s=[];s.startIndex=e.lastIndex-n[0].length;const r=n.length;for(let t=0;t<r;t++)s.push(n[t]);i.push(s),n=e.exec(t)}return i}const r=function(t){return!(null==n.exec(t))},o={allowBooleanAttributes:!1,unpairedTags:[]};function a(t,e){e=Object.assign({},o,e);const i=[];let n=!1,s=!1;"\ufeff"===t[0]&&(t=t.substr(1));for(let r=0;r<t.length;r++)if("<"===t[r]&&"?"===t[r+1]){if(r+=2,r=l(t,r),r.err)return r}else{if("<"!==t[r]){if(h(t[r]))continue;return x("InvalidChar","char '"+t[r]+"' is not expected.",E(t,r))}{let o=r;if(r++,"!"===t[r]){r=p(t,r);continue}{let a=!1;"/"===t[r]&&(a=!0,r++);let u="";for(;r<t.length&&">"!==t[r]&&" "!==t[r]&&"\t"!==t[r]&&"\n"!==t[r]&&"\r"!==t[r];r++)u+=t[r];if(u=u.trim(),"/"===u[u.length-1]&&(u=u.substring(0,u.length-1),r--),!b(u)){let e;return e=0===u.trim().length?"Invalid space after '<'.":"Tag '"+u+"' is an invalid name.",x("InvalidTag",e,E(t,r))}const c=d(t,r);if(!1===c)return x("InvalidAttr","Attributes for '"+u+"' have open quote.",E(t,r));let f=c.value;if(r=c.index,"/"===f[f.length-1]){const i=r-f.length;f=f.substring(0,f.length-1);const s=g(f,e);if(!0!==s)return x(s.err.code,s.err.msg,E(t,i+s.err.line));n=!0}else if(a){if(!c.tagClosed)return x("InvalidTag","Closing tag '"+u+"' doesn't have proper closing.",E(t,r));if(f.trim().length>0)return x("InvalidTag","Closing tag '"+u+"' can't have attributes or invalid starting.",E(t,o));if(0===i.length)return x("InvalidTag","Closing tag '"+u+"' has not been opened.",E(t,o));{const e=i.pop();if(u!==e.tagName){let i=E(t,e.tagStartPos);return x("InvalidTag","Expected closing tag '"+e.tagName+"' (opened in line "+i.line+", col "+i.col+") instead of closing tag '"+u+"'.",E(t,o))}0==i.length&&(s=!0)}}else{const a=g(f,e);if(!0!==a)return x(a.err.code,a.err.msg,E(t,r-f.length+a.err.line));if(!0===s)return x("InvalidXml","Multiple possible root nodes found.",E(t,r));-1!==e.unpairedTags.indexOf(u)||i.push({tagName:u,tagStartPos:o}),n=!0}for(r++;r<t.length;r++)if("<"===t[r]){if("!"===t[r+1]){r++,r=p(t,r);continue}if("?"!==t[r+1])break;if(r=l(t,++r),r.err)return r}else if("&"===t[r]){const e=m(t,r);if(-1==e)return x("InvalidChar","char '&' is not expected.",E(t,r));r=e}else if(!0===s&&!h(t[r]))return x("InvalidXml","Extra text at the end",E(t,r));"<"===t[r]&&r--}}}return n?1==i.length?x("InvalidTag","Unclosed tag '"+i[0].tagName+"'.",E(t,i[0].tagStartPos)):!(i.length>0)||x("InvalidXml","Invalid '"+JSON.stringify(i.map(t=>t.tagName),null,4).replace(/\r?\n/g,"")+"' found.",{line:1,col:1}):x("InvalidXml","Start tag expected.",1)}function h(t){return" "===t||"\t"===t||"\n"===t||"\r"===t}function l(t,e){const i=e;for(;e<t.length;e++)if("?"==t[e]||" "==t[e]){const n=t.substr(i,e-i);if(e>5&&"xml"===n)return x("InvalidXml","XML declaration allowed only at the start of the document.",E(t,e));if("?"==t[e]&&">"==t[e+1]){e++;break}continue}return e}function p(t,e){if(t.length>e+5&&"-"===t[e+1]&&"-"===t[e+2]){for(e+=3;e<t.length;e++)if("-"===t[e]&&"-"===t[e+1]&&">"===t[e+2]){e+=2;break}}else if(t.length>e+8&&"D"===t[e+1]&&"O"===t[e+2]&&"C"===t[e+3]&&"T"===t[e+4]&&"Y"===t[e+5]&&"P"===t[e+6]&&"E"===t[e+7]){let i=1;for(e+=8;e<t.length;e++)if("<"===t[e])i++;else if(">"===t[e]&&(i--,0===i))break}else if(t.length>e+9&&"["===t[e+1]&&"C"===t[e+2]&&"D"===t[e+3]&&"A"===t[e+4]&&"T"===t[e+5]&&"A"===t[e+6]&&"["===t[e+7])for(e+=8;e<t.length;e++)if("]"===t[e]&&"]"===t[e+1]&&">"===t[e+2]){e+=2;break}return e}const u='"',c="'";function d(t,e){let i="",n="",s=!1;for(;e<t.length;e++){if(t[e]===u||t[e]===c)""===n?n=t[e]:n!==t[e]||(n="");else if(">"===t[e]&&""===n){s=!0;break}i+=t[e]}return""===n&&{value:i,index:e,tagClosed:s}}const f=new RegExp("(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['\"])(([\\s\\S])*?)\\5)?","g");function g(t,e){const i=s(t,f),n={};for(let t=0;t<i.length;t++){if(0===i[t][1].length)return x("InvalidAttr","Attribute '"+i[t][2]+"' has no space in starting.",y(i[t]));if(void 0!==i[t][3]&&void 0===i[t][4])return x("InvalidAttr","Attribute '"+i[t][2]+"' is without value.",y(i[t]));if(void 0===i[t][3]&&!e.allowBooleanAttributes)return x("InvalidAttr","boolean attribute '"+i[t][2]+"' is not allowed.",y(i[t]));const s=i[t][2];if(!N(s))return x("InvalidAttr","Attribute '"+s+"' is an invalid name.",y(i[t]));if(Object.prototype.hasOwnProperty.call(n,s))return x("InvalidAttr","Attribute '"+s+"' is repeated.",y(i[t]));n[s]=1}return!0}function m(t,e){if(";"===t[++e])return-1;if("#"===t[e])return function(t,e){let i=/\d/;for("x"===t[e]&&(e++,i=/[\da-fA-F]/);e<t.length;e++){if(";"===t[e])return e;if(!t[e].match(i))break}return-1}(t,++e);let i=0;for(;e<t.length;e++,i++)if(!(t[e].match(/\w/)&&i<20)){if(";"===t[e])break;return-1}return e}function x(t,e,i){return{err:{code:t,msg:e,line:i.line||i,col:i.col}}}function N(t){return r(t)}function b(t){return r(t)}function E(t,e){const i=t.substring(0,e).split(/\r?\n/);return{line:i.length,col:i[i.length-1].length+1}}function y(t){return t.startIndex+t[1].length}const w={preserveOrder:!1,attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,removeNSPrefix:!1,allowBooleanAttributes:!1,parseTagValue:!0,parseAttributeValue:!1,trimValues:!0,cdataPropName:!1,numberParseOptions:{hex:!0,leadingZeros:!0,eNotation:!0},tagValueProcessor:function(t,e){return e},attributeValueProcessor:function(t,e){return e},stopNodes:[],alwaysCreateTextNode:!1,isArray:()=>!1,commentPropName:!1,unpairedTags:[],processEntities:!0,htmlEntities:!1,ignoreDeclaration:!1,ignorePiTags:!1,transformTagName:!1,transformAttributeName:!1,updateTag:function(t,e,i){return t},captureMetaData:!1,maxNestedTags:100,strictReservedNames:!0,jPath:!0};function v(t){return"boolean"==typeof t?{enabled:t,maxEntitySize:1e4,maxExpansionDepth:10,maxTotalExpansions:1e3,maxExpandedLength:1e5,maxEntityCount:100,allowedTags:null,tagFilter:null}:"object"==typeof t&&null!==t?{enabled:!1!==t.enabled,maxEntitySize:t.maxEntitySize??1e4,maxExpansionDepth:t.maxExpansionDepth??10,maxTotalExpansions:t.maxTotalExpansions??1e3,maxExpandedLength:t.maxExpandedLength??1e5,maxEntityCount:t.maxEntityCount??100,allowedTags:t.allowedTags??null,tagFilter:t.tagFilter??null}:v(!0)}const T=function(t){const e=Object.assign({},w,t);return e.processEntities=v(e.processEntities),e.stopNodes&&Array.isArray(e.stopNodes)&&(e.stopNodes=e.stopNodes.map(t=>"string"==typeof t&&t.startsWith("*.")?".."+t.substring(2):t)),e};let P;P="function"!=typeof Symbol?"@@xmlMetadata":Symbol("XML Node Metadata");class S{constructor(t){this.tagname=t,this.child=[],this[":@"]=Object.create(null)}add(t,e){"__proto__"===t&&(t="#__proto__"),this.child.push({[t]:e})}addChild(t,e){"__proto__"===t.tagname&&(t.tagname="#__proto__"),t[":@"]&&Object.keys(t[":@"]).length>0?this.child.push({[t.tagname]:t.child,":@":t[":@"]}):this.child.push({[t.tagname]:t.child}),void 0!==e&&(this.child[this.child.length-1][P]={startIndex:e})}static getMetaDataSymbol(){return P}}class A{constructor(t){this.suppressValidationErr=!t,this.options=t}readDocType(t,e){const i=Object.create(null);let n=0;if("O"!==t[e+3]||"C"!==t[e+4]||"T"!==t[e+5]||"Y"!==t[e+6]||"P"!==t[e+7]||"E"!==t[e+8])throw new Error("Invalid Tag instead of DOCTYPE");{e+=9;let s=1,r=!1,o=!1,a="";for(;e<t.length;e++)if("<"!==t[e]||o)if(">"===t[e]){if(o?"-"===t[e-1]&&"-"===t[e-2]&&(o=!1,s--):s--,0===s)break}else"["===t[e]?r=!0:a+=t[e];else{if(r&&C(t,"!ENTITY",e)){let s,r;if(e+=7,[s,r,e]=this.readEntityExp(t,e+1,this.suppressValidationErr),-1===r.indexOf("&")){if(!1!==this.options.enabled&&this.options.maxEntityCount&&n>=this.options.maxEntityCount)throw new Error(`Entity count (${n+1}) exceeds maximum allowed (${this.options.maxEntityCount})`);const t=s.replace(/[.\-+*:]/g,"\\.");i[s]={regx:RegExp(`&${t};`,"g"),val:r},n++}}else if(r&&C(t,"!ELEMENT",e)){e+=8;const{index:i}=this.readElementExp(t,e+1);e=i}else if(r&&C(t,"!ATTLIST",e))e+=8;else if(r&&C(t,"!NOTATION",e)){e+=9;const{index:i}=this.readNotationExp(t,e+1,this.suppressValidationErr);e=i}else{if(!C(t,"!--",e))throw new Error("Invalid DOCTYPE");o=!0}s++,a=""}if(0!==s)throw new Error("Unclosed DOCTYPE")}return{entities:i,i:e}}readEntityExp(t,e){e=O(t,e);let i="";for(;e<t.length&&!/\s/.test(t[e])&&'"'!==t[e]&&"'"!==t[e];)i+=t[e],e++;if(I(i),e=O(t,e),!this.suppressValidationErr){if("SYSTEM"===t.substring(e,e+6).toUpperCase())throw new Error("External entities are not supported");if("%"===t[e])throw new Error("Parameter entities are not supported")}let n="";if([e,n]=this.readIdentifierVal(t,e,"entity"),!1!==this.options.enabled&&this.options.maxEntitySize&&n.length>this.options.maxEntitySize)throw new Error(`Entity "${i}" size (${n.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);return[i,n,--e]}readNotationExp(t,e){e=O(t,e);let i="";for(;e<t.length&&!/\s/.test(t[e]);)i+=t[e],e++;!this.suppressValidationErr&&I(i),e=O(t,e);const n=t.substring(e,e+6).toUpperCase();if(!this.suppressValidationErr&&"SYSTEM"!==n&&"PUBLIC"!==n)throw new Error(`Expected SYSTEM or PUBLIC, found "${n}"`);e+=n.length,e=O(t,e);let s=null,r=null;if("PUBLIC"===n)[e,s]=this.readIdentifierVal(t,e,"publicIdentifier"),'"'!==t[e=O(t,e)]&&"'"!==t[e]||([e,r]=this.readIdentifierVal(t,e,"systemIdentifier"));else if("SYSTEM"===n&&([e,r]=this.readIdentifierVal(t,e,"systemIdentifier"),!this.suppressValidationErr&&!r))throw new Error("Missing mandatory system identifier for SYSTEM notation");return{notationName:i,publicIdentifier:s,systemIdentifier:r,index:--e}}readIdentifierVal(t,e,i){let n="";const s=t[e];if('"'!==s&&"'"!==s)throw new Error(`Expected quoted string, found "${s}"`);for(e++;e<t.length&&t[e]!==s;)n+=t[e],e++;if(t[e]!==s)throw new Error(`Unterminated ${i} value`);return[++e,n]}readElementExp(t,e){e=O(t,e);let i="";for(;e<t.length&&!/\s/.test(t[e]);)i+=t[e],e++;if(!this.suppressValidationErr&&!r(i))throw new Error(`Invalid element name: "${i}"`);let n="";if("E"===t[e=O(t,e)]&&C(t,"MPTY",e))e+=4;else if("A"===t[e]&&C(t,"NY",e))e+=2;else if("("===t[e]){for(e++;e<t.length&&")"!==t[e];)n+=t[e],e++;if(")"!==t[e])throw new Error("Unterminated content model")}else if(!this.suppressValidationErr)throw new Error(`Invalid Element Expression, found "${t[e]}"`);return{elementName:i,contentModel:n.trim(),index:e}}readAttlistExp(t,e){e=O(t,e);let i="";for(;e<t.length&&!/\s/.test(t[e]);)i+=t[e],e++;I(i),e=O(t,e);let n="";for(;e<t.length&&!/\s/.test(t[e]);)n+=t[e],e++;if(!I(n))throw new Error(`Invalid attribute name: "${n}"`);e=O(t,e);let s="";if("NOTATION"===t.substring(e,e+8).toUpperCase()){if(s="NOTATION","("!==t[e=O(t,e+=8)])throw new Error(`Expected '(', found "${t[e]}"`);e++;let i=[];for(;e<t.length&&")"!==t[e];){let n="";for(;e<t.length&&"|"!==t[e]&&")"!==t[e];)n+=t[e],e++;if(n=n.trim(),!I(n))throw new Error(`Invalid notation name: "${n}"`);i.push(n),"|"===t[e]&&(e++,e=O(t,e))}if(")"!==t[e])throw new Error("Unterminated list of notations");e++,s+=" ("+i.join("|")+")"}else{for(;e<t.length&&!/\s/.test(t[e]);)s+=t[e],e++;const i=["CDATA","ID","IDREF","IDREFS","ENTITY","ENTITIES","NMTOKEN","NMTOKENS"];if(!this.suppressValidationErr&&!i.includes(s.toUpperCase()))throw new Error(`Invalid attribute type: "${s}"`)}e=O(t,e);let r="";return"#REQUIRED"===t.substring(e,e+8).toUpperCase()?(r="#REQUIRED",e+=8):"#IMPLIED"===t.substring(e,e+7).toUpperCase()?(r="#IMPLIED",e+=7):[e,r]=this.readIdentifierVal(t,e,"ATTLIST"),{elementName:i,attributeName:n,attributeType:s,defaultValue:r,index:e}}}const O=(t,e)=>{for(;e<t.length&&/\s/.test(t[e]);)e++;return e};function C(t,e,i){for(let n=0;n<e.length;n++)if(e[n]!==t[i+n+1])return!1;return!0}function I(t){if(r(t))return t;throw new Error(`Invalid entity name ${t}`)}const $=/^[-+]?0x[a-fA-F0-9]+$/,j=/^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,V={hex:!0,leadingZeros:!0,decimalPoint:".",eNotation:!0};const D=/^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;class _{constructor(t,e={}){this.pattern=t,this.separator=e.separator||".",this.segments=this._parse(t),this._hasDeepWildcard=this.segments.some(t=>"deep-wildcard"===t.type),this._hasAttributeCondition=this.segments.some(t=>void 0!==t.attrName),this._hasPositionSelector=this.segments.some(t=>void 0!==t.position)}_parse(t){const e=[];let i=0,n="";for(;i<t.length;)t[i]===this.separator?i+1<t.length&&t[i+1]===this.separator?(n.trim()&&(e.push(this._parseSegment(n.trim())),n=""),e.push({type:"deep-wildcard"}),i+=2):(n.trim()&&e.push(this._parseSegment(n.trim())),n="",i++):(n+=t[i],i++);return n.trim()&&e.push(this._parseSegment(n.trim())),e}_parseSegment(t){const e={type:"tag"};let i=null,n=t;const s=t.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);if(s&&(n=s[1]+s[3],s[2])){const t=s[2].slice(1,-1);t&&(i=t)}let r,o,a=n;if(n.includes("::")){const e=n.indexOf("::");if(r=n.substring(0,e).trim(),a=n.substring(e+2).trim(),!r)throw new Error(`Invalid namespace in pattern: ${t}`)}let h=null;if(a.includes(":")){const t=a.lastIndexOf(":"),e=a.substring(0,t).trim(),i=a.substring(t+1).trim();["first","last","odd","even"].includes(i)||/^nth\(\d+\)$/.test(i)?(o=e,h=i):o=a}else o=a;if(!o)throw new Error(`Invalid segment pattern: ${t}`);if(e.tag=o,r&&(e.namespace=r),i)if(i.includes("=")){const t=i.indexOf("=");e.attrName=i.substring(0,t).trim(),e.attrValue=i.substring(t+1).trim()}else e.attrName=i.trim();if(h){const t=h.match(/^nth\((\d+)\)$/);t?(e.position="nth",e.positionValue=parseInt(t[1],10)):e.position=h}return e}get length(){return this.segments.length}hasDeepWildcard(){return this._hasDeepWildcard}hasAttributeCondition(){return this._hasAttributeCondition}hasPositionSelector(){return this._hasPositionSelector}toString(){return this.pattern}}class k{constructor(t={}){this.separator=t.separator||".",this.path=[],this.siblingStacks=[]}push(t,e=null,i=null){this.path.length>0&&(this.path[this.path.length-1].values=void 0);const n=this.path.length;this.siblingStacks[n]||(this.siblingStacks[n]=new Map);const s=this.siblingStacks[n],r=i?`${i}:${t}`:t,o=s.get(r)||0;let a=0;for(const t of s.values())a+=t;s.set(r,o+1);const h={tag:t,position:a,counter:o};null!=i&&(h.namespace=i),null!=e&&(h.values=e),this.path.push(h)}pop(){if(0===this.path.length)return;const t=this.path.pop();return this.siblingStacks.length>this.path.length+1&&(this.siblingStacks.length=this.path.length+1),t}updateCurrent(t){if(this.path.length>0){const e=this.path[this.path.length-1];null!=t&&(e.values=t)}}getCurrentTag(){return this.path.length>0?this.path[this.path.length-1].tag:void 0}getCurrentNamespace(){return this.path.length>0?this.path[this.path.length-1].namespace:void 0}getAttrValue(t){if(0===this.path.length)return;const e=this.path[this.path.length-1];return e.values?.[t]}hasAttr(t){if(0===this.path.length)return!1;const e=this.path[this.path.length-1];return void 0!==e.values&&t in e.values}getPosition(){return 0===this.path.length?-1:this.path[this.path.length-1].position??0}getCounter(){return 0===this.path.length?-1:this.path[this.path.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this.path.length}toString(t,e=!0){const i=t||this.separator;return this.path.map(t=>e&&t.namespace?`${t.namespace}:${t.tag}`:t.tag).join(i)}toArray(){return this.path.map(t=>t.tag)}reset(){this.path=[],this.siblingStacks=[]}matches(t){const e=t.segments;return 0!==e.length&&(t.hasDeepWildcard()?this._matchWithDeepWildcard(e):this._matchSimple(e))}_matchSimple(t){if(this.path.length!==t.length)return!1;for(let e=0;e<t.length;e++){const i=t[e],n=this.path[e],s=e===this.path.length-1;if(!this._matchSegment(i,n,s))return!1}return!0}_matchWithDeepWildcard(t){let e=this.path.length-1,i=t.length-1;for(;i>=0&&e>=0;){const n=t[i];if("deep-wildcard"===n.type){if(i--,i<0)return!0;const n=t[i];let s=!1;for(let t=e;t>=0;t--){const r=t===this.path.length-1;if(this._matchSegment(n,this.path[t],r)){e=t-1,i--,s=!0;break}}if(!s)return!1}else{const t=e===this.path.length-1;if(!this._matchSegment(n,this.path[e],t))return!1;e--,i--}}return i<0}_matchSegment(t,e,i){if("*"!==t.tag&&t.tag!==e.tag)return!1;if(void 0!==t.namespace&&"*"!==t.namespace&&t.namespace!==e.namespace)return!1;if(void 0!==t.attrName){if(!i)return!1;if(!e.values||!(t.attrName in e.values))return!1;if(void 0!==t.attrValue){const i=e.values[t.attrName];if(String(i)!==String(t.attrValue))return!1}}if(void 0!==t.position){if(!i)return!1;const n=e.counter??0;if("first"===t.position&&0!==n)return!1;if("odd"===t.position&&n%2!=1)return!1;if("even"===t.position&&n%2!=0)return!1;if("nth"===t.position&&n!==t.positionValue)return!1}return!0}snapshot(){return{path:this.path.map(t=>({...t})),siblingStacks:this.siblingStacks.map(t=>new Map(t))}}restore(t){this.path=t.path.map(t=>({...t})),this.siblingStacks=t.siblingStacks.map(t=>new Map(t))}}function F(t,e){if(!t)return{};const i=e.attributesGroupName?t[e.attributesGroupName]:t;if(!i)return{};const n={};for(const t in i)t.startsWith(e.attributeNamePrefix)?n[t.substring(e.attributeNamePrefix.length)]=i[t]:n[t]=i[t];return n}function M(t){if(!t||"string"!=typeof t)return;const e=t.indexOf(":");if(-1!==e&&e>0){const i=t.substring(0,e);if("xmlns"!==i)return i}}class L{constructor(t){var e;if(this.options=t,this.currentNode=null,this.tagsNodeStack=[],this.docTypeEntities={},this.lastEntities={apos:{regex:/&(apos|#39|#x27);/g,val:"'"},gt:{regex:/&(gt|#62|#x3E);/g,val:">"},lt:{regex:/&(lt|#60|#x3C);/g,val:"<"},quot:{regex:/&(quot|#34|#x22);/g,val:'"'}},this.ampEntity={regex:/&(amp|#38|#x26);/g,val:"&"},this.htmlEntities={space:{regex:/&(nbsp|#160);/g,val:" "},cent:{regex:/&(cent|#162);/g,val:"¢"},pound:{regex:/&(pound|#163);/g,val:"£"},yen:{regex:/&(yen|#165);/g,val:"¥"},euro:{regex:/&(euro|#8364);/g,val:"€"},copyright:{regex:/&(copy|#169);/g,val:"©"},reg:{regex:/&(reg|#174);/g,val:"®"},inr:{regex:/&(inr|#8377);/g,val:"₹"},num_dec:{regex:/&#([0-9]{1,7});/g,val:(t,e)=>tt(e,10,"&#")},num_hex:{regex:/&#x([0-9a-fA-F]{1,6});/g,val:(t,e)=>tt(e,16,"&#x")}},this.addExternalEntities=R,this.parseXml=Y,this.parseTextData=G,this.resolveNameSpace=B,this.buildAttributesMap=W,this.isItStopNode=Z,this.replaceEntitiesValue=z,this.readStopNodeData=J,this.saveTextToParentTag=q,this.addChild=X,this.ignoreAttributesFn="function"==typeof(e=this.options.ignoreAttributes)?e:Array.isArray(e)?t=>{for(const i of e){if("string"==typeof i&&t===i)return!0;if(i instanceof RegExp&&i.test(t))return!0}}:()=>!1,this.entityExpansionCount=0,this.currentExpandedLength=0,this.matcher=new k,this.isCurrentNodeStopNode=!1,this.options.stopNodes&&this.options.stopNodes.length>0){this.stopNodeExpressions=[];for(let t=0;t<this.options.stopNodes.length;t++){const e=this.options.stopNodes[t];"string"==typeof e?this.stopNodeExpressions.push(new _(e)):e instanceof _&&this.stopNodeExpressions.push(e)}}}}function R(t){const e=Object.keys(t);for(let i=0;i<e.length;i++){const n=e[i],s=n.replace(/[.\-+*:]/g,"\\.");this.lastEntities[n]={regex:new RegExp("&"+s+";","g"),val:t[n]}}}function G(t,e,i,n,s,r,o){if(void 0!==t&&(this.options.trimValues&&!n&&(t=t.trim()),t.length>0)){o||(t=this.replaceEntitiesValue(t,e,i));const n=this.options.jPath?i.toString():i,a=this.options.tagValueProcessor(e,t,n,s,r);return null==a?t:typeof a!=typeof t||a!==t?a:this.options.trimValues||t.trim()===t?H(t,this.options.parseTagValue,this.options.numberParseOptions):t}}function B(t){if(this.options.removeNSPrefix){const e=t.split(":"),i="/"===t.charAt(0)?"/":"";if("xmlns"===e[0])return"";2===e.length&&(t=i+e[1])}return t}const U=new RegExp("([^\\s=]+)\\s*(=\\s*(['\"])([\\s\\S]*?)\\3)?","gm");function W(t,e,i){if(!0!==this.options.ignoreAttributes&&"string"==typeof t){const n=s(t,U),r=n.length,o={},a={};for(let t=0;t<r;t++){const s=this.resolveNameSpace(n[t][1]),r=n[t][4];if(s.length&&void 0!==r){let t=r;this.options.trimValues&&(t=t.trim()),t=this.replaceEntitiesValue(t,i,e),a[s]=t}}Object.keys(a).length>0&&"object"==typeof e&&e.updateCurrent&&e.updateCurrent(a);for(let t=0;t<r;t++){const s=this.resolveNameSpace(n[t][1]),r=this.options.jPath?e.toString():e;if(this.ignoreAttributesFn(s,r))continue;let a=n[t][4],h=this.options.attributeNamePrefix+s;if(s.length)if(this.options.transformAttributeName&&(h=this.options.transformAttributeName(h)),"__proto__"===h&&(h="#__proto__"),void 0!==a){this.options.trimValues&&(a=a.trim()),a=this.replaceEntitiesValue(a,i,e);const t=this.options.jPath?e.toString():e,n=this.options.attributeValueProcessor(s,a,t);o[h]=null==n?a:typeof n!=typeof a||n!==a?n:H(a,this.options.parseAttributeValue,this.options.numberParseOptions)}else this.options.allowBooleanAttributes&&(o[h]=!0)}if(!Object.keys(o).length)return;if(this.options.attributesGroupName){const t={};return t[this.options.attributesGroupName]=o,t}return o}}const Y=function(t){t=t.replace(/\r\n?/g,"\n");const e=new S("!xml");let i=e,n="";this.matcher.reset(),this.entityExpansionCount=0,this.currentExpandedLength=0;const s=new A(this.options.processEntities);for(let r=0;r<t.length;r++)if("<"===t[r])if("/"===t[r+1]){const e=K(t,">",r,"Closing Tag is not closed.");let s=t.substring(r+2,e).trim();if(this.options.removeNSPrefix){const t=s.indexOf(":");-1!==t&&(s=s.substr(t+1))}this.options.transformTagName&&(s=this.options.transformTagName(s)),i&&(n=this.saveTextToParentTag(n,i,this.matcher));const o=this.matcher.getCurrentTag();if(s&&-1!==this.options.unpairedTags.indexOf(s))throw new Error(`Unpaired tag can not be used as closing tag: </${s}>`);o&&-1!==this.options.unpairedTags.indexOf(o)&&(this.matcher.pop(),this.tagsNodeStack.pop()),this.matcher.pop(),this.isCurrentNodeStopNode=!1,i=this.tagsNodeStack.pop(),n="",r=e}else if("?"===t[r+1]){let e=Q(t,r,!1,"?>");if(!e)throw new Error("Pi Tag is not closed.");if(n=this.saveTextToParentTag(n,i,this.matcher),this.options.ignoreDeclaration&&"?xml"===e.tagName||this.options.ignorePiTags);else{const t=new S(e.tagName);t.add(this.options.textNodeName,""),e.tagName!==e.tagExp&&e.attrExpPresent&&(t[":@"]=this.buildAttributesMap(e.tagExp,this.matcher,e.tagName)),this.addChild(i,t,this.matcher,r)}r=e.closeIndex+1}else if("!--"===t.substr(r+1,3)){const e=K(t,"--\x3e",r+4,"Comment is not closed.");if(this.options.commentPropName){const s=t.substring(r+4,e-2);n=this.saveTextToParentTag(n,i,this.matcher),i.add(this.options.commentPropName,[{[this.options.textNodeName]:s}])}r=e}else if("!D"===t.substr(r+1,2)){const e=s.readDocType(t,r);this.docTypeEntities=e.entities,r=e.i}else if("!["===t.substr(r+1,2)){const e=K(t,"]]>",r,"CDATA is not closed.")-2,s=t.substring(r+9,e);n=this.saveTextToParentTag(n,i,this.matcher);let o=this.parseTextData(s,i.tagname,this.matcher,!0,!1,!0,!0);null==o&&(o=""),this.options.cdataPropName?i.add(this.options.cdataPropName,[{[this.options.textNodeName]:s}]):i.add(this.options.textNodeName,o),r=e+2}else{let s=Q(t,r,this.options.removeNSPrefix);if(!s){const e=t.substring(Math.max(0,r-50),Math.min(t.length,r+50));throw new Error(`readTagExp returned undefined at position ${r}. Context: "${e}"`)}let o=s.tagName;const a=s.rawTagName;let h=s.tagExp,l=s.attrExpPresent,p=s.closeIndex;if(this.options.transformTagName){const t=this.options.transformTagName(o);h===o&&(h=t),o=t}if(this.options.strictReservedNames&&(o===this.options.commentPropName||o===this.options.cdataPropName))throw new Error(`Invalid tag name: ${o}`);i&&n&&"!xml"!==i.tagname&&(n=this.saveTextToParentTag(n,i,this.matcher,!1));const u=i;u&&-1!==this.options.unpairedTags.indexOf(u.tagname)&&(i=this.tagsNodeStack.pop(),this.matcher.pop());let c=!1;h.length>0&&h.lastIndexOf("/")===h.length-1&&(c=!0,"/"===o[o.length-1]?(o=o.substr(0,o.length-1),h=o):h=h.substr(0,h.length-1),l=o!==h);let d,f=null,g={};d=M(a),o!==e.tagname&&this.matcher.push(o,{},d),o!==h&&l&&(f=this.buildAttributesMap(h,this.matcher,o),f&&(g=F(f,this.options))),o!==e.tagname&&(this.isCurrentNodeStopNode=this.isItStopNode(this.stopNodeExpressions,this.matcher));const m=r;if(this.isCurrentNodeStopNode){let e="";if(c)r=s.closeIndex;else if(-1!==this.options.unpairedTags.indexOf(o))r=s.closeIndex;else{const i=this.readStopNodeData(t,a,p+1);if(!i)throw new Error(`Unexpected end of ${a}`);r=i.i,e=i.tagContent}const n=new S(o);f&&(n[":@"]=f),n.add(this.options.textNodeName,e),this.matcher.pop(),this.isCurrentNodeStopNode=!1,this.addChild(i,n,this.matcher,m)}else{if(c){if(this.options.transformTagName){const t=this.options.transformTagName(o);h===o&&(h=t),o=t}const t=new S(o);f&&(t[":@"]=f),this.addChild(i,t,this.matcher,m),this.matcher.pop(),this.isCurrentNodeStopNode=!1}else{if(-1!==this.options.unpairedTags.indexOf(o)){const t=new S(o);f&&(t[":@"]=f),this.addChild(i,t,this.matcher,m),this.matcher.pop(),this.isCurrentNodeStopNode=!1,r=s.closeIndex;continue}{const t=new S(o);if(this.tagsNodeStack.length>this.options.maxNestedTags)throw new Error("Maximum nested tags exceeded");this.tagsNodeStack.push(i),f&&(t[":@"]=f),this.addChild(i,t,this.matcher,m),i=t}}n="",r=p}}else n+=t[r];return e.child};function X(t,e,i,n){this.options.captureMetaData||(n=void 0);const s=this.options.jPath?i.toString():i,r=this.options.updateTag(e.tagname,s,e[":@"]);!1===r||("string"==typeof r?(e.tagname=r,t.addChild(e,n)):t.addChild(e,n))}function z(t,e,i){const n=this.options.processEntities;if(!n||!n.enabled)return t;if(n.allowedTags){const s=this.options.jPath?i.toString():i;if(!(Array.isArray(n.allowedTags)?n.allowedTags.includes(e):n.allowedTags(e,s)))return t}if(n.tagFilter){const s=this.options.jPath?i.toString():i;if(!n.tagFilter(e,s))return t}for(let e in this.docTypeEntities){const i=this.docTypeEntities[e],s=t.match(i.regx);if(s){if(this.entityExpansionCount+=s.length,n.maxTotalExpansions&&this.entityExpansionCount>n.maxTotalExpansions)throw new Error(`Entity expansion limit exceeded: ${this.entityExpansionCount} > ${n.maxTotalExpansions}`);const e=t.length;if(t=t.replace(i.regx,i.val),n.maxExpandedLength&&(this.currentExpandedLength+=t.length-e,this.currentExpandedLength>n.maxExpandedLength))throw new Error(`Total expanded content size exceeded: ${this.currentExpandedLength} > ${n.maxExpandedLength}`)}}if(-1===t.indexOf("&"))return t;for(let e in this.lastEntities){const i=this.lastEntities[e];t=t.replace(i.regex,i.val)}if(-1===t.indexOf("&"))return t;if(this.options.htmlEntities)for(let e in this.htmlEntities){const i=this.htmlEntities[e];t=t.replace(i.regex,i.val)}return t.replace(this.ampEntity.regex,this.ampEntity.val)}function q(t,e,i,n){return t&&(void 0===n&&(n=0===e.child.length),void 0!==(t=this.parseTextData(t,e.tagname,i,!1,!!e[":@"]&&0!==Object.keys(e[":@"]).length,n))&&""!==t&&e.add(this.options.textNodeName,t),t=""),t}function Z(t,e){if(!t||0===t.length)return!1;for(let i=0;i<t.length;i++)if(e.matches(t[i]))return!0;return!1}function K(t,e,i,n){const s=t.indexOf(e,i);if(-1===s)throw new Error(n);return s+e.length-1}function Q(t,e,i,n=">"){const s=function(t,e,i=">"){let n,s="";for(let r=e;r<t.length;r++){let e=t[r];if(n)e===n&&(n="");else if('"'===e||"'"===e)n=e;else if(e===i[0]){if(!i[1])return{data:s,index:r};if(t[r+1]===i[1])return{data:s,index:r}}else"\t"===e&&(e=" ");s+=e}}(t,e+1,n);if(!s)return;let r=s.data;const o=s.index,a=r.search(/\s/);let h=r,l=!0;-1!==a&&(h=r.substring(0,a),r=r.substring(a+1).trimStart());const p=h;if(i){const t=h.indexOf(":");-1!==t&&(h=h.substr(t+1),l=h!==s.data.substr(t+1))}return{tagName:h,tagExp:r,closeIndex:o,attrExpPresent:l,rawTagName:p}}function J(t,e,i){const n=i;let s=1;for(;i<t.length;i++)if("<"===t[i])if("/"===t[i+1]){const r=K(t,">",i,`${e} is not closed`);if(t.substring(i+2,r).trim()===e&&(s--,0===s))return{tagContent:t.substring(n,i),i:r};i=r}else if("?"===t[i+1])i=K(t,"?>",i+1,"StopNode is not closed.");else if("!--"===t.substr(i+1,3))i=K(t,"--\x3e",i+3,"StopNode is not closed.");else if("!["===t.substr(i+1,2))i=K(t,"]]>",i,"StopNode is not closed.")-2;else{const n=Q(t,i,">");n&&((n&&n.tagName)===e&&"/"!==n.tagExp[n.tagExp.length-1]&&s++,i=n.closeIndex)}}function H(t,e,i){if(e&&"string"==typeof t){const e=t.trim();return"true"===e||"false"!==e&&function(t,e={}){if(e=Object.assign({},V,e),!t||"string"!=typeof t)return t;let i=t.trim();if(void 0!==e.skipLike&&e.skipLike.test(i))return t;if("0"===t)return 0;if(e.hex&&$.test(i))return function(t){if(parseInt)return parseInt(t,16);if(Number.parseInt)return Number.parseInt(t,16);if(window&&window.parseInt)return window.parseInt(t,16);throw new Error("parseInt, Number.parseInt, window.parseInt are not supported")}(i);if(i.includes("e")||i.includes("E"))return function(t,e,i){if(!i.eNotation)return t;const n=e.match(D);if(n){let s=n[1]||"";const r=-1===n[3].indexOf("e")?"E":"e",o=n[2],a=s?t[o.length+1]===r:t[o.length]===r;return o.length>1&&a?t:1!==o.length||!n[3].startsWith(`.${r}`)&&n[3][0]!==r?i.leadingZeros&&!a?(e=(n[1]||"")+n[3],Number(e)):t:Number(e)}return t}(t,i,e);{const s=j.exec(i);if(s){const r=s[1]||"",o=s[2];let a=(n=s[3])&&-1!==n.indexOf(".")?("."===(n=n.replace(/0+$/,""))?n="0":"."===n[0]?n="0"+n:"."===n[n.length-1]&&(n=n.substring(0,n.length-1)),n):n;const h=r?"."===t[o.length+1]:"."===t[o.length];if(!e.leadingZeros&&(o.length>1||1===o.length&&!h))return t;{const n=Number(i),s=String(n);if(0===n)return n;if(-1!==s.search(/[eE]/))return e.eNotation?n:t;if(-1!==i.indexOf("."))return"0"===s||s===a||s===`${r}${a}`?n:t;let h=o?a:i;return o?h===s||r+h===s?n:t:h===s||h===r+s?n:t}}return t}var n}(t,i)}return void 0!==t?t:""}function tt(t,e,i){const n=Number.parseInt(t,e);return n>=0&&n<=1114111?String.fromCodePoint(n):i+t+";"}const et=S.getMetaDataSymbol();function it(t,e){if(!t||"object"!=typeof t)return{};if(!e)return t;const i={};for(const n in t)n.startsWith(e)?i[n.substring(e.length)]=t[n]:i[n]=t[n];return i}function nt(t,e,i){return st(t,e,i)}function st(t,e,i){let n;const s={};for(let r=0;r<t.length;r++){const o=t[r],a=rt(o);if(void 0!==a&&a!==e.textNodeName){const t=it(o[":@"]||{},e.attributeNamePrefix);i.push(a,t)}if(a===e.textNodeName)void 0===n?n=o[a]:n+=""+o[a];else{if(void 0===a)continue;if(o[a]){let t=st(o[a],e,i);const n=at(t,e);if(o[":@"]?ot(t,o[":@"],i,e):1!==Object.keys(t).length||void 0===t[e.textNodeName]||e.alwaysCreateTextNode?0===Object.keys(t).length&&(e.alwaysCreateTextNode?t[e.textNodeName]="":t=""):t=t[e.textNodeName],void 0!==o[et]&&"object"==typeof t&&null!==t&&(t[et]=o[et]),void 0!==s[a]&&Object.prototype.hasOwnProperty.call(s,a))Array.isArray(s[a])||(s[a]=[s[a]]),s[a].push(t);else{const r=e.jPath?i.toString():i;e.isArray(a,r,n)?s[a]=[t]:s[a]=t}void 0!==a&&a!==e.textNodeName&&i.pop()}}}return"string"==typeof n?n.length>0&&(s[e.textNodeName]=n):void 0!==n&&(s[e.textNodeName]=n),s}function rt(t){const e=Object.keys(t);for(let t=0;t<e.length;t++){const i=e[t];if(":@"!==i)return i}}function ot(t,e,i,n){if(e){const s=Object.keys(e),r=s.length;for(let o=0;o<r;o++){const r=s[o],a=r.startsWith(n.attributeNamePrefix)?r.substring(n.attributeNamePrefix.length):r,h=n.jPath?i.toString()+"."+a:i;n.isArray(r,h,!0,!0)?t[r]=[e[r]]:t[r]=e[r]}}}function at(t,e){const{textNodeName:i}=e,n=Object.keys(t).length;return 0===n||!(1!==n||!t[i]&&"boolean"!=typeof t[i]&&0!==t[i])}class ht{constructor(t){this.externalEntities={},this.options=T(t)}parse(t,e){if("string"!=typeof t&&t.toString)t=t.toString();else if("string"!=typeof t)throw new Error("XML data is accepted in String or Bytes[] form.");if(e){!0===e&&(e={});const i=a(t,e);if(!0!==i)throw Error(`${i.err.msg}:${i.err.line}:${i.err.col}`)}const i=new L(this.options);i.addExternalEntities(this.externalEntities);const n=i.parseXml(t);return this.options.preserveOrder||void 0===n?n:nt(n,this.options,i.matcher)}addEntity(t,e){if(-1!==e.indexOf("&"))throw new Error("Entity value can't have '&'");if(-1!==t.indexOf("&")||-1!==t.indexOf(";"))throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");if("&"===e)throw new Error("An entity with value '&' is not permitted");this.externalEntities[t]=e}static getMetaDataSymbol(){return S.getMetaDataSymbol()}}function lt(t,e){let i="";e.format&&e.indentBy.length>0&&(i="\n");const n=[];if(e.stopNodes&&Array.isArray(e.stopNodes))for(let t=0;t<e.stopNodes.length;t++){const i=e.stopNodes[t];"string"==typeof i?n.push(new _(i)):i instanceof _&&n.push(i)}return pt(t,e,i,new k,n)}function pt(t,e,i,n,s){let r="",o=!1;if(!Array.isArray(t)){if(null!=t){let i=t.toString();return i=xt(i,e),i}return""}for(let a=0;a<t.length;a++){const h=t[a],l=ft(h);if(void 0===l)continue;const p=ut(h[":@"],e);n.push(l,p);const u=mt(n,s);if(l===e.textNodeName){let t=h[l];u||(t=e.tagValueProcessor(l,t),t=xt(t,e)),o&&(r+=i),r+=t,o=!1,n.pop();continue}if(l===e.cdataPropName){o&&(r+=i),r+=`<![CDATA[${h[l][0][e.textNodeName]}]]>`,o=!1,n.pop();continue}if(l===e.commentPropName){r+=i+`\x3c!--${h[l][0][e.textNodeName]}--\x3e`,o=!0,n.pop();continue}if("?"===l[0]){const t=gt(h[":@"],e,u),s="?xml"===l?"":i;let a=h[l][0][e.textNodeName];a=0!==a.length?" "+a:"",r+=s+`<${l}${a}${t}?>`,o=!0,n.pop();continue}let c=i;""!==c&&(c+=e.indentBy);const d=i+`<${l}${gt(h[":@"],e,u)}`;let f;f=u?ct(h[l],e):pt(h[l],e,c,n,s),-1!==e.unpairedTags.indexOf(l)?e.suppressUnpairedNode?r+=d+">":r+=d+"/>":f&&0!==f.length||!e.suppressEmptyNode?f&&f.endsWith(">")?r+=d+`>${f}${i}</${l}>`:(r+=d+">",f&&""!==i&&(f.includes("/>")||f.includes("</"))?r+=i+e.indentBy+f+i:r+=f,r+=`</${l}>`):r+=d+"/>",o=!0,n.pop()}return r}function ut(t,e){if(!t||e.ignoreAttributes)return null;const i={};let n=!1;for(let s in t)Object.prototype.hasOwnProperty.call(t,s)&&(i[s.startsWith(e.attributeNamePrefix)?s.substr(e.attributeNamePrefix.length):s]=t[s],n=!0);return n?i:null}function ct(t,e){if(!Array.isArray(t))return null!=t?t.toString():"";let i="";for(let n=0;n<t.length;n++){const s=t[n],r=ft(s);if(r===e.textNodeName)i+=s[r];else if(r===e.cdataPropName)i+=s[r][0][e.textNodeName];else if(r===e.commentPropName)i+=s[r][0][e.textNodeName];else{if(r&&"?"===r[0])continue;if(r){const t=dt(s[":@"],e),n=ct(s[r],e);n&&0!==n.length?i+=`<${r}${t}>${n}</${r}>`:i+=`<${r}${t}/>`}}}return i}function dt(t,e){let i="";if(t&&!e.ignoreAttributes)for(let n in t){if(!Object.prototype.hasOwnProperty.call(t,n))continue;let s=t[n];!0===s&&e.suppressBooleanAttributes?i+=` ${n.substr(e.attributeNamePrefix.length)}`:i+=` ${n.substr(e.attributeNamePrefix.length)}="${s}"`}return i}function ft(t){const e=Object.keys(t);for(let i=0;i<e.length;i++){const n=e[i];if(Object.prototype.hasOwnProperty.call(t,n)&&":@"!==n)return n}}function gt(t,e,i){let n="";if(t&&!e.ignoreAttributes)for(let s in t){if(!Object.prototype.hasOwnProperty.call(t,s))continue;let r;i?r=t[s]:(r=e.attributeValueProcessor(s,t[s]),r=xt(r,e)),!0===r&&e.suppressBooleanAttributes?n+=` ${s.substr(e.attributeNamePrefix.length)}`:n+=` ${s.substr(e.attributeNamePrefix.length)}="${r}"`}return n}function mt(t,e){if(!e||0===e.length)return!1;for(let i=0;i<e.length;i++)if(t.matches(e[i]))return!0;return!1}function xt(t,e){if(t&&t.length>0&&e.processEntities)for(let i=0;i<e.entities.length;i++){const n=e.entities[i];t=t.replace(n.regex,n.val)}return t}const Nt={attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,cdataPropName:!1,format:!1,indentBy:"  ",suppressEmptyNode:!1,suppressUnpairedNode:!0,suppressBooleanAttributes:!0,tagValueProcessor:function(t,e){return e},attributeValueProcessor:function(t,e){return e},preserveOrder:!1,commentPropName:!1,unpairedTags:[],entities:[{regex:new RegExp("&","g"),val:"&amp;"},{regex:new RegExp(">","g"),val:"&gt;"},{regex:new RegExp("<","g"),val:"&lt;"},{regex:new RegExp("'","g"),val:"&apos;"},{regex:new RegExp('"',"g"),val:"&quot;"}],processEntities:!0,stopNodes:[],oneListGroup:!1,jPath:!0};function bt(t){if(this.options=Object.assign({},Nt,t),this.options.stopNodes&&Array.isArray(this.options.stopNodes)&&(this.options.stopNodes=this.options.stopNodes.map(t=>"string"==typeof t&&t.startsWith("*.")?".."+t.substring(2):t)),this.stopNodeExpressions=[],this.options.stopNodes&&Array.isArray(this.options.stopNodes))for(let t=0;t<this.options.stopNodes.length;t++){const e=this.options.stopNodes[t];"string"==typeof e?this.stopNodeExpressions.push(new _(e)):e instanceof _&&this.stopNodeExpressions.push(e)}var e;!0===this.options.ignoreAttributes||this.options.attributesGroupName?this.isAttribute=function(){return!1}:(this.ignoreAttributesFn="function"==typeof(e=this.options.ignoreAttributes)?e:Array.isArray(e)?t=>{for(const i of e){if("string"==typeof i&&t===i)return!0;if(i instanceof RegExp&&i.test(t))return!0}}:()=>!1,this.attrPrefixLen=this.options.attributeNamePrefix.length,this.isAttribute=wt),this.processTextOrObjNode=Et,this.options.format?(this.indentate=yt,this.tagEndChar=">\n",this.newLine="\n"):(this.indentate=function(){return""},this.tagEndChar=">",this.newLine="")}function Et(t,e,i,n){const s=this.extractAttributes(t);if(n.push(e,s),this.checkStopNode(n)){const s=this.buildRawContent(t),r=this.buildAttributesForStopNode(t);return n.pop(),this.buildObjectNode(s,e,r,i)}const r=this.j2x(t,i+1,n);return n.pop(),void 0!==t[this.options.textNodeName]&&1===Object.keys(t).length?this.buildTextValNode(t[this.options.textNodeName],e,r.attrStr,i,n):this.buildObjectNode(r.val,e,r.attrStr,i)}function yt(t){return this.options.indentBy.repeat(t)}function wt(t){return!(!t.startsWith(this.options.attributeNamePrefix)||t===this.options.textNodeName)&&t.substr(this.attrPrefixLen)}bt.prototype.build=function(t){if(this.options.preserveOrder)return lt(t,this.options);{Array.isArray(t)&&this.options.arrayNodeName&&this.options.arrayNodeName.length>1&&(t={[this.options.arrayNodeName]:t});const e=new k;return this.j2x(t,0,e).val}},bt.prototype.j2x=function(t,e,i){let n="",s="";const r=this.options.jPath?i.toString():i,o=this.checkStopNode(i);for(let a in t)if(Object.prototype.hasOwnProperty.call(t,a))if(void 0===t[a])this.isAttribute(a)&&(s+="");else if(null===t[a])this.isAttribute(a)||a===this.options.cdataPropName?s+="":"?"===a[0]?s+=this.indentate(e)+"<"+a+"?"+this.tagEndChar:s+=this.indentate(e)+"<"+a+"/"+this.tagEndChar;else if(t[a]instanceof Date)s+=this.buildTextValNode(t[a],a,"",e,i);else if("object"!=typeof t[a]){const h=this.isAttribute(a);if(h&&!this.ignoreAttributesFn(h,r))n+=this.buildAttrPairStr(h,""+t[a],o);else if(!h)if(a===this.options.textNodeName){let e=this.options.tagValueProcessor(a,""+t[a]);s+=this.replaceEntitiesValue(e)}else{i.push(a);const n=this.checkStopNode(i);if(i.pop(),n){const i=""+t[a];s+=""===i?this.indentate(e)+"<"+a+this.closeTag(a)+this.tagEndChar:this.indentate(e)+"<"+a+">"+i+"</"+a+this.tagEndChar}else s+=this.buildTextValNode(t[a],a,"",e,i)}}else if(Array.isArray(t[a])){const n=t[a].length;let r="",o="";for(let h=0;h<n;h++){const n=t[a][h];if(void 0===n);else if(null===n)"?"===a[0]?s+=this.indentate(e)+"<"+a+"?"+this.tagEndChar:s+=this.indentate(e)+"<"+a+"/"+this.tagEndChar;else if("object"==typeof n)if(this.options.oneListGroup){i.push(a);const t=this.j2x(n,e+1,i);i.pop(),r+=t.val,this.options.attributesGroupName&&n.hasOwnProperty(this.options.attributesGroupName)&&(o+=t.attrStr)}else r+=this.processTextOrObjNode(n,a,e,i);else if(this.options.oneListGroup){let t=this.options.tagValueProcessor(a,n);t=this.replaceEntitiesValue(t),r+=t}else{i.push(a);const t=this.checkStopNode(i);if(i.pop(),t){const t=""+n;r+=""===t?this.indentate(e)+"<"+a+this.closeTag(a)+this.tagEndChar:this.indentate(e)+"<"+a+">"+t+"</"+a+this.tagEndChar}else r+=this.buildTextValNode(n,a,"",e,i)}}this.options.oneListGroup&&(r=this.buildObjectNode(r,a,o,e)),s+=r}else if(this.options.attributesGroupName&&a===this.options.attributesGroupName){const e=Object.keys(t[a]),i=e.length;for(let s=0;s<i;s++)n+=this.buildAttrPairStr(e[s],""+t[a][e[s]],o)}else s+=this.processTextOrObjNode(t[a],a,e,i);return{attrStr:n,val:s}},bt.prototype.buildAttrPairStr=function(t,e,i){return i||(e=this.options.attributeValueProcessor(t,""+e),e=this.replaceEntitiesValue(e)),this.options.suppressBooleanAttributes&&"true"===e?" "+t:" "+t+'="'+e+'"'},bt.prototype.extractAttributes=function(t){if(!t||"object"!=typeof t)return null;const e={};let i=!1;if(this.options.attributesGroupName&&t[this.options.attributesGroupName]){const n=t[this.options.attributesGroupName];for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&(e[t.startsWith(this.options.attributeNamePrefix)?t.substring(this.options.attributeNamePrefix.length):t]=n[t],i=!0)}else for(let n in t){if(!Object.prototype.hasOwnProperty.call(t,n))continue;const s=this.isAttribute(n);s&&(e[s]=t[n],i=!0)}return i?e:null},bt.prototype.buildRawContent=function(t){if("string"==typeof t)return t;if("object"!=typeof t||null===t)return String(t);if(void 0!==t[this.options.textNodeName])return t[this.options.textNodeName];let e="";for(let i in t){if(!Object.prototype.hasOwnProperty.call(t,i))continue;if(this.isAttribute(i))continue;if(this.options.attributesGroupName&&i===this.options.attributesGroupName)continue;const n=t[i];if(i===this.options.textNodeName)e+=n;else if(Array.isArray(n)){for(let t of n)if("string"==typeof t||"number"==typeof t)e+=`<${i}>${t}</${i}>`;else if("object"==typeof t&&null!==t){const n=this.buildRawContent(t),s=this.buildAttributesForStopNode(t);e+=""===n?`<${i}${s}/>`:`<${i}${s}>${n}</${i}>`}}else if("object"==typeof n&&null!==n){const t=this.buildRawContent(n),s=this.buildAttributesForStopNode(n);e+=""===t?`<${i}${s}/>`:`<${i}${s}>${t}</${i}>`}else e+=`<${i}>${n}</${i}>`}return e},bt.prototype.buildAttributesForStopNode=function(t){if(!t||"object"!=typeof t)return"";let e="";if(this.options.attributesGroupName&&t[this.options.attributesGroupName]){const i=t[this.options.attributesGroupName];for(let t in i){if(!Object.prototype.hasOwnProperty.call(i,t))continue;const n=t.startsWith(this.options.attributeNamePrefix)?t.substring(this.options.attributeNamePrefix.length):t,s=i[t];!0===s&&this.options.suppressBooleanAttributes?e+=" "+n:e+=" "+n+'="'+s+'"'}}else for(let i in t){if(!Object.prototype.hasOwnProperty.call(t,i))continue;const n=this.isAttribute(i);if(n){const s=t[i];!0===s&&this.options.suppressBooleanAttributes?e+=" "+n:e+=" "+n+'="'+s+'"'}}return e},bt.prototype.buildObjectNode=function(t,e,i,n){if(""===t)return"?"===e[0]?this.indentate(n)+"<"+e+i+"?"+this.tagEndChar:this.indentate(n)+"<"+e+i+this.closeTag(e)+this.tagEndChar;{let s="</"+e+this.tagEndChar,r="";return"?"===e[0]&&(r="?",s=""),!i&&""!==i||-1!==t.indexOf("<")?!1!==this.options.commentPropName&&e===this.options.commentPropName&&0===r.length?this.indentate(n)+`\x3c!--${t}--\x3e`+this.newLine:this.indentate(n)+"<"+e+i+r+this.tagEndChar+t+this.indentate(n)+s:this.indentate(n)+"<"+e+i+r+">"+t+s}},bt.prototype.closeTag=function(t){let e="";return-1!==this.options.unpairedTags.indexOf(t)?this.options.suppressUnpairedNode||(e="/"):e=this.options.suppressEmptyNode?"/":`></${t}`,e},bt.prototype.checkStopNode=function(t){if(!this.stopNodeExpressions||0===this.stopNodeExpressions.length)return!1;for(let e=0;e<this.stopNodeExpressions.length;e++)if(t.matches(this.stopNodeExpressions[e]))return!0;return!1},bt.prototype.buildTextValNode=function(t,e,i,n,s){if(!1!==this.options.cdataPropName&&e===this.options.cdataPropName)return this.indentate(n)+`<![CDATA[${t}]]>`+this.newLine;if(!1!==this.options.commentPropName&&e===this.options.commentPropName)return this.indentate(n)+`\x3c!--${t}--\x3e`+this.newLine;if("?"===e[0])return this.indentate(n)+"<"+e+i+"?"+this.tagEndChar;{let s=this.options.tagValueProcessor(e,t);return s=this.replaceEntitiesValue(s),""===s?this.indentate(n)+"<"+e+i+this.closeTag(e)+this.tagEndChar:this.indentate(n)+"<"+e+i+">"+s+"</"+e+this.tagEndChar}},bt.prototype.replaceEntitiesValue=function(t){if(t&&t.length>0&&this.options.processEntities)for(let e=0;e<this.options.entities.length;e++){const i=this.options.entities[e];t=t.replace(i.regex,i.val)}return t};const vt=bt,Tt={validate:a};module.exports=e})();
},{}],2:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],3:[function(require,module,exports){
'use strict';

var each = require('foreach');
module.exports = api;


/**
 * Convenience wrapper around the api.
 * Calls `.get` when called with an `object` and a `pointer`.
 * Calls `.set` when also called with `value`.
 * If only supplied `object`, returns a partially applied function, mapped to the object.
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @param value
 * @returns {*}
 */

function api (obj, pointer, value) {
    // .set()
    if (arguments.length === 3) {
        return api.set(obj, pointer, value);
    }
    // .get()
    if (arguments.length === 2) {
        return api.get(obj, pointer);
    }
    // Return a partially applied function on `obj`.
    var wrapped = api.bind(api, obj);

    // Support for oo style
    for (var name in api) {
        if (api.hasOwnProperty(name)) {
            wrapped[name] = api[name].bind(wrapped, obj);
        }
    }
    return wrapped;
}


/**
 * Lookup a json pointer in an object
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @returns {*}
 */
api.get = function get (obj, pointer) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer);

    for (var i = 0; i < refTokens.length; ++i) {
        var tok = refTokens[i];
        if (!(typeof obj == 'object' && tok in obj)) {
            throw new Error('Invalid reference token: ' + tok);
        }
        obj = obj[tok];
    }
    return obj;
};

/**
 * Sets a value on an object
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 * @param value
 */
api.set = function set (obj, pointer, value) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer),
      nextTok = refTokens[0];

    if (refTokens.length === 0) {
      throw Error('Can not set the root object');
    }

    for (var i = 0; i < refTokens.length - 1; ++i) {
        var tok = refTokens[i];
        if (typeof tok !== 'string' && typeof tok !== 'number') {
          tok = String(tok)
        }
        if (tok === "__proto__" || tok === "constructor" || tok === "prototype") {
            continue
        }
        if (tok === '-' && Array.isArray(obj)) {
          tok = obj.length;
        }
        nextTok = refTokens[i + 1];

        if (!(tok in obj)) {
            if (nextTok.match(/^(\d+|-)$/)) {
                obj[tok] = [];
            } else {
                obj[tok] = {};
            }
        }
        obj = obj[tok];
    }
    if (nextTok === '-' && Array.isArray(obj)) {
      nextTok = obj.length;
    }
    obj[nextTok] = value;
    return this;
};

/**
 * Removes an attribute
 *
 * @param {Object} obj
 * @param {String|Array} pointer
 */
api.remove = function (obj, pointer) {
    var refTokens = Array.isArray(pointer) ? pointer : api.parse(pointer);
    var finalToken = refTokens[refTokens.length -1];
    if (finalToken === undefined) {
        throw new Error('Invalid JSON pointer for remove: "' + pointer + '"');
    }

    var parent = api.get(obj, refTokens.slice(0, -1));
    if (Array.isArray(parent)) {
      var index = +finalToken;
      if (finalToken === '' && isNaN(index)) {
        throw new Error('Invalid array index: "' + finalToken + '"');
      }

      Array.prototype.splice.call(parent, index, 1);
    } else {
      delete parent[finalToken];
    }
};

/**
 * Returns a (pointer -> value) dictionary for an object
 *
 * @param obj
 * @param {function} descend
 * @returns {}
 */
api.dict = function dict (obj, descend) {
    var results = {};
    api.walk(obj, function (value, pointer) {
        results[pointer] = value;
    }, descend);
    return results;
};

/**
 * Iterates over an object
 * Iterator: function (value, pointer) {}
 *
 * @param obj
 * @param {function} iterator
 * @param {function} descend
 */
api.walk = function walk (obj, iterator, descend) {
    var refTokens = [];

    descend = descend || function (value) {
        var type = Object.prototype.toString.call(value);
        return type === '[object Object]' || type === '[object Array]';
    };

    (function next (cur) {
        each(cur, function (value, key) {
            refTokens.push(String(key));
            if (descend(value)) {
                next(value);
            } else {
                iterator(value, api.compile(refTokens));
            }
            refTokens.pop();
        });
    }(obj));
};

/**
 * Tests if an object has a value for a json pointer
 *
 * @param obj
 * @param pointer
 * @returns {boolean}
 */
api.has = function has (obj, pointer) {
    try {
        api.get(obj, pointer);
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * Escapes a reference token
 *
 * @param str
 * @returns {string}
 */
api.escape = function escape (str) {
    return str.toString().replace(/~/g, '~0').replace(/\//g, '~1');
};

/**
 * Unescapes a reference token
 *
 * @param str
 * @returns {string}
 */
api.unescape = function unescape (str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~');
};

/**
 * Converts a json pointer into a array of reference tokens
 *
 * @param pointer
 * @returns {Array}
 */
api.parse = function parse (pointer) {
    if (pointer === '') { return []; }
    if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer: ' + pointer); }
    return pointer.substring(1).split(/\//).map(api.unescape);
};

/**
 * Builds a json pointer from a array of reference tokens
 *
 * @param refTokens
 * @returns {string}
 */
api.compile = function compile (refTokens) {
    if (refTokens.length === 0) { return ''; }
    return '/' + refTokens.map(api.escape).join('/');
};

},{"foreach":2}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.allOfSample = allOfSample;
var _traverse = require("./traverse");
var _utils = require("./utils");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function allOfSample(into, children, options, spec, context) {
  let res = (0, _traverse.traverse)(into, options, spec);
  const subSamples = [];
  for (let subSchema of children) {
    const {
      type,
      readOnly,
      writeOnly,
      value
    } = (0, _traverse.traverse)(_objectSpread({
      type: res.type
    }, subSchema), options, spec, _objectSpread(_objectSpread({}, context), {}, {
      isAllOfChild: true
    }));
    if (res.type && type && type !== res.type) {
      console.warn('allOf: schemas with different types can\'t be merged');
      res.type = type;
    }
    res.type = res.type || type;
    res.readOnly = res.readOnly || readOnly;
    res.writeOnly = res.writeOnly || writeOnly;
    if (value != null) subSamples.push(value);
  }
  if (res.type === 'object') {
    res.value = (0, _utils.mergeDeep)(res.value || {}, ...subSamples.filter(sample => typeof sample === 'object'));
    for (const key in res.value) {
      if (res.value[key] === _utils.SKIP_SYMBOL) {
        delete res.value[key];
      }
    }
    return res;
  } else {
    if (res.type === 'array') {
      // TODO: implement arrays
      if (!options.quiet) console.warn('OpenAPI Sampler: found allOf with "array" type. Result may be incorrect');
    }
    const lastSample = subSamples[subSamples.length - 1];
    res.value = lastSample != null ? lastSample : res.value;
    return res;
  }
}

},{"./traverse":14,"./utils":15}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inferType = inferType;
const schemaKeywordTypes = {
  multipleOf: 'number',
  maximum: 'number',
  exclusiveMaximum: 'number',
  minimum: 'number',
  exclusiveMinimum: 'number',
  maxLength: 'string',
  minLength: 'string',
  pattern: 'string',
  items: 'array',
  maxItems: 'array',
  minItems: 'array',
  uniqueItems: 'array',
  additionalItems: 'array',
  maxProperties: 'object',
  minProperties: 'object',
  required: 'object',
  additionalProperties: 'object',
  properties: 'object',
  patternProperties: 'object',
  dependencies: 'object'
};
function inferType(schema) {
  if (schema.type !== undefined) {
    return Array.isArray(schema.type) ? schema.type.length === 0 ? null : schema.type[0] : schema.type;
  }
  const keywords = Object.keys(schemaKeywordTypes);
  for (var i = 0; i < keywords.length; i++) {
    let keyword = keywords[i];
    let type = schemaKeywordTypes[keyword];
    if (schema[keyword] !== undefined) {
      return type;
    }
  }
  return null;
}

},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._registerSampler = _registerSampler;
exports._samplers = void 0;
Object.defineProperty(exports, "inferType", {
  enumerable: true,
  get: function () {
    return _infer.inferType;
  }
});
exports.sample = sample;
var _traverse = require("./traverse");
var _index = require("./samplers/index");
var _fastXmlParser = require("fast-xml-parser");
var _infer = require("./infer");
var _samplers = exports._samplers = {};
const defaults = {
  skipReadOnly: false,
  maxSampleDepth: 15
};
function convertJsonToXml(obj, schema) {
  if (!obj) {
    throw new Error('Unknown format output for building XML.');
  }
  if (Array.isArray(obj) || Object.keys(obj).length > 1) {
    var _schema$xml;
    obj = {
      [(schema === null || schema === void 0 || (_schema$xml = schema.xml) === null || _schema$xml === void 0 ? void 0 : _schema$xml.name) || 'root']: obj
    }; // XML document must contain one root element
  }
  const builder = new _fastXmlParser.XMLBuilder({
    ignoreAttributes: false,
    format: true,
    attributeNamePrefix: '$',
    textNodeName: '#text',
    cdataPropName: '#cdata'
  });
  return builder.build(obj);
}
function sample(schema, options, spec) {
  let opts = Object.assign({}, defaults, options);
  (0, _traverse.clearCache)();
  let result = (0, _traverse.traverse)(schema, opts, spec).value;
  if ((opts === null || opts === void 0 ? void 0 : opts.format) === 'xml') {
    return convertJsonToXml(result, schema);
  }
  return result;
}
;
function _registerSampler(type, sampler) {
  _samplers[type] = sampler;
}
;
_registerSampler('array', _index.sampleArray);
_registerSampler('boolean', _index.sampleBoolean);
_registerSampler('integer', _index.sampleNumber);
_registerSampler('number', _index.sampleNumber);
_registerSampler('object', _index.sampleObject);
_registerSampler('string', _index.sampleString);

},{"./infer":5,"./samplers/index":9,"./traverse":14,"fast-xml-parser":1}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleArray = sampleArray;
var _traverse = require("../traverse");
var _utils = require("../utils");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function sampleArray(schema) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let spec = arguments.length > 2 ? arguments[2] : undefined;
  let context = arguments.length > 3 ? arguments[3] : undefined;
  const depth = context && context.depth || 1;
  let arrayLength = Math.min(schema.maxItems != undefined ? schema.maxItems : Infinity, schema.minItems || 1);
  // for the sake of simplicity, we're treating `contains` in a similar way to `items`
  const items = schema.prefixItems || schema.items || schema.contains;
  if (Array.isArray(items)) {
    arrayLength = Math.max(arrayLength, items.length);
  }
  let itemSchemaGetter = itemNumber => {
    if (Array.isArray(items)) {
      return items[itemNumber] || {};
    }
    return items || {};
  };
  let res = [];
  if (!items) return res;
  for (let i = 0; i < arrayLength; i++) {
    let itemSchema = itemSchemaGetter(i);
    let {
      value: sample
    } = (0, _traverse.traverse)(itemSchema, options, spec, {
      depth: depth + 1
    });
    if ((options === null || options === void 0 ? void 0 : options.format) === 'xml') {
      const {
        value,
        propertyName
      } = (0, _utils.applyXMLAttributes)({
        value: sample
      }, itemSchema, context);
      if (propertyName) {
        var _res;
        if (!((_res = res) !== null && _res !== void 0 && _res[propertyName])) {
          res = _objectSpread(_objectSpread({}, res), {}, {
            [propertyName]: []
          });
        }
        res[propertyName].push(value);
      } else {
        res = _objectSpread(_objectSpread({}, res), value);
      }
    } else {
      res.push(sample);
    }
  }
  if ((options === null || options === void 0 ? void 0 : options.format) === 'xml' && depth === 1) {
    const {
      value,
      propertyName
    } = (0, _utils.applyXMLAttributes)({
      value: null
    }, schema, context);
    if (propertyName) {
      if (value) {
        res = Array.isArray(res) ? {
          [propertyName]: _objectSpread(_objectSpread({}, value), res.map(item => ({
            ['#text']: _objectSpread({}, item)
          })))
        } : {
          [propertyName]: _objectSpread(_objectSpread({}, res), value)
        };
      } else {
        res = {
          [propertyName]: res
        };
      }
    }
  }
  return res;
}

},{"../traverse":14,"../utils":15}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleBoolean = sampleBoolean;
function sampleBoolean(schema) {
  return true; // let be optimistic :)
}

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "sampleArray", {
  enumerable: true,
  get: function () {
    return _array.sampleArray;
  }
});
Object.defineProperty(exports, "sampleBoolean", {
  enumerable: true,
  get: function () {
    return _boolean.sampleBoolean;
  }
});
Object.defineProperty(exports, "sampleNumber", {
  enumerable: true,
  get: function () {
    return _number.sampleNumber;
  }
});
Object.defineProperty(exports, "sampleObject", {
  enumerable: true,
  get: function () {
    return _object.sampleObject;
  }
});
Object.defineProperty(exports, "sampleString", {
  enumerable: true,
  get: function () {
    return _string.sampleString;
  }
});
var _array = require("./array");
var _boolean = require("./boolean");
var _number = require("./number");
var _object = require("./object");
var _string = require("./string");

},{"./array":7,"./boolean":8,"./number":10,"./object":11,"./string":13}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleNumber = sampleNumber;
function sampleNumber(schema) {
  let res = 0;
  if (schema.type === 'number' && (schema.format === 'float' || schema.format === 'double')) {
    res = 0.1;
  }
  if (typeof schema.exclusiveMinimum === 'boolean' || typeof schema.exclusiveMaximum === 'boolean') {
    //legacy support for jsonschema draft 4 of exclusiveMaximum/exclusiveMinimum as booleans
    if (schema.maximum && schema.minimum) {
      res = schema.exclusiveMinimum ? Math.floor(schema.minimum) + 1 : schema.minimum;
      if (schema.exclusiveMaximum && res >= schema.maximum || !schema.exclusiveMaximum && res > schema.maximum) {
        res = (schema.maximum + schema.minimum) / 2;
      }
      return res;
    }
    if (schema.minimum) {
      if (schema.exclusiveMinimum) {
        return Math.floor(schema.minimum) + 1;
      } else {
        return schema.minimum;
      }
    }
    if (schema.maximum) {
      if (schema.exclusiveMaximum) {
        return schema.maximum > 0 ? 0 : Math.floor(schema.maximum) - 1;
      } else {
        return schema.maximum > 0 ? 0 : schema.maximum;
      }
    }
  } else {
    if (schema.minimum) {
      return schema.minimum;
    }
    if (schema.exclusiveMinimum) {
      res = Math.floor(schema.exclusiveMinimum) + 1;
      if (res === schema.exclusiveMaximum) {
        res = (res + Math.floor(schema.exclusiveMaximum) - 1) / 2;
      }
    } else if (schema.exclusiveMaximum) {
      res = Math.floor(schema.exclusiveMaximum) - 1;
    } else if (schema.maximum) {
      res = schema.maximum;
    }
  }
  return res;
}

},{}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleObject = sampleObject;
var _traverse = require("../traverse");
var _utils = require("../utils");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function sampleObject(schema) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let spec = arguments.length > 2 ? arguments[2] : undefined;
  let context = arguments.length > 3 ? arguments[3] : undefined;
  let res = {};
  const depth = context && context.depth || 1;
  if (schema && typeof schema.properties === 'object') {
    // Prepare for skipNonRequired option
    const requiredProperties = Array.isArray(schema.required) ? schema.required : [];
    const requiredPropertiesMap = {};
    for (const requiredProperty of requiredProperties) {
      requiredPropertiesMap[requiredProperty] = true;
    }
    Object.keys(schema.properties).forEach(propertyName => {
      // skip before traverse that could be costly
      if (options.skipNonRequired && !requiredPropertiesMap.hasOwnProperty(propertyName)) {
        return;
      }
      const sample = (0, _traverse.traverse)(schema.properties[propertyName], options, spec, {
        propertyName,
        depth: depth + 1
      });
      if (options.skipReadOnly && sample.readOnly) {
        if (context !== null && context !== void 0 && context.isAllOfChild) {
          res[propertyName] = _utils.SKIP_SYMBOL;
        }
        return;
      }
      if (options.skipWriteOnly && sample.writeOnly) {
        if (context !== null && context !== void 0 && context.isAllOfChild) {
          res[propertyName] = _utils.SKIP_SYMBOL;
        }
        return;
      }
      if ((options === null || options === void 0 ? void 0 : options.format) === 'xml') {
        const {
          propertyName: newPropertyName,
          value
        } = (0, _utils.applyXMLAttributes)(sample, schema.properties[propertyName], {
          propertyName
        });
        if (newPropertyName) {
          res[newPropertyName] = value;
        } else if (value !== null && typeof value === 'object') {
          res = _objectSpread(_objectSpread({}, res), value);
        }
      } else {
        res[propertyName] = sample.value;
      }
    });
  }
  if (schema && typeof schema.additionalProperties === 'object') {
    const propertyName = schema.additionalProperties['x-additionalPropertiesName'] || 'property';
    res["".concat(String(propertyName), "1")] = (0, _traverse.traverse)(schema.additionalProperties, options, spec, {
      depth: depth + 1
    }).value;
    res["".concat(String(propertyName), "2")] = (0, _traverse.traverse)(schema.additionalProperties, options, spec, {
      depth: depth + 1
    }).value;
  }

  // Strictly enforce maxProperties constraint
  if (schema && typeof schema.properties === 'object' && schema.maxProperties !== undefined && Object.keys(res).length > schema.maxProperties) {
    const filteredResult = {};
    let propertiesAdded = 0;

    // Always include required properties first, if present
    const requiredProperties = Array.isArray(schema.required) ? schema.required : [];
    requiredProperties.forEach(propName => {
      if (res[propName] !== undefined) {
        filteredResult[propName] = res[propName];
        propertiesAdded++;
      }
    });

    // Add other properties until maxProperties is reached
    Object.keys(res).forEach(propName => {
      if (propertiesAdded < schema.maxProperties && !filteredResult.hasOwnProperty(propName)) {
        filteredResult[propName] = res[propName];
        propertiesAdded++;
      }
    });
    res = filteredResult;
  }
  return res;
}

},{"../traverse":14,"../utils":15}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.regexSample = regexSample;
/**
Faker - Copyright (c) 2022-2023

This software consists of voluntary contributions made by many individuals.
For exact contribution history, see the revision history
available at https://github.com/faker-js/faker

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

===

From: https://github.com/faker-js/faker/commit/a9f98046c7d5eeaabe12fc587024c06d683800b8
To: https://github.com/faker-js/faker/commit/29234378807c4141588861f69421bf20b5ac635e

Based on faker.js, copyright Marak Squires and contributor, what follows below is the original license.

===

faker.js - Copyright (c) 2020
Marak Squires
http://github.com/marak/faker.js/

faker.js was inspired by and has used data definitions from:

 * https://github.com/stympy/faker/ - Copyright (c) 2007-2010 Benjamin Curtis
 * http://search.cpan.org/~jasonk/Data-Faker-0.07/ - Copyright 2004-2005 by Jason Kohles

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** @returns {boolean} */
function boolSample() {
  return true;
}

/**
 * @param {number} min - inclusive
 * @param {number} _max - inclusive
 * @returns {number}
 */
function intSample(min, _max) {
  return min;
}

/**
 * Returns a number based on given RegEx-based quantifier symbol or quantifier values.
 *
 * @param {string} quantifierSymbol Quantifier symbols can be either of these: `?`, `*`, `+`.
 * @param {string} quantifierMin Quantifier minimum value. If given without a maximum, this will be used as the quantifier value.
 * @param {string} quantifierMax Quantifier maximum value. Will randomly get a value between the minimum and maximum if both are provided.
 *
 * @returns {number} a random number based on the given quantifier parameters.
 *
 * @example
 * getRepetitionsBasedOnQuantifierParameters('*', null, null) // 3
 * getRepetitionsBasedOnQuantifierParameters(null, 10, null) // 10
 * getRepetitionsBasedOnQuantifierParameters(null, 5, 8) // 6
 *
 * @since 8.0.0
 */
function getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax) {
  let repetitions = 1;
  if (quantifierSymbol) {
    switch (quantifierSymbol) {
      case '?':
        {
          repetitions = boolSample() ? 0 : 1;
          break;
        }
      case '*':
        {
          const limit = 8;
          repetitions = intSample(0, limit);
          break;
        }
      case '+':
        {
          const limit = 8;
          repetitions = intSample(1, limit);
          break;
        }
      default:
        throw new Error('Unknown quantifier symbol provided.');
    }
  } else if (quantifierMin != null && quantifierMax != null) {
    repetitions = intSample(parseInt(quantifierMin), parseInt(quantifierMax));
  } else if (quantifierMin != null && quantifierMax == null) {
    repetitions = parseInt(quantifierMin);
  }
  return repetitions;
}

/**
  * Generates a string matching the given regex like expressions.
  *
  * This function doesn't provide full support of actual `RegExp`.
  * Features such as grouping, anchors and character classes are not supported.
  * If you are looking for a library that randomly generates strings based on
  * `RegExp`s, see [randexp.js](https://github.com/fent/randexp.js)
  *
  * Supported patterns:
  * - `x{times}` => Repeat the `x` exactly `times` times.
  * - `x{min,max}` => Repeat the `x` `min` to `max` times.
  * - `[x-y]` => Randomly get a character between `x` and `y` (inclusive).
  * - `[x-y]{times}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `times` times.
  * - `[x-y]{min,max}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `min` to `max` times.
  * - `[^...]` => Randomly get an ASCII number or letter character that is not in the given range. (e.g. `[^0-9]` will get a random non-numeric character).
  * - `[-...]` => Include dashes in the range. Must be placed after the negate character `^` and before any character sets if used (e.g. `[^-0-9]` will not get any numeric characters or dashes).
  * - `/[x-y]/i` => Randomly gets an uppercase or lowercase character between `x` and `y` (inclusive).
  * - `x?` => Randomly decide to include or not include `x`.
  * - `[x-y]?` => Randomly decide to include or not include characters between `x` and `y` (inclusive).
  * - `x*` => Repeat `x` 0 or more times.
  * - `[x-y]*` => Repeat characters between `x` and `y` (inclusive) 0 or more times.
  * - `x+` => Repeat `x` 1 or more times.
  * - `[x-y]+` => Repeat characters between `x` and `y` (inclusive) 1 or more times.
  * - `.` => returns a wildcard ASCII character that can be any number, character or symbol. Can be combined with quantifiers as well.
  *
  * @param {string | RegExp} pattern The template string/RegExp to generate a matching string for.
  * @returns {string} A string matching the given pattern.
  *
  * @throws If min value is more than max value in quantifier. e.g. `#{10,5}`
  * @throws If invalid quantifier symbol is passed in.
  *
  * @example
  * regexSample('#{5}') // '#####'
  * regexSample('#{2,9}') // '#######'
  * regexSample('[1-7]') // '5'
  * regexSample('#{3}test[1-5]') // '###test3'
  * regexSample('[0-9a-dmno]') // '5'
  * regexSample('[^a-zA-Z0-8]') // '9'
  * regexSample('[a-d0-6]{2,8}') // 'a0dc45b0'
  * regexSample('[-a-z]{5}') // 'a-zab'
  * regexSample(/[A-Z0-9]{4}-[A-Z0-9]{4}/) // 'BS4G-485H'
  * regexSample(/[A-Z]{5}/i) // 'pDKfh'
  * regexSample(/.{5}/) // '14(#B'
  * regexSample(/Joh?n/) // 'Jon'
  * regexSample(/ABC*DE/) // 'ABDE'
  * regexSample(/bee+p/) // 'beeeeeeeep'
  *
  * @since 8.0.0
  */
function regexSample(pattern) {
  let isCaseInsensitive = false;
  if (pattern instanceof RegExp) {
    var _pattern$match$, _pattern$match;
    isCaseInsensitive = pattern.flags.includes('i');
    pattern = pattern.toString();
    pattern = (_pattern$match$ = (_pattern$match = pattern.match(/\/(.+?)\//)) === null || _pattern$match === void 0 ? void 0 : _pattern$match[1]) !== null && _pattern$match$ !== void 0 ? _pattern$match$ : ''; // Remove frontslash from front and back of RegExp
  }
  pattern = pattern.replace(/^(\^)?(.*?)(\$)?$/, '$2'); // Remove anchors if present

  let min;
  let max;
  let repetitions;

  // Deal with single wildcards
  const SINGLE_CHAR_REG = /([.A-Za-z0-9])(?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+))(?![^[]*]|[^{]*})/;
  let token = pattern.match(SINGLE_CHAR_REG);
  while (token != null) {
    const quantifierMin = token[2];
    const quantifierMax = token[3];
    const quantifierSymbol = token[4];
    repetitions = getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(SINGLE_CHAR_REG);
  }
  const SINGLE_RANGE_REG = /(\d-\d|\w-\w|\d|\w|[-!@#$&()`.+,/"])/;
  const RANGE_ALPHANUMEMRIC_REG = /\[(\^|)(-|)(.+?)\](?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+)|)/;
  // Deal with character classes with quantifiers `[a-z0-9]{min[, max]}`
  token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  while (token != null) {
    const isNegated = token[1] === '^';
    const includesDash = token[2] === '-';
    const quantifierMin = token[4];
    const quantifierMax = token[5];
    const quantifierSymbol = token[6];
    const rangeCodes = [];
    let ranges = token[3];
    let range = ranges.match(SINGLE_RANGE_REG);
    if (includesDash) {
      // 45 is the ascii code for '-'
      rangeCodes.push(45);
    }
    while (range != null) {
      if (range[0].indexOf('-') === -1) {
        // handle non-ranges
        if (isCaseInsensitive && isNaN(Number(range[0]))) {
          rangeCodes.push(range[0].toUpperCase().charCodeAt(0));
          rangeCodes.push(range[0].toLowerCase().charCodeAt(0));
        } else {
          rangeCodes.push(range[0].charCodeAt(0));
        }
      } else {
        // handle ranges
        const rangeMinMax = range[0].split('-').map(x => x.charCodeAt(0));
        min = rangeMinMax[0];
        max = rangeMinMax[1];
        // throw error if min larger than max
        if (min > max) {
          throw new Error('Character range provided is out of order.');
        }
        for (let i = min; i <= max; i++) {
          if (isCaseInsensitive && isNaN(Number(String.fromCharCode(i)))) {
            const ch = String.fromCharCode(i);
            rangeCodes.push(ch.toUpperCase().charCodeAt(0));
            rangeCodes.push(ch.toLowerCase().charCodeAt(0));
          } else {
            rangeCodes.push(i);
          }
        }
      }
      ranges = ranges.substring(range[0].length);
      range = ranges.match(SINGLE_RANGE_REG);
    }
    repetitions = getRepetitionsBasedOnQuantifierParameters(quantifierSymbol, quantifierMin, quantifierMax);
    if (isNegated) {
      let index = -1;
      // 0-9
      for (let i = 48; i <= 57; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }

      // A-Z
      for (let i = 65; i <= 90; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }

      // a-z
      for (let i = 97; i <= 122; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }
        rangeCodes.push(i);
      }
    }
    const generatedString = Array.from({
      length: repetitions
    }, () => String.fromCharCode(rangeCodes[intSample(0, rangeCodes.length - 1)])).join('');
    pattern = pattern.slice(0, token.index) + generatedString + pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  }
  const RANGE_REP_REG = /(.)\{(\d+)\,(\d+)\}/;
  // Deal with quantifier ranges `{min,max}`
  token = pattern.match(RANGE_REP_REG);
  while (token != null) {
    min = parseInt(token[2]);
    max = parseInt(token[3]);
    // throw error if min larger than max
    if (min > max) {
      throw new Error('Numbers out of order in {} quantifier.');
    }
    repetitions = intSample(min, max);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_REP_REG);
  }
  const REP_REG = /(.)\{(\d+)\}/;
  // Deal with repeat `{num}`
  token = pattern.match(REP_REG);
  while (token != null) {
    repetitions = parseInt(token[2]);
    pattern = pattern.slice(0, token.index) + token[1].repeat(repetitions) + pattern.slice(token.index + token[0].length);
    token = pattern.match(REP_REG);
  }
  return pattern;
}

},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleString = sampleString;
var _utils = require("../utils");
var faker = _interopRequireWildcard(require("./string-regex"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const passwordSymbols = 'qwerty!@#$%^123456';
function emailSample() {
  return 'user@example.com';
}
function idnEmailSample() {
  return 'пошта@укр.нет';
}
function passwordSample(min, max) {
  let res = 'pa$$word';
  if (min > res.length) {
    res += '_';
    res += (0, _utils.ensureMinLength)(passwordSymbols, min - res.length).substring(0, min - res.length);
  }
  return res;
}
function commonDateTimeSample(_ref) {
  let {
    min,
    max,
    omitTime,
    omitDate
  } = _ref;
  let res = (0, _utils.toRFCDateTime)(new Date('2019-08-24T14:15:22.123Z'), omitTime, omitDate, false);
  if (res.length < min) {
    console.warn("Using minLength = ".concat(min, " is incorrect with format \"date-time\""));
  }
  if (max && res.length > max) {
    console.warn("Using maxLength = ".concat(max, " is incorrect with format \"date-time\""));
  }
  return res;
}
function dateTimeSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: false,
    omitDate: false
  });
}
function dateSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: true,
    omitDate: false
  });
}
function timeSample(min, max) {
  return commonDateTimeSample({
    min,
    max,
    omitTime: false,
    omitDate: true
  }).slice(1);
}
function defaultSample(min, max, _propertyName, pattern) {
  let enablePatterns = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  if (pattern && enablePatterns) {
    return faker.regexSample(pattern);
  }
  let res = (0, _utils.ensureMinLength)('string', min);
  if (max && res.length > max) {
    res = res.substring(0, max);
  }
  return res;
}
function ipv4Sample() {
  return '192.168.0.1';
}
function ipv6Sample() {
  return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
}
function hostnameSample() {
  return 'example.com';
}
function idnHostnameSample() {
  return 'приклад.укр';
}
function uriSample() {
  return 'http://example.com';
}
function uriReferenceSample() {
  return '../dictionary';
}
function uriTemplateSample() {
  return 'http://example.com/{endpoint}';
}
function iriSample() {
  return 'http://example.com/entity/1';
}
function iriReferenceSample() {
  return '/entity/1';
}
function uuidSample(_min, _max, propertyName) {
  return (0, _utils.uuid)(propertyName || 'id');
}
function jsonPointerSample() {
  return '/json/pointer';
}
function relativeJsonPointerSample() {
  return '1/relative/json/pointer';
}
function regexSample() {
  return '/regex/';
}
const stringFormats = {
  'email': emailSample,
  'idn-email': idnEmailSample,
  // https://tools.ietf.org/html/rfc6531#section-3.3
  'password': passwordSample,
  'date-time': dateTimeSample,
  'date': dateSample,
  'time': timeSample,
  // full-time in https://tools.ietf.org/html/rfc3339#section-5.6
  'ipv4': ipv4Sample,
  'ipv6': ipv6Sample,
  'hostname': hostnameSample,
  'idn-hostname': idnHostnameSample,
  // https://tools.ietf.org/html/rfc5890#section-2.3.2.3
  'iri': iriSample,
  // https://tools.ietf.org/html/rfc3987
  'iri-reference': iriReferenceSample,
  'uri': uriSample,
  'uri-reference': uriReferenceSample,
  // either a URI or relative-reference https://tools.ietf.org/html/rfc3986#section-4.1
  'uri-template': uriTemplateSample,
  'uuid': uuidSample,
  'default': defaultSample,
  'json-pointer': jsonPointerSample,
  'relative-json-pointer': relativeJsonPointerSample,
  // https://tools.ietf.org/html/draft-handrews-relative-json-pointer-01
  'regex': regexSample
};
function sampleString(schema, options, spec, context) {
  let format = schema.format || 'default';
  let sampler = stringFormats[format] || defaultSample;
  let propertyName = context && context.propertyName;
  return sampler(schema.minLength || 0, schema.maxLength, propertyName, schema.pattern, options === null || options === void 0 ? void 0 : options.enablePatterns);
}

},{"../utils":15,"./string-regex":12}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearCache = clearCache;
exports.traverse = traverse;
var _openapiSampler = require("./openapi-sampler");
var _allOf = require("./allOf");
var _infer = require("./infer");
var _utils = require("./utils");
var _jsonPointer = _interopRequireDefault(require("json-pointer"));
const _excluded = ["if", "then"];
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let $refCache = {};
// for circular JS references we use additional array and not object as we need to compare entire schemas and not strings
let seenSchemasStack = [];
function clearCache() {
  $refCache = {};
  seenSchemasStack = [];
}
function inferExample(schema) {
  let example;
  if (schema.const !== undefined) {
    example = schema.const;
  } else if (schema.examples !== undefined && schema.examples.length) {
    example = schema.examples[0];
  } else if (schema.enum !== undefined && schema.enum.length) {
    example = schema.enum[0];
  } else if (schema.default !== undefined) {
    example = schema.default;
  }
  return example;
}
function tryInferExample(schema) {
  const example = inferExample(schema);
  // case when we don't infer example from schema but take from `const`, `examples`, `default` or `enum` keywords
  if (example !== undefined) {
    return {
      value: example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: null
    };
  }
  return;
}
function traverse(schema, options, spec, context) {
  // checking circular JS references by checking context
  // because context is passed only when traversing through nested objects happens
  if (context) {
    if (seenSchemasStack.includes(schema)) return (0, _utils.getResultForCircular)((0, _infer.inferType)(schema));
    seenSchemasStack.push(schema);
  }
  if (context && context.depth > options.maxSampleDepth) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return (0, _utils.getResultForCircular)((0, _infer.inferType)(schema));
  }
  if (schema.$ref) {
    if (!spec) {
      throw new Error('Your schema contains $ref. You must provide full specification in the third parameter.');
    }
    let ref = decodeURIComponent(schema.$ref);
    if (ref.startsWith('#')) {
      ref = ref.substring(1);
    }
    const referenced = _jsonPointer.default.get(spec, ref);
    let result;
    if ($refCache[ref] !== true) {
      $refCache[ref] = true;
      const traverseResult = traverse(referenced, options, spec, context);
      if (options.format === 'xml') {
        const refName = ref.split('/').pop();
        const xmlContext = _objectSpread(_objectSpread({}, context), {}, {
          propertyName: (context === null || context === void 0 ? void 0 : context.propertyName) || refName
        });
        const {
          propertyName,
          value
        } = (0, _utils.applyXMLAttributes)(traverseResult, referenced, xmlContext);
        result = _objectSpread(_objectSpread({}, traverseResult), {}, {
          value: {
            [propertyName || 'root']: value
          }
        });
      } else {
        result = traverseResult;
      }
      $refCache[ref] = false;
    } else {
      const referencedType = (0, _infer.inferType)(referenced);
      result = (0, _utils.getResultForCircular)(referencedType);
    }
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return result;
  }
  if (schema.example !== undefined) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return {
      value: schema.example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: schema.type
    };
  }
  if (schema.allOf !== undefined) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    return tryInferExample(schema) || (0, _allOf.allOfSample)(_objectSpread(_objectSpread({}, schema), {}, {
      allOf: undefined
    }), schema.allOf, options, spec, context);
  }
  if (schema.oneOf && schema.oneOf.length) {
    if (schema.anyOf) {
      if (!options.quiet) console.warn('oneOf and anyOf are not supported on the same level. Skipping anyOf');
    }
    (0, _utils.popSchemaStack)(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstOneOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.oneOf[0]);
    return traverseOneOrAnyOf(schema, firstOneOf);
  }
  if (schema.anyOf && schema.anyOf.length) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstAnyOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.anyOf[0]);
    return traverseOneOrAnyOf(schema, firstAnyOf);
  }
  if (schema.if && schema.then) {
    (0, _utils.popSchemaStack)(seenSchemasStack, context);
    const {
        if: ifSchema,
        then
      } = schema,
      rest = _objectWithoutProperties(schema, _excluded);
    return traverse((0, _utils.mergeDeep)(rest, ifSchema, then), options, spec, context);
  }
  let example = inferExample(schema);
  let type = null;
  if (example === undefined) {
    example = null;
    type = schema.type;
    if (Array.isArray(type) && schema.type.length > 0) {
      type = schema.type[0];
    }
    if (!type) {
      type = (0, _infer.inferType)(schema);
    }
    let sampler = _openapiSampler._samplers[type];
    if (sampler) {
      example = sampler(schema, options, spec, context);
    }
  }
  (0, _utils.popSchemaStack)(seenSchemasStack, context);
  return {
    value: example,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
    type: type
  };
  function traverseOneOrAnyOf(schema, selectedSubSchema) {
    const inferred = tryInferExample(schema);
    if (inferred !== undefined) {
      return inferred;
    }
    const localExample = traverse(_objectSpread(_objectSpread({}, schema), {}, {
      oneOf: undefined,
      anyOf: undefined
    }), options, spec, context);
    const subSchemaExample = traverse(selectedSubSchema, options, spec, context);
    if (typeof localExample.value === 'object' && typeof subSchemaExample.value === 'object') {
      const mergedExample = (0, _utils.mergeDeep)(localExample.value, subSchemaExample.value);
      return _objectSpread(_objectSpread({}, subSchemaExample), {}, {
        value: mergedExample
      });
    }
    return subSchemaExample;
  }
}

},{"./allOf":4,"./infer":5,"./openapi-sampler":6,"./utils":15,"json-pointer":3}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SKIP_SYMBOL = void 0;
exports.applyXMLAttributes = applyXMLAttributes;
exports.ensureMinLength = ensureMinLength;
exports.getResultForCircular = getResultForCircular;
exports.getXMLAttributes = getXMLAttributes;
exports.mergeDeep = mergeDeep;
exports.popSchemaStack = popSchemaStack;
exports.toRFCDateTime = toRFCDateTime;
exports.uuid = uuid;
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const SKIP_SYMBOL = exports.SKIP_SYMBOL = Symbol('skip');
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}
function toRFCDateTime(date, omitTime, omitDate, milliseconds) {
  var res = omitDate ? '' : date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
  if (!omitTime) {
    res += 'T' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + (milliseconds ? '.' + (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) : '') + 'Z';
  }
  return res;
}
;
function ensureMinLength(sample, min) {
  if (min > sample.length) {
    return sample.repeat(Math.trunc(min / sample.length) + 1).substring(0, min);
  }
  return sample;
}
function mergeDeep() {
  const isObject = obj => obj && typeof obj === 'object';
  for (var _len = arguments.length, objects = new Array(_len), _key = 0; _key < _len; _key++) {
    objects[_key] = arguments[_key];
  }
  return objects.reduce((prev, obj) => {
    Object.keys(obj || {}).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];
      if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });
    return prev;
  }, Array.isArray(objects[objects.length - 1]) ? [] : {});
}

// deterministic UUID sampler

function uuid(str) {
  var hash = hashCode(str);
  var random = jsf32(hash, hash, hash, hash);
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    var r = random() * 16 % 16 | 0;
    return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
  });
  return uuid;
}
function getResultForCircular(type) {
  return {
    value: type === 'object' ? {} : type === 'array' ? [] : undefined
  };
}
function popSchemaStack(seenSchemasStack, context) {
  if (context) seenSchemasStack.pop();
}
function getXMLAttributes(schema) {
  var _schema$xml, _schema$xml2, _schema$xml3, _schema$xml$attribute, _schema$xml4, _schema$xml$wrapped, _schema$xml5;
  return {
    name: (schema === null || schema === void 0 || (_schema$xml = schema.xml) === null || _schema$xml === void 0 ? void 0 : _schema$xml.name) || '',
    prefix: (schema === null || schema === void 0 || (_schema$xml2 = schema.xml) === null || _schema$xml2 === void 0 ? void 0 : _schema$xml2.prefix) || '',
    namespace: (schema === null || schema === void 0 || (_schema$xml3 = schema.xml) === null || _schema$xml3 === void 0 ? void 0 : _schema$xml3.namespace) || null,
    attribute: (_schema$xml$attribute = schema === null || schema === void 0 || (_schema$xml4 = schema.xml) === null || _schema$xml4 === void 0 ? void 0 : _schema$xml4.attribute) !== null && _schema$xml$attribute !== void 0 ? _schema$xml$attribute : false,
    wrapped: (_schema$xml$wrapped = schema === null || schema === void 0 || (_schema$xml5 = schema.xml) === null || _schema$xml5 === void 0 ? void 0 : _schema$xml5.wrapped) !== null && _schema$xml$wrapped !== void 0 ? _schema$xml$wrapped : false
  };
}
function resolveNodeType(schema) {
  const xml = schema === null || schema === void 0 ? void 0 : schema.xml;
  if (xml !== null && xml !== void 0 && xml.nodeType) {
    return xml.nodeType;
  }
  if ((xml === null || xml === void 0 ? void 0 : xml.attribute) === true) {
    return 'attribute';
  }
  if ((xml === null || xml === void 0 ? void 0 : xml.wrapped) === true && (schema === null || schema === void 0 ? void 0 : schema.type) === 'array') {
    return 'element';
  }
  if (schema !== null && schema !== void 0 && schema.$ref || schema !== null && schema !== void 0 && schema.$dynamicRef || (schema === null || schema === void 0 ? void 0 : schema.type) === 'array') {
    return 'none';
  }
  if (schema !== null && schema !== void 0 && schema.oneOf || schema !== null && schema !== void 0 && schema.anyOf || schema !== null && schema !== void 0 && schema.allOf) {
    return 'none';
  }
  return 'element';
}
function applyXMLAttributes(result) {
  let schema = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const {
    value: oldValue
  } = result;
  const {
    propertyName: oldPropertyName
  } = context;
  const {
    name,
    prefix,
    namespace
  } = getXMLAttributes(schema);
  const effectiveNodeType = resolveNodeType(schema);
  let propertyName = name || oldPropertyName ? "".concat(prefix ? prefix + ':' : '').concat(name || oldPropertyName) : null;
  let value = typeof oldValue === 'object' ? Array.isArray(oldValue) ? [...oldValue] : _objectSpread({}, oldValue) : oldValue;
  switch (effectiveNodeType) {
    case 'attribute':
      if (propertyName) {
        propertyName = "$".concat(propertyName);
      }
      break;
    case 'text':
      propertyName = '#text';
      break;
    case 'cdata':
      propertyName = '#cdata';
      break;
    case 'none':
      if (schema.type === 'array') {
        propertyName = null;
        if (schema.example !== undefined) {
          var _schema$items;
          propertyName = ((_schema$items = schema.items) === null || _schema$items === void 0 || (_schema$items = _schema$items.xml) === null || _schema$items === void 0 ? void 0 : _schema$items.name) || propertyName;
        }
      } else {
        propertyName = null;
      }
      break;
    default:
      if (schema.type === 'array') {
        if (Array.isArray(value)) {
          value = {
            [propertyName]: [...value]
          };
        }
      }
      break;
  }
  if (namespace && effectiveNodeType !== 'text' && effectiveNodeType !== 'cdata' && effectiveNodeType !== 'none') {
    if (typeof value === 'object') {
      value["$xmlns".concat(prefix ? ':' + prefix : '')] = namespace;
    } else {
      value = {
        ["$xmlns".concat(prefix ? ':' + prefix : '')]: namespace,
        ['#text']: value
      };
    }
  }
  return {
    propertyName,
    value
  };
}
function hashCode(str) {
  var hash = 0;
  if (str.length == 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
function jsf32(a, b, c, d) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    var t = a - (b << 27 | b >>> 5) | 0;
    a = b ^ (c << 17 | c >>> 15);
    b = c + d | 0;
    c = d + t | 0;
    d = a + t | 0;
    return (d >>> 0) / 4294967296;
  };
}

},{}]},{},[6])(6)
});
