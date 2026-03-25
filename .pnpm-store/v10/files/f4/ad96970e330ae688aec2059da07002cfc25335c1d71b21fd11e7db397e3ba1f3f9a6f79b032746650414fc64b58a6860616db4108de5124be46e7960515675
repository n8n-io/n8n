import {
  UniversalStore,
  parse,
  stringify
} from "../_browser-chunks/chunk-UD6FQLAF.js";
import {
  StatusTypeIdMismatchError
} from "../_browser-chunks/chunk-V5NV5R37.js";
import {
  StatusTypeIdMismatchError as StatusTypeIdMismatchError2
} from "../_browser-chunks/chunk-7S2XPX5M.js";
import {
  StorybookError
} from "../_browser-chunks/chunk-JVRDBUUP.js";
import {
  countBy,
  dequal,
  partition
} from "../_browser-chunks/chunk-XJNX76GA.js";
import {
  require_picocolors_browser
} from "../_browser-chunks/chunk-EZSQOHRI.js";
import {
  isEqual
} from "../_browser-chunks/chunk-3IAH5M2U.js";
import "../_browser-chunks/chunk-QKODTO7K.js";
import {
  mapValues,
  mergeWith,
  pick,
  toMerged
} from "../_browser-chunks/chunk-AIOS4NGK.js";
import "../_browser-chunks/chunk-GFLS4VP3.js";
import {
  require_memoizerific
} from "../_browser-chunks/chunk-WJYERY3R.js";
import {
  dedent
} from "../_browser-chunks/chunk-JP7NCOJX.js";
import {
  __commonJS,
  __export,
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// ../node_modules/toggle-selection/index.js
var require_toggle_selection = __commonJS({
  "../node_modules/toggle-selection/index.js"(exports, module) {
    module.exports = function() {
      var selection = document.getSelection();
      if (!selection.rangeCount)
        return function() {
        };
      for (var active = document.activeElement, ranges = [], i = 0; i < selection.rangeCount; i++)
        ranges.push(selection.getRangeAt(i));
      switch (active.tagName.toUpperCase()) {
        // .toUpperCase handles XHTML
        case "INPUT":
        case "TEXTAREA":
          active.blur();
          break;
        default:
          active = null;
          break;
      }
      return selection.removeAllRanges(), function() {
        selection.type === "Caret" && selection.removeAllRanges(), selection.rangeCount || ranges.forEach(function(range) {
          selection.addRange(range);
        }), active && active.focus();
      };
    };
  }
});

// ../node_modules/copy-to-clipboard/index.js
var require_copy_to_clipboard = __commonJS({
  "../node_modules/copy-to-clipboard/index.js"(exports, module) {
    "use strict";
    var deselectCurrent = require_toggle_selection(), clipboardToIE11Formatting = {
      "text/plain": "Text",
      "text/html": "Url",
      default: "Text"
    }, defaultMessage = "Copy to clipboard: #{key}, Enter";
    function format(message) {
      var copyKey = (/mac os x/i.test(navigator.userAgent) ? "\u2318" : "Ctrl") + "+C";
      return message.replace(/#{\s*key\s*}/g, copyKey);
    }
    function copy2(text, options) {
      var debug, message, reselectPrevious, range, selection, mark, success = !1;
      options || (options = {}), debug = options.debug || !1;
      try {
        reselectPrevious = deselectCurrent(), range = document.createRange(), selection = document.getSelection(), mark = document.createElement("span"), mark.textContent = text, mark.ariaHidden = "true", mark.style.all = "unset", mark.style.position = "fixed", mark.style.top = 0, mark.style.clip = "rect(0, 0, 0, 0)", mark.style.whiteSpace = "pre", mark.style.webkitUserSelect = "text", mark.style.MozUserSelect = "text", mark.style.msUserSelect = "text", mark.style.userSelect = "text", mark.addEventListener("copy", function(e) {
          if (e.stopPropagation(), options.format)
            if (e.preventDefault(), typeof e.clipboardData > "u") {
              debug && console.warn("unable to use e.clipboardData"), debug && console.warn("trying IE specific stuff"), window.clipboardData.clearData();
              var format2 = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting.default;
              window.clipboardData.setData(format2, text);
            } else
              e.clipboardData.clearData(), e.clipboardData.setData(options.format, text);
          options.onCopy && (e.preventDefault(), options.onCopy(e.clipboardData));
        }), document.body.appendChild(mark), range.selectNodeContents(mark), selection.addRange(range);
        var successful = document.execCommand("copy");
        if (!successful)
          throw new Error("copy command was unsuccessful");
        success = !0;
      } catch (err) {
        debug && console.error("unable to copy using execCommand: ", err), debug && console.warn("trying IE specific stuff");
        try {
          window.clipboardData.setData(options.format || "text", text), options.onCopy && options.onCopy(window.clipboardData), success = !0;
        } catch (err2) {
          debug && console.error("unable to copy using clipboardData: ", err2), debug && console.error("falling back to prompt"), message = format("message" in options ? options.message : defaultMessage), window.prompt(message, text);
        }
      } finally {
        selection && (typeof selection.removeRange == "function" ? selection.removeRange(range) : selection.removeAllRanges()), mark && document.body.removeChild(mark), reselectPrevious();
      }
      return success;
    }
    module.exports = copy2;
  }
});

// ../node_modules/store2/dist/store2.js
var require_store2 = __commonJS({
  "../node_modules/store2/dist/store2.js"(exports, module) {
    (function(window2, define) {
      var _ = {
        version: "2.14.4",
        areas: {},
        apis: {},
        nsdelim: ".",
        // utilities
        inherit: function(api, o) {
          for (var p in api)
            o.hasOwnProperty(p) || Object.defineProperty(o, p, Object.getOwnPropertyDescriptor(api, p));
          return o;
        },
        stringify: function(d, fn) {
          return d === void 0 || typeof d == "function" ? d + "" : JSON.stringify(d, fn || _.replace);
        },
        parse: function(s, fn) {
          try {
            return JSON.parse(s, fn || _.revive);
          } catch {
            return s;
          }
        },
        // extension hooks
        fn: function(name, fn) {
          _.storeAPI[name] = fn;
          for (var api in _.apis)
            _.apis[api][name] = fn;
        },
        get: function(area, key) {
          return area.getItem(key);
        },
        set: function(area, key, string) {
          area.setItem(key, string);
        },
        remove: function(area, key) {
          area.removeItem(key);
        },
        key: function(area, i) {
          return area.key(i);
        },
        length: function(area) {
          return area.length;
        },
        clear: function(area) {
          area.clear();
        },
        // core functions
        Store: function(id, area, namespace) {
          var store3 = _.inherit(_.storeAPI, function(key, data, overwrite) {
            return arguments.length === 0 ? store3.getAll() : typeof data == "function" ? store3.transact(key, data, overwrite) : data !== void 0 ? store3.set(key, data, overwrite) : typeof key == "string" || typeof key == "number" ? store3.get(key) : typeof key == "function" ? store3.each(key) : key ? store3.setAll(key, data) : store3.clear();
          });
          store3._id = id;
          try {
            var testKey = "__store2_test";
            area.setItem(testKey, "ok"), store3._area = area, area.removeItem(testKey);
          } catch {
            store3._area = _.storage("fake");
          }
          return store3._ns = namespace || "", _.areas[id] || (_.areas[id] = store3._area), _.apis[store3._ns + store3._id] || (_.apis[store3._ns + store3._id] = store3), store3;
        },
        storeAPI: {
          // admin functions
          area: function(id, area) {
            var store3 = this[id];
            return (!store3 || !store3.area) && (store3 = _.Store(id, area, this._ns), this[id] || (this[id] = store3)), store3;
          },
          namespace: function(namespace, singleArea, delim) {
            if (delim = delim || this._delim || _.nsdelim, !namespace)
              return this._ns ? this._ns.substring(0, this._ns.length - delim.length) : "";
            var ns = namespace, store3 = this[ns];
            if ((!store3 || !store3.namespace) && (store3 = _.Store(this._id, this._area, this._ns + ns + delim), store3._delim = delim, this[ns] || (this[ns] = store3), !singleArea))
              for (var name in _.areas)
                store3.area(name, _.areas[name]);
            return store3;
          },
          isFake: function(force) {
            return force ? (this._real = this._area, this._area = _.storage("fake")) : force === !1 && (this._area = this._real || this._area), this._area.name === "fake";
          },
          toString: function() {
            return "store" + (this._ns ? "." + this.namespace() : "") + "[" + this._id + "]";
          },
          // storage functions
          has: function(key) {
            return this._area.has ? this._area.has(this._in(key)) : this._in(key) in this._area;
          },
          size: function() {
            return this.keys().length;
          },
          each: function(fn, fill) {
            for (var i = 0, m = _.length(this._area); i < m; i++) {
              var key = this._out(_.key(this._area, i));
              if (key !== void 0 && fn.call(this, key, this.get(key), fill) === !1)
                break;
              m > _.length(this._area) && (m--, i--);
            }
            return fill || this;
          },
          keys: function(fillList) {
            return this.each(function(k, v, list) {
              list.push(k);
            }, fillList || []);
          },
          get: function(key, alt) {
            var s = _.get(this._area, this._in(key)), fn;
            return typeof alt == "function" && (fn = alt, alt = null), s !== null ? _.parse(s, fn) : alt ?? s;
          },
          getAll: function(fillObj) {
            return this.each(function(k, v, all) {
              all[k] = v;
            }, fillObj || {});
          },
          transact: function(key, fn, alt) {
            var val = this.get(key, alt), ret = fn(val);
            return this.set(key, ret === void 0 ? val : ret), this;
          },
          set: function(key, data, overwrite) {
            var d = this.get(key), replacer;
            return d != null && overwrite === !1 ? data : (typeof overwrite == "function" && (replacer = overwrite, overwrite = void 0), _.set(this._area, this._in(key), _.stringify(data, replacer), overwrite) || d);
          },
          setAll: function(data, overwrite) {
            var changed, val;
            for (var key in data)
              val = data[key], this.set(key, val, overwrite) !== val && (changed = !0);
            return changed;
          },
          add: function(key, data, replacer) {
            var d = this.get(key);
            if (d instanceof Array)
              data = d.concat(data);
            else if (d !== null) {
              var type = typeof d;
              if (type === typeof data && type === "object") {
                for (var k in data)
                  d[k] = data[k];
                data = d;
              } else
                data = d + data;
            }
            return _.set(this._area, this._in(key), _.stringify(data, replacer)), data;
          },
          remove: function(key, alt) {
            var d = this.get(key, alt);
            return _.remove(this._area, this._in(key)), d;
          },
          clear: function() {
            return this._ns ? this.each(function(k) {
              _.remove(this._area, this._in(k));
            }, 1) : _.clear(this._area), this;
          },
          clearAll: function() {
            var area = this._area;
            for (var id in _.areas)
              _.areas.hasOwnProperty(id) && (this._area = _.areas[id], this.clear());
            return this._area = area, this;
          },
          // internal use functions
          _in: function(k) {
            return typeof k != "string" && (k = _.stringify(k)), this._ns ? this._ns + k : k;
          },
          _out: function(k) {
            return this._ns ? k && k.indexOf(this._ns) === 0 ? k.substring(this._ns.length) : void 0 : (
              // so each() knows to skip it
              k
            );
          }
        },
        // end _.storeAPI
        storage: function(name) {
          return _.inherit(_.storageAPI, { items: {}, name });
        },
        storageAPI: {
          length: 0,
          has: function(k) {
            return this.items.hasOwnProperty(k);
          },
          key: function(i) {
            var c = 0;
            for (var k in this.items)
              if (this.has(k) && i === c++)
                return k;
          },
          setItem: function(k, v) {
            this.has(k) || this.length++, this.items[k] = v;
          },
          removeItem: function(k) {
            this.has(k) && (delete this.items[k], this.length--);
          },
          getItem: function(k) {
            return this.has(k) ? this.items[k] : null;
          },
          clear: function() {
            for (var k in this.items)
              this.removeItem(k);
          }
        }
        // end _.storageAPI
      }, store2 = (
        // safely set this up (throws error in IE10/32bit mode for local files)
        _.Store("local", (function() {
          try {
            return localStorage;
          } catch {
          }
        })())
      );
      store2.local = store2, store2._ = _, store2.area("session", (function() {
        try {
          return sessionStorage;
        } catch {
        }
      })()), store2.area("page", _.storage("page")), typeof define == "function" && define.amd !== void 0 ? define("store2", [], function() {
        return store2;
      }) : typeof module < "u" && module.exports ? module.exports = store2 : (window2.store && (_.conflict = window2.store), window2.store = store2);
    })(exports, exports && exports.define);
  }
});

// src/manager-api/root.tsx
import React4, {
  Component,
  Fragment,
  useCallback as useCallback2,
  useContext,
  useEffect,
  useMemo,
  useRef as useRef2,
  useState
} from "react";
import {
  DOCS_PREPARED as DOCS_PREPARED2,
  SET_STORIES as SET_STORIES2,
  SHARED_STATE_CHANGED,
  SHARED_STATE_SET,
  STORY_CHANGED as STORY_CHANGED2,
  STORY_PREPARED as STORY_PREPARED2
} from "storybook/internal/core-events";

// src/manager-api/context.ts
import { createContext as ReactCreateContext } from "react";
var createContext = ({ api, state }) => ReactCreateContext({ api, state });

// src/manager-api/lib/merge.ts
import { logger } from "storybook/internal/client-logger";
var merge_default = (a, ...b) => {
  let target = {};
  target = mergeWith(
    {},
    a,
    (objValue, srcValue) => {
      if (Array.isArray(srcValue) && Array.isArray(objValue))
        return srcValue.forEach((s) => {
          objValue.find((o) => o === s || isEqual(o, s)) || objValue.push(s);
        }), objValue;
      if (Array.isArray(objValue))
        return logger.log(["the types mismatch, picking", objValue]), objValue;
    }
  );
  for (let obj of b)
    target = mergeWith(target, obj, (objValue, srcValue) => {
      if (Array.isArray(srcValue) && Array.isArray(objValue))
        return srcValue.forEach((s) => {
          objValue.find((o) => o === s || isEqual(o, s)) || objValue.push(s);
        }), objValue;
      if (Array.isArray(objValue))
        return logger.log(["the types mismatch, picking", objValue]), objValue;
    });
  return target;
}, noArrayMerge = (a, ...b) => {
  let target = {};
  target = mergeWith(
    {},
    a,
    (objValue, srcValue) => {
      if (Array.isArray(srcValue))
        return srcValue;
    }
  );
  for (let obj of b)
    target = mergeWith(target, obj, (objValue, srcValue) => {
      if (Array.isArray(srcValue))
        return srcValue;
    });
  return target;
};

// src/manager-api/initial-state.ts
var main = (...additions) => additions.reduce((acc, item) => merge_default(acc, item), {}), initial_state_default = main;

// src/manager-api/lib/addons.ts
import { logger as logger2 } from "storybook/internal/client-logger";
import { SET_CONFIG } from "storybook/internal/core-events";
import { Addon_TypesEnum } from "storybook/internal/types";
import { global } from "@storybook/global";

// src/manager-api/lib/storybook-channel-mock.ts
import { Channel } from "storybook/internal/channels";
function mockChannel() {
  let transport = {
    setHandler: () => {
    },
    send: () => {
    }
  };
  return new Channel({ transport });
}

// src/manager-api/lib/addons.ts
var AddonStore = class {
  constructor() {
    this.loaders = {};
    this.elements = {};
    this.config = {};
    this.getChannel = () => (this.channel || this.setChannel(mockChannel()), this.channel);
    this.ready = () => this.promise;
    this.hasChannel = () => !!this.channel;
    this.setChannel = (channel) => {
      this.channel = channel, this.resolve();
    };
    this.setConfig = (value) => {
      Object.assign(this.config, value), this.hasChannel() ? this.getChannel().emit(SET_CONFIG, this.config) : this.ready().then((channel) => {
        channel.emit(SET_CONFIG, this.config);
      });
    };
    this.getConfig = () => this.config;
    /**
     * Registers an addon loader function.
     *
     * @param {string} id - The id of the addon loader.
     * @param {(api: API) => void} callback - The function that will be called to register the addon.
     * @returns {void}
     */
    this.register = (id, callback) => {
      this.loaders[id] && logger2.warn(`${id} was loaded twice, this could have bad side-effects`), this.loaders[id] = callback;
    };
    this.loadAddons = (api) => {
      Object.values(this.loaders).forEach((value) => value(api));
    };
    this.promise = new Promise((res) => {
      this.resolve = () => res(this.getChannel());
    });
  }
  getElements(type) {
    return this.elements[type] || (this.elements[type] = {}), this.elements[type];
  }
  /**
   * Adds an addon to the addon store.
   *
   * @param {string} id - The id of the addon.
   * @param {Addon_Type} addon - The addon to add.
   * @returns {void}
   */
  add(id, addon) {
    let { type } = addon, collection = this.getElements(type);
    collection[id] = { ...addon, id };
  }
  experimental_getRegisteredAddons() {
    return Object.keys(this.loaders);
  }
}, KEY = "__STORYBOOK_ADDONS_MANAGER";
function getAddonsStore() {
  return global[KEY] || (global[KEY] = new AddonStore()), global[KEY];
}
var addons = getAddonsStore();

// src/manager-api/modules/addons.ts
var addons_exports = {};
__export(addons_exports, {
  ensurePanel: () => ensurePanel,
  init: () => init
});
import { Addon_TypesEnum as Addon_TypesEnum2 } from "storybook/internal/types";
function ensurePanel(panels, selectedPanel, currentPanel) {
  let keys2 = Object.keys(panels);
  return keys2.indexOf(selectedPanel) >= 0 ? selectedPanel : keys2.length ? keys2[0] : currentPanel;
}
var init = ({ provider, store: store2, fullAPI }) => {
  let api = {
    getElements: (type) => provider.getElements(type),
    getSelectedPanel: () => {
      let { selectedPanel } = store2.getState();
      return ensurePanel(api.getElements(Addon_TypesEnum2.PANEL), selectedPanel, selectedPanel);
    },
    setSelectedPanel: (panelName) => {
      store2.setState({ selectedPanel: panelName }, { persistence: "session" });
    },
    setAddonState(addonId, newStateOrMerger, options) {
      let merger = typeof newStateOrMerger == "function" ? newStateOrMerger : () => newStateOrMerger;
      return store2.setState(
        (s) => ({ ...s, addons: { ...s.addons, [addonId]: merger(s.addons[addonId]) } }),
        options
      ).then(() => api.getAddonState(addonId));
    },
    getAddonState: (addonId) => store2.getState().addons[addonId] || globalThis?.STORYBOOK_ADDON_STATE[addonId]
  };
  return {
    api,
    state: {
      selectedPanel: ensurePanel(
        api.getElements(Addon_TypesEnum2.PANEL),
        store2.getState().selectedPanel
      ),
      addons: {}
    }
  };
};

// src/manager-api/modules/channel.ts
var channel_exports = {};
__export(channel_exports, {
  init: () => init2
});
var init2 = ({ provider }) => ({ api: {
  getChannel: () => provider.channel,
  on: (type, handler) => (provider.channel?.on(type, handler), () => provider.channel?.off(type, handler)),
  off: (type, handler) => provider.channel?.off(type, handler),
  once: (type, handler) => provider.channel?.once(type, handler),
  emit: (type, data, ...args) => {
    data?.options?.target && data.options.target !== "storybook-preview-iframe" && !data.options.target.startsWith("storybook-ref-") && (data.options.target = data.options.target !== "storybook_internal" ? `storybook-ref-${data.options.target}` : "storybook-preview-iframe"), provider.channel?.emit(type, data, ...args);
  }
}, state: {} });

// src/manager-api/modules/globals.ts
var globals_exports = {};
__export(globals_exports, {
  init: () => init4
});
import { logger as logger4 } from "storybook/internal/client-logger";
import { GLOBALS_UPDATED, SET_GLOBALS, UPDATE_GLOBALS } from "storybook/internal/core-events";

// src/manager-api/lib/events.ts
import { logger as logger3 } from "storybook/internal/client-logger";

// src/manager-api/modules/refs.ts
var refs_exports = {};
__export(refs_exports, {
  defaultStoryMapper: () => defaultStoryMapper,
  getSourceType: () => getSourceType,
  init: () => init3
});
import { global as global2 } from "@storybook/global";

// src/manager-api/lib/stories.ts
import { sanitize } from "storybook/internal/csf";
var import_memoizerific = __toESM(require_memoizerific(), 1);

// src/manager-api/lib/intersect.ts
var intersect_default = (a, b) => !Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length ? [] : a.reduce((acc, aValue) => (b.includes(aValue) && acc.push(aValue), acc), []);

// src/manager-api/lib/stories.ts
var TITLE_PATH_SEPARATOR = /\s*\/\s*/, denormalizeStoryParameters = ({
  globalParameters,
  kindParameters,
  stories
}) => mapValues(stories, (storyData) => ({
  ...storyData,
  parameters: combineParameters(
    globalParameters,
    kindParameters[storyData.kind],
    storyData.parameters
  )
})), transformSetStoriesStoryDataToPreparedStoryIndex = (stories) => ({ v: 5, entries: Object.entries(stories).reduce(
  (acc, [id, story]) => {
    if (!story)
      return acc;
    let { docsOnly, fileName, ...parameters } = story.parameters, base = {
      title: story.kind,
      id,
      name: story.name,
      importPath: fileName
    };
    if (docsOnly)
      acc[id] = {
        type: "docs",
        tags: ["stories-mdx"],
        storiesImports: [],
        ...base
      };
    else {
      let { argTypes, args, initialArgs } = story;
      acc[id] = {
        type: "story",
        subtype: "story",
        ...base,
        parameters,
        argTypes,
        args,
        initialArgs
      };
    }
    return acc;
  },
  {}
) }), transformStoryIndexV2toV3 = (index) => ({
  v: 3,
  stories: Object.values(index.stories).reduce(
    (acc, entry) => (acc[entry.id] = {
      ...entry,
      title: entry.kind,
      name: entry.name || entry.story,
      importPath: entry.parameters.fileName || ""
    }, acc),
    {}
  )
}), transformStoryIndexV3toV4 = (index) => {
  let countByTitle = countBy(Object.values(index.stories), (item) => item.title);
  return {
    v: 4,
    entries: Object.values(index.stories).reduce(
      (acc, entry) => {
        let type = "story";
        return (entry.parameters?.docsOnly || entry.name === "Page" && countByTitle[entry.title] === 1) && (type = "docs"), acc[entry.id] = {
          type,
          ...type === "docs" && { tags: ["stories-mdx"], storiesImports: [] },
          ...entry
        }, delete acc[entry.id].story, delete acc[entry.id].kind, acc;
      },
      {}
    )
  };
}, transformStoryIndexV4toV5 = (index) => ({
  v: 5,
  entries: Object.values(index.entries).reduce(
    (acc, entry) => (acc[entry.id] = {
      ...entry,
      tags: entry.tags ? ["dev", "test", ...entry.tags] : ["dev"]
    }, acc),
    {}
  )
}), transformStoryIndexToStoriesHash = (input, { provider, docsOptions, filters, allStatuses }) => {
  if (!input.v)
    throw new Error("Composition: Missing stories.json version");
  let index = input;
  index = index.v === 2 ? transformStoryIndexV2toV3(index) : index, index = index.v === 3 ? transformStoryIndexV3toV4(index) : index, index = index.v === 4 ? transformStoryIndexV4toV5(index) : index, index = index;
  let indexEntries = Object.values(index.entries), filterFunctions = Object.values(filters), entryValues = indexEntries.filter((entry) => {
    let statuses = allStatuses[entry.id] ?? {};
    return Object.values(statuses).some(({ value }) => value === "status-value:error") || filterFunctions.every((fn) => fn({ ...entry, statuses })) ? !0 : indexEntries.filter((item) => "parent" in item && item.parent === entry.id).some((child) => filterFunctions.every((fn) => fn({ ...child, statuses })));
  }), { sidebar = {} } = provider.getConfig(), { showRoots, collapsedRoots = [], renderLabel } = sidebar, setShowRoots = typeof showRoots < "u", storiesHashOutOfOrder = entryValues.reduce((acc, item) => {
    if (docsOptions.docsMode && item.type !== "docs")
      return acc;
    let { title } = item, groups = title.trim().split(TITLE_PATH_SEPARATOR), root = (!setShowRoots || showRoots) && groups.length > 1 ? [groups.shift()] : [], names = [...root, ...groups], paths = names.reduce((list, name, idx) => {
      let parent = idx > 0 && list[idx - 1], id = sanitize(parent ? `${parent}-${name}` : name);
      if (name.trim() === "")
        throw new Error(dedent`Invalid title ${title} ending in slash.`);
      if (parent === id)
        throw new Error(
          dedent`
          Invalid part '${name}', leading to id === parentId ('${id}'), inside title '${title}'

          Did you create a path that uses the separator char accidentally, such as 'Vue <docs/>' where '/' is a separator char? See https://github.com/storybookjs/storybook/issues/6128
          `
        );
      return list.push(id), list;
    }, []);
    return paths.forEach((id, idx) => {
      let childId = paths[idx + 1] || item.id;
      root.length && idx === 0 ? acc[id] = merge_default(acc[id] || {}, {
        type: "root",
        id,
        name: names[idx],
        tags: [],
        depth: idx,
        renderLabel,
        startCollapsed: collapsedRoots.includes(id),
        // Note that this will later get appended to the previous list of children (see below)
        children: [childId]
      }) : (!acc[id] || acc[id].type === "component") && idx === paths.length - 1 ? acc[id] = merge_default(acc[id] || {}, {
        type: "component",
        id,
        name: names[idx],
        tags: [],
        parent: paths[idx - 1],
        depth: idx,
        renderLabel,
        ...childId && {
          children: [childId]
        }
      }) : acc[id] = merge_default(acc[id] || {}, {
        type: "group",
        id,
        name: names[idx],
        tags: [],
        parent: paths[idx - 1],
        depth: idx,
        renderLabel,
        ...childId && {
          children: [childId]
        }
      });
    }), acc[item.id] = {
      tags: [],
      ...item,
      depth: paths.length,
      parent: "parent" in item ? item.parent : paths[paths.length - 1],
      renderLabel,
      prepared: !!item.parameters
    }, acc;
  }, {});
  function addItem(acc, item) {
    if (acc[item.id] || (acc[item.id] = item, "children" in item && item.children && (item.children.forEach((childId) => addItem(acc, storiesHashOutOfOrder[childId])), item.tags = item.children.reduce((currentTags, childId) => currentTags === null ? acc[childId].tags : intersect_default(currentTags, acc[childId].tags), null) || [])), item.type === "component") {
      let firstChild = acc[item.children[0]];
      firstChild && "importPath" in firstChild && (item.importPath = firstChild.importPath);
    }
    return acc;
  }
  let storiesHash = Object.values(storiesHashOutOfOrder).filter((i) => i.type !== "root" && !i.parent).reduce((acc, item) => addItem(acc, item), {});
  return storiesHash = Object.values(storiesHashOutOfOrder).filter((i) => i.type === "root").reduce(addItem, storiesHash), storiesHash = Object.values(storiesHash).reduce((acc, item) => {
    if (item.type === "story" && item.subtype === "test") {
      let story = acc[item.parent], component = acc[story.parent];
      acc[component.id] = {
        ...component,
        // Remove test from the component node as it will be attached to the story node instead
        children: component.children && component.children.filter((id) => id !== item.id)
      }, acc[story.id] = {
        ...story,
        // Add test to the story node
        children: (story.children || []).concat(item.id)
      }, acc[item.id] = {
        ...item,
        depth: item.depth + 1
      };
    } else
      acc[item.id] = item;
    return acc;
  }, {}), storiesHash;
}, addPreparedStories = (newHash, oldHash) => oldHash ? Object.fromEntries(
  Object.entries(newHash).map(([id, newEntry]) => {
    let oldEntry = oldHash[id];
    return newEntry.type === "story" && oldEntry?.type === "story" && oldEntry.prepared ? ("children" in oldEntry && delete oldEntry.children, [id, { ...oldEntry, ...newEntry, prepared: !0 }]) : [id, newEntry];
  })
) : newHash, getComponentLookupList = (0, import_memoizerific.default)(1)((hash) => Object.entries(hash).reduce((acc, i) => {
  let value = i[1];
  return value.type === "component" && acc.push([...value.children]), acc;
}, [])), getStoriesLookupList = (0, import_memoizerific.default)(1)((hash) => Object.keys(hash).filter((k) => ["story", "docs"].includes(hash[k].type)));

// src/manager-api/modules/refs.ts
var { location, fetch } = global2, getSourceType = (source, refId) => {
  let { origin: localOrigin, pathname: localPathname } = location, { origin: sourceOrigin, pathname: sourcePathname } = new URL(source), localFull = `${localOrigin + localPathname}`.replace("/iframe.html", "").replace(/\/$/, ""), sourceFull = `${sourceOrigin + sourcePathname}`.replace("/iframe.html", "").replace(/\/$/, "");
  return localFull === sourceFull ? ["local", sourceFull] : refId || source ? ["external", sourceFull] : [null, null];
}, defaultStoryMapper = (b, a) => ({ ...a, kind: a.kind.replace("|", "/") }), addRefIds = (input, ref) => Object.entries(input).reduce((acc, [id, item]) => ({ ...acc, [id]: { ...item, refId: ref.id } }), {});
async function handleRequest(request) {
  if (!request)
    return {};
  try {
    let response = await request;
    if (response === !1 || response === !0)
      throw new Error("Unexpected boolean response");
    if (!response.ok)
      throw new Error(`Unexpected response not OK: ${response.statusText}`);
    let json = await response.json();
    return json.entries || json.stories ? { storyIndex: json } : json;
  } catch (err) {
    return { indexError: err };
  }
}
var parseUrl = (url) => {
  let credentialsRegex = /https?:\/\/(.+:.+)@/, cleanUrl = url, authorization, [, credentials] = url.match(credentialsRegex) || [];
  return credentials && (cleanUrl = url.replace(`${credentials}@`, ""), authorization = btoa(`${credentials}`)), {
    url: cleanUrl,
    authorization
  };
}, map = (input, ref, options) => {
  let { storyMapper } = options;
  return storyMapper ? Object.entries(input).reduce((acc, [id, item]) => ({ ...acc, [id]: storyMapper(ref, item) }), {}) : input;
}, init3 = ({ store: store2, provider, singleStory, docsOptions = {} }, { runCheck = !0 } = {}) => {
  let api = {
    findRef: (source) => {
      let refs2 = api.getRefs();
      return Object.values(refs2).find(({ url }) => url.match(source));
    },
    changeRefVersion: async (id, url) => {
      let { versions, title } = api.getRefs()[id], ref = {
        id,
        url,
        versions,
        title,
        index: {},
        filteredIndex: {},
        expanded: !0
      };
      await api.setRef(id, { ...ref, type: "unknown" }, !1), await api.checkRef(ref);
    },
    changeRefState: (id, previewInitialized) => {
      let { [id]: ref, ...updated } = api.getRefs();
      updated[id] = { ...ref, previewInitialized }, store2.setState({
        refs: updated
      });
    },
    checkRef: async (ref) => {
      let { id, url, version: version2, type } = ref, isPublic = type === "server-checked", loadedData = {}, query = version2 ? `?version=${version2}` : "", credentials = isPublic ? "omit" : "include", urlParseResult = parseUrl(url), headers = {
        Accept: "application/json"
      };
      urlParseResult.authorization && Object.assign(headers, {
        Authorization: `Basic ${urlParseResult.authorization}`
      });
      let [indexResult, storiesResult] = await Promise.all(
        ["index.json", "stories.json"].map(
          async (file) => handleRequest(
            fetch(`${urlParseResult.url}/${file}${query}`, {
              headers,
              credentials
            })
          )
        )
      );
      if (!indexResult.indexError || !storiesResult.indexError) {
        let metadata = await handleRequest(
          fetch(`${urlParseResult.url}/metadata.json${query}`, {
            headers,
            credentials,
            cache: "no-cache"
          }).catch(() => !1)
        );
        Object.assign(loadedData, {
          ...indexResult.indexError ? storiesResult : indexResult,
          ...!metadata.indexError && metadata
        });
      } else isPublic || (loadedData.indexError = {
        message: dedent`
            Error: Loading of ref failed
              at fetch (lib/api/src/modules/refs.ts)

            URL: ${urlParseResult.url}

            We weren't able to load the above URL,
            it's possible a CORS error happened.

            Please check your dev-tools network tab.
          `
      });
      let versions = ref.versions && Object.keys(ref.versions).length ? ref.versions : loadedData.versions;
      await api.setRef(id, {
        id,
        url: urlParseResult.url,
        ...loadedData,
        ...versions ? { versions } : {},
        type: loadedData.storyIndex ? "lazy" : "auto-inject"
      });
    },
    getRefs: () => {
      let { refs: refs2 = {} } = store2.getState();
      return refs2;
    },
    setRef: async (id, { storyIndex, setStoriesData, ...rest }, ready = !1) => {
      if (singleStory)
        return;
      let internal_index, index, filteredIndex, { filters } = store2.getState(), { storyMapper = defaultStoryMapper } = provider.getConfig(), ref = api.getRefs()[id];
      (storyIndex || setStoriesData) && (internal_index = setStoriesData ? transformSetStoriesStoryDataToPreparedStoryIndex(
        map(setStoriesData, ref, { storyMapper })
      ) : storyIndex, filteredIndex = transformStoryIndexToStoriesHash(storyIndex, {
        provider,
        docsOptions,
        filters,
        allStatuses: {}
      }), index = transformStoryIndexToStoriesHash(storyIndex, {
        provider,
        docsOptions,
        filters: {},
        allStatuses: {}
      })), index && (index = addRefIds(index, ref)), filteredIndex && (filteredIndex = addRefIds(filteredIndex, ref)), await api.updateRef(id, { ...ref, ...rest, index, filteredIndex, internal_index });
    },
    updateRef: async (id, data) => {
      let { [id]: ref, ...updated } = api.getRefs();
      updated[id] = { ...ref, ...data };
      let ordered = Object.keys(initialState2).reduce((obj, key) => (obj[key] = updated[key], obj), {});
      await store2.setState({
        refs: ordered
      });
    }
  }, refs = !singleStory && global2.REFS || {}, initialState2 = refs;
  return runCheck && new Promise(async (resolve) => {
    for (let ref of Object.values(refs))
      await api.checkRef({ ...ref, stories: {} });
    resolve(void 0);
  }), {
    api,
    state: {
      refs: initialState2
    }
  };
};

// src/manager-api/lib/events.ts
var getEventMetadata = (context, fullAPI) => {
  let { source, refId, type } = context, [sourceType, sourceLocation] = getSourceType(source, refId), ref;
  (refId || sourceType === "external") && (ref = refId && fullAPI.getRefs()[refId] ? fullAPI.getRefs()[refId] : fullAPI.findRef(sourceLocation));
  let meta = {
    source,
    sourceType,
    sourceLocation,
    refId,
    ref,
    type
  };
  switch (!0) {
    case typeof refId == "string":
    case sourceType === "local":
    case sourceType === "external":
      return meta;
    // if we couldn't find the source, something risky happened, we ignore the input, and log a warning
    default:
      return logger3.warn(`Received a ${type} frame that was not configured as a ref`), null;
  }
};

// src/manager-api/modules/globals.ts
var init4 = ({ store: store2, fullAPI, provider }) => {
  let api = {
    getGlobals() {
      return store2.getState().globals;
    },
    getUserGlobals() {
      return store2.getState().userGlobals;
    },
    getStoryGlobals() {
      return store2.getState().storyGlobals;
    },
    getGlobalTypes() {
      return store2.getState().globalTypes;
    },
    updateGlobals(newGlobals) {
      provider.channel?.emit(UPDATE_GLOBALS, {
        globals: newGlobals,
        options: {
          target: "storybook-preview-iframe"
        }
      });
    }
  }, state = {
    globals: {},
    userGlobals: {},
    storyGlobals: {},
    globalTypes: {}
  }, updateGlobals = ({
    globals,
    storyGlobals,
    userGlobals
  }) => {
    let {
      globals: currentGlobals,
      userGlobals: currentUserGlobals,
      storyGlobals: currentStoryGlobals
    } = store2.getState();
    dequal(globals, currentGlobals) || store2.setState({ globals }), dequal(userGlobals, currentUserGlobals) || store2.setState({ userGlobals }), dequal(storyGlobals, currentStoryGlobals) || store2.setState({ storyGlobals });
  };
  return provider.channel?.on(
    GLOBALS_UPDATED,
    function({ globals, storyGlobals, userGlobals }) {
      let { ref } = getEventMetadata(this, fullAPI);
      ref ? logger4.warn(
        "received a GLOBALS_UPDATED from a non-local ref. This is not currently supported."
      ) : updateGlobals({ globals, storyGlobals, userGlobals });
    }
  ), provider.channel?.on(
    SET_GLOBALS,
    function({ globals, globalTypes }) {
      let { ref } = getEventMetadata(this, fullAPI), currentGlobals = store2.getState()?.globals;
      ref ? Object.keys(globals).length > 0 && logger4.warn("received globals from a non-local ref. This is not currently supported.") : store2.setState({ globals, userGlobals: globals, globalTypes }), currentGlobals && Object.keys(currentGlobals).length !== 0 && !dequal(globals, currentGlobals) && api.updateGlobals(currentGlobals);
    }
  ), {
    api,
    state
  };
};

// src/manager-api/modules/layout.ts
var layout_exports = {};
__export(layout_exports, {
  ActiveTabs: () => ActiveTabs,
  defaultLayoutState: () => defaultLayoutState,
  focusableUIElements: () => focusableUIElements,
  init: () => init5
});
import { SET_CONFIG as SET_CONFIG2 } from "storybook/internal/core-events";
import { global as global3 } from "@storybook/global";
import { create } from "storybook/theming/create";
var { document: document2 } = global3, isFunction = (val) => typeof val == "function", ActiveTabs = {
  SIDEBAR: "sidebar",
  CANVAS: "canvas",
  ADDONS: "addons"
}, defaultLayoutState = {
  ui: {
    enableShortcuts: !0
  },
  layout: {
    initialActive: ActiveTabs.CANVAS,
    showToolbar: !0,
    navSize: 300,
    bottomPanelHeight: 300,
    rightPanelWidth: 400,
    recentVisibleSizes: {
      navSize: 300,
      bottomPanelHeight: 300,
      rightPanelWidth: 400
    },
    panelPosition: "bottom",
    showTabs: !0
  },
  layoutCustomisations: {
    showSidebar: void 0,
    showToolbar: void 0
  },
  selectedPanel: void 0,
  theme: create()
}, focusableUIElements = {
  storySearchField: "storybook-explorer-searchfield",
  storyListMenu: "storybook-explorer-menu",
  storyPanelRoot: "storybook-panel-root"
}, getIsNavShown = (state) => state.layout.navSize > 0, getIsPanelShown = (state) => {
  let { bottomPanelHeight, rightPanelWidth, panelPosition } = state.layout;
  return panelPosition === "bottom" && bottomPanelHeight > 0 || panelPosition === "right" && rightPanelWidth > 0;
}, getIsFullscreen = (state) => !getIsNavShown(state) && !getIsPanelShown(state), getRecentVisibleSizes = (layoutState) => ({
  navSize: layoutState.navSize > 0 ? layoutState.navSize : layoutState.recentVisibleSizes.navSize,
  bottomPanelHeight: layoutState.bottomPanelHeight > 0 ? layoutState.bottomPanelHeight : layoutState.recentVisibleSizes.bottomPanelHeight,
  rightPanelWidth: layoutState.rightPanelWidth > 0 ? layoutState.rightPanelWidth : layoutState.recentVisibleSizes.rightPanelWidth
}), init5 = ({ store: store2, provider, singleStory }) => {
  let api = {
    toggleFullscreen(nextState) {
      return store2.setState(
        (state) => {
          let isFullscreen = getIsFullscreen(state), shouldFullscreen = typeof nextState == "boolean" ? nextState : !isFullscreen;
          return shouldFullscreen === isFullscreen ? { layout: state.layout } : shouldFullscreen ? {
            layout: {
              ...state.layout,
              navSize: 0,
              bottomPanelHeight: 0,
              rightPanelWidth: 0,
              recentVisibleSizes: getRecentVisibleSizes(state.layout)
            }
          } : {
            layout: {
              ...state.layout,
              navSize: state.singleStory ? 0 : state.layout.recentVisibleSizes.navSize,
              bottomPanelHeight: state.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: state.layout.recentVisibleSizes.rightPanelWidth
            }
          };
        },
        { persistence: "session" }
      );
    },
    togglePanel(nextState) {
      return store2.setState(
        (state) => {
          let isPanelShown = getIsPanelShown(state), shouldShowPanel = typeof nextState == "boolean" ? nextState : !isPanelShown;
          return shouldShowPanel === isPanelShown ? { layout: state.layout } : shouldShowPanel ? {
            layout: {
              ...state.layout,
              bottomPanelHeight: state.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: state.layout.recentVisibleSizes.rightPanelWidth
            }
          } : {
            layout: {
              ...state.layout,
              bottomPanelHeight: 0,
              rightPanelWidth: 0,
              recentVisibleSizes: getRecentVisibleSizes(state.layout)
            }
          };
        },
        { persistence: "session" }
      );
    },
    togglePanelPosition(position) {
      return store2.setState(
        (state) => {
          let nextPosition = position || (state.layout.panelPosition === "right" ? "bottom" : "right");
          return {
            layout: {
              ...state.layout,
              panelPosition: nextPosition,
              bottomPanelHeight: state.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: state.layout.recentVisibleSizes.rightPanelWidth
            }
          };
        },
        { persistence: "permanent" }
      );
    },
    toggleNav(nextState) {
      return store2.setState(
        (state) => {
          if (state.singleStory)
            return { layout: state.layout };
          let isNavShown = getIsNavShown(state), shouldShowNav = typeof nextState == "boolean" ? nextState : !isNavShown;
          return shouldShowNav === isNavShown ? { layout: state.layout } : shouldShowNav ? {
            layout: {
              ...state.layout,
              navSize: state.layout.recentVisibleSizes.navSize
            }
          } : {
            layout: {
              ...state.layout,
              navSize: 0,
              recentVisibleSizes: getRecentVisibleSizes(state.layout)
            }
          };
        },
        { persistence: "session" }
      );
    },
    toggleToolbar(toggled) {
      return store2.setState(
        (state) => {
          let value = typeof toggled < "u" ? toggled : !state.layout.showToolbar;
          return {
            layout: {
              ...state.layout,
              showToolbar: value
            }
          };
        },
        { persistence: "session" }
      );
    },
    setSizes({
      navSize,
      bottomPanelHeight,
      rightPanelWidth
    }) {
      return store2.setState(
        (state) => {
          let nextLayoutState = {
            ...state.layout,
            navSize: navSize ?? state.layout.navSize,
            bottomPanelHeight: bottomPanelHeight ?? state.layout.bottomPanelHeight,
            rightPanelWidth: rightPanelWidth ?? state.layout.rightPanelWidth
          };
          return {
            layout: {
              ...nextLayoutState,
              recentVisibleSizes: getRecentVisibleSizes(nextLayoutState)
            }
          };
        },
        { persistence: "session" }
      );
    },
    /**
     * Attempts to focus (and select) an element identified by its ID. It is the responsibility of
     * the callee to ensure that the element is present in the DOM and that no focus trap is
     * available. This API polls and attempts to perform the focus for a set duration (max 500ms),
     * so that race conditions can be avoided with the current API design. Because this API is
     * historically synchronous, it cannot report errors or failure to focus. It fails silently.
     *
     * @param elementId The id of the element to focus.
     * @param select Whether to call select() on the element after focusing it.
     */
    focusOnUIElement(elementId, select) {
      if (!elementId)
        return;
      let startTime = Date.now(), maxDuration = 500, pollInterval = 50, attemptFocus = () => {
        let element = document2.getElementById(elementId);
        return !element || (element.focus(), element !== document2.activeElement) ? !1 : (select && element.select?.(), !0);
      };
      if (attemptFocus())
        return;
      let intervalId = setInterval(() => {
        if (Date.now() - startTime >= maxDuration) {
          clearInterval(intervalId);
          return;
        }
        attemptFocus() && clearInterval(intervalId);
      }, pollInterval);
    },
    getInitialOptions() {
      let { theme, selectedPanel, layoutCustomisations, ...options } = provider.getConfig();
      return {
        ...defaultLayoutState,
        layout: {
          ...toMerged(
            defaultLayoutState.layout,
            pick(options, Object.keys(defaultLayoutState.layout))
          ),
          ...singleStory && { navSize: 0 }
        },
        layoutCustomisations: {
          ...defaultLayoutState.layoutCustomisations,
          ...layoutCustomisations ?? {}
        },
        ui: toMerged(defaultLayoutState.ui, pick(options, Object.keys(defaultLayoutState.ui))),
        selectedPanel: selectedPanel || defaultLayoutState.selectedPanel,
        theme: theme || defaultLayoutState.theme
      };
    },
    getIsFullscreen() {
      return getIsFullscreen(store2.getState());
    },
    getIsPanelShown() {
      return getIsPanelShown(store2.getState());
    },
    getIsNavShown() {
      return getIsNavShown(store2.getState());
    },
    getShowToolbarWithCustomisations(showToolbar) {
      let state = store2.getState();
      return isFunction(state.layoutCustomisations.showToolbar) ? state.layoutCustomisations.showToolbar(state, showToolbar) ?? showToolbar : showToolbar;
    },
    getShowPanelWithCustomisations(showPanel) {
      let state = store2.getState();
      return isFunction(state.layoutCustomisations.showPanel) ? state.layoutCustomisations.showPanel(state, showPanel) ?? showPanel : showPanel;
    },
    getNavSizeWithCustomisations(navSize) {
      let state = store2.getState();
      if (isFunction(state.layoutCustomisations.showSidebar)) {
        let shouldShowNav = state.layoutCustomisations.showSidebar(state, navSize !== 0);
        if (navSize === 0 && shouldShowNav === !0)
          return state.layout.recentVisibleSizes.navSize;
        if (navSize !== 0 && shouldShowNav === !1)
          return 0;
      }
      return navSize;
    },
    setOptions: (options) => {
      let { layout, ui, selectedPanel, theme } = store2.getState();
      if (!options)
        return;
      let updatedLayout = {
        ...layout,
        ...options.layout || {},
        ...pick(options, Object.keys(layout)),
        ...singleStory && { navSize: 0 }
      }, updatedUi = {
        ...ui,
        ...options.ui,
        ...toMerged(options.ui || {}, pick(options, Object.keys(ui)))
      }, updatedTheme = {
        ...theme,
        ...options.theme
      }, modification = {};
      isEqual(ui, updatedUi) || (modification.ui = updatedUi), isEqual(layout, updatedLayout) || (modification.layout = updatedLayout), options.selectedPanel && !isEqual(selectedPanel, options.selectedPanel) && (modification.selectedPanel = options.selectedPanel), Object.keys(modification).length && store2.setState(modification, { persistence: "permanent" }), isEqual(theme, updatedTheme) || store2.setState({ theme: updatedTheme });
    }
  }, persisted = pick(store2.getState(), ["layout", "selectedPanel"]);
  return provider.channel?.on(SET_CONFIG2, () => {
    api.setOptions(merge_default(api.getInitialOptions(), persisted));
  }), {
    api,
    state: merge_default(api.getInitialOptions(), persisted)
  };
};

// src/manager-api/modules/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  init: () => init6
});
var init6 = ({ store: store2 }) => ({
  api: {
    addNotification: (newNotification) => {
      store2.setState(({ notifications }) => {
        let [existing, others] = partition(notifications, (n) => n.id === newNotification.id);
        return existing.forEach((notification) => {
          notification.onClear && notification.onClear({ dismissed: !1, timeout: !1 });
        }), { notifications: [...others, newNotification] };
      });
    },
    clearNotification: (notificationId) => {
      store2.setState(({ notifications }) => {
        let [matching, others] = partition(notifications, (n) => n.id === notificationId);
        return matching.forEach((notification) => {
          notification.onClear && notification.onClear({ dismissed: !1, timeout: !1 });
        }), { notifications: others };
      });
    }
  },
  state: { notifications: [] }
});

