import {GenMapping, maybeAddSegment, toEncodedMap} from "@jridgewell/gen-mapping";



import {charCodes} from "./parser/util/charcodes";












/**
 * Generate a source map indicating that each line maps directly to the original line,
 * with the tokens in their new positions.
 */
export default function computeSourceMap(
  {code: generatedCode, mappings: rawMappings},
  filePath,
  options,
  source,
  tokens,
) {
  const sourceColumns = computeSourceColumns(source, tokens);
  const map = new GenMapping({file: options.compiledFilename});
  let tokenIndex = 0;
  // currentMapping is the output source index for the current input token being
  // considered.
  let currentMapping = rawMappings[0];
  while (currentMapping === undefined && tokenIndex < rawMappings.length - 1) {
    tokenIndex++;
    currentMapping = rawMappings[tokenIndex];
  }
  let line = 0;
  let lineStart = 0;
  if (currentMapping !== lineStart) {
    maybeAddSegment(map, line, 0, filePath, line, 0);
  }
  for (let i = 0; i < generatedCode.length; i++) {
    if (i === currentMapping) {
      const genColumn = currentMapping - lineStart;
      const sourceColumn = sourceColumns[tokenIndex];
      maybeAddSegment(map, line, genColumn, filePath, line, sourceColumn);
      while (
        (currentMapping === i || currentMapping === undefined) &&
        tokenIndex < rawMappings.length - 1
      ) {
        tokenIndex++;
        currentMapping = rawMappings[tokenIndex];
      }
    }
    if (generatedCode.charCodeAt(i) === charCodes.lineFeed) {
      line++;
      lineStart = i + 1;
      if (currentMapping !== lineStart) {
        maybeAddSegment(map, line, 0, filePath, line, 0);
      }
    }
  }
  const {sourceRoot, sourcesContent, ...sourceMap} = toEncodedMap(map);
  return sourceMap ;
}

/**
 * Create an array mapping each token index to the 0-based column of the start
 * position of the token.
 */
function computeSourceColumns(code, tokens) {
  const sourceColumns = new Array(tokens.length);
  let tokenIndex = 0;
  let currentMapping = tokens[tokenIndex].start;
  let lineStart = 0;
  for (let i = 0; i < code.length; i++) {
    if (i === currentMapping) {
      sourceColumns[tokenIndex] = currentMapping - lineStart;
      tokenIndex++;
      currentMapping = tokens[tokenIndex].start;
    }
    if (code.charCodeAt(i) === charCodes.lineFeed) {
      lineStart = i + 1;
    }
  }
  return sourceColumns;
}
