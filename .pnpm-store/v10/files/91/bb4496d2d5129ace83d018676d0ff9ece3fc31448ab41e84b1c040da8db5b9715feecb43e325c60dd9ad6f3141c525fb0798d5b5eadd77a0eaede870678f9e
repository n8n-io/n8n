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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
const number_js_1 = require("../validation/number.js");
const hybrid_js_1 = __importDefault(require("./hybrid.js"));
const nearMedia_js_1 = __importStar(require("./nearMedia.js"));
const nearObject_js_1 = __importDefault(require("./nearObject.js"));
const nearText_js_1 = __importDefault(require("./nearText.js"));
const nearVector_js_1 = __importDefault(require("./nearVector.js"));
const where_js_1 = __importDefault(require("./where.js"));
class Aggregator extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withFields = (fields) => {
            this.fields = fields;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withWhere = (where) => {
            try {
                this.whereString = new where_js_1.default(where).toString();
            }
            catch (e) {
                this.addError(e);
            }
            return this;
        };
        this.withNearMedia = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearMediaString = new nearMedia_js_1.default(args).toString();
                this.nearMediaType = args.type;
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearImage = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.image, type: nearMedia_js_1.NearMediaType.Image }));
        };
        this.withNearAudio = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.audio, type: nearMedia_js_1.NearMediaType.Audio }));
        };
        this.withNearVideo = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.video, type: nearMedia_js_1.NearMediaType.Video }));
        };
        this.withNearDepth = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.depth, type: nearMedia_js_1.NearMediaType.Depth }));
        };
        this.withNearIMU = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.imu, type: nearMedia_js_1.NearMediaType.IMU }));
        };
        this.withNearText = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearTextString = new nearText_js_1.default(args).toString();
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearObject = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearObjectString = new nearObject_js_1.default(args).toString();
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearVector = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearVectorString = new nearVector_js_1.default(args).toString();
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withHybrid = (args) => {
            try {
                this.hybridString = new hybrid_js_1.default(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withObjectLimit = (objectLimit) => {
            if (!(0, number_js_1.isValidPositiveIntProperty)(objectLimit)) {
                throw new Error('objectLimit must be a non-negative integer');
            }
            this.objectLimit = objectLimit;
            return this;
        };
        this.withLimit = (limit) => {
            this.limit = limit;
            return this;
        };
        this.withGroupBy = (groupBy) => {
            this.groupBy = groupBy;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateGroup = () => {
            if (!this.groupBy) {
                // nothing to check if this optional parameter is not set
                return;
            }
            if (!Array.isArray(this.groupBy)) {
                throw new Error('groupBy must be an array');
            }
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateGroup();
            this.validateIsSet(this.className, 'className', '.withClassName(className)');
            this.validateIsSet(this.fields, 'fields', '.withFields(fields)');
        };
        this.do = () => {
            let params = '';
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            if (this.whereString ||
                this.nearTextString ||
                this.nearObjectString ||
                this.nearVectorString ||
                this.limit ||
                this.groupBy ||
                this.hybridString ||
                this.tenant) {
                let args = [];
                if (this.whereString) {
                    args = [...args, `where:${this.whereString}`];
                }
                if (this.nearTextString) {
                    args = [...args, `nearText:${this.nearTextString}`];
                }
                if (this.nearObjectString) {
                    args = [...args, `nearObject:${this.nearObjectString}`];
                }
                if (this.nearVectorString) {
                    args = [...args, `nearVector:${this.nearVectorString}`];
                }
                if (this.nearMediaString) {
                    args = [...args, `${this.nearMediaType}:${this.nearMediaString}`];
                }
                if (this.groupBy) {
                    args = [...args, `groupBy:${JSON.stringify(this.groupBy)}`];
                }
                if (this.hybridString) {
                    args = [...args, `hybrid:${this.hybridString}`];
                }
                if (this.limit) {
                    args = [...args, `limit:${this.limit}`];
                }
                if (this.objectLimit) {
                    args = [...args, `objectLimit:${this.objectLimit}`];
                }
                if (this.tenant) {
                    args = [...args, `tenant:"${this.tenant}"`];
                }
                params = `(${args.join(',')})`;
            }
            return this.client.query(`{Aggregate{${this.className}${params}{${this.fields}}}}`);
        };
        this.includesNearMediaFilter = false;
    }
}
exports.default = Aggregator;
