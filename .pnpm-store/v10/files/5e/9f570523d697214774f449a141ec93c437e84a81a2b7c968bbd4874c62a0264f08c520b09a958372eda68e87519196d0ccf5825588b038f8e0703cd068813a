import { markRaw, shallowReactive, resolveComponent, resolveDirective, withDirectives, openBlock, createElementBlock, normalizeClass, renderSlot, createCommentVNode, createBlock, resolveDynamicComponent, normalizeStyle, withCtx, Fragment, renderList, mergeProps, toHandlers, createVNode, normalizeProps, guardReactiveProps, h, reactive } from 'vue';
import { ResizeObserver as ResizeObserver$1 } from 'vue-resize';
import { ObserveVisibility } from 'vue-observe-visibility';
import mitt from 'mitt';

var config = {
  itemsLimit: 1000
};

// Fork of https://github.com/olahol/scrollparent.js to be able to build with Rollup

var regex = /(auto|scroll)/;
function parents(node, ps) {
  if (node.parentNode === null) {
    return ps;
  }
  return parents(node.parentNode, ps.concat([node]));
}
var style = function style(node, prop) {
  return getComputedStyle(node, null).getPropertyValue(prop);
};
var overflow = function overflow(node) {
  return style(node, 'overflow') + style(node, 'overflow-y') + style(node, 'overflow-x');
};
var scroll = function scroll(node) {
  return regex.test(overflow(node));
};
function getScrollParent(node) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return;
  }
  var ps = parents(node.parentNode, []);
  for (var i = 0; i < ps.length; i += 1) {
    if (scroll(ps[i])) {
      return ps[i];
    }
  }
  return document.scrollingElement || document.documentElement;
}

function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}

var props = {
  items: {
    type: Array,
    required: true
  },
  keyField: {
    type: String,
    default: 'id'
  },
  direction: {
    type: String,
    default: 'vertical',
    validator: function validator(value) {
      return ['vertical', 'horizontal'].includes(value);
    }
  },
  listTag: {
    type: String,
    default: 'div'
  },
  itemTag: {
    type: String,
    default: 'div'
  }
};
function simpleArray() {
  return this.items.length && _typeof(this.items[0]) !== 'object';
}

var supportsPassive = false;
if (typeof window !== 'undefined') {
  supportsPassive = false;
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function get() {
        supportsPassive = true;
      }
    });
    window.addEventListener('test', null, opts);
  } catch (e) {}
}

let uid = 0;

