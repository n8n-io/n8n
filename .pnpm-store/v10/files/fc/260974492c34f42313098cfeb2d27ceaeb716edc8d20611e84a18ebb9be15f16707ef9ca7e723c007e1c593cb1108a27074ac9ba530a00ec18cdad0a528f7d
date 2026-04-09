var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { deserialize, pick, randomInt, sizeof, struct, types as t } from 'utilium';
import { Stats } from '../stats.js';
import { size_max } from '../vfs/constants.js';
import { crit, debug } from './log.js';
/**
 * Root inode
 * @hidden
 */
export const rootIno = 0;
/**
 * @internal @hidden
 */
export const _inode_fields = ['ino', 'data', 'size', 'mode', 'flags', 'nlink', 'uid', 'gid', 'atimeMs', 'birthtimeMs', 'mtimeMs', 'ctimeMs'];
/**
 * Represents which version of the `Inode` format we are on.
 * 1. 58 bytes. The first member was called `ino` but used as the ID for data.
 * 2. 66 bytes. Renamed the first member from `ino` to `data` and added a separate `ino` field
 * 3. (current) 72 bytes. Changed the ID fields from 64 to 32 bits and added `flags`.
 * @internal @hidden
 */
export const _inode_version = 3;
/**
 * Generic inode definition that can easily be serialized.
 * @category Internals
 * @internal
 * @todo [BREAKING] Remove 58 byte Inode upgrade path
 */
