var e, n;

!function(e) {
  e.CR = "\r", e.CRLF = "\r\n", e.LF = "\n";
}(e || (e = {})), function(e) {
  e[e.CR = 13] = "CR", e[e.LF = 10] = "LF";
}(n || (n = {}));

const r = "\r", t = "\r\n", c = "\n", i = /\r\n|\r(?!\n)|\n/g, l = new RegExp(`(${i.source})`, i.flags);

function crlf(e, n = "\n") {
  return e.replace(i, n);
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

function detectLineBreak(e, n) {
  return _detectLineBreakCore(chkcrlf(e, n));
}

function _detectLineBreakCore(e) {
  return e.crlf ? "\r\n" : e.lf || !e.cr ? "\n" : "\r";
}

function isCRLF(e) {
  return "\r\n" === e;
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

function lineSplit(e) {
  return e.split(i);
}

function crlf_unicode_normalize(e, n = "\n") {
  const r = n + n;
  return e.replace(/\u000C/g, n + n + n).replace(/\u2028/g, n).replace(/\u2029/g, r);
}

function isEqualWithIgnoreLineSeparators(e, n) {
  const r = chkcrlf(e), t = chkcrlf(n);
  let c = !1;
  return r.cr === t.cr && r.crlf === t.crlf && r.lf === t.lf && (c = crlf(e) === crlf(n)), 
  {
    bool: c,
    _lb_a: r,
    _lb_b: t
  };
}

function toLineBreakName(e) {
  switch (e) {
   case "\n":
    return "LF";

   case "\r":
    return "CR";

   case "\r\n":
    return "CRLF";
  }
  throw new TypeError("Invalid line break");
}

function nameToLineBreak(e) {
  switch (null == e ? void 0 : e.toUpperCase()) {
   case "LF":
    return "\n";

   case "CR":
    return "\r";

   case "CRLF":
    return "\r\n";
  }
  throw new TypeError(`Invalid line break name: ${e}`);
}

function detectCurrentIndexLineBreakFromBufferLike(e, n) {
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
}

function detectCurrentIndexLineBreak(e, n) {
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
}

export { r as CR, t as CRLF, e as EnumLineBreak, n as EnumLineBreakCharCode, c as LF, i as R_CRLF, l as R_CRLF_MATCH, _detectLineBreakCore, charCodeIsCR, charCodeIsLF, chkcrlf, crlf, crlf_unicode_normalize, crlf as default, detectCurrentIndexLineBreak, detectCurrentIndexLineBreakFromBufferLike, detectLineBreak, isCR, isCRLF, isEqualWithIgnoreLineSeparators, isLF, lineSplit, nameToLineBreak, toLineBreakName };
//# sourceMappingURL=index.esm.mjs.map