var script$2 = {
  name: 'RecycleScroller',

  components: {
    ResizeObserver: ResizeObserver$1,
  },

  directives: {
    ObserveVisibility,
  },

  props: {
    ...props,

    itemSize: {
      type: Number,
      default: null,
    },

    gridItems: {
      type: Number,
      default: undefined,
    },

    itemSecondarySize: {
      type: Number,
      default: undefined,
    },

    minItemSize: {
      type: [Number, String],
      default: null,
    },

    sizeField: {
      type: String,
      default: 'size',
    },

    typeField: {
      type: String,
      default: 'type',
    },

    buffer: {
      type: Number,
      default: 200,
    },

    pageMode: {
      type: Boolean,
      default: false,
    },

    prerender: {
      type: Number,
      default: 0,
    },

    emitUpdate: {
      type: Boolean,
      default: false,
    },

    updateInterval: {
      type: Number,
      default: 0,
    },

    skipHover: {
      type: Boolean,
      default: false,
    },

    listTag: {
      type: String,
      default: 'div',
    },

    itemTag: {
      type: String,
      default: 'div',
    },

    listClass: {
      type: [String, Object, Array],
      default: '',
    },

    itemClass: {
      type: [String, Object, Array],
      default: '',
    },
  },

  emits: [
    'resize',
    'visible',
    'hidden',
    'update',
    'scroll-start',
    'scroll-end',
  ],

  data () {
    return {
      pool: [],
      totalSize: 0,
      ready: false,
      hoverKey: null,
    }
  },

  computed: {
    sizes () {
      if (this.itemSize === null) {
        const sizes = {
          '-1': { accumulator: 0 },
        };
        const items = this.items;
        const field = this.sizeField;
        const minItemSize = this.minItemSize;
        let computedMinSize = 10000;
        let accumulator = 0;
        let current;
        for (let i = 0, l = items.length; i < l; i++) {
          current = items[i][field] || minItemSize;
          if (current < computedMinSize) {
            computedMinSize = current;
          }
          accumulator += current;
          sizes[i] = { accumulator, size: current };
        }
        // eslint-disable-next-line
        this.$_computedMinItemSize = computedMinSize;
        return sizes
      }
      return []
    },

    simpleArray,

    itemIndexByKey () {
      const { keyField, items } = this;
      const result = {};
      for (let i = 0, l = items.length; i < l; i++) {
        result[items[i][keyField]] = i;
      }
      return result
    },
  },

  watch: {
    items () {
      this.updateVisibleItems(true);
    },

    pageMode () {
      this.applyPageMode();
      this.updateVisibleItems(false);
    },

    sizes: {
      handler () {
        this.updateVisibleItems(false);
      },
      deep: true,
    },

    gridItems () {
      this.updateVisibleItems(true);
    },

    itemSecondarySize () {
      this.updateVisibleItems(true);
    },
  },

  created () {
    this.$_startIndex = 0;
    this.$_endIndex = 0;
    this.$_views = new Map();
    this.$_unusedViews = new Map();
    this.$_scrollDirty = false;
    this.$_lastUpdateScrollPosition = 0;

    // In SSR mode, we also prerender the same number of item for the first render
    // to avoir mismatch between server and client templates
    if (this.prerender) {
      this.$_prerender = true;
      this.updateVisibleItems(false);
    }

    if (this.gridItems && !this.itemSize) {
      console.error('[vue-recycle-scroller] You must provide an itemSize when using gridItems');
    }
  },

  mounted () {
    this.applyPageMode();
    this.$nextTick(() => {
      // In SSR mode, render the real number of visible items
      this.$_prerender = false;
      this.updateVisibleItems(true);
      this.ready = true;
    });
  },

  activated () {
    const lastPosition = this.$_lastUpdateScrollPosition;
    if (typeof lastPosition === 'number') {
      this.$nextTick(() => {
        this.scrollToPosition(lastPosition);
      });
    }
  },

  beforeUnmount () {
    this.removeListeners();
  },

  methods: {
    addView (pool, index, item, key, type) {
      const nr = markRaw({
        id: uid++,
        index,
        used: true,
        key,
        type,
      });
      const view = shallowReactive({
        item,
        position: 0,
        nr,
      });
      pool.push(view);
      return view
    },

    unuseView (view, fake = false) {
      const unusedViews = this.$_unusedViews;
      const type = view.nr.type;
      let unusedPool = unusedViews.get(type);
      if (!unusedPool) {
        unusedPool = [];
        unusedViews.set(type, unusedPool);
      }
      unusedPool.push(view);
      if (!fake) {
        view.nr.used = false;
        view.position = -9999;
      }
    },

    handleResize () {
      this.$emit('resize');
      if (this.ready) this.updateVisibleItems(false);
    },

    handleScroll (event) {
      if (!this.$_scrollDirty) {
        this.$_scrollDirty = true;
        if (this.$_updateTimeout) return

        const requestUpdate = () => requestAnimationFrame(() => {
          this.$_scrollDirty = false;
          const { continuous } = this.updateVisibleItems(false, true);

          // It seems sometimes chrome doesn't fire scroll event :/
          // When non continous scrolling is ending, we force a refresh
          if (!continuous) {
            clearTimeout(this.$_refreshTimout);
            this.$_refreshTimout = setTimeout(this.handleScroll, this.updateInterval + 100);
          }
        });

        requestUpdate();

        // Schedule the next update with throttling
        if (this.updateInterval) {
          this.$_updateTimeout = setTimeout(() => {
            this.$_updateTimeout = 0;
            if (this.$_scrollDirty) requestUpdate();
          }, this.updateInterval);
        }
      }
    },

    handleVisibilityChange (isVisible, entry) {
      if (this.ready) {
        if (isVisible || entry.boundingClientRect.width !== 0 || entry.boundingClientRect.height !== 0) {
          this.$emit('visible');
          requestAnimationFrame(() => {
            this.updateVisibleItems(false);
          });
        } else {
          this.$emit('hidden');
        }
      }
    },

    updateVisibleItems (checkItem, checkPositionDiff = false) {
      const itemSize = this.itemSize;
      const gridItems = this.gridItems || 1;
      const itemSecondarySize = this.itemSecondarySize || itemSize;
      const minItemSize = this.$_computedMinItemSize;
      const typeField = this.typeField;
      const keyField = this.simpleArray ? null : this.keyField;
      const items = this.items;
      const count = items.length;
      const sizes = this.sizes;
      const views = this.$_views;
      const unusedViews = this.$_unusedViews;
      const pool = this.pool;
      const itemIndexByKey = this.itemIndexByKey;
      let startIndex, endIndex;
      let totalSize;
      let visibleStartIndex, visibleEndIndex;

      if (!count) {
        startIndex = endIndex = visibleStartIndex = visibleEndIndex = totalSize = 0;
      } else if (this.$_prerender) {
        startIndex = visibleStartIndex = 0;
        endIndex = visibleEndIndex = Math.min(this.prerender, items.length);
        totalSize = null;
      } else {
        const scroll = this.getScroll();

        // Skip update if use hasn't scrolled enough
        if (checkPositionDiff) {
          let positionDiff = scroll.start - this.$_lastUpdateScrollPosition;
          if (positionDiff < 0) positionDiff = -positionDiff;
          if ((itemSize === null && positionDiff < minItemSize) || positionDiff < itemSize) {
            return {
              continuous: true,
            }
          }
        }
        this.$_lastUpdateScrollPosition = scroll.start;

        const buffer = this.buffer;
        scroll.start -= buffer;
        scroll.end += buffer;

        // account for leading slot
        let beforeSize = 0;
        if (this.$refs.before) {
          beforeSize = this.$refs.before.scrollHeight;
          scroll.start -= beforeSize;
        }

        // account for trailing slot
        if (this.$refs.after) {
          const afterSize = this.$refs.after.scrollHeight;
          scroll.end += afterSize;
        }

        // Variable size mode
        if (itemSize === null) {
          let h;
          let a = 0;
          let b = count - 1;
          let i = ~~(count / 2);
          let oldI;

          // Searching for startIndex
          do {
            oldI = i;
            h = sizes[i].accumulator;
            if (h < scroll.start) {
              a = i;
            } else if (i < count - 1 && sizes[i + 1].accumulator > scroll.start) {
              b = i;
            }
            i = ~~((a + b) / 2);
          } while (i !== oldI)
          i < 0 && (i = 0);
          startIndex = i;

          // For container style
          totalSize = sizes[count - 1].accumulator;

          // Searching for endIndex
          for (endIndex = i; endIndex < count && sizes[endIndex].accumulator < scroll.end; endIndex++);
          if (endIndex === -1) {
            endIndex = items.length - 1;
          } else {
            endIndex++;
            // Bounds
            endIndex > count && (endIndex = count);
          }

          // search visible startIndex
          for (visibleStartIndex = startIndex; visibleStartIndex < count && (beforeSize + sizes[visibleStartIndex].accumulator) < scroll.start; visibleStartIndex++);

          // search visible endIndex
          for (visibleEndIndex = visibleStartIndex; visibleEndIndex < count && (beforeSize + sizes[visibleEndIndex].accumulator) < scroll.end; visibleEndIndex++);
        } else {
          // Fixed size mode
          startIndex = ~~(scroll.start / itemSize * gridItems);
          const remainer = startIndex % gridItems;
          startIndex -= remainer;
          endIndex = Math.ceil(scroll.end / itemSize * gridItems);
          visibleStartIndex = Math.max(0, Math.floor((scroll.start - beforeSize) / itemSize * gridItems));
          visibleEndIndex = Math.floor((scroll.end - beforeSize) / itemSize * gridItems);

          // Bounds
          startIndex < 0 && (startIndex = 0);
          endIndex > count && (endIndex = count);
          visibleStartIndex < 0 && (visibleStartIndex = 0);
          visibleEndIndex > count && (visibleEndIndex = count);

          totalSize = Math.ceil(count / gridItems) * itemSize;
        }
      }

      if (endIndex - startIndex > config.itemsLimit) {
        this.itemsLimitError();
      }

      this.totalSize = totalSize;

      let view;

      const continuous = startIndex <= this.$_endIndex && endIndex >= this.$_startIndex;

      // Unuse views that are no longer visible
      if (continuous) {
        for (let i = 0, l = pool.length; i < l; i++) {
          view = pool[i];
          if (view.nr.used) {
            // Update view item index
            if (checkItem) {
              view.nr.index = itemIndexByKey[view.item[keyField]];
            }

            // Check if index is still in visible range
            if (
              view.nr.index == null ||
              view.nr.index < startIndex ||
              view.nr.index >= endIndex
            ) {
              this.unuseView(view);
            }
          }
        }
      }

      const unusedIndex = continuous ? null : new Map();

      let item, type;
      let v;
      for (let i = startIndex; i < endIndex; i++) {
        item = items[i];
        const key = keyField ? item[keyField] : item;
        if (key == null) {
          throw new Error(`Key is ${key} on item (keyField is '${keyField}')`)
        }
        view = views.get(key);

        if (!itemSize && !sizes[i].size) {
          if (view) this.unuseView(view);
          continue
        }

        type = item[typeField];

        let unusedPool = unusedViews.get(type);
        let newlyUsedView = false;

        // No view assigned to item
        if (!view) {
          if (continuous) {
            // Reuse existing view
            if (unusedPool && unusedPool.length) {
              view = unusedPool.pop();
            } else {
              view = this.addView(pool, i, item, key, type);
            }
          } else {
            // Use existing view
            // We don't care if they are already used
            // because we are not in continous scrolling
            v = unusedIndex.get(type) || 0;

            if (!unusedPool || v >= unusedPool.length) {
              view = this.addView(pool, i, item, key, type);
              this.unuseView(view, true);
              unusedPool = unusedViews.get(type);
            }

            view = unusedPool[v];
            unusedIndex.set(type, v + 1);
          }

          // Assign view to item
          views.delete(view.nr.key);
          view.nr.used = true;
          view.nr.index = i;
          view.nr.key = key;
          view.nr.type = type;
          views.set(key, view);

          newlyUsedView = true;
        } else {
          // View already assigned to item
          if (!view.nr.used) {
            view.nr.used = true;
            newlyUsedView = true;
            if (unusedPool) {
              const index = unusedPool.indexOf(view);
              if (index !== -1) unusedPool.splice(index, 1);
            }
          }
        }

        // Always set item in case it's a new object with the same key
        view.item = item;

        if (newlyUsedView) {
          if (i === items.length - 1) this.$emit('scroll-end');
          if (i === 0) this.$emit('scroll-start');
        }

        // Update position
        if (itemSize === null) {
          view.position = sizes[i - 1].accumulator;
          view.offset = 0;
        } else {
          view.position = Math.floor(i / gridItems) * itemSize;
          view.offset = (i % gridItems) * itemSecondarySize;
        }
      }

      this.$_startIndex = startIndex;
      this.$_endIndex = endIndex;

      if (this.emitUpdate) this.$emit('update', startIndex, endIndex, visibleStartIndex, visibleEndIndex);

      // After the user has finished scrolling
      // Sort views so text selection is correct
      clearTimeout(this.$_sortTimer);
      this.$_sortTimer = setTimeout(this.sortViews, this.updateInterval + 300);

      return {
        continuous,
      }
    },

    getListenerTarget () {
      let target = getScrollParent(this.$el);
      // Fix global scroll target for Chrome and Safari
      if (window.document && (target === window.document.documentElement || target === window.document.body)) {
        target = window;
      }
      return target
    },

    getScroll () {
      const { $el: el, direction } = this;
      const isVertical = direction === 'vertical';
      let scrollState;

      if (this.pageMode) {
        const bounds = el.getBoundingClientRect();
        const boundsSize = isVertical ? bounds.height : bounds.width;
        let start = -(isVertical ? bounds.top : bounds.left);
        let size = isVertical ? window.innerHeight : window.innerWidth;
        if (start < 0) {
          size += start;
          start = 0;
        }
        if (start + size > boundsSize) {
          size = boundsSize - start;
        }
        scrollState = {
          start,
          end: start + size,
        };
      } else if (isVertical) {
        scrollState = {
          start: el.scrollTop,
          end: el.scrollTop + el.clientHeight,
        };
      } else {
        scrollState = {
          start: el.scrollLeft,
          end: el.scrollLeft + el.clientWidth,
        };
      }

      return scrollState
    },

    applyPageMode () {
      if (this.pageMode) {
        this.addListeners();
      } else {
        this.removeListeners();
      }
    },

    addListeners () {
      this.listenerTarget = this.getListenerTarget();
      this.listenerTarget.addEventListener('scroll', this.handleScroll, supportsPassive
        ? {
            passive: true,
          }
        : false);
      this.listenerTarget.addEventListener('resize', this.handleResize);
    },

    removeListeners () {
      if (!this.listenerTarget) {
        return
      }

      this.listenerTarget.removeEventListener('scroll', this.handleScroll);
      this.listenerTarget.removeEventListener('resize', this.handleResize);

      this.listenerTarget = null;
    },

    scrollToItem (index) {
      let scroll;
      const gridItems = this.gridItems || 1;
      if (this.itemSize === null) {
        scroll = index > 0 ? this.sizes[index - 1].accumulator : 0;
      } else {
        scroll = Math.floor(index / gridItems) * this.itemSize;
      }
      this.scrollToPosition(scroll);
    },

    scrollToPosition (position) {
      const direction = this.direction === 'vertical'
        ? { scroll: 'scrollTop', start: 'top' }
        : { scroll: 'scrollLeft', start: 'left' };

      let viewport;
      let scrollDirection;
      let scrollDistance;

      if (this.pageMode) {
        const viewportEl = getScrollParent(this.$el);
        // HTML doesn't overflow like other elements
        const scrollTop = viewportEl.tagName === 'HTML' ? 0 : viewportEl[direction.scroll];
        const bounds = viewportEl.getBoundingClientRect();

        const scroller = this.$el.getBoundingClientRect();
        const scrollerPosition = scroller[direction.start] - bounds[direction.start];

        viewport = viewportEl;
        scrollDirection = direction.scroll;
        scrollDistance = position + scrollTop + scrollerPosition;
      } else {
        viewport = this.$el;
        scrollDirection = direction.scroll;
        scrollDistance = position;
      }

      viewport[scrollDirection] = scrollDistance;
    },

    itemsLimitError () {
      setTimeout(() => {
        console.log('It seems the scroller element isn\'t scrolling, so it tries to render all the items at once.', 'Scroller:', this.$el);
        console.log('Make sure the scroller has a fixed height (or width) and \'overflow-y\' (or \'overflow-x\') set to \'auto\' so it can scroll correctly and only render the items visible in the scroll viewport.');
      });
      throw new Error('Rendered items limit reached')
    },

    sortViews () {
      this.pool.sort((viewA, viewB) => viewA.nr.index - viewB.nr.index);
    },
  },
};

