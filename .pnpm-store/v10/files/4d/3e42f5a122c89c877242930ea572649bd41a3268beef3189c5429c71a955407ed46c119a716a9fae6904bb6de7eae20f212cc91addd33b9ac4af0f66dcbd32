// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const errors = require("../../errors.js");


/**
  * Constant which implies that the VALUE has not been set to ATOM or LIST.
*/
const RHS_NONE = 0;
/**
  * Constant which implies that the VALUE of an NVPair is an ATOM.
*/
const  RHS_ATOM = 1;
/**
  * Constant which indicates that the VALUE of an NVPair is a list of NVPairs.
*/
const RHS_LIST = 2;
/**
  * The List is in a regular format, i.e. (Name = Value) or (Name =
  * (Name = Value)), and so on ..
*/
const LIST_REGULAR = 3;
/**
  * The List is comma separated and looks like ( Name = Value, Value, Value )
*/
const LIST_COMMASEP = 4;

/**
 * An NVPair, or Name-Value Pair, is the structure used by SQL*Net to store
 * address information. An example of an NV-Pair is:
 *
 * CID = (ADDRESS = (PROTOCOL = TCP)(HOST = XYZ)(PORT = 1521))
 *
 * Here is a (brief) description of the syntax:
 *
 *  NVPair -> ( name = value ) value = atom | NVList
*/

class NVPair {
  constructor(name) {
    this.name = name;
    this.listType = LIST_REGULAR;
    this.rhsType = RHS_NONE;
  }
  /**
   * @param {string} atom - input atom string literal
   */
  set setAtom(atom) {
    if (this._containsComment(atom)) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    this.rhsType = RHS_ATOM;
    this.list = null;
    this.atom = atom;
  }
  /**
    * Checks if the input string contains comment.
    * @param {string} str - input string
    * @returns {boolean}
    */
  _containsComment(str) {
    for (let i = 0; i < str.length; i++) {
      if (str.charAt(i) == '#') {
        if (i != 0) {
          // Check if this character is escaped
          if (str.charAt(i - 1) == '\\')
            continue;
          else
            return true;
        } else {
          // Entire line is a comment
          return true;
        }
      }
    }
    return false;
  }

  /**
     * gets the size of the list.
     * @returns {integer}
     */
  getListSize() {
    if (this.list == null)
      return 0;
    else
      return this.list.length;
  }
  /**
     * gets the element at a given position in the list.
     * @param {integer} pos
     * @returns {string}
     */
  getListElement(pos) {
    if (this.list == null)
      return null;
    else
      return this.list[pos];
  }
  /**
     * adds a nvpair to the existing one.
     * @param {NVPair} pair
     */
  addListElement(pair) {
    if (this.list == null) {
      this.rhsType = RHS_LIST;
      this.list = new Array();
      this.atom = null;
    }
    this.list.push(pair);
    pair.parent = this;
  }
  /**
     * removes an element at a given position.
     * @param {integer} pos
     */
  removeListElement(pos) {
    if (this.list != null) {
      this.list.splice(pos, 1);
      if (this.getListSize == 0) {
        this.list = null;
        this.rhsType = RHS_NONE;
      }
    }
  }
  /**
    * Returns an empty string with the number specified in the argument. Used
    * for indentation of multi-level NVPairs as they are stored
    *
    * @param count
    *          Number of spaces required in the blank string.
    */
  _space(count) {
    var blank_str = "";
    for (let i = 0;i < count;i++) {
      blank_str += " ";
    }
    return blank_str;
  }

  /**
  * Returns the value of an NVPair (and all child NVPairs) as a readable
  * String.
    */
  valueToString() {
    let out = "";
    if (this.rhsType == RHS_ATOM) {
      out = out + this.atom;
    } else if (this.rhsType == RHS_LIST) {
      if (this.listType == LIST_REGULAR) {
        for (let i = 0; i < this.getListSize(); i++) {
          out = out + this.getListElement(i).toString();
        }
      } else if (this.listType == LIST_COMMASEP) {
        for (let i = 0; i < this.getListSize(); i++) {
          const listElem = this.getListElement(i);
          out = out + listElem.name;
          if (i != this.getListSize() - 1)
            out = out + ", ";
        }
      }
    }
    return out;
  }

