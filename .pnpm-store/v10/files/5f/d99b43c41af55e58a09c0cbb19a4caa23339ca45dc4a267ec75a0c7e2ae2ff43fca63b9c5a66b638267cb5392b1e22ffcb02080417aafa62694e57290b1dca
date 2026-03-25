import {
  getControlId,
  getControlSetterButtonId
} from "../../_browser-chunks/chunk-2FRVAXCZ.js";
import {
  _defineProperty,
  _objectWithoutProperties
} from "../../_browser-chunks/chunk-H6XK3RSC.js";
import "../../_browser-chunks/chunk-45UGUKRX.js";
import {
  dequal,
  uniq
} from "../../_browser-chunks/chunk-XJNX76GA.js";
import {
  ADDON_ID as ADDON_ID3,
  ADDON_ID2 as ADDON_ID4,
  ADDON_ID3 as ADDON_ID5,
  DEFAULT_BACKGROUNDS,
  PARAM_KEY as PARAM_KEY3,
  PARAM_KEY3 as PARAM_KEY4,
  TOOL_ID as TOOL_ID2
} from "../../_browser-chunks/chunk-FNXWN6IK.js";
import {
  curriedDarken$1,
  curriedLighten$1,
  curriedOpacify$1,
  curriedTransparentize$1,
  rgba
} from "../../_browser-chunks/chunk-AXG2BOBL.js";
import {
  _extends
} from "../../_browser-chunks/chunk-CHUV5WSW.js";
import {
  EVENTS
} from "../../_browser-chunks/chunk-ZUWEVLDX.js";
import {
  require_ansi_to_html
} from "../../_browser-chunks/chunk-YKE5S47A.js";
import {
  cloneDeep,
  pickBy
} from "../../_browser-chunks/chunk-AIOS4NGK.js";
import "../../_browser-chunks/chunk-GFLS4VP3.js";
import {
  require_memoizerific
} from "../../_browser-chunks/chunk-WJYERY3R.js";
import {
  ADDON_ID,
  CLEAR_ID,
  EVENT_ID,
  PANEL_ID,
  PARAM_KEY
} from "../../_browser-chunks/chunk-6XWLIJQL.js";
import {
  MINIMAL_VIEWPORTS,
  responsiveViewport
} from "../../_browser-chunks/chunk-3PJE6VLG.js";
import {
  ADDON_ID as ADDON_ID2,
  PARAM_KEY as PARAM_KEY2,
  TOOL_ID
} from "../../_browser-chunks/chunk-SL75JR6Y.js";
import {
  __toESM
} from "../../_browser-chunks/chunk-A242L54C.js";

// src/core-server/presets/common-manager.ts
import { global as global3 } from "@storybook/global";
import { addons as addons8 } from "storybook/manager-api";

// src/controls/manager.tsx
import React28 from "react";
import { AddonPanel } from "storybook/internal/components";
import { SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE } from "storybook/internal/core-events";
import { FailedIcon, PassedIcon } from "@storybook/icons";
import { addons, experimental_requestResponse, types } from "storybook/manager-api";
import { color } from "storybook/theming";

// src/controls/components/ControlsPanel.tsx
import React26, { useEffect as useEffect8, useMemo as useMemo3, useState as useState11 } from "react";
import { ScrollArea } from "storybook/internal/components";
import { global } from "@storybook/global";
import {
  useArgTypes,
  useArgs,
  useGlobals,
  useParameter,
  useStorybookApi,
  useStorybookState
} from "storybook/manager-api";
import { styled as styled21 } from "storybook/theming";

// ../addons/docs/src/blocks/components/ArgsTable/ArgsTable.tsx
import React24 from "react";
import { once } from "storybook/internal/client-logger";
import { Button as Button5, Link as Link3, ResetWrapper } from "storybook/internal/components";
import { includeConditionalArg } from "storybook/internal/csf";
import { DocumentIcon as DocumentIcon2, UndoIcon } from "@storybook/icons";
import { styled as styled19 } from "storybook/theming";