// src/manager-api/modules/open-in-editor.tsx
var open_in_editor_exports = {};
__export(open_in_editor_exports, {
  init: () => init7
});
import React from "react";
import {
  OPEN_IN_EDITOR_REQUEST,
  OPEN_IN_EDITOR_RESPONSE
} from "storybook/internal/core-events";
import { FailedIcon } from "@storybook/icons";
var init7 = ({ provider, fullAPI }) => ({
  api: {
    openInEditor(payload) {
      return new Promise((resolve) => {
        let { file, line, column } = payload, handler = (res) => {
          res.file === file && res.line === line && res.column === column && (provider.channel?.off(OPEN_IN_EDITOR_RESPONSE, handler), resolve(res));
        };
        provider.channel?.on(OPEN_IN_EDITOR_RESPONSE, handler), provider.channel?.emit(OPEN_IN_EDITOR_REQUEST, payload);
      });
    }
  },
  state: { notifications: [] },
  init: async () => {
    let { color } = await import("../theming/index.js");
    provider.channel?.on(OPEN_IN_EDITOR_RESPONSE, (payload) => {
      payload.error !== null && fullAPI.addNotification({
        id: "open-in-editor-error",
        content: {
          headline: "Failed to open in editor",
          subHeadline: payload.error || "Check the Storybook process on the command line for more details."
        },
        icon: React.createElement(FailedIcon, { color: color.negative }),
        duration: 8e3
      });
    });
  }
});

