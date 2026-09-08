import { apiRequest } from '../../../transport';
export async function update(index) {
    let body = {};
    const requestMethod = 'POST';
    //meta data
    const id = this.getNodeParameter('employeeId', index);
    const fileId = this.getNodeParameter('fileId', index);
    //endpoint
    const endpoint = `employees/${id}/files/${fileId}`;
    //body parameters
    body = this.getNodeParameter('updateFields', index);
    body.shareWithEmployee ? (body.shareWithEmployee = 'yes') : (body.shareWithEmployee = 'no');
    //response
    await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=execute.js.map