// ../addons/docs/src/blocks/components/EmptyBlock.tsx
import React from "react";
import { withReset } from "storybook/internal/components";
import { styled } from "storybook/theming";
var Wrapper = styled.div(withReset, ({ theme: theme3 }) => ({
  backgroundColor: theme3.base === "light" ? "rgba(0,0,0,.01)" : "rgba(255,255,255,.01)",
  borderRadius: theme3.appBorderRadius,
  border: `1px dashed ${theme3.appBorderColor}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  margin: "25px 0 40px",
  color: curriedTransparentize$1(0.3, theme3.color.defaultText),
  fontSize: theme3.typography.size.s2
})), EmptyBlock = (props) => React.createElement(Wrapper, { ...props, className: "docblock-emptyblock sb-unstyled" });

// ../addons/docs/src/blocks/components/ArgsTable/ArgRow.tsx
import React20, { useState as useState8 } from "react";
import { codeCommon as codeCommon3 } from "storybook/internal/components";

// ../node_modules/markdown-to-jsx/dist/index.modern.js
import * as e from "react";
function n() {
  return n = Object.assign ? Object.assign.bind() : function(e2) {
    for (var n2 = 1; n2 < arguments.length; n2++) {
      var r2 = arguments[n2];
      for (var t in r2) Object.prototype.hasOwnProperty.call(r2, t) && (e2[t] = r2[t]);
    }
    return e2;
  }, n.apply(this, arguments);
}
var r = ["children", "options"];
var o = ["allowFullScreen", "allowTransparency", "autoComplete", "autoFocus", "autoPlay", "cellPadding", "cellSpacing", "charSet", "classId", "colSpan", "contentEditable", "contextMenu", "crossOrigin", "encType", "formAction", "formEncType", "formMethod", "formNoValidate", "formTarget", "frameBorder", "hrefLang", "inputMode", "keyParams", "keyType", "marginHeight", "marginWidth", "maxLength", "mediaGroup", "minLength", "noValidate", "radioGroup", "readOnly", "rowSpan", "spellCheck", "srcDoc", "srcLang", "srcSet", "tabIndex", "useMap"].reduce((e2, n2) => (e2[n2.toLowerCase()] = n2, e2), { class: "className", for: "htmlFor" }), a = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: "\xA0", quot: "\u201C" }, c = ["style", "script", "pre"], i = ["src", "href", "data", "formAction", "srcDoc", "action"], u = /([-A-Z0-9_:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|(?:\{((?:\\.|{[^}]*?}|[^}])*)\})))?/gi, l = /\n{2,}$/, s = /^(\s*>[\s\S]*?)(?=\n\n|$)/, f = /^ *> ?/gm, _ = /^(?:\[!([^\]]*)\]\n)?([\s\S]*)/, d = /^ {2,}\n/, p = /^(?:([-*_])( *\1){2,}) *(?:\n *)+\n/, y = /^(?: {1,3})?(`{3,}|~{3,}) *(\S+)? *([^\n]*?)?\n([\s\S]*?)(?:\1\n?|$)/, h = /^(?: {4}[^\n]+\n*)+(?:\n *)+\n?/, g = /^(`+)((?:\\`|(?!\1)`|[^`])+)\1/, m = /^(?:\n *)*\n/, k = /\r\n?/g, x = /^\[\^([^\]]+)](:(.*)((\n+ {4,}.*)|(\n(?!\[\^).+))*)/, q = /^\[\^([^\]]+)]/, v = /\f/g, b = /^---[ \t]*\n(.|\n)*\n---[ \t]*\n/, $ = /^\s*?\[(x|\s)\]/, S = /^ *(#{1,6}) *([^\n]+?)(?: +#*)?(?:\n *)*(?:\n|$)/, z = /^ *(#{1,6}) +([^\n]+?)(?: +#*)?(?:\n *)*(?:\n|$)/, E = /^([^\n]+)\n *(=|-)\2{2,} *\n/, A = /^ *(?!<[a-z][^ >/]* ?\/>)<([a-z][^ >/]*) ?((?:[^>]*[^/])?)>\n?(\s*(?:<\1[^>]*?>[\s\S]*?<\/\1>|(?!<\1\b)[\s\S])*?)<\/\1>(?!<\/\1>)\n*/i, R = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi, B = /^<!--[\s\S]*?(?:-->)/, L = /^(data|aria|x)-[a-z_][a-z\d_.-]*$/, O = /^ *<([a-z][a-z0-9:]*)(?:\s+((?:<.*?>|[^>])*))?\/?>(?!<\/\1>)(\s*\n)?/i, j = /^\{.*\}$/, C = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/, I = /^<([^ >]+[:@\/][^ >]+)>/, T = /-([a-z])?/gi, M = /^(\|.*)\n(?: *(\|? *[-:]+ *\|[-| :]*)\n((?:.*\|.*\n)*))?\n?/, w = /^[^\n]+(?:  \n|\n{2,})/, D = /^\[([^\]]*)\]:\s+<?([^\s>]+)>?\s*("([^"]*)")?/, F = /^!\[([^\]]*)\] ?\[([^\]]*)\]/, P = /^\[([^\]]*)\] ?\[([^\]]*)\]/, Z = /(\n|^[-*]\s|^#|^ {2,}|^-{2,}|^>\s)/, N = /\t/g, G = /(^ *\||\| *$)/g, U = /^ *:-+: *$/, V = /^ *:-+ *$/, H = /^ *-+: *$/, Q = (e2) => `(?=[\\s\\S]+?\\1${e2 ? "\\1" : ""})`, W = "((?:\\[.*?\\][([].*?[)\\]]|<.*?>(?:.*?<.*?>)?|`.*?`|\\\\\\1|[\\s\\S])+?)", J = RegExp(`^([*_])\\1${Q(1)}${W}\\1\\1(?!\\1)`), K = RegExp(`^([*_])${Q(0)}${W}\\1(?!\\1)`), X = RegExp(`^(==)${Q(0)}${W}\\1`), Y = RegExp(`^(~~)${Q(0)}${W}\\1`), ee = /^(:[a-zA-Z0-9-_]+:)/, ne = /^\\([^0-9A-Za-z\s])/, re = /\\([^0-9A-Za-z\s])/g, te = /^[\s\S](?:(?!  \n|[0-9]\.|http)[^=*_~\-\n:<`\\\[!])*/, oe = /^\n+/, ae = /^([ \t]*)/, ce = /(?:^|\n)( *)$/, ie = "(?:\\d+\\.)", ue = "(?:[*+-])";
function le(e2) {
  return "( *)(" + (e2 === 1 ? ie : ue) + ") +";
}
var se = le(1), fe = le(2);
function _e(e2) {
  return RegExp("^" + (e2 === 1 ? se : fe));
}
var de = _e(1), pe = _e(2);
function ye(e2) {
  return RegExp("^" + (e2 === 1 ? se : fe) + "[^\\n]*(?:\\n(?!\\1" + (e2 === 1 ? ie : ue) + " )[^\\n]*)*(\\n|$)", "gm");
}
var he = ye(1), ge = ye(2);
function me(e2) {
  let n2 = e2 === 1 ? ie : ue;
  return RegExp("^( *)(" + n2 + ") [\\s\\S]+?(?:\\n{2,}(?! )(?!\\1" + n2 + " (?!" + n2 + " ))\\n*|\\s*\\n*$)");
}
var ke = me(1), xe = me(2);
function qe(e2, n2) {
  let r2 = n2 === 1, t = r2 ? ke : xe, o2 = r2 ? he : ge, a2 = r2 ? de : pe;
  return { t: (e3) => a2.test(e3), o: je(function(e3, n3) {
    let r3 = ce.exec(n3.prevCapture);
    return r3 && (n3.list || !n3.inline && !n3.simple) ? t.exec(e3 = r3[1] + e3) : null;
  }), i: 1, u(e3, n3, t2) {
    let c2 = r2 ? +e3[2] : void 0, i2 = e3[0].replace(l, `
`).match(o2), u2 = !1;
    return { items: i2.map(function(e4, r3) {
      let o3 = a2.exec(e4)[0].length, c3 = RegExp("^ {1," + o3 + "}", "gm"), l2 = e4.replace(c3, "").replace(a2, ""), s2 = r3 === i2.length - 1, f2 = l2.indexOf(`

`) !== -1 || s2 && u2;
      u2 = f2;
      let _2 = t2.inline, d2 = t2.list, p2;
      t2.list = !0, f2 ? (t2.inline = !1, p2 = Se(l2) + `

`) : (t2.inline = !0, p2 = Se(l2));
      let y2 = n3(p2, t2);
      return t2.inline = _2, t2.list = d2, y2;
    }), ordered: r2, start: c2 };
  }, l: (n3, r3, t2) => e2(n3.ordered ? "ol" : "ul", { key: t2.key, start: n3.type === "20" ? n3.start : void 0 }, n3.items.map(function(n4, o3) {
    return e2("li", { key: o3 }, r3(n4, t2));
  })) };
}
var ve = RegExp(`^\\[((?:\\[[^\\[\\]]*(?:\\[[^\\[\\]]*\\][^\\[\\]]*)*\\]|[^\\[\\]])*)\\]\\(\\s*<?((?:\\([^)]*\\)|[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['"]([\\s\\S]*?)['"])?\\s*\\)`), be = /^!\[(.*?)\]\( *((?:\([^)]*\)|[^() ])*) *"?([^)"]*)?"?\)/;
function $e(e2) {
  return typeof e2 == "string";
}
function Se(e2) {
  let n2 = e2.length;
  for (; n2 > 0 && e2[n2 - 1] <= " "; ) n2--;
  return e2.slice(0, n2);
}
function ze(e2, n2) {
  return e2.startsWith(n2);
}
function Ee(e2, n2, r2) {
  if (Array.isArray(r2)) {
    for (let n3 = 0; n3 < r2.length; n3++) if (ze(e2, r2[n3])) return !0;
    return !1;
  }
  return r2(e2, n2);
}
function Ae(e2) {
  return e2.replace(/[ÀÁÂÃÄÅàáâãäåæÆ]/g, "a").replace(/[çÇ]/g, "c").replace(/[ðÐ]/g, "d").replace(/[ÈÉÊËéèêë]/g, "e").replace(/[ÏïÎîÍíÌì]/g, "i").replace(/[Ññ]/g, "n").replace(/[øØœŒÕõÔôÓóÒò]/g, "o").replace(/[ÜüÛûÚúÙù]/g, "u").replace(/[ŸÿÝý]/g, "y").replace(/[^a-z0-9- ]/gi, "").replace(/ /gi, "-").toLowerCase();
}
function Re(e2) {
  return H.test(e2) ? "right" : U.test(e2) ? "center" : V.test(e2) ? "left" : null;
}
function Be(e2, n2, r2, t) {
  let o2 = r2.inTable;
  r2.inTable = !0;
  let a2 = [[]], c2 = "";
  function i2() {
    if (!c2) return;
    let e3 = a2[a2.length - 1];
    e3.push.apply(e3, n2(c2, r2)), c2 = "";
  }
  return e2.trim().split(/(`[^`]*`|\\\||\|)/).filter(Boolean).forEach((e3, n3, r3) => {
    e3.trim() === "|" && (i2(), t) ? n3 !== 0 && n3 !== r3.length - 1 && a2.push([]) : c2 += e3;
  }), i2(), r2.inTable = o2, a2;
}
function Le(e2, n2, r2) {
  r2.inline = !0;
  let t = e2[2] ? e2[2].replace(G, "").split("|").map(Re) : [], o2 = e2[3] ? (function(e3, n3, r3) {
    return e3.trim().split(`
`).map(function(e4) {
      return Be(e4, n3, r3, !0);
    });
  })(e2[3], n2, r2) : [], a2 = Be(e2[1], n2, r2, !!o2.length);
  return r2.inline = !1, o2.length ? { align: t, cells: o2, header: a2, type: "25" } : { children: a2, type: "21" };
}
function Oe(e2, n2) {
  return e2.align[n2] == null ? {} : { textAlign: e2.align[n2] };
}
function je(e2) {
  return e2.inline = 1, e2;
}
function Ce(e2) {
  return je(function(n2, r2) {
    return r2.inline ? e2.exec(n2) : null;
  });
}
function Ie(e2) {
  return je(function(n2, r2) {
    return r2.inline || r2.simple ? e2.exec(n2) : null;
  });
}
function Te(e2) {
  return function(n2, r2) {
    return r2.inline || r2.simple ? null : e2.exec(n2);
  };
}
function Me(e2) {
  return je(function(n2) {
    return e2.exec(n2);
  });
}
var we = /(javascript|vbscript|data(?!:image)):/i;
function De(e2) {
  try {
    let n2 = decodeURIComponent(e2).replace(/[^A-Za-z0-9/:]/g, "");
    if (we.test(n2)) return null;
  } catch {
    return null;
  }
  return e2;
}
function Fe(e2) {
  return e2 && e2.replace(re, "$1");
}
function Pe(e2, n2, r2) {
  let t = r2.inline || !1, o2 = r2.simple || !1;
  r2.inline = !0, r2.simple = !0;
  let a2 = e2(n2, r2);
  return r2.inline = t, r2.simple = o2, a2;
}
function Ze(e2, n2, r2) {
  let t = r2.inline || !1, o2 = r2.simple || !1;
  r2.inline = !1, r2.simple = !0;
  let a2 = e2(n2, r2);
  return r2.inline = t, r2.simple = o2, a2;
}
function Ne(e2, n2, r2) {
  let t = r2.inline || !1;
  r2.inline = !1;
  let o2 = e2(n2, r2);
  return r2.inline = t, o2;
}
var Ge = (e2, n2, r2) => ({ children: Pe(n2, e2[2], r2) });
function Ue() {
  return {};
}
function Ve() {
  return null;
}
function He(...e2) {
  return e2.filter(Boolean).join(" ");
}
function Qe(e2, n2, r2) {
  let t = e2, o2 = n2.split(".");
  for (; o2.length && (t = t[o2[0]], t !== void 0); ) o2.shift();
  return t || r2;
}
function We(r2 = "", t = {}) {
  t.overrides = t.overrides || {}, t.namedCodesToUnicode = t.namedCodesToUnicode ? n({}, a, t.namedCodesToUnicode) : a;
  let l2 = t.slugify || Ae, G2 = t.sanitizer || De, U2 = t.createElement || e.createElement, V2 = [s, y, h, t.enforceAtxHeadings ? z : S, E, M, ke, xe], H2 = [...V2, w, A, B, O];
  function Q2(e2, n2) {
    for (let r3 = 0; r3 < e2.length; r3++) if (e2[r3].test(n2)) return !0;
    return !1;
  }
  function W2(e2, r3, ...o2) {
    let a2 = Qe(t.overrides, e2 + ".props", {});
    return U2((function(e3, n2) {
      let r4 = Qe(n2, e3);
      return r4 ? typeof r4 == "function" || typeof r4 == "object" && "render" in r4 ? r4 : Qe(n2, e3 + ".component", e3) : e3;
    })(e2, t.overrides), n({}, r3, a2, { className: He(r3?.className, a2.className) || void 0 }), ...o2);
  }
  function re2(e2) {
    e2 = e2.replace(b, "");
    let n2 = !1;
    t.forceInline ? n2 = !0 : t.forceBlock || (n2 = Z.test(e2) === !1);
    let r3 = fe2(se2(n2 ? e2 : Se(e2).replace(oe, "") + `

`, { inline: n2 }));
    for (; $e(r3[r3.length - 1]) && !r3[r3.length - 1].trim(); ) r3.pop();
    if (t.wrapper === null) return r3;
    let o2 = t.wrapper || (n2 ? "span" : "div"), a2;
    if (r3.length > 1 || t.forceWrapper) a2 = r3;
    else {
      if (r3.length === 1) return a2 = r3[0], typeof a2 == "string" ? W2("span", { key: "outer" }, a2) : a2;
      a2 = null;
    }
    return U2(o2, { key: "outer" }, a2);
  }
  function ce2(e2, n2) {
    if (!n2 || !n2.trim()) return null;
    let r3 = n2.match(u);
    return r3 ? r3.reduce(function(n3, r4) {
      let t2 = r4.indexOf("=");
      if (t2 !== -1) {
        let a2 = (function(e3) {
          return e3.indexOf("-") !== -1 && e3.match(L) === null && (e3 = e3.replace(T, function(e4, n4) {
            return n4.toUpperCase();
          })), e3;
        })(r4.slice(0, t2)).trim(), c2 = (function(e3) {
          let n4 = e3[0];
          return (n4 === '"' || n4 === "'") && e3.length >= 2 && e3[e3.length - 1] === n4 ? e3.slice(1, -1) : e3;
        })(r4.slice(t2 + 1).trim()), u2 = o[a2] || a2;
        if (u2 === "ref") return n3;
        let l3 = n3[u2] = (function(e3, n4, r5, t3) {
          return n4 === "style" ? (function(e4) {
            let n5 = [], r6 = "", t4 = !1, o2 = !1, a3 = "";
            if (!e4) return n5;
            for (let c4 = 0; c4 < e4.length; c4++) {
              let i2 = e4[c4];
              if (i2 !== '"' && i2 !== "'" || t4 || (o2 ? i2 === a3 && (o2 = !1, a3 = "") : (o2 = !0, a3 = i2)), i2 === "(" && r6.endsWith("url") ? t4 = !0 : i2 === ")" && t4 && (t4 = !1), i2 !== ";" || o2 || t4) r6 += i2;
              else {
                let e5 = r6.trim();
                if (e5) {
                  let r7 = e5.indexOf(":");
                  if (r7 > 0) {
                    let t5 = e5.slice(0, r7).trim(), o3 = e5.slice(r7 + 1).trim();
                    n5.push([t5, o3]);
                  }
                }
                r6 = "";
              }
            }
            let c3 = r6.trim();
            if (c3) {
              let e5 = c3.indexOf(":");
              if (e5 > 0) {
                let r7 = c3.slice(0, e5).trim(), t5 = c3.slice(e5 + 1).trim();
                n5.push([r7, t5]);
              }
            }
            return n5;
          })(r5).reduce(function(n5, [r6, o2]) {
            return n5[r6.replace(/(-[a-z])/g, (e4) => e4[1].toUpperCase())] = t3(o2, e3, r6), n5;
          }, {}) : i.indexOf(n4) !== -1 ? t3(Fe(r5), e3, n4) : (r5.match(j) && (r5 = Fe(r5.slice(1, r5.length - 1))), r5 === "true" || r5 !== "false" && r5);
        })(e2, a2, c2, G2);
        typeof l3 == "string" && (A.test(l3) || O.test(l3)) && (n3[u2] = re2(l3.trim()));
      } else r4 !== "style" && (n3[o[r4] || r4] = !0);
      return n3;
    }, {}) : null;
  }
  let ie2 = [], ue2 = {}, le2 = { 0: { t: [">"], o: Te(s), i: 1, u(e2, n2, r3) {
    let [, t2, o2] = e2[0].replace(f, "").match(_);
    return { alert: t2, children: n2(o2, r3) };
  }, l(e2, n2, r3) {
    let t2 = { key: r3.key };
    return e2.alert && (t2.className = "markdown-alert-" + l2(e2.alert.toLowerCase(), Ae), e2.children.unshift({ attrs: {}, children: [{ type: "27", text: e2.alert }], noInnerParse: !0, type: "11", tag: "header" })), W2("blockquote", t2, n2(e2.children, r3));
  } }, 1: { t: ["  "], o: Me(d), i: 1, u: Ue, l: (e2, n2, r3) => W2("br", { key: r3.key }) }, 2: { t: ["--", "__", "**", "- ", "* ", "_ "], o: Te(p), i: 1, u: Ue, l: (e2, n2, r3) => W2("hr", { key: r3.key }) }, 3: { t: ["    "], o: Te(h), i: 0, u: (e2) => ({ lang: void 0, text: Fe(Se(e2[0].replace(/^ {4}/gm, ""))) }), l: (e2, r3, t2) => W2("pre", { key: t2.key }, W2("code", n({}, e2.attrs, { className: e2.lang ? "lang-" + e2.lang : "" }), e2.text)) }, 4: { t: ["```", "~~~"], o: Te(y), i: 0, u: (e2) => ({ attrs: ce2("code", e2[3] || ""), lang: e2[2] || void 0, text: e2[4], type: "3" }) }, 5: { t: ["`"], o: Ie(g), i: 3, u: (e2) => ({ text: Fe(e2[2]) }), l: (e2, n2, r3) => W2("code", { key: r3.key }, e2.text) }, 6: { t: ["[^"], o: Te(x), i: 0, u: (e2) => (ie2.push({ footnote: e2[2], identifier: e2[1] }), {}), l: Ve }, 7: { t: ["[^"], o: Ce(q), i: 1, u: (e2) => ({ target: "#" + l2(e2[1], Ae), text: e2[1] }), l: (e2, n2, r3) => W2("a", { key: r3.key, href: G2(e2.target, "a", "href") }, W2("sup", { key: r3.key }, e2.text)) }, 8: { t: ["[ ]", "[x]"], o: Ce($), i: 1, u: (e2) => ({ completed: e2[1].toLowerCase() === "x" }), l: (e2, n2, r3) => W2("input", { checked: e2.completed, key: r3.key, readOnly: !0, type: "checkbox" }) }, 9: { t: ["#"], o: Te(t.enforceAtxHeadings ? z : S), i: 1, u: (e2, n2, r3) => ({ children: Pe(n2, e2[2], r3), id: l2(e2[2], Ae), level: e2[1].length }), l: (e2, n2, r3) => W2("h" + e2.level, { id: e2.id, key: r3.key }, n2(e2.children, r3)) }, 10: { t: (e2) => {
    let n2 = e2.indexOf(`
`);
    return n2 > 0 && n2 < e2.length - 1 && (e2[n2 + 1] === "=" || e2[n2 + 1] === "-");
  }, o: Te(E), i: 1, u: (e2, n2, r3) => ({ children: Pe(n2, e2[1], r3), level: e2[2] === "=" ? 1 : 2, type: "9" }) }, 11: { t: ["<"], o: Me(A), i: 1, u(e2, n2, r3) {
    let [, t2] = e2[3].match(ae), o2 = RegExp("^" + t2, "gm"), a2 = e2[3].replace(o2, ""), i2 = Q2(H2, a2) ? Ne : Pe, u2 = e2[1].toLowerCase(), l3 = c.indexOf(u2) !== -1, s2 = (l3 ? u2 : e2[1]).trim(), f2 = { attrs: ce2(s2, e2[2]), noInnerParse: l3, tag: s2 };
    if (r3.inAnchor = r3.inAnchor || u2 === "a", l3) f2.text = e2[3];
    else {
      let e3 = r3.inHTML;
      r3.inHTML = !0, f2.children = i2(n2, a2, r3), r3.inHTML = e3;
    }
    return r3.inAnchor = !1, f2;
  }, l: (e2, r3, t2) => W2(e2.tag, n({ key: t2.key }, e2.attrs), e2.text || (e2.children ? r3(e2.children, t2) : "")) }, 13: { t: ["<"], o: Me(O), i: 1, u(e2) {
    let n2 = e2[1].trim();
    return { attrs: ce2(n2, e2[2] || ""), tag: n2 };
  }, l: (e2, r3, t2) => W2(e2.tag, n({}, e2.attrs, { key: t2.key })) }, 12: { t: ["<!--"], o: Me(B), i: 1, u: () => ({}), l: Ve }, 14: { t: ["!["], o: Ie(be), i: 1, u: (e2) => ({ alt: Fe(e2[1]), target: Fe(e2[2]), title: Fe(e2[3]) }), l: (e2, n2, r3) => W2("img", { key: r3.key, alt: e2.alt || void 0, title: e2.title || void 0, src: G2(e2.target, "img", "src") }) }, 15: { t: ["["], o: Ce(ve), i: 3, u: (e2, n2, r3) => ({ children: Ze(n2, e2[1], r3), target: Fe(e2[2]), title: Fe(e2[3]) }), l: (e2, n2, r3) => W2("a", { key: r3.key, href: G2(e2.target, "a", "href"), title: e2.title }, n2(e2.children, r3)) }, 16: { t: ["<"], o: Ce(I), i: 0, u(e2) {
    let n2 = e2[1], r3 = !1;
    return n2.indexOf("@") !== -1 && n2.indexOf("//") === -1 && (r3 = !0, n2 = n2.replace("mailto:", "")), { children: [{ text: n2, type: "27" }], target: r3 ? "mailto:" + n2 : n2, type: "15" };
  } }, 17: { t: (e2, n2) => !n2.inAnchor && !t.disableAutoLink && (ze(e2, "http://") || ze(e2, "https://")), o: Ce(C), i: 0, u: (e2) => ({ children: [{ text: e2[1], type: "27" }], target: e2[1], title: void 0, type: "15" }) }, 20: qe(W2, 1), 33: qe(W2, 2), 19: { t: [`
`], o: Te(m), i: 3, u: Ue, l: () => `
` }, 21: { o: je(function(e2, n2) {
    if (n2.inline || n2.simple || n2.inHTML && e2.indexOf(`

`) === -1 && n2.prevCapture.indexOf(`

`) === -1) return null;
    let r3 = "", t2 = 0;
    for (; ; ) {
      let n3 = e2.indexOf(`
`, t2), o3 = e2.slice(t2, n3 === -1 ? void 0 : n3 + 1);
      if (Q2(V2, o3) || (r3 += o3, n3 === -1 || !o3.trim())) break;
      t2 = n3 + 1;
    }
    let o2 = Se(r3);
    return o2 === "" ? null : [r3, , o2];
  }), i: 3, u: Ge, l: (e2, n2, r3) => W2("p", { key: r3.key }, n2(e2.children, r3)) }, 22: { t: ["["], o: Ce(D), i: 0, u: (e2) => (ue2[e2[1]] = { target: e2[2], title: e2[4] }, {}), l: Ve }, 23: { t: ["!["], o: Ie(F), i: 0, u: (e2) => ({ alt: e2[1] ? Fe(e2[1]) : void 0, ref: e2[2] }), l: (e2, n2, r3) => ue2[e2.ref] ? W2("img", { key: r3.key, alt: e2.alt, src: G2(ue2[e2.ref].target, "img", "src"), title: ue2[e2.ref].title }) : null }, 24: { t: (e2) => e2[0] === "[" && e2.indexOf("](") === -1, o: Ce(P), i: 0, u: (e2, n2, r3) => ({ children: n2(e2[1], r3), fallbackChildren: e2[0], ref: e2[2] }), l: (e2, n2, r3) => ue2[e2.ref] ? W2("a", { key: r3.key, href: G2(ue2[e2.ref].target, "a", "href"), title: ue2[e2.ref].title }, n2(e2.children, r3)) : W2("span", { key: r3.key }, e2.fallbackChildren) }, 25: { t: ["|"], o: Te(M), i: 1, u: Le, l(e2, n2, r3) {
    let t2 = e2;
    return W2("table", { key: r3.key }, W2("thead", null, W2("tr", null, t2.header.map(function(e3, o2) {
      return W2("th", { key: o2, style: Oe(t2, o2) }, n2(e3, r3));
    }))), W2("tbody", null, t2.cells.map(function(e3, o2) {
      return W2("tr", { key: o2 }, e3.map(function(e4, o3) {
        return W2("td", { key: o3, style: Oe(t2, o3) }, n2(e4, r3));
      }));
    })));
  } }, 27: { o: je(function(e2, n2) {
    let r3;
    return ze(e2, ":") && (r3 = ee.exec(e2)), r3 || te.exec(e2);
  }), i: 4, u(e2) {
    let n2 = e2[0];
    return { text: n2.indexOf("&") === -1 ? n2 : n2.replace(R, (e3, n3) => t.namedCodesToUnicode[n3] || e3) };
  }, l: (e2) => e2.text }, 28: { t: ["**", "__"], o: Ie(J), i: 2, u: (e2, n2, r3) => ({ children: n2(e2[2], r3) }), l: (e2, n2, r3) => W2("strong", { key: r3.key }, n2(e2.children, r3)) }, 29: { t: (e2) => {
    let n2 = e2[0];
    return (n2 === "*" || n2 === "_") && e2[1] !== n2;
  }, o: Ie(K), i: 3, u: (e2, n2, r3) => ({ children: n2(e2[2], r3) }), l: (e2, n2, r3) => W2("em", { key: r3.key }, n2(e2.children, r3)) }, 30: { t: ["\\"], o: Ie(ne), i: 1, u: (e2) => ({ text: e2[1], type: "27" }) }, 31: { t: ["=="], o: Ie(X), i: 3, u: Ge, l: (e2, n2, r3) => W2("mark", { key: r3.key }, n2(e2.children, r3)) }, 32: { t: ["~~"], o: Ie(Y), i: 3, u: Ge, l: (e2, n2, r3) => W2("del", { key: r3.key }, n2(e2.children, r3)) } };
  t.disableParsingRawHTML === !0 && (delete le2[11], delete le2[13]);
  let se2 = (function(e2) {
    var n2 = Object.keys(e2);
    function r3(t2, o2) {
      var a2 = [];
      if (o2.prevCapture = o2.prevCapture || "", t2.trim()) for (; t2; ) for (var c2 = 0; c2 < n2.length; ) {
        var i2 = n2[c2], u2 = e2[i2];
        if (!u2.t || Ee(t2, o2, u2.t)) {
          var l3 = u2.o(t2, o2);
          if (l3 && l3[0]) {
            t2 = t2.substring(l3[0].length);
            var s2 = u2.u(l3, r3, o2);
            o2.prevCapture += l3[0], s2.type || (s2.type = i2), a2.push(s2);
            break;
          }
          c2++;
        } else c2++;
      }
      return o2.prevCapture = "", a2;
    }
    return n2.sort(function(n3, r4) {
      return e2[n3].i - e2[r4].i || (n3 < r4 ? -1 : 1);
    }), function(e3, n3) {
      return r3((function(e4) {
        return e4.replace(k, `
`).replace(v, "").replace(N, "    ");
      })(e3), n3);
    };
  })(le2), fe2 = /* @__PURE__ */ (function(e2, n2) {
    return function r3(t2, o2 = {}) {
      if (Array.isArray(t2)) {
        let e3 = o2.key, n3 = [], a2 = !1;
        for (let e4 = 0; e4 < t2.length; e4++) {
          o2.key = e4;
          let c2 = r3(t2[e4], o2), i2 = $e(c2);
          i2 && a2 ? n3[n3.length - 1] += c2 : c2 !== null && n3.push(c2), a2 = i2;
        }
        return o2.key = e3, n3;
      }
      return (function(r4, t3, o3) {
        let a2 = e2[r4.type].l;
        return n2 ? n2(() => a2(r4, t3, o3), r4, t3, o3) : a2(r4, t3, o3);
      })(t2, r3, o2);
    };
  })(le2, t.renderRule), _e2 = re2(r2);
  return ie2.length ? W2("div", null, _e2, W2("footer", { key: "footer" }, ie2.map(function(e2) {
    return W2("div", { id: l2(e2.identifier, Ae), key: e2.identifier }, e2.identifier, fe2(se2(e2.footnote, { inline: !0 })));
  }))) : _e2;
}
var index_modern_default = (n2) => {
  let { children: t, options: o2 } = n2, a2 = (function(e2, n3) {
    if (e2 == null) return {};
    var r2, t2, o3 = {}, a3 = Object.keys(e2);
    for (t2 = 0; t2 < a3.length; t2++) n3.indexOf(r2 = a3[t2]) >= 0 || (o3[r2] = e2[r2]);
    return o3;
  })(n2, r);
  return e.cloneElement(We(t ?? "", o2), a2);
};

// ../addons/docs/src/blocks/components/ArgsTable/ArgRow.tsx
import { styled as styled15 } from "storybook/theming";

// ../addons/docs/src/blocks/components/ArgsTable/ArgControl.tsx
import React17, { useCallback as useCallback5, useEffect as useEffect6, useState as useState6 } from "react";
import { Link } from "storybook/internal/components";

// ../addons/docs/src/blocks/controls/index.tsx
import React16, { Suspense, lazy } from "react";

// ../addons/docs/src/blocks/controls/Boolean.tsx
import React2, { useCallback } from "react";
import { Button } from "storybook/internal/components";
import { styled as styled2 } from "storybook/theming";
var Label = styled2.label(({ theme: theme3 }) => ({
  lineHeight: "18px",
  alignItems: "center",
  marginBottom: 8,
  display: "inline-block",
  position: "relative",
  whiteSpace: "nowrap",
  background: theme3.boolean.background,
  borderRadius: "3em",
  padding: 1,
  '&[aria-disabled="true"]': {
    opacity: 0.5,
    input: {
      cursor: "not-allowed"
    }
  },
  input: {
    appearance: "none",
    width: "100%",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    margin: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: "3em",
    "&:focus": {
      outline: "none",
      boxShadow: `${theme3.color.secondary} 0 0 0 1px inset !important`
    },
    "@media (forced-colors: active)": {
      "&:focus": {
        outline: "1px solid highlight"
      }
    }
  },
  span: {
    textAlign: "center",
    fontSize: theme3.typography.size.s1,
    fontWeight: theme3.typography.weight.bold,
    lineHeight: "1",
    cursor: "pointer",
    display: "inline-block",
    padding: "7px 15px",
    transition: "all 100ms ease-out",
    userSelect: "none",
    borderRadius: "3em",
    color: curriedTransparentize$1(0.5, theme3.color.defaultText),
    background: "transparent",
    "&:hover": {
      boxShadow: `${curriedOpacify$1(0.3, theme3.appBorderColor)} 0 0 0 1px inset`
    },
    "&:active": {
      boxShadow: `${curriedOpacify$1(0.05, theme3.appBorderColor)} 0 0 0 2px inset`,
      color: curriedOpacify$1(1, theme3.appBorderColor)
    },
    "&:first-of-type": {
      paddingRight: 8
    },
    "&:last-of-type": {
      paddingLeft: 8
    }
  },
  "input:checked ~ span:last-of-type, input:not(:checked) ~ span:first-of-type": {
    background: theme3.boolean.selectedBackground,
    boxShadow: theme3.base === "light" ? `${curriedOpacify$1(0.1, theme3.appBorderColor)} 0 0 2px` : `${theme3.appBorderColor} 0 0 0 1px`,
    color: theme3.color.defaultText,
    padding: "7px 15px",
    "@media (forced-colors: active)": {
      textDecoration: "underline"
    }
  }
})), parse = (value2) => value2 === "true", BooleanControl = ({
  name,
  value: value2,
  onChange,
  onBlur,
  onFocus,
  argType
}) => {
  let onSetFalse = useCallback(() => onChange(!1), [onChange]), readonly = !!argType?.table?.readonly;
  if (value2 === void 0)
    return React2.createElement(
      Button,
      {
        ariaLabel: !1,
        variant: "outline",
        size: "medium",
        id: getControlSetterButtonId(name),
        onClick: onSetFalse,
        disabled: readonly
      },
      "Set boolean"
    );
  let controlId = getControlId(name), parsedValue = typeof value2 == "string" ? parse(value2) : value2;
  return React2.createElement(Label, { "aria-disabled": readonly, htmlFor: controlId, "aria-label": name }, React2.createElement(
    "input",
    {
      id: controlId,
      type: "checkbox",
      onChange: (e2) => onChange(e2.target.checked),
      checked: parsedValue,
      role: "switch",
      disabled: readonly,
      name,
      onBlur,
      onFocus
    }
  ), React2.createElement("span", { "aria-hidden": "true" }, "False"), React2.createElement("span", { "aria-hidden": "true" }, "True"));
};

// ../addons/docs/src/blocks/controls/Date.tsx
import React3, { useEffect, useRef, useState } from "react";
import { Form } from "storybook/internal/components";
import { styled as styled3 } from "storybook/theming";
var parseDate = (value2) => {
  let [year, month, day] = value2.split("-"), result = /* @__PURE__ */ new Date();
  return result.setFullYear(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)), result;
}, parseTime = (value2) => {
  let [hours, minutes] = value2.split(":"), result = /* @__PURE__ */ new Date();
  return result.setHours(parseInt(hours, 10)), result.setMinutes(parseInt(minutes, 10)), result;
}, formatDate = (value2) => {
  let date = new Date(value2), year = `000${date.getFullYear()}`.slice(-4), month = `0${date.getMonth() + 1}`.slice(-2), day = `0${date.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
}, formatTime = (value2) => {
  let date = new Date(value2), hours = `0${date.getHours()}`.slice(-2), minutes = `0${date.getMinutes()}`.slice(-2);
  return `${hours}:${minutes}`;
}, FormInput = styled3(Form.Input)(
  ({ theme: theme3, readOnly }) => readOnly ? {
    background: theme3.base === "light" ? theme3.color.lighter : "transparent"
  } : {}
), FlexSpaced = styled3.fieldset(({ theme: theme3 }) => ({
  flex: 1,
  display: "flex",
  border: 0,
  marginInline: 0,
  padding: 0,
  input: {
    marginLeft: 10,
    flex: 1,
    height: 32,
    // hardcode height bc Chromium bug https://bugs.chromium.org/p/chromium/issues/detail?id=417606
    "&::-webkit-calendar-picker-indicator": {
      opacity: 0.5,
      height: 12,
      filter: theme3.base === "light" ? void 0 : "invert(1)"
    }
  },
  "input:first-of-type": {
    marginLeft: 0,
    flexGrow: 4
  },
  "input:last-of-type": {
    flexGrow: 3
  }
})), DateControl = ({ name, value: value2, onChange, onFocus, onBlur, argType }) => {
  let [valid, setValid] = useState(!0), dateRef = useRef(), timeRef = useRef(), readonly = !!argType?.table?.readonly;
  useEffect(() => {
    valid !== !1 && (dateRef && dateRef.current && (dateRef.current.value = value2 ? formatDate(value2) : ""), timeRef && timeRef.current && (timeRef.current.value = value2 ? formatTime(value2) : ""));
  }, [value2]);
  let onDateChange = (e2) => {
    if (!e2.target.value)
      return onChange();
    let parsed = parseDate(e2.target.value), result = new Date(value2 ?? "");
    result.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    let time = result.getTime();
    time && onChange(time), setValid(!!time);
  }, onTimeChange = (e2) => {
    if (!e2.target.value)
      return onChange();
    let parsed = parseTime(e2.target.value), result = new Date(value2 ?? "");
    result.setHours(parsed.getHours()), result.setMinutes(parsed.getMinutes());
    let time = result.getTime();
    time && onChange(time), setValid(!!time);
  }, controlId = getControlId(name);
  return React3.createElement(FlexSpaced, null, React3.createElement("legend", { className: "sb-sr-only" }, name), React3.createElement("label", { htmlFor: `${controlId}-date`, className: "sb-sr-only" }, "Date"), React3.createElement(
    FormInput,
    {
      type: "date",
      max: "9999-12-31",
      ref: dateRef,
      id: `${controlId}-date`,
      name: `${controlId}-date`,
      readOnly: readonly,
      onChange: onDateChange,
      onFocus,
      onBlur
    }
  ), React3.createElement("label", { htmlFor: `${controlId}-time`, className: "sb-sr-only" }, "Time"), React3.createElement(
    FormInput,
    {
      type: "time",
      id: `${controlId}-time`,
      name: `${controlId}-time`,
      ref: timeRef,
      onChange: onTimeChange,
      readOnly: readonly,
      onFocus,
      onBlur
    }
  ), valid ? null : React3.createElement("div", null, "invalid"));
};

// ../addons/docs/src/blocks/controls/Number.tsx
import React4, { useCallback as useCallback2, useEffect as useEffect2, useRef as useRef2, useState as useState2 } from "react";
import { Button as Button2, Form as Form2 } from "storybook/internal/components";
import { styled as styled4 } from "storybook/theming";
var Wrapper2 = styled4.label({
  display: "flex"
}), parse2 = (value2) => {
  let result = parseFloat(value2);
  return Number.isNaN(result) ? void 0 : result;
};
var FormInput2 = styled4(Form2.Input)(({ theme: theme3 }) => ({
  background: theme3.base === "light" ? theme3.color.lighter : "transparent"
})), NumberControl = ({
  name,
  value: value2,
  onChange,
  min,
  max,
  step,
  onBlur,
  onFocus,
  argType
}) => {
  let [inputValue, setInputValue] = useState2(typeof value2 == "number" ? value2 : ""), [forceVisible, setForceVisible] = useState2(!1), [parseError, setParseError] = useState2(null), readonly = !!argType?.table?.readonly, handleChange = useCallback2(
    (event) => {
      setInputValue(event.target.value);
      let result = parseFloat(event.target.value);
      if (Number.isNaN(result))
        setParseError(new Error(`'${event.target.value}' is not a number`));
      else {
        let finalValue = result;
        typeof min == "number" && finalValue < min && (finalValue = min), typeof max == "number" && finalValue > max && (finalValue = max), onChange(finalValue), setParseError(null), finalValue !== result && setInputValue(String(finalValue));
      }
    },
    [onChange, setParseError, min, max]
  ), onForceVisible = useCallback2(() => {
    setInputValue("0"), onChange(0), setForceVisible(!0);
  }, [setForceVisible]), htmlElRef = useRef2(null);
  return useEffect2(() => {
    forceVisible && htmlElRef.current && htmlElRef.current.select();
  }, [forceVisible]), useEffect2(() => {
    let newInputValue = typeof value2 == "number" ? value2 : "";
    inputValue !== newInputValue && setInputValue(newInputValue);
  }, [value2]), value2 === void 0 ? React4.createElement(
    Button2,
    {
      ariaLabel: !1,
      variant: "outline",
      size: "medium",
      id: getControlSetterButtonId(name),
      onClick: onForceVisible,
      disabled: readonly
    },
    "Set number"
  ) : React4.createElement(Wrapper2, null, React4.createElement(
    FormInput2,
    {
      ref: htmlElRef,
      id: getControlId(name),
      type: "number",
      onChange: handleChange,
      size: "flex",
      placeholder: "Edit number...",
      value: inputValue,
      valid: parseError ? "error" : void 0,
      autoFocus: forceVisible,
      readOnly: readonly,
      name,
      min,
      max,
      step,
      onFocus,
      onBlur
    }
  ));
};

// ../addons/docs/src/blocks/controls/options/Options.tsx
import React8 from "react";

// ../addons/docs/src/blocks/controls/options/Checkbox.tsx
import React5, { useEffect as useEffect3, useState as useState3 } from "react";
import { logger } from "storybook/internal/client-logger";
import { styled as styled5 } from "storybook/theming";

// ../addons/docs/src/blocks/controls/options/helpers.ts
var selectedKey = (value2, options) => {
  let entry = options && Object.entries(options).find(([_key, val]) => val === value2);
  return entry ? entry[0] : void 0;
}, selectedKeys = (value2, options) => value2 && options ? Object.entries(options).filter((entry) => value2.includes(entry[1])).map((entry) => entry[0]) : [], selectedValues = (keys, options) => keys && options && keys.map((key) => options[key]);

// ../addons/docs/src/blocks/controls/options/Checkbox.tsx
var Wrapper3 = styled5.fieldset(
  {
    border: "none",
    marginInline: 0,
    padding: 0,
    display: "flex",
    alignItems: "flex-start"
  },
  ({ $isInline: isInline }) => isInline ? {
    flexWrap: "wrap",
    gap: 15,
    label: {
      display: "inline-flex"
    }
  } : {
    flexDirection: "column",
    gap: 8,
    label: {
      display: "flex"
    }
  }
), Text = styled5.span(({ $readOnly }) => ({
  opacity: $readOnly ? 0.5 : 1
})), Label2 = styled5.label(({ $readOnly }) => ({
  lineHeight: "20px",
  alignItems: "center",
  cursor: $readOnly ? "not-allowed" : "pointer",
  input: {
    cursor: $readOnly ? "not-allowed" : "pointer",
    margin: 0,
    marginRight: 6
  }
})), CheckboxControl = ({
  name,
  options,
  value: value2,
  onChange,
  isInline,
  argType
}) => {
  if (!options)
    return logger.warn(`Checkbox with no options: ${name}`), React5.createElement(React5.Fragment, null, "-");
  let initial = selectedKeys(value2 || [], options), [selected, setSelected] = useState3(initial), readonly = !!argType?.table?.readonly, handleChange = (e2) => {
    let option = e2.target.value, updated = [...selected];
    updated.includes(option) ? updated.splice(updated.indexOf(option), 1) : updated.push(option), onChange(selectedValues(updated, options)), setSelected(updated);
  };
  useEffect3(() => {
    setSelected(selectedKeys(value2 || [], options));
  }, [value2]);
  let controlId = getControlId(name);
  return React5.createElement(Wrapper3, { $isInline: isInline }, React5.createElement("legend", { className: "sb-sr-only" }, name), Object.keys(options).map((key, index) => {
    let id = `${controlId}-${index}`;
    return React5.createElement(Label2, { key: id, htmlFor: id, $readOnly: readonly }, React5.createElement(
      "input",
      {
        type: "checkbox",
        disabled: readonly,
        id,
        name: id,
        value: key,
        onChange: handleChange,
        checked: selected?.includes(key)
      }
    ), React5.createElement(Text, { $readOnly: readonly }, key));
  }));
};

// ../addons/docs/src/blocks/controls/options/Radio.tsx
import React6 from "react";
import { logger as logger2 } from "storybook/internal/client-logger";
import { styled as styled6 } from "storybook/theming";
var Wrapper4 = styled6.fieldset(
  {
    border: "none",
    marginInline: 0,
    padding: 0,
    display: "flex",
    alignItems: "flex-start"
  },
  ({ isInline }) => isInline ? {
    flexWrap: "wrap",
    gap: 15,
    label: {
      display: "inline-flex"
    }
  } : {
    flexDirection: "column",
    gap: 8,
    label: {
      display: "flex"
    }
  }
), Text2 = styled6.span(({ $readOnly }) => ({
  opacity: $readOnly ? 0.5 : 1
})), Label3 = styled6.label(({ $readOnly }) => ({
  lineHeight: "20px",
  alignItems: "center",
  cursor: $readOnly ? "not-allowed" : "pointer",
  input: {
    cursor: $readOnly ? "not-allowed" : "pointer",
    margin: 0,
    marginRight: 6
  }
})), RadioControl = ({
  name,
  options,
  value: value2,
  onChange,
  isInline,
  argType
}) => {
  if (!options)
    return logger2.warn(`Radio with no options: ${name}`), React6.createElement(React6.Fragment, null, "-");
  let selection = selectedKey(value2, options), controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React6.createElement(Wrapper4, { isInline }, React6.createElement("legend", { className: "sb-sr-only" }, name), Object.keys(options).map((key, index) => {
    let id = `${controlId}-${index}`;
    return React6.createElement(Label3, { key: id, htmlFor: id, $readOnly: readonly }, React6.createElement(
      "input",
      {
        type: "radio",
        id,
        name: controlId,
        disabled: readonly,
        value: key,
        onChange: (e2) => onChange(options[e2.currentTarget.value]),
        checked: key === selection
      }
    ), React6.createElement(Text2, { $readOnly: readonly }, key));
  }));
};

// ../addons/docs/src/blocks/controls/options/Select.tsx
import React7 from "react";
import { logger as logger3 } from "storybook/internal/client-logger";
import { ChevronSmallDownIcon } from "@storybook/icons";
import { styled as styled7 } from "storybook/theming";
var styleResets = {
  // resets
  appearance: "none",
  border: "0 none",
  boxSizing: "inherit",
  display: " block",
  margin: " 0",
  background: "transparent",
  padding: 0,
  fontSize: "inherit",
  position: "relative"
}, OptionsSelect = styled7.select(styleResets, ({ theme: theme3 }) => ({
  boxSizing: "border-box",
  position: "relative",
  padding: "6px 10px",
  width: "100%",
  color: theme3.input.color || "inherit",
  background: theme3.input.background,
  borderRadius: theme3.input.borderRadius,
  boxShadow: `${theme3.input.border} 0 0 0 1px inset`,
  fontSize: theme3.typography.size.s2 - 1,
  lineHeight: "20px",
  "&:focus": {
    boxShadow: `${theme3.color.secondary} 0 0 0 1px inset`,
    outline: "none"
  },
  "&[disabled]": {
    cursor: "not-allowed",
    opacity: 0.5
  },
  "::placeholder": {
    color: theme3.textMutedColor
  },
  "&[multiple]": {
    overflow: "auto",
    padding: 0,
    option: {
      display: "block",
      padding: "6px 10px",
      marginLeft: 1,
      marginRight: 1,
      "&:hover": {
        background: theme3.background.hoverable
      },
      "&:checked": {
        background: "transparent",
        color: theme3.color.secondary,
        fontWeight: theme3.typography.weight.bold
      }
    }
  }
})), SelectWrapper = styled7.span(({ theme: theme3 }) => ({
  display: "inline-block",
  lineHeight: "normal",
  overflow: "hidden",
  position: "relative",
  verticalAlign: "top",
  width: "100%",
  svg: {
    position: "absolute",
    zIndex: 1,
    pointerEvents: "none",
    height: "12px",
    marginTop: "-6px",
    right: "12px",
    top: "50%",
    fill: theme3.textMutedColor,
    path: {
      fill: theme3.textMutedColor
    }
  }
})), NO_SELECTION = "Choose option...", SingleSelect = ({ name, value: value2, options, onChange, argType }) => {
  let handleChange = (e2) => {
    onChange(options[e2.currentTarget.value]);
  }, selection = selectedKey(value2, options) || NO_SELECTION, controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React7.createElement(SelectWrapper, null, React7.createElement(ChevronSmallDownIcon, null), React7.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React7.createElement(OptionsSelect, { disabled: readonly, id: controlId, value: selection, onChange: handleChange }, React7.createElement("option", { key: "no-selection", disabled: !0 }, NO_SELECTION), Object.keys(options).map((key) => React7.createElement("option", { key, value: key }, key))));
}, MultiSelect = ({ name, value: value2, options, onChange, argType }) => {
  let handleChange = (e2) => {
    let selection2 = Array.from(e2.currentTarget.options).filter((option) => option.selected).map((option) => option.value);
    onChange(selectedValues(selection2, options));
  }, selection = selectedKeys(value2, options), controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React7.createElement(SelectWrapper, null, React7.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React7.createElement(
    OptionsSelect,
    {
      disabled: readonly,
      id: controlId,
      multiple: !0,
      value: selection,
      onChange: handleChange
    },
    Object.keys(options).map((key) => React7.createElement("option", { key, value: key }, key))
  ));
}, SelectControl = (props) => {
  let { name, options } = props;
  return options ? props.isMulti ? React7.createElement(MultiSelect, { ...props }) : React7.createElement(SingleSelect, { ...props }) : (logger3.warn(`Select with no options: ${name}`), React7.createElement(React7.Fragment, null, "-"));
};

// ../addons/docs/src/blocks/controls/options/Options.tsx
var normalizeOptions = (options, labels) => Array.isArray(options) ? options.reduce((acc, item) => (acc[labels?.[item] || String(item)] = item, acc), {}) : options, Controls = {
  check: CheckboxControl,
  "inline-check": CheckboxControl,
  radio: RadioControl,
  "inline-radio": RadioControl,
  select: SelectControl,
  "multi-select": SelectControl
}, OptionsControl = (props) => {
  let { type = "select", labels, argType } = props, normalized = {
    ...props,
    argType,
    options: argType ? normalizeOptions(argType.options, labels) : {},
    isInline: type.includes("inline"),
    isMulti: type.includes("multi")
  }, Control = Controls[type];
  if (Control)
    return React8.createElement(Control, { ...normalized });
  throw new Error(`Unknown options type: ${type}`);
};

// ../addons/docs/src/blocks/controls/Object.tsx
import React12, { useCallback as useCallback3, useEffect as useEffect4, useMemo, useRef as useRef3, useState as useState4 } from "react";
import { Button as Button3, Form as Form3, ToggleButton } from "storybook/internal/components";
import { AddIcon, SubtractIcon } from "@storybook/icons";
import { styled as styled9, useTheme } from "storybook/theming";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/index.tsx
import React11, { Component as Component2 } from "react";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/JsonNodes.tsx
import React10, { Component, cloneElement as cloneElement2 } from "react";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/JsonNodeAccordion.tsx
import React9 from "react";
import { styled as styled8 } from "storybook/theming";
var Container = styled8.div(({ theme: theme3 }) => ({
  position: "relative",
  ":hover": {
    "& > .rejt-accordion-button::after": {
      background: theme3.color.secondary
    },
    "& > .rejt-accordion-region > :is(.rejt-plus-menu, .rejt-minus-menu)": {
      opacity: 1
    }
  }
})), Trigger = styled8.button(({ theme: theme3 }) => ({
  padding: 0,
  background: "transparent",
  border: "none",
  marginRight: "3px",
  lineHeight: "22px",
  color: theme3.color.secondary,
  "::after": {
    content: '""',
    position: "absolute",
    top: 0,
    display: "block",
    width: "100%",
    marginLeft: "-1rem",
    height: "22px",
    background: "transparent",
    borderRadius: 4,
    transition: "background 0.2s",
    opacity: 0.1,
    paddingRight: "20px"
  },
  "::before": {
    content: '""',
    position: "absolute"
  },
  '&[aria-expanded="true"]::before': {
    left: -10,
    top: 10,
    borderTop: "3px solid rgba(153,153,153,0.6)",
    borderLeft: "3px solid transparent",
    borderRight: "3px solid transparent"
  },
  '&[aria-expanded="false"]::before': {
    left: -8,
    top: 8,
    borderTop: "3px solid transparent",
    borderBottom: "3px solid transparent",
    borderLeft: "3px solid rgba(153,153,153,0.6)"
  }
})), Region = styled8.div({
  display: "inline"
});
function JsonNodeAccordion({
  children,
  name,
  collapsed,
  keyPath,
  deep,
  ...props
}) {
  let accordionKey = `${keyPath.at(-1) ?? "root"}-${name}-${deep}`, ids = {
    trigger: `${accordionKey}-trigger`,
    region: `${accordionKey}-region`
  }, containerTag = keyPath.length > 0 ? "li" : "div";
  return React9.createElement(Container, { as: containerTag }, React9.createElement(
    Trigger,
    {
      type: "button",
      "aria-expanded": !collapsed,
      id: ids.trigger,
      "aria-controls": ids.region,
      className: "rejt-accordion-button",
      ...props
    },
    name,
    " :"
  ), React9.createElement(
    Region,
    {
      role: "region",
      id: ids.region,
      "aria-labelledby": ids.trigger,
      className: "rejt-accordion-region"
    },
    children
  ));
}

// ../addons/docs/src/blocks/controls/react-editable-json-tree/types/dataTypes.ts
var ERROR = "Error", OBJECT = "Object", ARRAY = "Array", STRING = "String", NUMBER = "Number", BOOLEAN = "Boolean", DATE = "Date", NULL = "Null", UNDEFINED = "Undefined", FUNCTION = "Function", SYMBOL = "Symbol";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/types/deltaTypes.ts
var ADD_DELTA_TYPE = "ADD_DELTA_TYPE", REMOVE_DELTA_TYPE = "REMOVE_DELTA_TYPE", UPDATE_DELTA_TYPE = "UPDATE_DELTA_TYPE";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/types/inputUsageTypes.ts
var VALUE = "value";

// ../addons/docs/src/blocks/controls/react-editable-json-tree/utils/objectTypes.ts
function getObjectType(obj) {
  return obj !== null && typeof obj == "object" && !Array.isArray(obj) && typeof obj[Symbol.iterator] == "function" ? "Iterable" : Object.prototype.toString.call(obj).slice(8, -1);
}
function isComponentWillChange(oldValue, newValue) {
  let oldType = getObjectType(oldValue), newType = getObjectType(newValue);
  return (oldType === "Function" || newType === "Function") && newType !== oldType;
}

// ../addons/docs/src/blocks/controls/react-editable-json-tree/JsonNodes.tsx
var JsonAddValue = class extends Component {
  constructor(props) {
    super(props), this.state = {
      inputRefKey: null,
      inputRefValue: null
    }, this.refInputValue = this.refInputValue.bind(this), this.refInputKey = this.refInputKey.bind(this), this.onKeydown = this.onKeydown.bind(this), this.onSubmit = this.onSubmit.bind(this);
  }
  componentDidMount() {
    let { inputRefKey, inputRefValue } = this.state, { onlyValue } = this.props;
    inputRefKey && typeof inputRefKey.focus == "function" && inputRefKey.focus(), onlyValue && inputRefValue && typeof inputRefValue.focus == "function" && inputRefValue.focus();
  }
  onKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat)
      return;
    let { inputRefKey, inputRefValue } = this.state, { addButtonElement, handleCancel } = this.props;
    [inputRefKey, inputRefValue, addButtonElement].some(
      (elm) => elm === event.target
    ) && ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.onSubmit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), handleCancel()));
  }
  onSubmit() {
    let { handleAdd, onlyValue, onSubmitValueParser, keyPath, deep } = this.props, { inputRefKey, inputRefValue } = this.state, result = {};
    if (!onlyValue) {
      if (!inputRefKey.value)
        return;
      result.key = inputRefKey.value;
    }
    result.newValue = onSubmitValueParser(!1, keyPath, deep, result.key, inputRefValue.value), handleAdd(result);
  }
  refInputKey(node) {
    this.state.inputRefKey = node;
  }
  refInputValue(node) {
    this.state.inputRefValue = node;
  }
  render() {
    let {
      handleCancel,
      onlyValue,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      keyPath,
      deep
    } = this.props, addButtonElementLayout = addButtonElement && cloneElement2(addButtonElement, {
      onClick: this.onSubmit
    }), cancelButtonElementLayout = cancelButtonElement && cloneElement2(cancelButtonElement, {
      onClick: handleCancel
    }), inputElementValue = inputElementGenerator(VALUE, keyPath, deep), inputElementValueLayout = cloneElement2(inputElementValue, {
      placeholder: "Value",
      ref: this.refInputValue,
      onKeyDown: this.onKeydown
    }), inputElementKeyLayout = null;
    if (!onlyValue) {
      let inputElementKey = inputElementGenerator("key", keyPath, deep);
      inputElementKeyLayout = cloneElement2(inputElementKey, {
        placeholder: "Key",
        ref: this.refInputKey,
        onKeyDown: this.onKeydown
      });
    }
    return React10.createElement("span", { className: "rejt-add-value-node" }, inputElementKeyLayout, inputElementValueLayout, addButtonElementLayout, cancelButtonElementLayout);
  }
};
JsonAddValue.defaultProps = {
  onlyValue: !1,
  addButtonElement: React10.createElement("button", null, "+"),
  cancelButtonElement: React10.createElement("button", null, "c")
};
var JsonArray = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      data: props.data,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: !1
    }, this.handleCollapseMode = this.handleCollapseMode.bind(this), this.handleRemoveItem = this.handleRemoveItem.bind(this), this.handleAddMode = this.handleAddMode.bind(this), this.handleAddValueAdd = this.handleAddValueAdd.bind(this), this.handleAddValueCancel = this.handleAddValueCancel.bind(this), this.handleEditValue = this.handleEditValue.bind(this), this.onChildUpdate = this.onChildUpdate.bind(this), this.renderCollapsed = this.renderCollapsed.bind(this), this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  onChildUpdate(childKey, childData) {
    let { data, keyPath = [] } = this.state;
    data[childKey] = childData, this.setState({
      data
    });
    let { onUpdate } = this.props, size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }
  handleAddMode() {
    this.setState({
      addFormVisible: !0
    });
  }
  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed
    }));
  }
  handleRemoveItem(index) {
    return () => {
      let { beforeRemoveAction, logger: logger5 } = this.props, { data, keyPath, nextDeep: deep } = this.state, oldValue = data[index];
      (beforeRemoveAction || Promise.resolve.bind(Promise))(index, keyPath, deep, oldValue).then(() => {
        let deltaUpdateResult = {
          keyPath,
          deep,
          key: index,
          oldValue,
          type: REMOVE_DELTA_TYPE
        };
        data.splice(index, 1), this.setState({ data });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate(deltaUpdateResult);
      }).catch(logger5.error);
    };
  }
  handleAddValueAdd({ newValue }) {
    let { data, keyPath = [], nextDeep: deep } = this.state, { beforeAddAction, logger: logger5 } = this.props, key = data.length;
    (beforeAddAction || Promise.resolve.bind(Promise))(key, keyPath, deep, newValue).then(() => {
      data[key] = newValue, this.setState({
        data
      }), this.handleAddValueCancel();
      let { onUpdate, onDeltaUpdate } = this.props;
      onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
        type: ADD_DELTA_TYPE,
        keyPath,
        deep,
        key,
        newValue
      });
    }).catch(logger5.error);
  }
  handleAddValueCancel() {
    this.setState({
      addFormVisible: !1
    });
  }
  handleEditValue({ key, value: value2 }) {
    return new Promise((resolve, reject) => {
      let { beforeUpdateAction } = this.props, { data, keyPath, nextDeep: deep } = this.state, oldValue = data[key];
      (beforeUpdateAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue, value2).then(() => {
        data[key] = value2, this.setState({
          data
        });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
          type: UPDATE_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue: value2,
          oldValue
        }), resolve(void 0);
      }).catch(reject);
    });
  }
  renderCollapsed() {
    let { name, data, keyPath, deep } = this.state, { handleRemove, readOnly, getStyle, dataType, minusMenuElement } = this.props, { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType), isReadOnly = readOnly(name, data, keyPath, deep, dataType), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the array '${String(name)}'`
    });
    return React10.createElement(React10.Fragment, null, React10.createElement("span", { style: collapsed }, "[...] ", data.length, " ", data.length === 1 ? "item" : "items"), !isReadOnly && removeItemButton);
  }
  renderNotCollapsed() {
    let { name, data, keyPath, deep, addFormVisible, nextDeep } = this.state, {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      getStyle,
      dataType,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger5,
      onSubmitValueParser
    } = this.props, { minus, plus, delimiter, ul, addForm } = getStyle(name, data, keyPath, deep, dataType), isReadOnly = readOnly(name, data, keyPath, deep, dataType), addItemButton = plusMenuElement && cloneElement2(plusMenuElement, {
      onClick: this.handleAddMode,
      className: "rejt-plus-menu",
      style: plus,
      "aria-label": `add a new item to the '${String(name)}' array`
    }), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the array '${String(name)}'`
    });
    return React10.createElement(React10.Fragment, null, React10.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "["), !addFormVisible && addItemButton, React10.createElement("ul", { className: "rejt-not-collapsed-list", style: ul }, data.map((item, index) => React10.createElement(
      JsonNode,
      {
        key: index,
        name: index.toString(),
        data: item,
        keyPath,
        deep: nextDeep,
        isCollapsed,
        handleRemove: this.handleRemoveItem(index),
        handleUpdateValue: this.handleEditValue,
        onUpdate: this.onChildUpdate,
        onDeltaUpdate,
        readOnly,
        getStyle,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        textareaElementGenerator,
        minusMenuElement,
        plusMenuElement,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger5,
        onSubmitValueParser
      }
    ))), !isReadOnly && addFormVisible && React10.createElement("div", { className: "rejt-add-form", style: addForm }, React10.createElement(
      JsonAddValue,
      {
        handleAdd: this.handleAddValueAdd,
        handleCancel: this.handleAddValueCancel,
        onlyValue: !0,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        keyPath,
        deep,
        onSubmitValueParser
      }
    )), React10.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "]"), !isReadOnly && removeItemButton);
  }
  render() {
    let { name, collapsed, keyPath, deep } = this.state, value2 = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
    return React10.createElement(
      JsonNodeAccordion,
      {
        name,
        collapsed,
        deep,
        keyPath,
        onClick: this.handleCollapseMode
      },
      value2
    );
  }
};
JsonArray.defaultProps = {
  keyPath: [],
  deep: 0,
  minusMenuElement: React10.createElement("span", null, " - "),
  plusMenuElement: React10.createElement("span", null, " + ")
};
var JsonFunctionValue = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      editEnabled: !1,
      inputRef: null
    }, this.handleEditMode = this.handleEditMode.bind(this), this.refInput = this.refInput.bind(this), this.handleCancelEdit = this.handleCancelEdit.bind(this), this.handleEdit = this.handleEdit.bind(this), this.onKeydown = this.onKeydown.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.value !== state.value ? { value: props.value } : null;
  }
  componentDidUpdate() {
    let { editEnabled, inputRef, name, value: value2, keyPath, deep } = this.state, { readOnly, dataType } = this.props, readOnlyResult = readOnly(name, value2, keyPath, deep, dataType);
    editEnabled && !readOnlyResult && typeof inputRef.focus == "function" && inputRef.focus();
  }
  onKeydown(event) {
    let { inputRef } = this.state;
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || inputRef !== event.target || ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.handleEdit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), this.handleCancelEdit()));
  }
  handleEdit() {
    let { handleUpdateValue, originalValue, logger: logger5, onSubmitValueParser, keyPath } = this.props, { inputRef, name, deep } = this.state;
    if (!inputRef)
      return;
    let newValue = onSubmitValueParser(!0, keyPath, deep, name, inputRef.value), result = {
      value: newValue,
      key: name
    };
    (handleUpdateValue || Promise.resolve.bind(Promise))(result).then(() => {
      isComponentWillChange(originalValue, newValue) || this.handleCancelEdit();
    }).catch(logger5.error);
  }
  handleEditMode() {
    this.setState({
      editEnabled: !0
    });
  }
  refInput(node) {
    this.state.inputRef = node;
  }
  handleCancelEdit() {
    this.setState({
      editEnabled: !1
    });
  }
  render() {
    let { name, value: value2, editEnabled, keyPath, deep } = this.state, {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      getStyle,
      textareaElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath = []
    } = this.props, style = getStyle(name, originalValue, keyPath, deep, dataType), result = null, minusElement = null, resultOnlyResult = readOnly(name, originalValue, keyPath, deep, dataType);
    if (editEnabled && !resultOnlyResult) {
      let textareaElement = textareaElementGenerator(
        VALUE,
        comeFromKeyPath,
        deep,
        name,
        originalValue,
        dataType
      ), textareaElementLayout = cloneElement2(textareaElement, {
        ref: this.refInput,
        defaultValue: value2,
        onKeyDown: this.onKeydown
      });
      result = React10.createElement("span", { className: "rejt-edit-form", style: style.editForm }, textareaElementLayout), minusElement = null;
    } else {
      result = React10.createElement(
        "span",
        {
          className: "rejt-value",
          style: style.value,
          onClick: resultOnlyResult ? void 0 : this.handleEditMode
        },
        value2
      );
      let parentPropertyName = comeFromKeyPath.at(-1), minusMenuLayout = minusMenuElement && cloneElement2(minusMenuElement, {
        onClick: handleRemove,
        className: "rejt-minus-menu",
        style: style.minus,
        "aria-label": `remove the function '${String(name)}'${String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ""}`
      });
      minusElement = resultOnlyResult ? null : minusMenuLayout;
    }
    return React10.createElement("li", { className: "rejt-value-node", style: style.li }, React10.createElement("span", { className: "rejt-name", style: style.name }, name, " :", " "), result, minusElement);
  }
};
JsonFunctionValue.defaultProps = {
  keyPath: [],
  deep: 0,
  handleUpdateValue: () => {
  },
  cancelButtonElement: React10.createElement("button", null, "c"),
  minusMenuElement: React10.createElement("span", null, " - ")
};
var JsonNode = class extends Component {
  constructor(props) {
    super(props), this.state = {
      data: props.data,
      name: props.name,
      keyPath: props.keyPath ?? [],
      deep: props.deep ?? 0
    };
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  render() {
    let { data, name, keyPath, deep } = this.state, {
      isCollapsed,
      handleRemove,
      handleUpdateValue,
      onUpdate,
      onDeltaUpdate,
      readOnly,
      getStyle,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger5,
      onSubmitValueParser
    } = this.props, readOnlyTrue = () => !0, dataType = getObjectType(data);
    switch (dataType) {
      case ERROR:
        return React10.createElement(
          JsonObject,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case OBJECT:
        return React10.createElement(
          JsonObject,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case ARRAY:
        return React10.createElement(
          JsonArray,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case STRING:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: `"${data}"`,
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case NUMBER:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: data,
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case BOOLEAN:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: data ? "true" : "false",
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case DATE:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: data.toISOString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case NULL:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: "null",
            originalValue: "null",
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case UNDEFINED:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: "undefined",
            originalValue: "undefined",
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case FUNCTION:
        return React10.createElement(
          JsonFunctionValue,
          {
            name,
            value: data.toString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            textareaElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      case SYMBOL:
        return React10.createElement(
          JsonValue,
          {
            name,
            value: data.toString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger5,
            onSubmitValueParser
          }
        );
      default:
        return null;
    }
  }
};
JsonNode.defaultProps = {
  keyPath: [],
  deep: 0
};
var JsonObject = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = props.deep === -1 ? [] : [...props.keyPath || [], props.name];
    this.state = {
      name: props.name,
      data: props.data,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: !1
    }, this.handleCollapseMode = this.handleCollapseMode.bind(this), this.handleRemoveValue = this.handleRemoveValue.bind(this), this.handleAddMode = this.handleAddMode.bind(this), this.handleAddValueAdd = this.handleAddValueAdd.bind(this), this.handleAddValueCancel = this.handleAddValueCancel.bind(this), this.handleEditValue = this.handleEditValue.bind(this), this.onChildUpdate = this.onChildUpdate.bind(this), this.renderCollapsed = this.renderCollapsed.bind(this), this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  onChildUpdate(childKey, childData) {
    let { data, keyPath = [] } = this.state;
    data[childKey] = childData, this.setState({
      data
    });
    let { onUpdate } = this.props, size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }
  handleAddMode() {
    this.setState({
      addFormVisible: !0
    });
  }
  handleAddValueCancel() {
    this.setState({
      addFormVisible: !1
    });
  }
  handleAddValueAdd({ key, newValue }) {
    let { data, keyPath = [], nextDeep: deep } = this.state, { beforeAddAction, logger: logger5 } = this.props;
    (beforeAddAction || Promise.resolve.bind(Promise))(key, keyPath, deep, newValue).then(() => {
      data[key] = newValue, this.setState({
        data
      }), this.handleAddValueCancel();
      let { onUpdate, onDeltaUpdate } = this.props;
      onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
        type: ADD_DELTA_TYPE,
        keyPath,
        deep,
        key,
        newValue
      });
    }).catch(logger5.error);
  }
  handleRemoveValue(key) {
    return () => {
      let { beforeRemoveAction, logger: logger5 } = this.props, { data, keyPath = [], nextDeep: deep } = this.state, oldValue = data[key];
      (beforeRemoveAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue).then(() => {
        let deltaUpdateResult = {
          keyPath,
          deep,
          key,
          oldValue,
          type: REMOVE_DELTA_TYPE
        };
        delete data[key], this.setState({ data });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate(deltaUpdateResult);
      }).catch(logger5.error);
    };
  }
  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed
    }));
  }
  handleEditValue({ key, value: value2 }) {
    return new Promise((resolve, reject) => {
      let { beforeUpdateAction } = this.props, { data, keyPath = [], nextDeep: deep } = this.state, oldValue = data[key];
      (beforeUpdateAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue, value2).then(() => {
        data[key] = value2, this.setState({
          data
        });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
          type: UPDATE_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue: value2,
          oldValue
        }), resolve();
      }).catch(reject);
    });
  }
  renderCollapsed() {
    let { name, keyPath, deep, data } = this.state, { handleRemove, readOnly, dataType, getStyle, minusMenuElement } = this.props, { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType), keyList = Object.getOwnPropertyNames(data), isReadOnly = readOnly(name, data, keyPath, deep, dataType), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the object '${String(name)}'`
    });
    return React10.createElement(React10.Fragment, null, React10.createElement("span", { style: collapsed }, "{...}", " ", keyList.length, " ", keyList.length === 1 ? "key" : "keys"), !isReadOnly && removeItemButton);
  }
  renderNotCollapsed() {
    let { name, data, keyPath, deep, nextDeep, addFormVisible } = this.state, {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      getStyle,
      dataType,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger5,
      onSubmitValueParser
    } = this.props, { minus, plus, addForm, ul, delimiter } = getStyle(name, data, keyPath, deep, dataType), keyList = Object.getOwnPropertyNames(data), isReadOnly = readOnly(name, data, keyPath, deep, dataType), addItemButton = plusMenuElement && cloneElement2(plusMenuElement, {
      onClick: this.handleAddMode,
      className: "rejt-plus-menu",
      style: plus,
      "aria-label": `add a new property to the object '${String(name)}'`
    }), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the object '${String(name)}'`
    }), list = keyList.map((key) => React10.createElement(
      JsonNode,
      {
        key,
        name: key,
        data: data[key],
        keyPath,
        deep: nextDeep,
        isCollapsed,
        handleRemove: this.handleRemoveValue(key),
        handleUpdateValue: this.handleEditValue,
        onUpdate: this.onChildUpdate,
        onDeltaUpdate,
        readOnly,
        getStyle,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        textareaElementGenerator,
        minusMenuElement,
        plusMenuElement,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger5,
        onSubmitValueParser
      }
    ));
    return React10.createElement(React10.Fragment, null, React10.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "{"), !isReadOnly && addItemButton, React10.createElement("ul", { className: "rejt-not-collapsed-list", style: ul }, list), !isReadOnly && addFormVisible && React10.createElement("div", { className: "rejt-add-form", style: addForm }, React10.createElement(
      JsonAddValue,
      {
        handleAdd: this.handleAddValueAdd,
        handleCancel: this.handleAddValueCancel,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        keyPath,
        deep,
        onSubmitValueParser
      }
    )), React10.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "}"), !isReadOnly && removeItemButton);
  }
  render() {
    let { name, collapsed, keyPath, deep = 0 } = this.state, value2 = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
    return React10.createElement(
      JsonNodeAccordion,
      {
        name,
        collapsed,
        deep,
        keyPath,
        onClick: this.handleCollapseMode
      },
      value2
    );
  }
};
JsonObject.defaultProps = {
  keyPath: [],
  deep: 0,
  minusMenuElement: React10.createElement("span", null, " - "),
  plusMenuElement: React10.createElement("span", null, " + ")
};
var JsonValue = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      editEnabled: !1,
      inputRef: null
    }, this.handleEditMode = this.handleEditMode.bind(this), this.refInput = this.refInput.bind(this), this.handleCancelEdit = this.handleCancelEdit.bind(this), this.handleEdit = this.handleEdit.bind(this), this.onKeydown = this.onKeydown.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.value !== state.value ? { value: props.value } : null;
  }
  componentDidUpdate() {
    let { editEnabled, inputRef, name, value: value2, keyPath, deep } = this.state, { readOnly, dataType } = this.props, isReadOnly = readOnly(name, value2, keyPath, deep, dataType);
    editEnabled && !isReadOnly && typeof inputRef.focus == "function" && inputRef.focus();
  }
  onKeydown(event) {
    let { inputRef } = this.state;
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || inputRef !== event.target || ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.handleEdit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), this.handleCancelEdit()));
  }
  handleEdit() {
    let { handleUpdateValue, originalValue, logger: logger5, onSubmitValueParser, keyPath } = this.props, { inputRef, name, deep } = this.state;
    if (!inputRef)
      return;
    let newValue = onSubmitValueParser(!0, keyPath, deep, name, inputRef.value), result = {
      value: newValue,
      key: name
    };
    (handleUpdateValue || Promise.resolve.bind(Promise))(result).then(() => {
      isComponentWillChange(originalValue, newValue) || this.handleCancelEdit();
    }).catch(logger5.error);
  }
  handleEditMode() {
    this.setState({
      editEnabled: !0
    });
  }
  refInput(node) {
    this.state.inputRef = node;
  }
  handleCancelEdit() {
    this.setState({
      editEnabled: !1
    });
  }
  render() {
    let { name, value: value2, editEnabled, keyPath, deep } = this.state, {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      getStyle,
      inputElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath
    } = this.props, style = getStyle(name, originalValue, keyPath, deep, dataType), isReadOnly = readOnly(name, originalValue, keyPath, deep, dataType), isEditing = editEnabled && !isReadOnly, inputElement = inputElementGenerator(
      VALUE,
      comeFromKeyPath,
      deep,
      name,
      originalValue,
      dataType
    ), inputElementLayout = cloneElement2(inputElement, {
      ref: this.refInput,
      defaultValue: JSON.stringify(originalValue),
      onKeyDown: this.onKeydown
    }), parentPropertyName = keyPath.at(-2), minusMenuLayout = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: style.minus,
      "aria-label": `remove the property '${String(name)}' with value '${String(originalValue)}'${String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ""}`
    });
    return React10.createElement("li", { className: "rejt-value-node", style: style.li }, React10.createElement("span", { className: "rejt-name", style: style.name }, name, " : "), isEditing ? React10.createElement("span", { className: "rejt-edit-form", style: style.editForm }, inputElementLayout) : React10.createElement(
      "span",
      {
        className: "rejt-value",
        style: style.value,
        onClick: isReadOnly ? void 0 : this.handleEditMode
      },
      String(value2)
    ), !isReadOnly && !isEditing && minusMenuLayout);
  }
};
JsonValue.defaultProps = {
  keyPath: [],
  deep: 0,
  handleUpdateValue: () => Promise.resolve(),
  cancelButtonElement: React10.createElement("button", null, "c"),
  minusMenuElement: React10.createElement("span", null, " - ")
};

