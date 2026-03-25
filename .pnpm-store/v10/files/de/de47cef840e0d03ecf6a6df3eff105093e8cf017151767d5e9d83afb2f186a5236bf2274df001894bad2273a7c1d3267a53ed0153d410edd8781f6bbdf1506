import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import "../../_node-chunks/chunk-JLFR6DEF.js";
import {
  parseStaticDir,
  sendTelemetryError,
  throttle
} from "../../_node-chunks/chunk-2372JZ52.js";
import "../../_node-chunks/chunk-ONZANTK7.js";
import "../../_node-chunks/chunk-5GQBCZKW.js";
import "../../_node-chunks/chunk-WANDQWBR.js";
import {
  globalSettings
} from "../../_node-chunks/chunk-EQLFU5BD.js";
import {
  invariant
} from "../../_node-chunks/chunk-PFJRSBIJ.js";
import {
  resolvePackageDir
} from "../../_node-chunks/chunk-O7UZQAUS.js";
import "../../_node-chunks/chunk-NKSLKQ5F.js";
import {
  isAbsolute,
  join
} from "../../_node-chunks/chunk-XS5OAKHK.js";
import {
  loadConfig
} from "../../_node-chunks/chunk-DWPXURLN.js";
import {
  require_dist
} from "../../_node-chunks/chunk-SLZHVDN6.js";
import "../../_node-chunks/chunk-N2XJQMXW.js";
import "../../_node-chunks/chunk-HF7KKBBR.js";
import {
  require_picocolors
} from "../../_node-chunks/chunk-LE232J7F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "../../_node-chunks/chunk-DRM3MJ7Y.js";

// ../node_modules/shell-quote/quote.js
var require_quote = __commonJS({
  "../node_modules/shell-quote/quote.js"(exports, module) {
    "use strict";
    module.exports = function(xs) {
      return xs.map(function(s) {
        return s === "" ? "''" : s && typeof s == "object" ? s.op.replace(/(.)/g, "\\$1") : /["\s\\]/.test(s) && !/'/.test(s) ? "'" + s.replace(/(['])/g, "\\$1") + "'" : /["'\s]/.test(s) ? '"' + s.replace(/(["\\$`!])/g, "\\$1") + '"' : String(s).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, "$1\\$2");
      }).join(" ");
    };
  }
});

