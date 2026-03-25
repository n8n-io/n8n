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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
/**
 * Extract information from an setup-style VueJs 3 component
 * about what methods and variable are exposed
 * @param {NodePath} astPath
 * @param {Array<NodePath>} componentDefinitions
 * @param {string} originalFilePath
 */
function setupExposedHandler(documentation, componentDefinition, astPath, opt) {
    return __awaiter(this, void 0, void 0, function () {
        function buildExposeDescriptor(exposedName, exposedPath) {
            var exposeDescriptor = documentation.getExposeDescriptor(exposedName);
            var docBlock = (0, getDocblock_1.default)(exposedPath);
            if (docBlock) {
                var jsDoc = (0, getDoclets_1.default)(docBlock);
                setExposeDescriptor(exposeDescriptor, jsDoc);
            }
        }
        function setExposeDescriptor(exposeDescriptor, jsDoc) {
            var _a;
            if (jsDoc.description && jsDoc.description.length) {
                exposeDescriptor.description = jsDoc.description;
            }
            if ((_a = jsDoc.tags) === null || _a === void 0 ? void 0 : _a.length) {
                exposeDescriptor.tags = jsDoc.tags;
            }
        }
        return __generator(this, function (_a) {
            (0, recast_1.visit)(astPath.program, {
                visitCallExpression: function (nodePath) {
                    if (bt.isIdentifier(nodePath.node.callee) && nodePath.node.callee.name === 'defineExpose') {
                        if (bt.isObjectExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'properties').each(function (prop) {
                                if (bt.isIdentifier(prop.node.key)) {
                                    buildExposeDescriptor(prop.node.key.name, prop);
                                }
                                else if (bt.isStringLiteral(prop.node.key)) {
                                    buildExposeDescriptor(prop.node.key.value, prop);
                                }
                            });
                        }
                        else if (bt.isArrayExpression(nodePath.get('arguments', 0).node)) {
                            nodePath.get('arguments', 0, 'elements').each(function (prop) {
                                if (bt.isStringLiteral(prop.node)) {
                                    buildExposeDescriptor(prop.node.value, prop);
                                }
                            });
                        }
                    }
                    return false;
                }
            });
            return [2 /*return*/];
        });
    });
}
exports.default = setupExposedHandler;
