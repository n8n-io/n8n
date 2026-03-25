Object.defineProperty(exports, "__esModule", { value: true });
exports.locateWindow = void 0;
const fallbackWindow = {};
function locateWindow() {
    if (typeof window !== "undefined") {
        return window;
    }
    else if (typeof self !== "undefined") {
        return self;
    }
    return fallbackWindow;
}
exports.locateWindow = locateWindow;
