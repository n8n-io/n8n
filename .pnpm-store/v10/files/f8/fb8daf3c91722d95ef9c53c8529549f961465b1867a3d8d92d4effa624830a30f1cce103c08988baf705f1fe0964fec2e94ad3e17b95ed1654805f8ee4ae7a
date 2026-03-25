(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vue'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['vue-resize'] = {}, global.vue));
}(this, (function (exports, vue) { 'use strict';

  function getInternetExplorerVersion() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');

    if (msie > 0) {
      // IE 10 or older => return version number
      return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');

    if (trident > 0) {
      // IE 11 => return version number
      var rv = ua.indexOf('rv:');
      return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');

    if (edge > 0) {
      // Edge (IE 12+) => return version number
      return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    } // other browser


    return -1;
  }

  let isIE;

  function initCompat () {
    if (!initCompat.init) {
      initCompat.init = true;
      isIE = getInternetExplorerVersion() !== -1;
    }
  }

  var script = {
    name: 'ResizeObserver',

    props: {
      emitOnMount: {
        type: Boolean,
        default: false,
      },

      ignoreWidth: {
        type: Boolean,
        default: false,
      },

      ignoreHeight: {
        type: Boolean,
        default: false,
      },
    },

    emits: [
      'notify',
    ],

    mounted () {
      initCompat();
      vue.nextTick(() => {
        this._w = this.$el.offsetWidth;
        this._h = this.$el.offsetHeight;
        if (this.emitOnMount) {
          this.emitSize();
        }
      });
      const object = document.createElement('object');
      this._resizeObject = object;
      object.setAttribute('aria-hidden', 'true');
      object.setAttribute('tabindex', -1);
      object.onload = this.addResizeHandlers;
      object.type = 'text/html';
      if (isIE) {
        this.$el.appendChild(object);
      }
      object.data = 'about:blank';
      if (!isIE) {
        this.$el.appendChild(object);
      }
    },

    beforeUnmount () {
      this.removeResizeHandlers();
    },

    methods: {
      compareAndNotify () {
        if ((!this.ignoreWidth && this._w !== this.$el.offsetWidth) || (!this.ignoreHeight && this._h !== this.$el.offsetHeight)) {
          this._w = this.$el.offsetWidth;
          this._h = this.$el.offsetHeight;
          this.emitSize();
        }
      },

      emitSize () {
        this.$emit('notify', {
          width: this._w,
          height: this._h,
        });
      },

      addResizeHandlers () {
        this._resizeObject.contentDocument.defaultView.addEventListener('resize', this.compareAndNotify);
        this.compareAndNotify();
      },

      removeResizeHandlers () {
        if (this._resizeObject && this._resizeObject.onload) {
          if (!isIE && this._resizeObject.contentDocument) {
            this._resizeObject.contentDocument.defaultView.removeEventListener('resize', this.compareAndNotify);
          }
          this.$el.removeChild(this._resizeObject);
          this._resizeObject.onload = null;
          this._resizeObject = null;
        }
      },
    },
  };

  const _withId = /*#__PURE__*/vue.withScopeId("data-v-b329ee4c");

  vue.pushScopeId("data-v-b329ee4c");
  const _hoisted_1 = {
    class: "resize-observer",
    tabindex: "-1"
  };
  vue.popScopeId();

  const render = /*#__PURE__*/_withId((_ctx, _cache, $props, $setup, $data, $options) => {
    return (vue.openBlock(), vue.createBlock("div", _hoisted_1))
  });

  script.render = render;
  script.__scopeId = "data-v-b329ee4c";
  script.__file = "src/components/ResizeObserver.vue";

  function install(app) {
    // eslint-disable-next-line vue/component-definition-name-casing
    app.component('resize-observer', script);
    app.component('ResizeObserver', script);
  }

  var plugin = {
    // eslint-disable-next-line no-undef
    version: "2.0.0-alpha.1",
    install: install
  };

  exports.ResizeObserver = script;
  exports.default = plugin;
  exports.install = install;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vue-resize.umd.js.map