// src/manager-api/modules/provider.ts
var provider_exports = {};
__export(provider_exports, {
  init: () => init8
});
var init8 = ({ provider, fullAPI }) => ({
  api: provider.renderPreview ? { renderPreview: provider.renderPreview } : {},
  state: {},
  init: () => {
    provider.handleAPI(fullAPI);
  }
});

// src/manager-api/modules/settings.ts
var settings_exports = {};
__export(settings_exports, {
  init: () => init9
});
var init9 = ({ store: store2, navigate, fullAPI }) => ({
  state: { settings: { lastTrackedStoryId: null } },
  api: {
    closeSettings: () => {
      let {
        settings: { lastTrackedStoryId }
      } = store2.getState();
      lastTrackedStoryId ? fullAPI.selectStory(lastTrackedStoryId) : fullAPI.selectFirstStory();
    },
    changeSettingsTab: (path) => {
      navigate(`/settings/${path}`);
    },
    isSettingsScreenActive: () => {
      let { path } = fullAPI.getUrlState();
      return !!(path || "").match(/^\/settings/);
    },
    retrieveSelection() {
      let { settings } = store2.getState();
      return settings.lastTrackedStoryId;
    },
    storeSelection: async () => {
      let { storyId, settings } = store2.getState();
      await store2.setState({
        settings: { ...settings, lastTrackedStoryId: storyId }
      });
    }
  }
});

