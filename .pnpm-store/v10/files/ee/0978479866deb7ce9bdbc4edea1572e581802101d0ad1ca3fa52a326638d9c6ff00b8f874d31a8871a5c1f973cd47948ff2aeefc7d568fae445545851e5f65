import { CommandBase } from '../validation/commandBase.js';
import Ask from './ask.js';
import NearImage from './nearImage.js';
import NearMedia, { NearMediaType, } from './nearMedia.js';
import NearObject from './nearObject.js';
import NearText from './nearText.js';
import NearVector from './nearVector.js';
export default class Explorer extends CommandBase {
    constructor(client) {
        super(client);
        this.withFields = (fields) => {
            this.fields = fields;
            return this;
        };
        this.withLimit = (limit) => {
            this.limit = limit;
            return this;
        };
        this.withNearText = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearTextString = new NearText(args).toString();
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
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.withAsk = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.askString = new Ask(args).toString();
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
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.audio, type: NearMediaType.Audio }));
        };
        this.withNearVideo = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.video, type: NearMediaType.Video }));
        };
        this.withNearDepth = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.depth, type: NearMediaType.Depth }));
        };
        this.withNearThermal = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.thermal, type: NearMediaType.Thermal }));
        };
        this.withNearIMU = (args) => {
            return this.withNearMedia(Object.assign(Object.assign({}, args), { media: args.imu, type: NearMediaType.IMU }));
        };
        this.withNearVector = (args) => {
            if (this.includesNearMediaFilter) {
                throw new Error('cannot use multiple near<Media> filters in a single query');
            }
            try {
                this.nearVectorString = new NearVector(args).toString();
            }
            catch (e) {
                this.addError(e.toString());
            }
            return this;
        };
        this.validateGroup = () => {
            if (!this.group) {
                // nothing to check if this optional parameter is not set
                return;
            }
            if (!Array.isArray(this.group)) {
                throw new Error('groupBy must be an array');
            }
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateIsSet(this.fields, 'fields', '.withFields(fields)');
        };
        this.do = () => {
            let params = '';
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            let args = [];
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
                args = [...args, `${this.nearMediaType}:${this.nearMediaString}`];
            }
            if (this.nearVectorString) {
                args = [...args, `nearVector:${this.nearVectorString}`];
            }
            if (this.limit) {
                args = [...args, `limit:${this.limit}`];
            }
            params = `(${args.join(',')})`;
            return this.client.query(`{Explore${params}{${this.fields}}}`);
        };
        this.params = {};
        this.includesNearMediaFilter = false;
    }
}
