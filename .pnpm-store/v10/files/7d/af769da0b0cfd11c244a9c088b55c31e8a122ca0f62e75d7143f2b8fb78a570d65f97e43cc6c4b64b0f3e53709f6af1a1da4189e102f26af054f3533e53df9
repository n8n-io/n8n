# [`baseline-browser-mapping`](https://github.com/web-platform-dx/web-features/packages/baseline-browser-mapping)

By the [W3C WebDX Community Group](https://www.w3.org/community/webdx/) and contributors.

`baseline-browser-mapping` provides:

- An `Array` of browsers compatible with Baseline Widely available and Baseline year feature sets via the [`getCompatibleVersions()` function](#get-baseline-widely-available-browser-versions-or-baseline-year-browser-versions).
- An `Array`, `Object` or `CSV` as a string describing the Baseline feature set support of all browser versions included in the module's data set via the [`getAllVersions()` function](#get-data-for-all-browser-versions).

You can use `baseline-browser-mapping` to help you determine minimum browser version support for your chosen Baseline feature set; or to analyse the level of support for different Baseline feature sets in your site's traffic by joining the data with your analytics data.

## Install for local development

To install the package, run:

`npm install --save-dev baseline-browser-mapping`

`baseline-browser-mapping` depends on `web-features` and `@mdn/browser-compat-data` for core browser version selection, but the data is pre-packaged and minified. This package checks for updates to those modules and the supported [downstream browsers](#downstream-browsers) on a daily basis and is updated frequently. Consider adding a script to your `package.json` to update `baseline-browser-mapping` and using it as part of your build process to ensure your data is as up to date as possible:

```javascript
"scripts": [
  "refresh-baseline-browser-mapping": "npm i --save-dev baseline-browser-mapping@latest"
]
```

If your installed version of `baseline-browser-mapping` is greater than 2 months old, you will receive a console warning advising you to update to the latest version.

The minimum supported NodeJS version for `baseline-browser-mapping` is v8 in alignment with `browserslist`. For NodeJS versions earlier than v13.2, the [`require('baseline-browser-mapping')`](https://nodejs.org/api/modules.html#requireid) syntax should be used to import the module.

## Importing `baseline-browser-mapping`

This module exposes two functions: `getCompatibleVersions()` and `getAllVersions()`, both which can be imported directly from `baseline-browser-mapping`:

```javascript
import {
  getCompatibleVersions,
  getAllVersions,
} from "baseline-browser-mapping";
```

If you want to load the script and data directly in a web page without hosting it yourself, consider using a CDN:

```html
<script type="module">
  import {
    getCompatibleVersions,
    getAllVersions,
  } from "https://cdn.jsdelivr.net/npm/baseline-browser-mapping";
</script>
```

## Get Baseline Widely available browser versions or Baseline year browser versions

To get the current list of minimum browser versions compatible with Baseline Widely available features from the core browser set, call the `getCompatibleVersions()` function:

```javascript
getCompatibleVersions();
```

Executed on 7th March 2025, the above code returns the following browser versions:

```javascript
[
  { browser: "chrome", version: "105", release_date: "2022-09-02" },
  {
    browser: "chrome_android",
    version: "105",
    release_date: "2022-09-02",
  },
  { browser: "edge", version: "105", release_date: "2022-09-02" },
  { browser: "firefox", version: "104", release_date: "2022-08-23" },
  {
    browser: "firefox_android",
    version: "104",
    release_date: "2022-08-23",
  },
  { browser: "safari", version: "15.6", release_date: "2022-09-02" },
  {
    browser: "safari_ios",
    version: "15.6",
    release_date: "2022-09-02",
  },
];
```

> [!NOTE]
> The minimum versions of each browser are not necessarily the final release before the Widely available cutoff date of `TODAY - 30 MONTHS`. Some earlier versions will have supported the full Widely available feature set.

### `getCompatibleVersions()` configuration options

`getCompatibleVersions()` accepts an `Object` as an argument with configuration options. The defaults are as follows:

```javascript
{
  targetYear: undefined,
  widelyAvailableOnDate: undefined,
  includeDownstreamBrowsers: false,
  listAllCompatibleVersions: false
}
```

#### `targetYear`

The `targetYear` option returns the minimum browser versions compatible with all **Baseline Newly available** features at the end of the specified calendar year. For example, calling:

```javascript
getCompatibleVersions({
  targetYear: 2020,
});
```

Returns the following versions:

```javascript
[
  { browser: "chrome", version: "87", release_date: "2020-11-19" },
  {
    browser: "chrome_android",
    version: "87",
    release_date: "2020-11-19",
  },
  { browser: "edge", version: "87", release_date: "2020-11-19" },
  { browser: "firefox", version: "83", release_date: "2020-11-17" },
  {
    browser: "firefox_android",
    version: "83",
    release_date: "2020-11-17",
  },
  { browser: "safari", version: "14", release_date: "2020-09-16" },
  { browser: "safari_ios", version: "14", release_date: "2020-09-16" },
];
```

> [!NOTE]
> The minimum version of each browser is not necessarily the final version released in that calendar year. In the above example, Firefox 84 was the final version released in 2020; however Firefox 83 supported all of the features that were interoperable at the end of 2020.
> [!WARNING]
> You cannot use `targetYear` and `widelyAavailableDate` together. Please only use one of these options at a time.

#### `widelyAvailableOnDate`

The `widelyAvailableOnDate` option returns the minimum versions compatible with Baseline Widely available on a specified date in the format `YYYY-MM-DD`:

```javascript
getCompatibleVersions({
  widelyAvailableOnDate: `2023-04-05`,
});
```

> [!TIP]
> This option is useful if you provide a versioned library that targets Baseline Widely available on each version's release date and you need to provide a statement on minimum supported browser versions in your documentation.

#### `includeDownstreamBrowsers`

Setting `includeDownstreamBrowsers` to `true` will include browsers outside of the Baseline core browser set where it is possible to map those browsers to an upstream Chromium or Gecko version:

```javascript
getCompatibleVersions({
  includeDownstreamBrowsers: true,
});
```

For more information on downstream browsers, see [the section on downstream browsers](#downstream-browsers) below.

#### `includeKaiOS`

KaiOS is an operating system and app framework based on the Gecko engine from Firefox. KaiOS is based on the Gecko engine and feature support can be derived from the upstream Gecko version that each KaiOS version implements. However KaiOS requires other considerations beyond feature compatibility to ensure a good user experience as it runs on device types that do not have either mouse and keyboard or touch screen input in the way that all the other browsers supported by this module do.

```javascript
getCompatibleVersions({
  includeDownstreamBrowsers: true,
  includeKaiOS: true,
});
```

> [!NOTE]
> Including KaiOS requires you to include all downstream browsers using the `includeDownstreamBrowsers` option.

#### `listAllCompatibleVersions`

Setting `listAllCompatibleVersions` to true will include the minimum versions of each compatible browser, and all the subsequent versions:

```javascript
getCompatibleVersions({
  listAllCompatibleVersions: true,
});
```

## Get data for all browser versions

You may want to obtain data on all the browser versions available in this module for use in an analytics solution or dashboard. To get details of each browser version's level of Baseline support, call the `getAllVersions()` function:

```javascript
import { getAllVersions } from "baseline-browser-mapping";

getAllVersions();
```

By default, this function returns an `Array` of `Objects` and excludes downstream browsers:

```javascript
[
  ...
  {
    browser: "firefox_android", // Browser name
    version: "125", // Browser version
    release_date: "2024-04-16", // Release date
    year: 2023, // Baseline year feature set the version supports
    wa_compatible: true // Whether the browser version supports Widely available
  },
  ...
]
```

For browser versions in `@mdn/browser-compat-data` that were released before Baseline can be defined, i.e. Baseline 2015, the `year` property is always the string: `"pre_baseline"`.

### Understanding which browsers support Newly available features

You may want to understand which recent browser versions support all Newly available features. You can replace the `wa_compatible` property with a `supports` property using the `useSupport` option:

```javascript
getAllVersions({
  useSupports: true,
});
```

The `supports` property is optional and has two possible values:

- `widely` for browser versions that support all Widely available features.
- `newly` for browser versions that support all Newly available features.

Browser versions that do not support Widely or Newly available will not include the `support` property in the `array` or `object` outputs, and in the CSV output, the `support` column will contain an empty string. Browser versions that support all Newly available features also support all Widely available features.

### `getAllVersions()` Configuration options

`getAllVersions()` accepts an `Object` as an argument with configuration options. The defaults are as follows:

```javascript
{
  includeDownstreamBrowsers: false,
  outputFormat: "array"
}
```

#### `includeDownstreamBrowsers` (in `getAllVersions()` output)

As with `getCompatibleVersions()`, you can set `includeDownstreamBrowsers` to `true` to include the Chromium and Gecko downstream browsers [listed below](#list-of-downstream-browsers).

```javascript
getAllVersions({
  includeDownstreamBrowsers: true,
});
```

Downstream browsers include the same properties as core browsers, as well as the `engine`they use and `engine_version`, for example:

```javascript
[
  ...
  {
    browser: "samsunginternet_android",
    version: "27.0",
    release_date: "2024-11-06",
    engine: "Blink",
    engine_version: "125",
    year: 2023,
    supports: "widely"
  },
  ...
]
```

#### `includeKaiOS` (in `getAllVersions()` output)

As with `getCompatibleVersions()` you can include KaiOS in your output. The same requirement to have `includeDownstreamBrowsers: true` applies.

```javascript
getAllVersions({
  includeDownstreamBrowsers: true,
  includeKaiOS: true,
});
```

#### `outputFormat`

By default, this function returns an `Array` of `Objects` which can be manipulated in Javascript or output to JSON.

To return an `Object` that nests keys , set `outputFormat` to `object`:

```javascript
getAllVersions({
  outputFormat: "object",
});
```

In thise case, `getAllVersions()` returns a nested object with the browser [IDs listed below](#list-of-downstream-browsers) as keys, and versions as keys within them:

```javascript
{
  "chrome": {
    "53": {
      "year": 2016,
      "release_date": "2016-09-07"
    },
    ...
}
```

Downstream browsers will include extra fields for `engine` and `engine_versions`

```javascript
{
  ...
  "webview_android": {
    "53": {
      "year": 2016,
      "release_date": "2016-09-07",
      "engine": "Blink",
      "engine_version": "53"
    },
  ...
}
```

To return a `String` in CSV format, set `outputFormat` to `csv`:

```javascript
getAllVersions({
  outputFormat: "csv",
});
```

`getAllVersions` returns a `String` with a header row and comma-separated values for each browser version that you can write to a file or pass to another service. Core browsers will have "NULL" as the value for their `engine` and `engine_version`:

```csv
"browser","version","year","supports","release_date","engine","engine_version"
...
"chrome","24","pre_baseline","","2013-01-10","NULL","NULL"
...
"chrome","53","2016","","2016-09-07","NULL","NULL"
...
"firefox","135","2024","widely","2025-02-04","NULL","NULL"
"firefox","136","2024","newly","2025-03-04","NULL","NULL"
...
"ya_android","20.12","2020","year_only","2020-12-20","Blink","87"
...
```

> [!NOTE]
> The above example uses `"includeDownstreamBrowsers": true`

### Static resources

The outputs of `getAllVersions()` are available as JSON or CSV files generated on a daily basis and hosted on GitHub pages:

- Core browsers only
  - [Array](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions_array.json)
  - [Object](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions_object.json)
  - [CSV](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions.csv)
- Core browsers only, with `supports` property
  - [Array](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions_array_with_supports.json)
  - [Object](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions_object_with_supports.json)
  - [CSV](https://web-platform-dx.github.io/baseline-browser-mapping/all_versions_with_supports.csv)
- Including downstream browsers
  - [Array](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_array.json)
  - [Object](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_object.json)
  - [CSV](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions.csv)
- Including downstream browsers with `supports` property
  - [Array](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_array_with_supports.json)
  - [Object](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_object_with_supports.json)
  - [CSV](https://web-platform-dx.github.io/baseline-browser-mapping/with_downstream/all_versions_with_supports.csv)

These files are updated on a daily basis.

## CLI

`baseline-browser-mapping` includes a command line interface that exposes the same data and options as the `getCompatibleVersions()` function. To learn more about using the CLI, run:

```sh
npx baseline-browser-mapping --help
```

## Downstream browsers

### Limitations

The browser versions in this module come from two different sources:

- MDN's `browser-compat-data` module.
- Parsed user agent strings provided by [useragents.io](https://useragents.io/)

MDN `browser-compat-data` is an authoritative source of information for the browsers it contains. The release dates for the Baseline core browser set and the mapping of downstream browsers to Chromium versions should be considered accurate.

Browser mappings from useragents.io are provided on a best effort basis. They assume that browser vendors are accurately stating the Chromium version they have implemented. The initial set of version mappings was derived from a bulk export in November 2024. This version was iterated over with a Regex match looking for a major Chrome version and a corresponding version of the browser in question, e.g.:

`Mozilla/5.0 (Linux; U; Android 10; en-US; STK-L21 Build/HUAWEISTK-L21) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 UCBrowser/13.8.2.1324 Mobile Safari/537.36`

Shows UC Browser Mobile 13.8 implementing Chromium 100, and:

`Mozilla/5.0 (Linux; arm_64; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.123 YaBrowser/24.10.2.123.00 SA/3 Mobile Safari/537.36`

Shows Yandex Browser Mobile 24.10 implementing Chromium 128. The Chromium version from this string is mapped to the corresponding Chrome version from MDN `browser-compat-data`.

> [!NOTE]
> Where possible, approximate release dates have been included based on useragents.io "first seen" data. useragents.io does not have "first seen" dates prior to June 2020. However, these browsers' Baseline compatibility is determined by their Chromium or Gecko version, so their release dates are more informative than critical.

This data is updated on a daily basis using a [script](https://github.com/web-platform-dx/web-features/tree/main/scripts/refresh-downstream.ts) triggered by a GitHub [action](https://github.com/web-platform-dx/web-features/tree/main/.github/workflows/refresh_downstream.yml). Useragents.io provides a private API for this module which exposes the last 7 days of newly seen user agents for the currently tracked browsers. If a new major version of one of the tracked browsers is encountered with a Chromium version that meets or exceeds the previous latest version of that browser, it is added to the [src/data/downstream-browsers.json](src/data/downstream-browsers.json) file with the date it was first seen by useragents.io as its release date.

KaiOS is an exception - its upstream version mappings are handled separately from the other browsers because they happen very infrequently.

### List of downstream browsers

| Browser               | ID                        | Core    | Source                    |
| --------------------- | ------------------------- | ------- | ------------------------- |
| Chrome                | `chrome`                  | `true`  | MDN `browser-compat-data` |
| Chrome for Android    | `chrome_android`          | `true`  | MDN `browser-compat-data` |
| Edge                  | `edge`                    | `true`  | MDN `browser-compat-data` |
| Firefox               | `firefox`                 | `true`  | MDN `browser-compat-data` |
| Firefox for Android   | `firefox_android`         | `true`  | MDN `browser-compat-data` |
| Safari                | `safari`                  | `true`  | MDN `browser-compat-data` |
| Safari on iOS         | `safari_ios`              | `true`  | MDN `browser-compat-data` |
| Opera                 | `opera`                   | `false` | MDN `browser-compat-data` |
| Opera Android         | `opera_android`           | `false` | MDN `browser-compat-data` |
| Samsung Internet      | `samsunginternet_android` | `false` | MDN `browser-compat-data` |
| WebView Android       | `webview_android`         | `false` | MDN `browser-compat-data` |
| QQ Browser Mobile     | `qq_android`              | `false` | useragents.io             |
| UC Browser Mobile     | `uc_android`              | `false` | useragents.io             |
| Yandex Browser Mobile | `ya_android`              | `false` | useragents.io             |
| KaiOS                 | `kai_os`                  | `false` | Manual                    |
| Facebook for Android  | `facebook_android`        | `false` | useragents.io             |
| Instagram for Android | `instagram_android`       | `false` | useragents.io             |

> [!NOTE]
> All the non-core browsers currently included implement Chromium or Gecko. Their inclusion in any of the above methods is based on the Baseline feature set supported by the Chromium or Gecko version they implement, not their release date.
