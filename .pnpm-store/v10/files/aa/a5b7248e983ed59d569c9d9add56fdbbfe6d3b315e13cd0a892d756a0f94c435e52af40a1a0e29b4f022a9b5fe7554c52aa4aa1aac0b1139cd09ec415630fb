"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class ExtensionCreator extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withConcept = (concept) => {
            this.concept = concept;
            return this;
        };
        this.withDefinition = (definition) => {
            this.definition = definition;
            return this;
        };
        this.withWeight = (weight) => {
            this.weight = weight;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            var _a;
            this.validateIsSet(this.concept, 'concept', 'withConcept(concept)');
            this.validateIsSet(this.definition, 'definition', 'withDefinition(definition)');
            this.validateIsSet(((_a = this.weight) === null || _a === void 0 ? void 0 : _a.toString()) || '', 'weight', 'withWeight(weight)');
        };
        this.payload = () => ({
            concept: this.concept,
            definition: this.definition,
            weight: this.weight,
        });
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/modules/text2vec-contextionary/extensions`;
            return this.client.postReturn(path, this.payload());
        };
    }
}
exports.default = ExtensionCreator;