const _hoisted_1 = {
  key: 0,
  ref: "before",
  class: "vue-recycle-scroller__slot"
};
const _hoisted_2 = {
  key: 1,
  ref: "after",
  class: "vue-recycle-scroller__slot"
};

function render$1(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_ResizeObserver = resolveComponent("ResizeObserver");
  const _directive_observe_visibility = resolveDirective("observe-visibility");

  return withDirectives((openBlock(), createElementBlock("div", {
    class: normalizeClass(["vue-recycle-scroller", {
      ready: $data.ready,
      'page-mode': $props.pageMode,
      [`direction-${_ctx.direction}`]: true,
    }]),
    onScrollPassive: _cache[0] || (_cache[0] = (...args) => ($options.handleScroll && $options.handleScroll(...args)))
  }, [
    (_ctx.$slots.before)
      ? (openBlock(), createElementBlock("div", _hoisted_1, [
          renderSlot(_ctx.$slots, "before")
        ], 512 /* NEED_PATCH */))
      : createCommentVNode("v-if", true),
    (openBlock(), createBlock(resolveDynamicComponent($props.listTag), {
      ref: "wrapper",
      style: normalizeStyle({ [_ctx.direction === 'vertical' ? 'minHeight' : 'minWidth']: $data.totalSize + 'px' }),
      class: normalizeClass(["vue-recycle-scroller__item-wrapper", $props.listClass])
    }, {
      default: withCtx(() => [
        (openBlock(true), createElementBlock(Fragment, null, renderList($data.pool, (view) => {
          return (openBlock(), createBlock(resolveDynamicComponent($props.itemTag), mergeProps({
            key: view.nr.id,
            style: $data.ready ? {
          transform: `translate${_ctx.direction === 'vertical' ? 'Y' : 'X'}(${view.position}px) translate${_ctx.direction === 'vertical' ? 'X' : 'Y'}(${view.offset}px)`,
          width: $props.gridItems ? `${_ctx.direction === 'vertical' ? $props.itemSecondarySize || $props.itemSize : $props.itemSize}px` : undefined,
          height: $props.gridItems ? `${_ctx.direction === 'horizontal' ? $props.itemSecondarySize || $props.itemSize : $props.itemSize}px` : undefined,
        } : null,
            class: ["vue-recycle-scroller__item-view", [
          $props.itemClass,
          {
            hover: !$props.skipHover && $data.hoverKey === view.nr.key
          },
        ]]
          }, toHandlers($props.skipHover ? {} : {
          mouseenter: () => { $data.hoverKey = view.nr.key; },
          mouseleave: () => { $data.hoverKey = null; },
        })), {
            default: withCtx(() => [
              renderSlot(_ctx.$slots, "default", {
                item: view.item,
                index: view.nr.index,
                active: view.nr.used
              })
            ]),
            _: 2 /* DYNAMIC */
          }, 1040 /* FULL_PROPS, DYNAMIC_SLOTS */, ["style", "class"]))
        }), 128 /* KEYED_FRAGMENT */)),
        renderSlot(_ctx.$slots, "empty")
      ]),
      _: 3 /* FORWARDED */
    }, 8 /* PROPS */, ["style", "class"])),
    (_ctx.$slots.after)
      ? (openBlock(), createElementBlock("div", _hoisted_2, [
          renderSlot(_ctx.$slots, "after")
        ], 512 /* NEED_PATCH */))
      : createCommentVNode("v-if", true),
    createVNode(_component_ResizeObserver, { onNotify: $options.handleResize }, null, 8 /* PROPS */, ["onNotify"])
  ], 34 /* CLASS, HYDRATE_EVENTS */)), [
    [_directive_observe_visibility, $options.handleVisibilityChange]
  ])
}

