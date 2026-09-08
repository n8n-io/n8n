import { apiRequest } from '../../../transport';
export async function del(index) {
    const body = {};
    const requestMethod = 'DELETE';
    //meta data
    const id = this.getNodeParameter('employeeId', index);
    const fileId = this.getNodeParameter('fileId', index);
    //endpoint
    const endpoint = `employees/${id}/files/${fileId}`;
    //response
    await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray({ success: true });
}
//# sourceMappingURL=execute.js.map