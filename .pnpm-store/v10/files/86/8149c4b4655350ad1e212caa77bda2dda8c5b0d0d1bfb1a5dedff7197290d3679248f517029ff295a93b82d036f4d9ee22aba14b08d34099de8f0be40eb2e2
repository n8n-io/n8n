"use strict";

import { tokenTypes, Token, ParsedToken, preced } from "./token";
import Mexp from "./index";
function inc(arr: number[], val: number) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] += val;
  }
  return arr;
}

type Allowed = { [key in tokenTypes]?: true };
var type0: Allowed = {
  0: true,
  1: true,
  3: true,
  4: true,
  6: true,
  8: true,
  9: true,
  12: true,
  13: true,
  14: true,
}; // type2:true,type4:true,type9:true,type11:true,type21:true,type22
var type1: Allowed = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
  9: true,
  10: true,
  11: true,
  12: true,
  13: true,
}; // type3:true,type5:true,type7:true,type23
var type1Asterick: Allowed = {
  0: true,
  3: true,
  4: true,
  8: true,
  12: true,
  13: true,
};
var empty: Allowed = {};
var type3Asterick: Allowed = {
  0: true,
  1: true,
  3: true,
  4: true,
  6: true,
  8: true,
  12: true,
  13: true,
}; // type_5:true,type_7:true,type_23
var type6: Allowed = {
  1: true,
};
var newAr = [
  [],
  [
    "1",
    "2",
    "3",
    "7",
    "8",
    "9",
    "4",
    "5",
    "6",
    "+",
    "-",
    "*",
    "/",
    "(",
    ")",
    "^",
    "!",
    "P",
    "C",
    "e",
    "0",
    ".",
    ",",
    "n",
    " ",
    "&",
  ],
  ["pi", "ln", "Pi"],
  ["sin", "cos", "tan", "Del", "int", "Mod", "log", "pow"],
  ["asin", "acos", "atan", "cosh", "root", "tanh", "sinh"],
  ["acosh", "atanh", "asinh", "Sigma"],
];

function match(str1: string, str2: string, i: number, x: number) {
  for (var f = 0; f < x; f++) {
    if (str1[i + f] !== str2[f]) {
      return false;
    }
  }
  return true;
}
/**
  
	0 : function with syntax function_name(Maths_exp)
	1 : numbers
	2 : binary operators like * / Mod left associate and same precedence
	3 : Math constant values like e,pi,Cruncher ans
	4 : opening bracket
	5 : closing bracket
	6 : decimal
	7 : function with syntax (Math_exp)function_name
	8: function with syntax function_name(Math_exp1,Math_exp2)
	9 : binary operator like +,-
	10: binary operator like P C or ^
	11: ,
	12: function with , seperated three parameters and third parameter is a string that will be mexp string
	13: variable of Sigma function
 */

