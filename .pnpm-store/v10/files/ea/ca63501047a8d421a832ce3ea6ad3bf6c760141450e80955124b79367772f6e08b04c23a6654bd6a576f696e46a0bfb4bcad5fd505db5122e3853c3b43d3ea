"use strict";

/**
 * Finds comments, both CSS comments and double slash ones, in a CSS string
 * This helper exists because PostCSS drops some inline comments (those
 * between selectors, property values, etc.)
 * https://github.com/postcss/postcss/issues/845#issuecomment-232306259
 *
 * @param {string} rawString -- the source raw CSS string
 * @return {array} array of objects with these props:
 *    � type -- "css" or "double-slash"
 *    � source: { start, end }
 *      IMPORTANT: the function itself considers \r as a character, and counts
 *      it for `start` and `end`. But if their values are passed to PostCSS's
 *      result.warn(), than "\r\n" is consideren ONE CHAR (newline)!
 *    � raws
 *      raws.startToken -- `/*`, `/**`, `/**!`, etc.
 *      raws.left -- whitespace after the comment opening marker
 *      raws.text -- the full comment, including markers (//, /*)
 *      raws.right -- whitespace before the comment closing marker
 *      raws.endToken -- `*\/`, `**\/` for CSS comments
 *    � text -- the comment text only, excluding //, /*, trailing whitespaces
 *    � inlineAfter -- true, if there is something before the comment on
 *      the same line
 *    � inlineBefore -- true, if there is something after the comment on
 *      the same line
 */

module.exports = function findCommentsInRaws(rawString) {
  const result = [];
  let comment = {};
  // Keeps track of which structure the parser is inside (string, comment,
  // url function, parens). E.g., /* comment */ inside a string doesn't
  // constitute a comment, so as url(//path)
  const modesEntered = [
    {
      mode: "normal",
      character: null
    }
  ];
  let commentStart = null;

  // postcss-scss transforms //-comments into CSS comments, like so:
  // `// comment` -> `/* comment*/`. So to have a correct intex we need to
  // keep track on the added `*/` sequences
  let offset = 0;

  for (let i = 0; i < rawString.length; i++) {
    const character = rawString[i];
    const prevChar = i > 0 ? rawString[i - 1] : null;
    const nextChar = i + 1 < rawString.length ? rawString[i + 1] : null;

    const lastModeIndex = modesEntered.length - 1;
    const mode =
      modesEntered[lastModeIndex] && modesEntered[lastModeIndex].mode;

    switch (character) {
      // If entering/exiting a string
      case '"':
      case "'": {
        if (mode === "comment") {
          break;
        }

        if (
          mode === "string" &&
          modesEntered[lastModeIndex].character === character &&
          prevChar !== "\\"
        ) {
          // Exiting a string
          modesEntered.pop();
        } else {
          // Entering a string
          modesEntered.push({
            mode: "string",
            character
          });
        }

        break;
      }
      // Entering url, other function or parens (only url matters)
      case "(": {
        if (mode === "comment" || mode === "string") {
          break;
        }

        const functionNameRegSearch =
          /(?:^|[\n\r]|\s-|[:\s,.(){}*+/%])([\w-]*)$/.exec(
            rawString.substring(0, i)
          );

        // A `\S(` can be in, say, `@media(`
        if (!functionNameRegSearch) {
          modesEntered.push({
            mode: "parens",
            character: "("
          });
          break;
        }

        const functionName = functionNameRegSearch[1];

        modesEntered.push({
          mode: functionName === "url" ? "url" : "parens",
          character: "("
        });
        break;
      }
      // Exiting url, other function or parens
      case ")": {
        if (mode === "comment" || mode === "string") {
          break;
        }

        modesEntered.pop();
        break;
      }
      // checking for comment
      case "/": {
        // Break if the / is inside a comment because we leap over the second
        // slash in // and in */, so the / is not from a marker. Also break
        // if inside a string
        if (mode === "comment" || mode === "string") {
          break;
        }

        if (nextChar === "*") {
          modesEntered.push({
            mode: "comment",
            character: "/*"
          });
          comment = {
            type: "css",
            source: { start: i + offset },
            // If i is 0 then the file/the line starts with this comment
            inlineAfter:
              i > 0 && rawString.substring(0, i).search(/\n\s*$/) === -1
          };
          commentStart = i;
          // Skip the next iteration as the * is already checked
          i++;
        } else if (nextChar === "/") {
          // `url(//path/to/file)` has no comment
          if (mode === "url") {
            break;
          }

          modesEntered.push({
            mode: "comment",
            character: "//"
          });
          comment = {
            type: "double-slash",
            source: { start: i + offset },
            // If i is 0 then the file/the line starts with this comment
            inlineAfter:
              i > 0 && rawString.substring(0, i).search(/\n\s*$/) === -1
          };
          commentStart = i;
          // Skip the next iteration as the second slash in // is already checked
          i++;
        }

        break;
      }
      // Might be a closing `*/`
      case "*": {
        if (
          mode === "comment" &&
          modesEntered[lastModeIndex].character === "/*" &&
          nextChar === "/"
        ) {
          comment.source.end = i + 1 + offset;

          const commentRaw = rawString.substring(commentStart, i + 2);
          const matches = /^(\/\*+[!#]?)(\s*)([\s\S]*?)(\s*)(\*+\/)$/.exec(
            commentRaw
          );

          modesEntered.pop();
          comment.raws = {
            startToken: matches[1],
            left: matches[2],
            text: commentRaw,
            right: matches[4],
            endToken: matches[5]
          };
          comment.text = matches[3];
          comment.inlineBefore =
            rawString.substring(i + 2).search(/^\s*\S+\s*?\n/) !== -1;
          result.push(Object.assign({}, comment));
          comment = {};
          // Skip the next loop as the / in */ is already checked
          i++;
        }

        break;
      }
      default: {
        const isNewline =
          (character === "\r" && rawString[i + 1] === "\n") ||
          (character === "\n" && rawString[i - 1] !== "\r");

        // //-comments end before newline and if the code string ends
        if (isNewline || i === rawString.length - 1) {
          if (
            mode === "comment" &&
            modesEntered[lastModeIndex].character === "//"
          ) {
            comment.source.end = (isNewline ? i - 1 : i) + offset;

            const commentRaw = rawString.substring(
              commentStart,
              isNewline ? i : i + 1
            );
            const matches = /^(\/+)(\s*)(.*?)(\s*)$/.exec(commentRaw);

            modesEntered.pop();
            comment.raws = {
              startToken: matches[1],
              left: matches[2],
              text: commentRaw,
              right: matches[4]
            };
            comment.text = matches[3];
            comment.inlineBefore = false;
            result.push(Object.assign({}, comment));
            comment = {};
            // Compensate for the `*/` added by postcss-scss
            offset += 2;
          }
        }

        break;
      }
    }
  }

  return result;
};
