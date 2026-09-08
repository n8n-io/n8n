import { apiRequest } from '../../../transport';
export async function get(index) {
    const body = {};
    const requestMethod = 'GET';
    const items = this.getInputData();
    //meta data
    const reportId = this.getNodeParameter('reportId', index);
    const format = this.getNodeParameter('format', 0);
    const fd = this.getNodeParameter('options.fd', index, true);
    const onlyCurrent = this.getNodeParameter('options.onlyCurrent', index, true);
    //endpoint
    const endpoint = `reports/${reportId}/?format=${format}&fd=${fd}&onlyCurrent=${onlyCurrent}`;
    if (format === 'JSON') {
        const responseData = await apiRequest.call(this, requestMethod, endpoint, body, {}, { resolveWithFullResponse: true });
        return this.helpers.returnJsonArray(responseData.body);
    }
    const output = this.getNodeParameter('output', index);
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