// src/manager-api/modules/shortcuts.ts
var shortcuts_exports = {};
__export(shortcuts_exports, {
  controlOrMetaKey: () => controlOrMetaKey2,
  defaultShortcuts: () => defaultShortcuts,
  init: () => init10,
  isMacLike: () => isMacLike2,
  keys: () => keys
});
var import_copy_to_clipboard = __toESM(require_copy_to_clipboard(), 1);
import {
  FORCE_REMOUNT,
  PREVIEW_KEYDOWN,
  STORIES_COLLAPSE_ALL,
  STORIES_EXPAND_ALL
} from "storybook/internal/core-events";
import { global as global5 } from "@storybook/global";

// src/manager-api/lib/platform.ts
import { global as global4 } from "@storybook/global";
var { navigator: navigator2 } = global4, isMacLike = () => navigator2 && navigator2.platform ? !!navigator2.platform.match(/(Mac|iPhone|iPod|iPad)/i) : !1;

// src/manager-api/lib/shortcut.ts
var controlOrMetaSymbol = () => isMacLike() ? "\u2318" : "ctrl", controlOrMetaKey = () => isMacLike() ? "meta" : "control", optionOrAltSymbol = () => isMacLike() ? "\u2325" : "alt", isShortcutTaken = (arr1, arr2) => JSON.stringify(arr1) === JSON.stringify(arr2), eventToShortcut = (e) => {
  if (["Meta", "Alt", "Control", "Shift", "Tab"].includes(e.key))
    return null;
  let keys2 = [];
  e.altKey && keys2.push("alt"), e.ctrlKey && keys2.push("control"), e.metaKey && keys2.push("meta"), e.shiftKey && keys2.push("shift");
  let codeUpper = e.code?.toUpperCase(), codeToCharMap = {
    MINUS: "-",
    EQUAL: "=",
    BRACKETLEFT: "[",
    BRACKETRIGHT: "]",
    BACKSLASH: "\\",
    SEMICOLON: ";",
    QUOTE: "'",
    BACKQUOTE: "`",
    COMMA: ",",
    PERIOD: ".",
    SLASH: "/"
  }, codeChar = codeUpper ? codeUpper.startsWith("KEY") && codeUpper.length === 4 ? codeUpper.replace("KEY", "") : codeUpper.startsWith("DIGIT") ? codeUpper.replace("DIGIT", "") : codeToCharMap[codeUpper] : void 0;
  if (e.key && e.key.length === 1 && e.key !== " ") {
    let key = e.key.toUpperCase(), code = codeChar;
    code && code.length === 1 && code !== key ? keys2.push([key, code]) : keys2.push(key);
  } else e.key === "Dead" && codeChar && keys2.push(codeChar);
  return e.key === " " && keys2.push("space"), e.key === "Escape" && keys2.push("escape"), e.key === "ArrowRight" && keys2.push("ArrowRight"), e.key === "ArrowDown" && keys2.push("ArrowDown"), e.key === "ArrowUp" && keys2.push("ArrowUp"), e.key === "ArrowLeft" && keys2.push("ArrowLeft"), keys2.length > 0 ? keys2 : null;
}, shortcutMatchesShortcut = (inputShortcut, shortcut) => !inputShortcut || !shortcut || (inputShortcut.join("").startsWith("shift/") && inputShortcut.shift(), inputShortcut.length !== shortcut.length) ? !1 : !inputShortcut.find(
  (input, i) => Array.isArray(input) ? !input.includes(shortcut[i]) : input !== shortcut[i]
), eventMatchesShortcut = (e, shortcut) => shortcutMatchesShortcut(eventToShortcut(e), shortcut), keyToSymbol = (key) => key === "alt" ? optionOrAltSymbol() : key === "control" ? "\u2303" : key === "meta" ? "\u2318" : key === "shift" ? "\u21E7\u200B" : key === "Enter" || key === "Backspace" || key === "Esc" || key === "escape" ? "" : key === " " ? "SPACE" : key === "ArrowUp" ? "\u2191" : key === "ArrowDown" ? "\u2193" : key === "ArrowLeft" ? "\u2190" : key === "ArrowRight" ? "\u2192" : key?.toUpperCase(), shortcutToHumanString = (shortcut) => shortcut.map(keyToSymbol).join(" "), shortcutToAriaKeyshortcuts = (shortcut) => shortcut.map((shortcut2) => shortcut2 === "+" ? "plus" : shortcut2 === " " ? "space" : shortcut2).join("+");

