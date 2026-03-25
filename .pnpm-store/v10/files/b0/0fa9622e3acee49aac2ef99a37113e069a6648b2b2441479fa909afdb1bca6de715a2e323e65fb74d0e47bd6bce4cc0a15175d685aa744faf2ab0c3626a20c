import { CommandBase } from '../validation/commandBase.js';
import Ask from './ask.js';
import Bm25 from './bm25.js';
import { GraphQLGenerate } from './generate.js';
import Group from './group.js';
import GroupBy from './groupBy.js';
import Hybrid from './hybrid.js';
import NearImage from './nearImage.js';
import NearMedia, { NearMediaType, } from './nearMedia.js';
import NearObject from './nearObject.js';
import NearText from './nearText.js';
import NearVector from './nearVector.js';
import Sort from './sort.js';
import Where from './where.js';
export { FusionType } from './hybrid.js';
export default class GraphQLGetter extends CommandBase {
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
                this.groupString = new Group(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withWhere = (whereObj) => {
            try {
                this.whereString = new Where(whereObj).toString();
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
            this.nearTextString = new NearText(args).toString();
            this.includesNearMediaFilter = true;
            return this;
        };
        this.withBm25 = (args) => {
            try {
                this.bm25String = new Bm25(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withHybrid = (args) => {
            try {
                this.hybridString = new Hybrid(args).toString();
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
                this.nearObjectString = new NearObject(args).toString();
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withAsk = (askObj) => {
            try {
                this.askString = new Ask(askObj).toString();
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
                this.nearMediaString = new NearMedia(args).toString();
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
                this.nearMediaString = new NearImage(args).toString();
                this.nearMediaType = NearMediaType.Image;
                this.includesNearMediaFilter = true;
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withNearAudio = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: NearMediaType.Audio, media: args.audio }));
        };
        this.withNearVideo = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: NearMediaType.Video, media: args.video }));
        };
        this.withNearThermal = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: NearMediaType.Thermal, media: args.thermal }));
        };
        this.withNearDepth = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: NearMediaType.Depth, media: args.depth }));
        };
        this.withNearIMU = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { type: NearMediaType.IMU, media: args.imu }));
        };
        this.withNearVector = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearVectorString = new NearVector(args).toString();
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
            this.sortString = new Sort(args).toString();
            return this;
        };
        this.withGenerate = (args) => {
            this.generateString = new GraphQLGenerate(args).toString();
            return this;
        };
        this.withConsistencyLevel = (level) => {
            this.consistencyLevel = level;
            return this;
        };
        this.withGroupBy = (args) => {
            try {
                this.groupByString = new GroupBy(args).toString();
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