// ../node_modules/shell-quote/parse.js
var require_parse = __commonJS({
  "../node_modules/shell-quote/parse.js"(exports, module) {
    "use strict";
    var CONTROL = "(?:" + [
      "\\|\\|",
      "\\&\\&",
      ";;",
      "\\|\\&",
      "\\<\\(",
      "\\<\\<\\<",
      ">>",
      ">\\&",
      "<\\&",
      "[&;()|<>]"
    ].join("|") + ")", controlRE = new RegExp("^" + CONTROL + "$"), META = "|&;()<> \\t", SINGLE_QUOTE = '"((\\\\"|[^"])*?)"', DOUBLE_QUOTE = "'((\\\\'|[^'])*?)'", hash = /^#$/, SQ = "'", DQ = '"', DS = "$", TOKEN = "", mult = 4294967296;
    for (i = 0; i < 4; i++)
      TOKEN += (mult * Math.random()).toString(16);
    var i, startsWithToken = new RegExp("^" + TOKEN);
    function matchAll(s, r) {
      for (var origIndex = r.lastIndex, matches = [], matchObj; matchObj = r.exec(s); )
        matches.push(matchObj), r.lastIndex === matchObj.index && (r.lastIndex += 1);
      return r.lastIndex = origIndex, matches;
    }
    function getVar(env2, pre, key) {
      var r = typeof env2 == "function" ? env2(key) : env2[key];
      return typeof r > "u" && key != "" ? r = "" : typeof r > "u" && (r = "$"), typeof r == "object" ? pre + TOKEN + JSON.stringify(r) + TOKEN : pre + r;
    }
    function parseInternal(string, env2, opts) {
      opts || (opts = {});
      var BS = opts.escape || "\\", BAREWORD = "(\\" + BS + `['"` + META + `]|[^\\s'"` + META + "])+", chunker = new RegExp([
        "(" + CONTROL + ")",
        // control chars
        "(" + BAREWORD + "|" + SINGLE_QUOTE + "|" + DOUBLE_QUOTE + ")+"
      ].join("|"), "g"), matches = matchAll(string, chunker);
      if (matches.length === 0)
        return [];
      env2 || (env2 = {});
      var commented = !1;
      return matches.map(function(match) {
        var s = match[0];
        if (!s || commented)
          return;
        if (controlRE.test(s))
          return { op: s };
        var quote = !1, esc = !1, out = "", isGlob = !1, i2;
        function parseEnvVar() {
          i2 += 1;
          var varend, varname, char = s.charAt(i2);
          if (char === "{") {
            if (i2 += 1, s.charAt(i2) === "}")
              throw new Error("Bad substitution: " + s.slice(i2 - 2, i2 + 1));
            if (varend = s.indexOf("}", i2), varend < 0)
              throw new Error("Bad substitution: " + s.slice(i2));
            varname = s.slice(i2, varend), i2 = varend;
          } else if (/[*@#?$!_-]/.test(char))
            varname = char, i2 += 1;
          else {
            var slicedFromI = s.slice(i2);
            varend = slicedFromI.match(/[^\w\d_]/), varend ? (varname = slicedFromI.slice(0, varend.index), i2 += varend.index - 1) : (varname = slicedFromI, i2 = s.length);
          }
          return getVar(env2, "", varname);
        }
        for (i2 = 0; i2 < s.length; i2++) {
          var c = s.charAt(i2);
          if (isGlob = isGlob || !quote && (c === "*" || c === "?"), esc)
            out += c, esc = !1;
          else if (quote)
            c === quote ? quote = !1 : quote == SQ ? out += c : c === BS ? (i2 += 1, c = s.charAt(i2), c === DQ || c === BS || c === DS ? out += c : out += BS + c) : c === DS ? out += parseEnvVar() : out += c;
          else if (c === DQ || c === SQ)
            quote = c;
          else {
            if (controlRE.test(c))
              return { op: s };
            if (hash.test(c)) {
              commented = !0;
              var commentObj = { comment: string.slice(match.index + i2 + 1) };
              return out.length ? [out, commentObj] : [commentObj];
            } else c === BS ? esc = !0 : c === DS ? out += parseEnvVar() : out += c;
          }
        }
        return isGlob ? { op: "glob", pattern: out } : out;
      }).reduce(function(prev, arg) {
        return typeof arg > "u" ? prev : prev.concat(arg);
      }, []);
    }
    module.exports = function(s, env2, opts) {
      var mapped = parseInternal(s, env2, opts);
      return typeof env2 != "function" ? mapped : mapped.reduce(function(acc, s2) {
        if (typeof s2 == "object")
          return acc.concat(s2);
        var xs = s2.split(RegExp("(" + TOKEN + ".*?" + TOKEN + ")", "g"));
        return xs.length === 1 ? acc.concat(xs[0]) : acc.concat(xs.filter(Boolean).map(function(x) {
          return startsWithToken.test(x) ? JSON.parse(x.split(TOKEN)[1]) : x;
        }));
      }, []);
    };
  }
});

// ../node_modules/shell-quote/index.js
var require_shell_quote = __commonJS({
  "../node_modules/shell-quote/index.js"(exports) {
    "use strict";
    exports.quote = require_quote();
    exports.parse = require_parse();
  }
});

// ../node_modules/launch-editor/editor-info/macos.js
var require_macos = __commonJS({
  "../node_modules/launch-editor/editor-info/macos.js"(exports, module) {
    module.exports = {
      "/Applications/Atom.app/Contents/MacOS/Atom": "atom",
      "/Applications/Atom Beta.app/Contents/MacOS/Atom Beta": "/Applications/Atom Beta.app/Contents/MacOS/Atom Beta",
      "/Applications/Brackets.app/Contents/MacOS/Brackets": "brackets",
      "/Applications/Sublime Text.app/Contents/MacOS/Sublime Text": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl",
      "/Applications/Sublime Text.app/Contents/MacOS/sublime_text": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl",
      "/Applications/Sublime Text 2.app/Contents/MacOS/Sublime Text 2": "/Applications/Sublime Text 2.app/Contents/SharedSupport/bin/subl",
      "/Applications/Sublime Text Dev.app/Contents/MacOS/Sublime Text": "/Applications/Sublime Text Dev.app/Contents/SharedSupport/bin/subl",
      "/Applications/Visual Studio Code.app/Contents/MacOS/Electron": "code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Electron": "code-insiders",
      "/Applications/VSCodium.app/Contents/MacOS/Electron": "codium",
      "/Applications/Cursor.app/Contents/MacOS/Cursor": "cursor",
      "/Applications/Trae.app/Contents/MacOS/Electron": "trae",
      "/Applications/AppCode.app/Contents/MacOS/appcode": "/Applications/AppCode.app/Contents/MacOS/appcode",
      "/Applications/CLion.app/Contents/MacOS/clion": "/Applications/CLion.app/Contents/MacOS/clion",
      "/Applications/IntelliJ IDEA.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA.app/Contents/MacOS/idea",
      "/Applications/IntelliJ IDEA Ultimate.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA Ultimate.app/Contents/MacOS/idea",
      "/Applications/IntelliJ IDEA Community Edition.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA Community Edition.app/Contents/MacOS/idea",
      "/Applications/PhpStorm.app/Contents/MacOS/phpstorm": "/Applications/PhpStorm.app/Contents/MacOS/phpstorm",
      "/Applications/PyCharm.app/Contents/MacOS/pycharm": "/Applications/PyCharm.app/Contents/MacOS/pycharm",
      "/Applications/PyCharm CE.app/Contents/MacOS/pycharm": "/Applications/PyCharm CE.app/Contents/MacOS/pycharm",
      "/Applications/RubyMine.app/Contents/MacOS/rubymine": "/Applications/RubyMine.app/Contents/MacOS/rubymine",
      "/Applications/WebStorm.app/Contents/MacOS/webstorm": "/Applications/WebStorm.app/Contents/MacOS/webstorm",
      "/Applications/MacVim.app/Contents/MacOS/MacVim": "mvim",
      "/Applications/GoLand.app/Contents/MacOS/goland": "/Applications/GoLand.app/Contents/MacOS/goland",
      "/Applications/Rider.app/Contents/MacOS/rider": "/Applications/Rider.app/Contents/MacOS/rider",
      "/Applications/Zed.app/Contents/MacOS/zed": "zed"
    };
  }
});

// ../node_modules/launch-editor/editor-info/linux.js
var require_linux = __commonJS({
  "../node_modules/launch-editor/editor-info/linux.js"(exports, module) {
    module.exports = {
      atom: "atom",
      Brackets: "brackets",
      "code-insiders": "code-insiders",
      code: "code",
      vscodium: "vscodium",
      codium: "codium",
      cursor: "cursor",
      trae: "trae",
      emacs: "emacs",
      gvim: "gvim",
      idea: "idea",
      "idea.sh": "idea",
      phpstorm: "phpstorm",
      "phpstorm.sh": "phpstorm",
      pycharm: "pycharm",
      "pycharm.sh": "pycharm",
      rubymine: "rubymine",
      "rubymine.sh": "rubymine",
      sublime_text: "subl",
      vim: "vim",
      webstorm: "webstorm",
      "webstorm.sh": "webstorm",
      goland: "goland",
      "goland.sh": "goland",
      rider: "rider",
      "rider.sh": "rider",
      zed: "zed"
    };
  }
});

// ../node_modules/launch-editor/editor-info/windows.js
var require_windows = __commonJS({
  "../node_modules/launch-editor/editor-info/windows.js"(exports, module) {
    module.exports = [
      "Brackets.exe",
      "Code.exe",
      "Code - Insiders.exe",
      "VSCodium.exe",
      "Cursor.exe",
      "atom.exe",
      "sublime_text.exe",
      "notepad++.exe",
      "clion.exe",
      "clion64.exe",
      "idea.exe",
      "idea64.exe",
      "phpstorm.exe",
      "phpstorm64.exe",
      "pycharm.exe",
      "pycharm64.exe",
      "rubymine.exe",
      "rubymine64.exe",
      "webstorm.exe",
      "webstorm64.exe",
      "goland.exe",
      "goland64.exe",
      "rider.exe",
      "rider64.exe",
      "trae.exe"
    ];
  }
});

// ../node_modules/launch-editor/guess.js
var require_guess = __commonJS({
  "../node_modules/launch-editor/guess.js"(exports, module) {
    var path = __require("path"), shellQuote = require_shell_quote(), childProcess = __require("child_process"), COMMON_EDITORS_MACOS = require_macos(), COMMON_EDITORS_LINUX = require_linux(), COMMON_EDITORS_WIN = require_windows();
    module.exports = function(specifiedEditor) {
      if (specifiedEditor)
        return shellQuote.parse(specifiedEditor);
      if (process.env.LAUNCH_EDITOR)
        return [process.env.LAUNCH_EDITOR];
      if (process.versions.webcontainer)
        return [process.env.EDITOR || "code"];
      try {
        if (process.platform === "darwin") {
          let output = childProcess.execSync("ps x -o comm=", {
            stdio: ["pipe", "pipe", "ignore"]
          }).toString(), processNames = Object.keys(COMMON_EDITORS_MACOS), processList = output.split(`
`);
          for (let i = 0; i < processNames.length; i++) {
            let processName = processNames[i];
            if (processList.includes(processName))
              return [COMMON_EDITORS_MACOS[processName]];
            let processNameWithoutApplications = processName.replace("/Applications", "");
            if (output.indexOf(processNameWithoutApplications) !== -1) {
              if (processName !== COMMON_EDITORS_MACOS[processName])
                return [COMMON_EDITORS_MACOS[processName]];
              let runningProcess = processList.find((procName) => procName.endsWith(processNameWithoutApplications));
              if (runningProcess !== void 0)
                return [runningProcess];
            }
          }
        } else if (process.platform === "win32") {
          let runningProcesses = childProcess.execSync(
            'powershell -NoProfile -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8;Get-CimInstance -Query \\"select executablepath from win32_process where executablepath is not null\\" | % { $_.ExecutablePath }"',
            {
              stdio: ["pipe", "pipe", "ignore"]
            }
          ).toString().split(`\r
`);
          for (let i = 0; i < runningProcesses.length; i++) {
            let fullProcessPath = runningProcesses[i].trim(), shortProcessName = path.basename(fullProcessPath);
            if (COMMON_EDITORS_WIN.indexOf(shortProcessName) !== -1)
              return [fullProcessPath];
          }
        } else if (process.platform === "linux") {
          let output = childProcess.execSync("ps x --no-heading -o comm --sort=comm", {
            stdio: ["pipe", "pipe", "ignore"]
          }).toString(), processNames = Object.keys(COMMON_EDITORS_LINUX);
          for (let i = 0; i < processNames.length; i++) {
            let processName = processNames[i];
            if (output.indexOf(processName) !== -1)
              return [COMMON_EDITORS_LINUX[processName]];
          }
        }
      } catch {
      }
      return process.env.VISUAL ? [process.env.VISUAL] : process.env.EDITOR ? [process.env.EDITOR] : [null];
    };
  }
});

// ../node_modules/launch-editor/get-args.js
var require_get_args = __commonJS({
  "../node_modules/launch-editor/get-args.js"(exports, module) {
    var path = __require("path");
    module.exports = function(editor, fileName, lineNumber, columnNumber = 1) {
      switch (path.basename(editor).replace(/\.(exe|cmd|bat)$/i, "")) {
        case "atom":
        case "Atom":
        case "Atom Beta":
        case "subl":
        case "sublime":
        case "sublime_text":
        case "wstorm":
        case "charm":
        case "zed":
          return [`${fileName}:${lineNumber}:${columnNumber}`];
        case "notepad++":
          return ["-n" + lineNumber, "-c" + columnNumber, fileName];
        case "vim":
        case "mvim":
          return [`+call cursor(${lineNumber}, ${columnNumber})`, fileName];
        case "joe":
        case "gvim":
          return [`+${lineNumber}`, fileName];
        case "emacs":
        case "emacsclient":
          return [`+${lineNumber}:${columnNumber}`, fileName];
        case "rmate":
        case "mate":
        case "mine":
          return ["--line", lineNumber, fileName];
        case "code":
        case "Code":
        case "code-insiders":
        case "Code - Insiders":
        case "codium":
        case "trae":
        case "cursor":
        case "vscodium":
        case "VSCodium":
          return ["-r", "-g", `${fileName}:${lineNumber}:${columnNumber}`];
        case "appcode":
        case "clion":
        case "clion64":
        case "idea":
        case "idea64":
        case "phpstorm":
        case "phpstorm64":
        case "pycharm":
        case "pycharm64":
        case "rubymine":
        case "rubymine64":
        case "webstorm":
        case "webstorm64":
        case "goland":
        case "goland64":
        case "rider":
        case "rider64":
          return ["--line", lineNumber, "--column", columnNumber, fileName];
      }
      return process.env.LAUNCH_EDITOR ? [fileName, lineNumber, columnNumber] : [fileName];
    };
  }
});

// ../node_modules/launch-editor/index.js
var require_launch_editor = __commonJS({
  "../node_modules/launch-editor/index.js"(exports, module) {
    var fs = __require("fs"), os = __require("os"), path = __require("path"), colors = require_picocolors(), childProcess = __require("child_process"), guessEditor = require_guess(), getArgumentsForPosition = require_get_args();
    function wrapErrorCallback(cb) {
      return (fileName, errorMessage) => {
        console.log(), console.log(
          colors.red("Could not open " + path.basename(fileName) + " in the editor.")
        ), errorMessage && (errorMessage[errorMessage.length - 1] !== "." && (errorMessage += "."), console.log(
          colors.red("The editor process exited with an error: " + errorMessage)
        )), console.log(), cb && cb(fileName, errorMessage);
      };
    }
    function isTerminalEditor(editor) {
      switch (editor) {
        case "vim":
        case "emacs":
        case "nano":
          return !0;
      }
      return !1;
    }
    var positionRE = /:(\d+)(:(\d+))?$/;
    function parseFile(file) {
      file.startsWith("file://") && (file = __require("url").fileURLToPath(file));
      let fileName = file.replace(positionRE, ""), match = file.match(positionRE), lineNumber = match && match[1], columnNumber = match && match[3];
      return {
        fileName,
        lineNumber,
        columnNumber
      };
    }
    var _childProcess = null;
    function launchEditor(file, specifiedEditor, onErrorCallback) {
      let parsed = parseFile(file), { fileName } = parsed, { lineNumber, columnNumber } = parsed;
      if (!fs.existsSync(fileName))
        return;
      typeof specifiedEditor == "function" && (onErrorCallback = specifiedEditor, specifiedEditor = void 0), onErrorCallback = wrapErrorCallback(onErrorCallback);
      let [editor, ...args] = guessEditor(specifiedEditor);
      if (!editor) {
        onErrorCallback(fileName, null);
        return;
      }
      if (process.platform === "linux" && fileName.startsWith("/mnt/") && /Microsoft/i.test(os.release()) && (fileName = path.relative("", fileName)), lineNumber) {
        let extraArgs = getArgumentsForPosition(editor, fileName, lineNumber, columnNumber);
        args.push.apply(args, extraArgs);
      } else
        args.push(fileName);
      if (_childProcess && isTerminalEditor(editor) && _childProcess.kill("SIGKILL"), process.platform === "win32") {
        let escapeCmdArgs2 = function(cmdArgs) {
          return cmdArgs.replace(/([&|<>,;=^])/g, "^$1");
        }, doubleQuoteIfNeeded2 = function(str) {
          return str.includes("^") ? `^"${str}^"` : str.includes(" ") ? `"${str}"` : str;
        };
        var escapeCmdArgs = escapeCmdArgs2, doubleQuoteIfNeeded = doubleQuoteIfNeeded2;
        let launchCommand = [editor, ...args.map(escapeCmdArgs2)].map(doubleQuoteIfNeeded2).join(" ");
        _childProcess = childProcess.exec(launchCommand, {
          stdio: "inherit",
          shell: !0
        });
      } else
        _childProcess = childProcess.spawn(editor, args, { stdio: "inherit" });
      _childProcess.on("exit", function(errorCode) {
        _childProcess = null, errorCode && onErrorCallback(fileName, "(code " + errorCode + ")");
      }), _childProcess.on("error", function(error) {
        let { code, message } = error;
        code === "ENOENT" && (message = `${message} ('${editor}' command does not exist in 'PATH')`), onErrorCallback(fileName, message);
      });
    }
    module.exports = launchEditor;
  }
});

// src/core-server/presets/common-preset.ts
import { existsSync as existsSync3 } from "node:fs";
import { readFile as readFile3 } from "node:fs/promises";
import { optionalEnvToBoolean } from "storybook/internal/common";
import {
  JsPackageManagerFactory,
  getDirectoryFromWorkingDir,
  getPreviewBodyTemplate,
  getPreviewHeadTemplate,
  loadEnvs,
  removeAddon as removeAddonBase
} from "storybook/internal/common";
import { readCsf as readCsf2 } from "storybook/internal/csf-tools";
import { logger as logger4 } from "storybook/internal/node-logger";
import { telemetry as telemetry8 } from "storybook/internal/telemetry";
var import_ts_dedent4 = __toESM(require_dist(), 1);

// src/core-server/server-channel/create-new-story-channel.ts
import { existsSync as existsSync2 } from "node:fs";
import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { getStoryId } from "storybook/internal/common";
import {
  CREATE_NEW_STORYFILE_REQUEST,
  CREATE_NEW_STORYFILE_RESPONSE
} from "storybook/internal/core-events";
import { telemetry } from "storybook/internal/telemetry";

// src/core-server/utils/get-new-story-file.ts
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, join as join2 } from "node:path";
import {
  extractFrameworkPackageName,
  findConfigFile,
  getFrameworkName,
  getProjectRoot
} from "storybook/internal/common";
import { isCsfFactoryPreview } from "storybook/internal/csf-tools";

// src/core-server/utils/new-story-templates/csf-factory-template.ts
var import_ts_dedent = __toESM(require_dist(), 1);

// src/core-server/utils/get-component-variable-name.ts
var getComponentVariableName = async (name) => (await import("../../_node-chunks/camelcase-7MOJ2FFW.js")).default(name.replace(/^[^a-zA-Z_$]*/, ""), { pascalCase: !0 }).replace(/[^a-zA-Z_$]+/, "");

// src/core-server/utils/new-story-templates/csf-factory-template.ts
async function getCsfFactoryTemplateForNewStoryFile(data) {
  let importName = data.componentIsDefaultExport ? await getComponentVariableName(data.basenameWithoutExtension) : data.componentExportName, importStatement = data.componentIsDefaultExport ? `import ${importName} from './${data.basenameWithoutExtension}';` : `import { ${importName} } from './${data.basenameWithoutExtension}';`;
  return import_ts_dedent.dedent`
  ${"import preview from '#.storybook/preview';"}
  
  ${importStatement}

  const meta = preview.meta({
    component: ${importName},
  });
  
  export const ${data.exportedStoryName} = meta.story({});
  `;
}

// src/core-server/utils/new-story-templates/javascript.ts
var import_ts_dedent2 = __toESM(require_dist(), 1);
async function getJavaScriptTemplateForNewStoryFile(data) {
  let importName = data.componentIsDefaultExport ? await getComponentVariableName(data.basenameWithoutExtension) : data.componentExportName, importStatement = data.componentIsDefaultExport ? `import ${importName} from './${data.basenameWithoutExtension}';` : `import { ${importName} } from './${data.basenameWithoutExtension}';`;
  return import_ts_dedent2.dedent`
  ${importStatement}

  const meta = {
    component: ${importName},
  };
  
  export default meta;
  
  export const ${data.exportedStoryName} = {};
  `;
}

// src/core-server/utils/new-story-templates/typescript.ts
var import_ts_dedent3 = __toESM(require_dist(), 1);
async function getTypeScriptTemplateForNewStoryFile(data) {
  let importName = data.componentIsDefaultExport ? await getComponentVariableName(data.basenameWithoutExtension) : data.componentExportName, importStatement = data.componentIsDefaultExport ? `import ${importName} from './${data.basenameWithoutExtension}'` : `import { ${importName} } from './${data.basenameWithoutExtension}'`;
  return import_ts_dedent3.dedent`
  import type { Meta, StoryObj } from '${data.frameworkPackage}';

  ${importStatement};

  const meta = {
    component: ${importName},
  } satisfies Meta<typeof ${importName}>;

  export default meta;

  type Story = StoryObj<typeof meta>;

  export const ${data.exportedStoryName}: Story = {};
  `;
}

// src/core-server/utils/get-new-story-file.ts
async function getNewStoryFile({
  componentFilePath,
  componentExportName,
  componentIsDefaultExport,
  componentExportCount
}, options) {
  let frameworkPackageName = await getFrameworkName(options), sanitizedFrameworkPackageName = extractFrameworkPackageName(frameworkPackageName), base = basename(componentFilePath), extension = extname(componentFilePath), basenameWithoutExtension = base.replace(extension, ""), dir = dirname(componentFilePath), { storyFileName, isTypescript, storyFileExtension } = getStoryMetadata(componentFilePath), storyFileNameWithExtension = `${storyFileName}.${storyFileExtension}`, alternativeStoryFileNameWithExtension = `${basenameWithoutExtension}.${componentExportName}.stories.${storyFileExtension}`, exportedStoryName = "Default", useCsfFactory = !1;
  try {
    let previewConfig = findConfigFile("preview", options.configDir);
    if (previewConfig) {
      let previewContent = await readFile(previewConfig, "utf-8");
      useCsfFactory = isCsfFactoryPreview(loadConfig(previewContent));
    }
  } catch {
  }
  let storyFileContent = "";
  return useCsfFactory ? storyFileContent = await getCsfFactoryTemplateForNewStoryFile({
    basenameWithoutExtension,
    componentExportName,
    componentIsDefaultExport,
    exportedStoryName
  }) : storyFileContent = isTypescript && frameworkPackageName ? await getTypeScriptTemplateForNewStoryFile({
    basenameWithoutExtension,
    componentExportName,
    componentIsDefaultExport,
    frameworkPackage: sanitizedFrameworkPackageName,
    exportedStoryName
  }) : await getJavaScriptTemplateForNewStoryFile({
    basenameWithoutExtension,
    componentExportName,
    componentIsDefaultExport,
    exportedStoryName
  }), { storyFilePath: doesStoryFileExist(join2(getProjectRoot(), dir), storyFileName) && componentExportCount > 1 ? join2(getProjectRoot(), dir, alternativeStoryFileNameWithExtension) : join2(getProjectRoot(), dir, storyFileNameWithExtension), exportedStoryName, storyFileContent, dirname };
}
var getStoryMetadata = (componentFilePath) => {
  let isTypescript = /\.(ts|tsx|mts|cts)$/.test(componentFilePath), base = basename(componentFilePath), extension = extname(componentFilePath), basenameWithoutExtension = base.replace(extension, ""), storyFileExtension = isTypescript ? "tsx" : "jsx";
  return {
    storyFileName: `${basenameWithoutExtension}.stories`,
    storyFileExtension,
    isTypescript
  };
}, doesStoryFileExist = (parentFolder, storyFileName) => existsSync(join2(parentFolder, `${storyFileName}.ts`)) || existsSync(join2(parentFolder, `${storyFileName}.tsx`)) || existsSync(join2(parentFolder, `${storyFileName}.js`)) || existsSync(join2(parentFolder, `${storyFileName}.jsx`));

// src/core-server/server-channel/create-new-story-channel.ts
function initCreateNewStoryChannel(channel, options, coreOptions) {
  return channel.on(
    CREATE_NEW_STORYFILE_REQUEST,
    async (data) => {
      try {
        let { storyFilePath, exportedStoryName, storyFileContent } = await getNewStoryFile(
          data.payload,
          options
        ), relativeStoryFilePath = relative(process.cwd(), storyFilePath), { storyId, kind } = await getStoryId({ storyFilePath, exportedStoryName }, options);
        if (existsSync2(storyFilePath)) {
          channel.emit(CREATE_NEW_STORYFILE_RESPONSE, {
            success: !1,
            id: data.id,
            payload: {
              type: "STORY_FILE_EXISTS",
              kind
            },
            error: `A story file already exists at ${relativeStoryFilePath}`
          }), coreOptions.disableTelemetry || telemetry("create-new-story-file", {
            success: !1,
            error: "STORY_FILE_EXISTS"
          });
          return;
        }
        await writeFile(storyFilePath, storyFileContent, "utf-8"), channel.emit(CREATE_NEW_STORYFILE_RESPONSE, {
          success: !0,
          id: data.id,
          payload: {
            storyId,
            storyFilePath: relative(process.cwd(), storyFilePath),
            exportedStoryName
          },
          error: null
        }), coreOptions.disableTelemetry || telemetry("create-new-story-file", {
          success: !0
        });
      } catch (e) {
        channel.emit(CREATE_NEW_STORYFILE_RESPONSE, {
          success: !1,
          id: data.id,
          error: e?.message
        }), coreOptions.disableTelemetry || await telemetry("create-new-story-file", {
          success: !1,
          error: e
        });
      }
    }
  ), channel;
}

// src/core-server/server-channel/file-search-channel.ts
import { readFile as readFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";
import { extractRenderer, getFrameworkName as getFrameworkName2, getProjectRoot as getProjectRoot2 } from "storybook/internal/common";
import {
  FILE_COMPONENT_SEARCH_REQUEST,
  FILE_COMPONENT_SEARCH_RESPONSE
} from "storybook/internal/core-events";
import { telemetry as telemetry2 } from "storybook/internal/telemetry";

// src/core-server/utils/parser/generic-parser.ts
import { parser, types as t } from "storybook/internal/babel";
var GenericParser = class {
  /**
   * Parse the content of a file and return the exports
   *
   * @param content The content of the file
   * @returns The exports of the file
   */
  async parse(content) {
    let ast = parser.parse(content, {
      allowImportExportEverywhere: !0,
      allowAwaitOutsideFunction: !0,
      allowNewTargetOutsideFunction: !0,
      allowReturnOutsideFunction: !0,
      allowUndeclaredExports: !0,
      plugins: [
        // Language features
        "typescript",
        "jsx",
        // Latest ECMAScript features
        "asyncGenerators",
        "bigInt",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "classStaticBlock",
        "dynamicImport",
        "exportNamespaceFrom",
        "logicalAssignment",
        "moduleStringNames",
        "nullishCoalescingOperator",
        "numericSeparator",
        "objectRestSpread",
        "optionalCatchBinding",
        "optionalChaining",
        "privateIn",
        "regexpUnicodeSets",
        "topLevelAwait",
        // ECMAScript proposals
        "asyncDoExpressions",
        "decimal",
        "decorators",
        "decoratorAutoAccessors",
        "deferredImportEvaluation",
        "destructuringPrivate",
        "doExpressions",
        "explicitResourceManagement",
        "exportDefaultFrom",
        "functionBind",
        "functionSent",
        "importAttributes",
        "importReflection",
        "moduleBlocks",
        "partialApplication",
        "recordAndTuple",
        "sourcePhaseImports",
        "throwExpressions"
      ]
    }), exports = [];
    return ast.program.body.forEach(function(node) {
      t.isExportNamedDeclaration(node) ? (t.isFunctionDeclaration(node.declaration) && t.isIdentifier(node.declaration.id) && exports.push({
        name: node.declaration.id.name,
        default: !1
      }), t.isClassDeclaration(node.declaration) && t.isIdentifier(node.declaration.id) && exports.push({
        name: node.declaration.id.name,
        default: !1
      }), node.declaration === null && node.specifiers.length > 0 && node.specifiers.forEach((specifier) => {
        t.isExportSpecifier(specifier) && t.isIdentifier(specifier.exported) && exports.push({
          name: specifier.exported.name,
          default: !1
        });
      }), t.isVariableDeclaration(node.declaration) && node.declaration.declarations.forEach((declaration) => {
        t.isVariableDeclarator(declaration) && t.isIdentifier(declaration.id) && exports.push({
          name: declaration.id.name,
          default: !1
        });
      })) : t.isExportDefaultDeclaration(node) && exports.push({
        name: "default",
        default: !0
      });
    }), { exports };
  }
};

// src/core-server/utils/parser/index.ts
function getParser(renderer) {
  return new GenericParser();
}

// src/core-server/utils/search-files.ts
var FILE_EXTENSIONS = ["js", "mjs", "cjs", "jsx", "mts", "ts", "tsx", "cts"], IGNORED_FILES = [
  "**/node_modules/**",
  "**/*.spec.*",
  "**/*.test.*",
  "**/*.stories.*",
  "**/storybook-static/**"
];
async function searchFiles({
  searchQuery,
  cwd,
  ignoredFiles = IGNORED_FILES,
  fileExtensions = FILE_EXTENSIONS
}) {
  let { globby, isDynamicPattern } = await import("../../_node-chunks/globby-YAVH4LQB.js"), hasSearchSpecialGlobChars = isDynamicPattern(searchQuery, { cwd }), searchQueryHasExtension = /(\.[a-z]+)$/i.test(searchQuery), fileExtensionsPattern = `{${fileExtensions.join(",")}}`, globbedSearchQuery = hasSearchSpecialGlobChars ? searchQuery : searchQueryHasExtension ? [`**/*${searchQuery}*`, `**/*${searchQuery}*/**`] : [
    `**/*${searchQuery}*.${fileExtensionsPattern}`,
    `**/*${searchQuery}*/**/*.${fileExtensionsPattern}`
  ];
  return (await globby(globbedSearchQuery, {
    ignore: ignoredFiles,
    gitignore: !0,
    caseSensitiveMatch: !1,
    cwd,
    objectMode: !0
  })).map((entry) => entry.path).filter((entry) => fileExtensions.some((ext) => entry.endsWith(`.${ext}`)));
}

// src/core-server/server-channel/file-search-channel.ts
async function initFileSearchChannel(channel, options, coreOptions) {
  return channel.on(
    FILE_COMPONENT_SEARCH_REQUEST,
    async (data) => {
      let searchQuery = data.id;
      try {
        if (!searchQuery)
          return;
        let frameworkName = await getFrameworkName2(options), rendererName = await extractRenderer(frameworkName), entries = (await searchFiles({
          searchQuery,
          cwd: getProjectRoot2()
        })).map(async (file) => {
          let parser3 = getParser(rendererName);
          try {
            let content = await readFile2(join3(getProjectRoot2(), file), "utf-8"), { storyFileName } = getStoryMetadata(join3(getProjectRoot2(), file)), dir = dirname2(file), storyFileExists = doesStoryFileExist(join3(getProjectRoot2(), dir), storyFileName), info = await parser3.parse(content);
            return {
              filepath: file,
              exportedComponents: info.exports,
              storyFileExists
            };
          } catch (e) {
            return coreOptions.disableTelemetry || telemetry2("create-new-story-file-search", {
              success: !1,
              error: `Could not parse file: ${e}`
            }), {
              filepath: file,
              storyFileExists: !1,
              exportedComponents: null
            };
          }
        });
        coreOptions.disableTelemetry || telemetry2("create-new-story-file-search", {
          success: !0,
          payload: {
            fileCount: entries.length
          }
        }), channel.emit(FILE_COMPONENT_SEARCH_RESPONSE, {
          success: !0,
          id: searchQuery,
          payload: {
            files: await Promise.all(entries)
          },
          error: null
        });
      } catch (e) {
        channel.emit(FILE_COMPONENT_SEARCH_RESPONSE, {
          success: !1,
          id: searchQuery ?? "",
          error: `An error occurred while searching for components in the project.
${e?.message}`
        }), coreOptions.disableTelemetry || telemetry2("create-new-story-file-search", {
          success: !1,
          error: `An error occured while searching for components: ${e}`
        });
      }
    }
  ), channel;
}

// src/core-server/server-channel/open-in-editor-channel.ts
var import_launch_editor = __toESM(require_launch_editor(), 1);
import { OPEN_IN_EDITOR_REQUEST, OPEN_IN_EDITOR_RESPONSE } from "storybook/internal/core-events";
import { telemetry as telemetry3 } from "storybook/internal/telemetry";
async function initOpenInEditorChannel(channel, _options, coreOptions) {
  return channel.on(OPEN_IN_EDITOR_REQUEST, async (payload) => {
    let sendTelemetry = (data) => {
      coreOptions.disableTelemetry || telemetry3("open-in-editor", data);
    };
    try {
      let { file: targetFile, line, column } = payload;
      if (!targetFile)
        throw new Error("No file was provided to open");
      let location = typeof line == "number" ? `${targetFile}:${line}${typeof column == "number" ? `:${column}` : ""}` : targetFile;
      await new Promise((resolve, reject) => {
        (0, import_launch_editor.default)(location, void 0, (_fileName, errorMessage) => {
          errorMessage ? reject(new Error(errorMessage)) : resolve();
        });
      }), channel.emit(OPEN_IN_EDITOR_RESPONSE, {
        file: targetFile,
        line,
        column,
        error: null
      }), sendTelemetry({ success: !0 });
    } catch (e) {
      let error = e?.message || "Failed to open in editor";
      channel.emit(OPEN_IN_EDITOR_RESPONSE, {
        error,
        ...payload
      }), sendTelemetry({ success: !1, error });
    }
  }), channel;
}

// src/core-server/server-channel/preview-initialized-channel.ts
import { PREVIEW_INITIALIZED } from "storybook/internal/core-events";
import { telemetry as telemetry4 } from "storybook/internal/telemetry";
import { getLastEvents } from "storybook/internal/telemetry";
import { getSessionId } from "storybook/internal/telemetry";
var makePayload = (userAgent, lastInit, sessionId) => {
  let payload = {
    userAgent,
    isNewUser: !1,
    timeSinceInit: void 0
  };
  return sessionId && lastInit?.body?.sessionId === sessionId && (payload.timeSinceInit = Date.now() - lastInit.timestamp, payload.isNewUser = !!lastInit.body.payload.newUser), payload;
};
function initPreviewInitializedChannel(channel, options, _coreConfig) {
  channel.on(PREVIEW_INITIALIZED, async ({ userAgent }) => {
    if (!options.disableTelemetry)
      try {
        let sessionId = await getSessionId(), lastEvents = await getLastEvents(), lastInit = lastEvents.init;
        if (!lastEvents["preview-first-load"]) {
          let payload = makePayload(userAgent, lastInit, sessionId);
          telemetry4("preview-first-load", payload);
        }
      } catch {
      }
  });
}

// src/core-server/utils/checklist.ts
import { createFileSystemCache, resolvePathInStorybookCache } from "storybook/internal/common";
import { experimental_UniversalStore } from "storybook/internal/core-server";
import { logger } from "storybook/internal/node-logger";
import { telemetry as telemetry5 } from "storybook/internal/telemetry";

// ../node_modules/es-toolkit/dist/predicate/isPrimitive.mjs
function isPrimitive(value) {
  return value == null || typeof value != "object" && typeof value != "function";
}

// ../node_modules/es-toolkit/dist/predicate/isTypedArray.mjs
function isTypedArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

// ../node_modules/es-toolkit/dist/object/clone.mjs
function clone(obj) {
  if (isPrimitive(obj))
    return obj;
  if (Array.isArray(obj) || isTypedArray(obj) || obj instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && obj instanceof SharedArrayBuffer)
    return obj.slice(0);
  let prototype = Object.getPrototypeOf(obj), Constructor = prototype.constructor;
  if (obj instanceof Date || obj instanceof Map || obj instanceof Set)
    return new Constructor(obj);
  if (obj instanceof RegExp) {
    let newRegExp = new Constructor(obj);
    return newRegExp.lastIndex = obj.lastIndex, newRegExp;
  }
  if (obj instanceof DataView)
    return new Constructor(obj.buffer.slice(0));
  if (obj instanceof Error) {
    let newError = new Constructor(obj.message);
    return newError.stack = obj.stack, newError.name = obj.name, newError.cause = obj.cause, newError;
  }
  if (typeof File < "u" && obj instanceof File)
    return new Constructor([obj], obj.name, { type: obj.type, lastModified: obj.lastModified });
  if (typeof obj == "object") {
    let newObject = Object.create(prototype);
    return Object.assign(newObject, obj);
  }
  return obj;
}

// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function isPlainObject(value) {
  if (!value || typeof value != "object")
    return !1;
  let proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null ? Object.prototype.toString.call(value) === "[object Object]" : !1;
}

// ../node_modules/es-toolkit/dist/_internal/isUnsafeProperty.mjs
function isUnsafeProperty(key) {
  return key === "__proto__";
}

// ../node_modules/es-toolkit/dist/object/mergeWith.mjs
function mergeWith(target, source, merge2) {
  let sourceKeys = Object.keys(source);
  for (let i = 0; i < sourceKeys.length; i++) {
    let key = sourceKeys[i];
    if (isUnsafeProperty(key))
      continue;
    let sourceValue = source[key], targetValue = target[key], merged = merge2(targetValue, sourceValue, key, target, source);
    merged !== void 0 ? target[key] = merged : Array.isArray(sourceValue) ? Array.isArray(targetValue) ? target[key] = mergeWith(targetValue, sourceValue, merge2) : target[key] = mergeWith([], sourceValue, merge2) : isPlainObject(sourceValue) ? isPlainObject(targetValue) ? target[key] = mergeWith(targetValue, sourceValue, merge2) : target[key] = mergeWith({}, sourceValue, merge2) : (targetValue === void 0 || sourceValue !== void 0) && (target[key] = sourceValue);
  }
  return target;
}

// ../node_modules/es-toolkit/dist/string/words.mjs
var CASE_SPLIT_PATTERN = new RegExp("\\p{Lu}?\\p{Ll}+|[0-9]+|\\p{Lu}+(?!\\p{Ll})|\\p{Emoji_Presentation}|\\p{Extended_Pictographic}|\\p{L}+", "gu");

// ../node_modules/es-toolkit/dist/object/toMerged.mjs
function toMerged(target, source) {
  return mergeWith(clone(target), source, function mergeRecursively(targetValue, sourceValue) {
    if (Array.isArray(sourceValue))
      return Array.isArray(targetValue) ? mergeWith(clone(targetValue), sourceValue, mergeRecursively) : mergeWith([], sourceValue, mergeRecursively);
    if (isPlainObject(sourceValue))
      return isPlainObject(targetValue) ? mergeWith(clone(targetValue), sourceValue, mergeRecursively) : mergeWith({}, sourceValue, mergeRecursively);
  });
}

// src/shared/checklist-store/checklistData.state.ts
var initialState = {
  items: {
    accessibilityTests: { status: "open" },
    autodocs: { status: "open" },
    ciTests: { status: "open" },
    controls: { status: "open" },
    coverage: { status: "open" },
    guidedTour: { status: "open" },
    installA11y: { status: "open" },
    installChromatic: { status: "open" },
    installDocs: { status: "open" },
    installVitest: { status: "open" },
    mdxDocs: { status: "open" },
    moreComponents: { status: "open" },
    moreStories: { status: "open" },
    onboardingSurvey: { status: "open" },
    organizeStories: { status: "open" },
    publishStorybook: { status: "open" },
    renderComponent: { status: "open" },
    runTests: { status: "open" },
    viewports: { status: "open" },
    visualTests: { status: "open" },
    whatsNewStorybook10: { status: "open" },
    writeInteractions: { status: "open" }
  },
  widget: {}
};

// src/shared/checklist-store/index.ts
var UNIVERSAL_CHECKLIST_STORE_OPTIONS = {
  id: "storybook/checklist",
  initialState
};

// src/core-server/utils/checklist.ts
async function initializeChecklist() {
  try {
    let store = experimental_UniversalStore.create({
      ...UNIVERSAL_CHECKLIST_STORE_OPTIONS,
      leader: !0
    }), cache = createFileSystemCache({
      basePath: resolvePathInStorybookCache("checklist"),
      ns: "storybook"
    }), [[userState, saveUserState], [projectState, saveProjectState]] = await Promise.all([
      globalSettings().then((settings) => {
        let save = throttle(() => settings.save(), 1e3), state = {
          items: settings.value.checklist?.items ?? {},
          widget: settings.value.checklist?.widget ?? {}
        };
        return [state, ({
          items = state.items,
          widget = state.widget
        }) => {
          settings.value.checklist = { items, widget }, save();
        }];
      }),
      cache.get("state").then((cachedState) => [{ items: cachedState?.items ?? {} }, ({ items }) => cache.set("state", { items })])
    ]);
    store.setState(
      (value) => ({
        ...toMerged(value, toMerged(userState, projectState)),
        loaded: !0
      })
    ), store.onStateChange((state, previousState) => {
      let entries = Object.entries(state.items), projectValues = {}, userValues = {};
      entries.forEach(([id, { status, mutedAt }]) => {
        status === "done" ? projectValues[id] = { status } : (status === "accepted" || status === "skipped") && (userValues[id] = { status }), mutedAt && (userValues[id] = {
          ...userValues[id],
          mutedAt
        });
      }), saveProjectState({ items: projectValues }), saveUserState({ items: userValues, widget: state.widget });
      let { mutedItems, statusItems } = entries.reduce(
        (acc, [item, { mutedAt, status }]) => {
          let prev = previousState.items[item];
          return mutedAt !== prev?.mutedAt && acc.mutedItems.push(item), status !== prev?.status && acc.statusItems.push(item), acc;
        },
        { mutedItems: [], statusItems: [] }
      );
      mutedItems.length > 0 && telemetry5("onboarding-checklist-muted", {
        items: mutedItems,
        completedItems: entries.reduce((acc, [id, { status }]) => status === "done" || status === "accepted" ? acc.concat([id]) : acc, []),
        skippedItems: entries.reduce((acc, [id, { status }]) => status === "skipped" ? acc.concat([id]) : acc, [])
      }), statusItems.forEach((item) => {
        let { status } = state.items[item];
        telemetry5("onboarding-checklist-status", { item, status });
      });
    });
  } catch (err) {
    logger.error("Failed to initialize checklist"), logger.error(err);
  }
}

// src/core-server/utils/constants.ts
var defaultStaticDirs = [
  {
    from: join(resolvePackageDir("storybook"), "assets/browser"),
    to: "/sb-common-assets"
  }
], defaultFavicon = join(resolvePackageDir("storybook"), "assets/browser/favicon.svg");

// src/core-server/utils/save-story/save-story.ts
import { writeFile as writeFile2 } from "node:fs/promises";
import { basename as basename2, join as join4 } from "node:path";
import { formatFileContent } from "storybook/internal/common";
import {
  SAVE_STORY_REQUEST,
  SAVE_STORY_RESPONSE,
  STORY_RENDERED
} from "storybook/internal/core-events";
import { storyNameFromExport, toId } from "storybook/internal/csf";
import { printCsf, readCsf } from "storybook/internal/csf-tools";
import { logger as logger2 } from "storybook/internal/node-logger";
import { isExampleStoryId, telemetry as telemetry6 } from "storybook/internal/telemetry";

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
import { types as t2, traverse } from "storybook/internal/babel";

// src/core-server/utils/save-story/utils.ts
var SaveStoryError = class extends Error {
};

// src/core-server/utils/save-story/duplicate-story-with-new-name.ts
var duplicateStoryWithNewName = (csfFile, storyName, newStoryName) => {
  let node = csfFile._storyExports[storyName], cloned = t2.cloneNode(node);
  if (!cloned)
    throw new SaveStoryError("cannot clone Node");
  let found = !1;
  if (traverse(cloned, {
    Identifier(path) {
      found || path.node.name === storyName && (found = !0, path.node.name = newStoryName);
    },
    ObjectProperty(path) {
      let key = path.get("key");
      key.isIdentifier() && key.node.name === "args" && path.remove();
    },
    noScope: !0
  }), !(t2.isCallExpression(cloned.init) && t2.isMemberExpression(cloned.init.callee) && t2.isIdentifier(cloned.init.callee.property) && cloned.init.callee.property.name === "story") && (t2.isArrowFunctionExpression(cloned.init) || t2.isCallExpression(cloned.init)))
    throw new SaveStoryError("Creating a new story based on a CSF2 story is not supported");
  return traverse(csfFile._ast, {
    Program(path) {
      path.pushContainer(
        "body",
        t2.exportNamedDeclaration(t2.variableDeclaration("const", [cloned]))
      );
    }
  }), cloned;
};

// src/core-server/utils/save-story/update-args-in-csf-file.ts
import { types as t4, traverse as traverse2 } from "storybook/internal/babel";

// src/core-server/utils/save-story/valueToAST.ts
import { parser as parser2, types as t3 } from "storybook/internal/babel";
function valueToAST(literal) {
  if (literal === null)
    return t3.nullLiteral();
  switch (typeof literal) {
    case "function":
      return parser2.parse(literal.toString(), {
        allowReturnOutsideFunction: !0,
        allowSuperOutsideMethod: !0
      }).program.body[0]?.expression;
    case "number":
      return t3.numericLiteral(literal);
    case "string":
      return t3.stringLiteral(literal);
    case "boolean":
      return t3.booleanLiteral(literal);
    case "undefined":
      return t3.identifier("undefined");
    default:
      return Array.isArray(literal) ? t3.arrayExpression(literal.map(valueToAST)) : t3.objectExpression(
        Object.keys(literal).filter((k) => typeof literal[k] < "u").map((k) => {
          let value = literal[k];
          return t3.objectProperty(t3.stringLiteral(k), valueToAST(value));
        })
      );
  }
}

// src/core-server/utils/save-story/update-args-in-csf-file.ts
var updateArgsInCsfFile = async (node, input) => {
  let found = !1, args = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, valueToAST(v)])
  );
  if (!(t4.isCallExpression(node) && t4.isMemberExpression(node.callee) && t4.isIdentifier(node.callee.property) && node.callee.property.name === "story") && (t4.isArrowFunctionExpression(node) || t4.isCallExpression(node)))
    throw new SaveStoryError("Updating a CSF2 story is not supported");
  if (t4.isObjectExpression(node)) {
    let properties = node.properties, argsProperty = properties.find((property) => {
      if (t4.isObjectProperty(property)) {
        let key = property.key;
        return t4.isIdentifier(key) && key.name === "args";
      }
      return !1;
    });
    if (argsProperty) {
      if (t4.isObjectProperty(argsProperty)) {
        let a = argsProperty.value;
        if (t4.isObjectExpression(a)) {
          a.properties.forEach((p) => {
            if (t4.isObjectProperty(p)) {
              let key = p.key;
              t4.isIdentifier(key) && key.name in args && (p.value = args[key.name], delete args[key.name]);
            }
          });
          let remainder = Object.entries(args);
          Object.keys(args).length && remainder.forEach(([key, value]) => {
            a.properties.push(t4.objectProperty(t4.identifier(key), value));
          });
        }
      }
    } else
      properties.unshift(
        t4.objectProperty(
          t4.identifier("args"),
          t4.objectExpression(
            Object.entries(args).map(([key, value]) => t4.objectProperty(t4.identifier(key), value))
          )
        )
      );
    return;
  }
  traverse2(node, {
    ObjectExpression(path) {
      if (found)
        return;
      found = !0;
      let argsProperty = path.get("properties").find((property) => {
        if (property.isObjectProperty()) {
          let key = property.get("key");
          return key.isIdentifier() && key.node.name === "args";
        }
        return !1;
      });
      if (argsProperty) {
        if (argsProperty.isObjectProperty()) {
          let a = argsProperty.get("value");
          if (a.isObjectExpression()) {
            a.traverse({
              ObjectProperty(p) {
                let key = p.get("key");
                key.isIdentifier() && key.node.name in args && (p.get("value").replaceWith(args[key.node.name]), delete args[key.node.name]);
              },
              noScope: !0
            });
            let remainder = Object.entries(args);
            Object.keys(args).length && remainder.forEach(([key, value]) => {
              a.pushContainer("properties", t4.objectProperty(t4.identifier(key), value));
            });
          }
        }
      } else
        path.unshiftContainer(
          "properties",
          t4.objectProperty(
            t4.identifier("args"),
            t4.objectExpression(
              Object.entries(args).map(([key, value]) => t4.objectProperty(t4.identifier(key), value))
            )
          )
        );
    },
    noScope: !0
  });
};

