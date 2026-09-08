import { apiRequest } from '../../../transport';
export async function get(index) {
    const body = {};
    const requestMethod = 'GET';
    //meta data
    const id = this.getNodeParameter('employeeId', index);
    //query parameters
    let fields = this.getNodeParameter('options.fields', index, ['all']);
    if (fields.includes('all')) {
        const { fields: allFields } = await apiRequest.call(this, requestMethod, 'employees/directory', body);
        fields = allFields.map((field) => field.id);
    }
    //endpoint
    const endpoint = `employees/${id}?fields=${fields}`;
    //response
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
    //return
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map