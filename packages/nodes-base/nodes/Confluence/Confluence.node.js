import { confluenceNodeDescription } from './actions/description';
import { router } from './actions/router';
import { listSearch } from './methods';
export class Confluence {
    description = confluenceNodeDescription;
    methods = { listSearch };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=Confluence.node.js.map