  /**
    *
    * @returns string representation of the nvpair
    */
  toString() {
    let out = "(" + this.name + "=";
    if (this.rhsType == RHS_ATOM) {
      out = out + this.atom;
    } else if (this.rhsType == RHS_LIST) {
      if (this.listType == LIST_REGULAR) {
        for (let i = 0; i < this.getListSize(); i++) {
          out = out + this.getListElement(i).toString();
        }
      } else if (this.listType == LIST_COMMASEP) {
        out = out + " (";
        for (let i = 0; i < this.getListSize(); i++) {
          const listElem = this.getListElement(i);
          out = out + listElem.name;

          if (i != this.getListSize() - 1)
            out = out + ", ";
        }
        out = out + ")";
      }
    }
    out = out + ")";
    return out;
  }


}
/**
   * Constant which indicates that there are no more tokens left.
   */
const  TKN_NONE = 0;

/**
   * Constant for left parenthesis '(' token.
   */
const TKN_LPAREN = 1;

/**
   * Constant for right parenthesis ')' token.
   */
const TKN_RPAREN = 2;

/**
   * Constant for comma token ',' token.
   */
const TKN_COMMA = 3;

/**
   * Constant for equal sign '=' token.
   */
const TKN_EQUAL = 4;

/**
   * Constant for literal token.
   */
const TKN_LITERAL = 8;

/**
   * Constant marking end of NVString.
   */
const TKN_EOS = 9;

/*
   * Characters used for comparison for tokens. When the analyzer hits and
   * unescaped TKN_LPAREN_VALUE it interprets it as a TKN_LPAREN token.
   */
const TKN_LPAREN_VALUE = '(';
const TKN_RPAREN_VALUE = ')';
const TKN_COMMA_VALUE = ',';
const TKN_EQUAL_VALUE = '=';
const TKN_BKSLASH_VALUE = '\\';
const TKN_DQUOTE_VALUE = "\"";
const TKN_SQUOTE_VALUE = '\'';
const TKN_EOS_VALUE = '%';

/*
   * Characters which are considered whitespace.
   */
const TKN_SPC_VALUE = ' ';
const TKN_TAB_VALUE = '\t';
const TKN_LF_VALUE = '\n';
const TKN_CR_VALUE = '\r';

/**
 * The NVTokens class is used to help break NVStrings apart into tokens, such
 * as TKN_LPAREN or TKN_LITERAL - this helps simplify the task of building
 * NVPairs from an NVString.
*/
class NVTokens {


  /**
   * Constructs NVTokens object for use.
   */
  constructor() {
    this.tkType = null;
    this.tkValue = null;
    this.numTokens = 0;
    this.tkPos = 0;
  }

  /*
   * function to determine if a given character is whitespace. The
   * following constitute whitespace: ' ' (SPACE), '\t' (TAB), '\n' (NEWLINE),
   * '\r' (LINEFEED),
   */
  _isWhiteSpace(it) {
    if ((it == TKN_SPC_VALUE) || (it == TKN_TAB_VALUE) || (it == TKN_LF_VALUE)
        || (it == TKN_CR_VALUE)) {
      return true;
    }
    return false;
  }

  /*
   * function to trim leading and trailing spaces from a literal.
   */
  _trimWhiteSpace(it) {
    const length = it.length;
    let start = 0;
    let end = length;

    // Find first non-whitespace character
    while ((start < length) && (this._isWhiteSpace(it.charAt(start)))) {
      start++;
    }
    // From the back, find last non-whitespace character
    while ((start < end) && (this._isWhiteSpace(it.charAt(end - 1)))) {
      end--;
    }
    return it.substring(start, end);
  }

