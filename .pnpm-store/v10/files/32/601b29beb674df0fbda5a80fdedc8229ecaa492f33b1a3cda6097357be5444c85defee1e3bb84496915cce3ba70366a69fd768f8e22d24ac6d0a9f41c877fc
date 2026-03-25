"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.SupabaseClient = exports.FunctionRegion = exports.FunctionsError = exports.FunctionsRelayError = exports.FunctionsFetchError = exports.FunctionsHttpError = exports.PostgrestError = void 0;
const SupabaseClient_1 = __importDefault(require("./SupabaseClient"));
__exportStar(require("@supabase/auth-js"), exports);
var postgrest_js_1 = require("@supabase/postgrest-js");
Object.defineProperty(exports, "PostgrestError", { enumerable: true, get: function () { return postgrest_js_1.PostgrestError; } });
var functions_js_1 = require("@supabase/functions-js");
Object.defineProperty(exports, "FunctionsHttpError", { enumerable: true, get: function () { return functions_js_1.FunctionsHttpError; } });
Object.defineProperty(exports, "FunctionsFetchError", { enumerable: true, get: function () { return functions_js_1.FunctionsFetchError; } });
Object.defineProperty(exports, "FunctionsRelayError", { enumerable: true, get: function () { return functions_js_1.FunctionsRelayError; } });
Object.defineProperty(exports, "FunctionsError", { enumerable: true, get: function () { return functions_js_1.FunctionsError; } });
Object.defineProperty(exports, "FunctionRegion", { enumerable: true, get: function () { return functions_js_1.FunctionRegion; } });
__exportStar(require("@supabase/realtime-js"), exports);
var SupabaseClient_2 = require("./SupabaseClient");
Object.defineProperty(exports, "SupabaseClient", { enumerable: true, get: function () { return __importDefault(SupabaseClient_2).default; } });
/**
 * Creates a new Supabase Client.
 */
const createClient = (supabaseUrl, supabaseKey, options) => {
    return new SupabaseClient_1.default(supabaseUrl, supabaseKey, options);
};
exports.createClient = createClient;
//# sourceMappingURL=index.js.map