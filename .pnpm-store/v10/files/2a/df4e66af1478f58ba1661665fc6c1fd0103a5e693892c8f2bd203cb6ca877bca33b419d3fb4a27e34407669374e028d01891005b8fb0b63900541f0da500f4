import {
  ActionBar,
  ScrollArea,
  createCopyToClipboardFunction
} from "./chunk-P4F4UVXX.js";
import {
  _defineProperty,
  _objectWithoutProperties
} from "./chunk-H6XK3RSC.js";
import "./chunk-45UGUKRX.js";
import {
  _extends
} from "./chunk-CHUV5WSW.js";
import {
  require_memoizerific
} from "./chunk-WJYERY3R.js";
import {
  __commonJS,
  __toESM
} from "./chunk-A242L54C.js";

// ../node_modules/refractor/lang/bash.js
var require_bash = __commonJS({
  "../node_modules/refractor/lang/bash.js"(exports, module) {
    "use strict";
    module.exports = bash2;
    bash2.displayName = "bash";
    bash2.aliases = ["shell"];
    function bash2(Prism) {
      (function(Prism2) {
        var envVars = "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b", commandAfterHeredoc = {
          pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
          lookbehind: !0,
          alias: "punctuation",
          // this looks reasonably well in all themes
          inside: null
          // see below
        }, insideString = {
          bash: commandAfterHeredoc,
          environment: {
            pattern: RegExp("\\$" + envVars),
            alias: "constant"
          },
          variable: [
            // [0]: Arithmetic Environment
            {
              pattern: /\$?\(\([\s\S]+?\)\)/,
              greedy: !0,
              inside: {
                // If there is a $ sign at the beginning highlight $(( and )) as variable
                variable: [
                  {
                    pattern: /(^\$\(\([\s\S]+)\)\)/,
                    lookbehind: !0
                  },
                  /^\$\(\(/
                ],
                number: /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
                // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
                operator: /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
                // If there is no $ sign at the beginning highlight (( and )) as punctuation
                punctuation: /\(\(?|\)\)?|,|;/
              }
            },
            // [1]: Command Substitution
            {
              pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
              greedy: !0,
              inside: {
                variable: /^\$\(|^`|\)$|`$/
              }
            },
            // [2]: Brace expansion
            {
              pattern: /\$\{[^}]+\}/,
              greedy: !0,
              inside: {
                operator: /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
                punctuation: /[\[\]]/,
                environment: {
                  pattern: RegExp("(\\{)" + envVars),
                  lookbehind: !0,
                  alias: "constant"
                }
              }
            },
            /\$(?:\w+|[#?*!@$])/
          ],
          // Escape sequences from echo and printf's manuals, and escaped quotes.
          entity: /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/
        };
        Prism2.languages.bash = {
          shebang: {
            pattern: /^#!\s*\/.*/,
            alias: "important"
          },
          comment: {
            pattern: /(^|[^"{\\$])#.*/,
            lookbehind: !0
          },
          "function-name": [
            // a) function foo {
            // b) foo() {
            // c) function foo() {
            // but not “foo {”
            {
              // a) and c)
              pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
              lookbehind: !0,
              alias: "function"
            },
            {
              // b)
              pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
              alias: "function"
            }
          ],
          // Highlight variable names as variables in for and select beginnings.
          "for-or-select": {
            pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
            alias: "variable",
            lookbehind: !0
          },
          // Highlight variable names as variables in the left-hand part
          // of assignments (“=” and “+=”).
          "assign-left": {
            pattern: /(^|[\s;|&]|[<>]\()\w+(?=\+?=)/,
            inside: {
              environment: {
                pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + envVars),
                lookbehind: !0,
                alias: "constant"
              }
            },
            alias: "variable",
            lookbehind: !0
          },
          string: [
            // Support for Here-documents https://en.wikipedia.org/wiki/Here_document
            {
              pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
              lookbehind: !0,
              greedy: !0,
              inside: insideString
            },
            // Here-document with quotes around the tag
            // → No expansion (so no “inside”).
            {
              pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
              lookbehind: !0,
              greedy: !0,
              inside: {
                bash: commandAfterHeredoc
              }
            },
            // “Normal” string
            {
              // https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
              pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
              lookbehind: !0,
              greedy: !0,
              inside: insideString
            },
            {
              // https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
              pattern: /(^|[^$\\])'[^']*'/,
              lookbehind: !0,
              greedy: !0
            },
            {
              // https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
              pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
              greedy: !0,
              inside: {
                entity: insideString.entity
              }
            }
          ],
          environment: {
            pattern: RegExp("\\$?" + envVars),
            alias: "constant"
          },
          variable: insideString.variable,
          function: {
            pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
            lookbehind: !0
          },
          keyword: {
            pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
            lookbehind: !0
          },
          // https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
          builtin: {
            pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
            lookbehind: !0,
            // Alias added to make those easier to distinguish from strings.
            alias: "class-name"
          },
          boolean: {
            pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
            lookbehind: !0
          },
          "file-descriptor": {
            pattern: /\B&\d\b/,
            alias: "important"
          },
          operator: {
            // Lots of redirections here, but not just that.
            pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
            inside: {
              "file-descriptor": {
                pattern: /^\d/,
                alias: "important"
              }
            }
          },
          punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
          number: {
            pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
            lookbehind: !0
          }
        }, commandAfterHeredoc.inside = Prism2.languages.bash;
        for (var toBeCopied = [
          "comment",
          "function-name",
          "for-or-select",
          "assign-left",
          "string",
          "environment",
          "function",
          "keyword",
          "builtin",
          "boolean",
          "file-descriptor",
          "operator",
          "punctuation",
          "number"
        ], inside = insideString.variable[1].inside, i = 0; i < toBeCopied.length; i++)
          inside[toBeCopied[i]] = Prism2.languages.bash[toBeCopied[i]];
        Prism2.languages.shell = Prism2.languages.bash;
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/css.js
var require_css = __commonJS({
  "../node_modules/refractor/lang/css.js"(exports, module) {
    "use strict";
    module.exports = css2;
    css2.displayName = "css";
    css2.aliases = [];
    function css2(Prism) {
      (function(Prism2) {
        var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
        Prism2.languages.css = {
          comment: /\/\*[\s\S]*?\*\//,
          atrule: {
            pattern: /@[\w-](?:[^;{\s]|\s+(?![\s{]))*(?:;|(?=\s*\{))/,
            inside: {
              rule: /^@[\w-]+/,
              "selector-function-argument": {
                pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
                lookbehind: !0,
                alias: "selector"
              },
              keyword: {
                pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
                lookbehind: !0
              }
              // See rest below
            }
          },
          url: {
            // https://drafts.csswg.org/css-values-3/#urls
            pattern: RegExp(
              "\\burl\\((?:" + string.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)",
              "i"
            ),
            greedy: !0,
            inside: {
              function: /^url/i,
              punctuation: /^\(|\)$/,
              string: {
                pattern: RegExp("^" + string.source + "$"),
                alias: "url"
              }
            }
          },
          selector: {
            pattern: RegExp(
              `(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + string.source + ")*(?=\\s*\\{)"
            ),
            lookbehind: !0
          },
          string: {
            pattern: string,
            greedy: !0
          },
          property: {
            pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
            lookbehind: !0
          },
          important: /!important\b/i,
          function: {
            pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
            lookbehind: !0
          },
          punctuation: /[(){};:,]/
        }, Prism2.languages.css.atrule.inside.rest = Prism2.languages.css;
        var markup2 = Prism2.languages.markup;
        markup2 && (markup2.tag.addInlined("style", "css"), markup2.tag.addAttribute("style", "css"));
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/graphql.js
var require_graphql = __commonJS({
  "../node_modules/refractor/lang/graphql.js"(exports, module) {
    "use strict";
    module.exports = graphql2;
    graphql2.displayName = "graphql";
    graphql2.aliases = [];
    function graphql2(Prism) {
      Prism.languages.graphql = {
        comment: /#.*/,
        description: {
          pattern: /(?:"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*")(?=\s*[a-z_])/i,
          greedy: !0,
          alias: "string",
          inside: {
            "language-markdown": {
              pattern: /(^"(?:"")?)(?!\1)[\s\S]+(?=\1$)/,
              lookbehind: !0,
              inside: Prism.languages.markdown
            }
          }
        },
        string: {
          pattern: /"""(?:[^"]|(?!""")")*"""|"(?:\\.|[^\\"\r\n])*"/,
          greedy: !0
        },
        number: /(?:\B-|\b)\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
        boolean: /\b(?:false|true)\b/,
        variable: /\$[a-z_]\w*/i,
        directive: {
          pattern: /@[a-z_]\w*/i,
          alias: "function"
        },
        "attr-name": {
          pattern: /\b[a-z_]\w*(?=\s*(?:\((?:[^()"]|"(?:\\.|[^\\"\r\n])*")*\))?:)/i,
          greedy: !0
        },
        "atom-input": {
          pattern: /\b[A-Z]\w*Input\b/,
          alias: "class-name"
        },
        scalar: /\b(?:Boolean|Float|ID|Int|String)\b/,
        constant: /\b[A-Z][A-Z_\d]*\b/,
        "class-name": {
          pattern: /(\b(?:enum|implements|interface|on|scalar|type|union)\s+|&\s*|:\s*|\[)[A-Z_]\w*/,
          lookbehind: !0
        },
        fragment: {
          pattern: /(\bfragment\s+|\.{3}\s*(?!on\b))[a-zA-Z_]\w*/,
          lookbehind: !0,
          alias: "function"
        },
        "definition-mutation": {
          pattern: /(\bmutation\s+)[a-zA-Z_]\w*/,
          lookbehind: !0,
          alias: "function"
        },
        "definition-query": {
          pattern: /(\bquery\s+)[a-zA-Z_]\w*/,
          lookbehind: !0,
          alias: "function"
        },
        keyword: /\b(?:directive|enum|extend|fragment|implements|input|interface|mutation|on|query|repeatable|scalar|schema|subscription|type|union)\b/,
        operator: /[!=|&]|\.{3}/,
        "property-query": /\w+(?=\s*\()/,
        object: /\w+(?=\s*\{)/,
        punctuation: /[!(){}\[\]:=,]/,
        property: /\w+/
      }, Prism.hooks.add("after-tokenize", function(env) {
        if (env.language !== "graphql")
          return;
        var validTokens = env.tokens.filter(function(token) {
          return typeof token != "string" && token.type !== "comment" && token.type !== "scalar";
        }), currentIndex = 0;
        function getToken(offset) {
          return validTokens[currentIndex + offset];
        }
        function isTokenType(types, offset) {
          offset = offset || 0;
          for (var i2 = 0; i2 < types.length; i2++) {
            var token = getToken(i2 + offset);
            if (!token || token.type !== types[i2])
              return !1;
          }
          return !0;
        }
        function findClosingBracket(open, close) {
          for (var stackHeight = 1, i2 = currentIndex; i2 < validTokens.length; i2++) {
            var token = validTokens[i2], content = token.content;
            if (token.type === "punctuation" && typeof content == "string") {
              if (open.test(content))
                stackHeight++;
              else if (close.test(content) && (stackHeight--, stackHeight === 0))
                return i2;
            }
          }
          return -1;
        }
        function addAlias(token, alias) {
          var aliases = token.alias;
          aliases ? Array.isArray(aliases) || (token.alias = aliases = [aliases]) : token.alias = aliases = [], aliases.push(alias);
        }
        for (; currentIndex < validTokens.length; ) {
          var startToken = validTokens[currentIndex++];
          if (startToken.type === "keyword" && startToken.content === "mutation") {
            var inputVariables = [];
            if (isTokenType(["definition-mutation", "punctuation"]) && getToken(1).content === "(") {
              currentIndex += 2;
              var definitionEnd = findClosingBracket(/^\($/, /^\)$/);
              if (definitionEnd === -1)
                continue;
              for (; currentIndex < definitionEnd; currentIndex++) {
                var t = getToken(0);
                t.type === "variable" && (addAlias(t, "variable-input"), inputVariables.push(t.content));
              }
              currentIndex = definitionEnd + 1;
            }
            if (isTokenType(["punctuation", "property-query"]) && getToken(0).content === "{" && (currentIndex++, addAlias(getToken(0), "property-mutation"), inputVariables.length > 0)) {
              var mutationEnd = findClosingBracket(/^\{$/, /^\}$/);
              if (mutationEnd === -1)
                continue;
              for (var i = currentIndex; i < mutationEnd; i++) {
                var varToken = validTokens[i];
                varToken.type === "variable" && inputVariables.indexOf(varToken.content) >= 0 && addAlias(varToken, "variable-input");
              }
            }
          }
        }
      });
    }
  }
});

// ../node_modules/refractor/lang/js-extras.js
var require_js_extras = __commonJS({
  "../node_modules/refractor/lang/js-extras.js"(exports, module) {
    "use strict";
    module.exports = jsExtras2;
    jsExtras2.displayName = "jsExtras";
    jsExtras2.aliases = [];
    function jsExtras2(Prism) {
      (function(Prism2) {
        Prism2.languages.insertBefore("javascript", "function-variable", {
          "method-variable": {
            pattern: RegExp(
              "(\\.\\s*)" + Prism2.languages.javascript["function-variable"].pattern.source
            ),
            lookbehind: !0,
            alias: ["function-variable", "method", "function", "property-access"]
          }
        }), Prism2.languages.insertBefore("javascript", "function", {
          method: {
            pattern: RegExp(
              "(\\.\\s*)" + Prism2.languages.javascript.function.source
            ),
            lookbehind: !0,
            alias: ["function", "property-access"]
          }
        }), Prism2.languages.insertBefore("javascript", "constant", {
          "known-class-name": [
            {
              // standard built-ins
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
              pattern: /\b(?:(?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)?Array|ArrayBuffer|BigInt|Boolean|DataView|Date|Error|Function|Intl|JSON|(?:Weak)?(?:Map|Set)|Math|Number|Object|Promise|Proxy|Reflect|RegExp|String|Symbol|WebAssembly)\b/,
              alias: "class-name"
            },
            {
              // errors
              pattern: /\b(?:[A-Z]\w*)Error\b/,
              alias: "class-name"
            }
          ]
        });
        function withId(source, flags) {
          return RegExp(
            source.replace(/<ID>/g, function() {
              return /(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/.source;
            }),
            flags
          );
        }
        Prism2.languages.insertBefore("javascript", "keyword", {
          imports: {
            // https://tc39.es/ecma262/#sec-imports
            pattern: withId(
              /(\bimport\b\s*)(?:<ID>(?:\s*,\s*(?:\*\s*as\s+<ID>|\{[^{}]*\}))?|\*\s*as\s+<ID>|\{[^{}]*\})(?=\s*\bfrom\b)/.source
            ),
            lookbehind: !0,
            inside: Prism2.languages.javascript
          },
          exports: {
            // https://tc39.es/ecma262/#sec-exports
            pattern: withId(
              /(\bexport\b\s*)(?:\*(?:\s*as\s+<ID>)?(?=\s*\bfrom\b)|\{[^{}]*\})/.source
            ),
            lookbehind: !0,
            inside: Prism2.languages.javascript
          }
        }), Prism2.languages.javascript.keyword.unshift(
          {
            pattern: /\b(?:as|default|export|from|import)\b/,
            alias: "module"
          },
          {
            pattern: /\b(?:await|break|catch|continue|do|else|finally|for|if|return|switch|throw|try|while|yield)\b/,
            alias: "control-flow"
          },
          {
            pattern: /\bnull\b/,
            alias: ["null", "nil"]
          },
          {
            pattern: /\bundefined\b/,
            alias: "nil"
          }
        ), Prism2.languages.insertBefore("javascript", "operator", {
          spread: {
            pattern: /\.{3}/,
            alias: "operator"
          },
          arrow: {
            pattern: /=>/,
            alias: "operator"
          }
        }), Prism2.languages.insertBefore("javascript", "punctuation", {
          "property-access": {
            pattern: withId(/(\.\s*)#?<ID>/.source),
            lookbehind: !0
          },
          "maybe-class-name": {
            pattern: /(^|[^$\w\xA0-\uFFFF])[A-Z][$\w\xA0-\uFFFF]+/,
            lookbehind: !0
          },
          dom: {
            // this contains only a few commonly used DOM variables
            pattern: /\b(?:document|(?:local|session)Storage|location|navigator|performance|window)\b/,
            alias: "variable"
          },
          console: {
            pattern: /\bconsole(?=\s*\.)/,
            alias: "class-name"
          }
        });
        for (var maybeClassNameTokens = [
          "function",
          "function-variable",
          "method",
          "method-variable",
          "property-access"
        ], i = 0; i < maybeClassNameTokens.length; i++) {
          var token = maybeClassNameTokens[i], value = Prism2.languages.javascript[token];
          Prism2.util.type(value) === "RegExp" && (value = Prism2.languages.javascript[token] = {
            pattern: value
          });
          var inside = value.inside || {};
          value.inside = inside, inside["maybe-class-name"] = /^[A-Z][\s\S]*/;
        }
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/json.js
var require_json = __commonJS({
  "../node_modules/refractor/lang/json.js"(exports, module) {
    "use strict";
    module.exports = json2;
    json2.displayName = "json";
    json2.aliases = ["webmanifest"];
    function json2(Prism) {
      Prism.languages.json = {
        property: {
          pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
          lookbehind: !0,
          greedy: !0
        },
        string: {
          pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
          lookbehind: !0,
          greedy: !0
        },
        comment: {
          pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
          greedy: !0
        },
        number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
        punctuation: /[{}[\],]/,
        operator: /:/,
        boolean: /\b(?:false|true)\b/,
        null: {
          pattern: /\bnull\b/,
          alias: "keyword"
        }
      }, Prism.languages.webmanifest = Prism.languages.json;
    }
  }
});

// ../node_modules/refractor/lang/jsx.js
var require_jsx = __commonJS({
  "../node_modules/refractor/lang/jsx.js"(exports, module) {
    "use strict";
    module.exports = jsx2;
    jsx2.displayName = "jsx";
    jsx2.aliases = [];
    function jsx2(Prism) {
      (function(Prism2) {
        var javascript = Prism2.util.clone(Prism2.languages.javascript), space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source, braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source, spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
        function re(source, flags) {
          return source = source.replace(/<S>/g, function() {
            return space;
          }).replace(/<BRACES>/g, function() {
            return braces;
          }).replace(/<SPREAD>/g, function() {
            return spread;
          }), RegExp(source, flags);
        }
        spread = re(spread).source, Prism2.languages.jsx = Prism2.languages.extend("markup", javascript), Prism2.languages.jsx.tag.pattern = re(
          /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
        ), Prism2.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/, Prism2.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/, Prism2.languages.jsx.tag.inside.tag.inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/, Prism2.languages.jsx.tag.inside.comment = javascript.comment, Prism2.languages.insertBefore(
          "inside",
          "attr-name",
          {
            spread: {
              pattern: re(/<SPREAD>/.source),
              inside: Prism2.languages.jsx
            }
          },
          Prism2.languages.jsx.tag
        ), Prism2.languages.insertBefore(
          "inside",
          "special-attr",
          {
            script: {
              // Allow for two levels of nesting
              pattern: re(/=<BRACES>/.source),
              alias: "language-javascript",
              inside: {
                "script-punctuation": {
                  pattern: /^=(?=\{)/,
                  alias: "punctuation"
                },
                rest: Prism2.languages.jsx
              }
            }
          },
          Prism2.languages.jsx.tag
        );
        var stringifyToken = function(token) {
          return token ? typeof token == "string" ? token : typeof token.content == "string" ? token.content : token.content.map(stringifyToken).join("") : "";
        }, walkTokens = function(tokens) {
          for (var openedTags = [], i = 0; i < tokens.length; i++) {
            var token = tokens[i], notTagNorBrace = !1;
            if (typeof token != "string" && (token.type === "tag" && token.content[0] && token.content[0].type === "tag" ? token.content[0].content[0].content === "</" ? openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(token.content[0].content[1]) && openedTags.pop() : token.content[token.content.length - 1].content === "/>" || openedTags.push({
              tagName: stringifyToken(token.content[0].content[1]),
              openedBraces: 0
            }) : openedTags.length > 0 && token.type === "punctuation" && token.content === "{" ? openedTags[openedTags.length - 1].openedBraces++ : openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === "punctuation" && token.content === "}" ? openedTags[openedTags.length - 1].openedBraces-- : notTagNorBrace = !0), (notTagNorBrace || typeof token == "string") && openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
              var plainText = stringifyToken(token);
              i < tokens.length - 1 && (typeof tokens[i + 1] == "string" || tokens[i + 1].type === "plain-text") && (plainText += stringifyToken(tokens[i + 1]), tokens.splice(i + 1, 1)), i > 0 && (typeof tokens[i - 1] == "string" || tokens[i - 1].type === "plain-text") && (plainText = stringifyToken(tokens[i - 1]) + plainText, tokens.splice(i - 1, 1), i--), tokens[i] = new Prism2.Token(
                "plain-text",
                plainText,
                null,
                plainText
              );
            }
            token.content && typeof token.content != "string" && walkTokens(token.content);
          }
        };
        Prism2.hooks.add("after-tokenize", function(env) {
          env.language !== "jsx" && env.language !== "tsx" || walkTokens(env.tokens);
        });
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/markdown.js
var require_markdown = __commonJS({
  "../node_modules/refractor/lang/markdown.js"(exports, module) {
    "use strict";
    module.exports = markdown2;
    markdown2.displayName = "markdown";
    markdown2.aliases = ["md"];
    function markdown2(Prism) {
      (function(Prism2) {
        var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;
        function createInline(pattern) {
          return pattern = pattern.replace(/<inner>/g, function() {
            return inner;
          }), RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + "(?:" + pattern + ")");
        }
        var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source, tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(
          /__/g,
          function() {
            return tableCell;
          }
        ), tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;
        Prism2.languages.markdown = Prism2.languages.extend("markup", {}), Prism2.languages.insertBefore("markdown", "prolog", {
          "front-matter-block": {
            pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
            lookbehind: !0,
            greedy: !0,
            inside: {
              punctuation: /^---|---$/,
              "front-matter": {
                pattern: /\S+(?:\s+\S+)*/,
                alias: ["yaml", "language-yaml"],
                inside: Prism2.languages.yaml
              }
            }
          },
          blockquote: {
            // > ...
            pattern: /^>(?:[\t ]*>)*/m,
            alias: "punctuation"
          },
          table: {
            pattern: RegExp(
              "^" + tableRow + tableLine + "(?:" + tableRow + ")*",
              "m"
            ),
            inside: {
              "table-data-rows": {
                pattern: RegExp(
                  "^(" + tableRow + tableLine + ")(?:" + tableRow + ")*$"
                ),
                lookbehind: !0,
                inside: {
                  "table-data": {
                    pattern: RegExp(tableCell),
                    inside: Prism2.languages.markdown
                  },
                  punctuation: /\|/
                }
              },
              "table-line": {
                pattern: RegExp("^(" + tableRow + ")" + tableLine + "$"),
                lookbehind: !0,
                inside: {
                  punctuation: /\||:?-{3,}:?/
                }
              },
              "table-header-row": {
                pattern: RegExp("^" + tableRow + "$"),
                inside: {
                  "table-header": {
                    pattern: RegExp(tableCell),
                    alias: "important",
                    inside: Prism2.languages.markdown
                  },
                  punctuation: /\|/
                }
              }
            }
          },
          code: [
            {
              // Prefixed by 4 spaces or 1 tab and preceded by an empty line
              pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
              lookbehind: !0,
              alias: "keyword"
            },
            {
              // ```optional language
              // code block
              // ```
              pattern: /^```[\s\S]*?^```$/m,
              greedy: !0,
              inside: {
                "code-block": {
                  pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
                  lookbehind: !0
                },
                "code-language": {
                  pattern: /^(```).+/,
                  lookbehind: !0
                },
                punctuation: /```/
              }
            }
          ],
          title: [
            {
              // title 1
              // =======
              // title 2
              // -------
              pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
              alias: "important",
              inside: {
                punctuation: /==+$|--+$/
              }
            },
            {
              // # title 1
              // ###### title 6
              pattern: /(^\s*)#.+/m,
              lookbehind: !0,
              alias: "important",
              inside: {
                punctuation: /^#+|#+$/
              }
            }
          ],
          hr: {
            // ***
            // ---
            // * * *
            // -----------
            pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
            lookbehind: !0,
            alias: "punctuation"
          },
          list: {
            // * item
            // + item
            // - item
            // 1. item
            pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
            lookbehind: !0,
            alias: "punctuation"
          },
          "url-reference": {
            // [id]: http://example.com "Optional title"
            // [id]: http://example.com 'Optional title'
            // [id]: http://example.com (Optional title)
            // [id]: <http://example.com> "Optional title"
            pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
            inside: {
              variable: {
                pattern: /^(!?\[)[^\]]+/,
                lookbehind: !0
              },
              string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
              punctuation: /^[\[\]!:]|[<>]/
            },
            alias: "url"
          },
          bold: {
            // **strong**
            // __strong__
            // allow one nested instance of italic text using the same delimiter
            pattern: createInline(
              /\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source
            ),
            lookbehind: !0,
            greedy: !0,
            inside: {
              content: {
                pattern: /(^..)[\s\S]+(?=..$)/,
                lookbehind: !0,
                inside: {}
                // see below
              },
              punctuation: /\*\*|__/
            }
          },
          italic: {
            // *em*
            // _em_
            // allow one nested instance of bold text using the same delimiter
            pattern: createInline(
              /\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source
            ),
            lookbehind: !0,
            greedy: !0,
            inside: {
              content: {
                pattern: /(^.)[\s\S]+(?=.$)/,
                lookbehind: !0,
                inside: {}
                // see below
              },
              punctuation: /[*_]/
            }
          },
          strike: {
            // ~~strike through~~
            // ~strike~
            // eslint-disable-next-line regexp/strict
            pattern: createInline(/(~~?)(?:(?!~)<inner>)+\2/.source),
            lookbehind: !0,
            greedy: !0,
            inside: {
              content: {
                pattern: /(^~~?)[\s\S]+(?=\1$)/,
                lookbehind: !0,
                inside: {}
                // see below
              },
              punctuation: /~~?/
            }
          },
          "code-snippet": {
            // `code`
            // ``code``
            pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
            lookbehind: !0,
            greedy: !0,
            alias: ["code", "keyword"]
          },
          url: {
            // [example](http://example.com "Optional title")
            // [example][id]
            // [example] [id]
            pattern: createInline(
              /!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source
            ),
            lookbehind: !0,
            greedy: !0,
            inside: {
              operator: /^!/,
              content: {
                pattern: /(^\[)[^\]]+(?=\])/,
                lookbehind: !0,
                inside: {}
                // see below
              },
              variable: {
                pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
                lookbehind: !0
              },
              url: {
                pattern: /(^\]\()[^\s)]+/,
                lookbehind: !0
              },
              string: {
                pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
                lookbehind: !0
              }
            }
          }
        }), ["url", "bold", "italic", "strike"].forEach(function(token) {
          ["url", "bold", "italic", "strike", "code-snippet"].forEach(function(inside) {
            token !== inside && (Prism2.languages.markdown[token].inside.content.inside[inside] = Prism2.languages.markdown[inside]);
          });
        }), Prism2.hooks.add("after-tokenize", function(env) {
          if (env.language !== "markdown" && env.language !== "md")
            return;
          function walkTokens(tokens) {
            if (!(!tokens || typeof tokens == "string"))
              for (var i = 0, l = tokens.length; i < l; i++) {
                var token = tokens[i];
                if (token.type !== "code") {
                  walkTokens(token.content);
                  continue;
                }
                var codeLang = token.content[1], codeBlock = token.content[3];
                if (codeLang && codeBlock && codeLang.type === "code-language" && codeBlock.type === "code-block" && typeof codeLang.content == "string") {
                  var lang = codeLang.content.replace(/\b#/g, "sharp").replace(/\b\+\+/g, "pp");
                  lang = (/[a-z][\w-]*/i.exec(lang) || [""])[0].toLowerCase();
                  var alias = "language-" + lang;
                  codeBlock.alias ? typeof codeBlock.alias == "string" ? codeBlock.alias = [codeBlock.alias, alias] : codeBlock.alias.push(alias) : codeBlock.alias = [alias];
                }
              }
          }
          walkTokens(env.tokens);
        }), Prism2.hooks.add("wrap", function(env) {
          if (env.type === "code-block") {
            for (var codeLang = "", i = 0, l = env.classes.length; i < l; i++) {
              var cls = env.classes[i], match = /language-(.+)/.exec(cls);
              if (match) {
                codeLang = match[1];
                break;
              }
            }
            var grammar = Prism2.languages[codeLang];
            if (grammar)
              env.content = Prism2.highlight(
                textContent(env.content.value),
                grammar,
                codeLang
              );
            else if (codeLang && codeLang !== "none" && Prism2.plugins.autoloader) {
              var id = "md-" + (/* @__PURE__ */ new Date()).valueOf() + "-" + Math.floor(Math.random() * 1e16);
              env.attributes.id = id, Prism2.plugins.autoloader.loadLanguages(codeLang, function() {
                var ele = document.getElementById(id);
                ele && (ele.innerHTML = Prism2.highlight(
                  ele.textContent,
                  Prism2.languages[codeLang],
                  codeLang
                ));
              });
            }
          }
        });
        var tagPattern = RegExp(Prism2.languages.markup.tag.pattern.source, "gi"), KNOWN_ENTITY_NAMES = {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"'
        }, fromCodePoint = String.fromCodePoint || String.fromCharCode;
        function textContent(html) {
          var text = html.replace(tagPattern, "");
          return text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function(m, code) {
            if (code = code.toLowerCase(), code[0] === "#") {
              var value;
              return code[1] === "x" ? value = parseInt(code.slice(2), 16) : value = Number(code.slice(1)), fromCodePoint(value);
            } else {
              var known = KNOWN_ENTITY_NAMES[code];
              return known || m;
            }
          }), text;
        }
        Prism2.languages.md = Prism2.languages.markdown;
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/markup.js
var require_markup = __commonJS({
  "../node_modules/refractor/lang/markup.js"(exports, module) {
    "use strict";
    module.exports = markup2;
    markup2.displayName = "markup";
    markup2.aliases = ["html", "mathml", "svg", "xml", "ssml", "atom", "rss"];
    function markup2(Prism) {
      Prism.languages.markup = {
        comment: {
          pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
          greedy: !0
        },
        prolog: {
          pattern: /<\?[\s\S]+?\?>/,
          greedy: !0
        },
        doctype: {
          // https://www.w3.org/TR/xml/#NT-doctypedecl
          pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
          greedy: !0,
          inside: {
            "internal-subset": {
              pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
              lookbehind: !0,
              greedy: !0,
              inside: null
              // see below
            },
            string: {
              pattern: /"[^"]*"|'[^']*'/,
              greedy: !0
            },
            punctuation: /^<!|>$|[[\]]/,
            "doctype-tag": /^DOCTYPE/i,
            name: /[^\s<>'"]+/
          }
        },
        cdata: {
          pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
          greedy: !0
        },
        tag: {
          pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
          greedy: !0,
          inside: {
            tag: {
              pattern: /^<\/?[^\s>\/]+/,
              inside: {
                punctuation: /^<\/?/,
                namespace: /^[^\s>\/:]+:/
              }
            },
            "special-attr": [],
            "attr-value": {
              pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
              inside: {
                punctuation: [
                  {
                    pattern: /^=/,
                    alias: "attr-equals"
                  },
                  /"|'/
                ]
              }
            },
            punctuation: /\/?>/,
            "attr-name": {
              pattern: /[^\s>\/]+/,
              inside: {
                namespace: /^[^\s>\/:]+:/
              }
            }
          }
        },
        entity: [
          {
            pattern: /&[\da-z]{1,8};/i,
            alias: "named-entity"
          },
          /&#x?[\da-f]{1,8};/i
        ]
      }, Prism.languages.markup.tag.inside["attr-value"].inside.entity = Prism.languages.markup.entity, Prism.languages.markup.doctype.inside["internal-subset"].inside = Prism.languages.markup, Prism.hooks.add("wrap", function(env) {
        env.type === "entity" && (env.attributes.title = env.content.value.replace(/&amp;/, "&"));
      }), Object.defineProperty(Prism.languages.markup.tag, "addInlined", {
        /**
         * Adds an inlined language to markup.
         *
         * An example of an inlined language is CSS with `<style>` tags.
         *
         * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
         * case insensitive.
         * @param {string} lang The language key.
         * @example
         * addInlined('style', 'css');
         */
        value: function(tagName, lang) {
          var includedCdataInside = {};
          includedCdataInside["language-" + lang] = {
            pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
            lookbehind: !0,
            inside: Prism.languages[lang]
          }, includedCdataInside.cdata = /^<!\[CDATA\[|\]\]>$/i;
          var inside = {
            "included-cdata": {
              pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
              inside: includedCdataInside
            }
          };
          inside["language-" + lang] = {
            pattern: /[\s\S]+/,
            inside: Prism.languages[lang]
          };
          var def = {};
          def[tagName] = {
            pattern: RegExp(
              /(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(
                /__/g,
                function() {
                  return tagName;
                }
              ),
              "i"
            ),
            lookbehind: !0,
            greedy: !0,
            inside
          }, Prism.languages.insertBefore("markup", "cdata", def);
        }
      }), Object.defineProperty(Prism.languages.markup.tag, "addAttribute", {
        /**
         * Adds an pattern to highlight languages embedded in HTML attributes.
         *
         * An example of an inlined language is CSS with `style` attributes.
         *
         * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
         * case insensitive.
         * @param {string} lang The language key.
         * @example
         * addAttribute('style', 'css');
         */
        value: function(attrName, lang) {
          Prism.languages.markup.tag.inside["special-attr"].push({
            pattern: RegExp(
              /(^|["'\s])/.source + "(?:" + attrName + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
              "i"
            ),
            lookbehind: !0,
            inside: {
              "attr-name": /^[^\s=]+/,
              "attr-value": {
                pattern: /=[\s\S]+/,
                inside: {
                  value: {
                    pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                    lookbehind: !0,
                    alias: [lang, "language-" + lang],
                    inside: Prism.languages[lang]
                  },
                  punctuation: [
                    {
                      pattern: /^=/,
                      alias: "attr-equals"
                    },
                    /"|'/
                  ]
                }
              }
            }
          });
        }
      }), Prism.languages.html = Prism.languages.markup, Prism.languages.mathml = Prism.languages.markup, Prism.languages.svg = Prism.languages.markup, Prism.languages.xml = Prism.languages.extend("markup", {}), Prism.languages.ssml = Prism.languages.xml, Prism.languages.atom = Prism.languages.xml, Prism.languages.rss = Prism.languages.xml;
    }
  }
});

// ../node_modules/refractor/lang/typescript.js
var require_typescript = __commonJS({
  "../node_modules/refractor/lang/typescript.js"(exports, module) {
    "use strict";
    module.exports = typescript2;
    typescript2.displayName = "typescript";
    typescript2.aliases = ["ts"];
    function typescript2(Prism) {
      (function(Prism2) {
        Prism2.languages.typescript = Prism2.languages.extend("javascript", {
          "class-name": {
            pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
            lookbehind: !0,
            greedy: !0,
            inside: null
            // see below
          },
          builtin: /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/
        }), Prism2.languages.typescript.keyword.push(
          /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
          // keywords that have to be followed by an identifier
          /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
          // This is for `import type *, {}`
          /\btype\b(?=\s*(?:[\{*]|$))/
        ), delete Prism2.languages.typescript.parameter, delete Prism2.languages.typescript["literal-property"];
        var typeInside = Prism2.languages.extend("typescript", {});
        delete typeInside["class-name"], Prism2.languages.typescript["class-name"].inside = typeInside, Prism2.languages.insertBefore("typescript", "function", {
          decorator: {
            pattern: /@[$\w\xA0-\uFFFF]+/,
            inside: {
              at: {
                pattern: /^@/,
                alias: "operator"
              },
              function: /^[\s\S]+/
            }
          },
          "generic-function": {
            // e.g. foo<T extends "bar" | "baz">( ...
            pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
            greedy: !0,
            inside: {
              function: /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
              generic: {
                pattern: /<[\s\S]+/,
                // everything after the first <
                alias: "class-name",
                inside: typeInside
              }
            }
          }
        }), Prism2.languages.ts = Prism2.languages.typescript;
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/tsx.js
var require_tsx = __commonJS({
  "../node_modules/refractor/lang/tsx.js"(exports, module) {
    "use strict";
    var refractorJsx = require_jsx(), refractorTypescript = require_typescript();
    module.exports = tsx2;
    tsx2.displayName = "tsx";
    tsx2.aliases = [];
    function tsx2(Prism) {
      Prism.register(refractorJsx), Prism.register(refractorTypescript), (function(Prism2) {
        var typescript2 = Prism2.util.clone(Prism2.languages.typescript);
        Prism2.languages.tsx = Prism2.languages.extend("jsx", typescript2), delete Prism2.languages.tsx.parameter, delete Prism2.languages.tsx["literal-property"];
        var tag = Prism2.languages.tsx.tag;
        tag.pattern = RegExp(
          /(^|[^\w$]|(?=<\/))/.source + "(?:" + tag.pattern.source + ")",
          tag.pattern.flags
        ), tag.lookbehind = !0;
      })(Prism);
    }
  }
});

// ../node_modules/refractor/lang/yaml.js
var require_yaml = __commonJS({
  "../node_modules/refractor/lang/yaml.js"(exports, module) {
    "use strict";
    module.exports = yaml2;
    yaml2.displayName = "yaml";
    yaml2.aliases = ["yml"];
    function yaml2(Prism) {
      (function(Prism2) {
        var anchorOrAlias = /[*&][^\s[\]{},]+/, tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/, properties = "(?:" + tag.source + "(?:[ 	]+" + anchorOrAlias.source + ")?|" + anchorOrAlias.source + "(?:[ 	]+" + tag.source + ")?)", plainKey = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(
          /<PLAIN>/g,
          function() {
            return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
          }
        ), string = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
        function createValuePattern(value, flags) {
          flags = (flags || "").replace(/m/g, "") + "m";
          var pattern = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g, function() {
            return properties;
          }).replace(/<<value>>/g, function() {
            return value;
          });
          return RegExp(pattern, flags);
        }
        Prism2.languages.yaml = {
          scalar: {
            pattern: RegExp(
              /([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(
                /<<prop>>/g,
                function() {
                  return properties;
                }
              )
            ),
            lookbehind: !0,
            alias: "string"
          },
          comment: /#.*/,
          key: {
            pattern: RegExp(
              /((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source.replace(/<<prop>>/g, function() {
                return properties;
              }).replace(/<<key>>/g, function() {
                return "(?:" + plainKey + "|" + string + ")";
              })
            ),
            lookbehind: !0,
            greedy: !0,
            alias: "atrule"
          },
          directive: {
            pattern: /(^[ \t]*)%.+/m,
            lookbehind: !0,
            alias: "important"
          },
          datetime: {
            pattern: createValuePattern(
              /\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/.source
            ),
            lookbehind: !0,
            alias: "number"
          },
          boolean: {
            pattern: createValuePattern(/false|true/.source, "i"),
            lookbehind: !0,
            alias: "important"
          },
          null: {
            pattern: createValuePattern(/null|~/.source, "i"),
            lookbehind: !0,
            alias: "important"
          },
          string: {
            pattern: createValuePattern(string),
            lookbehind: !0,
            greedy: !0
          },
          number: {
            pattern: createValuePattern(
              /[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source,
              "i"
            ),
            lookbehind: !0
          },
          tag,
          important: anchorOrAlias,
          punctuation: /---|[:[\]{}\-,|>?]|\.\.\./
        }, Prism2.languages.yml = Prism2.languages.yaml;
      })(Prism);
    }
  }
});

// ../node_modules/xtend/immutable.js
var require_immutable = __commonJS({
  "../node_modules/xtend/immutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend() {
      for (var target = {}, i = 0; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source)
          hasOwnProperty.call(source, key) && (target[key] = source[key]);
      }
      return target;
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/schema.js
var require_schema = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/schema.js"(exports, module) {
    "use strict";
    module.exports = Schema;
    var proto = Schema.prototype;
    proto.space = null;
    proto.normal = {};
    proto.property = {};
    function Schema(property, normal, space) {
      this.property = property, this.normal = normal, space && (this.space = space);
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/merge.js
var require_merge = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/merge.js"(exports, module) {
    "use strict";
    var xtend = require_immutable(), Schema = require_schema();
    module.exports = merge;
    function merge(definitions) {
      for (var length = definitions.length, property = [], normal = [], index = -1, info, space; ++index < length; )
        info = definitions[index], property.push(info.property), normal.push(info.normal), space = info.space;
      return new Schema(
        xtend.apply(null, property),
        xtend.apply(null, normal),
        space
      );
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/normalize.js
var require_normalize = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/normalize.js"(exports, module) {
    "use strict";
    module.exports = normalize;
    function normalize(value) {
      return value.toLowerCase();
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/info.js
var require_info = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/info.js"(exports, module) {
    "use strict";
    module.exports = Info;
    var proto = Info.prototype;
    proto.space = null;
    proto.attribute = null;
    proto.property = null;
    proto.boolean = !1;
    proto.booleanish = !1;
    proto.overloadedBoolean = !1;
    proto.number = !1;
    proto.commaSeparated = !1;
    proto.spaceSeparated = !1;
    proto.commaOrSpaceSeparated = !1;
    proto.mustUseProperty = !1;
    proto.defined = !1;
    function Info(property, attribute) {
      this.property = property, this.attribute = attribute;
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/types.js
var require_types = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/types.js"(exports) {
    "use strict";
    var powers = 0;
    exports.boolean = increment();
    exports.booleanish = increment();
    exports.overloadedBoolean = increment();
    exports.number = increment();
    exports.spaceSeparated = increment();
    exports.commaSeparated = increment();
    exports.commaOrSpaceSeparated = increment();
    function increment() {
      return Math.pow(2, ++powers);
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/defined-info.js
var require_defined_info = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/defined-info.js"(exports, module) {
    "use strict";
    var Info = require_info(), types = require_types();
    module.exports = DefinedInfo;
    DefinedInfo.prototype = new Info();
    DefinedInfo.prototype.defined = !0;
    var checks = [
      "boolean",
      "booleanish",
      "overloadedBoolean",
      "number",
      "commaSeparated",
      "spaceSeparated",
      "commaOrSpaceSeparated"
    ], checksLength = checks.length;
    function DefinedInfo(property, attribute, mask, space) {
      var index = -1, check;
      for (mark(this, "space", space), Info.call(this, property, attribute); ++index < checksLength; )
        check = checks[index], mark(this, check, (mask & types[check]) === types[check]);
    }
    function mark(values, key, value) {
      value && (values[key] = value);
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/create.js
var require_create = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/create.js"(exports, module) {
    "use strict";
    var normalize = require_normalize(), Schema = require_schema(), DefinedInfo = require_defined_info();
    module.exports = create;
    function create(definition) {
      var space = definition.space, mustUseProperty = definition.mustUseProperty || [], attributes = definition.attributes || {}, props = definition.properties, transform = definition.transform, property = {}, normal = {}, prop, info;
      for (prop in props)
        info = new DefinedInfo(
          prop,
          transform(attributes, prop),
          props[prop],
          space
        ), mustUseProperty.indexOf(prop) !== -1 && (info.mustUseProperty = !0), property[prop] = info, normal[normalize(prop)] = prop, normal[normalize(info.attribute)] = prop;
      return new Schema(property, normal, space);
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/xlink.js
var require_xlink = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/xlink.js"(exports, module) {
    "use strict";
    var create = require_create();
    module.exports = create({
      space: "xlink",
      transform: xlinkTransform,
      properties: {
        xLinkActuate: null,
        xLinkArcRole: null,
        xLinkHref: null,
        xLinkRole: null,
        xLinkShow: null,
        xLinkTitle: null,
        xLinkType: null
      }
    });
    function xlinkTransform(_, prop) {
      return "xlink:" + prop.slice(5).toLowerCase();
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/xml.js
var require_xml = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/xml.js"(exports, module) {
    "use strict";
    var create = require_create();
    module.exports = create({
      space: "xml",
      transform: xmlTransform,
      properties: {
        xmlLang: null,
        xmlBase: null,
        xmlSpace: null
      }
    });
    function xmlTransform(_, prop) {
      return "xml:" + prop.slice(3).toLowerCase();
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/case-sensitive-transform.js
var require_case_sensitive_transform = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/case-sensitive-transform.js"(exports, module) {
    "use strict";
    module.exports = caseSensitiveTransform;
    function caseSensitiveTransform(attributes, attribute) {
      return attribute in attributes ? attributes[attribute] : attribute;
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/util/case-insensitive-transform.js
var require_case_insensitive_transform = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/util/case-insensitive-transform.js"(exports, module) {
    "use strict";
    var caseSensitiveTransform = require_case_sensitive_transform();
    module.exports = caseInsensitiveTransform;
    function caseInsensitiveTransform(attributes, property) {
      return caseSensitiveTransform(attributes, property.toLowerCase());
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/xmlns.js
var require_xmlns = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/xmlns.js"(exports, module) {
    "use strict";
    var create = require_create(), caseInsensitiveTransform = require_case_insensitive_transform();
    module.exports = create({
      space: "xmlns",
      attributes: {
        xmlnsxlink: "xmlns:xlink"
      },
      transform: caseInsensitiveTransform,
      properties: {
        xmlns: null,
        xmlnsXLink: null
      }
    });
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/aria.js
var require_aria = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/aria.js"(exports, module) {
    "use strict";
    var types = require_types(), create = require_create(), booleanish = types.booleanish, number = types.number, spaceSeparated = types.spaceSeparated;
    module.exports = create({
      transform: ariaTransform,
      properties: {
        ariaActiveDescendant: null,
        ariaAtomic: booleanish,
        ariaAutoComplete: null,
        ariaBusy: booleanish,
        ariaChecked: booleanish,
        ariaColCount: number,
        ariaColIndex: number,
        ariaColSpan: number,
        ariaControls: spaceSeparated,
        ariaCurrent: null,
        ariaDescribedBy: spaceSeparated,
        ariaDetails: null,
        ariaDisabled: booleanish,
        ariaDropEffect: spaceSeparated,
        ariaErrorMessage: null,
        ariaExpanded: booleanish,
        ariaFlowTo: spaceSeparated,
        ariaGrabbed: booleanish,
        ariaHasPopup: null,
        ariaHidden: booleanish,
        ariaInvalid: null,
        ariaKeyShortcuts: null,
        ariaLabel: null,
        ariaLabelledBy: spaceSeparated,
        ariaLevel: number,
        ariaLive: null,
        ariaModal: booleanish,
        ariaMultiLine: booleanish,
        ariaMultiSelectable: booleanish,
        ariaOrientation: null,
        ariaOwns: spaceSeparated,
        ariaPlaceholder: null,
        ariaPosInSet: number,
        ariaPressed: booleanish,
        ariaReadOnly: booleanish,
        ariaRelevant: null,
        ariaRequired: booleanish,
        ariaRoleDescription: spaceSeparated,
        ariaRowCount: number,
        ariaRowIndex: number,
        ariaRowSpan: number,
        ariaSelected: booleanish,
        ariaSetSize: number,
        ariaSort: null,
        ariaValueMax: number,
        ariaValueMin: number,
        ariaValueNow: number,
        ariaValueText: null,
        role: null
      }
    });
    function ariaTransform(_, prop) {
      return prop === "role" ? prop : "aria-" + prop.slice(4).toLowerCase();
    }
  }
});

// ../node_modules/hastscript/node_modules/property-information/lib/html.js
var require_html = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/lib/html.js"(exports, module) {
    "use strict";
    var types = require_types(), create = require_create(), caseInsensitiveTransform = require_case_insensitive_transform(), boolean = types.boolean, overloadedBoolean = types.overloadedBoolean, booleanish = types.booleanish, number = types.number, spaceSeparated = types.spaceSeparated, commaSeparated = types.commaSeparated;
    module.exports = create({
      space: "html",
      attributes: {
        acceptcharset: "accept-charset",
        classname: "class",
        htmlfor: "for",
        httpequiv: "http-equiv"
      },
      transform: caseInsensitiveTransform,
      mustUseProperty: ["checked", "multiple", "muted", "selected"],
      properties: {
        // Standard Properties.
        abbr: null,
        accept: commaSeparated,
        acceptCharset: spaceSeparated,
        accessKey: spaceSeparated,
        action: null,
        allow: null,
        allowFullScreen: boolean,
        allowPaymentRequest: boolean,
        allowUserMedia: boolean,
        alt: null,
        as: null,
        async: boolean,
        autoCapitalize: null,
        autoComplete: spaceSeparated,
        autoFocus: boolean,
        autoPlay: boolean,
        capture: boolean,
        charSet: null,
        checked: boolean,
        cite: null,
        className: spaceSeparated,
        cols: number,
        colSpan: null,
        content: null,
        contentEditable: booleanish,
        controls: boolean,
        controlsList: spaceSeparated,
        coords: number | commaSeparated,
        crossOrigin: null,
        data: null,
        dateTime: null,
        decoding: null,
        default: boolean,
        defer: boolean,
        dir: null,
        dirName: null,
        disabled: boolean,
        download: overloadedBoolean,
        draggable: booleanish,
        encType: null,
        enterKeyHint: null,
        form: null,
        formAction: null,
        formEncType: null,
        formMethod: null,
        formNoValidate: boolean,
        formTarget: null,
        headers: spaceSeparated,
        height: number,
        hidden: boolean,
        high: number,
        href: null,
        hrefLang: null,
        htmlFor: spaceSeparated,
        httpEquiv: spaceSeparated,
        id: null,
        imageSizes: null,
        imageSrcSet: commaSeparated,
        inputMode: null,
        integrity: null,
        is: null,
        isMap: boolean,
        itemId: null,
        itemProp: spaceSeparated,
        itemRef: spaceSeparated,
        itemScope: boolean,
        itemType: spaceSeparated,
        kind: null,
        label: null,
        lang: null,
        language: null,
        list: null,
        loading: null,
        loop: boolean,
        low: number,
        manifest: null,
        max: null,
        maxLength: number,
        media: null,
        method: null,
        min: null,
        minLength: number,
        multiple: boolean,
        muted: boolean,
        name: null,
        nonce: null,
        noModule: boolean,
        noValidate: boolean,
        onAbort: null,
        onAfterPrint: null,
        onAuxClick: null,
        onBeforePrint: null,
        onBeforeUnload: null,
        onBlur: null,
        onCancel: null,
        onCanPlay: null,
        onCanPlayThrough: null,
        onChange: null,
        onClick: null,
        onClose: null,
        onContextMenu: null,
        onCopy: null,
        onCueChange: null,
        onCut: null,
        onDblClick: null,
        onDrag: null,
        onDragEnd: null,
        onDragEnter: null,
        onDragExit: null,
        onDragLeave: null,
        onDragOver: null,
        onDragStart: null,
        onDrop: null,
        onDurationChange: null,
        onEmptied: null,
        onEnded: null,
        onError: null,
        onFocus: null,
        onFormData: null,
        onHashChange: null,
        onInput: null,
        onInvalid: null,
        onKeyDown: null,
        onKeyPress: null,
        onKeyUp: null,
        onLanguageChange: null,
        onLoad: null,
        onLoadedData: null,
        onLoadedMetadata: null,
        onLoadEnd: null,
        onLoadStart: null,
        onMessage: null,
        onMessageError: null,
        onMouseDown: null,
        onMouseEnter: null,
        onMouseLeave: null,
        onMouseMove: null,
        onMouseOut: null,
        onMouseOver: null,
        onMouseUp: null,
        onOffline: null,
        onOnline: null,
        onPageHide: null,
        onPageShow: null,
        onPaste: null,
        onPause: null,
        onPlay: null,
        onPlaying: null,
        onPopState: null,
        onProgress: null,
        onRateChange: null,
        onRejectionHandled: null,
        onReset: null,
        onResize: null,
        onScroll: null,
        onSecurityPolicyViolation: null,
        onSeeked: null,
        onSeeking: null,
        onSelect: null,
        onSlotChange: null,
        onStalled: null,
        onStorage: null,
        onSubmit: null,
        onSuspend: null,
        onTimeUpdate: null,
        onToggle: null,
        onUnhandledRejection: null,
        onUnload: null,
        onVolumeChange: null,
        onWaiting: null,
        onWheel: null,
        open: boolean,
        optimum: number,
        pattern: null,
        ping: spaceSeparated,
        placeholder: null,
        playsInline: boolean,
        poster: null,
        preload: null,
        readOnly: boolean,
        referrerPolicy: null,
        rel: spaceSeparated,
        required: boolean,
        reversed: boolean,
        rows: number,
        rowSpan: number,
        sandbox: spaceSeparated,
        scope: null,
        scoped: boolean,
        seamless: boolean,
        selected: boolean,
        shape: null,
        size: number,
        sizes: null,
        slot: null,
        span: number,
        spellCheck: booleanish,
        src: null,
        srcDoc: null,
        srcLang: null,
        srcSet: commaSeparated,
        start: number,
        step: null,
        style: null,
        tabIndex: number,
        target: null,
        title: null,
        translate: null,
        type: null,
        typeMustMatch: boolean,
        useMap: null,
        value: booleanish,
        width: number,
        wrap: null,
        // Legacy.
        // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
        align: null,
        // Several. Use CSS `text-align` instead,
        aLink: null,
        // `<body>`. Use CSS `a:active {color}` instead
        archive: spaceSeparated,
        // `<object>`. List of URIs to archives
        axis: null,
        // `<td>` and `<th>`. Use `scope` on `<th>`
        background: null,
        // `<body>`. Use CSS `background-image` instead
        bgColor: null,
        // `<body>` and table elements. Use CSS `background-color` instead
        border: number,
        // `<table>`. Use CSS `border-width` instead,
        borderColor: null,
        // `<table>`. Use CSS `border-color` instead,
        bottomMargin: number,
        // `<body>`
        cellPadding: null,
        // `<table>`
        cellSpacing: null,
        // `<table>`
        char: null,
        // Several table elements. When `align=char`, sets the character to align on
        charOff: null,
        // Several table elements. When `char`, offsets the alignment
        classId: null,
        // `<object>`
        clear: null,
        // `<br>`. Use CSS `clear` instead
        code: null,
        // `<object>`
        codeBase: null,
        // `<object>`
        codeType: null,
        // `<object>`
        color: null,
        // `<font>` and `<hr>`. Use CSS instead
        compact: boolean,
        // Lists. Use CSS to reduce space between items instead
        declare: boolean,
        // `<object>`
        event: null,
        // `<script>`
        face: null,
        // `<font>`. Use CSS instead
        frame: null,
        // `<table>`
        frameBorder: null,
        // `<iframe>`. Use CSS `border` instead
        hSpace: number,
        // `<img>` and `<object>`
        leftMargin: number,
        // `<body>`
        link: null,
        // `<body>`. Use CSS `a:link {color: *}` instead
        longDesc: null,
        // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
        lowSrc: null,
        // `<img>`. Use a `<picture>`
        marginHeight: number,
        // `<body>`
        marginWidth: number,
        // `<body>`
        noResize: boolean,
        // `<frame>`
        noHref: boolean,
        // `<area>`. Use no href instead of an explicit `nohref`
        noShade: boolean,
        // `<hr>`. Use background-color and height instead of borders
        noWrap: boolean,
        // `<td>` and `<th>`
        object: null,
        // `<applet>`
        profile: null,
        // `<head>`
        prompt: null,
        // `<isindex>`
        rev: null,
        // `<link>`
        rightMargin: number,
        // `<body>`
        rules: null,
        // `<table>`
        scheme: null,
        // `<meta>`
        scrolling: booleanish,
        // `<frame>`. Use overflow in the child context
        standby: null,
        // `<object>`
        summary: null,
        // `<table>`
        text: null,
        // `<body>`. Use CSS `color` instead
        topMargin: number,
        // `<body>`
        valueType: null,
        // `<param>`
        version: null,
        // `<html>`. Use a doctype.
        vAlign: null,
        // Several. Use CSS `vertical-align` instead
        vLink: null,
        // `<body>`. Use CSS `a:visited {color}` instead
        vSpace: number,
        // `<img>` and `<object>`
        // Non-standard Properties.
        allowTransparency: null,
        autoCorrect: null,
        autoSave: null,
        disablePictureInPicture: boolean,
        disableRemotePlayback: boolean,
        prefix: null,
        property: null,
        results: number,
        security: null,
        unselectable: null
      }
    });
  }
});

// ../node_modules/hastscript/node_modules/property-information/html.js
var require_html2 = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/html.js"(exports, module) {
    "use strict";
    var merge = require_merge(), xlink = require_xlink(), xml = require_xml(), xmlns = require_xmlns(), aria = require_aria(), html = require_html();
    module.exports = merge([xml, xlink, xmlns, aria, html]);
  }
});

// ../node_modules/hastscript/node_modules/property-information/find.js
var require_find = __commonJS({
  "../node_modules/hastscript/node_modules/property-information/find.js"(exports, module) {
    "use strict";
    var normalize = require_normalize(), DefinedInfo = require_defined_info(), Info = require_info(), data = "data";
    module.exports = find;
    var valid = /^data[-\w.:]+$/i, dash = /-[a-z]/g, cap = /[A-Z]/g;
    function find(schema, value) {
      var normal = normalize(value), prop = value, Type = Info;
      return normal in schema.normal ? schema.property[schema.normal[normal]] : (normal.length > 4 && normal.slice(0, 4) === data && valid.test(value) && (value.charAt(4) === "-" ? prop = datasetToProperty(value) : value = datasetToAttribute(value), Type = DefinedInfo), new Type(prop, value));
    }
    function datasetToProperty(attribute) {
      var value = attribute.slice(5).replace(dash, camelcase);
      return data + value.charAt(0).toUpperCase() + value.slice(1);
    }
    function datasetToAttribute(property) {
      var value = property.slice(4);
      return dash.test(value) ? property : (value = value.replace(cap, kebab), value.charAt(0) !== "-" && (value = "-" + value), data + value);
    }
    function kebab($0) {
      return "-" + $0.toLowerCase();
    }
    function camelcase($0) {
      return $0.charAt(1).toUpperCase();
    }
  }
});

// ../node_modules/hast-util-parse-selector/index.js
var require_hast_util_parse_selector = __commonJS({
  "../node_modules/hast-util-parse-selector/index.js"(exports, module) {
    "use strict";
    module.exports = parse;
    var search = /[#.]/g;
    function parse(selector, defaultTagName) {
      for (var value = selector || "", name = defaultTagName || "div", props = {}, start = 0, subvalue, previous, match; start < value.length; )
        search.lastIndex = start, match = search.exec(value), subvalue = value.slice(start, match ? match.index : value.length), subvalue && (previous ? previous === "#" ? props.id = subvalue : props.className ? props.className.push(subvalue) : props.className = [subvalue] : name = subvalue, start += subvalue.length), match && (previous = match[0], start++);
      return { type: "element", tagName: name, properties: props, children: [] };
    }
  }
});

// ../node_modules/hastscript/node_modules/space-separated-tokens/index.js
var require_space_separated_tokens = __commonJS({
  "../node_modules/hastscript/node_modules/space-separated-tokens/index.js"(exports) {
    "use strict";
    exports.parse = parse;
    exports.stringify = stringify;
    var empty = "", space = " ", whiteSpace = /[ \t\n\r\f]+/g;
    function parse(value) {
      var input = String(value || empty).trim();
      return input === empty ? [] : input.split(whiteSpace);
    }
    function stringify(values) {
      return values.join(space).trim();
    }
  }
});

// ../node_modules/hastscript/node_modules/comma-separated-tokens/index.js
var require_comma_separated_tokens = __commonJS({
  "../node_modules/hastscript/node_modules/comma-separated-tokens/index.js"(exports) {
    "use strict";
    exports.parse = parse;
    exports.stringify = stringify;
    var comma = ",", space = " ", empty = "";
    function parse(value) {
      for (var values = [], input = String(value || empty), index = input.indexOf(comma), lastIndex = 0, end = !1, val; !end; )
        index === -1 && (index = input.length, end = !0), val = input.slice(lastIndex, index).trim(), (val || !end) && values.push(val), lastIndex = index + 1, index = input.indexOf(comma, lastIndex);
      return values;
    }
    function stringify(values, options) {
      var settings = options || {}, left = settings.padLeft === !1 ? empty : space, right = settings.padRight ? space : empty;
      return values[values.length - 1] === empty && (values = values.concat(empty)), values.join(right + comma + left).trim();
    }
  }
});

// ../node_modules/hastscript/factory.js
var require_factory = __commonJS({
  "../node_modules/hastscript/factory.js"(exports, module) {
    "use strict";
    var find = require_find(), normalize = require_normalize(), parseSelector = require_hast_util_parse_selector(), spaces = require_space_separated_tokens().parse, commas = require_comma_separated_tokens().parse;
    module.exports = factory;
    var own = {}.hasOwnProperty;
    function factory(schema, defaultTagName, caseSensitive) {
      var adjust = caseSensitive ? createAdjustMap(caseSensitive) : null;
      return h;
      function h(selector, properties) {
        var node = parseSelector(selector, defaultTagName), children = Array.prototype.slice.call(arguments, 2), name = node.tagName.toLowerCase(), property;
        if (node.tagName = adjust && own.call(adjust, name) ? adjust[name] : name, properties && isChildren(properties, node) && (children.unshift(properties), properties = null), properties)
          for (property in properties)
            addProperty(node.properties, property, properties[property]);
        return addChild(node.children, children), node.tagName === "template" && (node.content = { type: "root", children: node.children }, node.children = []), node;
      }
      function addProperty(properties, key, value) {
        var info, property, result;
        value == null || value !== value || (info = find(schema, key), property = info.property, result = value, typeof result == "string" && (info.spaceSeparated ? result = spaces(result) : info.commaSeparated ? result = commas(result) : info.commaOrSpaceSeparated && (result = spaces(commas(result).join(" ")))), property === "style" && typeof value != "string" && (result = style(result)), property === "className" && properties.className && (result = properties.className.concat(result)), properties[property] = parsePrimitives(info, property, result));
      }
    }
    function isChildren(value, node) {
      return typeof value == "string" || "length" in value || isNode(node.tagName, value);
    }
    function isNode(tagName, value) {
      var type = value.type;
      return tagName === "input" || !type || typeof type != "string" ? !1 : typeof value.children == "object" && "length" in value.children ? !0 : (type = type.toLowerCase(), tagName === "button" ? type !== "menu" && type !== "submit" && type !== "reset" && type !== "button" : "value" in value);
    }
    function addChild(nodes, value) {
      var index, length;
      if (typeof value == "string" || typeof value == "number") {
        nodes.push({ type: "text", value: String(value) });
        return;
      }
      if (typeof value == "object" && "length" in value) {
        for (index = -1, length = value.length; ++index < length; )
          addChild(nodes, value[index]);
        return;
      }
      if (typeof value != "object" || !("type" in value))
        throw new Error("Expected node, nodes, or string, got `" + value + "`");
      nodes.push(value);
    }
    function parsePrimitives(info, name, value) {
      var index, length, result;
      if (typeof value != "object" || !("length" in value))
        return parsePrimitive(info, name, value);
      for (length = value.length, index = -1, result = []; ++index < length; )
        result[index] = parsePrimitive(info, name, value[index]);
      return result;
    }
    function parsePrimitive(info, name, value) {
      var result = value;
      return info.number || info.positiveNumber ? !isNaN(result) && result !== "" && (result = Number(result)) : (info.boolean || info.overloadedBoolean) && typeof result == "string" && (result === "" || normalize(value) === normalize(name)) && (result = !0), result;
    }
    function style(value) {
      var result = [], key;
      for (key in value)
        result.push([key, value[key]].join(": "));
      return result.join("; ");
    }
    function createAdjustMap(values) {
      for (var length = values.length, index = -1, result = {}, value; ++index < length; )
        value = values[index], result[value.toLowerCase()] = value;
      return result;
    }
  }
});

// ../node_modules/hastscript/html.js
var require_html3 = __commonJS({
  "../node_modules/hastscript/html.js"(exports, module) {
    "use strict";
    var schema = require_html2(), factory = require_factory(), html = factory(schema, "div");
    html.displayName = "html";
    module.exports = html;
  }
});

// ../node_modules/hastscript/index.js
var require_hastscript = __commonJS({
  "../node_modules/hastscript/index.js"(exports, module) {
    "use strict";
    module.exports = require_html3();
  }
});

// ../node_modules/refractor/node_modules/character-entities-legacy/index.json
var require_character_entities_legacy = __commonJS({
  "../node_modules/refractor/node_modules/character-entities-legacy/index.json"(exports, module) {
    module.exports = {
      AElig: "\xC6",
      AMP: "&",
      Aacute: "\xC1",
      Acirc: "\xC2",
      Agrave: "\xC0",
      Aring: "\xC5",
      Atilde: "\xC3",
      Auml: "\xC4",
      COPY: "\xA9",
      Ccedil: "\xC7",
      ETH: "\xD0",
      Eacute: "\xC9",
      Ecirc: "\xCA",
      Egrave: "\xC8",
      Euml: "\xCB",
      GT: ">",
      Iacute: "\xCD",
      Icirc: "\xCE",
      Igrave: "\xCC",
      Iuml: "\xCF",
      LT: "<",
      Ntilde: "\xD1",
      Oacute: "\xD3",
      Ocirc: "\xD4",
      Ograve: "\xD2",
      Oslash: "\xD8",
      Otilde: "\xD5",
      Ouml: "\xD6",
      QUOT: '"',
      REG: "\xAE",
      THORN: "\xDE",
      Uacute: "\xDA",
      Ucirc: "\xDB",
      Ugrave: "\xD9",
      Uuml: "\xDC",
      Yacute: "\xDD",
      aacute: "\xE1",
      acirc: "\xE2",
      acute: "\xB4",
      aelig: "\xE6",
      agrave: "\xE0",
      amp: "&",
      aring: "\xE5",
      atilde: "\xE3",
      auml: "\xE4",
      brvbar: "\xA6",
      ccedil: "\xE7",
      cedil: "\xB8",
      cent: "\xA2",
      copy: "\xA9",
      curren: "\xA4",
      deg: "\xB0",
      divide: "\xF7",
      eacute: "\xE9",
      ecirc: "\xEA",
      egrave: "\xE8",
      eth: "\xF0",
      euml: "\xEB",
      frac12: "\xBD",
      frac14: "\xBC",
      frac34: "\xBE",
      gt: ">",
      iacute: "\xED",
      icirc: "\xEE",
      iexcl: "\xA1",
      igrave: "\xEC",
      iquest: "\xBF",
      iuml: "\xEF",
      laquo: "\xAB",
      lt: "<",
      macr: "\xAF",
      micro: "\xB5",
      middot: "\xB7",
      nbsp: "\xA0",
      not: "\xAC",
      ntilde: "\xF1",
      oacute: "\xF3",
      ocirc: "\xF4",
      ograve: "\xF2",
      ordf: "\xAA",
      ordm: "\xBA",
      oslash: "\xF8",
      otilde: "\xF5",
      ouml: "\xF6",
      para: "\xB6",
      plusmn: "\xB1",
      pound: "\xA3",
      quot: '"',
      raquo: "\xBB",
      reg: "\xAE",
      sect: "\xA7",
      shy: "\xAD",
      sup1: "\xB9",
      sup2: "\xB2",
      sup3: "\xB3",
      szlig: "\xDF",
      thorn: "\xFE",
      times: "\xD7",
      uacute: "\xFA",
      ucirc: "\xFB",
      ugrave: "\xF9",
      uml: "\xA8",
      uuml: "\xFC",
      yacute: "\xFD",
      yen: "\xA5",
      yuml: "\xFF"
    };
  }
});

// ../node_modules/refractor/node_modules/character-reference-invalid/index.json
var require_character_reference_invalid = __commonJS({
  "../node_modules/refractor/node_modules/character-reference-invalid/index.json"(exports, module) {
    module.exports = {
      "0": "\uFFFD",
      "128": "\u20AC",
      "130": "\u201A",
      "131": "\u0192",
      "132": "\u201E",
      "133": "\u2026",
      "134": "\u2020",
      "135": "\u2021",
      "136": "\u02C6",
      "137": "\u2030",
      "138": "\u0160",
      "139": "\u2039",
      "140": "\u0152",
      "142": "\u017D",
      "145": "\u2018",
      "146": "\u2019",
      "147": "\u201C",
      "148": "\u201D",
      "149": "\u2022",
      "150": "\u2013",
      "151": "\u2014",
      "152": "\u02DC",
      "153": "\u2122",
      "154": "\u0161",
      "155": "\u203A",
      "156": "\u0153",
      "158": "\u017E",
      "159": "\u0178"
    };
  }
});

// ../node_modules/refractor/node_modules/is-decimal/index.js
var require_is_decimal = __commonJS({
  "../node_modules/refractor/node_modules/is-decimal/index.js"(exports, module) {
    "use strict";
    module.exports = decimal;
    function decimal(character) {
      var code = typeof character == "string" ? character.charCodeAt(0) : character;
      return code >= 48 && code <= 57;
    }
  }
});

// ../node_modules/refractor/node_modules/is-hexadecimal/index.js
var require_is_hexadecimal = __commonJS({
  "../node_modules/refractor/node_modules/is-hexadecimal/index.js"(exports, module) {
    "use strict";
    module.exports = hexadecimal;
    function hexadecimal(character) {
      var code = typeof character == "string" ? character.charCodeAt(0) : character;
      return code >= 97 && code <= 102 || code >= 65 && code <= 70 || code >= 48 && code <= 57;
    }
  }
});

// ../node_modules/refractor/node_modules/is-alphabetical/index.js
var require_is_alphabetical = __commonJS({
  "../node_modules/refractor/node_modules/is-alphabetical/index.js"(exports, module) {
    "use strict";
    module.exports = alphabetical;
    function alphabetical(character) {
      var code = typeof character == "string" ? character.charCodeAt(0) : character;
      return code >= 97 && code <= 122 || code >= 65 && code <= 90;
    }
  }
});

// ../node_modules/refractor/node_modules/is-alphanumerical/index.js
var require_is_alphanumerical = __commonJS({
  "../node_modules/refractor/node_modules/is-alphanumerical/index.js"(exports, module) {
    "use strict";
    var alphabetical = require_is_alphabetical(), decimal = require_is_decimal();
    module.exports = alphanumerical;
    function alphanumerical(character) {
      return alphabetical(character) || decimal(character);
    }
  }
});

// ../node_modules/refractor/node_modules/parse-entities/decode-entity.browser.js
var require_decode_entity_browser = __commonJS({
  "../node_modules/refractor/node_modules/parse-entities/decode-entity.browser.js"(exports, module) {
    "use strict";
    var el, semicolon = 59;
    module.exports = decodeEntity;
    function decodeEntity(characters) {
      var entity = "&" + characters + ";", char;
      return el = el || document.createElement("i"), el.innerHTML = entity, char = el.textContent, char.charCodeAt(char.length - 1) === semicolon && characters !== "semi" || char === entity ? !1 : char;
    }
  }
});

// ../node_modules/refractor/node_modules/parse-entities/index.js
var require_parse_entities = __commonJS({
  "../node_modules/refractor/node_modules/parse-entities/index.js"(exports, module) {
    "use strict";
    var legacy = require_character_entities_legacy(), invalid = require_character_reference_invalid(), decimal = require_is_decimal(), hexadecimal = require_is_hexadecimal(), alphanumerical = require_is_alphanumerical(), decodeEntity = require_decode_entity_browser();
    module.exports = parseEntities;
    var own = {}.hasOwnProperty, fromCharCode = String.fromCharCode, noop = Function.prototype, defaults = {
      warning: null,
      reference: null,
      text: null,
      warningContext: null,
      referenceContext: null,
      textContext: null,
      position: {},
      additional: null,
      attribute: !1,
      nonTerminated: !0
    }, tab = 9, lineFeed = 10, formFeed = 12, space = 32, ampersand = 38, semicolon = 59, lessThan = 60, equalsTo = 61, numberSign = 35, uppercaseX = 88, lowercaseX = 120, replacementCharacter = 65533, name = "named", hexa = "hexadecimal", deci = "decimal", bases = {};
    bases[hexa] = 16;
    bases[deci] = 10;
    var tests = {};
    tests[name] = alphanumerical;
    tests[deci] = decimal;
    tests[hexa] = hexadecimal;
    var namedNotTerminated = 1, numericNotTerminated = 2, namedEmpty = 3, numericEmpty = 4, namedUnknown = 5, numericDisallowed = 6, numericProhibited = 7, messages = {};
    messages[namedNotTerminated] = "Named character references must be terminated by a semicolon";
    messages[numericNotTerminated] = "Numeric character references must be terminated by a semicolon";
    messages[namedEmpty] = "Named character references cannot be empty";
    messages[numericEmpty] = "Numeric character references cannot be empty";
    messages[namedUnknown] = "Named character references must be known";
    messages[numericDisallowed] = "Numeric character references cannot be disallowed";
    messages[numericProhibited] = "Numeric character references cannot be outside the permissible Unicode range";
    function parseEntities(value, options) {
      var settings = {}, option, key;
      options || (options = {});
      for (key in defaults)
        option = options[key], settings[key] = option ?? defaults[key];
      return (settings.position.indent || settings.position.start) && (settings.indent = settings.position.indent || [], settings.position = settings.position.start), parse(value, settings);
    }
    function parse(value, settings) {
      var additional = settings.additional, nonTerminated = settings.nonTerminated, handleText = settings.text, handleReference = settings.reference, handleWarning = settings.warning, textContext = settings.textContext, referenceContext = settings.referenceContext, warningContext = settings.warningContext, pos = settings.position, indent = settings.indent || [], length = value.length, index = 0, lines = -1, column = pos.column || 1, line = pos.line || 1, queue = "", result = [], entityCharacters, namedEntity, terminated, characters, character, reference, following, warning, reason, output, entity, begin, start, type, test, prev, next, diff, end;
      for (typeof additional == "string" && (additional = additional.charCodeAt(0)), prev = now(), warning = handleWarning ? parseError : noop, index--, length++; ++index < length; )
        if (character === lineFeed && (column = indent[lines] || 1), character = value.charCodeAt(index), character === ampersand) {
          if (following = value.charCodeAt(index + 1), following === tab || following === lineFeed || following === formFeed || following === space || following === ampersand || following === lessThan || following !== following || additional && following === additional) {
            queue += fromCharCode(character), column++;
            continue;
          }
          for (start = index + 1, begin = start, end = start, following === numberSign ? (end = ++begin, following = value.charCodeAt(end), following === uppercaseX || following === lowercaseX ? (type = hexa, end = ++begin) : type = deci) : type = name, entityCharacters = "", entity = "", characters = "", test = tests[type], end--; ++end < length && (following = value.charCodeAt(end), !!test(following)); )
            characters += fromCharCode(following), type === name && own.call(legacy, characters) && (entityCharacters = characters, entity = legacy[characters]);
          terminated = value.charCodeAt(end) === semicolon, terminated && (end++, namedEntity = type === name ? decodeEntity(characters) : !1, namedEntity && (entityCharacters = characters, entity = namedEntity)), diff = 1 + end - start, !terminated && !nonTerminated || (characters ? type === name ? (terminated && !entity ? warning(namedUnknown, 1) : (entityCharacters !== characters && (end = begin + entityCharacters.length, diff = 1 + end - begin, terminated = !1), terminated || (reason = entityCharacters ? namedNotTerminated : namedEmpty, settings.attribute ? (following = value.charCodeAt(end), following === equalsTo ? (warning(reason, diff), entity = null) : alphanumerical(following) ? entity = null : warning(reason, diff)) : warning(reason, diff))), reference = entity) : (terminated || warning(numericNotTerminated, diff), reference = parseInt(characters, bases[type]), prohibited(reference) ? (warning(numericProhibited, diff), reference = fromCharCode(replacementCharacter)) : reference in invalid ? (warning(numericDisallowed, diff), reference = invalid[reference]) : (output = "", disallowed(reference) && warning(numericDisallowed, diff), reference > 65535 && (reference -= 65536, output += fromCharCode(reference >>> 10 | 55296), reference = 56320 | reference & 1023), reference = output + fromCharCode(reference))) : type !== name && warning(numericEmpty, diff)), reference ? (flush(), prev = now(), index = end - 1, column += end - start + 1, result.push(reference), next = now(), next.offset++, handleReference && handleReference.call(
            referenceContext,
            reference,
            { start: prev, end: next },
            value.slice(start - 1, end)
          ), prev = next) : (characters = value.slice(start - 1, end), queue += characters, column += characters.length, index = end - 1);
        } else
          character === 10 && (line++, lines++, column = 0), character === character ? (queue += fromCharCode(character), column++) : flush();
      return result.join("");
      function now() {
        return {
          line,
          column,
          offset: index + (pos.offset || 0)
        };
      }
      function parseError(code, offset) {
        var position = now();
        position.column += offset, position.offset += offset, handleWarning.call(warningContext, messages[code], position, code);
      }
      function flush() {
        queue && (result.push(queue), handleText && handleText.call(textContext, queue, { start: prev, end: now() }), queue = "");
      }
    }
    function prohibited(code) {
      return code >= 55296 && code <= 57343 || code > 1114111;
    }
    function disallowed(code) {
      return code >= 1 && code <= 8 || code === 11 || code >= 13 && code <= 31 || code >= 127 && code <= 159 || code >= 64976 && code <= 65007 || (code & 65535) === 65535 || (code & 65535) === 65534;
    }
  }
});

// ../node_modules/refractor/node_modules/prismjs/components/prism-core.js
var require_prism_core = __commonJS({
  "../node_modules/refractor/node_modules/prismjs/components/prism-core.js"(exports, module) {
    var _self = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
    var Prism = (function(_self2) {
      var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, uniqueId = 0, plainTextGrammar = {}, _ = {
        /**
         * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
         * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
         * additional languages or plugins yourself.
         *
         * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
         *
         * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.manual = true;
         * // add a new <script> to load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        manual: _self2.Prism && _self2.Prism.manual,
        /**
         * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
         * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
         * own worker, you don't want it to do this.
         *
         * By setting this value to `true`, Prism will not add its own listeners to the worker.
         *
         * You obviously have to change this value before Prism executes. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.disableWorkerMessageHandler = true;
         * // Load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        disableWorkerMessageHandler: _self2.Prism && _self2.Prism.disableWorkerMessageHandler,
        /**
         * A namespace for utility methods.
         *
         * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
         * change or disappear at any time.
         *
         * @namespace
         * @memberof Prism
         */
        util: {
          encode: function encode(tokens) {
            return tokens instanceof Token ? new Token(tokens.type, encode(tokens.content), tokens.alias) : Array.isArray(tokens) ? tokens.map(encode) : tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
          },
          /**
           * Returns the name of the type of the given value.
           *
           * @param {any} o
           * @returns {string}
           * @example
           * type(null)      === 'Null'
           * type(undefined) === 'Undefined'
           * type(123)       === 'Number'
           * type('foo')     === 'String'
           * type(true)      === 'Boolean'
           * type([1, 2])    === 'Array'
           * type({})        === 'Object'
           * type(String)    === 'Function'
           * type(/abc+/)    === 'RegExp'
           */
          type: function(o) {
            return Object.prototype.toString.call(o).slice(8, -1);
          },
          /**
           * Returns a unique number for the given object. Later calls will still return the same number.
           *
           * @param {Object} obj
           * @returns {number}
           */
          objId: function(obj) {
            return obj.__id || Object.defineProperty(obj, "__id", { value: ++uniqueId }), obj.__id;
          },
          /**
           * Creates a deep clone of the given object.
           *
           * The main intended use of this function is to clone language definitions.
           *
           * @param {T} o
           * @param {Record<number, any>} [visited]
           * @returns {T}
           * @template T
           */
          clone: function deepClone(o, visited) {
            visited = visited || {};
            var clone, id;
            switch (_.util.type(o)) {
              case "Object":
                if (id = _.util.objId(o), visited[id])
                  return visited[id];
                clone = /** @type {Record<string, any>} */
                {}, visited[id] = clone;
                for (var key in o)
                  o.hasOwnProperty(key) && (clone[key] = deepClone(o[key], visited));
                return (
                  /** @type {any} */
                  clone
                );
              case "Array":
                return id = _.util.objId(o), visited[id] ? visited[id] : (clone = [], visited[id] = clone, /** @type {Array} */
                /** @type {any} */
                o.forEach(function(v, i) {
                  clone[i] = deepClone(v, visited);
                }), /** @type {any} */
                clone);
              default:
                return o;
            }
          },
          /**
           * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
           *
           * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
           *
           * @param {Element} element
           * @returns {string}
           */
          getLanguage: function(element) {
            for (; element; ) {
              var m = lang.exec(element.className);
              if (m)
                return m[1].toLowerCase();
              element = element.parentElement;
            }
            return "none";
          },
          /**
           * Sets the Prism `language-xxxx` class of the given element.
           *
           * @param {Element} element
           * @param {string} language
           * @returns {void}
           */
          setLanguage: function(element, language) {
            element.className = element.className.replace(RegExp(lang, "gi"), ""), element.classList.add("language-" + language);
          },
          /**
           * Returns the script element that is currently executing.
           *
           * This does __not__ work for line script element.
           *
           * @returns {HTMLScriptElement | null}
           */
          currentScript: function() {
            if (typeof document > "u")
              return null;
            if ("currentScript" in document)
              return (
                /** @type {any} */
                document.currentScript
              );
            try {
              throw new Error();
            } catch (err) {
              var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
              if (src) {
                var scripts = document.getElementsByTagName("script");
                for (var i in scripts)
                  if (scripts[i].src == src)
                    return scripts[i];
              }
              return null;
            }
          },
          /**
           * Returns whether a given class is active for `element`.
           *
           * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
           * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
           * given class is just the given class with a `no-` prefix.
           *
           * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
           * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
           * ancestors have the given class or the negated version of it, then the default activation will be returned.
           *
           * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
           * version of it, the class is considered active.
           *
           * @param {Element} element
           * @param {string} className
           * @param {boolean} [defaultActivation=false]
           * @returns {boolean}
           */
          isActive: function(element, className, defaultActivation) {
            for (var no = "no-" + className; element; ) {
              var classList = element.classList;
              if (classList.contains(className))
                return !0;
              if (classList.contains(no))
                return !1;
              element = element.parentElement;
            }
            return !!defaultActivation;
          }
        },
        /**
         * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
         *
         * @namespace
         * @memberof Prism
         * @public
         */
        languages: {
          /**
           * The grammar for plain, unformatted text.
           */
          plain: plainTextGrammar,
          plaintext: plainTextGrammar,
          text: plainTextGrammar,
          txt: plainTextGrammar,
          /**
           * Creates a deep copy of the language with the given id and appends the given tokens.
           *
           * If a token in `redef` also appears in the copied language, then the existing token in the copied language
           * will be overwritten at its original position.
           *
           * ## Best practices
           *
           * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
           * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
           * understand the language definition because, normally, the order of tokens matters in Prism grammars.
           *
           * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
           * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
           *
           * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
           * @param {Grammar} redef The new tokens to append.
           * @returns {Grammar} The new language created.
           * @public
           * @example
           * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
           *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
           *     // at its original position
           *     'comment': { ... },
           *     // CSS doesn't have a 'color' token, so this token will be appended
           *     'color': /\b(?:red|green|blue)\b/
           * });
           */
          extend: function(id, redef) {
            var lang2 = _.util.clone(_.languages[id]);
            for (var key in redef)
              lang2[key] = redef[key];
            return lang2;
          },
          /**
           * Inserts tokens _before_ another token in a language definition or any other grammar.
           *
           * ## Usage
           *
           * This helper method makes it easy to modify existing languages. For example, the CSS language definition
           * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
           * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
           * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
           * this:
           *
           * ```js
           * Prism.languages.markup.style = {
           *     // token
           * };
           * ```
           *
           * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
           * before existing tokens. For the CSS example above, you would use it like this:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'cdata', {
           *     'style': {
           *         // token
           *     }
           * });
           * ```
           *
           * ## Special cases
           *
           * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
           * will be ignored.
           *
           * This behavior can be used to insert tokens after `before`:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'comment', {
           *     'comment': Prism.languages.markup.comment,
           *     // tokens after 'comment'
           * });
           * ```
           *
           * ## Limitations
           *
           * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
           * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
           * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
           * deleting properties which is necessary to insert at arbitrary positions.
           *
           * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
           * Instead, it will create a new object and replace all references to the target object with the new one. This
           * can be done without temporarily deleting properties, so the iteration order is well-defined.
           *
           * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
           * you hold the target object in a variable, then the value of the variable will not change.
           *
           * ```js
           * var oldMarkup = Prism.languages.markup;
           * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
           *
           * assert(oldMarkup !== Prism.languages.markup);
           * assert(newMarkup === Prism.languages.markup);
           * ```
           *
           * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
           * object to be modified.
           * @param {string} before The key to insert before.
           * @param {Grammar} insert An object containing the key-value pairs to be inserted.
           * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
           * object to be modified.
           *
           * Defaults to `Prism.languages`.
           * @returns {Grammar} The new grammar object.
           * @public
           */
          insertBefore: function(inside, before, insert, root) {
            root = root || /** @type {any} */
            _.languages;
            var grammar = root[inside], ret = {};
            for (var token in grammar)
              if (grammar.hasOwnProperty(token)) {
                if (token == before)
                  for (var newToken in insert)
                    insert.hasOwnProperty(newToken) && (ret[newToken] = insert[newToken]);
                insert.hasOwnProperty(token) || (ret[token] = grammar[token]);
              }
            var old = root[inside];
            return root[inside] = ret, _.languages.DFS(_.languages, function(key, value) {
              value === old && key != inside && (this[key] = ret);
            }), ret;
          },
          // Traverse a language definition with Depth First Search
          DFS: function DFS(o, callback, type, visited) {
            visited = visited || {};
            var objId = _.util.objId;
            for (var i in o)
              if (o.hasOwnProperty(i)) {
                callback.call(o, i, o[i], type || i);
                var property = o[i], propertyType = _.util.type(property);
                propertyType === "Object" && !visited[objId(property)] ? (visited[objId(property)] = !0, DFS(property, callback, null, visited)) : propertyType === "Array" && !visited[objId(property)] && (visited[objId(property)] = !0, DFS(property, callback, i, visited));
              }
          }
        },
        plugins: {},
        /**
         * This is the most high-level function in Prism’s API.
         * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
         * each one of them.
         *
         * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
         *
         * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
         * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
         * @memberof Prism
         * @public
         */
        highlightAll: function(async, callback) {
          _.highlightAllUnder(document, async, callback);
        },
        /**
         * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
         * {@link Prism.highlightElement} on each one of them.
         *
         * The following hooks will be run:
         * 1. `before-highlightall`
         * 2. `before-all-elements-highlight`
         * 3. All hooks of {@link Prism.highlightElement} for each element.
         *
         * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
         * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
         * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
         * @memberof Prism
         * @public
         */
        highlightAllUnder: function(container, async, callback) {
          var env = {
            callback,
            container,
            selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          _.hooks.run("before-highlightall", env), env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector)), _.hooks.run("before-all-elements-highlight", env);
          for (var i = 0, element; element = env.elements[i++]; )
            _.highlightElement(element, async === !0, env.callback);
        },
        /**
         * Highlights the code inside a single element.
         *
         * The following hooks will be run:
         * 1. `before-sanity-check`
         * 2. `before-highlight`
         * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
         * 4. `before-insert`
         * 5. `after-highlight`
         * 6. `complete`
         *
         * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
         * the element's language.
         *
         * @param {Element} element The element containing the code.
         * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
         * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
         * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
         * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
         *
         * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
         * asynchronous highlighting to work. You can build your own bundle on the
         * [Download page](https://prismjs.com/download.html).
         * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
         * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
         * @memberof Prism
         * @public
         */
        highlightElement: function(element, async, callback) {
          var language = _.util.getLanguage(element), grammar = _.languages[language];
          _.util.setLanguage(element, language);
          var parent = element.parentElement;
          parent && parent.nodeName.toLowerCase() === "pre" && _.util.setLanguage(parent, language);
          var code = element.textContent, env = {
            element,
            language,
            grammar,
            code
          };
          function insertHighlightedCode(highlightedCode) {
            env.highlightedCode = highlightedCode, _.hooks.run("before-insert", env), env.element.innerHTML = env.highlightedCode, _.hooks.run("after-highlight", env), _.hooks.run("complete", env), callback && callback.call(env.element);
          }
          if (_.hooks.run("before-sanity-check", env), parent = env.element.parentElement, parent && parent.nodeName.toLowerCase() === "pre" && !parent.hasAttribute("tabindex") && parent.setAttribute("tabindex", "0"), !env.code) {
            _.hooks.run("complete", env), callback && callback.call(env.element);
            return;
          }
          if (_.hooks.run("before-highlight", env), !env.grammar) {
            insertHighlightedCode(_.util.encode(env.code));
            return;
          }
          if (async && _self2.Worker) {
            var worker = new Worker(_.filename);
            worker.onmessage = function(evt) {
              insertHighlightedCode(evt.data);
            }, worker.postMessage(JSON.stringify({
              language: env.language,
              code: env.code,
              immediateClose: !0
            }));
          } else
            insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
        },
        /**
         * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
         * and the language definitions to use, and returns a string with the HTML produced.
         *
         * The following hooks will be run:
         * 1. `before-tokenize`
         * 2. `after-tokenize`
         * 3. `wrap`: On each {@link Token}.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @param {string} language The name of the language definition passed to `grammar`.
         * @returns {string} The highlighted HTML.
         * @memberof Prism
         * @public
         * @example
         * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
         */
        highlight: function(text, grammar, language) {
          var env = {
            code: text,
            grammar,
            language
          };
          if (_.hooks.run("before-tokenize", env), !env.grammar)
            throw new Error('The language "' + env.language + '" has no grammar.');
          return env.tokens = _.tokenize(env.code, env.grammar), _.hooks.run("after-tokenize", env), Token.stringify(_.util.encode(env.tokens), env.language);
        },
        /**
         * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
         * and the language definitions to use, and returns an array with the tokenized code.
         *
         * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
         *
         * This method could be useful in other contexts as well, as a very crude parser.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @returns {TokenStream} An array of strings and tokens, a token stream.
         * @memberof Prism
         * @public
         * @example
         * let code = `var foo = 0;`;
         * let tokens = Prism.tokenize(code, Prism.languages.javascript);
         * tokens.forEach(token => {
         *     if (token instanceof Prism.Token && token.type === 'number') {
         *         console.log(`Found numeric literal: ${token.content}`);
         *     }
         * });
         */
        tokenize: function(text, grammar) {
          var rest = grammar.rest;
          if (rest) {
            for (var token in rest)
              grammar[token] = rest[token];
            delete grammar.rest;
          }
          var tokenList = new LinkedList();
          return addAfter(tokenList, tokenList.head, text), matchGrammar(text, tokenList, grammar, tokenList.head, 0), toArray(tokenList);
        },
        /**
         * @namespace
         * @memberof Prism
         * @public
         */
        hooks: {
          all: {},
          /**
           * Adds the given callback to the list of callbacks for the given hook.
           *
           * The callback will be invoked when the hook it is registered for is run.
           * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
           *
           * One callback function can be registered to multiple hooks and the same hook multiple times.
           *
           * @param {string} name The name of the hook.
           * @param {HookCallback} callback The callback function which is given environment variables.
           * @public
           */
          add: function(name, callback) {
            var hooks = _.hooks.all;
            hooks[name] = hooks[name] || [], hooks[name].push(callback);
          },
          /**
           * Runs a hook invoking all registered callbacks with the given environment variables.
           *
           * Callbacks will be invoked synchronously and in the order in which they were registered.
           *
           * @param {string} name The name of the hook.
           * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
           * @public
           */
          run: function(name, env) {
            var callbacks = _.hooks.all[name];
            if (!(!callbacks || !callbacks.length))
              for (var i = 0, callback; callback = callbacks[i++]; )
                callback(env);
          }
        },
        Token
      };
      _self2.Prism = _;
      function Token(type, content, alias, matchedStr) {
        this.type = type, this.content = content, this.alias = alias, this.length = (matchedStr || "").length | 0;
      }
      Token.stringify = function stringify(o, language) {
        if (typeof o == "string")
          return o;
        if (Array.isArray(o)) {
          var s = "";
          return o.forEach(function(e) {
            s += stringify(e, language);
          }), s;
        }
        var env = {
          type: o.type,
          content: stringify(o.content, language),
          tag: "span",
          classes: ["token", o.type],
          attributes: {},
          language
        }, aliases = o.alias;
        aliases && (Array.isArray(aliases) ? Array.prototype.push.apply(env.classes, aliases) : env.classes.push(aliases)), _.hooks.run("wrap", env);
        var attributes = "";
        for (var name in env.attributes)
          attributes += " " + name + '="' + (env.attributes[name] || "").replace(/"/g, "&quot;") + '"';
        return "<" + env.tag + ' class="' + env.classes.join(" ") + '"' + attributes + ">" + env.content + "</" + env.tag + ">";
      };
      function matchPattern(pattern, pos, text, lookbehind) {
        pattern.lastIndex = pos;
        var match = pattern.exec(text);
        if (match && lookbehind && match[1]) {
          var lookbehindLength = match[1].length;
          match.index += lookbehindLength, match[0] = match[0].slice(lookbehindLength);
        }
        return match;
      }
      function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
        for (var token in grammar)
          if (!(!grammar.hasOwnProperty(token) || !grammar[token])) {
            var patterns = grammar[token];
            patterns = Array.isArray(patterns) ? patterns : [patterns];
            for (var j = 0; j < patterns.length; ++j) {
              if (rematch && rematch.cause == token + "," + j)
                return;
              var patternObj = patterns[j], inside = patternObj.inside, lookbehind = !!patternObj.lookbehind, greedy = !!patternObj.greedy, alias = patternObj.alias;
              if (greedy && !patternObj.pattern.global) {
                var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
                patternObj.pattern = RegExp(patternObj.pattern.source, flags + "g");
              }
              for (var pattern = patternObj.pattern || patternObj, currentNode = startNode.next, pos = startPos; currentNode !== tokenList.tail && !(rematch && pos >= rematch.reach); pos += currentNode.value.length, currentNode = currentNode.next) {
                var str = currentNode.value;
                if (tokenList.length > text.length)
                  return;
                if (!(str instanceof Token)) {
                  var removeCount = 1, match;
                  if (greedy) {
                    if (match = matchPattern(pattern, pos, text, lookbehind), !match || match.index >= text.length)
                      break;
                    var from = match.index, to = match.index + match[0].length, p = pos;
                    for (p += currentNode.value.length; from >= p; )
                      currentNode = currentNode.next, p += currentNode.value.length;
                    if (p -= currentNode.value.length, pos = p, currentNode.value instanceof Token)
                      continue;
                    for (var k = currentNode; k !== tokenList.tail && (p < to || typeof k.value == "string"); k = k.next)
                      removeCount++, p += k.value.length;
                    removeCount--, str = text.slice(pos, p), match.index -= pos;
                  } else if (match = matchPattern(pattern, 0, str, lookbehind), !match)
                    continue;
                  var from = match.index, matchStr = match[0], before = str.slice(0, from), after = str.slice(from + matchStr.length), reach = pos + str.length;
                  rematch && reach > rematch.reach && (rematch.reach = reach);
                  var removeFrom = currentNode.prev;
                  before && (removeFrom = addAfter(tokenList, removeFrom, before), pos += before.length), removeRange(tokenList, removeFrom, removeCount);
                  var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
                  if (currentNode = addAfter(tokenList, removeFrom, wrapped), after && addAfter(tokenList, currentNode, after), removeCount > 1) {
                    var nestedRematch = {
                      cause: token + "," + j,
                      reach
                    };
                    matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch), rematch && nestedRematch.reach > rematch.reach && (rematch.reach = nestedRematch.reach);
                  }
                }
              }
            }
          }
      }
      function LinkedList() {
        var head = { value: null, prev: null, next: null }, tail = { value: null, prev: head, next: null };
        head.next = tail, this.head = head, this.tail = tail, this.length = 0;
      }
      function addAfter(list, node, value) {
        var next = node.next, newNode = { value, prev: node, next };
        return node.next = newNode, next.prev = newNode, list.length++, newNode;
      }
      function removeRange(list, node, count) {
        for (var next = node.next, i = 0; i < count && next !== list.tail; i++)
          next = next.next;
        node.next = next, next.prev = node, list.length -= i;
      }
      function toArray(list) {
        for (var array = [], node = list.head.next; node !== list.tail; )
          array.push(node.value), node = node.next;
        return array;
      }
      if (!_self2.document)
        return _self2.addEventListener && (_.disableWorkerMessageHandler || _self2.addEventListener("message", function(evt) {
          var message = JSON.parse(evt.data), lang2 = message.language, code = message.code, immediateClose = message.immediateClose;
          _self2.postMessage(_.highlight(code, _.languages[lang2], lang2)), immediateClose && _self2.close();
        }, !1)), _;
      var script = _.util.currentScript();
      script && (_.filename = script.src, script.hasAttribute("data-manual") && (_.manual = !0));
      function highlightAutomaticallyCallback() {
        _.manual || _.highlightAll();
      }
      if (!_.manual) {
        var readyState = document.readyState;
        readyState === "loading" || readyState === "interactive" && script && script.defer ? document.addEventListener("DOMContentLoaded", highlightAutomaticallyCallback) : window.requestAnimationFrame ? window.requestAnimationFrame(highlightAutomaticallyCallback) : window.setTimeout(highlightAutomaticallyCallback, 16);
      }
      return _;
    })(_self);
    typeof module < "u" && module.exports && (module.exports = Prism);
    typeof global < "u" && (global.Prism = Prism);
  }
});

// ../node_modules/refractor/lang/clike.js
var require_clike = __commonJS({
  "../node_modules/refractor/lang/clike.js"(exports, module) {
    "use strict";
    module.exports = clike;
    clike.displayName = "clike";
    clike.aliases = [];
    function clike(Prism) {
      Prism.languages.clike = {
        comment: [
          {
            pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
            lookbehind: !0,
            greedy: !0
          },
          {
            pattern: /(^|[^\\:])\/\/.*/,
            lookbehind: !0,
            greedy: !0
          }
        ],
        string: {
          pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
          greedy: !0
        },
        "class-name": {
          pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
          lookbehind: !0,
          inside: {
            punctuation: /[.\\]/
          }
        },
        keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
        boolean: /\b(?:false|true)\b/,
        function: /\b\w+(?=\()/,
        number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
        operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
        punctuation: /[{}[\];(),.:]/
      };
    }
  }
});

// ../node_modules/refractor/lang/javascript.js
var require_javascript = __commonJS({
  "../node_modules/refractor/lang/javascript.js"(exports, module) {
    "use strict";
    module.exports = javascript;
    javascript.displayName = "javascript";
    javascript.aliases = ["js"];
    function javascript(Prism) {
      Prism.languages.javascript = Prism.languages.extend("clike", {
        "class-name": [
          Prism.languages.clike["class-name"],
          {
            pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
            lookbehind: !0
          }
        ],
        keyword: [
          {
            pattern: /((?:^|\})\s*)catch\b/,
            lookbehind: !0
          },
          {
            pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
            lookbehind: !0
          }
        ],
        // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
        function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
        number: {
          pattern: RegExp(
            /(^|[^\w$])/.source + "(?:" + // constant
            (/NaN|Infinity/.source + "|" + // binary integer
            /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
            /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
            /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
            /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
            /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
          ),
          lookbehind: !0
        },
        operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
      }), Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, Prism.languages.insertBefore("javascript", "keyword", {
        regex: {
          // eslint-disable-next-line regexp/no-dupe-characters-character-class
          pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
          lookbehind: !0,
          greedy: !0,
          inside: {
            "regex-source": {
              pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
              lookbehind: !0,
              alias: "language-regex",
              inside: Prism.languages.regex
            },
            "regex-delimiter": /^\/|\/$/,
            "regex-flags": /^[a-z]+$/
          }
        },
        // This must be declared before keyword because we use "function" inside the look-forward
        "function-variable": {
          pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
          alias: "function"
        },
        parameter: [
          {
            pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
            lookbehind: !0,
            inside: Prism.languages.javascript
          },
          {
            pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
            lookbehind: !0,
            inside: Prism.languages.javascript
          },
          {
            pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
            lookbehind: !0,
            inside: Prism.languages.javascript
          },
          {
            pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
            lookbehind: !0,
            inside: Prism.languages.javascript
          }
        ],
        constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
      }), Prism.languages.insertBefore("javascript", "string", {
        hashbang: {
          pattern: /^#!.*/,
          greedy: !0,
          alias: "comment"
        },
        "template-string": {
          pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
          greedy: !0,
          inside: {
            "template-punctuation": {
              pattern: /^`|`$/,
              alias: "string"
            },
            interpolation: {
              pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
              lookbehind: !0,
              inside: {
                "interpolation-punctuation": {
                  pattern: /^\$\{|\}$/,
                  alias: "punctuation"
                },
                rest: Prism.languages.javascript
              }
            },
            string: /[\s\S]+/
          }
        },
        "string-property": {
          pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
          lookbehind: !0,
          greedy: !0,
          alias: "property"
        }
      }), Prism.languages.insertBefore("javascript", "operator", {
        "literal-property": {
          pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
          lookbehind: !0,
          alias: "property"
        }
      }), Prism.languages.markup && (Prism.languages.markup.tag.addInlined("script", "javascript"), Prism.languages.markup.tag.addAttribute(
        /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
        "javascript"
      )), Prism.languages.js = Prism.languages.javascript;
    }
  }
});

// ../node_modules/refractor/core.js
var require_core = __commonJS({
  "../node_modules/refractor/core.js"(exports, module) {
    "use strict";
    var ctx = typeof globalThis == "object" ? globalThis : typeof self == "object" ? self : typeof window == "object" ? window : typeof global == "object" ? global : {}, restore = capture();
    ctx.Prism = { manual: !0, disableWorkerMessageHandler: !0 };
    var h = require_hastscript(), decode = require_parse_entities(), Prism = require_prism_core(), markup2 = require_markup(), css2 = require_css(), clike = require_clike(), js = require_javascript();
    restore();
    var own = {}.hasOwnProperty;
    function Refractor() {
    }
    Refractor.prototype = Prism;
    var refract = new Refractor();
    module.exports = refract;
    refract.highlight = highlight;
    refract.register = register;
    refract.alias = alias;
    refract.registered = registered;
    refract.listLanguages = listLanguages;
    register(markup2);
    register(css2);
    register(clike);
    register(js);
    refract.util.encode = encode;
    refract.Token.stringify = stringify;
    function register(grammar) {
      if (typeof grammar != "function" || !grammar.displayName)
        throw new Error("Expected `function` for `grammar`, got `" + grammar + "`");
      refract.languages[grammar.displayName] === void 0 && grammar(refract);
    }
    function alias(name, alias2) {
      var languages = refract.languages, map = name, key, list, length, index;
      alias2 && (map = {}, map[name] = alias2);
      for (key in map)
        for (list = map[key], list = typeof list == "string" ? [list] : list, length = list.length, index = -1; ++index < length; )
          languages[list[index]] = languages[key];
    }
    function highlight(value, name) {
      var sup = Prism.highlight, grammar;
      if (typeof value != "string")
        throw new Error("Expected `string` for `value`, got `" + value + "`");
      if (refract.util.type(name) === "Object")
        grammar = name, name = null;
      else {
        if (typeof name != "string")
          throw new Error("Expected `string` for `name`, got `" + name + "`");
        if (own.call(refract.languages, name))
          grammar = refract.languages[name];
        else
          throw new Error("Unknown language: `" + name + "` is not registered");
      }
      return sup.call(this, value, grammar, name);
    }
    function registered(language) {
      if (typeof language != "string")
        throw new Error("Expected `string` for `language`, got `" + language + "`");
      return own.call(refract.languages, language);
    }
    function listLanguages() {
      var languages = refract.languages, list = [], language;
      for (language in languages)
        own.call(languages, language) && typeof languages[language] == "object" && list.push(language);
      return list;
    }
    function stringify(value, language, parent) {
      var env;
      return typeof value == "string" ? { type: "text", value } : refract.util.type(value) === "Array" ? stringifyAll(value, language) : (env = {
        type: value.type,
        content: refract.Token.stringify(value.content, language, parent),
        tag: "span",
        classes: ["token", value.type],
        attributes: {},
        language,
        parent
      }, value.alias && (env.classes = env.classes.concat(value.alias)), refract.hooks.run("wrap", env), h(
        env.tag + "." + env.classes.join("."),
        attributes(env.attributes),
        env.content
      ));
    }
    function stringifyAll(values, language) {
      for (var result = [], length = values.length, index = -1, value; ++index < length; )
        value = values[index], value !== "" && value !== null && value !== void 0 && result.push(value);
      for (index = -1, length = result.length; ++index < length; )
        value = result[index], result[index] = refract.Token.stringify(value, language, result);
      return result;
    }
    function encode(tokens) {
      return tokens;
    }
    function attributes(attrs) {
      var key;
      for (key in attrs)
        attrs[key] = decode(attrs[key]);
      return attrs;
    }
    function capture() {
      var defined = "Prism" in ctx, current = defined ? ctx.Prism : void 0;
      return restore2;
      function restore2() {
        defined ? ctx.Prism = current : delete ctx.Prism, defined = void 0, current = void 0;
      }
    }
  }
});

// src/components/components/syntaxhighlighter/syntaxhighlighter.tsx
var import_memoizerific = __toESM(require_memoizerific(), 1);
import React3, { useCallback, useEffect, useState } from "react";
import { logger } from "storybook/internal/client-logger";
import { global as global2 } from "@storybook/global";

// ../node_modules/react-syntax-highlighter/dist/esm/create-element.js
import React from "react";
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = arguments[r] != null ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), !0).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function powerSetPermutations(arr) {
  var arrLength = arr.length;
  if (arrLength === 0 || arrLength === 1) return arr;
  if (arrLength === 2)
    return [arr[0], arr[1], "".concat(arr[0], ".").concat(arr[1]), "".concat(arr[1], ".").concat(arr[0])];
  if (arrLength === 3)
    return [arr[0], arr[1], arr[2], "".concat(arr[0], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[0]), "".concat(arr[1], ".").concat(arr[2]), "".concat(arr[2], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[1], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[2], ".").concat(arr[1]), "".concat(arr[1], ".").concat(arr[0], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[2], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[0], ".").concat(arr[1]), "".concat(arr[2], ".").concat(arr[1], ".").concat(arr[0])];
  if (arrLength >= 4)
    return [arr[0], arr[1], arr[2], arr[3], "".concat(arr[0], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[3]), "".concat(arr[1], ".").concat(arr[0]), "".concat(arr[1], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[3]), "".concat(arr[2], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[1]), "".concat(arr[2], ".").concat(arr[3]), "".concat(arr[3], ".").concat(arr[0]), "".concat(arr[3], ".").concat(arr[1]), "".concat(arr[3], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[1], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[1], ".").concat(arr[3]), "".concat(arr[0], ".").concat(arr[2], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[2], ".").concat(arr[3]), "".concat(arr[0], ".").concat(arr[3], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[3], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[0], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[0], ".").concat(arr[3]), "".concat(arr[1], ".").concat(arr[2], ".").concat(arr[0]), "".concat(arr[1], ".").concat(arr[2], ".").concat(arr[3]), "".concat(arr[1], ".").concat(arr[3], ".").concat(arr[0]), "".concat(arr[1], ".").concat(arr[3], ".").concat(arr[2]), "".concat(arr[2], ".").concat(arr[0], ".").concat(arr[1]), "".concat(arr[2], ".").concat(arr[0], ".").concat(arr[3]), "".concat(arr[2], ".").concat(arr[1], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[1], ".").concat(arr[3]), "".concat(arr[2], ".").concat(arr[3], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[3], ".").concat(arr[1]), "".concat(arr[3], ".").concat(arr[0], ".").concat(arr[1]), "".concat(arr[3], ".").concat(arr[0], ".").concat(arr[2]), "".concat(arr[3], ".").concat(arr[1], ".").concat(arr[0]), "".concat(arr[3], ".").concat(arr[1], ".").concat(arr[2]), "".concat(arr[3], ".").concat(arr[2], ".").concat(arr[0]), "".concat(arr[3], ".").concat(arr[2], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[1], ".").concat(arr[2], ".").concat(arr[3]), "".concat(arr[0], ".").concat(arr[1], ".").concat(arr[3], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[2], ".").concat(arr[1], ".").concat(arr[3]), "".concat(arr[0], ".").concat(arr[2], ".").concat(arr[3], ".").concat(arr[1]), "".concat(arr[0], ".").concat(arr[3], ".").concat(arr[1], ".").concat(arr[2]), "".concat(arr[0], ".").concat(arr[3], ".").concat(arr[2], ".").concat(arr[1]), "".concat(arr[1], ".").concat(arr[0], ".").concat(arr[2], ".").concat(arr[3]), "".concat(arr[1], ".").concat(arr[0], ".").concat(arr[3], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[2], ".").concat(arr[0], ".").concat(arr[3]), "".concat(arr[1], ".").concat(arr[2], ".").concat(arr[3], ".").concat(arr[0]), "".concat(arr[1], ".").concat(arr[3], ".").concat(arr[0], ".").concat(arr[2]), "".concat(arr[1], ".").concat(arr[3], ".").concat(arr[2], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[0], ".").concat(arr[1], ".").concat(arr[3]), "".concat(arr[2], ".").concat(arr[0], ".").concat(arr[3], ".").concat(arr[1]), "".concat(arr[2], ".").concat(arr[1], ".").concat(arr[0], ".").concat(arr[3]), "".concat(arr[2], ".").concat(arr[1], ".").concat(arr[3], ".").concat(arr[0]), "".concat(arr[2], ".").concat(arr[3], ".").concat(arr[0], ".").concat(arr[1]), "".concat(arr[2], ".").concat(arr[3], ".").concat(arr[1], ".").concat(arr[0]), "".concat(arr[3], ".").concat(arr[0], ".").concat(arr[1], ".").concat(arr[2]), "".concat(arr[3], ".").concat(arr[0], ".").concat(arr[2], ".").concat(arr[1]), "".concat(arr[3], ".").concat(arr[1], ".").concat(arr[0], ".").concat(arr[2]), "".concat(arr[3], ".").concat(arr[1], ".").concat(arr[2], ".").concat(arr[0]), "".concat(arr[3], ".").concat(arr[2], ".").concat(arr[0], ".").concat(arr[1]), "".concat(arr[3], ".").concat(arr[2], ".").concat(arr[1], ".").concat(arr[0])];
}
var classNameCombinations = {};
function getClassNameCombinations(classNames) {
  if (classNames.length === 0 || classNames.length === 1) return classNames;
  var key = classNames.join(".");
  return classNameCombinations[key] || (classNameCombinations[key] = powerSetPermutations(classNames)), classNameCombinations[key];
}
function createStyleObject(classNames) {
  var elementStyle = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, stylesheet = arguments.length > 2 ? arguments[2] : void 0, nonTokenClassNames = classNames.filter(function(className) {
    return className !== "token";
  }), classNamesCombinations = getClassNameCombinations(nonTokenClassNames);
  return classNamesCombinations.reduce(function(styleObject, className) {
    return _objectSpread(_objectSpread({}, styleObject), stylesheet[className]);
  }, elementStyle);
}
function createClassNameString(classNames) {
  return classNames.join(" ");
}
function createChildren(stylesheet, useInlineStyles) {
  var childrenCount = 0;
  return function(children) {
    return childrenCount += 1, children.map(function(child, i) {
      return createElement({
        node: child,
        stylesheet,
        useInlineStyles,
        key: "code-segment-".concat(childrenCount, "-").concat(i)
      });
    });
  };
}
function createElement(_ref) {
  var node = _ref.node, stylesheet = _ref.stylesheet, _ref$style = _ref.style, style = _ref$style === void 0 ? {} : _ref$style, useInlineStyles = _ref.useInlineStyles, key = _ref.key, properties = node.properties, type = node.type, TagName = node.tagName, value = node.value;
  if (type === "text")
    return value;
  if (TagName) {
    var childrenCreator = createChildren(stylesheet, useInlineStyles), props;
    if (!useInlineStyles)
      props = _objectSpread(_objectSpread({}, properties), {}, {
        className: createClassNameString(properties.className)
      });
    else {
      var allStylesheetSelectors = Object.keys(stylesheet).reduce(function(classes, selector) {
        return selector.split(".").forEach(function(className2) {
          classes.includes(className2) || classes.push(className2);
        }), classes;
      }, []), startingClassName = properties.className && properties.className.includes("token") ? ["token"] : [], className = properties.className && startingClassName.concat(properties.className.filter(function(className2) {
        return !allStylesheetSelectors.includes(className2);
      }));
      props = _objectSpread(_objectSpread({}, properties), {}, {
        className: createClassNameString(className) || void 0,
        style: createStyleObject(properties.className, Object.assign({}, properties.style, style), stylesheet)
      });
    }
    var children = childrenCreator(node.children);
    return React.createElement(TagName, _extends({
      key
    }, props), children);
  }
}

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/bash.js
var import_bash = __toESM(require_bash()), bash_default = import_bash.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/css.js
var import_css = __toESM(require_css()), css_default = import_css.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/graphql.js
var import_graphql = __toESM(require_graphql()), graphql_default = import_graphql.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/js-extras.js
var import_js_extras = __toESM(require_js_extras()), js_extras_default = import_js_extras.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/json.js
var import_json = __toESM(require_json()), json_default = import_json.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/jsx.js
var import_jsx = __toESM(require_jsx()), jsx_default = import_jsx.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/markdown.js
var import_markdown = __toESM(require_markdown()), markdown_default = import_markdown.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/markup.js
var import_markup = __toESM(require_markup()), markup_default = import_markup.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/tsx.js
var import_tsx = __toESM(require_tsx()), tsx_default = import_tsx.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/typescript.js
var import_typescript = __toESM(require_typescript()), typescript_default = import_typescript.default;

// ../node_modules/react-syntax-highlighter/dist/esm/languages/prism/yaml.js
var import_yaml = __toESM(require_yaml()), yaml_default = import_yaml.default;

// ../node_modules/@babel/runtime/helpers/esm/arrayLikeToArray.js
function _arrayLikeToArray(r, a) {
  (a == null || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}

// ../node_modules/@babel/runtime/helpers/esm/arrayWithoutHoles.js
function _arrayWithoutHoles(r) {
  if (Array.isArray(r)) return _arrayLikeToArray(r);
}

// ../node_modules/@babel/runtime/helpers/esm/iterableToArray.js
function _iterableToArray(r) {
  if (typeof Symbol < "u" && r[Symbol.iterator] != null || r["@@iterator"] != null) return Array.from(r);
}

// ../node_modules/@babel/runtime/helpers/esm/unsupportedIterableToArray.js
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if (typeof r == "string") return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return t === "Object" && r.constructor && (t = r.constructor.name), t === "Map" || t === "Set" ? Array.from(r) : t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}

// ../node_modules/@babel/runtime/helpers/esm/nonIterableSpread.js
function _nonIterableSpread() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}

// ../node_modules/@babel/runtime/helpers/esm/toConsumableArray.js
function _toConsumableArray(r) {
  return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread();
}

// ../node_modules/react-syntax-highlighter/dist/esm/highlight.js
import React2 from "react";

// ../node_modules/react-syntax-highlighter/dist/esm/checkForListedLanguage.js
var checkForListedLanguage_default = (function(astGenerator, language) {
  var langs = astGenerator.listLanguages();
  return langs.indexOf(language) !== -1;
});

// ../node_modules/react-syntax-highlighter/dist/esm/highlight.js
var _excluded = ["language", "children", "style", "customStyle", "codeTagProps", "useInlineStyles", "showLineNumbers", "showInlineLineNumbers", "startingLineNumber", "lineNumberContainerStyle", "lineNumberStyle", "wrapLines", "wrapLongLines", "lineProps", "renderer", "PreTag", "CodeTag", "code", "astGenerator"];
function ownKeys2(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = arguments[r] != null ? arguments[r] : {};
    r % 2 ? ownKeys2(Object(t), !0).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys2(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
var newLineRegex = /\n/g;
function getNewLines(str) {
  return str.match(newLineRegex);
}
function getAllLineNumbers(_ref) {
  var lines = _ref.lines, startingLineNumber = _ref.startingLineNumber, style = _ref.style;
  return lines.map(function(_, i) {
    var number = i + startingLineNumber;
    return React2.createElement("span", {
      key: "line-".concat(i),
      className: "react-syntax-highlighter-line-number",
      style: typeof style == "function" ? style(number) : style
    }, "".concat(number, `
`));
  });
}
function AllLineNumbers(_ref2) {
  var codeString = _ref2.codeString, codeStyle = _ref2.codeStyle, _ref2$containerStyle = _ref2.containerStyle, containerStyle = _ref2$containerStyle === void 0 ? {
    float: "left",
    paddingRight: "10px"
  } : _ref2$containerStyle, _ref2$numberStyle = _ref2.numberStyle, numberStyle = _ref2$numberStyle === void 0 ? {} : _ref2$numberStyle, startingLineNumber = _ref2.startingLineNumber;
  return React2.createElement("code", {
    style: Object.assign({}, codeStyle, containerStyle)
  }, getAllLineNumbers({
    lines: codeString.replace(/\n$/, "").split(`
`),
    style: numberStyle,
    startingLineNumber
  }));
}
function getEmWidthOfNumber(num) {
  return "".concat(num.toString().length, ".25em");
}
function getInlineLineNumber(lineNumber, inlineLineNumberStyle) {
  return {
    type: "element",
    tagName: "span",
    properties: {
      key: "line-number--".concat(lineNumber),
      className: ["comment", "linenumber", "react-syntax-highlighter-line-number"],
      style: inlineLineNumberStyle
    },
    children: [{
      type: "text",
      value: lineNumber
    }]
  };
}
function assembleLineNumberStyles(lineNumberStyle, lineNumber, largestLineNumber) {
  var defaultLineNumberStyle = {
    display: "inline-block",
    minWidth: getEmWidthOfNumber(largestLineNumber),
    paddingRight: "1em",
    textAlign: "right",
    userSelect: "none"
  }, customLineNumberStyle = typeof lineNumberStyle == "function" ? lineNumberStyle(lineNumber) : lineNumberStyle, assembledStyle = _objectSpread2(_objectSpread2({}, defaultLineNumberStyle), customLineNumberStyle);
  return assembledStyle;
}
function createLineElement(_ref3) {
  var children = _ref3.children, lineNumber = _ref3.lineNumber, lineNumberStyle = _ref3.lineNumberStyle, largestLineNumber = _ref3.largestLineNumber, showInlineLineNumbers = _ref3.showInlineLineNumbers, _ref3$lineProps = _ref3.lineProps, lineProps = _ref3$lineProps === void 0 ? {} : _ref3$lineProps, _ref3$className = _ref3.className, className = _ref3$className === void 0 ? [] : _ref3$className, showLineNumbers = _ref3.showLineNumbers, wrapLongLines = _ref3.wrapLongLines, _ref3$wrapLines = _ref3.wrapLines, wrapLines = _ref3$wrapLines === void 0 ? !1 : _ref3$wrapLines, properties = wrapLines ? _objectSpread2({}, typeof lineProps == "function" ? lineProps(lineNumber) : lineProps) : {};
  if (properties.className = properties.className ? [].concat(_toConsumableArray(properties.className.trim().split(/\s+/)), _toConsumableArray(className)) : className, lineNumber && showInlineLineNumbers) {
    var inlineLineNumberStyle = assembleLineNumberStyles(lineNumberStyle, lineNumber, largestLineNumber);
    children.unshift(getInlineLineNumber(lineNumber, inlineLineNumberStyle));
  }
  return wrapLongLines & showLineNumbers && (properties.style = _objectSpread2({
    display: "flex"
  }, properties.style)), {
    type: "element",
    tagName: "span",
    properties,
    children
  };
}
function flattenCodeTree(tree) {
  for (var className = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [], newTree = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [], i = 0; i < tree.length; i++) {
    var node = tree[i];
    if (node.type === "text")
      newTree.push(createLineElement({
        children: [node],
        className: _toConsumableArray(new Set(className))
      }));
    else if (node.children) {
      var classNames = className.concat(node.properties.className);
      flattenCodeTree(node.children, classNames).forEach(function(i2) {
        return newTree.push(i2);
      });
    }
  }
  return newTree;
}
function processLines(codeTree, wrapLines, lineProps, showLineNumbers, showInlineLineNumbers, startingLineNumber, largestLineNumber, lineNumberStyle, wrapLongLines) {
  var _ref4, tree = flattenCodeTree(codeTree.value), newTree = [], lastLineBreakIndex = -1, index = 0;
  function createWrappedLine(children2, lineNumber2) {
    var className = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [];
    return createLineElement({
      children: children2,
      lineNumber: lineNumber2,
      lineNumberStyle,
      largestLineNumber,
      showInlineLineNumbers,
      lineProps,
      className,
      showLineNumbers,
      wrapLongLines,
      wrapLines
    });
  }
  function createUnwrappedLine(children2, lineNumber2) {
    if (showLineNumbers && lineNumber2 && showInlineLineNumbers) {
      var inlineLineNumberStyle = assembleLineNumberStyles(lineNumberStyle, lineNumber2, largestLineNumber);
      children2.unshift(getInlineLineNumber(lineNumber2, inlineLineNumberStyle));
    }
    return children2;
  }
  function createLine(children2, lineNumber2) {
    var className = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [];
    return wrapLines || className.length > 0 ? createWrappedLine(children2, lineNumber2, className) : createUnwrappedLine(children2, lineNumber2);
  }
  for (var _loop = function() {
    var node = tree[index], value = node.children[0].value, newLines = getNewLines(value);
    if (newLines) {
      var splitValue = value.split(`
`);
      splitValue.forEach(function(text, i) {
        var lineNumber2 = showLineNumbers && newTree.length + startingLineNumber, newChild = {
          type: "text",
          value: "".concat(text, `
`)
        };
        if (i === 0) {
          var _children = tree.slice(lastLineBreakIndex + 1, index).concat(createLineElement({
            children: [newChild],
            className: node.properties.className
          })), _line = createLine(_children, lineNumber2);
          newTree.push(_line);
        } else if (i === splitValue.length - 1) {
          var stringChild = tree[index + 1] && tree[index + 1].children && tree[index + 1].children[0], lastLineInPreviousSpan = {
            type: "text",
            value: "".concat(text)
          };
          if (stringChild) {
            var newElem = createLineElement({
              children: [lastLineInPreviousSpan],
              className: node.properties.className
            });
            tree.splice(index + 1, 0, newElem);
          } else {
            var _children2 = [lastLineInPreviousSpan], _line2 = createLine(_children2, lineNumber2, node.properties.className);
            newTree.push(_line2);
          }
        } else {
          var _children3 = [newChild], _line3 = createLine(_children3, lineNumber2, node.properties.className);
          newTree.push(_line3);
        }
      }), lastLineBreakIndex = index;
    }
    index++;
  }; index < tree.length; )
    _loop();
  if (lastLineBreakIndex !== tree.length - 1) {
    var children = tree.slice(lastLineBreakIndex + 1, tree.length);
    if (children && children.length) {
      var lineNumber = showLineNumbers && newTree.length + startingLineNumber, line = createLine(children, lineNumber);
      newTree.push(line);
    }
  }
  return wrapLines ? newTree : (_ref4 = []).concat.apply(_ref4, newTree);
}
function defaultRenderer(_ref5) {
  var rows = _ref5.rows, stylesheet = _ref5.stylesheet, useInlineStyles = _ref5.useInlineStyles;
  return rows.map(function(node, i) {
    return createElement({
      node,
      stylesheet,
      useInlineStyles,
      key: "code-segment-".concat(i)
    });
  });
}
function isHighlightJs(astGenerator) {
  return astGenerator && typeof astGenerator.highlightAuto < "u";
}
function getCodeTree(_ref6) {
  var astGenerator = _ref6.astGenerator, language = _ref6.language, code = _ref6.code, defaultCodeValue = _ref6.defaultCodeValue;
  if (isHighlightJs(astGenerator)) {
    var hasLanguage = checkForListedLanguage_default(astGenerator, language);
    return language === "text" ? {
      value: defaultCodeValue,
      language: "text"
    } : hasLanguage ? astGenerator.highlight(language, code) : astGenerator.highlightAuto(code);
  }
  try {
    return language && language !== "text" ? {
      value: astGenerator.highlight(code, language)
    } : {
      value: defaultCodeValue
    };
  } catch {
    return {
      value: defaultCodeValue
    };
  }
}
function highlight_default(defaultAstGenerator, defaultStyle) {
  return function(_ref7) {
    var _code$match$length, _code$match, language = _ref7.language, children = _ref7.children, _ref7$style = _ref7.style, style = _ref7$style === void 0 ? defaultStyle : _ref7$style, _ref7$customStyle = _ref7.customStyle, customStyle = _ref7$customStyle === void 0 ? {} : _ref7$customStyle, _ref7$codeTagProps = _ref7.codeTagProps, codeTagProps = _ref7$codeTagProps === void 0 ? {
      className: language ? "language-".concat(language) : void 0,
      style: _objectSpread2(_objectSpread2({}, style['code[class*="language-"]']), style['code[class*="language-'.concat(language, '"]')])
    } : _ref7$codeTagProps, _ref7$useInlineStyles = _ref7.useInlineStyles, useInlineStyles = _ref7$useInlineStyles === void 0 ? !0 : _ref7$useInlineStyles, _ref7$showLineNumbers = _ref7.showLineNumbers, showLineNumbers = _ref7$showLineNumbers === void 0 ? !1 : _ref7$showLineNumbers, _ref7$showInlineLineN = _ref7.showInlineLineNumbers, showInlineLineNumbers = _ref7$showInlineLineN === void 0 ? !0 : _ref7$showInlineLineN, _ref7$startingLineNum = _ref7.startingLineNumber, startingLineNumber = _ref7$startingLineNum === void 0 ? 1 : _ref7$startingLineNum, lineNumberContainerStyle = _ref7.lineNumberContainerStyle, _ref7$lineNumberStyle = _ref7.lineNumberStyle, lineNumberStyle = _ref7$lineNumberStyle === void 0 ? {} : _ref7$lineNumberStyle, wrapLines = _ref7.wrapLines, _ref7$wrapLongLines = _ref7.wrapLongLines, wrapLongLines = _ref7$wrapLongLines === void 0 ? !1 : _ref7$wrapLongLines, _ref7$lineProps = _ref7.lineProps, lineProps = _ref7$lineProps === void 0 ? {} : _ref7$lineProps, renderer = _ref7.renderer, _ref7$PreTag = _ref7.PreTag, PreTag = _ref7$PreTag === void 0 ? "pre" : _ref7$PreTag, _ref7$CodeTag = _ref7.CodeTag, CodeTag = _ref7$CodeTag === void 0 ? "code" : _ref7$CodeTag, _ref7$code = _ref7.code, code = _ref7$code === void 0 ? (Array.isArray(children) ? children[0] : children) || "" : _ref7$code, astGenerator = _ref7.astGenerator, rest = _objectWithoutProperties(_ref7, _excluded);
    astGenerator = astGenerator || defaultAstGenerator;
    var allLineNumbers = showLineNumbers ? React2.createElement(AllLineNumbers, {
      containerStyle: lineNumberContainerStyle,
      codeStyle: codeTagProps.style || {},
      numberStyle: lineNumberStyle,
      startingLineNumber,
      codeString: code
    }) : null, defaultPreStyle = style.hljs || style['pre[class*="language-"]'] || {
      backgroundColor: "#fff"
    }, generatorClassName = isHighlightJs(astGenerator) ? "hljs" : "prismjs", preProps = useInlineStyles ? Object.assign({}, rest, {
      style: Object.assign({}, defaultPreStyle, customStyle)
    }) : Object.assign({}, rest, {
      className: rest.className ? "".concat(generatorClassName, " ").concat(rest.className) : generatorClassName,
      style: Object.assign({}, customStyle)
    });
    if (wrapLongLines ? codeTagProps.style = _objectSpread2({
      whiteSpace: "pre-wrap"
    }, codeTagProps.style) : codeTagProps.style = _objectSpread2({
      whiteSpace: "pre"
    }, codeTagProps.style), !astGenerator)
      return React2.createElement(PreTag, preProps, allLineNumbers, React2.createElement(CodeTag, codeTagProps, code));
    (wrapLines === void 0 && renderer || wrapLongLines) && (wrapLines = !0), renderer = renderer || defaultRenderer;
    var defaultCodeValue = [{
      type: "text",
      value: code
    }], codeTree = getCodeTree({
      astGenerator,
      language,
      code,
      defaultCodeValue
    });
    codeTree.language === null && (codeTree.value = defaultCodeValue);
    var lineBreakCount = (_code$match$length = (_code$match = code.match(/\n/g)) === null || _code$match === void 0 ? void 0 : _code$match.length) !== null && _code$match$length !== void 0 ? _code$match$length : 0, largestLineNumber = startingLineNumber + lineBreakCount, rows = processLines(codeTree, wrapLines, lineProps, showLineNumbers, showInlineLineNumbers, startingLineNumber, largestLineNumber, lineNumberStyle, wrapLongLines);
    return React2.createElement(PreTag, preProps, React2.createElement(CodeTag, codeTagProps, !showInlineLineNumbers && allLineNumbers, renderer({
      rows,
      stylesheet: style,
      useInlineStyles
    })));
  };
}

// ../node_modules/react-syntax-highlighter/dist/esm/prism-light.js
var import_core = __toESM(require_core()), SyntaxHighlighter = highlight_default(import_core.default, {});
SyntaxHighlighter.registerLanguage = function(_, language) {
  return import_core.default.register(language);
};
SyntaxHighlighter.alias = function(name, aliases) {
  return import_core.default.alias(name, aliases);
};
var prism_light_default = SyntaxHighlighter;

// src/components/components/syntaxhighlighter/syntaxhighlighter.tsx
import { styled } from "storybook/theming";
var { window: globalWindow } = global2, supportedLanguages = {
  jsextra: js_extras_default,
  jsx: jsx_default,
  json: json_default,
  yml: yaml_default,
  md: markdown_default,
  bash: bash_default,
  css: css_default,
  html: markup_default,
  tsx: tsx_default,
  typescript: typescript_default,
  graphql: graphql_default
};
Object.entries(supportedLanguages).forEach(([key, val]) => {
  prism_light_default.registerLanguage(key, val);
});
var themedSyntax = (0, import_memoizerific.default)(2)(
  (theme) => Object.entries(theme.code || {}).reduce((acc, [key, val]) => ({ ...acc, [`* .${key}`]: val }), {})
), copyToClipboard = createCopyToClipboardFunction(), Wrapper = styled.div(
  ({ theme }) => ({
    position: "relative",
    overflow: "hidden",
    color: theme.color.defaultText
  }),
  ({ theme, bordered }) => bordered ? {
    border: `1px solid ${theme.appBorderColor}`,
    borderRadius: theme.borderRadius,
    background: theme.background.content
  } : {},
  ({ showLineNumbers }) => showLineNumbers ? {
    // use the before pseudo element to display line numbers
    ".react-syntax-highlighter-line-number::before": {
      content: "attr(data-line-number)"
    }
  } : {}
), UnstyledScroller = ({ children, className }) => React3.createElement(ScrollArea, { horizontal: !0, vertical: !0, className }, children), Scroller = styled(UnstyledScroller)(
  {
    position: "relative"
  },
  ({ theme }) => themedSyntax(theme)
), Pre = styled.pre(({ theme, padded }) => ({
  display: "flex",
  justifyContent: "flex-start",
  margin: 0,
  padding: padded ? theme.layoutMargin : 0
})), Code = styled.div(({ theme }) => ({
  flex: 1,
  paddingLeft: 2,
  // TODO: To match theming/global.ts for now
  paddingRight: theme.layoutMargin,
  opacity: 1,
  fontFamily: theme.typography.fonts.mono
})), processLineNumber = (row) => {
  let children = [...row.children], lineNumberNode = children[0], lineNumber = lineNumberNode.children[0].value, processedLineNumberNode = {
    ...lineNumberNode,
    // empty the line-number element
    children: [],
    properties: {
      ...lineNumberNode.properties,
      // add a data-line-number attribute to line-number element, so we can access the line number with `content: attr(data-line-number)`
      "data-line-number": lineNumber,
      // remove the 'userSelect: none' style, which will produce extra empty lines when copy-pasting in firefox
      style: { ...lineNumberNode.properties.style, userSelect: "auto" }
    }
  };
  return children[0] = processedLineNumberNode, { ...row, children };
}, defaultRenderer2 = ({ rows, stylesheet, useInlineStyles }) => rows.map((node, i) => createElement({
  node: processLineNumber(node),
  stylesheet,
  useInlineStyles,
  key: `code-segement${i}`
})), wrapRenderer = (renderer, showLineNumbers) => showLineNumbers ? renderer ? ({ rows, ...rest }) => renderer({ rows: rows.map((row) => processLineNumber(row)), ...rest }) : defaultRenderer2 : renderer, SyntaxHighlighter2 = ({
  children,
  language = "jsx",
  copyable = !1,
  bordered = !1,
  padded = !1,
  format = !0,
  formatter = void 0,
  className = void 0,
  showLineNumbers = !1,
  ...rest
}) => {
  if (typeof children != "string" || !children.trim())
    return null;
  let [highlightableCode, setHighlightableCode] = useState("");
  useEffect(() => {
    formatter ? formatter(format, children).then(setHighlightableCode) : setHighlightableCode(children.trim());
  }, [children, format, formatter]);
  let [copied, setCopied] = useState(!1), onClick = useCallback(
    (e) => {
      e.preventDefault(), copyToClipboard(highlightableCode).then(() => {
        setCopied(!0), globalWindow.setTimeout(() => setCopied(!1), 1500);
      }).catch(logger.error);
    },
    [highlightableCode]
  ), renderer = wrapRenderer(rest.renderer, showLineNumbers);
  return React3.createElement(
    Wrapper,
    {
      bordered,
      padded,
      showLineNumbers,
      className
    },
    React3.createElement(Scroller, null, React3.createElement(
      prism_light_default,
      {
        padded: padded || bordered,
        language,
        showLineNumbers,
        showInlineLineNumbers: showLineNumbers,
        useInlineStyles: !1,
        PreTag: Pre,
        CodeTag: Code,
        lineNumberContainerStyle: {},
        ...rest,
        renderer
      },
      highlightableCode
    )),
    copyable ? React3.createElement(ActionBar, { actionItems: [{ title: copied ? "Copied" : "Copy", onClick }] }) : null
  );
};
SyntaxHighlighter2.registerLanguage = (...args) => prism_light_default.registerLanguage(...args);
var syntaxhighlighter_default = SyntaxHighlighter2;
export {
  SyntaxHighlighter2 as SyntaxHighlighter,
  syntaxhighlighter_default as default,
  supportedLanguages
};
