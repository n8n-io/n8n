import type { Parser } from "./shell/Parser.js";
import type { GlobalConfig } from "./curl/opts.js";
import type { Request } from "./Request.js";

export type Warnings = [string, string][];

export function warnf(global_: GlobalConfig, warning: [string, string]) {
  global_.warnings.push(warning);
}

function underline(
  node: Parser.SyntaxNode | Parser.TreeCursor,
  startIndex: number,
  endIndex: number,
  curlCommand: string,
): string {
  if (startIndex === endIndex) {
    endIndex++;
  }

  // TODO: \r ?
  let lineStart = startIndex;
  if (startIndex > 0) {
    // If it's -1 we're on the first line
    lineStart = curlCommand.lastIndexOf("\n", startIndex - 1) + 1;
  }

  let underlineLength = endIndex - startIndex;
  let lineEnd = curlCommand.indexOf("\n", startIndex);
  if (lineEnd === -1) {
    lineEnd = curlCommand.length;
  } else if (lineEnd < endIndex) {
    // Add extra "^" past the end of a line to signal that the node continues
    underlineLength = lineEnd - startIndex + 1;
  }

  const line = curlCommand.slice(lineStart, lineEnd);
  const underline =
    " ".repeat(startIndex - lineStart) + "^".repeat(underlineLength);
  return line + "\n" + underline;
}

export function underlineCursor(
  node: Parser.TreeCursor,
  curlCommand: string,
): string {
  return underline(node, node.startIndex, node.endIndex, curlCommand);
}

export function underlineNode(
  node: Parser.SyntaxNode,
  curlCommand?: string,
): string {
  // doesn't include leading whitespace
  const command = node.tree.rootNode;
  let startIndex = node.startIndex;
  let endIndex = node.endIndex;
  if (!curlCommand) {
    curlCommand = command.text;
    startIndex -= command.startIndex;
    endIndex -= command.startIndex;
  }
  return underline(node, startIndex, endIndex, curlCommand);
}

export function underlineNodeEnd(
  node: Parser.SyntaxNode,
  curlCommand?: string,
): string {
  // doesn't include leading whitespace
  const command = node.tree.rootNode;
  let startIndex = node.startIndex;
  let endIndex = node.endIndex;
  if (!curlCommand) {
    curlCommand = command.text;
    startIndex -= command.startIndex;
    endIndex -= command.startIndex;
  }
  if (startIndex === endIndex) {
    endIndex++;
  }

  // TODO: \r ?
  let lineStart = startIndex;
  if (startIndex > 0) {
    // If it's -1 we're on the first line
    lineStart = curlCommand.lastIndexOf("\n", endIndex - 1) + 1;
  }

  const underlineStart = Math.max(startIndex, lineStart);
  const underlineLength = endIndex - underlineStart;
  let lineEnd = curlCommand.indexOf("\n", endIndex);
  if (lineEnd === -1) {
    lineEnd = curlCommand.length;
  }

  const line = curlCommand.slice(lineStart, lineEnd);
  const underline =
    " ".repeat(underlineStart - lineStart) + "^".repeat(underlineLength);
  return line + "\n" + underline;
}

export interface Support {
  // multipleRequests?: boolean; // Why call this function?
  multipleUrls?: boolean;
  dataReadsFile?: boolean;
  queryReadsFile?: boolean;
  cookieFiles?: boolean;
}

export function warnIfPartsIgnored(
  request: Request,
  warnings: Warnings,
  support?: Support,
) {
  if (request.urls.length > 1 && !support?.multipleUrls) {
    warnings.push([
      "multiple-urls",
      "found " +
        request.urls.length +
        " URLs, only the first one will be used: " +
        request.urls
          .map((u) => JSON.stringify(u.originalUrl.toString()))
          .join(", "),
    ]);
  }
  if (request.dataReadsFile && !support?.dataReadsFile) {
    warnings.push([
      "unsafe-data",
      // TODO: better wording. Could be "body:" too
      "the generated data content is wrong, " +
        // TODO: might not come from "@"
        JSON.stringify("@" + request.dataReadsFile) +
        " means read the file " +
        JSON.stringify(request.dataReadsFile),
    ]);
  }
  if (request.urls[0].queryReadsFile && !support?.queryReadsFile) {
    warnings.push([
      "unsafe-query",
      "the generated URL query string is wrong, " +
        JSON.stringify("@" + request.urls[0].queryReadsFile) +
        " means read the file " +
        JSON.stringify(request.urls[0].queryReadsFile),
    ]);
  }
  if (request.cookieFiles && !support?.cookieFiles) {
    warnings.push([
      "cookie-files",
      "passing a file for --cookie/-b is not supported: " +
        request.cookieFiles.map((c) => JSON.stringify(c.toString())).join(", "),
    ]);
  }
}
