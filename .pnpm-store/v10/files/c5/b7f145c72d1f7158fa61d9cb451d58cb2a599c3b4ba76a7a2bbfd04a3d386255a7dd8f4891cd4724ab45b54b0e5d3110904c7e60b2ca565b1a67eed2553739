/*!
 * pinia v2.2.4
 * (c) 2024 Eduardo San Martin Morote
 * @license MIT
 */
import { hasInjectionContext, inject, toRaw, watch, unref, markRaw, effectScope, ref, isVue2, isRef, isReactive, set, getCurrentScope, onScopeDispose, getCurrentInstance, reactive, toRef, del, nextTick, computed, toRefs } from 'vue-demi';
import { setupDevtoolsPlugin } from '@vue/devtools-api';

/**
 * setActivePinia must be called to handle SSR at the top of functions like
 * `fetch`, `setup`, `serverPrefetch` and others
 */
let activePinia;
/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
// @ts-expect-error: cannot constrain the type of the return
const setActivePinia = (pinia) => (activePinia = pinia);
/**
 * Get the currently active pinia if there is any.
 */
const getActivePinia = () => (hasInjectionContext() && inject(piniaSymbol)) || activePinia;
const piniaSymbol = (Symbol('pinia') );

function isPlainObject(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
o) {
    return (o &&
        typeof o === 'object' &&
        Object.prototype.toString.call(o) === '[object Object]' &&
        typeof o.toJSON !== 'function');
}
// type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
// TODO: can we change these to numbers?
/**
 * Possible types for SubscriptionCallback
 */
var MutationType;
(function (MutationType) {
    /**
     * Direct mutation of the state:
     *
     * - `store.name = 'new name'`
     * - `store.$state.name = 'new name'`
     * - `store.list.push('new item')`
     */
    MutationType["direct"] = "direct";
    /**
     * Mutated the state with `$patch` and an object
     *
     * - `store.$patch({ name: 'newName' })`
     */
    MutationType["patchObject"] = "patch object";
    /**
     * Mutated the state with `$patch` and a function
     *
     * - `store.$patch(state => state.name = 'newName')`
     */
    MutationType["patchFunction"] = "patch function";
    // maybe reset? for $state = {} and $reset
})(MutationType || (MutationType = {}));

const IS_CLIENT = typeof window !== 'undefined';

/*
 * FileSaver.js A saveAs() FileSaver implementation.
 *
 * Originally by Eli Grey, adapted as an ESM module by Eduardo San Martin
 * Morote.
 *
 * License : MIT
 */
// The one and only way of getting global scope in all environments
// https://stackoverflow.com/q/3277182/1008999
const _global = /*#__PURE__*/ (() => typeof window === 'object' && window.window === window
    ? window
    : typeof self === 'object' && self.self === self
        ? self
        : typeof global === 'object' && global.global === global
            ? global
            : typeof globalThis === 'object'
                ? globalThis
                : { HTMLElement: null })();
function bom(blob, { autoBom = false } = {}) {
    // prepend BOM for UTF-8 XML and text/* types (including HTML)
    // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
    if (autoBom &&
        /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
        return new Blob([String.fromCharCode(0xfeff), blob], { type: blob.type });
    }
    return blob;
}
function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.onload = function () {
        saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function () {
        console.error('could not download file');
    };
    xhr.send();
}
function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    // use sync to avoid popup blocker
    xhr.open('HEAD', url, false);
    try {
        xhr.send();
    }
    catch (e) { }
    return xhr.status >= 200 && xhr.status <= 299;
}
// `a.click()` doesn't work for all browsers (#465)
function click(node) {
    try {
        node.dispatchEvent(new MouseEvent('click'));
    }
    catch (e) {
        const evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
        node.dispatchEvent(evt);
    }
}
const _navigator = typeof navigator === 'object' ? navigator : { userAgent: '' };
// Detect WebView inside a native macOS app by ruling out all browsers
// We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
// https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
const isMacOSWebView = /*#__PURE__*/ (() => /Macintosh/.test(_navigator.userAgent) &&
    /AppleWebKit/.test(_navigator.userAgent) &&
    !/Safari/.test(_navigator.userAgent))();
const saveAs = !IS_CLIENT
    ? () => { } // noop
    : // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
        typeof HTMLAnchorElement !== 'undefined' &&
            'download' in HTMLAnchorElement.prototype &&
            !isMacOSWebView
            ? downloadSaveAs
            : // Use msSaveOrOpenBlob as a second approach
                'msSaveOrOpenBlob' in _navigator
                    ? msSaveAs
                    : // Fallback to using FileReader and a popup
                        fileSaverSaveAs;
function downloadSaveAs(blob, name = 'download', opts) {
    const a = document.createElement('a');
    a.download = name;
    a.rel = 'noopener'; // tabnabbing
    // TODO: detect chrome extensions & packaged apps
    // a.target = '_blank'
    if (typeof blob === 'string') {
        // Support regular links
        a.href = blob;
        if (a.origin !== location.origin) {
            if (corsEnabled(a.href)) {
                download(blob, name, opts);
            }
            else {
                a.target = '_blank';
                click(a);
            }
        }
        else {
            click(a);
        }
    }
    else {
        // Support blobs
        a.href = URL.createObjectURL(blob);
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
        }, 4e4); // 40s
        setTimeout(function () {
            click(a);
        }, 0);
    }
}
function msSaveAs(blob, name = 'download', opts) {
    if (typeof blob === 'string') {
        if (corsEnabled(blob)) {
            download(blob, name, opts);
        }
        else {
            const a = document.createElement('a');
            a.href = blob;
            a.target = '_blank';
            setTimeout(function () {
                click(a);
            });
        }
    }
    else {
        // @ts-ignore: works on windows
        navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
}
function fileSaverSaveAs(blob, name, opts, popup) {
    // Open a popup immediately do go around popup blocker
    // Mostly only available on user interaction and the fileReader is async so...
    popup = popup || open('', '_blank');
    if (popup) {
        popup.document.title = popup.document.body.innerText = 'downloading...';
    }
    if (typeof blob === 'string')
        return download(blob, name, opts);
    const force = blob.type === 'application/octet-stream';
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || 'safari' in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || (force && isSafari) || isMacOSWebView) &&
        typeof FileReader !== 'undefined') {
        // Safari doesn't allow downloading of blob URLs
        const reader = new FileReader();
        reader.onloadend = function () {
            let url = reader.result;
            if (typeof url !== 'string') {
                popup = null;
                throw new Error('Wrong reader.result type');
            }
            url = isChromeIOS
                ? url
                : url.replace(/^data:[^;]*;/, 'data:attachment/file;');
            if (popup) {
                popup.location.href = url;
            }
            else {
                location.assign(url);
            }
            popup = null; // reverse-tabnabbing #460
        };
        reader.readAsDataURL(blob);
    }
    else {
        const url = URL.createObjectURL(blob);
        if (popup)
            popup.location.assign(url);
        else
            location.href = url;
        popup = null; // reverse-tabnabbing #460
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 4e4); // 40s
    }
}

