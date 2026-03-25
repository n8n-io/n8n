# minifaker

Generate fake data.  
An alternative to faker.js with both esm and cjs syntax
<https://github.com/Marak/faker.js>

## NPM

`npm i minifaker`

## Supported locales

`en` | `fr`, `fr-CA` | `es`

## Why

faker.js is big, does not support tree shaking and is not in Typescript
<https://github.com/Marak/faker.js/issues/785>

On 2021/01/05, Marak deleted fakerjs from npm and github.

### Why not create a pull request to faker.js?

Supporting ES6 modules for faker.js would need a big restructure change.

Right now, I just need a couple of functions and it's faster to create a new package mirroring functions without having to do a lot of refactoring. However, importing the entire package will take work and time, but at least I can start using it without having to finish it.

I also want to use Typescript and introduce new functions.

### Duplicates

I've notice that faker locales have duplicate words :S.  
I'll try fix the duplicates when importing locale files to reduce size as much as possible.

### Replacing old functions with new powerful packages instead

- nanoid, uuid

## Example / usage

### Using functions

```ts
// You can either import minifaker completely 
// or import the functions you need
import minifaker, { arrayElement } from 'minifaker'
// const minifaker = require('minifaker')

minifaker.number()
arrayElement(['one', 'two', 'three'])
```

### Using locale dependent functions

```ts
import minifaker, { cityName } from 'minifaker'
// There is no default locale import (not even `english`)
import 'minifaker/locales/en' // the first locale import is set as default
import 'minifaker/locales/fr'

minifaker.firstName({ gender: 'female' }) // female name in english
cityName({ locale: 'fr' }) // french city name
```

### Generating a list of 50 english names

```ts
import { array, name } from 'minifaker'
import 'minifaker/locales/en'

array(50, () => name())
```

### Generating english words

```ts
import { word } from 'minifaker'
import 'minifaker/locales/en'

word() // Can be an adjective, adverb, conjunction, interjection, noun, preposition, verb
word({ filter: (word) => word.length > 5 }) // Word with at least 5 characters
word({ type: 'noun' }) // A noun
```

#### Word types

`verb`,`preposition`,`noun`, `interjection`, `conjunction`, `adverb`, `adjective`

### Direct access to more performant/popular packages

```ts
import { nanoId, uuid, nonsecure } from 'minifaker'

nanoId.nanoid() // nanoid - https://github.com/ai/nanoid
nonsecure.nanoid() // nanoid/non-secure - https://github.com/ai/nanoid/blob/main/non-secure/index.js
uuid.v4() // uuid - https://github.com/uuidjs/uuid
```

## Function mapping

|Faker.js|Locales|Func|
|-|-|-|
random.arrayElement|n/a|arrayElement
random.number,random.float|n/a|number
random.boolean|n/a|boolean
random.uuid|n/a|uuid -> `uuid` funcs
n/a|n/a|nanoid -> `nanoId` funcs
name.firstName|en,fr|firstName
phone.phoneNumber|en,fr,fr-CA|phoneNumber
address.cityName|en,fr|cityName
address.cityPrefix|en|cityPrefix
address.citySuffix|en|citySufix
image.imageUrl|n/a|imageUrlFromPlaceIMG
image.imageUrl|n/a|imageUrlFromPlaceholder
lorem|n/a|todo
random.objectElement|n/a|objectElement
n/a|n/a|array
name.lastName|en,fr|lastName
name.jobTitle|en|jobTitle
name.jobArea|en|jobArea
name.jobDescriptor|en|jobDescriptor
name.jobType|en,fr|jobType
n/a|en,fr|name
internet.ip|n/a|ip
internet.port|n/a|port
adjective,adverb,conjunction,interjection,noun,preposition,verb|en|word
internet.ipv6|n/a|ipv6
internet.color|n/a|color
internet.username|en,fr|username
internet.mac|n/a|macAddress
internet.domainName|en,fr,fr-CA|domainName
internet.domainSuffix|en,fr,fr-CA|domainSuffix
internet.email|en,fr,fr-CA|email
internet.url|en,fr,fr-CA|domainUrl
address.zipCode|en,fr,fr-CA|zipCode
address.streetPrefix|fr|streetPrefix
address.streetSuffix|en,fr|streetSuffix
address.streetName|en,fr|streetName
address.streetAddress|en,fr|streetAddress
address.timeZone|en|timeZone
address.latitude|n/a|latitude
address.longitude|n/a|longitude
n/a|n/a|latLong
address.direction,address.cardinalDirection,address.ordinalDirection|en,fr|direction
address.state,address.stateAbbr|en,es|state
address.country,address.countryCode|en,fr|country
commerce.price|all|price with `Intl.NumberFormat`
finance.creditCardNumber|n/a|creditCardNumber
finance.creditCardCVV|n/a|creditCardCVV
system.semver|n/a|semver
internet.password|n/a|password
date.month|en,fr|month
date.weekday|en,fr|weekday
date|all|date
finance.bitcoinAddress|n/a|bitcoinAddress
system.fileExt,commonFileExt|n/a|fileExt
system.fileName,commonFileName|en|fileName
system.filePath|en|filePath
system.mimeType,commonMimeType|n/a|mimeType
system.dirPath|n/a|dirPath
seed|n/a|setSeed
hexaDecimal|n/a|hex
address.county|en|county
address.province|fr,es,fr-CA|province
