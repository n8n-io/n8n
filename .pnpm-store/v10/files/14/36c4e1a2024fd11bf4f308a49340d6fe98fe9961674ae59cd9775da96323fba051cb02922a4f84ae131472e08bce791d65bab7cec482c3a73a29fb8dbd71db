export const PIZZA_CLASS_NAME = 'Pizza';
export const SOUP_CLASS_NAME = 'Soup';
const foodProperties = [
    {
        name: 'name',
        dataType: ['string'],
        description: 'name',
        tokenization: 'field',
    },
    {
        name: 'description',
        dataType: ['text'],
        description: 'description',
        tokenization: 'word',
    },
    {
        name: 'bestBefore',
        dataType: ['date'],
        description: 'best before',
    },
];
const pizzaClass = {
    class: PIZZA_CLASS_NAME,
    description: 'A delicious religion like food and arguably the best export of Italy.',
    invertedIndexConfig: {
        indexTimestamps: true,
    },
    properties: foodProperties,
};
const soupClass = {
    class: SOUP_CLASS_NAME,
    description: 'Mostly water based brew of sustenance for humans.',
    properties: foodProperties,
};
const pizzaObjects = [
    {
        class: PIZZA_CLASS_NAME,
        id: '10523cdd-15a2-42f4-81fa-267fe92f7cd6',
        properties: {
            name: 'Quattro Formaggi',
            description: "Pizza quattro formaggi Italian: ['kwattro for'maddʒi] (four cheese pizza) is a variety of pizza in Italian cuisine that is topped with a combination of four kinds of cheese, usually melted together, with (rossa, red) or without (bianca, white) tomato sauce. It is popular worldwide, including in Italy,[1] and is one of the iconic items from pizzerias's menus.",
            bestBefore: '2022-01-02T03:04:05+01:00',
        },
    },
    {
        class: PIZZA_CLASS_NAME,
        id: '927dd3ac-e012-4093-8007-7799cc7e81e4',
        properties: {
            name: 'Frutti di Mare',
            description: 'Frutti di Mare is an Italian type of pizza that may be served with scampi, mussels or squid. It typically lacks cheese, with the seafood being served atop a tomato sauce.',
            bestBefore: '2022-02-03T04:05:06+02:00',
        },
    },
    {
        class: PIZZA_CLASS_NAME,
        id: 'f824a18e-c430-4475-9bef-847673fbb54e',
        properties: {
            name: 'Hawaii',
            description: 'Universally accepted to be the best pizza ever created.',
            bestBefore: '2022-03-04T05:06:07+03:00',
        },
    },
    {
        class: PIZZA_CLASS_NAME,
        id: 'd2b393ff-4b26-48c7-b554-218d970a9e17',
        properties: {
            name: 'Doener',
            description: 'A innovation, some say revolution, in the pizza industry.',
            bestBefore: '2022-04-05T06:07:08+04:00',
        },
    },
];
const soupObjects = [
    {
        class: SOUP_CLASS_NAME,
        id: '8c156d37-81aa-4ce9-a811-621e2702b825',
        properties: {
            name: 'ChickenSoup',
            description: 'Used by humans when their inferior genetics are attacked by microscopic organisms.',
            bestBefore: '2022-05-06T07:08:09+05:00',
        },
    },
    {
        class: SOUP_CLASS_NAME,
        id: '27351361-2898-4d1a-aad7-1ca48253eb0b',
        properties: {
            name: 'Beautiful',
            description: 'Putting the game of letter soups to a whole new level.',
            bestBefore: '2022-06-07T08:09:10+06:00',
        },
    },
];
export function createTestFoodSchema(client) {
    return Promise.all([
        client.schema.classCreator().withClass(pizzaClass).do(),
        client.schema.classCreator().withClass(soupClass).do(),
    ]);
}
export function createTestFoodData(client) {
    return client.batch
        .objectsBatcher()
        .withObjects(...pizzaObjects)
        .withObjects(...soupObjects)
        .do();
}
export function createTestFoodSchemaAndData(client) {
    return createTestFoodSchema(client).then(() => createTestFoodData(client));
}
export function cleanupTestFood(client) {
    return Promise.all([
        client.schema.classDeleter().withClassName(PIZZA_CLASS_NAME).do(),
        client.schema.classDeleter().withClassName(SOUP_CLASS_NAME).do(),
    ]);
}
