#!/usr/bin/env node

import { CCError, has } from "./utils.js";
import type { Warnings } from "./Warnings.js";
import { Word } from "./shell/Word.js";
import {
  parseArgs,
  curlLongOpts,
  curlLongOptsShortened,
  curlShortOpts,
} from "./curl/opts.js";
import type { LongOpts, ShortOpts } from "./curl/opts.js";

import { buildRequests } from "./Request.js";
import type { Request } from "./Request.js";

import {
  _toAnsible,
  toAnsibleWarn,
  supportedArgs as supportedArgsAnsible,
} from "./generators/ansible.js";
import {
  _toC,
  toCWarn,
  supportedArgs as supportedArgsC,
} from "./generators/c.js";
import {
  _toCFML,
  toCFMLWarn,
  supportedArgs as supportedArgsCFML,
} from "./generators/cfml.js";
import {
  _toClojure,
  toClojureWarn,
  supportedArgs as supportedArgsClojure,
} from "./generators/clojure.js";
import {
  _toCSharp,
  toCSharpWarn,
  supportedArgs as supportedArgsCSharp,
} from "./generators/csharp.js";
import {
  _toDart,
  toDartWarn,
  supportedArgs as supportedArgsDart,
} from "./generators/dart.js";
import {
  _toElixir,
  toElixirWarn,
  supportedArgs as supportedArgsElixir,
} from "./generators/elixir.js";
import {
  _toGo,
  toGoWarn,
  supportedArgs as supportedArgsGo,
} from "./generators/go.js";
import {
  _toHarString,
  toHarStringWarn,
  supportedArgs as supportedArgsHarString,
} from "./generators/har.js";
import {
  _toHTTP,
  toHTTPWarn,
  supportedArgs as supportedArgsHTTP,
} from "./generators/http.js";
import {
  _toHttpie,
  toHttpieWarn,
  supportedArgs as supportedArgsHttpie,
} from "./generators/httpie.js";
import {
  _toJava,
  toJavaWarn,
  supportedArgs as supportedArgsJava,
} from "./generators/java/java.js";
import {
  _toJavaHttpUrlConnection,
  toJavaHttpUrlConnectionWarn,
  supportedArgs as supportedArgsJavaHttpUrlConnection,
} from "./generators/java/httpurlconnection.js";
import {
  _toJavaJsoup,
  toJavaJsoupWarn,
  supportedArgs as supportedArgsJavaJsoup,
} from "./generators/java/jsoup.js";
import {
  _toJavaOkHttp,
  toJavaOkHttpWarn,
  supportedArgs as supportedArgsJavaOkHttp,
} from "./generators/java/okhttp.js";
import {
  _toJavaScript,
  toJavaScriptWarn,
  javaScriptSupportedArgs as supportedArgsJavaScript,
} from "./generators/javascript/javascript.js";
import {
  _toJavaScriptJquery,
  toJavaScriptJqueryWarn,
  supportedArgs as supportedArgsJavaScriptJquery,
} from "./generators/javascript/jquery.js";
import {
  _toJavaScriptXHR,
  toJavaScriptXHRWarn,
  supportedArgs as supportedArgsJavaScriptXHR,
} from "./generators/javascript/xhr.js";
import {
  _toJsonString,
  toJsonStringWarn,
  supportedArgs as supportedArgsJsonString,
} from "./generators/json.js";
import {
  _toJulia,
  toJuliaWarn,
  supportedArgs as supportedArgsJulia,
} from "./generators/julia.js";
import {
  _toKotlin,
  toKotlinWarn,
  supportedArgs as supportedArgsKotlin,
} from "./generators/kotlin.js";
import {
  _toLua,
  toLuaWarn,
  supportedArgs as supportedArgsLua,
} from "./generators/lua.js";
import {
  _toMATLAB,
  toMATLABWarn,
  supportedArgs as supportedArgsMATLAB,
} from "./generators/matlab/matlab.js";
import {
  _toNode,
  toNodeWarn,
  nodeSupportedArgs as supportedArgsNode,
} from "./generators/javascript/javascript.js";
import {
  _toNodeAxios,
  toNodeAxiosWarn,
  supportedArgs as supportedArgsNodeAxios,
} from "./generators/javascript/axios.js";
import {
  _toNodeGot,
  toNodeGotWarn,
  supportedArgs as supportedArgsNodeGot,
} from "./generators/javascript/got.js";
import {
  _toNodeHttp,
  toNodeHttpWarn,
  supportedArgs as supportedArgsNodeHttp,
} from "./generators/javascript/http.js";
import {
  _toNodeKy,
  toNodeKyWarn,
  supportedArgs as supportedArgsNodeKy,
} from "./generators/javascript/ky.js";
import {
  _toNodeRequest,
  toNodeRequestWarn,
  supportedArgs as supportedArgsNodeRequest,
} from "./generators/javascript/request.js";
import {
  _toNodeSuperAgent,
  toNodeSuperAgentWarn,
  supportedArgs as supportedArgsNodeSuperAgent,
} from "./generators/javascript/superagent.js";
import {
  _toOCaml,
  toOCamlWarn,
  supportedArgs as supportedArgsOCaml,
} from "./generators/ocaml.js";
import {
  _toObjectiveC,
  toObjectiveCWarn,
  supportedArgs as supportedArgsObjectiveC,
} from "./generators/objectivec.js";
import {
  _toPerl,
  toPerlWarn,
  supportedArgs as supportedArgsPerl,
} from "./generators/perl.js";
import {
  _toPhp,
  toPhpWarn,
  supportedArgs as supportedArgsPhp,
} from "./generators/php/php.js";
import {
  _toPhpGuzzle,
  toPhpGuzzleWarn,
  supportedArgs as supportedArgsPhpGuzzle,
} from "./generators/php/guzzle.js";
import {
  _toPhpRequests,
  toPhpRequestsWarn,
  supportedArgs as supportedArgsPhpRequests,
} from "./generators/php/requests.js";
import {
  _toPowershellRestMethod,
  toPowershellRestMethodWarn,
  supportedArgs as supportedArgsPowershellRestMethod,
} from "./generators/powershell.js";
import {
  _toPowershellWebRequest,
  toPowershellWebRequestWarn,
  supportedArgs as supportedArgsPowershellWebRequest,
} from "./generators/powershell.js";
import {
  _toPython,
  toPythonWarn,
  supportedArgs as supportedArgsPython,
} from "./generators/python/python.js";
import {
  _toPythonHttp,
  toPythonHttpWarn,
  supportedArgs as supportedArgsPythonHttp,
} from "./generators/python/http.js";
import {
  _toR,
  toRWarn,
  supportedArgs as supportedArgsR,
} from "./generators/r/httr.js";
import {
  _toRHttr2,
  toRHttr2Warn,
  supportedArgs as supportedArgsRHttr2,
} from "./generators/r/httr2.js";
import {
  _toRuby,
  toRubyWarn,
  supportedArgs as supportedArgsRuby,
} from "./generators/ruby/ruby.js";
import {
  _toRubyHttparty,
  toRubyHttpartyWarn,
  supportedArgs as supportedArgsRubyHttparty,
} from "./generators/ruby/httparty.js";
import {
  _toRust,
  toRustWarn,
  supportedArgs as supportedArgsRust,
} from "./generators/rust.js";
import {
  _toSwift,
  toSwiftWarn,
  supportedArgs as supportedArgsSwift,
} from "./generators/swift.js";
import {
  _toWget,
  toWgetWarn,
  supportedArgs as supportedArgsWget,
} from "./generators/wget.js";

