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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.avdlToAVSC = avdlToAVSC;
exports.avdlToAVSCAsync = avdlToAVSCAsync;
const fs = __importStar(require("fs"));
const avsc_1 = require("avsc");
const errors_1 = require("../errors");
let cache;
const merge = Object.assign;
const isObject = (obj) => !!obj && typeof obj === 'object';
const isIterable = (obj) => isObject(obj) && typeof obj.map !== 'undefined';
const isFieldArray = (field) => isObject(field) && isObject(field.type) && field.type.type === 'array';
const combine = (rootType, types) => {
    if (!rootType.fields) {
        return rootType;
    }
    const find = (name) => {
        if (typeof name === 'string') {
            name = name.toLowerCase();
        }
        const typeToCombine = types.find((t) => {
            const names = [];
            if (t.namespace) {
                names.push(`${t.namespace}.`);
            }
            names.push(t.name.toLowerCase());
            return names.join('') === name;
        });
        if (!typeToCombine || cache[typeToCombine.name]) {
            return null;
        }
        cache[typeToCombine.name] = 1;
        return combine(typeToCombine, types);
    };
    const combinedFields = rootType.fields.map((field) => {
        if (isFieldArray(field)) {
            const typeToCombine = find(field.type.items);
            return typeToCombine
                ? merge(field, { type: merge(field.type, { items: typeToCombine }) })
                : field;
        }
        else if (isIterable(field.type)) {
            const type = field.type.map((unionType) => {
                if (isObject(unionType)) {
                    const typeToCombine = find(unionType.items);
                    return typeToCombine ? merge(unionType, { items: typeToCombine }) : unionType;
                }
                else {
                    return find(unionType) || unionType;
                }
            });
            return merge(field, { type });
        }
        const typeToCombine = find(field.type);
        return typeToCombine ? merge(field, { type: typeToCombine }) : field;
    });
    return merge(rootType, { fields: combinedFields });
};
function avdlToAVSC(path) {
    cache = {};
    const protocol = (0, avsc_1.readProtocol)(fs.readFileSync(path, 'utf8'));
    return merge({ namespace: protocol.namespace }, combine(protocol.types.pop(), protocol.types));
}
async function avdlToAVSCAsync(path) {
    cache = {};
    const protocol = await new Promise((resolve, reject) => {
        (0, avsc_1.assembleProtocol)(path, (err, schema) => {
            if (err) {
                reject(new errors_1.ConfluentSchemaRegistryError(`${err.message}. Caused by: ${err.path}`));
            }
            else {
                resolve(schema);
            }
        });
    });
    return merge({ namespace: protocol.namespace }, combine(protocol.types.pop(), protocol.types));
}
//# sourceMappingURL=avdlToAVSC.js.map