// ../addons/docs/src/blocks/controls/react-editable-json-tree/utils/parse.ts
function parse3(string) {
  let result = string;
  if (result.indexOf("function") === 0)
    return (0, eval)(`(${result})`);
  try {
    result = JSON.parse(string);
  } catch {
  }
  return result;
}

// ../addons/docs/src/blocks/controls/react-editable-json-tree/utils/styles.ts
var object = {
  minus: {
    color: "red"
  },
  plus: {
    color: "green"
  },
  collapsed: {
    color: "grey"
  },
  delimiter: {},
  ul: {
    padding: "0px",
    margin: "0 0 0 25px",
    listStyle: "none"
  },
  name: {
    color: "#2287CD"
  },
  addForm: {}
}, array = {
  minus: {
    color: "red"
  },
  plus: {
    color: "green"
  },
  collapsed: {
    color: "grey"
  },
  delimiter: {},
  ul: {
    padding: "0px",
    margin: "0 0 0 25px",
    listStyle: "none"
  },
  name: {
    color: "#2287CD"
  },
  addForm: {}
}, value = {
  minus: {
    color: "red"
  },
  editForm: {},
  value: {
    color: "#7bba3d"
  },
  li: {
    minHeight: "22px",
    lineHeight: "22px",
    outline: "0px"
  },
  name: {
    color: "#2287CD"
  }
};

// ../addons/docs/src/blocks/controls/react-editable-json-tree/index.tsx
var JsonTree = class extends Component2 {
  constructor(props) {
    super(props), this.state = {
      data: props.data,
      rootName: props.rootName
    }, this.onUpdate = this.onUpdate.bind(this), this.removeRoot = this.removeRoot.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data || props.rootName !== state.rootName ? {
      data: props.data,
      rootName: props.rootName
    } : null;
  }
  onUpdate(key, data) {
    this.setState({ data }), this.props.onFullyUpdate?.(data);
  }
  removeRoot() {
    this.onUpdate(null, null);
  }
  render() {
    let { data, rootName } = this.state, {
      isCollapsed,
      onDeltaUpdate,
      readOnly,
      getStyle,
      addButtonElement,
      cancelButtonElement,
      inputElement,
      textareaElement,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger5,
      onSubmitValueParser,
      fallback = null
    } = this.props, dataType = getObjectType(data), readOnlyFunction = readOnly;
    getObjectType(readOnly) === "Boolean" && (readOnlyFunction = () => readOnly);
    let inputElementFunction = inputElement;
    inputElement && getObjectType(inputElement) !== "Function" && (inputElementFunction = () => inputElement);
    let textareaElementFunction = textareaElement;
    return textareaElement && getObjectType(textareaElement) !== "Function" && (textareaElementFunction = () => textareaElement), dataType === "Object" || dataType === "Array" ? React11.createElement("div", { className: "rejt-tree" }, React11.createElement(
      JsonNode,
      {
        data,
        name: rootName || "root",
        deep: -1,
        isCollapsed: isCollapsed ?? (() => !1),
        onUpdate: this.onUpdate,
        onDeltaUpdate: onDeltaUpdate ?? (() => {
        }),
        readOnly: readOnlyFunction,
        getStyle: getStyle ?? (() => ({})),
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator: inputElementFunction,
        textareaElementGenerator: textareaElementFunction,
        minusMenuElement,
        plusMenuElement,
        handleRemove: this.removeRoot,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger5 ?? {},
        onSubmitValueParser: onSubmitValueParser ?? ((val) => val)
      }
    )) : fallback;
  }
};
JsonTree.defaultProps = {
  rootName: "root",
  isCollapsed: (keyPath, deep) => deep !== -1,
  getStyle: (keyName, data, keyPath, deep, dataType) => {
    switch (dataType) {
      case "Object":
      case "Error":
        return object;
      case "Array":
        return array;
      default:
        return value;
    }
  },
  readOnly: () => !1,
  onFullyUpdate: () => {
  },
  onDeltaUpdate: () => {
  },
  beforeRemoveAction: () => Promise.resolve(),
  beforeAddAction: () => Promise.resolve(),
  beforeUpdateAction: () => Promise.resolve(),
  logger: { error: () => {
  } },
  onSubmitValueParser: (isEditMode, keyPath, deep, name, rawValue) => parse3(rawValue),
  inputElement: () => React11.createElement("input", null),
  textareaElement: () => React11.createElement("textarea", null),
  fallback: null
};

// ../addons/docs/src/blocks/controls/Object.tsx
var { window: globalWindow } = globalThis, Wrapper5 = styled9.div(({ theme: theme3 }) => ({
  position: "relative",
  display: "flex",
  isolation: "isolate",
  ".rejt-tree": {
    marginLeft: "1rem",
    fontSize: "13px",
    listStyleType: "none"
  },
  ".rejt-value-node:hover": {
    "& > button": {
      opacity: 1
    }
  },
  ".rejt-add-form": {
    marginLeft: 10
  },
  ".rejt-add-value-node": {
    display: "inline-flex",
    alignItems: "center"
  },
  ".rejt-name": {
    lineHeight: "22px"
  },
  ".rejt-not-collapsed-delimiter": {
    lineHeight: "22px"
  },
  ".rejt-value": {
    display: "inline-block",
    border: "1px solid transparent",
    borderRadius: 4,
    margin: "1px 0",
    padding: "0 4px",
    cursor: "text",
    color: theme3.color.defaultText
  },
  ".rejt-value-node:hover > .rejt-value": {
    background: theme3.base === "light" ? theme3.color.lighter : "hsl(0 0 100 / 0.02)",
    borderColor: theme3.appBorderColor
  }
})), ButtonInline = styled9.button(({ theme: theme3, primary }) => ({
  border: 0,
  height: 20,
  margin: 1,
  borderRadius: 4,
  background: primary ? theme3.color.secondary : "transparent",
  color: primary ? theme3.color.lightest : theme3.color.dark,
  fontWeight: primary ? "bold" : "normal",
  cursor: "pointer"
})), ActionButton = styled9.button(({ theme: theme3 }) => ({
  background: "none",
  border: 0,
  display: "inline-flex",
  verticalAlign: "middle",
  padding: 3,
  marginLeft: 5,
  color: theme3.textMutedColor,
  opacity: 0,
  transition: "opacity 0.2s",
  cursor: "pointer",
  position: "relative",
  svg: {
    width: 9,
    height: 9
  },
  ":disabled": {
    cursor: "not-allowed"
  },
  ":hover, :focus-visible": {
    opacity: 1
  },
  "&:hover:not(:disabled), &:focus-visible:not(:disabled)": {
    "&.rejt-plus-menu": {
      color: theme3.color.ancillary
    },
    "&.rejt-minus-menu": {
      color: theme3.color.negative
    }
  }
})), Input = styled9.input(({ theme: theme3, placeholder }) => ({
  outline: 0,
  margin: placeholder ? 1 : "1px 0",
  padding: "3px 4px",
  color: theme3.color.defaultText,
  background: theme3.background.app,
  border: `1px solid ${theme3.appBorderColor}`,
  borderRadius: 4,
  lineHeight: "14px",
  width: placeholder === "Key" ? 80 : 120,
  "&:focus": {
    border: `1px solid ${theme3.color.secondary}`
  }
})), RawButton = styled9(ToggleButton)({
  position: "absolute",
  zIndex: 2,
  top: 2,
  right: 2
}), RawInput = styled9(Form3.Textarea)(({ theme: theme3 }) => ({
  flex: 1,
  padding: "7px 6px",
  fontFamily: theme3.typography.fonts.mono,
  fontSize: "12px",
  lineHeight: "18px",
  "&::placeholder": {
    fontFamily: theme3.typography.fonts.base,
    fontSize: "13px"
  },
  "&:placeholder-shown": {
    padding: "7px 10px"
  }
})), ENTER_EVENT = {
  bubbles: !0,
  cancelable: !0,
  key: "Enter",
  code: "Enter",
  keyCode: 13
}, dispatchEnterKey = (event) => {
  event.currentTarget.dispatchEvent(new globalWindow.KeyboardEvent("keydown", ENTER_EVENT));
}, selectValue = (event) => {
  event.currentTarget.select();
}, getCustomStyleFunction = (theme3) => () => ({
  name: {
    color: theme3.color.secondary
  },
  collapsed: {
    color: theme3.color.dark
  },
  ul: {
    listStyle: "none",
    margin: "0 0 0 1rem",
    padding: 0
  },
  li: {
    outline: 0
  }
}), ObjectControl = ({ name, value: value2, onChange, argType }) => {
  let theme3 = useTheme(), data = useMemo(() => value2 && cloneDeep(value2), [value2]), hasData = data != null, [showRaw, setShowRaw] = useState4(!hasData), [parseError, setParseError] = useState4(null), readonly = !!argType?.table?.readonly, updateRaw = useCallback3(
    (raw) => {
      try {
        raw && onChange(JSON.parse(raw)), setParseError(null);
      } catch (e2) {
        setParseError(e2);
      }
    },
    [onChange]
  ), [forceVisible, setForceVisible] = useState4(!1), onForceVisible = useCallback3(() => {
    onChange({}), setForceVisible(!0);
  }, [setForceVisible]), htmlElRef = useRef3(null);
  if (useEffect4(() => {
    forceVisible && htmlElRef.current && htmlElRef.current.select();
  }, [forceVisible]), !hasData)
    return React12.createElement(
      Button3,
      {
        ariaLabel: !1,
        disabled: readonly,
        id: getControlSetterButtonId(name),
        onClick: onForceVisible
      },
      "Set object"
    );
  let rawJSONForm = React12.createElement(
    RawInput,
    {
      ref: htmlElRef,
      id: getControlId(name),
      minRows: 3,
      name,
      defaultValue: value2 === null ? "" : JSON.stringify(value2, null, 2),
      onBlur: (event) => updateRaw(event.target.value),
      placeholder: "Edit JSON string...",
      autoFocus: forceVisible,
      valid: parseError ? "error" : void 0,
      readOnly: readonly
    }
  ), isObjectOrArray = Array.isArray(value2) || typeof value2 == "object" && value2?.constructor === Object;
  return React12.createElement(Wrapper5, null, isObjectOrArray && React12.createElement(
    RawButton,
    {
      disabled: readonly,
      pressed: showRaw,
      ariaLabel: `Edit the ${name} properties in JSON format`,
      onClick: (e2) => {
        e2.preventDefault(), setShowRaw((isRaw) => !isRaw);
      }
    },
    "Edit JSON"
  ), showRaw ? rawJSONForm : React12.createElement(
    JsonTree,
    {
      readOnly: readonly || !isObjectOrArray,
      isCollapsed: isObjectOrArray ? (
        /* default value */
        void 0
      ) : () => !0,
      data,
      rootName: name,
      onFullyUpdate: onChange,
      getStyle: getCustomStyleFunction(theme3),
      cancelButtonElement: React12.createElement(ButtonInline, { type: "button" }, "Cancel"),
      addButtonElement: React12.createElement(ButtonInline, { type: "submit", primary: !0 }, "Save"),
      plusMenuElement: React12.createElement(ActionButton, { type: "button" }, React12.createElement(AddIcon, null)),
      minusMenuElement: React12.createElement(ActionButton, { type: "button" }, React12.createElement(SubtractIcon, null)),
      inputElement: (_2, __, ___, key) => key ? React12.createElement(Input, { onFocus: selectValue, onBlur: dispatchEnterKey }) : React12.createElement(Input, null),
      fallback: rawJSONForm
    }
  ));
};

// ../addons/docs/src/blocks/controls/Range.tsx
import React13, { useMemo as useMemo2 } from "react";
import { styled as styled10 } from "storybook/theming";
var RangeInput = styled10.input(
  ({ theme: theme3, min, max, value: value2, disabled }) => {
    let trackBaseStyles = {
      background: theme3.base === "light" ? `linear-gradient(to right, 
          ${theme3.color.green} 0%, ${theme3.color.green} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedDarken$1(0.02, theme3.input.background)} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedDarken$1(0.02, theme3.input.background)} 100%)` : `linear-gradient(to right, 
          ${theme3.color.green} 0%, ${theme3.color.green} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedLighten$1(0.02, theme3.input.background)} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedLighten$1(0.02, theme3.input.background)} 100%)`,
      borderRadius: 6,
      boxShadow: `${theme3.base == "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"} 0 0 0 1px inset`,
      cursor: disabled ? "not-allowed" : "pointer",
      height: 6,
      width: "100%"
    }, trackFocusStyles = {
      borderColor: rgba(theme3.color.secondary, 0.4)
    }, thumbBaseStyles = {
      width: 16,
      height: 16,
      borderRadius: 50,
      cursor: disabled ? "not-allowed" : "grab",
      background: theme3.input.background,
      border: `1px solid ${theme3.base == "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"}`,
      boxShadow: theme3.base === "light" ? `0 1px 3px 0px ${rgba(theme3.appBorderColor, 0.2)}` : "unset",
      transition: "all 150ms ease-out"
    }, thumbHoverStyles = {
      background: `${curriedDarken$1(0.05, theme3.input.background)}`,
      transform: "scale3d(1.1, 1.1, 1.1) translateY(-1px)",
      transition: "all 50ms ease-out"
    }, thumbActiveStyles = {
      background: `${theme3.input.background}`,
      transform: "scale3d(1, 1, 1) translateY(0px)"
    }, thumbFocusStyles = {
      borderColor: theme3.color.secondary,
      boxShadow: theme3.base === "light" ? `0 0px 5px 0px ${theme3.color.secondary}` : "unset"
    };
    return {
      // Restyled using http://danielstern.ca/range.css/#/
      appearance: "none",
      backgroundColor: "transparent",
      width: "100%",
      // Track styles
      "&::-webkit-slider-runnable-track": trackBaseStyles,
      "&::-moz-range-track": trackBaseStyles,
      "&::-ms-track": {
        ...trackBaseStyles,
        color: "transparent"
      },
      // Thumb styles
      "&::-moz-range-thumb": {
        ...thumbBaseStyles,
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&::-webkit-slider-thumb": {
        ...thumbBaseStyles,
        marginTop: "-6px",
        appearance: "none",
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&::-ms-thumb": {
        ...thumbBaseStyles,
        marginTop: 0,
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&:focus": {
        outline: "none",
        "&::-webkit-slider-runnable-track": trackFocusStyles,
        "&::-moz-range-track": trackFocusStyles,
        "&::-ms-track": trackFocusStyles,
        "&::-webkit-slider-thumb": thumbFocusStyles,
        "&::-moz-range-thumb": thumbFocusStyles,
        "&::-ms-thumb": thumbFocusStyles
      },
      "&::-ms-fill-lower": {
        borderRadius: 6
      },
      "&::-ms-fill-upper": {
        borderRadius: 6
      },
      "@supports (-ms-ime-align:auto)": { "input[type=range]": { margin: "0" } }
    };
  }
), RangeLabel = styled10.span({
  paddingLeft: 5,
  paddingRight: 5,
  fontSize: 12,
  whiteSpace: "nowrap",
  fontFeatureSettings: "tnum",
  fontVariantNumeric: "tabular-nums"
}), RangeCurrentAndMaxLabel = styled10(RangeLabel)(({ numberOFDecimalsPlaces, max }) => ({
  // Fixed width of "current / max" label to avoid slider width changes
  // 3 = size of separator " / "
  width: `${numberOFDecimalsPlaces + max.toString().length * 2 + 3}ch`,
  textAlign: "right",
  flexShrink: 0
})), RangeWrapper = styled10.div(({ readOnly }) => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  opacity: readOnly ? 0.5 : 1
}));
function getNumberOfDecimalPlaces(number) {
  let match = number.toString().match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  return match ? Math.max(
    0,
    // Number of digits right of decimal point.
    (match[1] ? match[1].length : 0) - // Adjust for scientific notation.
    (match[2] ? +match[2] : 0)
  ) : 0;
}
var RangeControl = ({
  name,
  value: value2,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  onBlur,
  onFocus,
  argType
}) => {
  let handleChange = (event) => {
    onChange(parse2(event.target.value));
  }, hasValue = value2 !== void 0, numberOFDecimalsPlaces = useMemo2(() => getNumberOfDecimalPlaces(step), [step]), readonly = !!argType?.table?.readonly, controlId = getControlId(name);
  return React13.createElement(RangeWrapper, { readOnly: readonly }, React13.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React13.createElement(RangeLabel, null, min), React13.createElement(
    RangeInput,
    {
      id: controlId,
      type: "range",
      disabled: readonly,
      onChange: handleChange,
      name,
      min,
      max,
      step,
      onFocus,
      onBlur,
      value: value2 ?? min
    }
  ), React13.createElement(RangeCurrentAndMaxLabel, { numberOFDecimalsPlaces, max }, hasValue ? value2.toFixed(numberOFDecimalsPlaces) : "--", " / ", max));
};

// ../addons/docs/src/blocks/controls/Text.tsx
import React14, { useCallback as useCallback4, useState as useState5 } from "react";
import { Button as Button4, Form as Form4 } from "storybook/internal/components";
import { styled as styled11 } from "storybook/theming";
var Wrapper6 = styled11.label({
  display: "flex"
}), MaxLength = styled11.div(({ isMaxed }) => ({
  marginLeft: "0.75rem",
  paddingTop: "0.35rem",
  color: isMaxed ? "red" : void 0
})), TextControl = ({
  name,
  value: value2,
  onChange,
  onFocus,
  onBlur,
  maxLength,
  argType
}) => {
  let handleChange = (event) => {
    onChange(event.target.value);
  }, readonly = !!argType?.table?.readonly, [forceVisible, setForceVisible] = useState5(!1), onForceVisible = useCallback4(() => {
    onChange(""), setForceVisible(!0);
  }, [setForceVisible]);
  if (value2 === void 0)
    return React14.createElement(
      Button4,
      {
        ariaLabel: !1,
        variant: "outline",
        size: "medium",
        disabled: readonly,
        id: getControlSetterButtonId(name),
        onClick: onForceVisible
      },
      "Set string"
    );
  let isValid = typeof value2 == "string";
  return React14.createElement(Wrapper6, null, React14.createElement(
    Form4.Textarea,
    {
      id: getControlId(name),
      maxLength,
      onChange: handleChange,
      disabled: readonly,
      size: "flex",
      placeholder: "Edit string...",
      autoFocus: forceVisible,
      valid: isValid ? void 0 : "error",
      name,
      value: isValid ? value2 : "",
      onFocus,
      onBlur
    }
  ), maxLength && React14.createElement(MaxLength, { isMaxed: value2?.length === maxLength }, value2?.length ?? 0, " / ", maxLength));
};

// ../addons/docs/src/blocks/controls/Files.tsx
import React15, { useEffect as useEffect5, useRef as useRef4 } from "react";
import { Form as Form5 } from "storybook/internal/components";
import { styled as styled12 } from "storybook/theming";
var FileInput = styled12(Form5.Input)({
  padding: 10
});
function revokeOldUrls(urls) {
  urls.forEach((url) => {
    url.startsWith("blob:") && URL.revokeObjectURL(url);
  });
}
var FilesControl = ({
  onChange,
  name,
  accept = "image/*",
  value: value2,
  argType
}) => {
  let inputElement = useRef4(null), readonly = argType?.control?.readOnly;
  function handleFileChange(e2) {
    if (!e2.target.files)
      return;
    let fileUrls = Array.from(e2.target.files).map((file) => URL.createObjectURL(file));
    onChange(fileUrls), revokeOldUrls(value2 || []);
  }
  useEffect5(() => {
    value2 == null && inputElement.current && (inputElement.current.value = "");
  }, [value2, name]);
  let controlId = getControlId(name);
  return React15.createElement(React15.Fragment, null, React15.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React15.createElement(
    FileInput,
    {
      ref: inputElement,
      id: controlId,
      type: "file",
      name,
      multiple: !0,
      disabled: readonly,
      onChange: handleFileChange,
      accept,
      size: "flex"
    }
  ));
};

// ../addons/docs/src/blocks/controls/index.tsx
var LazyColorControl = lazy(() => import("../../_browser-chunks/Color-TNPFN3FC.js")), ColorControl = (props) => React16.createElement(Suspense, { fallback: React16.createElement("div", null) }, React16.createElement(LazyColorControl, { ...props }));

// ../addons/docs/src/blocks/components/ArgsTable/ArgControl.tsx
var Controls2 = {
  array: ObjectControl,
  object: ObjectControl,
  boolean: BooleanControl,
  color: ColorControl,
  date: DateControl,
  number: NumberControl,
  check: OptionsControl,
  "inline-check": OptionsControl,
  radio: OptionsControl,
  "inline-radio": OptionsControl,
  select: OptionsControl,
  "multi-select": OptionsControl,
  range: RangeControl,
  text: TextControl,
  file: FilesControl
}, NoControl = () => React17.createElement(React17.Fragment, null, "-"), ArgControl = ({ row, arg, updateArgs, isHovered }) => {
  let { key, control } = row, [isFocused, setFocused] = useState6(!1), [boxedValue, setBoxedValue] = useState6({ value: arg });
  useEffect6(() => {
    isFocused || setBoxedValue({ value: arg });
  }, [isFocused, arg]);
  let onChange = useCallback5(
    (argVal) => (setBoxedValue({ value: argVal }), updateArgs({ [key]: argVal }), argVal),
    [updateArgs, key]
  ), onBlur = useCallback5(() => setFocused(!1), []), onFocus = useCallback5(() => setFocused(!0), []);
  if (!control || control.disable) {
    let canBeSetup = control?.disable !== !0 && row?.type?.name !== "function";
    return isHovered && canBeSetup ? React17.createElement(
      Link,
      {
        href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
        target: "_blank",
        withArrow: !0
      },
      "Setup controls"
    ) : React17.createElement(NoControl, null);
  }
  let props = { name: key, argType: row, value: boxedValue.value, onChange, onBlur, onFocus }, Control = Controls2[control.type] || NoControl;
  return React17.createElement(Control, { ...props, ...control, controlType: control.type });
};

// ../addons/docs/src/blocks/components/ArgsTable/ArgJsDoc.tsx
import React18 from "react";
import { codeCommon } from "storybook/internal/components";
import { styled as styled13 } from "storybook/theming";
var Table = styled13.table(({ theme: theme3 }) => ({
  "&&": {
    // Escape default table styles
    borderCollapse: "collapse",
    borderSpacing: 0,
    border: "none",
    tr: {
      border: "none !important",
      background: "none"
    },
    "td, th": {
      padding: 0,
      border: "none",
      width: "auto!important"
    },
    // End escape
    marginTop: 0,
    marginBottom: 0,
    "th:first-of-type, td:first-of-type": {
      paddingLeft: 0
    },
    "th:last-of-type, td:last-of-type": {
      paddingRight: 0
    },
    td: {
      paddingTop: 0,
      paddingBottom: 4,
      "&:not(:first-of-type)": {
        paddingLeft: 10,
        paddingRight: 0
      }
    },
    tbody: {
      boxShadow: "none",
      border: "none"
    },
    code: codeCommon({ theme: theme3 }),
    div: {
      span: {
        fontWeight: "bold"
      }
    },
    "& code": {
      margin: 0,
      display: "inline-block",
      fontSize: theme3.typography.size.s1
    }
  }
})), ArgJsDoc = ({ tags }) => {
  let params = (tags.params || []).filter((x2) => x2.description), hasDisplayableParams = params.length !== 0, hasDisplayableDeprecated = tags.deprecated != null, hasDisplayableReturns = tags.returns != null && tags.returns.description != null;
  return !hasDisplayableParams && !hasDisplayableReturns && !hasDisplayableDeprecated ? null : React18.createElement(React18.Fragment, null, React18.createElement(Table, null, React18.createElement("tbody", null, hasDisplayableDeprecated && React18.createElement("tr", { key: "deprecated" }, React18.createElement("td", { colSpan: 2 }, React18.createElement("strong", null, "Deprecated"), ": ", tags.deprecated?.toString())), hasDisplayableParams && params.map((x2) => React18.createElement("tr", { key: x2.name }, React18.createElement("td", null, React18.createElement("code", null, x2.name)), React18.createElement("td", null, x2.description))), hasDisplayableReturns && React18.createElement("tr", { key: "returns" }, React18.createElement("td", null, React18.createElement("code", null, "Returns")), React18.createElement("td", null, tags.returns?.description)))));
};

