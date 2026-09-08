import { jsonParse } from 'n8n-workflow';
import { cockpitApiRequest } from './GenericFunctions';
export async function createCollectionEntry(resourceName, data, id) {
    const body = {
        data,
    };
    if (id) {
        body.data = {
            _id: id,
            ...body.data,
        };
    }
    return await cockpitApiRequest.call(this, 'POST', `/collections/save/${resourceName}`, body);
}
export async function getAllCollectionEntries(resourceName, options) {
    const body = {};
    if (options.fields) {
        const fields = options.fields.split(',').map((field) => field.trim());
        const bodyFields = {
            _id: false,
        };
        for (const field of fields) {
            bodyFields[field] = true;
        }
        body.fields = bodyFields;
    }
    if (options.filter) {
        body.filter = jsonParse(options.filter.toString(), {
            errorMessage: "'Filter' option is not valid JSON",
        });
    }
    if (options.limit) {
        body.limit = options.limit;
    }
    if (options.skip) {
        body.skip = options.skip;
    }
    if (options.sort) {
        body.sort = jsonParse(options.sort.toString(), {
            errorMessage: "'Sort' option is not valid JSON",
        });
    }
    if (options.populate) {
        body.populate = options.populate;
    }
    body.simple = true;
    if (options.rawData) {
        body.simple = !options.rawData;
    }
    if (options.language) {
        body.lang = options.language;
    }
    return await cockpitApiRequest.call(this, 'POST', `/collections/get/${resourceName}`, body);
}
export async function getAllCollectionNames() {
    return await cockpitApiRequest.call(this, 'GET', '/collections/listCollections', {});
}
//# sourceMappingURL=CollectionFunctions.js.map