// src/core-server/utils/save-story/save-story.ts
var parseArgs = (args) => JSON.parse(args, (_, value) => value === "__sb_empty_function_arg__" ? () => {
} : value), removeExtraNewlines = (code, name) => {
  let anything = "([\\s\\S])", newline = "(\\r\\n|\\r|\\n)", closing = newline + "};" + newline, regex = new RegExp(
    // Looks for an export by the given name, considers the first closing brace on its own line
    // to be the end of the story definition.
    `^(?<before>${anything}*)(?<story>export const ${name} =${anything}+?${closing})(?<after>${anything}*)$`
  ), { before, story, after } = code.match(regex)?.groups || {};
  return story ? before + story.replaceAll(/(\r\n|\r|\n)(\r\n|\r|\n)([ \t]*[a-z0-9_]+): /gi, "$2$3:") + after : code;
};
function initializeSaveStory(channel, options, coreConfig) {
  channel.on(SAVE_STORY_REQUEST, async ({ id, payload }) => {
    let { csfId, importPath, args, name } = payload, newStoryId, newStoryName, sourceFileName, sourceFilePath, sourceStoryName;
    try {
      sourceFileName = basename2(importPath), sourceFilePath = join4(process.cwd(), importPath);
      let csf = await readCsf(sourceFilePath, {
        makeTitle: (userTitle) => userTitle || "myTitle"
      }), parsed = csf.parse(), stories = Object.entries(parsed._stories), [componentId, storyId] = csfId.split("--");
      newStoryName = name && storyNameFromExport(name), newStoryId = newStoryName && toId(componentId, newStoryName);
      let [storyName] = stories.find(([key, value]) => value.id.endsWith(`--${storyId}`)) || [];
      if (!storyName)
        throw new SaveStoryError("Source story not found.");
      if (name && csf.getStoryExport(name))
        throw new SaveStoryError("Story already exists.");
      sourceStoryName = storyNameFromExport(storyName), await updateArgsInCsfFile(
        name ? duplicateStoryWithNewName(parsed, storyName, name) : csf.getStoryExport(storyName),
        args ? parseArgs(args) : {}
      );
      let code = await formatFileContent(
        sourceFilePath,
        removeExtraNewlines(printCsf(csf).code, name || storyName)
      );
      await Promise.all([
        new Promise((resolve) => {
          channel.on(STORY_RENDERED, resolve), setTimeout(() => resolve(channel.off(STORY_RENDERED, resolve)), 3e3);
        }),
        writeFile2(sourceFilePath, code)
      ]), channel.emit(SAVE_STORY_RESPONSE, {
        id,
        success: !0,
        payload: {
          csfId,
          newStoryId,
          newStoryName,
          newStoryExportName: name,
          sourceFileContent: code,
          sourceFileName,
          sourceStoryName,
          sourceStoryExportName: storyName
        },
        error: null
      });
      let isCLIExample = isExampleStoryId(newStoryId ?? csfId);
      !coreConfig.disableTelemetry && !isCLIExample && await telemetry6("save-story", {
        action: name ? "createStory" : "updateStory",
        success: !0
      });
    } catch (error) {
      channel.emit(SAVE_STORY_RESPONSE, {
        id,
        success: !1,
        error: error instanceof SaveStoryError ? error.message : "Unknown error"
      }), logger2.error(
        `Error writing to ${sourceFilePath}:
${error.stack || error.message || error.toString()}`
      ), !coreConfig.disableTelemetry && !(error instanceof SaveStoryError) && await telemetry6("save-story", {
        action: name ? "createStory" : "updateStory",
        success: !1,
        error
      });
    }
  });
}