import fs from "fs";

// This line is updated by extract_curl_args.py
const VERSION = "4.12.0 (curl 8.2.1)";

// sets a default in case --language isn't passed
const defaultLanguage = "python";

// Maps options for --language to functions
// NOTE: make sure to update this when adding language support
// prettier-ignore
const translate: {
  [key: string]: [
    (request: Request[], warnings?: Warnings) => string,
    (curlCommand: string | string[], warnings?: Warnings) => [string, Warnings],
    Set<string>,
  ];
} = {
  ansible: [_toAnsible, toAnsibleWarn, supportedArgsAnsible],
  c: [_toC, toCWarn, supportedArgsC],
  cfml: [_toCFML, toCFMLWarn, supportedArgsCFML],
  clojure: [_toClojure, toClojureWarn, supportedArgsClojure],
  csharp: [_toCSharp, toCSharpWarn, supportedArgsCSharp],
  "c#": [_toCSharp, toCSharpWarn, supportedArgsCSharp], // undocumented alias
  browser: [_toJavaScript, toJavaScriptWarn, supportedArgsJavaScript], // for backwards compatibility, undocumented
  dart: [_toDart, toDartWarn, supportedArgsDart],
  elixir: [_toElixir, toElixirWarn, supportedArgsElixir],
  go: [_toGo, toGoWarn, supportedArgsGo],
  golang: [_toGo, toGoWarn, supportedArgsGo], // undocumented alias
  har: [_toHarString, toHarStringWarn, supportedArgsHarString],
  http: [_toHTTP, toHTTPWarn, supportedArgsHTTP],
  httpie: [_toHttpie, toHttpieWarn, supportedArgsHttpie],
  java: [_toJava, toJavaWarn, supportedArgsJava],
  "java-httpurlconnection": [_toJavaHttpUrlConnection, toJavaHttpUrlConnectionWarn, supportedArgsJavaHttpUrlConnection],
  "java-jsoup": [_toJavaJsoup, toJavaJsoupWarn, supportedArgsJavaJsoup],
  "java-okhttp": [_toJavaOkHttp, toJavaOkHttpWarn, supportedArgsJavaOkHttp],
  javascript: [_toJavaScript, toJavaScriptWarn, supportedArgsJavaScript],
  "javascript-axios": [_toNodeAxios, toNodeAxiosWarn, supportedArgsNodeAxios], // undocumented alias
  "javascript-fetch": [_toJavaScript, toJavaScriptWarn, supportedArgsJavaScript], // undocumented alias
  "javascript-got": [_toNodeGot, toNodeGotWarn, supportedArgsNodeGot], // undocumented alias
  "javascript-ky": [_toNodeKy, toNodeKyWarn, supportedArgsNodeKy], // undocumented alias
  "javascript-jquery": [_toJavaScriptJquery, toJavaScriptJqueryWarn, supportedArgsJavaScriptJquery],
  "javascript-request": [_toNodeRequest, toNodeRequestWarn, supportedArgsNodeRequest], // undocumented alias
  "javascript-superagent": [_toNodeSuperAgent, toNodeSuperAgentWarn, supportedArgsNodeSuperAgent], // undocumented alias
  "javascript-xhr": [_toJavaScriptXHR, toJavaScriptXHRWarn, supportedArgsJavaScriptXHR],
  json: [_toJsonString, toJsonStringWarn, supportedArgsJsonString],
  julia: [_toJulia, toJuliaWarn, supportedArgsJulia],
  kotlin: [_toKotlin, toKotlinWarn, supportedArgsKotlin],
  lua: [_toLua, toLuaWarn, supportedArgsLua],
  matlab: [_toMATLAB, toMATLABWarn, supportedArgsMATLAB],
  node: [_toNode, toNodeWarn, supportedArgsNode],
  "node-axios": [_toNodeAxios, toNodeAxiosWarn, supportedArgsNodeAxios],
  "node-fetch": [_toNode, toNodeWarn, supportedArgsNode], // undocumented alias
  "node-got": [_toNodeGot, toNodeGotWarn, supportedArgsNodeGot],
  "node-http": [_toNodeHttp, toNodeHttpWarn, supportedArgsNodeHttp], // undocumented alias
  "node-ky": [_toNodeKy, toNodeKyWarn, supportedArgsNodeKy],
  "node-jquery": [_toJavaScriptJquery, toJavaScriptJqueryWarn, supportedArgsJavaScriptJquery], // undocumented alias
  "node-request": [_toNodeRequest, toNodeRequestWarn, supportedArgsNodeRequest],
  "node-superagent": [_toNodeSuperAgent, toNodeSuperAgentWarn, supportedArgsNodeSuperAgent],
  "node-xhr": [_toJavaScriptXHR, toJavaScriptXHRWarn, supportedArgsJavaScriptXHR], // undocumented alias
  nodejs: [_toNode, toNodeWarn, supportedArgsNode], // undocumented alias
  "nodejs-axios": [_toNodeAxios, toNodeAxiosWarn, supportedArgsNodeAxios], // undocumented alias
  "nodejs-fetch": [_toNode, toNodeWarn, supportedArgsNode], // undocumented alias
  "nodejs-got": [_toNodeGot, toNodeGotWarn, supportedArgsNodeGot], // undocumented alias
  "nodejs-http": [_toNodeHttp, toNodeHttpWarn, supportedArgsNodeHttp], // undocumented alias
  "nodejs-ky": [_toNodeKy, toNodeKyWarn, supportedArgsNodeKy], // undocumented alias
  "nodejs-jquery": [_toJavaScriptJquery, toJavaScriptJqueryWarn, supportedArgsJavaScriptJquery], // undocumented alias
  "nodejs-request": [_toNodeRequest, toNodeRequestWarn, supportedArgsNodeRequest], // undocumented alias
  "nodejs-superagent": [_toNodeSuperAgent, toNodeSuperAgentWarn, supportedArgsNodeSuperAgent], // undocumented alias
  "nodejs-xhr": [_toJavaScriptXHR, toJavaScriptXHRWarn, supportedArgsJavaScriptXHR], // undocumented alias
  objc: [_toObjectiveC, toObjectiveCWarn, supportedArgsObjectiveC],
  objectivec: [_toObjectiveC, toObjectiveCWarn, supportedArgsObjectiveC], // undocumented alias
  "objective-c": [_toObjectiveC, toObjectiveCWarn, supportedArgsObjectiveC], // undocumented alias
  ocaml: [_toOCaml, toOCamlWarn, supportedArgsOCaml],
  perl: [_toPerl, toPerlWarn, supportedArgsPerl],
  php: [_toPhp, toPhpWarn, supportedArgsPhp],
  "php-curl": [_toPhp, toPhpWarn, supportedArgsPhp], // undocumented alias
  "php-guzzle": [_toPhpGuzzle, toPhpGuzzleWarn, supportedArgsPhpGuzzle],
  "php-requests": [_toPhpRequests, toPhpRequestsWarn, supportedArgsPhpRequests],
  powershell: [_toPowershellRestMethod, toPowershellRestMethodWarn, supportedArgsPowershellRestMethod],
  "powershell-restmethod": [_toPowershellRestMethod, toPowershellRestMethodWarn, supportedArgsPowershellRestMethod], // undocumented alias
  "powershell-webrequest": [_toPowershellWebRequest, toPowershellWebRequestWarn, supportedArgsPowershellWebRequest],
  python: [_toPython, toPythonWarn, supportedArgsPython],
  "python-http": [_toPythonHttp, toPythonHttpWarn, supportedArgsPythonHttp],
  "python-httpclient": [_toPythonHttp, toPythonHttpWarn, supportedArgsPythonHttp], // undocumented alias
  r: [_toR, toRWarn, supportedArgsR],
  "r-httr": [_toR, toRWarn, supportedArgsR], // undocumented alias
  "r-httr2": [_toRHttr2, toRHttr2Warn, supportedArgsRHttr2],
  ruby: [_toRuby, toRubyWarn, supportedArgsRuby],
  "ruby-httparty": [_toRubyHttparty, toRubyHttpartyWarn, supportedArgsRubyHttparty],
  rust: [_toRust, toRustWarn, supportedArgsRust],
  swift: [_toSwift, toSwiftWarn, supportedArgsSwift],
  wget: [_toWget, toWgetWarn, supportedArgsWget],
};