script$2.render = render$1;
script$2.__file = "src/components/RecycleScroller.vue";

var script$1 = {
  name: 'DynamicScroller',

  components: {
    RecycleScroller: script$2,
  },

  provide () {
    if (typeof ResizeObserver !== 'undefined') {
      this.$_resizeObserver = new ResizeObserver(entries => {
        requestAnimationFrame(() => {
          if (!Array.isArray(entries)) {
            return
          }
          for (const entry of entries) {
            if (entry.target && entry.target.$_vs_onResize) {
              let width, height;
              if (entry.borderBoxSize) {
                const resizeObserverSize = entry.borderBoxSize[0];
                width = resizeObserverSize.inlineSize;
                height = resizeObserverSize.blockSize;
              } else {
                // @TODO remove when contentRect is deprecated
                width = entry.contentRect.width;
                height = entry.contentRect.height;
              }
              entry.target.$_vs_onResize(entry.target.$_vs_id, width, height);
            }
          }
        });
      });
    }

    return {
      vscrollData: this.vscrollData,
      vscrollParent: this,
      vscrollResizeObserver: this.$_resizeObserver,
    }
  },

  inheritAttrs: false,

  props: {
    ...props,

    minItemSize: {
      type: [Number, String],
      required: true,
    },
  },

  emits: [
    'resize',
    'visible',
  ],

  data () {
    return {
      vscrollData: {
        active: true,
        sizes: {},
        keyField: this.keyField,
        simpleArray: false,
      },
    }
  },

  computed: {
    simpleArray,

    itemsWithSize () {
      const result = [];
      const { items, keyField, simpleArray } = this;
      const sizes = this.vscrollData.sizes;
      const l = items.length;
      for (let i = 0; i < l; i++) {
        const item = items[i];
        const id = simpleArray ? i : item[keyField];
        let size = sizes[id];
        if (typeof size === 'undefined' && !this.$_undefinedMap[id]) {
          size = 0;
        }
        result.push({
          item,
          id,
          size,
        });
      }
      return result
    },
  },

  watch: {
    items () {
      this.forceUpdate();
    },

    simpleArray: {
      handler (value) {
        this.vscrollData.simpleArray = value;
      },
      immediate: true,
    },

    direction (value) {
      this.forceUpdate(true);
    },

    itemsWithSize (next, prev) {
      const scrollTop = this.$el.scrollTop;

      // Calculate total diff between prev and next sizes
      // over current scroll top. Then add it to scrollTop to
      // avoid jumping the contents that the user is seeing.
      let prevActiveTop = 0; let activeTop = 0;
      const length = Math.min(next.length, prev.length);
      for (let i = 0; i < length; i++) {
        if (prevActiveTop >= scrollTop) {
          break
        }
        prevActiveTop += prev[i].size || this.minItemSize;
        activeTop += next[i].size || this.minItemSize;
      }
      const offset = activeTop - prevActiveTop;

      if (offset === 0) {
        return
      }

      this.$el.scrollTop += offset;
    },
  },

  beforeCreate () {
    this.$_updates = [];
    this.$_undefinedSizes = 0;
    this.$_undefinedMap = {};
    this.$_events = mitt();
  },

  activated () {
    this.vscrollData.active = true;
  },

  deactivated () {
    this.vscrollData.active = false;
  },

  unmounted () {
    this.$_events.all.clear();
  },

  methods: {
    onScrollerResize () {
      const scroller = this.$refs.scroller;
      if (scroller) {
        this.forceUpdate();
      }
      this.$emit('resize');
    },

    onScrollerVisible () {
      this.$_events.emit('vscroll:update', { force: false });
      this.$emit('visible');
    },

    forceUpdate (clear = false) {
      if (clear || this.simpleArray) {
        this.vscrollData.sizes = {};
      }
      this.$_events.emit('vscroll:update', { force: true });
    },

    scrollToItem (index) {
      const scroller = this.$refs.scroller;
      if (scroller) scroller.scrollToItem(index);
    },

    getItemSize (item, index = undefined) {
      const id = this.simpleArray ? (index != null ? index : this.items.indexOf(item)) : item[this.keyField];
      return this.vscrollData.sizes[id] || 0
    },

    scrollToBottom () {
      if (this.$_scrollingToBottom) return
      this.$_scrollingToBottom = true;
      const el = this.$el;
      // Item is inserted to the DOM
      this.$nextTick(() => {
        el.scrollTop = el.scrollHeight + 5000;
        // Item sizes are computed
        const cb = () => {
          el.scrollTop = el.scrollHeight + 5000;
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight + 5000;
            if (this.$_undefinedSizes === 0) {
              this.$_scrollingToBottom = false;
            } else {
              requestAnimationFrame(cb);
            }
          });
        };
        requestAnimationFrame(cb);
      });
    },
  },
};

