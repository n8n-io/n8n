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
exports.FusionType = void 0;
const commandBase_js_1 = require("../validation/commandBase.js");
const ask_js_1 = __importDefault(require("./ask.js"));
const bm25_js_1 = __importDefault(require("./bm25.js"));
const generate_js_1 = require("./generate.js");
const group_js_1 = __importDefault(require("./group.js"));
const groupBy_js_1 = __importDefault(require("./groupBy.js"));
const hybrid_js_1 = __importDefault(require("./hybrid.js"));
const nearImage_js_1 = __importDefault(require("./nearImage.js"));
const nearMedia_js_1 = __importStar(require("./nearMedia.js"));
const nearObject_js_1 = __importDefault(require("./nearObject.js"));
const nearText_js_1 = __importDefault(require("./nearText.js"));
const nearVector_js_1 = __importDefault(require("./nearVector.js"));
const sort_js_1 = __importDefault(require("./sort.js"));
const where_js_1 = __importDefault(require("./where.js"));
var hybrid_js_2 = require("./hybrid.js");
Object.defineProperty(exports, "FusionType", { enumerable: true, get: function () { return hybrid_js_2.FusionType; } });
class GraphQLGetter extends commandBase_js_1.CommandBase {
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
        this.withAfter = (id) => {
            this.after = id;
            return this;
        };
        this.withGroup = (args) => {
            try {
                this.groupString = new group_js_1.default(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withWhere = (whereObj) => {
            try {
                this.whereString = new where_js_1.default(whereObj).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearText = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            this.nearTextString = new nearText_js_1.default(args).toString();
            this.includesNearMediaFilter = true;
            return this;
        };
        this.withBm25 = (args) => {
            try {
                this.bm25String = new bm25_js_1.default(args).toString();
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
        this.withAsk = (askObj) => {
            try {
                this.askString = new ask_js_1.default(askObj).toString();
            }
            catch (e) {
                this.addError(e.toString());
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
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearMediaString = new nearImage_js_1.default(args).toString();
                this.nearMediaType = nearMedia_js_1.NearMediaType.Image;
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearAudio = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: nearMedia_js_1.NearMediaType.Audio, media: args.audio }));
        };
        this.withNearVideo = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: nearMedia_js_1.NearMediaType.Video, media: args.video }));
        };
        this.withNearThermal = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: nearMedia_js_1.NearMediaType.Thermal, media: args.thermal }));
        };
        this.withNearDepth = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: nearMedia_js_1.NearMediaType.Depth, media: args.depth }));
        };
        this.withNearIMU = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: nearMedia_js_1.NearMediaType.IMU, media: args.imu }));
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
        this.withLimit = (limit) => {
            this.limit = limit;
            return this;
        };
        this.withOffset = (offset) => {
            this.offset = offset;
            return this;
        };
        this.withAutocut = (autocut) => {
            this.autocut = autocut;
            return this;
        };
        this.withSort = (args) => {
            this.sortString = new sort_js_1.default(args).toString();
            return this;
        };
        this.withGenerate = (args) => {
            this.generateString = new generate_js_1.GraphQLGenerate(args).toString();
            return this;
        };
        this.withConsistencyLevel = (level) => {
            this.consistencyLevel = level;
            return this;
        };
        this.withGroupBy = (args) => {
            try {
                this.groupByString = new groupBy_js_1.default(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateIsSet(this.className, 'className', '.withClassName(className)');
            this.validateIsSet(this.fields, 'fields', '.withFields(fields)');
        };
        this.do = () => {
            var _a, _b;
            let params = '';
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
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
            if (this.askString) {
                args = [...args, `ask:${this.askString}`];
            }
            if (this.nearMediaString) {
                args = [...args, `near${this.nearMediaType}:${this.nearMediaString}`];
            }
            if (this.nearVectorString) {
                args = [...args, `nearVector:${this.nearVectorString}`];
            }
            if (this.bm25String) {
                args = [...args, `bm25:${this.bm25String}`];
            }
            if (this.hybridString) {
                args = [...args, `hybrid:${this.hybridString}`];
            }
            if (this.groupString) {
                args = [...args, `group:${this.groupString}`];
            }
            if (this.limit) {
                args = [...args, `limit:${this.limit}`];
            }
            if (this.offset) {
                args = [...args, `offset:${this.offset}`];
            }
            if (this.autocut) {
                args = [...args, `autocut:${this.autocut}`];
            }
            if (this.sortString) {
                args = [...args, `sort:[${this.sortString}]`];
            }
            if (this.after) {
                args = [...args, `after:"${this.after}"`];
            }
            if (this.generateString) {
                if ((_a = this.fields) === null || _a === void 0 ? void 0 : _a.includes('_additional')) {
                    this.fields.replace('_additional{', `_additional{${this.generateString}`);
                }
                else {
                    this.fields = (_b = this.fields) === null || _b === void 0 ? void 0 : _b.concat(` _additional{${this.generateString}}`);
                }
            }
            if (this.consistencyLevel) {
                args = [...args, `consistencyLevel:${this.consistencyLevel}`];
            }
            if (this.groupByString) {
                args = [...args, `groupBy:${this.groupByString}`];
            }
            if (this.tenant) {
                args = [...args, `tenant:"${this.tenant}"`];
            }
            if (args.length > 0) {
                params = `(${args.join(',')})`;
            }
            return this.client.query(`{Get{${this.className}${params}{${this.fields}}}}`);
        };
        this.includesNearMediaFilter = false;
    }
}
exports.default = GraphQLGetter;