const USAGE = `Usage: curlconverter [--language <language>] [-] [curl_options...]

language: the language to convert the curl command to. The choices are
  ansible
  c
  cfml
  clojure
  csharp
  dart
  elixir
  go
  har
  http
  httpie
  java
  java-httpurlconnection
  java-jsoup
  java-okhttp
  javascript
  javascript-jquery
  javascript-xhr
  json
  julia
  kotlin
  lua
  matlab
  node
  node-axios
  node-http
  node-got
  node-ky
  node-request
  node-superagent
  objc
  ocaml
  perl
  php
  php-guzzle
  php-requests
  powershell
  powershell-webrequest
  python (the default)
  r
  r-httr2
  ruby
  ruby-httparty
  rust
  swift
  wget

-: read curl command from stdin

--verbose/-v: print warnings and error tracebacks

curl_options: these should be passed exactly as they would be passed to curl.
  see 'curl --help' or 'curl --manual' for which options are allowed here`;

const curlconverterLongOpts: LongOpts = {
  ...curlLongOpts,
  language: { type: "string", name: "language" },
  stdin: { type: "bool", name: "stdin" },
};
const curlconverterShortOpts: ShortOpts = {
  ...curlShortOpts,
  // a single "-" (dash) tells curlconverter to read input from stdin
  "": "stdin",
};