/**
 * Shows a toast or console.log
 *
 * @param message - message to log
 * @param type - different color of the tooltip
 */
function toastMessage(message, type) {
    const piniaMessage = '🍍 ' + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === 'function') {
        // No longer available :(
        __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    }
    else if (type === 'error') {
        console.error(piniaMessage);
    }
    else if (type === 'warn') {
        console.warn(piniaMessage);
    }
    else {
        console.log(piniaMessage);
    }
}
function isPinia(o) {
    return '_a' in o && 'install' in o;
}

/**
 * This file contain devtools actions, they are not Pinia actions.
 */
// ---
function checkClipboardAccess() {
    if (!('clipboard' in navigator)) {
        toastMessage(`Your browser doesn't support the Clipboard API`, 'error');
        return true;
    }
}
function checkNotFocusedError(error) {
    if (error instanceof Error &&
        error.message.toLowerCase().includes('document is not focused')) {
        toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', 'warn');
        return true;
    }
    return false;
}
async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
        return;
    try {
        await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
        toastMessage('Global state copied to clipboard.');
    }
    catch (error) {
        if (checkNotFocusedError(error))
            return;
        toastMessage(`Failed to serialize the state. Check the console for more details.`, 'error');
        console.error(error);
    }
}
async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
        return;
    try {
        loadStoresState(pinia, JSON.parse(await navigator.clipboard.readText()));
        toastMessage('Global state pasted from clipboard.');
    }
    catch (error) {
        if (checkNotFocusedError(error))
            return;
        toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, 'error');
        console.error(error);
    }
}
async function actionGlobalSaveState(pinia) {
    try {
        saveAs(new Blob([JSON.stringify(pinia.state.value)], {
            type: 'text/plain;charset=utf-8',
        }), 'pinia-state.json');
    }
    catch (error) {
        toastMessage(`Failed to export the state as JSON. Check the console for more details.`, 'error');
        console.error(error);
    }
}
let fileInput;
function getFileOpener() {
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
    }
    function openFile() {
        return new Promise((resolve, reject) => {
            fileInput.onchange = async () => {
                const files = fileInput.files;
                if (!files)
                    return resolve(null);
                const file = files.item(0);
                if (!file)
                    return resolve(null);
                return resolve({ text: await file.text(), file });
            };
            // @ts-ignore: TODO: changed from 4.3 to 4.4
            fileInput.oncancel = () => resolve(null);
            fileInput.onerror = reject;
            fileInput.click();
        });
    }
    return openFile;
}
async function actionGlobalOpenStateFile(pinia) {
    try {
        const open = getFileOpener();
        const result = await open();
        if (!result)
            return;
        const { text, file } = result;
        loadStoresState(pinia, JSON.parse(text));
        toastMessage(`Global state imported from "${file.name}".`);
    }
    catch (error) {
        toastMessage(`Failed to import the state from JSON. Check the console for more details.`, 'error');
        console.error(error);
    }
}
function loadStoresState(pinia, state) {
    for (const key in state) {
        const storeState = pinia.state.value[key];
        // store is already instantiated, patch it
        if (storeState) {
            Object.assign(storeState, state[key]);
        }
        else {
            // store is not instantiated, set the initial state
            pinia.state.value[key] = state[key];
        }
    }
}

function formatDisplay(display) {
    return {
        _custom: {
            display,
        },
    };
}
const PINIA_ROOT_LABEL = '🍍 Pinia (root)';
const PINIA_ROOT_ID = '_root';
function formatStoreForInspectorTree(store) {
    return isPinia(store)
        ? {
            id: PINIA_ROOT_ID,
            label: PINIA_ROOT_LABEL,
        }
        : {
            id: store.$id,
            label: store.$id,
        };
}
function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
        const storeNames = Array.from(store._s.keys());
        const storeMap = store._s;
        const state = {
            state: storeNames.map((storeId) => ({
                editable: true,
                key: storeId,
                value: store.state.value[storeId],
            })),
            getters: storeNames
                .filter((id) => storeMap.get(id)._getters)
                .map((id) => {
                const store = storeMap.get(id);
                return {
                    editable: false,
                    key: id,
                    value: store._getters.reduce((getters, key) => {
                        getters[key] = store[key];
                        return getters;
                    }, {}),
                };
            }),
        };
        return state;
    }
    const state = {
        state: Object.keys(store.$state).map((key) => ({
            editable: true,
            key,
            value: store.$state[key],
        })),
    };
    // avoid adding empty getters
    if (store._getters && store._getters.length) {
        state.getters = store._getters.map((getterName) => ({
            editable: false,
            key: getterName,
            value: store[getterName],
        }));
    }
    if (store._customProperties.size) {
        state.customProperties = Array.from(store._customProperties).map((key) => ({
            editable: true,
            key,
            value: store[key],
        }));
    }
    return state;
}
function formatEventData(events) {
    if (!events)
        return {};
    if (Array.isArray(events)) {
        // TODO: handle add and delete for arrays and objects
        return events.reduce((data, event) => {
            data.keys.push(event.key);
            data.operations.push(event.type);
            data.oldValue[event.key] = event.oldValue;
            data.newValue[event.key] = event.newValue;
            return data;
        }, {
            oldValue: {},
            keys: [],
            operations: [],
            newValue: {},
        });
    }
    else {
        return {
            operation: formatDisplay(events.type),
            key: formatDisplay(events.key),
            oldValue: events.oldValue,
            newValue: events.newValue,
        };
    }
}
function formatMutationType(type) {
    switch (type) {
        case MutationType.direct:
            return 'mutation';
        case MutationType.patchFunction:
            return '$patch';
        case MutationType.patchObject:
            return '$patch';
        default:
            return 'unknown';
    }
}

// timeline can be paused when directly changing the state
let isTimelineActive = true;
const componentStateTypes = [];
const MUTATIONS_LAYER_ID = 'pinia:mutations';
const INSPECTOR_ID = 'pinia';
const { assign: assign$1 } = Object;
/**
 * Gets the displayed name of a store in devtools
 *
 * @param id - id of the store
 * @returns a formatted string
 */
const getStoreType = (id) => '🍍 ' + id;
/**
 * Add the pinia plugin without any store. Allows displaying a Pinia plugin tab
 * as soon as it is added to the application.
 *
 * @param app - Vue application
 * @param pinia - pinia instance
 */
