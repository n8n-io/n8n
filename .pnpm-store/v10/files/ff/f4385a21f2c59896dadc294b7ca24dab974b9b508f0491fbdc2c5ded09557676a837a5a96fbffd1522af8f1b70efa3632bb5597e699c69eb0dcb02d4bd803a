"use strict";
/**
 * Created by user on 2018/2/1/001.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPub = exports.SYMBOL_RAW_DATA = void 0;
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const path_1 = tslib_1.__importDefault(require("path"));
const epub_1 = require("./lib/epub");
var types_1 = require("./lib/types");
Object.defineProperty(exports, "SYMBOL_RAW_DATA", { enumerable: true, get: function () { return types_1.SYMBOL_RAW_DATA; } });
class EPub extends epub_1.EPub {
    static createAsync(epubfile, imagewebroot, chapterwebroot, ...argv) {
        const self = this;
        const p = self.libPromise;
        return new p(function (resolve, reject) {
            const epub = self.create(epubfile, imagewebroot, chapterwebroot, ...argv);
            const cb_err = function (err) {
                err.epub = epub;
                return reject(err);
            };
            epub.on('error', cb_err);
            epub.on('end', function (err) {
                if (err) {
                    cb_err(err);
                }
                else {
                    // @ts-ignore
                    resolve(this);
                }
            });
            epub.parse();
        });
    }
    _p_method_cb(method, options = {}, ...argv) {
        const self = this;
        const p = this._getStatic().libPromise;
        return bluebird_1.default.fromCallback(method.bind(self, argv), options);
    }
    getChapterAsync(chapterId) {
        return this._p_method_cb(this.getChapter, null, chapterId);
    }
    getChapterRawAsync(chapterId) {
        return this._p_method_cb(this.getChapterRaw, null, chapterId);
    }
    getFileAsync(id) {
        return this._p_method_cb(this.getFile, {
            multiArgs: true,
        }, id);
    }
    getImageAsync(id) {
        return this._p_method_cb(this.getImage, {
            multiArgs: true,
        }, id);
    }
    listImage() {
        const epub = this;
        const mimes = [
            'image/jpeg',
        ];
        const exts = [
            'jpg',
            'png',
            'gif',
            'webp',
            'tif',
            'bmp',
            //'jxr',
            //'psd'
        ];
        return Object.keys(epub.manifest)
            .reduce(function (a, id) {
            let elem = epub.manifest[id];
            let mime = elem['media-type'] || elem.mediaType;
            if (mimes.includes(mime) || mime.indexOf('image') == 0 || exts.includes(path_1.default.extname(elem.href))) {
                a.push(elem);
            }
            return a;
        }, []);
    }
}
exports.EPub = EPub;
EPub.xml2jsOptions = Object.assign({}, epub_1.EPub.xml2jsOptions, {
    normalize: null,
});
/**
 * allow change Promise class
 * @type {PromiseConstructor}
 */
EPub.libPromise = bluebird_1.default;
exports.default = EPub;
//# sourceMappingURL=index.js.map