// ../addons/docs/src/blocks/components/ArgsTable/ArgValue.tsx
import React19, { useState as useState7 } from "react";
import { SyntaxHighlighter, TooltipProvider, codeCommon as codeCommon2 } from "storybook/internal/components";
import { ChevronSmallDownIcon as ChevronSmallDownIcon2, ChevronSmallUpIcon } from "@storybook/icons";
var import_memoizerific = __toESM(require_memoizerific(), 1);
import { styled as styled14 } from "storybook/theming";
var ITEMS_BEFORE_EXPANSION = 8, Summary = styled14.div(({ isExpanded }) => ({
  display: "flex",
  flexDirection: isExpanded ? "column" : "row",
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: "-4px",
  minWidth: 100
})), Text3 = styled14.span(codeCommon2, ({ theme: theme3, simple = !1 }) => ({
  flex: "0 0 auto",
  fontFamily: theme3.typography.fonts.mono,
  fontSize: theme3.typography.size.s1,
  wordBreak: "break-word",
  whiteSpace: "normal",
  maxWidth: "100%",
  margin: 0,
  marginRight: "4px",
  marginBottom: "4px",
  paddingTop: "2px",
  paddingBottom: "2px",
  lineHeight: "13px",
  ...simple && {
    background: "transparent",
    border: "0 none",
    paddingLeft: 0
  }
})), ExpandButton = styled14.button(({ theme: theme3 }) => ({
  fontFamily: theme3.typography.fonts.mono,
  color: theme3.color.secondary,
  marginBottom: "4px",
  background: "none",
  border: "none"
})), Expandable = styled14.div(codeCommon2, ({ theme: theme3 }) => ({
  fontFamily: theme3.typography.fonts.mono,
  color: theme3.color.secondary,
  fontSize: theme3.typography.size.s1,
  // overrides codeCommon
  margin: 0,
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center"
})), Detail = styled14.div(({ theme: theme3, width }) => ({
  width,
  minWidth: 200,
  maxWidth: 800,
  padding: 15,
  // Don't remove the mono fontFamily here even if it seems useless, this is used by the browser to calculate the length of a "ch" unit.
  fontFamily: theme3.typography.fonts.mono,
  fontSize: theme3.typography.size.s1,
  // Most custom stylesheet will reset the box-sizing to "border-box" and will break the tooltip.
  boxSizing: "content-box",
  "& code": {
    padding: "0 !important"
  }
})), ChevronUpIcon = styled14(ChevronSmallUpIcon)({
  marginLeft: 4
}), ChevronDownIcon = styled14(ChevronSmallDownIcon2)({
  marginLeft: 4
}), EmptyArg = () => React19.createElement("span", null, "-"), ArgText = ({ text, simple }) => React19.createElement(Text3, { simple }, text), calculateDetailWidth = (0, import_memoizerific.default)(1e3)((detail) => {
  let lines = detail.split(/\r?\n/);
  return `${Math.max(...lines.map((x2) => x2.length))}ch`;
}), getSummaryItems = (summary) => {
  if (!summary)
    return [summary];
  let summaryItems = summary.split("|").map((value2) => value2.trim());
  return uniq(summaryItems);
}, renderSummaryItems = (summaryItems, isExpanded = !0) => {
  let items = summaryItems;
  return isExpanded || (items = summaryItems.slice(0, ITEMS_BEFORE_EXPANSION)), items.map((item) => React19.createElement(ArgText, { key: item, text: item === "" ? '""' : item }));
}, ArgSummary = ({ value: value2, initialExpandedArgs }) => {
  let { summary, detail } = value2, [isOpen, setIsOpen] = useState7(!1), [isExpanded, setIsExpanded] = useState7(initialExpandedArgs || !1);
  if (summary == null)
    return null;
  let summaryAsString = typeof summary.toString == "function" ? summary.toString() : summary;
  if (detail == null) {
    if (/[(){}[\]<>]/.test(summaryAsString))
      return React19.createElement(ArgText, { text: summaryAsString });
    let summaryItems = getSummaryItems(summaryAsString), itemsCount = summaryItems.length;
    return itemsCount > ITEMS_BEFORE_EXPANSION ? React19.createElement(Summary, { isExpanded }, renderSummaryItems(summaryItems, isExpanded), React19.createElement(ExpandButton, { onClick: () => setIsExpanded(!isExpanded) }, isExpanded ? "Show less..." : `Show ${itemsCount - ITEMS_BEFORE_EXPANSION} more...`)) : React19.createElement(Summary, null, renderSummaryItems(summaryItems));
  }
  return React19.createElement(
    TooltipProvider,
    {
      placement: "bottom",
      visible: isOpen,
      onVisibleChange: (isVisible) => {
        setIsOpen(isVisible);
      },
      tooltip: React19.createElement(Detail, { width: calculateDetailWidth(detail) }, React19.createElement(SyntaxHighlighter, { language: "jsx", format: !1 }, detail))
    },
    React19.createElement(Expandable, { className: "sbdocs-expandable" }, React19.createElement("span", null, summaryAsString), isOpen ? React19.createElement(ChevronUpIcon, null) : React19.createElement(ChevronDownIcon, null))
  );
}, ArgValue = ({ value: value2, initialExpandedArgs }) => value2 == null ? React19.createElement(EmptyArg, null) : React19.createElement(ArgSummary, { value: value2, initialExpandedArgs });

// ../addons/docs/src/blocks/components/ArgsTable/ArgRow.tsx
var Name = styled15.span({ fontWeight: "bold" }), Required = styled15.span(({ theme: theme3 }) => ({
  color: theme3.color.negative,
  fontFamily: theme3.typography.fonts.mono,
  cursor: "help"
})), Description = styled15.div(({ theme: theme3 }) => ({
  "&&": {
    p: {
      margin: "0 0 10px 0"
    },
    a: {
      color: theme3.color.secondary
    }
  },
  code: {
    ...codeCommon3({ theme: theme3 }),
    fontSize: 12,
    fontFamily: theme3.typography.fonts.mono
  },
  "& code": {
    margin: 0,
    display: "inline-block"
  },
  "& pre > code": {
    whiteSpace: "pre-wrap"
  }
})), Type = styled15.div(({ theme: theme3, hasDescription }) => ({
  color: theme3.base === "light" ? curriedTransparentize$1(0.1, theme3.color.defaultText) : curriedTransparentize$1(0.2, theme3.color.defaultText),
  marginTop: hasDescription ? 4 : 0
})), TypeWithJsDoc = styled15.div(({ theme: theme3, hasDescription }) => ({
  color: theme3.base === "light" ? curriedTransparentize$1(0.1, theme3.color.defaultText) : curriedTransparentize$1(0.2, theme3.color.defaultText),
  marginTop: hasDescription ? 12 : 0,
  marginBottom: 12
})), StyledTd = styled15.td(({ expandable }) => ({
  paddingLeft: expandable ? "40px !important" : "20px !important"
})), toSummary = (value2) => value2 && { summary: typeof value2 == "string" ? value2 : value2.name }, ArgRow = (props) => {
  let [isHovered, setIsHovered] = useState8(!1), { row, updateArgs, compact, expandable, initialExpandedArgs } = props, { name, description } = row, table = row.table || {}, type = table.type || toSummary(row.type), defaultValue = table.defaultValue || row.defaultValue, required = row.type?.required, hasDescription = description != null && description !== "";
  return React20.createElement("tr", { onMouseEnter: () => setIsHovered(!0), onMouseLeave: () => setIsHovered(!1) }, React20.createElement(StyledTd, { expandable: expandable ?? !1 }, React20.createElement(Name, null, name), required ? React20.createElement(Required, { title: "Required" }, "*") : null), compact ? null : React20.createElement("td", null, hasDescription && React20.createElement(Description, null, React20.createElement(index_modern_default, null, description)), table.jsDocTags != null ? React20.createElement(React20.Fragment, null, React20.createElement(TypeWithJsDoc, { hasDescription }, React20.createElement(ArgValue, { value: type, initialExpandedArgs })), React20.createElement(ArgJsDoc, { tags: table.jsDocTags })) : React20.createElement(Type, { hasDescription }, React20.createElement(ArgValue, { value: type, initialExpandedArgs }))), compact ? null : React20.createElement("td", null, React20.createElement(ArgValue, { value: defaultValue, initialExpandedArgs })), updateArgs ? React20.createElement("td", null, React20.createElement(ArgControl, { ...props, isHovered })) : null);
};

// ../addons/docs/src/blocks/components/ArgsTable/Empty.tsx
import React21, { useEffect as useEffect7, useState as useState9 } from "react";
import { EmptyTabContent, Link as Link2 } from "storybook/internal/components";
import { DocumentIcon } from "@storybook/icons";
import { styled as styled16 } from "storybook/theming";
var Wrapper7 = styled16.div(({ inAddonPanel, theme: theme3 }) => ({
  height: inAddonPanel ? "100%" : "auto",
  display: "flex",
  border: inAddonPanel ? "none" : `1px solid ${theme3.appBorderColor}`,
  borderRadius: inAddonPanel ? 0 : theme3.appBorderRadius,
  padding: inAddonPanel ? 0 : 40,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 15,
  background: theme3.background.content
})), Links = styled16.div(({ theme: theme3 }) => ({
  display: "flex",
  fontSize: theme3.typography.size.s2 - 1,
  gap: 25
})), Empty = ({ inAddonPanel }) => {
  let [isLoading, setIsLoading] = useState9(!0);
  return useEffect7(() => {
    let load = setTimeout(() => {
      setIsLoading(!1);
    }, 100);
    return () => clearTimeout(load);
  }, []), isLoading ? null : React21.createElement(Wrapper7, { inAddonPanel }, React21.createElement(
    EmptyTabContent,
    {
      title: inAddonPanel ? "Interactive story playground" : "Args table with interactive controls couldn't be auto-generated",
      description: React21.createElement(React21.Fragment, null, "Controls give you an easy to use interface to test your components. Set your story args and you'll see controls appearing here automatically."),
      footer: React21.createElement(Links, null, inAddonPanel && React21.createElement(React21.Fragment, null, React21.createElement(
        Link2,
        {
          href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
          target: "_blank",
          withArrow: !0
        },
        React21.createElement(DocumentIcon, null),
        " Read docs"
      )), !inAddonPanel && React21.createElement(
        Link2,
        {
          href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
          target: "_blank",
          withArrow: !0
        },
        React21.createElement(DocumentIcon, null),
        " Learn how to set that up"
      ))
    }
  ));
};

// ../addons/docs/src/blocks/components/ArgsTable/SectionRow.tsx
import React22, { useState as useState10 } from "react";
import { ChevronDownIcon as ChevronDownIcon2, ChevronRightIcon } from "@storybook/icons";
import { styled as styled17 } from "storybook/theming";
var ExpanderIconDown = styled17(ChevronDownIcon2)(({ theme: theme3 }) => ({
  marginRight: 8,
  marginLeft: -10,
  marginTop: -2,
  // optical alignment
  height: 12,
  width: 12,
  color: theme3.base === "light" ? curriedTransparentize$1(0.25, theme3.color.defaultText) : curriedTransparentize$1(0.3, theme3.color.defaultText),
  border: "none",
  display: "inline-block"
})), ExpanderIconRight = styled17(ChevronRightIcon)(({ theme: theme3 }) => ({
  marginRight: 8,
  marginLeft: -10,
  marginTop: -2,
  // optical alignment
  height: 12,
  width: 12,
  color: theme3.base === "light" ? curriedTransparentize$1(0.25, theme3.color.defaultText) : curriedTransparentize$1(0.3, theme3.color.defaultText),
  border: "none",
  display: "inline-block"
})), FlexWrapper = styled17.span(({ theme: theme3 }) => ({
  display: "flex",
  lineHeight: "20px",
  alignItems: "center"
})), Section = styled17.td(({ theme: theme3 }) => ({
  position: "relative",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  fontWeight: theme3.typography.weight.bold,
  fontSize: theme3.typography.size.s1 - 1,
  color: theme3.base === "light" ? curriedTransparentize$1(0.4, theme3.color.defaultText) : curriedTransparentize$1(0.6, theme3.color.defaultText),
  background: `${theme3.background.app} !important`,
  "& ~ td": {
    background: `${theme3.background.app} !important`
  }
})), Subsection = styled17.td(({ theme: theme3 }) => ({
  position: "relative",
  fontWeight: theme3.typography.weight.bold,
  fontSize: theme3.typography.size.s2 - 1,
  background: theme3.background.app
})), StyledTd2 = styled17.td({
  position: "relative"
}), StyledTr = styled17.tr(({ theme: theme3 }) => ({
  "&:hover > td": {
    backgroundColor: `${curriedLighten$1(5e-3, theme3.background.app)} !important`,
    boxShadow: `${theme3.color.mediumlight} 0 - 1px 0 0 inset`,
    cursor: "row-resize"
  }
})), ClickIntercept = styled17.button({
  // reset button style
  background: "none",
  border: "none",
  padding: "0",
  font: "inherit",
  // add custom style
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  height: "100%",
  width: "100%",
  color: "transparent",
  cursor: "row-resize !important"
}), SectionRow = ({
  level = "section",
  label,
  children,
  initialExpanded = !0,
  colSpan = 3
}) => {
  let [expanded, setExpanded] = useState10(initialExpanded), Level = level === "subsection" ? Subsection : Section, itemCount = children?.length || 0, caption = level === "subsection" ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : "", helperText = `${expanded ? "Hide" : "Show"} ${level === "subsection" ? itemCount : label} item${itemCount !== 1 ? "s" : ""}`;
  return React22.createElement(React22.Fragment, null, React22.createElement(StyledTr, { title: helperText }, React22.createElement(Level, { colSpan: 1 }, React22.createElement(ClickIntercept, { onClick: (e2) => setExpanded(!expanded), tabIndex: 0 }, helperText), React22.createElement(FlexWrapper, null, expanded ? React22.createElement(ExpanderIconDown, null) : React22.createElement(ExpanderIconRight, null), label)), React22.createElement(StyledTd2, { colSpan: colSpan - 1 }, React22.createElement(
    ClickIntercept,
    {
      onClick: (e2) => setExpanded(!expanded),
      tabIndex: -1,
      style: { outline: "none" }
    },
    helperText
  ), expanded ? null : caption)), expanded ? children : null);
};

// ../addons/docs/src/blocks/components/ArgsTable/Skeleton.tsx
import React23 from "react";
import { styled as styled18 } from "storybook/theming";
var TableWrapper = styled18.div(({ theme: theme3 }) => ({
  width: "100%",
  borderSpacing: 0,
  color: theme3.color.defaultText
})), Row = styled18.div(({ theme: theme3 }) => ({
  display: "flex",
  borderBottom: `1px solid ${theme3.appBorderColor}`,
  "&:last-child": {
    borderBottom: 0
  }
})), Column = styled18.div(
  ({ position, theme: theme3 }) => {
    let baseStyles = {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      padding: "10px 15px",
      alignItems: "flex-start"
    };
    switch (position) {
      case "first":
        return {
          ...baseStyles,
          width: "25%",
          paddingLeft: 20
        };
      case "second":
        return {
          ...baseStyles,
          width: "35%"
        };
      case "third":
        return {
          ...baseStyles,
          width: "15%"
        };
      case "last":
        return {
          ...baseStyles,
          width: "25%",
          paddingRight: 20
        };
    }
  }
), SkeletonText = styled18.div(
  ({ theme: theme3, width, height }) => ({
    animation: `${theme3.animation.glow} 1.5s ease-in-out infinite`,
    background: theme3.appBorderColor,
    width: width || "100%",
    height: height || 16,
    borderRadius: 3
  })
), Skeleton = () => React23.createElement(TableWrapper, null, React23.createElement(Row, null, React23.createElement(Column, { position: "first" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "second" }, React23.createElement(SkeletonText, { width: "30%" })), React23.createElement(Column, { position: "third" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "last" }, React23.createElement(SkeletonText, { width: "60%" }))), React23.createElement(Row, null, React23.createElement(Column, { position: "first" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "second" }, React23.createElement(SkeletonText, { width: "80%" }), React23.createElement(SkeletonText, { width: "30%" })), React23.createElement(Column, { position: "third" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "last" }, React23.createElement(SkeletonText, { width: "60%" }))), React23.createElement(Row, null, React23.createElement(Column, { position: "first" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "second" }, React23.createElement(SkeletonText, { width: "80%" }), React23.createElement(SkeletonText, { width: "30%" })), React23.createElement(Column, { position: "third" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "last" }, React23.createElement(SkeletonText, { width: "60%" }))), React23.createElement(Row, null, React23.createElement(Column, { position: "first" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "second" }, React23.createElement(SkeletonText, { width: "80%" }), React23.createElement(SkeletonText, { width: "30%" })), React23.createElement(Column, { position: "third" }, React23.createElement(SkeletonText, { width: "60%" })), React23.createElement(Column, { position: "last" }, React23.createElement(SkeletonText, { width: "60%" }))));

// ../addons/docs/src/blocks/components/ArgsTable/ArgsTable.tsx
var TableWrapper2 = styled19.table(({ theme: theme3, compact, inAddonPanel, inTabPanel }) => ({
  "&&": {
    // Resets for cascading/system styles
    borderSpacing: 0,
    color: theme3.color.defaultText,
    "td, th": {
      padding: 0,
      border: "none",
      verticalAlign: "top",
      textOverflow: "ellipsis"
    },
    // End Resets
    fontSize: theme3.typography.size.s2 - 1,
    lineHeight: "20px",
    textAlign: "left",
    width: "100%",
    // Margin collapse
    marginTop: inAddonPanel ? 0 : 25,
    marginBottom: inAddonPanel ? 0 : 40,
    "thead th:first-of-type, td:first-of-type": {
      // intentionally specify thead here
      width: "25%"
    },
    "th:first-of-type, td:first-of-type": {
      paddingLeft: 20
    },
    "th:nth-of-type(2), td:nth-of-type(2)": {
      ...compact ? null : {
        // Description column
        width: "35%"
      }
    },
    "td:nth-of-type(3)": {
      ...compact ? null : {
        // Defaults column
        width: "15%"
      }
    },
    "th:last-of-type, td:last-of-type": {
      paddingRight: 20,
      ...compact ? null : {
        // Controls column
        width: "25%"
      }
    },
    th: {
      color: theme3.textMutedColor,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 15,
      paddingRight: 15
    },
    td: {
      paddingTop: "10px",
      paddingBottom: "10px",
      "&:not(:first-of-type)": {
        paddingLeft: 15,
        paddingRight: 15
      },
      "&:last-of-type": {
        paddingRight: 20
      }
    },
    // Makes border alignment consistent w/other DocBlocks
    marginInline: inAddonPanel || inTabPanel ? 0 : 1,
    paddingInline: inTabPanel ? 3 : 0,
    tbody: {
      // Safari doesn't love shadows on tbody so we need to use a shadow filter. In order to do this,
      // the table cells all need to be solid so they have a background color applied.
      // I wasn't sure what kinds of content go in these tables so I was extra specific with selectors
      // to avoid unexpected surprises.
      ...inAddonPanel ? null : {
        filter: theme3.base === "light" ? "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.10))" : "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.20))"
      },
      "> tr > *": {
        // For filter to work properly, the table cells all need to be opaque.
        background: theme3.background.content,
        borderTop: `1px solid ${theme3.appBorderColor}`
      },
      ...inAddonPanel ? null : {
        // This works and I don't know why. :)
        "> tr:first-of-type > *": {
          borderBlockStart: `1px solid ${theme3.appBorderColor}`
        },
        "> tr:last-of-type > *": {
          borderBlockEnd: `1px solid ${theme3.appBorderColor}`
        },
        "> tr > *:first-of-type": {
          borderInlineStart: `1px solid ${theme3.appBorderColor}`
        },
        "> tr > *:last-of-type": {
          borderInlineEnd: `1px solid ${theme3.appBorderColor}`
        },
        // Thank you, Safari, for making me write code like this.
        "> tr:first-of-type > td:first-of-type": {
          borderTopLeftRadius: theme3.appBorderRadius
        },
        "> tr:first-of-type > td:last-of-type": {
          borderTopRightRadius: theme3.appBorderRadius
        },
        "> tr:last-of-type > td:first-of-type": {
          borderBottomLeftRadius: theme3.appBorderRadius
        },
        "> tr:last-of-type > td:last-of-type": {
          borderBottomRightRadius: theme3.appBorderRadius
        }
      }
    }
    // End awesome table styling
  }
})), TablePositionWrapper = styled19.div({
  position: "relative"
}), ButtonPositionWrapper = styled19.div({
  position: "absolute",
  right: 22,
  top: 10
}), StyledButton = styled19(Button5)({
  margin: "-4px -12px -4px 0"
});
var sortFns = {
  alpha: (a2, b2) => (a2.name ?? "").localeCompare(b2.name ?? ""),
  requiredFirst: (a2, b2) => +!!b2.type?.required - +!!a2.type?.required || (a2.name ?? "").localeCompare(b2.name ?? ""),
  none: null
}, groupRows = (rows, sort) => {
  let sections = { ungrouped: [], ungroupedSubsections: {}, sections: {} };
  if (!rows)
    return sections;
  Object.entries(rows).forEach(([key, row]) => {
    let { category, subcategory } = row?.table || {};
    if (category) {
      let section = sections.sections[category] || { ungrouped: [], subsections: {} };
      if (!subcategory)
        section.ungrouped.push({ key, ...row });
      else {
        let subsection = section.subsections[subcategory] || [];
        subsection.push({ key, ...row }), section.subsections[subcategory] = subsection;
      }
      sections.sections[category] = section;
    } else if (subcategory) {
      let subsection = sections.ungroupedSubsections[subcategory] || [];
      subsection.push({ key, ...row }), sections.ungroupedSubsections[subcategory] = subsection;
    } else
      sections.ungrouped.push({ key, ...row });
  });
  let sortFn = sortFns[sort], sortSubsection = (record) => sortFn ? Object.keys(record).reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: record[cur].sort(sortFn)
    }),
    {}
  ) : record;
  return {
    ungrouped: sortFn ? sections.ungrouped.sort(sortFn) : sections.ungrouped,
    ungroupedSubsections: sortSubsection(sections.ungroupedSubsections),
    sections: Object.keys(sections.sections).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: {
          ungrouped: sortFn ? sections.sections[cur].ungrouped.sort(sortFn) : sections.sections[cur].ungrouped,
          subsections: sortSubsection(sections.sections[cur].subsections)
        }
      }),
      {}
    )
  };
}, safeIncludeConditionalArg = (row, args, globals) => {
  try {
    return includeConditionalArg(row, args, globals);
  } catch (err) {
    return once.warn(err.message), !1;
  }
}, ArgsTable = (props) => {
  let {
    updateArgs,
    resetArgs,
    compact,
    inAddonPanel,
    inTabPanel,
    initialExpandedArgs,
    sort = "none",
    isLoading
  } = props;
  if ("error" in props) {
    let { error } = props;
    return React24.createElement(EmptyBlock, null, error, "\xA0", React24.createElement(Link3, { href: "http://storybook.js.org/docs/?ref=ui", target: "_blank", withArrow: !0 }, React24.createElement(DocumentIcon2, null), " Read the docs"));
  }
  if (isLoading)
    return React24.createElement(Skeleton, null);
  let { rows, args, globals } = "rows" in props ? props : { rows: void 0, args: void 0, globals: void 0 }, groups = groupRows(
    pickBy(
      rows || {},
      (row) => !row?.table?.disable && safeIncludeConditionalArg(row, args || {}, globals || {})
    ),
    sort
  ), hasNoUngrouped = groups.ungrouped.length === 0, hasNoSections = Object.entries(groups.sections).length === 0, hasNoUngroupedSubsections = Object.entries(groups.ungroupedSubsections).length === 0;
  if (hasNoUngrouped && hasNoSections && hasNoUngroupedSubsections)
    return React24.createElement(Empty, { inAddonPanel });
  let colSpan = 1;
  updateArgs && (colSpan += 1), compact || (colSpan += 2);
  let expandable = Object.keys(groups.sections).length > 0, common = { updateArgs, compact, inAddonPanel, initialExpandedArgs };
  return React24.createElement(ResetWrapper, null, React24.createElement(TablePositionWrapper, null, updateArgs && !isLoading && resetArgs && React24.createElement(ButtonPositionWrapper, null, React24.createElement(
    StyledButton,
    {
      variant: "ghost",
      padding: "small",
      onClick: () => resetArgs(),
      ariaLabel: "Reset controls"
    },
    React24.createElement(UndoIcon, null)
  )), React24.createElement(
    TableWrapper2,
    {
      compact,
      inAddonPanel,
      inTabPanel,
      className: "docblock-argstable sb-unstyled"
    },
    React24.createElement("thead", { className: "docblock-argstable-head" }, React24.createElement("tr", null, React24.createElement("th", null, React24.createElement("span", null, "Name")), compact ? null : React24.createElement("th", null, React24.createElement("span", null, "Description")), compact ? null : React24.createElement("th", null, React24.createElement("span", null, "Default")), updateArgs ? React24.createElement("th", null, React24.createElement("span", null, "Control")) : null)),
    React24.createElement("tbody", { className: "docblock-argstable-body" }, groups.ungrouped.map((row) => React24.createElement(ArgRow, { key: row.key, row, arg: args && args[row.key], ...common })), Object.entries(groups.ungroupedSubsections).map(([subcategory, subsection]) => React24.createElement(
      SectionRow,
      {
        key: subcategory,
        label: subcategory,
        level: "subsection",
        colSpan
      },
      subsection.map((row) => React24.createElement(
        ArgRow,
        {
          key: row.key,
          row,
          arg: args && args[row.key],
          expandable,
          ...common
        }
      ))
    )), Object.entries(groups.sections).map(([category, section]) => React24.createElement(SectionRow, { key: category, label: category, level: "section", colSpan }, section.ungrouped.map((row) => React24.createElement(ArgRow, { key: row.key, row, arg: args && args[row.key], ...common })), Object.entries(section.subsections).map(([subcategory, subsection]) => React24.createElement(
      SectionRow,
      {
        key: subcategory,
        label: subcategory,
        level: "subsection",
        colSpan
      },
      subsection.map((row) => React24.createElement(
        ArgRow,
        {
          key: row.key,
          row,
          arg: args && args[row.key],
          expandable,
          ...common
        }
      ))
    )))))
  )));
};

// src/controls/constants.ts
var ADDON_ID6 = "addon-controls", PARAM_KEY5 = "controls";

// src/controls/components/SaveStory.tsx
import React25 from "react";
import { Bar as BaseBar, Button as Button6, Form as Form6, Modal } from "storybook/internal/components";
import { AddIcon as AddIcon2, CheckIcon, UndoIcon as UndoIcon2 } from "@storybook/icons";
import { keyframes, styled as styled20 } from "storybook/theming";
var slideIn = keyframes({
  from: { transform: "translateY(40px)" },
  to: { transform: "translateY(0)" }
}), highlight = keyframes({
  from: { background: "var(--highlight-bg-color)" },
  to: {}
}), Container2 = styled20.div({
  containerType: "size",
  position: "sticky",
  bottom: 0,
  height: 41,
  overflow: "hidden",
  zIndex: 1
}), Bar = styled20(BaseBar)(({ theme: theme3 }) => ({
  "--highlight-bg-color": theme3.base === "dark" ? "#153B5B" : "#E0F0FF",
  paddingInline: 4,
  animation: `${slideIn} 300ms, ${highlight} 2s`,
  background: theme3.background.bar,
  borderTop: `1px solid ${theme3.appBorderColor}`,
  fontSize: theme3.typography.size.s2,
  "@container (max-width: 799px)": {
    flexDirection: "row",
    justifyContent: "flex-end"
  }
})), Info = styled20.div({
  display: "flex",
  flex: "99 0 auto",
  alignItems: "center",
  marginInlineEnd: 10,
  gap: 6
}), Actions = styled20.div(({ theme: theme3 }) => ({
  // We want actions to appear first and be hidden last on overflow,
  // but the screenreader reading order must start with Info.
  display: "flex",
  flex: "1 0 0",
  alignItems: "center",
  gap: 2,
  color: theme3.textMutedColor,
  fontSize: theme3.typography.size.s2
})), Label4 = styled20.div({
  "@container (max-width: 799px)": {
    lineHeight: 0,
    textIndent: "-9999px",
    "&::after": {
      content: "attr(data-short-label)",
      display: "block",
      lineHeight: "initial",
      textIndent: "0"
    }
  }
}), ModalInput = styled20(Form6.Input)(({ theme: theme3 }) => ({
  "::placeholder": {
    color: theme3.color.mediumdark
  },
  "&:invalid:not(:placeholder-shown)": {
    boxShadow: `${theme3.color.negative} 0 0 0 1px inset`
  }
})), SaveStory = ({ saveStory, createStory, resetArgs }) => {
  let inputRef = React25.useRef(null), [saving, setSaving] = React25.useState(!1), [creating, setCreating] = React25.useState(!1), [storyName, setStoryName] = React25.useState(""), [errorMessage, setErrorMessage] = React25.useState(null), onSaveStory = async () => {
    saving || (setSaving(!0), await saveStory().catch(() => {
    }), setSaving(!1));
  }, onShowForm = () => {
    setCreating(!0), setStoryName(""), setTimeout(() => inputRef.current?.focus(), 0);
  }, onChange = (e2) => {
    let value2 = e2.target.value.replace(/^[^a-z]/i, "").replace(/[^a-z0-9-_ ]/gi, "").replaceAll(/([-_ ]+[a-z0-9])/gi, (match) => match.toUpperCase().replace(/[-_ ]/g, ""));
    setStoryName(value2.charAt(0).toUpperCase() + value2.slice(1));
  }, onSubmitForm = async (event) => {
    if (event.preventDefault(), !saving)
      try {
        setErrorMessage(null), setSaving(!0), await createStory(storyName.replace(/^[^a-z]/i, "").replaceAll(/[^a-z0-9]/gi, "")), setCreating(!1), setSaving(!1);
      } catch (e2) {
        setErrorMessage(e2.message), setSaving(!1);
      }
  }, saveLabel = saving ? "Saving changes to story" : "Save changes to story", createLabel = "Create new story with these settings";
  return React25.createElement(Container2, { id: "save-from-controls" }, React25.createElement(
    Bar,
    {
      innerStyle: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        flexWrap: "wrap"
      }
    },
    React25.createElement(Actions, null, React25.createElement(Button6, { ariaLabel: saveLabel, tooltip: saveLabel, disabled: saving, onClick: onSaveStory }, React25.createElement(CheckIcon, null), React25.createElement(Label4, { "data-short-label": "Save" }, "Update story")), React25.createElement(Button6, { ariaLabel: createLabel, tooltip: createLabel, onClick: onShowForm }, React25.createElement(AddIcon2, null), React25.createElement(Label4, { "data-short-label": "New" }, "Create new story")), React25.createElement(Button6, { ariaLabel: "Reset changes", onClick: () => resetArgs() }, React25.createElement(UndoIcon2, null), React25.createElement("span", null, "Reset"))),
    React25.createElement(Modal, { ariaLabel: "Create new story", width: 350, open: creating, onOpenChange: setCreating }, React25.createElement(Form6, { onSubmit: onSubmitForm, id: "create-new-story-form" }, React25.createElement(Modal.Content, null, React25.createElement(Modal.Header, null, React25.createElement(Modal.Title, null, "Create new story"), React25.createElement(Modal.Description, null, "This will add a new story to your existing stories file.")), React25.createElement(
      ModalInput,
      {
        onChange,
        placeholder: "Story export name",
        readOnly: saving,
        ref: inputRef,
        value: storyName
      }
    ), React25.createElement(Modal.Actions, null, React25.createElement(
      Button6,
      {
        ariaLabel: !1,
        disabled: saving || !storyName,
        size: "medium",
        type: "submit",
        variant: "solid"
      },
      "Create"
    ), React25.createElement(Modal.Close, { asChild: !0 }, React25.createElement(Button6, { ariaLabel: !1, disabled: saving, size: "medium", type: "reset" }, "Cancel"))))), errorMessage && React25.createElement(Modal.Error, null, errorMessage)),
    React25.createElement(Info, null, React25.createElement(Label4, { "data-short-label": "Unsaved changes" }, "You modified this story. Do you want to save your changes?"))
  ));
};

// src/controls/components/ControlsPanel.tsx
var clean = (obj) => Object.entries(obj).reduce(
  (acc, [key, value2]) => value2 !== void 0 ? Object.assign(acc, { [key]: value2 }) : acc,
  {}
), AddonWrapper = styled21.div(({ showSaveFromUI }) => ({
  display: "grid",
  gridTemplateRows: showSaveFromUI ? "1fr 41px" : "1fr",
  height: "100%",
  maxHeight: "100vh"
})), ControlsPanel = ({ saveStory, createStory }) => {
  let api = useStorybookApi(), [isLoading, setIsLoading] = useState11(!0), [args, updateArgs, resetArgs, initialArgs] = useArgs(), [globals] = useGlobals(), rows = useArgTypes(), {
    expanded,
    sort,
    presetColors,
    disableSaveFromUI = !1
  } = useParameter(PARAM_KEY5, {}), { path, previewInitialized } = useStorybookState(), storyData = api.getCurrentStoryData();
  useEffect8(() => {
    previewInitialized && setIsLoading(!1);
  }, [previewInitialized]);
  let hasControls = Object.values(rows).some((arg) => arg?.control), withPresetColors = Object.entries(rows).reduce((acc, [key, arg]) => {
    let control = arg?.control;
    return typeof control != "object" || control?.type !== "color" || control?.presetColors ? acc[key] = arg : acc[key] = { ...arg, control: { ...control, presetColors } }, acc;
  }, {}), hasUpdatedArgs = useMemo3(
    () => !!args && !!initialArgs && !dequal(clean(args), clean(initialArgs)),
    [args, initialArgs]
  ), showSaveFromUI = hasControls && storyData.type === "story" && storyData.subtype !== "test" && hasUpdatedArgs && global.CONFIG_TYPE === "DEVELOPMENT" && disableSaveFromUI !== !0;
  return React26.createElement(AddonWrapper, { showSaveFromUI }, React26.createElement(ScrollArea, { vertical: !0 }, React26.createElement(
    ArgsTable,
    {
      key: path,
      compact: !expanded && hasControls,
      rows: withPresetColors,
      args,
      globals,
      updateArgs,
      resetArgs,
      inAddonPanel: !0,
      sort,
      isLoading
    }
  )), showSaveFromUI && React26.createElement(SaveStory, { resetArgs, saveStory, createStory }));
};

// src/controls/components/Title.tsx
import React27 from "react";
import { Badge } from "storybook/internal/components";
import { useArgTypes as useArgTypes2, useStorybookApi as useStorybookApi2 } from "storybook/manager-api";
function Title() {
  let selectedPanel = useStorybookApi2().getSelectedPanel(), rows = useArgTypes2(), controlsCount = Object.values(rows).filter(
    (argType) => argType?.control && !argType?.table?.disable
  ).length, suffix = controlsCount === 0 ? null : React27.createElement(Badge, { compact: !0, status: selectedPanel === ADDON_ID6 ? "active" : "neutral" }, controlsCount);
  return React27.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React27.createElement("span", null, "Controls"), suffix);
}

// src/controls/stringifyArgs.tsx
var stringifyArgs = (args) => JSON.stringify(args, (_2, value2) => typeof value2 == "function" ? "__sb_empty_function_arg__" : value2);