function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
        id: 'dev.esm.pinia',
        label: 'Pinia 🍍',
        logo: 'https://pinia.vuejs.org/logo.svg',
        packageName: 'pinia',
        homepage: 'https://pinia.vuejs.org',
        componentStateTypes,
        app,
    }, (api) => {
        if (typeof api.now !== 'function') {
            toastMessage('You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.');
        }
        api.addTimelineLayer({
            id: MUTATIONS_LAYER_ID,
            label: `Pinia 🍍`,
            color: 0xe5df88,
        });
        api.addInspector({
            id: INSPECTOR_ID,
            label: 'Pinia 🍍',
            icon: 'storage',
            treeFilterPlaceholder: 'Search stores',
            actions: [
                {
                    icon: 'content_copy',
                    action: () => {
                        actionGlobalCopyState(pinia);
                    },
                    tooltip: 'Serialize and copy the state',
                },
                {
                    icon: 'content_paste',
                    action: async () => {
                        await actionGlobalPasteState(pinia);
                        api.sendInspectorTree(INSPECTOR_ID);
                        api.sendInspectorState(INSPECTOR_ID);
                    },
                    tooltip: 'Replace the state with the content of your clipboard',
                },
                {
                    icon: 'save',
                    action: () => {
                        actionGlobalSaveState(pinia);
                    },
                    tooltip: 'Save the state as a JSON file',
                },
                {
                    icon: 'folder_open',
                    action: async () => {
                        await actionGlobalOpenStateFile(pinia);
                        api.sendInspectorTree(INSPECTOR_ID);
                        api.sendInspectorState(INSPECTOR_ID);
                    },
                    tooltip: 'Import the state from a JSON file',
                },
            ],
            nodeActions: [
                {
                    icon: 'restore',
                    tooltip: 'Reset the state (with "$reset")',
                    action: (nodeId) => {
                        const store = pinia._s.get(nodeId);
                        if (!store) {
                            toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, 'warn');
                        }
                        else if (typeof store.$reset !== 'function') {
                            toastMessage(`Cannot reset "${nodeId}" store because it doesn't have a "$reset" method implemented.`, 'warn');
                        }
                        else {
                            store.$reset();
                            toastMessage(`Store "${nodeId}" reset.`);
                        }
                    },
                },
            ],
        });
        api.on.inspectComponent((payload, ctx) => {
            const proxy = (payload.componentInstance &&
                payload.componentInstance.proxy);
            if (proxy && proxy._pStores) {
                const piniaStores = payload.componentInstance.proxy._pStores;
                Object.values(piniaStores).forEach((store) => {
                    payload.instanceData.state.push({
                        type: getStoreType(store.$id),
                        key: 'state',
                        editable: true,
                        value: store._isOptionsAPI
                            ? {
                                _custom: {
                                    value: toRaw(store.$state),
                                    actions: [
                                        {
                                            icon: 'restore',
                                            tooltip: 'Reset the state of this store',
                                            action: () => store.$reset(),
                                        },
                                    ],
                                },
                            }
                            : // NOTE: workaround to unwrap transferred refs
                                Object.keys(store.$state).reduce((state, key) => {
                                    state[key] = store.$state[key];
                                    return state;
                                }, {}),
                    });
                    if (store._getters && store._getters.length) {
                        payload.instanceData.state.push({
                            type: getStoreType(store.$id),
                            key: 'getters',
                            editable: false,
                            value: store._getters.reduce((getters, key) => {
                                try {
                                    getters[key] = store[key];
                                }
                                catch (error) {
                                    // @ts-expect-error: we just want to show it in devtools
                                    getters[key] = error;
                                }
                                return getters;
                            }, {}),
                        });
                    }
                });
            }
        });
        api.on.getInspectorTree((payload) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                let stores = [pinia];
                stores = stores.concat(Array.from(pinia._s.values()));
                payload.rootNodes = (payload.filter
                    ? stores.filter((store) => '$id' in store
                        ? store.$id
                            .toLowerCase()
                            .includes(payload.filter.toLowerCase())
                        : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase()))
                    : stores).map(formatStoreForInspectorTree);
            }
        });
        // Expose pinia instance as $pinia to window
        globalThis.$pinia = pinia;
        api.on.getInspectorState((payload) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                const inspectedStore = payload.nodeId === PINIA_ROOT_ID
                    ? pinia
                    : pinia._s.get(payload.nodeId);
                if (!inspectedStore) {
                    // this could be the selected store restored for a different project
                    // so it's better not to say anything here
                    return;
                }
                if (inspectedStore) {
                    // Expose selected store as $store to window
                    if (payload.nodeId !== PINIA_ROOT_ID)
                        globalThis.$store = toRaw(inspectedStore);
                    payload.state = formatStoreForInspectorState(inspectedStore);
                }
            }
        });
        api.on.editInspectorState((payload, ctx) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                const inspectedStore = payload.nodeId === PINIA_ROOT_ID
                    ? pinia
                    : pinia._s.get(payload.nodeId);
                if (!inspectedStore) {
                    return toastMessage(`store "${payload.nodeId}" not found`, 'error');
                }
                const { path } = payload;
                if (!isPinia(inspectedStore)) {
                    // access only the state
                    if (path.length !== 1 ||
                        !inspectedStore._customProperties.has(path[0]) ||
                        path[0] in inspectedStore.$state) {
                        path.unshift('$state');
                    }
                }
                else {
                    // Root access, we can omit the `.value` because the devtools API does it for us
                    path.unshift('state');
                }
                isTimelineActive = false;
                payload.set(inspectedStore, path, payload.state.value);
                isTimelineActive = true;
            }
        });
        api.on.editComponentState((payload) => {
            if (payload.type.startsWith('🍍')) {
                const storeId = payload.type.replace(/^🍍\s*/, '');
                const store = pinia._s.get(storeId);
                if (!store) {
                    return toastMessage(`store "${storeId}" not found`, 'error');
                }
                const { path } = payload;
                if (path[0] !== 'state') {
                    return toastMessage(`Invalid path for store "${storeId}":\n${path}\nOnly state can be modified.`);
                }
                // rewrite the first entry to be able to directly set the state as
                // well as any other path
                path[0] = '$state';
                isTimelineActive = false;
                payload.set(store, path, payload.state.value);
                isTimelineActive = true;
            }
        });
    });
}
function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
        componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
        id: 'dev.esm.pinia',
        label: 'Pinia 🍍',
        logo: 'https://pinia.vuejs.org/logo.svg',
        packageName: 'pinia',
        homepage: 'https://pinia.vuejs.org',
        componentStateTypes,
        app,
        settings: {
            logStoreChanges: {
                label: 'Notify about new/deleted stores',
                type: 'boolean',
                defaultValue: true,
            },
            // useEmojis: {
            //   label: 'Use emojis in messages ⚡️',
            //   type: 'boolean',
            //   defaultValue: true,
            // },
        },
    }, (api) => {
        // gracefully handle errors
        const now = typeof api.now === 'function' ? api.now.bind(api) : Date.now;
        store.$onAction(({ after, onError, name, args }) => {
            const groupId = runningActionId++;
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: {
                    time: now(),
                    title: '🛫 ' + name,
                    subtitle: 'start',
                    data: {
                        store: formatDisplay(store.$id),
                        action: formatDisplay(name),
                        args,
                    },
                    groupId,
                },
            });
            after((result) => {
                activeAction = undefined;
                api.addTimelineEvent({
                    layerId: MUTATIONS_LAYER_ID,
                    event: {
                        time: now(),
                        title: '🛬 ' + name,
                        subtitle: 'end',
                        data: {
                            store: formatDisplay(store.$id),
                            action: formatDisplay(name),
                            args,
                            result,
                        },
                        groupId,
                    },
                });
            });
            onError((error) => {
                activeAction = undefined;
                api.addTimelineEvent({
                    layerId: MUTATIONS_LAYER_ID,
                    event: {
                        time: now(),
                        logType: 'error',
                        title: '💥 ' + name,
                        subtitle: 'end',
                        data: {
                            store: formatDisplay(store.$id),
                            action: formatDisplay(name),
                            args,
                            error,
                        },
                        groupId,
                    },
                });
            });
        }, true);
        store._customProperties.forEach((name) => {
            watch(() => unref(store[name]), (newValue, oldValue) => {
                api.notifyComponentUpdate();
                api.sendInspectorState(INSPECTOR_ID);
                if (isTimelineActive) {
                    api.addTimelineEvent({
                        layerId: MUTATIONS_LAYER_ID,
                        event: {
                            time: now(),
                            title: 'Change',
                            subtitle: name,
                            data: {
                                newValue,
                                oldValue,
                            },
                            groupId: activeAction,
                        },
                    });
                }
            }, { deep: true });
        });
        store.$subscribe(({ events, type }, state) => {
            api.notifyComponentUpdate();
            api.sendInspectorState(INSPECTOR_ID);
            if (!isTimelineActive)
                return;
            // rootStore.state[store.id] = state
            const eventData = {
                time: now(),
                title: formatMutationType(type),
                data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
                groupId: activeAction,
            };
            if (type === MutationType.patchFunction) {
                eventData.subtitle = '⤵️';
            }
            else if (type === MutationType.patchObject) {
                eventData.subtitle = '🧩';
            }
            else if (events && !Array.isArray(events)) {
                eventData.subtitle = events.type;
            }
            if (events) {
                eventData.data['rawEvent(s)'] = {
                    _custom: {
                        display: 'DebuggerEvent',
                        type: 'object',
                        tooltip: 'raw DebuggerEvent[]',
                        value: events,
                    },
                };
            }
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: eventData,
            });
        }, { detached: true, flush: 'sync' });
        const hotUpdate = store._hotUpdate;
        store._hotUpdate = markRaw((newStore) => {
            hotUpdate(newStore);
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: {
                    time: now(),
                    title: '🔥 ' + store.$id,
                    subtitle: 'HMR update',
                    data: {
                        store: formatDisplay(store.$id),
                        info: formatDisplay(`HMR update`),
                    },
                },
            });
            // update the devtools too
            api.notifyComponentUpdate();
            api.sendInspectorTree(INSPECTOR_ID);
            api.sendInspectorState(INSPECTOR_ID);
        });
        const { $dispose } = store;
        store.$dispose = () => {
            $dispose();
            api.notifyComponentUpdate();
            api.sendInspectorTree(INSPECTOR_ID);
            api.sendInspectorState(INSPECTOR_ID);
            api.getSettings().logStoreChanges &&
                toastMessage(`Disposed "${store.$id}" store 🗑`);
        };
        // trigger an update so it can display new registered stores
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges &&
            toastMessage(`"${store.$id}" store installed 🆕`);
    });
}
let runningActionId = 0;
let activeAction;
/**
 * Patches a store to enable action grouping in devtools by wrapping the store with a Proxy that is passed as the
 * context of all actions, allowing us to set `runningAction` on each access and effectively associating any state
 * mutation to the action.
 *
 * @param store - store to patch
 * @param actionNames - list of actionst to patch
 */