function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_RecycleScroller = resolveComponent("RecycleScroller");

  return (openBlock(), createBlock(_component_RecycleScroller, mergeProps({
    ref: "scroller",
    items: $options.itemsWithSize,
    "min-item-size": $props.minItemSize,
    direction: _ctx.direction,
    "key-field": "id",
    "list-tag": _ctx.listTag,
    "item-tag": _ctx.itemTag
  }, _ctx.$attrs, {
    onResize: $options.onScrollerResize,
    onVisible: $options.onScrollerVisible
  }), {
    default: withCtx(({ item: itemWithSize, index, active }) => [
      renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps({
          item: itemWithSize.item,
          index,
          active,
          itemWithSize
        })))
    ]),
    before: withCtx(() => [
      renderSlot(_ctx.$slots, "before")
    ]),
    after: withCtx(() => [
      renderSlot(_ctx.$slots, "after")
    ]),
    empty: withCtx(() => [
      renderSlot(_ctx.$slots, "empty")
    ]),
    _: 3 /* FORWARDED */
  }, 16 /* FULL_PROPS */, ["items", "min-item-size", "direction", "list-tag", "item-tag", "onResize", "onVisible"]))
}

script$1.render = render;
script$1.__file = "src/components/DynamicScroller.vue";

var script = {
  name: 'DynamicScrollerItem',

  inject: [
    'vscrollData',
    'vscrollParent',
    'vscrollResizeObserver',
  ],

  props: {
    // eslint-disable-next-line vue/require-prop-types
    item: {
      required: true,
    },

    watchData: {
      type: Boolean,
      default: false,
    },

    /**
     * Indicates if the view is actively used to display an item.
     */
    active: {
      type: Boolean,
      required: true,
    },

    index: {
      type: Number,
      default: undefined,
    },

    sizeDependencies: {
      type: [Array, Object],
      default: null,
    },

    emitResize: {
      type: Boolean,
      default: false,
    },

    tag: {
      type: String,
      default: 'div',
    },
  },

  emits: [
    'resize',
  ],

  computed: {
    id () {
      if (this.vscrollData.simpleArray) return this.index
      // eslint-disable-next-line no-prototype-builtins
      if (this.vscrollData.keyField in this.item) return this.item[this.vscrollData.keyField]
      throw new Error(`keyField '${this.vscrollData.keyField}' not found in your item. You should set a valid keyField prop on your Scroller`)
    },

    size () {
      return this.vscrollData.sizes[this.id] || 0
    },

    finalActive () {
      return this.active && this.vscrollData.active
    },
  },

  watch: {
    watchData: 'updateWatchData',

    id (value, oldValue) {
      this.$el.$_vs_id = this.id;
      if (!this.size) {
        this.onDataUpdate();
      }

      if (this.$_sizeObserved) {
        // In case the old item had the same size, it won't trigger the ResizeObserver
        // since we are reusing the same DOM node
        const oldSize = this.vscrollData.sizes[oldValue];
        const size = this.vscrollData.sizes[value];
        if (oldSize != null && oldSize !== size) {
          this.applySize(oldSize);
        }
      }
    },

    finalActive (value) {
      if (!this.size) {
        if (value) {
          if (!this.vscrollParent.$_undefinedMap[this.id]) {
            this.vscrollParent.$_undefinedSizes++;
            this.vscrollParent.$_undefinedMap[this.id] = true;
          }
        } else {
          if (this.vscrollParent.$_undefinedMap[this.id]) {
            this.vscrollParent.$_undefinedSizes--;
            this.vscrollParent.$_undefinedMap[this.id] = false;
          }
        }
      }

      if (this.vscrollResizeObserver) {
        if (value) {
          this.observeSize();
        } else {
          this.unobserveSize();
        }
      } else if (value && this.$_pendingVScrollUpdate === this.id) {
        this.updateSize();
      }
    },
  },

  created () {
    if (this.$isServer) return

    this.$_forceNextVScrollUpdate = null;
    this.updateWatchData();

    if (!this.vscrollResizeObserver) {
      for (const k in this.sizeDependencies) {
        this.$watch(() => this.sizeDependencies[k], this.onDataUpdate);
      }

      this.vscrollParent.$_events.on('vscroll:update', this.onVscrollUpdate);
    }
  },

  mounted () {
    if (this.finalActive) {
      this.updateSize();
      this.observeSize();
    }
  },

  beforeUnmount () {
    this.vscrollParent.$_events.off('vscroll:update', this.onVscrollUpdate);
    this.unobserveSize();
  },

  methods: {
    updateSize () {
      if (this.finalActive) {
        if (this.$_pendingSizeUpdate !== this.id) {
          this.$_pendingSizeUpdate = this.id;
          this.$_forceNextVScrollUpdate = null;
          this.$_pendingVScrollUpdate = null;
          this.computeSize(this.id);
        }
      } else {
        this.$_forceNextVScrollUpdate = this.id;
      }
    },

    updateWatchData () {
      if (this.watchData && !this.vscrollResizeObserver) {
        this.$_watchData = this.$watch('item', () => {
          this.onDataUpdate();
        }, {
          deep: true,
        });
      } else if (this.$_watchData) {
        this.$_watchData();
        this.$_watchData = null;
      }
    },

    onVscrollUpdate ({ force }) {
      // If not active, sechedule a size update when it becomes active
      if (!this.finalActive && force) {
        this.$_pendingVScrollUpdate = this.id;
      }

      if (this.$_forceNextVScrollUpdate === this.id || force || !this.size) {
        this.updateSize();
      }
    },

    onDataUpdate () {
      this.updateSize();
    },

    computeSize (id) {
      this.$nextTick(() => {
        if (this.id === id) {
          const width = this.$el.offsetWidth;
          const height = this.$el.offsetHeight;
          this.applyWidthHeight(width, height);
        }
        this.$_pendingSizeUpdate = null;
      });
    },

    applyWidthHeight (width, height) {
      const size = ~~(this.vscrollParent.direction === 'vertical' ? height : width);
      if (size && this.size !== size) {
        this.applySize(size);
      }
    },

    applySize (size) {
      if (this.vscrollParent.$_undefinedMap[this.id]) {
        this.vscrollParent.$_undefinedSizes--;
        this.vscrollParent.$_undefinedMap[this.id] = undefined;
      }
      this.vscrollData.sizes[this.id] = size;
      if (this.emitResize) this.$emit('resize', this.id);
    },

    observeSize () {
      if (!this.vscrollResizeObserver) return
      if (this.$_sizeObserved) return
      this.vscrollResizeObserver.observe(this.$el);
      this.$el.$_vs_id = this.id;
      this.$el.$_vs_onResize = this.onResize;
      this.$_sizeObserved = true;
    },

    unobserveSize () {
      if (!this.vscrollResizeObserver) return
      if (!this.$_sizeObserved) return
      this.vscrollResizeObserver.unobserve(this.$el);
      this.$el.$_vs_onResize = undefined;
      this.$_sizeObserved = false;
    },

    onResize (id, width, height) {
      if (this.id === id) {
        this.applyWidthHeight(width, height);
      }
    },
  },

  render () {
    return h(this.tag, this.$slots.default())
  },
};