// src/manager-api/modules/shortcuts.ts
var { navigator: navigator3, document: document3 } = global5, isMacLike2 = () => navigator3 && navigator3.platform ? !!navigator3.platform.match(/(Mac|iPhone|iPod|iPad)/i) : !1, controlOrMetaKey2 = () => isMacLike2() ? "meta" : "control";
function keys(o) {
  return Object.keys(o);
}
var defaultShortcuts = Object.freeze({
  fullScreen: ["alt", "F"],
  togglePanel: ["alt", "A"],
  panelPosition: ["alt", "D"],
  toggleNav: ["alt", "S"],
  toolbar: ["alt", "T"],
  search: [controlOrMetaKey2(), "K"],
  focusNav: ["1"],
  focusIframe: ["2"],
  focusPanel: ["3"],
  prevComponent: ["alt", "ArrowUp"],
  nextComponent: ["alt", "ArrowDown"],
  prevStory: ["alt", "ArrowLeft"],
  nextStory: ["alt", "ArrowRight"],
  shortcutsPage: [controlOrMetaKey2(), "shift", ","],
  aboutPage: [controlOrMetaKey2(), ","],
  escape: ["escape"],
  // This one is not customizable
  collapseAll: [controlOrMetaKey2(), "shift", "ArrowUp"],
  expandAll: [controlOrMetaKey2(), "shift", "ArrowDown"],
  remount: ["alt", "R"],
  openInEditor: ["alt", "shift", "E"],
  copyStoryLink: ["alt", "shift", "L"]
  // TODO: bring this back once we want to add shortcuts for this
  // copyStoryName: ['alt', 'shift', 'C'],
}), addonsShortcuts = {};
function shouldSkipShortcut(event) {
  let target = event.target;
  return !!(/input|textarea/i.test(target.tagName) || target.getAttribute("contenteditable") !== null || target.closest("dialog[open]"));
}
var init10 = ({ store: store2, fullAPI, provider }) => {
  let api = {
    // Getting and setting shortcuts
    getShortcutKeys() {
      return store2.getState().shortcuts;
    },
    getDefaultShortcuts() {
      return {
        ...defaultShortcuts,
        ...api.getAddonsShortcutDefaults()
      };
    },
    getAddonsShortcuts() {
      return addonsShortcuts;
    },
    getAddonsShortcutLabels() {
      let labels = {};
      return Object.entries(api.getAddonsShortcuts()).forEach(([actionName, { label }]) => {
        labels[actionName] = label;
      }), labels;
    },
    getAddonsShortcutDefaults() {
      let defaults = {};
      return Object.entries(api.getAddonsShortcuts()).forEach(([actionName, { defaultShortcut }]) => {
        defaults[actionName] = defaultShortcut;
      }), defaults;
    },
    async setShortcuts(shortcuts) {
      return await store2.setState({ shortcuts }, { persistence: "permanent" }), shortcuts;
    },
    async restoreAllDefaultShortcuts() {
      return api.setShortcuts(api.getDefaultShortcuts());
    },
    async setShortcut(action, value) {
      let shortcuts = api.getShortcutKeys();
      return await api.setShortcuts({ ...shortcuts, [action]: value }), value;
    },
    async setAddonShortcut(addon, shortcut) {
      let shortcuts = api.getShortcutKeys();
      return await api.setShortcuts({
        ...shortcuts,
        [`${addon}-${shortcut.actionName}`]: shortcut.defaultShortcut
      }), addonsShortcuts[`${addon}-${shortcut.actionName}`] = shortcut, shortcut;
    },
    async restoreDefaultShortcut(action) {
      let defaultShortcut = api.getDefaultShortcuts()[action];
      return api.setShortcut(action, defaultShortcut);
    },
    // Listening to shortcut events
    handleKeydownEvent(event) {
      let shortcut = eventToShortcut(event), shortcuts = api.getShortcutKeys(), matchedFeature = keys(shortcuts).find(
        (feature) => shortcutMatchesShortcut(shortcut, shortcuts[feature])
      );
      matchedFeature && api.handleShortcutFeature(matchedFeature, event);
    },
    // warning: event might not have a full prototype chain because it may originate from the channel
    handleShortcutFeature(feature, event) {
      let {
        ui: { enableShortcuts },
        storyId
      } = store2.getState();
      if (enableShortcuts)
        switch (event?.preventDefault && event.preventDefault(), feature) {
          case "escape": {
            fullAPI.getIsFullscreen() ? fullAPI.toggleFullscreen(!1) : fullAPI.getIsNavShown() && fullAPI.toggleNav(!0);
            break;
          }
          case "focusNav": {
            fullAPI.getIsFullscreen() && fullAPI.toggleFullscreen(!1), fullAPI.getIsNavShown() || fullAPI.toggleNav(!0), fullAPI.focusOnUIElement(focusableUIElements.storyListMenu);
            break;
          }
          case "search": {
            fullAPI.getIsFullscreen() && fullAPI.toggleFullscreen(!1), fullAPI.getIsNavShown() || fullAPI.toggleNav(!0), setTimeout(() => {
              fullAPI.focusOnUIElement(focusableUIElements.storySearchField, !0);
            }, 0);
            break;
          }
          case "focusIframe": {
            let element = document3.getElementById("storybook-preview-iframe");
            if (element)
              try {
                element.contentWindow.focus();
              } catch {
              }
            break;
          }
          case "focusPanel": {
            fullAPI.getIsFullscreen() && fullAPI.toggleFullscreen(!1), fullAPI.getIsPanelShown() || fullAPI.togglePanel(!0), fullAPI.focusOnUIElement(focusableUIElements.storyPanelRoot);
            break;
          }
          case "nextStory": {
            fullAPI.jumpToStory(1);
            break;
          }
          case "prevStory": {
            fullAPI.jumpToStory(-1);
            break;
          }
          case "nextComponent": {
            fullAPI.jumpToComponent(1);
            break;
          }
          case "prevComponent": {
            fullAPI.jumpToComponent(-1);
            break;
          }
          case "fullScreen": {
            fullAPI.toggleFullscreen();
            break;
          }
          case "togglePanel": {
            fullAPI.togglePanel();
            break;
          }
          case "toggleNav": {
            fullAPI.toggleNav();
            break;
          }
          case "toolbar": {
            fullAPI.toggleToolbar();
            break;
          }
          case "panelPosition": {
            fullAPI.getIsFullscreen() && fullAPI.toggleFullscreen(!1), fullAPI.getIsPanelShown() || fullAPI.togglePanel(!0), fullAPI.togglePanelPosition();
            break;
          }
          case "aboutPage": {
            fullAPI.navigate("/settings/about");
            break;
          }
          case "shortcutsPage": {
            fullAPI.navigate("/settings/shortcuts");
            break;
          }
          case "collapseAll": {
            fullAPI.emit(STORIES_COLLAPSE_ALL);
            break;
          }
          case "expandAll": {
            fullAPI.emit(STORIES_EXPAND_ALL);
            break;
          }
          case "remount": {
            fullAPI.emit(FORCE_REMOUNT, { storyId });
            break;
          }
          case "openInEditor": {
            global5.CONFIG_TYPE === "DEVELOPMENT" && fullAPI.openInEditor({
              file: fullAPI.getCurrentStoryData().importPath
            });
            break;
          }
          // TODO: bring this back once we want to add shortcuts for this
          // case 'copyStoryName': {
          //   const storyData = fullAPI.getCurrentStoryData();
          //   if (storyData.type === 'story') {
          //     copy(storyData.exportName);
          //   }
          //   break;
          // }
          case "copyStoryLink": {
            (0, import_copy_to_clipboard.default)(window.location.href);
            break;
          }
          default:
            addonsShortcuts[feature].action();
            break;
        }
    }
  }, { shortcuts: persistedShortcuts = defaultShortcuts } = store2.getState(), state = {
    // Any saved shortcuts that are still in our set of defaults
    shortcuts: keys(defaultShortcuts).reduce(
      (acc, key) => ({ ...acc, [key]: persistedShortcuts[key] || defaultShortcuts[key] }),
      defaultShortcuts
    )
  };
  return { api, state, init: () => {
    document3.addEventListener("keydown", (event) => {
      shouldSkipShortcut(event) || api.handleKeydownEvent(event);
    }), provider.channel?.on(PREVIEW_KEYDOWN, (data) => {
      api.handleKeydownEvent(data.event);
    });
  } };
};

// src/manager-api/modules/stories.ts
var stories_exports = {};
__export(stories_exports, {
  init: () => init11
});
import { logger as logger5 } from "storybook/internal/client-logger";
import {
  CONFIG_ERROR,
  CURRENT_STORY_WAS_SET,
  DOCS_PREPARED,
  PRELOAD_ENTRIES,
  RESET_STORY_ARGS,
  SELECT_STORY,
  SET_CONFIG as SET_CONFIG3,
  SET_CURRENT_STORY,
  SET_FILTER,
  SET_INDEX,
  SET_STORIES,
  STORY_ARGS_UPDATED,
  STORY_CHANGED,
  STORY_INDEX_INVALIDATED,
  STORY_MISSING,
  STORY_PREPARED,
  STORY_SPECIFIED,
  UPDATE_STORY_ARGS
} from "storybook/internal/core-events";
import { sanitize as sanitize2, toId } from "storybook/internal/csf";
import { global as global6 } from "@storybook/global";

// src/server-errors.ts
var import_picocolors = __toESM(require_picocolors_browser(), 1);
var StatusTypeIdMismatchError3 = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "CORE-SERVER" /* CORE_SERVER */,
      code: 16,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
};

// src/shared/status-store/index.ts
var UNIVERSAL_STATUS_STORE_OPTIONS = {
  id: "storybook/status",
  leader: !0,
  initialState: {}
}, StatusStoreEventType = {
  SELECT: "select"
};
function createStatusStore({
  universalStatusStore: universalStatusStore2,
  useUniversalStore: useUniversalStore2,
  environment
}) {
  let fullStatusStore2 = {
    getAll() {
      return universalStatusStore2.getState();
    },
    set(statuses) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let status of statuses) {
          let { storyId, typeId } = status;
          newState[storyId] = { ...newState[storyId] ?? {}, [typeId]: status };
        }
        return newState;
      });
    },
    onAllStatusChange(listener) {
      return universalStatusStore2.onStateChange((state, prevState) => {
        listener(state, prevState);
      });
    },
    onSelect(listener) {
      return universalStatusStore2.subscribe(StatusStoreEventType.SELECT, (event) => {
        listener(event.payload);
      });
    },
    selectStatuses: (statuses) => {
      universalStatusStore2.send({ type: StatusStoreEventType.SELECT, payload: statuses });
    },
    unset(storyIds) {
      if (!storyIds) {
        universalStatusStore2.setState({});
        return;
      }
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let storyId of storyIds)
          delete newState[storyId];
        return newState;
      });
    },
    typeId: void 0
  }, getStatusStoreByTypeId2 = (typeId) => ({
    getAll: fullStatusStore2.getAll,
    set(statuses) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let status of statuses) {
          let { storyId } = status;
          if (status.typeId !== typeId)
            switch (environment) {
              case "server":
                throw new StatusTypeIdMismatchError3({
                  status,
                  typeId
                });
              case "manager":
                throw new StatusTypeIdMismatchError({
                  status,
                  typeId
                });
              case "preview":
              default:
                throw new StatusTypeIdMismatchError2({
                  status,
                  typeId
                });
            }
          newState[storyId] = { ...newState[storyId] ?? {}, [typeId]: status };
        }
        return newState;
      });
    },
    onAllStatusChange: fullStatusStore2.onAllStatusChange,
    onSelect(listener) {
      return universalStatusStore2.subscribe(StatusStoreEventType.SELECT, (event) => {
        event.payload.some((status) => status.typeId === typeId) && listener(event.payload);
      });
    },
    unset(storyIds) {
      universalStatusStore2.setState((state) => {
        let newState = { ...state };
        for (let storyId in newState)
          if (newState[storyId]?.[typeId] && (!storyIds || storyIds?.includes(storyId))) {
            let { [typeId]: omittedStatus, ...storyStatusesWithoutTypeId } = newState[storyId];
            newState[storyId] = storyStatusesWithoutTypeId;
          }
        return newState;
      });
    },
    typeId
  });
  return useUniversalStore2 ? {
    getStatusStoreByTypeId: getStatusStoreByTypeId2,
    fullStatusStore: fullStatusStore2,
    universalStatusStore: universalStatusStore2,
    useStatusStore: (selector) => useUniversalStore2(universalStatusStore2, selector)[0]
  } : { getStatusStoreByTypeId: getStatusStoreByTypeId2, fullStatusStore: fullStatusStore2, universalStatusStore: universalStatusStore2 };
}

// src/shared/universal-store/use-universal-store-manager.ts
import * as React2 from "react";
var useUniversalStore = (universalStore, selector) => {
  let snapshotRef = React2.useRef(
    selector ? selector(universalStore.getState()) : universalStore.getState()
  ), subscribe = React2.useCallback(
    (listener) => universalStore.onStateChange((state2, previousState) => {
      if (!selector) {
        snapshotRef.current = state2, listener();
        return;
      }
      let selectedState = selector(state2), selectedPreviousState = selector(previousState);
      !isEqual(selectedState, selectedPreviousState) && (snapshotRef.current = selectedState, listener());
    }),
    [universalStore, selector]
  ), getSnapshot = React2.useCallback(() => {
    let currentState = universalStore.getState(), selectedState = selector ? selector(currentState) : currentState;
    return isEqual(selectedState, snapshotRef.current) || (snapshotRef.current = selectedState), snapshotRef.current;
  }, [universalStore, selector]);
  return [React2.useSyncExternalStore(subscribe, getSnapshot), universalStore.setState];
};

// src/manager-api/stores/status.ts
var statusStore = createStatusStore({
  universalStatusStore: UniversalStore.create({
    ...UNIVERSAL_STATUS_STORE_OPTIONS,
    leader: globalThis.CONFIG_TYPE === "PRODUCTION"
  }),
  useUniversalStore,
  environment: "manager"
}), { fullStatusStore, getStatusStoreByTypeId, useStatusStore, universalStatusStore } = statusStore;

