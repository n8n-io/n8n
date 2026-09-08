import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions, resourceMapping } from './methods';
export class AirtableV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = {
        listSearch,
        loadOptions,
        resourceMapping,
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=AirtableV2.node.js.map