  /**
   * Parses an NVString into a list of tokens which can be more easily
   * interpreted. The list of tokens is stored within the class and must be
   * accessed through getToken()/getLiteral() and eatToken().
   *
   * @param nvString
   *          NVString to be parsed.
   */
  parseTokens(nvString) {
    this.numTokens = 0;
    this.tkPos = 0;
    this.tkType = new Array();
    this.tkValue = new Array();

    const len = nvString.length;
    let eql_seen = false;
    // convert NVString to character array for easier access
    let input = new Array();
    input = Array.from(nvString);
    let pos = 0; // position in NVString

    while (pos < len) {
      // eat leading whitespace
      while ((pos < len) && (this._isWhiteSpace(input[pos]))) {
        pos++;
      }
      if (pos < len) {
        switch (input[pos]) {
        // For metacharacters (, ), and =, add to the token list, and
        // advance the NVString position. (Save token, eat character)
          case TKN_LPAREN_VALUE:
            eql_seen = false;
            this._addToken(TKN_LPAREN, TKN_LPAREN_VALUE);
            pos++;
            break;

          case TKN_EQUAL_VALUE:
            eql_seen = true;
            this._addToken(TKN_EQUAL, TKN_EQUAL_VALUE);
            pos++;
            break;

          case TKN_RPAREN_VALUE:
            eql_seen = false;
            this._addToken(TKN_RPAREN, TKN_RPAREN_VALUE);
            pos++;
            break;
          case TKN_COMMA_VALUE:
            eql_seen = false;
            this._addToken(TKN_COMMA, TKN_COMMA_VALUE);
            pos++;
            break;

          default: // Otherwise, treat it as a literal
          {
            let startPos = pos;
            let endPos = -1; // substring position in input
            let quoted_str = false; // is literal wrapped with quotes?
            let quote_char = TKN_DQUOTE_VALUE;

            // does it begin with a single or double quote?
            if ((input[pos] == TKN_SQUOTE_VALUE)
              || (input[pos] == TKN_DQUOTE_VALUE)) {
              quoted_str = true;
              quote_char = input[pos];
              pos++;
              startPos = pos;
            }

            while (pos < len) {
            // On a backslash (escaped character), save the backslash and
            // following character into the literal.
              if (input[pos] == TKN_BKSLASH_VALUE) {
                pos += 2;
                continue;
              }

              if (quoted_str) { // literal wrapped with quotes
                if (input[pos] == quote_char) {// quote terminator found
                  pos++;
                  endPos = pos - 1; // exclusive
                  break;
                }
              } else { // did we hit unescaped meta character ( ) or =
                if ((input[pos] == TKN_LPAREN_VALUE)
                  || (input[pos] == TKN_RPAREN_VALUE)
                  || ((input[pos] == TKN_COMMA_VALUE) && !eql_seen)
                  || ((input[pos] == TKN_EQUAL_VALUE) && !eql_seen)) {
                // terminate string - do NOT increment POS, or it will
                // swallow the metacharacter into the literal
                  endPos = pos; // exclusive
                  break;
                }
              }
              pos++; // accept character into literal
            }

            if (endPos == -1) { // reached end of NVString without terminator
              endPos = pos; // exclusive
            }
            this._addToken(TKN_LITERAL,
              nvString.substring(startPos, endPos).trim());
            break;
          }
        }
      }
    }
    // Add TKN_EOS as the last token in token list.
    this._addToken(TKN_EOS, TKN_EOS_VALUE);
    return true;
  }
  /**
   * Returns current token. Throws Error if no string has been parsed,
   * or if there are no tokens left. Does NOT advance the token position.
   */
  getToken() {
    if (this.tkType == null) { // nothing parsed
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    if (this.tkPos < this.numTokens) {// are there tokens left?
      return Number(this.tkType[this.tkPos]);
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
  }

  /**
   * Returns current token. Throws Error if no string has been parsed,
   * or if there are no tokens left. DOES advance the token position.
   */
  popToken() {
    let token = TKN_NONE;

    if (this.tkType == null) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    if (this.tkPos < this.numTokens) { // if parsed and tokens left
      token = Number(this.tkType[this.tkPos++]);
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    return token;
  }
  /**
   * Returns literal for current token. If current token is NOT a TKN_LITERAL,
   * it returns a string representation of the current token. Throws Error
   * if no string has been parsed, or if there are no tokens left.
   *
   * DOES NOT advance the token position.
   */
  getLiteral() {
    let theLiteral = null;
    if (this.tkValue == null) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    // If we have parsed an NV string AND we have tokens left
    if (this.tkPos < this.numTokens) {
      theLiteral = String(this.tkValue[this.tkPos]);
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    return theLiteral;
  }

  /**
   * Returns literal for current token. If current token is NOT a TKN_LITERAL,
   * it returns a string representation of the current token. Throws Error
   * if no string has been parsed, or if there are no tokens left.
   *
   * DOES advance the token position.
   */
  popLiteral() {
    let theLiteral = null;

    if (this.tkValue == null) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    // If we have parsed an NV string AND we have tokens left.
    if (this.tkPos < this.numTokens) {
      theLiteral = String(this.tkValue[this.tkPos++]);
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
    }
    return theLiteral;
  }

  /**
   * Advances the token position by one.
   */
  eatToken() {
    if (this.tkPos < this.numTokens) {
      this.tkPos++;
    }
  }

  /**
   * Returns NVTokens list as a readable String.
   */
  toString() {
    if (this.tkType == null) {
      return "*NO TOKENS*";
    }
    let out = "Tokens";
    for (let i = 0; i < this.numTokens; i++) {
      out = out + " : " + this.tkValue[i];
    }
    return out;
  }
  /*
   * function to add a token and corresponding printable version (i.e.,
   * TKN_LPAREN and TKN_LPAREN_VALUE) into the token list.
   */
  _addToken(tk, tk_val) {
    this.tkType.push(Number(tk));
    this.tkValue.push(String(tk_val));
    this.numTokens++;
  }
}


/**
 * The NVFactory class is used to help interpret the tokens generated by
 * NVTokens from an NVString.
 */


/**
  * Returns an NVPair which contains the broken-down form of nvString
  * @param  nvString  the nvString to parse
  */
function createNVPair(nvString) {
  const nvt = new NVTokens();
  nvt.parseTokens(nvString);
  return readTopLevelNVPair(nvt);
}

/*
  * function which returns a top-level NVPair from NVTokens.
  * NVPair: (name=value)
  * value: atom | NVList
  */
function readTopLevelNVPair(nvt) {
  //check for opening (
  let tk = nvt.getToken();
  nvt.eatToken();
  if (tk != TKN_LPAREN) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }

  let name = readNVLiteral(nvt);
  const nvp = new NVPair(name);

  if ((tk = nvt.getToken()) == TKN_COMMA) {
    // read comma'ed names as one name
    while (tk == TKN_LITERAL || tk == TKN_COMMA) {
      name += nvt.popLiteral();
      tk = nvt.getToken();
    }
    nvp.name = name;

    return readRightHandSide(nvp, nvt);
  }

  return readRightHandSide(nvp, nvt);
}
/*
 * function which returns the next NVPair from NVTokens.
 *   NVPair: (name=value) | (name, | ,name) | ,name,
 *   value: atom | NVList
 */
function readNVPair(nvt) {
  // Opening ( or , for NVPair
  const tk = nvt.getToken();
  nvt.eatToken();
  if (!((tk == TKN_LPAREN) || (tk == TKN_COMMA))) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }

  const name = readNVLiteral(nvt);
  const nvp = new NVPair(name);

  return readRightHandSide(nvp, nvt);
}

/*
* function which reads rhs and returns NVPair from NVTokens.
 * NVPair: (name=value)
 * value: atom | NVList
*/
function readRightHandSide(nvp, nvt) {
  let tk = nvt.getToken();
  switch (tk) {
    case TKN_EQUAL:
      nvt.eatToken();

      // If the next token after "=" is a LITERAL, then read an atom,
      // otherwise read an NVList.
      tk = nvt.getToken();
      if (tk == TKN_LITERAL) {
        const value = readNVLiteral(nvt);
        nvp.setAtom = value;
      } else {
        // NVList is responsible for adding child NVPairs to this parent
        // NVPair.
        readNVList(nvt, nvp);
      }
      break;

    case TKN_COMMA:
    case TKN_RPAREN:

      // If we get a "comma" or ")", then we need to parse a list of values.
      // eg, "(x=(value1, value2,...))" or "(x=(value))"
      nvp.setAtom = nvp.name;
      break;

    default:
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }

  // terminating ")" or "," for NVPair
  tk = nvt.getToken();
  if (tk == TKN_RPAREN) {
    nvt.eatToken();
  } else if (tk != TKN_COMMA) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }

  return nvp;
}
/*
 * function which returns the next literal from NVTokens.
 */
function readNVLiteral(nvt) {
  const tk = nvt.getToken();
  if (tk != TKN_LITERAL) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_SYNTAX);
  }
  return nvt.popLiteral();
}