// src/manager-api/modules/stories.ts
var { fetch: fetch2 } = global6, STORY_INDEX_PATH = "./index.json", removedOptions = ["enableShortcuts", "theme", "showRoots"];
function removeRemovedOptions(options) {
  if (!options || typeof options == "string")
    return options;
  let result = { ...options };
  return removedOptions.forEach((option) => {
    option in result && delete result[option];
  }), result;
}
var init11 = ({
  fullAPI,
  store: store2,
  navigate,
  provider,
  storyId: initialStoryId,
  viewMode: initialViewMode,
  docsOptions = {}
}) => {
  let api = {
    storyId: toId,
    getData: (storyId, refId) => {
      let result = api.resolveStory(storyId, refId);
      if (result?.type === "story" || result?.type === "docs")
        return result;
    },
    isPrepared: (storyId, refId) => {
      let data = api.getData(storyId, refId);
      return data ? data.type === "story" ? data.prepared : !0 : !1;
    },
    resolveStory: (storyId, refId) => {
      let { refs, index } = store2.getState();
      if (!(refId && !refs[refId]))
        return refId ? refs?.[refId]?.index?.[storyId] ?? void 0 : index ? index[storyId] : void 0;
    },
    getCurrentStoryData: () => {
      let { storyId, refId } = store2.getState();
      return api.getData(storyId, refId);
    },
    getIndex: () => {
      let { internal_index } = store2.getState();
      return internal_index;
    },
    getParameters: (storyIdOrCombo, parameterName) => {
      let { storyId, refId } = typeof storyIdOrCombo == "string" ? { storyId: storyIdOrCombo, refId: void 0 } : storyIdOrCombo, data = api.getData(storyId, refId);
      if (["story", "docs"].includes(data?.type)) {
        let { parameters } = data;
        if (parameters)
          return parameterName ? parameters[parameterName] : parameters;
      }
      return null;
    },
    getCurrentParameter: (parameterName) => {
      let { storyId, refId } = store2.getState();
      return api.getParameters({ storyId, refId }, parameterName) || void 0;
    },
    jumpToComponent: (direction) => {
      let { filteredIndex, storyId, refs, refId } = store2.getState();
      if (!api.getData(storyId, refId))
        return;
      let hash = refId ? refs[refId].filteredIndex || {} : filteredIndex;
      if (!hash)
        return;
      let result = api.findSiblingStoryId(storyId, hash, direction, !0);
      result && api.selectStory(result, void 0, { ref: refId });
    },
    jumpToStory: (direction) => {
      let { filteredIndex, storyId, refs, refId } = store2.getState(), story = api.getData(storyId, refId);
      if (!story)
        return;
      let hash = story.refId ? refs[story.refId].filteredIndex : filteredIndex;
      if (!hash)
        return;
      let result = api.findSiblingStoryId(storyId, hash, direction, !1);
      result && api.selectStory(result, void 0, { ref: refId });
    },
    selectFirstStory: () => {
      let { index } = store2.getState();
      if (!index)
        return;
      let firstStory = Object.keys(index).find((id) => index[id].type === "story");
      if (firstStory) {
        api.selectStory(firstStory);
        return;
      }
      navigate("/");
    },
    selectStory: (titleOrId = void 0, name = void 0, options = {}) => {
      let { ref } = options, { storyId, index, filteredIndex, refs, settings } = store2.getState(), gotoStory = (entry) => entry?.type === "docs" || entry?.type === "story" ? (store2.setState({ settings: { ...settings, lastTrackedStoryId: entry.id } }), navigate(`/${entry.type}/${entry.refId ? `${entry.refId}_${entry.id}` : entry.id}`), !0) : !1, kindSlug = storyId?.split("--", 2)[0], hash = ref ? refs[ref].index : index, filteredHash = ref ? refs[ref].filteredIndex : filteredIndex;
      if (!(!hash || !filteredHash))
        if (name)
          if (!titleOrId)
            gotoStory(hash[toId(kindSlug, name)]);
          else {
            let id = ref ? `${ref}_${toId(titleOrId, name)}` : toId(titleOrId, name);
            if (hash[id])
              gotoStory(hash[id]);
            else {
              let entry = hash[sanitize2(titleOrId)];
              if (entry?.type === "component") {
                let foundId = entry.children.find((childId) => hash[childId].name === name);
                gotoStory(foundId ? hash[foundId] : void 0);
              }
            }
          }
        else {
          let entry = titleOrId ? hash[titleOrId] || hash[sanitize2(titleOrId)] : hash[kindSlug];
          if (!entry)
            throw new Error(`Unknown id or title: '${titleOrId}'`);
          gotoStory(entry) || gotoStory(api.findLeafEntry(filteredHash, entry.id));
        }
    },
    findLeafEntry(index, storyId) {
      let entry = index[storyId];
      if (entry.type === "docs" || entry.type === "story")
        return entry;
      let childStoryId = entry.children.find((childId) => index[childId]) || entry.children[0];
      return api.findLeafEntry(index, childStoryId);
    },
    findLeafStoryId(index, storyId) {
      return api.findLeafEntry(index, storyId)?.id;
    },
    findAllLeafStoryIds(entryId) {
      let { index } = store2.getState();
      if (!index)
        return [];
      let findChildEntriesRecursively = (currentEntryId, results = []) => {
        let node = index[currentEntryId];
        return node && (node.type === "story" && results.push(node.id), "children" in node && node.children?.forEach((childId) => findChildEntriesRecursively(childId, results))), results;
      };
      return findChildEntriesRecursively(entryId, []);
    },
    findSiblingStoryId(storyId, index, direction, toSiblingGroup) {
      if (toSiblingGroup) {
        let lookupList2 = getComponentLookupList(index), position2 = lookupList2.findIndex((i) => i.includes(storyId));
        return position2 === lookupList2.length - 1 && direction > 0 || position2 === 0 && direction < 0 ? void 0 : lookupList2[position2 + direction] ? lookupList2[position2 + direction][0] : void 0;
      }
      let lookupList = getStoriesLookupList(index), position = lookupList.indexOf(storyId);
      if (!(position === lookupList.length - 1 && direction > 0) && !(position === 0 && direction < 0))
        return lookupList[position + direction];
    },
    updateStoryArgs: (story, updatedArgs) => {
      let { id: storyId, refId } = story;
      provider.channel?.emit(UPDATE_STORY_ARGS, {
        storyId,
        updatedArgs,
        options: { target: refId }
      });
    },
    resetStoryArgs: (story, argNames) => {
      let { id: storyId, refId } = story;
      provider.channel?.emit(RESET_STORY_ARGS, {
        storyId,
        argNames,
        options: { target: refId }
      });
    },
    fetchIndex: async () => {
      try {
        let result = await fetch2(STORY_INDEX_PATH);
        if (result.status !== 200)
          throw new Error(await result.text());
        let storyIndex = await result.json();
        if (storyIndex.v < 3) {
          logger5.warn(`Skipping story index with version v${storyIndex.v}, awaiting SET_STORIES.`);
          return;
        }
        await api.setIndex(storyIndex);
      } catch (err) {
        await store2.setState({ indexError: err });
      }
    },
    // The story index we receive on SET_INDEX is "prepared" in that it has parameters
    // The story index we receive on fetchStoryIndex is not, but all the prepared fields are optional
    // so we can cast one to the other easily enough
    setIndex: async (input) => {
      let { filteredIndex: oldFilteredHash, index: oldHash, filters } = store2.getState(), allStatuses = fullStatusStore.getAll(), newFilteredHash = transformStoryIndexToStoriesHash(input, {
        provider,
        docsOptions,
        filters,
        allStatuses
      }), newHash = transformStoryIndexToStoriesHash(input, {
        provider,
        docsOptions,
        filters: {},
        allStatuses
      });
      await store2.setState({
        internal_index: input,
        filteredIndex: addPreparedStories(newFilteredHash, oldFilteredHash),
        index: addPreparedStories(newHash, oldHash),
        indexError: void 0
      });
    },
    // FIXME: is there a bug where filtered stories get added back in on updateStory???
    updateStory: async (storyId, update2, ref) => {
      if (ref) {
        let { id: refId, index, filteredIndex } = ref;
        index[storyId] = {
          ...index[storyId],
          ...update2
        }, filteredIndex[storyId] = {
          ...filteredIndex[storyId],
          ...update2
        }, await fullAPI.updateRef(refId, { index, filteredIndex });
      } else {
        let { index, filteredIndex } = store2.getState();
        index && (index[storyId] = {
          ...index[storyId],
          ...update2
        }), filteredIndex && (filteredIndex[storyId] = {
          ...filteredIndex[storyId],
          ...update2
        }), (index || filteredIndex) && await store2.setState({ index, filteredIndex });
      }
    },
    updateDocs: async (docsId, update2, ref) => {
      if (ref) {
        let { id: refId, index, filteredIndex } = ref;
        index[docsId] = {
          ...index[docsId],
          ...update2
        }, filteredIndex[docsId] = {
          ...filteredIndex[docsId],
          ...update2
        }, await fullAPI.updateRef(refId, { index, filteredIndex });
      } else {
        let { index, filteredIndex } = store2.getState();
        index && (index[docsId] = {
          ...index[docsId],
          ...update2
        }), filteredIndex && (filteredIndex[docsId] = {
          ...filteredIndex[docsId],
          ...update2
        }), (index || filteredIndex) && await store2.setState({ index, filteredIndex });
      }
    },
    setPreviewInitialized: async (ref) => {
      ref ? fullAPI.updateRef(ref.id, { previewInitialized: !0 }) : store2.setState({ previewInitialized: !0 });
    },
    experimental_setFilter: async (id, filterFunction) => {
      await store2.setState({ filters: { ...store2.getState().filters, [id]: filterFunction } });
      let { internal_index: index } = store2.getState();
      if (!index)
        return;
      await api.setIndex(index);
      let refs = await fullAPI.getRefs();
      Object.entries(refs).forEach(([refId, { internal_index, ...ref }]) => {
        fullAPI.setRef(refId, { ...ref, storyIndex: internal_index }, !0);
      }), provider.channel?.emit(SET_FILTER, { id });
    }
  };
  provider.channel?.on(
    STORY_SPECIFIED,
    function({
      storyId,
      viewMode
    }) {
      let { sourceType } = getEventMetadata(this, fullAPI);
      if (sourceType === "local") {
        let state = store2.getState(), isCanvasRoute = state.path === "/" || state.viewMode === "story" || state.viewMode === "docs", stateHasSelection = state.viewMode && state.storyId, stateSelectionDifferent = state.viewMode !== viewMode || state.storyId !== storyId, { type } = state.index?.[state.storyId] || {};
        isCanvasRoute && (stateHasSelection && stateSelectionDifferent && !(type === "root" || type === "component" || type === "group") ? provider.channel?.emit(SET_CURRENT_STORY, {
          storyId: state.storyId,
          viewMode: state.viewMode
        }) : stateSelectionDifferent && navigate(`/${viewMode}/${storyId}`));
      }
    }
  ), provider.channel?.on(CURRENT_STORY_WAS_SET, function() {
    let { ref } = getEventMetadata(this, fullAPI);
    api.setPreviewInitialized(ref);
  }), provider.channel?.on(STORY_CHANGED, function() {
    let { sourceType } = getEventMetadata(this, fullAPI);
    if (sourceType === "local") {
      let options = api.getCurrentParameter("options");
      options && fullAPI.setOptions(removeRemovedOptions(options));
    }
  }), provider.channel?.on(
    STORY_PREPARED,
    function({ id, ...update2 }) {
      let { ref, sourceType } = getEventMetadata(this, fullAPI);
      if (api.updateStory(id, { ...update2, prepared: !0 }, ref), !ref && !store2.getState().hasCalledSetOptions) {
        let { options } = update2.parameters;
        fullAPI.setOptions(removeRemovedOptions(options)), store2.setState({ hasCalledSetOptions: !0 });
      }
      if (sourceType === "local") {
        let { storyId, index, refId } = store2.getState();
        if (!index)
          return;
        let toBePreloaded = Array.from(
          /* @__PURE__ */ new Set([
            api.findSiblingStoryId(storyId, index, 1, !0),
            api.findSiblingStoryId(storyId, index, -1, !0)
          ])
        ).filter(Boolean);
        provider.channel?.emit(PRELOAD_ENTRIES, {
          ids: toBePreloaded,
          options: { target: refId }
        });
      }
    }
  ), provider.channel?.on(
    DOCS_PREPARED,
    function({ id, ...update2 }) {
      let { ref } = getEventMetadata(this, fullAPI);
      api.updateStory(id, { ...update2, prepared: !0 }, ref);
    }
  ), provider.channel?.on(SET_INDEX, function(index) {
    let { ref } = getEventMetadata(this, fullAPI);
    if (ref)
      fullAPI.setRef(ref.id, { ...ref, storyIndex: index }, !0);
    else {
      api.setIndex(index);
      let options = api.getCurrentParameter("options");
      fullAPI.setOptions(removeRemovedOptions(options));
    }
  }), provider.channel?.on(SET_STORIES, function(data) {
    let { ref } = getEventMetadata(this, fullAPI), setStoriesData = data.v ? denormalizeStoryParameters(data) : data.stories;
    if (ref)
      fullAPI.setRef(ref.id, { ...ref, setStoriesData }, !0);
    else
      throw new Error("Cannot call SET_STORIES for local frame");
  }), provider.channel?.on(
    SELECT_STORY,
    function({
      kind,
      title = kind,
      story,
      name = story,
      storyId,
      ...rest
    }) {
      let { ref } = getEventMetadata(this, fullAPI);
      ref ? fullAPI.selectStory(storyId || title, name, { ...rest, ref: ref.id }) : fullAPI.selectStory(storyId || title, name, rest);
    }
  ), provider.channel?.on(
    STORY_ARGS_UPDATED,
    function({ storyId, args }) {
      let { ref } = getEventMetadata(this, fullAPI);
      api.updateStory(storyId, { args }, ref);
    }
  ), provider.channel?.on(CONFIG_ERROR, function(err) {
    let { ref } = getEventMetadata(this, fullAPI);
    api.setPreviewInitialized(ref);
  }), provider.channel?.on(STORY_MISSING, function(err) {
    let { ref } = getEventMetadata(this, fullAPI);
    api.setPreviewInitialized(ref);
  }), provider.channel?.on(SET_CONFIG3, () => {
    let config2 = provider.getConfig();
    config2?.sidebar?.filters && store2.setState({
      filters: {
        ...store2.getState().filters,
        ...config2?.sidebar?.filters
      }
    });
  }), fullStatusStore.onAllStatusChange(async () => {
    let { internal_index: index } = store2.getState();
    if (!index)
      return;
    await api.setIndex(index);
    let refs = await fullAPI.getRefs();
    Object.entries(refs).forEach(([refId, { internal_index, ...ref }]) => {
      fullAPI.setRef(refId, { ...ref, storyIndex: internal_index }, !0);
    });
  });
  let config = provider.getConfig();
  return {
    api,
    state: {
      storyId: initialStoryId,
      viewMode: initialViewMode,
      hasCalledSetOptions: !1,
      previewInitialized: !1,
      filters: config?.sidebar?.filters || {}
    },
    init: async () => {
      provider.channel?.on(STORY_INDEX_INVALIDATED, () => api.fetchIndex()), await api.fetchIndex();
    }
  };
};

