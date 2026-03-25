// This file replaces Parser.ts when curlconverter is running in the browser.

import Parser from "web-tree-sitter";

// NOTE: top-level await requires Safari 15+
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#browser_compatibility
await Parser.init({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  locateFile(scriptName: string, scriptDirectory: string) {
    return "/" + scriptName;
  },
});
const Bash = await Parser.Language.load("/tree-sitter-bash.wasm");
const parser = new Parser();
parser.setLanguage(Bash);

export default parser;
export type { Parser };