// src/controls/manager.tsx
var manager_default = addons.register(ADDON_ID6, (api) => {
  if (globalThis?.FEATURES?.controls) {
    let channel = addons.getChannel(), saveStory = async () => {
      let data = api.getCurrentStoryData();
      if (data.type !== "story")
        throw new Error("Not a story");
      try {
        let response = await experimental_requestResponse(channel, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, {
          // Only send updated args
          args: stringifyArgs(
            Object.entries(data.args || {}).reduce((acc, [key, value2]) => (dequal(value2, data.initialArgs?.[key]) || (acc[key] = value2), acc), {})
          ),
          csfId: data.id,
          importPath: data.importPath
        });
        api.addNotification({
          id: "save-story-success",
          icon: React28.createElement(PassedIcon, { color: color.positive }),
          content: {
            headline: "Story saved",
            subHeadline: React28.createElement(React28.Fragment, null, "Updated story ", React28.createElement("b", null, response.sourceStoryName), ".")
          },
          duration: 8e3
        });
      } catch (error) {
        throw api.addNotification({
          id: "save-story-error",
          icon: React28.createElement(FailedIcon, { color: color.negative }),
          content: {
            headline: "Failed to save story",
            subHeadline: error?.message || "Check the Storybook process on the command line for more details."
          },
          duration: 8e3
        }), error;
      }
    }, createStory = async (name) => {
      let data = api.getCurrentStoryData();
      if (data.type !== "story")
        throw new Error("Not a story");
      let response = await experimental_requestResponse(channel, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, {
        args: data.args && stringifyArgs(data.args),
        csfId: data.id,
        importPath: data.importPath,
        name
      });
      api.addNotification({
        id: "save-story-success",
        icon: React28.createElement(PassedIcon, { color: color.positive }),
        content: {
          headline: "Story created",
          subHeadline: React28.createElement(React28.Fragment, null, "Added story ", React28.createElement("b", null, response.newStoryName), " based on ", React28.createElement("b", null, response.sourceStoryName), ".")
        },
        duration: 8e3,
        onClick: ({ onDismiss }) => {
          onDismiss(), api.selectStory(response.newStoryId);
        }
      });
    };
    addons.add(ADDON_ID6, {
      title: Title,
      type: types.PANEL,
      paramKey: PARAM_KEY5,
      render: ({ active }) => !active || !api.getCurrentStoryData() ? null : React28.createElement(AddonPanel, { active, hasScrollbar: !1 }, React28.createElement(ControlsPanel, { saveStory, createStory }))
    }), channel.on(SAVE_STORY_RESPONSE, (data) => {
      if (!data.success)
        return;
      let story = api.getCurrentStoryData();
      story.type === "story" && (api.resetStoryArgs(story), data.payload.newStoryId && api.selectStory(data.payload.newStoryId));
    });
  }
});

// src/actions/manager.tsx
import React34 from "react";
import { addons as addons2, types as types2 } from "storybook/manager-api";

// src/actions/components/Title.tsx
import React29 from "react";
import { Badge as Badge2 } from "storybook/internal/components";
import { STORY_CHANGED } from "storybook/internal/core-events";
import { useAddonState, useChannel, useStorybookApi as useStorybookApi3 } from "storybook/manager-api";
function Title2() {
  let selectedPanel = useStorybookApi3().getSelectedPanel(), [{ count }, setCount] = useAddonState(ADDON_ID, { count: 0 });
  useChannel({
    [EVENT_ID]: () => {
      setCount((c2) => ({ ...c2, count: c2.count + 1 }));
    },
    [STORY_CHANGED]: () => {
      setCount((c2) => ({ ...c2, count: 0 }));
    },
    [CLEAR_ID]: () => {
      setCount((c2) => ({ ...c2, count: 0 }));
    }
  });
  let suffix = count === 0 ? null : React29.createElement(Badge2, { compact: !0, status: selectedPanel === PANEL_ID ? "active" : "neutral" }, count);
  return React29.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React29.createElement("span", null, "Actions"), suffix);
}

// src/actions/containers/ActionLogger/index.tsx
import React33, { Component as Component3 } from "react";
import { STORY_CHANGED as STORY_CHANGED2 } from "storybook/internal/core-events";

// src/actions/components/ActionLogger/index.tsx
import React31, { Fragment, forwardRef, useEffect as useEffect9, useRef as useRef5 } from "react";
import { ActionBar, ScrollArea as ScrollArea2 } from "storybook/internal/components";

// ../node_modules/react-inspector/dist/index.mjs
import React92 from "react";
import React32, { useContext as useContext2, useCallback as useCallback6, useLayoutEffect, useState as useState12, memo as memo2 } from "react";
import { createContext } from "react";
import React210, { Children, memo } from "react";
import React30, { createContext as createContext2, useContext, useMemo as useMemo4 } from "react";
import React72 from "react";
import React42 from "react";
import React62 from "react";
import React52 from "react";
import React82 from "react";
import React132, { useCallback as useCallback32, useState as useState32 } from "react";
import React102 from "react";
import React122 from "react";
import React112, { useCallback as useCallback22, useState as useState22 } from "react";
import React152 from "react";
import React142 from "react";
import React162 from "react";
var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
}, __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target, mod)), require_is_object = __commonJS({
  "node_modules/is-object/index.js"(exports, module) {
    "use strict";
    module.exports = function(x2) {
      return typeof x2 == "object" && x2 !== null;
    };
  }
}), require_is_window = __commonJS({
  "node_modules/is-window/index.js"(exports, module) {
    "use strict";
    module.exports = function(obj) {
      if (obj == null)
        return !1;
      var o2 = Object(obj);
      return o2 === o2.window;
    };
  }
}), require_is_dom = __commonJS({
  "node_modules/is-dom/index.js"(exports, module) {
    var isObject2 = require_is_object(), isWindow = require_is_window();
    function isNode(val) {
      return !isObject2(val) || !isWindow(window) || typeof window.Node != "function" ? !1 : typeof val.nodeType == "number" && typeof val.nodeName == "string";
    }
    module.exports = isNode;
  }
}), themes_exports = {};
__export(themes_exports, {
  chromeDark: () => theme,
  chromeLight: () => theme2
});
var theme = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "rgb(36, 36, 36)",
  BASE_COLOR: "rgb(213, 213, 213)",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(227, 110, 236)",
  OBJECT_VALUE_NULL_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_STRING_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_NUMBER_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_BOOLEAN_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(85, 106, 242)",
  HTML_TAG_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(155, 187, 220)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(242, 151, 102)",
  HTML_COMMENT_COLOR: "rgb(137, 137, 137)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "rgb(145, 145, 145)",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "rgb(85, 85, 85)",
  TABLE_TH_BACKGROUND_COLOR: "rgb(44, 44, 44)",
  TABLE_TH_HOVER_COLOR: "rgb(48, 48, 48)",
  TABLE_SORT_ICON_COLOR: "black",
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0) 50%, rgba(51, 139, 255, 0.0980392) 50%, rgba(51, 139, 255, 0.0980392))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, theme2 = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "white",
  BASE_COLOR: "black",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(136, 19, 145)",
  OBJECT_VALUE_NULL_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_STRING_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_NUMBER_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_BOOLEAN_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(13, 34, 170)",
  HTML_TAG_COLOR: "rgb(168, 148, 166)",
  HTML_TAGNAME_COLOR: "rgb(136, 18, 128)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(153, 69, 0)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(26, 26, 166)",
  HTML_COMMENT_COLOR: "rgb(35, 110, 37)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "#6e6e6e",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "#aaa",
  TABLE_TH_BACKGROUND_COLOR: "#eee",
  TABLE_TH_HOVER_COLOR: "hsla(0, 0%, 90%, 1)",
  TABLE_SORT_ICON_COLOR: "#6e6e6e",
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(to bottom, white, white 50%, rgb(234, 243, 255) 50%, rgb(234, 243, 255))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, ExpandedPathsContext = createContext([{}, () => {
}]), unselectable = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  KhtmlUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
  OUserSelect: "none",
  userSelect: "none"
}, createTheme = (theme3) => ({
  DOMNodePreview: {
    htmlOpenTag: {
      base: {
        color: theme3.HTML_TAG_COLOR
      },
      tagName: {
        color: theme3.HTML_TAGNAME_COLOR,
        textTransform: theme3.HTML_TAGNAME_TEXT_TRANSFORM
      },
      htmlAttributeName: {
        color: theme3.HTML_ATTRIBUTE_NAME_COLOR
      },
      htmlAttributeValue: {
        color: theme3.HTML_ATTRIBUTE_VALUE_COLOR
      }
    },
    htmlCloseTag: {
      base: {
        color: theme3.HTML_TAG_COLOR
      },
      offsetLeft: {
        marginLeft: -theme3.TREENODE_PADDING_LEFT
      },
      tagName: {
        color: theme3.HTML_TAGNAME_COLOR,
        textTransform: theme3.HTML_TAGNAME_TEXT_TRANSFORM
      }
    },
    htmlComment: {
      color: theme3.HTML_COMMENT_COLOR
    },
    htmlDoctype: {
      color: theme3.HTML_DOCTYPE_COLOR
    }
  },
  ObjectPreview: {
    objectDescription: {
      fontStyle: "italic"
    },
    preview: {
      fontStyle: "italic"
    },
    arrayMaxProperties: theme3.OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES,
    objectMaxProperties: theme3.OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES
  },
  ObjectName: {
    base: {
      color: theme3.OBJECT_NAME_COLOR
    },
    dimmed: {
      opacity: 0.6
    }
  },
  ObjectValue: {
    objectValueNull: {
      color: theme3.OBJECT_VALUE_NULL_COLOR
    },
    objectValueUndefined: {
      color: theme3.OBJECT_VALUE_UNDEFINED_COLOR
    },
    objectValueRegExp: {
      color: theme3.OBJECT_VALUE_REGEXP_COLOR
    },
    objectValueString: {
      color: theme3.OBJECT_VALUE_STRING_COLOR
    },
    objectValueSymbol: {
      color: theme3.OBJECT_VALUE_SYMBOL_COLOR
    },
    objectValueNumber: {
      color: theme3.OBJECT_VALUE_NUMBER_COLOR
    },
    objectValueBoolean: {
      color: theme3.OBJECT_VALUE_BOOLEAN_COLOR
    },
    objectValueFunctionPrefix: {
      color: theme3.OBJECT_VALUE_FUNCTION_PREFIX_COLOR,
      fontStyle: "italic"
    },
    objectValueFunctionName: {
      fontStyle: "italic"
    }
  },
  TreeView: {
    treeViewOutline: {
      padding: 0,
      margin: 0,
      listStyleType: "none"
    }
  },
  TreeNode: {
    treeNodeBase: {
      color: theme3.BASE_COLOR,
      backgroundColor: theme3.BASE_BACKGROUND_COLOR,
      lineHeight: theme3.TREENODE_LINE_HEIGHT,
      cursor: "default",
      boxSizing: "border-box",
      listStyle: "none",
      fontFamily: theme3.TREENODE_FONT_FAMILY,
      fontSize: theme3.TREENODE_FONT_SIZE
    },
    treeNodePreviewContainer: {},
    treeNodePlaceholder: {
      whiteSpace: "pre",
      fontSize: theme3.ARROW_FONT_SIZE,
      marginRight: theme3.ARROW_MARGIN_RIGHT,
      ...unselectable
    },
    treeNodeArrow: {
      base: {
        color: theme3.ARROW_COLOR,
        display: "inline-block",
        fontSize: theme3.ARROW_FONT_SIZE,
        marginRight: theme3.ARROW_MARGIN_RIGHT,
        ...parseFloat(theme3.ARROW_ANIMATION_DURATION) > 0 ? {
          transition: `transform ${theme3.ARROW_ANIMATION_DURATION} ease 0s`
        } : {},
        ...unselectable
      },
      expanded: {
        WebkitTransform: "rotateZ(90deg)",
        MozTransform: "rotateZ(90deg)",
        transform: "rotateZ(90deg)"
      },
      collapsed: {
        WebkitTransform: "rotateZ(0deg)",
        MozTransform: "rotateZ(0deg)",
        transform: "rotateZ(0deg)"
      }
    },
    treeNodeChildNodesContainer: {
      margin: 0,
      paddingLeft: theme3.TREENODE_PADDING_LEFT
    }
  },
  TableInspector: {
    base: {
      color: theme3.BASE_COLOR,
      position: "relative",
      border: `1px solid ${theme3.TABLE_BORDER_COLOR}`,
      fontFamily: theme3.BASE_FONT_FAMILY,
      fontSize: theme3.BASE_FONT_SIZE,
      lineHeight: "120%",
      boxSizing: "border-box",
      cursor: "default"
    }
  },
  TableInspectorHeaderContainer: {
    base: {
      top: 0,
      height: "17px",
      left: 0,
      right: 0,
      overflowX: "hidden"
    },
    table: {
      tableLayout: "fixed",
      borderSpacing: 0,
      borderCollapse: "separate",
      height: "100%",
      width: "100%",
      margin: 0
    }
  },
  TableInspectorDataContainer: {
    tr: {
      display: "table-row"
    },
    td: {
      boxSizing: "border-box",
      border: "none",
      height: "16px",
      verticalAlign: "top",
      padding: "1px 4px",
      WebkitUserSelect: "text",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      lineHeight: "14px"
    },
    div: {
      position: "static",
      top: "17px",
      bottom: 0,
      overflowY: "overlay",
      transform: "translateZ(0)",
      left: 0,
      right: 0,
      overflowX: "hidden"
    },
    table: {
      positon: "static",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      borderTop: "0 none transparent",
      margin: 0,
      backgroundImage: theme3.TABLE_DATA_BACKGROUND_IMAGE,
      backgroundSize: theme3.TABLE_DATA_BACKGROUND_SIZE,
      tableLayout: "fixed",
      borderSpacing: 0,
      borderCollapse: "separate",
      width: "100%",
      fontSize: theme3.BASE_FONT_SIZE,
      lineHeight: "120%"
    }
  },
  TableInspectorTH: {
    base: {
      position: "relative",
      height: "auto",
      textAlign: "left",
      backgroundColor: theme3.TABLE_TH_BACKGROUND_COLOR,
      borderBottom: `1px solid ${theme3.TABLE_BORDER_COLOR}`,
      fontWeight: "normal",
      verticalAlign: "middle",
      padding: "0 4px",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      lineHeight: "14px",
      ":hover": {
        backgroundColor: theme3.TABLE_TH_HOVER_COLOR
      }
    },
    div: {
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      fontSize: theme3.BASE_FONT_SIZE,
      lineHeight: "120%"
    }
  },
  TableInspectorLeftBorder: {
    none: {
      borderLeft: "none"
    },
    solid: {
      borderLeft: `1px solid ${theme3.TABLE_BORDER_COLOR}`
    }
  },
  TableInspectorSortIcon: {
    display: "block",
    marginRight: 3,
    width: 8,
    height: 7,
    marginTop: -7,
    color: theme3.TABLE_SORT_ICON_COLOR,
    fontSize: 12,
    ...unselectable
  }
}), DEFAULT_THEME_NAME = "chromeLight", ThemeContext = createContext2(createTheme(themes_exports[DEFAULT_THEME_NAME])), useStyles = (baseStylesKey) => useContext(ThemeContext)[baseStylesKey], themeAcceptor = (WrappedComponent) => ({ theme: theme3 = DEFAULT_THEME_NAME, ...restProps }) => {
  let themeStyles = useMemo4(() => {
    switch (Object.prototype.toString.call(theme3)) {
      case "[object String]":
        return createTheme(themes_exports[theme3]);
      case "[object Object]":
        return createTheme(theme3);
      default:
        return createTheme(themes_exports[DEFAULT_THEME_NAME]);
    }
  }, [theme3]);
  return React30.createElement(ThemeContext.Provider, {
    value: themeStyles
  }, React30.createElement(WrappedComponent, {
    ...restProps
  }));
}, Arrow = ({ expanded, styles }) => React210.createElement("span", {
  style: {
    ...styles.base,
    ...expanded ? styles.expanded : styles.collapsed
  }
}, "\u25B6"), TreeNode = memo((props) => {
  props = {
    expanded: !0,
    nodeRenderer: ({ name }) => React210.createElement("span", null, name),
    onClick: () => {
    },
    shouldShowArrow: !1,
    shouldShowPlaceholder: !0,
    ...props
  };
  let { expanded, onClick, children, nodeRenderer, title, shouldShowArrow, shouldShowPlaceholder } = props, styles = useStyles("TreeNode"), NodeRenderer = nodeRenderer;
  return React210.createElement("li", {
    "aria-expanded": expanded,
    role: "treeitem",
    style: styles.treeNodeBase,
    title
  }, React210.createElement("div", {
    style: styles.treeNodePreviewContainer,
    onClick
  }, shouldShowArrow || Children.count(children) > 0 ? React210.createElement(Arrow, {
    expanded,
    styles: styles.treeNodeArrow
  }) : shouldShowPlaceholder && React210.createElement("span", {
    style: styles.treeNodePlaceholder
  }, "\xA0"), React210.createElement(NodeRenderer, {
    ...props
  })), React210.createElement("ol", {
    role: "group",
    style: styles.treeNodeChildNodesContainer
  }, expanded ? children : void 0));
}), DEFAULT_ROOT_PATH = "$", WILDCARD = "*";
function hasChildNodes(data, dataIterator) {
  return !dataIterator(data).next().done;
}
var wildcardPathsFromLevel = (level) => Array.from({ length: level }, (_2, i2) => [DEFAULT_ROOT_PATH].concat(Array.from({ length: i2 }, () => "*")).join(".")), getExpandedPaths = (data, dataIterator, expandPaths, expandLevel, prevExpandedPaths) => {
  let wildcardPaths = [].concat(wildcardPathsFromLevel(expandLevel)).concat(expandPaths).filter((path) => typeof path == "string"), expandedPaths = [];
  return wildcardPaths.forEach((wildcardPath) => {
    let keyPaths = wildcardPath.split("."), populatePaths = (curData, curPath, depth) => {
      if (depth === keyPaths.length) {
        expandedPaths.push(curPath);
        return;
      }
      let key = keyPaths[depth];
      if (depth === 0)
        hasChildNodes(curData, dataIterator) && (key === DEFAULT_ROOT_PATH || key === WILDCARD) && populatePaths(curData, DEFAULT_ROOT_PATH, depth + 1);
      else if (key === WILDCARD)
        for (let { name, data: data2 } of dataIterator(curData))
          hasChildNodes(data2, dataIterator) && populatePaths(data2, `${curPath}.${name}`, depth + 1);
      else {
        let value2 = curData[key];
        hasChildNodes(value2, dataIterator) && populatePaths(value2, `${curPath}.${key}`, depth + 1);
      }
    };
    populatePaths(data, "", 0);
  }), expandedPaths.reduce((obj, path) => (obj[path] = !0, obj), { ...prevExpandedPaths });
}, ConnectedTreeNode = memo2((props) => {
  let { data, dataIterator, path, depth, nodeRenderer } = props, [expandedPaths, setExpandedPaths] = useContext2(ExpandedPathsContext), nodeHasChildNodes = hasChildNodes(data, dataIterator), expanded = !!expandedPaths[path], handleClick = useCallback6(() => nodeHasChildNodes && setExpandedPaths((prevExpandedPaths) => ({
    ...prevExpandedPaths,
    [path]: !expanded
  })), [nodeHasChildNodes, setExpandedPaths, path, expanded]);
  return React32.createElement(TreeNode, {
    expanded,
    onClick: handleClick,
    shouldShowArrow: nodeHasChildNodes,
    shouldShowPlaceholder: depth > 0,
    nodeRenderer,
    ...props
  }, expanded ? [...dataIterator(data)].map(({ name, data: data2, ...renderNodeProps }) => React32.createElement(ConnectedTreeNode, {
    name,
    data: data2,
    depth: depth + 1,
    path: `${path}.${name}`,
    key: name,
    dataIterator,
    nodeRenderer,
    ...renderNodeProps
  })) : null);
}), TreeView = memo2(({ name, data, dataIterator, nodeRenderer, expandPaths, expandLevel }) => {
  let styles = useStyles("TreeView"), stateAndSetter = useState12({}), [, setExpandedPaths] = stateAndSetter;
  return useLayoutEffect(() => setExpandedPaths((prevExpandedPaths) => getExpandedPaths(data, dataIterator, expandPaths, expandLevel, prevExpandedPaths)), [data, dataIterator, expandPaths, expandLevel]), React32.createElement(ExpandedPathsContext.Provider, {
    value: stateAndSetter
  }, React32.createElement("ol", {
    role: "tree",
    style: styles.treeViewOutline
  }, React32.createElement(ConnectedTreeNode, {
    name,
    data,
    dataIterator,
    depth: 0,
    path: DEFAULT_ROOT_PATH,
    nodeRenderer
  })));
}), ObjectName = ({ name, dimmed = !1, styles = {} }) => {
  let themeStyles = useStyles("ObjectName"), appliedStyles = {
    ...themeStyles.base,
    ...dimmed ? themeStyles.dimmed : {},
    ...styles
  };
  return React42.createElement("span", {
    style: appliedStyles
  }, name);
}, ObjectValue = ({ object: object2, styles }) => {
  let themeStyles = useStyles("ObjectValue"), mkStyle = (key) => ({ ...themeStyles[key], ...styles });
  switch (typeof object2) {
    case "bigint":
      return React52.createElement("span", {
        style: mkStyle("objectValueNumber")
      }, String(object2), "n");
    case "number":
      return React52.createElement("span", {
        style: mkStyle("objectValueNumber")
      }, String(object2));
    case "string":
      return React52.createElement("span", {
        style: mkStyle("objectValueString")
      }, '"', object2, '"');
    case "boolean":
      return React52.createElement("span", {
        style: mkStyle("objectValueBoolean")
      }, String(object2));
    case "undefined":
      return React52.createElement("span", {
        style: mkStyle("objectValueUndefined")
      }, "undefined");
    case "object":
      return object2 === null ? React52.createElement("span", {
        style: mkStyle("objectValueNull")
      }, "null") : object2 instanceof Date ? React52.createElement("span", null, object2.toString()) : object2 instanceof RegExp ? React52.createElement("span", {
        style: mkStyle("objectValueRegExp")
      }, object2.toString()) : Array.isArray(object2) ? React52.createElement("span", null, `Array(${object2.length})`) : object2.constructor ? typeof object2.constructor.isBuffer == "function" && object2.constructor.isBuffer(object2) ? React52.createElement("span", null, `Buffer[${object2.length}]`) : React52.createElement("span", null, object2.constructor.name) : React52.createElement("span", null, "Object");
    case "function":
      return React52.createElement("span", null, React52.createElement("span", {
        style: mkStyle("objectValueFunctionPrefix")
      }, "\u0192\xA0"), React52.createElement("span", {
        style: mkStyle("objectValueFunctionName")
      }, object2.name, "()"));
    case "symbol":
      return React52.createElement("span", {
        style: mkStyle("objectValueSymbol")
      }, object2.toString());
    default:
      return React52.createElement("span", null);
  }
}, hasOwnProperty = Object.prototype.hasOwnProperty, propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
function getPropertyValue(object2, propertyName) {
  let propertyDescriptor = Object.getOwnPropertyDescriptor(object2, propertyName);
  if (propertyDescriptor.get)
    try {
      return propertyDescriptor.get();
    } catch {
      return propertyDescriptor.get;
    }
  return object2[propertyName];
}
function intersperse(arr, sep) {
  return arr.length === 0 ? [] : arr.slice(1).reduce((xs, x2) => xs.concat([sep, x2]), [arr[0]]);
}
var ObjectPreview = ({ data }) => {
  let styles = useStyles("ObjectPreview"), object2 = data;
  if (typeof object2 != "object" || object2 === null || object2 instanceof Date || object2 instanceof RegExp)
    return React62.createElement(ObjectValue, {
      object: object2
    });
  if (Array.isArray(object2)) {
    let maxProperties = styles.arrayMaxProperties, previewArray = object2.slice(0, maxProperties).map((element, index) => React62.createElement(ObjectValue, {
      key: index,
      object: element
    }));
    object2.length > maxProperties && previewArray.push(React62.createElement("span", {
      key: "ellipsis"
    }, "\u2026"));
    let arrayLength = object2.length;
    return React62.createElement(React62.Fragment, null, React62.createElement("span", {
      style: styles.objectDescription
    }, arrayLength === 0 ? "" : `(${arrayLength})\xA0`), React62.createElement("span", {
      style: styles.preview
    }, "[", intersperse(previewArray, ", "), "]"));
  } else {
    let maxProperties = styles.objectMaxProperties, propertyNodes = [];
    for (let propertyName in object2)
      if (hasOwnProperty.call(object2, propertyName)) {
        let ellipsis;
        propertyNodes.length === maxProperties - 1 && Object.keys(object2).length > maxProperties && (ellipsis = React62.createElement("span", {
          key: "ellipsis"
        }, "\u2026"));
        let propertyValue = getPropertyValue(object2, propertyName);
        if (propertyNodes.push(React62.createElement("span", {
          key: propertyName
        }, React62.createElement(ObjectName, {
          name: propertyName || '""'
        }), ":\xA0", React62.createElement(ObjectValue, {
          object: propertyValue
        }), ellipsis)), ellipsis)
          break;
      }
    let objectConstructorName = object2.constructor ? object2.constructor.name : "Object";
    return React62.createElement(React62.Fragment, null, React62.createElement("span", {
      style: styles.objectDescription
    }, objectConstructorName === "Object" ? "" : `${objectConstructorName} `), React62.createElement("span", {
      style: styles.preview
    }, "{", intersperse(propertyNodes, ", "), "}"));
  }
}, ObjectRootLabel = ({ name, data }) => typeof name == "string" ? React72.createElement("span", null, React72.createElement(ObjectName, {
  name
}), React72.createElement("span", null, ": "), React72.createElement(ObjectPreview, {
  data
})) : React72.createElement(ObjectPreview, {
  data
}), ObjectLabel = ({ name, data, isNonenumerable = !1 }) => {
  let object2 = data;
  return React82.createElement("span", null, typeof name == "string" ? React82.createElement(ObjectName, {
    name,
    dimmed: isNonenumerable
  }) : React82.createElement(ObjectPreview, {
    data: name
  }), React82.createElement("span", null, ": "), React82.createElement(ObjectValue, {
    object: object2
  }));
}, createIterator = (showNonenumerable, sortObjectKeys) => function* (data) {
  if (!(typeof data == "object" && data !== null || typeof data == "function"))
    return;
  let dataIsArray = Array.isArray(data);
  if (!dataIsArray && data[Symbol.iterator]) {
    let i2 = 0;
    for (let entry of data) {
      if (Array.isArray(entry) && entry.length === 2) {
        let [k2, v2] = entry;
        yield {
          name: k2,
          data: v2
        };
      } else
        yield {
          name: i2.toString(),
          data: entry
        };
      i2++;
    }
  } else {
    let keys = Object.getOwnPropertyNames(data);
    sortObjectKeys === !0 && !dataIsArray ? keys.sort() : typeof sortObjectKeys == "function" && keys.sort(sortObjectKeys);
    for (let propertyName of keys)
      if (propertyIsEnumerable.call(data, propertyName)) {
        let propertyValue = getPropertyValue(data, propertyName);
        yield {
          name: propertyName || '""',
          data: propertyValue
        };
      } else if (showNonenumerable) {
        let propertyValue;
        try {
          propertyValue = getPropertyValue(data, propertyName);
        } catch {
        }
        propertyValue !== void 0 && (yield {
          name: propertyName,
          data: propertyValue,
          isNonenumerable: !0
        });
      }
    showNonenumerable && data !== Object.prototype && (yield {
      name: "__proto__",
      data: Object.getPrototypeOf(data),
      isNonenumerable: !0
    });
  }
}, defaultNodeRenderer = ({ depth, name, data, isNonenumerable }) => depth === 0 ? React92.createElement(ObjectRootLabel, {
  name,
  data
}) : React92.createElement(ObjectLabel, {
  name,
  data,
  isNonenumerable
}), ObjectInspector = ({ showNonenumerable = !1, sortObjectKeys, nodeRenderer, ...treeViewProps }) => {
  let dataIterator = createIterator(showNonenumerable, sortObjectKeys), renderer = nodeRenderer || defaultNodeRenderer;
  return React92.createElement(TreeView, {
    nodeRenderer: renderer,
    dataIterator,
    ...treeViewProps
  });
}, themedObjectInspector = themeAcceptor(ObjectInspector);
function getHeaders(data) {
  if (typeof data == "object") {
    let rowHeaders = [];
    if (Array.isArray(data)) {
      let nRows = data.length;
      rowHeaders = [...Array(nRows).keys()];
    } else data !== null && (rowHeaders = Object.keys(data));
    let colHeaders = rowHeaders.reduce((colHeaders2, rowHeader) => {
      let row = data[rowHeader];
      return typeof row == "object" && row !== null && Object.keys(row).reduce((xs, x2) => (xs.includes(x2) || xs.push(x2), xs), colHeaders2), colHeaders2;
    }, []);
    return {
      rowHeaders,
      colHeaders
    };
  }
}
var DataContainer = ({ rows, columns, rowsData }) => {
  let styles = useStyles("TableInspectorDataContainer"), borderStyles = useStyles("TableInspectorLeftBorder");
  return React102.createElement("div", {
    style: styles.div
  }, React102.createElement("table", {
    style: styles.table
  }, React102.createElement("colgroup", null), React102.createElement("tbody", null, rows.map((row, i2) => React102.createElement("tr", {
    key: row,
    style: styles.tr
  }, React102.createElement("td", {
    style: { ...styles.td, ...borderStyles.none }
  }, row), columns.map((column) => {
    let rowData = rowsData[i2];
    return typeof rowData == "object" && rowData !== null && hasOwnProperty.call(rowData, column) ? React102.createElement("td", {
      key: column,
      style: { ...styles.td, ...borderStyles.solid }
    }, React102.createElement(ObjectValue, {
      object: rowData[column]
    })) : React102.createElement("td", {
      key: column,
      style: { ...styles.td, ...borderStyles.solid }
    });
  }))))));
}, SortIconContainer = (props) => React112.createElement("div", {
  style: {
    position: "absolute",
    top: 1,
    right: 0,
    bottom: 1,
    display: "flex",
    alignItems: "center"
  }
}, props.children), SortIcon = ({ sortAscending }) => {
  let styles = useStyles("TableInspectorSortIcon"), glyph = sortAscending ? "\u25B2" : "\u25BC";
  return React112.createElement("div", {
    style: styles
  }, glyph);
}, TH = ({
  sortAscending = !1,
  sorted = !1,
  onClick = void 0,
  borderStyle = {},
  children,
  ...thProps
}) => {
  let styles = useStyles("TableInspectorTH"), [hovered, setHovered] = useState22(!1), handleMouseEnter = useCallback22(() => setHovered(!0), []), handleMouseLeave = useCallback22(() => setHovered(!1), []);
  return React112.createElement("th", {
    ...thProps,
    style: {
      ...styles.base,
      ...borderStyle,
      ...hovered ? styles.base[":hover"] : {}
    },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick
  }, React112.createElement("div", {
    style: styles.div
  }, children), sorted && React112.createElement(SortIconContainer, null, React112.createElement(SortIcon, {
    sortAscending
  })));
}, HeaderContainer = ({
  indexColumnText = "(index)",
  columns = [],
  sorted,
  sortIndexColumn,
  sortColumn,
  sortAscending,
  onTHClick,
  onIndexTHClick
}) => {
  let styles = useStyles("TableInspectorHeaderContainer"), borderStyles = useStyles("TableInspectorLeftBorder");
  return React122.createElement("div", {
    style: styles.base
  }, React122.createElement("table", {
    style: styles.table
  }, React122.createElement("tbody", null, React122.createElement("tr", null, React122.createElement(TH, {
    borderStyle: borderStyles.none,
    sorted: sorted && sortIndexColumn,
    sortAscending,
    onClick: onIndexTHClick
  }, indexColumnText), columns.map((column) => React122.createElement(TH, {
    borderStyle: borderStyles.solid,
    key: column,
    sorted: sorted && sortColumn === column,
    sortAscending,
    onClick: onTHClick.bind(null, column)
  }, column))))));
}, TableInspector = ({
  data,
  columns
}) => {
  let styles = useStyles("TableInspector"), [{ sorted, sortIndexColumn, sortColumn, sortAscending }, setState] = useState32({
    sorted: !1,
    sortIndexColumn: !1,
    sortColumn: void 0,
    sortAscending: !1
  }), handleIndexTHClick = useCallback32(() => {
    setState(({ sortIndexColumn: sortIndexColumn2, sortAscending: sortAscending2 }) => ({
      sorted: !0,
      sortIndexColumn: !0,
      sortColumn: void 0,
      sortAscending: sortIndexColumn2 ? !sortAscending2 : !0
    }));
  }, []), handleTHClick = useCallback32((col) => {
    setState(({ sortColumn: sortColumn2, sortAscending: sortAscending2 }) => ({
      sorted: !0,
      sortIndexColumn: !1,
      sortColumn: col,
      sortAscending: col === sortColumn2 ? !sortAscending2 : !0
    }));
  }, []);
  if (typeof data != "object" || data === null)
    return React132.createElement("div", null);
  let { rowHeaders, colHeaders } = getHeaders(data);
  columns !== void 0 && (colHeaders = columns);
  let rowsData = rowHeaders.map((rowHeader) => data[rowHeader]), columnDataWithRowIndexes;
  if (sortColumn !== void 0 ? columnDataWithRowIndexes = rowsData.map((rowData, index) => typeof rowData == "object" && rowData !== null ? [rowData[sortColumn], index] : [void 0, index]) : sortIndexColumn && (columnDataWithRowIndexes = rowHeaders.map((rowData, index) => [rowHeaders[index], index])), columnDataWithRowIndexes !== void 0) {
    let comparator = (mapper, ascending) => (a2, b2) => {
      let v1 = mapper(a2), v2 = mapper(b2), type1 = typeof v1, type2 = typeof v2, lt = (v12, v22) => v12 < v22 ? -1 : v12 > v22 ? 1 : 0, result;
      if (type1 === type2)
        result = lt(v1, v2);
      else {
        let order = {
          string: 0,
          number: 1,
          object: 2,
          symbol: 3,
          boolean: 4,
          undefined: 5,
          function: 6
        };
        result = lt(order[type1], order[type2]);
      }
      return ascending || (result = -result), result;
    }, sortedRowIndexes = columnDataWithRowIndexes.sort(comparator((item) => item[0], sortAscending)).map((item) => item[1]);
    rowHeaders = sortedRowIndexes.map((i2) => rowHeaders[i2]), rowsData = sortedRowIndexes.map((i2) => rowsData[i2]);
  }
  return React132.createElement("div", {
    style: styles.base
  }, React132.createElement(HeaderContainer, {
    columns: colHeaders,
    sorted,
    sortIndexColumn,
    sortColumn,
    sortAscending,
    onTHClick: handleTHClick,
    onIndexTHClick: handleIndexTHClick
  }), React132.createElement(DataContainer, {
    rows: rowHeaders,
    columns: colHeaders,
    rowsData
  }));
}, themedTableInspector = themeAcceptor(TableInspector), TEXT_NODE_MAX_INLINE_CHARS = 80, shouldInline = (data) => data.childNodes.length === 0 || data.childNodes.length === 1 && data.childNodes[0].nodeType === Node.TEXT_NODE && data.textContent.length < TEXT_NODE_MAX_INLINE_CHARS, OpenTag = ({ tagName, attributes, styles }) => React142.createElement("span", {
  style: styles.base
}, "<", React142.createElement("span", {
  style: styles.tagName
}, tagName), (() => {
  if (attributes) {
    let attributeNodes = [];
    for (let i2 = 0; i2 < attributes.length; i2++) {
      let attribute = attributes[i2];
      attributeNodes.push(React142.createElement("span", {
        key: i2
      }, " ", React142.createElement("span", {
        style: styles.htmlAttributeName
      }, attribute.name), '="', React142.createElement("span", {
        style: styles.htmlAttributeValue
      }, attribute.value), '"'));
    }
    return attributeNodes;
  }
})(), ">"), CloseTag = ({ tagName, isChildNode = !1, styles }) => React142.createElement("span", {
  style: Object.assign({}, styles.base, isChildNode && styles.offsetLeft)
}, "</", React142.createElement("span", {
  style: styles.tagName
}, tagName), ">"), nameByNodeType = {
  1: "ELEMENT_NODE",
  3: "TEXT_NODE",
  7: "PROCESSING_INSTRUCTION_NODE",
  8: "COMMENT_NODE",
  9: "DOCUMENT_NODE",
  10: "DOCUMENT_TYPE_NODE",
  11: "DOCUMENT_FRAGMENT_NODE"
}, DOMNodePreview = ({ isCloseTag, data, expanded }) => {
  let styles = useStyles("DOMNodePreview");
  if (isCloseTag)
    return React142.createElement(CloseTag, {
      styles: styles.htmlCloseTag,
      isChildNode: !0,
      tagName: data.tagName
    });
  switch (data.nodeType) {
    case Node.ELEMENT_NODE:
      return React142.createElement("span", null, React142.createElement(OpenTag, {
        tagName: data.tagName,
        attributes: data.attributes,
        styles: styles.htmlOpenTag
      }), shouldInline(data) ? data.textContent : !expanded && "\u2026", !expanded && React142.createElement(CloseTag, {
        tagName: data.tagName,
        styles: styles.htmlCloseTag
      }));
    case Node.TEXT_NODE:
      return React142.createElement("span", null, data.textContent);
    case Node.CDATA_SECTION_NODE:
      return React142.createElement("span", null, "<![CDATA[" + data.textContent + "]]>");
    case Node.COMMENT_NODE:
      return React142.createElement("span", {
        style: styles.htmlComment
      }, "<!--", data.textContent, "-->");
    case Node.PROCESSING_INSTRUCTION_NODE:
      return React142.createElement("span", null, data.nodeName);
    case Node.DOCUMENT_TYPE_NODE:
      return React142.createElement("span", {
        style: styles.htmlDoctype
      }, "<!DOCTYPE ", data.name, data.publicId ? ` PUBLIC "${data.publicId}"` : "", !data.publicId && data.systemId ? " SYSTEM" : "", data.systemId ? ` "${data.systemId}"` : "", ">");
    case Node.DOCUMENT_NODE:
      return React142.createElement("span", null, data.nodeName);
    case Node.DOCUMENT_FRAGMENT_NODE:
      return React142.createElement("span", null, data.nodeName);
    default:
      return React142.createElement("span", null, nameByNodeType[data.nodeType]);
  }
}, domIterator = function* (data) {
  if (data && data.childNodes) {
    if (shouldInline(data))
      return;
    for (let i2 = 0; i2 < data.childNodes.length; i2++) {
      let node = data.childNodes[i2];
      node.nodeType === Node.TEXT_NODE && node.textContent.trim().length === 0 || (yield {
        name: `${node.tagName}[${i2}]`,
        data: node
      });
    }
    data.tagName && (yield {
      name: "CLOSE_TAG",
      data: {
        tagName: data.tagName
      },
      isCloseTag: !0
    });
  }
}, DOMInspector = (props) => React152.createElement(TreeView, {
  nodeRenderer: DOMNodePreview,
  dataIterator: domIterator,
  ...props
}), themedDOMInspector = themeAcceptor(DOMInspector), import_is_dom = __toESM2(require_is_dom()), Inspector = ({ table = !1, data, ...rest }) => table ? React162.createElement(themedTableInspector, {
  data,
  ...rest
}) : (0, import_is_dom.default)(data) ? React162.createElement(themedDOMInspector, {
  data,
  ...rest
}) : React162.createElement(themedObjectInspector, {
  data,
  ...rest
});