function printWarnings(warnings: Warnings, verbose: boolean): Warnings {
  if (!verbose) {
    return warnings;
  }
  for (const w of warnings) {
    for (const line of w[1].trim().split("\n")) {
      console.error("warning: " + line);
    }
  }
  return [];
}
function exitWithError(error: unknown, verbose = false): never {
  let errMsg: Error | string | unknown = error;
  if (!verbose) {
    if (error instanceof CCError) {
      errMsg = "";
      for (const line of error.message.toString().split("\n")) {
        errMsg += "error: " + line + "\n";
      }
      errMsg = (errMsg as string).trimEnd();
    } else if (error instanceof Error) {
      // .toString() removes the traceback
      errMsg = error.toString();
    }
  }
  console.error(errMsg);
  process.exit(2); // curl exits with 2 so we do too
}

// argv is ['node', 'cli.js', ...]
// parseArgs() ignores the first argument but we need to remove "node"
const argv = process.argv.slice(1).map((arg) => new Word(arg));
let global_, seenArgs;
let warnings: Warnings = [];
try {
  [global_, seenArgs] = parseArgs(
    argv,
    curlconverterLongOpts,
    curlLongOptsShortened,
    curlconverterShortOpts,
    undefined,
    warnings,
  );
} catch (e) {
  exitWithError(e);
}
if (global_.help) {
  console.log(USAGE.trim());
  process.exit(0);
}
if (global_.version) {
  console.log("curlconverter " + VERSION);
  process.exit(0);
}
const verbose = !!global_.verbose;
const commandFromStdin = global_.stdin;
const language = global_.language || defaultLanguage;
if (!has(translate, language)) {
  exitWithError(
    new CCError(
      "unexpected --language: " +
        JSON.stringify(language) +
        "\n" +
        "must be one of: " +
        Object.keys(translate).sort().join(", "),
    ),
    verbose,
  );
}