/*
 * function which adds a list of NVPairs to a parent NVPair.
 *   NVList:  NVPair NVList | epsilon
 */
function readNVList(nvt, parent) {
  // if next token is "(" or ",", then read an NVPair
  // otherwise, assume epsilon
  const tk = nvt.getToken();
  if (!(tk == TKN_LPAREN || tk == TKN_COMMA)) {
    return; // didn't read an nvpair
  }

  const child = readNVPair(nvt);

  // read a good NVPair
  parent.addListElement(child);
  if ((tk == TKN_COMMA) || (child.name == child.atom)) {
    if (parent.getListType != LIST_COMMASEP) // if not already set
      parent.setListType = LIST_COMMASEP;    // set it
  }

  readNVList(nvt, parent);  // next iteration of NVList()
}

/**
  * Returns a NVPair whose name matches (ignoring case) the specified
  * name.  This function does search recursively through all descendants
  * of the specified NVPair.
  * @param  nvp  NVPair to search through
  * @param  name  name to match (ignoring case)
  */
function findNVPairRecurse(nvp, name) {
  /* Is the base NV Pair the name we are looking for?                    */
  if (!nvp) {
    return null;
  }
  if ((name.toUpperCase() == (nvp.name).toUpperCase()))
    return nvp;

  /* Do we have anywhere else to search (ie, is nvp a list)?               */
  if (nvp.getRHSType == RHS_ATOM)
    return null;

  /* Loop thru the list of children and searching each child for name.     */
  for (let i = 0; i < nvp.getListSize(); i++) {
    const child = findNVPairRecurse(nvp.getListElement(i), name);

    /* Did we find "name"?                                                 */
    if (child !== null)
      return child;
  }

  return null;
}

