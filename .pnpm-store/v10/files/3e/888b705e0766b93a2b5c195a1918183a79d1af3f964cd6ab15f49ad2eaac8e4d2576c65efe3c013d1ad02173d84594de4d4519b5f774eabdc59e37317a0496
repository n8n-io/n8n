"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REALTIME_OPTIONS = exports.DEFAULT_AUTH_OPTIONS = exports.DEFAULT_DB_OPTIONS = exports.DEFAULT_GLOBAL_OPTIONS = exports.DEFAULT_HEADERS = void 0;
const version_1 = require("./version");
let JS_ENV = '';
// @ts-ignore
if (typeof Deno !== 'undefined') {
    JS_ENV = 'deno';
}
else if (typeof document !== 'undefined') {
    JS_ENV = 'web';
}
else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    JS_ENV = 'react-native';
}
else {
    JS_ENV = 'node';
}
exports.DEFAULT_HEADERS = { 'X-Client-Info': `supabase-js-${JS_ENV}/${version_1.version}` };
exports.DEFAULT_GLOBAL_OPTIONS = {
    headers: exports.DEFAULT_HEADERS,
};
exports.DEFAULT_DB_OPTIONS = {
    schema: 'public',
};
exports.DEFAULT_AUTH_OPTIONS = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
};
exports.DEFAULT_REALTIME_OPTIONS = {};
//# sourceMappingURL=constants.js.map