script.__file = "src/components/DynamicScrollerItem.vue";

function IdState () {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    _ref$idProp = _ref.idProp,
    idProp = _ref$idProp === void 0 ? function (vm) {
      return vm.item.id;
    } : _ref$idProp;
  var store = reactive({});

  // @vue/component
  return {
    data: function data() {
      return {
        idState: null
      };
    },
    created: function created() {
      var _this = this;
      this.$_id = null;
      if (typeof idProp === 'function') {
        this.$_getId = function () {
          return idProp.call(_this, _this);
        };
      } else {
        this.$_getId = function () {
          return _this[idProp];
        };
      }
      this.$watch(this.$_getId, {
        handler: function handler(value) {
          var _this2 = this;
          this.$nextTick(function () {
            _this2.$_id = value;
          });
        },
        immediate: true
      });
      this.$_updateIdState();
    },
    beforeUpdate: function beforeUpdate() {
      this.$_updateIdState();
    },
    methods: {
      /**
       * Initialize an idState
       * @param {number|string} id Unique id for the data
       */$_idStateInit: function $_idStateInit(id) {
        var factory = this.$options.idState;
        if (typeof factory === 'function') {
          var data = factory.call(this, this);
          store[id] = data;
          this.$_id = id;
          return data;
        } else {
          throw new Error('[mixin IdState] Missing `idState` function on component definition.');
        }
      },
      /**
       * Ensure idState is created and up-to-date
       */$_updateIdState: function $_updateIdState() {
        var id = this.$_getId();
        if (id == null) {
          console.warn("No id found for IdState with idProp: '".concat(idProp, "'."));
        }
        if (id !== this.$_id) {
          if (!store[id]) {
            this.$_idStateInit(id);
          }
          this.idState = store[id];
        }
      }
    }
  };
}

function registerComponents(app, prefix) {
  app.component("".concat(prefix, "recycle-scroller"), script$2);
  app.component("".concat(prefix, "RecycleScroller"), script$2);
  app.component("".concat(prefix, "dynamic-scroller"), script$1);
  app.component("".concat(prefix, "DynamicScroller"), script$1);
  app.component("".concat(prefix, "dynamic-scroller-item"), script);
  app.component("".concat(prefix, "DynamicScrollerItem"), script);
}
var plugin = {
  // eslint-disable-next-line no-undef
  version: "2.0.0-beta.8",
  install: function install(app, options) {
    var finalOptions = Object.assign({}, {
      installComponents: true,
      componentsPrefix: ''
    }, options);
    for (var key in finalOptions) {
      if (typeof finalOptions[key] !== 'undefined') {
        config[key] = finalOptions[key];
      }
    }
    if (finalOptions.installComponents) {
      registerComponents(app, finalOptions.componentsPrefix);
    }
  }
};

export { script$1 as DynamicScroller, script as DynamicScrollerItem, IdState, script$2 as RecycleScroller, plugin as default };
//# sourceMappingURL=vue-virtual-scroller.esm.js.map