// src/actions/components/ActionLogger/index.tsx
import { styled as styled23, withTheme } from "storybook/theming";

// src/actions/components/ActionLogger/style.tsx
import { styled as styled22 } from "storybook/theming";
var Action = styled22.div({
  display: "flex",
  padding: 0,
  borderLeft: "5px solid transparent",
  borderBottom: "1px solid transparent",
  transition: "all 0.1s",
  alignItems: "flex-start",
  whiteSpace: "pre"
}), Counter = styled22.div(({ theme: theme3 }) => ({
  backgroundColor: curriedOpacify$1(0.5, theme3.appBorderColor),
  color: theme3.color.inverseText,
  fontSize: theme3.typography.size.s1,
  fontWeight: theme3.typography.weight.bold,
  lineHeight: 1,
  padding: "1px 5px",
  borderRadius: 20,
  margin: "2px 0px"
})), InspectorContainer = styled22.div({
  flex: 1,
  padding: "0 0 0 5px"
});

// src/actions/components/ActionLogger/index.tsx
var UnstyledWrapped = forwardRef(
  ({ children, className }, ref) => React31.createElement(ScrollArea2, { ref, horizontal: !0, vertical: !0, className }, children)
);
UnstyledWrapped.displayName = "UnstyledWrapped";
var Wrapper8 = styled23(UnstyledWrapped)({
  margin: 0,
  padding: "10px 5px 20px"
}), ThemedInspector = withTheme(({ theme: theme3, ...props }) => React31.createElement(Inspector, { theme: theme3.addonActionsTheme || "chromeLight", table: !1, ...props })), ActionLogger = ({ actions, onClear }) => {
  let wrapperRef = useRef5(null), wrapper = wrapperRef.current, wasAtBottom = wrapper && wrapper.scrollHeight - wrapper.scrollTop === wrapper.clientHeight;
  return useEffect9(() => {
    wasAtBottom && (wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight);
  }, [wasAtBottom, actions.length]), React31.createElement(Fragment, null, React31.createElement(Wrapper8, { ref: wrapperRef }, actions.map((action) => React31.createElement(Action, { key: action.id }, action.count > 1 && React31.createElement(Counter, null, action.count), React31.createElement(InspectorContainer, null, React31.createElement(
    ThemedInspector,
    {
      sortObjectKeys: !0,
      showNonenumerable: !1,
      name: action.data.name,
      data: action.data.args ?? action.data
    }
  ))))), React31.createElement(ActionBar, { actionItems: [{ title: "Clear", onClick: onClear }] }));
};

// src/actions/containers/ActionLogger/index.tsx
var safeDeepEqual = (a2, b2) => {
  try {
    return dequal(a2, b2);
  } catch {
    return !1;
  }
}, ActionLogger2 = class extends Component3 {
  constructor(props) {
    super(props);
    this.handleStoryChange = () => {
      let { actions } = this.state;
      actions.length > 0 && actions[0].options.clearOnStoryChange && this.clearActions();
    };
    this.addAction = (action) => {
      this.setState((prevState) => {
        let actions = [...prevState.actions], previous = actions.length && actions[actions.length - 1];
        return previous && safeDeepEqual(previous.data, action.data) ? previous.count++ : (action.count = 1, actions.push(action)), { actions: actions.slice(0, action.options.limit) };
      });
    };
    this.clearActions = () => {
      let { api } = this.props;
      api.emit(CLEAR_ID), this.setState({ actions: [] });
    };
    this.mounted = !1, this.state = { actions: [] };
  }
  componentDidMount() {
    this.mounted = !0;
    let { api } = this.props;
    api.on(EVENT_ID, this.addAction), api.on(STORY_CHANGED2, this.handleStoryChange);
  }
  componentWillUnmount() {
    this.mounted = !1;
    let { api } = this.props;
    api.off(STORY_CHANGED2, this.handleStoryChange), api.off(EVENT_ID, this.addAction);
  }
  render() {
    let { actions = [] } = this.state, { active } = this.props, props = {
      actions,
      onClear: this.clearActions
    };
    return active ? React33.createElement(ActionLogger, { ...props }) : null;
  }
};

// src/actions/manager.tsx
var manager_default2 = addons2.register(ADDON_ID, (api) => {
  globalThis?.FEATURES?.actions && addons2.add(PANEL_ID, {
    title: Title2,
    type: types2.PANEL,
    render: ({ active }) => React34.createElement(ActionLogger2, { api, active: !!active }),
    paramKey: PARAM_KEY
  });
});

// src/component-testing/manager.tsx
import React57 from "react";
import { AddonPanel as AddonPanel2 } from "storybook/internal/components";
import { Consumer, addons as addons3, types as types3 } from "storybook/manager-api";

// src/component-testing/components/Panel.tsx
import React55, { Fragment as Fragment3, memo as memo4, useEffect as useEffect15, useMemo as useMemo5, useRef as useRef6, useState as useState19 } from "react";
import {
  FORCE_REMOUNT,
  PLAY_FUNCTION_THREW_EXCEPTION,
  STORY_RENDER_PHASE_CHANGED,
  STORY_THREW_EXCEPTION,
  UNHANDLED_ERRORS_WHILE_PLAYING
} from "storybook/internal/core-events";
import { global as global2 } from "@storybook/global";
import {
  experimental_useStatusStore,
  useAddonState as useAddonState2,
  useChannel as useChannel2,
  useParameter as useParameter2,
  useStorybookApi as useStorybookApi6,
  useStorybookState as useStorybookState2
} from "storybook/manager-api";

// src/component-testing/constants.ts
var ADDON_ID7 = "storybook/interactions", PANEL_ID2 = `${ADDON_ID7}/panel`, DOCUMENTATION_LINK = "writing-tests/integrations/vitest-addon", DOCUMENTATION_DISCREPANCY_LINK = `${DOCUMENTATION_LINK}#what-happens-when-there-are-different-test-results-in-multiple-environments`, DOCUMENTATION_PLAY_FUNCTION_LINK = "writing-stories/play-function#writing-stories-with-the-play-function", INTERNAL_RENDER_CALL_ID = "internal_render_call";

// ../addons/a11y/src/constants.ts
var ADDON_ID8 = "storybook/a11y", PANEL_ID3 = `${ADDON_ID8}/panel`;
var UI_STATE_ID = `${ADDON_ID8}/ui`, RESULT = `${ADDON_ID8}/result`, REQUEST = `${ADDON_ID8}/request`, RUNNING = `${ADDON_ID8}/running`, ERROR2 = `${ADDON_ID8}/error`, MANUAL = `${ADDON_ID8}/manual`, SELECT = `${ADDON_ID8}/select`, DOCUMENTATION_LINK2 = "writing-tests/accessibility-testing", DOCUMENTATION_DISCREPANCY_LINK2 = `${DOCUMENTATION_LINK2}#why-are-my-tests-failing-in-different-environments`;

// ../addons/vitest/src/constants.ts
var ADDON_ID9 = "storybook/test", TEST_PROVIDER_ID = `${ADDON_ID9}/test-provider`, STORYBOOK_ADDON_TEST_CHANNEL = `${ADDON_ID9}/channel`;
var DOCUMENTATION_LINK3 = "writing-tests/integrations/vitest-addon", DOCUMENTATION_FATAL_ERROR_LINK = `${DOCUMENTATION_LINK3}#what-happens-if-vitest-itself-has-an-error`;
var storeOptions = {
  id: ADDON_ID9,
  initialState: {
    config: {
      coverage: !1,
      a11y: !1
    },
    watching: !1,
    cancelling: !1,
    fatalError: void 0,
    indexUrl: void 0,
    previewAnnotations: [],
    currentRun: {
      triggeredBy: void 0,
      config: {
        coverage: !1,
        a11y: !1
      },
      componentTestCount: {
        success: 0,
        error: 0
      },
      a11yCount: {
        success: 0,
        warning: 0,
        error: 0
      },
      storyIds: void 0,
      totalTestCount: void 0,
      startedAt: void 0,
      finishedAt: void 0,
      unhandledErrors: [],
      coverageSummary: void 0
    }
  }
};
var STORE_CHANNEL_EVENT_NAME = `UNIVERSAL_STORE:${storeOptions.id}`;
var STATUS_TYPE_ID_COMPONENT_TEST = "storybook/component-test";

// src/component-testing/components/InteractionsPanel.tsx
import * as React54 from "react";
import { styled as styled32 } from "storybook/theming";

// src/component-testing/utils.ts
var import_ansi_to_html = __toESM(require_ansi_to_html(), 1);
import { useTheme as useTheme2 } from "storybook/theming";

// ../node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = !1 } = {}) {
  let pattern = "(?:\\u001B\\][\\s\\S]*?(?:\\u0007|\\u001B\\u005C|\\u009C))|[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}

// ../node_modules/strip-ansi/index.js
var regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  return string.replace(regex, "");
}

// src/component-testing/utils.ts
function isTestAssertionError(error) {
  return isChaiError(error) || isJestError(error);
}
function isChaiError(error) {
  return error && typeof error == "object" && "name" in error && typeof error.name == "string" && error.name === "AssertionError";
}
function isJestError(error) {
  return error && typeof error == "object" && "message" in error && typeof error.message == "string" && stripAnsi(error.message).startsWith("expect(");
}
function createAnsiToHtmlFilter(theme3) {
  return new import_ansi_to_html.default({
    escapeXML: !0,
    fg: theme3.color.defaultText,
    bg: theme3.background.content
  });
}
function useAnsiToHtmlFilter() {
  let theme3 = useTheme2();
  return createAnsiToHtmlFilter(theme3);
}

// src/component-testing/components/DetachedDebuggerMessage.tsx
import React35 from "react";
import { Link as Link4 } from "storybook/internal/components";
import { styled as styled24 } from "storybook/theming";
var Wrapper9 = styled24.div(({ theme: { color: color2, typography: typography4, background } }) => ({
  textAlign: "start",
  padding: "11px 15px",
  fontSize: `${typography4.size.s2 - 1}px`,
  fontWeight: typography4.weight.regular,
  lineHeight: "1rem",
  background: background.app,
  borderBottom: `1px solid ${color2.border}`,
  color: color2.defaultText,
  backgroundClip: "padding-box",
  position: "relative"
})), DetachedDebuggerMessage = ({ storyUrl }) => React35.createElement(Wrapper9, null, "Debugger controls are not available on composed Storybooks.", " ", React35.createElement(
  Link4,
  {
    href: `${storyUrl}&addonPanel=${PANEL_ID2}`,
    target: "_blank",
    rel: "noopener noreferrer",
    withArrow: !0
  },
  "Open in external Storybook"
));

// src/component-testing/components/EmptyState.tsx
import React36, { useEffect as useEffect10, useState as useState13 } from "react";
import { EmptyTabContent as EmptyTabContent2, Link as Link5 } from "storybook/internal/components";
import { DocumentIcon as DocumentIcon3 } from "@storybook/icons";
import { useStorybookApi as useStorybookApi4 } from "storybook/manager-api";
import { styled as styled25 } from "storybook/theming";
var Links2 = styled25.div(({ theme: theme3 }) => ({
  display: "flex",
  fontSize: theme3.typography.size.s2 - 1,
  gap: 25
})), Empty2 = () => {
  let [isLoading, setIsLoading] = useState13(!0), docsUrl = useStorybookApi4().getDocsUrl({
    subpath: DOCUMENTATION_PLAY_FUNCTION_LINK,
    versioned: !0,
    renderer: !0
  });
  return useEffect10(() => {
    let load = setTimeout(() => {
      setIsLoading(!1);
    }, 100);
    return () => clearTimeout(load);
  }, []), isLoading ? null : React36.createElement("div", null, React36.createElement(
    EmptyTabContent2,
    {
      title: "Interactions",
      description: React36.createElement(React36.Fragment, null, "Interactions allow you to verify the functional aspects of UIs. Write a play function for your story and you'll see it run here."),
      footer: React36.createElement(Links2, null, React36.createElement(Link5, { href: docsUrl, target: "_blank", withArrow: !0 }, React36.createElement(DocumentIcon3, null), " Read docs"))
    }
  ));
};

// src/component-testing/components/Interaction.tsx
import * as React49 from "react";
import { Button as Button7 } from "storybook/internal/components";
import { ChevronDownIcon as ChevronDownIcon3, ChevronUpIcon as ChevronUpIcon2 } from "@storybook/icons";
import { styled as styled28, typography as typography2 } from "storybook/theming";

// src/component-testing/components/MatcherResult.tsx
import React47 from "react";
import { styled as styled26, typography } from "storybook/theming";

// src/component-testing/components/MethodCall.tsx
import React46, { Fragment as Fragment2 } from "react";
import { logger as logger4 } from "storybook/internal/client-logger";

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectInspector.js
import React45, { useEffect as useEffect14, useState as useState17 } from "react";

// ../node_modules/@devtools-ds/object-inspector/node_modules/clsx/dist/clsx.m.js
function toVal(mix) {
  var k2, y2, str = "";
  if (mix)
    if (typeof mix == "object")
      if (Array.isArray(mix))
        for (k2 = 0; k2 < mix.length; k2++)
          mix[k2] && (y2 = toVal(mix[k2])) && (str && (str += " "), str += y2);
      else
        for (k2 in mix)
          mix[k2] && (y2 = toVal(k2)) && (str && (str += " "), str += y2);
    else typeof mix != "boolean" && !mix.call && (str && (str += " "), str += mix);
  return str;
}
function clsx_m_default() {
  for (var i2 = 0, x2, str = ""; i2 < arguments.length; )
    (x2 = toVal(arguments[i2++])) && (str && (str += " "), str += x2);
  return str;
}

