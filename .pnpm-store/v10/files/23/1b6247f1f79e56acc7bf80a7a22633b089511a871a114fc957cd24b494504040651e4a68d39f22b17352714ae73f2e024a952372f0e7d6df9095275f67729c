/**
 * A NodeIterator with iframes support and a method to check if an element is
 * matching a specified selector
 * @example
 * const iterator = new DOMIterator(
 *     document.querySelector("#context"), true
 * );
 * iterator.forEachNode(NodeFilter.SHOW_TEXT, node => {
 *     console.log(node);
 * }, node => {
 *     if(DOMIterator.matches(node.parentNode, ".ignore")){
 *         return NodeFilter.FILTER_REJECT;
 *     } else {
 *         return NodeFilter.FILTER_ACCEPT;
 *     }
 * }, () => {
 *     console.log("DONE");
 * });
 * @todo Outsource into separate repository
 */
export default class DOMIterator {

  /**
   * @param {HTMLElement|HTMLElement[]|NodeList|string} ctx - The context DOM
   * element, an array of DOM elements, a NodeList or a selector
   * @param {boolean} [iframes=true] - A boolean indicating if iframes should
   * be handled
   * @param {string[]} [exclude=[]] - An array containing exclusion selectors
   * for iframes
   * @param {number} [iframesTimeout=5000] - A number indicating the ms to
   * wait before an iframe should be skipped, in case the load event isn't
   * fired. This also applies if the user is offline and the resource of the
   * iframe is online (either by the browsers "offline" mode or because
   * there's no internet connection)
   */
  constructor(ctx, iframes = true, exclude = [], iframesTimeout = 5000) {
    /**
     * The context of the instance. Either a DOM element, an array of DOM
     * elements, a NodeList or a selector
     * @type {HTMLElement|HTMLElement[]|NodeList|string}
     * @access protected
     */
    this.ctx = ctx;
    /**
     * Boolean indicating if iframe support is enabled
     * @type {boolean}
     * @access protected
     */
    this.iframes = iframes;
    /**
     * An array containing exclusion selectors for iframes
     * @type {string[]}
     */
    this.exclude = exclude;
    /**
     * The maximum ms to wait for a load event before skipping an iframe
     * @type {number}
     */
    this.iframesTimeout = iframesTimeout;
  }