// src/manager-api/modules/url.ts
var url_exports = {};
__export(url_exports, {
  init: () => init12
});
import {
  GLOBALS_UPDATED as GLOBALS_UPDATED2,
  NAVIGATE_URL,
  SET_CURRENT_STORY as SET_CURRENT_STORY2,
  STORY_ARGS_UPDATED as STORY_ARGS_UPDATED2,
  UPDATE_QUERY_PARAMS
} from "storybook/internal/core-events";
import { buildArgsParam, queryFromLocation } from "storybook/internal/router";
import { global as global7 } from "@storybook/global";
var { window: globalWindow } = global7, parseBoolean = (value) => {
  if (value === "true" || value === "1")
    return !0;
  if (value === "false" || value === "0")
    return !1;
}, prevParams, initialUrlSupport = ({
  state: { location: location2, path, viewMode, storyId: storyIdFromUrl },
  singleStory
}) => {
  let {
    full,
    panel,
    nav,
    shortcuts,
    addonPanel,
    tabs,
    path: queryPath,
    ...otherParams
    // the rest gets passed to the iframe
  } = queryFromLocation(location2), navSize, bottomPanelHeight, rightPanelWidth;
  parseBoolean(full) === !0 ? (navSize = 0, bottomPanelHeight = 0, rightPanelWidth = 0) : parseBoolean(full) === !1 && (navSize = defaultLayoutState.layout.navSize, bottomPanelHeight = defaultLayoutState.layout.bottomPanelHeight, rightPanelWidth = defaultLayoutState.layout.rightPanelWidth), singleStory || (parseBoolean(nav) === !0 && (navSize = defaultLayoutState.layout.navSize), parseBoolean(nav) === !1 && (navSize = 0)), parseBoolean(panel) === !1 && (bottomPanelHeight = 0, rightPanelWidth = 0);
  let layout = {
    navSize,
    bottomPanelHeight,
    rightPanelWidth,
    panelPosition: ["right", "bottom"].includes(panel) ? panel : void 0,
    showTabs: parseBoolean(tabs)
  }, ui = {
    enableShortcuts: parseBoolean(shortcuts)
  }, selectedPanel = addonPanel || void 0, storyId = storyIdFromUrl, customQueryParams = dequal(prevParams, otherParams) ? prevParams : otherParams;
  return prevParams = customQueryParams, { viewMode, layout, ui, selectedPanel, location: location2, path, customQueryParams, storyId };
}, init12 = (moduleArgs) => {
  let { store: store2, navigate, provider, fullAPI } = moduleArgs, navigateTo = (path, queryParams = {}, options = {}) => {
    let params = Object.entries(queryParams).filter(([, v]) => v).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v}`), to = [path, ...params].join("&");
    return navigate(to, options);
  }, api = {
    getQueryParam(key) {
      let { customQueryParams } = store2.getState();
      return customQueryParams ? customQueryParams[key] : void 0;
    },
    getUrlState() {
      let { location: location2, path, customQueryParams, storyId, url, viewMode } = store2.getState();
      return {
        path,
        hash: location2.hash ?? "",
        queryParams: customQueryParams,
        storyId,
        url,
        viewMode
      };
    },
    setQueryParams(input) {
      let { customQueryParams } = store2.getState(), queryParams = {}, update2 = {
        ...customQueryParams,
        ...Object.entries(input).reduce((acc, [key, value]) => (value !== null && (acc[key] = value), acc), queryParams)
      };
      dequal(customQueryParams, update2) || (store2.setState({ customQueryParams: update2 }), provider.channel?.emit(UPDATE_QUERY_PARAMS, update2));
    },
    applyQueryParams(input, options) {
      let { path, hash = "", queryParams } = api.getUrlState();
      navigateTo(`${path}${hash}`, { ...queryParams, ...input }, options), api.setQueryParams(input);
    },
    navigateUrl(url, options) {
      navigate(url, { plain: !0, ...options });
    }
  }, updateArgsParam = () => {
    let { path, hash = "", queryParams, viewMode } = api.getUrlState();
    if (viewMode !== "story")
      return;
    let currentStory = fullAPI.getCurrentStoryData();
    if (currentStory?.type !== "story")
      return;
    let { args, initialArgs } = currentStory, argsString = buildArgsParam(initialArgs, args);
    navigateTo(`${path}${hash}`, { ...queryParams, args: argsString }, { replace: !0 }), api.setQueryParams({ args: argsString });
  };
  provider.channel?.on(SET_CURRENT_STORY2, () => updateArgsParam());
  let handleOrId;
  return provider.channel?.on(STORY_ARGS_UPDATED2, () => {
    "requestIdleCallback" in globalWindow ? (handleOrId && globalWindow.cancelIdleCallback(handleOrId), handleOrId = globalWindow.requestIdleCallback(updateArgsParam, { timeout: 1e3 })) : (handleOrId && clearTimeout(handleOrId), setTimeout(updateArgsParam, 100));
  }), provider.channel?.on(GLOBALS_UPDATED2, ({ userGlobals, initialGlobals }) => {
    let { path, hash = "", queryParams } = api.getUrlState(), globalsString = buildArgsParam(initialGlobals, userGlobals);
    navigateTo(`${path}${hash}`, { ...queryParams, globals: globalsString }, { replace: !0 }), api.setQueryParams({ globals: globalsString });
  }), provider.channel?.on(NAVIGATE_URL, (url, options) => {
    api.navigateUrl(url, options);
  }), {
    api,
    state: initialUrlSupport(moduleArgs)
  };
};

// src/manager-api/modules/versions.ts
var versions_exports = {};
__export(versions_exports, {
  init: () => init13
});
var import_memoizerific2 = __toESM(require_memoizerific(), 1);
import { global as global8 } from "@storybook/global";
import semver from "semver";

// src/manager-api/version.ts
var version = "10.1.11";

// src/manager-api/modules/versions.ts
var { VERSIONCHECK } = global8, getVersionCheckData = (0, import_memoizerific2.default)(1)(() => {
  try {
    return { ...JSON.parse(VERSIONCHECK).data || {} };
  } catch {
    return {};
  }
}), normalizeRendererName = (renderer) => renderer.includes("vue") ? "vue" : renderer, init13 = ({ store: store2 }) => {
  let { dismissedVersionNotification } = store2.getState(), state = {
    versions: {
      current: {
        version
      },
      ...getVersionCheckData()
    },
    dismissedVersionNotification
  }, api = {
    getCurrentVersion: () => {
      let {
        versions: { current }
      } = store2.getState();
      return current;
    },
    getLatestVersion: () => {
      let {
        versions: { latest, next, current }
      } = store2.getState();
      return current && semver.prerelease(current.version) && next ? latest && semver.gt(latest.version, next.version) ? latest : next : latest;
    },
    // TODO: Move this to it's own "info" module later
    getDocsUrl: ({ asset, subpath = asset, versioned, renderer, ref = "ui" }) => {
      let { versions } = store2.getState(), latestVersion = versions.latest?.version, currentVersion = versions.current?.version, activeVersion = currentVersion?.startsWith("0.0.0") && latestVersion || currentVersion, url = `https://storybook.js.org/${asset ? "docs-assets" : "docs"}/`;
      if (asset && activeVersion)
        url += `${semver.major(activeVersion)}.${semver.minor(activeVersion)}/`;
      else if (versioned && activeVersion && latestVersion) {
        let versionDiff = semver.diff(latestVersion, activeVersion);
        versionDiff === "patch" || versionDiff === null || (url += `${semver.major(activeVersion)}.${semver.minor(activeVersion)}/`);
      }
      let [cleanedSubpath, hash] = subpath?.split("#") || [];
      if (cleanedSubpath && (url += asset ? cleanedSubpath : `${cleanedSubpath}/`), renderer && typeof global8.STORYBOOK_RENDERER < "u") {
        let rendererName = global8.STORYBOOK_RENDERER;
        rendererName && (url += `?renderer=${normalizeRendererName(rendererName)}`);
      }
      return ref && (url += `${url.includes("?") ? "&" : "?"}ref=${ref}`), hash && (url += `#${hash}`), url;
    },
    versionUpdateAvailable: () => {
      let latest = api.getLatestVersion(), current = api.getCurrentVersion();
      if (latest) {
        if (!latest.version || !current.version)
          return !0;
        let actualCurrent = !!semver.prerelease(current.version) ? `${semver.major(current.version)}.${semver.minor(current.version)}.${semver.patch(
          current.version
        )}` : current.version, diff = semver.diff(actualCurrent, latest.version);
        return semver.gt(latest.version, actualCurrent) && diff !== "patch" && !diff.includes("pre");
      }
      return !1;
    }
  };
  return { init: async () => {
    let { versions = {} } = store2.getState(), { latest, next } = getVersionCheckData();
    await store2.setState({
      versions: { ...versions, latest, next }
    });
  }, state, api };
};

// src/manager-api/modules/whatsnew.tsx
var whatsnew_exports = {};
__export(whatsnew_exports, {
  init: () => init14
});
import React3 from "react";
import {
  REQUEST_WHATS_NEW_DATA,
  RESULT_WHATS_NEW_DATA,
  SET_WHATS_NEW_CACHE,
  TOGGLE_WHATS_NEW_NOTIFICATIONS
} from "storybook/internal/core-events";
import { global as global9 } from "@storybook/global";
var WHATS_NEW_NOTIFICATION_ID = "whats-new", StorybookIcon = ({ color = "currentColor", size = 14 }) => React3.createElement(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 14 14",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  },
  React3.createElement(
    "path",
    {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M2.042.616a.704.704 0 00-.66.729L1.816 12.9c.014.367.306.66.672.677l9.395.422h.032a.704.704 0 00.704-.703V.704c0-.015 0-.03-.002-.044a.704.704 0 00-.746-.659l-.773.049.057 1.615a.105.105 0 01-.17.086l-.52-.41-.617.468a.105.105 0 01-.168-.088L9.746.134 2.042.616zm8.003 4.747c-.247.192-2.092.324-2.092.05.04-1.045-.429-1.091-.689-1.091-.247 0-.662.075-.662.634 0 .57.607.893 1.32 1.27 1.014.538 2.24 1.188 2.24 2.823 0 1.568-1.273 2.433-2.898 2.433-1.676 0-3.141-.678-2.976-3.03.065-.275 2.197-.21 2.197 0-.026.971.195 1.256.753 1.256.43 0 .624-.236.624-.634 0-.602-.633-.958-1.361-1.367-.987-.554-2.148-1.205-2.148-2.7 0-1.494 1.027-2.489 2.86-2.489 1.832 0 2.832.98 2.832 2.845z",
      fill: color
    }
  )
), init14 = ({ fullAPI, store: store2, provider }) => {
  let state = {
    whatsNewData: void 0
  };
  function setWhatsNewState(newState) {
    store2.setState({ whatsNewData: newState }), state.whatsNewData = newState;
  }
  let api = {
    isWhatsNewUnread() {
      return state.whatsNewData?.status === "SUCCESS" && !state.whatsNewData.postIsRead;
    },
    whatsNewHasBeenRead() {
      state.whatsNewData?.status === "SUCCESS" && (setWhatsNewCache({ lastReadPost: state.whatsNewData.url }), setWhatsNewState({ ...state.whatsNewData, postIsRead: !0 }), fullAPI.clearNotification(WHATS_NEW_NOTIFICATION_ID));
    },
    toggleWhatsNewNotifications() {
      state.whatsNewData?.status === "SUCCESS" && (setWhatsNewState({
        ...state.whatsNewData,
        disableWhatsNewNotifications: !state.whatsNewData.disableWhatsNewNotifications
      }), provider.channel?.emit(TOGGLE_WHATS_NEW_NOTIFICATIONS, {
        disableWhatsNewNotifications: state.whatsNewData.disableWhatsNewNotifications
      }));
    }
  };
  function getLatestWhatsNewPost() {
    return provider.channel?.emit(REQUEST_WHATS_NEW_DATA), new Promise(
      (resolve) => provider.channel?.once(
        RESULT_WHATS_NEW_DATA,
        ({ data }) => resolve(data)
      )
    );
  }
  function setWhatsNewCache(cache) {
    provider.channel?.emit(SET_WHATS_NEW_CACHE, cache);
  }
  return { init: async () => {
    if (global9.CONFIG_TYPE !== "DEVELOPMENT")
      return;
    let whatsNewData = await getLatestWhatsNewPost();
    setWhatsNewState(whatsNewData);
    let urlState = fullAPI.getUrlState();
    !(urlState?.path === "/onboarding" || urlState.queryParams?.onboarding === "true") && whatsNewData.status === "SUCCESS" && !whatsNewData.disableWhatsNewNotifications && whatsNewData.showNotification && fullAPI.addNotification({
      id: WHATS_NEW_NOTIFICATION_ID,
      link: "/settings/whats-new",
      content: {
        headline: whatsNewData.title,
        subHeadline: "Learn what's new in Storybook"
      },
      icon: React3.createElement(StorybookIcon, null),
      onClear({ dismissed }) {
        dismissed && setWhatsNewCache({ lastDismissedPost: whatsNewData.url });
      }
    });
  }, state, api };
};

// src/manager-api/store.ts
var import_store2 = __toESM(require_store2(), 1);

// src/manager-api/lib/store-setup.ts
var store_setup_default = (_) => {
  _.fn("set", function(key, data) {
    return _.set(
      // @ts-expect-error('this' implicitly has type 'any')
      this._area,
      // @ts-expect-error('this' implicitly has type 'any')
      this._in(key),
      stringify(data, { maxDepth: 50 })
    );
  }), _.fn("get", function(key, alt) {
    let value = _.get(this._area, this._in(key));
    return value !== null ? parse(value) : alt || value;
  });
};

// src/manager-api/store.ts
store_setup_default(import_store2.default._);
var STORAGE_KEY = "@storybook/manager/store";
function get(storage) {
  return storage.get(STORAGE_KEY) || {};
}
function set(storage, value) {
  return storage.set(STORAGE_KEY, value);
}
function update(storage, patch) {
  let previous = get(storage);
  return set(storage, { ...previous, ...patch });
}
var Store = class {
  constructor({ setState, getState }) {
    this.upstreamSetState = setState, this.upstreamGetState = getState;
  }
  // The assumption is that this will be called once, to initialize the React state
  // when the module is instantiated
  getInitialState(base) {
    return { ...base, ...get(import_store2.default.local), ...get(import_store2.default.session) };
  }
  getState() {
    return this.upstreamGetState();
  }
  async setState(inputPatch, cbOrOptions, inputOptions) {
    let callback, options;
    typeof cbOrOptions == "function" ? (callback = cbOrOptions, options = inputOptions) : options = cbOrOptions;
    let { persistence = "none" } = options || {}, patch = {}, delta = {};
    typeof inputPatch == "function" ? patch = (state) => (delta = inputPatch(state), delta) : (patch = inputPatch, delta = patch);
    let newState = await new Promise((resolve) => {
      this.upstreamSetState(patch, () => {
        resolve(this.getState());
      });
    });
    if (persistence !== "none") {
      let storage = persistence === "session" ? import_store2.default.session : import_store2.default.local;
      await update(storage, delta);
    }
    return callback && callback(newState), newState;
  }
};

// src/manager-api/lib/request-response.ts
var RequestResponseError = class extends Error {
  constructor(message, payload) {
    super(message);
    this.payload = void 0;
    this.payload = payload;
  }
}, experimental_requestResponse = (channel, requestEvent, responseEvent, payload, timeout = 5e3) => {
  let timeoutId;
  return new Promise((resolve, reject) => {
    let request = {
      id: Math.random().toString(16).slice(2),
      payload
    }, responseHandler = (response) => {
      response.id === request.id && (clearTimeout(timeoutId), channel.off(responseEvent, responseHandler), response.success ? resolve(response.payload) : reject(new RequestResponseError(response.error, response.payload)));
    };
    channel.emit(requestEvent, request), channel.on(responseEvent, responseHandler), timeoutId = setTimeout(() => {
      channel.off(responseEvent, responseHandler), reject(new RequestResponseError("Timed out waiting for response"));
    }, timeout);
  });
};

