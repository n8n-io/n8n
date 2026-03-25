(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@floating-ui/dom'), require('@floating-ui/utils/dom'), require('vue-demi')) :
  typeof define === 'function' && define.amd ? define(['exports', '@floating-ui/dom', '@floating-ui/utils/dom', 'vue-demi'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.FloatingUIVue = {}, global.FloatingUIDOM, global.FloatingUIUtilsDOM, global.VueDemi));
})(this, (function (exports, dom, dom$1, vueDemi) { 'use strict';

  function isComponentPublicInstance(target) {
    return target != null && typeof target === 'object' && '$el' in target;
  }
  function unwrapElement(target) {
    if (isComponentPublicInstance(target)) {
      const element = target.$el;
      return dom$1.isNode(element) && dom$1.getNodeName(element) === '#comment' ? null : element;
    }
    return target;
  }

  function toValue(source) {
    return typeof source === 'function' ? source() : vueDemi.unref(source);
  }

  /**
   * Positions an inner element of the floating element such that it is centered to the reference element.
   * @param options The arrow options.
   * @see https://floating-ui.com/docs/arrow
   */
  function arrow(options) {
    return {
      name: 'arrow',
      options,
      fn(args) {
        const element = unwrapElement(toValue(options.element));
        if (element == null) {
          return {};
        }
        return dom.arrow({
          element,
          padding: options.padding
        }).fn(args);
      }
    };
  }

  function getDPR(element) {
    if (typeof window === 'undefined') {
      return 1;
    }
    const win = element.ownerDocument.defaultView || window;
    return win.devicePixelRatio || 1;
  }

  function roundByDPR(element, value) {
    const dpr = getDPR(element);
    return Math.round(value * dpr) / dpr;
  }

  /**
   * Computes the `x` and `y` coordinates that will place the floating element next to a reference element when it is given a certain CSS positioning strategy.
   * @param reference The reference template ref.
   * @param floating The floating template ref.
   * @param options The floating options.
   * @see https://floating-ui.com/docs/vue
   */
  function useFloating(reference, floating, options) {
    if (options === void 0) {
      options = {};
    }
    const whileElementsMountedOption = options.whileElementsMounted;
    const openOption = vueDemi.computed(() => {
      var _toValue;
      return (_toValue = toValue(options.open)) != null ? _toValue : true;
    });
    const middlewareOption = vueDemi.computed(() => toValue(options.middleware));
    const placementOption = vueDemi.computed(() => {
      var _toValue2;
      return (_toValue2 = toValue(options.placement)) != null ? _toValue2 : 'bottom';
    });
    const strategyOption = vueDemi.computed(() => {
      var _toValue3;
      return (_toValue3 = toValue(options.strategy)) != null ? _toValue3 : 'absolute';
    });
    const transformOption = vueDemi.computed(() => {
      var _toValue4;
      return (_toValue4 = toValue(options.transform)) != null ? _toValue4 : true;
    });
    const referenceElement = vueDemi.computed(() => unwrapElement(reference.value));
    const floatingElement = vueDemi.computed(() => unwrapElement(floating.value));
    const x = vueDemi.ref(0);
    const y = vueDemi.ref(0);
    const strategy = vueDemi.ref(strategyOption.value);
    const placement = vueDemi.ref(placementOption.value);
    const middlewareData = vueDemi.shallowRef({});
    const isPositioned = vueDemi.ref(false);
    const floatingStyles = vueDemi.computed(() => {
      const initialStyles = {
        position: strategy.value,
        left: '0',
        top: '0'
      };
      if (!floatingElement.value) {
        return initialStyles;
      }
      const xVal = roundByDPR(floatingElement.value, x.value);
      const yVal = roundByDPR(floatingElement.value, y.value);
      if (transformOption.value) {
        return {
          ...initialStyles,
          transform: "translate(" + xVal + "px, " + yVal + "px)",
          ...(getDPR(floatingElement.value) >= 1.5 && {
            willChange: 'transform'
          })
        };
      }
      return {
        position: strategy.value,
        left: xVal + "px",
        top: yVal + "px"
      };
    });
    let whileElementsMountedCleanup;
    function update() {
      if (referenceElement.value == null || floatingElement.value == null) {
        return;
      }
      const open = openOption.value;
      dom.computePosition(referenceElement.value, floatingElement.value, {
        middleware: middlewareOption.value,
        placement: placementOption.value,
        strategy: strategyOption.value
      }).then(position => {
        x.value = position.x;
        y.value = position.y;
        strategy.value = position.strategy;
        placement.value = position.placement;
        middlewareData.value = position.middlewareData;
        /**
         * The floating element's position may be recomputed while it's closed
         * but still mounted (such as when transitioning out). To ensure
         * `isPositioned` will be `false` initially on the next open, avoid
         * setting it to `true` when `open === false` (must be specified).
         */
        isPositioned.value = open !== false;
      });
    }
    function cleanup() {
      if (typeof whileElementsMountedCleanup === 'function') {
        whileElementsMountedCleanup();
        whileElementsMountedCleanup = undefined;
      }
    }
    function attach() {
      cleanup();
      if (whileElementsMountedOption === undefined) {
        update();
        return;
      }
      if (referenceElement.value != null && floatingElement.value != null) {
        whileElementsMountedCleanup = whileElementsMountedOption(referenceElement.value, floatingElement.value, update);
        return;
      }
    }
    function reset() {
      if (!openOption.value) {
        isPositioned.value = false;
      }
    }
    vueDemi.watch([middlewareOption, placementOption, strategyOption, openOption], update, {
      flush: 'sync'
    });
    vueDemi.watch([referenceElement, floatingElement], attach, {
      flush: 'sync'
    });
    vueDemi.watch(openOption, reset, {
      flush: 'sync'
    });
    if (vueDemi.getCurrentScope()) {
      vueDemi.onScopeDispose(cleanup);
    }
    return {
      x: vueDemi.shallowReadonly(x),
      y: vueDemi.shallowReadonly(y),
      strategy: vueDemi.shallowReadonly(strategy),
      placement: vueDemi.shallowReadonly(placement),
      middlewareData: vueDemi.shallowReadonly(middlewareData),
      isPositioned: vueDemi.shallowReadonly(isPositioned),
      floatingStyles,
      update
    };
  }

  Object.defineProperty(exports, "autoPlacement", {
    enumerable: true,
    get: function () { return dom.autoPlacement; }
  });
  Object.defineProperty(exports, "autoUpdate", {
    enumerable: true,
    get: function () { return dom.autoUpdate; }
  });
  Object.defineProperty(exports, "computePosition", {
    enumerable: true,
    get: function () { return dom.computePosition; }
  });
  Object.defineProperty(exports, "detectOverflow", {
    enumerable: true,
    get: function () { return dom.detectOverflow; }
  });
  Object.defineProperty(exports, "flip", {
    enumerable: true,
    get: function () { return dom.flip; }
  });
  Object.defineProperty(exports, "getOverflowAncestors", {
    enumerable: true,
    get: function () { return dom.getOverflowAncestors; }
  });
  Object.defineProperty(exports, "hide", {
    enumerable: true,
    get: function () { return dom.hide; }
  });
  Object.defineProperty(exports, "inline", {
    enumerable: true,
    get: function () { return dom.inline; }
  });
  Object.defineProperty(exports, "limitShift", {
    enumerable: true,
    get: function () { return dom.limitShift; }
  });
  Object.defineProperty(exports, "offset", {
    enumerable: true,
    get: function () { return dom.offset; }
  });
  Object.defineProperty(exports, "platform", {
    enumerable: true,
    get: function () { return dom.platform; }
  });
  Object.defineProperty(exports, "shift", {
    enumerable: true,
    get: function () { return dom.shift; }
  });
  Object.defineProperty(exports, "size", {
    enumerable: true,
    get: function () { return dom.size; }
  });
  exports.arrow = arrow;
  exports.useFloating = useFloating;

}));
