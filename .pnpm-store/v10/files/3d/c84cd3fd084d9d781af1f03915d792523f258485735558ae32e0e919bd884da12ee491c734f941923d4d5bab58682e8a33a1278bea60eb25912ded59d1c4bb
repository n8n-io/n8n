# Emojibase Data

[![Build Status](https://github.com/milesj/emojibase/workflows/Build/badge.svg)](https://github.com/milesj/emojibase/actions?query=branch%3Amaster)
[![npm version](https://badge.fury.io/js/emojibase-data.svg)](https://www.npmjs.com/package/emojibase-data)
[![npm deps](https://david-dm.org/milesj/emojibase.svg?path=packages/data)](https://www.npmjs.com/package/emojibase-data)
[![jsDelivr Hits](https://data.jsdelivr.com/v1/package/npm/emojibase-data/badge?style=rounded)](https://www.jsdelivr.com/package/npm/emojibase-data)

Install the package.

```
yarn add emojibase-data
```

Import and use the localized JSON dataset.

```ts
import data from 'emojibase-data/en/data.json';
```

Or fetch the dataset from our CDN.

```ts
import { fetchFromCDN, fetchEmojis, fetchShortcodes } from 'emojibase';

const englishEmojis = await fetchFromCDN('en/data.json', { shortcodes: ['github'] });
const japaneseCompactEmojis = await fetchEmojis('ja', { compact: true });
const germanCldrShortcodes = await fetchShortcodes('de', 'cldr');
```

## Documentation

[https://emojibase.dev/docs/datasets](https://emojibase.dev/docs/datasets)
