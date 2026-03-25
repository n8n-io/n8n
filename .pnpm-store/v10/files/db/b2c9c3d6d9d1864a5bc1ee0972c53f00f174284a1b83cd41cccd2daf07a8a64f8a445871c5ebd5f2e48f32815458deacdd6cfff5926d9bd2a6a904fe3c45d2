"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
const getter_js_1 = __importDefault(require("./getter.js"));
class ClassificationsScheduler extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withType = (type) => {
            this.type = type;
            return this;
        };
        this.withSettings = (settings) => {
            this.settings = settings;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withClassifyProperties = (props) => {
            this.classifyProperties = props;
            return this;
        };
        this.withBasedOnProperties = (props) => {
            this.basedOnProperties = props;
            return this;
        };
        this.withWaitForCompletion = () => {
            this.waitForCompletion = true;
            return this;
        };
        this.withWaitTimeout = (timeout) => {
            this.waitTimeout = timeout;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validateClassName = () => {
            this.validateIsSet(this.className, 'className', '.withClassName(className)');
        };
        this.validateBasedOnProperties = () => {
            this.validateIsSet(this.basedOnProperties, 'basedOnProperties', '.withBasedOnProperties(basedOnProperties)');
        };
        this.validateClassifyProperties = () => {
            this.validateIsSet(this.classifyProperties, 'classifyProperties', '.withClassifyProperties(classifyProperties)');
        };
        this.validate = () => {
            this.validateClassName();
            this.validateClassifyProperties();
            this.validateBasedOnProperties();
        };
        this.payload = () => ({
            type: this.type,
            settings: this.settings,
            class: this.className,
            classifyProperties: this.classifyProperties,
            basedOnProperties: this.basedOnProperties,
        });
        this.pollForCompletion = (id) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    reject(new Error("classification didn't finish within configured timeout, " +
                        'set larger timeout with .withWaitTimeout(timeout)'));
                }, this.waitTimeout);
                const interval = setInterval(() => {
                    new getter_js_1.default(this.client)
                        .withId(id)
                        .do()
                        .then((res) => {
                        if (res.status === 'completed') {
                            clearInterval(interval);
                            clearTimeout(timeout);
                            resolve(res);
                        }
                    });
                }, 500);
            });
        };
        this.do = () => {
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            this.validate();
            const path = `/classifications`;
            return this.client.postReturn(path, this.payload()).then((res) => {
                if (!this.waitForCompletion) {
                    return Promise.resolve(res);
                }
                return this.pollForCompletion(res.id);
            });
        };
        this.waitTimeout = 10 * 60 * 1000; // 10 minutes
        this.waitForCompletion = false;
    }
}
exports.default = ClassificationsScheduler;
