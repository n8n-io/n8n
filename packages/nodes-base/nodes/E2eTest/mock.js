import { array, name, uuid } from 'minifaker';
import 'minifaker/locales/en';
export const returnData = [
    {
        json: {
            id: '23423532',
            name: 'Hello World',
        },
    },
];
export const remoteOptions = [
    {
        name: 'Resource 1',
        value: 'resource1',
    },
    {
        name: 'Resource 2',
        value: 'resource2',
    },
    {
        name: 'Resource 3',
        value: 'resource3',
    },
];
export const resourceMapperFields = {
    fields: [
        {
            id: 'id',
            displayName: 'ID',
            defaultMatch: true,
            canBeUsedToMatch: true,
            required: true,
            display: true,
            type: 'string',
        },
        {
            id: 'name',
            displayName: 'Name',
            defaultMatch: false,
            canBeUsedToMatch: false,
            required: false,
            display: true,
            type: 'string',
        },
        {
            id: 'age',
            displayName: 'Age',
            defaultMatch: false,
            canBeUsedToMatch: false,
            required: false,
            display: true,
            type: 'number',
        },
    ],
};
export const searchOptions = array(100, () => {
    const value = uuid.v4();
    return {
        name: name(),
        value,
        url: 'https://example.com/user/' + value,
    };
});
//# sourceMappingURL=mock.js.map