// src/manager-api/root.tsx
var { ActiveTabs: ActiveTabs2 } = layout_exports;
var ManagerContext = createContext({ api: void 0, state: initial_state_default({}) }), combineParameters = (...parameterSets) => noArrayMerge({}, ...parameterSets), ManagerProvider = class extends Component {
  constructor(props) {
    super(props);
    this.api = {};
    this.initModules = () => {
      this.modules.forEach((module) => {
        "init" in module && module.init();
      });
    };
    let {
      location: location2,
      path,
      refId,
      viewMode = props.docsOptions.docsMode ? "docs" : props.viewMode,
      singleStory,
      storyId,
      docsOptions,
      navigate
    } = props, store2 = new Store({
      getState: () => this.state,
      setState: (stateChange, callback) => (this.setState(stateChange, () => callback(this.state)), this.state)
    }), routeData = { location: location2, path, viewMode, singleStory, storyId, refId }, optionsData = { docsOptions };
    this.state = store2.getInitialState(initial_state_default({ ...routeData, ...optionsData }));
    let apiData = {
      navigate,
      store: store2,
      provider: props.provider
    };
    this.modules = [
      provider_exports,
      channel_exports,
      addons_exports,
      layout_exports,
      notifications_exports,
      settings_exports,
      shortcuts_exports,
      stories_exports,
      refs_exports,
      globals_exports,
      url_exports,
      versions_exports,
      whatsnew_exports,
      open_in_editor_exports
    ].map(
      (m) => m.init({ ...routeData, ...optionsData, ...apiData, state: this.state, fullAPI: this.api })
    );
    let state = initial_state_default(this.state, ...this.modules.map((m) => m.state)), api = Object.assign(this.api, { navigate }, ...this.modules.map((m) => m.api));
    this.state = state, this.api = api;
  }
  static getDerivedStateFromProps(props, state) {
    return state.path !== props.path ? {
      ...state,
      location: props.location,
      path: props.path,
      refId: props.refId,
      viewMode: props.viewMode,
      storyId: props.storyId
    } : null;
  }
  shouldComponentUpdate(nextProps, nextState) {
    let prevProps = this.props, prevState = this.state;
    return prevProps.path !== nextProps.path || !isEqual(prevState, nextState);
  }
  render() {
    let { children } = this.props, value = {
      state: this.state,
      api: this.api
    };
    return React4.createElement(EffectOnMount, { effect: this.initModules }, React4.createElement(ManagerContext.Provider, { value }, React4.createElement(ManagerConsumer, null, children)));
  }
};
ManagerProvider.displayName = "Manager";
var EffectOnMount = ({ children, effect }) => (React4.useEffect(effect, []), children), defaultFilter = (c) => c;
function ManagerConsumer({
  // @ts-expect-error (Converted from ts-ignore)
  filter = defaultFilter,
  children
}) {
  let managerContext = useContext(ManagerContext), renderer = useRef2(children), filterer = useRef2(filter);
  if (typeof renderer.current != "function")
    return React4.createElement(Fragment, null, renderer.current);
  let comboData = filterer.current(managerContext), comboDataArray = useMemo(() => [...Object.entries(comboData).reduce((acc, keyval) => acc.concat(keyval), [])], [managerContext.state]);
  return useMemo(() => {
    let Child = renderer.current;
    return React4.createElement(Child, { ...comboData });
  }, comboDataArray);
}
function useStorybookState() {
  let { state } = useContext(ManagerContext);
  return state;
}
function useStorybookApi() {
  let { api } = useContext(ManagerContext);
  return api;
}
function orDefault(fromStore, defaultState) {
  return typeof fromStore > "u" ? defaultState : fromStore;
}
var useChannel = (eventMap, deps = []) => {
  let api = useStorybookApi();
  return useEffect(() => (Object.entries(eventMap).forEach(([type, listener]) => api.on(type, listener)), () => {
    Object.entries(eventMap).forEach(([type, listener]) => api.off(type, listener));
  }), deps), api.emit;
};
function useStoryPrepared(storyId) {
  return useStorybookApi().isPrepared(storyId);
}
function useParameter(parameterKey, defaultValue) {
  let api = useStorybookApi(), [parameter, setParameter] = useState(api.getCurrentParameter(parameterKey)), handleParameterChange = useCallback2(() => {
    let newParameter = api.getCurrentParameter(parameterKey);
    setParameter(newParameter);
  }, [api, parameterKey]);
  return useChannel(
    {
      [STORY_PREPARED2]: handleParameterChange,
      [DOCS_PREPARED2]: handleParameterChange
    },
    [handleParameterChange]
  ), orDefault(parameter, defaultValue);
}
globalThis.STORYBOOK_ADDON_STATE = {};
var { STORYBOOK_ADDON_STATE } = globalThis;
function useSharedState(stateId, defaultState) {
  let api = useStorybookApi(), existingState = api.getAddonState(stateId) || STORYBOOK_ADDON_STATE[stateId], state = orDefault(
    existingState,
    STORYBOOK_ADDON_STATE[stateId] ? STORYBOOK_ADDON_STATE[stateId] : defaultState
  ), quicksync = !1;
  state === defaultState && defaultState !== void 0 && (STORYBOOK_ADDON_STATE[stateId] = defaultState, quicksync = !0), useEffect(() => {
    quicksync && api.setAddonState(stateId, defaultState);
  }, [quicksync]);
  let setState = useCallback2(
    async (s, options) => {
      await api.setAddonState(stateId, s, options);
      let result = api.getAddonState(stateId);
      return STORYBOOK_ADDON_STATE[stateId] = result, result;
    },
    [api, stateId]
  ), allListeners = useMemo(() => {
    let stateChangeHandlers = {
      [`${SHARED_STATE_CHANGED}-client-${stateId}`]: setState,
      [`${SHARED_STATE_SET}-client-${stateId}`]: setState
    }, stateInitializationHandlers = {
      [SET_STORIES2]: async () => {
        let currentState = api.getAddonState(stateId);
        currentState ? (STORYBOOK_ADDON_STATE[stateId] = currentState, api.emit(`${SHARED_STATE_SET}-manager-${stateId}`, currentState)) : STORYBOOK_ADDON_STATE[stateId] ? (await setState(STORYBOOK_ADDON_STATE[stateId]), api.emit(`${SHARED_STATE_SET}-manager-${stateId}`, STORYBOOK_ADDON_STATE[stateId])) : defaultState !== void 0 && (await setState(defaultState), STORYBOOK_ADDON_STATE[stateId] = defaultState, api.emit(`${SHARED_STATE_SET}-manager-${stateId}`, defaultState));
      },
      [STORY_CHANGED2]: () => {
        let currentState = api.getAddonState(stateId);
        currentState !== void 0 && api.emit(`${SHARED_STATE_SET}-manager-${stateId}`, currentState);
      }
    };
    return {
      ...stateChangeHandlers,
      ...stateInitializationHandlers
    };
  }, [stateId]), emit = useChannel(allListeners), stateSetter = useCallback2(
    async (newStateOrMerger, options) => {
      await setState(newStateOrMerger, options);
      let result = api.getAddonState(stateId);
      emit(`${SHARED_STATE_CHANGED}-manager-${stateId}`, result);
    },
    [api, emit, setState, stateId]
  );
  return [state, stateSetter];
}
function useAddonState(addonId, defaultState) {
  return useSharedState(addonId, defaultState);
}
function useArgs() {
  let { getCurrentStoryData, updateStoryArgs, resetStoryArgs } = useStorybookApi(), data = getCurrentStoryData(), args = data?.type === "story" ? data.args : {}, initialArgs = data?.type === "story" ? data.initialArgs : {}, updateArgs = useCallback2(
    (newArgs) => updateStoryArgs(data, newArgs),
    [data, updateStoryArgs]
  ), resetArgs = useCallback2(
    (argNames) => resetStoryArgs(data, argNames),
    [data, resetStoryArgs]
  );
  return [args, updateArgs, resetArgs, initialArgs];
}
function useGlobals() {
  let api = useStorybookApi();
  return [api.getGlobals(), api.updateGlobals, api.getStoryGlobals(), api.getUserGlobals()];
}
function useGlobalTypes() {
  return useStorybookApi().getGlobalTypes();
}
function useCurrentStory() {
  let { getCurrentStoryData } = useStorybookApi();
  return getCurrentStoryData();
}
function useArgTypes() {
  let current = useCurrentStory();
  return current?.type === "story" && current.argTypes || {};
}
var typesX = Addon_TypesEnum;

// src/shared/universal-store/mock.ts
import { Channel as Channel2 } from "storybook/internal/channels";
var MockUniversalStore = class _MockUniversalStore extends UniversalStore {
  constructor(options, testUtils) {
    UniversalStore.isInternalConstructing = !0, super(
      { ...options, leader: !0 },
      { channel: new Channel2({}), environment: UniversalStore.Environment.MOCK }
    ), UniversalStore.isInternalConstructing = !1, typeof testUtils?.fn == "function" && (this.testUtils = testUtils, this.getState = testUtils.fn(this.getState), this.setState = testUtils.fn(this.setState), this.subscribe = testUtils.fn(this.subscribe), this.onStateChange = testUtils.fn(this.onStateChange), this.send = testUtils.fn(this.send));
  }
  /** Create a mock universal store. This is just an alias for the constructor */
  static create(options, testUtils) {
    return new _MockUniversalStore(options, testUtils);
  }
  unsubscribeAll() {
    if (!this.testUtils)
      throw new Error(
        dedent`Cannot call unsubscribeAll on a store that does not have testUtils.
        Please provide testUtils as the second argument when creating the store.`
      );
    let callReturnedUnsubscribeFn = (result) => {
      try {
        result.value();
      } catch {
      }
    };
    this.subscribe.mock?.results.forEach(callReturnedUnsubscribeFn), this.onStateChange.mock?.results.forEach(callReturnedUnsubscribeFn);
  }
};

// src/shared/test-provider-store/index.ts
var UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS = {
  id: "storybook/test-provider",
  leader: !0,
  initialState: {}
};
function createTestProviderStore({
  universalTestProviderStore: universalTestProviderStore2,
  useUniversalStore: useUniversalStore2
}) {
  let baseStore = {
    settingsChanged: () => {
      universalTestProviderStore2.untilReady().then(() => {
        universalTestProviderStore2.send({ type: "settings-changed" });
      });
    },
    onRunAll: (listener) => universalTestProviderStore2.subscribe("run-all", listener),
    onClearAll: (listener) => universalTestProviderStore2.subscribe("clear-all", listener)
  }, fullTestProviderStore2 = {
    ...baseStore,
    getFullState: universalTestProviderStore2.getState,
    setFullState: universalTestProviderStore2.setState,
    onSettingsChanged: (listener) => universalTestProviderStore2.subscribe("settings-changed", listener),
    runAll: async () => {
      await universalTestProviderStore2.untilReady(), universalTestProviderStore2.send({ type: "run-all" });
    },
    clearAll: async () => {
      await universalTestProviderStore2.untilReady(), universalTestProviderStore2.send({ type: "clear-all" });
    }
  }, getTestProviderStoreById2 = (testProviderId) => {
    let getStateForTestProvider = () => universalTestProviderStore2.getState()[testProviderId] ?? "test-provider-state:pending", setStateForTestProvider = (state) => {
      universalTestProviderStore2.untilReady().then(() => {
        universalTestProviderStore2.setState((currentState) => ({
          ...currentState,
          [testProviderId]: state
        }));
      });
    };
    return {
      ...baseStore,
      testProviderId,
      getState: getStateForTestProvider,
      setState: setStateForTestProvider,
      runWithState: async (callback) => {
        setStateForTestProvider("test-provider-state:running");
        try {
          await callback(), setStateForTestProvider("test-provider-state:succeeded");
        } catch {
          setStateForTestProvider("test-provider-state:crashed");
        }
      }
    };
  };
  return useUniversalStore2 ? {
    getTestProviderStoreById: getTestProviderStoreById2,
    fullTestProviderStore: fullTestProviderStore2,
    universalTestProviderStore: universalTestProviderStore2,
    useTestProviderStore: (selector) => useUniversalStore2(universalTestProviderStore2, selector)[0]
  } : {
    getTestProviderStoreById: getTestProviderStoreById2,
    fullTestProviderStore: fullTestProviderStore2,
    universalTestProviderStore: universalTestProviderStore2
  };
}

// src/manager-api/stores/test-provider.ts
var testProviderStore = createTestProviderStore({
  universalTestProviderStore: UniversalStore.create({
    ...UNIVERSAL_TEST_PROVIDER_STORE_OPTIONS,
    leader: globalThis.CONFIG_TYPE === "PRODUCTION"
  }),
  useUniversalStore
}), {
  fullTestProviderStore,
  getTestProviderStoreById,
  useTestProviderStore,
  universalTestProviderStore
} = testProviderStore;

// src/shared/checklist-store/checklistData.state.ts
var initialState = {
  items: {
    accessibilityTests: { status: "open" },
    autodocs: { status: "open" },
    ciTests: { status: "open" },
    controls: { status: "open" },
    coverage: { status: "open" },
    guidedTour: { status: "open" },
    installA11y: { status: "open" },
    installChromatic: { status: "open" },
    installDocs: { status: "open" },
    installVitest: { status: "open" },
    mdxDocs: { status: "open" },
    moreComponents: { status: "open" },
    moreStories: { status: "open" },
    onboardingSurvey: { status: "open" },
    organizeStories: { status: "open" },
    publishStorybook: { status: "open" },
    renderComponent: { status: "open" },
    runTests: { status: "open" },
    viewports: { status: "open" },
    visualTests: { status: "open" },
    whatsNewStorybook10: { status: "open" },
    writeInteractions: { status: "open" }
  },
  widget: {}
};

// src/shared/checklist-store/index.ts
var UNIVERSAL_CHECKLIST_STORE_OPTIONS = {
  id: "storybook/checklist",
  initialState
}, createChecklistStore = (universalChecklistStore2) => ({
  getValue: (id) => universalChecklistStore2.getState().items[id] ?? { status: "open", mutedAt: void 0 },
  accept: (id) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      items: { ...state.items, [id]: { ...state.items[id], status: "accepted" } }
    }));
  },
  done: (id) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      items: { ...state.items, [id]: { ...state.items[id], status: "done" } }
    }));
  },
  skip: (id) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      items: { ...state.items, [id]: { ...state.items[id], status: "skipped" } }
    }));
  },
  reset: (id) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      items: { ...state.items, [id]: { ...state.items[id], status: "open" } }
    }));
  },
  mute: (itemIds) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      items: itemIds.reduce(
        (acc, id) => ({ ...acc, [id]: { ...state.items[id], mutedAt: Date.now() } }),
        state.items
      )
    }));
  },
  disable: (value) => {
    universalChecklistStore2.setState((state) => ({
      ...state,
      widget: { ...state.widget, disable: value },
      items: Object.entries(state.items).reduce(
        (acc, [id, value2]) => ({ ...acc, [id]: { ...value2, mutedAt: void 0 } }),
        state.items
      )
    }));
  }
});

// src/manager-api/stores/checklist.ts
var universalChecklistStore = UniversalStore.create({
  ...UNIVERSAL_CHECKLIST_STORE_OPTIONS,
  leader: globalThis.CONFIG_TYPE === "PRODUCTION"
}), checklistStore = createChecklistStore(universalChecklistStore);
export {
  ActiveTabs2 as ActiveTabs,
  ManagerConsumer as Consumer,
  ManagerContext,
  ManagerProvider as Provider,
  RequestResponseError,
  addons,
  combineParameters,
  controlOrMetaKey,
  controlOrMetaSymbol,
  eventMatchesShortcut,
  eventToShortcut,
  MockUniversalStore as experimental_MockUniversalStore,
  UniversalStore as experimental_UniversalStore,
  getStatusStoreByTypeId as experimental_getStatusStore,
  getTestProviderStoreById as experimental_getTestProviderStore,
  experimental_requestResponse,
  useStatusStore as experimental_useStatusStore,
  useTestProviderStore as experimental_useTestProviderStore,
  useUniversalStore as experimental_useUniversalStore,
  checklistStore as internal_checklistStore,
  fullStatusStore as internal_fullStatusStore,
  fullTestProviderStore as internal_fullTestProviderStore,
  universalChecklistStore as internal_universalChecklistStore,
  universalStatusStore as internal_universalStatusStore,
  universalTestProviderStore as internal_universalTestProviderStore,
  isMacLike,
  isShortcutTaken,
  keyToSymbol,
  merge_default as merge,
  mockChannel,
  optionOrAltSymbol,
  shortcutMatchesShortcut,
  shortcutToAriaKeyshortcuts,
  shortcutToHumanString,
  typesX as types,
  useAddonState,
  useArgTypes,
  useArgs,
  useChannel,
  useGlobalTypes,
  useGlobals,
  useParameter,
  useSharedState,
  useStoryPrepared,
  useStorybookApi,
  useStorybookState
};
