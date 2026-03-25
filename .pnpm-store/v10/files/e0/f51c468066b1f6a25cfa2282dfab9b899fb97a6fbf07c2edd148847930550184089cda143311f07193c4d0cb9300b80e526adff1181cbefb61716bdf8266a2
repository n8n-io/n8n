/*!***************************************************
* mark.js v8.11.1
* https://markjs.io/
* Copyright (c) 2014–2018, Julian Kühnel
* Released under the MIT license https://git.io/vwTVl
*****************************************************/

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('jquery')) :
	typeof define === 'function' && define.amd ? define(['jquery'], factory) :
	(global.Mark = factory(global.jQuery));
}(this, (function ($) { 'use strict';

$ = $ && $.hasOwnProperty('default') ? $['default'] : $;

class DOMIterator {
  constructor(ctx, iframes = true, exclude = [], iframesTimeout = 5000) {
    this.ctx = ctx;
    this.iframes = iframes;
    this.exclude = exclude;
    this.iframesTimeout = iframesTimeout;
  }
  static matches(element, selector) {
    const selectors = typeof selector === 'string' ? [selector] : selector,
      fn = (
        element.matches ||
        element.matchesSelector ||
        element.msMatchesSelector ||
        element.mozMatchesSelector ||
        element.oMatchesSelector ||
        element.webkitMatchesSelector
      );
    if (fn) {
      let match = false;
      selectors.every(sel => {
        if (fn.call(element, sel)) {
          match = true;
          return false;
        }
        return true;
      });
      return match;
    } else {
      return false;
    }
  }
  getContexts() {
    let ctx,
      filteredCtx = [];
    if (typeof this.ctx === 'undefined' || !this.ctx) {
      ctx = [];
    } else if (NodeList.prototype.isPrototypeOf(this.ctx)) {
      ctx = Array.prototype.slice.call(this.ctx);
    } else if (Array.isArray(this.ctx)) {
      ctx = this.ctx;
    } else if (typeof this.ctx === 'string') {
      ctx = Array.prototype.slice.call(
        document.querySelectorAll(this.ctx)
      );
    } else {
      ctx = [this.ctx];
    }
    ctx.forEach(ctx => {
      const isDescendant = filteredCtx.filter(contexts => {
        return contexts.contains(ctx);
      }).length > 0;
      if (filteredCtx.indexOf(ctx) === -1 && !isDescendant) {
        filteredCtx.push(ctx);
      }
    });
    return filteredCtx;
  }
  getIframeContents(ifr, successFn, errorFn = () => {}) {
    let doc;
    try {
      const ifrWin = ifr.contentWindow;
      doc = ifrWin.document;
      if (!ifrWin || !doc) {
        throw new Error('iframe inaccessible');
      }
    } catch (e) {
      errorFn();
    }
    if (doc) {
      successFn(doc);
    }
  }
  isIframeBlank(ifr) {
    const bl = 'about:blank',
      src = ifr.getAttribute('src').trim(),
      href = ifr.contentWindow.location.href;
    return href === bl && src !== bl && src;
  }
  observeIframeLoad(ifr, successFn, errorFn) {
    let called = false,
      tout = null;
    const listener = () => {
      if (called) {
        return;
      }
      called = true;
      clearTimeout(tout);
      try {
        if (!this.isIframeBlank(ifr)) {
          ifr.removeEventListener('load', listener);
          this.getIframeContents(ifr, successFn, errorFn);
        }
      } catch (e) {
        errorFn();
      }
    };
    ifr.addEventListener('load', listener);
    tout = setTimeout(listener, this.iframesTimeout);
  }
  onIframeReady(ifr, successFn, errorFn) {
    try {
      if (ifr.contentWindow.document.readyState === 'complete') {
        if (this.isIframeBlank(ifr)) {
          this.observeIframeLoad(ifr, successFn, errorFn);
        } else {
          this.getIframeContents(ifr, successFn, errorFn);
        }
      } else {
        this.observeIframeLoad(ifr, successFn, errorFn);
      }
    } catch (e) {
      errorFn();
    }
  }
  waitForIframes(ctx, done) {
    let eachCalled = 0;
    this.forEachIframe(ctx, () => true, ifr => {
      eachCalled++;
      this.waitForIframes(ifr.querySelector('html'), () => {
        if (!(--eachCalled)) {
          done();
        }
      });
    }, handled => {
      if (!handled) {
        done();
      }
    });
  }
  forEachIframe(ctx, filter, each, end = () => {}) {
    let ifr = ctx.querySelectorAll('iframe'),
      open = ifr.length,
      handled = 0;
    ifr = Array.prototype.slice.call(ifr);
    const checkEnd = () => {
      if (--open <= 0) {
        end(handled);
      }
    };
    if (!open) {
      checkEnd();
    }
    ifr.forEach(ifr => {
      if (DOMIterator.matches(ifr, this.exclude)) {
        checkEnd();
      } else {
        this.onIframeReady(ifr, con => {
          if (filter(ifr)) {
            handled++;
            each(con);
          }
          checkEnd();
        }, checkEnd);
      }
    });
  }
  createIterator(ctx, whatToShow, filter) {
    return document.createNodeIterator(ctx, whatToShow, filter, false);
  }
  createInstanceOnIframe(contents) {
    return new DOMIterator(contents.querySelector('html'), this.iframes);
  }
  compareNodeIframe(node, prevNode, ifr) {
    const compCurr = node.compareDocumentPosition(ifr),
      prev = Node.DOCUMENT_POSITION_PRECEDING;
    if (compCurr & prev) {
      if (prevNode !== null) {
        const compPrev = prevNode.compareDocumentPosition(ifr),
          after = Node.DOCUMENT_POSITION_FOLLOWING;
        if (compPrev & after) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  }
  getIteratorNode(itr) {
    const prevNode = itr.previousNode();
    let node;
    if (prevNode === null) {
      node = itr.nextNode();
    } else {
      node = itr.nextNode() && itr.nextNode();
    }
    return {
      prevNode,
      node
    };
  }
  checkIframeFilter(node, prevNode, currIfr, ifr) {
    let key = false,
      handled = false;
    ifr.forEach((ifrDict, i) => {
      if (ifrDict.val === currIfr) {
        key = i;
        handled = ifrDict.handled;
      }
    });
    if (this.compareNodeIframe(node, prevNode, currIfr)) {
      if (key === false && !handled) {
        ifr.push({
          val: currIfr,
          handled: true
        });
      } else if (key !== false && !handled) {
        ifr[key].handled = true;
      }
      return true;
    }
    if (key === false) {
      ifr.push({
        val: currIfr,
        handled: false
      });
    }
    return false;
  }
  handleOpenIframes(ifr, whatToShow, eCb, fCb) {
    ifr.forEach(ifrDict => {
      if (!ifrDict.handled) {
        this.getIframeContents(ifrDict.val, con => {
          this.createInstanceOnIframe(con).forEachNode(
            whatToShow, eCb, fCb
          );
        });
      }
    });
  }
  iterateThroughNodes(whatToShow, ctx, eachCb, filterCb, doneCb) {
    const itr = this.createIterator(ctx, whatToShow, filterCb);
    let ifr = [],
      elements = [],
      node, prevNode, retrieveNodes = () => {
        ({
          prevNode,
          node
        } = this.getIteratorNode(itr));
        return node;
      };
    while (retrieveNodes()) {
      if (this.iframes) {
        this.forEachIframe(ctx, currIfr => {
          return this.checkIframeFilter(node, prevNode, currIfr, ifr);
        }, con => {
          this.createInstanceOnIframe(con).forEachNode(
            whatToShow, ifrNode => elements.push(ifrNode), filterCb
          );
        });
      }
      elements.push(node);
    }
    elements.forEach(node => {
      eachCb(node);
    });
    if (this.iframes) {
      this.handleOpenIframes(ifr, whatToShow, eachCb, filterCb);
    }
    doneCb();
  }
  forEachNode(whatToShow, each, filter, done = () => {}) {
    const contexts = this.getContexts();
    let open = contexts.length;
    if (!open) {
      done();
    }
    contexts.forEach(ctx => {
      const ready = () => {
        this.iterateThroughNodes(whatToShow, ctx, each, filter, () => {
          if (--open <= 0) {
            done();
          }
        });
      };
      if (this.iframes) {
        this.waitForIframes(ctx, ready);
      } else {
        ready();
      }
    });
  }
}

class Mark {
  constructor(ctx) {
    this.ctx = ctx;
    this.ie = false;
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
      this.ie = true;
    }
  }
  set opt(val) {
    this._opt = Object.assign({}, {
      'element': '',
      'className': '',
      'exclude': [],
      'iframes': false,
      'iframesTimeout': 5000,
      'separateWordSearch': true,
      'diacritics': true,
      'synonyms': {},
      'accuracy': 'partially',
      'acrossElements': false,
      'caseSensitive': false,
      'ignoreJoiners': false,
      'ignoreGroups': 0,
      'ignorePunctuation': [],
      'wildcards': 'disabled',
      'each': () => {},
      'noMatch': () => {},
      'filter': () => true,
      'done': () => {},
      'debug': false,
      'log': window.console
    }, val);
  }
  get opt() {
    return this._opt;
  }
  get iterator() {
    return new DOMIterator(
      this.ctx,
      this.opt.iframes,
      this.opt.exclude,
      this.opt.iframesTimeout
    );
  }
  log(msg, level = 'debug') {
    const log = this.opt.log;
    if (!this.opt.debug) {
      return;
    }
    if (typeof log === 'object' && typeof log[level] === 'function') {
      log[level](`mark.js: ${msg}`);
    }
  }
  escapeStr(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }
  createRegExp(str) {
    if (this.opt.wildcards !== 'disabled') {
      str = this.setupWildcardsRegExp(str);
    }
    str = this.escapeStr(str);
    if (Object.keys(this.opt.synonyms).length) {
      str = this.createSynonymsRegExp(str);
    }
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.setupIgnoreJoinersRegExp(str);
    }
    if (this.opt.diacritics) {
      str = this.createDiacriticsRegExp(str);
    }
    str = this.createMergedBlanksRegExp(str);
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.createJoinersRegExp(str);
    }
    if (this.opt.wildcards !== 'disabled') {
      str = this.createWildcardsRegExp(str);
    }
    str = this.createAccuracyRegExp(str);
    return str;
  }
  createSynonymsRegExp(str) {
    const syn = this.opt.synonyms,
      sens = this.opt.caseSensitive ? '' : 'i',
      joinerPlaceholder = this.opt.ignoreJoiners ||
                this.opt.ignorePunctuation.length ? '\u0000' : '';
    for (let index in syn) {
      if (syn.hasOwnProperty(index)) {
        const value = syn[index],
          k1 = this.opt.wildcards !== 'disabled' ?
            this.setupWildcardsRegExp(index) :
            this.escapeStr(index),
          k2 = this.opt.wildcards !== 'disabled' ?
            this.setupWildcardsRegExp(value) :
            this.escapeStr(value);
        if (k1 !== '' && k2 !== '') {
          str = str.replace(
            new RegExp(
              `(${this.escapeStr(k1)}|${this.escapeStr(k2)})`,
              `gm${sens}`
            ),
            joinerPlaceholder +
            `(${this.processSynomyms(k1)}|` +
            `${this.processSynomyms(k2)})` +
            joinerPlaceholder
          );
        }
      }
    }
    return str;
  }
  processSynomyms(str) {
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.setupIgnoreJoinersRegExp(str);
    }
    return str;
  }
  setupWildcardsRegExp(str) {
    str = str.replace(/(?:\\)*\?/g, val => {
      return val.charAt(0) === '\\' ? '?' : '\u0001';
    });
    return str.replace(/(?:\\)*\*/g, val => {
      return val.charAt(0) === '\\' ? '*' : '\u0002';
    });
  }
  createWildcardsRegExp(str) {
    let spaces = this.opt.wildcards === 'withSpaces';
    return str
      .replace(/\u0001/g, spaces ? '[\\S\\s]?' : '\\S?')
      .replace(/\u0002/g, spaces ? '[\\S\\s]*?' : '\\S*');
  }
  setupIgnoreJoinersRegExp(str) {
    return str.replace(/[^(|)\\]/g, (val, indx, original) => {
      let nextChar = original.charAt(indx + 1);
      if (/[(|)\\]/.test(nextChar) || nextChar === '') {
        return val;
      } else {
        return val + '\u0000';
      }
    });
  }
  createJoinersRegExp(str) {
    let joiner = [];
    const ignorePunctuation = this.opt.ignorePunctuation;
    if (Array.isArray(ignorePunctuation) && ignorePunctuation.length) {
      joiner.push(this.escapeStr(ignorePunctuation.join('')));
    }
    if (this.opt.ignoreJoiners) {
      joiner.push('\\u00ad\\u200b\\u200c\\u200d');
    }
    return joiner.length ?
      str.split(/\u0000+/).join(`[${joiner.join('')}]*`) :
      str;
  }
  createDiacriticsRegExp(str) {
    const sens = this.opt.caseSensitive ? '' : 'i',
      dct = this.opt.caseSensitive ? [
        'aàáảãạăằắẳẵặâầấẩẫậäåāą', 'AÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ',
        'cçćč', 'CÇĆČ', 'dđď', 'DĐĎ',
        'eèéẻẽẹêềếểễệëěēę', 'EÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ',
        'iìíỉĩịîïī', 'IÌÍỈĨỊÎÏĪ', 'lł', 'LŁ', 'nñňń',
        'NÑŇŃ', 'oòóỏõọôồốổỗộơởỡớờợöøō', 'OÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ',
        'rř', 'RŘ', 'sšśșş', 'SŠŚȘŞ',
        'tťțţ', 'TŤȚŢ', 'uùúủũụưừứửữựûüůū', 'UÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ',
        'yýỳỷỹỵÿ', 'YÝỲỶỸỴŸ', 'zžżź', 'ZŽŻŹ'
      ] : [
        'aàáảãạăằắẳẵặâầấẩẫậäåāąAÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ', 'cçćčCÇĆČ',
        'dđďDĐĎ', 'eèéẻẽẹêềếểễệëěēęEÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ',
        'iìíỉĩịîïīIÌÍỈĨỊÎÏĪ', 'lłLŁ', 'nñňńNÑŇŃ',
        'oòóỏõọôồốổỗộơởỡớờợöøōOÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ', 'rřRŘ',
        'sšśșşSŠŚȘŞ', 'tťțţTŤȚŢ',
        'uùúủũụưừứửữựûüůūUÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ', 'yýỳỷỹỵÿYÝỲỶỸỴŸ', 'zžżźZŽŻŹ'
      ];
    let handled = [];
    str.split('').forEach(ch => {
      dct.every(dct => {
        if (dct.indexOf(ch) !== -1) {
          if (handled.indexOf(dct) > -1) {
            return false;
          }
          str = str.replace(
            new RegExp(`[${dct}]`, `gm${sens}`), `[${dct}]`
          );
          handled.push(dct);
        }
        return true;
      });
    });
    return str;
  }
  createMergedBlanksRegExp(str) {
    return str.replace(/[\s]+/gmi, '[\\s]+');
  }
  createAccuracyRegExp(str) {
    const chars = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¡¿';
    let acc = this.opt.accuracy,
      val = typeof acc === 'string' ? acc : acc.value,
      ls = typeof acc === 'string' ? [] : acc.limiters,
      lsJoin = '';
    ls.forEach(limiter => {
      lsJoin += `|${this.escapeStr(limiter)}`;
    });
    switch (val) {
    case 'partially':
    default:
      return `()(${str})`;
    case 'complementary':
      lsJoin = '\\s' + (lsJoin ? lsJoin : this.escapeStr(chars));
      return `()([^${lsJoin}]*${str}[^${lsJoin}]*)`;
    case 'exactly':
      return `(^|\\s${lsJoin})(${str})(?=$|\\s${lsJoin})`;
    }
  }
  getSeparatedKeywords(sv) {
    let stack = [];
    sv.forEach(kw => {
      if (!this.opt.separateWordSearch) {
        if (kw.trim() && stack.indexOf(kw) === -1) {
          stack.push(kw);
        }
      } else {
        kw.split(' ').forEach(kwSplitted => {
          if (kwSplitted.trim() && stack.indexOf(kwSplitted) === -1) {
            stack.push(kwSplitted);
          }
        });
      }
    });
    return {
      'keywords': stack.sort((a, b) => {
        return b.length - a.length;
      }),
      'length': stack.length
    };
  }
  isNumeric(value) {
    return Number(parseFloat(value)) == value;
  }
  checkRanges(array) {
    if (
      !Array.isArray(array) ||
      Object.prototype.toString.call( array[0] ) !== '[object Object]'
    ) {
      this.log('markRanges() will only accept an array of objects');
      this.opt.noMatch(array);
      return [];
    }
    const stack = [];
    let last = 0;
    array
      .sort((a, b) => {
        return a.start - b.start;
      })
      .forEach(item => {
        let {start, end, valid} = this.callNoMatchOnInvalidRanges(item, last);
        if (valid) {
          item.start = start;
          item.length = end - start;
          stack.push(item);
          last = end;
        }
      });
    return stack;
  }
  callNoMatchOnInvalidRanges(range, last) {
    let start, end,
      valid = false;
    if (range && typeof range.start !== 'undefined') {
      start = parseInt(range.start, 10);
      end = start + parseInt(range.length, 10);
      if (
        this.isNumeric(range.start) &&
        this.isNumeric(range.length) &&
        end - last > 0 &&
        end - start > 0
      ) {
        valid = true;
      } else {
        this.log(
          'Ignoring invalid or overlapping range: ' +
                    `${JSON.stringify(range)}`
        );
        this.opt.noMatch(range);
      }
    } else {
      this.log(`Ignoring invalid range: ${JSON.stringify(range)}`);
      this.opt.noMatch(range);
    }
    return {
      start: start,
      end: end,
      valid: valid
    };
  }
  checkWhitespaceRanges(range, originalLength, string) {
    let end,
      valid = true,
      max = string.length,
      offset = originalLength - max,
      start = parseInt(range.start, 10) - offset;
    start = start > max ? max : start;
    end = start + parseInt(range.length, 10);
    if (end > max) {
      end = max;
      this.log(`End range automatically set to the max value of ${max}`);
    }
    if (start < 0 || end - start < 0 || start > max || end > max) {
      valid = false;
      this.log(`Invalid range: ${JSON.stringify(range)}`);
      this.opt.noMatch(range);
    } else if (string.substring(start, end).replace(/\s+/g, '') === '') {
      valid = false;
      this.log('Skipping whitespace only range: ' +JSON.stringify(range));
      this.opt.noMatch(range);
    }
    return {
      start: start,
      end: end,
      valid: valid
    };
  }
  getTextNodes(cb) {
    let val = '',
      nodes = [];
    this.iterator.forEachNode(NodeFilter.SHOW_TEXT, node => {
      nodes.push({
        start: val.length,
        end: (val += node.textContent).length,
        node
      });
    }, node => {
      if (this.matchesExclude(node.parentNode)) {
        return NodeFilter.FILTER_REJECT;
      } else {
        return NodeFilter.FILTER_ACCEPT;
      }
    }, () => {
      cb({
        value: val,
        nodes: nodes
      });
    });
  }
  matchesExclude(el) {
    return DOMIterator.matches(el, this.opt.exclude.concat([
      'script', 'style', 'title', 'head', 'html'
    ]));
  }
  wrapRangeInTextNode(node, start, end) {
    const hEl = !this.opt.element ? 'mark' : this.opt.element,
      startNode = node.splitText(start),
      ret = startNode.splitText(end - start);
    let repl = document.createElement(hEl);
    repl.setAttribute('data-markjs', 'true');
    if (this.opt.className) {
      repl.setAttribute('class', this.opt.className);
    }
    repl.textContent = startNode.textContent;
    startNode.parentNode.replaceChild(repl, startNode);
    return ret;
  }
  wrapRangeInMappedTextNode(dict, start, end, filterCb, eachCb) {
    dict.nodes.every((n, i) => {
      const sibl = dict.nodes[i + 1];
      if (typeof sibl === 'undefined' || sibl.start > start) {
        if (!filterCb(n.node)) {
          return false;
        }
        const s = start - n.start,
          e = (end > n.end ? n.end : end) - n.start,
          startStr = dict.value.substr(0, n.start),
          endStr = dict.value.substr(e + n.start);
        n.node = this.wrapRangeInTextNode(n.node, s, e);
        dict.value = startStr + endStr;
        dict.nodes.forEach((k, j) => {
          if (j >= i) {
            if (dict.nodes[j].start > 0 && j !== i) {
              dict.nodes[j].start -= e;
            }
            dict.nodes[j].end -= e;
          }
        });
        end -= e;
        eachCb(n.node.previousSibling, n.start);
        if (end > n.end) {
          start = n.end;
        } else {
          return false;
        }
      }
      return true;
    });
  }
  wrapMatches(regex, ignoreGroups, filterCb, eachCb, endCb) {
    const matchIdx = ignoreGroups === 0 ? 0 : ignoreGroups + 1;
    this.getTextNodes(dict => {
      dict.nodes.forEach(node => {
        node = node.node;
        let match;
        while (
          (match = regex.exec(node.textContent)) !== null &&
          match[matchIdx] !== ''
        ) {
          if (!filterCb(match[matchIdx], node)) {
            continue;
          }
          let pos = match.index;
          if (matchIdx !== 0) {
            for (let i = 1; i < matchIdx; i++) {
              pos += match[i].length;
            }
          }
          node = this.wrapRangeInTextNode(
            node,
            pos,
            pos + match[matchIdx].length
          );
          eachCb(node.previousSibling);
          regex.lastIndex = 0;
        }
      });
      endCb();
    });
  }
  wrapMatchesAcrossElements(regex, ignoreGroups, filterCb, eachCb, endCb) {
    const matchIdx = ignoreGroups === 0 ? 0 : ignoreGroups + 1;
    this.getTextNodes(dict => {
      let match;
      while (
        (match = regex.exec(dict.value)) !== null &&
        match[matchIdx] !== ''
      ) {
        let start = match.index;
        if (matchIdx !== 0) {
          for (let i = 1; i < matchIdx; i++) {
            start += match[i].length;
          }
        }
        const end = start + match[matchIdx].length;
        this.wrapRangeInMappedTextNode(dict, start, end, node => {
          return filterCb(match[matchIdx], node);
        }, (node, lastIndex) => {
          regex.lastIndex = lastIndex;
          eachCb(node);
        });
      }
      endCb();
    });
  }
  wrapRangeFromIndex(ranges, filterCb, eachCb, endCb) {
    this.getTextNodes(dict => {
      const originalLength = dict.value.length;
      ranges.forEach((range, counter) => {
        let {start, end, valid} = this.checkWhitespaceRanges(
          range,
          originalLength,
          dict.value
        );
        if (valid) {
          this.wrapRangeInMappedTextNode(dict, start, end, node => {
            return filterCb(
              node,
              range,
              dict.value.substring(start, end),
              counter
            );
          }, node => {
            eachCb(node, range);
          });
        }
      });
      endCb();
    });
  }
  unwrapMatches(node) {
    const parent = node.parentNode;
    let docFrag = document.createDocumentFragment();
    while (node.firstChild) {
      docFrag.appendChild(node.removeChild(node.firstChild));
    }
    parent.replaceChild(docFrag, node);
    if (!this.ie) {
      parent.normalize();
    } else {
      this.normalizeTextNode(parent);
    }
  }
  normalizeTextNode(node) {
    if (!node) {
      return;
    }
    if (node.nodeType === 3) {
      while (node.nextSibling && node.nextSibling.nodeType === 3) {
        node.nodeValue += node.nextSibling.nodeValue;
        node.parentNode.removeChild(node.nextSibling);
      }
    } else {
      this.normalizeTextNode(node.firstChild);
    }
    this.normalizeTextNode(node.nextSibling);
  }
  markRegExp(regexp, opt) {
    this.opt = opt;
    this.log(`Searching with expression "${regexp}"`);
    let totalMatches = 0,
      fn = 'wrapMatches';
    const eachCb = element => {
      totalMatches++;
      this.opt.each(element);
    };
    if (this.opt.acrossElements) {
      fn = 'wrapMatchesAcrossElements';
    }
    this[fn](regexp, this.opt.ignoreGroups, (match, node) => {
      return this.opt.filter(node, match, totalMatches);
    }, eachCb, () => {
      if (totalMatches === 0) {
        this.opt.noMatch(regexp);
      }
      this.opt.done(totalMatches);
    });
  }
  mark(sv, opt) {
    this.opt = opt;
    let totalMatches = 0,
      fn = 'wrapMatches';
    const {
        keywords: kwArr,
        length: kwArrLen
      } = this.getSeparatedKeywords(typeof sv === 'string' ? [sv] : sv),
      sens = this.opt.caseSensitive ? '' : 'i',
      handler = kw => {
        let regex = new RegExp(this.createRegExp(kw), `gm${sens}`),
          matches = 0;
        this.log(`Searching with expression "${regex}"`);
        this[fn](regex, 1, (term, node) => {
          return this.opt.filter(node, kw, totalMatches, matches);
        }, element => {
          matches++;
          totalMatches++;
          this.opt.each(element);
        }, () => {
          if (matches === 0) {
            this.opt.noMatch(kw);
          }
          if (kwArr[kwArrLen - 1] === kw) {
            this.opt.done(totalMatches);
          } else {
            handler(kwArr[kwArr.indexOf(kw) + 1]);
          }
        });
      };
    if (this.opt.acrossElements) {
      fn = 'wrapMatchesAcrossElements';
    }
    if (kwArrLen === 0) {
      this.opt.done(totalMatches);
    } else {
      handler(kwArr[0]);
    }
  }
  markRanges(rawRanges, opt) {
    this.opt = opt;
    let totalMatches = 0,
      ranges = this.checkRanges(rawRanges);
    if (ranges && ranges.length) {
      this.log(
        'Starting to mark with the following ranges: ' +
        JSON.stringify(ranges)
      );
      this.wrapRangeFromIndex(
        ranges, (node, range, match, counter) => {
          return this.opt.filter(node, range, match, counter);
        }, (element, range) => {
          totalMatches++;
          this.opt.each(element, range);
        }, () => {
          this.opt.done(totalMatches);
        }
      );
    } else {
      this.opt.done(totalMatches);
    }
  }
  unmark(opt) {
    this.opt = opt;
    let sel = this.opt.element ? this.opt.element : '*';
    sel += '[data-markjs]';
    if (this.opt.className) {
      sel += `.${this.opt.className}`;
    }
    this.log(`Removal selector "${sel}"`);
    this.iterator.forEachNode(NodeFilter.SHOW_ELEMENT, node => {
      this.unwrapMatches(node);
    }, node => {
      const matchesSel = DOMIterator.matches(node, sel),
        matchesExclude = this.matchesExclude(node);
      if (!matchesSel || matchesExclude) {
        return NodeFilter.FILTER_REJECT;
      } else {
        return NodeFilter.FILTER_ACCEPT;
      }
    }, this.opt.done);
  }
}

$.fn.mark = function(sv, opt) {
  new Mark(this.get()).mark(sv, opt);
  return this;
};
$.fn.markRegExp = function(regexp, opt) {
  new Mark(this.get()).markRegExp(regexp, opt);
  return this;
};
$.fn.markRanges = function(ranges, opt) {
  new Mark(this.get()).markRanges(ranges, opt);
  return this;
};
$.fn.unmark = function(opt) {
  new Mark(this.get()).unmark(opt);
  return this;
};

return $;

})));
