"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeaconPath = void 0;
const string_js_1 = require("../validation/string.js");
const version_js_1 = require("../validation/version.js");
const beaconPathPrefix = 'weaviate://localhost';
class BeaconPath {
    constructor(dbVersionSupport) {
        this.dbVersionSupport = dbVersionSupport;
        // matches
        // weaviate://localhost/class/id    => match[2] = class, match[4] = id
        // weaviate://localhost/class/id/   => match[2] = class, match[4] = id
        // weaviate://localhost/id          => match[2] = id, match[4] = undefined
        // weaviate://localhost/id/         => match[2] = id, match[4] = undefined
        this.beaconRegExp = /^weaviate:\/\/localhost(\/([^\\/]+))?(\/([^\\/]+))?[\\/]?$/gi;
    }
    rebuild(beacon) {
        return __awaiter(this, void 0, void 0, function* () {
            const support = yield this.dbVersionSupport.supportsClassNameNamespacedEndpointsPromise();
            const match = new RegExp(this.beaconRegExp).exec(beacon);
            if (!match) {
                return beacon;
            }
            let className;
            let id;
            if (match[4] !== undefined) {
                id = match[4];
                className = match[2];
            }
            else {
                id = match[2];
            }
            let beaconPath = beaconPathPrefix;
            if (support.supports) {
                if ((0, string_js_1.isValidStringProperty)(className)) {
                    beaconPath = `${beaconPath}/${className}`;
                }
                else {
                    support.warns.deprecatedNonClassNameNamespacedEndpointsForBeacons();
                }
            }
            else {
                support.warns.notSupportedClassNamespacedEndpointsForBeacons();
            }
            if (support.version) {
                if (!(0, version_js_1.isValidWeaviateVersion)(support.version)) {
                    support.warns.deprecatedWeaviateTooOld();
                }
            }
            if ((0, string_js_1.isValidStringProperty)(id)) {
                beaconPath = `${beaconPath}/${id}`;
            }
            return beaconPath;
        });
    }
}
exports.BeaconPath = BeaconPath;