// src/core-server/utils/whats-new.ts
import { writeFile as writeFile3 } from "node:fs/promises";
import { findConfigFile as findConfigFile2, loadMainConfig } from "storybook/internal/common";
import {
  REQUEST_WHATS_NEW_DATA,
  RESULT_WHATS_NEW_DATA,
  SET_WHATS_NEW_CACHE,
  TELEMETRY_ERROR,
  TOGGLE_WHATS_NEW_NOTIFICATIONS
} from "storybook/internal/core-events";
import { printConfig, readConfig } from "storybook/internal/csf-tools";
import { logger as logger3 } from "storybook/internal/node-logger";
import { telemetry as telemetry7 } from "storybook/internal/telemetry";
var WHATS_NEW_CACHE = "whats-new-cache", WHATS_NEW_URL = "https://storybook.js.org/whats-new/v1";
function initializeWhatsNew(channel, options, coreOptions) {
  channel.on(SET_WHATS_NEW_CACHE, async (data) => {
    let cache = await options.cache.get(WHATS_NEW_CACHE).catch((e) => (logger3.verbose(e), {}));
    await options.cache.set(WHATS_NEW_CACHE, { ...cache, ...data });
  }), channel.on(REQUEST_WHATS_NEW_DATA, async () => {
    try {
      let post = await fetch(WHATS_NEW_URL).then(async (response) => {
        if (response.ok)
          return response.json();
        throw response;
      }), disableWhatsNewNotifications = (await loadMainConfig({ configDir: options.configDir })).core?.disableWhatsNewNotifications === !0, cache = await options.cache.get(WHATS_NEW_CACHE) ?? {}, data = {
        ...post,
        status: "SUCCESS",
        postIsRead: post.url === cache.lastReadPost,
        showNotification: post.url !== cache.lastDismissedPost && post.url !== cache.lastReadPost,
        disableWhatsNewNotifications
      };
      channel.emit(RESULT_WHATS_NEW_DATA, { data });
    } catch (e) {
      logger3.verbose(e instanceof Error ? e.message : String(e)), channel.emit(RESULT_WHATS_NEW_DATA, {
        data: { status: "ERROR" }
      });
    }
  }), channel.on(
    TOGGLE_WHATS_NEW_NOTIFICATIONS,
    async ({ disableWhatsNewNotifications }) => {
      let isTelemetryEnabled = coreOptions.disableTelemetry !== !0;
      try {
        let mainPath = findConfigFile2("main", options.configDir);
        invariant(mainPath, `unable to find Storybook main file in ${options.configDir}`);
        let main = await readConfig(mainPath);
        if (!main._exportsObject)
          throw new Error(
            "Unable to parse Storybook main file while trying to read 'core' property"
          );
        main.setFieldValue(["core", "disableWhatsNewNotifications"], disableWhatsNewNotifications), await writeFile3(mainPath, printConfig(main).code), isTelemetryEnabled && await telemetry7("core-config", { disableWhatsNewNotifications });
      } catch (error) {
        invariant(error instanceof Error), isTelemetryEnabled && await sendTelemetryError(error, "core-config", {
          cliOptions: options,
          presetOptions: { ...options, corePresets: [], overridePresets: [] },
          skipPrompt: !0
        });
      }
    }
  ), channel.on(TELEMETRY_ERROR, async (error) => {
    coreOptions.disableTelemetry !== !0 && await sendTelemetryError(error, "browser", {
      cliOptions: options,
      presetOptions: { ...options, corePresets: [], overridePresets: [] },
      skipPrompt: !0
    });
  });
}