function patchActionForGrouping(store, actionNames, wrapWithProxy) {
    // original actions of the store as they are given by pinia. We are going to override them
    const actions = actionNames.reduce((storeActions, actionName) => {
        // use toRaw to avoid tracking #541
        storeActions[actionName] = toRaw(store)[actionName];
        return storeActions;
    }, {});
    for (const actionName in actions) {
        store[actionName] = function () {
            // the running action id is incremented in a before action hook
            const _actionId = runningActionId;
            const trackedStore = wrapWithProxy
                ? new Proxy(store, {
                    get(...args) {
                        activeAction = _actionId;
                        return Reflect.get(...args);
                    },
                    set(...args) {
                        activeAction = _actionId;
                        return Reflect.set(...args);
                    },
                })
                : store;
            // For Setup Stores we need https://github.com/tc39/proposal-async-context
            activeAction = _actionId;
            const retValue = actions[actionName].apply(trackedStore, arguments);
            // this is safer as async actions in Setup Stores would associate mutations done outside of the action
            activeAction = undefined;
            return retValue;
        };
    }
}
/**
 * pinia.use(devtoolsPlugin)
 */
function devtoolsPlugin({ app, store, options }) {
    // HMR module
    if (store.$id.startsWith('__hot:')) {
        return;
    }
    // detect option api vs setup api
    store._isOptionsAPI = !!options.state;
    // Do not overwrite actions mocked by @pinia/testing (#2298)
    if (!store._p._testing) {
        patchActionForGrouping(store, Object.keys(options.actions), store._isOptionsAPI);
        // Upgrade the HMR to also update the new actions
        const originalHotUpdate = store._hotUpdate;
        toRaw(store)._hotUpdate = function (newStore) {
            originalHotUpdate.apply(this, arguments);
            patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions), !!store._isOptionsAPI);
        };
    }
    addStoreToDevtools(app, 
    // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
    store);
}

/**
 * Creates a Pinia instance to be used by the application
 */
function createPinia() {
    const scope = effectScope(true);
    // NOTE: here we could check the window object for a state and directly set it
    // if there is anything like it with Vue 3 SSR
    const state = scope.run(() => ref({}));
    let _p = [];
    // plugins added before calling app.use(pinia)
    let toBeInstalled = [];
    const pinia = markRaw({
        install(app) {
            // this allows calling useStore() outside of a component setup after
            // installing pinia's plugin
            setActivePinia(pinia);
            if (!isVue2) {
                pinia._a = app;
                app.provide(piniaSymbol, pinia);
                app.config.globalProperties.$pinia = pinia;
                /* istanbul ignore else */
                if (IS_CLIENT) {
                    registerPiniaDevtools(app, pinia);
                }
                toBeInstalled.forEach((plugin) => _p.push(plugin));
                toBeInstalled = [];
            }
        },
        use(plugin) {
            if (!this._a && !isVue2) {
                toBeInstalled.push(plugin);
            }
            else {
                _p.push(plugin);
            }
            return this;
        },
        _p,
        // it's actually undefined here
        // @ts-expect-error
        _a: null,
        _e: scope,
        _s: new Map(),
        state,
    });
    // pinia devtools rely on dev only features so they cannot be forced unless
    // the dev build of Vue is used. Avoid old browsers like IE11.
    if (typeof Proxy !== 'undefined') {
        pinia.use(devtoolsPlugin);
    }
    return pinia;
}
/**
 * Dispose a Pinia instance by stopping its effectScope and removing the state, plugins and stores. This is mostly
 * useful in tests, with both a testing pinia or a regular pinia and in applications that use multiple pinia instances.
 * Once disposed, the pinia instance cannot be used anymore.
 *
 * @param pinia - pinia instance
 */
