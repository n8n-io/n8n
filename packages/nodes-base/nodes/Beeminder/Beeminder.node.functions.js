import { beeminderApiRequest, beeminderApiRequestAllItems } from './GenericFunctions';
export async function createDatapoint(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints.json`;
    return await beeminderApiRequest.call(this, 'POST', endpoint, data, {});
}
export async function getAllDatapoints(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints.json`;
    if (data.count !== undefined) {
        return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
    }
    return await beeminderApiRequestAllItems.call(this, 'GET', endpoint, {}, data);
}
export async function updateDatapoint(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;
    return await beeminderApiRequest.call(this, 'PUT', endpoint, data, {});
}
export async function deleteDatapoint(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;
    return await beeminderApiRequest.call(this, 'DELETE', endpoint);
}
export async function createCharge(data) {
    const endpoint = '/charges.json';
    const body = {
        user_id: 'me',
        amount: data.amount,
        ...(data.note && { note: data.note }),
        ...(data.dryrun && { dryrun: data.dryrun }),
    };
    return await beeminderApiRequest.call(this, 'POST', endpoint, body, {});
}
export async function uncleGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}/uncleme.json`;
    return await beeminderApiRequest.call(this, 'POST', endpoint);
}
export async function createAllDatapoints(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints/create_all.json`;
    const body = {
        datapoints: data.datapoints,
    };
    return await beeminderApiRequest.call(this, 'POST', endpoint, body, {});
}
export async function getSingleDatapoint(data) {
    const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;
    return await beeminderApiRequest.call(this, 'GET', endpoint);
}
// Goal Operations
export async function getGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}.json`;
    return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}
export async function getAllGoals(data) {
    const endpoint = '/users/me/goals.json';
    return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data || {});
}
export async function getArchivedGoals(data) {
    const endpoint = '/users/me/goals/archived.json';
    return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data || {});
}
export async function createGoal(data) {
    const endpoint = '/users/me/goals.json';
    return await beeminderApiRequest.call(this, 'POST', endpoint, data, {});
}
export async function updateGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}.json`;
    return await beeminderApiRequest.call(this, 'PUT', endpoint, data, {});
}
export async function refreshGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}/refresh_graph.json`;
    return await beeminderApiRequest.call(this, 'GET', endpoint);
}
export async function shortCircuitGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}/shortcircuit.json`;
    return await beeminderApiRequest.call(this, 'POST', endpoint);
}
export async function stepDownGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}/stepdown.json`;
    return await beeminderApiRequest.call(this, 'POST', endpoint);
}
export async function cancelStepDownGoal(data) {
    const endpoint = `/users/me/goals/${data.goalName}/cancel_stepdown.json`;
    return await beeminderApiRequest.call(this, 'POST', endpoint);
}
// User Operations
export async function getUser(data) {
    const endpoint = '/users/me.json';
    return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}
//# sourceMappingURL=Beeminder.node.functions.js.map