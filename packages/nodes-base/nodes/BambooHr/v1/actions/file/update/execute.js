import { apiRequest } from '../../../transport';
export async function update(index) {
    const body = {};
    const requestMethod = 'POST';
    //meta data
    const fileId = this.getNodeParameter('fileId', index);
    //endpoint
    const endpoint = `files/${fileId}`;
    //body parameters
    const shareWithEmployee = this.getNodeParameter('updateFields.shareWithEmployee', index, true);
    body.shareWithEmployee = shareWithEmployee ? 'yes' : 'no';
    //response
    await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=execute.js.map