let Inode = (() => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    let _classDecorators = [struct()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _data_decorators;
    let _data_initializers = [];
    let _data_extraInitializers = [];
    let ___data_old_decorators;
    let ___data_old_initializers = [];
    let ___data_old_extraInitializers = [];
    let _size_decorators;
    let _size_initializers = [];
    let _size_extraInitializers = [];
    let _mode_decorators;
    let _mode_initializers = [];
    let _mode_extraInitializers = [];
    let _nlink_decorators;
    let _nlink_initializers = [];
    let _nlink_extraInitializers = [];
    let _uid_decorators;
    let _uid_initializers = [];
    let _uid_extraInitializers = [];
    let _gid_decorators;
    let _gid_initializers = [];
    let _gid_extraInitializers = [];
    let _atimeMs_decorators;
    let _atimeMs_initializers = [];
    let _atimeMs_extraInitializers = [];
    let _birthtimeMs_decorators;
    let _birthtimeMs_initializers = [];
    let _birthtimeMs_extraInitializers = [];
    let _mtimeMs_decorators;
    let _mtimeMs_initializers = [];
    let _mtimeMs_extraInitializers = [];
    let _ctimeMs_decorators;
    let _ctimeMs_initializers = [];
    let _ctimeMs_extraInitializers = [];
    let _ino_decorators;
    let _ino_initializers = [];
    let _ino_extraInitializers = [];
    let ___ino_old_decorators;
    let ___ino_old_initializers = [];
    let ___ino_old_extraInitializers = [];
    let _flags_decorators;
    let _flags_initializers = [];
    let _flags_extraInitializers = [];
    let ___padding_decorators;
    let ___padding_initializers = [];
    let ___padding_extraInitializers = [];
    var Inode = _classThis = class {
        constructor(data) {
            this.data = __runInitializers(this, _data_initializers, randomInt(0, size_max));
            /** For future use */
            this.__data_old = (__runInitializers(this, _data_extraInitializers), __runInitializers(this, ___data_old_initializers, 0));
            this.size = (__runInitializers(this, ___data_old_extraInitializers), __runInitializers(this, _size_initializers, 0));
            this.mode = (__runInitializers(this, _size_extraInitializers), __runInitializers(this, _mode_initializers, 0));
            this.nlink = (__runInitializers(this, _mode_extraInitializers), __runInitializers(this, _nlink_initializers, 1));
            this.uid = (__runInitializers(this, _nlink_extraInitializers), __runInitializers(this, _uid_initializers, 0));
            this.gid = (__runInitializers(this, _uid_extraInitializers), __runInitializers(this, _gid_initializers, 0));
            this.atimeMs = (__runInitializers(this, _gid_extraInitializers), __runInitializers(this, _atimeMs_initializers, Date.now()));
            this.birthtimeMs = (__runInitializers(this, _atimeMs_extraInitializers), __runInitializers(this, _birthtimeMs_initializers, Date.now()));
            this.mtimeMs = (__runInitializers(this, _birthtimeMs_extraInitializers), __runInitializers(this, _mtimeMs_initializers, Date.now()));
            this.ctimeMs = (__runInitializers(this, _mtimeMs_extraInitializers), __runInitializers(this, _ctimeMs_initializers, Date.now()));
            this.ino = (__runInitializers(this, _ctimeMs_extraInitializers), __runInitializers(this, _ino_initializers, randomInt(0, size_max)));
            /** For future use */
            this.__ino_old = (__runInitializers(this, _ino_extraInitializers), __runInitializers(this, ___ino_old_initializers, 0));
            this.flags = (__runInitializers(this, ___ino_old_extraInitializers), __runInitializers(this, _flags_initializers, 0));
            /** For future use */
            this.__padding = (__runInitializers(this, _flags_extraInitializers), __runInitializers(this, ___padding_initializers, 0));
            __runInitializers(this, ___padding_extraInitializers);
            if (!data)
                return;
            if (!('byteLength' in data)) {
                Object.assign(this, data);
                return;
            }
            if (data.byteLength < 58) {
                throw crit(new RangeError('Can not create an inode from a buffer less than 58 bytes'));
            }
            // Expand the buffer so it is the right size
            if (data.byteLength < __inode_sz) {
                const buf = ArrayBuffer.isView(data) ? data.buffer : data;
                const newBuffer = new Uint8Array(__inode_sz);
                newBuffer.set(new Uint8Array(buf));
                debug('Extending undersized buffer for inode');
                data = newBuffer;
            }
            deserialize(this, data);
        }
        toString() {
            return `<Inode ${this.ino}>`;
        }
        toJSON() {
            return pick(this, _inode_fields);
        }
        /**
         * Handy function that converts the Inode to a Node Stats object.
         */
        toStats() {
            return new Stats(this);
        }
        /**
         * Updates the Inode using information from the stats object. Used by file
         * systems at sync time, e.g.:
         * - Program opens file and gets a File object.
         * - Program mutates file. File object is responsible for maintaining
         *   metadata changes locally -- typically in a Stats object.
         * - Program closes file. File object's metadata changes are synced with the
         *   file system.
         * @returns whether any changes have occurred.
         */
        update(data) {
            if (!data)
                return false;
            let hasChanged = false;
            for (const key of _inode_fields) {
                if (data[key] === undefined)
                    continue;
                // When multiple StoreFSes are used in a single stack, the differing IDs end up here.
                if (key == 'ino' || key == 'data')
                    continue;
                if (this[key] === data[key])
                    continue;
                this[key] = data[key];
                hasChanged = true;
            }
            return hasChanged;
        }
    };
    __setFunctionName(_classThis, "Inode");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _data_decorators = [(_a = t).uint32.bind(_a)];
        ___data_old_decorators = [(_b = t).uint32.bind(_b)];
        _size_decorators = [(_c = t).uint32.bind(_c)];
        _mode_decorators = [(_d = t).uint16.bind(_d)];
        _nlink_decorators = [(_e = t).uint32.bind(_e)];
        _uid_decorators = [(_f = t).uint32.bind(_f)];
        _gid_decorators = [(_g = t).uint32.bind(_g)];
        _atimeMs_decorators = [(_h = t).float64.bind(_h)];
        _birthtimeMs_decorators = [(_j = t).float64.bind(_j)];
        _mtimeMs_decorators = [(_k = t).float64.bind(_k)];
        _ctimeMs_decorators = [(_l = t).float64.bind(_l)];
        _ino_decorators = [(_m = t).uint32.bind(_m)];
        ___ino_old_decorators = [(_o = t).uint32.bind(_o)];
        _flags_decorators = [(_p = t).uint32.bind(_p)];
        ___padding_decorators = [(_q = t).uint16.bind(_q)];
        __esDecorate(null, null, _data_decorators, { kind: "field", name: "data", static: false, private: false, access: { has: obj => "data" in obj, get: obj => obj.data, set: (obj, value) => { obj.data = value; } }, metadata: _metadata }, _data_initializers, _data_extraInitializers);
        __esDecorate(null, null, ___data_old_decorators, { kind: "field", name: "__data_old", static: false, private: false, access: { has: obj => "__data_old" in obj, get: obj => obj.__data_old, set: (obj, value) => { obj.__data_old = value; } }, metadata: _metadata }, ___data_old_initializers, ___data_old_extraInitializers);
        __esDecorate(null, null, _size_decorators, { kind: "field", name: "size", static: false, private: false, access: { has: obj => "size" in obj, get: obj => obj.size, set: (obj, value) => { obj.size = value; } }, metadata: _metadata }, _size_initializers, _size_extraInitializers);
        __esDecorate(null, null, _mode_decorators, { kind: "field", name: "mode", static: false, private: false, access: { has: obj => "mode" in obj, get: obj => obj.mode, set: (obj, value) => { obj.mode = value; } }, metadata: _metadata }, _mode_initializers, _mode_extraInitializers);
        __esDecorate(null, null, _nlink_decorators, { kind: "field", name: "nlink", static: false, private: false, access: { has: obj => "nlink" in obj, get: obj => obj.nlink, set: (obj, value) => { obj.nlink = value; } }, metadata: _metadata }, _nlink_initializers, _nlink_extraInitializers);
        __esDecorate(null, null, _uid_decorators, { kind: "field", name: "uid", static: false, private: false, access: { has: obj => "uid" in obj, get: obj => obj.uid, set: (obj, value) => { obj.uid = value; } }, metadata: _metadata }, _uid_initializers, _uid_extraInitializers);
        __esDecorate(null, null, _gid_decorators, { kind: "field", name: "gid", static: false, private: false, access: { has: obj => "gid" in obj, get: obj => obj.gid, set: (obj, value) => { obj.gid = value; } }, metadata: _metadata }, _gid_initializers, _gid_extraInitializers);
        __esDecorate(null, null, _atimeMs_decorators, { kind: "field", name: "atimeMs", static: false, private: false, access: { has: obj => "atimeMs" in obj, get: obj => obj.atimeMs, set: (obj, value) => { obj.atimeMs = value; } }, metadata: _metadata }, _atimeMs_initializers, _atimeMs_extraInitializers);
        __esDecorate(null, null, _birthtimeMs_decorators, { kind: "field", name: "birthtimeMs", static: false, private: false, access: { has: obj => "birthtimeMs" in obj, get: obj => obj.birthtimeMs, set: (obj, value) => { obj.birthtimeMs = value; } }, metadata: _metadata }, _birthtimeMs_initializers, _birthtimeMs_extraInitializers);
        __esDecorate(null, null, _mtimeMs_decorators, { kind: "field", name: "mtimeMs", static: false, private: false, access: { has: obj => "mtimeMs" in obj, get: obj => obj.mtimeMs, set: (obj, value) => { obj.mtimeMs = value; } }, metadata: _metadata }, _mtimeMs_initializers, _mtimeMs_extraInitializers);
        __esDecorate(null, null, _ctimeMs_decorators, { kind: "field", name: "ctimeMs", static: false, private: false, access: { has: obj => "ctimeMs" in obj, get: obj => obj.ctimeMs, set: (obj, value) => { obj.ctimeMs = value; } }, metadata: _metadata }, _ctimeMs_initializers, _ctimeMs_extraInitializers);
        __esDecorate(null, null, _ino_decorators, { kind: "field", name: "ino", static: false, private: false, access: { has: obj => "ino" in obj, get: obj => obj.ino, set: (obj, value) => { obj.ino = value; } }, metadata: _metadata }, _ino_initializers, _ino_extraInitializers);
        __esDecorate(null, null, ___ino_old_decorators, { kind: "field", name: "__ino_old", static: false, private: false, access: { has: obj => "__ino_old" in obj, get: obj => obj.__ino_old, set: (obj, value) => { obj.__ino_old = value; } }, metadata: _metadata }, ___ino_old_initializers, ___ino_old_extraInitializers);
        __esDecorate(null, null, _flags_decorators, { kind: "field", name: "flags", static: false, private: false, access: { has: obj => "flags" in obj, get: obj => obj.flags, set: (obj, value) => { obj.flags = value; } }, metadata: _metadata }, _flags_initializers, _flags_extraInitializers);
        __esDecorate(null, null, ___padding_decorators, { kind: "field", name: "__padding", static: false, private: false, access: { has: obj => "__padding" in obj, get: obj => obj.__padding, set: (obj, value) => { obj.__padding = value; } }, metadata: _metadata }, ___padding_initializers, ___padding_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Inode = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Inode = _classThis;
})();
export { Inode };
/**
 * @internal @hidden
 */
export const __inode_sz = sizeof(Inode);
