import { apiRequest } from '../../../transport';
export async function getAll(index) {
    const body = {};
    const requestMethod = 'GET';
    const endpoint = 'files/view';
    //limit parameters
    const simplifyOutput = this.getNodeParameter('simplifyOutput', index);
    const returnAll = this.getNodeParameter('returnAll', 0, false);
    const limit = this.getNodeParameter('limit', 0, 0);
    //response
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body);
    const onlyFilesArray = [];
    //return only files without categories
    if (simplifyOutput) {
        for (let i = 0; i < responseData.categories.length; i++) {
            if (responseData.categories[i].hasOwnProperty('files')) {
                for (let j = 0; j < responseData.categories[i].files.length; j++) {
                    onlyFilesArray.push(responseData.categories[i].files[j]);
                }
            }
        }
        if (!returnAll && onlyFilesArray.length > limit) {
            return this.helpers.returnJsonArray(onlyFilesArray.slice(0, limit));
        }
        else {
            return this.helpers.returnJsonArray(onlyFilesArray);
        }
    }
    //return limited result
    if (!returnAll && responseData.categories.length > limit) {
        return this.helpers.returnJsonArray(responseData.categories.slice(0, limit));
    }
    //return
    return this.helpers.returnJsonArray(responseData.categories);
}
//# sourceMappingURL=execute.js.map