// src/core-server/presets/common-preset.ts
var interpolate = (string, data = {}) => Object.entries(data).reduce((acc, [k, v]) => acc.replace(new RegExp(`%${k}%`, "g"), v), string), staticDirs = async (values = []) => [
  ...defaultStaticDirs,
  ...values
], favicon = async (value, options) => {
  if (value)
    return value;
  let staticDirsValue = await options.presets.apply("staticDirs"), faviconPaths = (staticDirsValue ? staticDirsValue.map((dir) => typeof dir == "string" ? dir : `${dir.from}:${dir.to}`) : []).map((dir) => {
    let results = [], normalizedDir = staticDirsValue && !isAbsolute(dir) ? getDirectoryFromWorkingDir({
      configDir: options.configDir,
      workingDir: process.cwd(),
      directory: dir
    }) : dir, { staticPath, targetEndpoint } = parseStaticDir(normalizedDir);
    return ["/favicon.svg", "/favicon.ico"].includes(targetEndpoint) && results.push(staticPath), targetEndpoint === "/" && (results.push(join(staticPath, "favicon.svg")), results.push(join(staticPath, "favicon.ico"))), results.filter((path) => existsSync3(path));
  }).reduce((l1, l2) => l1.concat(l2), []);
  return faviconPaths.length > 1 && logger4.warn(import_ts_dedent4.dedent`
      Looks like multiple favicons were detected. Using the first one.

      ${faviconPaths.join(", ")}
    `), faviconPaths[0] || defaultFavicon;
}, babel = async (_, options) => {
  let { presets } = options, babelDefault = await presets.apply("babelDefault", {}, options) ?? {};
  return {
    ...babelDefault,
    // This override makes sure that we will never transpile babel further down then the browsers that storybook supports.
    // This is needed to support the mount property of the context described here:
    // https://storybook.js.org/docs/writing-tests/interaction-testing#run-code-before-each-test
    overrides: [
      ...babelDefault?.overrides ?? [],
      {
        include: /\.(story|stories)\.[cm]?[jt]sx?$/,
        presets: [
          [
            "@babel/preset-env",
            {
              bugfixes: !0,
              targets: {
                // This is the same browser supports that we use to bundle our manager and preview code.
                chrome: 100,
                safari: 15,
                firefox: 91
              }
            }
          ]
        ]
      }
    ]
  };
}, title = (previous, options) => previous || options.packageJson?.name || !1, logLevel = (previous, options) => previous || options.loglevel || "info", previewHead = async (base, { configDir, presets }) => {
  let interpolations = await presets.apply("env");
  return getPreviewHeadTemplate(configDir, interpolations);
}, env = async () => {
  let { raw } = await loadEnvs({ production: !0 });
  return raw;
}, previewBody = async (base, { configDir, presets }) => {
  let interpolations = await presets.apply("env");
  return getPreviewBodyTemplate(configDir, interpolations);
}, typescript = () => ({
  check: !1,
  // 'react-docgen' faster than `react-docgen-typescript` but produces lower quality results
  reactDocgen: "react-docgen",
  reactDocgenTypescriptOptions: {
    shouldExtractLiteralValuesFromEnum: !0,
    shouldRemoveUndefinedFromOptional: !0,
    propFilter: (prop) => prop.parent ? !/node_modules/.test(prop.parent.fileName) : !0,
    // NOTE: this default cannot be changed
    savePropValueAsString: !0
  }
}), experimental_serverAPI = (extension, options) => {
  let removeAddon = removeAddonBase, packageManager = JsPackageManagerFactory.getPackageManager({
    configDir: options.configDir
  });
  return options.disableTelemetry || (removeAddon = async (id, opts) => (await telemetry8("remove", { addon: id, source: "api" }), removeAddonBase(id, { ...opts, packageManager }))), { ...extension, removeAddon };
}, core = async (existing, options) => ({
  ...existing,
  disableTelemetry: options.disableTelemetry === !0,
  enableCrashReports: options.enableCrashReports || optionalEnvToBoolean(process.env.STORYBOOK_ENABLE_CRASH_REPORTS)
}), features = async (existing) => ({
  ...existing,
  argTypeTargetsV7: !0,
  legacyDecoratorFileOrder: !1,
  disallowImplicitActionsInRenderV8: !0,
  viewport: !0,
  highlight: !0,
  controls: !0,
  interactions: !0,
  actions: !0,
  backgrounds: !0,
  outline: !0,
  measure: !0
}), csfIndexer = {
  test: /(stories|story)\.(m?js|ts)x?$/,
  createIndex: async (fileName, options) => (await readCsf2(fileName, options)).parse().indexInputs
}, experimental_indexers = (existingIndexers) => [csfIndexer].concat(existingIndexers || []), frameworkOptions = async (_, options) => {
  let config = await options.presets.apply("framework");
  return typeof config == "string" ? {} : typeof config > "u" ? null : config.options;
}, managerHead = async (_, options) => {
  let location = join(options.configDir, "manager-head.html");
  if (existsSync3(location)) {
    let contents = readFile3(location, { encoding: "utf8" }), interpolations = options.presets.apply("env");
    return interpolate(await contents, await interpolations);
  }
  return "";
}, experimental_serverChannel = async (channel, options) => {
  let coreOptions = await options.presets.apply("core");
  return initializeChecklist(), initializeWhatsNew(channel, options, coreOptions), initializeSaveStory(channel, options, coreOptions), initFileSearchChannel(channel, options, coreOptions), initCreateNewStoryChannel(channel, options, coreOptions), initOpenInEditorChannel(channel, options, coreOptions), initPreviewInitializedChannel(channel, options, coreOptions), channel;
}, resolvedReact = async (existing) => {
  try {
    return {
      ...existing,
      react: resolvePackageDir("react"),
      reactDom: resolvePackageDir("react-dom")
    };
  } catch {
    return existing;
  }
}, managerEntries = async (existing) => [
  join(resolvePackageDir("storybook"), "dist/core-server/presets/common-manager.js"),
  ...existing || []
];
export {
  babel,
  core,
  csfIndexer,
  env,
  experimental_indexers,
  experimental_serverAPI,
  experimental_serverChannel,
  favicon,
  features,
  frameworkOptions,
  logLevel,
  managerEntries,
  managerHead,
  previewBody,
  previewHead,
  resolvedReact,
  staticDirs,
  title,
  typescript
};
