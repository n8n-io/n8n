import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';
export class DiscordV2 {
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
    };
    webhook = sendAndWaitWebhook;
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=DiscordV2.node.js.map