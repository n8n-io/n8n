"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFaker = createFaker;
const faker_1 = require("@faker-js/faker");
function createFaker() {
    const fakeString = {
        email: ({ provider, domain = 'com' } = {}) => faker_1.faker.internet.email(undefined, undefined, `${provider}.${domain}`),
        userName: () => faker_1.faker.internet.userName(),
        firstName: () => faker_1.faker.name.firstName(),
        lastName: () => faker_1.faker.name.lastName(),
        fullName: () => faker_1.faker.name.fullName(),
        uuid: () => faker_1.faker.datatype.uuid(),
        string: ({ length } = {}) => faker_1.faker.datatype.string(length),
    };
    const fakeDate = {
        past: () => faker_1.faker.date.past(),
        future: () => faker_1.faker.date.future(),
    };
    const fakeAddress = {
        city: () => faker_1.faker.address.city(),
        country: () => faker_1.faker.address.country(),
        zipCode: () => faker_1.faker.address.zipCode(),
        street: () => faker_1.faker.address.street(),
    };
    const fakeNumber = {
        integer: ({ min, max } = {}) => faker_1.faker.datatype.number({ min, max, precision: 1 }),
        float: (options) => faker_1.faker.datatype.float(options),
    };
    return {
        address: fakeAddress,
        date: fakeDate,
        number: fakeNumber,
        string: fakeString,
    };
}
//# sourceMappingURL=faker.js.map