function disposePinia(pinia) {
    pinia._e.stop();
    pinia._s.clear();
    pinia._p.splice(0);
    pinia.state.value = {};
    // @ts-expect-error: non valid
    pinia._a = null;
}

/**
 * Checks if a function is a `StoreDefinition`.
 *
 * @param fn - object to test
 * @returns true if `fn` is a StoreDefinition
 */
const isUseStore = (fn) => {
    return typeof fn === 'function' && typeof fn.$id === 'string';
};
/**
 * Mutates in place `newState` with `oldState` to _hot update_ it. It will
 * remove any key not existing in `newState` and recursively merge plain
 * objects.
 *
 * @param newState - new state object to be patched
 * @param oldState - old state that should be used to patch newState
 * @returns - newState
 */
function patchObject(newState, oldState) {
    // no need to go through symbols because they cannot be serialized anyway
    for (const key in oldState) {
        const subPatch = oldState[key];
        // skip the whole sub tree
        if (!(key in newState)) {
            continue;
        }
        const targetValue = newState[key];
        if (isPlainObject(targetValue) &&
            isPlainObject(subPatch) &&
            !isRef(subPatch) &&
            !isReactive(subPatch)) {
            newState[key] = patchObject(targetValue, subPatch);
        }
        else {
            // objects are either a bit more complex (e.g. refs) or primitives, so we
            // just set the whole thing
            if (isVue2) {
                set(newState, key, subPatch);
            }
            else {
                newState[key] = subPatch;
            }
        }
    }
    return newState;
}
/**
 * Creates an _accept_ function to pass to `import.meta.hot` in Vite applications.
 *
 * @example
 * ```js
 * const useUser = defineStore(...)
 * if (import.meta.hot) {
 *   import.meta.hot.accept(acceptHMRUpdate(useUser, import.meta.hot))
 * }
 * ```
 *
 * @param initialUseStore - return of the defineStore to hot update
 * @param hot - `import.meta.hot`
 */
function acceptHMRUpdate(initialUseStore, hot) {
    return (newModule) => {
        const pinia = hot.data.pinia || initialUseStore._pinia;
        if (!pinia) {
            // this store is still not used
            return;
        }
        // preserve the pinia instance across loads
        hot.data.pinia = pinia;
        // console.log('got data', newStore)
        for (const exportName in newModule) {
            const useStore = newModule[exportName];
            // console.log('checking for', exportName)
            if (isUseStore(useStore) && pinia._s.has(useStore.$id)) {
                // console.log('Accepting update for', useStore.$id)
                const id = useStore.$id;
                if (id !== initialUseStore.$id) {
                    console.warn(`The id of the store changed from "${initialUseStore.$id}" to "${id}". Reloading.`);
                    // return import.meta.hot.invalidate()
                    return hot.invalidate();
                }
                const existingStore = pinia._s.get(id);
                if (!existingStore) {
                    console.log(`[Pinia]: skipping hmr because store doesn't exist yet`);
                    return;
                }
                useStore(pinia, existingStore);
            }
        }
    };
}

const noop = () => { };
function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
        const idx = subscriptions.indexOf(callback);
        if (idx > -1) {
            subscriptions.splice(idx, 1);
            onCleanup();
        }
    };
    if (!detached && getCurrentScope()) {
        onScopeDispose(removeSubscription);
    }
    return removeSubscription;
}
function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
        callback(...args);
    });
}

const fallbackRunWithContext = (fn) => fn();
/**
 * Marks a function as an action for `$onAction`
 * @internal
 */
const ACTION_MARKER = Symbol();
/**
 * Action name symbol. Allows to add a name to an action after defining it
 * @internal
 */
const ACTION_NAME = Symbol();
function mergeReactiveObjects(target, patchToApply) {
    // Handle Map instances
    if (target instanceof Map && patchToApply instanceof Map) {
        patchToApply.forEach((value, key) => target.set(key, value));
    }
    else if (target instanceof Set && patchToApply instanceof Set) {
        // Handle Set instances
        patchToApply.forEach(target.add, target);
    }
    // no need to go through symbols because they cannot be serialized anyway
    for (const key in patchToApply) {
        if (!patchToApply.hasOwnProperty(key))
            continue;
        const subPatch = patchToApply[key];
        const targetValue = target[key];
        if (isPlainObject(targetValue) &&
            isPlainObject(subPatch) &&
            target.hasOwnProperty(key) &&
            !isRef(subPatch) &&
            !isReactive(subPatch)) {
            // NOTE: here I wanted to warn about inconsistent types but it's not possible because in setup stores one might
            // start the value of a property as a certain type e.g. a Map, and then for some reason, during SSR, change that
            // to `undefined`. When trying to hydrate, we want to override the Map with `undefined`.
            target[key] = mergeReactiveObjects(targetValue, subPatch);
        }
        else {
            // @ts-expect-error: subPatch is a valid value
            target[key] = subPatch;
        }
    }
    return target;
}
const skipHydrateSymbol = Symbol('pinia:skipHydration')
    ;
const skipHydrateMap = /*#__PURE__*/ new WeakMap();
/**
 * Tells Pinia to skip the hydration process of a given object. This is useful in setup stores (only) when you return a
 * stateful object in the store but it isn't really state. e.g. returning a router instance in a setup store.
 *
 * @param obj - target object
 * @returns obj
 */
function skipHydrate(obj) {
    return isVue2
        ? // in @vue/composition-api, the refs are sealed so defineProperty doesn't work...
            /* istanbul ignore next */ skipHydrateMap.set(obj, 1) && obj
        : Object.defineProperty(obj, skipHydrateSymbol, {});
}
/**
 * Returns whether a value should be hydrated
 *
 * @param obj - target variable
 * @returns true if `obj` should be hydrated
 */
function shouldHydrate(obj) {
    return isVue2
        ? /* istanbul ignore next */ !skipHydrateMap.has(obj)
        : !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}
