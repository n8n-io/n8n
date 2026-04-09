(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CrlfNormalize = {}));
})(this, (function (exports) { 'use strict';

	exports.EnumLineBreak = void 0;
	(function (EnumLineBreak) {
	  EnumLineBreak["CR"] = "\r";
	  EnumLineBreak["CRLF"] = "\r\n";
	  EnumLineBreak["LF"] = "\n";
	})(exports.EnumLineBreak || (exports.EnumLineBreak = {}));
	exports.EnumLineBreakCharCode = void 0;
	(function (EnumLineBreakCharCode) {
	  EnumLineBreakCharCode[EnumLineBreakCharCode["CR"] = 13] = "CR";
	  EnumLineBreakCharCode[EnumLineBreakCharCode["LF"] = 10] = "LF";
	})(exports.EnumLineBreakCharCode || (exports.EnumLineBreakCharCode = {}));
	const CR = "\r" /* EnumLineBreak.CR */;
	const CRLF = "\r\n" /* EnumLineBreak.CRLF */;
	const LF = "\n" /* EnumLineBreak.LF */;
	const R_CRLF = /\r\n|\r(?!\n)|\n/g;
	const R_CRLF_MATCH = /*#__PURE__*/new RegExp(`(${R_CRLF.source})`, R_CRLF.flags);
	function crlf(text, newline = "\n" /* EnumLineBreak.LF */) {
	  return text.replace(R_CRLF, newline);
	}
	function chkcrlf(text, options) {
	  var _options$disable;
	  const disable = (_options$disable = options === null || options === void 0 ? void 0 : options.disable) !== null && _options$disable !== void 0 ? _options$disable : {};
	  return {
	    lf: !disable.lf && /\n/.test(text.replace(/\r\n/g, '')),
	    crlf: !disable.crlf && /\r\n/.test(text),
	    cr: !disable.cr && /\r(?!\n)/.test(text)
	  };
	}
	function detectLineBreak(text, options) {
	  const _lb = chkcrlf(text, options);
	  return _detectLineBreakCore(_lb);
	}
	function _detectLineBreakCore(_lb) {
	  return _lb.crlf ? "\r\n" /* EnumLineBreak.CRLF */ : _lb.lf || !_lb.cr ? "\n" /* EnumLineBreak.LF */ : "\r" /* EnumLineBreak.CR */;
	}

	function isCRLF(newline) {
	  return newline === "\r\n" /* EnumLineBreak.CRLF */;
	}

	function isLF(newline) {
	  return newline === "\n" /* EnumLineBreak.LF */;
	}

	function isCR(newline) {
	  return newline === "\r" /* EnumLineBreak.CR */;
	}

	function charCodeIsLF(charCode) {
	  return charCode === 10 /* EnumLineBreakCharCode.LF */;
	}

	function charCodeIsCR(charCode) {
	  return charCode === 13 /* EnumLineBreakCharCode.CR */;
	}

	function lineSplit(text) {
	  return text.split(R_CRLF);
	}
	function crlf_unicode_normalize(text, newline = "\n" /* EnumLineBreak.LF */) {
	  const ln3 = newline + newline + newline;
	  const ln2 = newline + newline;
	  return text.replace(/\u000C/g, ln3).replace(/\u2028/g, newline).replace(/\u2029/g, ln2);
	}
	function isEqualWithIgnoreLineSeparators(a, b) {
	  const _lb_a = chkcrlf(a);
	  const _lb_b = chkcrlf(b);
	  let bool = false;
	  if (_lb_a.cr === _lb_b.cr && _lb_a.crlf === _lb_b.crlf && _lb_a.lf === _lb_b.lf) {
	    bool = crlf(a) === crlf(b);
	  }
	  return {
	    bool,
	    _lb_a,
	    _lb_b
	  };
	}
	function toLineBreakName(newline) {
	  switch (newline) {
	    case "\n" /* EnumLineBreak.LF */:
	      return 'LF';
	    case "\r" /* EnumLineBreak.CR */:
	      return 'CR';
	    case "\r\n" /* EnumLineBreak.CRLF */:
	      return 'CRLF';
	  }
	  throw new TypeError(`Invalid line break`);
	}
	function nameToLineBreak(name) {
	  switch (name === null || name === void 0 ? void 0 : name.toUpperCase()) {
	    case 'LF':
	      return "\n" /* EnumLineBreak.LF */;
	    case 'CR':
	      return "\r" /* EnumLineBreak.CR */;
	    case 'CRLF':
	      return "\r\n" /* EnumLineBreak.CRLF */;
	  }

	  throw new TypeError(`Invalid line break name: ${name}`);
	}
	function detectCurrentIndexLineBreakFromBufferLike(buffer, index) {
	  const cur = buffer[index];
	  const next = index + 1;
	  if (charCodeIsLF(cur)) {
	    return {
	      newline: "\n" /* EnumLineBreak.LF */,
	      cur: cur,
	      index,
	      next,
	      length: 1
	    };
	  } else if (charCodeIsCR(cur)) {
	    if (charCodeIsLF(buffer[next])) {
	      return {
	        newline: "\r\n" /* EnumLineBreak.CRLF */,
	        cur: cur,
	        index,
	        next: next + 1,
	        length: 2
	      };
	    }
	    return {
	      newline: "\r" /* EnumLineBreak.CR */,
	      cur: cur,
	      index,
	      next,
	      length: 1
	    };
	  }
	  return {
	    newline: void 0,
	    cur,
	    index,
	    next,
	    length: 0
	  };
	}
	function detectCurrentIndexLineBreak(buffer, index) {
	  const cur = buffer[index];
	  const next = index + 1;
	  if (isLF(cur)) {
	    return {
	      newline: "\n" /* EnumLineBreak.LF */,
	      cur: cur,
	      index,
	      next,
	      length: 1
	    };
	  } else if (isCR(cur)) {
	    if (isLF(buffer[next])) {
	      return {
	        newline: "\r\n" /* EnumLineBreak.CRLF */,
	        cur: cur,
	        index,
	        next: next + 1,
	        length: 2
	      };
	    }
	    return {
	      newline: "\r" /* EnumLineBreak.CR */,
	      cur: cur,
	      index,
	      next,
	      length: 1
	    };
	  }
	  return {
	    newline: void 0,
	    cur,
	    index,
	    next,
	    length: 0
	  };
	}

	exports.CR = CR;
	exports.CRLF = CRLF;
	exports.LF = LF;
	exports.R_CRLF = R_CRLF;
	exports.R_CRLF_MATCH = R_CRLF_MATCH;
	exports._detectLineBreakCore = _detectLineBreakCore;
	exports.charCodeIsCR = charCodeIsCR;
	exports.charCodeIsLF = charCodeIsLF;
	exports.chkcrlf = chkcrlf;
	exports.crlf = crlf;
	exports.crlf_unicode_normalize = crlf_unicode_normalize;
	exports.default = crlf;
	exports.detectCurrentIndexLineBreak = detectCurrentIndexLineBreak;
	exports.detectCurrentIndexLineBreakFromBufferLike = detectCurrentIndexLineBreakFromBufferLike;
	exports.detectLineBreak = detectLineBreak;
	exports.isCR = isCR;
	exports.isCRLF = isCRLF;
	exports.isEqualWithIgnoreLineSeparators = isEqualWithIgnoreLineSeparators;
	exports.isLF = isLF;
	exports.lineSplit = lineSplit;
	exports.nameToLineBreak = nameToLineBreak;
	exports.toLineBreakName = toLineBreakName;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.development.cjs.map
