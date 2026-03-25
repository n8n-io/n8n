import { CommandBase } from '../validation/commandBase.js';
export default class NodesStatusGetter extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withOutput = (output) => {
            this.output = output;
            return this;
        };
        this.do = () => {
            let path = '/nodes';
            if (this.className) {
                path = `${path}/${this.className}`;
            }
            if (this.output) {
                path = `${path}?output=${this.output}`;
            }
            else {
                path = `${path}?output=verbose`;
            }
            return this.client.get(path);
        };
    }
    validate() {
        // nothing to validate
    }
}