const { assign } = Object;
function isComputed(o) {
    return !!(isRef(o) && o.effect);
}
function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
        if (!initialState && (!hot)) {
            /* istanbul ignore if */
            if (isVue2) {
                set(pinia.state.value, id, state ? state() : {});
            }
            else {
                pinia.state.value[id] = state ? state() : {};
            }
        }
        // avoid creating a state in pinia.state.value
        const localState = hot
            ? // use ref() to unwrap refs inside state TODO: check if this is still necessary
                toRefs(ref(state ? state() : {}).value)
            : toRefs(pinia.state.value[id]);
        return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
            if (name in localState) {
                console.warn(`[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`);
            }
            computedGetters[name] = markRaw(computed(() => {
                setActivePinia(pinia);
                // it was created just before
                const store = pinia._s.get(id);
                // allow cross using stores
                /* istanbul ignore if */
                if (isVue2 && !store._r)
                    return;
                // @ts-expect-error
                // return getters![name].call(context, context)
                // TODO: avoid reading the getter while assigning with a global variable
                return getters[name].call(store, store);
            }));
            return computedGetters;
        }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
}
function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    /* istanbul ignore if */
    if (!pinia._e.active) {
        throw new Error('Pinia destroyed');
    }
    // watcher options for $subscribe
    const $subscribeOptions = { deep: true };
    /* istanbul ignore else */
    if (!isVue2) {
        $subscribeOptions.onTrigger = (event) => {
            /* istanbul ignore else */
            if (isListening) {
                debuggerEvents = event;
                // avoid triggering this while the store is being built and the state is being set in pinia
            }
            else if (isListening == false && !store._hotUpdating) {
                // let patch send all the events together later
                /* istanbul ignore else */
                if (Array.isArray(debuggerEvents)) {
                    debuggerEvents.push(event);
                }
                else {
                    console.error('🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.');
                }
            }
        };
    }
    // internal state
    let isListening; // set to true at the end
    let isSyncListening; // set to true at the end
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    // avoid setting the state for option stores if it is set
    // by the setup
    if (!isOptionsStore && !initialState && (!hot)) {
        /* istanbul ignore if */
        if (isVue2) {
            set(pinia.state.value, $id, {});
        }
        else {
            pinia.state.value[$id] = {};
        }
    }
    const hotState = ref({});
    // avoid triggering too many listeners
    // https://github.com/vuejs/pinia/issues/1129
    let activeListener;
    function $patch(partialStateOrMutator) {
        let subscriptionMutation;
        isListening = isSyncListening = false;
        // reset the debugger events since patches are sync
        /* istanbul ignore else */
        {
            debuggerEvents = [];
        }
        if (typeof partialStateOrMutator === 'function') {
            partialStateOrMutator(pinia.state.value[$id]);
            subscriptionMutation = {
                type: MutationType.patchFunction,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        else {
            mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
            subscriptionMutation = {
                type: MutationType.patchObject,
                payload: partialStateOrMutator,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        const myListenerId = (activeListener = Symbol());
        nextTick().then(() => {
            if (activeListener === myListenerId) {
                isListening = true;
            }
        });
        isSyncListening = true;
        // because we paused the watcher, we need to manually call the subscriptions
        triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore
        ? function $reset() {
            const { state } = options;
            const newState = state ? state() : {};
            // we use a patch to group all changes into one single subscription
            this.$patch(($state) => {
                // @ts-expect-error: FIXME: shouldn't error?
                assign($state, newState);
            });
        }
        : /* istanbul ignore next */
            () => {
                    throw new Error(`🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`);
                }
                ;
    function $dispose() {
        scope.stop();
        subscriptions = [];
        actionSubscriptions = [];
        pinia._s.delete($id);
    }
    /**
     * Helper that wraps function so it can be tracked with $onAction
     * @param fn - action to wrap
     * @param name - name of the action
     */
    const action = (fn, name = '') => {
        if (ACTION_MARKER in fn) {
            fn[ACTION_NAME] = name;
            return fn;
        }
        const wrappedAction = function () {
            setActivePinia(pinia);
            const args = Array.from(arguments);
            const afterCallbackList = [];
            const onErrorCallbackList = [];
            function after(callback) {
                afterCallbackList.push(callback);
            }
            function onError(callback) {
                onErrorCallbackList.push(callback);
            }
            // @ts-expect-error
            triggerSubscriptions(actionSubscriptions, {
                args,
                name: wrappedAction[ACTION_NAME],
                store,
                after,
                onError,
            });
            let ret;
            try {
                ret = fn.apply(this && this.$id === $id ? this : store, args);
                // handle sync errors
            }
            catch (error) {
                triggerSubscriptions(onErrorCallbackList, error);
                throw error;
            }
            if (ret instanceof Promise) {
                return ret
                    .then((value) => {
                    triggerSubscriptions(afterCallbackList, value);
                    return value;
                })
                    .catch((error) => {
                    triggerSubscriptions(onErrorCallbackList, error);
                    return Promise.reject(error);
                });
            }
            // trigger after callbacks
            triggerSubscriptions(afterCallbackList, ret);
            return ret;
        };
        wrappedAction[ACTION_MARKER] = true;
        wrappedAction[ACTION_NAME] = name; // will be set later
        // @ts-expect-error: we are intentionally limiting the returned type to just Fn
        // because all the added properties are internals that are exposed through `$onAction()` only
        return wrappedAction;
    };
    const _hmrPayload = /*#__PURE__*/ markRaw({
        actions: {},
        getters: {},
        state: [],
        hotState,
    });
    const partialStore = {
        _p: pinia,
        // _s: scope,
        $id,
        $onAction: addSubscription.bind(null, actionSubscriptions),
        $patch,
        $reset,
        $subscribe(callback, options = {}) {
            const removeSubscription = addSubscription(subscriptions, callback, options.detached, () => stopWatcher());
            const stopWatcher = scope.run(() => watch(() => pinia.state.value[$id], (state) => {
                if (options.flush === 'sync' ? isSyncListening : isListening) {
                    callback({
                        storeId: $id,
                        type: MutationType.direct,
                        events: debuggerEvents,
                    }, state);
                }
            }, assign({}, $subscribeOptions, options)));
            return removeSubscription;
        },
        $dispose,
    };
    /* istanbul ignore if */
    if (isVue2) {
        // start as non ready
        partialStore._r = false;
    }
    const store = reactive(assign({
            _hmrPayload,
            _customProperties: markRaw(new Set()), // devtools custom properties
        }, partialStore
        // must be added later
        // setupStore
        )
        );
    // store the partial store now so the setup of stores can instantiate each other before they are finished without
    // creating infinite loops.
    pinia._s.set($id, store);
    const runWithContext = (pinia._a && pinia._a.runWithContext) || fallbackRunWithContext;
    // TODO: idea create skipSerialize that marks properties as non serializable and they are skipped
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = effectScope()).run(() => setup({ action }))));
    // overwrite existing actions to support $onAction
    for (const key in setupStore) {
        const prop = setupStore[key];
        if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
            // mark it as a piece of state to be serialized
            if (hot) {
                set(hotState.value, key, toRef(setupStore, key));
                // createOptionStore directly sets the state in pinia.state.value so we
                // can just skip that
            }
            else if (!isOptionsStore) {
                // in setup stores we must hydrate the state and sync pinia state tree with the refs the user just created
                if (initialState && shouldHydrate(prop)) {
                    if (isRef(prop)) {
                        prop.value = initialState[key];
                    }
                    else {
                        // probably a reactive object, lets recursively assign
                        // @ts-expect-error: prop is unknown
                        mergeReactiveObjects(prop, initialState[key]);
                    }
                }
                // transfer the ref to the pinia state to keep everything in sync
                /* istanbul ignore if */
                if (isVue2) {
                    set(pinia.state.value[$id], key, prop);
                }
                else {
                    pinia.state.value[$id][key] = prop;
                }
            }
            /* istanbul ignore else */
            {
                _hmrPayload.state.push(key);
            }
            // action
        }
        else if (typeof prop === 'function') {
            const actionValue = hot ? prop : action(prop, key);
            // this a hot module replacement store because the hotUpdate method needs
            // to do it with the right context
            /* istanbul ignore if */
            if (isVue2) {
                set(setupStore, key, actionValue);
            }
            else {
                // @ts-expect-error
                setupStore[key] = actionValue;
            }
            /* istanbul ignore else */
            {
                _hmrPayload.actions[key] = prop;
            }
            // list actions so they can be used in plugins
            // @ts-expect-error
            optionsForPlugin.actions[key] = prop;
        }
        else {
            // add getters for devtools
            if (isComputed(prop)) {
                _hmrPayload.getters[key] = isOptionsStore
                    ? // @ts-expect-error
                        options.getters[key]
                    : prop;
                if (IS_CLIENT) {
                    const getters = setupStore._getters ||
                        // @ts-expect-error: same
                        (setupStore._getters = markRaw([]));
                    getters.push(key);
                }
            }
        }
    }
    // add the state, getters, and action properties
    /* istanbul ignore if */
    if (isVue2) {
        Object.keys(setupStore).forEach((key) => {
            set(store, key, setupStore[key]);
        });
    }
    else {
        assign(store, setupStore);
        // allows retrieving reactive objects with `storeToRefs()`. Must be called after assigning to the reactive object.
        // Make `storeToRefs()` work with `reactive()` #799
        assign(toRaw(store), setupStore);
    }
    // use this instead of a computed with setter to be able to create it anywhere
    // without linking the computed lifespan to wherever the store is first
    // created.
    Object.defineProperty(store, '$state', {
        get: () => (hot ? hotState.value : pinia.state.value[$id]),
        set: (state) => {
            /* istanbul ignore if */
            if (hot) {
                throw new Error('cannot set hotState');
            }
            $patch(($state) => {
                // @ts-expect-error: FIXME: shouldn't error?
                assign($state, state);
            });
        },
    });
    // add the hotUpdate before plugins to allow them to override it
    /* istanbul ignore else */
    {
        store._hotUpdate = markRaw((newStore) => {
            store._hotUpdating = true;
            newStore._hmrPayload.state.forEach((stateKey) => {
                if (stateKey in store.$state) {
                    const newStateTarget = newStore.$state[stateKey];
                    const oldStateSource = store.$state[stateKey];
                    if (typeof newStateTarget === 'object' &&
                        isPlainObject(newStateTarget) &&
                        isPlainObject(oldStateSource)) {
                        patchObject(newStateTarget, oldStateSource);
                    }
                    else {
                        // transfer the ref
                        newStore.$state[stateKey] = oldStateSource;
                    }
                }
                // patch direct access properties to allow store.stateProperty to work as
                // store.$state.stateProperty
                set(store, stateKey, toRef(newStore.$state, stateKey));
            });
            // remove deleted state properties
            Object.keys(store.$state).forEach((stateKey) => {
                if (!(stateKey in newStore.$state)) {
                    del(store, stateKey);
                }
            });
            // avoid devtools logging this as a mutation
            isListening = false;
            isSyncListening = false;
            pinia.state.value[$id] = toRef(newStore._hmrPayload, 'hotState');
            isSyncListening = true;
            nextTick().then(() => {
                isListening = true;
            });
            for (const actionName in newStore._hmrPayload.actions) {
                const actionFn = newStore[actionName];
                set(store, actionName, action(actionFn, actionName));
            }
            // TODO: does this work in both setup and option store?
            for (const getterName in newStore._hmrPayload.getters) {
                const getter = newStore._hmrPayload.getters[getterName];
                const getterValue = isOptionsStore
                    ? // special handling of options api
                        computed(() => {
                            setActivePinia(pinia);
                            return getter.call(store, store);
                        })
                    : getter;
                set(store, getterName, getterValue);
            }
            // remove deleted getters
            Object.keys(store._hmrPayload.getters).forEach((key) => {
                if (!(key in newStore._hmrPayload.getters)) {
                    del(store, key);
                }
            });
            // remove old actions
            Object.keys(store._hmrPayload.actions).forEach((key) => {
                if (!(key in newStore._hmrPayload.actions)) {
                    del(store, key);
                }
            });
            // update the values used in devtools and to allow deleting new properties later on
            store._hmrPayload = newStore._hmrPayload;
            store._getters = newStore._getters;
            store._hotUpdating = false;
        });
    }
    if (IS_CLIENT) {
        const nonEnumerable = {
            writable: true,
            configurable: true,
            // avoid warning on devtools trying to display this property
            enumerable: false,
        };
        ['_p', '_hmrPayload', '_getters', '_customProperties'].forEach((p) => {
            Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
        });
    }
    /* istanbul ignore if */
    if (isVue2) {
        // mark the store as ready before plugins
        store._r = true;
    }
    // apply all plugins
    pinia._p.forEach((extender) => {
        /* istanbul ignore else */
        if (IS_CLIENT) {
            const extensions = scope.run(() => extender({
                store: store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            }));
            Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
            assign(store, extensions);
        }
        else {
            assign(store, scope.run(() => extender({
                store: store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            })));
        }
    });
    if (store.$state &&
        typeof store.$state === 'object' &&
        typeof store.$state.constructor === 'function' &&
        !store.$state.constructor.toString().includes('[native code]')) {
        console.warn(`[🍍]: The "state" must be a plain object. It cannot be\n` +
            `\tstate: () => new MyClass()\n` +
            `Found in store "${store.$id}".`);
    }
    // only apply hydrate to option stores with an initial state in pinia
    if (initialState &&
        isOptionsStore &&
        options.hydrate) {
        options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
}
// improves tree shaking
/*#__NO_SIDE_EFFECTS__*/
function defineStore(
// TODO: add proper types from above
idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === 'function';
    if (typeof idOrOptions === 'string') {
        id = idOrOptions;
        // the option store setup will contain the actual options in this case
        options = isSetupStore ? setupOptions : setup;
    }
    else {
        options = idOrOptions;
        id = idOrOptions.id;
        if (typeof id !== 'string') {
            throw new Error(`[🍍]: "defineStore()" must be passed a store id as its first argument.`);
        }
    }
    function useStore(pinia, hot) {
        const hasContext = hasInjectionContext();
        pinia =
            // in test mode, ignore the argument provided as we can always retrieve a
            // pinia instance with getActivePinia()
            (pinia) ||
                (hasContext ? inject(piniaSymbol, null) : null);
        if (pinia)
            setActivePinia(pinia);
        if (!activePinia) {
            throw new Error(`[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?\n` +
                `See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.\n` +
                `This will fail in production.`);
        }
        pinia = activePinia;
        if (!pinia._s.has(id)) {
            // creating the store registers it in `pinia._s`
            if (isSetupStore) {
                createSetupStore(id, setup, options, pinia);
            }
            else {
                createOptionsStore(id, options, pinia);
            }
            /* istanbul ignore else */
            {
                // @ts-expect-error: not the right inferred type
                useStore._pinia = pinia;
            }
        }
        const store = pinia._s.get(id);
        if (hot) {
            const hotId = '__hot:' + id;
            const newStore = isSetupStore
                ? createSetupStore(hotId, setup, options, pinia, true)
                : createOptionsStore(hotId, assign({}, options), pinia, true);
            hot._hotUpdate(newStore);
            // cleanup the state properties and the store from the cache
            delete pinia.state.value[hotId];
            pinia._s.delete(hotId);
        }
        if (IS_CLIENT) {
            const currentInstance = getCurrentInstance();
            // save stores in instances to access them devtools
            if (currentInstance &&
                currentInstance.proxy &&
                // avoid adding stores that are just built for hot module replacement
                !hot) {
                const vm = currentInstance.proxy;
                const cache = '_pStores' in vm ? vm._pStores : (vm._pStores = {});
                cache[id] = store;
            }
        }
        // StoreGeneric cannot be casted towards Store
        return store;
    }
    useStore.$id = id;
    return useStore;
}

let mapStoreSuffix = 'Store';
/**
 * Changes the suffix added by `mapStores()`. Can be set to an empty string.
 * Defaults to `"Store"`. Make sure to extend the MapStoresCustomization
 * interface if you are using TypeScript.
 *
 * @param suffix - new suffix
 */
function setMapStoreSuffix(suffix // could be 'Store' but that would be annoying for JS
) {
    mapStoreSuffix = suffix;
}
/**
 * Allows using stores without the composition API (`setup()`) by generating an
 * object to be spread in the `computed` field of a component. It accepts a list
 * of store definitions.
 *
 * @example
 * ```js
 * export default {
 *   computed: {
 *     // other computed properties
 *     ...mapStores(useUserStore, useCartStore)
 *   },
 *
 *   created() {
 *     this.userStore // store with id "user"
 *     this.cartStore // store with id "cart"
 *   }
 * }
 * ```
 *
 * @param stores - list of stores to map to an object
 */
function mapStores(...stores) {
    if (Array.isArray(stores[0])) {
        console.warn(`[🍍]: Directly pass all stores to "mapStores()" without putting them in an array:\n` +
            `Replace\n` +
            `\tmapStores([useAuthStore, useCartStore])\n` +
            `with\n` +
            `\tmapStores(useAuthStore, useCartStore)\n` +
            `This will fail in production if not fixed.`);
        stores = stores[0];
    }
    return stores.reduce((reduced, useStore) => {
        // @ts-expect-error: $id is added by defineStore
        reduced[useStore.$id + mapStoreSuffix] = function () {
            return useStore(this.$pinia);
        };
        return reduced;
    }, {});
}
/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            reduced[key] = function () {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[key];
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function () {
                const store = useStore(this.$pinia);
                const storeKey = keysOrMapper[key];
                // for some reason TS is unable to infer the type of storeKey to be a
                // function
                return typeof storeKey === 'function'
                    ? storeKey.call(this, store)
                    : // @ts-expect-error: FIXME: should work?
                        store[storeKey];
            };
            return reduced;
        }, {});
}
/**
 * Alias for `mapState()`. You should use `mapState()` instead.
 * @deprecated use `mapState()` instead.
 */
