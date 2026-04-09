<div align="center">
  <img src="./docs/public/logo.svg" width="200"/>
  <h1>Faker</h1>
  <p>Generate massive amounts of fake (but realistic) data for testing and development.</p>
  
  [![npm version](https://badgen.net/npm/v/@faker-js/faker)](https://www.npmjs.com/package/@faker-js/faker)
  [![npm downloads](https://badgen.net/npm/dm/@faker-js/faker)](https://www.npmjs.com/package/@faker-js/faker)
  [![Continuous Integration](https://github.com/faker-js/faker/actions/workflows/ci.yml/badge.svg)](https://github.com/faker-js/faker/actions/workflows/ci.yml)
  [![codecov](https://codecov.io/gh/faker-js/faker/branch/main/graph/badge.svg?token=N61U168G08)](https://codecov.io/gh/faker-js/faker)
  [![Chat on Discord](https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord)](https://chat.fakerjs.dev)
  [![Open Collective](https://img.shields.io/opencollective/backers/fakerjs)](https://opencollective.com/fakerjs#section-contributors)
  [![sponsor](https://img.shields.io/opencollective/all/fakerjs?label=sponsors)](https://opencollective.com/fakerjs)
  
</div>

## ⚡️ Try it Online

[![](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://fakerjs.dev/new)

[API Documentation](https://fakerjs.dev/guide/)

## 🚀 Features

- 💌 Addresses - Generate valid looking Addresses, Zip Codes, Street Names, States, and Countries!
- ⏰ Time-based Data - Past, present, future, recent, soon... whenever!
- 🌏 Localization - Set a locale to generate realistic looking Names, Addresses, and Phone Numbers.
- 💸 Finance - Create stubbed out Account Details, Transactions, and Crypto Addresses.
- 👠 Products - Generate Prices, Product Names, Adjectives, and Descriptions.
- 👾 Hacker Jargon - “Try to reboot the SQL bus, maybe it will bypass the virtual application!”
- 🧍 Names - Generate virtual humans with a complete online and offline identity.
- 🔢 Numbers - Of course, we can also generate random numbers and strings.

> **Note**: Faker tries to generate realistic data and not obvious fake data.
> The generated names, addresses, emails, phone numbers, and/or other data might be coincidentally valid information.
> Please do not send any of your messages/calls to them from your test setup.

## 📦 Install

```bash
npm install --save-dev @faker-js/faker
```

## 🪄 Usage

```ts
import { faker } from '@faker-js/faker';
// import { faker } from '@faker-js/faker/locale/de';

export const USERS: User[] = [];

export function createRandomUser(): User {
  return {
    userId: faker.datatype.uuid(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    password: faker.internet.password(),
    birthdate: faker.date.birthdate(),
    registeredAt: faker.date.past(),
  };
}

Array.from({ length: 10 }).forEach(() => {
  USERS.push(createRandomUser());
});
```

## 💎 Modules

An in-depth overview of the API methods is available in the [documentation](https://fakerjs.dev/guide/).  
The API covers the following modules:

| Module   | Example                                       | Output                                                                                             |
| -------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Address  | `faker.address.city()`                        | Lake Raoulfort                                                                                     |
| Animal   | `faker.animal.cat()`                          | Norwegian Forest Cat                                                                               |
| Color    | `faker.color.rgb()`                           | #cdfcdc                                                                                            |
| Commerce | `faker.commerce.product()`                    | Polo t-shirt                                                                                       |
| Company  | `faker.company.companyName()`                 | Zboncak and Sons                                                                                   |
| Database | `faker.database.engine()`                     | MyISAM                                                                                             |
| Datatype | `faker.datatype.uuid()`                       | 7b16dd12-935e-4acc-8381-b1e457bf0176                                                               |
| Date     | `faker.date.past()`                           | Sat Oct 20 2018 04:19:38 GMT-0700 (Pacific Daylight Time)                                          |
| Finance  | `faker.finance.amount()`                      | ¥23400 (After setting locale)                                                                      |
| Git      | `faker.git.commitMessage()`                   | feat: add products list page                                                                       |
| Hacker   | `faker.hacker.phrase()`                       | Try to reboot the SQL bus, maybe it will bypass the virtual application!                           |
| Helpers  | `faker.helpers.arrayElement(['a', 'b', 'c'])` | b                                                                                                  |
| Image    | `faker.image.cats()`                          | https://loremflickr.com/640/480/cats <img src="https://loremflickr.com/640/480/cats" height="100"> |
| Internet | `faker.internet.domainName()`                 | muddy-neuropathologist.net                                                                         |
| Lorem    | `faker.lorem.paragraph()`                     | Porro nulla id vero perspiciatis nulla nihil. ...                                                  |
| Music    | `faker.music.genre()`                         | R&B                                                                                                |
| Name     | `faker.name.firstName()`                      | Cameron                                                                                            |
| Phone    | `faker.phone.phoneNumber()`                   | +1 291-299-0192                                                                                    |
| Random   | `faker.random.locale()`                       | fr_CA                                                                                              |
| Science  | `faker.science.unit()`                        | `{ name: 'meter', symbol: 'm' }`                                                                   |
| System   | `faker.system.directoryPath()`                | /root                                                                                              |
| Vehicle  | `faker.vehicle.vehicle()`                     | Lamborghini Camry                                                                                  |
| Word     | `faker.word.adjective()`                      | adorable                                                                                           |

### Templates

Faker contains a generator method `faker.helpers.fake` for combining faker API methods using a mustache string format.

```ts
console.log(
  faker.helpers.fake(
    'Hello {{name.prefix}} {{name.lastName}}, how are you today?'
  )
);
```

## 🌏 Localization

Faker has support for multiple locales.

The default language locale is set to English.

Setting a new locale is simple:

```ts
// sets locale to de
faker.locale = 'de';
```

See our documentation for a list of [provided languages](https://fakerjs.dev/guide/localization.html#available-locales)

Please note: not every locale provides data for every module. In our pre-made locales, we fallback to English in such a case as this is the most complete and most commonly used language.

## ⚙️ Setting a randomness seed

If you want consistent results, you can set your own seed:

```ts
faker.seed(123);

const firstRandom = faker.datatype.number();

// Setting the seed again resets the sequence.
faker.seed(123);

const secondRandom = faker.datatype.number();

console.log(firstRandom === secondRandom);
```

## 🤝 Sponsors

Faker is an MIT-licensed open source project with its ongoing development made possible entirely by the support of these awesome backers

### Sponsors

![](https://opencollective.com/fakerjs/organizations.svg)

### Backers

![](https://opencollective.com/fakerjs/individuals.svg)

## ✨ Contributing

Please make sure to read the [Contributing Guide](https://github.com/faker-js/faker/blob/main/CONTRIBUTING.md) before making a pull request.

## 📘 Credits

Thanks to all the people who already contributed to Faker!

<a href="https://github.com/faker-js/faker/graphs/contributors"><img src="https://opencollective.com/fakerjs/contributors.svg?width=800" /></a>

The [fakerjs.dev](https://fakerjs.dev) website is kindly hosted by the Netlify Team. Also the search functionality is powered by [algolia](https://www.algolia.com).

## 📝 Changelog

Detailed changes for each release are documented in the [release notes](https://github.com/faker-js/faker/blob/main/CHANGELOG.md).

## 📜 What happened to the original faker.js?

Read the [team update](https://fakerjs.dev/update.html) (January 14th, 2022).

## 🔑 License

[MIT](https://github.com/faker-js/faker/blob/main/LICENSE)