if (!seenArgs.length) {
  console.log(USAGE.trim());
  process.exit(2);
}

const [generator, warnGenerator, supportedArgs] = translate[language];
const extraArgs = seenArgs.filter((a) => {
  const [arg, actual] = a;
  const ignore = ["stdin", "verbose", "language"].includes(arg);
  if (!ignore && !supportedArgs.has(arg)) {
    warnings.push([
      arg,
      actual + " is not a supported option",
      // + (longArg.removed ? ", it was removed in curl " + longArg.removed : ""),
    ]);
  }
  return !ignore;
});

let code;
if (commandFromStdin) {
  // This lets you do
  // echo curl example.com | curlconverter --verbose
  // TODO: remove repeated args
  if (extraArgs.length > 0) {
    // Throw an error so that if user typos something like
    // curlconverter - -data
    // they aren't stuck with what looks like a hung terminal.
    const extraArgsStr = extraArgs.map((a) => a[1]).join(", ");
    exitWithError(
      new CCError(
        "if you pass --stdin or -, you can't also pass " + extraArgsStr,
      ),
      verbose,
    );
  }
  const input = fs.readFileSync(0, "utf8");
  try {
    [code, warnings] = warnGenerator(input, warnings);
  } catch (e) {
    printWarnings(warnings, true); // print warnings to help figure out the error
    exitWithError(e, verbose);
  }
  warnings = printWarnings(warnings, verbose);
} else {
  warnings = printWarnings(warnings, verbose);

  let stdin;
  if (!process.stdin.isTTY) {
    // TODO: what if there's an EOF character? does curl read each @- until EOF?
    stdin = new Word(fs.readFileSync(0).toString());
  }
  let requests;
  try {
    requests = buildRequests(global_, stdin);
  } catch (e) {
    exitWithError(e, verbose);
  }
  warnings = printWarnings(warnings, verbose);
  // Warning for users using the pre-4.0 CLI
  if (requests[0].urls[0].originalUrl.startsWith("curl ")) {
    console.error(`\
warning: Passing a whole curl command as a single argument?
warning: Pass options to curlconverter as if it was curl instead:
warning: curlconverter 'curl example.com' -> curlconverter example.com`);
  }
  try {
    code = generator(requests, warnings);
  } catch (e) {
    exitWithError(e, verbose);
  }
  warnings = printWarnings(warnings, verbose);
}

printWarnings(warnings, verbose);
process.stdout.write(code);