const mapGetters = mapState;
/**
 * Allows directly using actions from your store without using the composition
 * API (`setup()`) by generating an object to be spread in the `methods` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapActions(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function (...args) {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[key](...args);
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function (...args) {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[keysOrMapper[key]](...args);
            };
            return reduced;
        }, {});
}
/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapWritableState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            // @ts-ignore
            reduced[key] = {
                get() {
                    // @ts-expect-error: FIXME: should work?
                    return useStore(this.$pinia)[key];
                },
                set(value) {
                    // @ts-expect-error: FIXME: should work?
                    return (useStore(this.$pinia)[key] = value);
                },
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-ignore
            reduced[key] = {
                get() {
                    // @ts-expect-error: FIXME: should work?
                    return useStore(this.$pinia)[keysOrMapper[key]];
                },
                set(value) {
                    // @ts-expect-error: FIXME: should work?
                    return (useStore(this.$pinia)[keysOrMapper[key]] = value);
                },
            };
            return reduced;
        }, {});
}

/**
 * Creates an object of references with all the state, getters, and plugin-added
 * state properties of the store. Similar to `toRefs()` but specifically
 * designed for Pinia stores so methods and non reactive properties are
 * completely ignored.
 *
 * @param store - store to extract the refs from
 */
function storeToRefs(store) {
    // See https://github.com/vuejs/pinia/issues/852
    // It's easier to just use toRefs() even if it includes more stuff
    if (isVue2) {
        // @ts-expect-error: toRefs include methods and others
        return toRefs(store);
    }
    else {
        store = toRaw(store);
        const refs = {};
        for (const key in store) {
            const value = store[key];
            if (isRef(value) || isReactive(value)) {
                // @ts-expect-error: the key is state or getter
                refs[key] =
                    // ---
                    toRef(store, key);
            }
        }
        return refs;
    }
}