export function addToken(this: Mexp, newTokens: Token[]) {
  for (var i = 0; i < newTokens.length; i++) {
    var x = newTokens[i].token.length;
    var temp = -1;
    if (
      newTokens[i].type === tokenTypes.FUNCTION_WITH_N_ARGS &&
      newTokens[i].numberOfArguments === undefined
    ) {
      newTokens[i].numberOfArguments = 2;
    }

    // newAr is a specially designed data structure index of 1d array = length of tokens
    newAr[x] = newAr[x] || [];
    for (var y = 0; y < newAr[x].length; y++) {
      if (newTokens[i].token === newAr[x][y]) {
        temp = indexOfToken(newAr[x][y], this.tokens);
        break;
      }
    }
    if (temp === -1) {
      this.tokens.push(newTokens[i]);
      newTokens[i].precedence = preced[newTokens[i].type];
      if (newAr.length <= newTokens[i].token.length) {
        newAr[newTokens[i].token.length] = [];
      }
      newAr[newTokens[i].token.length].push(newTokens[i].token);
    } else {
      // overwrite
      this.tokens[temp] = newTokens[i];
      newTokens[i].precedence = preced[newTokens[i].type];
    }
  }
}
function indexOfToken(key: string, tokens: Token[]) {
  for (var search = 0; search < tokens.length; search++) {
    if (tokens[search].token === key) return search;
  }
  return -1;
}
function tokenize(mexp: Mexp, string: string) {
  var nodes = [];
  var length = string.length;
  var key, x, y;
  for (var i = 0; i < length; i++) {
    if (i < length - 1 && string[i] === " " && string[i + 1] === " ") {
      continue;
    }
    key = "";
    for (
      x =
        string.length - i > newAr.length - 2
          ? newAr.length - 1
          : string.length - i;
      x > 0;
      x--
    ) {
      if (newAr[x] === undefined) continue;
      for (y = 0; y < newAr[x].length; y++) {
        if (match(string, newAr[x][y], i, x)) {
          key = newAr[x][y];
          y = newAr[x].length;
          x = 0;
        }
      }
    }
    i += key.length - 1;
    if (key === "") {
      throw new Error("Can't understand after " + string.slice(i));
    }
    nodes.push(mexp.tokens[indexOfToken(key, mexp.tokens)]);
  }
  return nodes;
}
export const lex = function (this: Mexp, inp: string, tokens?: Token[]) {
  "use strict";
  var changeSignObj: ParsedToken = {
    value: this.math.changeSign,
    type: tokenTypes.FUNCTION_WITH_ONE_ARG,
    precedence: 4,
    show: "-",
  };
  var closingParObj: ParsedToken = {
    value: ")",
    show: ")",
    type: tokenTypes.CLOSING_PARENTHESIS,
    precedence: 0,
  };
  var openingParObj: ParsedToken = {
    value: "(",
    type: tokenTypes.OPENING_PARENTHESIS,
    precedence: 0,
    show: "(",
  };

  var str = [openingParObj];

  var ptc = []; // Parenthesis to close at the beginning is after one token
  var inpStr = inp;
  var allowed = type0;
  var bracToClose = 0;
  var asterick = empty;
  var prevKey = "";
  var i;
  if (typeof tokens !== "undefined") {
    this.addToken(tokens);
  }
  var nodes = tokenize(this, inpStr);
  for (i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (node.type === 14) {
      if (
        i > 0 &&
        i < nodes.length - 1 &&
        nodes[i + 1].type === 1 &&
        (nodes[i - 1].type === 1 || nodes[i - 1].type === 6)
      ) {
        throw new Error("Unexpected Space");
      }
      continue;
    }
    var cToken = node.token;
    var cType = node.type;
    var cEv = node.value;
    var cPre = node.precedence;
    var cShow = node.show;
    var pre = str[str.length - 1];
    var j;
    for (j = ptc.length; j--; ) {
      // loop over ptc
      if (ptc[j] === 0) {
        if (
          [
            tokenTypes.FUNCTION_WITH_ONE_ARG,
            tokenTypes.BINARY_OPERATOR_HIGH_PRECENDENCE,
            tokenTypes.CONSTANT,
            tokenTypes.OPENING_PARENTHESIS,
            tokenTypes.CLOSING_PARENTHESIS,
            tokenTypes.BINARY_OPERATOR_LOW_PRECENDENCE,
            tokenTypes.BINARY_OPERATOR_PERMUTATION,
            tokenTypes.COMMA,
            tokenTypes.EVALUATED_FUNCTION,
            tokenTypes.EVALUATED_FUNCTION_PARAMETER,
          ].indexOf(cType) !== -1
        ) {
          if (allowed[cType] !== true) {
            throw new Error(cToken + " is not allowed after " + prevKey);
          }
          str.push(closingParObj);
          allowed = type1;
          asterick = type3Asterick;
          ptc.pop();
        }
      } else break;
    }
    if (allowed[cType] !== true) {
      throw new Error(cToken + " is not allowed after " + prevKey);
    }
    if (asterick[cType] === true) {
      cType = tokenTypes.BINARY_OPERATOR_HIGH_PRECENDENCE;
      cEv = this.math.mul;
      cShow = "&times;";
      cPre = 3;
      i = i - 1;
    }
    const obj = {
      value: cEv,
      type: cType,
      precedence: cPre,
      show: cShow,
      numberOfArguments: node.numberOfArguments,
    };
    if (cType === tokenTypes.FUNCTION_WITH_ONE_ARG) {
      allowed = type0;
      asterick = empty;
      inc(ptc, 1);
      str.push(obj);
      if (nodes[i + 1].type !== tokenTypes.OPENING_PARENTHESIS) {
        str.push(openingParObj);
        ptc.push(2);
      }
      // bracToClose++
    } else if (cType === tokenTypes.NUMBER) {
      // console.log("wow", ptc, cEv, pre)
      if (pre.type === tokenTypes.NUMBER) {
        pre.value += cEv;
        inc(ptc, 1);
      } else {
        str.push(obj);
      }
      allowed = type1;
      asterick = type1Asterick;
    } else if (cType === tokenTypes.BINARY_OPERATOR_HIGH_PRECENDENCE) {
      allowed = type0;
      asterick = empty;
      inc(ptc, 2);
      str.push(obj);
    } else if (cType === tokenTypes.CONSTANT) {
      // constant
      str.push(obj);
      allowed = type1;
      asterick = type3Asterick;
    } else if (cType === tokenTypes.OPENING_PARENTHESIS) {
      inc(ptc, 1);
      bracToClose++;
      allowed = type0;
      asterick = empty;
      str.push(obj);
    } else if (cType === tokenTypes.CLOSING_PARENTHESIS) {
      if (!bracToClose) {
        throw new Error(
          "Closing parenthesis are more than opening one, wait What!!!"
        );
      }
      bracToClose--;
      allowed = type1;
      asterick = type3Asterick;
      str.push(obj);
      inc(ptc, 1);
    } else if (cType === tokenTypes.DECIMAL) {
      if (pre.hasDec) {
        throw new Error("Two decimals are not allowed in one number");
      }
      if (pre.type !== tokenTypes.NUMBER) {
        pre = {
          show: "0",
          value: 0,
          type: tokenTypes.NUMBER,
          precedence: 0,
        }; // pre needs to be changed as it will the last value now to be safe in later code
        str.push(pre);
        inc(ptc, -1)
      }
      allowed = type6;
      inc(ptc, 1);
      asterick = empty;
      pre.value += cEv;
      pre.hasDec = true;
    } else if (cType === tokenTypes.POSTFIX_FUNCTION_WITH_ONE_ARG) {
      allowed = type1;
      asterick = type3Asterick;
      inc(ptc, 1);
      str.push(obj);
    }
    if (cType === tokenTypes.FUNCTION_WITH_N_ARGS) {
      allowed = type0;
      asterick = empty;
      // @ts-ignore
      inc(ptc, node.numberOfArguments + 2);
      str.push(obj);
      if (nodes[i + 1].type !== tokenTypes.OPENING_PARENTHESIS) {
        str.push(openingParObj);
        // @ts-ignore
        ptc.push(node.numberOfArguments + 2);
      }
    } else if (cType === tokenTypes.BINARY_OPERATOR_LOW_PRECENDENCE) {
      if (pre.type === tokenTypes.BINARY_OPERATOR_LOW_PRECENDENCE) {
        if (pre.value === this.math.add) {
          pre.value = cEv;
          pre.show = cShow;
          inc(ptc, 1);
        } else if (pre.value === this.math.sub && cShow === "-") {
          pre.value = this.math.add;
          pre.show = "+";
          inc(ptc, 1);
        }
      } else if (
        pre.type !== tokenTypes.CLOSING_PARENTHESIS &&
        pre.type !== tokenTypes.POSTFIX_FUNCTION_WITH_ONE_ARG &&
        pre.type !== tokenTypes.NUMBER &&
        pre.type !== tokenTypes.CONSTANT &&
        pre.type !== tokenTypes.EVALUATED_FUNCTION_PARAMETER
      ) {
        // changesign only when negative is found
        if (cToken === "-") {
          // do nothing for + token
          // don't add with the above if statement as that will run the else statement of parent if on Ctoken +
          allowed = type0;
          asterick = empty;
          inc(ptc, 1);
          ptc.push(2);
          str.push(changeSignObj);
          str.push(openingParObj);
        }
      } else {
        str.push(obj);
        inc(ptc, 2);
      }
      allowed = type0;
      asterick = empty;
    } else if (cType === tokenTypes.BINARY_OPERATOR_PERMUTATION) {
      allowed = type0;
      asterick = empty;
      inc(ptc, 2);
      str.push(obj);
    } else if (cType === tokenTypes.COMMA) {
      allowed = type0;
      asterick = empty;
      str.push(obj);
    } else if (cType === tokenTypes.EVALUATED_FUNCTION) {
      allowed = type0;
      asterick = empty;
      inc(ptc, 6);
      str.push(obj);
      if (nodes[i + 1].type !== tokenTypes.OPENING_PARENTHESIS) {
        str.push(openingParObj);
        ptc.push(6);
      }
    } else if (cType === tokenTypes.EVALUATED_FUNCTION_PARAMETER) {
      allowed = type1;
      asterick = type3Asterick;
      str.push(obj);
    }

    inc(ptc, -1);
    prevKey = cToken;
    // console.log(cToken, ptc)
  }
  for (j = ptc.length; j--; ) {
    // loop over ptc
    str.push(closingParObj);
  }
  if (allowed[5] !== true) {
    throw new Error("complete the expression");
  }
  while (bracToClose--) {
    str.push(closingParObj);
  }

  str.push(closingParObj);
  // console.log(str)
  return str;
};
