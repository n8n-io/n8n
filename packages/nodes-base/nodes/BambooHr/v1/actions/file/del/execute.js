import { apiRequest } from '../../../transport';
export async function del(index) {
    const body = {};
    const requestMethod = 'DELETE';
    //meta data
    const fileId = this.getNodeParameter('fileId', index);
    //endpoint
    const endpoint = `files/${fileId}`;
    //response
    await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=execute.js.map