/**
 * Vue 2 Plugin that must be installed for pinia to work. Note **you don't need
 * this plugin if you are using Nuxt.js**. Use the `buildModule` instead:
 * https://pinia.vuejs.org/ssr/nuxt.html.
 *
 * @example
 * ```js
 * import Vue from 'vue'
 * import { PiniaVuePlugin, createPinia } from 'pinia'
 *
 * Vue.use(PiniaVuePlugin)
 * const pinia = createPinia()
 *
 * new Vue({
 *   el: '#app',
 *   // ...
 *   pinia,
 * })
 * ```
 *
 * @param _Vue - `Vue` imported from 'vue'.
 */
const PiniaVuePlugin = function (_Vue) {
    // Equivalent of
    // app.config.globalProperties.$pinia = pinia
    _Vue.mixin({
        beforeCreate() {
            const options = this.$options;
            if (options.pinia) {
                const pinia = options.pinia;
                // HACK: taken from provide(): https://github.com/vuejs/composition-api/blob/main/src/apis/inject.ts#L31
                /* istanbul ignore else */
                if (!this._provided) {
                    const provideCache = {};
                    Object.defineProperty(this, '_provided', {
                        get: () => provideCache,
                        set: (v) => Object.assign(provideCache, v),
                    });
                }
                this._provided[piniaSymbol] = pinia;
                // propagate the pinia instance in an SSR friendly way
                // avoid adding it to nuxt twice
                /* istanbul ignore else */
                if (!this.$pinia) {
                    this.$pinia = pinia;
                }
                pinia._a = this;
                if (IS_CLIENT) {
                    // this allows calling useStore() outside of a component setup after
                    // installing pinia's plugin
                    setActivePinia(pinia);
                }
                if (IS_CLIENT) {
                    registerPiniaDevtools(pinia._a, pinia);
                }
            }
            else if (!this.$pinia && options.parent && options.parent.$pinia) {
                this.$pinia = options.parent.$pinia;
            }
        },
        destroyed() {
            delete this._pStores;
        },
    });
};

export { MutationType, PiniaVuePlugin, acceptHMRUpdate, createPinia, defineStore, disposePinia, getActivePinia, mapActions, mapGetters, mapState, mapStores, mapWritableState, setActivePinia, setMapStoreSuffix, skipHydrate, storeToRefs };
