import { router } from './v1/actions/router';
import { versionDescription } from './v1/actions/versionDescription';
import { credentialTest, loadOptions } from './v1/methods';
export class BambooHr {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = {
        loadOptions,
        credentialTest,
    };
    async execute() {
        return [await router.call(this)];
    }
}
//# sourceMappingURL=BambooHr.node.js.map