  /**
   * Checks if the specified DOM element matches the selector
   * @param  {HTMLElement} element - The DOM element
   * @param  {string|string[]} selector - The selector or an array with
   * selectors
   * @return {boolean}
   * @access public
   */
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
    } else { // may be false e.g. when el is a textNode
      return false;
    }
  }

  /**
   * Returns all contexts filtered by duplicates (even nested)
   * @return {HTMLElement[]} - An array containing DOM contexts
   * @access protected
   */
  getContexts() {
    let ctx,
      filteredCtx = [];
    if (typeof this.ctx === 'undefined' || !this.ctx) { // e.g. null
      ctx = [];
    } else if (NodeList.prototype.isPrototypeOf(this.ctx)) {
      ctx = Array.prototype.slice.call(this.ctx);
    } else if (Array.isArray(this.ctx)) {
      ctx = this.ctx;
    } else if (typeof this.ctx === 'string') {
      ctx = Array.prototype.slice.call(
        document.querySelectorAll(this.ctx)
      );
    } else { // e.g. HTMLElement or element inside iframe
      ctx = [this.ctx];
    }
    // filter duplicate text nodes
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

  /**
   * @callback DOMIterator~getIframeContentsSuccessCallback
   * @param {HTMLDocument} contents - The contentDocument of the iframe
   */
  /**
   * Calls the success callback function with the iframe document. If it can't
   * be accessed it calls the error callback function
   * @param {HTMLElement} ifr - The iframe DOM element
   * @param {DOMIterator~getIframeContentsSuccessCallback} successFn
   * @param {function} [errorFn]
   * @access protected
   */
  getIframeContents(ifr, successFn, errorFn = () => {}) {
    let doc;
    try {
      const ifrWin = ifr.contentWindow;
      doc = ifrWin.document;
      if (!ifrWin || !doc) { // no permission = null. Undefined in Phantom
        throw new Error('iframe inaccessible');
      }
    } catch (e) {
      errorFn();
    }
    if (doc) {
      successFn(doc);
    }
  }

  /**
   * Checks if an iframe is empty (if about:blank is the shown page)
   * @param {HTMLElement} ifr - The iframe DOM element
   * @return {boolean}
   * @access protected
   */
  isIframeBlank(ifr) {
    const bl = 'about:blank',
      src = ifr.getAttribute('src').trim(),
      href = ifr.contentWindow.location.href;
    return href === bl && src !== bl && src;
  }

  /**
   * Observes the onload event of an iframe and calls the success callback or
   * the error callback if the iframe is inaccessible. If the event isn't
   * fired within the specified {@link DOMIterator#iframesTimeout}, then it'll
   * call the error callback too
   * @param {HTMLElement} ifr - The iframe DOM element
   * @param {DOMIterator~getIframeContentsSuccessCallback} successFn
   * @param {function} errorFn
   * @access protected
   */
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
      } catch (e) { // isIframeBlank maybe throws throws an error
        errorFn();
      }
    };
    ifr.addEventListener('load', listener);
    tout = setTimeout(listener, this.iframesTimeout);
  }

  /**
   * Callback when the iframe is ready
   * @callback DOMIterator~onIframeReadySuccessCallback
   * @param {HTMLDocument} contents - The contentDocument of the iframe
   */
  /**
   * Callback if the iframe can't be accessed
   * @callback DOMIterator~onIframeReadyErrorCallback
   */
  /**
   * Calls the callback if the specified iframe is ready for DOM access
   * @param  {HTMLElement} ifr - The iframe DOM element
   * @param  {DOMIterator~onIframeReadySuccessCallback} successFn - Success
   * callback
   * @param {DOMIterator~onIframeReadyErrorCallback} errorFn - Error callback
   * @see {@link http://stackoverflow.com/a/36155560/3894981} for
   * background information
   * @access protected
   */
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
    } catch (e) { // accessing document failed
      errorFn();
    }
  }

  /**
   * Callback when all iframes are ready for DOM access
   * @callback DOMIterator~waitForIframesDoneCallback
   */
  /**
   * Iterates over all iframes and calls the done callback when all of them
   * are ready for DOM access (including nested ones)
   * @param {HTMLElement} ctx - The context DOM element
   * @param {DOMIterator~waitForIframesDoneCallback} done - Done callback
   */
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

  /**
   * Callback allowing to filter an iframe. Must return true when the element
   * should remain, otherwise false
   * @callback DOMIterator~forEachIframeFilterCallback
   * @param {HTMLElement} iframe - The iframe DOM element
   */
  /**
   * Callback for each iframe content
   * @callback DOMIterator~forEachIframeEachCallback
   * @param {HTMLElement} content - The iframe document
   */
  /**
   * Callback if all iframes inside the context were handled
   * @callback DOMIterator~forEachIframeEndCallback
   * @param {number} handled - The number of handled iframes (those who
   * wheren't filtered)
   */
  /**
   * Iterates over all iframes inside the specified context and calls the
   * callbacks when they're ready. Filters iframes based on the instance
   * exclusion selectors
   * @param {HTMLElement} ctx - The context DOM element
   * @param {DOMIterator~forEachIframeFilterCallback} filter - Filter callback
   * @param {DOMIterator~forEachIframeEachCallback} each - Each callback
   * @param {DOMIterator~forEachIframeEndCallback} [end] - End callback
   * @access protected
   */
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

  /**
   * Creates a NodeIterator on the specified context
   * @see {@link https://developer.mozilla.org/en/docs/Web/API/NodeIterator}
   * @param {HTMLElement} ctx - The context DOM element
   * @param {DOMIterator~whatToShow} whatToShow
   * @param {DOMIterator~filterCb} filter
   * @return {NodeIterator}
   * @access protected
   */
  createIterator(ctx, whatToShow, filter) {
    return document.createNodeIterator(ctx, whatToShow, filter, false);
  }

  /**
   * Creates an instance of DOMIterator in an iframe
   * @param {HTMLDocument} contents - Iframe document
   * @return {DOMIterator}
   * @access protected
   */
  createInstanceOnIframe(contents) {
    return new DOMIterator(contents.querySelector('html'), this.iframes);
  }

  /**
   * Checks if an iframe occurs between two nodes, more specifically if an
   * iframe occurs before the specified node and after the specified prevNode
   * @param {HTMLElement} node - The node that should occur after the iframe
   * @param {HTMLElement} prevNode - The node that should occur before the
   * iframe
   * @param {HTMLElement} ifr - The iframe to check against
   * @return {boolean}
   * @access protected
   */
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

  /**
   * @typedef {DOMIterator~getIteratorNodeReturn}
   * @type {object.<string>}
   * @property {HTMLElement} prevNode - The previous node or null if there is
   * no
   * @property {HTMLElement} node - The current node
   */
  /**
   * Returns the previous and current node of the specified iterator
   * @param {NodeIterator} itr - The iterator
   * @return {DOMIterator~getIteratorNodeReturn}
   * @access protected
   */
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

  /**
   * An array containing objects. The object key "val" contains an iframe
   * DOM element. The object key "handled" contains a boolean indicating if
   * the iframe was handled already.
   * It wouldn't be enough to save all open or all already handled iframes.
   * The information of open iframes is necessary because they may occur after
   * all other text nodes (and compareNodeIframe would never be true). The
   * information of already handled iframes is necessary as otherwise they may
   * be handled multiple times
   * @typedef DOMIterator~checkIframeFilterIfr
   * @type {object[]}
   */
  /**
   * Checks if an iframe wasn't handled already and if so, calls
   * {@link DOMIterator#compareNodeIframe} to check if it should be handled.
   * Information wheter an iframe was or wasn't handled is given within the
   * <code>ifr</code> dictionary
   * @param {HTMLElement} node - The node that should occur after the iframe
   * @param {HTMLElement} prevNode - The node that should occur before the
   * iframe
   * @param {HTMLElement} currIfr - The iframe to check
   * @param {DOMIterator~checkIframeFilterIfr} ifr - The iframe dictionary.
   * Will be manipulated (by reference)
   * @return {boolean} Returns true when it should be handled, otherwise false
   * @access protected
   */
  checkIframeFilter(node, prevNode, currIfr, ifr) {
    let key = false, // false === doesn't exist
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

  /**
   * Creates an iterator on all open iframes in the specified array and calls
   * the end callback when finished
   * @param {DOMIterator~checkIframeFilterIfr} ifr
   * @param {DOMIterator~whatToShow} whatToShow
   * @param  {DOMIterator~forEachNodeCallback} eCb - Each callback
   * @param {DOMIterator~filterCb} fCb
   * @access protected
   */
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

  /**
   * Iterates through all nodes in the specified context and handles iframe
   * nodes at the correct position
   * @param {DOMIterator~whatToShow} whatToShow
   * @param {HTMLElement} ctx - The context
   * @param  {DOMIterator~forEachNodeCallback} eachCb - Each callback
   * @param {DOMIterator~filterCb} filterCb - Filter callback
   * @param {DOMIterator~forEachNodeEndCallback} doneCb - End callback
   * @access protected
   */
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
          // note that ifr will be manipulated here
          return this.checkIframeFilter(node, prevNode, currIfr, ifr);
        }, con => {
          this.createInstanceOnIframe(con).forEachNode(
            whatToShow, ifrNode => elements.push(ifrNode), filterCb
          );
        });
      }
      // it's faster to call the each callback in an array loop
      // than in this while loop
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

  /**
   * Callback for each node
   * @callback DOMIterator~forEachNodeCallback
   * @param {HTMLElement} node - The DOM text node element
   */
  /**
   * Callback if all contexts were handled
   * @callback DOMIterator~forEachNodeEndCallback
   */
  /**
   * Iterates over all contexts and initializes
   * {@link DOMIterator#iterateThroughNodes iterateThroughNodes} on them
   * @param {DOMIterator~whatToShow} whatToShow
   * @param  {DOMIterator~forEachNodeCallback} each - Each callback
   * @param {DOMIterator~filterCb} filter - Filter callback
   * @param {DOMIterator~forEachNodeEndCallback} done - End callback
   * @access public
   */
  forEachNode(whatToShow, each, filter, done = () => {}) {
    const contexts = this.getContexts();
    let open = contexts.length;
    if (!open) {
      done();
    }
    contexts.forEach(ctx => {
      const ready = () => {
        this.iterateThroughNodes(whatToShow, ctx, each, filter, () => {
          if (--open <= 0) { // call end all contexts were handled
            done();
          }
        });
      };
      // wait for iframes to avoid recursive calls, otherwise this would
      // perhaps reach the recursive function call limit with many nodes
      if (this.iframes) {
        this.waitForIframes(ctx, ready);
      } else {
        ready();
      }
    });
  }

  /**
   * Callback to filter nodes. Can return e.g. NodeFilter.FILTER_ACCEPT or
   * NodeFilter.FILTER_REJECT
   * @see {@link http://tinyurl.com/zdczmm2}
   * @callback DOMIterator~filterCb
   * @param {HTMLElement} node - The node to filter
   */
  /**
   * @typedef DOMIterator~whatToShow
   * @see {@link http://tinyurl.com/zfqqkx2}
   * @type {number}
   */
}
