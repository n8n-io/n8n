import { CCError } from "../../utils.js";
import { Word } from "../../shell/Word.js";
import type { Request } from "../../parse.js";

// Wrap in brakets so that splitting keeps the characters to escape
const regexEscape = /(\p{C}|[^ \P{Z}])/gu;
// TODO: do we need to consider that some strings could be used
// with sprintf() and have to have more stuff escaped?
function strToParts(s: string): string[] {
  if (!s) {
    return ["''"];
  }
  const parts = s
    .replace(/'/g, "''")
    .split(regexEscape)
    .filter((x) => x) // empty strings between consecutive matches
    .flatMap((x) => {
      if (x.match(regexEscape)) {
        if (x.length === 1) {
          switch (x) {
            case "\x07":
              return "sprintf('\\a')";
            case "\b":
              return "sprintf('\\b')";
            case "\f":
              return "sprintf('\\f')";
            case "\n":
              return "newline";
            case "\r":
              return "sprintf('\\r')";
            case "\t":
              return "sprintf('\\t')";
            case "\v":
              return "sprintf('\\v')";
            default:
              return `char(${x.charCodeAt(0)})`;
          }
        } else {
          return [`char(${x.charCodeAt(0)})`, `char(${x.charCodeAt(1)})`];
        }
      }
      return "'" + x + "'";
    });
  return parts;
}
function joinParts(parts: string[]): string {
  if (parts.length > 1) {
    return "[" + parts.join(" ") + "]";
  }
  if (parts.length === 0) {
    return "''"; // shouldn't happen
  }
  return parts[0];
}
function reprStr(s: string): string {
  return joinParts(strToParts(s));
}
function repr(w: Word | null) {
  // In context of url parameters, don't accept nulls and such.
  if (w === null || w.length === 0) {
    return "''";
  }

  let parts: string[] = [];
  for (const t of w.tokens) {
    if (typeof t === "string") {
      parts = parts.concat(strToParts(t));
    } else if (t.type === "variable") {
      // https://www.mathworks.com/help/matlab/ref/getenv.html
      parts.push("getenv(" + reprStr(t.value) + ")");
    } else {
      // TODO: is this array access correct?
      // https://www.mathworks.com/help/matlab/ref/system.html
      parts.push("system(" + reprStr(t.value) + "){2}");
    }
  }
  return joinParts(parts);
}

function setVariableValue(
  outputVariable: string | null,
  value: string,
  termination?: string,
): string {
  let result = "";

  if (outputVariable) {
    result += outputVariable + " = ";
  }

  result += value;
  result +=
    typeof termination === "undefined" || termination === null
      ? ";"
      : termination;
  return result;
}

function callFunction(
  outputVariable: string | null,
  functionName: string,
  params: string | string[] | string[][],
  termination?: string,
) {
  let functionCall = functionName + "(";
  if (Array.isArray(params)) {
    const singleLine = params
      .map((x) => (Array.isArray(x) ? x.join(", ") : x))
      .join(", ");
    const indentLevel = 1;
    const indent = " ".repeat(4 * indentLevel);
    const skipToNextLine = "...\n" + indent;
    let multiLine = skipToNextLine;
    multiLine += params
      .map((x) => (Array.isArray(x) ? x.join(", ") : x))
      .join("," + skipToNextLine);
    multiLine += "...\n";

    // Split the params in multiple lines - if one line is not enough
    const combinedSingleLineLength =
      [outputVariable, functionName, singleLine]
        .map((x) => (x ? x.length : 0))
        .reduce((x, y) => x + y) +
      (outputVariable ? 3 : 0) +
      2 +
      (termination ? termination.length : 1);
    functionCall += combinedSingleLineLength < 120 ? singleLine : multiLine;
  } else {
    functionCall += params;
  }
  functionCall += ")";
  return setVariableValue(outputVariable, functionCall, termination);
}

function addCellArray(
  mapping: ([Word, Word] | [string, Word | string])[],
  keysNotToQuote?: string[],
  indentLevel = 1,
  pairs?: boolean,
) {
  if (mapping.length === 0) return ""; // shouldn't happen

  const indentUnit = " ".repeat(4);
  const indent = indentUnit.repeat(indentLevel);
  const indentPrevLevel = indentUnit.repeat(indentLevel - 1);
  const separator = pairs ? ", " : " ";

  let response = "";
  if (!pairs) {
    response += "{";
  }
  if (pairs && mapping.length > 1) {
    response += "...";
  }
  for (const [counter, [key, value]] of mapping.entries()) {
    const k = typeof key === "string" ? reprStr(key) : repr(key);
    let val: string;
    if (
      keysNotToQuote &&
      keysNotToQuote.includes(key.toLowerCase().toString())
    ) {
      val = value.toString();
    } else {
      val = typeof value === "string" ? reprStr(value) : repr(value);
    }
    if (mapping.length > 1) {
      response += "\n" + indent;
    }
    response += k + separator + val;

    if (pairs && mapping.length > 1) {
      // Don't add trailing comma
      if (counter !== mapping.length - 1) {
        response += ",";
      }
      response += "...";
    }
  }
  if (mapping.length > 1) {
    response += "\n" + indentPrevLevel;
  }
  if (!pairs) {
    response += "}";
  }
  return response;
}

function structify(
  obj: number[] | string[] | { [key: string]: string } | string | number | null,
  indentLevel?: number,
) {
  let response = "";
  indentLevel = !indentLevel ? 1 : ++indentLevel;
  const indent = " ".repeat(4 * indentLevel);
  const prevIndent = " ".repeat(4 * (indentLevel - 1));

  if (obj instanceof Array) {
    const list: string[] = [];
    let listContainsNumbers = true;
    for (const k in obj) {
      if (listContainsNumbers && typeof obj[k] !== "number") {
        listContainsNumbers = false;
      }
      const value = structify(obj[k], indentLevel);
      list.push(`${value}`);
    }
    if (listContainsNumbers) {
      const listString = list.join(" ");
      response += `[${listString}]`;
    } else {
      list.unshift("{{");
      const listString = list.join(`\n${indent}`);
      response += `${listString}\n${prevIndent}}}`;
    }
  } else if (obj instanceof Object) {
    response += "struct(...";
    let first = true;
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        if (!k[0].match(/[a-z]/i)) {
          throw new CCError(
            "MATLAB structs do not support keys starting with non-alphabet symbols",
          );
        }
        // recursive call to scan property
        if (first) {
          first = false;
        } else {
          response += ",...";
        }
        response += `\n${indent}`;
        response += `'${k}', `;
        response += structify(obj[k], indentLevel);
      }
    }
    response += "...";
    response += `\n${prevIndent})`;
  } else if (typeof obj === "number") {
    // not an Object so obj[k] here is a value
    response += obj.toString();
  } else {
    response += obj === null ? "string(nan)" : reprStr(obj);
  }

  return response;
}

function containsBody(request: Request): boolean {
  return Boolean(request.data || request.multipartUploads);
}

function prepareQueryString(request: Request): string | null {
  if (!request.urls[0].queryList) {
    return null;
  }
  return setVariableValue("params", addCellArray(request.urls[0].queryList));
}

function prepareCookies(request: Request): string | null {
  if (!request.cookies) {
    return null;
  }
  return setVariableValue("cookies", addCellArray(request.cookies));
}

const cookieString = "char(join(join(cookies, '='), '; '))";
const paramsString = "char(join(join(params, '='), '&'))";

export {
  reprStr,
  repr,
  setVariableValue,
  callFunction,
  addCellArray,
  structify,
  containsBody,
  prepareQueryString,
  prepareCookies,
  cookieString,
  paramsString,
};
