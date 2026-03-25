import { createFileList } from './FileList.js';

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
// DataTransfer is not implemented in jsdom.
// DataTransfer with FileList is being created by the browser on certain events.
class DataTransferItemStub {
    getAsFile() {
        return this.file;
    }
    getAsString(callback) {
        if (typeof this.data === 'string') {
            callback(this.data);
        }
    }
    /* istanbul ignore next */ webkitGetAsEntry() {
        throw new Error('not implemented');
    }
    constructor(dataOrFile, type){
        _define_property(this, "kind", undefined);
        _define_property(this, "type", undefined);
        _define_property(this, "file", null);
        _define_property(this, "data", undefined);
        if (typeof dataOrFile === 'string') {
            this.kind = 'string';
            this.type = String(type);
            this.data = dataOrFile;
        } else {
            this.kind = 'file';
            this.type = dataOrFile.type;
            this.file = dataOrFile;
        }
    }
}
class DataTransferItemListStub extends Array {
    add(...args) {
        const item = new DataTransferItemStub(args[0], args[1]);
        this.push(item);
        return item;
    }
    clear() {
        this.splice(0, this.length);
    }
    remove(index) {
        this.splice(index, 1);
    }
}
function getTypeMatcher(type, exact) {
    const [group, sub] = type.split('/');
    const isGroup = !sub || sub === '*';
    return (item)=>{
        return exact ? item.type === (isGroup ? group : type) : isGroup ? item.type.startsWith(`${group}/`) : item.type === group;
    };
}
function createDataTransferStub(window) {
    return new class DataTransferStub {
        getData(format) {
            var _this_items_find;
            const match = (_this_items_find = this.items.find(getTypeMatcher(format, true))) !== null && _this_items_find !== undefined ? _this_items_find : this.items.find(getTypeMatcher(format, false));
            let text = '';
            match === null || match === undefined ? undefined : match.getAsString((t)=>{
                text = t;
            });
            return text;
        }
        setData(format, data) {
            const matchIndex = this.items.findIndex(getTypeMatcher(format, true));
            const item = new DataTransferItemStub(data, format);
            if (matchIndex >= 0) {
                this.items.splice(matchIndex, 1, item);
            } else {
                this.items.push(item);
            }
        }
        clearData(format) {
            if (format) {
                const matchIndex = this.items.findIndex(getTypeMatcher(format, true));
                if (matchIndex >= 0) {
                    this.items.remove(matchIndex);
                }
            } else {
                this.items.clear();
            }
        }
        get types() {
            const t = [];
            if (this.files.length) {
                t.push('Files');
            }
            this.items.forEach((i)=>t.push(i.type));
            Object.freeze(t);
            return t;
        }
        /* istanbul ignore next */ setDragImage() {}
        constructor(){
            _define_property(this, "dropEffect", 'none');
            _define_property(this, "effectAllowed", 'uninitialized');
            _define_property(this, "items", new DataTransferItemListStub());
            _define_property(this, "files", createFileList(window, []));
        }
    }();
}
function createDataTransfer(window, files = []) {
    // Use real DataTransfer if available
    const dt = typeof window.DataTransfer === 'undefined' ? createDataTransferStub(window) : /* istanbul ignore next */ new window.DataTransfer();
    Object.defineProperty(dt, 'files', {
        get: ()=>createFileList(window, files)
    });
    return dt;
}
async function getBlobFromDataTransferItem(window, item) {
    if (item.kind === 'file') {
        return item.getAsFile();
    }
    return new window.Blob([
        await new Promise((r)=>item.getAsString(r))
    ], {
        type: item.type
    });
}

export { createDataTransfer, getBlobFromDataTransferItem };
