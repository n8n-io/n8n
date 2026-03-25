import { CommandBase } from '../validation/commandBase.js';
export default class ConceptsGetter extends CommandBase {
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