/**
  * Returns a NVPair whose name matches (ignoring case) the specified name.
  * This functions only searches the direct descendants of specified NVPair
  * @param  nvp  NVPair to search through
  * @param  name  name to match (ignoring case)
  */
function findNVPair(nvp, name) {
  if (!nvp) {
    return null;
  }

  /* Do we have anywhere else to search (ie, is nvp a list)?               */
  if (nvp.getRHSType == RHS_ATOM)
    return null;

  /* Loop thru the list of children and searching each child for name.     */
  for (let i = 0; i < nvp.getListSize(); i++) {
    const child = nvp.getListElement(i);
    if (name.toUpperCase() == (child.name).toUpperCase())
      return child;
  }
  return null;
}

/**
  * Returns a value which matches the specified path
  * @param  nvp  NVPair to search through
  * @param  name  array of names to match (ignoring case)
  */
function findValue(nvp, names) {
  if (!nvp) {
    return null;
  }

  /* Is the base NV Pair the first name in path */
  if ((names[0].toUpperCase() != (nvp.name).toUpperCase()))
    return null;

  let output = nvp;
  const sze = names.length;

  for (let i = 1; i < sze; i++) {
    output = findNVPair(output, names[i]);
    if (!output)
      return null;
  }
  if (output.atom == null) {
    if (output.list == null)
      return null;
    else
      return (output.list).toString();
  } else {
    return (output.atom).toString();
  }
}
module.exports = {findNVPairRecurse, createNVPair, findNVPair, findValue};
