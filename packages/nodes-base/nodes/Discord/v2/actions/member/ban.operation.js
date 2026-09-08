import { updateDisplayOptions } from '../../../../../utils/utilities';
import { getAuditLogReasonHeaders, parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { banDeleteHistory, moderationReason, moderationReasonCustom, userRLC, } from '../common.description';
const properties = [
    userRLC,
    banDeleteHistory,
    moderationReason,
    moderationReasonCustom,
];
const displayOptions = {
    show: {
        resource: ['member'],
        operation: ['ban'],
    },
    hide: {
        authentication: ['webhook'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(guildId) {
    const returnData = [];
    const items = this.getInputData();
    for (let i = 0; i < items.length; i++) {
        try {
            const userId = this.getNodeParameter('userId', i, undefined, {
                extractValue: true,
            });
            const deleteMessageSeconds = this.getNodeParameter('deleteMessageSeconds', i, 0);
            await discordApiRequest.call(this, 'PUT', `/guilds/${guildId}/bans/${userId}`, { delete_message_seconds: deleteMessageSeconds }, undefined, getAuditLogReasonHeaders.call(this, i));
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            const err = parseDiscordError.call(this, error, i);
            if (this.continueOnFail()) {
                returnData.push(...prepareErrorData.call(this, err, i));
                continue;
            }
            throw err;
        }
    }
    return returnData;
}
//# sourceMappingURL=ban.operation.js.map