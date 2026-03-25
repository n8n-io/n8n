(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.isSupportedEmoji = {}));
}(this, (function (exports) { 'use strict';

    /**
     * @var {Object} cache
     */
    var cache = new Map();
    /**
     * Check if emoji is supported with cache
     *
     * @params {string} unicode
     * @returns {boolean}
     */
    function isEmojiSupported(unicode) {
        if (cache.has(unicode)) {
            return cache.get(unicode);
        }
        var supported = isSupported(unicode);
        cache.set(unicode, supported);
        return supported;
    }
    /**
     * Request to handle cache directly
     *
     * @params {Map} store
     */
    function setCacheHandler(store) {
        cache = store;
    }
    /**
     * Check if the two pixels parts are perfectly the sames
     *
     * @params {string} unicode
     * @returns {boolean}
     */
    var isSupported = (function () {
        var ctx = null;
        try {
            ctx = document.createElement('canvas').getContext('2d');
        }
        catch (_a) { }
        // Not in browser env
        if (!ctx) {
            return function () { return false; };
        }
        var CANVAS_HEIGHT = 25;
        var CANVAS_WIDTH = 20;
        var textSize = Math.floor(CANVAS_HEIGHT / 2);
        // Initialize convas context
        ctx.font = textSize + 'px Arial, Sans-Serif';
        ctx.textBaseline = 'top';
        ctx.canvas.width = CANVAS_WIDTH * 2;
        ctx.canvas.height = CANVAS_HEIGHT;
        return function (unicode) {
            ctx.clearRect(0, 0, CANVAS_WIDTH * 2, CANVAS_HEIGHT);
            // Draw in red on the left
            ctx.fillStyle = '#FF0000';
            ctx.fillText(unicode, 0, 22);
            // Draw in blue on right
            ctx.fillStyle = '#0000FF';
            ctx.fillText(unicode, CANVAS_WIDTH, 22);
            var a = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
            var count = a.length;
            var i = 0;
            // Search the first visible pixel
            for (; i < count && !a[i + 3]; i += 4)
                ;
            // No visible pixel
            if (i >= count) {
                return false;
            }
            // Emoji has immutable color, so we check the color of the emoji in two different colors
            // the result show be the same.
            var x = CANVAS_WIDTH + ((i / 4) % CANVAS_WIDTH);
            var y = Math.floor(i / 4 / CANVAS_WIDTH);
            var b = ctx.getImageData(x, y, 1, 1).data;
            if (a[i] !== b[0] || a[i + 2] !== b[2]) {
                return false;
            }
            // Some emojis are a contraction of different ones, so if it's not
            // supported, it will show multiple characters
            if (ctx.measureText(unicode).width >= CANVAS_WIDTH) {
                return false;
            }
            // Supported
            return true;
        };
    })();

    exports.isEmojiSupported = isEmojiSupported;
    exports.setCacheHandler = setCacheHandler;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=is-emoji-supported.js.map
