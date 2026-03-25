import { CommandBase } from '../validation/commandBase.js';
import { isValidPositiveIntProperty } from '../validation/number.js';
import Hybrid from './hybrid.js';
import NearMedia, { NearMediaType, } from './nearMedia.js';
import NearObject from './nearObject.js';
import NearText from './nearText.js';
import NearVector from './nearVector.js';
import Where from './where.js';
export default class Aggregator extends CommandBase {
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
                this.whereString = new Where(where).toString();
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
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.image, type: NearMediaType.Image }));
        };
        this.withNearAudio = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.audio, type: NearMediaType.Audio }));
        };
        this.withNearVideo = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.video, type: NearMediaType.Video }));
        };
        this.withNearDepth = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.depth, type: NearMediaType.Depth }));
        };
        this.withNearIMU = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.imu, type: NearMediaType.IMU }));
        };
        this.withNearText = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearTextString = new NearText(args).toString();
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
                this.nearObjectString = new NearObject(args).toString();
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
                this.nearVectorString = new NearVector(args).toString();
                this.includesNearMediaFilter = true;
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
        this.withObjectLimit = (objectLimit) => {
            if (!isValidPositiveIntProperty(objectLimit)) {
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
