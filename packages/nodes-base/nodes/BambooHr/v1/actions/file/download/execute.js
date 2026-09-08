import { apiRequest } from '../../../transport';
export async function download(index) {
    const body = {};
    const requestMethod = 'GET';
    const items = this.getInputData();
    //meta data
    const fileId = this.getNodeParameter('fileId', index);
    const output = this.getNodeParameter('output', index);
    //endpoint
    const endpoint = `files/${fileId}/`;
    //response
    const response = await apiRequest.call(this, requestMethod, endpoint, body, {}, {
        encoding: null,
        json: false,
        resolveWithFullResponse: true,
    });
    let mimeType = response.headers['content-type'];
    mimeType = mimeType ? mimeType.split(';').find((value) => value.includes('/')) : undefined;
    const contentDisposition = response.headers['content-disposition'];
    const fileNameRegex = /(?<=filename=").*\b/;
    const match = fileNameRegex.exec(contentDisposition);
    let fileName = '';
    // file name was found
    if (match !== null) {
        fileName = match[0];
    }
    const newItem = {
        json: items[index].json,
        binary: {},
    };
    if (items[index].binary !== undefined && newItem.binary) {
        // Create a shallow copy of the binary data so that the old
        // data references which do not get changed still stay behind
        // but the incoming data does not get changed.
        Object.assign(newItem.binary, items[index].binary);
    }
    newItem.binary = {
        [output]: await this.helpers.prepareBinaryData(response.body, fileName, mimeType),
    };
    return [newItem];
}
//# sourceMappingURL=execute.js.map