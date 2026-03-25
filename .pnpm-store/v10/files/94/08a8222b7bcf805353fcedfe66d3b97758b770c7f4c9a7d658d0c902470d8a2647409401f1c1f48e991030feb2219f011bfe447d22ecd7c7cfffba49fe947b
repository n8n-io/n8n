!function(e, n) {
  "object" == typeof exports && "undefined" != typeof module ? n(exports) : "function" == typeof define && define.amd ? define([ "exports" ], n) : n((e = "undefined" != typeof globalThis ? globalThis : e || self).CrlfNormalize = {});
}(this, (function(e) {
  "use strict";
  var n, r;
  e.EnumLineBreak = void 0, (n = e.EnumLineBreak || (e.EnumLineBreak = {})).CR = "\r", 
  n.CRLF = "\r\n", n.LF = "\n", e.EnumLineBreakCharCode = void 0, (r = e.EnumLineBreakCharCode || (e.EnumLineBreakCharCode = {}))[r.CR = 13] = "CR", 
  r[r.LF = 10] = "LF";
  const t = /\r\n|\r(?!\n)|\n/g, i = new RegExp(`(${t.source})`, t.flags);
  function crlf(e, n = "\n") {
    return e.replace(t, n);
  }
  function chkcrlf(e, n) {
    var r;
    const t = null !== (r = null == n ? void 0 : n.disable) && void 0 !== r ? r : {};
    return {
      lf: !t.lf && /\n/.test(e.replace(/\r\n/g, "")),
      crlf: !t.crlf && /\r\n/.test(e),
      cr: !t.cr && /\r(?!\n)/.test(e)
    };
  }
  function _detectLineBreakCore(e) {
    return e.crlf ? "\r\n" : e.lf || !e.cr ? "\n" : "\r";
  }
  function isLF(e) {
    return "\n" === e;
  }
  function isCR(e) {
    return "\r" === e;
  }
  function charCodeIsLF(e) {
    return 10 === e;
  }
  function charCodeIsCR(e) {
    return 13 === e;
  }
  e.CR = "\r", e.CRLF = "\r\n", e.LF = "\n", e.R_CRLF = t, e.R_CRLF_MATCH = i, e._detectLineBreakCore = _detectLineBreakCore, 
  e.charCodeIsCR = charCodeIsCR, e.charCodeIsLF = charCodeIsLF, e.chkcrlf = chkcrlf, 
  e.crlf = crlf, e.crlf_unicode_normalize = function crlf_unicode_normalize(e, n = "\n") {
    const r = n + n;
    return e.replace(/\u000C/g, n + n + n).replace(/\u2028/g, n).replace(/\u2029/g, r);
  }, e.default = crlf, e.detectCurrentIndexLineBreak = function detectCurrentIndexLineBreak(e, n) {
    const r = e[n], t = n + 1;
    return isLF(r) ? {
      newline: "\n",
      cur: r,
      index: n,
      next: t,
      length: 1
    } : isCR(r) ? isLF(e[t]) ? {
      newline: "\r\n",
      cur: r,
      index: n,
      next: t + 1,
      length: 2
    } : {
      newline: "\r",
      cur: r,
      index: n,
      next: t,
      length: 1
    } : {
      newline: void 0,
      cur: r,
      index: n,
      next: t,
      length: 0
    };
  }, e.detectCurrentIndexLineBreakFromBufferLike = function detectCurrentIndexLineBreakFromBufferLike(e, n) {
    const r = e[n], t = n + 1;
    return charCodeIsLF(r) ? {
      newline: "\n",
      cur: r,
      index: n,
      next: t,
      length: 1
    } : charCodeIsCR(r) ? charCodeIsLF(e[t]) ? {
      newline: "\r\n",
      cur: r,
      index: n,
      next: t + 1,
      length: 2
    } : {
      newline: "\r",
      cur: r,
      index: n,
      next: t,
      length: 1
    } : {
      newline: void 0,
      cur: r,
      index: n,
      next: t,
      length: 0
    };
  }, e.detectLineBreak = function detectLineBreak(e, n) {
    return _detectLineBreakCore(chkcrlf(e, n));
  }, e.isCR = isCR, e.isCRLF = function isCRLF(e) {
    return "\r\n" === e;
  }, e.isEqualWithIgnoreLineSeparators = function isEqualWithIgnoreLineSeparators(e, n) {
    const r = chkcrlf(e), t = chkcrlf(n);
    let i = !1;
    return r.cr === t.cr && r.crlf === t.crlf && r.lf === t.lf && (i = crlf(e) === crlf(n)), 
    {
      bool: i,
      _lb_a: r,
      _lb_b: t
    };
  }, e.isLF = isLF, e.lineSplit = function lineSplit(e) {
    return e.split(t);
  }, e.nameToLineBreak = function nameToLineBreak(e) {
    switch (null == e ? void 0 : e.toUpperCase()) {
     case "LF":
      return "\n";

     case "CR":
      return "\r";

     case "CRLF":
      return "\r\n";
    }
    throw new TypeError(`Invalid line break name: ${e}`);
  }, e.toLineBreakName = function toLineBreakName(e) {
    switch (e) {
     case "\n":
      return "LF";

     case "\r":
      return "CR";

     case "\r\n":
      return "CRLF";
    }
    throw new TypeError("Invalid line break");
  }, Object.defineProperty(e, "__esModule", {
    value: !0
  });
}));
//# sourceMappingURL=index.umd.production.min.cjs.map