// ../node_modules/@devtools-ds/object-parser/dist/esm/index.js
var isArray = (val) => Array.isArray(val) || // Detect https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
ArrayBuffer.isView(val) && !(val instanceof DataView), isObject = (val) => val !== null && typeof val == "object" && !isArray(val) && !(val instanceof Date) && !(val instanceof RegExp) && !(val instanceof Error) && !(val instanceof WeakMap) && !(val instanceof WeakSet), isKnownObject = (val) => isObject(val) || isArray(val) || typeof val == "function" || val instanceof Promise, getPromiseState = (promise) => {
  let unique = /unique/;
  return Promise.race([promise, unique]).then((result) => result === unique ? ["pending"] : ["fulfilled", result], (e2) => ["rejected", e2]);
}, buildAST = async (key, value2, depth, sortKeys, isPrototype, showPrototype) => {
  let astNode = {
    key,
    depth,
    value: value2,
    type: "value",
    parent: void 0
  };
  if (value2 && isKnownObject(value2) && depth < 100) {
    let children = [], t = "object";
    if (isArray(value2)) {
      for (let i2 = 0; i2 < value2.length; i2++)
        children.push(async () => {
          let child = await buildAST(i2.toString(), value2[i2], depth + 1, sortKeys);
          return child.parent = astNode, child;
        });
      t = "array";
    } else {
      let keys = Object.getOwnPropertyNames(value2);
      sortKeys && keys.sort();
      for (let i2 = 0; i2 < keys.length; i2++) {
        let safeValue;
        try {
          safeValue = value2[keys[i2]];
        } catch {
        }
        children.push(async () => {
          let child = await buildAST(keys[i2], safeValue, depth + 1, sortKeys);
          return child.parent = astNode, child;
        });
      }
      if (typeof value2 == "function" && (t = "function"), value2 instanceof Promise) {
        let [status, result] = await getPromiseState(value2);
        children.push(async () => {
          let child = await buildAST("<state>", status, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), status !== "pending" && children.push(async () => {
          let child = await buildAST("<value>", result, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), t = "promise";
      }
      if (value2 instanceof Map) {
        let parsedEntries = Array.from(value2.entries()).map((entry) => {
          let [entryKey, entryValue] = entry;
          return {
            "<key>": entryKey,
            "<value>": entryValue
          };
        });
        children.push(async () => {
          let child = await buildAST("<entries>", parsedEntries, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), children.push(async () => {
          let child = await buildAST("size", value2.size, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), t = "map";
      }
      if (value2 instanceof Set) {
        let parsedEntries = Array.from(value2.entries()).map((entry) => entry[1]);
        children.push(async () => {
          let child = await buildAST("<entries>", parsedEntries, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), children.push(async () => {
          let child = await buildAST("size", value2.size, depth + 1, sortKeys);
          return child.parent = astNode, child;
        }), t = "set";
      }
    }
    value2 !== Object.prototype && showPrototype && children.push(async () => {
      let child = await buildAST("<prototype>", Object.getPrototypeOf(value2), depth + 1, sortKeys, !0);
      return child.parent = astNode, child;
    }), astNode.type = t, astNode.children = children, astNode.isPrototype = isPrototype;
  }
  return astNode;
}, parse4 = (data, sortKeys, includePrototypes) => buildAST("root", data, 0, sortKeys === !1 ? sortKeys : !0, void 0, includePrototypes === !1 ? includePrototypes : !0);

// ../node_modules/@babel/runtime/helpers/esm/objectSpread2.js
function ownKeys(e2, r2) {
  var t = Object.keys(e2);
  if (Object.getOwnPropertySymbols) {
    var o2 = Object.getOwnPropertySymbols(e2);
    r2 && (o2 = o2.filter(function(r3) {
      return Object.getOwnPropertyDescriptor(e2, r3).enumerable;
    })), t.push.apply(t, o2);
  }
  return t;
}
function _objectSpread2(e2) {
  for (var r2 = 1; r2 < arguments.length; r2++) {
    var t = arguments[r2] != null ? arguments[r2] : {};
    r2 % 2 ? ownKeys(Object(t), !0).forEach(function(r3) {
      _defineProperty(e2, r3, t[r3]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r3) {
      Object.defineProperty(e2, r3, Object.getOwnPropertyDescriptor(t, r3));
    });
  }
  return e2;
}

// ../node_modules/@devtools-ds/themes/dist/esm/utils.js
import React37 from "react";

// ../node_modules/@devtools-ds/themes/node_modules/clsx/dist/clsx.m.js
function toVal2(mix) {
  var k2, y2, str = "";
  if (mix)
    if (typeof mix == "object")
      if (Array.isArray(mix))
        for (k2 = 0; k2 < mix.length; k2++)
          mix[k2] && (y2 = toVal2(mix[k2])) && (str && (str += " "), str += y2);
      else
        for (k2 in mix)
          mix[k2] && (y2 = toVal2(k2)) && (str && (str += " "), str += y2);
    else typeof mix != "boolean" && !mix.call && (str && (str += " "), str += mix);
  return str;
}
function clsx_m_default2() {
  for (var i2 = 0, x2, str = ""; i2 < arguments.length; )
    (x2 = toVal2(arguments[i2++])) && (str && (str += " "), str += x2);
  return str;
}

// ../node_modules/@devtools-ds/themes/dist/esm/utils.js
var _excluded = ["children"];
var ThemeContext2 = React37.createContext({
  theme: "chrome",
  colorScheme: "light"
});
var ThemeProvider = (_ref) => {
  let {
    children
  } = _ref, value2 = _objectWithoutProperties(_ref, _excluded), wrappedTheme = React37.useContext(ThemeContext2);
  return React37.createElement(ThemeContext2.Provider, {
    value: _objectSpread2(_objectSpread2({}, wrappedTheme), value2)
  }, children);
}, useTheme3 = (props, styles = {}) => {
  let themeContext = React37.useContext(ThemeContext2), currentTheme = props.theme || themeContext.theme || "chrome", currentColorScheme = props.colorScheme || themeContext.colorScheme || "light", themeClass = clsx_m_default2(styles[currentTheme], styles[currentColorScheme]);
  return {
    currentColorScheme,
    currentTheme,
    themeClass
  };
};

// ../node_modules/@devtools-ds/themes/dist/esm/AutoThemeProvider.js
import React38 from "react";

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectInspectorItem.js
import React44, { useEffect as useEffect13, useState as useState16 } from "react";

// ../node_modules/@devtools-ds/tree/dist/esm/index.js
import React40, { useState as useState14, useEffect as useEffect11 } from "react";

// ../node_modules/@devtools-ds/tree/node_modules/clsx/dist/clsx.m.js
function toVal3(mix) {
  var k2, y2, str = "";
  if (mix)
    if (typeof mix == "object")
      if (Array.isArray(mix))
        for (k2 = 0; k2 < mix.length; k2++)
          mix[k2] && (y2 = toVal3(mix[k2])) && (str && (str += " "), str += y2);
      else
        for (k2 in mix)
          mix[k2] && (y2 = toVal3(k2)) && (str && (str += " "), str += y2);
    else typeof mix != "boolean" && !mix.call && (str && (str += " "), str += mix);
  return str;
}
function clsx_m_default3() {
  for (var i2 = 0, x2, str = ""; i2 < arguments.length; )
    (x2 = toVal3(arguments[i2++])) && (str && (str += " "), str += x2);
  return str;
}

// ../node_modules/@devtools-ds/tree/dist/esm/TreeContext.js
import React39 from "react";
var TreeContext = React39.createContext({
  isChild: !1,
  depth: 0,
  hasHover: !0
}), TreeContext_default = TreeContext;

// ../node_modules/@devtools-ds/tree/dist/esm/Tree.css.js
var Tree_css_default = { tree: "Tree-tree-fbbbe38", item: "Tree-item-353d6f3", group: "Tree-group-d3c3d8a", label: "Tree-label-d819155", focusWhite: "Tree-focusWhite-f1e00c2", arrow: "Tree-arrow-03ab2e7", hover: "Tree-hover-3cc4e5d", open: "Tree-open-3f1a336", dark: "Tree-dark-1b4aa00", chrome: "Tree-chrome-bcbcac6", light: "Tree-light-09174ee" };

// ../node_modules/@devtools-ds/tree/dist/esm/index.js
var _excluded2 = ["theme", "hover", "colorScheme", "children", "label", "className", "onUpdate", "onSelect", "open"], Tree = (props) => {
  let {
    theme: theme3,
    hover,
    colorScheme,
    children,
    label,
    className,
    onUpdate,
    onSelect,
    open
  } = props, html = _objectWithoutProperties(props, _excluded2), {
    themeClass,
    currentTheme
  } = useTheme3({
    theme: theme3,
    colorScheme
  }, Tree_css_default), [isOpen, setOpen] = useState14(open);
  useEffect11(() => {
    setOpen(open);
  }, [open]);
  let updateState = (value2) => {
    setOpen(value2), onUpdate && onUpdate(value2);
  }, hasChildren = React40.Children.count(children) > 0, updateFocus = (newNode, previousNode) => {
    if (newNode.isSameNode(previousNode || null)) return;
    let focusableNode = newNode.querySelector('[tabindex="-1"]');
    focusableNode?.focus(), newNode.setAttribute("aria-selected", "true"), previousNode?.removeAttribute("aria-selected");
  }, getParent = (node, role) => {
    let parent = node;
    for (; parent && parent.parentElement; ) {
      if (parent.getAttribute("role") === role)
        return parent;
      parent = parent.parentElement;
    }
    return null;
  }, getListElements = (node) => {
    let tree = getParent(node, "tree");
    return tree ? Array.from(tree.querySelectorAll("li")) : [];
  }, moveBack = (node) => {
    let group = getParent(node, "group"), toggle = group?.previousElementSibling;
    if (toggle && toggle.getAttribute("tabindex") === "-1") {
      let toggleParent = toggle.parentElement, nodeParent = node.parentElement;
      updateFocus(toggleParent, nodeParent);
    }
  }, moveHome = (node, direction) => {
    let elements = getListElements(node);
    elements.forEach((element) => {
      element.removeAttribute("aria-selected");
    }), direction === "start" && elements[0] && updateFocus(elements[0]), direction === "end" && elements[elements.length - 1] && updateFocus(elements[elements.length - 1]);
  }, moveFocusAdjacent = (node, direction) => {
    let elements = getListElements(node) || [];
    for (let i2 = 0; i2 < elements.length; i2++) {
      let currentNode = elements[i2];
      if (currentNode.getAttribute("aria-selected") === "true") {
        direction === "up" && elements[i2 - 1] ? updateFocus(elements[i2 - 1], currentNode) : direction === "down" && elements[i2 + 1] && updateFocus(elements[i2 + 1], currentNode);
        return;
      }
    }
    updateFocus(elements[0]);
  }, handleKeypress = (event, isChild2) => {
    let node = event.target;
    (event.key === "Enter" || event.key === " ") && updateState(!isOpen), event.key === "ArrowRight" && isOpen && !isChild2 ? moveFocusAdjacent(node, "down") : event.key === "ArrowRight" && updateState(!0), event.key === "ArrowLeft" && (!isOpen || isChild2) ? moveBack(node) : event.key === "ArrowLeft" && updateState(!1), event.key === "ArrowDown" && moveFocusAdjacent(node, "down"), event.key === "ArrowUp" && moveFocusAdjacent(node, "up"), event.key === "Home" && moveHome(node, "start"), event.key === "End" && moveHome(node, "end");
  }, handleClick = (event, isChild2) => {
    let node = event.target, parent = getParent(node, "treeitem"), elements = getListElements(node) || [], found = !1;
    for (let i2 = 0; i2 < elements.length; i2++) {
      let currentNode = elements[i2];
      if (currentNode.getAttribute("aria-selected") === "true") {
        parent && (found = !0, updateFocus(parent, currentNode));
        break;
      }
    }
    !found && parent && updateFocus(parent), isChild2 || updateState(!isOpen);
  }, handleBlur = (event) => {
    let node = event.currentTarget;
    !node.contains(document.activeElement) && node.getAttribute("role") === "tree" && node.setAttribute("tabindex", "0");
  }, handleFocus = (event) => {
    let node = event.target;
    if (node.getAttribute("role") === "tree") {
      let selected = node.querySelector('[aria-selected="true"]');
      selected ? updateFocus(selected) : moveFocusAdjacent(node, "down"), node.setAttribute("tabindex", "-1");
    }
  }, handleButtonFocus = () => {
    onSelect?.();
  }, getPaddingStyles = (depth2) => {
    let space = depth2 * 0.9 + 0.3;
    return {
      paddingLeft: `${space}em`,
      width: `calc(100% - ${space}em)`
    };
  }, {
    isChild,
    depth,
    hasHover
  } = React40.useContext(TreeContext_default), showHover = hasHover ? hover : !1;
  if (!isChild)
    return React40.createElement("ul", _extends({
      role: "tree",
      tabIndex: 0,
      className: clsx_m_default3(Tree_css_default.tree, Tree_css_default.group, themeClass, className),
      onFocus: handleFocus,
      onBlur: handleBlur
    }, html), React40.createElement(TreeContext_default.Provider, {
      value: {
        isChild: !0,
        depth: 0,
        hasHover: showHover
      }
    }, React40.createElement(Tree, props)));
  if (!hasChildren)
    return React40.createElement("li", _extends({
      role: "treeitem",
      className: Tree_css_default.item
    }, html), React40.createElement("div", {
      role: "button",
      className: clsx_m_default3(Tree_css_default.label, {
        [Tree_css_default.hover]: showHover,
        [Tree_css_default.focusWhite]: currentTheme === "firefox"
      }),
      tabIndex: -1,
      style: getPaddingStyles(depth),
      onKeyDown: (e2) => {
        handleKeypress(e2, isChild);
      },
      onClick: (e2) => handleClick(e2, !0),
      onFocus: handleButtonFocus
    }, React40.createElement("span", null, label)));
  let arrowClass = clsx_m_default3(Tree_css_default.arrow, {
    [Tree_css_default.open]: isOpen
  });
  return React40.createElement("li", {
    role: "treeitem",
    "aria-expanded": isOpen,
    className: Tree_css_default.item
  }, React40.createElement("div", {
    role: "button",
    tabIndex: -1,
    className: clsx_m_default3(Tree_css_default.label, {
      [Tree_css_default.hover]: showHover,
      [Tree_css_default.focusWhite]: currentTheme === "firefox"
    }),
    style: getPaddingStyles(depth),
    onClick: (e2) => handleClick(e2),
    onKeyDown: (e2) => handleKeypress(e2),
    onFocus: handleButtonFocus
  }, React40.createElement("span", null, React40.createElement("span", {
    "aria-hidden": !0,
    className: arrowClass
  }), React40.createElement("span", null, label))), React40.createElement("ul", _extends({
    role: "group",
    className: clsx_m_default3(className, Tree_css_default.group)
  }, html), isOpen && React40.Children.map(children, (child) => React40.createElement(TreeContext_default.Provider, {
    value: {
      isChild: !0,
      depth: depth + 1,
      hasHover: showHover
    }
  }, child))));
};
Tree.defaultProps = {
  open: !1,
  hover: !0
};

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectValue.js
import React41, { useState as useState15, useEffect as useEffect12 } from "react";

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectInspector.css.js
var ObjectInspector_css_default = { "object-inspector": "ObjectInspector-object-inspector-0c33e82", objectInspector: "ObjectInspector-object-inspector-0c33e82", "object-label": "ObjectInspector-object-label-b81482b", objectLabel: "ObjectInspector-object-label-b81482b", text: "ObjectInspector-text-25f57f3", key: "ObjectInspector-key-4f712bb", value: "ObjectInspector-value-f7ec2e5", string: "ObjectInspector-string-c496000", regex: "ObjectInspector-regex-59d45a3", error: "ObjectInspector-error-b818698", boolean: "ObjectInspector-boolean-2dd1642", number: "ObjectInspector-number-a6daabb", undefined: "ObjectInspector-undefined-3a68263", null: "ObjectInspector-null-74acb50", function: "ObjectInspector-function-07bbdcd", "function-decorator": "ObjectInspector-function-decorator-3d22c24", functionDecorator: "ObjectInspector-function-decorator-3d22c24", prototype: "ObjectInspector-prototype-f2449ee", dark: "ObjectInspector-dark-0c96c97", chrome: "ObjectInspector-chrome-2f3ca98", light: "ObjectInspector-light-78bef54" };

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectValue.js
var _excluded3 = ["ast", "theme", "showKey", "colorScheme", "className"], buildValue = (key, value2, valueClass, showKey, depth) => {
  let computedKey = key.includes("-") ? `"${key}"` : key, isRoot = depth <= 0;
  return React41.createElement("span", {
    className: ObjectInspector_css_default.text
  }, !isRoot && showKey && React41.createElement(React41.Fragment, null, React41.createElement("span", {
    className: ObjectInspector_css_default.key
  }, computedKey), React41.createElement("span", null, ":\xA0")), React41.createElement("span", {
    className: valueClass
  }, value2));
}, ObjectValue2 = (props) => {
  let {
    ast,
    theme: theme3,
    showKey,
    colorScheme,
    className
  } = props, html = _objectWithoutProperties(props, _excluded3), {
    themeClass
  } = useTheme3({
    theme: theme3,
    colorScheme
  }, ObjectInspector_css_default), [asyncValue, setAsyncValue] = useState15(React41.createElement("span", null)), value2 = React41.createElement("span", null);
  return useEffect12(() => {
    ast.value instanceof Promise && (async (promise) => {
      setAsyncValue(buildValue(ast.key, `Promise { "${await getPromiseState(promise)}" }`, ObjectInspector_css_default.key, showKey, ast.depth));
    })(ast.value);
  }, [ast, showKey]), typeof ast.value == "number" || typeof ast.value == "bigint" ? value2 = buildValue(ast.key, String(ast.value), ObjectInspector_css_default.number, showKey, ast.depth) : typeof ast.value == "boolean" ? value2 = buildValue(ast.key, String(ast.value), ObjectInspector_css_default.boolean, showKey, ast.depth) : typeof ast.value == "string" ? value2 = buildValue(ast.key, `"${ast.value}"`, ObjectInspector_css_default.string, showKey, ast.depth) : typeof ast.value > "u" ? value2 = buildValue(ast.key, "undefined", ObjectInspector_css_default.undefined, showKey, ast.depth) : typeof ast.value == "symbol" ? value2 = buildValue(ast.key, ast.value.toString(), ObjectInspector_css_default.string, showKey, ast.depth) : typeof ast.value == "function" ? value2 = buildValue(ast.key, `${ast.value.name}()`, ObjectInspector_css_default.key, showKey, ast.depth) : typeof ast.value == "object" && (ast.value === null ? value2 = buildValue(ast.key, "null", ObjectInspector_css_default.null, showKey, ast.depth) : Array.isArray(ast.value) ? value2 = buildValue(ast.key, `Array(${ast.value.length})`, ObjectInspector_css_default.key, showKey, ast.depth) : ast.value instanceof Date ? value2 = buildValue(ast.key, `Date ${ast.value.toString()}`, ObjectInspector_css_default.value, showKey, ast.depth) : ast.value instanceof RegExp ? value2 = buildValue(ast.key, ast.value.toString(), ObjectInspector_css_default.regex, showKey, ast.depth) : ast.value instanceof Error ? value2 = buildValue(ast.key, ast.value.toString(), ObjectInspector_css_default.error, showKey, ast.depth) : isObject(ast.value) ? value2 = buildValue(ast.key, "{\u2026}", ObjectInspector_css_default.key, showKey, ast.depth) : value2 = buildValue(ast.key, ast.value.constructor.name, ObjectInspector_css_default.key, showKey, ast.depth)), React41.createElement("span", _extends({
    className: clsx_m_default(themeClass, className)
  }, html), asyncValue, value2);
};
ObjectValue2.defaultProps = {
  showKey: !0
};
var ObjectValue_default = ObjectValue2;

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectLabel.js
import React43 from "react";
var _excluded4 = ["ast", "theme", "previewMax", "open", "colorScheme", "className"], buildPreview = (children, previewMax, showKey) => {
  let previews = [];
  for (let i2 = 0; i2 < children.length; i2++) {
    let child = children[i2];
    if (child.isPrototype || (previews.push(React43.createElement(ObjectValue_default, {
      key: child.key,
      ast: child,
      showKey
    })), i2 < children.length - 1 ? previews.push(", ") : previews.push(" ")), child.isPrototype && i2 === children.length - 1 && (previews.pop(), previews.push(" ")), i2 === previewMax - 1 && children.length > previewMax) {
      previews.push("\u2026 ");
      break;
    }
  }
  return previews;
}, getArrayLabel = (ast, open, previewMax, theme3) => {
  let l2 = ast.value.length;
  return open ? React43.createElement("span", null, "Array(", l2, ")") : React43.createElement(React43.Fragment, null, React43.createElement("span", null, `${theme3 === "firefox" ? "Array" : ""}(${l2}) [ `), buildPreview(ast.children, previewMax, !1), React43.createElement("span", null, "]"));
}, getObjectLabel = (ast, open, previewMax, theme3) => ast.isPrototype ? React43.createElement("span", null, `Object ${theme3 === "firefox" ? "{ \u2026 }" : ""}`) : open ? React43.createElement("span", null, "{\u2026}") : React43.createElement(React43.Fragment, null, React43.createElement("span", null, `${theme3 === "firefox" ? "Object " : ""}{ `), buildPreview(ast.children, previewMax, !0), React43.createElement("span", null, "}")), getPromiseLabel = (ast, open, previewMax) => open ? React43.createElement("span", null, `Promise { "${String(ast.children[0].value)}" }`) : React43.createElement(React43.Fragment, null, React43.createElement("span", null, "Promise { "), buildPreview(ast.children, previewMax, !0), React43.createElement("span", null, "}")), getMapLabel = (ast, open, previewMax, theme3) => {
  let {
    size
  } = ast.value;
  return open ? React43.createElement("span", null, `Map(${size})`) : React43.createElement(React43.Fragment, null, React43.createElement("span", null, `Map${theme3 === "chrome" ? `(${size})` : ""} { `), buildPreview(ast.children, previewMax, !0), React43.createElement("span", null, "}"));
}, getSetLabel = (ast, open, previewMax) => {
  let {
    size
  } = ast.value;
  return open ? React43.createElement("span", null, "Set(", size, ")") : React43.createElement(React43.Fragment, null, React43.createElement("span", null, `Set(${ast.value.size}) {`), buildPreview(ast.children, previewMax, !0), React43.createElement("span", null, "}"));
}, ObjectLabel2 = (props) => {
  let {
    ast,
    theme: theme3,
    previewMax,
    open,
    colorScheme,
    className
  } = props, html = _objectWithoutProperties(props, _excluded4), {
    themeClass,
    currentTheme
  } = useTheme3({
    theme: theme3,
    colorScheme
  }, ObjectInspector_css_default), isPrototype = ast.isPrototype || !1, classes = clsx_m_default(ObjectInspector_css_default.objectLabel, themeClass, className, {
    [ObjectInspector_css_default.prototype]: isPrototype
  }), isRoot = ast.depth <= 0, Key = () => React43.createElement("span", {
    className: isPrototype ? ObjectInspector_css_default.prototype : ObjectInspector_css_default.key
  }, isRoot ? "" : `${ast.key}: `);
  return ast.type === "array" ? React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), getArrayLabel(ast, open, previewMax, currentTheme)) : ast.type === "function" ? React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), currentTheme === "chrome" && React43.createElement("span", {
    className: ObjectInspector_css_default.functionDecorator
  }, "\u0192 "), React43.createElement("span", {
    className: clsx_m_default({
      [ObjectInspector_css_default.function]: !isPrototype
    })
  }, `${ast.value.name}()`)) : ast.type === "promise" ? React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), getPromiseLabel(ast, open, previewMax)) : ast.type === "map" ? React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), getMapLabel(ast, open, previewMax, currentTheme)) : ast.type === "set" ? React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), getSetLabel(ast, open, previewMax)) : React43.createElement("span", _extends({
    className: classes
  }, html), React43.createElement(Key, null), getObjectLabel(ast, open, previewMax, currentTheme));
};
ObjectLabel2.defaultProps = {
  previewMax: 8,
  open: !1
};
var ObjectLabel_default = ObjectLabel2;

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectInspectorItem.js
var ObjectInspectorItem = (props) => {
  let {
    ast,
    expandLevel,
    depth
  } = props, [resolved, setResolved] = useState16(), [open, setOpen] = useState16(depth < expandLevel);
  return useEffect13(() => {
    (async () => {
      if (ast.type !== "value") {
        let promises = ast.children.map((f2) => f2()), children = await Promise.all(promises), r2 = _objectSpread2(_objectSpread2({}, ast), {}, {
          children
        });
        setResolved(r2);
      }
    })();
  }, [ast]), resolved ? React44.createElement(Tree, {
    hover: !1,
    open,
    label: React44.createElement(ObjectLabel_default, {
      open,
      ast: resolved
    }),
    onSelect: () => {
      var _props$onSelect;
      (_props$onSelect = props.onSelect) === null || _props$onSelect === void 0 || _props$onSelect.call(props, ast);
    },
    onUpdate: (value2) => {
      setOpen(value2);
    }
  }, resolved.children.map((child) => React44.createElement(ObjectInspectorItem, {
    key: child.key,
    ast: child,
    depth: depth + 1,
    expandLevel,
    onSelect: props.onSelect
  }))) : React44.createElement(Tree, {
    hover: !1,
    label: React44.createElement(ObjectValue_default, {
      ast
    }),
    onSelect: () => {
      var _props$onSelect2;
      (_props$onSelect2 = props.onSelect) === null || _props$onSelect2 === void 0 || _props$onSelect2.call(props, ast);
    }
  });
};
ObjectInspectorItem.defaultProps = {
  expandLevel: 0,
  depth: 0
};
var ObjectInspectorItem_default = ObjectInspectorItem;

// ../node_modules/@devtools-ds/object-inspector/dist/esm/ObjectInspector.js
var _excluded5 = ["data", "expandLevel", "sortKeys", "includePrototypes", "className", "theme", "colorScheme", "onSelect"], ObjectInspector2 = (props) => {
  let {
    data,
    expandLevel,
    sortKeys,
    includePrototypes,
    className,
    theme: theme3,
    colorScheme,
    onSelect
  } = props, html = _objectWithoutProperties(props, _excluded5), [ast, setAST] = useState17(void 0), {
    themeClass,
    currentTheme,
    currentColorScheme
  } = useTheme3({
    theme: theme3,
    colorScheme
  }, ObjectInspector_css_default);
  return useEffect14(() => {
    (async () => {
      setAST(await parse4(data, sortKeys, includePrototypes));
    })();
  }, [data, sortKeys, includePrototypes]), React45.createElement("div", _extends({
    className: clsx_m_default(ObjectInspector_css_default.objectInspector, className, themeClass)
  }, html), ast && React45.createElement(ThemeProvider, {
    theme: currentTheme,
    colorScheme: currentColorScheme
  }, React45.createElement(ObjectInspectorItem_default, {
    ast,
    expandLevel,
    onSelect
  })));
};
ObjectInspector2.defaultProps = {
  expandLevel: 0,
  sortKeys: !0,
  includePrototypes: !0
};

// src/component-testing/components/MethodCall.tsx
import { useTheme as useTheme4 } from "storybook/theming";
var colorsLight = {
  base: "#444",
  nullish: "#7D99AA",
  string: "#16B242",
  number: "#5D40D0",
  boolean: "#f41840",
  objectkey: "#698394",
  instance: "#A15C20",
  function: "#EA7509",
  muted: "#7D99AA",
  tag: {
    name: "#6F2CAC",
    suffix: "#1F99E5"
  },
  date: "#459D9C",
  error: {
    name: "#D43900",
    message: "#444"
  },
  regex: {
    source: "#A15C20",
    flags: "#EA7509"
  },
  meta: "#EA7509",
  method: "#0271B6"
}, colorsDark = {
  base: "#eee",
  nullish: "#aaa",
  string: "#5FE584",
  number: "#6ba5ff",
  boolean: "#ff4191",
  objectkey: "#accfe6",
  instance: "#E3B551",
  function: "#E3B551",
  muted: "#aaa",
  tag: {
    name: "#f57bff",
    suffix: "#8EB5FF"
  },
  date: "#70D4D3",
  error: {
    name: "#f40",
    message: "#eee"
  },
  regex: {
    source: "#FAD483",
    flags: "#E3B551"
  },
  meta: "#FAD483",
  method: "#5EC1FF"
}, useThemeColors = () => {
  let { base } = useTheme4();
  return base === "dark" ? colorsDark : colorsLight;
}, special = /[^A-Z0-9]/i, trimEnd = /[\s.,…]+$/gm, ellipsize = (string, maxlength) => {
  if (string.length <= maxlength)
    return string;
  for (let i2 = maxlength - 1; i2 >= 0; i2 -= 1)
    if (special.test(string[i2]) && i2 > 10)
      return `${string.slice(0, i2).replace(trimEnd, "")}\u2026`;
  return `${string.slice(0, maxlength).replace(trimEnd, "")}\u2026`;
}, stringify = (value2) => {
  try {
    return JSON.stringify(value2, null, 1);
  } catch {
    return String(value2);
  }
}, interleave = (nodes, separator) => nodes.flatMap(
  (node, index) => index === nodes.length - 1 ? [node] : [node, React46.cloneElement(separator, { key: `sep${index}` })]
), Node2 = ({
  value: value2,
  nested,
  showObjectInspector,
  callsById,
  ...props
}) => {
  switch (!0) {
    case value2 === null:
      return React46.createElement(NullNode, { ...props });
    case value2 === void 0:
      return React46.createElement(UndefinedNode, { ...props });
    case Array.isArray(value2):
      return React46.createElement(ArrayNode, { ...props, value: value2, callsById });
    case typeof value2 == "string":
      return React46.createElement(StringNode, { ...props, value: value2 });
    case typeof value2 == "number":
      return React46.createElement(NumberNode, { ...props, value: value2 });
    case typeof value2 == "boolean":
      return React46.createElement(BooleanNode, { ...props, value: value2 });
    case Object.prototype.hasOwnProperty.call(value2, "__date__"):
      return React46.createElement(DateNode, { ...props, ...value2.__date__ });
    case Object.prototype.hasOwnProperty.call(value2, "__error__"):
      return React46.createElement(ErrorNode, { ...props, ...value2.__error__ });
    case Object.prototype.hasOwnProperty.call(value2, "__regexp__"):
      return React46.createElement(RegExpNode, { ...props, ...value2.__regexp__ });
    case Object.prototype.hasOwnProperty.call(value2, "__function__"):
      return React46.createElement(FunctionNode, { ...props, ...value2.__function__ });
    case Object.prototype.hasOwnProperty.call(value2, "__symbol__"):
      return React46.createElement(SymbolNode, { ...props, ...value2.__symbol__ });
    case Object.prototype.hasOwnProperty.call(value2, "__element__"):
      return React46.createElement(ElementNode, { ...props, ...value2.__element__ });
    case Object.prototype.hasOwnProperty.call(value2, "__class__"):
      return React46.createElement(ClassNode, { ...props, ...value2.__class__ });
    case Object.prototype.hasOwnProperty.call(value2, "__callId__"):
      return React46.createElement(MethodCall, { call: callsById?.get(value2.__callId__), callsById });
    case Object.prototype.toString.call(value2) === "[object Object]":
      return React46.createElement(
        ObjectNode,
        {
          value: value2,
          showInspector: showObjectInspector,
          callsById,
          ...props
        }
      );
    default:
      return React46.createElement(OtherNode, { value: value2, ...props });
  }
}, NullNode = (props) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.nullish }, ...props }, "null");
}, UndefinedNode = (props) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.nullish }, ...props }, "undefined");
}, StringNode = ({ value: value2, ...props }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.string }, ...props }, JSON.stringify(ellipsize(value2, 50)));
}, NumberNode = ({ value: value2, ...props }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.number }, ...props }, value2);
}, BooleanNode = ({ value: value2, ...props }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.boolean }, ...props }, String(value2));
}, ArrayNode = ({
  value: value2,
  nested = !1,
  callsById
}) => {
  let colors = useThemeColors();
  if (nested)
    return React46.createElement("span", { style: { color: colors.base } }, "[\u2026]");
  let nodes = value2.slice(0, 3).map((v2, index) => React46.createElement(Node2, { key: `${index}--${JSON.stringify(v2)}`, value: v2, nested: !0, callsById })), nodelist = interleave(nodes, React46.createElement("span", null, ", "));
  return value2.length <= 3 ? React46.createElement("span", { style: { color: colors.base } }, "[", nodelist, "]") : React46.createElement("span", { style: { color: colors.base } }, "(", value2.length, ") [", nodelist, ", \u2026]");
}, ObjectNode = ({
  showInspector,
  value: value2,
  callsById,
  nested = !1
}) => {
  let isDarkMode = useTheme4().base === "dark", colors = useThemeColors();
  if (showInspector)
    return React46.createElement(React46.Fragment, null, React46.createElement(
      ObjectInspector2,
      {
        id: "interactions-object-inspector",
        data: value2,
        includePrototypes: !1,
        colorScheme: isDarkMode ? "dark" : "light"
      }
    ));
  if (nested)
    return React46.createElement("span", { style: { color: colors.base } }, "{\u2026}");
  let nodelist = interleave(
    Object.entries(value2).slice(0, 2).map(([k2, v2]) => React46.createElement(Fragment2, { key: k2 }, React46.createElement("span", { style: { color: colors.objectkey } }, k2, ": "), React46.createElement(Node2, { value: v2, callsById, nested: !0 }))),
    React46.createElement("span", null, ", ")
  );
  return Object.keys(value2).length <= 2 ? React46.createElement("span", { style: { color: colors.base } }, "{ ", nodelist, " }") : React46.createElement("span", { style: { color: colors.base } }, "(", Object.keys(value2).length, ") ", "{ ", nodelist, ", \u2026 }");
}, ClassNode = ({ name }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.instance } }, name);
}, FunctionNode = ({ name }) => {
  let colors = useThemeColors();
  return name ? React46.createElement("span", { style: { color: colors.function } }, name) : React46.createElement("span", { style: { color: colors.nullish, fontStyle: "italic" } }, "anonymous");
}, ElementNode = ({
  prefix,
  localName,
  id,
  classNames = [],
  innerText
}) => {
  let name = prefix ? `${prefix}:${localName}` : localName, colors = useThemeColors();
  return React46.createElement("span", { style: { wordBreak: "keep-all" } }, React46.createElement("span", { key: `${name}_lt`, style: { color: colors.muted } }, "<"), React46.createElement("span", { key: `${name}_tag`, style: { color: colors.tag.name } }, name), React46.createElement("span", { key: `${name}_suffix`, style: { color: colors.tag.suffix } }, id ? `#${id}` : classNames.reduce((acc, className) => `${acc}.${className}`, "")), React46.createElement("span", { key: `${name}_gt`, style: { color: colors.muted } }, ">"), !id && classNames.length === 0 && innerText && React46.createElement(React46.Fragment, null, React46.createElement("span", { key: `${name}_text` }, innerText), React46.createElement("span", { key: `${name}_close_lt`, style: { color: colors.muted } }, "<"), React46.createElement("span", { key: `${name}_close_tag`, style: { color: colors.tag.name } }, "/", name), React46.createElement("span", { key: `${name}_close_gt`, style: { color: colors.muted } }, ">")));
}, DateNode = ({ value: value2 }) => {
  let parsed = new Date(value2);
  isNaN(Number(parsed)) && (logger4.warn("Invalid date value:", value2), parsed = null);
  let colors = useThemeColors();
  if (!parsed)
    return React46.createElement("span", { style: { whiteSpace: "nowrap", color: colors.date } }, "Invalid date");
  let [date, time, ms] = parsed.toISOString().split(/[T.Z]/);
  return React46.createElement("span", { style: { whiteSpace: "nowrap", color: colors.date } }, date, React46.createElement("span", { style: { opacity: 0.7 } }, "T"), time === "00:00:00" ? React46.createElement("span", { style: { opacity: 0.7 } }, time) : time, ms === "000" ? React46.createElement("span", { style: { opacity: 0.7 } }, ".", ms) : `.${ms}`, React46.createElement("span", { style: { opacity: 0.7 } }, "Z"));
}, ErrorNode = ({ name, message }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.error.name } }, name, message && ": ", message && React46.createElement("span", { style: { color: colors.error.message }, title: message.length > 50 ? message : "" }, ellipsize(message, 50)));
}, RegExpNode = ({ flags, source }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { whiteSpace: "nowrap", color: colors.regex.flags } }, "/", React46.createElement("span", { style: { color: colors.regex.source } }, source), "/", flags);
}, SymbolNode = ({ description }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { whiteSpace: "nowrap", color: colors.instance } }, "Symbol(", description && React46.createElement("span", { style: { color: colors.meta } }, '"', description, '"'), ")");
}, OtherNode = ({ value: value2 }) => {
  let colors = useThemeColors();
  return React46.createElement("span", { style: { color: colors.meta } }, stringify(value2));
}, StepNode = ({ label }) => {
  let colors = useThemeColors(), { typography: typography4 } = useTheme4();
  return React46.createElement(
    "span",
    {
      style: {
        color: colors.base,
        fontFamily: typography4.fonts.base,
        fontSize: typography4.size.s2 - 1
      }
    },
    label
  );
}, MethodCall = ({
  call,
  callsById
}) => {
  if (!call)
    return null;
  if (call.method === "step" && call.path?.length === 0)
    return React46.createElement(StepNode, { label: call.args[0] });
  let path = call.path?.flatMap((elem, index) => {
    let callId = elem.__callId__;
    return [
      callId ? React46.createElement(MethodCall, { key: `elem${index}`, call: callsById?.get(callId), callsById }) : React46.createElement("span", { key: `elem${index}` }, elem),
      React46.createElement("wbr", { key: `wbr${index}` }),
      React46.createElement("span", { key: `dot${index}` }, ".")
    ];
  }), args = call.args?.flatMap((arg, index, array2) => {
    let node = React46.createElement(Node2, { key: `node${index}`, value: arg, callsById });
    return index < array2.length - 1 ? [node, React46.createElement("span", { key: `comma${index}` }, ",\xA0"), React46.createElement("wbr", { key: `wbr${index}` })] : [node];
  }), colors = useThemeColors();
  return React46.createElement(React46.Fragment, null, React46.createElement("span", { style: { color: colors.base } }, path), React46.createElement("span", { style: { color: colors.method } }, call.method), React46.createElement("span", { style: { color: colors.base } }, "(", React46.createElement("wbr", null), args, React46.createElement("wbr", null), ")"));
};

// src/component-testing/components/MatcherResult.tsx
var getParams = (line, fromIndex = 0) => {
  for (let i2 = fromIndex, depth = 1; i2 < line.length; i2 += 1)
    if (line[i2] === "(" ? depth += 1 : line[i2] === ")" && (depth -= 1), depth === 0)
      return line.slice(fromIndex, i2);
  return "";
}, parseValue = (value2) => {
  try {
    return value2 === "undefined" ? void 0 : JSON.parse(value2);
  } catch {
    return value2;
  }
}, StyledExpected = styled26.span(({ theme: theme3 }) => ({
  color: theme3.base === "light" ? theme3.color.positiveText : theme3.color.positive
})), StyledReceived = styled26.span(({ theme: theme3 }) => ({
  color: theme3.base === "light" ? theme3.color.negativeText : theme3.color.negative
})), Received = ({ value: value2, parsed }) => parsed ? React47.createElement(Node2, { showObjectInspector: !0, value: value2, style: { color: "#D43900" } }) : React47.createElement(StyledReceived, null, value2), Expected = ({ value: value2, parsed }) => parsed ? typeof value2 == "string" && value2.startsWith("called with") ? React47.createElement(React47.Fragment, null, value2) : React47.createElement(Node2, { showObjectInspector: !0, value: value2, style: { color: "#16B242" } }) : React47.createElement(StyledExpected, null, value2), MatcherResult = ({
  message,
  style = {}
}) => {
  let filter = useAnsiToHtmlFilter(), lines = message.split(`
`);
  return React47.createElement(
    "pre",
    {
      style: {
        margin: 0,
        padding: "8px 10px 8px 36px",
        fontSize: typography.size.s1,
        ...style
      }
    },
    lines.flatMap((line, index) => {
      if (line.startsWith("expect(")) {
        let received = getParams(line, 7), remainderIndex = received ? 7 + received.length : 0, matcher = received && line.slice(remainderIndex).match(/\.(to|last|nth)[A-Z]\w+\(/);
        if (matcher) {
          let expectedIndex = remainderIndex + (matcher.index ?? 0) + matcher[0].length, expected = getParams(line, expectedIndex);
          if (expected)
            return [
              "expect(",
              React47.createElement(Received, { key: `received_${received}`, value: received }),
              line.slice(remainderIndex, expectedIndex),
              React47.createElement(Expected, { key: `expected_${expected}`, value: expected }),
              line.slice(expectedIndex + expected.length),
              React47.createElement("br", { key: `br${index}` })
            ];
        }
      }
      if (line.match(/^\s*- /))
        return [React47.createElement(Expected, { key: line + index, value: line }), React47.createElement("br", { key: `br${index}` })];
      if (line.match(/^\s*\+ /) || line.match(/^Received: $/))
        return [React47.createElement(Received, { key: line + index, value: line }), React47.createElement("br", { key: `br${index}` })];
      let [, assertionLabel, assertionValue] = line.match(/^(Expected|Received): (.*)$/) || [];
      if (assertionLabel && assertionValue)
        return assertionLabel === "Expected" ? [
          "Expected: ",
          React47.createElement(Expected, { key: line + index, value: parseValue(assertionValue), parsed: !0 }),
          React47.createElement("br", { key: `br${index}` })
        ] : [
          "Received: ",
          React47.createElement(Received, { key: line + index, value: parseValue(assertionValue), parsed: !0 }),
          React47.createElement("br", { key: `br${index}` })
        ];
      let [, prefix, numberOfCalls] = line.match(/(Expected number|Received number|Number) of calls: (\d+)$/i) || [];
      if (prefix && numberOfCalls)
        return [
          `${prefix} of calls: `,
          React47.createElement(Node2, { key: line + index, value: Number(numberOfCalls) }),
          React47.createElement("br", { key: `br${index}` })
        ];
      let [, receivedValue] = line.match(/^Received has value: (.+)$/) || [];
      return receivedValue ? [
        "Received has value: ",
        React47.createElement(Node2, { key: line + index, value: parseValue(receivedValue) }),
        React47.createElement("br", { key: `br${index}` })
      ] : [
        React47.createElement(
          "span",
          {
            key: line + index,
            dangerouslySetInnerHTML: { __html: filter.toHtml(line) }
          }
        ),
        React47.createElement("br", { key: `br${index}` })
      ];
    })
  );
};

// src/component-testing/components/StatusIcon.tsx
import React48 from "react";
import { CheckIcon as CheckIcon2, CircleIcon, PlayIcon, StopAltIcon } from "@storybook/icons";
import { styled as styled27, useTheme as useTheme5 } from "storybook/theming";
var WarningContainer = styled27.div({
  width: 14,
  height: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}), StatusIcon = ({ status }) => {
  let theme3 = useTheme5();
  switch (status) {
    case "done" /* DONE */:
      return React48.createElement(CheckIcon2, { color: theme3.color.positive, "data-testid": "icon-done" });
    case "error" /* ERROR */:
      return React48.createElement(StopAltIcon, { color: theme3.color.negative, "data-testid": "icon-error" });
    case "active" /* ACTIVE */:
      return React48.createElement(PlayIcon, { color: theme3.color.secondary, "data-testid": "icon-active" });
    case "waiting" /* WAITING */:
      return React48.createElement(WarningContainer, { "data-testid": "icon-waiting" }, React48.createElement(CircleIcon, { color: curriedTransparentize$1(0.5, "#CCCCCC"), size: 6 }));
    default:
      return null;
  }
};

// src/component-testing/components/Interaction.tsx
var MethodCallWrapper = styled28.div({
  fontFamily: typography2.fonts.mono,
  fontSize: typography2.size.s1,
  overflowWrap: "break-word",
  inlineSize: "calc( 100% - 40px )"
}), RowContainer = styled28("div", {
  shouldForwardProp: (prop) => !["call", "pausedAt"].includes(prop.toString())
})(
  ({ theme: theme3, call }) => ({
    position: "relative",
    display: "flex",
    flexDirection: "column",
    borderBottom: `1px solid ${theme3.appBorderColor}`,
    fontFamily: typography2.fonts.base,
    fontSize: 13,
    ...call.status === "error" /* ERROR */ && {
      backgroundColor: theme3.base === "dark" ? curriedTransparentize$1(0.93, theme3.color.negative) : theme3.background.warning
    },
    paddingLeft: (call.ancestors?.length ?? 0) * 20
  }),
  ({ theme: theme3, call, pausedAt }) => pausedAt === call.id && {
    "&::before": {
      content: '""',
      position: "absolute",
      top: -5,
      zIndex: 1,
      borderTop: "4.5px solid transparent",
      borderLeft: `7px solid ${theme3.color.warning}`,
      borderBottom: "4.5px solid transparent"
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: -1,
      zIndex: 1,
      width: "100%",
      borderTop: `1.5px solid ${theme3.color.warning}`
    }
  }
), RowHeader = styled28.div(({ theme: theme3, isInteractive }) => ({
  display: "flex",
  "&:hover": isInteractive ? {} : { background: theme3.background.hoverable }
})), RowLabel = styled28("button", {
  shouldForwardProp: (prop) => !["call"].includes(prop.toString())
})(({ theme: theme3, disabled, call }) => ({
  flex: 1,
  display: "grid",
  background: "none",
  border: 0,
  gridTemplateColumns: "15px 1fr",
  alignItems: "center",
  minHeight: 40,
  margin: 0,
  padding: "8px 15px",
  textAlign: "start",
  cursor: disabled || call.status === "error" /* ERROR */ ? "default" : "pointer",
  "&:focus-visible": {
    outline: 0,
    boxShadow: `inset 3px 0 0 0 ${call.status === "error" /* ERROR */ ? theme3.color.warning : theme3.color.secondary}`,
    background: call.status === "error" /* ERROR */ ? "transparent" : theme3.background.hoverable
  },
  "& > div": {
    opacity: call.status === "waiting" /* WAITING */ ? 0.5 : 1
  }
})), RowActions = styled28.div({
  display: "flex",
  alignItems: "center",
  padding: 6
}), StyledButton2 = styled28(Button7)(({ theme: theme3 }) => ({
  color: theme3.textMutedColor,
  margin: "0 3px"
})), RowMessage = styled28("div")(({ theme: theme3 }) => ({
  padding: "8px 10px 8px 36px",
  fontSize: typography2.size.s1,
  color: theme3.color.defaultText,
  pre: {
    margin: 0,
    padding: 0
  }
})), ErrorName = styled28.span(({ theme: theme3 }) => ({
  color: theme3.base === "dark" ? "#5EC1FF" : "#0271B6"
})), ErrorMessage = styled28.span(({ theme: theme3 }) => ({
  color: theme3.base === "dark" ? "#eee" : "#444"
})), ErrorExplainer = styled28.p(({ theme: theme3 }) => ({
  color: theme3.base === "dark" ? theme3.color.negative : theme3.color.negativeText,
  fontSize: theme3.typography.size.s2,
  maxWidth: 500,
  textWrap: "balance"
})), Exception = ({ exception }) => {
  let filter = useAnsiToHtmlFilter();
  if (!exception)
    return null;
  if (exception.callId === INTERNAL_RENDER_CALL_ID)
    return React49.createElement(RowMessage, null, React49.createElement("pre", null, React49.createElement(ErrorName, null, exception.name, ":"), " ", React49.createElement(ErrorMessage, null, exception.message)), React49.createElement(ErrorExplainer, null, "The component failed to render properly. Automated component tests will not run until this is resolved. Check the full error message in Storybook\u2019s canvas to debug."));
  if (isJestError(exception))
    return React49.createElement(MatcherResult, { ...exception });
  if (isChaiError(exception))
    return React49.createElement(RowMessage, null, React49.createElement(
      MatcherResult,
      {
        message: `${exception.message}${exception.diff ? `

${exception.diff}` : ""}`,
        style: { padding: 0 }
      }
    ), React49.createElement("p", null, "See the full stack trace in the browser console."));
  let paragraphs = exception.message.split(`

`), more = paragraphs.length > 1;
  return React49.createElement(RowMessage, null, React49.createElement("pre", { dangerouslySetInnerHTML: { __html: filter.toHtml(paragraphs[0]) } }), more && React49.createElement("p", null, "See the full stack trace in the browser console."));
}, Interaction = ({
  call,
  callsById,
  controls,
  controlStates,
  childCallIds,
  isHidden,
  isCollapsed,
  toggleCollapsed,
  pausedAt
}) => {
  let [isHovered, setIsHovered] = React49.useState(!1), isInteractive = !controlStates.goto || !call.interceptable || !!call.ancestors?.length;
  return isHidden || call.id === INTERNAL_RENDER_CALL_ID ? null : React49.createElement(RowContainer, { call, pausedAt }, React49.createElement(RowHeader, { isInteractive }, React49.createElement(
    RowLabel,
    {
      "aria-label": "Interaction step",
      call,
      onClick: () => controls.goto(call.id),
      disabled: isInteractive,
      onMouseEnter: () => controlStates.goto && setIsHovered(!0),
      onMouseLeave: () => controlStates.goto && setIsHovered(!1)
    },
    React49.createElement(StatusIcon, { status: isHovered ? "active" /* ACTIVE */ : call.status }),
    React49.createElement(MethodCallWrapper, { style: { marginLeft: 6, marginBottom: 1 } }, React49.createElement(MethodCall, { call, callsById }))
  ), React49.createElement(RowActions, null, (childCallIds?.length ?? 0) > 0 && React49.createElement(
    StyledButton2,
    {
      padding: "small",
      variant: "ghost",
      onClick: toggleCollapsed,
      ariaLabel: `${isCollapsed ? "Show" : "Hide"} steps`
    },
    isCollapsed ? React49.createElement(ChevronDownIcon3, null) : React49.createElement(ChevronUpIcon2, null)
  ))), call.status === "error" /* ERROR */ && call.exception?.callId === call.id && React49.createElement(Exception, { exception: call.exception }));
};

// src/component-testing/components/TestDiscrepancyMessage.tsx
import React50 from "react";
import { Link as Link6 } from "storybook/internal/components";
import { useStorybookApi as useStorybookApi5 } from "storybook/manager-api";
import { styled as styled29 } from "storybook/theming";
var Wrapper10 = styled29.div(({ theme: { color: color2, typography: typography4, background } }) => ({
  textAlign: "start",
  padding: "11px 15px",
  fontSize: `${typography4.size.s2 - 1}px`,
  fontWeight: typography4.weight.regular,
  lineHeight: "1rem",
  background: background.app,
  borderBottom: `1px solid ${color2.border}`,
  color: color2.defaultText,
  backgroundClip: "padding-box",
  position: "relative",
  code: {
    fontSize: `${typography4.size.s1 - 1}px`,
    color: "inherit",
    margin: "0 0.2em",
    padding: "0 0.2em",
    background: "rgba(255, 255, 255, 0.8)",
    borderRadius: "2px",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.1)"
  }
})), TestDiscrepancyMessage = ({ browserTestStatus }) => {
  let docsUrl = useStorybookApi5().getDocsUrl({
    subpath: DOCUMENTATION_DISCREPANCY_LINK,
    versioned: !0,
    renderer: !0
  }), [passed, failed] = browserTestStatus === "error" /* ERROR */ ? ["the CLI", "this browser"] : ["this browser", "the CLI"];
  return React50.createElement(Wrapper10, null, "This interaction test passed in ", passed, ", but the tests failed in ", failed, ".", " ", React50.createElement(Link6, { href: docsUrl, target: "_blank", withArrow: !0 }, "Learn what could cause this"));
};

// src/component-testing/components/Toolbar.tsx
import React53 from "react";
import { Button as Button8, P as P2, Separator, Toolbar as SharedToolbar } from "storybook/internal/components";
import {
  FastForwardIcon,
  PlayBackIcon,
  PlayNextIcon,
  RewindIcon,
  SyncIcon
} from "@storybook/icons";
import { styled as styled31, useTheme as useTheme6 } from "storybook/theming";

// src/component-testing/components/StatusBadge.tsx
import React51 from "react";
import { TooltipNote, WithTooltip } from "storybook/internal/components";
import { styled as styled30, typography as typography3 } from "storybook/theming";
var StatusColorMapping = {
  rendering: "mediumdark",
  playing: "warning",
  completed: "positive",
  errored: "negative",
  aborted: "purple"
}, StatusTextMapping = {
  rendering: "Wait",
  playing: "Runs",
  completed: "Pass",
  errored: "Fail",
  aborted: "Bail"
}, StatusNoteMapping = {
  rendering: "Story is rendering",
  playing: "Interactions are running",
  completed: "Story ran successfully",
  errored: "Story failed to complete",
  aborted: "Interactions aborted due to file changes"
}, StyledBadge = styled30.div(({ theme: theme3, status }) => ({
  display: "inline-block",
  padding: "4px 6px 4px 8px",
  borderRadius: "4px",
  backgroundColor: theme3.color[StatusColorMapping[status]],
  color: "white",
  fontFamily: typography3.fonts.base,
  textTransform: "uppercase",
  fontSize: typography3.size.s1,
  letterSpacing: 3,
  fontWeight: typography3.weight.bold,
  minWidth: 65,
  textAlign: "center"
})), StatusBadge = ({ status }) => {
  let badgeText = StatusTextMapping[status], badgeNote = StatusNoteMapping[status];
  return React51.createElement(
    WithTooltip,
    {
      hasChrome: !1,
      placement: "top",
      trigger: "hover",
      tooltip: React51.createElement(TooltipNote, { note: badgeNote })
    },
    React51.createElement(StyledBadge, { "aria-label": `Story status: ${badgeText}`, status }, badgeText)
  );
};

