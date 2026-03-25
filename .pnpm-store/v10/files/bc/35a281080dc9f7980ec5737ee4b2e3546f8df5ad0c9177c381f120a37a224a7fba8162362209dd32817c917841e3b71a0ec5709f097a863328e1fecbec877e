"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class ConceptsGetter extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.withConcept = (concept) => {
            this.concept = concept;
            return this;
        };
        this.validate = () => {
            this.validateIsSet(this.concept, 'concept', 'withConcept(concept)');
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/modules/text2vec-contextionary/concepts/${this.concept}`;
            return this.client.get(path);
        };
    }
}
exports.default = ConceptsGetter;