// src/component-testing/components/Toolbar.tsx
var ToolbarWrapper = styled31.div(({ theme: theme3 }) => ({
  boxShadow: `${theme3.appBorderColor} 0 -1px 0 0 inset`,
  background: theme3.background.app,
  position: "sticky",
  top: 0,
  zIndex: 1
})), StyledButton3 = styled31(Button8)(({ theme: theme3 }) => ({
  borderRadius: 4,
  padding: 6,
  color: theme3.textMutedColor,
  "&:not(:disabled)": {
    "&:hover,&:focus-visible": {
      color: theme3.color.secondary
    }
  }
})), StyledIconButton = styled31(Button8)(({ theme: theme3 }) => ({
  color: theme3.textMutedColor
})), OpenInEditorButton = styled31(Button8)(({ theme: theme3 }) => ({
  color: theme3.color.secondary,
  fontWeight: theme3.typography.weight.bold,
  justifyContent: "flex-end",
  textAlign: "right",
  whiteSpace: "nowrap",
  fontSize: 13,
  lineHeight: 24
})), StyledLocation = styled31(P2)(({ theme: theme3 }) => ({
  color: theme3.textMutedColor,
  cursor: "default",
  fontWeight: theme3.typography.weight.regular,
  justifyContent: "flex-end",
  textAlign: "right",
  whiteSpace: "nowrap",
  margin: 0,
  fontSize: 13
})), ControlsGroup = styled31.div({
  display: "flex",
  alignItems: "center",
  flex: 1,
  gap: 6
}), RewindButton = styled31(StyledIconButton)({
  marginInlineStart: 3
}), JumpToEndButton = styled31(StyledButton3)({
  marginInline: 3,
  lineHeight: "12px"
}), RerunButton = styled31(StyledIconButton)(({ theme: theme3, animating, disabled }) => ({
  opacity: disabled ? 0.5 : 1,
  svg: {
    animation: animating ? `${theme3.animation.rotate360} 200ms ease-out` : void 0
  }
})), Toolbar = ({
  controls,
  controlStates,
  status,
  storyFileName,
  onScrollToEnd,
  importPath,
  canOpenInEditor,
  api
}) => {
  let buttonText = status === "errored" ? "Scroll to error" : "Scroll to end", theme3 = useTheme6();
  return React53.createElement(ToolbarWrapper, null, React53.createElement(
    SharedToolbar,
    {
      backgroundColor: theme3.background.app,
      innerStyle: { gap: 6, paddingInline: 15 },
      "aria-label": "Component test playback controls"
    },
    React53.createElement(ControlsGroup, null, React53.createElement(StatusBadge, { status }), React53.createElement(JumpToEndButton, { ariaLabel: !1, onClick: onScrollToEnd, disabled: !onScrollToEnd }, buttonText), React53.createElement(Separator, null), React53.createElement(
      RewindButton,
      {
        padding: "small",
        variant: "ghost",
        ariaLabel: "Go to start",
        onClick: controls.start,
        disabled: !controlStates.start
      },
      React53.createElement(RewindIcon, null)
    ), React53.createElement(
      StyledIconButton,
      {
        padding: "small",
        variant: "ghost",
        ariaLabel: "Go back",
        onClick: controls.back,
        disabled: !controlStates.back
      },
      React53.createElement(PlayBackIcon, null)
    ), React53.createElement(
      StyledIconButton,
      {
        padding: "small",
        variant: "ghost",
        ariaLabel: "Go forward",
        onClick: controls.next,
        disabled: !controlStates.next
      },
      React53.createElement(PlayNextIcon, null)
    ), React53.createElement(
      StyledIconButton,
      {
        padding: "small",
        variant: "ghost",
        ariaLabel: "Go to end",
        onClick: controls.end,
        disabled: !controlStates.end
      },
      React53.createElement(FastForwardIcon, null)
    ), React53.createElement(RerunButton, { padding: "small", variant: "ghost", ariaLabel: "Rerun", onClick: controls.rerun }, React53.createElement(SyncIcon, null))),
    (importPath || storyFileName) && (canOpenInEditor ? React53.createElement(
      OpenInEditorButton,
      {
        padding: "small",
        size: "small",
        variant: "ghost",
        ariaLabel: "Open in editor",
        onClick: () => {
          api.openInEditor({
            file: importPath
          });
        }
      },
      storyFileName
    ) : React53.createElement(StyledLocation, null, storyFileName))
  ));
};

// src/component-testing/components/InteractionsPanel.tsx
var Container3 = styled32.div(({ theme: theme3 }) => ({
  height: "100%",
  background: theme3.background.content
})), CaughtException = styled32.div(({ theme: theme3 }) => ({
  borderBottom: `1px solid ${theme3.appBorderColor}`,
  backgroundColor: theme3.base === "dark" ? curriedTransparentize$1(0.93, theme3.color.negative) : theme3.background.warning,
  padding: 15,
  fontSize: theme3.typography.size.s2 - 1,
  lineHeight: "19px"
})), CaughtExceptionCode = styled32.code(({ theme: theme3 }) => ({
  margin: "0 1px",
  padding: 3,
  fontSize: theme3.typography.size.s1 - 1,
  lineHeight: 1,
  verticalAlign: "top",
  background: "rgba(0, 0, 0, 0.05)",
  border: `1px solid ${theme3.appBorderColor}`,
  borderRadius: 3
})), CaughtExceptionTitle = styled32.div({
  paddingBottom: 4,
  fontWeight: "bold"
}), CaughtExceptionDescription = styled32.p({
  margin: 0,
  padding: "0 0 20px"
}), CaughtExceptionStack = styled32.pre(({ theme: theme3 }) => ({
  margin: 0,
  padding: 0,
  "&:not(:last-child)": {
    paddingBottom: 16
  },
  fontSize: theme3.typography.size.s1 - 1
})), InteractionsPanel = React54.memo(
  function({
    storyUrl,
    status,
    calls,
    controls,
    controlStates,
    interactions,
    fileName,
    hasException,
    caughtException,
    unhandledErrors,
    pausedAt,
    onScrollToEnd,
    endRef,
    hasResultMismatch,
    browserTestStatus,
    importPath,
    canOpenInEditor,
    api
  }) {
    let filter = useAnsiToHtmlFilter(), hasRealInteractions = interactions.some((i2) => i2.id !== INTERNAL_RENDER_CALL_ID);
    return React54.createElement(Container3, null, hasResultMismatch && React54.createElement(TestDiscrepancyMessage, { browserTestStatus }), controlStates.detached && (hasRealInteractions || hasException) && React54.createElement(DetachedDebuggerMessage, { storyUrl }), React54.createElement(
      Toolbar,
      {
        controls,
        controlStates,
        status,
        storyFileName: fileName,
        onScrollToEnd,
        importPath,
        canOpenInEditor,
        api
      }
    ), React54.createElement("div", { "aria-label": "Interactions list" }, interactions.map((call) => React54.createElement(
      Interaction,
      {
        key: call.id,
        call,
        callsById: calls,
        controls,
        controlStates,
        childCallIds: call.childCallIds,
        isHidden: call.isHidden,
        isCollapsed: call.isCollapsed,
        toggleCollapsed: call.toggleCollapsed,
        pausedAt
      }
    ))), caughtException && !isTestAssertionError(caughtException) && React54.createElement(CaughtException, null, React54.createElement(CaughtExceptionTitle, null, "Caught exception in ", React54.createElement(CaughtExceptionCode, null, "play"), " function"), React54.createElement(
      CaughtExceptionStack,
      {
        "data-chromatic": "ignore",
        dangerouslySetInnerHTML: {
          __html: filter.toHtml(printSerializedError(caughtException))
        }
      }
    )), unhandledErrors && React54.createElement(CaughtException, null, React54.createElement(CaughtExceptionTitle, null, "Unhandled Errors"), React54.createElement(CaughtExceptionDescription, null, "Found ", unhandledErrors.length, " unhandled error", unhandledErrors.length > 1 ? "s" : "", " ", "while running the play function. This might cause false positive assertions. Resolve unhandled errors or ignore unhandled errors with setting the", React54.createElement(CaughtExceptionCode, null, "test.dangerouslyIgnoreUnhandledErrors"), " ", "parameter to ", React54.createElement(CaughtExceptionCode, null, "true"), "."), unhandledErrors.map((error, i2) => React54.createElement(CaughtExceptionStack, { key: i2, "data-chromatic": "ignore" }, printSerializedError(error)))), React54.createElement("div", { ref: endRef }), status === "completed" && !caughtException && !hasRealInteractions && React54.createElement(Empty2, null));
  }
);
function printSerializedError(error) {
  return error.stack || `${error.name}: ${error.message}`;
}

// src/component-testing/components/Panel.tsx
var INITIAL_CONTROL_STATES = {
  detached: !1,
  start: !1,
  back: !1,
  goto: !1,
  next: !1,
  end: !1
}, playStatusMap = {
  rendering: "rendering",
  playing: "playing",
  completed: "completed",
  errored: "errored",
  aborted: "aborted"
}, terminalStatuses = ["completed", "errored", "aborted"], storyStatusMap = {
  done: "status-value:success",
  error: "status-value:error",
  active: "status-value:pending",
  waiting: "status-value:pending"
}, getInteractions = ({
  log,
  calls,
  collapsed,
  setCollapsed
}) => {
  let callsById = /* @__PURE__ */ new Map(), childCallMap = /* @__PURE__ */ new Map();
  return log.map(({ callId, ancestors, status }) => {
    let isHidden = !1;
    return ancestors.forEach((ancestor) => {
      collapsed.has(ancestor) && (isHidden = !0), childCallMap.set(ancestor, (childCallMap.get(ancestor) || []).concat(callId));
    }), { ...calls.get(callId), status, isHidden };
  }).map((call) => {
    let status = call.status === "error" /* ERROR */ && call.ancestors && callsById.get(call.ancestors.slice(-1)[0])?.status === "active" /* ACTIVE */ ? "active" /* ACTIVE */ : call.status;
    return callsById.set(call.id, { ...call, status }), {
      ...call,
      status,
      childCallIds: childCallMap.get(call.id),
      isCollapsed: collapsed.has(call.id),
      toggleCollapsed: () => setCollapsed((ids) => (ids.has(call.id) ? ids.delete(call.id) : ids.add(call.id), new Set(ids)))
    };
  });
}, getPanelState = (state, {
  log,
  calls,
  collapsed,
  setCollapsed
}) => getInteractions({ log, calls, collapsed, setCollapsed }).reduce(
  (acc, interaction) => (interaction.id === INTERNAL_RENDER_CALL_ID ? acc.interactions.push(interaction) : state.status !== "rendering" && (acc.controlStates = state.controlStates, acc.interactions.push(interaction), interaction.method !== "step" && acc.interactionsCount++), acc),
  {
    ...state,
    controlStates: INITIAL_CONTROL_STATES,
    interactions: [],
    interactionsCount: 0
  }
), getInternalRenderCall = (storyId, exception) => ({
  id: INTERNAL_RENDER_CALL_ID,
  method: "render",
  args: [],
  cursor: 0,
  storyId,
  ancestors: [],
  path: [],
  interceptable: !0,
  retain: !1,
  exception
}), getInternalRenderLogItem = (status) => ({
  callId: INTERNAL_RENDER_CALL_ID,
  status,
  ancestors: []
}), Panel = memo4(
  function({ refId, storyId, storyUrl }) {
    let { statusValue, testRunId } = experimental_useStatusStore((state2) => {
      let storyStatus = refId ? void 0 : state2[storyId]?.[STATUS_TYPE_ID_COMPONENT_TEST];
      return {
        statusValue: storyStatus?.value,
        testRunId: storyStatus?.data?.testRunId
      };
    }), state = useStorybookState2(), api = useStorybookApi6(), importPath = api.getData(state.storyId, state.refId)?.importPath, canOpenInEditor = global2.CONFIG_TYPE === "DEVELOPMENT" && !state.refId, [panelState, set] = useAddonState2(ADDON_ID7, {
      status: "rendering",
      controlStates: INITIAL_CONTROL_STATES,
      interactions: [],
      interactionsCount: 0,
      hasException: !1,
      pausedAt: void 0,
      caughtException: void 0,
      unhandledErrors: void 0
    }), [scrollTarget, setScrollTarget] = useState19(void 0), [collapsed, setCollapsed] = useState19(/* @__PURE__ */ new Set()), [hasResultMismatch, setResultMismatch] = useState19(!1), {
      status = "rendering",
      controlStates = INITIAL_CONTROL_STATES,
      interactions = [],
      pausedAt = void 0,
      caughtException = void 0,
      unhandledErrors = void 0
    } = panelState, log = useRef6([getInternalRenderLogItem("active" /* ACTIVE */)]), calls = useRef6(
      /* @__PURE__ */ new Map([[INTERNAL_RENDER_CALL_ID, getInternalRenderCall(storyId)]])
    ), setCall = ({ status: status2, ...call }) => calls.current.set(call.id, call), endRef = useRef6();
    useEffect15(() => {
      let observer;
      return global2.IntersectionObserver && (observer = new global2.IntersectionObserver(
        ([end]) => setScrollTarget(end.isIntersecting ? void 0 : end.target),
        { root: global2.document.querySelector('#storybook-panel-root [role="tabpanel"]') }
      ), endRef.current && observer.observe(endRef.current)), () => observer?.disconnect();
    }, []);
    let lastStoryId = useRef6(void 0), lastRenderId = useRef6(0), emit = useChannel2(
      {
        [EVENTS.CALL]: setCall,
        [EVENTS.SYNC]: (payload) => {
          log.current = [getInternalRenderLogItem("done" /* DONE */), ...payload.logItems], set(
            (state2) => getPanelState(
              { ...state2, controlStates: payload.controlStates, pausedAt: payload.pausedAt },
              { log: log.current, calls: calls.current, collapsed, setCollapsed }
            )
          );
        },
        [STORY_RENDER_PHASE_CHANGED]: (event) => {
          lastStoryId.current === event.storyId && ["preparing", "loading"].includes(event.newPhase) || (lastStoryId.current = event.storyId, lastRenderId.current = Math.max(lastRenderId.current, event.renderId || 0), lastRenderId.current === event.renderId && (event.newPhase === "rendering" ? (log.current = [getInternalRenderLogItem("active" /* ACTIVE */)], calls.current.set(INTERNAL_RENDER_CALL_ID, getInternalRenderCall(storyId)), set({
            status: "rendering",
            controlStates: INITIAL_CONTROL_STATES,
            pausedAt: void 0,
            interactions: [],
            interactionsCount: 0,
            hasException: !1,
            caughtException: void 0,
            unhandledErrors: void 0
          })) : set((state2) => {
            let status2 = event.newPhase in playStatusMap && !terminalStatuses.includes(state2.status) ? playStatusMap[event.newPhase] : state2.status;
            return getPanelState(
              { ...state2, status: status2, pausedAt: void 0 },
              { log: log.current, calls: calls.current, collapsed, setCollapsed }
            );
          })));
        },
        [STORY_THREW_EXCEPTION]: (e2) => {
          log.current = [getInternalRenderLogItem("error" /* ERROR */)], calls.current.set(
            INTERNAL_RENDER_CALL_ID,
            getInternalRenderCall(storyId, { ...e2, callId: INTERNAL_RENDER_CALL_ID })
          ), set(
            (state2) => getPanelState(
              {
                ...state2,
                hasException: !0,
                caughtException: void 0,
                controlStates: INITIAL_CONTROL_STATES,
                pausedAt: void 0
              },
              { log: log.current, calls: calls.current, collapsed, setCollapsed }
            )
          );
        },
        [PLAY_FUNCTION_THREW_EXCEPTION]: (caughtException2) => {
          set((state2) => ({ ...state2, caughtException: caughtException2, hasException: !0 }));
        },
        [UNHANDLED_ERRORS_WHILE_PLAYING]: (unhandledErrors2) => {
          set((state2) => ({ ...state2, unhandledErrors: unhandledErrors2, hasException: !0 }));
        }
      },
      [collapsed]
    );
    useEffect15(() => {
      set(
        (state2) => getPanelState(state2, { log: log.current, calls: calls.current, collapsed, setCollapsed })
      );
    }, [set, collapsed]);
    let controls = useMemo5(
      () => ({
        start: () => emit(EVENTS.START, { storyId }),
        back: () => emit(EVENTS.BACK, { storyId }),
        goto: (callId) => emit(EVENTS.GOTO, { storyId, callId }),
        next: () => emit(EVENTS.NEXT, { storyId }),
        end: () => emit(EVENTS.END, { storyId }),
        rerun: () => {
          emit(FORCE_REMOUNT, { storyId });
        }
      }),
      [emit, storyId]
    ), storyFilePath = useParameter2("fileName", ""), [fileName] = storyFilePath.toString().split("/").slice(-1), scrollToTarget = () => scrollTarget?.scrollIntoView({ behavior: "smooth", block: "end" }), hasException = !!caughtException || !!unhandledErrors || interactions.some((v2) => v2.status === "error" /* ERROR */), browserTestStatus = useMemo5(() => status !== "playing" && (interactions.length > 0 || hasException) ? hasException ? "error" /* ERROR */ : "done" /* DONE */ : status === "playing" ? "active" /* ACTIVE */ : void 0, [status, interactions, hasException]);
    return useEffect15(() => {
      if (browserTestStatus && statusValue && statusValue !== "status-value:pending" && statusValue !== storyStatusMap[browserTestStatus]) {
        let timeout = setTimeout(
          () => setResultMismatch((currentValue) => (currentValue || emit(STORYBOOK_ADDON_TEST_CHANNEL, {
            type: "test-discrepancy",
            payload: {
              browserStatus: browserTestStatus === "done" /* DONE */ ? "PASS" : "FAIL",
              cliStatus: browserTestStatus === "done" /* DONE */ ? "FAIL" : "PASS",
              storyId,
              testRunId
            }
          }), !0)),
          2e3
        );
        return () => clearTimeout(timeout);
      } else
        setResultMismatch(!1);
    }, [emit, browserTestStatus, statusValue, storyId, testRunId]), React55.createElement(Fragment3, { key: "component-tests" }, React55.createElement(
      InteractionsPanel,
      {
        storyUrl,
        status,
        hasResultMismatch,
        browserTestStatus,
        calls: calls.current,
        controls,
        controlStates: { ...controlStates, detached: !!refId || controlStates.detached },
        interactions,
        fileName,
        hasException,
        caughtException,
        unhandledErrors,
        pausedAt,
        endRef,
        onScrollToEnd: scrollTarget && scrollToTarget,
        importPath,
        canOpenInEditor,
        api
      }
    ));
  }
);

// src/component-testing/components/PanelTitle.tsx
import React56 from "react";
import { Badge as Badge3 } from "storybook/internal/components";
import { useAddonState as useAddonState3, useStorybookApi as useStorybookApi7 } from "storybook/manager-api";
function PanelTitle() {
  let selectedPanel = useStorybookApi7().getSelectedPanel(), [addonState = {}] = useAddonState3(ADDON_ID7), { status, hasException, interactionsCount } = addonState;
  return React56.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, React56.createElement("span", null, "Interactions"), interactionsCount && status !== "errored" && !hasException ? React56.createElement(Badge3, { compact: !0, status: selectedPanel === PANEL_ID2 ? "active" : "neutral" }, interactionsCount) : null, status === "errored" || hasException ? React56.createElement(StatusIcon, { status: "error" /* ERROR */ }) : null);
}

// src/component-testing/manager.tsx
var manager_default3 = addons3.register(ADDON_ID7, () => {
  if (globalThis?.FEATURES?.interactions) {
    let filter = ({ state }) => {
      let origin = state.refId && state.refs[state.refId]?.url || document.location.origin, { pathname, search = "" } = state.location, path = pathname + (state.refId ? search.replace(`/${state.refId}_`, "/") : search);
      return {
        refId: state.refId,
        storyId: state.storyId,
        storyUrl: origin + path
      };
    };
    addons3.add(PANEL_ID2, {
      type: types3.PANEL,
      title: () => React57.createElement(PanelTitle, null),
      match: ({ viewMode }) => viewMode === "story",
      render: ({ active }) => React57.createElement(AddonPanel2, { active: !!active }, React57.createElement(Consumer, { filter }, (props) => React57.createElement(Panel, { ...props })))
    });
  }
});

// src/backgrounds/manager.tsx
import React59 from "react";
import { addons as addons4, types as types4 } from "storybook/manager-api";

// src/backgrounds/components/Tool.tsx
import React58, { Fragment as Fragment4, memo as memo5, useCallback as useCallback7 } from "react";
import { Select, ToggleButton as ToggleButton2 } from "storybook/internal/components";
import { CircleIcon as CircleIcon2, GridIcon, PhotoIcon } from "@storybook/icons";
import { useGlobals as useGlobals2, useParameter as useParameter3 } from "storybook/manager-api";
var BackgroundTool = memo5(function() {
  let config = useParameter3(PARAM_KEY3), [globals, updateGlobals, storyGlobals] = useGlobals2(), { options = DEFAULT_BACKGROUNDS, disable = !0 } = config || {};
  if (disable)
    return null;
  let data = globals[PARAM_KEY3] || {}, backgroundName = data.value, isGridActive = data.grid || !1, item = options[backgroundName], isLocked = !!storyGlobals?.[PARAM_KEY3], length = Object.keys(options).length;
  return React58.createElement(
    Pure,
    {
      length,
      backgroundMap: options,
      item,
      updateGlobals,
      backgroundName,
      isLocked,
      isGridActive
    }
  );
}), Pure = memo5(function(props) {
  let {
    length,
    updateGlobals,
    backgroundMap,
    backgroundName,
    isLocked,
    isGridActive: isGrid
  } = props, update = useCallback7(
    (input) => {
      updateGlobals({
        [PARAM_KEY3]: input
      });
    },
    [updateGlobals]
  ), options = Object.entries(backgroundMap).map(([k2, value2]) => ({
    value: k2,
    title: value2.name,
    icon: React58.createElement(CircleIcon2, { color: value2?.value || "grey" })
  }));
  return React58.createElement(Fragment4, null, React58.createElement(
    ToggleButton2,
    {
      padding: "small",
      variant: "ghost",
      key: "grid",
      pressed: isGrid,
      disabled: isLocked,
      ariaLabel: isLocked ? "Grid set by story parameters" : "Grid visibility",
      tooltip: isLocked ? "Grid set by story parameters" : "Toggle grid visibility",
      onClick: () => update({ value: backgroundName, grid: !isGrid })
    },
    React58.createElement(GridIcon, null)
  ), length > 0 ? React58.createElement(
    Select,
    {
      resetLabel: "Reset background",
      onReset: () => update(void 0),
      disabled: isLocked,
      key: "background",
      icon: React58.createElement(PhotoIcon, null),
      ariaLabel: isLocked ? "Background set by story parameters" : "Preview background",
      tooltip: isLocked ? "Background set by story parameters" : "Change background",
      defaultOptions: backgroundName,
      options,
      onSelect: (selected) => update({ value: selected, grid: isGrid })
    }
  ) : null);
});

// src/backgrounds/manager.tsx
var manager_default4 = addons4.register(ADDON_ID3, () => {
  globalThis?.FEATURES?.backgrounds && addons4.add(ADDON_ID3, {
    title: "Backgrounds",
    type: types4.TOOL,
    match: ({ viewMode, tabId }) => !!(viewMode && viewMode.match(/^(story|docs)$/)) && !tabId,
    render: () => React59.createElement(BackgroundTool, null)
  });
});

// src/measure/manager.tsx
import React61 from "react";
import { addons as addons5, types as types5 } from "storybook/manager-api";

// src/measure/Tool.tsx
import React60, { useCallback as useCallback8, useEffect as useEffect16 } from "react";
import { ToggleButton as ToggleButton3 } from "storybook/internal/components";
import { RulerIcon } from "@storybook/icons";
import { useGlobals as useGlobals3, useStorybookApi as useStorybookApi8 } from "storybook/manager-api";
var Tool = () => {
  let [globals, updateGlobals] = useGlobals3(), { measureEnabled } = globals || {}, api = useStorybookApi8(), toggleMeasure = useCallback8(
    () => updateGlobals({
      measureEnabled: !measureEnabled
    }),
    [updateGlobals, measureEnabled]
  );
  return useEffect16(() => {
    api.setAddonShortcut(ADDON_ID4, {
      label: "Toggle Measure",
      defaultShortcut: ["M"],
      actionName: "measure",
      showInMenu: !1,
      action: toggleMeasure
    });
  }, [toggleMeasure, api]), React60.createElement(
    ToggleButton3,
    {
      key: TOOL_ID2,
      pressed: measureEnabled,
      padding: "small",
      variant: "ghost",
      ariaLabel: "Measure tool",
      tooltip: "Toggle measure",
      ariaDescription: "When enabled, this tool shows dimensions and whitespace (margin, padding, border) for the currently hovered element in the preview area. Does not work with keyboard focus.",
      onClick: toggleMeasure
    },
    React60.createElement(RulerIcon, null)
  );
};

// src/measure/manager.tsx
var manager_default5 = addons5.register(ADDON_ID4, () => {
  globalThis?.FEATURES?.measure && addons5.add(TOOL_ID2, {
    type: types5.TOOL,
    title: "Measure",
    match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
    render: () => React61.createElement(Tool, null)
  });
});

// src/outline/manager.tsx
import React64 from "react";
import { addons as addons6, types as types6 } from "storybook/manager-api";

// src/outline/OutlineSelector.tsx
import React63, { memo as memo6, useCallback as useCallback9, useEffect as useEffect17 } from "react";
import { ToggleButton as ToggleButton4 } from "storybook/internal/components";
import { OutlineIcon } from "@storybook/icons";
import { useGlobals as useGlobals4, useStorybookApi as useStorybookApi9 } from "storybook/manager-api";
var OutlineSelector = memo6(function() {
  let [globals, updateGlobals] = useGlobals4(), api = useStorybookApi9(), isActive = [!0, "true"].includes(globals[PARAM_KEY4]), toggleOutline = useCallback9(
    () => updateGlobals({
      [PARAM_KEY4]: !isActive
    }),
    [isActive, updateGlobals]
  );
  return useEffect17(() => {
    api.setAddonShortcut(ADDON_ID5, {
      label: "Toggle Outline",
      defaultShortcut: ["alt", "O"],
      actionName: "outline",
      showInMenu: !1,
      action: toggleOutline
    });
  }, [toggleOutline, api]), React63.createElement(
    ToggleButton4,
    {
      key: "outline",
      padding: "small",
      variant: "ghost",
      pressed: isActive,
      ariaLabel: "Outline tool",
      ariaDescription: "When enabled, this tool displays the outline of every element in the preview area, which helps understand their layout.",
      tooltip: "Toggle outline",
      onClick: toggleOutline
    },
    React63.createElement(OutlineIcon, null)
  );
});

// src/outline/manager.tsx
var manager_default6 = addons6.register(ADDON_ID5, () => {
  globalThis?.FEATURES?.outline && addons6.add(ADDON_ID5, {
    title: "Outline",
    type: types6.TOOL,
    match: ({ viewMode, tabId }) => !!(viewMode && viewMode.match(/^(story|docs)$/)) && !tabId,
    render: () => React64.createElement(OutlineSelector, null)
  });
});

// src/viewport/manager.tsx
import * as React67 from "react";
import { addons as addons7, types as types7 } from "storybook/manager-api";

// src/viewport/components/Tool.tsx
import React66, { Fragment as Fragment6, useCallback as useCallback10, useEffect as useEffect18, useMemo as useMemo6 } from "react";
import { Button as Button9, Select as Select2 } from "storybook/internal/components";
import { GrowIcon, TransferIcon } from "@storybook/icons";
import { useGlobals as useGlobals5, useParameter as useParameter4 } from "storybook/manager-api";
import { Global, styled as styled34 } from "storybook/theming";

// src/viewport/shortcuts.ts
var getCurrentViewportIndex = (viewportsKeys, current) => viewportsKeys.indexOf(current), getNextViewport = (viewportsKeys, current) => {
  let currentViewportIndex = getCurrentViewportIndex(viewportsKeys, current);
  return currentViewportIndex === viewportsKeys.length - 1 ? viewportsKeys[0] : viewportsKeys[currentViewportIndex + 1];
}, getPreviousViewport = (viewportsKeys, current) => {
  let currentViewportIndex = getCurrentViewportIndex(viewportsKeys, current);
  return currentViewportIndex < 1 ? viewportsKeys[viewportsKeys.length - 1] : viewportsKeys[currentViewportIndex - 1];
}, registerShortcuts = async (api, viewport, updateGlobals, viewportsKeys) => {
  await api.setAddonShortcut(ADDON_ID2, {
    label: "Previous viewport",
    defaultShortcut: ["alt", "shift", "V"],
    actionName: "previous",
    action: () => {
      updateGlobals({
        viewport: getPreviousViewport(viewportsKeys, viewport)
      });
    }
  }), await api.setAddonShortcut(ADDON_ID2, {
    label: "Next viewport",
    defaultShortcut: ["alt", "V"],
    actionName: "next",
    action: () => {
      updateGlobals({
        viewport: getNextViewport(viewportsKeys, viewport)
      });
    }
  }), await api.setAddonShortcut(ADDON_ID2, {
    label: "Reset viewport",
    defaultShortcut: ["alt", "control", "V"],
    actionName: "reset",
    action: () => {
      updateGlobals({
        viewport: { value: void 0, isRotated: !1 }
      });
    }
  });
};

// src/viewport/utils.tsx
import React65, { Fragment as Fragment5 } from "react";
import { BrowserIcon, MobileIcon, TabletIcon } from "@storybook/icons";
import { styled as styled33 } from "storybook/theming";
var ActiveViewportSize = styled33.div({
  display: "inline-flex",
  alignItems: "center"
}), ActiveViewportLabel = styled33.div(({ theme: theme3 }) => ({
  display: "inline-block",
  textDecoration: "none",
  padding: 10,
  fontWeight: theme3.typography.weight.bold,
  fontSize: theme3.typography.size.s2 - 1,
  lineHeight: "1",
  height: 40,
  border: "none",
  borderTop: "3px solid transparent",
  borderBottom: "3px solid transparent",
  background: "transparent"
})), iconsMap = {
  desktop: React65.createElement(BrowserIcon, null),
  mobile: React65.createElement(MobileIcon, null),
  tablet: React65.createElement(TabletIcon, null),
  other: React65.createElement(Fragment5, null)
};

// src/viewport/components/Tool.tsx
var ViewportTool = ({ api }) => {
  let config = useParameter4(PARAM_KEY2), [globals, updateGlobals, storyGlobals] = useGlobals5(), { options = MINIMAL_VIEWPORTS, disable } = config || {}, data = globals?.[PARAM_KEY2] || {}, viewportName = typeof data == "string" ? data : data.value, isRotated = typeof data == "string" ? !1 : !!data.isRotated, item = options[viewportName] || responsiveViewport, isLocked = PARAM_KEY2 in storyGlobals, length = Object.keys(options).length;
  if (useEffect18(() => {
    registerShortcuts(api, viewportName, updateGlobals, Object.keys(options));
  }, [options, viewportName, updateGlobals, api]), item.styles === null || !options || length < 1)
    return null;
  if (typeof item.styles == "function")
    return console.warn(
      "Addon Viewport no longer supports dynamic styles using a function, use css calc() instead"
    ), null;
  let width = isRotated ? item.styles.height : item.styles.width, height = isRotated ? item.styles.width : item.styles.height;
  return disable ? null : React66.createElement(
    Pure2,
    {
      item,
      updateGlobals,
      viewportMap: options,
      viewportName,
      isRotated,
      isLocked,
      width,
      height
    }
  );
}, FirstDimension = styled34(ActiveViewportLabel)({
  order: 1
}), DimensionSeparator = styled34.div({
  order: 2
}), LastDimension = styled34(ActiveViewportLabel)({
  order: 3
}), Pure2 = React66.memo(function(props) {
  let { item, viewportMap, viewportName, isRotated, updateGlobals, isLocked, width, height } = props, update = useCallback10(
    (input) => updateGlobals({ [PARAM_KEY2]: input }),
    [updateGlobals]
  ), options = useMemo6(
    () => Object.entries(viewportMap).map(([k2, value2]) => ({
      value: k2,
      title: value2.name,
      icon: iconsMap[value2.type]
    })),
    [viewportMap]
  );
  return React66.createElement(Fragment6, null, React66.createElement(
    Select2,
    {
      resetLabel: "Reset viewport",
      onReset: () => update({ value: void 0, isRotated: !1 }),
      key: "viewport",
      disabled: isLocked,
      ariaLabel: isLocked ? "Viewport size set by story parameters" : "Viewport size",
      ariaDescription: "Select a viewport size among predefined options for the preview area, or reset to the default size.",
      tooltip: isLocked ? "Viewport size set by story parameters" : "Resize viewport",
      defaultOptions: viewportName,
      options,
      onSelect: (selected) => update({ value: selected, isRotated: !1 }),
      icon: React66.createElement(GrowIcon, null)
    },
    item !== responsiveViewport ? React66.createElement(React66.Fragment, null, item.name, " ", isRotated ? "(L)" : "(P)") : null
  ), React66.createElement(
    Global,
    {
      styles: {
        'iframe[data-is-storybook="true"]': { width, height }
      }
    }
  ), item !== responsiveViewport ? React66.createElement(ActiveViewportSize, null, React66.createElement(FirstDimension, { title: "Viewport width" }, React66.createElement("span", { className: "sb-sr-only" }, "Viewport width: "), width.replace("px", "")), isLocked && React66.createElement(DimensionSeparator, null, "/"), React66.createElement(LastDimension, { title: "Viewport height" }, React66.createElement("span", { className: "sb-sr-only" }, "Viewport height: "), height.replace("px", "")), !isLocked && React66.createElement(DimensionSeparator, null, React66.createElement(
    Button9,
    {
      key: "viewport-rotate",
      padding: "small",
      variant: "ghost",
      ariaLabel: "Rotate viewport",
      onClick: () => {
        update({ value: viewportName, isRotated: !isRotated });
      }
    },
    React66.createElement(TransferIcon, null)
  ))) : null);
});

// src/viewport/manager.tsx
var manager_default7 = addons7.register(ADDON_ID2, (api) => {
  globalThis?.FEATURES?.viewport && addons7.add(TOOL_ID, {
    title: "viewport / media-queries",
    type: types7.TOOL,
    match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
    render: () => React67.createElement(ViewportTool, { api })
  });
});

// src/core-server/presets/common-manager.ts
var TAG_FILTERS = "tag-filters", STATIC_FILTER = "static-filter", tagFiltersManager = addons8.register(TAG_FILTERS, (api) => {
  let staticExcludeTags = Object.entries(global3.TAGS_OPTIONS ?? {}).reduce(
    (acc, entry) => {
      let [tag, option] = entry;
      return option.excludeFromSidebar && (acc[tag] = !0), acc;
    },
    {}
  );
  api.experimental_setFilter(STATIC_FILTER, (item) => {
    let tags = item.tags ?? [];
    return (
      // we can filter out the primary story, but we still want to show autodocs
      (tags.includes("dev") || item.type === "docs") && tags.filter((tag) => staticExcludeTags[tag]).length === 0
    );
  });
}), common_manager_default = [
  manager_default5,
  tagFiltersManager,
  manager_default2,
  manager_default4,
  manager_default3,
  manager_default,
  manager_default7,
  manager_default6
];
export {
  common_manager_default as default
};
